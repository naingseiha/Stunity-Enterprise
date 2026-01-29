'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { createStudent, updateStudent, type Student, type CreateStudentInput } from '@/lib/api/students';

interface StudentModalProps {
  student: Student | null;
  onClose: (refresh?: boolean) => void;
}

export default function StudentModal({ student, onClose }: StudentModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState<CreateStudentInput>({
    firstNameLatin: '',
    lastNameLatin: '',
    firstNameKhmer: '',
    lastNameKhmer: '',
    gender: 'MALE',
    dateOfBirth: '',
    placeOfBirth: '',
    currentAddress: '',
    phoneNumber: '',
    email: '',
  });

  useEffect(() => {
    if (student) {
      setFormData({
        firstNameLatin: student.firstNameLatin,
        lastNameLatin: student.lastNameLatin,
        firstNameKhmer: student.firstNameKhmer || '',
        lastNameKhmer: student.lastNameKhmer || '',
        gender: student.gender as 'MALE' | 'FEMALE',
        dateOfBirth: student.dateOfBirth.split('T')[0],
        placeOfBirth: student.placeOfBirth || '',
        currentAddress: student.currentAddress || '',
        phoneNumber: student.phoneNumber || '',
        email: student.email || '',
      });
    }
  }, [student]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (student) {
        await updateStudent(student.id, formData);
      } else {
        await createStudent(formData);
      }
      onClose(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">
            {student ? 'Edit Student' : 'Add New Student'}
          </h2>
          <button
            onClick={() => onClose()}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
              {error}
            </div>
          )}

          {/* Latin Names */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                First Name (Latin) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="firstNameLatin"
                value={formData.firstNameLatin}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-stunity-primary-500 focus:border-transparent"
                placeholder="John"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Last Name (Latin) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="lastNameLatin"
                value={formData.lastNameLatin}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-stunity-primary-500 focus:border-transparent"
                placeholder="Doe"
              />
            </div>
          </div>

          {/* Khmer Names */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                First Name (Khmer)
              </label>
              <input
                type="text"
                name="firstNameKhmer"
                value={formData.firstNameKhmer}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-stunity-primary-500 focus:border-transparent"
                placeholder="ចន"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Last Name (Khmer)
              </label>
              <input
                type="text"
                name="lastNameKhmer"
                value={formData.lastNameKhmer}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-stunity-primary-500 focus:border-transparent"
                placeholder="សុខា"
              />
            </div>
          </div>

          {/* Gender and DOB */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Gender <span className="text-red-500">*</span>
              </label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-stunity-primary-500 focus:border-transparent"
              >
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date of Birth <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="dateOfBirth"
                value={formData.dateOfBirth}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-stunity-primary-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Place of Birth */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Place of Birth
            </label>
            <input
              type="text"
              name="placeOfBirth"
              value={formData.placeOfBirth}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-stunity-primary-500 focus:border-transparent"
              placeholder="Phnom Penh, Cambodia"
            />
          </div>

          {/* Current Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Current Address
            </label>
            <input
              type="text"
              name="currentAddress"
              value={formData.currentAddress}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-stunity-primary-500 focus:border-transparent"
              placeholder="123 Main St, Phnom Penh"
            />
          </div>

          {/* Phone and Email */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-stunity-primary-500 focus:border-transparent"
                placeholder="+855 12 345 678"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-stunity-primary-500 focus:border-transparent"
                placeholder="student@example.com"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-4 pt-4 border-t">
            <button
              type="button"
              onClick={() => onClose()}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-stunity-primary-600 text-white rounded-lg hover:bg-stunity-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              {student ? 'Update Student' : 'Create Student'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
