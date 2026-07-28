// Shareable JPG / PDF export for the Reports Dashboard.
//
// Unlike `lib/pdf/reportCardPdf.ts` (which draws every line/table cell
// programmatically with jsPDF + jspdf-autotable for print-accurate MoEYS
// report cards), this dashboard is meant to be shared as-is on social media —
// gradients, recharts, Khmer web fonts and all — so it is rasterised from its
// live DOM (via html2canvas) and the single image is embedded as a JPG
// download or a one-page PDF. Same approach as `tools/slides/export.ts`.
//
// jsPDF / html2canvas are dynamically imported so they never enter the
// initial bundle — only loaded when the user actually exports.

/** Rasterise a DOM node to a JPEG data URL. */
export async function captureDashboardImage(node: HTMLElement): Promise<{ dataUrl: string; width: number; height: number }> {
  const { default: html2canvas } = await import('html2canvas');
  const canvas = await html2canvas(node, { scale: 2, backgroundColor: '#ffffff', useCORS: true, logging: false });
  return { dataUrl: canvas.toDataURL('image/jpeg', 0.95), width: canvas.width, height: canvas.height };
}

export function downloadDashboardJpg(dataUrl: string, fileName: string): void {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = fileName.endsWith('.jpg') ? fileName : `${fileName}.jpg`;
  link.click();
}

/** Single-page PDF with the raster image embedded, sized to the captured node. */
export async function downloadDashboardPdf(dataUrl: string, fileName: string, width: number, height: number): Promise<void> {
  const { default: jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'px', format: [width, height], orientation: width >= height ? 'landscape' : 'portrait', compress: true });
  doc.addImage(dataUrl, 'JPEG', 0, 0, width, height);
  doc.save(fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`);
}

/** Strip characters that are unsafe in a downloaded file name. */
export function safeDashboardFileName(schoolName: string, periodLabel: string): string {
  const cleaned = `${schoolName}-${periodLabel}`.replace(/[\\/:*?"<>|]+/g, '-').trim();
  return cleaned || 'stunity-reports-dashboard';
}
