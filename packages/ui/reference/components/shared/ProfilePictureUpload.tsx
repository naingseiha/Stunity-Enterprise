"use client";

import { useState, useRef, useCallback } from "react";
import {
  Camera,
  User,
  Image as ImageIcon,
  Trash2,
  Loader2,
  CheckCircle,
  AlertCircle,
  X,
} from "lucide-react";
import {
  uploadProfilePicture,
  deleteProfilePicture,
  uploadCoverPhoto,
  deleteCoverPhoto,
} from "@/lib/api/profile";
import { compressImage, isImageSizeAcceptable } from "@/lib/utils/imageCompression";

interface ProfilePictureUploadProps {
  currentImageUrl?: string | null;
  type?: "profile" | "cover";
  size?: "sm" | "md" | "lg" | "xl";
  onUploadSuccess?: (url: string, completeness: number) => void;
  onDeleteSuccess?: (completeness: number) => void;
  onError?: (error: string) => void;
  showEditButton?: boolean;
  className?: string;
  disabled?: boolean;
}

const SIZE_CLASSES = {
  sm: "w-16 h-16",
  md: "w-24 h-24",
  lg: "w-32 h-32",
  xl: "w-40 h-40",
};

const ICON_SIZES = {
  sm: "w-8 h-8",
  md: "w-12 h-12",
  lg: "w-16 h-16",
  xl: "w-20 h-20",
};

const CAMERA_SIZES = {
  sm: "w-6 h-6",
  md: "w-8 h-8",
  lg: "w-10 h-10",
  xl: "w-12 h-12",
};

export default function ProfilePictureUpload({
  currentImageUrl,
  type = "profile",
  size = "lg",
  onUploadSuccess,
  onDeleteSuccess,
  onError,
  showEditButton = true,
  className = "",
  disabled = false,
}: ProfilePictureUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      // Validate file type
      const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
      if (!validTypes.includes(file.type)) {
        onError?.("Invalid file type. Please upload JPEG, PNG, WebP, or GIF.");
        return;
      }

      // Check initial file size (max 10MB for raw)
      if (file.size > 10 * 1024 * 1024) {
        onError?.("File too large. Maximum size is 10MB.");
        return;
      }

      setIsUploading(true);
      setUploadProgress("Compressing...");

      try {
        // Compress the image
        const compressedDataUrl = await compressImage(file, {
          maxWidth: type === "profile" ? 500 : 1200,
          maxHeight: type === "profile" ? 500 : 400,
          quality: 0.85,
          outputFormat: "image/jpeg",
        });

        // Check compressed size
        if (!isImageSizeAcceptable(compressedDataUrl, 1024 * 1024)) {
          // 1MB max
          onError?.(
            "Compressed image is still too large. Please try a smaller image."
          );
          setIsUploading(false);
          return;
        }

        // Show preview
        setPreviewUrl(compressedDataUrl);
        setUploadProgress("Uploading...");

        // Convert data URL to File
        const response = await fetch(compressedDataUrl);
        const blob = await response.blob();
        const compressedFile = new File([blob], `${type}.jpg`, {
          type: "image/jpeg",
        });

        // Upload to server
        let result;
        if (type === "profile") {
          result = await uploadProfilePicture(compressedFile);
        } else {
          result = await uploadCoverPhoto(compressedFile);
        }

        const imageUrl =
          type === "profile" ? result.profilePictureUrl : result.coverPhotoUrl;

        setUploadProgress("");
        setIsUploading(false);
        setShowOptions(false);
        setPreviewUrl(null);

        onUploadSuccess?.(imageUrl, result.profileCompleteness);
      } catch (error: any) {
        console.error("Upload error:", error);
        setIsUploading(false);
        setUploadProgress("");
        setPreviewUrl(null);
        onError?.(error.message || "Failed to upload image");
      }

      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [type, onUploadSuccess, onError]
  );

  const handleDelete = useCallback(async () => {
    if (!currentImageUrl) return;

    setIsUploading(true);
    setUploadProgress("Removing...");

    try {
      let result;
      if (type === "profile") {
        result = await deleteProfilePicture();
      } else {
        result = await deleteCoverPhoto();
      }

      setUploadProgress("");
      setIsUploading(false);
      setShowOptions(false);

      onDeleteSuccess?.(result.profileCompleteness);
    } catch (error: any) {
      console.error("Delete error:", error);
      setIsUploading(false);
      setUploadProgress("");
      onError?.(error.message || "Failed to remove image");
    }
  }, [type, currentImageUrl, onDeleteSuccess, onError]);

  const displayUrl = previewUrl || currentImageUrl;

  if (type === "cover") {
    return (
      <div className={`relative ${className}`}>
        <div className="h-32 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 rounded-t-3xl overflow-hidden">
          {displayUrl ? (
            <img
              src={displayUrl}
              alt="Cover"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-0 right-0 w-40 h-40 bg-white rounded-full -translate-y-20 translate-x-20" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-white rounded-full translate-y-16 -translate-x-16" />
            </div>
          )}

          {isUploading && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <div className="text-center">
                <Loader2 className="w-8 h-8 text-white animate-spin mx-auto mb-2" />
                <p className="text-white text-sm">{uploadProgress}</p>
              </div>
            </div>
          )}
        </div>

        {showEditButton && !disabled && (
          <button
            onClick={() => setShowOptions(true)}
            className="absolute bottom-2 right-2 p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-white transition-colors"
          >
            <Camera className="w-5 h-5 text-gray-700" />
          </button>
        )}

        {/* Options Modal */}
        {showOptions && (
          <OptionsModal
            type={type}
            hasCurrentImage={!!currentImageUrl}
            onClose={() => setShowOptions(false)}
            onChooseFile={() => fileInputRef.current?.click()}
            onDelete={handleDelete}
            isUploading={isUploading}
          />
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled || isUploading}
        />
      </div>
    );
  }

  // Profile picture (circular)
  return (
    <div className={`relative inline-block ${className}`}>
      <div
        className={`${SIZE_CLASSES[size]} bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full p-1 shadow-2xl`}
      >
        {displayUrl ? (
          <img
            src={displayUrl}
            alt="Profile"
            className="w-full h-full rounded-full object-cover bg-white"
          />
        ) : (
          <div className="w-full h-full bg-white rounded-full flex items-center justify-center">
            <User className={`${ICON_SIZES[size]} text-indigo-600`} />
          </div>
        )}

        {isUploading && (
          <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          </div>
        )}
      </div>

      {showEditButton && !disabled && (
        <button
          onClick={() => setShowOptions(true)}
          className={`absolute bottom-0 right-0 ${CAMERA_SIZES[size]} bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full border-2 border-white flex items-center justify-center shadow-xl hover:scale-110 transition-transform active:scale-95`}
          disabled={isUploading}
        >
          <Camera className="w-1/2 h-1/2 text-white" />
        </button>
      )}

      {/* Options Modal */}
      {showOptions && (
        <OptionsModal
          type={type}
          hasCurrentImage={!!currentImageUrl}
          onClose={() => setShowOptions(false)}
          onChooseFile={() => fileInputRef.current?.click()}
          onDelete={handleDelete}
          isUploading={isUploading}
        />
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || isUploading}
      />
    </div>
  );
}

// Options Modal Component
function OptionsModal({
  type,
  hasCurrentImage,
  onClose,
  onChooseFile,
  onDelete,
  isUploading,
}: {
  type: "profile" | "cover";
  hasCurrentImage: boolean;
  onClose: () => void;
  onChooseFile: () => void;
  onDelete: () => void;
  isUploading: boolean;
}) {
  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center max-w-md mx-auto backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full bg-white rounded-t-3xl shadow-2xl p-6 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-6" />

        <h4 className="text-xl font-black text-gray-900 mb-4 text-center">
          {type === "profile" ? "ផ្លាស់ប្តូររូបភាព" : "ផ្លាស់ប្តូររូបគម្រប"}
        </h4>

        <div className="space-y-3">
          <button
            onClick={onChooseFile}
            disabled={isUploading}
            className="w-full flex items-center gap-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl active:scale-95 transition-transform hover:shadow-md disabled:opacity-50"
          >
            <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl">
              <ImageIcon className="w-6 h-6 text-white" />
            </div>
            <div className="text-left flex-1">
              <p className="font-bold text-gray-900">ជ្រើសពីរូបថត</p>
              <p className="text-xs text-gray-600">Choose from gallery</p>
            </div>
          </button>

          <button
            onClick={onChooseFile}
            disabled={isUploading}
            className="w-full flex items-center gap-4 p-4 bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-2xl active:scale-95 transition-transform hover:shadow-md disabled:opacity-50"
          >
            <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl">
              <Camera className="w-6 h-6 text-white" />
            </div>
            <div className="text-left flex-1">
              <p className="font-bold text-gray-900">ថតរូបថ្មី</p>
              <p className="text-xs text-gray-600">Take a photo</p>
            </div>
          </button>

          {hasCurrentImage && (
            <button
              onClick={onDelete}
              disabled={isUploading}
              className="w-full flex items-center gap-4 p-4 bg-gradient-to-r from-red-50 to-rose-50 border-2 border-red-200 rounded-2xl active:scale-95 transition-transform hover:shadow-md disabled:opacity-50"
            >
              <div className="p-3 bg-gradient-to-br from-red-500 to-rose-600 rounded-xl">
                <Trash2 className="w-6 h-6 text-white" />
              </div>
              <div className="text-left flex-1">
                <p className="font-bold text-gray-900">លុបរូបភាព</p>
                <p className="text-xs text-gray-600">Remove current image</p>
              </div>
            </button>
          )}

          <button
            onClick={onClose}
            disabled={isUploading}
            className="w-full p-4 bg-gray-100 text-gray-700 rounded-2xl font-bold active:scale-95 transition-transform hover:bg-gray-200 disabled:opacity-50"
          >
            បោះបង់ • Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// Add to globals.css or include here
const styles = `
  @keyframes slide-up {
    from {
      transform: translateY(100%);
    }
    to {
      transform: translateY(0);
    }
  }

  .animate-slide-up {
    animation: slide-up 0.3s ease-out;
  }
`;
