'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { TokenManager } from '@/lib/api/auth';
import { 
  ArrowLeft, 
  Image as ImageIcon, 
  X, 
  Loader2,
  Save,
  Globe,
  Building2,
  Lock
} from 'lucide-react';

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
}

const VISIBILITY_OPTIONS = [
  { value: 'PUBLIC', label: 'Public', icon: Globe, desc: 'Anyone can see' },
  { value: 'SCHOOL', label: 'School', icon: Building2, desc: 'School members only' },
  { value: 'PRIVATE', label: 'Private', icon: Lock, desc: 'Only you' },
];

export default function EditPostPage() {
  const params = useParams();
  const router = useRouter();
  const postId = params?.id as string;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [content, setContent] = useState('');
  const [visibility, setVisibility] = useState('SCHOOL');
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [newMediaFiles, setNewMediaFiles] = useState<File[]>([]);
  const [newMediaPreviews, setNewMediaPreviews] = useState<string[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

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
      } catch (err: any) {
        setError(err.message || 'Failed to load post');
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [postId]);

  // Check authorization
  useEffect(() => {
    if (post && currentUserId && post.author.id !== currentUserId) {
      router.push(`/feed/post/${postId}`);
    }
  }, [post, currentUserId, postId, router]);

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Add new files
    setNewMediaFiles(prev => [...prev, ...files]);

    // Create previews
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewMediaPreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });

    // Reset input
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

  // Handle save
  const handleSave = async () => {
    if (!content.trim() || !post) return;

    try {
      setSaving(true);
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
            if (uploadData.urls) {
              finalMediaUrls = [...finalMediaUrls, ...uploadData.urls];
            }
          }
        } catch (err) {
          console.error('Upload error:', err);
        }
        setUploading(false);
      }

      // Update post
      const res = await fetch(`http://localhost:3010/posts/${post.id}`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: content.trim(),
          visibility,
          mediaUrls: finalMediaUrls,
        }),
      });

      if (res.ok) {
        router.push(`/feed/post/${post.id}`);
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

  // Get post type badge color
  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      ARTICLE: 'bg-blue-100 text-blue-700',
      COURSE: 'bg-purple-100 text-purple-700',
      QUIZ: 'bg-orange-100 text-orange-700',
      QUESTION: 'bg-emerald-100 text-emerald-700',
      EXAM: 'bg-red-100 text-red-700',
      ANNOUNCEMENT: 'bg-amber-100 text-amber-700',
      ASSIGNMENT: 'bg-indigo-100 text-indigo-700',
      POLL: 'bg-cyan-100 text-cyan-700',
      RESOURCE: 'bg-teal-100 text-teal-700',
      PROJECT: 'bg-rose-100 text-rose-700',
      TUTORIAL: 'bg-lime-100 text-lime-700',
      RESEARCH: 'bg-violet-100 text-violet-700',
      ACHIEVEMENT: 'bg-yellow-100 text-yellow-700',
      REFLECTION: 'bg-pink-100 text-pink-700',
      COLLABORATION: 'bg-sky-100 text-sky-700',
    };
    return colors[type] || 'bg-gray-100 text-gray-700';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
          <span className="text-gray-600">Loading post...</span>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
        <p className="text-red-500">{error || 'Post not found'}</p>
        <button 
          onClick={() => router.back()}
          className="text-amber-600 hover:underline flex items-center gap-1"
        >
          <ArrowLeft className="w-4 h-4" /> Go Back
        </button>
      </div>
    );
  }

  const allMediaPreviews = [...mediaUrls, ...newMediaPreviews];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <button 
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Cancel</span>
          </button>
          <h1 className="font-semibold text-gray-900">Edit Post</h1>
          <button
            onClick={handleSave}
            disabled={!content.trim() || saving || uploading}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-full hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed"
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
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {/* Post Type Badge */}
          <div className="p-4 border-b flex items-center justify-between">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getTypeColor(post.postType)}`}>
              {post.postType.replace('_', ' ')}
            </span>
            <span className="text-sm text-gray-500">
              Post type cannot be changed
            </span>
          </div>

          {/* Content Editor */}
          <div className="p-4">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What's on your mind?"
              className="w-full min-h-[200px] resize-none focus:outline-none text-gray-800 text-lg"
              autoFocus
            />
          </div>

          {/* Media Preview */}
          {allMediaPreviews.length > 0 && (
            <div className="px-4 pb-4">
              <div className={`grid gap-2 ${
                allMediaPreviews.length === 1 ? 'grid-cols-1' :
                allMediaPreviews.length === 2 ? 'grid-cols-2' :
                'grid-cols-3'
              }`}>
                {mediaUrls.map((url, index) => (
                  <div key={`existing-${index}`} className="relative group rounded-lg overflow-hidden">
                    <img
                      src={url}
                      alt=""
                      className="w-full h-40 object-cover"
                    />
                    <button
                      onClick={() => removeExistingMedia(index)}
                      className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {newMediaPreviews.map((preview, index) => (
                  <div key={`new-${index}`} className="relative group rounded-lg overflow-hidden">
                    <img
                      src={preview}
                      alt=""
                      className="w-full h-40 object-cover"
                    />
                    <div className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded">
                      New
                    </div>
                    <button
                      onClick={() => removeNewMedia(index)}
                      className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions Bar */}
          <div className="px-4 py-3 border-t flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Add Photo */}
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
                className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors text-sm"
              >
                <ImageIcon className="w-4 h-4" />
                Add Photo
              </button>
            </div>

            {/* Visibility Selector */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Visibility:</span>
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value)}
                className="px-3 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                {VISIBILITY_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Tips */}
        <div className="mt-6 p-4 bg-amber-50 rounded-xl border border-amber-100">
          <h3 className="font-medium text-amber-800 mb-2">💡 Tips</h3>
          <ul className="text-sm text-amber-700 space-y-1">
            <li>• Edit your content above and click Save when done</li>
            <li>• Remove images by hovering and clicking the X button</li>
            <li>• Add new images using the "Add Photo" button</li>
            <li>• Change visibility to control who can see your post</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
