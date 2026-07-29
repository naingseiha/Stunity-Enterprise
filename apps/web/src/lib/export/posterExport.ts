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
  scale = 2,
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
  const blob = await canvasToBlob(canvas, format);
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
  const doc = new jsPDF({
    unit: "px",
    format: [width, height],
    orientation,
    compress: true,
  });
  doc.addImage(dataUrl, "PNG", 0, 0, width, height);
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
