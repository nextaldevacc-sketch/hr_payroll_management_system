'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { useLanguage } from '../../../context/LanguageContext';
import { API_BASE } from '../../../services/apiClient';
import { validatePassword } from '@nextal/shared';
import { Lock, Eye, EyeOff, AlertTriangle, ArrowRight, ArrowLeft, Loader2, Check } from 'lucide-react';

export default function ChangePasswordPage() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const { locale, isRTL } = useLanguage();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const isAr = locale === 'ar';

  const hasLength = newPassword.length >= 10;
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasLower = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(newPassword);
  const isMatch = newPassword.length > 0 && newPassword === confirmPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();

    const policy = validatePassword(newPassword, {
      email: user?.email,
      name: user?.name,
    });

    if (!policy.valid) {
      setErrorMessage(
        isAr
          ? 'يجب أن تتكون كلمة المرور من 10 خانات على الأقل وتحتوي على حروف كبيرة وصغيرة وأرقام ورموز خاصة، وألا تحتوي على اسمك أو بريدك'
          : policy.errors[0] || 'Password does not meet complexity requirements'
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
      const res = await fetch(`${API_BASE}/auth/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ new_password: newPassword }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || 'Failed to change password');
      }

      await refreshUser();
      const roles = user?.roles || [];
      const isEmployeeOnly = roles.length === 1 && roles[0] === 'EMPLOYEE';
      const destination = isEmployeeOnly ? '/me' : '/';
      router.replace(destination);
    } catch (err) {
      setErrorMessage(err.message || (isAr ? 'فشل تحديث كلمة المرور' : 'Failed to update password'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-5 text-start">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          {isAr ? 'تعيين كلمة مرور جديدة' : 'Set Your New Password'}
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          {isAr
            ? 'يرجى اختيار كلمة مرور جديدة لمتابعة تسجيل الدخول لحسابك'
            : 'Please set a secure new password to continue to your account'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMessage && (
          <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* New Password */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 text-start">
            {isAr ? 'كلمة المرور الجديدة' : 'New Password'}
          </label>
          <div className="relative">
            <input
              id="new-password"
              data-testid="new-password-input"
              type={showPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••••••"
              disabled={isLoading}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/60 text-slate-900 dark:text-white text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 disabled:opacity-50 transition pe-10"
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
            <input
              id="confirm-password"
              data-testid="confirm-password-input"
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••••••"
              disabled={isLoading}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/60 text-slate-900 dark:text-white text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 disabled:opacity-50 transition pe-10"
            />
          </div>
        </div>

        {/* Password Policy Hints */}
        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1.5 text-start">
          <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
            {isAr ? 'شروط كلمة المرور:' : 'Password requirements:'}
          </p>
          <div className="flex items-center gap-2 text-[11px]">
            <span
              className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] ${
                hasLength ? 'bg-emerald-500 text-white' : 'bg-slate-300 dark:bg-slate-700 text-slate-500'
              }`}
            >
              {hasLength ? <Check className="w-2.5 h-2.5 stroke-[3]" /> : '•'}
            </span>
            <span className={hasLength ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}>
              {isAr ? '10 خانات على الأقل' : 'At least 10 characters'}
            </span>
          </div>
          <div className="flex items-center gap-2 text-[11px]">
            <span
              className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] ${
                hasUpper && hasLower ? 'bg-emerald-500 text-white' : 'bg-slate-300 dark:bg-slate-700 text-slate-500'
              }`}
            >
              {hasUpper && hasLower ? <Check className="w-2.5 h-2.5 stroke-[3]" /> : '•'}
            </span>
            <span className={hasUpper && hasLower ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}>
              {isAr ? 'حروف كبيرة وصغيرة (A-Z و a-z)' : 'Upper and lowercase letters (A-Z & a-z)'}
            </span>
          </div>
          <div className="flex items-center gap-2 text-[11px]">
            <span
              className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] ${
                hasNumber ? 'bg-emerald-500 text-white' : 'bg-slate-300 dark:bg-slate-700 text-slate-500'
              }`}
            >
              {hasNumber ? <Check className="w-2.5 h-2.5 stroke-[3]" /> : '•'}
            </span>
            <span className={hasNumber ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}>
              {isAr ? 'تحتوي على أرقام (0-9)' : 'Contains numbers (0-9)'}
            </span>
          </div>
          <div className="flex items-center gap-2 text-[11px]">
            <span
              className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] ${
                hasSpecial ? 'bg-emerald-500 text-white' : 'bg-slate-300 dark:bg-slate-700 text-slate-500'
              }`}
            >
              {hasSpecial ? <Check className="w-2.5 h-2.5 stroke-[3]" /> : '•'}
            </span>
            <span className={hasSpecial ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}>
              {isAr ? 'رموز خاصة (!@#$%)' : 'Special character (!@#$%)'}
            </span>
          </div>
          {confirmPassword.length > 0 && (
            <div className="flex items-center gap-2 text-[11px]">
              <span
                className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] ${
                  isMatch ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
                }`}
              >
                {isMatch ? <Check className="w-2.5 h-2.5 stroke-[3]" /> : '✕'}
              </span>
              <span className={isMatch ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                {isMatch
                  ? (isAr ? 'كلمتا المرور متطابقتان' : 'Passwords match')
                  : (isAr ? 'كلمتا المرور غير متطابقتين' : 'Passwords do not match')}
              </span>
            </div>
          )}
        </div>

        <button
          type="submit"
          data-testid="change-password-submit-btn"
          disabled={isLoading || !hasLength || !hasLetter || !hasNumber || !isMatch}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-sky-500 hover:bg-sky-600 active:bg-sky-700 text-white text-xs font-semibold transition disabled:opacity-50 disabled:pointer-events-none shadow-sm shadow-sky-500/20"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{isAr ? 'جاري الحفظ...' : 'Saving password...'}</span>
            </>
          ) : (
            <>
              <span>{isAr ? 'حفظ كلمة المرور والمتابعة' : 'Set New Password & Continue'}</span>
              {isRTL ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
            </>
          )}
        </button>
      </form>
    </div>
  );
}

