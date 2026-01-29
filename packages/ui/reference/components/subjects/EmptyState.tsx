import React from "react";
import { BookOpen, Eye } from "lucide-react";
import Button from "@/components/ui/Button";

interface EmptyStateProps {
  onShowSubjects: () => void;
}

export default function EmptyState({ onShowSubjects }: EmptyStateProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-12 text-center max-w-2xl mx-auto">
      {/* Icon */}
      <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl mb-6">
        <BookOpen className="w-12 h-12 text-blue-600" />
      </div>

      {/* Title */}
      <h1 className="text-2xl font-koulen text-gray-900 mb-3">
        គ្រប់គ្រងមុខវិជ្ជា
      </h1>

      {/* Description */}
      <p className="text-gray-600 text-base mb-8 max-w-md mx-auto leading-relaxed">
        ចុចប៊ូតុង{" "}
        <span className="font-semibold text-blue-600">"បង្ហាញមុខវិជ្ជា"</span>{" "}
        ខាងក្រោម
        <br />
        ដើម្បីមើល និងគ្រប់គ្រងមុខវិជ្ជាទាំងអស់
      </p>

      {/* Action Button */}
      <Button
        onClick={onShowSubjects}
        variant="primary"
        icon={<Eye className="w-5 h-5" />}
        className="mx-auto"
      >
        បង្ហាញមុខវិជ្ជាឥឡូវនេះ
      </Button>

      {/* Decorative Elements */}
      <div className="mt-8 flex items-center justify-center gap-2">
        <div className="w-2 h-2 rounded-full bg-blue-300"></div>
        <div className="w-2 h-2 rounded-full bg-blue-400"></div>
        <div className="w-2 h-2 rounded-full bg-blue-500"></div>
      </div>
    </div>
  );
}
