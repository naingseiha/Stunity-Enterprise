"use client";

import { Bell, AlertCircle, Calendar, TrendingDown, Award } from "lucide-react";

export default function ParentNotificationsTab() {
  return (
    <div className="space-y-4">
      {/* Coming Soon Card */}
      <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
        <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <Bell className="w-10 h-10 text-indigo-600" />
        </div>
        <h3 className="text-xl font-semibold text-gray-800 mb-2">
          មុខងារនេះនឹងមានឆាប់ៗនេះ
        </h3>
        <p className="text-gray-600 mb-1">Coming Soon</p>
        <p className="text-sm text-gray-500">
          Notification feature is under development
        </p>
      </div>

      {/* Future Features Preview */}
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          មុខងារដែលនឹងមាន
        </h3>
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
            <div className="p-2 bg-red-50 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-800">ការជូនដំណឹងពិន្ទុទាប</p>
              <p className="text-sm text-gray-600 mt-1">
                Low grades alerts
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
            <div className="p-2 bg-orange-50 rounded-lg">
              <Calendar className="w-5 h-5 text-orange-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-800">ការជូនដំណឹងអវត្តមាន</p>
              <p className="text-sm text-gray-600 mt-1">
                Absence notifications
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
            <div className="p-2 bg-yellow-50 rounded-lg">
              <TrendingDown className="w-5 h-5 text-yellow-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-800">ការជូនដំណឹងការធ្លាក់ចុះ</p>
              <p className="text-sm text-gray-600 mt-1">
                Performance decline alerts
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
            <div className="p-2 bg-green-50 rounded-lg">
              <Award className="w-5 h-5 text-green-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-800">ការជូនដំណឹងសមិទ្ធផល</p>
              <p className="text-sm text-gray-600 mt-1">
                Achievement notifications
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Bell className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-800">ប្រកាសសាលា</p>
              <p className="text-sm text-gray-600 mt-1">
                School announcements
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
        <div className="flex gap-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div>
            <p className="font-medium text-blue-900 mb-1">
              អ្នកនឹងទទួលបានការជូនដំណឹង
            </p>
            <p className="text-sm text-blue-800">
              You will receive notifications about:
            </p>
            <ul className="text-sm text-blue-700 mt-2 space-y-1 list-disc list-inside">
              <li>ពិន្ទុថ្មី (New grades)</li>
              <li>អវត្តមាន (Absences)</li>
              <li>ការប្រកាសសំខាន់ (Important announcements)</li>
              <li>កាលវិភាគប្រឡង (Exam schedules)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
