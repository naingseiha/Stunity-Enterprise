import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import * as htmlToImage from 'html-to-image';

export const exportUtils = {
  /**
   * Export element to PNG
   */
  exportToPNG: async (elementId: string, filename: string = 'export.png') => {
    const element = document.getElementById(elementId);
    if (!element) {
      console.error('Element not found:', elementId);
      return;
    }

    try {
      const dataUrl = await htmlToImage.toPng(element, {
        quality: 1.0,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
      });

      const link = document.createElement('a');
      link.download = filename;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('Error exporting to PNG:', error);
      throw error;
    }
  },

  /**
   * Export element to PDF
   */
  exportToPDF: async (elementId: string, filename: string = 'export.pdf') => {
    const element = document.getElementById(elementId);
    if (!element) {
      console.error('Element not found:', elementId);
      return;
    }

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(filename);
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      throw error;
    }
  },

  /**
   * Export entire page to PDF
   */
  exportPageToPDF: async (filename: string = 'statistics-report.pdf') => {
    const element = document.getElementById('statistics-content');
    if (!element) return;

    try {
      const canvas = await html2canvas(element, {
        scale: 1.5,
        useCORS: true,
        backgroundColor: '#f8fafc',
        logging: false,
        windowWidth: 1200,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 10;

      let heightLeft = imgHeight * ratio;
      let position = 0;

      pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
      heightLeft -= pdfHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight * ratio;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', imgX, position, imgWidth * ratio, imgHeight * ratio);
        heightLeft -= pdfHeight;
      }

      pdf.save(filename);
    } catch (error) {
      console.error('Error exporting page to PDF:', error);
      throw error;
    }
  },
};
