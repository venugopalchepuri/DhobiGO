import React, { useRef, useState } from 'react';
import {
  Download,
  Upload,
  Shield,
  Smartphone,
  Plus,
  Trash2,
  Check,
  AlertCircle,
  FileCheck2,
  Info,
  Loader2,
  HardDrive,
  CreditCard,
  Edit2,
  User,
  LogIn,
  LogOut,
  ChevronRight,
  CheckCircle2,
  ShieldCheck,
  Play,
  AlertTriangle,
  FileText,
  X,
} from 'lucide-react';
import { AppSettings, ClothingCategory, IDProofCredential, UserProfile } from '../types';
import { usePWAInstall } from '../hooks/usePWAInstall';
import {
  BackupValidationResult,
  createZipBackup,
  triggerBackupDownload,
  validateBackupFile,
} from '../utils/backup';
import { localDB } from '../db/indexedDb';
import { runDataIsolationTestSuite, TestSuiteSummary } from '../tests/dataIsolationTests';

interface SettingsScreenProps {
  settings: AppSettings;
  categories: ClothingCategory[];
  totalRecordsCount: number;
  totalImagesCount: number;
  idProof: IDProofCredential | null;
  currentUser?: UserProfile | null;
  onOpenProfile?: () => void;
  onOpenSignIn?: () => void;
  onSignOut?: () => void;
  onOpenIDProof: () => void;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => Promise<void>;
  onAddCategory: (name: string) => Promise<ClothingCategory>;
  onToggleCategoryActive: (id: string, isActive: boolean) => Promise<void>;
  onDeleteCategory: (id: string) => Promise<void>;
  onBackupRestored: () => Promise<void>;
  onDeleteAccount?: () => Promise<void>;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  settings,
  categories,
  totalRecordsCount,
  totalImagesCount,
  idProof,
  currentUser,
  onOpenProfile,
  onOpenSignIn,
  onSignOut,
  onOpenIDProof,
  onUpdateSettings,
  onAddCategory,
  onToggleCategoryActive,
  onDeleteCategory,
  onBackupRestored,
  onDeleteAccount,
}) => {
  const [defaultDhobi, setDefaultDhobi] = useState(settings.defaultDhobiName || '');
  const [isSavingDhobi, setIsSavingDhobi] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [catError, setCatError] = useState('');

  // Backup & Restore states
  const [isExporting, setIsExporting] = useState(false);
  const [isValidatingBackup, setIsValidatingBackup] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [backupValidation, setBackupValidation] = useState<BackupValidationResult | null>(null);
  const [restoreSuccessMsg, setRestoreSuccessMsg] = useState('');
  const [restoreErrorMsg, setRestoreErrorMsg] = useState('');

  // Security & Data Isolation Test Runner State
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [testSuiteSummary, setTestSuiteSummary] = useState<TestSuiteSummary | null>(null);
  const [showTestModal, setShowTestModal] = useState(false);

  const handleRunSecurityTests = async () => {
    setIsRunningTests(true);
    setShowTestModal(true);
    try {
      const summary = await runDataIsolationTestSuite();
      setTestSuiteSummary(summary);
    } catch (err) {
      console.error('Data isolation test suite failed:', err);
    } finally {
      setIsRunningTests(false);
    }
  };

  const restoreFileInputRef = useRef<HTMLInputElement>(null);

  // PWA install hook
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState(false);

  // Save default dhobi name
  const handleSaveDefaultDhobi = async () => {
    setIsSavingDhobi(true);
    await onUpdateSettings({ defaultDhobiName: defaultDhobi.trim() });
    setIsSavingDhobi(false);
  };

  // Add category
  const handleCreateCategory = async () => {
    if (!newCatName.trim()) return;
    try {
      setCatError('');
      await onAddCategory(newCatName.trim());
      setNewCatName('');
    } catch (e) {
      setCatError((e as Error).message);
    }
  };

  // Create & Download Offline ZIP backup
  const handleExportZip = async () => {
    setIsExporting(true);
    try {
      const zipBlob = await createZipBackup(currentUser ? currentUser.userId : 'guest');
      triggerBackupDownload(zipBlob);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Failed to generate backup zip.');
    } finally {
      setIsExporting(false);
    }
  };

  // Handle Restore file selection
  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsValidatingBackup(true);
    setRestoreErrorMsg('');
    setRestoreSuccessMsg('');

    try {
      const validation = await validateBackupFile(file);
      if (!validation.valid) {
        setRestoreErrorMsg(validation.errorMessage || 'Invalid backup file.');
        setBackupValidation(null);
      } else {
        setBackupValidation(validation);
      }
    } catch (err) {
      setRestoreErrorMsg((err as Error).message);
    } finally {
      setIsValidatingBackup(false);
      // reset file input
      if (restoreFileInputRef.current) restoreFileInputRef.current.value = '';
    }
  };

  // Confirm Restore
  const handleConfirmRestore = async () => {
    if (!backupValidation?.data) return;

    setIsRestoring(true);
    try {
      const targetUserId = currentUser ? currentUser.userId : 'guest';
      const result = await localDB.restoreFullBackup(backupValidation.data, targetUserId);
      setRestoreSuccessMsg(
        `Successfully restored ${result.restoredRecordsCount} laundry bags with chit photos.`
      );
      setBackupValidation(null);
      await onBackupRestored();
    } catch (err) {
      setRestoreErrorMsg(`Restore failed: ${(err as Error).message}`);
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="space-y-6 pb-28 animate-in fade-in duration-150">
      {/* Account & User Profile Card */}
      <div className="bg-white rounded-3xl p-5 shadow-xs border border-slate-200/80">
        <div className="flex items-center justify-between mb-3.5">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Account & Profile
          </span>
          <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200/80">
            {currentUser ? 'Signed In' : 'Guest Mode'}
          </span>
        </div>

        {currentUser ? (
          <div className="space-y-3.5">
            <div className="flex items-center gap-3.5 p-3 bg-slate-50/80 rounded-2xl border border-slate-200/60">
              {currentUser.profilePhoto ? (
                <img
                  src={currentUser.profilePhoto}
                  alt={currentUser.fullName}
                  className="w-12 h-12 rounded-2xl object-cover border border-slate-200 shadow-2xs shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white font-bold text-lg flex items-center justify-center shrink-0 shadow-xs">
                  {currentUser.fullName.charAt(0).toUpperCase()}
                </div>
              )}

              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-slate-900 truncate">
                  {currentUser.fullName}
                </h4>
                <p className="text-xs font-semibold text-emerald-700 truncate">
                  {currentUser.email}
                </p>
                <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500 font-mono">
                  <span>UID: {currentUser.userId}</span>
                  {currentUser.phoneNumber && <span>• {currentUser.phoneNumber}</span>}
                </div>
                {currentUser.isStudent && currentUser.enrollmentNumber && (
                  <p className="text-[11px] text-slate-600 font-semibold truncate mt-0.5">
                    Roll: {currentUser.enrollmentNumber} {currentUser.university ? `· ${currentUser.university}` : ''}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {onOpenProfile && (
                <button
                  type="button"
                  onClick={onOpenProfile}
                  className="flex-1 min-h-[42px] px-3.5 rounded-xl bg-white border border-slate-200 text-slate-800 hover:bg-slate-50 text-xs font-bold shadow-2xs active:scale-95 transition-all flex items-center justify-center gap-1.5"
                >
                  <User className="w-4 h-4 text-emerald-600" />
                  <span>View Full Profile</span>
                </button>
              )}

              {onSignOut && (
                <button
                  type="button"
                  onClick={onSignOut}
                  className="min-h-[42px] px-3 rounded-xl border border-rose-200 bg-rose-50/60 text-rose-700 hover:bg-rose-100 text-xs font-semibold active:scale-95 transition-all flex items-center gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-slate-600 leading-relaxed">
              You are currently using DhobiGo in guest mode (local device only). Sign in with your email and password to preserve and isolate your laundry chits in your private personal account.
            </p>
            {onOpenSignIn && (
              <button
                type="button"
                onClick={onOpenSignIn}
                className="w-full min-h-[44px] rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs active:scale-95 transition-all"
              >
                <LogIn className="w-4 h-4" />
                <span>Sign In or Create Account</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Security & Data Isolation Diagnostics Card */}
      <div className="bg-white rounded-3xl p-5 shadow-xs border border-slate-200/80 space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Data Isolation & Security</h3>
              <span className="text-[11px] font-semibold text-emerald-700">
                Account Scoping Active • Zero Leakage
              </span>
            </div>
          </div>

          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
            ENFORCED
          </span>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          Every laundry bag, clothing item count, chit slip photo, and ID card is strictly scoped to the owner's account UID. Other accounts on this device cannot read, search, edit, or delete your records.
        </p>

        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/70 text-[11px] text-slate-500 space-y-1">
          <div className="flex items-center justify-between font-mono">
            <span>Current Owner Scope:</span>
            <span className="font-bold text-slate-800">{currentUser ? currentUser.userId : 'Guest Vault'}</span>
          </div>
          <div className="flex items-center justify-between font-mono">
            <span>Password Cryptography:</span>
            <span className="font-bold text-slate-800">PBKDF2-SHA256 (100k iters)</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleRunSecurityTests}
          disabled={isRunningTests}
          className="w-full min-h-[44px] rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs active:scale-95 transition-all"
        >
          {isRunningTests ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
              <span>Running 10-Point Data Isolation Verification...</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
              <span>Run Automated Data-Isolation Test Suite (10 Cases)</span>
            </>
          )}
        </button>
      </div>

      {/* PWA / Install Banner if installable */}
      {!isInstalled && (isInstallable || isIOS) && (
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl p-5 text-white shadow-md shadow-blue-500/20">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-1.5 text-blue-200 text-xs font-semibold">
                <Smartphone className="w-4 h-4" />
                <span>Install on Phone</span>
              </div>
              <h3 className="text-base font-bold text-white mt-1">
                Use Dhobi Tracker like a Native App
              </h3>
              <p className="text-xs text-blue-100 mt-1 leading-relaxed">
                Add to your Android home screen for instant camera access and fast offline tracking.
              </p>
            </div>

            {isInstallable ? (
              <button
                onClick={install}
                className="shrink-0 min-h-[44px] px-4 rounded-xl bg-white text-blue-700 hover:bg-blue-50 font-bold text-xs shadow-sm active:scale-95 transition-all"
              >
                Install App
              </button>
            ) : isIOS ? (
              <button
                onClick={() => setShowIOSModal(true)}
                className="shrink-0 min-h-[44px] px-4 rounded-xl bg-white text-blue-700 hover:bg-blue-50 font-bold text-xs shadow-sm active:scale-95 transition-all"
              >
                How to Install
              </button>
            ) : null}
          </div>
        </div>
      )}

      {/* ID Proof & Verification Credential Section */}
      <div className="bg-white rounded-3xl p-5 shadow-xs border border-slate-200/70">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">
                  My ID Proof & Verification Card
                </h3>
                {idProof && (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Active
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                Show your ID card to dhobi or security counter during laundry collection.
              </p>
            </div>
          </div>
        </div>

        {idProof ? (
          <div className="mt-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider block">
                {idProof.idType}
              </span>
              <h4 className="text-sm font-bold text-slate-900 mt-0.5">{idProof.fullName}</h4>
              <p className="text-xs text-slate-500 mt-0.5 font-mono">
                {idProof.idNumber}
                {idProof.roomOrFlatNo ? ` · Flat/Room ${idProof.roomOrFlatNo}` : ''}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onOpenIDProof}
                className="min-h-[40px] px-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 active:scale-95 transition-all shadow-xs"
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Show / Manage ID</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-4 p-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-center">
            <p className="text-xs text-slate-600 font-medium">
              No ID card saved yet on this device.
            </p>
            <button
              onClick={onOpenIDProof}
              className="mt-3 min-h-[40px] px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 active:scale-95 transition-all shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Add ID Card Credential</span>
            </button>
          </div>
        )}
      </div>

      {/* Default Dhobi / Shop Name */}
      <div className="bg-white rounded-3xl p-5 shadow-xs border border-slate-200/70">
        <h3 className="text-sm font-bold text-slate-900">Default Dhobi or Laundry Shop</h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Pre-fills the shop name when creating new laundry records
        </p>

        <div className="mt-3.5 flex items-center gap-2">
          <input
            type="text"
            value={defaultDhobi}
            onChange={(e) => setDefaultDhobi(e.target.value)}
            placeholder="e.g. Ramesh Dhobi"
            className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
          <button
            onClick={handleSaveDefaultDhobi}
            disabled={isSavingDhobi || defaultDhobi === settings.defaultDhobiName}
            className="min-h-[42px] px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none"
          >
            {isSavingDhobi ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Clothing Categories Management */}
      <div className="bg-white rounded-3xl p-5 shadow-xs border border-slate-200/70">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Clothing Categories</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Default 14 clothing items + your custom categories
            </p>
          </div>
        </div>

        {/* Add custom category input */}
        <div className="mb-4 flex items-center gap-2">
          <input
            type="text"
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            placeholder="New custom category (e.g. Sari, Jacket)"
            className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
          <button
            onClick={handleCreateCategory}
            className="min-h-[38px] px-3.5 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 active:scale-95 transition-all flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add</span>
          </button>
        </div>

        {catError && (
          <p className="text-xs text-rose-600 font-medium mb-3">{catError}</p>
        )}

        {/* Categories list */}
        <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
          {categories.map((cat) => (
            <div key={cat.id} className="py-2.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id={`cat-chk-${cat.id}`}
                  checked={cat.isActive}
                  onChange={(e) => onToggleCategoryActive(cat.id, e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                />
                <label
                  htmlFor={`cat-chk-${cat.id}`}
                  className={`text-xs font-semibold cursor-pointer ${
                    cat.isActive ? 'text-slate-900' : 'text-slate-400 line-through'
                  }`}
                >
                  {cat.name}
                </label>
                {cat.isDefault ? (
                  <span className="text-[10px] text-slate-400 font-normal">default</span>
                ) : (
                  <span className="text-[10px] text-blue-600 bg-blue-50 px-1 rounded">custom</span>
                )}
              </div>

              {!cat.isDefault && (
                <button
                  onClick={() => onDeleteCategory(cat.id)}
                  className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                  title="Delete custom category"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Offline Backup & Restore Section */}
      <div className="bg-white rounded-3xl p-5 shadow-xs border border-slate-200/70">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Backup & Restore</h3>
          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
            Export a full offline archive (.zip) containing all laundry records and original chit photos.
          </p>
        </div>

        {/* Current storage stats */}
        <div className="mt-3.5 p-3 bg-slate-50 rounded-2xl flex items-center justify-between text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-slate-400" />
            <span>Stored on this device:</span>
          </div>
          <span className="font-mono font-bold text-slate-900">
            {totalRecordsCount} bags · {totalImagesCount} chit photos
          </span>
        </div>

        {/* Backup Feedback Messages */}
        {restoreSuccessMsg && (
          <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-800 flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{restoreSuccessMsg}</span>
          </div>
        )}

        {restoreErrorMsg && (
          <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{restoreErrorMsg}</span>
          </div>
        )}

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Download Backup */}
          <button
            onClick={handleExportZip}
            disabled={isExporting}
            className="min-h-[46px] px-4 rounded-2xl bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold text-xs flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
          >
            {isExporting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span>{isExporting ? 'Packing ZIP...' : 'Export Offline Backup (.zip)'}</span>
          </button>

          {/* Restore Backup */}
          <div>
            <input
              ref={restoreFileInputRef}
              type="file"
              accept=".zip,.json"
              onChange={handleFileSelected}
              className="hidden"
            />
            <button
              onClick={() => restoreFileInputRef.current?.click()}
              disabled={isValidatingBackup || isRestoring}
              className="w-full min-h-[46px] px-4 rounded-2xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
            >
              {isValidatingBackup ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              <span>Restore from Backup</span>
            </button>
          </div>
        </div>

        {/* Validation Confirmation Dialog */}
        {backupValidation && (
          <div className="mt-4 p-4 bg-blue-50/70 border border-blue-200 rounded-2xl">
            <div className="flex items-start gap-2.5">
              <FileCheck2 className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-xs font-bold text-blue-900">Valid Backup Archive Detected</h4>
                <p className="text-[11px] text-blue-700 mt-0.5">
                  Contains {backupValidation.recordCount} laundry bags, {backupValidation.itemCount} items, and {backupValidation.imageCount} chit photos.
                </p>

                <div className="flex items-center gap-2 mt-3">
                  <button
                    onClick={handleConfirmRestore}
                    disabled={isRestoring}
                    className="min-h-[36px] px-4 rounded-xl bg-blue-600 text-white font-semibold text-xs hover:bg-blue-700 active:scale-95 transition-all flex items-center gap-1.5"
                  >
                    {isRestoring && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Confirm & Restore</span>
                  </button>

                  <button
                    onClick={() => setBackupValidation(null)}
                    className="min-h-[36px] px-3 rounded-xl bg-white border border-slate-200 text-slate-600 font-semibold text-xs hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Privacy and Local Storage Assurance */}
      <div className="bg-white rounded-3xl p-5 shadow-xs border border-slate-200/70 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-slate-900">Privacy & Local Device Storage</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              DhobiGo is a privacy-first personal utility. All laundry bags, clothing quantities, and paper chit photos are stored directly inside your device's private database (IndexedDB). No data is ever sold, tracked, or uploaded without your explicit command.
            </p>
            <div className="mt-2.5 flex items-center gap-2 text-[11px] text-slate-400">
              <span>Version 1.0.0 (Production Release)</span>
              <span aria-hidden="true">·</span>
              <span>100% On-Device & Private</span>
            </div>
          </div>
        </div>

        {/* Privacy Action Buttons */}
        <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowPrivacyModal(true)}
            className="w-full sm:flex-1 min-h-[40px] px-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
          >
            <FileText className="w-3.5 h-3.5 text-slate-500" />
            <span>Read Privacy Policy & Disclosures</span>
          </button>

          {currentUser && onDeleteAccount && (
            <button
              type="button"
              onClick={() => setShowDeleteAccountModal(true)}
              className="w-full sm:w-auto min-h-[40px] px-3.5 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Account & Wipe Data</span>
            </button>
          )}
        </div>
      </div>

      {/* iOS Installation Instructions Modal */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 text-center">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
              <Smartphone className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-slate-900">Install on iPhone / iPad</h4>
            <div className="text-xs text-slate-600 mt-2 text-left space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-200/70">
              <p>
                1. Tap the <strong>Share</strong> icon (box with upward arrow) in the Safari toolbar.
              </p>
              <p>
                2. Scroll down and tap <strong>Add to Home Screen</strong>.
              </p>
              <p>3. Tap <strong>Add</strong> in the top-right corner.</p>
            </div>
            <button
              onClick={() => setShowIOSModal(false)}
              className="mt-5 w-full min-h-[44px] rounded-xl bg-slate-900 text-white font-semibold text-xs hover:bg-slate-800"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* Data Isolation Test Suite Modal */}
      {showTestModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl max-w-md w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Data Isolation Verification</h4>
                  <p className="text-[11px] text-slate-500">
                    Automated 10-Point Security Test Suite
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowTestModal(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Test Results Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
              {isRunningTests ? (
                <div className="py-12 text-center space-y-3">
                  <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
                  <div className="space-y-1">
                    <h5 className="text-sm font-bold text-slate-900">Running Isolation Tests...</h5>
                    <p className="text-xs text-slate-500 max-w-xs mx-auto">
                      Executing automated user registrations, slip creations, cross-user read/write blocks, and session restoration assertions.
                    </p>
                  </div>
                </div>
              ) : testSuiteSummary ? (
                <div className="space-y-3">
                  {/* Status Banner */}
                  <div
                    className={`p-3.5 rounded-2xl border ${
                      testSuiteSummary.allPassed
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                        : 'bg-rose-50 border-rose-200 text-rose-950'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold flex items-center gap-1.5">
                        {testSuiteSummary.allPassed ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-rose-600" />
                        )}
                        <span>
                          {testSuiteSummary.passed} / {testSuiteSummary.total} Tests Passed
                        </span>
                      </span>
                      <span className="text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded bg-white/70">
                        {testSuiteSummary.allPassed ? 'ALL VERIFIED' : 'FAILED'}
                      </span>
                    </div>
                  </div>

                  {/* Test Cases List */}
                  <div className="space-y-2">
                    {testSuiteSummary.results.map((t) => (
                      <div
                        key={t.id}
                        className={`p-3 rounded-2xl border text-left text-xs space-y-1 ${
                          t.passed
                            ? 'bg-slate-50/80 border-slate-200/80'
                            : 'bg-rose-50 border-rose-300'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-slate-900 flex items-center gap-1.5">
                            {t.passed ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            ) : (
                              <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                            )}
                            <span>{t.id}. {t.title}</span>
                          </span>
                          <span className="text-[10px] font-mono text-slate-400 shrink-0">
                            {t.durationMs}ms
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 pl-5 leading-snug">
                          {t.description}
                        </p>
                        {t.error && (
                          <p className="text-[11px] font-semibold text-rose-700 pl-5">
                            Error: {t.error}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Architecture Disclosure Note */}
                  <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200/80 text-[11px] text-amber-900 space-y-1">
                    <span className="font-bold block">Architecture Security Note:</span>
                    <p className="leading-relaxed">
                      Account separation applies to accounts on this installation and is not equivalent to secure multi-device cloud accounts. If accounts are intended to work across multiple physical devices, use a server-enforced cloud backend.
                    </p>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleRunSecurityTests}
                disabled={isRunningTests}
                className="px-3.5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold transition-colors"
              >
                Re-Run Suite
              </button>
              <button
                type="button"
                onClick={() => setShowTestModal(false)}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Privacy Policy & Data Disclosures Modal */}
      {showPrivacyModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[85vh] overflow-hidden shadow-2xl border border-slate-100 flex flex-col">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">DhobiGo Privacy Policy & Data Safety</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPrivacyModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto text-xs text-slate-600 space-y-4 leading-relaxed">
              <div>
                <h4 className="font-bold text-slate-900 mb-1">1. Local-First & Zero Server Storage</h4>
                <p>
                  DhobiGo operates locally on your device using browser IndexedDB storage. Your laundry records, clothing item counts, paper chit photos, and identification documents never leave your device unless you manually export a backup or share an item via WhatsApp or system sharing.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 mb-1">2. Password Security & Cryptography</h4>
                <p>
                  Passwords are never stored in plaintext. They are salted with 16-byte random values and protected using PBKDF2-SHA256 with 100,000 iterations via the Web Crypto API.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 mb-1">3. Strict Account-Level Data Isolation</h4>
                <p>
                  Every laundry slip and ID card created on this installation is indexed by the owning user's unique identity (UID). Other accounts on this device cannot read, search, edit, or delete your records.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 mb-1">4. Data Export & Portability</h4>
                <p>
                  You own all your data. At any time, you can generate and download a complete ZIP archive containing your raw JSON records and original compressed receipt photographs.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 mb-1">5. Right to Erasure & Account Deletion</h4>
                <p>
                  You can permanently delete your account and wipe all associated laundry slips, clothing inventories, and ID proof records directly from this settings screen with a single action.
                </p>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50/70 flex justify-end">
              <button
                type="button"
                onClick={() => setShowPrivacyModal(false)}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Account Confirmation Modal */}
      {showDeleteAccountModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-rose-100 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Delete Account & Data?</h3>
                <span className="text-[11px] text-rose-600 font-semibold">Irreversible Action</span>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              This will permanently delete your account (<strong>{currentUser?.email}</strong>) and erase all associated laundry slips, paper chit photos, return history, and ID credentials from this device.
            </p>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/80 text-[11px] text-amber-900 leading-snug">
              Tip: You can export an offline backup (.zip) from Settings before deleting if you want to keep a copy of your records.
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteAccountModal(false)}
                disabled={isDeletingAccount}
                className="flex-1 min-h-[42px] rounded-xl border border-slate-200 bg-white font-semibold text-xs text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={async () => {
                  if (!onDeleteAccount) return;
                  setIsDeletingAccount(true);
                  try {
                    await onDeleteAccount();
                    setShowDeleteAccountModal(false);
                  } catch (err) {
                    alert(`Failed to delete account: ${(err as Error).message}`);
                  } finally {
                    setIsDeletingAccount(false);
                  }
                }}
                disabled={isDeletingAccount}
                className="flex-1 min-h-[42px] rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors disabled:opacity-50"
              >
                {isDeletingAccount && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{isDeletingAccount ? 'Deleting...' : 'Delete Forever'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

