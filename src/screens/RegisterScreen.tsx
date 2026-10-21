import React, { useRef, useState } from 'react';
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Phone,
  GraduationCap,
  Building2,
  BookOpen,
  Calendar,
  Home,
  Camera,
  Check,
  AlertCircle,
  Loader2,
  ChevronLeft,
  ShieldCheck,
} from 'lucide-react';
import { RegistrationFormData } from '../types';
import { SUPPORTED_COUNTRY_CODES, validateRegistration } from '../utils/auth';

interface RegisterScreenProps {
  onBack: () => void;
  onGoToSignIn: () => void;
  onSubmit: (data: RegistrationFormData) => Promise<{ success: boolean; errorMessage?: string }>;
  isLoading: boolean;
}

const STUDY_YEARS = [
  '1st Year',
  '2nd Year',
  '3rd Year',
  '4th Year',
  '5th Year / Dual Degree',
  'Postgraduate (Masters / PhD)',
  'Faculty / Campus Staff',
  'Other',
];

export const RegisterScreen: React.FC<RegisterScreenProps> = ({
  onBack,
  onGoToSignIn,
  onSubmit,
  isLoading,
}) => {
  // Required credentials
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Optional contact & profile info
  const [countryCode, setCountryCode] = useState('+91');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isStudent, setIsStudent] = useState(true);
  const [enrollmentNumber, setEnrollmentNumber] = useState('');
  const [university, setUniversity] = useState('');
  const [course, setCourse] = useState('');
  const [yearOfStudy, setYearOfStudy] = useState('');
  const [batchYear, setBatchYear] = useState('');
  const [roomOrFlatNo, setRoomOrFlatNo] = useState('');
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [consentAccepted, setConsentAccepted] = useState(true);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setProfilePhoto(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    const formData: RegistrationFormData = {
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      password,
      confirmPassword,
      phoneNumber: phoneNumber.trim() || undefined,
      countryCode,
      isStudent,
      enrollmentNumber: enrollmentNumber.trim() || undefined,
      university: university.trim() || undefined,
      course: course.trim() || undefined,
      yearOfStudy: yearOfStudy || undefined,
      batchYear: batchYear.trim() || undefined,
      roomOrFlatNo: roomOrFlatNo.trim() || undefined,
      profilePhoto: profilePhoto || undefined,
      consentAccepted,
    };

    const validation = validateRegistration(formData);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }
    setErrors({});

    const res = await onSubmit(formData);
    if (!res.success && res.errorMessage) {
      setServerError(res.errorMessage);
    }
  };

  return (
    <div className="pb-24 animate-in fade-in duration-150 max-w-md mx-auto">
      {/* Top Header Navigation */}
      <div className="flex items-center justify-between mb-5">
        <button
          onClick={onBack}
          aria-label="Back"
          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-700 shadow-xs active:scale-95 transition-all hover:bg-slate-50"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Create Account
        </span>

        <button
          onClick={onGoToSignIn}
          className="text-xs font-bold text-emerald-700 hover:text-emerald-800"
        >
          Sign In
        </button>
      </div>

      <div className="bg-white rounded-3xl p-6 shadow-xs border border-slate-200/80 space-y-6">
        <div className="flex items-center gap-3.5 pb-1">
          <img
            src="/assets/aistudio/DhobiGo_Laundry_App_Icon_da4ef6c9.png"
            alt="DhobiGo"
            className="w-12 h-12 rounded-2xl object-cover shadow-xs border border-emerald-100 shrink-0"
          />
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight leading-none">Create Account</h2>
            <p className="text-xs text-slate-500 mt-1 leading-snug">
              Private laundry vault with zero cross-account leakage
            </p>
          </div>
        </div>

        {/* Server Error Alert */}
        {serverError && (
          <div className="p-3.5 bg-rose-50 rounded-2xl border border-rose-200 text-xs text-rose-900 flex items-start gap-2.5 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span>{serverError}</span>
              {serverError.toLowerCase().includes('already registered') && (
                <button
                  type="button"
                  onClick={onGoToSignIn}
                  className="font-bold text-emerald-700 hover:text-emerald-800 block underline mt-0.5"
                >
                  Sign in with this email instead →
                </button>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Avatar Upload */}
          <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-2xl border border-slate-200/70">
            <div className="relative">
              {profilePhoto ? (
                <img
                  src={profilePhoto}
                  alt="Profile Preview"
                  className="w-14 h-14 rounded-2xl object-cover border border-slate-200 shadow-2xs"
                />
              ) : (
                <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-lg border border-emerald-200 shadow-2xs">
                  {fullName ? fullName.charAt(0).toUpperCase() : <User className="w-6 h-6" />}
                </div>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs active:scale-90 transition-transform"
                title="Add profile photo"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoChange}
              />
            </div>

            <div className="flex-1">
              <span className="text-xs font-bold text-slate-800 block">Profile Picture</span>
              <span className="text-[11px] text-slate-500 block">
                Optional. Helps identify your laundry chits.
              </span>
            </div>
          </div>

          {/* REQUIRED CREDENTIALS SECTION */}
          <div className="space-y-3.5">
            <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
              Required Account Credentials
            </span>

            {/* Full Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Full Name *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    if (errors.fullName) setErrors((prev) => ({ ...prev, fullName: '' }));
                  }}
                  placeholder="e.g. Rahul Sharma"
                  className={`w-full pl-10 pr-3.5 py-2.5 rounded-2xl border ${
                    errors.fullName ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200'
                  } text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all`}
                />
              </div>
              {errors.fullName && (
                <p className="text-[11px] font-medium text-rose-600 mt-1">{errors.fullName}</p>
              )}
            </div>

            {/* Email Address */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Email Address *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) setErrors((prev) => ({ ...prev, email: '' }));
                  }}
                  placeholder="name@example.com"
                  autoComplete="email"
                  className={`w-full pl-10 pr-3.5 py-2.5 rounded-2xl border ${
                    errors.email ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200'
                  } text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all`}
                />
              </div>
              {errors.email && (
                <p className="text-[11px] font-medium text-rose-600 mt-1">{errors.email}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Password *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) setErrors((prev) => ({ ...prev, password: '' }));
                  }}
                  placeholder="At least 6 characters"
                  autoComplete="new-password"
                  className={`w-full pl-10 pr-11 py-2.5 rounded-2xl border ${
                    errors.password ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200'
                  } text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-[11px] font-medium text-rose-600 mt-1">{errors.password}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Confirm Password *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: '' }));
                  }}
                  placeholder="Re-enter your password"
                  autoComplete="new-password"
                  className={`w-full pl-10 pr-11 py-2.5 rounded-2xl border ${
                    errors.confirmPassword ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200'
                  } text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-[11px] font-medium text-rose-600 mt-1">{errors.confirmPassword}</p>
              )}
            </div>
          </div>

          {/* OPTIONAL CONTACT & CAMPUS DETAILS SECTION */}
          <div className="space-y-3.5 pt-3 border-t border-slate-100">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Optional Contact & Campus Profile
            </span>

            {/* Optional Phone Number */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mobile Number (Optional)
              </label>
              <div className="flex items-center gap-2">
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="w-24 px-2 py-2.5 rounded-2xl border border-slate-200 text-xs font-semibold text-slate-800 bg-slate-50/50 focus:outline-none"
                >
                  {SUPPORTED_COUNTRY_CODES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.flag} {c.code}
                    </option>
                  ))}
                </select>

                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Phone className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="10-digit number"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-2xl border border-slate-200 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>
              {errors.phoneNumber && (
                <p className="text-[11px] font-medium text-rose-600 mt-1">{errors.phoneNumber}</p>
              )}
            </div>

            {/* Student Toggle */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-900 block">Student or Campus Member?</span>
                <span className="text-[11px] text-slate-500 block">
                  Enables roll number and university fields for hostel laundry chits.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsStudent((v) => !v)}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                  isStudent ? 'bg-emerald-600' : 'bg-slate-300'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    isStudent ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Student Specific Fields */}
            {isStudent && (
              <div className="space-y-3 p-3.5 bg-emerald-50/50 rounded-2xl border border-emerald-100 animate-in fade-in">
                {/* Enrollment Number */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Enrollment / Student Roll Number
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <GraduationCap className="w-3.5 h-3.5" />
                    </div>
                    <input
                      type="text"
                      value={enrollmentNumber}
                      onChange={(e) => setEnrollmentNumber(e.target.value)}
                      placeholder="e.g. 2024CSB1012"
                      className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 bg-white"
                    />
                  </div>
                </div>

                {/* University / College */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    University / College Name
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Building2 className="w-3.5 h-3.5" />
                    </div>
                    <input
                      type="text"
                      value={university}
                      onChange={(e) => setUniversity(e.target.value)}
                      placeholder="e.g. IIT Bombay / Delhi University"
                      className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 bg-white"
                    />
                  </div>
                </div>

                {/* Course & Year */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Course / Branch
                    </label>
                    <input
                      type="text"
                      value={course}
                      onChange={(e) => setCourse(e.target.value)}
                      placeholder="e.g. B.Tech CSE"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Year of Study
                    </label>
                    <select
                      value={yearOfStudy}
                      onChange={(e) => setYearOfStudy(e.target.value)}
                      className="w-full px-2 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 bg-white"
                    >
                      <option value="">Select Year</option>
                      {STUDY_YEARS.map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Batch & Room */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Graduation Batch
                    </label>
                    <input
                      type="text"
                      value={batchYear}
                      onChange={(e) => setBatchYear(e.target.value)}
                      placeholder="e.g. 2026"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Hostel / Room No.
                    </label>
                    <input
                      type="text"
                      value={roomOrFlatNo}
                      onChange={(e) => setRoomOrFlatNo(e.target.value)}
                      placeholder="e.g. H-4, Rm 302"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 bg-white"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Consent Checkbox */}
          <div className="pt-2">
            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={consentAccepted}
                onChange={(e) => setConsentAccepted(e.target.checked)}
                className="w-4 h-4 mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-[11px] text-slate-600 leading-snug">
                I agree to the DhobiGo Privacy Terms. Laundry data and photos will remain privately isolated to my user account on this device.
              </span>
            </label>
            {errors.consent && (
              <p className="text-[11px] font-medium text-rose-600 mt-1">{errors.consent}</p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full min-h-[50px] rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-600/25 active:scale-95 transition-all"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Creating Account...</span>
              </>
            ) : (
              <>
                <span>Complete Registration</span>
                <Check className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="pt-2 border-t border-slate-100 flex items-center justify-center gap-2 text-[11px] text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>No OTP delays • Encrypted password security</span>
        </div>
      </div>
    </div>
  );
};
