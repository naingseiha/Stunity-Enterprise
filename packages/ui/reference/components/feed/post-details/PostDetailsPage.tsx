"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Post, getPost } from "@/lib/api/feed";
import { useAuth } from "@/context/AuthContext";
import PostHeader from "./PostHeader";
import AuthorSection from "./AuthorSection";
import PostContent from "./PostContent";
import EngagementBar from "./EngagementBar";
import CommentsSection from "./CommentsSection";
import CommentComposer from "./CommentComposer";
import PostDetailsLoadingSkeleton from "./PostDetailsLoadingSkeleton";
import { AlertCircle } from "lucide-react";

interface PostDetailsPageProps {
  postId: string;
}

export default function PostDetailsPage({ postId }: PostDetailsPageProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [commentsCount, setCommentsCount] = useState(0);
  const [viewsCount, setViewsCount] = useState(0);

  useEffect(() => {
    loadPost();
    trackView();
  }, [postId]);

  const loadPost = async () => {
    try {
      setLoading(true);
      setError(null);
      const postData = await getPost(postId);
      setPost(postData);
      setIsLiked(postData.isLiked);
      setLikesCount(postData.likesCount);
      setCommentsCount(postData.commentsCount);
      setViewsCount(postData.sharesCount || 0);
    } catch (err) {
      console.error("Failed to load post:", err);
      setError("Failed to load post. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const trackView = async () => {
    // TODO: Implement view tracking API call
  };

  const handleBack = () => {
    router.back();
  };

  const handleLikeUpdate = (liked: boolean, count: number) => {
    setIsLiked(liked);
    setLikesCount(count);
  };

  const handleCommentAdded = () => {
    setCommentsCount((prev) => prev + 1);
  };

  // ✅ FIXED: Show beautiful loading skeleton instead of blank screen
  if (loading) {
    return <PostDetailsLoadingSkeleton />;
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-red-100 to-red-200 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-10 h-10 text-red-500" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-3">
            Post Not Found
          </h2>
          <p className="text-gray-600 mb-8 leading-relaxed">
            {error || "The post you're looking for doesn't exist or has been removed."}
          </p>
          <button
            onClick={handleBack}
            className="w-full px-6 py-4 bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 text-white rounded-2xl font-bold hover:shadow-2xl hover:scale-105 transition-all duration-300"
          >
            Back to Feed
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-gradient-to-br from-gray-50 via-white to-gray-50 overflow-hidden animate-fade-in">
      {/* Sticky Header - Slide in from top */}
      <div className="animate-slide-down">
        <PostHeader
          postType={post.postType}
          postId={post.id}
          isOwnPost={user?.id === post.authorId}
          onBack={handleBack}
          onPostDeleted={() => router.push("/feed")}
        />
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Content Container - Staggered animations */}
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4 pb-24 space-y-4">
          {/* Author Section - Slide up animation */}
          <div className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <AuthorSection
              author={post.author}
              createdAt={post.createdAt}
              isEdited={post.isEdited}
              isOwnPost={user?.id === post.authorId}
            />
          </div>

          {/* Post Content - Slide up animation */}
          <div className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <PostContent post={post} />
          </div>

          {/* Engagement Bar - Slide up animation */}
          <div className="animate-slide-up" style={{ animationDelay: '0.3s' }}>
            <EngagementBar
              postId={post.id}
              isLiked={isLiked}
              likesCount={likesCount}
              commentsCount={commentsCount}
              viewsCount={viewsCount}
              onLikeUpdate={handleLikeUpdate}
            />
          </div>

          {/* Comments Section - Slide up animation */}
          <div className="animate-slide-up" style={{ animationDelay: '0.4s' }}>
            <CommentsSection
              postId={post.id}
              commentsCount={commentsCount}
              onCommentAdded={handleCommentAdded}
            />
          </div>
        </div>
      </div>

      {/* Sticky Comment Composer (Mobile) - Slide up from bottom */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-lg animate-slide-up-bottom">
        <CommentComposer
          postId={post.id}
          onCommentAdded={handleCommentAdded}
        />
      </div>

      {/* Animation styles */}
      <style jsx global>{`
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slide-down {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slide-up-bottom {
          from {
            opacity: 0;
            transform: translateY(100%);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.3s ease-out forwards;
        }

        .animate-slide-up {
          opacity: 0;
          animation: slide-up 0.5s ease-out forwards;
        }

        .animate-slide-down {
          animation: slide-down 0.4s ease-out forwards;
        }

        .animate-slide-up-bottom {
          animation: slide-up-bottom 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
