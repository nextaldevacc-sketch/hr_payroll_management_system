'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLanguage } from '../../../context/LanguageContext';
import { API_BASE } from '../../../services/apiClient';
import { Lock, Eye, EyeOff, AlertTriangle, ArrowRight, ArrowLeft, Loader2, Check, UserCheck } from 'lucide-react';

export default function AcceptInvitePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { locale, isRTL } = useLanguage();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const isAr = locale === 'ar';

  const hasLength = password.length >= 10;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const isMatch = password.length > 0 && password === confirmPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) {
      setErrorMessage(isAr ? 'رمز الدعوة مفقود أو غير صالح' : 'Invite token is missing or invalid');
      return;
    }

    if (!hasLength || !hasLetter || !hasNumber) {
      setErrorMessage(
        isAr
          ? 'يجب أن تتكون كلمة المرور من 10 خانات على الأقل وتحتوي على حروف وأرقام'
          : 'Password must be at least 10 characters and contain letters and numbers'
      );
      return;
    }

    if (!isMatch) {
      setErrorMessage(isAr ? 'كلمتا المرور غير متطابقتين' : 'Passwords do not match');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const res = await fetch(`${API_BASE}/auth/set-password-invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || 'Failed to activate account');
      }

      router.replace('/login?success=invite_accepted');
    } catch (err) {
      setErrorMessage(err.message || (isAr ? 'فشل تفعيل الحساب' : 'Failed to activate account'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-5 text-start">
        <div className="flex items-center gap-2 mb-1">
          <UserCheck className="w-4 h-4 text-emerald-500" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            {isAr ? 'دعوة انضمام للمنصة' : 'Welcome to Nextal'}
          </span>
        </div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          {isAr ? 'تفعيل حسابك وتعيين كلمة المرور' : 'Activate your account'}
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          {isAr
            ? 'قم بتعيين كلمة مرور لتفعيل حسابك والبدء في استخدام المنصة'
            : 'Set a password to complete your onboarding and sign in'}
        </p>
      </div>

      {!token ? (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs space-y-3">
          <p>
            {isAr
              ? 'رابط الدعوة غير مكتمل أو منتهي الصلاحية. يرجى التواصل مع مسؤول الموارد البشرية بشركتك.'
              : 'Invite link is missing a valid token or has expired. Please contact your company HR administrator.'}
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 font-bold text-amber-600 dark:text-amber-400 hover:underline"
          >
            <span>{isAr ? 'الذهاب لتسجيل الدخول' : 'Go to login'}</span>
            {isRTL ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Password */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 text-start">
              {isAr ? 'كلمة المرور' : 'Choose a Password'}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 start-0 ps-3 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                id="invite-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                dir="ltr"
                className="w-full ps-9 pe-9 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-xs font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 end-0 pe-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 text-start">
              {isAr ? 'تأكيد كلمة المرور' : 'Confirm Password'}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 start-0 ps-3 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                id="invite-confirm-password"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                dir="ltr"
                className="w-full ps-9 pe-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-xs font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          {/* Password Policy Hints */}
          <div className="p-3 rounded-2xl bg-slate-100/70 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-[11px] space-y-1 text-slate-600 dark:text-slate-400">
            <div className="flex items-center gap-1.5">
              <Check className={`w-3.5 h-3.5 ${hasLength ? 'text-emerald-500 font-bold' : 'text-slate-400'}`} />
              <span>{isAr ? '10 خانات على الأقل' : 'At least 10 characters'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Check className={`w-3.5 h-3.5 ${hasLetter ? 'text-emerald-500 font-bold' : 'text-slate-400'}`} />
              <span>{isAr ? 'تحتوي على حروف (أ-ي أو a-z)' : 'Contains letters'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Check className={`w-3.5 h-3.5 ${hasNumber ? 'text-emerald-500 font-bold' : 'text-slate-400'}`} />
              <span>{isAr ? 'تحتوي على أرقام (0-9)' : 'Contains numbers'}</span>
            </div>
          </div>

          <button
            id="btn-submit-invite"
            type="submit"
            disabled={isLoading || !hasLength || !hasLetter || !hasNumber || !isMatch}
            className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/20 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 transition-all"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{isAr ? 'جاري التفعيل...' : 'Activating account...'}</span>
              </>
            ) : (
              <span>{isAr ? 'تفعيل الحساب والدخول' : 'Activate account & sign in'}</span>
            )}
          </button>
        </form>
      )}
    </div>
  );
}

