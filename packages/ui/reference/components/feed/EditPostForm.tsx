"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  X,
  Loader2,
  ArrowLeft,
  Save,
  GripVertical,
  ImageIcon,
  ChevronDown,
  Globe,
  Users,
  Lock,
  Calendar,
  BookOpen,
  Megaphone,
  GraduationCap,
  Book,
  AlertCircle,
  Plus,
  Minus,
} from "lucide-react";
import {
  updatePost,
  updatePostWithMedia,
  PostType,
  PostVisibility,
  POST_TYPE_INFO,
  PollOption,
} from "@/lib/api/feed";
import { compressImage } from "@/lib/utils/imageCompression";

interface EditPostFormProps {
  post: {
    id: string;
    content: string;
    postType: PostType;
    visibility: PostVisibility;
    mediaUrls?: string[];
    // Poll fields
    pollOptions?: PollOption[];
    pollExpiresAt?: string | null;
    pollIsAnonymous?: boolean;
    pollAllowMultiple?: boolean;
    pollMaxChoices?: number | null;
  };
  userProfilePicture?: string | null;
  userName: string;
}

const VISIBILITY_OPTIONS: {
  value: PostVisibility;
  label: string;
  labelKh: string;
  icon: React.ElementType;
}[] = [
  { value: "SCHOOL", label: "School", labelKh: "សាលារៀន", icon: Users },
  { value: "PUBLIC", label: "Public", labelKh: "សាធារណៈ", icon: Globe },
  { value: "CLASS", label: "Class", labelKh: "ថ្នាក់រៀន", icon: Users },
  { value: "PRIVATE", label: "Private", labelKh: "ឯកជន", icon: Lock },
];

export default function EditPostForm({ post, userProfilePicture, userName }: EditPostFormProps) {
  const router = useRouter();
  const [content, setContent] = useState(post.content);
  const [postType] = useState<PostType>(post.postType);
  const [visibility, setVisibility] = useState<PostVisibility>(post.visibility);
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<string[]>(post.mediaUrls || []);
  const [isPosting, setIsPosting] = useState(false);
  const [showVisibilitySelector, setShowVisibilitySelector] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Poll-specific state
  const [pollOptions, setPollOptions] = useState<string[]>(
    post.pollOptions?.map(opt => opt.text) || ["", ""]
  );
  const [pollExpiresAt, setPollExpiresAt] = useState<string>(
    post.pollExpiresAt ? new Date(post.pollExpiresAt).toISOString().slice(0, 16) : ""
  );
  const [pollIsAnonymous, setPollIsAnonymous] = useState<boolean>(post.pollIsAnonymous || false);
  const [pollAllowMultiple, setPollAllowMultiple] = useState<boolean>(post.pollAllowMultiple || false);
  const [pollMaxChoices, setPollMaxChoices] = useState<number>(post.pollMaxChoices || 1);

  // Type-specific state
  const [assignmentDueDate, setAssignmentDueDate] = useState<string>("");
  const [assignmentPoints, setAssignmentPoints] = useState<number>(100);
  const [assignmentSubmissionType, setAssignmentSubmissionType] = useState<"file" | "text" | "link">("file");
  
  const [announcementUrgency, setAnnouncementUrgency] = useState<"low" | "medium" | "high" | "urgent">("medium");
  const [announcementExpiryDate, setAnnouncementExpiryDate] = useState<string>("");
  
  const [courseCode, setCourseCode] = useState<string>("");
  const [courseLevel, setCourseLevel] = useState<"beginner" | "intermediate" | "advanced">("beginner");
  const [courseDuration, setCourseDuration] = useState<string>("");
  
  const [tutorialDifficulty, setTutorialDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [tutorialEstimatedTime, setTutorialEstimatedTime] = useState<string>("");
  const [tutorialPrerequisites, setTutorialPrerequisites] = useState<string>("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Poll option handlers
  const addPollOption = () => {
    if (pollOptions.length < 6) {
      setPollOptions([...pollOptions, ""]);
    }
  };

  const removePollOption = (index: number) => {
    if (pollOptions.length > 2) {
      setPollOptions(pollOptions.filter((_, i) => i !== index));
      // Adjust max choices if needed
      if (pollAllowMultiple && pollMaxChoices > pollOptions.length - 1) {
        setPollMaxChoices(pollOptions.length - 1);
      }
    }
  };

  const updatePollOption = (index: number, value: string) => {
    const newOptions = [...pollOptions];
    newOptions[index] = value;
    setPollOptions(newOptions);
  };


  useEffect(() => {
    textareaRef.current?.focus();
    console.log('📸 Edit Post - Media URLs:', post.mediaUrls);
    console.log('📸 Edit Post - Media Previews State:', mediaPreviews);
  }, []);

  const handleMediaSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const totalImages = mediaFiles.length + mediaPreviews.length;
    const remainingSlots = 4 - totalImages;
    const filesToAdd = files.slice(0, remainingSlots);

    for (const file of filesToAdd) {
      if (!file.type.startsWith("image/")) continue;

      try {
        // Compress image
        const compressed = await compressImage(file, {
          maxWidth: 1920,
          maxHeight: 1920,
          quality: 0.85,
          outputFormat: "image/jpeg",
        });

        // Convert data URL to File
        const response = await fetch(compressed);
        const blob = await response.blob();
        const compressedFile = new File([blob], file.name, {
          type: "image/jpeg",
        });

        setMediaFiles((prev) => [...prev, compressedFile]);
        setMediaPreviews((prev) => [...prev, compressed]);
      } catch (error) {
        console.error("Error processing image:", error);
      }
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeMedia = (index: number) => {
    setMediaPreviews((prev) => prev.filter((_, i) => i !== index));
    const fileStartIndex = mediaPreviews.length - mediaFiles.length;
    if (index >= fileStartIndex) {
      setMediaFiles((prev) => prev.filter((_, i) => i !== index - fileStartIndex));
    }
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newPreviews = [...mediaPreviews];
    const draggedItem = newPreviews[draggedIndex];
    newPreviews.splice(draggedIndex, 1);
    newPreviews.splice(index, 0, draggedItem);
    
    setMediaPreviews(newPreviews);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleSave = async () => {
    if (!content.trim() && mediaPreviews.length === 0) {
      alert("សូមបញ្ចូលខ្លឹមសារឬរូបភាពយ៉ាងតិច!");
      return;
    }

    // Poll validation
    if (postType === "POLL") {
      const validOptions = pollOptions.filter((opt) => opt.trim());
      if (validOptions.length < 2) {
        alert("សូមបញ្ចូលជម្រើសយ៉ាងតិច ២");
        return;
      }
    }

    setIsPosting(true);
    try {
      // Check if images were modified
      const originalImages = post.mediaUrls || [];
      const imagesChanged = 
        mediaPreviews.length !== originalImages.length ||
        mediaPreviews.some((url, index) => url !== originalImages[index]);

      if (imagesChanged || mediaFiles.length > 0 || postType === "POLL") {
        // Media was modified OR poll data needs updating - use FormData
        const deletedUrls = originalImages.filter(
          url => !mediaPreviews.includes(url)
        );

        // Separate existing URLs from new files
        const existingUrls = mediaPreviews.filter(
          url => originalImages.includes(url)
        );

        const formData = new FormData();
        formData.append("content", content.trim());
        formData.append("visibility", visibility);
        formData.append("mediaUrls", JSON.stringify(existingUrls));
        formData.append("mediaDeleted", JSON.stringify(deletedUrls));
        
        // Append new image files
        mediaFiles.forEach(file => {
          formData.append("media", file);
        });

        // Add poll data if POLL type
        if (postType === "POLL") {
          const validOptions = pollOptions.filter((opt) => opt.trim());
          formData.append("pollOptions", JSON.stringify(validOptions));
          if (pollExpiresAt) {
            formData.append("pollExpiresAt", new Date(pollExpiresAt).toISOString());
          }
          formData.append("pollIsAnonymous", String(pollIsAnonymous));
          formData.append("pollAllowMultiple", String(pollAllowMultiple));
          if (pollAllowMultiple && pollMaxChoices) {
            formData.append("pollMaxChoices", String(pollMaxChoices));
          }
        }

        await updatePostWithMedia(post.id, formData);
      } else {
        // Only text/visibility changed - use simple API
        await updatePost(post.id, {
          content: content.trim(),
          visibility,
        });
      }

      // Clear cache and navigate back to feed
      router.push("/feed");
      // Force refresh to show updated data
      setTimeout(() => {
        window.location.href = "/feed";
      }, 100);
    } catch (error) {
      console.error("Failed to update post:", error);
      alert("មានបញ្ហាក្នុងការកែសម្រួលការផ្សាយ!");
    } finally {
      setIsPosting(false);
    }
  };

  const selectedTypeInfo = POST_TYPE_INFO[postType];
  const selectedVisibility = VISIBILITY_OPTIONS.find((opt) => opt.value === visibility);
  const VisibilityIcon = selectedVisibility?.icon || Globe;

  return (
    <div className="fixed inset-0 flex flex-col bg-gradient-to-br from-gray-50 via-white to-gray-50 overflow-hidden animate-fade-in">
      {/* Header - Fixed with slide down animation */}
      <div className="flex-shrink-0 border-b border-gray-200 bg-white animate-slide-down">
        <div className="px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            disabled={isPosting}
            className="p-2 hover:bg-gray-100 rounded-full transition-all duration-200 hover:scale-110"
          >
            <ArrowLeft className="w-6 h-6 text-gray-700" />
          </button>
          
          <h1 className="text-lg font-bold text-gray-900">កែសម្រួលការផ្សាយ</h1>
          
          <button
            onClick={handleSave}
            disabled={isPosting || (!content.trim() && mediaPreviews.length === 0)}
            className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-semibold hover:shadow-lg hover:scale-105"
          >
            {isPosting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              "រក្សាទុក"
            )}
          </button>
        </div>
      </div>

      {/* Content - Scrollable with staggered animations */}
      <div className="flex-1 overflow-y-auto">
        {/* User Info - Slide up animation */}
        <div className="px-4 py-4 border-b border-gray-100 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center gap-3">
            {userProfilePicture ? (
              <Image
                src={userProfilePicture}
                alt={userName}
                width={48}
                height={48}
                className="w-12 h-12 rounded-full object-cover ring-2 ring-gray-100"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-md">
                {userName.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <div className="font-semibold text-gray-900">{userName}</div>
              <button
                onClick={() => setShowVisibilitySelector(!showVisibilitySelector)}
                className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 mt-1 transition-colors"
              >
                <VisibilityIcon className="w-4 h-4" />
                <span>{selectedVisibility?.labelKh}</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${showVisibilitySelector ? 'rotate-180' : ''}`} />
              </button>
            </div>
          </div>

          {/* Visibility Selector - Slide down animation */}
          {showVisibilitySelector && (
            <div className="mt-3 bg-gray-50 rounded-lg p-2 border border-gray-200 animate-slide-down">
              <div className="grid grid-cols-2 gap-2">
                {VISIBILITY_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.value}
                      onClick={() => {
                        setVisibility(option.value);
                        setShowVisibilitySelector(false);
                      }}
                      className={`flex items-center gap-2 p-2 rounded-lg transition-all duration-200 ${
                        visibility === option.value
                          ? "bg-blue-500 text-white shadow-md scale-105"
                          : "bg-white text-gray-700 hover:bg-gray-100 hover:scale-105"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-sm font-medium">{option.labelKh}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Post Type Badge - Slide up animation */}
        <div className="px-4 py-3 border-b border-gray-100 animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-white text-sm font-medium shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105"
            style={{
              background: selectedTypeInfo?.gradient || "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            }}
          >
            {selectedTypeInfo?.icon && <selectedTypeInfo.icon className="w-4 h-4" />}
            <span>{selectedTypeInfo?.labelKh}</span>
          </div>
        </div>

        {/* Content Editor - Slide up animation */}
        <div className="px-4 py-4 animate-slide-up" style={{ animationDelay: '0.3s' }}>
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="អ្វីដែលអ្នកកំពុងគិត?"
            className="w-full min-h-[150px] text-gray-900 text-base leading-relaxed resize-none focus:outline-none transition-all"
          />
        </div>

        {/* Image Gallery */}
        {/* Media Previews - Slide up animation */}
        {mediaPreviews.length > 0 && (
          <div className="px-4 pb-4 animate-slide-up" style={{ animationDelay: '0.4s' }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">រូបភាព ({mediaPreviews.length})</span>
              <span className="text-xs text-gray-500">អូសដើម្បីប្តូរលំដាប់</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {mediaPreviews.map((preview, index) => (
                <div
                  key={index}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`relative group rounded-lg overflow-hidden bg-gray-100 aspect-square cursor-move border-2 border-transparent hover:border-blue-400 transition-all duration-200 hover:shadow-lg ${
                    draggedIndex === index ? "opacity-50 scale-95" : "hover:scale-105"
                  }`}
                >
                  <Image
                    src={preview}
                    alt={`Preview ${index + 1}`}
                    fill
                    className="object-cover"
                  />
                  {/* Drag Handle */}
                  <div className="absolute top-2 left-2 bg-black/60 rounded-md p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <GripVertical className="w-4 h-4 text-white" />
                  </div>
                  {/* Remove Button */}
                  <button
                    onClick={() => removeMedia(index)}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-all duration-200 opacity-0 group-hover:opacity-100 hover:scale-110"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  {/* Image Number */}
                  <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
                    {index + 1}/{mediaPreviews.length}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Poll Options Editor - Slide up animation */}
        {postType === "POLL" && (
          <div className="px-4 pb-3 space-y-3 animate-slide-up" style={{ animationDelay: '0.5s' }}>
            <div className="flex items-center justify-between mb-2 bg-gradient-to-r from-indigo-50 to-purple-50 px-3 py-2 rounded-xl shadow-sm">
              <p className="text-sm font-semibold text-gray-700">ជម្រើសមតិ:</p>
              <span className="text-xs font-medium text-indigo-600 bg-white px-2 py-1 rounded-full">
                {pollOptions.length}/6
              </span>
            </div>

            {pollOptions.map((option, index) => (
              <div key={index} className="flex items-center gap-2 animate-slide-up" style={{ animationDelay: `${0.6 + index * 0.05}s` }}>
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={option}
                    onChange={(e) => updatePollOption(index, e.target.value)}
                    placeholder={`ជម្រើសទី ${index + 1}`}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-medium transition-all hover:border-indigo-300"
                    maxLength={100}
                  />
                </div>
                {pollOptions.length > 2 && (
                  <button
                    onClick={() => removePollOption(index)}
                    className="p-2.5 text-red-500 hover:bg-red-50 rounded-xl transition-all duration-200 hover:scale-110"
                    type="button"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}

            {pollOptions.length < 6 && (
              <button
                onClick={addPollOption}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all duration-200 border-2 border-dashed border-indigo-200 hover:border-indigo-300 w-full justify-center hover:scale-105"
                type="button"
              >
                <Plus className="w-4 h-4" />
                បន្ថែមជម្រើស
              </button>
            )}

            {/* Poll Settings */}
            <div className="mt-4 space-y-3 p-4 bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 rounded-xl border-2 border-indigo-100 shadow-sm">
              <h4 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-600" />
                ការកំណត់សំណួរមតិ
              </h4>
              
              {/* Expiry Date */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  ⏰ ថ្ងៃផុតកំណត់ (ជាប់ខ្លួន)
                </label>
                <input
                  type="datetime-local"
                  value={pollExpiresAt}
                  onChange={(e) => setPollExpiresAt(e.target.value)}
                  className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">បើទទេ មតិនឹងមិនផុតកំណត់</p>
              </div>
              
              {/* Anonymous Voting */}
              <label className="flex items-start gap-3 p-3 bg-white rounded-lg border-2 border-gray-200 hover:border-indigo-300 cursor-pointer transition-all group">
                <input
                  type="checkbox"
                  checked={pollIsAnonymous}
                  onChange={(e) => setPollIsAnonymous(e.target.checked)}
                  className="w-5 h-5 mt-0.5 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500"
                />
                <div className="flex-1">
                  <span className="text-sm font-semibold text-gray-800 group-hover:text-indigo-700">
                    🔒 ការបោះឆ្នោតអនាមិក
                  </span>
                  <p className="text-xs text-gray-500 mt-0.5">លាក់ឈ្មោះអ្នកបោះឆ្នោត</p>
                </div>
              </label>
              
              {/* Multiple Choice */}
              <label className="flex items-start gap-3 p-3 bg-white rounded-lg border-2 border-gray-200 hover:border-indigo-300 cursor-pointer transition-all group">
                <input
                  type="checkbox"
                  checked={pollAllowMultiple}
                  onChange={(e) => {
                    setPollAllowMultiple(e.target.checked);
                    if (!e.target.checked) {
                      setPollMaxChoices(1);
                    }
                  }}
                  className="w-5 h-5 mt-0.5 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500"
                />
                <div className="flex-1">
                  <span className="text-sm font-semibold text-gray-800 group-hover:text-indigo-700">
                    ☑️ អនុញ្ញាតឱ្យជ្រើសរើសច្រើន
                  </span>
                  <p className="text-xs text-gray-500 mt-0.5">អនុញ្ញាតឱ្យជ្រើសរើសច្រើនជាងមួយ</p>
                </div>
              </label>
              
              {/* Max Choices */}
              {pollAllowMultiple && (
                <div className="pl-8">
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">
                    ចំនួនជម្រើសអតិបរមា (1-{pollOptions.length})
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={pollOptions.length}
                    value={pollMaxChoices}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      if (val >= 1 && val <= pollOptions.length) {
                        setPollMaxChoices(val);
                      }
                    }}
                    className="w-24 px-3 py-2 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-semibold text-center"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Type-Specific Fields */}
        {postType === "ASSIGNMENT" && (
          <div className="px-4 pb-4">
            <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
              <h3 className="text-sm font-semibold text-orange-900 mb-3 flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                ព័ត៌មានលម្អិតកិច្ចការផ្ទះ
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    កាលបរិច្ឆេទផុតកំណត់
                  </label>
                  <input
                    type="datetime-local"
                    value={assignmentDueDate}
                    onChange={(e) => setAssignmentDueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-orange-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ពិន្ទុ</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={assignmentPoints}
                      onChange={(e) => setAssignmentPoints(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg border border-orange-300 focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ប្រភេទការបញ្ជូន</label>
                    <select
                      value={assignmentSubmissionType}
                      onChange={(e) => setAssignmentSubmissionType(e.target.value as "file" | "text" | "link")}
                      className="w-full px-3 py-2 rounded-lg border border-orange-300 focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="file">ឯកសារ</option>
                      <option value="text">អត្ថបទ</option>
                      <option value="link">តំណភ្ជាប់</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {postType === "ANNOUNCEMENT" && (
          <div className="px-4 pb-4">
            <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
              <h3 className="text-sm font-semibold text-yellow-900 mb-3 flex items-center gap-2">
                <Megaphone className="w-4 h-4" />
                ព័ត៌មានលម្អិតប្រកាស
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">កម្រិតអាទិភាព</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { value: "low", label: "ទាប", color: "bg-green-100 text-green-700 border-green-300" },
                      { value: "medium", label: "មធ្យម", color: "bg-blue-100 text-blue-700 border-blue-300" },
                      { value: "high", label: "ខ្ពស់", color: "bg-orange-100 text-orange-700 border-orange-300" },
                      { value: "urgent", label: "បន្ទាន់", color: "bg-red-100 text-red-700 border-red-300" },
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setAnnouncementUrgency(option.value as any)}
                        className={`px-2 py-2 rounded-lg border-2 text-xs font-medium transition-all ${
                          announcementUrgency === option.value ? option.color : "bg-white border-gray-200 text-gray-600"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">កាលបរិច្ឆេទផុតកំណត់</label>
                  <input
                    type="date"
                    value={announcementExpiryDate}
                    onChange={(e) => setAnnouncementExpiryDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-yellow-300 focus:ring-2 focus:ring-yellow-500"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {postType === "COURSE" && (
          <div className="px-4 pb-4">
            <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
              <h3 className="text-sm font-semibold text-purple-900 mb-3 flex items-center gap-2">
                <GraduationCap className="w-4 h-4" />
                ព័ត៌មានលម្អិតវគ្គសិក្សា
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">លេខកូដវគ្គសិក្សា</label>
                  <input
                    type="text"
                    value={courseCode}
                    onChange={(e) => setCourseCode(e.target.value)}
                    placeholder="CS101, MATH201..."
                    className="w-full px-3 py-2 rounded-lg border border-purple-300 focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">កម្រិត</label>
                    <select
                      value={courseLevel}
                      onChange={(e) => setCourseLevel(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-lg border border-purple-300 focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="beginner">ដំបូង</option>
                      <option value="intermediate">មធ្យម</option>
                      <option value="advanced">កម្រិតខ្ពស់</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">រយៈពេល</label>
                    <input
                      type="text"
                      value={courseDuration}
                      onChange={(e) => setCourseDuration(e.target.value)}
                      placeholder="8 សប្តាហ៍"
                      className="w-full px-3 py-2 rounded-lg border border-purple-300 focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {postType === "TUTORIAL" && (
          <div className="px-4 pb-4">
            <div className="bg-cyan-50 rounded-lg p-4 border border-cyan-200">
              <h3 className="text-sm font-semibold text-cyan-900 mb-3 flex items-center gap-2">
                <Book className="w-4 h-4" />
                ព័ត៌មានលម្អិតមេរៀន
              </h3>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">កម្រិតពិបាក</label>
                    <select
                      value={tutorialDifficulty}
                      onChange={(e) => setTutorialDifficulty(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-lg border border-cyan-300 focus:ring-2 focus:ring-cyan-500"
                    >
                      <option value="easy">ងាយស្រួល</option>
                      <option value="medium">មធ្យម</option>
                      <option value="hard">ពិបាក</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">រយៈពេលប៉ាន់ស្មាន</label>
                    <input
                      type="text"
                      value={tutorialEstimatedTime}
                      onChange={(e) => setTutorialEstimatedTime(e.target.value)}
                      placeholder="30 នាទី"
                      className="w-full px-3 py-2 rounded-lg border border-cyan-300 focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">លក្ខខណ្ឌជាមុន</label>
                  <textarea
                    value={tutorialPrerequisites}
                    onChange={(e) => setTutorialPrerequisites(e.target.value)}
                    placeholder="មូលដ្ឋានគ្រឹះអំពី..."
                    className="w-full px-3 py-2 rounded-lg border border-cyan-300 focus:ring-2 focus:ring-cyan-500 resize-none"
                    rows={2}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add padding at bottom for scroll */}
        <div className="h-20"></div>
      </div>

      {/* Footer Actions - Fixed with slide up animation */}
      <div className="flex-shrink-0 border-t border-gray-200 bg-white px-4 py-3 shadow-lg animate-slide-up-bottom">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleMediaSelect}
          className="hidden"
        />
        <div className="flex items-center justify-between">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={mediaPreviews.length >= 4}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 hover:shadow-md"
          >
            <ImageIcon className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-medium text-gray-700">បន្ថែមរូបភាព</span>
          </button>
          <span className="text-sm text-gray-500 font-medium">
            {mediaPreviews.length}/4 រូបភាព
          </span>
        </div>
      </div>
    </div>
  );
}
