'use client';

import { useTranslations } from 'next-intl';
import { I18nText as AutoI18nText } from '@/components/i18n/I18nText';
import { useState, useRef, useCallback, useEffect } from 'react';
import Image from 'next/image';
import {
  X, Upload, Camera, Image as ImageIcon, Loader2,
  ZoomIn, ZoomOut, RotateCw, Check, Trash2
} from 'lucide-react';

interface ImageUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (file: File) => Promise<void>;
  type: 'profile' | 'cover';
  currentImageUrl?: string;
  title?: string;
}

/**
 * ImageUploadModal - Beautiful image upload modal with preview
 * 
 * Features:
 * - Drag and drop support
 * - Image preview before upload
 * - File size validation
 * - Responsive design
 * - Stunity orange/amber theme
 */
export default function ImageUploadModal({
  isOpen,
  onClose,
  onUpload,
  type,
  currentImageUrl,
  title,
}: ImageUploadModalProps) {
    const autoT = useTranslations();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Max file sizes
  const MAX_SIZE_MB = type === 'cover' ? 10 : 5;
  const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

  // Recommended dimensions
  const dimensions = type === 'cover' 
    ? { width: 1500, height: 500, ratio: '3:1' }
    : { width: 400, height: 400, ratio: '1:1' };

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedFile(null);
      setPreviewUrl(null);
      setError(null);
    }
  }, [isOpen]);

  // Create preview URL from file
  useEffect(() => {
    if (selectedFile) {
      const url = URL.createObjectURL(selectedFile);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [selectedFile]);

  const validateFile = (file: File): string | null => {
    if (!file.type.startsWith('image/')) {
      return 'Please select an image file';
    }
    if (file.size > MAX_SIZE_BYTES) {
      return `File size must be less than ${MAX_SIZE_MB}MB`;
    }
    return null;
  };

  const handleFileSelect = useCallback((file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setSelectedFile(file);
  }, []);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  }, [handleFileSelect]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    
    setUploading(true);
    setError(null);
    
    try {
      await onUpload(selectedFile);
      onClose();
    } catch (err) {
      setError('Failed to upload image. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveSelected = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setError(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        style={{ animation: 'fadeIn 0.2s ease-out' }}
      />

      {/* Modal */}
      <div 
        className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
        style={{ animation: 'slideInUp 0.3s ease-out' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {title || (type === 'cover' ? 'Change Cover Photo' : 'Change Profile Photo')}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Current Image Preview (if exists and no new selection) */}
          {currentImageUrl && !previewUrl && (
            <div className="mb-4">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2"><AutoI18nText i18nKey="auto.web.components_profile_ImageUploadModal.k_3f67f981" /> {type === 'cover' ? 'cover' : 'profile'} <AutoI18nText i18nKey="auto.web.components_profile_ImageUploadModal.k_fb876c5d" /></p>
              <div className={`relative ${type === 'cover' ? 'h-32 rounded-xl' : 'w-24 h-24 rounded-full mx-auto'} overflow-hidden bg-gray-100 dark:bg-gray-700`}>
                <Image
                  src={currentImageUrl}
                  alt={autoT("auto.web.components_profile_ImageUploadModal.k_e358287e")}
                  fill
                  className="object-cover"
                />
              </div>
            </div>
          )}

          {/* Selected Image Preview */}
          {previewUrl && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300"><AutoI18nText i18nKey="auto.web.components_profile_ImageUploadModal.k_a0d99798" /></p>
                <button
                  onClick={handleRemoveSelected}
                  className="text-sm text-red-500 hover:text-red-600 flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <AutoI18nText i18nKey="auto.web.components_profile_ImageUploadModal.k_e87ecc07" />
                </button>
              </div>
              <div className={`relative ${type === 'cover' ? 'h-40 rounded-xl' : 'w-32 h-32 rounded-full mx-auto'} overflow-hidden bg-gray-100 dark:bg-gray-700 ring-4 ring-orange-100 dark:ring-orange-900/30`}>
                <Image
                  src={previewUrl}
                  alt={autoT("auto.web.components_profile_ImageUploadModal.k_fd85289d")}
                  fill
                  className="object-cover"
                />
              </div>
              {selectedFile && (
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2">
                  {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} <AutoI18nText i18nKey="auto.web.components_profile_ImageUploadModal.k_0473491e" />
                </p>
              )}
            </div>
          )}

          {/* Drop Zone */}
          {!previewUrl && (
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`
                relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all
                ${dragActive 
                  ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20' 
                  : 'border-gray-300 dark:border-gray-600 hover:border-orange-400 hover:bg-orange-50/50 dark:hover:bg-orange-900/10'
                }
              `}
            >
              <div className="flex flex-col items-center gap-3">
                <div className={`
                  w-16 h-16 rounded-full flex items-center justify-center transition-all
                  ${dragActive 
                    ? 'bg-orange-500 text-white scale-110' 
                    : 'bg-orange-100 dark:bg-orange-900/30 text-orange-500'
                  }
                `}>
                  {type === 'cover' ? (
                    <ImageIcon className="w-8 h-8" />
                  ) : (
                    <Camera className="w-8 h-8" />
                  )}
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {dragActive ? 'Drop image here' : 'Drag and drop an image'}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    <AutoI18nText i18nKey="auto.web.components_profile_ImageUploadModal.k_3f0e657e" /> <span className="text-orange-600 font-medium"><AutoI18nText i18nKey="auto.web.components_profile_ImageUploadModal.k_1265aaf0" /></span> <AutoI18nText i18nKey="auto.web.components_profile_ImageUploadModal.k_0deeee10" />
                  </p>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-400 dark:text-gray-500">
                  <span><AutoI18nText i18nKey="auto.web.components_profile_ImageUploadModal.k_92b2f46d" /> {MAX_SIZE_MB}MB</span>
                  <span>•</span>
                  <span><AutoI18nText i18nKey="auto.web.components_profile_ImageUploadModal.k_3b1bd7f5" /> {dimensions.width}×{dimensions.height}<AutoI18nText i18nKey="auto.web.components_profile_ImageUploadModal.k_2bb32401" /></span>
                </div>
              </div>
            </div>
          )}

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            onChange={handleInputChange}
            className="hidden"
          />

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Tips */}
          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <AutoI18nText i18nKey="auto.web.components_profile_ImageUploadModal.k_775c61fa" />
            </p>
            <ul className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
              {type === 'cover' ? (
                <>
                  <li><AutoI18nText i18nKey="auto.web.components_profile_ImageUploadModal.k_c4d1cbed" /></li>
                  <li><AutoI18nText i18nKey="auto.web.components_profile_ImageUploadModal.k_abb83e08" /></li>
                  <li><AutoI18nText i18nKey="auto.web.components_profile_ImageUploadModal.k_53cb2e19" /></li>
                </>
              ) : (
                <>
                  <li><AutoI18nText i18nKey="auto.web.components_profile_ImageUploadModal.k_501b0961" /></li>
                  <li><AutoI18nText i18nKey="auto.web.components_profile_ImageUploadModal.k_705d728d" /></li>
                  <li><AutoI18nText i18nKey="auto.web.components_profile_ImageUploadModal.k_4cdf5f71" /></li>
                </>
              )}
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium transition-colors"
          >
            <AutoI18nText i18nKey="auto.web.components_profile_ImageUploadModal.k_6fe01443" />
          </button>
          <button
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
            className="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 disabled:from-gray-400 disabled:to-gray-400 text-white rounded-lg font-semibold flex items-center gap-2 transition-all shadow-md hover:shadow-lg disabled:shadow-none"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <AutoI18nText i18nKey="auto.web.components_profile_ImageUploadModal.k_a5b56b4b" />
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                <AutoI18nText i18nKey="auto.web.components_profile_ImageUploadModal.k_e86a70c1" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Animations */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
}
