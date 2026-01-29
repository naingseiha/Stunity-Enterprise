"use client";

import { useState, useEffect } from "react";
import { TrendingUp, BookOpen, Award, Sparkles } from "lucide-react";
import SkillsSection from "./SkillsSection";
import ProjectsSection from "./ProjectsSection";
import AchievementsSection from "./AchievementsSection";
import ProfileHeader from "./ProfileHeader";
import RoleBasedStats from "./RoleBasedStats";
import LearningPerformance from "./student/LearningPerformance";
import TeachingExcellence from "./teacher/TeachingExcellence";

interface ProfileData {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    profilePictureUrl?: string;
    coverPhotoUrl?: string;
    headline?: string;
    bio?: string;
    careerGoals?: string;
    location?: string;
    languages: string[];
    professionalTitle?: string;
    isVerified: boolean;
    profileCompleteness: number;
    totalPoints: number;
    level: number;
    currentStreak: number;
    totalLearningHours: number;
    isOpenToOpportunities: boolean;
    socialLinks?: {
      github?: string;
      linkedin?: string;
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
    followers: number;
    following: number;
    posts: number;
    projects: number;
    certifications: number;
    skills: number;
    achievements: number;
  };
}

interface ProfilePageProps {
  userId: string;
  isOwnProfile?: boolean;
}

export default function ProfilePage({ userId, isOwnProfile = false }: ProfilePageProps) {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"about" | "skills" | "projects" | "achievements">("about");
  const [showProfilePictureModal, setShowProfilePictureModal] = useState(false);
  const [showCoverPhotoModal, setShowCoverPhotoModal] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, [userId]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:5001/api/profile/${userId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      const data = await response.json();
      
      // Handle backend response structure: { success: true, data: {...user} }
      if (data.success && data.data) {
        const userData = data.data;
        
        // Build stats object from backend data
        const stats = {
          followers: userData.followersCount || 0,
          following: userData.followingCount || 0,
          posts: userData.postsCount || 0,
          skills: 0, // Will be loaded from skills API
          projects: 0, // Will be loaded from projects API
          certifications: 0,
          achievements: 0, // Will be loaded from achievements API
        };
        
        setProfile({ user: userData, stats });
      } else {
        console.error("Profile not found or error:", data.message);
        setProfile(null);
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!profile || !profile.user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Profile Not Found</h2>
          <p className="text-gray-500">The user profile you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  const { user, stats } = profile;
  const displayName = user?.student?.khmerName || user?.teacher?.khmerName || `${user?.firstName} ${user?.lastName}`;

  return (
    <div className="bg-gray-50 pb-12">
      {/* Cover Photo */}
      <div className="relative h-64 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500">
        {user.coverPhotoUrl && (
          <img 
            src={user.coverPhotoUrl} 
            alt="Cover" 
            className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity" 
            onClick={() => setShowCoverPhotoModal(true)}
          />
        )}
        
        {/* Edit Cover Button (Own Profile) */}
        {isOwnProfile && (
          <button className="absolute top-4 right-4 px-4 py-2 bg-white/90 backdrop-blur-sm rounded-lg text-sm font-medium text-gray-700 hover:bg-white transition-colors">
            Edit Cover
          </button>
        )}
      </div>

      {/* Profile Header - Changed from -mt-20 to relative positioning */}
      <div className="max-w-6xl mx-auto px-4 relative -mt-20 z-10">
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Profile Picture */}
            <div className="relative flex-shrink-0">
              <div 
                className="w-32 h-32 rounded-full border-4 border-white shadow-xl overflow-hidden bg-gradient-to-br from-indigo-100 to-purple-100 cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => user.profilePictureUrl && setShowProfilePictureModal(true)}
              >
                {user.profilePictureUrl ? (
                  <img src={user.profilePictureUrl} alt={displayName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-indigo-600">
                    {displayName.charAt(0)}
                  </div>
                )}
              </div>
              
              {/* Verified Badge */}
              {user.isVerified && (
                <div className="absolute bottom-0 right-0 w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center border-4 border-white">
                  <CheckCircle2 className="w-6 h-6 text-white" />
                </div>
              )}
              
              {/* Level Badge */}
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full text-white text-xs font-bold shadow-lg">
                Level {user.level || 1}
              </div>
            </div>

            {/* Profile Info */}
            <div className="flex-1">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-1">{displayName}</h1>
                  {user.headline && (
                    <p className="text-lg text-gray-600 mb-2">{user.headline}</p>
                  )}
                  {user.professionalTitle && (
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                      <Briefcase className="w-4 h-4" />
                      {user.professionalTitle}
                    </div>
                  )}
                </div>
                
                {isOwnProfile && (
                  <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors">
                    Edit Profile
                  </button>
                )}
              </div>

              {/* Quick Stats */}
              <div className="flex items-center gap-6 mb-4">
                {user.location && (
                  <div className="flex items-center gap-1.5 text-sm text-gray-600">
                    <MapPin className="w-4 h-4" />
                    {user.location}
                  </div>
                )}
                
                {user.student?.class && (
                  <div className="flex items-center gap-1.5 text-sm text-gray-600">
                    <GraduationCap className="w-4 h-4" />
                    {user.student.class.name}
                  </div>
                )}
                
                {user.teacher?.position && (
                  <div className="flex items-center gap-1.5 text-sm text-gray-600">
                    <Briefcase className="w-4 h-4" />
                    {user.teacher.position}
                  </div>
                )}
                
                <div className="flex items-center gap-1.5 text-sm text-gray-600">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  {(user.totalPoints || 0).toLocaleString()} points
                </div>
              </div>

              {/* Languages */}
              {user.languages && user.languages.length > 0 && (
                <div className="flex items-center gap-2 mb-4">
                  <Globe className="w-4 h-4 text-gray-400" />
                  <div className="flex gap-2">
                    {user.languages.map((lang) => (
                      <span key={lang} className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-700">
                        {lang}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Social Links */}
              {user.socialLinks && (
                <div className="flex gap-3">
                  {user.socialLinks.github && (
                    <a
                      href={user.socialLinks.github}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
                    >
                      <Github className="w-5 h-5 text-gray-700" />
                    </a>
                  )}
                  {user.socialLinks.linkedin && (
                    <a
                      href={user.socialLinks.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
                    >
                      <Linkedin className="w-5 h-5 text-gray-700" />
                    </a>
                  )}
                  {user.socialLinks.portfolio && (
                    <a
                      href={user.socialLinks.portfolio}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
                    >
                      <Globe className="w-5 h-5 text-gray-700" />
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Profile Stats */}
          <div className="grid grid-cols-4 md:grid-cols-7 gap-4 mt-6 pt-6 border-t border-gray-200">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{stats.followers}</div>
              <div className="text-xs text-gray-500">Followers</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{stats.following}</div>
              <div className="text-xs text-gray-500">Following</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{stats.posts}</div>
              <div className="text-xs text-gray-500">Posts</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{stats.skills}</div>
              <div className="text-xs text-gray-500">Skills</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{stats.projects}</div>
              <div className="text-xs text-gray-500">Projects</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{stats.certifications}</div>
              <div className="text-xs text-gray-500">Certifications</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{stats.achievements}</div>
              <div className="text-xs text-gray-500">Achievements</div>
            </div>
          </div>

          {/* Profile Completion */}
          {isOwnProfile && user.profileCompleteness < 100 && (
            <div className="mt-6 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Profile Completion</span>
                <span className="text-sm font-bold text-indigo-600">{user.profileCompleteness}%</span>
              </div>
              <div className="w-full bg-white rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
                  style={{ width: `${user.profileCompleteness}%` }}
                />
              </div>
              <p className="text-xs text-gray-600 mt-2">
                Complete your profile to increase visibility and opportunities!
              </p>
            </div>
          )}

          {/* Open to Opportunities Badge */}
          {user.isOpenToOpportunities && (
            <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm font-medium text-green-700">Open to opportunities</span>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="mt-6 bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              {[
                { id: "about", label: "About", icon: User },
                { id: "skills", label: `Skills (${stats.skills})`, icon: Code },
                { id: "projects", label: `Projects (${stats.projects})`, icon: Briefcase },
                { id: "achievements", label: `Achievements (${stats.achievements})`, icon: Award },
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 px-6 py-4 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === tab.id
                        ? "border-indigo-600 text-indigo-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === "about" && (
              <div className="space-y-6">
                {/* Bio */}
                {user.bio && (
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">About</h3>
                    <p className="text-gray-700 leading-relaxed">{user.bio}</p>
                  </div>
                )}

                {/* Career Goals */}
                {user.careerGoals && (
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">Career Goals</h3>
                    <p className="text-gray-700 leading-relaxed">{user.careerGoals}</p>
                  </div>
                )}

                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="w-5 h-5 text-indigo-600" />
                      <span className="text-sm font-medium text-gray-700">Current Streak</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900">{user.currentStreak || 0} days</div>
                  </div>

                  <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-100">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="w-5 h-5 text-purple-600" />
                      <span className="text-sm font-medium text-gray-700">Learning Hours</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900">{user.totalLearningHours || 0}h</div>
                  </div>

                  <div className="p-4 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl border border-yellow-100">
                    <div className="flex items-center gap-2 mb-2">
                      <Star className="w-5 h-5 text-yellow-600" />
                      <span className="text-sm font-medium text-gray-700">Total Points</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900">{(user.totalPoints || 0).toLocaleString()}</div>
                  </div>

                  <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-100">
                    <div className="flex items-center gap-2 mb-2">
                      <Award className="w-5 h-5 text-green-600" />
                      <span className="text-sm font-medium text-gray-700">Level</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900">Level {user.level || 1}</div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "skills" && (
              <SkillsSection userId={userId} isOwnProfile={isOwnProfile} />
            )}

            {activeTab === "projects" && (
              <ProjectsSection userId={userId} isOwnProfile={isOwnProfile} />
            )}

            {activeTab === "achievements" && (
              <AchievementsSection userId={userId} isOwnProfile={isOwnProfile} />
            )}
          </div>
        </div>
      </div>

      {/* Profile Picture Modal */}
      {showProfilePictureModal && user.profilePictureUrl && (
        <div 
          className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center p-4"
          onClick={() => setShowProfilePictureModal(false)}
        >
          <div className="relative max-w-4xl max-h-[90vh] w-full h-full flex items-center justify-center">
            <button
              onClick={() => setShowProfilePictureModal(false)}
              className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-sm transition-colors z-10"
            >
              <X className="w-6 h-6 text-white" />
            </button>
            <img
              src={user.profilePictureUrl}
              alt={displayName}
              className="max-w-full max-h-full object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

      {/* Cover Photo Modal */}
      {showCoverPhotoModal && user.coverPhotoUrl && (
        <div 
          className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center p-4"
          onClick={() => setShowCoverPhotoModal(false)}
        >
          <div className="relative max-w-6xl max-h-[90vh] w-full h-full flex items-center justify-center">
            <button
              onClick={() => setShowCoverPhotoModal(false)}
              className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-sm transition-colors z-10"
            >
              <X className="w-6 h-6 text-white" />
            </button>
            <img
              src={user.coverPhotoUrl}
              alt="Cover Photo"
              className="max-w-full max-h-full object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}
