"use client";

import { useState, useEffect } from "react";
import { 
  Plus, 
  ExternalLink, 
  Github, 
  Heart, 
  Star, 
  Eye,
  Edit2,
  Trash2,
  Upload,
  X,
  Sparkles,
  Award,
  Link as LinkIcon,
} from "lucide-react";
import {
  getUserProjects,
  createProject,
  updateProject,
  deleteProject as deleteProjectAPI,
  likeProject,
  toggleFeaturedProject,
  Project,
} from "@/lib/api/profile";

interface ProjectsSectionProps {
  userId: string;
  isOwnProfile: boolean;
}

export default function ProjectsSection({ userId, isOwnProfile }: ProjectsSectionProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "SOFTWARE",
    status: "IN_PROGRESS",
    technologies: "",
    skills: "",
    githubUrl: "",
    liveUrl: "",
    projectUrl: "",
    privacy: "PUBLIC",
  });

  useEffect(() => {
    fetchProjects();
  }, [userId]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const data = await getUserProjects(userId);
      setProjects(data);
    } catch (error) {
      console.error("Failed to fetch projects:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    
    try {
      setSubmitting(true);
      
      const projectData = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        status: formData.status,
        technologies: formData.technologies.split(',').map(t => t.trim()).filter(Boolean),
        skills: formData.skills.split(',').map(s => s.trim()).filter(Boolean),
        githubUrl: formData.githubUrl || undefined,
        liveUrl: formData.liveUrl || undefined,
        projectUrl: formData.projectUrl || undefined,
        privacy: formData.privacy,
        media: selectedFiles.length > 0 ? selectedFiles : undefined,
      };

      if (editingProject) {
        await updateProject(editingProject.id, projectData);
      } else {
        await createProject(projectData);
      }
      
      await fetchProjects();
      handleCloseModal();
    } catch (error) {
      console.error("Failed to save project:", error);
      alert("Failed to save project. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (projectId: string) => {
    if (!confirm("តើអ្នកប្រាកដថាចង់លុបគម្រោងនេះ?")) return;

    try {
      await deleteProjectAPI(projectId);
      setProjects(projects.filter((p) => p.id !== projectId));
    } catch (error) {
      console.error("Failed to delete project:", error);
      alert("Failed to delete project.");
    }
  };

  const handleLike = async (projectId: string) => {
    try {
      const result = await likeProject(projectId);
      setProjects(projects.map(p => 
        p.id === projectId 
          ? { ...p, isLiked: result.isLiked, likesCount: result.likesCount }
          : p
      ));
    } catch (error) {
      console.error("Failed to like project:", error);
    }
  };

  const handleFeature = async (projectId: string) => {
    try {
      const result = await toggleFeaturedProject(projectId);
      setProjects(projects.map(p =>
        p.id === projectId
          ? { ...p, isFeatured: result.isFeatured }
          : p
      ));
    } catch (error) {
      console.error("Failed to feature project:", error);
    }
  };

  const handleEdit = (project: Project) => {
    setEditingProject(project);
    setFormData({
      title: project.title,
      description: project.description,
      category: project.category,
      status: project.status,
      technologies: project.technologies.join(", "),
      skills: project.skills.join(", "),
      githubUrl: project.githubUrl || "",
      liveUrl: project.liveUrl || "",
      projectUrl: project.projectUrl || "",
      privacy: project.privacy,
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingProject(null);
    setSelectedFiles([]);
    setFormData({
      title: "",
      description: "",
      category: "SOFTWARE",
      status: "IN_PROGRESS",
      technologies: "",
      skills: "",
      githubUrl: "",
      liveUrl: "",
      projectUrl: "",
      privacy: "PUBLIC",
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      if (files.length > 10) {
        alert("Maximum 10 files allowed");
        return;
      }
      setSelectedFiles(files);
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
          <h2 className="text-2xl font-bold text-gray-900">គម្រោង & ផលិតផល</h2>
          <p className="text-sm text-gray-500 mt-1">
            បង្ហាញការងារ និងគម្រោងរបស់អ្នក • {projects.length} គម្រោង
          </p>
        </div>
        
        {isOwnProfile && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium hover:shadow-lg transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>បន្ថែមគម្រោង</span>
          </button>
        )}
      </div>

      {/* Projects Grid */}
      {projects.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-2xl">
          <Sparkles className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            មិនទាន់មានគម្រោង
          </h3>
          <p className="text-gray-500">
            {isOwnProfile
              ? "ចាប់ផ្តើមបន្ថែមគម្រោងដំបូងរបស់អ្នក"
              : "អ្នកប្រើប្រាស់នេះមិនទាន់មានគម្រោងទេ"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {projects.map((project) => (
            <div
              key={project.id}
              className="bg-white border border-gray-200 rounded-2xl overflow-hidden hover:shadow-lg transition-all group"
            >
              {/* Project Image/Media */}
              {project.mediaUrls && project.mediaUrls.length > 0 ? (
                <div className="h-48 bg-gradient-to-br from-indigo-500 to-purple-600 relative overflow-hidden">
                  <img
                    src={project.mediaUrls[0]}
                    alt={project.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {project.isFeatured && (
                    <div className="absolute top-3 right-3 bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                      <Star className="w-3 h-3 fill-current" />
                      លេចធ្លោ
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-48 bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center relative">
                  <Sparkles className="w-16 h-16 text-white/30" />
                  {project.isFeatured && (
                    <div className="absolute top-3 right-3 bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                      <Star className="w-3 h-3 fill-current" />
                      លេចធ្លោ
                    </div>
                  )}
                </div>
              )}

              {/* Project Content */}
              <div className="p-5">
                <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-indigo-600 transition-colors">
                  {project.title}
                </h3>
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                  {project.description}
                </p>

                {/* Technologies */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {project.technologies.slice(0, 4).map((tech, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-medium"
                    >
                      {tech}
                    </span>
                  ))}
                  {project.technologies.length > 4 && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium">
                      +{project.technologies.length - 4}
                    </span>
                  )}
                </div>

                {/* Links */}
                <div className="flex items-center gap-3 mb-4">
                  {project.githubUrl && (
                    <a
                      href={project.githubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-gray-600 hover:text-gray-900 text-sm"
                    >
                      <Github className="w-4 h-4" />
                      <span>Code</span>
                    </a>
                  )}
                  {project.liveUrl && (
                    <a
                      href={project.liveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-indigo-600 hover:text-indigo-700 text-sm"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>Live Demo</span>
                    </a>
                  )}
                </div>

                {/* Stats & Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Heart
                        className={`w-4 h-4 ${
                          project.isLiked
                            ? "fill-red-500 text-red-500"
                            : "text-gray-400"
                        }`}
                      />
                      <span>{project.likesCount || 0}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Eye className="w-4 h-4 text-gray-400" />
                      <span>{project.viewsCount || 0}</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2">
                    {!isOwnProfile && (
                      <button
                        onClick={() => handleLike(project.id)}
                        className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Heart
                          className={`w-4 h-4 ${
                            project.isLiked
                              ? "fill-red-500 text-red-500"
                              : "text-gray-400"
                          }`}
                        />
                      </button>
                    )}
                    
                    {isOwnProfile && (
                      <>
                        <button
                          onClick={() => handleFeature(project.id)}
                          className={`p-2 rounded-lg transition-colors ${
                            project.isFeatured
                              ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                              : "hover:bg-gray-100 text-gray-400"
                          }`}
                          title={project.isFeatured ? "លុបចេញពីលេចធ្លោ" : "កំណត់ជាលេចធ្លោ"}
                        >
                          <Star
                            className={`w-4 h-4 ${
                              project.isFeatured ? "fill-current" : ""
                            }`}
                          />
                        </button>
                        <button
                          onClick={() => handleEdit(project)}
                          className="p-2 hover:bg-indigo-50 rounded-lg transition-colors text-gray-400 hover:text-indigo-600"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(project.id)}
                          className="p-2 hover:bg-red-50 rounded-lg transition-colors text-gray-400 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Project Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">
                {editingProject ? "កែប្រែគម្រោង" : "បន្ថែមគម្រោងថ្មី"}
              </h3>
              <button
                onClick={handleCloseModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ចំណងជើងគម្រោង *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="ឧទាហរណ៍: ប្រព័ន្ធគ្រប់គ្រងសិស្ស"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ប្រភេទ *
                </label>
                <select
                  required
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="SOFTWARE">Software Development</option>
                  <option value="WEB">Web Development</option>
                  <option value="MOBILE">Mobile App</option>
                  <option value="DATA_SCIENCE">Data Science</option>
                  <option value="DESIGN">Design</option>
                  <option value="RESEARCH">Research</option>
                  <option value="HARDWARE">Hardware</option>
                  <option value="BUSINESS">Business</option>
                  <option value="EDUCATION">Education</option>
                  <option value="ART">Art</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ស្ថានភាព *
                </label>
                <select
                  required
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="PLANNING">Planning</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="ON_HOLD">On Hold</option>
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ការពិពណ៌នា *
                </label>
                <textarea
                  required
                  rows={4}
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                  placeholder="ពិពណ៌នាអំពីគម្រោងរបស់អ្នក..."
                />
              </div>

              {/* Technologies */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  បច្ចេកវិទ្យា (ប្រើ comma ដើម្បីបំបែក) *
                </label>
                <input
                  type="text"
                  required
                  value={formData.technologies}
                  onChange={(e) =>
                    setFormData({ ...formData, technologies: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="React, Node.js, PostgreSQL, TypeScript"
                />
              </div>

              {/* Skills */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Skills Used (ប្រើ comma ដើម្បីបំបែក)
                </label>
                <input
                  type="text"
                  value={formData.skills}
                  onChange={(e) =>
                    setFormData({ ...formData, skills: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="JavaScript, API Design, Database Design"
                />
              </div>

              {/* URLs */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    GitHub URL
                  </label>
                  <input
                    type="url"
                    value={formData.githubUrl}
                    onChange={(e) =>
                      setFormData({ ...formData, githubUrl: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="https://github.com/..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Live Demo URL
                  </label>
                  <input
                    type="url"
                    value={formData.liveUrl}
                    onChange={(e) =>
                      setFormData({ ...formData, liveUrl: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="https://demo.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Project URL
                  </label>
                  <input
                    type="url"
                    value={formData.projectUrl}
                    onChange={(e) =>
                      setFormData({ ...formData, projectUrl: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="https://project.com"
                  />
                </div>
              </div>

              {/* Privacy */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  មើលឃើញ
                </label>
                <select
                  value={formData.privacy}
                  onChange={(e) =>
                    setFormData({ ...formData, privacy: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="PUBLIC">សាធារណៈ</option>
                  <option value="SCHOOL">សាលា</option>
                  <option value="CLASS">ថ្នាក់</option>
                  <option value="PRIVATE">ឯកជន</option>
                </select>
              </div>

              {/* Media Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  រូបភាពគម្រោង
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-indigo-500 transition-colors">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="project-media"
                  />
                  <label
                    htmlFor="project-media"
                    className="cursor-pointer flex flex-col items-center"
                  >
                    <Upload className="w-10 h-10 text-gray-400 mb-2" />
                    <span className="text-sm text-gray-600">
                      ចុចដើម្បីជ្រើសរើសរូបភាព
                    </span>
                    {selectedFiles.length > 0 && (
                      <span className="text-xs text-indigo-600 mt-2">
                        បានជ្រើសរើស {selectedFiles.length} ឯកសារ
                      </span>
                    )}
                  </label>
                </div>
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
                  {submitting ? "កំពុងរក្សាទុក..." : editingProject ? "រក្សាទុកការផ្លាស់ប្តូរ" : "បន្ថែមគម្រោង"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
