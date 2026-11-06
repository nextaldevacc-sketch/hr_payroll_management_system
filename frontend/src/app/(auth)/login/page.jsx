'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { useLanguage } from '../../../context/LanguageContext';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Clock,
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const { locale, isRTL } = useLanguage();

  const nextParam = searchParams.get('next');
  const reasonParam = searchParams.get('reason');
  const successParam = searchParams.get('success');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [lockRemaining, setLockRemaining] = useState(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  const isAr = locale === 'ar';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMessage(isAr ? 'يرجى إدخال البريد الإلكتروني وكلمة المرور' : 'Email and password are required');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    setLockRemaining(null);

    try {
      const result = await login(email, password);

      // Validate relative safe destination
      let destination = result.defaultLanding || '/';
      if (nextParam && nextParam.startsWith('/') && !nextParam.startsWith('//')) {
        destination = nextParam;
      }

      router.replace(destination);
    } catch (err) {
      setIsLoading(false);
      if (err.code === 'ACCOUNT_LOCKED') {
        setErrorMessage(
          err.message ||
            (isAr
              ? 'تم قفل الحساب بسبب محاولات دخول فاشلة متكررة (5 محاولات). يرجى المحاولة بعد 15 دقيقة.'
              : 'Account is locked due to 5 consecutive failed login attempts. Please try again in 15 minutes.')
        );
      } else if (err.code === 'COMPANY_SUSPENDED') {
        setErrorMessage(
          isAr
            ? 'حساب شركتكم معلق حالياً. يرجى التواصل مع الدعم الفني.'
            : 'Your company account is suspended. Please contact Nextal platform support.'
        );
      } else if (err.code === 'ACCOUNT_DISABLED' || err.code === 'ACCOUNT_ARCHIVED') {
        setErrorMessage(
          isAr
            ? 'تم إيقاف هذا الحساب. يرجى مراجعة مسؤول الشركة.'
            : 'This user account has been disabled or archived. Login refused.'
        );
      } else if (err.code === 'FEATURE_DISABLED') {
        setErrorMessage(
          isAr
            ? 'مدير المنصة غير متوفر في هذا الإصدار (المرحلة 2).'
            : 'Platform administration is not available in this release (Phase 2).'
        );
      } else {
        setErrorMessage(
          isAr
            ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة'
            : 'Invalid email or password'
        );
      }
    }
  };

  return (
    <div>
      <div className="mb-5 text-start">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          {isAr ? 'تسجيل الدخول إلى حسابك' : 'Sign in to your account'}
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          {isAr
            ? 'أدخل بيانات الاعتماد المؤسسية الخاصة بك للمتابعة'
            : 'Enter your corporate credentials to continue'}
        </p>
      </div>

      {/* Session Expired Notice */}
      {reasonParam === 'session_expired' && (
        <div className="mb-4 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs flex items-center gap-2">
          <Clock className="w-4 h-4 shrink-0 text-amber-500" />
          <span>
            {isAr
              ? 'انتهت جلستك، يرجى تسجيل الدخول مرة أخرى'
              : 'Your session expired, please sign in again'}
          </span>
        </div>
      )}

      {/* Success Banner */}
      {successParam && (
        <div className="mb-4 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
          <span>
            {successParam === 'password_reset'
              ? isAr
                ? 'تم إعادة تعيين كلمة المرور بنجاح. يمكنك الآن تسجيل الدخول.'
                : 'Password reset successfully. You can now sign in.'
              : isAr
              ? 'تم تفعيل الحساب وتعيين كلمة المرور بنجاح.'
              : 'Account activated and password set successfully.'}
          </span>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="mb-4 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
          <span className="leading-snug">{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 text-start">
            {isAr ? 'البريد الإلكتروني المؤسسي' : 'Work Email'}
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 start-0 ps-3 flex items-center pointer-events-none text-slate-400">
              <Mail className="w-4 h-4" />
            </div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. name@company.ae"
              required
              autoComplete="email"
              dir="ltr"
              className="w-full ps-9 pe-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-xs font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              {isAr ? 'كلمة المرور' : 'Password'}
            </label>
            <Link
              href="/forgot-password"
              className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline"
            >
              {isAr ? 'نسيت كلمة المرور؟' : 'Forgot password?'}
            </Link>
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 start-0 ps-3 flex items-center pointer-events-none text-slate-400">
              <Lock className="w-4 h-4" />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              required
              autoComplete="current-password"
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

        {/* Submit Button */}
        <button
          type="submit"
          id="btn-login-submit"
          disabled={!hydrated || isLoading}
          className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/20 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 transition-all"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{isAr ? 'جاري التحقق...' : 'Signing in...'}</span>
            </>
          ) : (
            <>
              <span>{isAr ? 'تسجيل الدخول' : 'Sign in'}</span>
              {isRTL ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
            </>
          )}
        </button>
      </form>
    </div>
  );
}

