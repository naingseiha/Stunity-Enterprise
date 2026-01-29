import React from "react";
import { GraduationCap, Eye } from "lucide-react";
import Button from "@/components/ui/Button";

interface EmptyStateProps {
  onShowClasses: () => void;
}

export default function EmptyState({ onShowClasses }: EmptyStateProps) {
  return (
    <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-sm p-12 text-center max-w-2xl mx-auto">
      {/* Icon */}
      <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl mb-6">
        <GraduationCap className="w-12 h-12 text-purple-600" />
      </div>

      {/* Title */}
      <h1 className="text-2xl font-koulen text-gray-900 mb-3">
        គ្រប់គ្រងថ្នាក់រៀន
      </h1>

      {/* Description */}
      <p className="text-gray-600 text-base mb-8 max-w-md mx-auto leading-relaxed">
        ចុចប៊ូតុង{" "}
        <span className="font-semibold text-purple-600">"បង្ហាញថ្នាក់រៀន"</span>{" "}
        ខាងក្រោម
        <br />
        ដើម្បីមើល និងគ្រប់គ្រងថ្នាក់រៀនទាំងអស់
      </p>

      {/* Action Button */}
      <Button
        onClick={onShowClasses}
        variant="primary"
        icon={<Eye className="w-5 h-5" />}
        className="mx-auto"
      >
        បង្ហាញថ្នាក់រៀនឥឡូវនេះ
      </Button>

      {/* Decorative Elements */}
      <div className="mt-8 flex items-center justify-center gap-2">
        <div className="w-2 h-2 rounded-full bg-purple-300"></div>
        <div className="w-2 h-2 rounded-full bg-purple-400"></div>
        <div className="w-2 h-2 rounded-full bg-purple-500"></div>
      </div>
    </div>
  );
}
