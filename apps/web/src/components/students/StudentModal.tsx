'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Upload, Camera } from 'lucide-react';
import { createStudent, updateStudent, uploadStudentPhoto, type Student, type CreateStudentInput } from '@/lib/api/students';

interface StudentModalProps {
  student: Student | null;
  onClose: (refresh?: boolean) => void;
}

export default function StudentModal({ student, onClose }: StudentModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
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
      // Set existing photo as preview
      if (student.photoUrl) {
        const STUDENT_SERVICE_URL = process.env.NEXT_PUBLIC_STUDENT_SERVICE_URL || 'http://localhost:3003';
        setPhotoPreview(`${STUDENT_SERVICE_URL}${student.photoUrl}`);
      }
    }
  }, [student]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }
      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Image size must be less than 5MB');
        return;
      }
      setPhotoFile(file);
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      setError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let savedStudent: Student;
      
      if (student) {
        const result = await updateStudent(student.id, formData);
        savedStudent = result.data.student;
      } else {
        const result = await createStudent(formData);
        savedStudent = result.data.student;
      }

      // Upload photo if a new one was selected
      if (photoFile && savedStudent.id) {
        await uploadStudentPhoto(savedStudent.id, photoFile);
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

          {/* Photo Upload */}
          <div className="flex flex-col items-center space-y-4 p-6 bg-gray-50 rounded-lg">
            <div className="relative">
              {photoPreview ? (
                <div className="relative group">
                  <img
                    src={photoPreview}
                    alt="Student photo"
                    className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Camera className="w-8 h-8 text-white" />
                  </button>
                </div>
              ) : (
                <div className="w-32 h-32 rounded-full bg-gray-200 border-4 border-white shadow-lg flex items-center justify-center">
                  <Camera className="w-12 h-12 text-gray-400" />
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Upload className="w-4 h-4" />
              <span className="text-sm font-medium">
                {photoPreview ? 'Change Photo' : 'Upload Photo'}
              </span>
            </button>
            <p className="text-xs text-gray-500">
              PNG, JPG, GIF up to 5MB
            </p>
          </div>

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
