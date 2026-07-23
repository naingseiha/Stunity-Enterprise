import { isIP } from "node:net";

function ipv4Subnet(value: string): string | null {
  if (isIP(value) !== 4) return null;
  const octets = value.split(".");
  return `v4:${octets[0]}.${octets[1]}.${octets[2]}.0/24`;
}

function expandIpv6(value: string): string[] | null {
  const withoutZone = value.split("%")[0].toLowerCase();
  if (isIP(withoutZone) !== 6) return null;
  const mapped = withoutZone.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return null;

  const expandEmbeddedIpv4 = (parts: string[]) =>
    parts.flatMap((part) => {
      if (!part.includes(".")) return [part];
      const octets = part.split(".").map(Number);
      if (
        octets.length !== 4 ||
        octets.some(
          (octet) => !Number.isInteger(octet) || octet < 0 || octet > 255,
        )
      )
        return [];
      return [
        ((octets[0] << 8) | octets[1]).toString(16),
        ((octets[2] << 8) | octets[3]).toString(16),
      ];
    });
  const [leftRaw, rightRaw = ""] = withoutZone.split("::");
  const left = expandEmbeddedIpv4(leftRaw ? leftRaw.split(":") : []);
  const right = expandEmbeddedIpv4(rightRaw ? rightRaw.split(":") : []);
  const missing = 8 - left.length - right.length;
  if (missing < 0) return null;
  return [...left, ...Array(missing).fill("0"), ...right].map((part) =>
    Number.parseInt(part || "0", 16)
      .toString(16)
      .padStart(4, "0"),
  );
}

/** Returns a coarse network bucket only; callers hash it before persistence. */
export function clientSubnetBucket(rawIp: string): string {
  const value = rawIp.trim();
  const mappedIpv4 = value.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i)?.[1];
  const v4 = ipv4Subnet(mappedIpv4 || value);
  if (v4) return v4;

  const ipv6 = expandIpv6(value);
  if (ipv6) return `v6:${ipv6.slice(0, 4).join(":")}::/64`;
  return "unknown";
}
