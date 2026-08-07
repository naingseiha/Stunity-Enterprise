#!/usr/bin/env node
/**
 * Generate PWA PNG (+ SVG fallback) icons from the native Stunity app icon.
 * Run: node scripts/generate-pwa-icons.js
 * Requires: sharp (available from monorepo root or apps/web)
 */
const fs = require("fs");
const path = require("path");

const iconsDir = path.join(__dirname, "../public/icons");
const screenshotsDir = path.join(__dirname, "../public/screenshots");
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

const sourceCandidates = [
  path.join(__dirname, "../../../apps/mobile/assets/icon.png"),
  path.join(__dirname, "../../../apps/mobile/assets/android-icon.png"),
  path.join(__dirname, "../public/stunity-symbol.png"),
  path.join(__dirname, "../public/apple-touch-icon.png"),
];

function resolveSharp() {
  const tries = [
    () => require("sharp"),
    () => require(path.join(__dirname, "../../../node_modules/sharp")),
    () => require(path.join(__dirname, "../node_modules/sharp")),
  ];
  for (const tryRequire of tries) {
    try {
      return tryRequire();
    } catch {
      /* continue */
    }
  }
  throw new Error("sharp is required. Run from repo root where sharp is installed.");
}

async function main() {
  const sharp = resolveSharp();
  const source = sourceCandidates.find((p) => fs.existsSync(p));
  if (!source) {
    throw new Error("No source icon found (expected apps/mobile/assets/icon.png)");
  }

  if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true });
  if (!fs.existsSync(screenshotsDir)) fs.mkdirSync(screenshotsDir, { recursive: true });

  console.log(`Using source: ${source}`);

  for (const size of sizes) {
    const out = path.join(iconsDir, `pwa-${size}x${size}.png`);
    await sharp(source)
      .resize(size, size, { fit: "cover" })
      .png({ quality: 90, compressionLevel: 9 })
      .toFile(out);
    console.log(`✓ ${path.basename(out)}`);
  }

  // Maskable: full-bleed on solid brand background with safe padding
  const maskableSize = 512;
  const pad = Math.round(maskableSize * 0.18);
  const inner = maskableSize - pad * 2;
  const foreground = await sharp(source)
    .resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: maskableSize,
      height: maskableSize,
      channels: 4,
      background: { r: 15, g: 23, b: 42, alpha: 1 }, // slate-900
    },
  })
    .composite([{ input: foreground, left: pad, top: pad }])
    .png()
    .toFile(path.join(iconsDir, "pwa-512x512-maskable.png"));
  console.log("✓ pwa-512x512-maskable.png");

  // Keep apple-touch-icon in sync
  await sharp(source)
    .resize(180, 180, { fit: "cover" })
    .png()
    .toFile(path.join(__dirname, "../public/apple-touch-icon.png"));
  console.log("✓ apple-touch-icon.png");

  // Lightweight narrow screenshot placeholder for install UI (Chrome)
  await sharp({
    create: {
      width: 390,
      height: 844,
      channels: 3,
      background: { r: 15, g: 23, b: 42 },
    },
  })
    .composite([
      {
        input: await sharp(source).resize(120, 120).png().toBuffer(),
        top: 280,
        left: 135,
      },
    ])
    .png()
    .toFile(path.join(screenshotsDir, "feed-mobile.png"));
  console.log("✓ screenshots/feed-mobile.png");

  // Manifest with PNG icons (required for reliable Android/Chrome install)
  const manifestPath = path.join(__dirname, "../public/manifest.json");
  const manifest = {
    name: "Stunity",
    short_name: "Stunity",
    description: "School Management & Social Learning Platform",
    start_url: "/km/app",
    scope: "/",
    id: "/km/app",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    orientation: "portrait-primary",
    background_color: "#0f172a",
    theme_color: "#ea580c",
    lang: "km",
    dir: "ltr",
    categories: ["education", "social"],
    prefer_related_applications: false,
    icons: [
      ...sizes.map((size) => ({
        src: `/icons/pwa-${size}x${size}.png`,
        sizes: `${size}x${size}`,
        type: "image/png",
        purpose: "any",
      })),
      {
        src: "/icons/pwa-512x512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
    ],
    screenshots: [
      {
        src: "/screenshots/feed-mobile.png",
        sizes: "390x844",
        type: "image/png",
        form_factor: "narrow",
        label: "Stunity Social Feed",
      },
    ],
    shortcuts: [
      {
        name: "Feed",
        short_name: "Feed",
        description: "Open your academic social feed",
        url: "/km/app?tab=feed",
        icons: [{ src: "/icons/pwa-96x96.png", sizes: "96x96", type: "image/png" }],
      },
      {
        name: "Learn",
        short_name: "Learn",
        description: "Continue learning",
        url: "/km/app?tab=learn",
        icons: [{ src: "/icons/pwa-96x96.png", sizes: "96x96", type: "image/png" }],
      },
      {
        name: "Messages",
        short_name: "Messages",
        description: "Open messages",
        url: "/km/app?tab=messages",
        icons: [{ src: "/icons/pwa-96x96.png", sizes: "96x96", type: "image/png" }],
      },
    ],
  };

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
  console.log("✓ manifest.json");
  console.log("\n🎉 PWA icons generated from native app icon.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
