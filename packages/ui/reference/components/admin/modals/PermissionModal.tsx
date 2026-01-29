"use client";

import { useState, useEffect } from "react";
import { X, Shield, Crown, AlertTriangle, Check, Loader2 } from "lucide-react";
import { adminManagementApi } from "@/lib/api/admin-management";
import { PERMISSION_CATEGORIES, Permission } from "@/lib/permissions";
import { PermissionBadge } from "../PermissionBadge";

interface PermissionModalProps {
  adminId: string;
  adminName: string;
  isSuperAdmin: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function PermissionModal({
  adminId,
  adminName,
  isSuperAdmin: initialSuperAdmin,
  onClose,
  onSuccess,
}: PermissionModalProps) {
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [isSuperAdmin, setIsSuperAdmin] = useState(initialSuperAdmin);

  useEffect(() => {
    loadPermissions();
  }, [adminId]);

  const loadPermissions = async () => {
    try {
      setLoading(true);
      const data = await adminManagementApi.getAdminPermissions(adminId);
      setSelectedPermissions(data.permissions);
      setIsSuperAdmin(data.isSuperAdmin);
    } catch (err: any) {
      setError(err.message || "Failed to load permissions");
    } finally {
      setLoading(false);
    }
  };

  const togglePermission = (permission: string) => {
    if (isSuperAdmin) return; // Cannot modify Super Admin permissions

    setSelectedPermissions((prev) =>
      prev.includes(permission)
        ? prev.filter((p) => p !== permission)
        : [...prev, permission]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSuperAdmin) {
      setError("Cannot modify Super Admin permissions");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await adminManagementApi.updateAdminPermissions(adminId, {
        permissions: selectedPermissions,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to update permissions");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-white" />
            <div>
              <h2 className="text-xl font-bold text-white">Manage Permissions</h2>
              <p className="text-sm text-white/80">{adminName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {/* Super Admin Notice */}
              {isSuperAdmin && (
                <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-200 rounded-lg p-4 mb-6 flex gap-3">
                  <Crown className="w-6 h-6 text-orange-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-orange-900 mb-1">Super Admin Account</p>
                    <p className="text-sm text-orange-800">
                      This account has all permissions by default. Permissions cannot be modified
                      for Super Admin accounts.
                    </p>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 flex gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              {/* Selected Permissions Summary */}
              {!isSuperAdmin && selectedPermissions.length > 0 && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    Selected Permissions ({selectedPermissions.length})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {selectedPermissions.map((perm) => {
                      const permData = PERMISSION_CATEGORIES.flatMap((cat) =>
                        cat.permissions
                      ).find((p) => p.key === perm);
                      return (
                        <PermissionBadge
                          key={perm}
                          permission={perm}
                          label={permData?.label || perm}
                          onRemove={() => togglePermission(perm)}
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Permission Categories */}
              <div className="space-y-6">
                {PERMISSION_CATEGORIES.map((category) => (
                  <div key={category.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-2xl">{category.icon}</span>
                      <div>
                        <h3 className="font-bold text-gray-900">{category.label}</h3>
                        <p className="text-xs text-gray-500">{category.labelKhmer}</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {category.permissions.map((permission) => {
                        const isSelected = selectedPermissions.includes(permission.key);
                        const isDisabled = isSuperAdmin;

                        return (
                          <label
                            key={permission.key}
                            className={`flex items-start gap-3 p-3 rounded-lg border-2 transition-all cursor-pointer ${
                              isDisabled
                                ? "bg-gray-50 border-gray-200 cursor-not-allowed opacity-60"
                                : isSelected
                                ? "bg-indigo-50 border-indigo-300 hover:bg-indigo-100"
                                : "border-gray-200 hover:bg-gray-50"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected || isSuperAdmin}
                              onChange={() => togglePermission(permission.key)}
                              disabled={isDisabled}
                              className="mt-1 w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 disabled:opacity-50"
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-900">
                                  {permission.label}
                                </span>
                                {isSelected && !isDisabled && (
                                  <Check className="w-4 h-4 text-indigo-600" />
                                )}
                              </div>
                              <p className="text-xs text-gray-500 mt-0.5">
                                {permission.labelKhmer}
                              </p>
                              {permission.description && (
                                <p className="text-xs text-gray-600 mt-1">
                                  {permission.description}
                                </p>
                              )}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-6 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                >
                  Cancel
                </button>
                {!isSuperAdmin && (
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Shield className="w-5 h-5" />
                        Save Permissions
                      </>
                    )}
                  </button>
                )}
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
