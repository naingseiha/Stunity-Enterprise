'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { X, Plus, ChevronLeft, ChevronRight, Eye, Heart, Send, Camera, Type, Palette } from 'lucide-react';
import { TokenManager } from '@/lib/api/auth';

const FEED_SERVICE = process.env.NEXT_PUBLIC_FEED_SERVICE_URL || 'http://localhost:3010';

// Story group from API
interface StoryGroup {
  user: {
    id: string;
    name: string;
    avatar?: string;
  };
  stories: Story[];
  hasUnviewed: boolean;
  latestAt: string;
}

interface Story {
  id: string;
  type: 'TEXT' | 'IMAGE' | 'VIDEO';
  mediaUrl?: string;
  thumbnailUrl?: string;
  text?: string;
  backgroundColor?: string;
  textColor?: string;
  fontStyle?: string;
  duration: number;
  viewCount: number;
  reactionCount: number;
  isViewed: boolean;
  expiresAt: string;
  createdAt: string;
}

// Background colors for text stories
const STORY_BACKGROUNDS = [
  { id: 'gradient1', style: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
  { id: 'gradient2', style: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
  { id: 'gradient3', style: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' },
  { id: 'gradient4', style: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' },
  { id: 'gradient5', style: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' },
  { id: 'gradient6', style: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)' },
  { id: 'solid1', style: '#1a1a2e' },
  { id: 'solid2', style: '#ff6b6b' },
  { id: 'solid3', style: '#4ecdc4' },
  { id: 'solid4', style: '#ffe66d' },
];

// Reaction emojis
const REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🔥', '👏', '🎉'];

interface StoriesProps {
  currentUser?: {
    id: string;
    firstName: string;
    lastName: string;
    profilePictureUrl?: string;
  };
}

export default function Stories({ currentUser }: StoriesProps) {
  const [storyGroups, setStoryGroups] = useState<StoryGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [showViewer, setShowViewer] = useState(false);
  const [showCreator, setShowCreator] = useState(false);
  const [currentGroupIndex, setCurrentGroupIndex] = useState(0);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const progressInterval = useRef<NodeJS.Timeout | null>(null);

  const getAuthToken = useCallback(() => TokenManager.getAccessToken(), []);

  // Fetch stories
  const fetchStories = useCallback(async () => {
    try {
      const token = getAuthToken();
      if (!token) return;

      const response = await fetch(`${FEED_SERVICE}/stories`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setStoryGroups(data.stories || []);
      }
    } catch (err) {
      console.error('Error fetching stories:', err);
    } finally {
      setLoading(false);
    }
  }, [getAuthToken]);

  useEffect(() => {
    fetchStories();
  }, [fetchStories]);

  // Mark story as viewed
  const markAsViewed = useCallback(async (storyId: string) => {
    try {
      const token = getAuthToken();
      if (!token) return;

      await fetch(`${FEED_SERVICE}/stories/${storyId}/view`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
    } catch (err) {
      console.error('Error marking story as viewed:', err);
    }
  }, [getAuthToken]);

  // Story viewer logic
  const openStory = (groupIndex: number) => {
    setCurrentGroupIndex(groupIndex);
    setCurrentStoryIndex(0);
    setProgress(0);
    setShowViewer(true);
  };

  const closeViewer = () => {
    setShowViewer(false);
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
    }
    fetchStories(); // Refresh to update viewed status
  };

  const currentGroup = storyGroups[currentGroupIndex];
  const currentStory = currentGroup?.stories[currentStoryIndex];

  // Progress bar and auto-advance
  useEffect(() => {
    if (!showViewer || !currentStory) return;

    // Mark as viewed
    if (!currentStory.isViewed) {
      markAsViewed(currentStory.id);
    }

    // Start progress
    const duration = currentStory.duration * 1000; // Convert to ms
    const updateInterval = 50; // Update every 50ms
    const increment = (updateInterval / duration) * 100;

    setProgress(0);
    progressInterval.current = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          nextStory();
          return 0;
        }
        return prev + increment;
      });
    }, updateInterval);

    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    };
  }, [showViewer, currentGroupIndex, currentStoryIndex, currentStory]);

  const nextStory = () => {
    if (!currentGroup) return;

    if (currentStoryIndex < currentGroup.stories.length - 1) {
      setCurrentStoryIndex(prev => prev + 1);
      setProgress(0);
    } else if (currentGroupIndex < storyGroups.length - 1) {
      setCurrentGroupIndex(prev => prev + 1);
      setCurrentStoryIndex(0);
      setProgress(0);
    } else {
      closeViewer();
    }
  };

  const prevStory = () => {
    if (currentStoryIndex > 0) {
      setCurrentStoryIndex(prev => prev - 1);
      setProgress(0);
    } else if (currentGroupIndex > 0) {
      setCurrentGroupIndex(prev => prev - 1);
      const prevGroup = storyGroups[currentGroupIndex - 1];
      setCurrentStoryIndex(prevGroup.stories.length - 1);
      setProgress(0);
    }
  };

  // Check if current user has any stories
  const hasOwnStories = storyGroups.some(g => g.user.id === currentUser?.id);

  if (loading) {
    return (
      <div className="flex gap-3 overflow-x-auto py-3 px-1 scrollbar-hide">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex-shrink-0 animate-pulse">
            <div className="w-16 h-16 rounded-full bg-gray-200" />
            <div className="w-14 h-2 mt-1.5 mx-auto rounded bg-gray-200" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      {/* Story Circles */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <div className="flex gap-4 overflow-x-auto scrollbar-hide">
          {/* Create Story Button */}
          <button
            onClick={() => setShowCreator(true)}
            className="flex-shrink-0 flex flex-col items-center"
          >
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center border-2 border-dashed border-amber-300">
                {currentUser?.profilePictureUrl ? (
                  <img
                    src={currentUser.profilePictureUrl}
                    alt="Your story"
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <span className="text-2xl font-bold text-amber-600">
                    {currentUser?.firstName?.charAt(0) || '+'}
                  </span>
                )}
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center border-2 border-white">
                <Plus className="w-4 h-4 text-white" />
              </div>
            </div>
            <span className="text-xs text-gray-600 mt-1.5 truncate w-16 text-center">
              {hasOwnStories ? 'Add more' : 'Your Story'}
            </span>
          </button>

          {/* Story Groups */}
          {storyGroups.map((group, index) => (
            <button
              key={group.user.id}
              onClick={() => openStory(index)}
              className="flex-shrink-0 flex flex-col items-center"
            >
              <div className={`p-0.5 rounded-full ${
                group.hasUnviewed
                  ? 'bg-gradient-to-tr from-amber-500 via-orange-500 to-pink-500'
                  : 'bg-gray-300'
              }`}>
                <div className="w-16 h-16 rounded-full bg-white p-0.5">
                  {group.user.avatar ? (
                    <img
                      src={group.user.avatar}
                      alt={group.user.name}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full rounded-full bg-gradient-to-br from-amber-200 to-orange-200 flex items-center justify-center">
                      <span className="text-lg font-bold text-amber-700">
                        {group.user.name.charAt(0)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <span className="text-xs text-gray-600 mt-1.5 truncate w-16 text-center">
                {group.user.id === currentUser?.id ? 'Your Story' : group.user.name.split(' ')[0]}
              </span>
            </button>
          ))}

          {storyGroups.length === 0 && (
            <div className="flex items-center justify-center py-4 px-8 text-gray-500 text-sm">
              <p>No stories yet. Be the first to share!</p>
            </div>
          )}
        </div>
      </div>

      {/* Story Viewer Modal */}
      {showViewer && currentGroup && currentStory && (
        <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
          {/* Close button */}
          <button
            onClick={closeViewer}
            className="absolute top-4 right-4 z-50 p-2 text-white hover:bg-white/10 rounded-full"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Navigation arrows */}
          {(currentGroupIndex > 0 || currentStoryIndex > 0) && (
            <button
              onClick={prevStory}
              className="absolute left-4 z-50 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}
          
          {(currentGroupIndex < storyGroups.length - 1 || currentStoryIndex < currentGroup.stories.length - 1) && (
            <button
              onClick={nextStory}
              className="absolute right-4 z-50 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}

          {/* Story Content */}
          <div className="relative w-full max-w-md h-full max-h-[90vh] flex flex-col">
            {/* Progress bars */}
            <div className="flex gap-1 p-2">
              {currentGroup.stories.map((story, i) => (
                <div key={story.id} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white transition-all duration-100"
                    style={{
                      width: i < currentStoryIndex ? '100%' :
                             i === currentStoryIndex ? `${progress}%` : '0%',
                    }}
                  />
                </div>
              ))}
            </div>

            {/* User info */}
            <div className="flex items-center gap-3 p-3">
              {currentGroup.user.avatar ? (
                <img
                  src={currentGroup.user.avatar}
                  alt={currentGroup.user.name}
                  className="w-10 h-10 rounded-full object-cover border-2 border-white"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-200 to-orange-200 flex items-center justify-center border-2 border-white">
                  <span className="font-bold text-amber-700">
                    {currentGroup.user.name.charAt(0)}
                  </span>
                </div>
              )}
              <div className="flex-1">
                <p className="text-white font-medium text-sm">{currentGroup.user.name}</p>
                <p className="text-white/60 text-xs">
                  {new Date(currentStory.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <div className="flex items-center gap-2 text-white/60 text-xs">
                <Eye className="w-4 h-4" />
                {currentStory.viewCount}
              </div>
            </div>

            {/* Story content area */}
            <div
              className="flex-1 flex items-center justify-center p-4"
              style={{
                background: currentStory.type === 'TEXT'
                  ? currentStory.backgroundColor
                  : 'transparent',
              }}
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX - rect.left;
                if (x < rect.width / 2) {
                  prevStory();
                } else {
                  nextStory();
                }
              }}
            >
              {currentStory.type === 'TEXT' && (
                <p
                  className="text-2xl font-semibold text-center px-4"
                  style={{
                    color: currentStory.textColor || '#ffffff',
                    fontFamily: currentStory.fontStyle || 'sans-serif',
                  }}
                >
                  {currentStory.text}
                </p>
              )}

              {currentStory.type === 'IMAGE' && currentStory.mediaUrl && (
                <img
                  src={currentStory.mediaUrl}
                  alt="Story"
                  className="max-w-full max-h-full object-contain rounded-lg"
                />
              )}

              {currentStory.type === 'VIDEO' && currentStory.mediaUrl && (
                <video
                  src={currentStory.mediaUrl}
                  autoPlay
                  muted
                  className="max-w-full max-h-full object-contain rounded-lg"
                />
              )}
            </div>

            {/* Reactions */}
            <div className="p-4">
              <div className="flex items-center justify-center gap-2">
                {REACTIONS.slice(0, 6).map(emoji => (
                  <button
                    key={emoji}
                    className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-xl transition-colors"
                    onClick={() => {/* Add reaction */}}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Story Creator Modal */}
      {showCreator && (
        <StoryCreator
          onClose={() => setShowCreator(false)}
          onCreated={() => {
            setShowCreator(false);
            fetchStories();
          }}
        />
      )}
    </>
  );
}

// Story Creator Component
function StoryCreator({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [type, setType] = useState<'TEXT' | 'IMAGE'>('TEXT');
  const [text, setText] = useState('');
  const [backgroundColor, setBackgroundColor] = useState(STORY_BACKGROUNDS[0].style);
  const [textColor, setTextColor] = useState('#ffffff');
  const [imageUrl, setImageUrl] = useState('');
  const [creating, setCreating] = useState(false);

  const getAuthToken = useCallback(() => TokenManager.getAccessToken(), []);

  const createStory = async () => {
    if (type === 'TEXT' && !text.trim()) {
      alert('Please enter some text');
      return;
    }
    if (type === 'IMAGE' && !imageUrl.trim()) {
      alert('Please enter an image URL');
      return;
    }

    setCreating(true);

    try {
      const token = getAuthToken();
      if (!token) return;

      const response = await fetch(`${FEED_SERVICE}/stories`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type,
          text: type === 'TEXT' ? text : undefined,
          backgroundColor: type === 'TEXT' ? backgroundColor : undefined,
          textColor: type === 'TEXT' ? textColor : undefined,
          mediaUrl: type === 'IMAGE' ? imageUrl : undefined,
          duration: 5,
        }),
      });

      if (response.ok) {
        onCreated();
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to create story');
      }
    } catch (err) {
      console.error('Error creating story:', err);
      alert('Failed to create story');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-50 p-2 text-white hover:bg-white/10 rounded-full"
      >
        <X className="w-6 h-6" />
      </button>

      <div className="w-full max-w-md h-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-4 flex items-center justify-between">
          <h2 className="text-white text-lg font-semibold">Create Story</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setType('TEXT')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                type === 'TEXT'
                  ? 'bg-white text-gray-900'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <Type className="w-4 h-4 inline mr-1" />
              Text
            </button>
            <button
              onClick={() => setType('IMAGE')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                type === 'IMAGE'
                  ? 'bg-white text-gray-900'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <Camera className="w-4 h-4 inline mr-1" />
              Image
            </button>
          </div>
        </div>

        {/* Preview */}
        <div
          className="flex-1 flex items-center justify-center mx-4 rounded-2xl overflow-hidden"
          style={{
            background: type === 'TEXT' ? backgroundColor : '#1a1a2e',
          }}
        >
          {type === 'TEXT' ? (
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type your story..."
              className="w-full h-full p-8 text-2xl font-semibold text-center bg-transparent resize-none focus:outline-none placeholder-white/50"
              style={{ color: textColor }}
              maxLength={200}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-4">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt="Preview"
                  className="max-w-full max-h-[60vh] object-contain rounded-lg"
                  onError={() => setImageUrl('')}
                />
              ) : (
                <div className="text-center">
                  <Camera className="w-16 h-16 text-white/30 mx-auto mb-4" />
                  <p className="text-white/50 mb-4">Enter an image URL</p>
                </div>
              )}
              <input
                type="text"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="Paste image URL here..."
                className="w-full px-4 py-3 bg-white/10 text-white rounded-lg mt-4 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          )}
        </div>

        {/* Background selector (for text stories) */}
        {type === 'TEXT' && (
          <div className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Palette className="w-4 h-4 text-white/60" />
              <span className="text-white/60 text-sm">Background</span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {STORY_BACKGROUNDS.map((bg) => (
                <button
                  key={bg.id}
                  onClick={() => setBackgroundColor(bg.style)}
                  className={`w-10 h-10 rounded-full flex-shrink-0 transition-transform ${
                    backgroundColor === bg.style ? 'scale-110 ring-2 ring-white' : ''
                  }`}
                  style={{ background: bg.style }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Post button */}
        <div className="p-4">
          <button
            onClick={createStory}
            disabled={creating || (type === 'TEXT' && !text.trim()) || (type === 'IMAGE' && !imageUrl.trim())}
            className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:from-amber-600 hover:to-orange-600 transition-colors flex items-center justify-center gap-2"
          >
            {creating ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                Share Story
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
