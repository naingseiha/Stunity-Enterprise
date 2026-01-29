"use client";

import { useState } from "react";
import { Post } from "@/lib/api/feed";
import Image from "next/image";
import { ChevronLeft, ChevronRight, X, ZoomIn, Image as ImageIcon } from "lucide-react";
import PollCard from "../PollCard";

interface PostContentProps {
  post: Post;
}

export default function PostContent({ post }: PostContentProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showLightbox, setShowLightbox] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const hasImages = post.mediaUrls && post.mediaUrls.length > 0;
  const imageCount = post.mediaUrls?.length || 0;

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % imageCount);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + imageCount) % imageCount);
  };

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setShowLightbox(true);
  };

  const closeLightbox = () => {
    setShowLightbox(false);
  };

  const nextLightboxImage = () => {
    setLightboxIndex((prev) => (prev + 1) % imageCount);
  };

  const prevLightboxImage = () => {
    setLightboxIndex((prev) => (prev - 1 + imageCount) % imageCount);
  };

  return (
    <>
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Post Content */}
        <div className="p-6">
          <p className="text-gray-900 text-base leading-relaxed whitespace-pre-wrap font-medium">
            {post.content}
          </p>
        </div>

        {/* Poll */}
        {post.postType === "POLL" && post.pollOptions && (
          <div className="px-6 pb-6">
            <PollCard
              postId={post.id}
              pollOptions={post.pollOptions}
              userVotes={post.userVotes || []}
              totalVotes={post.totalVotes || 0}
            />
          </div>
        )}

        {/* Image Gallery */}
        {hasImages && (
          <div className="relative">
            {/* Main Image */}
            <div className="relative group">
              <div className="relative w-full aspect-[4/3] bg-gradient-to-br from-gray-100 to-gray-50">
                <Image
                  src={post.mediaUrls[currentImageIndex]}
                  alt={`Image ${currentImageIndex + 1}`}
                  fill
                  className="object-cover cursor-zoom-in"
                  onClick={() => openLightbox(currentImageIndex)}
                  priority={currentImageIndex === 0}
                />

                {/* Zoom Hint */}
                <button
                  onClick={() => openLightbox(currentImageIndex)}
                  className="absolute top-4 right-4 p-3 bg-black/50 hover:bg-black/70 backdrop-blur-sm rounded-full text-white transition-all opacity-0 group-hover:opacity-100"
                >
                  <ZoomIn className="w-5 h-5" />
                </button>

                {/* Navigation Arrows */}
                {imageCount > 1 && (
                  <>
                    <button
                      onClick={prevImage}
                      className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 hover:bg-black/70 backdrop-blur-sm rounded-full text-white transition-all"
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </button>
                    <button
                      onClick={nextImage}
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 hover:bg-black/70 backdrop-blur-sm rounded-full text-white transition-all"
                    >
                      <ChevronRight className="w-6 h-6" />
                    </button>
                  </>
                )}

                {/* Image Counter */}
                {imageCount > 1 && (
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/70 backdrop-blur-md rounded-full text-white text-sm font-bold flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" />
                    {currentImageIndex + 1} / {imageCount}
                  </div>
                )}
              </div>
            </div>

            {/* Thumbnail Grid */}
            {imageCount > 1 && (
              <div className="p-4 bg-gray-50 border-t border-gray-100">
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {post.mediaUrls.map((url, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`relative aspect-square rounded-lg overflow-hidden transition-all ${
                        currentImageIndex === index
                          ? "ring-3 ring-blue-500 ring-offset-2 scale-105"
                          : "opacity-60 hover:opacity-100 hover:scale-105"
                      }`}
                    >
                      <Image
                        src={url}
                        alt={`Thumbnail ${index + 1}`}
                        fill
                        className="object-cover"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      {showLightbox && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center animate-fade-in"
          onClick={closeLightbox}
        >
          {/* Close Button */}
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 p-3 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-white transition-all z-10"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Counter */}
          {imageCount > 1 && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 px-6 py-3 bg-white/10 backdrop-blur-md rounded-full text-white text-lg font-bold z-10">
              {lightboxIndex + 1} / {imageCount}
            </div>
          )}

          {/* Navigation */}
          {imageCount > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  prevLightboxImage();
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-4 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-white transition-all z-10"
              >
                <ChevronLeft className="w-8 h-8" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  nextLightboxImage();
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-4 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-white transition-all z-10"
              >
                <ChevronRight className="w-8 h-8" />
              </button>
            </>
          )}

          {/* Image */}
          <div
            className="relative max-w-7xl max-h-[90vh] w-full h-full flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={post.mediaUrls[lightboxIndex]}
              alt={`Full size ${lightboxIndex + 1}`}
              fill
              className="object-contain"
              quality={100}
            />
          </div>
        </div>
      )}
    </>
  );
}
