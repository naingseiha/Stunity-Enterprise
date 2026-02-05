'use client';

import { useState } from 'react';
import { 
  BookOpen, 
  FileText, 
  Video, 
  Link2,
  Download,
  ExternalLink,
  ChevronRight,
  Folder,
  Star,
} from 'lucide-react';

interface Resource {
  id: string;
  title: string;
  type: 'pdf' | 'video' | 'link' | 'doc';
  subject: string;
  size?: string;
  isNew?: boolean;
  isFavorite?: boolean;
}

// Mock data
const QUICK_RESOURCES: Resource[] = [
  {
    id: '1',
    title: 'Math Formula Sheet',
    type: 'pdf',
    subject: 'Mathematics',
    size: '2.4 MB',
    isFavorite: true,
  },
  {
    id: '2',
    title: 'Chemistry Lab Guide',
    type: 'doc',
    subject: 'Chemistry',
    size: '1.8 MB',
    isNew: true,
  },
  {
    id: '3',
    title: 'History Documentary',
    type: 'video',
    subject: 'History',
    size: '45 min',
  },
  {
    id: '4',
    title: 'Khan Academy Physics',
    type: 'link',
    subject: 'Physics',
  },
];

const TYPE_CONFIG = {
  pdf: { icon: FileText, color: 'text-rose-500', bg: 'bg-rose-50' },
  video: { icon: Video, color: 'text-violet-500', bg: 'bg-violet-50' },
  link: { icon: Link2, color: 'text-teal-500', bg: 'bg-teal-50' },
  doc: { icon: BookOpen, color: 'text-[#F9A825]', bg: 'bg-amber-50' },
};

export default function QuickResourcesWidget() {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-gray-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#F9A825]/20 to-[#FFB74D]/20 flex items-center justify-center">
            <Folder className="w-4 h-4 text-[#F9A825]" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 text-sm">Quick Resources</h3>
            <p className="text-xs text-gray-400">Recent files</p>
          </div>
        </div>
      </div>

      {/* Resources List */}
      <div className="divide-y divide-gray-50">
        {QUICK_RESOURCES.map((resource) => {
          const isHovered = hoveredId === resource.id;
          const config = TYPE_CONFIG[resource.type];
          const Icon = config.icon;
          
          return (
            <button
              key={resource.id}
              onMouseEnter={() => setHoveredId(resource.id)}
              onMouseLeave={() => setHoveredId(null)}
              className="w-full p-3 flex items-center gap-3 hover:bg-amber-50/30 transition-all duration-300 group"
            >
              {/* Icon */}
              <div className={`
                w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0
                ${config.bg} transition-transform duration-300
                ${isHovered ? 'scale-105' : ''}
              `}>
                <Icon className={`w-5 h-5 ${config.color}`} />
              </div>

              {/* Content */}
              <div className="flex-1 text-left min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-gray-900 text-sm truncate group-hover:text-[#F9A825] transition-colors">
                    {resource.title}
                  </h4>
                  {resource.isNew && (
                    <span className="px-1.5 py-0.5 text-[10px] font-bold bg-amber-100 text-[#F9A825] rounded-full">
                      NEW
                    </span>
                  )}
                  {resource.isFavorite && (
                    <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <span>{resource.subject}</span>
                  {resource.size && (
                    <>
                      <span>•</span>
                      <span>{resource.size}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Action */}
              <div className={`
                flex-shrink-0 transition-all duration-300
                ${isHovered ? 'opacity-100' : 'opacity-0'}
              `}>
                {resource.type === 'link' ? (
                  <ExternalLink className="w-4 h-4 text-[#F9A825]" />
                ) : (
                  <Download className="w-4 h-4 text-[#F9A825]" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* View All */}
      <div className="p-3 border-t border-gray-50">
        <button className="w-full text-center text-sm font-medium text-[#F9A825] hover:text-[#E89A1E] transition-colors">
          Browse all resources →
        </button>
      </div>
    </div>
  );
}
