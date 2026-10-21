import React, { useRef, useState } from 'react';
import {
  X,
  CreditCard,
  Camera,
  RotateCw,
  Sun,
  ShieldCheck,
  Trash2,
  Edit2,
  Check,
  User,
  Phone,
  Home,
  FileText,
  AlertCircle,
  Eye,
} from 'lucide-react';
import { IDProofCredential, IDType } from '../types';

interface IDProofModalProps {
  isOpen: boolean;
  onClose: () => void;
  idProof: IDProofCredential | null;
  onSave: (proof: IDProofCredential) => Promise<void>;
  onDelete?: () => Promise<void>;
  defaultMode?: 'view' | 'edit';
}

const ID_TYPES: IDType[] = [
  'College / Student ID',
  'Employee / Office ID',
  'Aadhaar Card',
  'Driving License',
  'Society / Flat Pass',
  'Voter ID',
  'Passport',
  'Other ID',
];

export const IDProofModal: React.FC<IDProofModalProps> = ({
  isOpen,
  onClose,
  idProof,
  onSave,
  onDelete,
  defaultMode = 'view',
}) => {
  const [mode, setMode] = useState<'view' | 'edit'>(idProof ? defaultMode : 'edit');
  const [activeSide, setActiveSide] = useState<'front' | 'back'>('front');
  const [highContrast, setHighContrast] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Form states
  const [idType, setIdType] = useState<IDType>(idProof?.idType || 'Employee / Office ID');
  const [fullName, setFullName] = useState(idProof?.fullName || '');
  const [idNumber, setIdNumber] = useState(idProof?.idNumber || '');
  const [phoneNumber, setPhoneNumber] = useState(idProof?.phoneNumber || '');
  const [roomOrFlatNo, setRoomOrFlatNo] = useState(idProof?.roomOrFlatNo || '');
  const [notes, setNotes] = useState(idProof?.notes || '');
  const [frontPhotoData, setFrontPhotoData] = useState<string | null>(
    idProof?.frontPhotoData || null
  );
  const [backPhotoData, setBackPhotoData] = useState<string | null>(
    idProof?.backPhotoData || null
  );

  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, side: 'front' | 'back') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (side === 'front') {
          setFrontPhotoData(result);
        } else {
          setBackPhotoData(result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!fullName.trim()) {
      setErrorMsg('Please enter your full name as shown on your ID card.');
      return;
    }
    if (!idNumber.trim()) {
      setErrorMsg('Please enter your ID number / Roll no / Flat number.');
      return;
    }

    setIsSaving(true);
    setErrorMsg('');

    try {
      const updated: IDProofCredential = {
        idType,
        fullName: fullName.trim(),
        idNumber: idNumber.trim(),
        phoneNumber: phoneNumber.trim() || undefined,
        roomOrFlatNo: roomOrFlatNo.trim() || undefined,
        notes: notes.trim() || undefined,
        frontPhotoData: frontPhotoData || undefined,
        backPhotoData: backPhotoData || undefined,
        updatedAt: Date.now(),
      };

      await onSave(updated);
      setMode('view');
    } catch (err) {
      setErrorMsg((err as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (onDelete) {
      await onDelete();
      setShowDeleteConfirm(false);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-100 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 leading-none">
                {mode === 'view' ? 'ID Verification Credential' : 'Edit ID Card Proof'}
              </h3>
              <p className="text-[11px] text-slate-500 font-medium mt-1">
                {mode === 'view'
                  ? 'Show to dhobi or counter to collect laundry'
                  : 'Saved 100% on this phone in private storage'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {mode === 'view' && idProof ? (
            /* VIEW / PRESENTATION MODE */
            <div className="space-y-4">
              {/* Dhobi Presentation Card */}
              <div
                className={`rounded-3xl p-5 text-white transition-all shadow-md relative overflow-hidden ${
                  highContrast
                    ? 'bg-black ring-4 ring-amber-400'
                    : 'bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900'
                }`}
              >
                {/* Top Badge */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-blue-300">
                      {idProof.idType}
                    </span>
                    <h4 className="text-lg font-bold text-white tracking-tight mt-0.5">
                      {idProof.fullName}
                    </h4>
                  </div>
                  <div className="px-2.5 py-1 rounded-full bg-white/10 border border-white/20 text-[10px] font-bold text-emerald-300 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Verified</span>
                  </div>
                </div>

                {/* ID Details grid */}
                <div className="grid grid-cols-2 gap-3 text-xs border-t border-white/10 pt-3">
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold block uppercase">
                      ID / Roll / Card No.
                    </span>
                    <span className="font-mono font-bold text-sm text-amber-300 tabular-nums">
                      {idProof.idNumber}
                    </span>
                  </div>

                  {idProof.roomOrFlatNo && (
                    <div>
                      <span className="text-[10px] text-slate-400 font-semibold block uppercase">
                        Flat / Room No.
                      </span>
                      <span className="font-mono font-bold text-sm text-white">
                        {idProof.roomOrFlatNo}
                      </span>
                    </div>
                  )}

                  {idProof.phoneNumber && (
                    <div className="col-span-2">
                      <span className="text-[10px] text-slate-400 font-semibold block uppercase">
                        Contact Phone
                      </span>
                      <span className="font-mono font-semibold text-xs text-white">
                        {idProof.phoneNumber}
                      </span>
                    </div>
                  )}
                </div>

                {idProof.notes && (
                  <p className="mt-3 text-[11px] text-slate-300 italic border-t border-white/10 pt-2">
                    {idProof.notes}
                  </p>
                )}
              </div>

              {/* Physical Card Photo Viewer (Front & Back) */}
              {(idProof.frontPhotoData || idProof.backPhotoData) && (
                <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200">
                  <div className="flex items-center justify-between mb-2 px-1">
                    <span className="text-xs font-bold text-slate-800">
                      Physical ID Card Photo
                    </span>
                    {idProof.backPhotoData && (
                      <div className="flex items-center gap-1 bg-white border border-slate-200 p-0.5 rounded-lg">
                        <button
                          onClick={() => setActiveSide('front')}
                          className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all ${
                            activeSide === 'front'
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Front
                        </button>
                        <button
                          onClick={() => setActiveSide('back')}
                          className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all ${
                            activeSide === 'back'
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Back
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Photo Display */}
                  <div
                    className="w-full h-52 bg-slate-950 rounded-xl overflow-hidden flex items-center justify-center relative shadow-inner cursor-zoom-in"
                    style={{
                      filter: highContrast ? 'contrast(1.4) brightness(1.15)' : 'none',
                    }}
                  >
                    <img
                      src={
                        activeSide === 'front'
                          ? idProof.frontPhotoData || idProof.backPhotoData
                          : idProof.backPhotoData || idProof.frontPhotoData
                      }
                      alt="Physical ID Card"
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                </div>
              )}

              {/* Quick Presentation Bar */}
              <div className="flex items-center justify-between gap-2 pt-1">
                <button
                  onClick={() => setHighContrast((v) => !v)}
                  className={`flex-1 min-h-[44px] px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition-all ${
                    highContrast
                      ? 'bg-amber-500 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <Sun className="w-4 h-4" />
                  <span>{highContrast ? 'Daylight Boost ON' : 'Boost Brightness'}</span>
                </button>

                <button
                  onClick={() => setMode('edit')}
                  className="min-h-[44px] px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 active:scale-95 transition-all"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit Details</span>
                </button>
              </div>
            </div>
          ) : (
            /* EDIT / SETUP MODE */
            <div className="space-y-3.5">
              {errorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* ID Type */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ID Card Type *
                </label>
                <select
                  value={idType}
                  onChange={(e) => setIdType(e.target.value as IDType)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  {ID_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name (as on card) *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Venugopal Chepuri"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                </div>
              </div>

              {/* ID Number */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ID / Roll / Token Number *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={idNumber}
                    onChange={(e) => setIdNumber(e.target.value)}
                    placeholder="e.g. EMP-4091 or Flat 402 or 22CS089"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  <CreditCard className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                </div>
              </div>

              {/* Phone & Flat/Room */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Phone Number
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="+91 9876543210"
                      className="w-full pl-8 pr-2.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                    <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Flat / Room No.
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={roomOrFlatNo}
                      onChange={(e) => setRoomOrFlatNo(e.target.value)}
                      placeholder="e.g. B-302 / Room 14"
                      className="w-full pl-8 pr-2.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                    <Home className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* ID Card Photos (Front & Back) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  ID Card Physical Photos
                </label>

                {/* Hidden Inputs */}
                <input
                  ref={frontInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileChange(e, 'front')}
                  className="hidden"
                />
                <input
                  ref={backInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileChange(e, 'back')}
                  className="hidden"
                />

                <div className="grid grid-cols-2 gap-2.5">
                  {/* Front Side */}
                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold text-slate-500">Front Side</span>
                    {frontPhotoData ? (
                      <div className="w-full h-24 rounded-xl overflow-hidden bg-slate-900 relative group border border-slate-200">
                        <img
                          src={frontPhotoData}
                          alt="ID Front"
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => frontInputRef.current?.click()}
                          className="absolute inset-0 bg-black/50 text-white text-[10px] font-bold flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          Change
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => frontInputRef.current?.click()}
                        className="w-full h-24 rounded-xl border-2 border-dashed border-slate-200 hover:border-blue-400 bg-slate-50 flex flex-col items-center justify-center gap-1 text-slate-500 hover:text-blue-600 transition-colors"
                      >
                        <Camera className="w-4 h-4" />
                        <span className="text-[10px] font-bold">Snap Front</span>
                      </button>
                    )}
                  </div>

                  {/* Back Side */}
                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold text-slate-500">
                      Back Side (Optional)
                    </span>
                    {backPhotoData ? (
                      <div className="w-full h-24 rounded-xl overflow-hidden bg-slate-900 relative group border border-slate-200">
                        <img
                          src={backPhotoData}
                          alt="ID Back"
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => backInputRef.current?.click()}
                          className="absolute inset-0 bg-black/50 text-white text-[10px] font-bold flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          Change
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => backInputRef.current?.click()}
                        className="w-full h-24 rounded-xl border-2 border-dashed border-slate-200 hover:border-blue-400 bg-slate-50 flex flex-col items-center justify-center gap-1 text-slate-500 hover:text-blue-600 transition-colors"
                      >
                        <Camera className="w-4 h-4" />
                        <span className="text-[10px] font-bold">Snap Back</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Extra notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Counter Verification Note (Optional)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Authorized to collect on behalf of Flat 402"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-500 leading-relaxed flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  <strong>100% Private:</strong> Saved securely inside your browser's IndexedDB. No server accounts or third-party sync.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 flex items-center gap-2.5 bg-slate-50/60">
          {mode === 'edit' ? (
            <>
              {idProof && (
                <button
                  type="button"
                  onClick={() => setMode('view')}
                  className="flex-1 min-h-[46px] rounded-xl border border-slate-200 bg-white font-semibold text-xs text-slate-700 hover:bg-slate-50 active:scale-95 transition-all"
                >
                  Cancel
                </button>
              )}
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 min-h-[46px] rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-sm shadow-blue-500/20 active:scale-95 transition-all disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                <span>{isSaving ? 'Saving...' : 'Save ID Credential'}</span>
              </button>
            </>
          ) : (
            <>
              {onDelete && idProof && (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="min-h-[44px] px-3.5 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 text-xs font-semibold flex items-center gap-1 active:scale-95 transition-all"
                  title="Remove ID Card"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className="flex-1 min-h-[44px] rounded-xl bg-slate-900 text-white font-semibold text-xs hover:bg-slate-800 active:scale-95 transition-all"
              >
                Done
              </button>
            </>
          )}
        </div>

        {/* Delete Confirmation Dialog */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-xs w-full p-5 shadow-2xl border border-slate-100 text-center">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
                <Trash2 className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-slate-900">Remove ID Credential?</h4>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                This will delete your saved ID card and physical photos from this device.
              </p>
              <div className="flex items-center gap-2 mt-5">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 min-h-[44px] rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 min-h-[44px] rounded-xl bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
