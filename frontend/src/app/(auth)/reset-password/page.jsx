'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLanguage } from '../../../context/LanguageContext';
import { API_BASE } from '../../../services/apiClient';
import { validatePassword } from '@nextal/shared';
import { Lock, Eye, EyeOff, AlertTriangle, ArrowRight, ArrowLeft, Loader2, Check } from 'lucide-react';

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { locale, isRTL } = useLanguage();
  const token = searchParams.get('token') || '';

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
    if (!token) {
      setErrorMessage(isAr ? 'رمز إعادة التعيين مفقود أو غير صالح' : 'Reset token is missing or invalid');
      return;
    }

    const policy = validatePassword(newPassword);
    if (!policy.valid) {
      setErrorMessage(
        isAr
          ? 'يجب أن تتكون كلمة المرور من 10 خانات على الأقل وتحتوي على حروف كبيرة وصغيرة وأرقام ورموز خاصة'
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
      const res = await fetch(`${API_BASE}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, new_password: newPassword }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || 'Failed to reset password');
      }

      router.replace('/login?success=password_reset');
    } catch (err) {
      setErrorMessage(err.message || (isAr ? 'فشل إعادة تعيين كلمة المرور' : 'Failed to reset password'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-5 text-start">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          {isAr ? 'تعيين كلمة مرور جديدة' : 'Reset your password'}
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          {isAr
            ? 'أدخل كلمة مرور قوية جديدة لحسابك المؤسسي'
            : 'Enter a strong new password for your corporate account'}
        </p>
      </div>

      {!token ? (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs space-y-3">
          <p>
            {isAr
              ? 'رابط إعادة التعيين غير مكتمل أو منتهي الصلاحية. يرجى طلب رابط جديد.'
              : 'Password reset link is incomplete or missing a valid token. Please request a new link.'}
          </p>
          <Link
            href="/forgot-password"
            className="inline-flex items-center gap-1.5 font-bold text-primary hover:underline"
          >
            <span>{isAr ? 'طلب رابط جديد' : 'Request a new link'}</span>
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

          {/* New Password */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 text-start">
              {isAr ? 'كلمة المرور الجديدة' : 'New Password'}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 start-0 ps-3 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                dir="ltr"
                className="w-full ps-9 pe-9 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-xs font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
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
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                dir="ltr"
                className="w-full ps-9 pe-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-xs font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
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
              <Check className={`w-3.5 h-3.5 ${hasUpper && hasLower ? 'text-emerald-500 font-bold' : 'text-slate-400'}`} />
              <span>{isAr ? 'حروف كبيرة وصغيرة (A-Z و a-z)' : 'Upper and lowercase letters'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Check className={`w-3.5 h-3.5 ${hasNumber ? 'text-emerald-500 font-bold' : 'text-slate-400'}`} />
              <span>{isAr ? 'تحتوي على أرقام (0-9)' : 'Contains numbers (0-9)'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Check className={`w-3.5 h-3.5 ${hasSpecial ? 'text-emerald-500 font-bold' : 'text-slate-400'}`} />
              <span>{isAr ? 'رموز خاصة (!@#$%)' : 'Special character (!@#$%)'}</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || !hasLength || !hasUpper || !hasLower || !hasNumber || !hasSpecial || !isMatch}
            className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-primary hover:bg-primary-hover active:bg-primary-pressed text-primary-on font-bold shadow-lg shadow-primary/20 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 transition-all"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-primary-on" />
                <span>{isAr ? 'جاري الحفظ...' : 'Saving password...'}</span>
              </>
            ) : (
              <span>{isAr ? 'حفظ كلمة المرور وتسجيل الدخول' : 'Set new password'}</span>
            )}
          </button>
        </form>
      )}
    </div>
  );
}

