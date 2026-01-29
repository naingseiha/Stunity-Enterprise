"use client";

import { useState, useEffect } from "react";
import {
  Plus,
  MessageSquare,
  Star,
  ThumbsUp,
  Check,
  X,
  Quote,
  UserCheck,
  Award,
  Edit2,
  Trash2,
  Send,
} from "lucide-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api";

type RecommendationRelation =
  | "COLLEAGUE"
  | "MANAGER"
  | "TEACHER"
  | "STUDENT"
  | "MENTOR"
  | "MENTEE"
  | "CLASSMATE"
  | "OTHER";

interface Recommendation {
  id: string;
  recipientId: string;
  authorId: string;
  relationship: RecommendationRelation;
  content: string;
  skills: string[];
  rating?: number;
  isPublic: boolean;
  isAccepted: boolean;
  acceptedAt?: string;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    firstName: string;
    lastName: string;
    profilePictureUrl?: string;
    headline?: string;
    student?: { khmerName: string };
    teacher?: { khmerName: string };
  };
  recipient?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

interface RecommendationsSectionProps {
  userId: string;
  isOwnProfile: boolean;
}

const RELATIONSHIP_INFO: Record<RecommendationRelation, { label: string; labelKh: string }> = {
  COLLEAGUE: { label: "Colleague", labelKh: "មិត្តរួមការងារ" },
  MANAGER: { label: "Manager", labelKh: "ថ្នាក់គ្រប់គ្រង" },
  TEACHER: { label: "Teacher", labelKh: "គ្រូបង្រៀន" },
  STUDENT: { label: "Student", labelKh: "សិស្ស" },
  MENTOR: { label: "Mentor", labelKh: "អ្នកណែនាំ" },
  MENTEE: { label: "Mentee", labelKh: "សិស្សរបស់ខ្ញុំ" },
  CLASSMATE: { label: "Classmate", labelKh: "មិត្តរួមថ្នាក់" },
  OTHER: { label: "Other", labelKh: "ផ្សេងៗ" },
};

export default function RecommendationsSection({
  userId,
  isOwnProfile,
}: RecommendationsSectionProps) {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [pendingRecommendations, setPendingRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWriteModal, setShowWriteModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    recipientId: userId,
    relationship: "COLLEAGUE" as RecommendationRelation,
    content: "",
    skills: "",
    rating: 5,
  });

  useEffect(() => {
    fetchRecommendations();
  }, [userId]);

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE_URL}/profile/${userId}/recommendations`, {
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (response.ok) {
        const data = await response.json();
        const all = data.data || [];

        // Split into accepted and pending
        setRecommendations(all.filter((r: Recommendation) => r.isAccepted && r.isPublic));
        if (isOwnProfile) {
          setPendingRecommendations(all.filter((r: Recommendation) => !r.isAccepted));
        }
      }
    } catch (error) {
      console.error("Failed to fetch recommendations:", error);
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

      const payload = {
        recipientId: userId,
        relationship: formData.relationship,
        content: formData.content,
        skills: formData.skills
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        rating: formData.rating,
      };

      const response = await fetch(`${API_BASE_URL}/profile/recommendations`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        alert("អរគុណ! សំណើរបស់អ្នកត្រូវបានផ្ញើទៅកាន់អ្នកប្រើប្រាស់។");
        handleCloseModal();
      } else {
        const error = await response.json();
        alert(error.message || "Failed to send recommendation");
      }
    } catch (error) {
      console.error("Failed to send recommendation:", error);
      alert("Failed to send recommendation. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAccept = async (recommendationId: string) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await fetch(
        `${API_BASE_URL}/profile/recommendations/${recommendationId}/accept`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        await fetchRecommendations();
      }
    } catch (error) {
      console.error("Failed to accept recommendation:", error);
    }
  };

  const handleDelete = async (recommendationId: string) => {
    if (!confirm("តើអ្នកប្រាកដថាចង់លុបអនុសាសន៍នេះ?")) return;

    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/profile/recommendations/${recommendationId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        await fetchRecommendations();
      }
    } catch (error) {
      console.error("Failed to delete recommendation:", error);
    }
  };

  const handleCloseModal = () => {
    setShowWriteModal(false);
    setFormData({
      recipientId: userId,
      relationship: "COLLEAGUE",
      content: "",
      skills: "",
      rating: 5,
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
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
          <h2 className="text-2xl font-bold text-gray-900">អនុសាសន៍ & ការផ្តល់មតិ</h2>
          <p className="text-sm text-gray-500 mt-1">
            អនុសាសន៍ពីមិត្តភក្តិនិងសហការី • {recommendations.length} អនុសាសន៍
          </p>
        </div>

        {!isOwnProfile && (
          <button
            onClick={() => setShowWriteModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-medium hover:shadow-lg transition-all"
          >
            <Send className="w-4 h-4" />
            <span>សរសេរអនុសាសន៍</span>
          </button>
        )}
      </div>

      {/* Pending Recommendations (Own Profile Only) */}
      {isOwnProfile && pendingRecommendations.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="w-5 h-5 text-yellow-600" />
            <h3 className="font-bold text-gray-900">
              សំណើរអនុសាសន៍ថ្មី ({pendingRecommendations.length})
            </h3>
          </div>
          <div className="space-y-3">
            {pendingRecommendations.map((rec) => {
              const authorName =
                rec.author.student?.khmerName ||
                rec.author.teacher?.khmerName ||
                `${rec.author.firstName} ${rec.author.lastName}`;

              return (
                <div
                  key={rec.id}
                  className="bg-white rounded-xl p-4 flex items-start justify-between"
                >
                  <div className="flex items-start gap-3 flex-1">
                    <div className="w-12 h-12 rounded-full bg-gray-200 flex-shrink-0 overflow-hidden">
                      {rec.author.profilePictureUrl ? (
                        <img
                          src={rec.author.profilePictureUrl}
                          alt={authorName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-lg font-bold text-gray-600">
                          {authorName.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-gray-900">{authorName}</p>
                      <p className="text-sm text-gray-600">
                        {RELATIONSHIP_INFO[rec.relationship].labelKh}
                      </p>
                      <p className="text-sm text-gray-700 mt-2 line-clamp-2">{rec.content}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => handleAccept(rec.id)}
                      className="p-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg transition-colors"
                      title="ទទួលយក"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(rec.id)}
                      className="p-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors"
                      title="បដិសេធ"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recommendations List */}
      {recommendations.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-2xl">
          <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">មិនទាន់មានអនុសាសន៍</h3>
          <p className="text-gray-500">
            {isOwnProfile
              ? "សូមទាក់ទងមិត្តភក្តិឬសហការីដើម្បីសរសេរអនុសាសន៍ឱ្យអ្នក"
              : "អ្នកប្រើប្រាស់នេះមិនទាន់មានអនុសាសន៍ទេ"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {recommendations.map((rec) => {
            const authorName =
              rec.author.student?.khmerName ||
              rec.author.teacher?.khmerName ||
              `${rec.author.firstName} ${rec.author.lastName}`;

            return (
              <div
                key={rec.id}
                className="bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-lg transition-all group relative"
              >
                {/* Quote Icon */}
                <div className="absolute top-6 right-6 text-indigo-100">
                  <Quote className="w-12 h-12" />
                </div>

                {/* Author Section */}
                <div className="flex items-start gap-4 mb-4 relative z-10">
                  <div className="w-16 h-16 rounded-full bg-gray-200 flex-shrink-0 overflow-hidden">
                    {rec.author.profilePictureUrl ? (
                      <img
                        src={rec.author.profilePictureUrl}
                        alt={authorName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xl font-bold text-gray-600">
                        {authorName.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900">{authorName}</h3>
                    {rec.author.headline && (
                      <p className="text-sm text-gray-600 mb-1">{rec.author.headline}</p>
                    )}
                    <div className="flex items-center gap-3 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <UserCheck className="w-4 h-4" />
                        {RELATIONSHIP_INFO[rec.relationship].labelKh}
                      </span>
                      <span>•</span>
                      <span>{formatDate(rec.createdAt)}</span>
                    </div>
                  </div>

                  {/* Rating */}
                  {rec.rating && (
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${
                            i < rec.rating!
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-gray-300"
                          }`}
                        />
                      ))}
                    </div>
                  )}

                  {/* Delete Button (Own Profile) */}
                  {isOwnProfile && (
                    <button
                      onClick={() => handleDelete(rec.id)}
                      className="p-2 hover:bg-red-50 rounded-lg transition-colors text-gray-400 hover:text-red-600"
                      title="លុប"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Content */}
                <div className="relative z-10">
                  <p className="text-gray-700 leading-relaxed mb-4">{rec.content}</p>

                  {/* Skills */}
                  {rec.skills.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {rec.skills.map((skill, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-medium flex items-center gap-1"
                        >
                          <Award className="w-3 h-3" />
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
      )}

      {/* Write Recommendation Modal */}
      {showWriteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">សរសេរអនុសាសន៍</h3>
              <button
                onClick={handleCloseModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Relationship */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ទំនាក់ទំនងរបស់អ្នក *
                </label>
                <select
                  required
                  value={formData.relationship}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      relationship: e.target.value as RecommendationRelation,
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  {Object.entries(RELATIONSHIP_INFO).map(([rel, info]) => (
                    <option key={rel} value={rel}>
                      {info.labelKh}
                    </option>
                  ))}
                </select>
              </div>

              {/* Content */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  អនុសាសន៍របស់អ្នក *
                </label>
                <textarea
                  required
                  rows={6}
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                  placeholder="សរសេរអនុសាសន៍ដ៏មានន័យ។ ពិពណ៌នាអំពីជំនាញ ចំណុចខ្លាំង និងគុណភាពរបស់មនុស្សនេះ..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  សូមសរសេរយ៉ាងហោចណាស់ 50 តួអក្សរ
                </p>
              </div>

              {/* Skills */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ជំនាញដែលអ្នកចង់រំលេច (ប្រើ comma ដើម្បីបំបែក)
                </label>
                <input
                  type="text"
                  value={formData.skills}
                  onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Leadership, Communication, Problem Solving"
                />
              </div>

              {/* Rating */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ការវាយតម្លៃ (ស្រេចចិត្ត)
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button
                      key={rating}
                      type="button"
                      onClick={() => setFormData({ ...formData, rating })}
                      className="focus:outline-none"
                    >
                      <Star
                        className={`w-8 h-8 transition-colors ${
                          rating <= formData.rating
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-gray-300 hover:text-yellow-200"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Info Note */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-sm text-blue-900">
                  <strong>ចំណាំ:</strong> អនុសាសន៍របស់អ្នកនឹងត្រូវបានផ្ញើទៅកាន់អ្នកប្រើប្រាស់ដើម្បីទទួលយក។
                  វានឹងមើលឃើញជាសាធារណៈនៅពេលដែលអ្នកប្រើប្រាស់ទទួលយក។
                </p>
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
                  disabled={submitting || formData.content.length < 50}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? "កំពុងផ្ញើ..." : "ផ្ញើអនុសាសន៍"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
