// Real PDF / PowerPoint export for a deck.
//
// Slide content (gradients, SVG backgrounds, Khmer web fonts, uploaded
// images) is too varied to redraw faithfully with a low-level drawing API,
// so each slide is rasterised from its live DOM (via html2canvas) and the
// resulting PNGs are embedded one-per-page/slide into a PDF (jsPDF) or a
// PPTX (pptxgenjs). This matches exactly what the editor shows.
//
// jsPDF / pptxgenjs / html2canvas are dynamically imported so they never
// enter the initial bundle — only loaded when the user actually exports.

/** Rasterise every `[data-export-slide]` node inside `container`, in DOM order. */
export async function captureSlideImages(container: HTMLElement): Promise<string[]> {
  const { default: html2canvas } = await import('html2canvas');
  const nodes = Array.from(container.querySelectorAll<HTMLElement>('[data-export-slide]'));
  const images: string[] = [];
  for (const node of nodes) {
    const canvas = await html2canvas(node, { scale: 2, backgroundColor: null, useCORS: true, logging: false });
    images.push(canvas.toDataURL('image/png'));
  }
  return images;
}

/** One PDF page per slide image, sized to the native 16:9 board. */
export async function downloadPdf(images: string[], fileName: string, w: number, h: number): Promise<void> {
  const { default: jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'px', format: [w, h], orientation: 'landscape', compress: true });
  images.forEach((img, i) => {
    if (i > 0) doc.addPage([w, h], 'landscape');
    doc.addImage(img, 'PNG', 0, 0, w, h);
  });
  doc.save(fileName);
}

/** One 16:9 slide per image, openable in PowerPoint / Keynote / Google Slides. */
export async function downloadPptx(images: string[], fileName: string): Promise<void> {
  const { default: PptxGenJS } = await import('pptxgenjs');
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_16x9';
  images.forEach((img) => {
    const slide = pptx.addSlide();
    slide.addImage({ data: img, x: 0, y: 0, w: '100%', h: '100%' });
  });
  await pptx.writeFile({ fileName });
}

/** Strip characters that are unsafe in a downloaded file name. */
export function safeFileName(title: string, fallback = 'stunity-slides'): string {
  const cleaned = title.replace(/[\\/:*?"<>|]+/g, ' ').trim();
  return cleaned || fallback;
}
