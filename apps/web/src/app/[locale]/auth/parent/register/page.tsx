'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { 
  UserPlus, 
  AlertCircle, 
  CheckCircle2, 
  Eye, 
  EyeOff,
  Phone,
  User,
  Mail,
  Lock,
  Users,
  Search,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';
import { TokenManager } from '@/lib/api/auth';

const AUTH_SERVICE_URL = process.env.NEXT_PUBLIC_AUTH_SERVICE_URL || 'http://localhost:3001';

interface Student {
  id: string;
  studentId: string;
  firstName: string;
  lastName: string;
  khmerName: string;
  className?: string;
  grade?: string;
}

export default function ParentRegisterPage({ params: { locale } }: { params: { locale: string } }) {
  const router = useRouter();
  
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Step 1: Find Student
  const [searchType, setSearchType] = useState<'phone' | 'studentId'>('phone');
  const [searchValue, setSearchValue] = useState('');
  const [searchResults, setSearchResults] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  
  // Step 2: Parent Information
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    khmerName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    relationship: 'FATHER' as 'FATHER' | 'MOTHER' | 'GUARDIAN' | 'OTHER',
  });
  const [showPassword, setShowPassword] = useState(false);

  // Check if already logged in
  useEffect(() => {
    const token = TokenManager.getAccessToken();
    if (token) {
      const userData = TokenManager.getUserData();
      if (userData.user?.role === 'PARENT') {
        router.replace(`/${locale}/parent`);
      } else {
        router.replace(`/${locale}/dashboard`);
      }
    }
  }, [locale, router]);

  // Search for student
  const handleSearch = async () => {
    if (!searchValue.trim()) {
      setError('Please enter a search value');
      return;
    }
    
    setLoading(true);
    setError('');
    setSearchResults([]);
    
    try {
      const response = await fetch(
        `${AUTH_SERVICE_URL}/auth/parent/find-student?${searchType}=${encodeURIComponent(searchValue)}`,
        { method: 'GET' }
      );
      
      const data = await response.json();
      
      if (data.success && data.data?.students?.length > 0) {
        setSearchResults(data.data.students);
      } else {
        setError('No student found. Please check the information and try again.');
      }
    } catch (err: any) {
      setError('Failed to search. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Select student and move to step 2
  const handleSelectStudent = (student: Student) => {
    setSelectedStudent(student);
    setStep(2);
    setError('');
  };

  // Handle form input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Handle registration
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedStudent) {
      setError('Please select a student first');
      return;
    }
    
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(`${AUTH_SERVICE_URL}/auth/parent/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          studentId: selectedStudent.id,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSuccess('Registration successful! Please login with your credentials.');
        setTimeout(() => {
          router.push(`/${locale}/auth/parent/login`);
        }, 2000);
      } else {
        setError(data.error || 'Registration failed');
      }
    } catch (err: any) {
      setError('Failed to register. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center px-4 py-8">
      <div className="max-w-lg w-full">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <img 
              src="/logo.png" 
              alt="Stunity Enterprise" 
              className="h-16 w-auto"
            />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Parent Registration</h1>
          <p className="text-gray-600 mt-2">Register to track your child's academic progress</p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-4 mb-8">
          <div className={`flex items-center gap-2 ${step >= 1 ? 'text-green-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-green-600 text-white' : 'bg-gray-200'}`}>
              {step > 1 ? <CheckCircle2 className="w-5 h-5" /> : '1'}
            </div>
            <span className="text-sm font-medium">Find Student</span>
          </div>
          <div className={`h-px w-12 ${step >= 2 ? 'bg-green-600' : 'bg-gray-300'}`} />
          <div className={`flex items-center gap-2 ${step >= 2 ? 'text-green-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-green-600 text-white' : 'bg-gray-200'}`}>
              2
            </div>
            <span className="text-sm font-medium">Your Info</span>
          </div>
        </div>

        {/* Success Message */}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <p className="text-green-800 text-sm">{success}</p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {/* Step 1: Find Student */}
        {step === 1 && (
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Find Your Child</h2>
            <p className="text-gray-600 text-sm mb-6">
              Search by your phone number (registered with the school) or your child's student ID.
            </p>

            {/* Search Type Toggle */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setSearchType('phone')}
                className={`flex-1 py-2.5 px-4 rounded-lg font-medium text-sm transition-all ${
                  searchType === 'phone'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Phone className="w-4 h-4 inline mr-2" />
                By Phone
              </button>
              <button
                onClick={() => setSearchType('studentId')}
                className={`flex-1 py-2.5 px-4 rounded-lg font-medium text-sm transition-all ${
                  searchType === 'studentId'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <User className="w-4 h-4 inline mr-2" />
                By Student ID
              </button>
            </div>

            {/* Search Input */}
            <div className="flex gap-2 mb-6">
              <input
                type={searchType === 'phone' ? 'tel' : 'text'}
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                placeholder={searchType === 'phone' ? 'Enter phone number' : 'Enter student ID'}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <button
                onClick={handleSearch}
                disabled={loading}
                className="px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Search className="w-5 h-5" />
                )}
              </button>
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm text-gray-600 font-medium">Select your child:</p>
                {searchResults.map((student) => (
                  <button
                    key={student.id}
                    onClick={() => handleSelectStudent(student)}
                    className="w-full p-4 border border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-all text-left flex items-center justify-between"
                  >
                    <div>
                      <p className="font-semibold text-gray-900">{student.khmerName}</p>
                      <p className="text-sm text-gray-600">
                        {student.firstName} {student.lastName} • ID: {student.studentId || 'N/A'}
                      </p>
                      {student.className && (
                        <p className="text-sm text-gray-500">Class: {student.className}</p>
                      )}
                    </div>
                    <ArrowRight className="w-5 h-5 text-green-600" />
                  </button>
                ))}
              </div>
            )}

            <div className="mt-6 text-center">
              <Link
                href={`/${locale}/auth/parent/login`}
                className="text-green-600 hover:text-green-700 text-sm font-medium"
              >
                Already have an account? Login
              </Link>
            </div>
          </div>
        )}

        {/* Step 2: Parent Information */}
        {step === 2 && selectedStudent && (
          <div className="bg-white rounded-2xl shadow-xl p-8">
            {/* Selected Student */}
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-600 font-medium mb-1">Registering for:</p>
              <p className="font-semibold text-gray-900">{selectedStudent.khmerName}</p>
              <p className="text-sm text-gray-600">{selectedStudent.firstName} {selectedStudent.lastName}</p>
            </div>

            <h2 className="text-xl font-semibold text-gray-900 mb-6">Your Information</h2>

            <form onSubmit={handleRegister} className="space-y-4">
              {/* Name Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                  <input
                    name="firstName"
                    type="text"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                  <input
                    name="lastName"
                    type="text"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Khmer Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Khmer Name</label>
                <input
                  name="khmerName"
                  type="text"
                  value={formData.khmerName}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  style={{ fontFamily: 'Battambang, sans-serif' }}
                />
              </div>

              {/* Relationship */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Relationship</label>
                <select
                  name="relationship"
                  value={formData.relationship}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="FATHER">Father / ឪពុក</option>
                  <option value="MOTHER">Mother / ម្តាយ</option>
                  <option value="GUARDIAN">Guardian / អាណាព្យាបាល</option>
                  <option value="OTHER">Other / ផ្សេងទៀត</option>
                </select>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <input
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="012345678"
                />
              </div>

              {/* Email (Optional) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email <span className="text-gray-400">(Optional)</span>
                </label>
                <input
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="parent@example.com"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <div className="relative">
                  <input
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                    minLength={8}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent pr-10"
                    placeholder="Min. 8 characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                <input
                  name="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <UserPlus className="w-5 h-5" />
                      Register
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Back to Login */}
        <div className="mt-6 text-center">
          <Link
            href={`/${locale}/auth/login`}
            className="text-gray-600 hover:text-gray-700 text-sm"
          >
            ← Back to main login
          </Link>
        </div>
      </div>
    </div>
  );
}
