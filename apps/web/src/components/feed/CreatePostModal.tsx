'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { TokenManager } from '@/lib/api/auth';
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
  BookOpen,
  FolderOpen,
  Rocket,
  Microscope,
  UsersRound,
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
  quizData?: {
    questions: { text: string; options: string[]; correctAnswer: number }[];
    timeLimit: number;
    passingScore: number;
  };
}

const POST_TYPES = [
  { id: 'ARTICLE', label: 'Article', icon: FileText, description: 'Share thoughts or updates', color: 'green' },
  { id: 'POLL', label: 'Poll', icon: BarChart3, description: 'Ask for opinions', color: 'violet' },
  { id: 'ANNOUNCEMENT', label: 'Announcement', icon: Megaphone, description: 'Official announcements', color: 'rose' },
  { id: 'QUESTION', label: 'Question', icon: HelpCircle, description: 'Ask the community', color: 'teal' },
  { id: 'ACHIEVEMENT', label: 'Achievement', icon: Award, description: 'Celebrate success', color: 'amber' },
  { id: 'TUTORIAL', label: 'Tutorial', icon: BookOpen, description: 'Share how-to guides', color: 'blue' },
  { id: 'RESOURCE', label: 'Resource', icon: FolderOpen, description: 'Share learning materials', color: 'indigo' },
  { id: 'PROJECT', label: 'Project', icon: Rocket, description: 'Showcase your work', color: 'orange' },
  { id: 'RESEARCH', label: 'Research', icon: Microscope, description: 'Share findings', color: 'cyan' },
  { id: 'COLLABORATION', label: 'Collaboration', icon: UsersRound, description: 'Find study partners', color: 'pink' },
  { id: 'QUIZ', label: 'Quiz', icon: HelpCircle, description: 'Test knowledge', color: 'purple' },
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
  const [quizQuestions, setQuizQuestions] = useState([{ text: '', options: ['', ''], correctAnswer: 0 }]);
  const [quizTimeLimit, setQuizTimeLimit] = useState(10);
  const [quizPassingScore, setQuizPassingScore] = useState(70);
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const [showVisibilitySelector, setShowVisibilitySelector] = useState(false);
  
  // Media state - store both files and preview URLs
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([]);
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

    if (postType === 'QUIZ') {
      const validQuestions = quizQuestions.filter(q => q.text.trim() && q.options.filter(o => o.trim()).length >= 2);
      if (validQuestions.length === 0) {
        alert('Please add at least 1 question with 2+ options');
        return;
      }
    }

    setCreating(true);
    try {
      let uploadedMediaUrls: string[] = [];

      // Upload files to R2 if there are any
      if (mediaFiles.length > 0) {
        setUploading(true);
        const formData = new FormData();
        mediaFiles.forEach(file => {
          formData.append('files', file);
        });

        const token = TokenManager.getAccessToken();
        const uploadRes = await fetch('http://localhost:3010/upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formData,
        });

        const uploadData = await uploadRes.json();
        if (uploadData.success) {
          uploadedMediaUrls = uploadData.data.map((f: any) => f.url);
        } else {
          throw new Error(uploadData.error || 'Failed to upload media');
        }
        setUploading(false);
      }

      await onSubmit({
        content,
        postType,
        visibility,
        pollOptions: postType === 'POLL' ? pollOptions.filter(o => o.trim()) : undefined,
        mediaUrls: uploadedMediaUrls.length > 0 ? uploadedMediaUrls : undefined,
        mediaDisplayMode: uploadedMediaUrls.length > 0 ? mediaDisplayMode : undefined,
        quizData: postType === 'QUIZ' ? {
          questions: quizQuestions.filter(q => q.text.trim()).map(q => ({
            text: q.text,
            options: q.options.filter(o => o.trim()),
            correctAnswer: q.correctAnswer,
          })),
          timeLimit: quizTimeLimit,
          passingScore: quizPassingScore,
        } : undefined,
      });
      // Reset form
      setContent('');
      setPostType('ARTICLE');
      setVisibility('SCHOOL');
      setPollOptions(['', '']);
      setQuizQuestions([{ text: '', options: ['', ''], correctAnswer: 0 }]);
      setQuizTimeLimit(10);
      setQuizPassingScore(70);
      setMediaFiles([]);
      setMediaPreviews([]);
      setMediaUrls([]);
      setMediaDisplayMode('AUTO');
      onClose();
    } catch (error) {
      console.error('Failed to create post:', error);
      setUploading(false);
    } finally {
      setCreating(false);
    }
  };

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      if (file.type.startsWith('image/')) {
        // Store the file for upload
        setMediaFiles(prev => [...prev, file]);
        
        // Create preview URL
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            setMediaPreviews(prev => [...prev, event.target!.result as string]);
          }
        };
        reader.readAsDataURL(file);
      }
    });
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveMedia = (index: number) => {
    setMediaFiles(prev => prev.filter((_, i) => i !== index));
    setMediaPreviews(prev => prev.filter((_, i) => i !== index));
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
      case 'TUTORIAL':
        return 'Share your tutorial or guide...';
      case 'RESOURCE':
        return 'Describe the resource you\'re sharing...';
      case 'PROJECT':
        return 'Tell us about your project...';
      case 'RESEARCH':
        return 'Share your research findings...';
      case 'COLLABORATION':
        return 'What do you want to collaborate on?';
      case 'QUIZ':
        return 'Describe your quiz (topic, difficulty, etc.)...';
      default:
        return `What's on your mind, ${user.firstName}?`;
    }
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      green: 'from-[#F9A825] to-[#FFB74D]',
      violet: 'from-violet-500 to-purple-600',
      rose: 'from-rose-500 to-pink-600',
      teal: 'from-teal-500 to-cyan-600',
      amber: 'from-amber-500 to-yellow-500',
      blue: 'from-blue-500 to-indigo-500',
      indigo: 'from-indigo-500 to-violet-500',
      orange: 'from-orange-500 to-red-500',
      cyan: 'from-cyan-500 to-teal-500',
      pink: 'from-pink-500 to-rose-500',
      purple: 'from-purple-500 to-fuchsia-500',
    };
    return colors[type] || colors.green;
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
                            className={`w-full flex items-center gap-3 px-3 py-2 hover:bg-amber-50 transition-colors ${
                              visibility === option.id ? 'bg-amber-50' : ''
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
            className="w-full p-3 border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-[#F9A825] text-gray-900"
            autoFocus
          />

          {/* Poll Options (only for POLL type) */}
          {postType === 'POLL' && (
            <div className="mt-4 space-y-3">
              <p className="text-sm font-medium text-gray-700">Poll Options</p>
              {pollOptions.map((option, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-violet-100 flex items-center justify-center text-violet-600 text-xs font-medium">
                    {index + 1}
                  </div>
                  <input
                    type="text"
                    value={option}
                    onChange={(e) => handlePollOptionChange(index, e.target.value)}
                    placeholder={`Option ${index + 1}`}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                  {pollOptions.length > 2 && (
                    <button
                      onClick={() => handleRemovePollOption(index)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              {pollOptions.length < 6 && (
                <button
                  onClick={handleAddPollOption}
                  className="flex items-center gap-2 px-3 py-2 text-violet-600 hover:bg-violet-50 rounded-full transition-colors text-sm font-medium"
                >
                  <Plus className="w-4 h-4" />
                  Add Option
                </button>
              )}
            </div>
          )}

          {/* Announcement Badge (only for ANNOUNCEMENT type) */}
          {postType === 'ANNOUNCEMENT' && (
            <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl">
              <div className="flex items-center gap-2 text-rose-700">
                <Megaphone className="w-4 h-4" />
                <span className="text-sm font-medium">This will be marked as an official announcement</span>
              </div>
            </div>
          )}

          {/* Achievement Badge (only for ACHIEVEMENT type) */}
          {postType === 'ACHIEVEMENT' && (
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <div className="flex items-center gap-2 text-amber-700">
                <Award className="w-4 h-4" />
                <span className="text-sm font-medium">Celebrate and share your achievement!</span>
              </div>
            </div>
          )}

          {/* Tutorial Badge */}
          {postType === 'TUTORIAL' && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-xl">
              <div className="flex items-center gap-2 text-blue-700">
                <BookOpen className="w-4 h-4" />
                <span className="text-sm font-medium">Share step-by-step instructions to help others learn</span>
              </div>
            </div>
          )}

          {/* Resource Badge */}
          {postType === 'RESOURCE' && (
            <div className="mt-4 p-3 bg-indigo-50 border border-indigo-200 rounded-xl">
              <div className="flex items-center gap-2 text-indigo-700">
                <FolderOpen className="w-4 h-4" />
                <span className="text-sm font-medium">Share documents, links, or learning materials</span>
              </div>
            </div>
          )}

          {/* Project Badge */}
          {postType === 'PROJECT' && (
            <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-xl">
              <div className="flex items-center gap-2 text-orange-700">
                <Rocket className="w-4 h-4" />
                <span className="text-sm font-medium">Showcase your project with images and details</span>
              </div>
            </div>
          )}

          {/* Research Badge */}
          {postType === 'RESEARCH' && (
            <div className="mt-4 p-3 bg-cyan-50 border border-cyan-200 rounded-xl">
              <div className="flex items-center gap-2 text-cyan-700">
                <Microscope className="w-4 h-4" />
                <span className="text-sm font-medium">Share research findings, data, or academic work</span>
              </div>
            </div>
          )}

          {/* Collaboration Badge */}
          {postType === 'COLLABORATION' && (
            <div className="mt-4 p-3 bg-pink-50 border border-pink-200 rounded-xl">
              <div className="flex items-center gap-2 text-pink-700">
                <UsersRound className="w-4 h-4" />
                <span className="text-sm font-medium">Find study partners or collaborators</span>
              </div>
            </div>
          )}

          {/* Quiz Builder (only for QUIZ type) */}
          {postType === 'QUIZ' && (
            <div className="mt-4 space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Time Limit (min)</label>
                  <input
                    type="number"
                    value={quizTimeLimit}
                    onChange={(e) => setQuizTimeLimit(Math.max(1, parseInt(e.target.value) || 1))}
                    min={1}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Passing Score (%)</label>
                  <input
                    type="number"
                    value={quizPassingScore}
                    onChange={(e) => setQuizPassingScore(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                    min={0}
                    max={100}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <p className="text-sm font-medium text-gray-700">Questions</p>
              {quizQuestions.map((question, qIdx) => (
                <div key={qIdx} className="p-3 border border-purple-200 bg-purple-50/50 rounded-xl space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center text-xs font-bold">{qIdx + 1}</span>
                    <input
                      type="text"
                      value={question.text}
                      onChange={(e) => {
                        const updated = [...quizQuestions];
                        updated[qIdx].text = e.target.value;
                        setQuizQuestions(updated);
                      }}
                      placeholder={`Question ${qIdx + 1}`}
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    {quizQuestions.length > 1 && (
                      <button
                        onClick={() => setQuizQuestions(quizQuestions.filter((_, i) => i !== qIdx))}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  {question.options.map((opt, oIdx) => (
                    <div key={oIdx} className="flex items-center gap-2 ml-8">
                      <button
                        onClick={() => {
                          const updated = [...quizQuestions];
                          updated[qIdx].correctAnswer = oIdx;
                          setQuizQuestions(updated);
                        }}
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                          question.correctAnswer === oIdx
                            ? 'border-green-500 bg-green-500'
                            : 'border-gray-300 hover:border-green-400'
                        }`}
                      >
                        {question.correctAnswer === oIdx && (
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </button>
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => {
                          const updated = [...quizQuestions];
                          updated[qIdx].options[oIdx] = e.target.value;
                          setQuizQuestions(updated);
                        }}
                        placeholder={`Option ${oIdx + 1}`}
                        className="flex-1 px-3 py-1.5 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                      {question.options.length > 2 && (
                        <button
                          onClick={() => {
                            const updated = [...quizQuestions];
                            updated[qIdx].options = updated[qIdx].options.filter((_, i) => i !== oIdx);
                            if (updated[qIdx].correctAnswer >= updated[qIdx].options.length) {
                              updated[qIdx].correctAnswer = 0;
                            }
                            setQuizQuestions(updated);
                          }}
                          className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                  {question.options.length < 6 && (
                    <button
                      onClick={() => {
                        const updated = [...quizQuestions];
                        updated[qIdx].options.push('');
                        setQuizQuestions(updated);
                      }}
                      className="ml-8 flex items-center gap-1 text-xs text-purple-600 hover:text-purple-800 font-medium transition-colors"
                    >
                      <Plus className="w-3 h-3" /> Add Option
                    </button>
                  )}
                </div>
              ))}
              {quizQuestions.length < 20 && (
                <button
                  onClick={() => setQuizQuestions([...quizQuestions, { text: '', options: ['', ''], correctAnswer: 0 }])}
                  className="flex items-center gap-2 px-3 py-2 text-purple-600 hover:bg-purple-50 rounded-full transition-colors text-sm font-medium"
                >
                  <Plus className="w-4 h-4" />
                  Add Question
                </button>
              )}
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
            {mediaPreviews.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-700">
                    {mediaPreviews.length} {mediaPreviews.length === 1 ? 'image' : 'images'} added
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
                        showDisplayModeSelector ? 'bg-[#F9A825]/20 text-[#F9A825]' : 'bg-[#F9A825]/10 text-[#F9A825] hover:bg-[#F9A825]/20'
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
                              className={`w-full flex items-center gap-3 px-3 py-2 hover:bg-amber-50 transition-colors ${
                                mediaDisplayMode === mode.id ? 'bg-amber-50' : ''
                              }`}
                            >
                              <Icon className="w-4 h-4 text-[#F9A825]" />
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
                  mediaPreviews.length === 1 ? 'grid-cols-1' : 
                  mediaPreviews.length === 2 ? 'grid-cols-2' : 
                  'grid-cols-3'
                }`}>
                  {mediaPreviews.map((url, index) => (
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
                  mediaDisplayMode === 'AUTO' ? 'bg-amber-50 text-[#F9A825]' :
                  mediaDisplayMode === 'FIXED_HEIGHT' ? 'bg-blue-50 text-blue-700' :
                  'bg-teal-50 text-teal-700'
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
              className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:bg-amber-50 rounded-full transition-colors text-sm"
            >
              <ImageIcon className="w-4 h-4" />
              {mediaPreviews.length > 0 ? 'Add More Photos' : 'Add Photo'}
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
            disabled={!content.trim() || creating || uploading}
            className={`px-5 py-2 bg-gradient-to-r ${getTypeColor(selectedType.color)} text-white rounded-full font-medium hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2`}
          >
            {(creating || uploading) && <Loader2 className="w-4 h-4 animate-spin" />}
            {uploading ? 'Uploading...' : postType === 'POLL' ? 'Create Poll' : postType === 'QUIZ' ? 'Create Quiz' : postType === 'ANNOUNCEMENT' ? 'Announce' : 'Post'}
          </button>
        </div>
      </div>
    </div>
  );
}
