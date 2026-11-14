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
  ShieldCheck,
  Key,
  Copy,
  Check,
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, verifyMfa, initMfaEnrol, confirmMfaEnrol } = useAuth();
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

  // MFA Flow States: 'credentials' | 'mfa_verify' | 'mfa_enrol' | 'mfa_recovery'
  const [step, setStep] = useState('credentials');
  const [mfaToken, setMfaToken] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [enrolData, setEnrolData] = useState(null);
  const [recoveryCodes, setRecoveryCodes] = useState([]);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedCodes, setCopiedCodes] = useState(false);
  const [loginDestination, setLoginDestination] = useState('/');

  useEffect(() => {
    setHydrated(true);
  }, []);

  const isAr = locale === 'ar';

  const handleCredentialsSubmit = async (e) => {
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

      // Handle MFA requirement for privileged roles
      if (result.status === 'mfa_required' || result.mfa_required) {
        setMfaToken(result.mfa_token);
        let dest = result.defaultLanding || '/';
        if (nextParam && nextParam.startsWith('/') && !nextParam.startsWith('//')) {
          dest = nextParam;
        }
        setLoginDestination(dest);

        if (result.mfa_enrol_required) {
          // Initialize enrolment: fetch QR code & secret
          const data = await initMfaEnrol(result.mfa_token);
          setEnrolData(data);
          setStep('mfa_enrol');
        } else {
          setStep('mfa_verify');
        }
        setIsLoading(false);
        return;
      }

      if (result.user?.must_change_password) {
        router.replace('/change-password');
        return;
      }

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
      } else if (err.code === 'ACCOUNT_DISABLED') {
        setErrorMessage(
          isAr
            ? 'تم إيقاف هذا الحساب. يرجى مراجعة مسؤول الشركة.'
            : 'This user account has been disabled. Please contact your company administrator.'
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

  const handleMfaVerifySubmit = async (e) => {
    e.preventDefault();
    if (!mfaCode) {
      setErrorMessage(isAr ? 'يرجى إدخال رمز التحقق' : 'Verification code is required');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const result = await verifyMfa(mfaToken, mfaCode);
      if (result.user?.must_change_password) {
        router.replace('/change-password');
        return;
      }
      let destination = result.defaultLanding || loginDestination || '/';
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
              ? 'تم قفل الحساب بسبب محاولات دخول فاشلة متكررة. يرجى المحاولة بعد 15 دقيقة.'
              : 'Account is locked due to consecutive failed attempts. Please try again in 15 minutes.')
        );
      } else if (err.code === 'CODE_REUSED') {
        setErrorMessage(
          isAr
            ? 'تم استخدام هذا الرمز بالفعل. يرجى الانتظار 30 ثانية للرمز الجديد.'
            : 'This verification code has already been used. Please wait 30 seconds for the next code.'
        );
      } else {
        setErrorMessage(
          err.message ||
            (isAr
              ? 'رمز التحقق غير صحيح'
              : 'Invalid verification or recovery code.')
        );
      }
    }
  };

  const handleMfaEnrolSubmit = async (e) => {
    e.preventDefault();
    if (!mfaCode) {
      setErrorMessage(isAr ? 'يرجى إدخال الرمز المكون من 6 أرقام لتأكيد التفعيل' : '6-digit code is required to confirm enrolment');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const result = await confirmMfaEnrol(mfaToken, mfaCode);
      setIsLoading(false);
      setRecoveryCodes(result.recovery_codes || []);
      setStep('mfa_recovery');
    } catch (err) {
      setIsLoading(false);
      setErrorMessage(
        err.message ||
          (isAr
            ? 'رمز التحقق غير صحيح. يرجى التأكد من الوقت والمحاولة مرة أخرى.'
            : 'Invalid verification code. Please check your authenticator app and try again.')
      );
    }
  };

  const handleFinishRecoveryAndProceed = () => {
    router.replace(loginDestination || '/');
  };

  const copyManualKey = () => {
    if (enrolData?.secret) {
      navigator.clipboard.writeText(enrolData.secret);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  const copyAllRecoveryCodes = () => {
    if (recoveryCodes.length > 0) {
      navigator.clipboard.writeText(recoveryCodes.join('\n'));
      setCopiedCodes(true);
      setTimeout(() => setCopiedCodes(false), 2000);
    }
  };

  return (
    <div>
      {/* Session Expired Notice */}
      {reasonParam === 'session_expired' && step === 'credentials' && (
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
      {successParam && step === 'credentials' && (
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

      {/* STEP 1: Standard Credentials Form */}
      {step === 'credentials' && (
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

          <form onSubmit={handleCredentialsSubmit} className="space-y-4">
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
      )}

      {/* STEP 2: MFA Verification Screen */}
      {step === 'mfa_verify' && (
        <div>
          <div className="mb-5 text-start">
            <div className="inline-flex p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 mb-2">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {isAr ? 'المصادقة الثنائية (MFA)' : 'Two-Factor Authentication'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {isRecoveryMode
                ? isAr
                  ? 'أدخل أحد رموز الاسترداد الاحتياطية المكونة من 10 خانات'
                  : 'Enter one of your 10-character emergency recovery codes'
                : isAr
                ? 'أدخل الرمز المكون من 6 أرقام من تطبيق المصادقة الخاص بك'
                : 'Enter the 6-digit verification code from your authenticator app'}
            </p>
          </div>

          <form onSubmit={handleMfaVerifySubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 text-start">
                {isRecoveryMode
                  ? isAr
                    ? 'رمز الاسترداد للطوارئ'
                    : 'Emergency Recovery Code'
                  : isAr
                  ? 'رمز التحقق (6 أرقام)'
                  : 'Authentication Code (6 digits)'}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 start-0 ps-3 flex items-center pointer-events-none text-slate-400">
                  {isRecoveryMode ? <Key className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                </div>
                <input
                  type="text"
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value)}
                  placeholder={isRecoveryMode ? 'e.g. A1B2C-3D4E5' : '123456'}
                  autoFocus
                  required
                  dir="ltr"
                  maxLength={isRecoveryMode ? 20 : 6}
                  className="w-full ps-9 pe-3 py-2.5 text-center text-sm tracking-widest font-mono rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !mfaCode.trim()}
              className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/20 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 transition-all"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{isAr ? 'جاري التحقق...' : 'Verifying...'}</span>
                </>
              ) : (
                <>
                  <span>{isAr ? 'تأكيد الرمز' : 'Verify & Continue'}</span>
                  {isRTL ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                </>
              )}
            </button>

            <div className="pt-2 flex flex-col gap-2 text-center">
              <button
                type="button"
                onClick={() => {
                  setIsRecoveryMode(!isRecoveryMode);
                  setMfaCode('');
                  setErrorMessage('');
                }}
                className="text-xs text-amber-600 dark:text-amber-400 hover:underline font-semibold"
              >
                {isRecoveryMode
                  ? isAr
                    ? 'استخدام تطبيق المصادقة بدلاً من ذلك'
                    : 'Use authenticator app instead'
                  : isAr
                  ? 'استخدام رمز استرداد الطوارئ'
                  : 'Use an emergency recovery code'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setStep('credentials');
                  setMfaToken('');
                  setMfaCode('');
                  setErrorMessage('');
                }}
                className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              >
                {isAr ? 'العودة إلى تسجيل الدخول' : 'Back to login'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* STEP 3: MFA Enrolment Wizard Screen */}
      {step === 'mfa_enrol' && enrolData && (
        <div>
          <div className="mb-4 text-start">
            <div className="inline-flex p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 mb-2">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {isAr ? 'إعداد المصادقة الثنائية (MFA)' : 'Enrol in Multi-Factor Authentication'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {isAr
                ? 'يتطلب دورك المؤسسي تفعيل المصادقة الثنائية لحماية الحساب'
                : 'Your privileged role requires multi-factor authentication to secure this account'}
            </p>
          </div>

          {/* QR Code display */}
          <div className="my-3 p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col items-center">
            <img
              src={enrolData.qr_code}
              alt="MFA QR Code"
              className="w-44 h-44 rounded-lg bg-white p-1 border border-slate-100 dark:border-slate-800"
            />
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 text-center">
              {isAr
                ? 'امسح رمز الاستجابة السريعة بتطبيق Google Authenticator أو ما شابه'
                : 'Scan QR with Google Authenticator or any RFC 6238 TOTP app'}
            </p>

            {/* Manual Secret Key */}
            <div className="mt-2.5 w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="text-start overflow-hidden">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  {isAr ? 'المفتاح اليدوي' : 'Manual Setup Key'}
                </span>
                <span className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-200 select-all tracking-wider">
                  {enrolData.manual_key}
                </span>
              </div>
              <button
                type="button"
                onClick={copyManualKey}
                className="p-1.5 rounded-lg text-slate-500 hover:text-amber-500 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                title="Copy Key"
              >
                {copiedKey ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <form onSubmit={handleMfaEnrolSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 text-start">
                {isAr ? 'أدخل الرمز المكون من 6 أرقام لتأكيد التفعيل' : 'Enter 6-digit confirmation code'}
              </label>
              <input
                type="text"
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value)}
                placeholder="123456"
                autoFocus
                required
                maxLength={6}
                dir="ltr"
                className="w-full py-2.5 px-3 text-center text-sm tracking-widest font-mono rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || mfaCode.length !== 6}
              className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/20 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 transition-all"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{isAr ? 'جاري التحقق والتفعيل...' : 'Activating MFA...'}</span>
                </>
              ) : (
                <>
                  <span>{isAr ? 'تأكيد وتفعيل المصادقة' : 'Confirm & Enable MFA'}</span>
                  {isRTL ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* STEP 4: Display 10 Single-Use Emergency Recovery Codes */}
      {step === 'mfa_recovery' && (
        <div>
          <div className="mb-4 text-start">
            <div className="inline-flex p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mb-2">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {isAr ? 'تم تفعيل المصادقة الثنائية بنجاح' : 'MFA Enabled Successfully'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {isAr
                ? 'احفظ هذه الرموز الاحتياطية العشرة للاستخدام في حالات الطوارئ (كل رمز يُستخدم مرة واحدة فقط)'
                : 'Save these 10 emergency recovery codes. Each code can be used once if you lose device access.'}
            </p>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 mb-4">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200 dark:border-slate-800">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                {isAr ? 'رموز الاسترداد للطوارئ' : 'Emergency Recovery Codes'}
              </span>
              <button
                type="button"
                onClick={copyAllRecoveryCodes}
                className="text-xs font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1 hover:underline"
              >
                {copiedCodes ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCodes ? (isAr ? 'تم النسخ!' : 'Copied!') : (isAr ? 'نسخ الكل' : 'Copy All')}</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-center">
              {recoveryCodes.map((code, idx) => (
                <div
                  key={idx}
                  className="py-1 px-2 font-mono text-xs font-semibold bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 tracking-wider"
                >
                  {code}
                </div>
              ))}
            </div>
          </div>

          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-800 dark:text-amber-300 text-xs mb-4 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
            <span className="leading-snug">
              {isAr
                ? 'لن تظهر هذه الرموز مرة أخرى. قم بنسخها وتخزينها في مكان آمن.'
                : 'These recovery codes will not be shown again. Store them securely in a password manager.'}
            </span>
          </div>

          <button
            type="button"
            onClick={handleFinishRecoveryAndProceed}
            className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/20 active:scale-[0.99] flex items-center justify-center gap-2 transition-all"
          >
            <span>{isAr ? 'متابعة إلى لوحة التحكم' : 'Continue to Dashboard'}</span>
            {isRTL ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
          </button>
        </div>
      )}
    </div>
  );
}


