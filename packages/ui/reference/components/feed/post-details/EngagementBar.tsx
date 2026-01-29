"use client";

import { useState } from "react";
import { Heart, MessageCircle, Share2 } from "lucide-react";
import { toggleLike } from "@/lib/api/feed";
import { toast } from "react-hot-toast";

interface EngagementBarProps {
  postId: string;
  isLiked: boolean;
  likesCount: number;
  commentsCount: number;
  viewsCount: number;
  onLikeUpdate: (isLiked: boolean, likesCount: number) => void;
}

export default function EngagementBar({
  postId,
  isLiked: initialIsLiked,
  likesCount: initialLikesCount,
  commentsCount,
  viewsCount,
  onLikeUpdate,
}: EngagementBarProps) {
  const [isLiked, setIsLiked] = useState(initialIsLiked);
  const [likesCount, setLikesCount] = useState(initialLikesCount);
  const [isLiking, setIsLiking] = useState(false);
  const [showHeartAnimation, setShowHeartAnimation] = useState(false);

  const handleLike = async () => {
    if (isLiking) return;

    try {
      setIsLiking(true);

      const newIsLiked = !isLiked;
      const newLikesCount = newIsLiked ? likesCount + 1 : likesCount - 1;

      setIsLiked(newIsLiked);
      setLikesCount(newLikesCount);
      onLikeUpdate(newIsLiked, newLikesCount);

      if (newIsLiked) {
        setShowHeartAnimation(true);
        setTimeout(() => setShowHeartAnimation(false), 800);
      }

      await toggleLike(postId);
    } catch (error) {
      setIsLiked(!isLiked);
      setLikesCount(isLiked ? likesCount + 1 : likesCount - 1);
      onLikeUpdate(!isLiked, isLiked ? likesCount + 1 : likesCount - 1);
      toast.error("Failed to update like");
    } finally {
      setIsLiking(false);
    }
  };

  const handleCommentClick = () => {
    const commentsSection = document.getElementById("comments-section");
    if (commentsSection) {
      commentsSection.scrollIntoView({ behavior: "smooth", block: "start" });
      setTimeout(() => {
        const commentInput = document.querySelector<HTMLTextAreaElement>(
          'textarea[placeholder*="comment"]'
        );
        if (commentInput) {
          commentInput.focus();
        }
      }, 500);
    }
  };

  const handleShare = () => {
    const url = `${window.location.origin}/feed/post/${postId}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copied!");
  };

  const formatCount = (count: number): string => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-4">
      {/* Action Buttons */}
      <div className="grid grid-cols-3 gap-3">
        {/* Like Button */}
        <button
          onClick={handleLike}
          disabled={isLiking}
          className={`relative flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl font-bold text-sm transition-all duration-300 disabled:opacity-50 ${
            isLiked
              ? "bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-lg shadow-red-500/30 hover:shadow-xl hover:scale-105"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200 hover:scale-105"
          }`}
        >
          <Heart
            className={`w-5 h-5 transition-all duration-300 ${
              isLiked ? "fill-current animate-heart-beat" : ""
            }`}
          />
          <span className="font-black">{formatCount(likesCount)}</span>

          {showHeartAnimation && (
            <Heart className="absolute w-8 h-8 text-red-500 fill-current animate-ping pointer-events-none" />
          )}
        </button>

        {/* Comment Button */}
        <button
          onClick={handleCommentClick}
          className="flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl font-bold text-sm bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:from-blue-600 hover:to-indigo-600 hover:scale-105 transition-all duration-300 shadow-lg shadow-blue-500/30"
        >
          <MessageCircle className="w-5 h-5" />
          <span className="font-black">{formatCount(commentsCount)}</span>
        </button>

        {/* Share Button */}
        <button
          onClick={handleShare}
          className="flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl font-bold text-sm bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600 hover:scale-105 transition-all duration-300 shadow-lg shadow-green-500/30"
        >
          <Share2 className="w-5 h-5" />
          <span className="font-black">Share</span>
        </button>
      </div>
    </div>
  );
}
