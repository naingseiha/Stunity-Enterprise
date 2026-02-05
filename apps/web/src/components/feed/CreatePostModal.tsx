'use client';

import { useState } from 'react';
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

export default function CreatePostModal({ isOpen, onClose, onSubmit, user }: CreatePostModalProps) {
  const [content, setContent] = useState('');
  const [postType, setPostType] = useState('ARTICLE');
  const [visibility, setVisibility] = useState('SCHOOL');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [creating, setCreating] = useState(false);
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const [showVisibilitySelector, setShowVisibilitySelector] = useState(false);

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
      });
      // Reset form
      setContent('');
      setPostType('ARTICLE');
      setVisibility('SCHOOL');
      setPollOptions(['', '']);
      onClose();
    } catch (error) {
      console.error('Failed to create post:', error);
    } finally {
      setCreating(false);
    }
  };

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
      blue: 'from-indigo-500 via-blue-500 to-cyan-500',
      purple: 'from-purple-500 via-violet-500 to-indigo-500',
      red: 'from-red-500 via-rose-500 to-pink-500',
      green: 'from-emerald-500 via-green-500 to-teal-500',
      yellow: 'from-amber-500 via-yellow-500 to-orange-500',
    };
    return colors[type] || colors.blue;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/95 backdrop-blur-xl rounded-3xl w-full max-w-lg shadow-2xl border border-white/40 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200/60">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${getTypeColor(selectedType.color)} flex items-center justify-center shadow-md`}>
              <selectedType.icon className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">Create Post</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 text-gray-500 hover:bg-gray-100/60 rounded-xl transition-all active:scale-95"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* User Info & Post Type */}
          <div className="flex items-start gap-4 mb-5">
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getTypeColor(selectedType.color)} flex items-center justify-center text-white font-bold shadow-md ring-2 ring-white/50 flex-shrink-0`}>
              {getInitials(user.firstName, user.lastName)}
            </div>
            <div className="flex-1">
              <p className="font-bold text-gray-900 text-base">{user.firstName} {user.lastName}</p>
              
              {/* Post Type & Visibility Selectors */}
              <div className="flex gap-2 mt-2">
                {/* Post Type Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => {
                      setShowTypeSelector(!showTypeSelector);
                      setShowVisibilitySelector(false);
                    }}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                      showTypeSelector ? 'bg-gray-200/80' : 'bg-gray-100/80 hover:bg-gray-200/80'
                    }`}
                  >
                    <selectedType.icon className="w-4 h-4" />
                    {selectedType.label}
                    <ChevronDown className="w-3 h-3" />
                  </button>
                  
                  {showTypeSelector && (
                    <div className="absolute left-0 top-full mt-2 w-64 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/40 py-3 z-10">
                      {POST_TYPES.map((type) => {
                        const Icon = type.icon;
                        return (
                          <button
                            key={type.id}
                            onClick={() => {
                              setPostType(type.id);
                              setShowTypeSelector(false);
                            }}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50/80 transition-all ${
                              postType === type.id ? 'bg-indigo-50/80' : ''
                            }`}
                          >
                            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${getTypeColor(type.color)} flex items-center justify-center text-white shadow-sm`}>
                              <Icon className="w-5 h-5" />
                            </div>
                            <div className="text-left">
                              <p className="text-sm font-bold text-gray-900">{type.label}</p>
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
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                      showVisibilitySelector ? 'bg-gray-200/80' : 'bg-gray-100/80 hover:bg-gray-200/80'
                    }`}
                  >
                    <selectedVisibility.icon className="w-4 h-4" />
                    {selectedVisibility.label}
                    <ChevronDown className="w-3 h-3" />
                  </button>
                  
                  {showVisibilitySelector && (
                    <div className="absolute left-0 top-full mt-2 w-56 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/40 py-3 z-10">
                      {VISIBILITY_OPTIONS.map((option) => {
                        const Icon = option.icon;
                        return (
                          <button
                            key={option.id}
                            onClick={() => {
                              setVisibility(option.id);
                              setShowVisibilitySelector(false);
                            }}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50/80 transition-all ${
                              visibility === option.id ? 'bg-indigo-50/80' : ''
                            }`}
                          >
                            <div className="w-9 h-9 rounded-xl bg-gray-100/80 flex items-center justify-center">
                              <Icon className="w-4 h-4 text-gray-600" />
                            </div>
                            <div className="text-left">
                              <p className="text-sm font-bold text-gray-900">{option.label}</p>
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
            className="w-full p-4 bg-white/70 backdrop-blur-sm border border-gray-200/60 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-purple-400/50 focus:border-purple-300 text-gray-900 transition-all placeholder:text-gray-400"
            autoFocus
          />

          {/* Poll Options (only for POLL type) */}
          {postType === 'POLL' && (
            <div className="mt-5 space-y-3">
              <p className="text-sm font-bold text-gray-700">Poll Options</p>
              {pollOptions.map((option, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-400 to-violet-500 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                    {index + 1}
                  </div>
                  <input
                    type="text"
                    value={option}
                    onChange={(e) => handlePollOptionChange(index, e.target.value)}
                    placeholder={`Option ${index + 1}`}
                    className="flex-1 px-4 py-3 bg-white/70 backdrop-blur-sm border border-gray-200/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-400/50 focus:border-purple-300 transition-all"
                  />
                  {pollOptions.length > 2 && (
                    <button
                      onClick={() => handleRemovePollOption(index)}
                      className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50/80 rounded-xl transition-all active:scale-95"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              {pollOptions.length < 6 && (
                <button
                  onClick={handleAddPollOption}
                  className="flex items-center gap-2 px-4 py-2.5 text-purple-600 bg-purple-50/80 hover:bg-purple-100/80 rounded-xl transition-all text-sm font-bold active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  Add Option
                </button>
              )}
            </div>
          )}

          {/* Announcement Badge (only for ANNOUNCEMENT type) */}
          {postType === 'ANNOUNCEMENT' && (
            <div className="mt-5 p-4 bg-gradient-to-br from-red-50/80 to-rose-50/80 border border-red-200/60 rounded-2xl">
              <div className="flex items-center gap-2 text-red-700">
                <Megaphone className="w-4 h-4" />
                <span className="text-sm font-medium">This will be marked as an official announcement</span>
              </div>
            </div>
          )}

          {/* Achievement Badge (only for ACHIEVEMENT type) */}
          {postType === 'ACHIEVEMENT' && (
            <div className="mt-5 p-4 bg-gradient-to-br from-amber-50/80 to-yellow-50/80 border border-amber-200/60 rounded-2xl">
              <div className="flex items-center gap-3 text-amber-700">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-sm">
                  <Award className="w-5 h-5 text-white" />
                </div>
                <span className="text-sm font-bold">Celebrate and share your achievement!</span>
              </div>
            </div>
          )}

          {/* Media Upload (placeholder) */}
          <div className="mt-5 flex items-center gap-2">
            <button className="flex items-center gap-2 px-4 py-2.5 text-gray-600 bg-gray-100/80 hover:bg-gray-200/80 rounded-xl transition-all text-sm font-bold active:scale-95">
              <ImageIcon className="w-4 h-4" />
              Add Photo
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-gray-200/60 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-gray-600 hover:bg-gray-100/60 rounded-xl font-bold transition-all active:scale-95"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!content.trim() || creating}
            className={`px-6 py-2.5 bg-gradient-to-r ${getTypeColor(selectedType.color)} text-white rounded-xl font-bold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 active:scale-95`}
          >
            {creating && <Loader2 className="w-4 h-4 animate-spin" />}
            {postType === 'POLL' ? 'Create Poll' : postType === 'ANNOUNCEMENT' ? 'Announce' : 'Post'}
          </button>
        </div>
      </div>
    </div>
  );
}
