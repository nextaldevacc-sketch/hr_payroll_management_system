'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '../../../context/LanguageContext';
import { API_BASE } from '../../../services/apiClient';
import { Mail, CheckCircle2, AlertTriangle, ArrowRight, ArrowLeft, Loader2 } from 'lucide-react';

export default function ForgotPasswordPage() {
  const { locale, isRTL } = useLanguage();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const isAr = locale === 'ar';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    setErrorMessage('');

    try {
      await fetch(`${API_BASE}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      // Always show success to prevent email enumeration
      setIsSubmitted(true);
    } catch (err) {
      setErrorMessage(isAr ? 'حدث خطأ أثناء معالجة الطلب' : 'An error occurred while processing your request');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-5 text-start">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          {isAr ? 'استعادة كلمة المرور' : 'Forgot your password?'}
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          {isAr
            ? 'أدخل بريدك الإلكتروني المؤسسي وسنرسل لك رابط إعادة التعيين'
            : "Enter your work email and we'll send you a password reset link"}
        </p>
      </div>

      {isSubmitted ? (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs">
            <div className="flex items-center gap-2 font-bold mb-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>{isAr ? 'تم إرسال الطلب بنجاح' : 'Reset Link Dispatched'}</span>
            </div>
            <p className="leading-relaxed">
              {isAr
                ? 'إذا كان البريد الإلكتروني مسجلاً لدينا، فقد تم إرسال رابط إعادة تعيين كلمة المرور. يرجى التحقق من صندوق الوارد.'
                : 'If this email address is registered, a password reset link has been dispatched. Please check your inbox.'}
            </p>
          </div>

          <Link
            href="/login"
            className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-2 transition-colors"
          >
            {isRTL ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
            <span>{isAr ? 'العودة لتسجيل الدخول' : 'Back to sign in'}</span>
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
                placeholder="name@gulftech.ae"
                required
                dir="ltr"
                className="w-full ps-9 pe-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-xs font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/20 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 transition-all"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{isAr ? 'جاري الإرسال...' : 'Sending link...'}</span>
              </>
            ) : (
              <span>{isAr ? 'إرسال رابط إعادة التعيين' : 'Send reset link'}</span>
            )}
          </button>

          <div className="text-center pt-2">
            <Link
              href="/login"
              className="text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 transition-colors inline-flex items-center gap-1.5"
            >
              {isRTL ? <ArrowRight className="w-3.5 h-3.5" /> : <ArrowLeft className="w-3.5 h-3.5" />}
              <span>{isAr ? 'العودة لتسجيل الدخول' : 'Back to sign in'}</span>
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}

