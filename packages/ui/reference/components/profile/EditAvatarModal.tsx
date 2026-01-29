"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Camera, Loader2, Check, RotateCw, RotateCcw } from "lucide-react";
import { useState, useRef } from "react";
import Image from "next/image";
import { uploadProfilePicture } from "@/lib/api/profile";

interface EditAvatarModalProps {
  currentAvatar?: string;
  userName: string;
  onClose: () => void;
  onSuccess: (newAvatarUrl: string) => void;
}

export default function EditAvatarModal({
  currentAvatar,
  userName,
  onClose,
  onSuccess,
}: EditAvatarModalProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rotation, setRotation] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("Image size must be less than 5MB");
      return;
    }

    setError(null);
    setRotation(0);

    // Read file and correct EXIF orientation
    const reader = new FileReader();
    reader.onload = async (e) => {
      const img = new window.Image();
      img.onload = async () => {
        // Get EXIF orientation
        const orientation = await getOrientation(file);
        
        // Create canvas with corrected orientation
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) return;

        // Set canvas size based on orientation
        if (orientation > 4 && orientation < 9) {
          canvas.width = img.height;
          canvas.height = img.width;
        } else {
          canvas.width = img.width;
          canvas.height = img.height;
        }

        // Apply EXIF rotation
        switch (orientation) {
          case 2:
            ctx.transform(-1, 0, 0, 1, img.width, 0);
            break;
          case 3:
            ctx.transform(-1, 0, 0, -1, img.width, img.height);
            break;
          case 4:
            ctx.transform(1, 0, 0, -1, 0, img.height);
            break;
          case 5:
            ctx.transform(0, 1, 1, 0, 0, 0);
            break;
          case 6:
            ctx.transform(0, 1, -1, 0, img.height, 0);
            break;
          case 7:
            ctx.transform(0, -1, -1, 0, img.height, img.width);
            break;
          case 8:
            ctx.transform(0, -1, 1, 0, 0, img.width);
            break;
          default:
            break;
        }

        ctx.drawImage(img, 0, 0);

        // Convert to blob and create corrected file
        canvas.toBlob((blob) => {
          if (blob) {
            const correctedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now(),
            });
            setSelectedFile(correctedFile);

            // Create preview from corrected canvas
            setPreview(canvas.toDataURL(file.type));
          }
        }, file.type);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Get EXIF orientation
  const getOrientation = (file: File): Promise<number> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const view = new DataView(e.target?.result as ArrayBuffer);
        if (view.getUint16(0, false) !== 0xffd8) {
          resolve(1);
          return;
        }
        const length = view.byteLength;
        let offset = 2;
        while (offset < length) {
          if (view.getUint16(offset + 2, false) <= 8) {
            resolve(1);
            return;
          }
          const marker = view.getUint16(offset, false);
          offset += 2;
          if (marker === 0xffe1) {
            if (view.getUint32((offset += 2), false) !== 0x45786966) {
              resolve(1);
              return;
            }

            const little = view.getUint16((offset += 6), false) === 0x4949;
            offset += view.getUint32(offset + 4, little);
            const tags = view.getUint16(offset, little);
            offset += 2;
            for (let i = 0; i < tags; i++) {
              if (view.getUint16(offset + i * 12, little) === 0x0112) {
                resolve(view.getUint16(offset + i * 12 + 8, little));
                return;
              }
            }
          } else if ((marker & 0xff00) !== 0xff00) {
            break;
          } else {
            offset += view.getUint16(offset, false);
          }
        }
        resolve(1);
      };
      reader.readAsArrayBuffer(file);
    });
  };

  const rotateImage = (degrees: number) => {
    setRotation((prev) => (prev + degrees) % 360);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setError(null);

    try {
      let fileToUpload = selectedFile;
      
      // Apply additional user rotation if needed
      if (rotation !== 0) {
        fileToUpload = await rotateImageFile(selectedFile, rotation);
      }

      const result = await uploadProfilePicture(fileToUpload);
      onSuccess(result.profilePictureUrl);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  // Function to rotate image using canvas
  const rotateImageFile = async (file: File, degrees: number): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = document.createElement('img');
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }

          // Set canvas size based on rotation
          if (degrees === 90 || degrees === 270) {
            canvas.width = img.height;
            canvas.height = img.width;
          } else {
            canvas.width = img.width;
            canvas.height = img.height;
          }

          // Rotate and draw image
          ctx.translate(canvas.width / 2, canvas.height / 2);
          ctx.rotate((degrees * Math.PI) / 180);
          ctx.drawImage(img, -img.width / 2, -img.height / 2);

          // Convert canvas to blob
          canvas.toBlob((blob) => {
            if (blob) {
              const rotatedFile = new File([blob], file.name, {
                type: file.type,
                lastModified: Date.now(),
              });
              resolve(rotatedFile);
            } else {
              reject(new Error('Failed to create blob'));
            }
          }, file.type);
        };
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Update Profile Picture</h2>
          <button
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Preview */}
          <div className="flex justify-center">
            <div className="relative">
              <div 
                className="w-40 h-40 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-700 ring-4 ring-purple-500/20"
                style={{
                  transform: `rotate(${rotation}deg)`,
                  transition: 'transform 0.3s ease'
                }}
              >
                {preview ? (
                  <Image
                    src={preview}
                    alt="Preview"
                    width={160}
                    height={160}
                    className="object-cover w-full h-full"
                  />
                ) : currentAvatar ? (
                  <Image
                    src={currentAvatar}
                    alt={userName}
                    width={160}
                    height={160}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center">
                    <span className="text-5xl font-bold text-white">
                      {userName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
              
              {/* Camera Button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-2 right-2 w-12 h-12 bg-purple-600 hover:bg-purple-700 rounded-full flex items-center justify-center text-white shadow-lg transition-colors"
              >
                <Camera className="w-5 h-5" />
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          </div>

          {/* Rotation Controls */}
          {preview && (
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => rotateImage(-90)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                <span className="text-sm font-medium">Rotate Left</span>
              </button>
              <button
                onClick={() => rotateImage(90)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
              >
                <RotateCw className="w-4 h-4" />
                <span className="text-sm font-medium">Rotate Right</span>
              </button>
            </div>
          )}

          {/* File Info */}
          {selectedFile && (
            <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <Check className="w-5 h-5 text-purple-600" />
                <div>
                  <p className="text-sm font-medium text-purple-900 dark:text-purple-300">
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-purple-600 dark:text-purple-400">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Guidelines */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4">
            <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">
              Guidelines:
            </p>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <li>• Use a square image for best results</li>
              <li>• Maximum file size: 5MB</li>
              <li>• Supported formats: JPG, PNG, GIF</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {uploading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Camera className="w-5 h-5" />
                Upload Photo
              </>
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
