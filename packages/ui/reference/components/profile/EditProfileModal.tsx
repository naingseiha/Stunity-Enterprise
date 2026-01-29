"use client";

import { motion } from "framer-motion";
import { X, Save, Loader2, MapPin, Briefcase, Link as LinkIcon, Eye } from "lucide-react";
import { useState } from "react";
import { updateBio } from "@/lib/api/profile";

interface EditProfileModalProps {
  currentData: {
    bio?: string;
    headline?: string;
    location?: string;
    interests?: string[];
    socialLinks?: {
      facebook?: string;
      linkedin?: string;
      github?: string;
      portfolio?: string;
    };
    profileVisibility?: string;
  };
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditProfileModal({
  currentData,
  onClose,
  onSuccess,
}: EditProfileModalProps) {
  const [formData, setFormData] = useState({
    bio: currentData.bio || "",
    headline: currentData.headline || "",
    location: currentData.location || "",
    interests: currentData.interests?.join(", ") || "",
    facebook: currentData.socialLinks?.facebook || "",
    linkedin: currentData.socialLinks?.linkedin || "",
    github: currentData.socialLinks?.github || "",
    portfolio: currentData.socialLinks?.portfolio || "",
    profileVisibility: currentData.profileVisibility || "public",
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    setSaving(true);
    setError(null);

    try {
      const interestsArray = formData.interests
        .split(",")
        .map((i) => i.trim())
        .filter(Boolean);

      await updateBio({
        bio: formData.bio || undefined,
        headline: formData.headline || undefined,
        interests: interestsArray.length > 0 ? interestsArray : undefined,
        socialLinks: {
          facebook: formData.facebook || undefined,
          linkedin: formData.linkedin || undefined,
          github: formData.github || undefined,
          portfolio: formData.portfolio || undefined,
        },
        profileVisibility: formData.profileVisibility,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Edit Profile</h2>
          <button
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Headline */}
          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
              <Briefcase className="w-4 h-4 inline mr-2" />
              Headline
            </label>
            <input
              type="text"
              name="headline"
              value={formData.headline}
              onChange={handleChange}
              placeholder="e.g., Computer Science Student | Math Enthusiast"
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
              maxLength={100}
            />
            <p className="text-xs text-gray-500 mt-1">
              {formData.headline.length}/100 characters
            </p>
          </div>

          {/* Bio */}
          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
              About Me
            </label>
            <textarea
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              placeholder="Tell us about yourself..."
              rows={4}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all resize-none"
              maxLength={500}
            />
            <p className="text-xs text-gray-500 mt-1">
              {formData.bio.length}/500 characters
            </p>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
              <MapPin className="w-4 h-4 inline mr-2" />
              Location
            </label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              placeholder="e.g., Phnom Penh, Cambodia"
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
            />
          </div>

          {/* Interests */}
          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
              Interests
            </label>
            <input
              type="text"
              name="interests"
              value={formData.interests}
              onChange={handleChange}
              placeholder="e.g., Math, Programming, Music"
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
            />
            <p className="text-xs text-gray-500 mt-1">Separate with commas</p>
          </div>

          {/* Social Links */}
          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-white mb-3">
              <LinkIcon className="w-4 h-4 inline mr-2" />
              Social Links
            </label>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block">
                  Facebook
                </label>
                <input
                  type="url"
                  name="facebook"
                  value={formData.facebook}
                  onChange={handleChange}
                  placeholder="https://facebook.com/username"
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block">
                  LinkedIn
                </label>
                <input
                  type="url"
                  name="linkedin"
                  value={formData.linkedin}
                  onChange={handleChange}
                  placeholder="https://linkedin.com/in/username"
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block">
                  GitHub
                </label>
                <input
                  type="url"
                  name="github"
                  value={formData.github}
                  onChange={handleChange}
                  placeholder="https://github.com/username"
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block">
                  Portfolio
                </label>
                <input
                  type="url"
                  name="portfolio"
                  value={formData.portfolio}
                  onChange={handleChange}
                  placeholder="https://yourwebsite.com"
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all text-sm"
                />
              </div>
            </div>
          </div>

          {/* Privacy */}
          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
              <Eye className="w-4 h-4 inline mr-2" />
              Profile Visibility
            </label>
            <select
              name="profileVisibility"
              value={formData.profileVisibility}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
            >
              <option value="public">Public - Anyone can view</option>
              <option value="followers">Followers - Only followers</option>
              <option value="private">Private - Only me</option>
            </select>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
