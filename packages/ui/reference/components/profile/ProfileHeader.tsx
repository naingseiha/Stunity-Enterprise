"use client";

import { motion } from "framer-motion";
import { Camera, MapPin, Briefcase, GraduationCap, Star, CheckCircle2, Edit3, Linkedin, Github, Facebook, Link as LinkIcon } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import ProgressBar from "./shared/ProgressBar";

interface ProfileHeaderProps {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    profilePictureUrl?: string;
    coverPhotoUrl?: string;
    headline?: string;
    bio?: string;
    location?: string;
    interests?: string[];
    professionalTitle?: string;
    isVerified: boolean;
    profileCompleteness: number;
    totalPoints: number;
    level: number;
    currentStreak: number;
    socialLinks?: {
      linkedin?: string;
      github?: string;
      portfolio?: string;
      facebook?: string;
    };
    student?: {
      khmerName: string;
      class?: { name: string; grade: string };
    };
    teacher?: {
      khmerName: string;
      position?: string;
    };
  };
  stats: {
    posts: number;
    followers: number;
    following: number;
  };
  isOwnProfile?: boolean;
  onEditProfile?: () => void;
  onEditCover?: () => void;
  onEditAvatar?: () => void;
}

export default function ProfileHeader({
  user,
  stats,
  isOwnProfile = false,
  onEditProfile,
  onEditCover,
  onEditAvatar
}: ProfileHeaderProps) {
  const router = useRouter();
  const [isFollowing, setIsFollowing] = useState(false);

  const handleEditProfile = () => {
    router.push('/profile/edit');
  };

  const fullName = `${user.firstName} ${user.lastName}`;
  const khmerName = user.student?.khmerName || user.teacher?.khmerName;
  const roleInfo = user.student
    ? `${user.student.class?.grade || ''} ${user.student.class?.name || ''}`.trim()
    : user.teacher?.position || user.professionalTitle;

  const defaultGradient = "linear-gradient(135deg, #667eea 0%, #764ba2 100%)";

  return (
    <div className="relative bg-white dark:bg-gray-900">
      {/* Cover Photo */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="relative h-56 md:h-72 w-full overflow-hidden"
        style={{
          background: user.coverPhotoUrl ? undefined : defaultGradient
        }}
      >
        {user.coverPhotoUrl && (
          <Image
            src={user.coverPhotoUrl}
            alt="Cover photo"
            fill
            className="object-cover"
            priority
          />
        )}

        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-white dark:to-gray-900" />

        {/* Edit Cover Button */}
        {isOwnProfile && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onEditCover}
            className="absolute top-4 right-4 bg-black/40 backdrop-blur-md text-white p-2.5 rounded-xl font-medium shadow-lg hover:bg-black/50 transition-all"
            title="Edit Cover"
          >
            <Camera className="w-4 h-4" />
          </motion.button>
        )}
      </motion.div>

      {/* Profile Content */}
      <div className="relative -mt-24 pb-8">
        <div className="max-w-4xl mx-auto px-6">

          {/* Beautiful Level Badge - Top Right */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3, type: "spring", stiffness: 200 }}
            className="absolute top-6 right-6 z-10"
          >
            <motion.div
              whileHover={{ scale: 1.08, rotate: 2 }}
              className="relative group cursor-pointer"
            >
              {/* Outer glow */}
              <div className="absolute -inset-0.5 bg-gradient-to-r from-yellow-400 via-orange-500 to-pink-500 rounded-full opacity-75 group-hover:opacity-100 blur-sm transition duration-300" />

              {/* Main badge */}
              <div className="relative bg-gradient-to-br from-yellow-400 via-orange-500 to-pink-600 px-3.5 py-2 rounded-full shadow-lg flex items-center gap-2">
                <motion.div
                  animate={{ rotate: [0, 5, -5, 0] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                >
                  <Star className="w-4 h-4 text-white fill-white drop-shadow-lg" />
                </motion.div>
                <span className="text-sm font-bold text-white">Level {user.level}</span>
              </div>
            </motion.div>
          </motion.div>

          {/* Avatar */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="flex justify-center mb-6"
          >
            <div className="relative">
              <div className="relative w-36 h-36 md:w-40 md:h-40 rounded-full ring-[6px] ring-white dark:ring-gray-900 shadow-2xl overflow-hidden bg-gradient-to-br from-purple-400 to-pink-400">
                {user.profilePictureUrl ? (
                  <Image
                    src={user.profilePictureUrl}
                    alt={fullName}
                    fill
                    className="object-cover"
                    priority
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white text-4xl font-bold">
                    {user.firstName[0]}{user.lastName[0]}
                  </div>
                )}
              </div>

              {/* Edit Avatar Button */}
              {isOwnProfile && (
                <motion.button
                  whileHover={{ scale: 1.15 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={onEditAvatar}
                  className="absolute bottom-1 right-1 bg-gradient-to-br from-orange-500 to-orange-600 text-white p-2.5 rounded-full shadow-xl hover:from-orange-600 hover:to-orange-700 transition-all border-2 border-white dark:border-gray-900"
                >
                  <Camera className="w-4 h-4" />
                </motion.button>
              )}
            </div>
          </motion.div>

          {/* Name & Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="text-center space-y-4"
          >
            {/* Name with verification */}
            <div className="flex items-center justify-center gap-2.5">
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
                {fullName}
              </h1>
              {user.isVerified && (
                <div className="relative">
                  <div className="absolute inset-0 bg-blue-400 rounded-full blur-sm opacity-50"></div>
                  <CheckCircle2 className="relative w-7 h-7 text-blue-500 fill-blue-500" />
                </div>
              )}
            </div>

            {/* Khmer Name */}
            {khmerName && (
              <p className="text-xl text-gray-500 dark:text-gray-400 font-khmer">
                {khmerName}
              </p>
            )}

            {/* Headline/Title */}
            {user.headline && (
              <p className="text-lg text-gray-700 dark:text-gray-300 font-semibold">
                {user.headline}
              </p>
            )}

            {/* Role & Location */}
            <div className="flex items-center justify-center gap-5 text-base text-gray-600 dark:text-gray-400 flex-wrap pt-2">
              {roleInfo && (
                <div className="flex items-center gap-2 bg-purple-50 dark:bg-purple-900/20 px-4 py-2 rounded-full">
                  {user.student ? (
                    <GraduationCap className="w-5 h-5 text-purple-600" />
                  ) : (
                    <Briefcase className="w-5 h-5 text-purple-600" />
                  )}
                  <span className="font-medium">{roleInfo}</span>
                </div>
              )}

              {user.location && (
                <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 px-4 py-2 rounded-full">
                  <MapPin className="w-5 h-5 text-green-600" />
                  <span className="font-medium">{user.location}</span>
                </div>
              )}
            </div>

            {/* Bio */}
            {user.bio && (
              <p className="text-base text-gray-600 dark:text-gray-400 max-w-xl mx-auto pt-3 leading-relaxed">
                {user.bio}
              </p>
            )}

            {/* Stats Row - Clean without cards */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex items-center justify-center gap-8 pt-6 pb-4"
            >
              <button className="text-center group transition-transform hover:scale-105">
                <div className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-1 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                  {stats.posts}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                  Posts
                </div>
              </button>

              <div className="w-px h-12 bg-gray-200 dark:bg-gray-700" />

              <button className="text-center group transition-transform hover:scale-105">
                <div className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-1 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                  {stats.followers}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                  Followers
                </div>
              </button>

              <div className="w-px h-12 bg-gray-200 dark:bg-gray-700" />

              <button className="text-center group transition-transform hover:scale-105">
                <div className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-1 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                  {stats.following}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                  Following
                </div>
              </button>
            </motion.div>

            {/* Action Buttons */}
            <div className="pt-4">
              {isOwnProfile ? (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleEditProfile}
                  className="w-full max-w-md mx-auto bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-3.5 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all text-base flex items-center justify-center gap-2.5"
                >
                  <Edit3 className="w-5 h-5" />
                  Edit Profile
                </motion.button>
              ) : (
                <div className="flex items-center justify-center gap-4">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setIsFollowing(!isFollowing)}
                    className={`flex-1 max-w-[180px] px-8 py-3.5 rounded-xl font-bold shadow-lg transition-all text-base ${
                      isFollowing
                        ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                        : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:shadow-xl'
                    }`}
                  >
                    {isFollowing ? 'Following' : 'Follow'}
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex-1 max-w-[180px] bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-8 py-3.5 rounded-xl font-bold shadow-lg transition-all text-base hover:bg-gray-300 dark:hover:bg-gray-600"
                  >
                    Message
                  </motion.button>
                </div>
              )}
            </div>

            {/* Social Links */}
            {user.socialLinks && Object.keys(user.socialLinks).some(key => user.socialLinks![key as keyof typeof user.socialLinks]) && (
              <div className="flex items-center justify-center gap-3 pt-5">
                {user.socialLinks.linkedin && (
                  <motion.a
                    href={user.socialLinks.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    whileHover={{ scale: 1.15, y: -3 }}
                    whileTap={{ scale: 0.95 }}
                    className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-md hover:shadow-lg"
                    title="LinkedIn"
                  >
                    <Linkedin className="w-5 h-5" />
                  </motion.a>
                )}
                {user.socialLinks.github && (
                  <motion.a
                    href={user.socialLinks.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    whileHover={{ scale: 1.15, y: -3 }}
                    whileTap={{ scale: 0.95 }}
                    className="p-3 bg-gray-900 dark:bg-gray-700 text-white rounded-xl hover:bg-gray-800 transition-all shadow-md hover:shadow-lg"
                    title="GitHub"
                  >
                    <Github className="w-5 h-5" />
                  </motion.a>
                )}
                {user.socialLinks.portfolio && (
                  <motion.a
                    href={user.socialLinks.portfolio}
                    target="_blank"
                    rel="noopener noreferrer"
                    whileHover={{ scale: 1.15, y: -3 }}
                    whileTap={{ scale: 0.95 }}
                    className="p-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all shadow-md hover:shadow-lg"
                    title="Portfolio"
                  >
                    <LinkIcon className="w-5 h-5" />
                  </motion.a>
                )}
                {user.socialLinks.facebook && (
                  <motion.a
                    href={user.socialLinks.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    whileHover={{ scale: 1.15, y: -3 }}
                    whileTap={{ scale: 0.95 }}
                    className="p-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-all shadow-md hover:shadow-lg"
                    title="Facebook"
                  >
                    <Facebook className="w-5 h-5" />
                  </motion.a>
                )}
              </div>
            )}

            {/* Profile Completion */}
            {isOwnProfile && user.profileCompleteness < 100 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="mt-8 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-6 rounded-2xl border border-purple-200 dark:border-purple-800 max-w-lg mx-auto"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
                    Profile Completion
                  </span>
                  <span className="text-lg font-bold text-purple-600 dark:text-purple-400">
                    {user.profileCompleteness}%
                  </span>
                </div>
                <ProgressBar
                  value={user.profileCompleteness}
                  color="purple"
                  height="h-2.5"
                  showPercentage={false}
                  delay={0.7}
                />
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-3 text-center">
                  ✨ Complete your profile to increase visibility!
                </p>
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
