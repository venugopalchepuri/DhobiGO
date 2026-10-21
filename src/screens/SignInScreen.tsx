import React, { useState } from 'react';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ChevronLeft,
  ArrowRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
  KeyRound,
  ShieldCheck,
} from 'lucide-react';
import { validateSignIn, validateResetPassword } from '../utils/auth';

interface SignInScreenProps {
  onBack: () => void;
  onGoToRegister: () => void;
  onSubmit: (email: string, password: string) => Promise<{ success: boolean; errorMessage?: string }>;
  onRequestPasswordReset: (email: string) => Promise<{ success: boolean; token?: string; errorMessage?: string }>;
  onCompletePasswordReset: (
    email: string,
    token: string,
    newPassword: string
  ) => Promise<{ success: boolean; errorMessage?: string }>;
  isLoading: boolean;
  userNotFoundMessage?: string | null;
}

export const SignInScreen: React.FC<SignInScreenProps> = ({
  onBack,
  onGoToRegister,
  onSubmit,
  onRequestPasswordReset,
  onCompletePasswordReset,
  isLoading,
  userNotFoundMessage,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formErrors, setFormErrors] = useState<{ email?: string; password?: string }>({});
  const [serverError, setServerError] = useState<string | null>(null);

  // Forgot password modal state
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [resetStep, setResetStep] = useState<'request' | 'verify'>('request');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    const validation = validateSignIn(email, password);
    if (!validation.valid) {
      setFormErrors(validation.errors);
      return;
    }
    setFormErrors({});

    const res = await onSubmit(email.trim().toLowerCase(), password);
    if (!res.success && res.errorMessage) {
      setServerError(res.errorMessage);
    }
  };

  const handleStartForgotPassword = () => {
    setResetEmail(email.trim().toLowerCase());
    setResetStep('request');
    setResetError(null);
    setResetSuccess(null);
    setIsForgotPasswordOpen(true);
  };

  const handleRequestResetToken = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);
    if (!resetEmail || !resetEmail.trim()) {
      setResetError('Please enter your registered email address.');
      return;
    }

    setResetLoading(true);
    try {
      const res = await onRequestPasswordReset(resetEmail.trim().toLowerCase());
      if (res.success && res.token) {
        setResetToken(res.token);
        setResetStep('verify');
        setResetSuccess(`Security code generated: ${res.token} (valid for 15 minutes)`);
      } else {
        setResetError(res.errorMessage || 'No account found with this email address.');
      }
    } catch (err) {
      setResetError((err as Error).message);
    } finally {
      setResetLoading(false);
    }
  };

  const handleCompleteReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);

    const validation = validateResetPassword({
      email: resetEmail,
      token: resetToken,
      newPassword,
      confirmNewPassword,
    });

    if (!validation.valid) {
      setResetError(Object.values(validation.errors)[0]);
      return;
    }

    setResetLoading(true);
    try {
      const res = await onCompletePasswordReset(resetEmail.trim().toLowerCase(), resetToken, newPassword);
      if (res.success) {
        setResetSuccess('Password reset successfully! You can now sign in.');
        setEmail(resetEmail);
        setPassword('');
        setTimeout(() => {
          setIsForgotPasswordOpen(false);
        }, 1500);
      } else {
        setResetError(res.errorMessage || 'Invalid or expired reset code.');
      }
    } catch (err) {
      setResetError((err as Error).message);
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="pb-24 animate-in fade-in duration-150 max-w-sm mx-auto">
      {/* Top Bar */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onBack}
          aria-label="Go back"
          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-700 shadow-xs active:scale-95 transition-all hover:bg-slate-50"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Sign In
        </span>

        <button
          onClick={onGoToRegister}
          className="text-xs font-bold text-emerald-700 hover:text-emerald-800"
        >
          Register
        </button>
      </div>

      {/* Main Sign In Card */}
      <div className="bg-white rounded-3xl p-6 shadow-xs border border-slate-200/80 space-y-5">
        <div className="flex items-center gap-3.5 pb-1">
          <img
            src="/assets/aistudio/DhobiGo_Laundry_App_Icon_da4ef6c9.png"
            alt="DhobiGo"
            className="w-12 h-12 rounded-2xl object-cover shadow-xs border border-emerald-100 shrink-0"
          />
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight leading-none">Welcome Back</h2>
            <p className="text-xs text-slate-500 mt-1 leading-snug">
              Sign in to access your private laundry vault
            </p>
          </div>
        </div>

        {/* Server or Not Found Error Alert */}
        {(serverError || userNotFoundMessage) && (
          <div className="p-3.5 bg-rose-50 rounded-2xl border border-rose-200 text-xs text-rose-900 space-y-2 animate-in fade-in">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{serverError || userNotFoundMessage}</span>
            </div>
            {userNotFoundMessage && (
              <button
                type="button"
                onClick={onGoToRegister}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 underline block"
              >
                Create Account with this email →
              </button>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email Address */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
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
                  if (formErrors.email) setFormErrors((prev) => ({ ...prev, email: undefined }));
                }}
                placeholder="name@example.com"
                autoComplete="email"
                className={`w-full pl-10 pr-4 py-2.5 rounded-2xl border ${
                  formErrors.email ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200 bg-white'
                } text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all`}
              />
            </div>
            {formErrors.email && (
              <p className="text-[11px] font-medium text-rose-600 mt-1">{formErrors.email}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Password *
              </label>
              <button
                type="button"
                onClick={handleStartForgotPassword}
                className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800"
              >
                Forgot Password?
              </button>
            </div>
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
                  if (formErrors.password) setFormErrors((prev) => ({ ...prev, password: undefined }));
                }}
                placeholder="Enter your password"
                autoComplete="current-password"
                className={`w-full pl-10 pr-11 py-2.5 rounded-2xl border ${
                  formErrors.password ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200 bg-white'
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
            {formErrors.password && (
              <p className="text-[11px] font-medium text-rose-600 mt-1">{formErrors.password}</p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full min-h-[48px] mt-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 active:scale-95 transition-all"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Signing In...</span>
              </>
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Security Isolation Notice */}
        <div className="pt-2 border-t border-slate-100 flex items-center gap-2 text-[11px] text-slate-400 font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>Strict account-level data isolation enabled</span>
        </div>
      </div>

      {/* Register Switch Prompt */}
      <div className="text-center mt-6">
        <p className="text-xs text-slate-500">
          New to DhobiGo?{' '}
          <button
            onClick={onGoToRegister}
            className="font-bold text-emerald-700 hover:text-emerald-800 underline"
          >
            Create an Account
          </button>
        </p>
      </div>

      {/* Forgot Password Modal */}
      {isForgotPasswordOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-xl border border-slate-200/80 animate-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <KeyRound className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Reset Password</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsForgotPasswordOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold p-1"
              >
                ✕
              </button>
            </div>

            {resetError && (
              <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{resetError}</span>
              </div>
            )}

            {resetSuccess && (
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{resetSuccess}</span>
              </div>
            )}

            {resetStep === 'request' ? (
              <form onSubmit={handleRequestResetToken} className="space-y-3">
                <p className="text-xs text-slate-500 leading-relaxed">
                  Enter your registered email. We will generate a secure one-time reset code for your account.
                </p>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Registered Email
                  </label>
                  <input
                    type="email"
                    required
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="w-full min-h-[44px] rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2"
                >
                  {resetLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Generate Reset Code'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleCompleteReset} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Security Code
                  </label>
                  <input
                    type="text"
                    required
                    value={resetToken}
                    onChange={(e) => setResetToken(e.target.value)}
                    placeholder="6-digit reset code"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm font-mono font-bold tracking-wider text-center"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className="w-full px-3.5 pr-10 py-2 rounded-xl border border-slate-200 text-sm font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword((v) => !v)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400"
                    >
                      {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Confirm New Password
                  </label>
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm font-medium"
                  />
                </div>

                <button
                  type="submit"
                  disabled={resetLoading}
                  className="w-full min-h-[44px] rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2"
                >
                  {resetLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Set New Password'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
