"use client";

import { motion } from "framer-motion";
import { 
  GraduationCap, 
  Briefcase, 
  MapPin, 
  Globe, 
  Linkedin, 
  Github, 
  Facebook,
  Link as LinkIcon,
  Award,
  Calendar,
  CheckCircle2,
  Clock
} from "lucide-react";

interface ProfileInfoSectionProps {
  role: "student" | "teacher" | "educator" | "researcher" | "learner";
  user: {
    bio?: string;
    careerGoals?: string;
    location?: string;
    languages?: string[];
    professionalTitle?: string;
    isOpenToOpportunities?: boolean;
    socialLinks?: {
      linkedin?: string;
      github?: string;
      portfolio?: string;
      facebook?: string;
    };
    student?: {
      class?: { name: string; grade: string };
    };
    teacher?: {
      position?: string;
      yearsOfExperience?: number;
      specializations?: string[];
    };
  };
  educationalInfo?: {
    institution?: string;
    degree?: string;
    major?: string;
    graduationYear?: number;
    certifications?: string[];
  };
  availability?: {
    status: "available" | "busy" | "away";
    responseTime?: string; // e.g., "Usually responds in 2 hours"
    acceptingStudents?: boolean;
    acceptingProjects?: boolean;
  };
}

export default function ProfileInfoSection({ 
  role, 
  user, 
  educationalInfo,
  availability 
}: ProfileInfoSectionProps) {
  const statusColors = {
    available: "bg-green-500",
    busy: "bg-yellow-500",
    away: "bg-gray-400"
  };

  const statusLabels = {
    available: "Available",
    busy: "Busy",
    away: "Away"
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-4"
    >
      {/* About Me Section */}
      {user.bio && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-md border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <div className="w-1 h-6 bg-gradient-to-b from-purple-500 to-pink-500 rounded-full" />
            About Me
          </h3>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            {user.bio}
          </p>
          
          {user.careerGoals && (
            <div className="mt-4 p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl border border-purple-200 dark:border-purple-800/30">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-800/30 rounded-lg">
                  <Award className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-1">Career Goals</h4>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{user.careerGoals}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Educational Background / Professional Info */}
      {(educationalInfo || user.teacher) && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-md border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <div className="w-1 h-6 bg-gradient-to-b from-blue-500 to-teal-500 rounded-full" />
            {role === "student" ? "Education" : "Professional Background"}
          </h3>
          
          <div className="space-y-4">
            {/* Current Position/Education */}
            <div className="flex items-start gap-4">
              <div className="p-2.5 bg-blue-100 dark:bg-blue-800/30 rounded-lg">
                {role === "student" ? (
                  <GraduationCap className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                ) : (
                  <Briefcase className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                )}
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 dark:text-white">
                  {user.professionalTitle || educationalInfo?.degree || "Current Position"}
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {educationalInfo?.institution || user.teacher?.position || user.student?.class?.name}
                </p>
                {educationalInfo?.major && (
                  <p className="text-sm text-purple-600 dark:text-purple-400 font-medium mt-1">
                    {educationalInfo.major}
                  </p>
                )}
                {educationalInfo?.graduationYear && (
                  <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-500 mt-1">
                    <Calendar className="w-4 h-4" />
                    <span>Graduated {educationalInfo.graduationYear}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Years of Experience (for teachers) */}
            {user.teacher?.yearsOfExperience && (
              <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-green-50 to-teal-50 dark:from-green-900/20 dark:to-teal-900/20 rounded-xl">
                <Clock className="w-5 h-5 text-green-600 dark:text-green-400" />
                <div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {user.teacher.yearsOfExperience}+ years of experience
                  </span>
                </div>
              </div>
            )}

            {/* Specializations */}
            {user.teacher?.specializations && user.teacher.specializations.length > 0 && (
              <div>
                <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Specializations
                </h5>
                <div className="flex flex-wrap gap-2">
                  {user.teacher.specializations.map((spec, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1.5 bg-purple-100 dark:bg-purple-800/30 text-purple-700 dark:text-purple-300 text-xs font-medium rounded-full"
                    >
                      {spec}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Certifications */}
            {educationalInfo?.certifications && educationalInfo.certifications.length > 0 && (
              <div>
                <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                  <Award className="w-4 h-4 text-yellow-600" />
                  Certifications
                </h5>
                <ul className="space-y-2">
                  {educationalInfo.certifications.map((cert, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <span>{cert}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Location & Languages */}
      {(user.location || user.languages) && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-md border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <div className="w-1 h-6 bg-gradient-to-b from-green-500 to-teal-500 rounded-full" />
            Location & Languages
          </h3>
          
          <div className="space-y-3">
            {user.location && (
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-800/30 rounded-lg">
                  <MapPin className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-500">Location</p>
                  <p className="font-medium text-gray-900 dark:text-white">{user.location}</p>
                </div>
              </div>
            )}
            
            {user.languages && user.languages.length > 0 && (
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-800/30 rounded-lg">
                  <Globe className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-500 dark:text-gray-500 mb-2">Languages</p>
                  <div className="flex flex-wrap gap-2">
                    {user.languages.map((lang, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 bg-blue-100 dark:bg-blue-800/30 text-blue-700 dark:text-blue-300 text-sm font-medium rounded-full"
                      >
                        {lang}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Availability Status (for teachers/educators) */}
      {availability && (role === "teacher" || role === "educator") && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-md border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <div className="w-1 h-6 bg-gradient-to-b from-orange-500 to-red-500 rounded-full" />
            Availability
          </h3>
          
          <div className="space-y-3">
            {/* Status */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${statusColors[availability.status]} animate-pulse`} />
                <span className="font-semibold text-gray-900 dark:text-white">
                  {statusLabels[availability.status]}
                </span>
              </div>
            </div>

            {/* Response Time */}
            {availability.responseTime && (
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Clock className="w-4 h-4" />
                <span>{availability.responseTime}</span>
              </div>
            )}

            {/* Accepting Status */}
            <div className="space-y-2 pt-2">
              {availability.acceptingStudents && (
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span className="text-gray-700 dark:text-gray-300">Accepting new students</span>
                </div>
              )}
              {availability.acceptingProjects && (
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span className="text-gray-700 dark:text-gray-300">Open to freelance projects</span>
                </div>
              )}
              {user.isOpenToOpportunities && (
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span className="text-gray-700 dark:text-gray-300">Open to opportunities</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Social Links */}
      {user.socialLinks && Object.keys(user.socialLinks).length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-md border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <div className="w-1 h-6 bg-gradient-to-b from-pink-500 to-purple-500 rounded-full" />
            Connect With Me
          </h3>
          
          <div className="flex flex-wrap gap-3">
            {user.socialLinks.linkedin && (
              <motion.a
                href={user.socialLinks.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-md font-medium"
              >
                <Linkedin className="w-5 h-5" />
                <span>LinkedIn</span>
              </motion.a>
            )}
            
            {user.socialLinks.github && (
              <motion.a
                href={user.socialLinks.github}
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 dark:bg-gray-700 text-white rounded-xl hover:bg-gray-800 transition-all shadow-md font-medium"
              >
                <Github className="w-5 h-5" />
                <span>GitHub</span>
              </motion.a>
            )}
            
            {user.socialLinks.portfolio && (
              <motion.a
                href={user.socialLinks.portfolio}
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all shadow-md font-medium"
              >
                <Globe className="w-5 h-5" />
                <span>Portfolio</span>
              </motion.a>
            )}
            
            {user.socialLinks.facebook && (
              <motion.a
                href={user.socialLinks.facebook}
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-all shadow-md font-medium"
              >
                <Facebook className="w-5 h-5" />
                <span>Facebook</span>
              </motion.a>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}
