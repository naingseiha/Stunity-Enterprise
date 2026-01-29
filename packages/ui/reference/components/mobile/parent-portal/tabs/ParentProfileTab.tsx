"use client";

import { useState } from "react";
import { ParentProfile } from "@/lib/api/parent-portal";
import {
  User,
  Phone,
  Mail,
  MapPin,
  Briefcase,
  Key,
  Users,
  LogOut,
  Edit,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface ParentProfileTabProps {
  profile: ParentProfile | null;
  onRefresh: () => Promise<void>;
  onChangePassword: () => void;
}

export default function ParentProfileTab({
  profile,
  onRefresh,
  onChangePassword,
}: ParentProfileTabProps) {
  const { logout } = useAuth();
  const [isEditing, setIsEditing] = useState(false);

  if (!profile) {
    return (
      <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
        <p className="text-gray-600">កំពុងផ្ទុកព័ត៌មាន...</p>
      </div>
    );
  }

  const parentInfo = profile.parentInfo;

  const getRelationshipText = (relationship: string) => {
    switch (relationship) {
      case "FATHER":
        return "ឪពុក";
      case "MOTHER":
        return "ម្តាយ";
      case "GUARDIAN":
        return "អាណាព្យាបាល";
      case "STEP_FATHER":
        return "ឪពុកចុង";
      case "STEP_MOTHER":
        return "ម្តាយចុង";
      case "GRANDPARENT":
        return "ជីតា/យាយ/តា/យយ";
      case "OTHER":
        return "ផ្សេងៗ";
      default:
        return relationship;
    }
  };

  return (
    <div className="space-y-4">
      {/* Profile Header */}
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-800">
            ព័ត៌មានផ្ទាល់ខ្លួន
          </h2>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
          >
            <Edit className="w-5 h-5" />
          </button>
        </div>

        {/* Parent ID Badge */}
        {parentInfo.parentId && (
          <div className="mb-4 px-3 py-2 bg-indigo-50 rounded-xl inline-block">
            <p className="text-sm text-indigo-700 font-medium">
              ID: {parentInfo.parentId}
            </p>
          </div>
        )}

        {/* Profile Information */}
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-indigo-50 rounded-lg">
              <User className="w-5 h-5 text-indigo-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-600">ឈ្មោះ • Name</p>
              <p className="font-semibold text-gray-800">
                {parentInfo.khmerName}
              </p>
              {parentInfo.englishName && (
                <p className="text-sm text-gray-600 mt-1">
                  {parentInfo.englishName}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Phone className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-600">លេខទូរសព្ទ • Phone</p>
              <p className="font-semibold text-gray-800">{parentInfo.phone}</p>
            </div>
          </div>

          {parentInfo.email && (
            <div className="flex items-start gap-3">
              <div className="p-2 bg-green-50 rounded-lg">
                <Mail className="w-5 h-5 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-600">អ៊ីមែល • Email</p>
                <p className="font-semibold text-gray-800">{parentInfo.email}</p>
              </div>
            </div>
          )}

          {parentInfo.address && (
            <div className="flex items-start gap-3">
              <div className="p-2 bg-purple-50 rounded-lg">
                <MapPin className="w-5 h-5 text-purple-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-600">អាសយដ្ឋាន • Address</p>
                <p className="font-semibold text-gray-800">
                  {parentInfo.address}
                </p>
              </div>
            </div>
          )}

          <div className="flex items-start gap-3">
            <div className="p-2 bg-orange-50 rounded-lg">
              <Users className="w-5 h-5 text-orange-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-600">តួនាទី • Relationship</p>
              <p className="font-semibold text-gray-800">
                {getRelationshipText(parentInfo.relationship)}
              </p>
            </div>
          </div>

          {parentInfo.occupation && (
            <div className="flex items-start gap-3">
              <div className="p-2 bg-yellow-50 rounded-lg">
                <Briefcase className="w-5 h-5 text-yellow-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-600">មុខរបរ • Occupation</p>
                <p className="font-semibold text-gray-800">
                  {parentInfo.occupation}
                </p>
              </div>
            </div>
          )}

          {parentInfo.emergencyPhone && (
            <div className="flex items-start gap-3">
              <div className="p-2 bg-red-50 rounded-lg">
                <Phone className="w-5 h-5 text-red-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-600">
                  លេខទូរស័ព្ទបន្ទាន់ • Emergency Phone
                </p>
                <p className="font-semibold text-gray-800">
                  {parentInfo.emergencyPhone}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Linked Children */}
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          កូនដែលបានភ្ជាប់
        </h3>
        {profile.children.length === 0 ? (
          <p className="text-center text-gray-600 py-4">មិនមានកូនបានភ្ជាប់</p>
        ) : (
          <div className="space-y-3">
            {profile.children.map((child) => (
              <div
                key={child.id}
                className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800">
                      {child.khmerName}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      {child.class?.name || "មិនមានថ្នាក់"} •{" "}
                      {getRelationshipText(child.relationship)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      ID: {child.studentId}
                    </p>
                  </div>
                  {child.isPrimary && (
                    <span className="px-3 py-1 bg-indigo-100 text-indigo-700 text-xs font-medium rounded-full">
                      Primary
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="space-y-3">
        <button
          onClick={onChangePassword}
          className="w-full py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
        >
          <Key className="w-5 h-5" />
          ប្តូរពាក្យសម្ងាត់
        </button>

        <button
          onClick={logout}
          className="w-full py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
        >
          <LogOut className="w-5 h-5" />
          ចាកចេញ
        </button>
      </div>

      {/* Edit Mode Notice (Future Enhancement) */}
      {isEditing && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4">
          <p className="text-sm text-yellow-800">
            មុខងារកែសម្រួលនឹងមានឆាប់ៗនេះ
          </p>
          <p className="text-xs text-yellow-700 mt-1">
            Edit functionality coming soon
          </p>
        </div>
      )}
    </div>
  );
}
