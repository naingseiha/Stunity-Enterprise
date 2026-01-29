"use client";

import { useState, useEffect } from "react";
import {
  Plus,
  Briefcase,
  GraduationCap,
  Heart,
  Users,
  MapPin,
  Calendar,
  ChevronRight,
  Edit2,
  Trash2,
  X,
  Upload,
  Award,
  Clock,
} from "lucide-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api";

type ExperienceType = "WORK" | "TEACHING" | "VOLUNTEER" | "INTERNSHIP" | "RESEARCH" | "LEADERSHIP" | "OTHER";

interface Experience {
  id: string;
  userId: string;
  type: ExperienceType;
  title: string;
  organization: string;
  location?: string;
  startDate: string;
  endDate?: string;
  isCurrent: boolean;
  description?: string;
  achievements: string[];
  skills: string[];
  mediaUrls: string[];
  mediaKeys: string[];
  createdAt: string;
  updatedAt: string;
}

interface ExperienceTimelineProps {
  userId: string;
  isOwnProfile: boolean;
}

const EXPERIENCE_TYPE_INFO: Record<
  ExperienceType,
  { icon: React.ElementType; label: string; labelKh: string; color: string; bgColor: string }
> = {
  WORK: {
    icon: Briefcase,
    label: "Work Experience",
    labelKh: "បទពិសោធន៍ការងារ",
    color: "#3B82F6",
    bgColor: "bg-blue-50",
  },
  TEACHING: {
    icon: GraduationCap,
    label: "Teaching",
    labelKh: "បង្រៀន",
    color: "#8B5CF6",
    bgColor: "bg-purple-50",
  },
  VOLUNTEER: {
    icon: Heart,
    label: "Volunteer",
    labelKh: "អ្នកស្ម័គ្រចិត្ត",
    color: "#EF4444",
    bgColor: "bg-red-50",
  },
  INTERNSHIP: {
    icon: Users,
    label: "Internship",
    labelKh: "កម្មសិក្សា",
    color: "#10B981",
    bgColor: "bg-green-50",
  },
  RESEARCH: {
    icon: Award,
    label: "Research",
    labelKh: "ស្រាវជ្រាវ",
    color: "#F59E0B",
    bgColor: "bg-yellow-50",
  },
  LEADERSHIP: {
    icon: Users,
    label: "Leadership",
    labelKh: "ភាពជាអ្នកដឹកនាំ",
    color: "#EC4899",
    bgColor: "bg-pink-50",
  },
  OTHER: {
    icon: Briefcase,
    label: "Other",
    labelKh: "ផ្សេងៗ",
    color: "#6B7280",
    bgColor: "bg-gray-50",
  },
};

export default function ExperienceTimeline({ userId, isOwnProfile }: ExperienceTimelineProps) {
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingExperience, setEditingExperience] = useState<Experience | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    type: "WORK" as ExperienceType,
    title: "",
    organization: "",
    location: "",
    startDate: "",
    endDate: "",
    isCurrent: false,
    description: "",
    achievements: "",
    skills: "",
  });

  useEffect(() => {
    fetchExperiences();
  }, [userId]);

  const fetchExperiences = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE_URL}/profile/${userId}/experiences`, {
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (response.ok) {
        const data = await response.json();
        // Sort by start date, most recent first
        const sorted = (data.data || []).sort((a: Experience, b: Experience) => {
          if (a.isCurrent) return -1;
          if (b.isCurrent) return 1;
          return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
        });
        setExperiences(sorted);
      }
    } catch (error) {
      console.error("Failed to fetch experiences:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    try {
      setSubmitting(true);
      const token = localStorage.getItem("token");
      if (!token) return;

      const url = editingExperience
        ? `${API_BASE_URL}/profile/experiences/${editingExperience.id}`
        : `${API_BASE_URL}/profile/experiences`;

      const method = editingExperience ? "PUT" : "POST";

      const payload = {
        type: formData.type,
        title: formData.title,
        organization: formData.organization,
        location: formData.location || undefined,
        startDate: formData.startDate,
        endDate: formData.isCurrent ? undefined : formData.endDate || undefined,
        isCurrent: formData.isCurrent,
        description: formData.description || undefined,
        achievements: formData.achievements
          .split("\n")
          .map((a) => a.trim())
          .filter(Boolean),
        skills: formData.skills
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      };

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        await fetchExperiences();
        handleCloseModal();
      } else {
        const error = await response.json();
        alert(error.message || "Failed to save experience");
      }
    } catch (error) {
      console.error("Failed to save experience:", error);
      alert("Failed to save experience. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (experienceId: string) => {
    if (!confirm("តើអ្នកប្រាកដថាចង់លុបបទពិសោធន៍នេះ?")) return;

    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/profile/experiences/${experienceId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setExperiences(experiences.filter((e) => e.id !== experienceId));
      } else {
        alert("Failed to delete experience");
      }
    } catch (error) {
      console.error("Failed to delete experience:", error);
      alert("Failed to delete experience");
    }
  };

  const handleEdit = (experience: Experience) => {
    setEditingExperience(experience);
    setFormData({
      type: experience.type,
      title: experience.title,
      organization: experience.organization,
      location: experience.location || "",
      startDate: experience.startDate.split("T")[0],
      endDate: experience.endDate ? experience.endDate.split("T")[0] : "",
      isCurrent: experience.isCurrent,
      description: experience.description || "",
      achievements: experience.achievements.join("\n"),
      skills: experience.skills.join(", "),
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingExperience(null);
    setFormData({
      type: "WORK",
      title: "",
      organization: "",
      location: "",
      startDate: "",
      endDate: "",
      isCurrent: false,
      description: "",
      achievements: "",
      skills: "",
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  };

  const calculateDuration = (start: string, end?: string) => {
    const startDate = new Date(start);
    const endDate = end ? new Date(end) : new Date();
    const months = Math.floor(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
    );
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;

    if (years > 0 && remainingMonths > 0) {
      return `${years}y ${remainingMonths}m`;
    } else if (years > 0) {
      return `${years} year${years > 1 ? "s" : ""}`;
    } else {
      return `${remainingMonths} month${remainingMonths > 1 ? "s" : ""}`;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">បទពិសោធន៍ការងារ</h2>
          <p className="text-sm text-gray-500 mt-1">
            ប្រវត្តិការងារ និងបទពិសោធន៍របស់អ្នក • {experiences.length} បទពិសោធន៍
          </p>
        </div>

        {isOwnProfile && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium hover:shadow-lg transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>បន្ថែមបទពិសោធន៍</span>
          </button>
        )}
      </div>

      {/* Timeline */}
      {experiences.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-2xl">
          <Briefcase className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">មិនទាន់មានបទពិសោធន៍</h3>
          <p className="text-gray-500">
            {isOwnProfile
              ? "ចាប់ផ្តើមបន្ថែមបទពិសោធន៍ការងារដំបូងរបស់អ្នក"
              : "អ្នកប្រើប្រាស់នេះមិនទាន់មានបទពិសោធន៍ទេ"}
          </p>
        </div>
      ) : (
        <div className="relative">
          {/* Timeline Line */}
          <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-indigo-200 via-purple-200 to-transparent"></div>

          {/* Timeline Items */}
          <div className="space-y-6">
            {experiences.map((experience, index) => {
              const typeInfo = EXPERIENCE_TYPE_INFO[experience.type];
              const Icon = typeInfo.icon;

              return (
                <div key={experience.id} className="relative pl-20">
                  {/* Timeline Dot */}
                  <div
                    className="absolute left-0 w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg"
                    style={{ backgroundColor: typeInfo.color }}
                  >
                    <Icon className="w-8 h-8 text-white" />
                  </div>

                  {/* Content Card */}
                  <div className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-lg transition-all group">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-xl font-bold text-gray-900">
                            {experience.title}
                          </h3>
                          {experience.isCurrent && (
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                              Current
                            </span>
                          )}
                        </div>
                        <p className="text-lg font-medium text-gray-700 mb-1">
                          {experience.organization}
                        </p>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span>
                              {formatDate(experience.startDate)} -{" "}
                              {experience.isCurrent ? "Present" : formatDate(experience.endDate!)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            <span>{calculateDuration(experience.startDate, experience.endDate)}</span>
                          </div>
                          {experience.location && (
                            <div className="flex items-center gap-1">
                              <MapPin className="w-4 h-4" />
                              <span>{experience.location}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      {isOwnProfile && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEdit(experience)}
                            className="p-2 hover:bg-indigo-50 rounded-lg transition-colors text-gray-400 hover:text-indigo-600"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(experience.id)}
                            className="p-2 hover:bg-red-50 rounded-lg transition-colors text-gray-400 hover:text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Description */}
                    {experience.description && (
                      <p className="text-gray-600 mb-4 leading-relaxed">{experience.description}</p>
                    )}

                    {/* Achievements */}
                    {experience.achievements.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                          <Award className="w-4 h-4 text-yellow-500" />
                          សមិទ្ធិផល
                        </h4>
                        <ul className="space-y-1.5">
                          {experience.achievements.map((achievement, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                              <ChevronRight className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5" />
                              <span>{achievement}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Skills */}
                    {experience.skills.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {experience.skills.map((skill, idx) => (
                          <span
                            key={idx}
                            className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-medium"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">
                {editingExperience ? "កែប្រែបទពិសោធន៍" : "បន្ថែមបទពិសោធន៍ថ្មី"}
              </h3>
              <button
                onClick={handleCloseModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ប្រភេទបទពិសោធន៍ *
                </label>
                <select
                  required
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as ExperienceType })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  {Object.entries(EXPERIENCE_TYPE_INFO).map(([type, info]) => (
                    <option key={type} value={type}>
                      {info.labelKh}
                    </option>
                  ))}
                </select>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  តួនាទី / ចំណងជើង *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="ឧទាហរណ៍: Software Engineer, គ្រូបង្រៀនគណិតវិទ្យា"
                />
              </div>

              {/* Organization */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ក្រុមហ៊ុន / អង្គភាព *
                </label>
                <input
                  type="text"
                  required
                  value={formData.organization}
                  onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="ឧទាហរណ៍: ABC Company, សាលារៀន XYZ"
                />
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">ទីតាំង</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="ឧទាហរណ៍: Phnom Penh, Cambodia"
                />
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ថ្ងៃចាប់ផ្តើម *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ថ្ងៃបញ្ចប់
                  </label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    disabled={formData.isCurrent}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Current */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="isCurrent"
                  checked={formData.isCurrent}
                  onChange={(e) =>
                    setFormData({ ...formData, isCurrent: e.target.checked, endDate: "" })
                  }
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500"
                />
                <label htmlFor="isCurrent" className="text-sm text-gray-700">
                  បច្ចុប្បន្នខ្ញុំកំពុងធ្វើការនៅទីនេះ
                </label>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ការពិពណ៌នា
                </label>
                <textarea
                  rows={4}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                  placeholder="ពិពណ៌នាអំពីតួនាទីនិងទំនួលខុសត្រូវរបស់អ្នក..."
                />
              </div>

              {/* Achievements */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  សមិទ្ធិផល (មួយជួរមួយ)
                </label>
                <textarea
                  rows={4}
                  value={formData.achievements}
                  onChange={(e) => setFormData({ ...formData, achievements: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                  placeholder="បង្កើនប្រសិទ្ធភាពដល់ 40%&#10;ដឹកនាំក្រុមចំនួន 5 នាក់&#10;បង្កើតប្រព័ន្ធថ្មី"
                />
              </div>

              {/* Skills */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ជំនាញដែលប្រើ (ប្រើ comma ដើម្បីបំបែក)
                </label>
                <input
                  type="text"
                  value={formData.skills}
                  onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="JavaScript, Leadership, Project Management"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  បោះបង់
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting
                    ? "កំពុងរក្សាទុក..."
                    : editingExperience
                    ? "រក្សាទុកការផ្លាស់ប្តូរ"
                    : "បន្ថែមបទពិសោធន៍"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
