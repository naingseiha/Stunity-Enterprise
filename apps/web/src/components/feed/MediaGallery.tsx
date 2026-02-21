'use client';

import { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, ZoomIn, Download, Maximize2 } from 'lucide-react';

type DisplayMode = 'AUTO' | 'FIXED_HEIGHT' | 'FULL_HEIGHT';

interface MediaGalleryProps {
  mediaUrls: string[];
  displayMode?: DisplayMode;
  onImageClick?: (index: number) => void;
  className?: string;
}

interface MediaLightboxProps {
  mediaUrls: string[];
  initialIndex: number;
  isOpen: boolean;
  onClose: () => void;
}

// Use native <img> for user-uploaded content to avoid next/image hostname restrictions
export default function MediaGallery({ 
  mediaUrls, 
  displayMode = 'AUTO',
  onImageClick,
  className = ''
}: MediaGalleryProps) {
  const [imageDimensions, setImageDimensions] = useState<Record<number, { width: number; height: number }>>({});
  
  const getAspectInfo = (index: number) => {
    const dims = imageDimensions[index];
    if (!dims) return { isPortrait: false, ratio: 1.5 };
    const ratio = dims.width / dims.height;
    return { isPortrait: ratio < 0.9, ratio };
  };

  useEffect(() => {
    if (displayMode === 'AUTO') {
      mediaUrls.forEach((url, index) => {
        const img = new window.Image();
        img.onload = () => {
          setImageDimensions(prev => ({
            ...prev,
            [index]: { width: img.naturalWidth, height: img.naturalHeight }
          }));
        };
        img.src = url;
      });
    }
  }, [mediaUrls, displayMode]);

  const handleClick = (index: number) => {
    onImageClick?.(index);
  };

  const getEffectiveMode = (): DisplayMode => {
    if (displayMode !== 'AUTO') return displayMode;
    const portraitCount = Object.entries(imageDimensions).filter(([, dims]) => 
      dims.width / dims.height < 0.9
    ).length;
    if (portraitCount > mediaUrls.length / 2) return 'FULL_HEIGHT';
    return 'FIXED_HEIGHT';
  };

  const effectiveMode = getEffectiveMode();
  const count = mediaUrls.length;

  if (count === 0) return null;

  // Single image
  if (count === 1) {
    const aspectInfo = getAspectInfo(0);
    const isFullHeight = effectiveMode === 'FULL_HEIGHT' || aspectInfo.isPortrait;
    
    return (
      <div className={`relative overflow-hidden rounded-xl ${className}`}>
        <div 
          className={`relative w-full cursor-pointer group ${
            isFullHeight 
              ? 'max-h-[600px]' 
              : 'h-[300px] sm:h-[350px]'
          }`}
          onClick={() => handleClick(0)}
        >
          <img
            src={mediaUrls[0]}
            alt="Post media"
            className={`w-full h-full ${isFullHeight ? 'object-contain bg-gray-100' : 'object-cover'} transition-transform group-hover:scale-[1.02]`}
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 rounded-full p-3">
              <Maximize2 className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Two images
  if (count === 2) {
    return (
      <div className={`grid grid-cols-2 gap-1 rounded-xl overflow-hidden ${className}`}>
        {mediaUrls.map((url, index) => (
          <div 
            key={index}
            className={`relative cursor-pointer group ${
              effectiveMode === 'FULL_HEIGHT' ? 'h-[350px] sm:h-[450px]' : 'h-[250px] sm:h-[320px]'
            }`}
            onClick={() => handleClick(index)}
          >
            <img
              src={url}
              alt={`Post media ${index + 1}`}
              className="w-full h-full object-cover transition-transform group-hover:scale-[1.02]"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
          </div>
        ))}
      </div>
    );
  }

  // Three images
  if (count === 3) {
    return (
      <div className={`grid grid-cols-2 gap-1 rounded-xl overflow-hidden ${className}`}>
        <div 
          className={`relative cursor-pointer group row-span-2 ${
            effectiveMode === 'FULL_HEIGHT' ? 'h-[350px] sm:h-[450px]' : 'h-[250px] sm:h-[300px]'
          }`}
          onClick={() => handleClick(0)}
        >
          <img
            src={mediaUrls[0]}
            alt="Post media 1"
            className="w-full h-full object-cover transition-transform group-hover:scale-[1.02]"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
        </div>
        <div className="flex flex-col gap-1">
          {mediaUrls.slice(1).map((url, index) => (
            <div 
              key={index}
              className={`relative cursor-pointer group flex-1 ${
                effectiveMode === 'FULL_HEIGHT' ? 'min-h-[170px]' : 'min-h-[120px]'
              }`}
              onClick={() => handleClick(index + 1)}
            >
              <img
                src={url}
                alt={`Post media ${index + 2}`}
                className="w-full h-full object-cover transition-transform group-hover:scale-[1.02]"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Four or more images
  return (
    <div className={`grid grid-cols-2 gap-1 rounded-xl overflow-hidden ${className}`}>
      {mediaUrls.slice(0, 4).map((url, index) => (
        <div 
          key={index}
          className={`relative cursor-pointer group ${
            effectiveMode === 'FULL_HEIGHT' ? 'h-[180px] sm:h-[220px]' : 'h-[140px] sm:h-[170px]'
          }`}
          onClick={() => handleClick(index)}
        >
          <img
            src={url}
            alt={`Post media ${index + 1}`}
            className="w-full h-full object-cover transition-transform group-hover:scale-[1.02]"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
          {index === 3 && count > 4 && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <span className="text-white text-2xl font-bold">+{count - 4}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// Media Lightbox Component - Full screen image viewer
export function MediaLightbox({ mediaUrls, initialIndex, isOpen, onClose }: MediaLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isZoomed, setIsZoomed] = useState(false);

  useEffect(() => {
    setCurrentIndex(initialIndex);
    setIsZoomed(false);
  }, [initialIndex, isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') goToPrevious();
      if (e.key === 'ArrowRight') goToNext();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? mediaUrls.length - 1 : prev - 1));
    setIsZoomed(false);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev === mediaUrls.length - 1 ? 0 : prev + 1));
    setIsZoomed(false);
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(mediaUrls[currentIndex]);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `image-${currentIndex + 1}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-50 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
      >
        <X className="w-6 h-6 text-white" />
      </button>

      <div className="absolute top-4 left-4 flex items-center gap-4 z-50">
        <span className="text-white/80 text-sm font-medium">
          {currentIndex + 1} / {mediaUrls.length}
        </span>
        <button
          onClick={() => setIsZoomed(!isZoomed)}
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          title={isZoomed ? 'Zoom out' : 'Zoom in'}
        >
          <ZoomIn className="w-5 h-5 text-white" />
        </button>
        <button
          onClick={handleDownload}
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          title="Download"
        >
          <Download className="w-5 h-5 text-white" />
        </button>
      </div>

      {mediaUrls.length > 1 && (
        <>
          <button
            onClick={goToPrevious}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-50 p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <ChevronLeft className="w-8 h-8 text-white" />
          </button>
          <button
            onClick={goToNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-50 p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <ChevronRight className="w-8 h-8 text-white" />
          </button>
        </>
      )}

      {/* Main image */}
      <div 
        className={`relative w-full h-full flex items-center justify-center p-4 sm:p-12 transition-transform ${
          isZoomed ? 'cursor-zoom-out' : 'cursor-zoom-in'
        }`}
        onClick={() => setIsZoomed(!isZoomed)}
      >
        <div className={`transition-all duration-300 ${isZoomed ? 'scale-150' : 'scale-100'} max-w-full max-h-full`}>
          <img
            src={mediaUrls[currentIndex]}
            alt={`Image ${currentIndex + 1}`}
            className="max-w-full max-h-[85vh] object-contain"
          />
        </div>
      </div>

      {/* Thumbnail strip */}
      {mediaUrls.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 p-2 bg-black/50 rounded-lg z-50">
          {mediaUrls.map((url, index) => (
            <button
              key={index}
              onClick={() => { setCurrentIndex(index); setIsZoomed(false); }}
              className={`relative w-12 h-12 rounded-md overflow-hidden transition-all ${
                index === currentIndex 
                  ? 'ring-2 ring-white scale-110' 
                  : 'opacity-60 hover:opacity-100'
              }`}
            >
              <img
                src={url}
                alt={`Thumbnail ${index + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
