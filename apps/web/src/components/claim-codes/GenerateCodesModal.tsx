'use client';

/**
 * Generate Claim Codes Modal
 */

import { useState } from 'react';
import { claimCodeService } from '@/lib/api/claimCodes';
import { CheckCircle2, Loader2, Copy, Download, X } from 'lucide-react';

interface GenerateCodesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCodesGenerated: () => void;
  schoolId: string;
}

export default function GenerateCodesModal({
  open,
  onOpenChange,
  onCodesGenerated,
  schoolId,
}: GenerateCodesModalProps) {
  const [type, setType] = useState<string>('STUDENT');
  const [count, setCount] = useState<number>(10);
  const [expiresIn, setExpiresIn] = useState<number>(30);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedCodes, setGeneratedCodes] = useState<string[] | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);

    try {
      const codes = await claimCodeService.generate(schoolId, {
        type,
        count,
        expiresInDays: expiresIn,
      });

      setGeneratedCodes(codes);
      onCodesGenerated();
    } catch (err: any) {
      setError(err.message || 'Failed to generate claim codes');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCodes = () => {
    if (!generatedCodes) return;
    navigator.clipboard.writeText(generatedCodes.join('\n'));
  };

  const handleDownloadCodes = () => {
    if (!generatedCodes) return;
    
    const blob = new Blob([generatedCodes.join('\n')], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `claim-codes-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const handleClose = () => {
    setGeneratedCodes(null);
    setError(null);
    setType('STUDENT');
    setCount(10);
    setExpiresIn(30);
    onOpenChange(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Generate Claim Codes</h2>
            <p className="text-sm text-gray-500 mt-1">
              Create new claim codes for students, teachers, or staff members
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {!generatedCodes ? (
            // Generation Form
            <div className="space-y-4">
              {/* Type Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Code Type
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="STUDENT">Student</option>
                  <option value="TEACHER">Teacher</option>
                  <option value="STAFF">Staff</option>
                  <option value="PARENT">Parent</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Select who can use these codes to register
                </p>
              </div>

              {/* Count Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Number of Codes
                </label>
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={count}
                  onChange={(e) => setCount(parseInt(e.target.value) || 1)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="10"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Generate between 1 and 500 codes at once
                </p>
              </div>

              {/* Expiration Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Expires In (Days)
                </label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={expiresIn}
                  onChange={(e) => setExpiresIn(parseInt(e.target.value) || 30)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="30"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Codes will expire after this many days
                </p>
              </div>

              {/* Error Alert */}
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
                  {error}
                </div>
              )}
            </div>
          ) : (
            // Success View
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                <p className="text-green-800 text-sm">
                  Successfully generated {generatedCodes.length} claim codes!
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Generated Codes
                </label>
                <div className="max-h-48 overflow-y-auto bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <div className="space-y-1 font-mono text-sm">
                    {generatedCodes.map((code, index) => (
                      <div key={index} className="text-gray-700">
                        {code}
                      </div>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Save these codes securely. They won't be shown again.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleCopyCodes}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                  <Copy className="w-4 h-4" />
                  Copy All
                </button>
                <button
                  onClick={handleDownloadCodes}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-6 border-t border-gray-200">
          {!generatedCodes ? (
            <>
              <button
                onClick={handleClose}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerate}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Generate Codes
              </button>
            </>
          ) : (
            <button
              onClick={handleClose}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
