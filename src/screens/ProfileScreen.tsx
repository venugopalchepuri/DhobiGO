import React, { useRef, useState } from 'react';
import {
  User,
  Phone,
  GraduationCap,
  Building2,
  Mail,
  BookOpen,
  Calendar,
  Home,
  Camera,
  Check,
  Edit2,
  LogOut,
  ChevronLeft,
  ShieldCheck,
  Clock,
  AlertTriangle,
  CreditCard,
  ChevronRight,
} from 'lucide-react';
import { IDProofCredential, UserProfile } from '../types';
import { formatLaundryDate } from '../utils/whatsapp';

interface ProfileScreenProps {
  user: UserProfile;
  idProof?: IDProofCredential | null;
  onOpenIDProof?: () => void;
  onBack: () => void;
  onUpdateProfile: (updated: Partial<UserProfile>) => Promise<void>;
  onSignOut: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  user,
  idProof,
  onOpenIDProof,
  onBack,
  onUpdateProfile,
  onSignOut,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState(user.fullName);
  const [phoneNumber, setPhoneNumber] = useState(user.phoneNumber || '');
  const [enrollmentNumber, setEnrollmentNumber] = useState(user.enrollmentNumber || '');
  const [university, setUniversity] = useState(user.university || '');
  const [course, setCourse] = useState(user.course || '');
  const [yearOfStudy, setYearOfStudy] = useState(user.yearOfStudy || '');
  const [batchYear, setBatchYear] = useState(user.batchYear || '');
  const [roomOrFlatNo, setRoomOrFlatNo] = useState(user.roomOrFlatNo || '');
  const [profilePhoto, setProfilePhoto] = useState<string | null>(user.profilePhoto || null);
  const [isSaving, setIsSaving] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

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

  const handleSave = async () => {
    setIsSaving(true);
    await onUpdateProfile({
      fullName: fullName.trim(),
      phoneNumber: phoneNumber.trim() || undefined,
      enrollmentNumber: enrollmentNumber.trim() || undefined,
      university: university.trim() || undefined,
      course: course.trim() || undefined,
      yearOfStudy: yearOfStudy || undefined,
      batchYear: batchYear.trim() || undefined,
      roomOrFlatNo: roomOrFlatNo.trim() || undefined,
      profilePhoto: profilePhoto || undefined,
    });
    setIsSaving(false);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setFullName(user.fullName);
    setPhoneNumber(user.phoneNumber || '');
    setEnrollmentNumber(user.enrollmentNumber || '');
    setUniversity(user.university || '');
    setCourse(user.course || '');
    setYearOfStudy(user.yearOfStudy || '');
    setBatchYear(user.batchYear || '');
    setRoomOrFlatNo(user.roomOrFlatNo || '');
    setProfilePhoto(user.profilePhoto || null);
    setIsEditing(false);
  };

  return (
    <div className="space-y-6 pb-28 animate-in fade-in duration-150 max-w-lg mx-auto">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          aria-label="Back to dashboard"
          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-700 shadow-xs active:scale-95 transition-all hover:bg-slate-50"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <h2 className="text-base font-bold text-slate-900 tracking-tight">Account Profile</h2>

        {isEditing ? (
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleCancel}
              className="px-2.5 py-1 text-xs font-semibold text-slate-500 hover:text-slate-700"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-3 py-1 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 shadow-xs flex items-center gap-1"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Saving...' : 'Save'}</span>
            </button>
          </div>
        ) : (
          <button
            onClick={() => setIsEditing(true)}
            className="min-h-[36px] px-3 flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-2xs"
          >
            <Edit2 className="w-3.5 h-3.5 text-emerald-700" />
            <span>Edit</span>
          </button>
        )}
      </div>

      {/* Main Profile Header Card */}
      <div className="bg-white rounded-3xl p-6 shadow-xs border border-slate-200/80 text-center space-y-4">
        <div className="relative inline-block mx-auto">
          {profilePhoto ? (
            <img
              src={profilePhoto}
              alt={user.fullName}
              className="w-24 h-24 rounded-full object-cover border-4 border-emerald-500/20 shadow-md mx-auto"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-3xl border-4 border-emerald-500/20 shadow-md mx-auto">
              {user.fullName.charAt(0).toUpperCase()}
            </div>
          )}

          {isEditing && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-md active:scale-90 transition-transform"
              title="Change Photo"
            >
              <Camera className="w-4 h-4" />
            </button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhotoChange}
          />
        </div>

        {!isEditing ? (
          <div>
            <h3 className="text-xl font-bold text-slate-900">{user.fullName}</h3>
            <p className="text-xs font-medium text-emerald-700 mt-0.5">{user.email}</p>
            <div className="flex items-center justify-center gap-2 mt-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <ShieldCheck className="w-3 h-3" />
                Account Isolated
              </span>
              <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                ID: {user.userId}
              </span>
            </div>
          </div>
        ) : (
          <div className="max-w-xs mx-auto">
            <label className="block text-xs font-semibold text-slate-700 mb-1 text-left">
              Full Name *
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-900 text-center focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
        )}
      </div>

      {/* Account Security & Identity Card */}
      <div className="bg-white rounded-3xl p-5 shadow-xs border border-slate-200/80 space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
          Account & Credentials
        </h4>

        {/* Verified Account Email */}
        <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-200/70">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-semibold block uppercase">
                Registered Email (Primary Identity)
              </span>
              <span className="font-semibold text-xs text-slate-900">{user.email}</span>
            </div>
          </div>
          <span className="text-[11px] font-bold text-emerald-700 px-2 py-0.5 bg-emerald-50 rounded-md border border-emerald-200">
            Active
          </span>
        </div>

        {/* Contact Mobile */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Mobile Number (Optional)
          </label>
          {isEditing ? (
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+91 9876543210"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          ) : (
            <p className="text-xs text-slate-800 font-medium">{user.phoneNumber || 'Not provided'}</p>
          )}
        </div>

        {/* Room / Flat */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Hostel Room / Apartment Flat
          </label>
          {isEditing ? (
            <input
              type="text"
              value={roomOrFlatNo}
              onChange={(e) => setRoomOrFlatNo(e.target.value)}
              placeholder="e.g. Block C - 204"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          ) : (
            <p className="text-xs text-slate-800 font-medium">
              {user.roomOrFlatNo || 'None provided'}
            </p>
          )}
        </div>
      </div>

      {/* ID Card / Verification Credential Card */}
      <div className="bg-white rounded-3xl p-5 shadow-xs border border-slate-200/80 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                ID Card Proof
              </h4>
              <p className="text-[11px] text-slate-500">
                {idProof ? idProof.idType : 'No ID credential linked yet'}
              </p>
            </div>
          </div>

          {onOpenIDProof && (
            <button
              onClick={onOpenIDProof}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 px-2.5 py-1 rounded-lg border border-emerald-200 bg-emerald-50/50 flex items-center gap-1"
            >
              <span>{idProof ? 'View / Update' : 'Add ID Card'}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {idProof ? (
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/70 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 font-semibold block uppercase">
                  Card Holder & ID #
                </span>
                <span className="text-xs font-bold text-slate-900">
                  {idProof.fullName} • <span className="font-mono text-emerald-700">{idProof.idNumber}</span>
                </span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                {idProof.frontPhotoData ? 'Photo Verified' : 'Details on file'}
              </span>
            </div>

            {idProof.frontPhotoData && (
              <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center gap-2">
                <img
                  src={idProof.frontPhotoData}
                  alt="ID Front Thumbnail"
                  className="w-14 h-9 rounded-lg object-cover border border-slate-300 shadow-2xs"
                />
                <span className="text-[11px] text-slate-500">
                  Front of card saved in encrypted local vault
                </span>
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-slate-500 italic">
            Add your College ID or Office Pass to present at the laundry counter for pickup verification.
          </p>
        )}
      </div>

      {/* Student / Institutional Details Card */}
      <div className="bg-white rounded-3xl p-5 shadow-xs border border-slate-200/80 space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
          Institution / Campus Info
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-0.5">
              Roll / Enrollment #
            </label>
            {isEditing ? (
              <input
                type="text"
                value={enrollmentNumber}
                onChange={(e) => setEnrollmentNumber(e.target.value)}
                placeholder="e.g. 2024CSB101"
                className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900"
              />
            ) : (
              <p className="text-xs font-mono font-bold text-slate-800">
                {user.enrollmentNumber || 'None'}
              </p>
            )}
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-0.5">
              University / College
            </label>
            {isEditing ? (
              <input
                type="text"
                value={university}
                onChange={(e) => setUniversity(e.target.value)}
                placeholder="e.g. IIT Delhi"
                className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900"
              />
            ) : (
              <p className="text-xs font-semibold text-slate-800">
                {user.university || 'None'}
              </p>
            )}
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-0.5">
              Course / Branch
            </label>
            {isEditing ? (
              <input
                type="text"
                value={course}
                onChange={(e) => setCourse(e.target.value)}
                placeholder="e.g. Computer Science"
                className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900"
              />
            ) : (
              <p className="text-xs font-medium text-slate-800">{user.course || 'None'}</p>
            )}
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-0.5">
              Year of Study & Batch
            </label>
            {isEditing ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={yearOfStudy}
                  onChange={(e) => setYearOfStudy(e.target.value)}
                  placeholder="3rd Year"
                  className="w-1/2 px-2 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900"
                />
                <input
                  type="text"
                  value={batchYear}
                  onChange={(e) => setBatchYear(e.target.value)}
                  placeholder="2026"
                  className="w-1/2 px-2 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900"
                />
              </div>
            ) : (
              <p className="text-xs font-medium text-slate-800">
                {user.yearOfStudy ? `${user.yearOfStudy}` : ''}{' '}
                {user.batchYear ? `(Batch of ${user.batchYear})` : ''}
                {!user.yearOfStudy && !user.batchYear ? 'None' : ''}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Account Timestamps & Security Details */}
      <div className="bg-white rounded-3xl p-5 shadow-xs border border-slate-200/80 space-y-2 text-xs text-slate-500">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Account Created:</span>
          </span>
          <span className="font-medium text-slate-800">
            {new Date(user.createdAt).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Last Updated:</span>
          </span>
          <span className="font-medium text-slate-800">
            {new Date(user.updatedAt).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </span>
        </div>
      </div>

      {/* Sign Out Button */}
      <div className="pt-2">
        <button
          onClick={() => setShowSignOutConfirm(true)}
          className="w-full min-h-[48px] rounded-2xl border border-rose-200 bg-white hover:bg-rose-50 text-rose-700 font-bold text-xs flex items-center justify-center gap-2 shadow-xs active:scale-95 transition-all"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out of Account</span>
        </button>
      </div>

      {/* Sign Out Confirmation Modal */}
      {showSignOutConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-xl border border-slate-200/80 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <LogOut className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="text-base font-bold text-slate-900">Sign Out of DhobiGo?</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Your laundry slips and data remain safely isolated on this device. You will need your password to sign in again.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => setShowSignOutConfirm(false)}
                className="min-h-[44px] rounded-xl border border-slate-200 font-bold text-xs text-slate-700 hover:bg-slate-50 active:scale-95 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowSignOutConfirm(false);
                  onSignOut();
                }}
                className="min-h-[44px] rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/20 active:scale-95 transition-all"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
