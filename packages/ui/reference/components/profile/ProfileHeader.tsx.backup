"use client";

import { motion } from "framer-motion";
import { Camera, MapPin, Briefcase, GraduationCap, Star, CheckCircle2, Edit3, Globe, Sparkles, Linkedin, Github, Facebook, Link as LinkIcon, Mail, Phone } from "lucide-react";
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
  const role = user.student ? "Student" : user.teacher ? "Educator" : "User";
  const roleInfo = user.student 
    ? `${user.student.class?.grade || ''} ${user.student.class?.name || ''}`.trim()
    : user.teacher?.position || user.professionalTitle;

  const defaultGradient = "linear-gradient(135deg, #667eea 0%, #764ba2 100%)";

  return (
    <div className="relative bg-white">
      {/* Cover Photo */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="relative h-48 md:h-56 w-full overflow-hidden"
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
        
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-white" />
        
        {/* Edit Buttons - Top Right */}
        {isOwnProfile && (
          <div className="absolute top-4 right-4 flex gap-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onEditCover}
              className="bg-black/40 backdrop-blur-md text-white p-2.5 rounded-lg font-medium shadow-lg hover:bg-black/50 transition-all"
              title="Edit Cover"
            >
              <Camera className="w-4 h-4" />
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleEditProfile}
              className="bg-white/95 backdrop-blur-md text-gray-900 px-4 py-2.5 rounded-lg font-semibold shadow-lg hover:bg-white transition-all flex items-center gap-2 text-sm"
            >
              <Edit3 className="w-4 h-4" />
              <span className="hidden sm:inline">Edit profile</span>
            </motion.button>
          </div>
        )}
      </motion.div>

      {/* Profile Info Section - Centered */}
      <div className="relative -mt-20 pb-6">
        <div className="max-w-4xl mx-auto px-4">
          {/* Avatar - Centered */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="flex justify-center mb-6"
          >
            <div className="relative">
              <div className="relative w-36 h-36 md:w-40 md:h-40 rounded-full ring-4 ring-white shadow-2xl overflow-hidden bg-gradient-to-br from-purple-400 to-pink-400">
                {user.profilePictureUrl ? (
                  <Image
                    src={user.profilePictureUrl}
                    alt={fullName}
                    fill
                    className="object-cover"
                    priority
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white text-5xl font-bold">
                    {user.firstName[0]}{user.lastName[0]}
                  </div>
                )}
              </div>
              
              {/* Level Badge */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.4 }}
                className="absolute -bottom-2 -right-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-4 py-1.5 rounded-full font-bold text-sm shadow-lg flex items-center gap-1.5"
              >
                <Star className="w-4 h-4 fill-white" />
                Level {user.level}
              </motion.div>

              {/* Edit Avatar Button */}
              {isOwnProfile && (
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={onEditAvatar}
                  className="absolute bottom-2 right-2 bg-white text-gray-700 p-2.5 rounded-full shadow-xl hover:bg-gray-50 transition-all border border-gray-200"
                >
                  <Camera className="w-4 h-4" />
                </motion.button>
              )}
            </div>
          </motion.div>

          {/* Name & Info - Centered */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="text-center space-y-3"
          >
            {/* Name with verification */}
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
                {fullName}
              </h1>
              {user.isVerified && (
                <CheckCircle2 className="w-7 h-7 text-blue-500 fill-blue-500" />
              )}
            </div>
            
            {/* Khmer Name */}
            {khmerName && (
              <p className="text-xl text-gray-600 dark:text-gray-400 font-khmer">
                {khmerName}
              </p>
            )}
            
            {/* Headline */}
            {user.headline && (
              <p className="text-lg text-gray-700 dark:text-gray-300 font-medium max-w-2xl mx-auto">
                {user.headline}
              </p>
            )}

            {/* Bio */}
            {user.bio && (
              <p className="text-base text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed">
                {user.bio}
              </p>
            )}
            
            {/* Role & Location */}
            <div className="flex items-center justify-center gap-4 flex-wrap text-gray-600 dark:text-gray-400">
              {roleInfo && (
                <div className="flex items-center gap-2 bg-purple-50 dark:bg-purple-900/20 px-4 py-2 rounded-full">
                  {user.student ? (
                    <GraduationCap className="w-5 h-5 text-purple-600" />
                  ) : (
                    <Briefcase className="w-5 h-5 text-purple-600" />
                  )}
                  <span className="text-sm font-medium text-purple-900 dark:text-purple-300">{roleInfo}</span>
                </div>
              )}
              
              {user.location && (
                <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 px-4 py-2 rounded-full">
                  <MapPin className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-medium text-green-900 dark:text-green-300">{user.location}</span>
                </div>
              )}
            </div>

            {/* Interests Tags */}
            {user.interests && user.interests.length > 0 && (
              <div className="flex items-center justify-center gap-2 flex-wrap max-w-2xl mx-auto pt-2">
                {user.interests.slice(0, 5).map((interest, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1.5 bg-gradient-to-r from-pink-50 to-purple-50 dark:from-pink-900/20 dark:to-purple-900/20 text-purple-700 dark:text-purple-300 text-sm font-medium rounded-full border border-purple-200 dark:border-purple-800"
                  >
                    {interest}
                  </span>
                ))}
                {user.interests.length > 5 && (
                  <span className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-sm font-medium rounded-full">
                    +{user.interests.length - 5} more
                  </span>
                )}
              </div>
            )}

            {/* Social Links - Compact Icons */}
            {user.socialLinks && Object.keys(user.socialLinks).some(key => user.socialLinks![key as keyof typeof user.socialLinks]) && (
              <div className="flex items-center justify-center gap-3 pt-3">
                {user.socialLinks.linkedin && (
                  <motion.a
                    href={user.socialLinks.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    whileHover={{ scale: 1.1, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    className="p-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-md"
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
                    whileHover={{ scale: 1.1, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    className="p-2.5 bg-gray-900 dark:bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-all shadow-md"
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
                    whileHover={{ scale: 1.1, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    className="p-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all shadow-md"
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
                    whileHover={{ scale: 1.1, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    className="p-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all shadow-md"
                    title="Facebook"
                  >
                    <Facebook className="w-5 h-5" />
                  </motion.a>
                )}
              </div>
            )}



            {/* Action Buttons - Only for non-own profiles */}
            {!isOwnProfile && (
              <div className="flex items-center justify-center gap-3 pt-4">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsFollowing(!isFollowing)}
                  className={`px-8 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all text-base ${
                    isFollowing
                      ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                      : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                  }`}
                >
                  {isFollowing ? 'Following' : 'Follow'}
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-8 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all text-base"
                >
                  Message
                </motion.button>
              </div>
            )}

            {/* Profile Completion */}
            {isOwnProfile && user.profileCompleteness < 100 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="mt-6 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-5 rounded-2xl border border-purple-200 dark:border-purple-800 max-w-lg mx-auto"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Profile Completion
                  </span>
                  <span className="text-sm font-bold text-purple-600 dark:text-purple-400">
                    {user.profileCompleteness}%
                  </span>
                </div>
                <ProgressBar 
                  value={user.profileCompleteness} 
                  color="purple"
                  height="h-3"
                  showPercentage={false}
                  delay={0.6}
                />
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-3 text-center">
                  ✨ Complete your profile to increase visibility and opportunities!
                </p>
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
