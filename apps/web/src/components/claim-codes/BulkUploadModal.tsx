'use client';

import React, { useState, useRef } from 'react';
import { X, Upload, FileText, Mail, Phone, AlertCircle, CheckCircle, Copy, Download } from 'lucide-react';

type UploadStage = 'select' | 'preview' | 'uploading' | 'results';

interface BulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  schoolId: string;
}

interface UploadResult {
  total: number;
  distribution: {
    emailSent: number;
    manualRequired: number;
    failed: number;
  };
  emailList: Array<{
    name: string;
    email: string;
    code: string;
    grade?: string;
  }>;
  manualList: Array<{
    name: string;
    phone: string;
    code: string;
    grade?: string;
  }>;
  errors?: Array<{
    row: number;
    error: string;
    name?: string;
  }>;
}

export default function BulkUploadModal({ isOpen, onClose, onSuccess, schoolId }: BulkUploadModalProps) {
  const [stage, setStage] = useState<UploadStage>('select');
  const [file, setFile] = useState<File | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);
    setStage('preview');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type === 'text/csv') {
      handleFileSelect(droppedFile);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setStage('uploading');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'STUDENT');
      formData.append('expiresInDays', '30');
      formData.append('sendEmails', 'false'); // Don't auto-send for now

      const response = await fetch(`http://localhost:3002/schools/${schoolId}/claim-codes/bulk-upload`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        setUploadResult(result.data);
        setStage('results');
      } else {
        alert('Upload failed: ' + result.error);
        setStage('select');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed. Please try again.');
      setStage('select');
    }
  };

  const handleCopy = (text: string, code: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleDownloadManualList = () => {
    if (!uploadResult) return;

    const text = uploadResult.manualList
      .map((item) => {
        const parts = [
          `Name: ${item.name}`,
          item.grade ? `Grade: ${item.grade}` : '',
          `Phone: ${item.phone}`,
          `Code: ${item.code}`,
        ].filter(Boolean);
        return parts.join('\n');
      })
      .join('\n\n---\n\n');

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `manual-send-list-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    setStage('select');
    setFile(null);
    setUploadResult(null);
    onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Bulk Upload Students</h2>
            <p className="text-sm text-gray-600 mt-1">
              Upload CSV to generate claim codes for multiple students
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Stage: Select File */}
          {stage === 'select' && (
            <div className="space-y-6">
              {/* CSV Format Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">CSV Format Requirements</h3>
                <p className="text-sm text-blue-800 mb-3">
                  Your CSV file should include these columns (header row required):
                </p>
                <div className="bg-white rounded border border-blue-200 p-3 font-mono text-xs overflow-x-auto">
                  firstName,lastName,email,phone,grade,studentId
                </div>
                <ul className="text-sm text-blue-800 mt-3 space-y-1 list-disc list-inside">
                  <li><strong>firstName</strong> and <strong>lastName</strong> are required</li>
                  <li>Must have <strong>email</strong> OR <strong>phone</strong> (or both)</li>
                  <li>Students with email: auto-send via email (free)</li>
                  <li>Students without email: manual send list for WhatsApp (free)</li>
                  <li>Optional: grade, studentId for reference</li>
                </ul>
              </div>

              {/* Drop Zone */}
              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center hover:border-blue-500 hover:bg-blue-50/50 transition-all cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-lg font-medium text-gray-900 mb-2">
                  Drop your CSV file here
                </p>
                <p className="text-sm text-gray-600 mb-4">or click to browse</p>
                <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  Select CSV File
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
              </div>
            </div>
          )}

          {/* Stage: Preview */}
          {stage === 'preview' && file && (
            <div className="space-y-6">
              <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                <FileText className="w-12 h-12 text-blue-600" />
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{file.name}</p>
                  <p className="text-sm text-gray-600">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex">
                  <AlertCircle className="w-5 h-5 text-yellow-600 mr-3 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-yellow-900 mb-1">Before you upload</h4>
                    <ul className="text-sm text-yellow-800 space-y-1">
                      <li>✓ CSV file has header row with column names</li>
                      <li>✓ All students have firstName and lastName</li>
                      <li>✓ Each student has email OR phone number</li>
                      <li>✓ Ready to generate {file ? '(processing...)' : 'claim codes'}</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setStage('select')}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpload}
                  className="flex-1 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  Upload & Generate Codes
                </button>
              </div>
            </div>
          )}

          {/* Stage: Uploading */}
          {stage === 'uploading' && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-lg font-medium text-gray-900">Processing CSV...</p>
              <p className="text-sm text-gray-600 mt-2">Generating codes and categorizing distribution</p>
            </div>
          )}

          {/* Stage: Results */}
          {stage === 'results' && uploadResult && (
            <div className="space-y-6">
              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                  <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-green-900">{uploadResult.total}</p>
                  <p className="text-sm text-green-700">Codes Generated</p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                  <Mail className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-blue-900">{uploadResult.distribution.emailSent}</p>
                  <p className="text-sm text-blue-700">Ready for Email</p>
                </div>
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-center">
                  <Phone className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-orange-900">{uploadResult.distribution.manualRequired}</p>
                  <p className="text-sm text-orange-700">Manual Send</p>
                </div>
              </div>

              {/* Manual Send List */}
              {uploadResult.manualList.length > 0 && (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-orange-50 border-b border-orange-200 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-orange-900">Manual Send List</h3>
                        <p className="text-sm text-orange-700 mt-1">
                          Students without email - send via WhatsApp or Telegram
                        </p>
                      </div>
                      <button
                        onClick={handleDownloadManualList}
                        className="flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                      >
                        <Download className="w-4 h-4" />
                        <span>Download List</span>
                      </button>
                    </div>
                  </div>

                  <div className="max-h-64 overflow-y-auto">
                    {uploadResult.manualList.map((item, index) => (
                      <div
                        key={index}
                        className="p-4 border-b border-gray-100 last:border-b-0 hover:bg-gray-50"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{item.name}</p>
                            <p className="text-sm text-gray-600 mt-1">{item.phone}</p>
                            {item.grade && (
                              <span className="inline-block mt-2 px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                                Grade {item.grade}
                              </span>
                            )}
                          </div>
                          <div className="ml-4 text-right">
                            <p className="font-mono text-sm font-semibold text-blue-600 mb-2">
                              {item.code}
                            </p>
                            <button
                              onClick={() => handleCopy(
                                `Hi ${item.name}! Your student code is: ${item.code}\n\nUse this code to register at our school portal.`,
                                item.code
                              )}
                              className="flex items-center space-x-1 px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-xs"
                            >
                              <Copy className="w-3 h-3" />
                              <span>{copiedCode === item.code ? 'Copied!' : 'Copy Message'}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Email List Preview */}
              {uploadResult.emailList.length > 0 && (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-blue-50 border-b border-blue-200 p-4">
                    <h3 className="font-semibold text-blue-900">Email Distribution Ready</h3>
                    <p className="text-sm text-blue-700 mt-1">
                      {uploadResult.emailList.length} students will receive codes via email (feature coming soon)
                    </p>
                  </div>

                  <div className="max-h-48 overflow-y-auto">
                    {uploadResult.emailList.slice(0, 5).map((item, index) => (
                      <div
                        key={index}
                        className="p-3 border-b border-gray-100 last:border-b-0 flex items-center justify-between"
                      >
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{item.name}</p>
                          <p className="text-xs text-gray-600">{item.email}</p>
                        </div>
                        <p className="font-mono text-xs font-semibold text-blue-600">{item.code}</p>
                      </div>
                    ))}
                    {uploadResult.emailList.length > 5 && (
                      <div className="p-3 text-center text-sm text-gray-600">
                        +{uploadResult.emailList.length - 5} more students
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Errors */}
              {uploadResult.errors && uploadResult.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex">
                    <AlertCircle className="w-5 h-5 text-red-600 mr-3 flex-shrink-0" />
                    <div className="flex-1">
                      <h4 className="font-semibold text-red-900 mb-2">
                        {uploadResult.errors.length} rows had errors
                      </h4>
                      <div className="space-y-1 text-sm text-red-800">
                        {uploadResult.errors.map((error, index) => (
                          <p key={index}>
                            Row {error.row}: {error.error}
                            {error.name && ` (${error.name})`}
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={handleReset}
                className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
