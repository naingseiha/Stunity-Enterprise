'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { TokenManager } from '@/lib/api/auth';
import BlurLoader from '@/components/BlurLoader';
import { 
  ArrowLeft, 
  Image as ImageIcon, 
  X, 
  Loader2,
  Save,
  Globe,
  Building2,
  Lock,
  Users,
  Plus,
  Trash2,
  AlertCircle,
  BarChart3,
  FileText,
  Megaphone,
  HelpCircle,
  Award,
  BookOpen,
  FolderOpen,
  Rocket,
  Microscope,
  UsersRound,
  Sparkles,
  RectangleHorizontal,
  RectangleVertical,
  ChevronDown,
  ArrowUp,
  ArrowDown,
  CheckCircle,
  GripVertical,
} from 'lucide-react';

interface PollOption {
  id: string;
  text: string;
  _count?: { votes: number };
}

interface Post {
  id: string;
  content: string;
  postType: string;
  visibility: string;
  mediaUrls: string[];
  mediaDisplayMode: string;
  createdAt: string;
  author: {
    id: string;
    firstName: string;
    lastName: string;
    profilePictureUrl: string | null;
  };
  pollOptions?: PollOption[];
}

const VISIBILITY_OPTIONS = [
  { value: 'PUBLIC', label: 'Public', icon: Globe, desc: 'Anyone can see', color: 'from-green-500 to-emerald-500' },
  { value: 'SCHOOL', label: 'School', icon: Building2, desc: 'School members', color: 'from-blue-500 to-indigo-500' },
  { value: 'CLASS', label: 'Class', icon: Users, desc: 'Class only', color: 'from-purple-500 to-violet-500' },
  { value: 'PRIVATE', label: 'Private', icon: Lock, desc: 'Only you', color: 'from-gray-500 to-slate-500' },
];

const MEDIA_DISPLAY_MODES = [
  { id: 'AUTO', label: 'Auto', icon: Sparkles, description: 'Automatically detect best layout' },
  { id: 'FIXED_HEIGHT', label: 'Fixed Height', icon: RectangleHorizontal, description: 'Landscape mode, cropped' },
  { id: 'FULL_HEIGHT', label: 'Full Height', icon: RectangleVertical, description: 'Show full image, ideal for posters' },
];

const POST_TYPE_CONFIG: Record<string, { icon: any; color: string; label: string; gradient: string }> = {
  ARTICLE: { icon: FileText, color: 'bg-emerald-100 text-emerald-700', label: 'Article', gradient: 'from-emerald-500 to-green-600' },
  POLL: { icon: BarChart3, color: 'bg-violet-100 text-violet-700', label: 'Poll', gradient: 'from-violet-500 to-purple-600' },
  ANNOUNCEMENT: { icon: Megaphone, color: 'bg-rose-100 text-rose-700', label: 'Announcement', gradient: 'from-rose-500 to-pink-600' },
  QUESTION: { icon: HelpCircle, color: 'bg-teal-100 text-teal-700', label: 'Question', gradient: 'from-teal-500 to-cyan-600' },
  ACHIEVEMENT: { icon: Award, color: 'bg-amber-100 text-amber-700', label: 'Achievement', gradient: 'from-amber-500 to-yellow-500' },
  TUTORIAL: { icon: BookOpen, color: 'bg-blue-100 text-blue-700', label: 'Tutorial', gradient: 'from-blue-500 to-indigo-500' },
  RESOURCE: { icon: FolderOpen, color: 'bg-indigo-100 text-indigo-700', label: 'Resource', gradient: 'from-indigo-500 to-violet-500' },
  PROJECT: { icon: Rocket, color: 'bg-orange-100 text-orange-700', label: 'Project', gradient: 'from-orange-500 to-red-500' },
  RESEARCH: { icon: Microscope, color: 'bg-cyan-100 text-cyan-700', label: 'Research', gradient: 'from-cyan-500 to-teal-500' },
  COLLABORATION: { icon: UsersRound, color: 'bg-pink-100 text-pink-700', label: 'Collaboration', gradient: 'from-pink-500 to-rose-500' },
};

// Skeleton for loading state
function EditPostSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between">
          <div className="h-6 bg-gray-200 rounded-full w-24" />
          <div className="h-4 bg-gray-200 rounded w-40" />
        </div>
        <div className="p-4 space-y-3">
          <div className="h-4 bg-gray-200 rounded w-20" />
          <div className="h-32 bg-gray-200 rounded-xl" />
        </div>
        <div className="p-4 border-t">
          <div className="h-4 bg-gray-200 rounded w-16 mb-3" />
          <div className="grid grid-cols-4 gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EditPostPage() {
  const params = useParams();
  const router = useRouter();
  const postId = params?.id as string;
  const locale = (params?.locale as string) || 'en';
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [pageReady, setPageReady] = useState(false);
  
  // Form state
  const [content, setContent] = useState('');
  const [visibility, setVisibility] = useState('SCHOOL');
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [mediaDisplayMode, setMediaDisplayMode] = useState<string>('AUTO');
  const [newMediaFiles, setNewMediaFiles] = useState<File[]>([]);
  const [newMediaPreviews, setNewMediaPreviews] = useState<string[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  // Poll state
  const [pollOptions, setPollOptions] = useState<string[]>([]);
  const [hasVotes, setHasVotes] = useState(false);
  
  // UI state
  const [showDisplayModeDropdown, setShowDisplayModeDropdown] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Fetch current user
  useEffect(() => {
    const token = TokenManager.getAccessToken();
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setCurrentUserId(payload.userId);
      } catch (e) {
        console.error('Failed to decode token');
      }
    }
  }, []);

  // Fetch post
  useEffect(() => {
    const fetchPost = async () => {
      if (!postId) return;

      try {
        setLoading(true);
        const token = TokenManager.getAccessToken();
        
        const res = await fetch(`http://localhost:3010/posts/${postId}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (!res.ok) {
          throw new Error('Post not found');
        }

        const data = await res.json();
        const postData = data.data;
        
        setPost(postData);
        setContent(postData.content);
        setVisibility(postData.visibility);
        setMediaUrls(postData.mediaUrls || []);
        setMediaDisplayMode(postData.mediaDisplayMode || 'AUTO');
        
        // Set poll options if it's a poll
        if (postData.postType === 'POLL' && postData.pollOptions) {
          setPollOptions(postData.pollOptions.map((opt: PollOption) => opt.text));
          const totalVotes = postData.pollOptions.reduce(
            (sum: number, opt: PollOption) => sum + (opt._count?.votes || 0), 0
          );
          setHasVotes(totalVotes > 0);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load post');
      } finally {
        setLoading(false);
        setTimeout(() => setPageReady(true), 100);
      }
    };

    fetchPost();
  }, [postId]);

  // Check authorization
  useEffect(() => {
    if (post && currentUserId && post.author.id !== currentUserId) {
      router.push(`/${locale}/feed/post/${postId}`);
    }
  }, [post, currentUserId, postId, router, locale]);

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setNewMediaFiles(prev => [...prev, ...files]);

    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewMediaPreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });

    if (e.target) e.target.value = '';
  };

  // Remove existing media
  const removeExistingMedia = (index: number) => {
    setMediaUrls(prev => prev.filter((_, i) => i !== index));
  };

  // Remove new media
  const removeNewMedia = (index: number) => {
    setNewMediaFiles(prev => prev.filter((_, i) => i !== index));
    setNewMediaPreviews(prev => prev.filter((_, i) => i !== index));
  };

  // Move media up/down for reordering
  const moveMedia = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= mediaUrls.length) return;
    
    const newMediaUrls = [...mediaUrls];
    [newMediaUrls[index], newMediaUrls[newIndex]] = [newMediaUrls[newIndex], newMediaUrls[index]];
    setMediaUrls(newMediaUrls);
  };

  // Poll option handlers
  const handlePollOptionChange = (index: number, value: string) => {
    const newOptions = [...pollOptions];
    newOptions[index] = value;
    setPollOptions(newOptions);
  };

  const addPollOption = () => {
    if (pollOptions.length < 6) {
      setPollOptions([...pollOptions, '']);
    }
  };

  const removePollOption = (index: number) => {
    if (pollOptions.length > 2) {
      setPollOptions(pollOptions.filter((_, i) => i !== index));
    }
  };

  // Handle save
  const handleSave = async () => {
    if (!content.trim() || !post) return;

    if (post.postType === 'POLL' && !hasVotes) {
      const validOptions = pollOptions.filter(opt => opt.trim());
      if (validOptions.length < 2) {
        setError('Please add at least 2 poll options');
        return;
      }
    }

    try {
      setSaving(true);
      setError(null);
      const token = TokenManager.getAccessToken();
      let finalMediaUrls = [...mediaUrls];

      // Upload new files if any
      if (newMediaFiles.length > 0) {
        setUploading(true);
        const formData = new FormData();
        newMediaFiles.forEach(file => formData.append('files', file));

        try {
          const uploadRes = await fetch('http://localhost:3010/upload', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData,
          });

          if (uploadRes.ok) {
            const uploadData = await uploadRes.json();
            if (uploadData.data) {
              finalMediaUrls = [...finalMediaUrls, ...uploadData.data.map((f: any) => f.url)];
            }
          }
        } catch (err) {
          console.error('Upload error:', err);
        }
        setUploading(false);
      }

      const updatePayload: any = {
        content: content.trim(),
        visibility,
        mediaUrls: finalMediaUrls,
        mediaDisplayMode,
      };

      if (post.postType === 'POLL' && !hasVotes) {
        updatePayload.pollOptions = pollOptions.filter(opt => opt.trim());
      }

      const res = await fetch(`http://localhost:3010/posts/${post.id}`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatePayload),
      });

      if (res.ok) {
        setSuccessMessage('Post updated successfully!');
        setTimeout(() => {
          router.push(`/${locale}/feed/post/${post.id}`);
        }, 800);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to update post');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update post');
    } finally {
      setSaving(false);
    }
  };

  const getTypeConfig = (type: string) => {
    return POST_TYPE_CONFIG[type] || POST_TYPE_CONFIG.ARTICLE;
  };

  if (error && !post) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4 animate-in fade-in duration-500">
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-2">
          <X className="w-8 h-8 text-red-500" />
        </div>
        <p className="text-red-500 font-medium">{error}</p>
        <button 
          onClick={() => router.back()}
          className="text-amber-600 hover:text-amber-700 flex items-center gap-1 font-medium"
        >
          <ArrowLeft className="w-4 h-4" /> Go Back
        </button>
      </div>
    );
  }

  const allMediaPreviews = [...mediaUrls, ...newMediaPreviews];
  const typeConfig = post ? getTypeConfig(post.postType) : null;
  const TypeIcon = typeConfig?.icon || FileText;
  const selectedDisplayMode = MEDIA_DISPLAY_MODES.find(m => m.id === mediaDisplayMode) || MEDIA_DISPLAY_MODES[0];

  return (
    <div className={`min-h-screen bg-gray-50 transition-opacity duration-500 ${pageReady ? 'opacity-100' : 'opacity-0'}`}>
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-md border-b shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <button 
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Cancel</span>
          </button>
          <h1 className="font-semibold text-gray-900">Edit Post</h1>
          <button
            onClick={handleSave}
            disabled={!content.trim() || saving || uploading}
            className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-full hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-lg shadow-amber-200 transition-all"
          >
            {(saving || uploading) ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {uploading ? 'Uploading...' : saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 py-6">
        {/* Success Message */}
        {successMessage && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-2xl text-green-700 flex items-center gap-3 animate-in slide-in-from-top-2 duration-300">
            <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center flex-shrink-0">
              <CheckCircle className="w-5 h-5" />
            </div>
            <span className="font-medium">{successMessage}</span>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 flex items-center gap-3 animate-in shake duration-300">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
            <button onClick={() => setError(null)} className="ml-auto p-1 hover:bg-red-100 rounded-full">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <BlurLoader 
          isLoading={loading} 
          skeleton={<EditPostSkeleton />}
          blur={false}
        >
          {post && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
                {/* Post Type Badge */}
                <div className="p-4 border-b flex items-center justify-between bg-gradient-to-r from-gray-50 to-white">
                  <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${typeConfig?.color}`}>
                    <TypeIcon className="w-4 h-4" />
                    {typeConfig?.label}
                  </div>
                  <span className="text-sm text-gray-500">
                    Post type cannot be changed
                  </span>
                </div>

                {/* Content Editor */}
                <div className="p-5">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Content</label>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="What's on your mind?"
                    className="w-full min-h-[160px] p-4 border border-gray-200 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-gray-800 transition-all"
                    autoFocus
                  />
                </div>

                {/* Poll Options */}
                {post.postType === 'POLL' && (
                  <div className="px-5 pb-5 animate-in fade-in duration-300">
                    <div className="flex items-center justify-between mb-3">
                      <label className="block text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-violet-500" />
                        Poll Options
                      </label>
                      {hasVotes && (
                        <span className="text-xs text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full flex items-center gap-1 font-medium">
                          <AlertCircle className="w-3.5 h-3.5" />
                          Locked (has votes)
                        </span>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      {pollOptions.map((option, index) => (
                        <div 
                          key={index} 
                          className="flex items-center gap-2 animate-in slide-in-from-left duration-200"
                          style={{ animationDelay: `${index * 50}ms` }}
                        >
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0 shadow">
                            {index + 1}
                          </div>
                          <input
                            type="text"
                            value={option}
                            onChange={(e) => handlePollOptionChange(index, e.target.value)}
                            disabled={hasVotes}
                            placeholder={`Option ${index + 1}`}
                            className={`flex-1 px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all ${
                              hasVotes ? 'bg-gray-50 cursor-not-allowed text-gray-500' : ''
                            }`}
                          />
                          {!hasVotes && pollOptions.length > 2 && (
                            <button
                              onClick={() => removePollOption(index)}
                              className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    
                    {!hasVotes && pollOptions.length < 6 && (
                      <button
                        onClick={addPollOption}
                        className="mt-3 flex items-center gap-2 px-4 py-2.5 text-violet-600 hover:bg-violet-50 rounded-xl transition-all text-sm font-medium"
                      >
                        <Plus className="w-4 h-4" />
                        Add Option
                      </button>
                    )}
                  </div>
                )}

                {/* Media Section */}
                <div className="px-5 pb-5">
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-amber-500" />
                      Media ({allMediaPreviews.length})
                    </label>
                    
                    {allMediaPreviews.length > 0 && (
                      <div className="relative">
                        <button
                          onClick={() => setShowDisplayModeDropdown(!showDisplayModeDropdown)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors"
                        >
                          <selectedDisplayMode.icon className="w-3.5 h-3.5" />
                          {selectedDisplayMode.label}
                          <ChevronDown className={`w-3 h-3 transition-transform ${showDisplayModeDropdown ? 'rotate-180' : ''}`} />
                        </button>
                        
                        {showDisplayModeDropdown && (
                          <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-10 animate-in slide-in-from-top-2 duration-200">
                            {MEDIA_DISPLAY_MODES.map((mode) => {
                              const Icon = mode.icon;
                              return (
                                <button
                                  key={mode.id}
                                  onClick={() => {
                                    setMediaDisplayMode(mode.id);
                                    setShowDisplayModeDropdown(false);
                                  }}
                                  className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-amber-50 transition-colors ${
                                    mediaDisplayMode === mode.id ? 'bg-amber-50' : ''
                                  }`}
                                >
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                    mediaDisplayMode === mode.id ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-600'
                                  }`}>
                                    <Icon className="w-4 h-4" />
                                  </div>
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
                    )}
                  </div>

                  {/* Media Grid */}
                  {allMediaPreviews.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                      {mediaUrls.map((url, index) => (
                        <div 
                          key={`existing-${index}`} 
                          className="relative group rounded-2xl overflow-hidden border-2 border-gray-100 hover:border-amber-300 transition-all shadow-sm hover:shadow-md animate-in zoom-in-95 duration-300"
                          style={{ animationDelay: `${index * 50}ms` }}
                        >
                          <img
                            src={url}
                            alt={`Media ${index + 1}`}
                            className="w-full h-36 object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                          
                          {/* Reorder buttons */}
                          <div className="absolute left-2 top-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {index > 0 && (
                              <button
                                onClick={() => moveMedia(index, 'up')}
                                className="p-1.5 bg-white/95 hover:bg-white rounded-lg shadow-lg transition-all hover:scale-110"
                              >
                                <ArrowUp className="w-3.5 h-3.5 text-gray-700" />
                              </button>
                            )}
                            {index < mediaUrls.length - 1 && (
                              <button
                                onClick={() => moveMedia(index, 'down')}
                                className="p-1.5 bg-white/95 hover:bg-white rounded-lg shadow-lg transition-all hover:scale-110"
                              >
                                <ArrowDown className="w-3.5 h-3.5 text-gray-700" />
                              </button>
                            )}
                          </div>
                          
                          {/* Remove button */}
                          <button
                            onClick={() => removeExistingMedia(index)}
                            className="absolute top-2 right-2 p-2 bg-red-500 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-lg hover:scale-110"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                          
                          {/* Order indicator */}
                          <div className="absolute bottom-2 left-2 px-2.5 py-1 bg-black/60 text-white text-xs rounded-full font-medium">
                            #{index + 1}
                          </div>
                        </div>
                      ))}
                      
                      {/* New Media */}
                      {newMediaPreviews.map((preview, index) => (
                        <div 
                          key={`new-${index}`} 
                          className="relative group rounded-2xl overflow-hidden border-2 border-green-300 shadow-sm animate-in zoom-in-95 duration-300"
                        >
                          <img
                            src={preview}
                            alt={`New ${index + 1}`}
                            className="w-full h-36 object-cover"
                          />
                          <div className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2.5 py-1 rounded-full font-medium shadow">
                            New
                          </div>
                          <button
                            onClick={() => removeNewMedia(index)}
                            className="absolute top-2 right-2 p-2 bg-red-500 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-lg"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add Photo Button */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-3 text-gray-600 hover:text-amber-600 hover:bg-amber-50 border-2 border-dashed border-gray-200 hover:border-amber-300 rounded-2xl transition-all text-sm w-full justify-center font-medium"
                  >
                    <ImageIcon className="w-5 h-5" />
                    {allMediaPreviews.length > 0 ? 'Add More Photos' : 'Add Photos'}
                  </button>
                </div>

                {/* Visibility Selector */}
                <div className="px-5 py-5 border-t bg-gradient-to-r from-gray-50 to-white">
                  <label className="block text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                    <Globe className="w-4 h-4 text-blue-500" />
                    Visibility
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {VISIBILITY_OPTIONS.map((option, index) => {
                      const Icon = option.icon;
                      const isSelected = visibility === option.value;
                      return (
                        <button
                          key={option.value}
                          onClick={() => setVisibility(option.value)}
                          className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all animate-in zoom-in-95 duration-200 ${
                            isSelected 
                              ? 'border-amber-400 bg-gradient-to-br from-amber-50 to-orange-50 shadow-lg shadow-amber-100' 
                              : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                          }`}
                          style={{ animationDelay: `${index * 50}ms` }}
                        >
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                            isSelected 
                              ? `bg-gradient-to-br ${option.color} text-white shadow-lg` 
                              : 'bg-gray-100 text-gray-500'
                          }`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <span className={`text-sm font-semibold ${isSelected ? 'text-amber-700' : 'text-gray-700'}`}>
                            {option.label}
                          </span>
                          <span className="text-xs text-gray-500">{option.desc}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Tips */}
              <div className="p-5 bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-100 animate-in fade-in slide-in-from-bottom-2 duration-500 delay-200">
                <h3 className="font-semibold text-amber-800 mb-3 flex items-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  Tips for editing
                </h3>
                <ul className="text-sm text-amber-700 space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-amber-500 mt-0.5">•</span>
                    Click the arrows on images to reorder them
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-500 mt-0.5">•</span>
                    Hover over images to reveal remove and reorder buttons
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-500 mt-0.5">•</span>
                    New images will be uploaded when you save
                  </li>
                  {post?.postType === 'POLL' && !hasVotes && (
                    <li className="flex items-start gap-2">
                      <span className="text-green-500 mt-0.5">✓</span>
                      You can edit poll options since no one has voted yet
                    </li>
                  )}
                  {post?.postType === 'POLL' && hasVotes && (
                    <li className="flex items-start gap-2">
                      <span className="text-amber-500 mt-0.5">⚠</span>
                      Poll options are locked because people have already voted
                    </li>
                  )}
                </ul>
              </div>
            </div>
          )}
        </BlurLoader>
      </main>
    </div>
  );
}
