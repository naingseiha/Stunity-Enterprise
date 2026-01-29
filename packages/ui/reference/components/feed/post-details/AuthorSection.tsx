"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PostAuthor } from "@/lib/api/feed";
import { formatDistanceToNow } from "date-fns";
import { UserPlus, UserCheck, Edit3, Clock } from "lucide-react";
import { toast } from "react-hot-toast";
import GradientAvatar from "@/components/common/GradientAvatar";

interface AuthorSectionProps {
  author: PostAuthor;
  createdAt: string;
  isEdited: boolean;
  isOwnPost: boolean;
}

export default function AuthorSection({
  author,
  createdAt,
  isEdited,
  isOwnPost,
}: AuthorSectionProps) {
  const router = useRouter();
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);

  const getDisplayName = () => {
    if (author.role === "STUDENT" && author.student?.khmerName) {
      return author.student.khmerName;
    }
    if (author.role === "TEACHER" && author.teacher?.khmerName) {
      return author.teacher.khmerName;
    }
    return `${author.firstName} ${author.lastName}`;
  };

  const getRoleText = () => {
    if (author.role === "STUDENT" && author.student?.class) {
      return `${author.student.class.name}`;
    }
    if (author.role === "TEACHER" && author.teacher?.position) {
      return author.teacher.position;
    }
    return author.role.charAt(0) + author.role.slice(1).toLowerCase();
  };

  const getTimeText = () => {
    return formatDistanceToNow(new Date(createdAt), { addSuffix: true });
  };

  const handleFollow = async () => {
    try {
      setIsFollowLoading(true);
      setIsFollowing(!isFollowing);
      toast.success(isFollowing ? "Unfollowed" : "Following!");
    } catch (error) {
      toast.error("Failed to update");
    } finally {
      setIsFollowLoading(false);
    }
  };

  const handleProfileClick = () => {
    router.push(`/profile/${author.id}`);
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-4">
        {/* Avatar */}
        <button
          onClick={handleProfileClick}
          className="flex-shrink-0 hover:opacity-90 transition-opacity"
        >
          <GradientAvatar
            name={getDisplayName()}
            imageUrl={author.profilePictureUrl}
            size="lg"
            className="ring-2 ring-white shadow-lg"
          />
        </button>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <button
            onClick={handleProfileClick}
            className="hover:underline text-left block"
          >
            <h3 className="text-base font-black text-gray-900 truncate font-koulen">
              {getDisplayName()}
            </h3>
          </button>
          <div className="flex items-center gap-2 text-sm text-gray-600 mt-0.5">
            <span className="font-medium">{getRoleText()}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-1">
            <Clock className="w-3.5 h-3.5" />
            <span>{getTimeText()}</span>
            {isEdited && (
              <>
                <span>•</span>
                <Edit3 className="w-3 h-3" />
                <span>Edited</span>
              </>
            )}
          </div>
        </div>

        {/* Follow Button */}
        {!isOwnPost && (
          <button
            onClick={handleFollow}
            disabled={isFollowLoading}
            className={`px-5 py-2.5 rounded-full font-bold text-sm transition-all duration-300 shadow-sm hover:shadow-md disabled:opacity-50 flex items-center gap-2 ${
              isFollowing
                ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                : "bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:from-blue-600 hover:to-indigo-600"
            }`}
          >
            {isFollowing ? (
              <>
                <UserCheck className="w-4 h-4" />
                <span className="hidden sm:inline">Following</span>
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                <span className="hidden sm:inline">Follow</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
