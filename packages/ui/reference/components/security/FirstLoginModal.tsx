"use client";

import { useState, useEffect } from "react";
import { X, Shield, Clock, CheckCircle, AlertTriangle } from "lucide-react";

interface FirstLoginModalProps {
  daysRemaining: number;
  onChangeNow: () => void;
  onRemindLater: () => void;
}

export default function FirstLoginModal({
  daysRemaining,
  onChangeNow,
  onRemindLater,
}: FirstLoginModalProps) {
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 px-6 py-4 text-center">
          <div className="inline-flex p-4 bg-white/20 backdrop-blur-md rounded-full mb-4">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <h4 className="text-xl font-koulen font-bold text-white mb-2">
            សូមស្វាគមន៍! Welcome!
          </h4>
          <p className="text-white/90 text-sm">សូមកំណត់ពាក្យសម្ងាត់របស់អ្នក</p>
        </div>

        <div className="p-4">
          {/* Important Notice */}
          <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-3 mb-4">
            <div className="flex gap-3">
              <AlertTriangle className="w-6 h-6 text-orange-600 flex-shrink-0" />
              <div>
                <h3 className="font-bold text-orange-900 mb-2">
                  ការជូនដំណឹងសំខាន់
                </h3>
                <p className="text-sm text-orange-800 mb-2">
                  អ្នកកំពុងប្រើពាក្យសម្ងាត់លំនាំដើម (លេខទូរសព្ទ)។
                  នេះ​មិន​មាន​សុវត្ថិភាព​ទេ។
                </p>
              </div>
            </div>
          </div>

          {/* Deadline Display */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4 text-center">
            <Clock className="w-6 h-6 text-blue-600 mx-auto mb-2" />
            <p className="text-sm text-blue-900 font-medium mb-1">
              កំណត់ពេល | Deadline
            </p>
            <p className="text-xl font-bold text-blue-600">
              {daysRemaining} ថ្ងៃ | {daysRemaining} Days
            </p>
            <p className="text-xs text-blue-700 mt-1">
              បន្ទាប់ពីនោះ គណនីនឹងត្រូវបិទ
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={onChangeNow}
              className="w-full px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold text-md hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              ប្តូរពាក្យសម្ងាត់ឥឡូវនេះ
            </button>

            <button
              onClick={onRemindLater}
              className="w-full px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
            >
              រំលឹកខ្ញុំពេលក្រោយ | Remind Me Later
            </button>
          </div>

          {/* Footer Note */}
          <p className="text-xs text-gray-500 text-center mt-4">
            អ្នកនឹងឃើញការរំលឹកនេះរហូតដល់អ្នកប្តូរពាក្យសម្ងាត់
          </p>
        </div>
      </div>
    </div>
  );
}
