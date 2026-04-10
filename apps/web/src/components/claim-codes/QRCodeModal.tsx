import React from 'react';
import QRCode from 'react-qr-code';
import { X, Download, Printer } from 'lucide-react';
import { ClaimCode } from '@/lib/api/claimCodes';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  claimCode: ClaimCode | null;
}

export function QRCodeModal({ isOpen, onClose, claimCode }: QRCodeModalProps) {
  if (!isOpen || !claimCode) return null;

  const userRole = claimCode.type === 'STUDENT' ? 'Student' : claimCode.type === 'TEACHER' ? 'Teacher' : claimCode.type;
  let fullName = '';
  if (claimCode.student) fullName = `${claimCode.student.firstName} ${claimCode.student.lastName}`;
  else if (claimCode.teacher) fullName = `${claimCode.teacher.firstName} ${claimCode.teacher.lastName}`;
  else if (claimCode.claimedByUser) fullName = `${claimCode.claimedByUser.firstName} ${claimCode.claimedByUser.lastName}`;

  // Option B: Deep Link URI format
  const qrPayload = `stunity://link-school?code=${encodeURIComponent(claimCode.code)}`;

  const handleDownload = () => {
    const svg = document.getElementById('claim-qr-code');
    if (!svg) return;
    
    // Create canvas to render the SVG onto
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    const svgData = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    img.onload = () => {
      // Set canvas dimensions with some padding
      const padding = 20;
      canvas.width = img.width + (padding * 2);
      canvas.height = img.height + (padding * 2);
      
      // Fill white background
      if (ctx) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw the image
        ctx.drawImage(img, padding, padding);
        
        // Convert to png and download
        const pngFile = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.download = `stunity-code-${claimCode.code}.png`;
        downloadLink.href = pngFile;
        downloadLink.click();
      }
      
      URL.revokeObjectURL(url);
    };
    
    img.src = url;
  };

  const handlePrint = () => {
    const svg = document.getElementById('claim-qr-code');
    if (!svg) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const html = `
      <html>
        <head>
          <title>Print Claim Code: ${claimCode.code}</title>
          <style>
            body { 
              display: flex; 
              flex-direction: column; 
              align-items: center; 
              justify-content: center; 
              height: 100vh; 
              margin: 0; 
              font-family: system-ui, -apple-system, sans-serif;
            }
            .code { font-size: 24px; font-weight: bold; margin-top: 20px; font-family: monospace; letter-spacing: 2px; }
            .hint { color: #666; margin-top: 10px; font-size: 14px; }
            @media print {
              body { height: auto; margin-top: 50px; }
            }
          </style>
        </head>
        <body>
          <div style="width: 256px; height: 256px;">
            ${new XMLSerializer().serializeToString(svg)}
          </div>
          <div class="code">${claimCode.code}</div>
          <div class="hint">Scan with the Stunity App to securely link your profile</div>
          <script>
            window.onload = () => { window.print(); window.close(); };
          </script>
        </body>
      </html>
    `;
    
    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" 
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-sm rounded-[1.75rem] border border-white/75 bg-white p-8 text-center shadow-2xl ring-1 ring-slate-200/70">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
        >
          <X className="h-5 w-5" />
        </button>
        
        <h3 className="text-xl font-black tracking-tight text-slate-950">Linking QR Code</h3>
        <p className="mt-2 text-sm font-medium text-slate-500">
          Users can scan this with their phone or the Stunity app to securely join the school.
        </p>

        {fullName && (
          <div className="mt-4 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
            <p className="text-lg font-bold text-slate-800">{fullName}</p>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{userRole}</p>
          </div>
        )}
        
        <div className="mx-auto mt-6 flex w-fit items-center justify-center rounded-2xl border border-slate-100 bg-white p-4 shadow-sm ring-1 ring-slate-200/50">
          <QRCode
            id="claim-qr-code"
            value={qrPayload}
            size={200}
            level="H"
            style={{ height: "auto", maxWidth: "100%", width: "100%" }}
            viewBox={`0 0 256 256`}
          />
        </div>
        
        <div className="mt-4 font-mono text-[15px] font-bold tracking-widest text-indigo-600">
          {claimCode.code}
        </div>
        
        <div className="mt-8 grid grid-cols-2 gap-3">
          <button
            onClick={handlePrint}
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <Printer className="h-4.5 w-4.5" />
            Print
          </button>
          
          <button
            onClick={handleDownload}
            className="flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800"
          >
            <Download className="h-4.5 w-4.5" />
            Save PNG
          </button>
        </div>
      </div>
    </div>
  );
}
