"use client";

import { useState } from "react";
import { Heart, ThumbsUp, Lightbulb, Smile } from "lucide-react";
import { type ReactionType } from "@/lib/api/feed";

interface CommentReactionsProps {
  reactionCounts?: {
    LIKE: number;
    LOVE: number;
    HELPFUL: number;
    INSIGHTFUL: number;
  };
  userReaction: ReactionType | null;
  onReact: (type: ReactionType) => void;
}

const REACTIONS = [
  { type: "LIKE" as const, icon: ThumbsUp, label: "Like", color: "text-blue-500", bgColor: "bg-blue-50" },
  { type: "LOVE" as const, icon: Heart, label: "Love", color: "text-red-500", bgColor: "bg-red-50" },
  { type: "HELPFUL" as const, icon: Smile, label: "Helpful", color: "text-green-500", bgColor: "bg-green-50" },
  { type: "INSIGHTFUL" as const, icon: Lightbulb, label: "Insightful", color: "text-amber-500", bgColor: "bg-amber-50" },
];

export default function CommentReactions({
  reactionCounts = { LIKE: 0, LOVE: 0, HELPFUL: 0, INSIGHTFUL: 0 },
  userReaction,
  onReact,
}: CommentReactionsProps) {
  const [showPicker, setShowPicker] = useState(false);

  const totalReactions = Object.values(reactionCounts || {}).reduce((sum, count) => sum + count, 0);

  const handleReactionClick = (type: ReactionType) => {
    onReact(type);
    setShowPicker(false);
  };

  return (
    <div className="flex items-center gap-2 mt-2">
      {/* Reaction Button */}
      <div className="relative">
        <button
          onClick={() => setShowPicker(!showPicker)}
          className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          {userReaction ? (
            <>
              {REACTIONS.find(r => r.type === userReaction)?.icon && (
                <>
                  {(() => {
                    const ReactionIcon = REACTIONS.find(r => r.type === userReaction)!.icon;
                    const reactionColor = REACTIONS.find(r => r.type === userReaction)!.color;
                    return <ReactionIcon className={`w-3.5 h-3.5 ${reactionColor}`} />;
                  })()}
                </>
              )}
              <span className={REACTIONS.find(r => r.type === userReaction)!.color}>
                {REACTIONS.find(r => r.type === userReaction)!.label}
              </span>
            </>
          ) : (
            <>
              <Smile className="w-3.5 h-3.5" />
              React
            </>
          )}
        </button>

        {/* Reaction Picker */}
        {showPicker && (
          <div className="absolute bottom-full left-0 mb-2 bg-white rounded-lg shadow-xl border border-gray-200 p-2 flex gap-1 z-20">
            {REACTIONS.map((reaction) => {
              const Icon = reaction.icon;
              const isActive = userReaction === reaction.type;
              
              return (
                <button
                  key={reaction.type}
                  onClick={() => handleReactionClick(reaction.type)}
                  className={`p-2 rounded-lg transition-all hover:scale-125 ${
                    isActive ? reaction.bgColor : "hover:bg-gray-100"
                  }`}
                  title={reaction.label}
                >
                  <Icon className={`w-5 h-5 ${reaction.color}`} />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Reaction Counts */}
      {totalReactions > 0 && (
        <div className="flex items-center gap-1.5">
          {REACTIONS.map((reaction) => {
            const count = reactionCounts[reaction.type];
            if (count === 0) return null;

            const Icon = reaction.icon;
            return (
              <button
                key={reaction.type}
                onClick={() => handleReactionClick(reaction.type)}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-all ${
                  userReaction === reaction.type
                    ? `${reaction.bgColor} ${reaction.color}`
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                <Icon className={`w-3 h-3 ${userReaction === reaction.type ? reaction.color : "text-gray-500"}`} />
                {count}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
