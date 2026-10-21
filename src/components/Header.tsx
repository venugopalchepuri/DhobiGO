import React from 'react';
import { Smartphone, Monitor, CreditCard, User } from 'lucide-react';
import { UserProfile } from '../types';

interface HeaderProps {
  onNewBagClick?: () => void;
  isMobileFrame: boolean;
  onToggleFrame: () => void;
  activeScreenTitle?: string;
  onBack?: () => void;
  onOpenIDProof?: () => void;
  hasIDProof?: boolean;
  currentUser?: UserProfile | null;
  onOpenProfile?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  isMobileFrame,
  onToggleFrame,
  activeScreenTitle,
  onBack,
  onOpenIDProof,
  hasIDProof,
  currentUser,
  onOpenProfile,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-[#F8F9FA]/90 backdrop-blur-md border-b border-slate-200/80 px-4 py-3 transition-all">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
        {/* Left: Back button or Brand Title */}
        <div className="flex items-center gap-3">
          {onBack ? (
            <button
              onClick={onBack}
              aria-label="Go back"
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-700 shadow-sm active:scale-95 transition-transform"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          ) : (
            <div className="flex items-center gap-2.5">
              <img
                src="/assets/aistudio/DhobiGo_Laundry_App_Icon_da4ef6c9.png"
                alt="DhobiGo"
                className="w-9 h-9 rounded-xl object-cover shadow-xs border border-emerald-100 shrink-0"
              />
              <div>
                <h1 className="text-base font-bold text-slate-900 tracking-tight leading-none">
                  DhobiGo
                </h1>
                <p className="text-[11px] font-medium text-emerald-700 mt-0.5">
                  Your laundry, always in check
                </p>
              </div>
            </div>
          )}

          {activeScreenTitle && onBack && (
            <h2 className="text-base font-bold text-slate-900 truncate max-w-[200px]">
              {activeScreenTitle}
            </h2>
          )}
        </div>

        {/* Right: Profile, ID Proof & Device Frame Toggle */}
        <div className="flex items-center gap-2">
          {onOpenProfile && (
            <button
              onClick={onOpenProfile}
              title={currentUser ? `Profile: ${currentUser.fullName}` : 'Sign In or Create Account'}
              className="min-h-[40px] px-2.5 sm:px-3 flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200/90 rounded-xl shadow-xs hover:bg-slate-50 active:scale-95 transition-all"
            >
              {currentUser ? (
                <>
                  {currentUser.profilePhoto ? (
                    <img
                      src={currentUser.profilePhoto}
                      alt={currentUser.fullName}
                      className="w-5 h-5 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-5 h-5 rounded-lg bg-emerald-100 text-emerald-800 font-bold text-[10px] flex items-center justify-center">
                      {currentUser.fullName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="hidden sm:inline truncate max-w-[90px]">
                    {currentUser.fullName.split(' ')[0]}
                  </span>
                </>
              ) : (
                <>
                  <div className="w-5 h-5 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                    <User className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-emerald-700 font-bold text-xs">Sign In</span>
                </>
              )}
            </button>
          )}

          {onOpenIDProof && (
            <button
              onClick={onOpenIDProof}
              title={hasIDProof ? 'Show My ID Proof' : 'Set up ID Card Credential'}
              className="min-h-[40px] px-2.5 sm:px-3 flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200/90 rounded-xl shadow-xs hover:bg-slate-50 active:scale-95 transition-all"
            >
              <CreditCard className="w-4 h-4 text-emerald-600" />
              <span className="hidden sm:inline">{hasIDProof ? 'My ID' : 'Add ID'}</span>
            </button>
          )}

          <button
            onClick={onToggleFrame}
            title={isMobileFrame ? 'Switch to Full Screen layout' : 'Switch to Android Phone frame'}
            className="min-h-[40px] px-3 flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200/90 rounded-xl shadow-xs hover:bg-slate-50 active:scale-95 transition-all"
          >
            {isMobileFrame ? (
              <>
                <Monitor className="w-4 h-4 text-blue-600" />
                <span className="hidden sm:inline">Full Width</span>
              </>
            ) : (
              <>
                <Smartphone className="w-4 h-4 text-blue-600" />
                <span className="hidden sm:inline">Phone Frame</span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
