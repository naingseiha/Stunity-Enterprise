'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import {
  X,
  Loader2,
  FileText,
  BarChart3,
  Megaphone,
  HelpCircle,
  Award,
  Plus,
  Trash2,
  Image as ImageIcon,
  Globe,
  School,
  Users,
  Lock,
  ChevronDown,
  RectangleHorizontal,
  RectangleVertical,
  Sparkles,
} from 'lucide-react';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreatePostData) => Promise<void>;
  user: {
    firstName: string;
    lastName: string;
  };
}

export interface CreatePostData {
  content: string;
  postType: string;
  visibility: string;
  pollOptions?: string[];
  mediaUrls?: string[];
  mediaDisplayMode?: 'AUTO' | 'FIXED_HEIGHT' | 'FULL_HEIGHT';
}

const POST_TYPES = [
  { id: 'ARTICLE', label: 'Article', icon: FileText, description: 'Share thoughts or updates', color: 'blue' },
  { id: 'POLL', label: 'Poll', icon: BarChart3, description: 'Ask for opinions', color: 'purple' },
  { id: 'ANNOUNCEMENT', label: 'Announcement', icon: Megaphone, description: 'Official announcements', color: 'red' },
  { id: 'QUESTION', label: 'Question', icon: HelpCircle, description: 'Ask the community', color: 'green' },
  { id: 'ACHIEVEMENT', label: 'Achievement', icon: Award, description: 'Celebrate success', color: 'yellow' },
];

const VISIBILITY_OPTIONS = [
  { id: 'PUBLIC', label: 'Public', icon: Globe, description: 'Anyone can see' },
  { id: 'SCHOOL', label: 'School', icon: School, description: 'School members only' },
  { id: 'CLASS', label: 'Class', icon: Users, description: 'Class members only' },
  { id: 'PRIVATE', label: 'Private', icon: Lock, description: 'Only you' },
];

const MEDIA_DISPLAY_MODES = [
  { id: 'AUTO', label: 'Auto', icon: Sparkles, description: 'Automatically detect best layout' },
  { id: 'FIXED_HEIGHT', label: 'Fixed Height', icon: RectangleHorizontal, description: 'Landscape mode, cropped' },
  { id: 'FULL_HEIGHT', label: 'Full Height', icon: RectangleVertical, description: 'Show full image, ideal for posters' },
];

export default function CreatePostModal({ isOpen, onClose, onSubmit, user }: CreatePostModalProps) {
  const [content, setContent] = useState('');
  const [postType, setPostType] = useState('ARTICLE');
  const [visibility, setVisibility] = useState('SCHOOL');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [creating, setCreating] = useState(false);
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const [showVisibilitySelector, setShowVisibilitySelector] = useState(false);
  
  // Media state
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [mediaDisplayMode, setMediaDisplayMode] = useState<'AUTO' | 'FIXED_HEIGHT' | 'FULL_HEIGHT'>('AUTO');
  const [showDisplayModeSelector, setShowDisplayModeSelector] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedType = POST_TYPES.find(t => t.id === postType)!;
  const selectedVisibility = VISIBILITY_OPTIONS.find(v => v.id === visibility)!;

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

  const handleAddPollOption = () => {
    if (pollOptions.length < 6) {
      setPollOptions([...pollOptions, '']);
    }
  };

  const handleRemovePollOption = (index: number) => {
    if (pollOptions.length > 2) {
      setPollOptions(pollOptions.filter((_, i) => i !== index));
    }
  };

  const handlePollOptionChange = (index: number, value: string) => {
    const newOptions = [...pollOptions];
    newOptions[index] = value;
    setPollOptions(newOptions);
  };

  const handleSubmit = async () => {
    if (!content.trim() || creating) return;
    
    if (postType === 'POLL') {
      const validOptions = pollOptions.filter(o => o.trim());
      if (validOptions.length < 2) {
        alert('Please add at least 2 poll options');
        return;
      }
    }

    setCreating(true);
    try {
      await onSubmit({
        content,
        postType,
        visibility,
        pollOptions: postType === 'POLL' ? pollOptions.filter(o => o.trim()) : undefined,
        mediaUrls: mediaUrls.length > 0 ? mediaUrls : undefined,
        mediaDisplayMode: mediaUrls.length > 0 ? mediaDisplayMode : undefined,
      });
      // Reset form
      setContent('');
      setPostType('ARTICLE');
      setVisibility('SCHOOL');
      setPollOptions(['', '']);
      setMediaUrls([]);
      setMediaDisplayMode('AUTO');
      onClose();
    } catch (error) {
      console.error('Failed to create post:', error);
    } finally {
      setCreating(false);
    }
  };

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newUrls: string[] = [];
    Array.from(files).forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            setMediaUrls(prev => [...prev, event.target!.result as string]);
          }
        };
        reader.readAsDataURL(file);
      }
    });
  };

  const handleRemoveMedia = (index: number) => {
    setMediaUrls(prev => prev.filter((_, i) => i !== index));
  };

  const selectedDisplayMode = MEDIA_DISPLAY_MODES.find(m => m.id === mediaDisplayMode)!;

  const getPlaceholder = () => {
    switch (postType) {
      case 'POLL':
        return 'Ask your question...';
      case 'ANNOUNCEMENT':
        return 'Write your announcement...';
      case 'QUESTION':
        return 'What would you like to ask?';
      case 'ACHIEVEMENT':
        return 'Share your achievement...';
      default:
        return `What's on your mind, ${user.firstName}?`;
    }
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      blue: 'from-blue-500 to-blue-600',
      purple: 'from-purple-500 to-purple-600',
      red: 'from-red-500 to-red-600',
      green: 'from-green-500 to-green-600',
      yellow: 'from-yellow-500 to-orange-500',
    };
    return colors[type] || colors.blue;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Create Post</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* User Info & Post Type */}
          <div className="flex items-start gap-3 mb-4">
            <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getTypeColor(selectedType.color)} flex items-center justify-center text-white font-semibold flex-shrink-0`}>
              {getInitials(user.firstName, user.lastName)}
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-900">{user.firstName} {user.lastName}</p>
              
              {/* Post Type & Visibility Selectors */}
              <div className="flex gap-2 mt-1">
                {/* Post Type Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => {
                      setShowTypeSelector(!showTypeSelector);
                      setShowVisibilitySelector(false);
                    }}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                      showTypeSelector ? 'bg-gray-200' : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    <selectedType.icon className="w-3.5 h-3.5" />
                    {selectedType.label}
                    <ChevronDown className="w-3 h-3" />
                  </button>
                  
                  {showTypeSelector && (
                    <div className="absolute left-0 top-full mt-1 w-56 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-10">
                      {POST_TYPES.map((type) => {
                        const Icon = type.icon;
                        return (
                          <button
                            key={type.id}
                            onClick={() => {
                              setPostType(type.id);
                              setShowTypeSelector(false);
                            }}
                            className={`w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 transition-colors ${
                              postType === type.id ? 'bg-blue-50' : ''
                            }`}
                          >
                            <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${getTypeColor(type.color)} flex items-center justify-center text-white`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="text-left">
                              <p className="text-sm font-medium text-gray-900">{type.label}</p>
                              <p className="text-xs text-gray-500">{type.description}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Visibility Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => {
                      setShowVisibilitySelector(!showVisibilitySelector);
                      setShowTypeSelector(false);
                    }}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                      showVisibilitySelector ? 'bg-gray-200' : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    <selectedVisibility.icon className="w-3.5 h-3.5" />
                    {selectedVisibility.label}
                    <ChevronDown className="w-3 h-3" />
                  </button>
                  
                  {showVisibilitySelector && (
                    <div className="absolute left-0 top-full mt-1 w-48 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-10">
                      {VISIBILITY_OPTIONS.map((option) => {
                        const Icon = option.icon;
                        return (
                          <button
                            key={option.id}
                            onClick={() => {
                              setVisibility(option.id);
                              setShowVisibilitySelector(false);
                            }}
                            className={`w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 transition-colors ${
                              visibility === option.id ? 'bg-blue-50' : ''
                            }`}
                          >
                            <Icon className="w-4 h-4 text-gray-600" />
                            <div className="text-left">
                              <p className="text-sm font-medium text-gray-900">{option.label}</p>
                              <p className="text-xs text-gray-500">{option.description}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Content Input */}
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={getPlaceholder()}
            rows={4}
            className="w-full p-3 border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
            autoFocus
          />

          {/* Poll Options (only for POLL type) */}
          {postType === 'POLL' && (
            <div className="mt-4 space-y-3">
              <p className="text-sm font-medium text-gray-700">Poll Options</p>
              {pollOptions.map((option, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 text-xs font-medium">
                    {index + 1}
                  </div>
                  <input
                    type="text"
                    value={option}
                    onChange={(e) => handlePollOptionChange(index, e.target.value)}
                    placeholder={`Option ${index + 1}`}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  {pollOptions.length > 2 && (
                    <button
                      onClick={() => handleRemovePollOption(index)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              {pollOptions.length < 6 && (
                <button
                  onClick={handleAddPollOption}
                  className="flex items-center gap-2 px-3 py-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors text-sm font-medium"
                >
                  <Plus className="w-4 h-4" />
                  Add Option
                </button>
              )}
            </div>
          )}

          {/* Announcement Badge (only for ANNOUNCEMENT type) */}
          {postType === 'ANNOUNCEMENT' && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl">
              <div className="flex items-center gap-2 text-red-700">
                <Megaphone className="w-4 h-4" />
                <span className="text-sm font-medium">This will be marked as an official announcement</span>
              </div>
            </div>
          )}

          {/* Achievement Badge (only for ACHIEVEMENT type) */}
          {postType === 'ACHIEVEMENT' && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-xl">
              <div className="flex items-center gap-2 text-yellow-700">
                <Award className="w-4 h-4" />
                <span className="text-sm font-medium">Celebrate and share your achievement!</span>
              </div>
            </div>
          )}

          {/* Media Upload Section */}
          <div className="mt-4 space-y-3">
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />

            {/* Media Preview Grid */}
            {mediaUrls.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-700">
                    {mediaUrls.length} {mediaUrls.length === 1 ? 'image' : 'images'} added
                  </p>
                  
                  {/* Display Mode Selector */}
                  <div className="relative">
                    <button
                      onClick={() => {
                        setShowDisplayModeSelector(!showDisplayModeSelector);
                        setShowTypeSelector(false);
                        setShowVisibilitySelector(false);
                      }}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                        showDisplayModeSelector ? 'bg-purple-200 text-purple-700' : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                      }`}
                    >
                      <selectedDisplayMode.icon className="w-3.5 h-3.5" />
                      {selectedDisplayMode.label}
                      <ChevronDown className="w-3 h-3" />
                    </button>
                    
                    {showDisplayModeSelector && (
                      <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-10">
                        {MEDIA_DISPLAY_MODES.map((mode) => {
                          const Icon = mode.icon;
                          return (
                            <button
                              key={mode.id}
                              onClick={() => {
                                setMediaDisplayMode(mode.id as 'AUTO' | 'FIXED_HEIGHT' | 'FULL_HEIGHT');
                                setShowDisplayModeSelector(false);
                              }}
                              className={`w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 transition-colors ${
                                mediaDisplayMode === mode.id ? 'bg-purple-50' : ''
                              }`}
                            >
                              <Icon className="w-4 h-4 text-purple-600" />
                              <div className="text-left">
                                <p className="text-sm font-medium text-gray-900">{mode.label}</p>
                                <p className="text-xs text-gray-500">{mode.description}</p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Image Grid Preview */}
                <div className={`grid gap-2 ${
                  mediaUrls.length === 1 ? 'grid-cols-1' : 
                  mediaUrls.length === 2 ? 'grid-cols-2' : 
                  'grid-cols-3'
                }`}>
                  {mediaUrls.map((url, index) => (
                    <div 
                      key={index} 
                      className={`relative rounded-lg overflow-hidden bg-gray-100 ${
                        mediaDisplayMode === 'FULL_HEIGHT' ? 'aspect-[3/4]' : 'aspect-video'
                      }`}
                    >
                      <Image
                        src={url}
                        alt={`Preview ${index + 1}`}
                        fill
                        className={mediaDisplayMode === 'FULL_HEIGHT' ? 'object-contain' : 'object-cover'}
                      />
                      <button
                        onClick={() => handleRemoveMedia(index)}
                        className="absolute top-1 right-1 p-1.5 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Display Mode Info */}
                <div className={`p-2 rounded-lg text-xs ${
                  mediaDisplayMode === 'AUTO' ? 'bg-purple-50 text-purple-700' :
                  mediaDisplayMode === 'FIXED_HEIGHT' ? 'bg-blue-50 text-blue-700' :
                  'bg-green-50 text-green-700'
                }`}>
                  <div className="flex items-center gap-2">
                    <selectedDisplayMode.icon className="w-3.5 h-3.5" />
                    <span>{selectedDisplayMode.description}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Add Photo Button */}
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors text-sm"
            >
              <ImageIcon className="w-4 h-4" />
              {mediaUrls.length > 0 ? 'Add More Photos' : 'Add Photo'}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!content.trim() || creating}
            className={`px-5 py-2 bg-gradient-to-r ${getTypeColor(selectedType.color)} text-white rounded-full font-medium hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2`}
          >
            {creating && <Loader2 className="w-4 h-4 animate-spin" />}
            {postType === 'POLL' ? 'Create Poll' : postType === 'ANNOUNCEMENT' ? 'Announce' : 'Post'}
          </button>
        </div>
      </div>
    </div>
  );
}
