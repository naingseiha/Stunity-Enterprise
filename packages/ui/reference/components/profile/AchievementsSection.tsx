"use client";

import { useState, useEffect } from "react";
import {
  Plus,
  Trophy,
  Award,
  Star,
  Zap,
  Crown,
  Target,
  Users,
  Lightbulb,
  TrendingUp,
  CheckCircle2,
  Edit2,
  Trash2,
  X,
  Sparkles,
  Medal,
} from "lucide-react";

type AchievementType =
  | "COURSE_COMPLETION"
  | "SKILL_MASTERY"
  | "TEACHING_EXCELLENCE"
  | "COMMUNITY_CONTRIBUTION"
  | "LEADERSHIP"
  | "INNOVATION"
  | "COLLABORATION"
  | "CONSISTENCY_STREAK"
  | "TOP_PERFORMER"
  | "MILESTONE";

type AchievementRarity = "COMMON" | "UNCOMMON" | "RARE" | "EPIC" | "LEGENDARY";

interface Achievement {
  id: string;
  userId: string;
  type: AchievementType;
  title: string;
  description: string;
  issuedBy?: string;
  issuedDate: string;
  points: number;
  rarity: AchievementRarity;
  isPublic: boolean;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
}

interface AchievementsSectionProps {
  userId: string;
  isOwnProfile: boolean;
}

const ACHIEVEMENT_TYPE_INFO: Record<
  AchievementType,
  { icon: React.ElementType; label: string; labelKh: string; color: string }
> = {
  COURSE_COMPLETION: {
    icon: Award,
    label: "Course Completion",
    labelKh: "បញ្ចប់វគ្គសិក្សា",
    color: "#3B82F6",
  },
  SKILL_MASTERY: {
    icon: Target,
    label: "Skill Mastery",
    labelKh: "ជំនាញពេញលេញ",
    color: "#8B5CF6",
  },
  TEACHING_EXCELLENCE: {
    icon: Trophy,
    label: "Teaching Excellence",
    labelKh: "លេចធ្លោក្នុងការបង្រៀន",
    color: "#F59E0B",
  },
  COMMUNITY_CONTRIBUTION: {
    icon: Users,
    label: "Community Contribution",
    labelKh: "ចូលរួមសហគមន៍",
    color: "#10B981",
  },
  LEADERSHIP: {
    icon: Crown,
    label: "Leadership",
    labelKh: "ភាពជាអ្នកដឹកនាំ",
    color: "#EF4444",
  },
  INNOVATION: {
    icon: Lightbulb,
    label: "Innovation",
    labelKh: "ការច្នៃប្រឌិត",
    color: "#EC4899",
  },
  COLLABORATION: {
    icon: Users,
    label: "Collaboration",
    labelKh: "កិច្ចសហការ",
    color: "#06B6D4",
  },
  CONSISTENCY_STREAK: {
    icon: Zap,
    label: "Consistency Streak",
    labelKh: "ភាពជាប់លាប់",
    color: "#F97316",
  },
  TOP_PERFORMER: {
    icon: Star,
    label: "Top Performer",
    labelKh: "អ្នកសម្តែងល្អបំផុត",
    color: "#FFD700",
  },
  MILESTONE: {
    icon: CheckCircle2,
    label: "Milestone",
    labelKh: "ចំណុចសំខាន់",
    color: "#6366F1",
  },
};

const RARITY_INFO: Record<
  AchievementRarity,
  { label: string; labelKh: string; color: string; glow: string }
> = {
  COMMON: {
    label: "Common",
    labelKh: "ធម្មតា",
    color: "#9CA3AF",
    glow: "shadow-gray-200",
  },
  UNCOMMON: {
    label: "Uncommon",
    labelKh: "មិនសូវមាន",
    color: "#10B981",
    glow: "shadow-green-200",
  },
  RARE: {
    label: "Rare",
    labelKh: "កម្រ",
    color: "#3B82F6",
    glow: "shadow-blue-300",
  },
  EPIC: {
    label: "Epic",
    labelKh: "អស្ចារ្យ",
    color: "#8B5CF6",
    glow: "shadow-purple-300",
  },
  LEGENDARY: {
    label: "Legendary",
    labelKh: "រឿងព្រេង",
    color: "#F59E0B",
    glow: "shadow-yellow-300",
  },
};

export default function AchievementsSection({
  userId,
  isOwnProfile,
}: AchievementsSectionProps) {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAchievement, setEditingAchievement] = useState<Achievement | null>(null);
  const [stats, setStats] = useState<any>(null);

  // Form state
  const [formData, setFormData] = useState({
    type: "MILESTONE" as AchievementType,
    title: "",
    description: "",
    issuedBy: "",
    points: "10",
    rarity: "COMMON" as AchievementRarity,
    isPublic: true,
  });

  useEffect(() => {
    fetchAchievements();
    fetchStats();
  }, [userId]);

  const fetchAchievements = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `http://localhost:5001/api/profile/${userId}/achievements`,
        {
          headers: {
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setAchievements(data.achievements || []);
      }
    } catch (error) {
      console.error("Failed to fetch achievements:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `http://localhost:5001/api/profile/${userId}/achievements/stats`,
        {
          headers: {
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const url = editingAchievement
        ? `http://localhost:5001/api/profile/achievements/${editingAchievement.id}`
        : "http://localhost:5001/api/profile/achievements";

      const method = editingAchievement ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          points: parseInt(formData.points),
        }),
      });

      if (response.ok) {
        await fetchAchievements();
        await fetchStats();
        handleCloseModal();
      }
    } catch (error) {
      console.error("Failed to save achievement:", error);
    }
  };

  const handleDelete = async (achievementId: string) => {
    if (!confirm("តើអ្នកប្រាកដថាចង់លុបសមិទ្ធិផលនេះ?")) return;

    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const response = await fetch(
        `http://localhost:5001/api/profile/achievements/${achievementId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        setAchievements(achievements.filter((a) => a.id !== achievementId));
        await fetchStats();
      }
    } catch (error) {
      console.error("Failed to delete achievement:", error);
    }
  };

  const handleEdit = (achievement: Achievement) => {
    setEditingAchievement(achievement);
    setFormData({
      type: achievement.type,
      title: achievement.title,
      description: achievement.description,
      issuedBy: achievement.issuedBy || "",
      points: achievement.points.toString(),
      rarity: achievement.rarity,
      isPublic: achievement.isPublic,
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingAchievement(null);
    setFormData({
      type: "MILESTONE",
      title: "",
      description: "",
      issuedBy: "",
      points: "10",
      rarity: "COMMON",
      isPublic: true,
    });
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
      {/* Header & Stats */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">សមិទ្ធិផល & រង្វាន់</h2>
          <p className="text-sm text-gray-500 mt-1">
            បង្ហាញសមិទ្ធិផលរបស់អ្នក • {achievements.length} សមិទ្ធិផល •{" "}
            {stats?.totalPoints || 0} ពិន្ទុ
          </p>
        </div>

        {isOwnProfile && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-xl font-medium hover:shadow-lg transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>បន្ថែមសមិទ្ធិផល</span>
          </button>
        )}
      </div>

      {/* Stats Summary */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {Object.entries(stats.byRarity).map(([rarity, count]) => {
            const rarityInfo = RARITY_INFO[rarity as AchievementRarity];
            return (
              <div
                key={rarity}
                className="bg-white border-2 rounded-xl p-3 text-center"
                style={{ borderColor: rarityInfo.color + "40" }}
              >
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Medal className="w-4 h-4" style={{ color: rarityInfo.color }} />
                  <span className="text-2xl font-bold" style={{ color: rarityInfo.color }}>
                    {count as number}
                  </span>
                </div>
                <p className="text-xs text-gray-600">{rarityInfo.labelKh}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Achievements Grid */}
      {achievements.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-2xl">
          <Trophy className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            មិនទាន់មានសមិទ្ធិផល
          </h3>
          <p className="text-gray-500">
            {isOwnProfile
              ? "ចាប់ផ្តើមបន្ថែមសមិទ្ធិផលដំបូងរបស់អ្នក"
              : "អ្នកប្រើប្រាស់នេះមិនទាន់មានសមិទ្ធិផលទេ"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {achievements.map((achievement) => {
            const typeInfo = ACHIEVEMENT_TYPE_INFO[achievement.type];
            const rarityInfo = RARITY_INFO[achievement.rarity];
            const TypeIcon = typeInfo.icon;

            return (
              <div
                key={achievement.id}
                className={`bg-white border-2 rounded-2xl p-5 hover:shadow-lg transition-all group relative overflow-hidden ${rarityInfo.glow}`}
                style={{ borderColor: rarityInfo.color + "40" }}
              >
                {/* Rarity Glow Background */}
                <div
                  className="absolute inset-0 opacity-5"
                  style={{
                    background: `radial-gradient(circle at top right, ${rarityInfo.color}, transparent)`,
                  }}
                ></div>

                {/* Content */}
                <div className="relative z-10">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center"
                      style={{ backgroundColor: typeInfo.color + "15" }}
                    >
                      <TypeIcon className="w-7 h-7" style={{ color: typeInfo.color }} />
                    </div>

                    {isOwnProfile && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleEdit(achievement)}
                          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4 text-gray-400" />
                        </button>
                        <button
                          onClick={() => handleDelete(achievement.id)}
                          className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Title & Rarity */}
                  <div className="mb-2">
                    <h3 className="font-bold text-gray-900 text-lg mb-1">
                      {achievement.title}
                    </h3>
                    <div className="flex items-center gap-2">
                      <span
                        className="text-xs font-bold px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: rarityInfo.color + "20",
                          color: rarityInfo.color,
                        }}
                      >
                        {rarityInfo.labelKh}
                      </span>
                      <span className="text-xs text-gray-500">{typeInfo.labelKh}</span>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {achievement.description}
                  </p>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <div className="flex items-center gap-2">
                      {achievement.issuedBy && (
                        <span className="text-xs text-gray-500">
                          ដោយ {achievement.issuedBy}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Sparkles className="w-4 h-4 text-yellow-500" />
                      <span className="text-sm font-bold text-gray-900">
                        {achievement.points}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">
                {editingAchievement ? "កែប្រែសមិទ្ធិផល" : "បន្ថែមសមិទ្ធិផលថ្មី"}
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
                  ប្រភេទសមិទ្ធិផល *
                </label>
                <select
                  required
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({ ...formData, type: e.target.value as AchievementType })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  {Object.entries(ACHIEVEMENT_TYPE_INFO).map(([type, info]) => (
                    <option key={type} value={type}>
                      {info.labelKh}
                    </option>
                  ))}
                </select>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ចំណងជើង *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="ឧទាហរណ៍: បញ្ចប់វគ្គ React"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ការពិពណ៌នា *
                </label>
                <textarea
                  required
                  rows={3}
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                  placeholder="ពិពណ៌នាអំពីសមិទ្ធិផលនេះ..."
                />
              </div>

              {/* Issued By */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ផ្តល់ដោយ
                </label>
                <input
                  type="text"
                  value={formData.issuedBy}
                  onChange={(e) => setFormData({ ...formData, issuedBy: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="ឧទាហរណ៍: សាលារៀន, អង្គការ"
                />
              </div>

              {/* Rarity & Points */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    កម្រិត *
                  </label>
                  <select
                    required
                    value={formData.rarity}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        rarity: e.target.value as AchievementRarity,
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    {Object.entries(RARITY_INFO).map(([rarity, info]) => (
                      <option key={rarity} value={rarity}>
                        {info.labelKh}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ពិន្ទុ *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.points}
                    onChange={(e) => setFormData({ ...formData, points: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Public Toggle */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="isPublic"
                  checked={formData.isPublic}
                  onChange={(e) =>
                    setFormData({ ...formData, isPublic: e.target.checked })
                  }
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500"
                />
                <label htmlFor="isPublic" className="text-sm text-gray-700">
                  បង្ហាញជាសាធារណៈ
                </label>
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
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-xl font-medium hover:shadow-lg transition-all"
                >
                  {editingAchievement ? "រក្សាទុក" : "បន្ថែម"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
