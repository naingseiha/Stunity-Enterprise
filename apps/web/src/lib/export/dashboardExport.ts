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

/** Single-page PDF formatted to standard A4 portrait with proportional scaling. */
export async function downloadDashboardPdf(dataUrl: string, fileName: string, width: number, height: number): Promise<void> {
  const { default: jsPDF } = await import('jspdf');
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();

  // Fit nicely on A4 portrait page with 5mm margins
  const margin = 5;
  const maxW = pdfWidth - margin * 2;
  const maxH = pdfHeight - margin * 2;

  const imgAspect = width / height;
  let printW = maxW;
  let printH = printW / imgAspect;

  if (printH > maxH) {
    printH = maxH;
    printW = printH * imgAspect;
  }

  const x = (pdfWidth - printW) / 2;
  const y = (pdfHeight - printH) / 2;

  pdf.addImage(dataUrl, 'JPEG', x, y, printW, printH);
  pdf.save(fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`);
}

/** Strip characters that are unsafe in a downloaded file name. */
export function safeDashboardFileName(schoolName: string, periodLabel: string): string {
  const cleaned = `${schoolName}-${periodLabel}`.replace(/[\\/:*?"<>|]+/g, '-').trim();
  return cleaned || 'stunity-reports-dashboard';
}
