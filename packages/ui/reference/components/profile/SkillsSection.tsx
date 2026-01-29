"use client";

import { useState, useEffect } from "react";
import {
  Code,
  TrendingUp,
  Plus,
  X,
  Star,
  Check,
  ChevronDown,
  Award,
  MessageSquare,
  Trash2,
  Edit2,
  ThumbsUp,
} from "lucide-react";
import {
  getUserSkills,
  addSkill,
  updateSkill,
  deleteSkill as deleteSkillAPI,
  endorseSkill,
  UserSkill,
} from "@/lib/api/profile";

const SKILL_CATEGORIES = {
  PROGRAMMING: { label: "Programming", labelKh: "កម្មវិធី", color: "bg-blue-100 text-blue-700" },
  LANGUAGES: { label: "Languages", labelKh: "ភាសា", color: "bg-green-100 text-green-700" },
  MATHEMATICS: { label: "Mathematics", labelKh: "គណិតវិទ្យា", color: "bg-purple-100 text-purple-700" },
  SCIENCE: { label: "Science", labelKh: "វិទ្យាសាស្ត្រ", color: "bg-pink-100 text-pink-700" },
  HUMANITIES: { label: "Humanities", labelKh: "មនុស្សសាស្ត្រ", color: "bg-yellow-100 text-yellow-700" },
  ARTS: { label: "Arts", labelKh: "សិល្បៈ", color: "bg-red-100 text-red-700" },
  SPORTS: { label: "Sports", labelKh: "កីឡា", color: "bg-orange-100 text-orange-700" },
  TEACHING: { label: "Teaching", labelKh: "បង្រៀន", color: "bg-indigo-100 text-indigo-700" },
  LEADERSHIP: { label: "Leadership", labelKh: "ភាពជាអ្នកដឹកនាំ", color: "bg-teal-100 text-teal-700" },
  COMMUNICATION: { label: "Communication", labelKh: "ទំនាក់ទំនង", color: "bg-cyan-100 text-cyan-700" },
  TECHNICAL: { label: "Technical", labelKh: "បច្ចេកទេស", color: "bg-violet-100 text-violet-700" },
  BUSINESS: { label: "Business", labelKh: "អាជីវកម្ម", color: "bg-emerald-100 text-emerald-700" },
  OTHER: { label: "Other", labelKh: "ផ្សេងៗ", color: "bg-gray-100 text-gray-700" },
};

const SKILL_LEVELS = {
  BEGINNER: { label: "Beginner", labelKh: "ចាប់ផ្តើម", width: "25%", color: "bg-yellow-400" },
  INTERMEDIATE: { label: "Intermediate", labelKh: "មធ្យម", width: "50%", color: "bg-blue-400" },
  ADVANCED: { label: "Advanced", labelKh: "ខ្ពស់", width: "75%", color: "bg-purple-400" },
  EXPERT: { label: "Expert", labelKh: "ជំនាញ", width: "100%", color: "bg-green-400" },
};

interface SkillsSectionProps {
  userId: string;
  isOwnProfile: boolean;
}

export default function SkillsSection({ userId, isOwnProfile }: SkillsSectionProps) {
  const [skills, setSkills] = useState<UserSkill[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSkill, setEditingSkill] = useState<UserSkill | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [submitting, setSubmitting] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    skillName: "",
    category: "PROGRAMMING",
    level: "BEGINNER",
    yearsOfExp: 0,
    description: "",
  });

  useEffect(() => {
    fetchSkills();
  }, [userId]);

  const fetchSkills = async () => {
    try {
      setLoading(true);
      const data = await getUserSkills(userId);
      setSkills(data);
    } catch (error) {
      console.error("Error fetching skills:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    try {
      setSubmitting(true);
      
      if (editingSkill) {
        await updateSkill(editingSkill.id, {
          level: formData.level,
          yearsOfExp: formData.yearsOfExp || undefined,
          description: formData.description || undefined,
        });
      } else {
        await addSkill({
          skillName: formData.skillName,
          category: formData.category,
          level: formData.level,
          yearsOfExp: formData.yearsOfExp || undefined,
          description: formData.description || undefined,
        });
      }
      
      await fetchSkills();
      handleCloseModal();
    } catch (error) {
      console.error("Error saving skill:", error);
      alert("Failed to save skill. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (skillId: string) => {
    if (!confirm("តើអ្នកប្រាកដថាចង់លុបជំនាញនេះ?")) return;

    try {
      await deleteSkillAPI(skillId);
      setSkills(skills.filter(s => s.id !== skillId));
    } catch (error) {
      console.error("Error deleting skill:", error);
      alert("Failed to delete skill.");
    }
  };

  const handleEndorse = async (skillId: string) => {
    try {
      await endorseSkill(skillId);
      await fetchSkills(); // Refresh to show new endorsement
    } catch (error) {
      console.error("Error endorsing skill:", error);
      alert("Failed to endorse skill.");
    }
  };

  const handleEdit = (skill: UserSkill) => {
    setEditingSkill(skill);
    setFormData({
      skillName: skill.skillName,
      category: skill.category,
      level: skill.level,
      yearsOfExp: skill.yearsOfExp || 0,
      description: skill.description || "",
    });
    setShowAddModal(true);
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setEditingSkill(null);
    setFormData({
      skillName: "",
      category: "PROGRAMMING",
      level: "BEGINNER",
      yearsOfExp: 0,
      description: "",
    });
  };

  const filteredSkills =
    selectedCategory === "ALL"
      ? skills
      : skills.filter((s) => s.category === selectedCategory);

  const groupedSkills = filteredSkills.reduce((acc, skill) => {
    if (!acc[skill.category]) acc[skill.category] = [];
    acc[skill.category].push(skill);
    return acc;
  }, {} as Record<string, UserSkill[]>);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (skills.length === 0) {
    return (
      <div className="text-center py-12">
        <Code className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Skills Yet</h3>
        <p className="text-gray-500 mb-4">
          {isOwnProfile
            ? "Start building your skill profile by adding your first skill!"
            : "This user hasn't added any skills yet."}
        </p>
        {isOwnProfile && (
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
          >
            Add Your First Skill
          </button>
        )}
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Skills & Expertise</h2>
          <p className="text-sm text-gray-500 mt-1">
            {skills.length} skills • {skills.filter((s) => s.isVerified).length} verified
          </p>
        </div>
        {isOwnProfile && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Skill
          </button>
        )}
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        <button
          onClick={() => setSelectedCategory("ALL")}
          className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
            selectedCategory === "ALL"
              ? "bg-indigo-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          All ({skills.length})
        </button>
        {Object.entries(SKILL_CATEGORIES).map(([key, { label, color }]) => {
          const count = skills.filter((s) => s.category === key).length;
          if (count === 0) return null;
          return (
            <button
              key={key}
              onClick={() => setSelectedCategory(key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                selectedCategory === key
                  ? color
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {label} ({count})
            </button>
          );
        })}
      </div>

      {/* Skills Grid */}
      <div className="space-y-6">
        {Object.entries(groupedSkills).map(([category, categorySkills]) => (
          <div key={category}>
            <h3 className="text-lg font-bold text-gray-900 mb-3">
              {SKILL_CATEGORIES[category as keyof typeof SKILL_CATEGORIES]?.label || category}
            </h3>
            <div className="grid gap-4">
              {categorySkills.map((skill) => (
                <SkillCard
                  key={skill.id}
                  skill={skill}
                  isOwnProfile={isOwnProfile}
                  onEndorse={() => handleEndorse(skill.id)}
                  onEdit={() => handleEdit(skill)}
                  onDelete={() => handleDelete(skill.id)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Add Skill Modal - Placeholder */}
      {showAddModal && (
        <AddSkillModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            fetchSkills();
          }}
        />
      )}
    </div>
  );
}

// Skill Card Component
function SkillCard({
  skill,
  isOwnProfile,
  onEndorse,
  onEdit,
  onDelete,
}: {
  skill: UserSkill;
  isOwnProfile: boolean;
  onEndorse: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [showEndorsements, setShowEndorsements] = useState(false);
  const level = SKILL_LEVELS[skill.level];

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-lg font-bold text-gray-900">{skill.skillName}</h4>
            {skill.isVerified && (
              <div className="flex items-center gap-1 px-2 py-0.5 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
                <Check className="w-3 h-3" />
                Verified
              </div>
            )}
          </div>
          {skill.description && (
            <p className="text-sm text-gray-600 mb-2">{skill.description}</p>
          )}
          {skill.yearsOfExp && (
            <p className="text-xs text-gray-500">{skill.yearsOfExp} years of experience</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!isOwnProfile && (
            <button
              onClick={onEndorse}
              className="flex items-center gap-1 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg text-sm font-medium transition-colors"
            >
              <Star className="w-4 h-4" />
              Endorse
            </button>
          )}
          {isOwnProfile && (
            <>
              <button
                onClick={onEdit}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-indigo-600"
                title="Edit skill"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={onDelete}
                className="p-2 hover:bg-red-50 rounded-lg transition-colors text-gray-400 hover:text-red-600"
                title="Delete skill"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Skill Level Progress */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-gray-600">{level.label}</span>
          <span className="text-xs text-gray-500">{level.width}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <div
            className={`h-full ${level.color} transition-all duration-500`}
            style={{ width: level.width }}
          />
        </div>
      </div>

      {/* Endorsements */}
      {skill.endorsementCount > 0 && (
        <div>
          <button
            onClick={() => setShowEndorsements(!showEndorsements)}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-2"
          >
            <Award className="w-4 h-4" />
            {skill.endorsementCount} endorsement{skill.endorsementCount !== 1 ? "s" : ""}
            <ChevronDown
              className={`w-4 h-4 transition-transform ${showEndorsements ? "rotate-180" : ""}`}
            />
          </button>

          {showEndorsements && skill.recentEndorsements && skill.recentEndorsements.length > 0 && (
            <div className="space-y-2 mt-2 pl-6 border-l-2 border-gray-200">
              {skill.recentEndorsements.map((endorsement) => {
                const name =
                  endorsement.endorser.student?.khmerName ||
                  endorsement.endorser.teacher?.khmerName ||
                  `${endorsement.endorser.firstName} ${endorsement.endorser.lastName}`;
                return (
                  <div key={endorsement.id} className="flex items-start gap-2">
                    <div className="w-6 h-6 rounded-full bg-gray-200 flex-shrink-0 overflow-hidden">
                      {endorsement.endorser.profilePictureUrl ? (
                        <img
                          src={endorsement.endorser.profilePictureUrl}
                          alt={name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs font-bold text-gray-600">
                          {name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-medium text-gray-900">{name}</p>
                      {endorsement.comment && (
                        <p className="text-xs text-gray-600 mt-0.5">{endorsement.comment}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Add Skill Modal - Simple Implementation
function AddSkillModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [skillName, setSkillName] = useState("");
  const [category, setCategory] = useState("PROGRAMMING");
  const [level, setLevel] = useState("BEGINNER");
  const [yearsOfExp, setYearsOfExp] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      await addSkill({
        skillName,
        category,
        level,
        yearsOfExp: yearsOfExp ? parseFloat(yearsOfExp) : undefined,
        description: description || undefined,
      });
      onSuccess();
    } catch (error) {
      console.error("Error adding skill:", error);
      alert("Failed to add skill. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-900">Add New Skill</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Skill Name</label>
            <input
              type="text"
              value={skillName}
              onChange={(e) => setSkillName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="e.g., JavaScript, Mathematics, Teaching"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              {Object.entries(SKILL_CATEGORIES).map(([key, { label }]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Level</label>
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              {Object.entries(SKILL_LEVELS).map(([key, { label }]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Years of Experience</label>
            <input
              type="number"
              step="0.5"
              min="0"
              value={yearsOfExp}
              onChange={(e) => setYearsOfExp(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Optional"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              placeholder="Optional: Describe your proficiency..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {saving ? "Adding..." : "Add Skill"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
