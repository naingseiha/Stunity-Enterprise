"use client";

import {
  Edit, Trash, Link as LinkIcon, Key,
  UserCheck, Shield, Users
} from "lucide-react";

interface Parent {
  id: string;
  parentId: string;
  khmerName: string;
  phone: string;
  email?: string;
  relationship: string;
  isAccountActive: boolean;
  user?: {
    id: string;
    isActive: boolean;
  };
  studentParents: Array<{
    student: {
      id: string;
      khmerName: string;
    };
  }>;
}

interface ParentTableProps {
  parents: Parent[];
  onEdit: (parent: Parent) => void;
  onLink: (parent: Parent) => void;
  onCreateAccount: (parent: Parent) => void;
  onResetPassword: (parent: Parent) => void;
  onToggleStatus: (parent: Parent) => void;
  onDelete: (parent: Parent) => void;
}

export default function ParentTable({
  parents,
  onEdit,
  onLink,
  onCreateAccount,
  onResetPassword,
  onToggleStatus,
  onDelete,
}: ParentTableProps) {
  const getRelationshipText = (relationship: string) => {
    const map: Record<string, string> = {
      FATHER: "ឪពុក",
      MOTHER: "ម្តាយ",
      GUARDIAN: "អាណាព្យាបាល",
      STEP_FATHER: "ឪពុកចុង",
      STEP_MOTHER: "ម្តាយចុង",
      GRANDPARENT: "ជីតា/យាយ",
      OTHER: "ផ្សេងៗ",
    };
    return map[relationship] || relationship;
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-purple-50 to-pink-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 text-left font-khmer-body text-sm font-bold text-gray-700">
                លេខសម្គាល់
              </th>
              <th className="px-6 py-4 text-left font-khmer-body text-sm font-bold text-gray-700">
                ឈ្មោះ
              </th>
              <th className="px-6 py-4 text-left font-khmer-body text-sm font-bold text-gray-700">
                តួនាទី
              </th>
              <th className="px-6 py-4 text-left font-khmer-body text-sm font-bold text-gray-700">
                កូន
              </th>
              <th className="px-6 py-4 text-center font-khmer-body text-sm font-bold text-gray-700">
                ចំនួនកូន
              </th>
              <th className="px-6 py-4 text-center font-khmer-body text-sm font-bold text-gray-700">
                គណនី
              </th>
              <th className="px-6 py-4 text-right font-khmer-body text-sm font-bold text-gray-700">
                សកម្មភាព
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {parents.map((parent) => (
              <tr
                key={parent.id}
                className="hover:bg-purple-50/50 transition-colors"
              >
                <td className="px-6 py-4 font-khmer-body text-sm text-gray-600">
                  {parent.parentId}
                </td>
                <td className="px-6 py-4">
                  <div>
                    <p className="font-khmer-body font-medium text-gray-900">
                      {parent.khmerName}
                    </p>
                    <p className="font-khmer-body text-sm text-gray-500">
                      {parent.phone}
                    </p>
                    {parent.email && (
                      <p className="text-xs text-gray-400">{parent.email}</p>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 font-khmer-body text-sm text-gray-700">
                  {getRelationshipText(parent.relationship)}
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col gap-1">
                    {parent.studentParents.slice(0, 2).map((sp) => (
                      <span
                        key={sp.student.id}
                        className="font-khmer-body text-xs text-gray-600"
                      >
                        • {sp.student.khmerName}
                      </span>
                    ))}
                    {parent.studentParents.length > 2 && (
                      <span className="text-xs text-gray-400">
                        + {parent.studentParents.length - 2} ទៀត
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className="inline-flex items-center justify-center w-8 h-8
                    rounded-full bg-purple-100 text-purple-700 font-bold text-sm">
                    {parent.studentParents.length}
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  {parent.user ? (
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full
                        text-xs font-medium ${
                          parent.user.isActive
                            ? "bg-green-100 text-green-800 border border-green-200"
                            : "bg-red-100 text-red-800 border border-red-200"
                        }`}
                    >
                      {parent.user.isActive ? "សកម្ម" : "អសកម្ម"}
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-3 py-1 rounded-full
                      text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                      គ្មានគណនី
                    </span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <div className="flex justify-end gap-2">
                    {/* Edit */}
                    <button
                      onClick={() => onEdit(parent)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg
                        transition-colors"
                      title="កែប្រែ"
                    >
                      <Edit className="w-4 h-4" />
                    </button>

                    {/* Link Student */}
                    <button
                      onClick={() => onLink(parent)}
                      className="p-2 text-green-600 hover:bg-green-50 rounded-lg
                        transition-colors"
                      title="ភ្ជាប់សិស្ស"
                    >
                      <LinkIcon className="w-4 h-4" />
                    </button>

                    {/* Account Operations */}
                    {!parent.user ? (
                      <button
                        onClick={() => onCreateAccount(parent)}
                        className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg
                          transition-colors"
                        title="បង្កើតគណនី"
                      >
                        <UserCheck className="w-4 h-4" />
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => onResetPassword(parent)}
                          className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg
                            transition-colors"
                          title="ប្តូរពាក្យសម្ងាត់"
                        >
                          <Key className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onToggleStatus(parent)}
                          className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg
                            transition-colors"
                          title={parent.user.isActive ? "បិទគណនី" : "បើកគណនី"}
                        >
                          <Shield className="w-4 h-4" />
                        </button>
                      </>
                    )}

                    {/* Delete */}
                    <button
                      onClick={() => onDelete(parent)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg
                        transition-colors"
                      title="លុប"
                    >
                      <Trash className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {parents.length === 0 && (
          <div className="text-center py-16 font-khmer-body text-gray-500 bg-gray-50">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p>មិនមានទិន្នន័យ</p>
          </div>
        )}
      </div>
    </div>
  );
}
