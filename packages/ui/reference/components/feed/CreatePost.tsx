"use client";

import { useState, useRef, memo } from "react";
import Image from "next/image"; // ✅ ADDED: Next.js Image
import {
  Image as ImageIcon,
  X,
  Loader2,
  FileText,
  GraduationCap,
  Brain,
  HelpCircle,
  ClipboardCheck,
  Megaphone,
  BookOpen,
  BarChart3,
  FolderOpen,
  Send,
  ChevronDown,
  Globe,
  Users,
  Lock,
  User,
  Briefcase,
  Book,
  Microscope,
  Trophy,
  Lightbulb,
  Plus,
  Minus,
  Calendar,
} from "lucide-react";
import {
  createPost,
  updatePost,
  PostType,
  PostVisibility,
  POST_TYPE_INFO,
} from "@/lib/api/feed";
import { compressImage } from "@/lib/utils/imageCompression";

interface CreatePostProps {
  userProfilePicture?: string | null;
  userName: string;
  onPostCreated?: () => void;
  onError?: (error: string) => void;
  editMode?: boolean;
  editPost?: {
    id: string;
    content: string;
    postType: PostType;
    visibility: PostVisibility;
    media?: string[];
    pollOptions?: Array<{ id: string; text: string }>;
  };
}

const POST_TYPES: {
  type: PostType;
  icon: React.ElementType;
  label: string;
  labelKh: string;
}[] = [
  { type: "ARTICLE", icon: FileText, label: "Article", labelKh: "អត្ថបទ" },
  {
    type: "COURSE",
    icon: GraduationCap,
    label: "Course",
    labelKh: "វគ្គសិក្សា",
  },
  { type: "QUIZ", icon: Brain, label: "Quiz", labelKh: "សំណួរក្លាយ" },
  { type: "QUESTION", icon: HelpCircle, label: "Question", labelKh: "សំណួរ" },
  { type: "EXAM", icon: ClipboardCheck, label: "Exam", labelKh: "ប្រឡង" },
  {
    type: "ANNOUNCEMENT",
    icon: Megaphone,
    label: "Announcement",
    labelKh: "ប្រកាស",
  },
  {
    type: "ASSIGNMENT",
    icon: BookOpen,
    label: "Assignment",
    labelKh: "កិច្ចការផ្ទះ",
  },
  { type: "POLL", icon: BarChart3, label: "Poll", labelKh: "មតិ" },
  { type: "RESOURCE", icon: FolderOpen, label: "Resource", labelKh: "ធនធាន" },
  { type: "PROJECT", icon: Briefcase, label: "Project", labelKh: "គម្រោង" },
  { type: "TUTORIAL", icon: Book, label: "Tutorial", labelKh: "មេរៀន" },
  {
    type: "RESEARCH",
    icon: Microscope,
    label: "Research",
    labelKh: "ការស្រាវជ្រាវ",
  },
  {
    type: "ACHIEVEMENT",
    icon: Trophy,
    label: "Achievement",
    labelKh: "សមិទ្ធិផល",
  },
  {
    type: "REFLECTION",
    icon: Lightbulb,
    label: "Reflection",
    labelKh: "ការពិចារណា",
  },
  {
    type: "COLLABORATION",
    icon: Users,
    label: "Collaboration",
    labelKh: "កិច្ចសហការ",
  },
];

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

function CreatePost({
  userProfilePicture,
  userName,
  onPostCreated,
  onError,
  editMode = false,
  editPost,
}: CreatePostProps) {
  const [isExpanded, setIsExpanded] = useState(editMode); // Auto-expand if editing
  const [content, setContent] = useState(editPost?.content || "");
  const [postType, setPostType] = useState<PostType>(editPost?.postType || "ARTICLE");
  const [visibility, setVisibility] = useState<PostVisibility>(editPost?.visibility || "SCHOOL");
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<string[]>(editPost?.media || []);
  const [isPosting, setIsPosting] = useState(false);
  const [showVisibilitySelector, setShowVisibilitySelector] = useState(false);

  // Poll-specific state
  const [pollOptions, setPollOptions] = useState<string[]>(
    editPost?.pollOptions?.map(opt => opt.text) || ["", ""]
  );
  const [pollDuration, setPollDuration] = useState<number>(7); // days
  const [pollExpiresAt, setPollExpiresAt] = useState<string>("");
  const [pollIsAnonymous, setPollIsAnonymous] = useState<boolean>(editPost?.pollIsAnonymous || false);
  const [pollAllowMultiple, setPollAllowMultiple] = useState<boolean>(editPost?.pollAllowMultiple || false);
  const [pollMaxChoices, setPollMaxChoices] = useState<number>(1);

  // ASSIGNMENT-specific state
  const [assignmentDueDate, setAssignmentDueDate] = useState<string>("");
  const [assignmentPoints, setAssignmentPoints] = useState<number>(100);
  const [assignmentSubmissionType, setAssignmentSubmissionType] = useState<"file" | "text" | "link">("file");

  // QUIZ-specific state
  const [quizQuestions, setQuizQuestions] = useState<Array<{
    question: string;
    options: string[];
    correctAnswer: number;
    points: number;
  }>>([{ question: "", options: ["", "", "", ""], correctAnswer: 0, points: 10 }]);

  // ANNOUNCEMENT-specific state
  const [announcementUrgency, setAnnouncementUrgency] = useState<"low" | "medium" | "high" | "urgent">("medium");
  const [announcementExpiryDate, setAnnouncementExpiryDate] = useState<string>("");

  // COURSE-specific state
  const [courseCode, setCourseCode] = useState<string>("");
  const [courseLevel, setCourseLevel] = useState<"beginner" | "intermediate" | "advanced">("beginner");
  const [courseDuration, setCourseDuration] = useState<string>("");

  // TUTORIAL-specific state
  const [tutorialDifficulty, setTutorialDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [tutorialEstimatedTime, setTutorialEstimatedTime] = useState<string>("");
  const [tutorialPrerequisites, setTutorialPrerequisites] = useState<string>("");

  // EXAM-specific state
  const [examDate, setExamDate] = useState<string>("");
  const [examDuration, setExamDuration] = useState<number>(0);
  const [examTotalPoints, setExamTotalPoints] = useState<number>(0);
  const [examPassingScore, setExamPassingScore] = useState<number>(0);

  // RESOURCE-specific state
  const [resourceType, setResourceType] = useState<string>("");
  const [resourceUrl, setResourceUrl] = useState<string>("");

  // PROJECT-specific state
  const [projectStatus, setProjectStatus] = useState<string>("");
  const [projectDeadline, setProjectDeadline] = useState<string>("");
  const [projectTeamSize, setProjectTeamSize] = useState<number>(0);

  // RESEARCH-specific state
  const [researchField, setResearchField] = useState<string>("");
  const [researchCollaborators, setResearchCollaborators] = useState<string>("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleExpand = () => {
    setIsExpanded(true);
    setTimeout(() => textareaRef.current?.focus(), 100);
  };

  const handleCollapse = () => {
    if (editMode) {
      // In edit mode, just close the modal
      onPostCreated?.(); // This will close the modal
      return;
    }
    
    if (content.trim() || mediaFiles.length > 0) {
      if (!confirm("តើអ្នកពិតជាចង់បោះបង់ការផ្សាយនេះមែនទេ?")) return;
    }
    resetForm();
  };

  const resetForm = () => {
    setIsExpanded(false);
    setContent("");
    setPostType("ARTICLE");
    setMediaFiles([]);
    setMediaPreviews([]);
    setShowVisibilitySelector(false);
    setPollOptions(["", ""]);
    setPollDuration(7);
    setPollExpiresAt("");
    setPollIsAnonymous(false);
    setPollAllowMultiple(false);
    setPollMaxChoices(1);
    // Reset type-specific fields
    setAssignmentDueDate("");
    setAssignmentPoints(100);
    setAssignmentSubmissionType("file");
    setAnnouncementUrgency("medium");
    setAnnouncementExpiryDate("");
    setCourseCode("");
    setCourseLevel("beginner");
    setCourseDuration("");
    setTutorialDifficulty("medium");
    setTutorialEstimatedTime("");
    setTutorialPrerequisites("");
    setQuizQuestions([{ question: "", options: ["", "", "", ""], correctAnswer: 0, points: 10 }]);
    // Reset new fields
    setExamDate("");
    setExamDuration(0);
    setExamTotalPoints(0);
    setExamPassingScore(0);
    setResourceType("");
    setResourceUrl("");
    setProjectStatus("");
    setProjectDeadline("");
    setProjectTeamSize(0);
    setResearchField("");
    setResearchCollaborators("");
  };

  // Poll option handlers
  const addPollOption = () => {
    if (pollOptions.length < 6) {
      setPollOptions([...pollOptions, ""]);
    }
  };

  const removePollOption = (index: number) => {
    if (pollOptions.length > 2) {
      setPollOptions(pollOptions.filter((_, i) => i !== index));
    }
  };

  const updatePollOption = (index: number, value: string) => {
    const newOptions = [...pollOptions];
    newOptions[index] = value;
    setPollOptions(newOptions);
  };

  const handleMediaSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Limit to 4 images total (existing + new)
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
    setMediaFiles((prev) => prev.filter((_, i) => i !== index));
    setMediaPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePost = async () => {
    // Validation
    if (!content.trim() && mediaFiles.length === 0 && mediaPreviews.length === 0) {
      onError?.("សូមបញ្ចូលខ្លឹមសារឬរូបភាព");
      return;
    }

    // Poll validation
    if (postType === "POLL") {
      const validOptions = pollOptions.filter((opt) => opt.trim());
      if (validOptions.length < 2) {
        onError?.("សូមបញ្ចូលជម្រើសយ៉ាងតិច ២");
        return;
      }
    }

    setIsPosting(true);

    try {
      if (editMode && editPost) {
        // Update existing post
        await updatePost(editPost.id, {
          content: content.trim(),
          visibility,
        });
      } else {
        // Create new post
        const postData: any = {
          content: content.trim(),
          postType,
          visibility,
          media: mediaFiles.length > 0 ? mediaFiles : undefined,
        };

        // Add poll options if POLL type
        if (postType === "POLL") {
          postData.pollOptions = pollOptions.filter((opt) => opt.trim());
          // Add enhanced poll settings
          if (pollExpiresAt) {
            postData.pollExpiresAt = new Date(pollExpiresAt).toISOString();
          }
          postData.pollIsAnonymous = pollIsAnonymous;
          postData.pollAllowMultiple = pollAllowMultiple;
          if (pollAllowMultiple && pollMaxChoices) {
            postData.pollMaxChoices = pollMaxChoices;
          }
        }

        // ✅ Add assignment fields if ASSIGNMENT type
        if (postType === "ASSIGNMENT") {
          if (assignmentDueDate) {
            postData.assignmentDueDate = new Date(assignmentDueDate).toISOString();
          }
          postData.assignmentPoints = assignmentPoints;
          postData.assignmentSubmissionType = assignmentSubmissionType;
        }

        // ✅ Add course fields if COURSE type
        if (postType === "COURSE") {
          postData.courseCode = courseCode;
          postData.courseLevel = courseLevel;
          postData.courseDuration = courseDuration;
        }

        // ✅ Add announcement fields if ANNOUNCEMENT type
        if (postType === "ANNOUNCEMENT") {
          postData.announcementUrgency = announcementUrgency;
          if (announcementExpiryDate) {
            postData.announcementExpiryDate = new Date(announcementExpiryDate).toISOString();
          }
        }

        // ✅ Add tutorial fields if TUTORIAL type
        if (postType === "TUTORIAL") {
          postData.tutorialDifficulty = tutorialDifficulty;
          postData.tutorialEstimatedTime = tutorialEstimatedTime;
          postData.tutorialPrerequisites = tutorialPrerequisites;
        }

        // ✅ Add quiz questions if QUIZ type
        if (postType === "QUIZ") {
          postData.quizQuestions = quizQuestions.filter(q => q.question.trim());
        }

        // ✅ Add exam fields if EXAM type
        if (postType === "EXAM") {
          if (examDate) {
            postData.examDate = new Date(examDate).toISOString();
          }
          if (examDuration) postData.examDuration = examDuration;
          if (examTotalPoints) postData.examTotalPoints = examTotalPoints;
          if (examPassingScore) postData.examPassingScore = examPassingScore;
        }

        // ✅ Add resource fields if RESOURCE type
        if (postType === "RESOURCE") {
          if (resourceType) postData.resourceType = resourceType;
          if (resourceUrl) postData.resourceUrl = resourceUrl;
        }

        // ✅ Add project fields if PROJECT type
        if (postType === "PROJECT") {
          if (projectStatus) postData.projectStatus = projectStatus;
          if (projectDeadline) {
            postData.projectDeadline = new Date(projectDeadline).toISOString();
          }
          if (projectTeamSize) postData.projectTeamSize = projectTeamSize;
        }

        // ✅ Add research fields if RESEARCH type
        if (postType === "RESEARCH") {
          if (researchField) postData.researchField = researchField;
          if (researchCollaborators) postData.researchCollaborators = researchCollaborators;
        }

        await createPost(postData);
      }

      resetForm();
      onPostCreated?.();
    } catch (error: any) {
      console.error("Failed to save post:", error);
      onError?.(error.message || "មិនអាចរក្សាទុកការផ្សាយបានទេ");
    } finally {
      setIsPosting(false);
    }
  };

  const selectedType = POST_TYPE_INFO[postType];
  const selectedVisibility = VISIBILITY_OPTIONS.find(
    (v) => v.value === visibility,
  );
  const VisibilityIcon = selectedVisibility?.icon || Globe;

  if (!isExpanded) {
    return (
      <button
        onClick={handleExpand}
        className="w-full bg-white rounded-2xl shadow-card hover:shadow-card-hover p-4 flex items-center gap-3 transition-all duration-300 hover:scale-[1.01]"
      >
        {/* Avatar with gradient border */}
        <div className="relative p-[2px] bg-gradient-to-br from-indigo-400 via-purple-400 to-pink-400 rounded-full hover:from-indigo-500 hover:via-purple-500 hover:to-pink-500 transition-all flex-shrink-0 hover:scale-110 duration-200">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-white">
            {userProfilePicture ? (
              <Image
                src={userProfilePicture}
                alt={userName}
                width={40}
                height={40}
                className="w-full h-full object-cover"
                unoptimized // ✅ Skip optimization for R2 URLs
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 text-left">
          <p className="text-gray-400 font-medium">
            តើអ្នកកំពុងគិតអ្វី <span className="text-gray-600">{userName}</span>
            ?
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="p-2.5 bg-gradient-to-br from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100 rounded-xl transition-all duration-200 hover:scale-110">
            <ImageIcon className="w-5 h-5 text-green-600" />
          </div>
        </div>
      </button>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-card overflow-hidden transform transition-all duration-300 ease-out">
      {/* Beautiful Header with gradient */}
      <div className="relative px-4 py-3 bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50">
        <div className="flex items-center justify-between">
          <h4 className="font-bold font-koulen text-gray-900 text-lg">
            {editMode ? "កែសម្រួលការផ្សាយ" : "បង្កើតការផ្សាយ"}
          </h4>
          <button
            onClick={handleCollapse}
            className="p-2 hover:bg-white/80 rounded-full transition-all duration-200 hover:scale-110 hover:rotate-90"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Author with gradient avatar */}
      <div className="px-4 py-4 flex items-center gap-3">
        <div className="relative p-[2px] bg-gradient-to-br from-indigo-400 via-purple-400 to-pink-400 rounded-full flex-shrink-0 hover:scale-110 transition-transform duration-200">
          <div className="w-11 h-11 rounded-full overflow-hidden bg-white">
            {userProfilePicture ? (
              <img
                src={userProfilePicture}
                alt={userName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
            )}
          </div>
        </div>
        <div className="flex-1">
          <p className="font-bold text-gray-900">{userName}</p>
        </div>
      </div>

      {/* Post Type Selector */}
      <div className="px-4 pb-4 bg-gradient-to-b from-gray-50/50 to-transparent">
        <p className="text-sm font-semibold text-gray-700 mb-3">
          Select post type:
        </p>
        <div className="flex gap-3 overflow-x-auto pb-3 pt-1 px-1 -mx-1 hide-scrollbar">
          {POST_TYPES.map(({ type, icon: Icon, labelKh }, index) => {
            const typeInfo = POST_TYPE_INFO[type];
            const isSelected = postType === type;
            return (
              <button
                key={type}
                onClick={() => setPostType(type)}
                className={`flex flex-col items-center gap-2 px-4 py-3 rounded-2xl flex-shrink-0 transition-all duration-200 ${
                  isSelected
                    ? "shadow-lg scale-105 ring-2"
                    : "hover:bg-gray-50 hover:shadow-md hover:scale-105 bg-white border border-gray-100"
                }`}
                style={{
                  backgroundColor: isSelected
                    ? `${typeInfo.color}15`
                    : undefined,
                  ringColor: isSelected ? typeInfo.color : undefined,
                  borderColor: isSelected ? typeInfo.color : undefined,
                }}
              >
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200 ${
                    isSelected ? "shadow-md scale-110" : "hover:scale-110"
                  }`}
                  style={{
                    backgroundColor: typeInfo.color,
                  }}
                >
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <span
                  className="text-xs font-semibold whitespace-nowrap"
                  style={{ color: isSelected ? typeInfo.color : "#6b7280" }}
                >
                  {labelKh}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Type Badge & Visibility */}
      <div className="px-4 pt-2 pb-3 flex items-center gap-3">
        <div
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200"
          style={{ backgroundColor: selectedType.color }}
        >
          {POST_TYPES.find((t) => t.type === postType)?.icon &&
            (() => {
              const Icon = POST_TYPES.find((t) => t.type === postType)?.icon!;
              return <Icon className="w-4 h-4" />;
            })()}
          {selectedType.labelKh}
        </div>

        {/* Visibility Selector - Modern */}
        <div className="relative">
          <button
            onClick={() => setShowVisibilitySelector(!showVisibilitySelector)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 transition-all duration-200 hover:scale-105"
          >
            <VisibilityIcon className="w-4 h-4" />
            {selectedVisibility?.labelKh}
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showVisibilitySelector ? 'rotate-180' : ''}`} />
          </button>

          {showVisibilitySelector && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowVisibilitySelector(false)}
              />
              <div className="absolute left-0 top-12 w-44 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-20 animate-slide-down">
                {VISIBILITY_OPTIONS.map((option, index) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setVisibility(option.value);
                      setShowVisibilitySelector(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-all duration-200 animate-slide-up hover:scale-105 ${
                      visibility === option.value
                        ? "bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-700 shadow-sm"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <option.icon className="w-4 h-4" />
                    <span>{option.labelKh}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Content - Beautiful textarea */}
      <div className="px-4 py-2">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={
            postType === "QUESTION"
              ? "សួរសំណួរ..."
              : postType === "ACHIEVEMENT"
                ? "ចែករំលែកសមិទ្ធផល..."
                : postType === "POLL"
                  ? "សួរសំណួរមតិ..."
                  : "តើអ្នកកំពុងគិតអ្វី?"
          }
          className="w-full min-h-[140px] resize-none border-0 focus:ring-2 focus:ring-indigo-500 text-gray-900 placeholder-gray-400 text-base p-3 bg-gray-50 rounded-xl transition-all duration-200"
          maxLength={2000}
        />
      </div>

      {/* Poll Options - Show only when POLL type is selected */}
      {postType === "POLL" && (
        <div className="px-4 pb-3 space-y-3">
          <div className="flex items-center justify-between mb-2 bg-gradient-to-r from-indigo-50 to-purple-50 px-3 py-2 rounded-xl">
            <p className="text-sm font-semibold text-gray-700">ជម្រើសមតិ:</p>
            <span className="text-xs font-medium text-indigo-600 bg-white px-2 py-1 rounded-full">
              {pollOptions.length}/6
            </span>
          </div>

          {pollOptions.map((option, index) => (
            <div key={index} className="flex items-center gap-2">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={option}
                  onChange={(e) => updatePollOption(index, e.target.value)}
                  placeholder={`ជម្រើសទី ${index + 1}`}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-medium transition-all"
                  maxLength={100}
                />
              </div>
              {pollOptions.length > 2 && (
                <button
                  onClick={() => removePollOption(index)}
                  className="p-2.5 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
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
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all border-2 border-dashed border-indigo-200 hover:border-indigo-300 w-full justify-center"
              type="button"
            >
              <Plus className="w-4 h-4" />
              បន្ថែមជម្រើស
            </button>
          )}

          {/* Poll Settings */}
          <div className="mt-4 space-y-3 p-4 bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 rounded-xl border-2 border-indigo-100">
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

      {/* QUIZ Fields */}
      {postType === "QUIZ" && (
        <div className="px-4 pb-3 space-y-4">
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-3 py-2 rounded-xl mb-2">
            <p className="text-sm font-semibold text-gray-700">Quiz Questions ({quizQuestions.length}):</p>
          </div>

          {quizQuestions.map((question, qIndex) => (
            <div key={qIndex} className="p-4 bg-white border-2 border-green-200 rounded-xl space-y-3">
              {/* Question Header */}
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-gray-800">Question {qIndex + 1}</h4>
                {quizQuestions.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      setQuizQuestions(quizQuestions.filter((_, i) => i !== qIndex));
                    }}
                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Question Text */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  ❓ Question
                </label>
                <textarea
                  value={question.question}
                  onChange={(e) => {
                    const newQuestions = [...quizQuestions];
                    newQuestions[qIndex].question = e.target.value;
                    setQuizQuestions(newQuestions);
                  }}
                  placeholder="Enter your question here..."
                  className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm resize-none"
                  rows={2}
                />
              </div>

              {/* Options */}
              <div className="space-y-2">
                <label className="block text-xs font-medium text-gray-600">
                  Options (select the correct one):
                </label>
                {question.options.map((option, oIndex) => (
                  <div key={oIndex} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name={`correct-answer-${qIndex}`}
                      checked={question.correctAnswer === oIndex}
                      onChange={() => {
                        const newQuestions = [...quizQuestions];
                        newQuestions[qIndex].correctAnswer = oIndex;
                        setQuizQuestions(newQuestions);
                      }}
                      className="w-5 h-5 text-green-600 focus:ring-2 focus:ring-green-500"
                    />
                    <input
                      type="text"
                      value={option}
                      onChange={(e) => {
                        const newQuestions = [...quizQuestions];
                        newQuestions[qIndex].options[oIndex] = e.target.value;
                        setQuizQuestions(newQuestions);
                      }}
                      placeholder={`Option ${oIndex + 1}`}
                      className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                    />
                  </div>
                ))}
              </div>

              {/* Points */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  ⭐ Points for this question
                </label>
                <input
                  type="number"
                  value={question.points}
                  onChange={(e) => {
                    const newQuestions = [...quizQuestions];
                    newQuestions[qIndex].points = Number(e.target.value);
                    setQuizQuestions(newQuestions);
                  }}
                  min="1"
                  max="100"
                  className="w-32 px-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                />
              </div>
            </div>
          ))}

          {/* Add Question Button */}
          {quizQuestions.length < 10 && (
            <button
              type="button"
              onClick={() => {
                setQuizQuestions([
                  ...quizQuestions,
                  { question: "", options: ["", "", "", ""], correctAnswer: 0, points: 10 }
                ]);
              }}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-green-600 hover:bg-green-50 rounded-xl transition-all border-2 border-dashed border-green-200 hover:border-green-300 w-full justify-center"
            >
              <Plus className="w-4 h-4" />
              Add Question ({quizQuestions.length}/10)
            </button>
          )}
        </div>
      )}

      {/* ASSIGNMENT Fields */}
      {postType === "ASSIGNMENT" && (
        <div className="px-4 pb-3 space-y-3">
          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 px-3 py-2 rounded-xl mb-2">
            <p className="text-sm font-semibold text-gray-700">Assignment Details:</p>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            {/* Due Date */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                📅 Due Date
              </label>
              <input
                type="datetime-local"
                value={assignmentDueDate}
                onChange={(e) => setAssignmentDueDate(e.target.value)}
                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>

            {/* Points */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                ⭐ Points
              </label>
              <input
                type="number"
                value={assignmentPoints}
                onChange={(e) => setAssignmentPoints(Number(e.target.value))}
                min="0"
                max="100"
                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>
          </div>

          {/* Submission Type */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              📤 Submission Type
            </label>
            <div className="flex gap-2">
              {[
                { value: "file", label: "File Upload", icon: "📎" },
                { value: "text", label: "Text", icon: "📝" },
                { value: "link", label: "Link", icon: "🔗" },
              ].map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setAssignmentSubmissionType(type.value as any)}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    assignmentSubmissionType === type.value
                      ? "bg-blue-500 text-white shadow-md"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  <span className="mr-1">{type.icon}</span>
                  {type.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ANNOUNCEMENT Fields */}
      {postType === "ANNOUNCEMENT" && (
        <div className="px-4 pb-3 space-y-3">
          <div className="bg-gradient-to-r from-orange-50 to-amber-50 px-3 py-2 rounded-xl mb-2">
            <p className="text-sm font-semibold text-gray-700">Announcement Settings:</p>
          </div>

          {/* Urgency Level */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">
              🚨 Urgency Level
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: "low", label: "Low", color: "bg-gray-100 text-gray-700", icon: "ℹ️" },
                { value: "medium", label: "Medium", color: "bg-blue-100 text-blue-700", icon: "📢" },
                { value: "high", label: "High", color: "bg-orange-100 text-orange-700", icon: "⚠️" },
                { value: "urgent", label: "Urgent", color: "bg-red-100 text-red-700", icon: "🚨" },
              ].map((level) => (
                <button
                  key={level.value}
                  type="button"
                  onClick={() => setAnnouncementUrgency(level.value as any)}
                  className={`px-3 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    announcementUrgency === level.value
                      ? `${level.color} ring-2 ring-offset-2`
                      : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <span className="mr-1.5">{level.icon}</span>
                  {level.label}
                </button>
              ))}
            </div>
          </div>

          {/* Expiry Date */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              ⏰ Expiry Date (Optional)
            </label>
            <input
              type="datetime-local"
              value={announcementExpiryDate}
              onChange={(e) => setAnnouncementExpiryDate(e.target.value)}
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
            />
          </div>
        </div>
      )}

      {/* COURSE Fields */}
      {postType === "COURSE" && (
        <div className="px-4 pb-3 space-y-3">
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 px-3 py-2 rounded-xl mb-2">
            <p className="text-sm font-semibold text-gray-700">Course Information:</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Course Code */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                🔢 Course Code
              </label>
              <input
                type="text"
                value={courseCode}
                onChange={(e) => setCourseCode(e.target.value)}
                placeholder="e.g., CS101"
                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
              />
            </div>

            {/* Duration */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                ⏱️ Duration
              </label>
              <input
                type="text"
                value={courseDuration}
                onChange={(e) => setCourseDuration(e.target.value)}
                placeholder="e.g., 8 weeks"
                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
              />
            </div>
          </div>

          {/* Course Level */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">
              📊 Course Level
            </label>
            <div className="flex gap-2">
              {[
                { value: "beginner", label: "Beginner", icon: "🌱" },
                { value: "intermediate", label: "Intermediate", icon: "🌿" },
                { value: "advanced", label: "Advanced", icon: "🌳" },
              ].map((level) => (
                <button
                  key={level.value}
                  type="button"
                  onClick={() => setCourseLevel(level.value as any)}
                  className={`flex-1 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    courseLevel === level.value
                      ? "bg-purple-500 text-white shadow-md"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  <span className="mr-1">{level.icon}</span>
                  {level.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TUTORIAL Fields */}
      {postType === "TUTORIAL" && (
        <div className="px-4 pb-3 space-y-3">
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-3 py-2 rounded-xl mb-2">
            <p className="text-sm font-semibold text-gray-700">Tutorial Details:</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Estimated Time */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                ⏰ Estimated Time
              </label>
              <input
                type="text"
                value={tutorialEstimatedTime}
                onChange={(e) => setTutorialEstimatedTime(e.target.value)}
                placeholder="e.g., 30 min"
                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
              />
            </div>

            {/* Difficulty */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">
                📈 Difficulty
              </label>
              <select
                value={tutorialDifficulty}
                onChange={(e) => setTutorialDifficulty(e.target.value as any)}
                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
              >
                <option value="easy">Easy 😊</option>
                <option value="medium">Medium 🤔</option>
                <option value="hard">Hard 💪</option>
              </select>
            </div>
          </div>

          {/* Prerequisites */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              📚 Prerequisites (Optional)
            </label>
            <textarea
              value={tutorialPrerequisites}
              onChange={(e) => setTutorialPrerequisites(e.target.value)}
              placeholder="What should learners know before starting?"
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm resize-none"
              rows={2}
            />
          </div>
        </div>
      )}

      {/* EXAM Fields */}
      {postType === "EXAM" && (
        <div className="px-4 pb-3 space-y-3">
          <div className="bg-gradient-to-r from-red-50 to-pink-50 px-3 py-2 rounded-xl mb-2">
            <p className="text-sm font-semibold text-gray-700">Exam Details:</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Exam Date */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                📅 Exam Date & Time
              </label>
              <input
                type="datetime-local"
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm"
              />
            </div>

            {/* Duration */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                ⏱️ Duration (minutes)
              </label>
              <input
                type="number"
                value={examDuration}
                onChange={(e) => setExamDuration(Number(e.target.value))}
                placeholder="e.g., 120"
                min="0"
                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Total Points */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                ⭐ Total Points
              </label>
              <input
                type="number"
                value={examTotalPoints}
                onChange={(e) => setExamTotalPoints(Number(e.target.value))}
                placeholder="e.g., 100"
                min="0"
                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm"
              />
            </div>

            {/* Passing Score */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                ✅ Passing Score (%)
              </label>
              <input
                type="number"
                value={examPassingScore}
                onChange={(e) => setExamPassingScore(Number(e.target.value))}
                placeholder="e.g., 70"
                min="0"
                max="100"
                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm"
              />
            </div>
          </div>
        </div>
      )}

      {/* RESOURCE Fields */}
      {postType === "RESOURCE" && (
        <div className="px-4 pb-3 space-y-3">
          <div className="bg-gradient-to-r from-indigo-50 to-blue-50 px-3 py-2 rounded-xl mb-2">
            <p className="text-sm font-semibold text-gray-700">Resource Information:</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Resource Type */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">
                📁 Resource Type
              </label>
              <select
                value={resourceType}
                onChange={(e) => setResourceType(e.target.value)}
                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              >
                <option value="">Select type</option>
                <option value="document">📄 Document</option>
                <option value="video">🎥 Video</option>
                <option value="link">🔗 Link</option>
                <option value="tool">🛠️ Tool</option>
                <option value="other">📦 Other</option>
              </select>
            </div>

            {/* Resource URL */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                🔗 Resource URL
              </label>
              <input
                type="url"
                value={resourceUrl}
                onChange={(e) => setResourceUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              />
            </div>
          </div>
        </div>
      )}

      {/* PROJECT Fields */}
      {postType === "PROJECT" && (
        <div className="px-4 pb-3 space-y-3">
          <div className="bg-gradient-to-r from-cyan-50 to-blue-50 px-3 py-2 rounded-xl mb-2">
            <p className="text-sm font-semibold text-gray-700">Project Details:</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Project Status */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">
                📊 Status
              </label>
              <select
                value={projectStatus}
                onChange={(e) => setProjectStatus(e.target.value)}
                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-sm"
              >
                <option value="">Select status</option>
                <option value="planning">📋 Planning</option>
                <option value="in_progress">⚙️ In Progress</option>
                <option value="completed">✅ Completed</option>
              </select>
            </div>

            {/* Team Size */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                👥 Team Size
              </label>
              <input
                type="number"
                value={projectTeamSize}
                onChange={(e) => setProjectTeamSize(Number(e.target.value))}
                placeholder="e.g., 5"
                min="1"
                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-sm"
              />
            </div>
          </div>

          {/* Project Deadline */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              📅 Project Deadline
            </label>
            <input
              type="datetime-local"
              value={projectDeadline}
              onChange={(e) => setProjectDeadline(e.target.value)}
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-sm"
            />
          </div>
        </div>
      )}

      {/* RESEARCH Fields */}
      {postType === "RESEARCH" && (
        <div className="px-4 pb-3 space-y-3">
          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 px-3 py-2 rounded-xl mb-2">
            <p className="text-sm font-semibold text-gray-700">Research Information:</p>
          </div>

          {/* Research Field */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              🔬 Research Field
            </label>
            <input
              type="text"
              value={researchField}
              onChange={(e) => setResearchField(e.target.value)}
              placeholder="e.g., Computer Science, Biology"
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
            />
          </div>

          {/* Collaborators */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              👥 Collaborators (comma-separated)
            </label>
            <input
              type="text"
              value={researchCollaborators}
              onChange={(e) => setResearchCollaborators(e.target.value)}
              placeholder="e.g., Dr. Smith, Prof. Johnson"
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
            />
          </div>
        </div>
      )}

      {/* Media Previews */}
      {mediaPreviews.length > 0 && (
        <div className="px-4 pb-3">
          <div
            className={`grid gap-2 ${
              mediaPreviews.length === 1
                ? "grid-cols-1"
                : mediaPreviews.length === 2
                  ? "grid-cols-2"
                  : "grid-cols-2"
            }`}
          >
            {mediaPreviews.map((preview, index) => (
              <div
                key={index}
                className={`relative rounded-xl overflow-hidden ${
                  mediaPreviews.length === 3 && index === 0 ? "col-span-2" : ""
                }`}
              >
                <img
                  src={preview}
                  alt={`Preview ${index + 1}`}
                  className="w-full h-32 object-cover"
                />
                <button
                  onClick={() => removeMedia(index)}
                  className="absolute top-2 right-2 p-1.5 bg-black/50 rounded-full hover:bg-black/70 transition-colors"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions - Beautiful footer */}
      <div className="px-4 py-4 bg-gradient-to-t from-gray-50/50 to-transparent flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={mediaFiles.length + mediaPreviews.length >= 4}
            className="p-3 bg-gradient-to-br from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md relative"
          >
            <ImageIcon className="w-5 h-5 text-green-600" />
            {(mediaFiles.length + mediaPreviews.length > 0) && (
              <span className="absolute -top-1 -right-1 bg-green-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {mediaFiles.length + mediaPreviews.length}
              </span>
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleMediaSelect}
            className="hidden"
          />
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-gray-400 bg-gray-100 px-3 py-1.5 rounded-full">
            {content.length}/2000
          </span>
          <button
            onClick={handlePost}
            disabled={isPosting || (!content.trim() && mediaFiles.length === 0 && mediaPreviews.length === 0)}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl hover:scale-105 active:scale-95"
          >
            {isPosting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{editMode ? "កំពុងរក្សាទុក..." : "កំពុងផ្សាយ..."}</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>{editMode ? "រក្សាទុក" : "ផ្សាយ"}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default memo(CreatePost);
