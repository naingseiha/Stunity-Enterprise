"use client";

import { Loader2, X, Save } from "lucide-react";

interface FloatingSavePanelProps {
  pastedCount: number;
  editedCount: number;
  totalChanges: number;
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
}

export function FloatingSavePanel({
  pastedCount,
  editedCount,
  totalChanges,
  saving,
  onSave,
  onCancel,
}: FloatingSavePanelProps) {
  return (
    <div className="fixed bottom-6 right-6 z-50 animate-slideUp">
      <div className="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl shadow-2xl p-6 min-w-[420px]">
        <div className="flex items-start justify-between mb-4">
          <div className="text-white">
            <p className="text-lg font-black flex items-center gap-2">
              📋 ទិន្នន័យរង់ចាំរក្សាទុក
              {saving && <Loader2 className="w-5 h-5 animate-spin" />}
            </p>
            <div className="mt-3 space-y-1. 5 text-sm">
              <p className="flex items-center gap-2">
                <span className="inline-block w-3 h-3 bg-yellow-300 rounded"></span>
                បានបញ្ចូលពី Excel:{" "}
                <span className="font-bold">{pastedCount}</span> cells
              </p>
              {editedCount > 0 && (
                <p className="flex items-center gap-2">
                  <span className="inline-block w-3 h-3 bg-orange-300 rounded"></span>
                  បានកែសម្រួល: <span className="font-bold">{editedCount}</span>{" "}
                  cells
                </p>
              )}
              <p className="text-white/90 mt-3 pt-3 border-t border-white/30">
                សរុបទាំងអស់:{" "}
                <span className="font-black text-2xl">{totalChanges}</span>{" "}
                cells
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            disabled={saving}
            className="text-white/80 hover:text-white disabled:opacity-50 transition-colors"
            title="បិទ"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex gap-3 mt-4">
          <button
            onClick={onCancel}
            disabled={saving}
            className="flex-1 px-5 py-3.5 bg-white/20 hover:bg-white/30 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-white font-semibold transition-all flex items-center justify-center gap-2"
          >
            <X className="w-5 h-5" />
            បោះបង់
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            className="flex-1 px-6 py-3.5 bg-white hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-blue-600 font-bold shadow-lg transition-all flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>កំពុងរក្សា... </span>
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                <span>រក្សាទុកទាំងអស់</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
