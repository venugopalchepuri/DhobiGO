import React from 'react';
import { ShieldCheck, UserPlus, LogIn, CheckCircle2, Lock, FileText, User } from 'lucide-react';

interface WelcomeScreenProps {
  onCreateAccountClick: () => void;
  onSignInClick: () => void;
  onContinueOfflineClick?: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  onCreateAccountClick,
  onSignInClick,
  onContinueOfflineClick,
}) => {
  return (
    <div className="min-h-full flex flex-col justify-between p-4 sm:p-6 pb-12 animate-in fade-in duration-200">
      {/* Top Branding Section */}
      <div className="pt-6 sm:pt-10 text-center max-w-sm mx-auto">
        {/* Brand Icon Mark */}
        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl overflow-hidden mx-auto shadow-xl shadow-emerald-700/20 border-4 border-white mb-5 transition-transform hover:scale-105">
          <img
            src="/assets/aistudio/DhobiGo_Laundry_App_Icon_da4ef6c9.png"
            alt="DhobiGo Logo"
            className="w-full h-full object-cover"
          />
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          DhobiGo
        </h1>
        <p className="text-sm font-semibold text-emerald-700 mt-1">
          Your laundry, always in check.
        </p>

        <p className="text-xs text-slate-500 mt-3 leading-relaxed">
          Record laundry bags, preserve paper chits with on-device OCR, track item returns, and verify counter collections with your ID proof.
        </p>
      </div>

      {/* Feature Value Card */}
      <div className="bg-white rounded-3xl p-5 shadow-xs border border-slate-200/80 max-w-sm mx-auto w-full my-6">
        <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 block mb-3">
          Account Security & Private Vault
        </span>

        <div className="space-y-3">
          <div className="flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-600 leading-snug">
              <strong>Account Data Isolation:</strong> Every account is strictly private. Your laundry chits and records are never shared with other users.
            </p>
          </div>

          <div className="flex items-start gap-2.5">
            <Lock className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-600 leading-snug">
              <strong>Encrypted Password Sign-In:</strong> Instant sign-in with your email and password — no SMS or OTP delays.
            </p>
          </div>

          <div className="flex items-start gap-2.5">
            <FileText className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-600 leading-snug">
              <strong>Student & Campus ID:</strong> Link student roll number or ID card credential to present during counter pickup.
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Action Buttons */}
      <div className="space-y-3 max-w-sm mx-auto w-full">
        {/* Create Account Primary Button */}
        <button
          onClick={onCreateAccountClick}
          className="w-full min-h-[50px] rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-600/25 active:scale-95 transition-all"
        >
          <UserPlus className="w-4 h-4" />
          <span>Create Account</span>
        </button>

        {/* Sign In Secondary Button */}
        <button
          onClick={onSignInClick}
          className="w-full min-h-[50px] rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 font-bold text-sm flex items-center justify-center gap-2 shadow-xs active:scale-95 transition-all"
        >
          <LogIn className="w-4 h-4 text-emerald-700" />
          <span>Sign In to Account</span>
        </button>

        {/* Local Offline Guest Fallback */}
        {onContinueOfflineClick && (
          <button
            onClick={onContinueOfflineClick}
            className="w-full py-2.5 text-center text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
          >
            Continue as Guest (Local Only)
          </button>
        )}

        <div className="pt-2 text-center text-[10px] text-slate-400 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Protected by strict account ownership & PBKDF2 cryptography</span>
        </div>
      </div>
    </div>
  );
};
