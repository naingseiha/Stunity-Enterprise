"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { votePoll, PollOption } from "@/lib/api/feed";

interface PollCardProps {
  postId: string;
  pollOptions: PollOption[];
  userVotes: string[];
  totalVotes: number;
  onVoteSuccess?: (data: any) => void;
}

export default function PollCard({
  postId,
  pollOptions: initialOptions,
  userVotes: initialUserVotes = [],
  totalVotes: initialTotalVotes,
  onVoteSuccess,
}: PollCardProps) {
  const [pollOptions, setPollOptions] = useState(initialOptions);
  const [userVotes, setUserVotes] = useState<string[]>(initialUserVotes || []);
  const [totalVotes, setTotalVotes] = useState(initialTotalVotes);
  const [isVoting, setIsVoting] = useState(false);

  const hasVoted = userVotes && userVotes.length > 0;

  const handleVote = async (optionId: string) => {
    if (isVoting) return;

    // Optimistic update - update UI immediately
    const previousOptions = [...pollOptions];
    const previousUserVotes = [...userVotes];
    const previousTotalVotes = totalVotes;

    // Calculate new state optimistically
    const newOptions = pollOptions.map(opt => {
      if (userVotes.includes(opt.id)) {
        // Remove vote from previously selected option
        return { ...opt, votesCount: opt.votesCount - 1 };
      } else if (opt.id === optionId) {
        // Add vote to newly selected option
        return { ...opt, votesCount: opt.votesCount + 1 };
      }
      return opt;
    });

    // Update UI immediately
    setPollOptions(newOptions);
    setUserVotes([optionId]);
    // Total votes stay the same when changing vote

    setIsVoting(true);
    try {
      const response = await votePoll(optionId);
      
      if (response.success) {
        // Update with actual server data
        setPollOptions(response.data.pollOptions);
        setUserVotes(response.data.userVotes);
        setTotalVotes(response.data.totalVotes);
        
        if (onVoteSuccess) {
          onVoteSuccess(response.data);
        }
      }
    } catch (error: any) {
      console.error("Vote error:", error);
      // Revert optimistic update on error
      setPollOptions(previousOptions);
      setUserVotes(previousUserVotes);
      setTotalVotes(previousTotalVotes);
    } finally {
      setIsVoting(false);
    }
  };

  const getPercentage = (votesCount: number) => {
    if (totalVotes === 0) return 0;
    return Math.round((votesCount / totalVotes) * 100);
  };

  const maxVotes = Math.max(...pollOptions.map(o => o.votesCount));

  return (
    <div className="mt-3 space-y-2">
      {pollOptions.map((option) => {
        const percentage = getPercentage(option.votesCount);
        const isUserVote = userVotes && userVotes.includes(option.id);
        const isWinner = hasVoted && option.votesCount === maxVotes && maxVotes > 0;

        if (hasVoted) {
          // Show results - Clickable to change vote
          return (
            <button
              key={option.id}
              onClick={() => handleVote(option.id)}
              disabled={isVoting}
              className={`w-full relative overflow-hidden rounded-xl border-2 transition-all text-left ${
                isUserVote
                  ? "border-blue-500 bg-blue-50 hover:bg-blue-100"
                  : "border-gray-200 bg-gray-50 hover:bg-gray-100"
              } ${isVoting ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
            >
              {/* Progress bar */}
              <div
                className={`absolute inset-y-0 left-0 transition-all duration-500 ${
                  isUserVote ? "bg-blue-100" : "bg-gray-100"
                }`}
                style={{ width: `${percentage}%` }}
              />

              {/* Content */}
              <div className="relative px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2 flex-1">
                  {isUserVote && (
                    <div className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" strokeWidth={3} />
                    </div>
                  )}
                  <span
                    className={`text-sm font-medium ${
                      isUserVote ? "text-blue-900" : "text-gray-900"
                    }`}
                  >
                    {option.text}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`text-sm font-bold ${
                      isUserVote ? "text-blue-700" : "text-gray-700"
                    }`}
                  >
                    {percentage}%
                  </span>
                  {isWinner && (
                    <span className="text-xs">🏆</span>
                  )}
                </div>
              </div>
            </button>
          );
        } else {
          // Show vote buttons
          return (
            <button
              key={option.id}
              onClick={() => handleVote(option.id)}
              disabled={isVoting}
              type="button"
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 hover:border-gray-400 bg-white hover:bg-gray-50 text-left transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="text-sm font-medium text-gray-900">
                {option.text}
              </span>
            </button>
          );
        }
      })}

      {/* Total votes */}
      {hasVoted && (
        <p className="text-xs text-gray-500 mt-2 px-1">
          {totalVotes} {totalVotes === 1 ? "vote" : "votes"} • Click to change your vote
        </p>
      )}
    </div>
  );
}
