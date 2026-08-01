type PosterImageFormat = "png" | "jpg";

const posterAssetDataUrlCache = new Map<string, Promise<string>>();

function readBlobAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      typeof reader.result === "string"
        ? resolve(reader.result)
        : reject(new Error("Could not encode poster asset"));
    reader.onerror = () =>
      reject(reader.error || new Error("Could not read poster asset"));
    reader.readAsDataURL(blob);
  });
}

function posterAssetToDataUrl(url: string, mimeType?: string) {
  const absoluteUrl = new URL(url, window.location.href).toString();
  const cacheKey = `${absoluteUrl}:${mimeType || "source"}`;
  const cached = posterAssetDataUrlCache.get(cacheKey);
  if (cached) return cached;

  const request = fetch(absoluteUrl, { mode: "cors", credentials: "include" })
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`Could not load poster asset (${response.status})`);
      }
      const sourceBlob = await response.blob();
      const blob = mimeType
        ? new Blob([await sourceBlob.arrayBuffer()], { type: mimeType })
        : sourceBlob;
      return readBlobAsDataUrl(blob);
    })
    .catch((error) => {
      posterAssetDataUrlCache.delete(cacheKey);
      throw error;
    });

  posterAssetDataUrlCache.set(cacheKey, request);
  return request;
}

function findDocumentFontSource(
  fontFamily: string,
  unicodeRangeFragment?: string,
) {
  for (const styleSheet of Array.from(document.styleSheets)) {
    let rules: CSSRuleList;
    try {
      rules = styleSheet.cssRules;
    } catch {
      continue;
    }

    for (const rule of Array.from(rules)) {
      if (rule.type !== CSSRule.FONT_FACE_RULE) continue;
      const style = (rule as CSSFontFaceRule).style;
      const family = style
        .getPropertyValue("font-family")
        .replace(/["']/g, "")
        .trim();
      if (family !== fontFamily) continue;

      const unicodeRange = style.getPropertyValue("unicode-range");
      if (
        unicodeRangeFragment &&
        !unicodeRange.toUpperCase().includes(unicodeRangeFragment.toUpperCase())
      ) {
        continue;
      }

      const source = style.getPropertyValue("src");
      const urlMatch = source.match(/url\((?:"|')?(.+?)(?:"|')?\)/);
      if (!urlMatch?.[1]) continue;
      return new URL(
        urlMatch[1],
        styleSheet.href || document.baseURI,
      ).toString();
    }
  }
  return null;
}

async function inlinePosterSvgResources(svg: SVGSVGElement) {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");

  const images = Array.from(clone.querySelectorAll("image"));
  await Promise.all(
    images.map(async (image) => {
      const href =
        image.getAttribute("href") ||
        image.getAttributeNS("http://www.w3.org/1999/xlink", "href");
      if (!href || href.startsWith("data:")) return;
      const dataUrl = await posterAssetToDataUrl(href);
      image.setAttribute("href", dataUrl);
      image.removeAttribute("crossorigin");
    }),
  );

  const moulSource = findDocumentFontSource("Moul", "U+1780");
  if (!moulSource) {
    throw new Error("Could not locate the Khmer Moul font for poster export");
  }

  const [
    battambangRegular,
    battambangBold,
    koulenRegular,
    moulRegular,
    tactengRegular,
  ] = await Promise.all([
    posterAssetToDataUrl(
      "/fonts/khmer/Battambang/Battambang-Regular.ttf",
      "font/ttf",
    ),
    posterAssetToDataUrl(
      "/fonts/khmer/Battambang/Battambang-Bold.ttf",
      "font/ttf",
    ),
    posterAssetToDataUrl("/fonts/khmer/Koulen/Koulen-Regular.ttf", "font/ttf"),
    posterAssetToDataUrl(moulSource, "font/woff2"),
    posterAssetToDataUrl("/fonts/TACTENG.TTF", "font/ttf"),
  ]);

  const style = document.createElementNS("http://www.w3.org/2000/svg", "style");
  style.textContent = `
    @font-face {
      font-family: "Battambang";
      src: url("${battambangRegular}") format("truetype");
      font-style: normal;
      font-weight: 400;
    }
    @font-face {
      font-family: "Battambang";
      src: url("${battambangBold}") format("truetype");
      font-style: normal;
      font-weight: 700;
    }
    @font-face {
      font-family: "Koulen";
      src: url("${koulenRegular}") format("truetype");
      font-style: normal;
      font-weight: 400;
    }
    @font-face {
      font-family: "Moul";
      src: url("${moulRegular}") format("woff2");
      font-style: normal;
      font-weight: 400;
    }
    @font-face {
      font-family: "Tacteng";
      src: url("${tactengRegular}") format("truetype");
      font-style: normal;
      font-weight: 400;
    }
  `;
  clone.prepend(style);
  return clone;
}

async function capturePosterSvg(
  svg: SVGSVGElement,
  width: number,
  height: number,
  scale: number,
) {
  const clone = await inlinePosterSvgResources(svg);
  clone.setAttribute("width", String(width));
  clone.setAttribute("height", String(height));

  const markup = new XMLSerializer().serializeToString(clone);
  const blob = new Blob([markup], {
    type: "image/svg+xml;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);

  try {
    const image = new Image();
    image.decoding = "sync";
    image.src = url;
    await image.decode();

    const canvas = document.createElement("canvas");
    canvas.width = width * scale;
    canvas.height = height * scale;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not create poster canvas");
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas;
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function waitForImages(root: HTMLElement): Promise<void> {
  const images = Array.from(root.querySelectorAll("img"));
  await Promise.all(
    images.map(async (image) => {
      if (image.complete) {
        try {
          await image.decode();
        } catch {
          // A broken optional image is rendered by the browser as-is; export can continue.
        }
        return;
      }
      await new Promise<void>((resolve) => {
        image.addEventListener("load", () => resolve(), { once: true });
        image.addEventListener("error", () => resolve(), { once: true });
      });
    }),
  );
}

export async function capturePosterCanvas(
  source: HTMLElement,
  width: number,
  height: number,
  scale = 1,
): Promise<HTMLCanvasElement> {
  if ("fonts" in document) await document.fonts.ready;

  const svg = source.querySelector<SVGSVGElement>(
    'svg[data-poster-svg="true"]',
  );
  if (svg) return capturePosterSvg(svg, width, height, scale);

  const host = document.createElement("div");
  host.setAttribute("data-poster-export-host", "true");
  Object.assign(host.style, {
    position: "absolute",
    left: `${window.scrollX - 100000}px`,
    top: `${window.scrollY}px`,
    width: `${width}px`,
    height: `${height}px`,
    overflow: "hidden",
    pointerEvents: "none",
    zIndex: "-1",
  });

  const clone = source.cloneNode(true) as HTMLElement;
  Object.assign(clone.style, {
    position: "relative",
    left: "0",
    top: "0",
    width: `${width}px`,
    height: `${height}px`,
    transform: "none",
    transformOrigin: "top left",
    boxShadow: "none",
  });
  clone.querySelectorAll<HTMLElement>("*").forEach((element) => {
    element.style.animation = "none";
    element.style.transition = "none";
  });

  host.appendChild(clone);
  document.body.appendChild(host);

  try {
    await waitForImages(clone);
    const { default: html2canvas } = await import("html2canvas");
    return await html2canvas(clone, {
      width,
      height,
      windowWidth: width,
      windowHeight: height,
      scale,
      backgroundColor: null,
      useCORS: true,
      allowTaint: false,
      imageTimeout: 15000,
      logging: false,
      scrollX: window.scrollX,
      scrollY: window.scrollY,
    });
  } finally {
    host.remove();
  }
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  format: PosterImageFormat,
): Promise<Blob> {
  const mimeType = format === "png" ? "image/png" : "image/jpeg";
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob
          ? resolve(blob)
          : reject(new Error("Could not create poster image")),
      mimeType,
      format === "jpg" ? 0.95 : undefined,
    );
  });
}

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createPngChunk(type: string, data: Uint8Array) {
  const chunk = new Uint8Array(12 + data.length);
  const view = new DataView(chunk.buffer);
  view.setUint32(0, data.length);
  const typeBytes = new TextEncoder().encode(type);
  chunk.set(typeBytes, 4);
  chunk.set(data, 8);
  view.setUint32(8 + data.length, crc32(chunk.subarray(4, 8 + data.length)));
  return chunk;
}

async function setPngDensity(blob: Blob, dpi: number) {
  const source = new Uint8Array(await blob.arrayBuffer());
  const signature = source.subarray(0, 8);
  const chunks: Uint8Array[] = [signature];
  const pixelsPerMeter = Math.round(dpi / 0.0254);
  const density = new Uint8Array(9);
  const densityView = new DataView(density.buffer);
  densityView.setUint32(0, pixelsPerMeter);
  densityView.setUint32(4, pixelsPerMeter);
  density[8] = 1;
  const densityChunk = createPngChunk("pHYs", density);

  let offset = 8;
  while (offset + 12 <= source.length) {
    const length = new DataView(
      source.buffer,
      source.byteOffset + offset,
      4,
    ).getUint32(0);
    const chunkEnd = offset + 12 + length;
    if (chunkEnd > source.length) break;
    const type = new TextDecoder().decode(
      source.subarray(offset + 4, offset + 8),
    );
    if (type !== "pHYs") chunks.push(source.subarray(offset, chunkEnd));
    if (type === "IHDR") chunks.push(densityChunk);
    offset = chunkEnd;
  }

  return new Blob(
    chunks.map((chunk) => Uint8Array.from(chunk).buffer),
    { type: "image/png" },
  );
}

async function setJpegDensity(blob: Blob, dpi: number) {
  const source = new Uint8Array(await blob.arrayBuffer());
  const hasJfif =
    source.length >= 20 &&
    source[0] === 0xff &&
    source[1] === 0xd8 &&
    source[2] === 0xff &&
    source[3] === 0xe0 &&
    String.fromCharCode(...source.subarray(6, 11)) === "JFIF\u0000";
  const density = Math.min(65535, Math.max(1, Math.round(dpi)));

  if (hasJfif) {
    const output = source.slice();
    const view = new DataView(output.buffer);
    output[13] = 1;
    view.setUint16(14, density);
    view.setUint16(16, density);
    return new Blob([output], { type: "image/jpeg" });
  }

  const jfif = new Uint8Array([
    0xff,
    0xe0,
    0x00,
    0x10,
    0x4a,
    0x46,
    0x49,
    0x46,
    0x00,
    0x01,
    0x01,
    0x01,
    (density >> 8) & 0xff,
    density & 0xff,
    (density >> 8) & 0xff,
    density & 0xff,
    0x00,
    0x00,
  ]);
  return new Blob([source.subarray(0, 2), jfif, source.subarray(2)], {
    type: "image/jpeg",
  });
}

async function setPrintDensity(
  blob: Blob,
  format: PosterImageFormat,
  dpi = 300,
) {
  return format === "png"
    ? setPngDensity(blob, dpi)
    : setJpegDensity(blob, dpi);
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function downloadPosterImage(
  source: HTMLElement,
  fileName: string,
  width: number,
  height: number,
  format: PosterImageFormat,
) {
  const canvas = await capturePosterCanvas(source, width, height);
  const sourceBlob = await canvasToBlob(canvas, format);
  const blob = await setPrintDensity(sourceBlob, format);
  downloadBlob(blob, `${fileName}.${format}`);
}

export async function downloadPosterPdf(
  source: HTMLElement,
  fileName: string,
  width: number,
  height: number,
) {
  const canvas = await capturePosterCanvas(source, width, height);
  const dataUrl = canvas.toDataURL("image/png");
  const { default: jsPDF } = await import("jspdf");
  const orientation = width >= height ? "landscape" : "portrait";
  const widthMm = (width / 300) * 25.4;
  const heightMm = (height / 300) * 25.4;
  const doc = new jsPDF({
    unit: "mm",
    format: [widthMm, heightMm],
    orientation,
    compress: true,
  });
  doc.addImage(dataUrl, "PNG", 0, 0, widthMm, heightMm);
  doc.save(`${fileName}.pdf`);
}

export async function downloadPosterPdfPages(
  sources: HTMLElement[],
  fileName: string,
  width: number,
  height: number,
) {
  if (sources.length === 0) return;

  const { default: jsPDF } = await import("jspdf");
  const orientation = width >= height ? "landscape" : "portrait";
  const widthMm = (width / 300) * 25.4;
  const heightMm = (height / 300) * 25.4;
  const doc = new jsPDF({
    unit: "mm",
    format: [widthMm, heightMm],
    orientation,
    compress: true,
  });

  for (let index = 0; index < sources.length; index += 1) {
    const canvas = await capturePosterCanvas(sources[index], width, height);
    const dataUrl = canvas.toDataURL("image/png");
    if (index > 0) doc.addPage([widthMm, heightMm], orientation);
    doc.addImage(dataUrl, "PNG", 0, 0, widthMm, heightMm);
  }

  doc.save(`${fileName}.pdf`);
}

export function safePosterFileName(schoolName: string, periodLabel: string) {
  return (
    `${schoolName}-${periodLabel}-congratulations`
      .replace(/[\\/:*?"<>|]+/g, "-")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "stunity-congratulations-poster"
  );
}
