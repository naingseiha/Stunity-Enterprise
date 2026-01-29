"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  MoreVertical,
  Share2,
  Edit,
  Trash2,
  Flag,
  Link2,
  X,
} from "lucide-react";
import { PostType, POST_TYPE_INFO, deletePost } from "@/lib/api/feed";
import { toast } from "react-hot-toast";

interface PostHeaderProps {
  postType: PostType;
  postId: string;
  isOwnPost: boolean;
  onBack: () => void;
  onPostDeleted?: () => void;
}

export default function PostHeader({
  postType,
  postId,
  isOwnPost,
  onBack,
  onPostDeleted,
}: PostHeaderProps) {
  const router = useRouter();
  const [showMenu, setShowMenu] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const postTypeInfo = POST_TYPE_INFO[postType];
  const postUrl = `${window.location.origin}/feed/post/${postId}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(postUrl);
      toast.success("Link copied!");
      setShowShareMenu(false);
    } catch (error) {
      toast.error("Failed to copy link");
    }
  };

  const handleEdit = () => {
    router.push(`/feed/edit/${postId}`);
    setShowMenu(false);
  };

  const handleDelete = async () => {
    if (!confirm("Delete this post?")) return;

    try {
      setIsDeleting(true);
      await deletePost(postId);
      toast.success("Post deleted");
      onPostDeleted?.();
    } catch (error) {
      toast.error("Failed to delete");
    } finally {
      setIsDeleting(false);
      setShowMenu(false);
    }
  };

  const handleReport = () => {
    toast("Report coming soon!");
    setShowMenu(false);
  };

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100 shadow-sm">
      <div className="max-w-2xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          {/* Back Button */}
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-900 hover:text-blue-600 transition-colors font-medium -ml-2 px-2 py-1.5 rounded-lg hover:bg-gray-50"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden sm:inline">Back</span>
          </button>

          {/* Post Type Badge */}
          <div className={`px-3 py-1.5 rounded-full text-xs font-bold text-white shadow-sm ${postTypeInfo.bgColor}`}>
            {postTypeInfo.labelEnglish}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            {/* Share */}
            <div className="relative">
              <button
                onClick={() => setShowShareMenu(!showShareMenu)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <Share2 className="w-5 h-5 text-gray-700" />
              </button>

              {showShareMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowShareMenu(false)} />
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 z-50 animate-scale-in">
                    <button
                      onClick={handleCopyLink}
                      className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left"
                    >
                      <Link2 className="w-5 h-5 text-blue-500" />
                      <span className="text-sm font-medium">Copy Link</span>
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* More Menu */}
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <MoreVertical className="w-5 h-5 text-gray-700" />
              </button>

              {showMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 z-50 animate-scale-in">
                    {isOwnPost ? (
                      <>
                        <button
                          onClick={handleEdit}
                          className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left"
                        >
                          <Edit className="w-5 h-5 text-blue-500" />
                          <span className="text-sm font-medium">Edit</span>
                        </button>
                        <button
                          onClick={handleDelete}
                          disabled={isDeleting}
                          className="w-full px-4 py-3 flex items-center gap-3 hover:bg-red-50 transition-colors text-left disabled:opacity-50"
                        >
                          <Trash2 className="w-5 h-5 text-red-500" />
                          <span className="text-sm font-medium text-red-600">
                            {isDeleting ? "Deleting..." : "Delete"}
                          </span>
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={handleReport}
                        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-red-50 transition-colors text-left"
                      >
                        <Flag className="w-5 h-5 text-red-500" />
                        <span className="text-sm font-medium text-red-600">Report</span>
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
