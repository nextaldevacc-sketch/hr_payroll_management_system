'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth, DEMO_USERS } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from 'next-themes';
import {
  ShieldCheck,
  Lock,
  Mail,
  KeyRound,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Building2,
  Sparkles,
  Sun,
  Moon,
  Globe,
  UserCheck,
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, switchDemoUser, user: currentUser } = useAuth();
  const { locale, setLocale, isRTL } = useLanguage();
  const { resolvedTheme, setTheme } = useTheme();

  // Mode: 'login' | 'forgot' | 'invite'
  const initialTab = searchParams?.get('tab') || (searchParams?.get('token') ? 'invite' : 'login');
  const [activeTab, setActiveTab] = useState(initialTab);

  const [email, setEmail] = useState('admin@gulftech.ae');
  const [password, setPassword] = useState('Nextal@2026!');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Invite / Reset token states
  const [tokenInput, setTokenInput] = useState(searchParams?.get('token') || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // UI status feedback
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    const t = searchParams?.get('token');
    if (t) {
      setTokenInput(t);
      setActiveTab('invite');
    }
  }, [searchParams]);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setIsLoading(true);

    try {
      await login(email, password);
      setSuccessMessage(locale === 'ar' ? 'تم تسجيل الدخول بنجاح! جارٍ التحويل...' : 'Sign in successful! Redirecting to dashboard...');
      setTimeout(() => {
        router.push('/');
      }, 700);
    } catch (err) {
      if (err.status === 423 || err.code === 'ACCOUNT_LOCKED') {
        setIsLocked(true);
        setErrorMessage(
          locale === 'ar'
            ? 'تم قفل الحساب لمدة 15 دقيقة بعد 5 محاولات خاطئة متتالية (المعيار 5.4)'
            : 'Account is temporarily locked for 15 minutes due to 5 consecutive failed login attempts (Spec 5.4).'
        );
      } else if (err.code === 'COMPANY_SUSPENDED') {
        setErrorMessage(
          locale === 'ar'
            ? 'حساب الشركة معلق حالياً من قبل إدارة المنصة (FR-PL2)'
            : 'Company account is suspended by Nextal Platform Administration (FR-PL2).'
        );
      } else {
        setErrorMessage(
          locale === 'ar'
            ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة'
            : err.message || 'Invalid email or password. Please try again.'
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setIsLoading(true);

    try {
      const res = await fetch('http://localhost:5000/api/v1/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      setSuccessMessage(
        locale === 'ar'
          ? 'تم إرسال رابط إعادة ضبط كلمة المرور إلى بريدك الإلكتروني.'
          : 'Password reset instructions have been sent to your registered email.'
      );
      if (data.resetToken) {
        setTokenInput(data.resetToken);
      }
    } catch (err) {
      setSuccessMessage(
        locale === 'ar'
          ? 'إذا كان الحساب مسجلاً، فقد تم إرسال رابط الاستعادة.'
          : 'If the email exists, a reset link has been dispatched.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetPasswordSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (newPassword !== confirmPassword) {
      setErrorMessage(locale === 'ar' ? 'كلمات المرور غير متطابقة' : 'Passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      setErrorMessage(locale === 'ar' ? 'يجب أن لا تقل كلمة المرور عن 8 خانات' : 'Password must be at least 8 characters');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/v1/auth/set-password-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tokenInput, password: newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to set password');

      setSuccessMessage(
        locale === 'ar'
          ? 'تم تعيين كلمة المرور وتفعيل الحساب بنجاح! يمكنك الآن تسجيل الدخول.'
          : 'Password configured and account activated! You can now log in.'
      );
      setPassword(newPassword);
      setTimeout(() => setActiveTab('login'), 1200);
    } catch (err) {
      setErrorMessage(err.message || 'Invalid or expired invite token');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDemoFill = (roleKey) => {
    const demo = DEMO_USERS[roleKey];
    if (demo) {
      setEmail(demo.email);
      setPassword('Nextal@2026!');
      setErrorMessage('');
      setIsLocked(false);
      switchDemoUser(roleKey);
    }
  };

  return (
    <div
      className="min-h-screen w-full flex flex-col justify-between p-4 md:p-8"
      style={{
        background: 'var(--bg-canvas)',
        color: 'var(--text-primary)',
        direction: isRTL ? 'rtl' : 'ltr',
      }}
    >
      {/* Top Controls Bar */}
      <div className="w-full max-w-6xl mx-auto flex items-center justify-between py-2">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg shadow-md"
            style={{
              background: 'var(--primary)',
              color: 'var(--on-primary)',
            }}
          >
            N
          </div>
          <div>
            <span className="font-bold text-lg tracking-tight">NEXTAL</span>
            <span
              className="text-xs px-2 py-0.5 rounded-full ml-2 font-medium"
              style={{
                background: 'var(--primary-wash)',
                color: 'var(--primary-strong)',
                border: '1px solid var(--glass-border)',
              }}
            >
              UAE Payroll · Section 5.4
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Language Toggle */}
          <button
            onClick={() => setLocale(locale === 'en' ? 'ar' : 'en')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors hover:opacity-80"
            style={{
              background: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-secondary)',
            }}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{locale === 'en' ? 'العربية' : 'English'}</span>
          </button>

          {/* Theme Toggle */}
          <button
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            className="p-2 rounded-lg border transition-colors hover:opacity-80"
            style={{
              background: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-secondary)',
            }}
            title="Toggle theme"
          >
            {resolvedTheme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Glassmorphic Login Card */}
      <div className="w-full max-w-md mx-auto my-auto py-8">
        <div
          className="rounded-2xl p-6 md:p-8 relative backdrop-blur-xl shadow-2xl transition-all"
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--glass-border)',
            boxShadow: 'var(--shadow-well-hover)',
          }}
        >
          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold tracking-tight mb-2 gold-heading">
              {activeTab === 'login'
                ? locale === 'ar'
                  ? 'تسجيل الدخول إلى النظام'
                  : 'Sign in to Nextal'
                : activeTab === 'forgot'
                ? locale === 'ar'
                  ? 'استعادة كلمة المرور'
                  : 'Reset Password'
                : locale === 'ar'
                ? 'تفعيل الحساب وكلمة المرور'
                : 'Set Password from Invite'}
            </h1>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              {activeTab === 'login'
                ? locale === 'ar'
                  ? 'نظام إدارة الموارد البشرية ومسيرات الرواتب المتوافقة مع WPS الإمارات'
                  : 'UAE MOHRE & WPS Multi-Company HR & Payroll Management'
                : locale === 'ar'
                ? 'أدخل بيانات التحقق لاستكمال إعداد حسابك الآمن'
                : 'Enter your credentials to manage your UAE HR operations securely'}
            </p>
          </div>

          {/* Tabs switch */}
          <div
            className="flex rounded-xl p-1 mb-6 border"
            style={{
              background: 'var(--bg-well)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            <button
              type="button"
              onClick={() => {
                setActiveTab('login');
                setErrorMessage('');
              }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'login' ? 'shadow-sm' : 'hover:opacity-75'
              }`}
              style={{
                background: activeTab === 'login' ? 'var(--bg-surface)' : 'transparent',
                color: activeTab === 'login' ? 'var(--primary-strong)' : 'var(--text-tertiary)',
              }}
            >
              {locale === 'ar' ? 'دخول' : 'Sign In'}
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('forgot');
                setErrorMessage('');
              }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'forgot' ? 'shadow-sm' : 'hover:opacity-75'
              }`}
              style={{
                background: activeTab === 'forgot' ? 'var(--bg-surface)' : 'transparent',
                color: activeTab === 'forgot' ? 'var(--primary-strong)' : 'var(--text-tertiary)',
              }}
            >
              {locale === 'ar' ? 'نسيت الرمز' : 'Forgot Password'}
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('invite');
                setErrorMessage('');
              }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'invite' ? 'shadow-sm' : 'hover:opacity-75'
              }`}
              style={{
                background: activeTab === 'invite' ? 'var(--bg-surface)' : 'transparent',
                color: activeTab === 'invite' ? 'var(--primary-strong)' : 'var(--text-tertiary)',
              }}
            >
              {locale === 'ar' ? 'دعوة موظف' : 'Invite Link'}
            </button>
          </div>

          {/* Alerts */}
          {errorMessage && (
            <div
              className="mb-4 p-3 rounded-xl flex items-start gap-2.5 text-xs font-medium border animate-in fade-in"
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                borderColor: 'rgba(239, 68, 68, 0.3)',
                color: '#ef4444',
              }}
            >
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div
              className="mb-4 p-3 rounded-xl flex items-start gap-2.5 text-xs font-medium border animate-in fade-in"
              style={{
                background: 'rgba(16, 185, 129, 0.1)',
                borderColor: 'rgba(16, 185, 129, 0.3)',
                color: '#10b981',
              }}
            >
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* TAB 1: LOGIN */}
          {activeTab === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  {locale === 'ar' ? 'البريد الإلكتروني' : 'Work Email Address'}
                </label>
                <div className="relative">
                  <Mail
                    className={`absolute top-3 w-4 h-4 text-neutral-400 ${isRTL ? 'right-3' : 'left-3'}`}
                  />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.ae"
                    className={`w-full rounded-xl py-2.5 text-sm transition-all outline-none border focus:ring-2 ${
                      isRTL ? 'pr-9 pl-3' : 'pl-9 pr-3'
                    }`}
                    style={{
                      background: 'var(--bg-well)',
                      borderColor: 'var(--border-subtle)',
                      color: 'var(--text-primary)',
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                    {locale === 'ar' ? 'كلمة المرور' : 'Password'}
                  </label>
                  <button
                    type="button"
                    onClick={() => setActiveTab('forgot')}
                    className="text-xs hover:underline"
                    style={{ color: 'var(--primary-strong)' }}
                  >
                    {locale === 'ar' ? 'هل نسيت كلمة المرور؟' : 'Forgot password?'}
                  </button>
                </div>
                <div className="relative">
                  <Lock
                    className={`absolute top-3 w-4 h-4 text-neutral-400 ${isRTL ? 'right-3' : 'left-3'}`}
                  />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className={`w-full rounded-xl py-2.5 text-sm transition-all outline-none border focus:ring-2 ${
                      isRTL ? 'pr-9 pl-10' : 'pl-9 pr-10'
                    }`}
                    style={{
                      background: 'var(--bg-well)',
                      borderColor: 'var(--border-subtle)',
                      color: 'var(--text-primary)',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={`absolute top-3 text-neutral-400 hover:text-neutral-200 ${
                      isRTL ? 'left-3' : 'right-3'
                    }`}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded text-amber-500 focus:ring-amber-500"
                  />
                  <span style={{ color: 'var(--text-tertiary)' }}>
                    {locale === 'ar' ? 'تذكر جلسة العمل (8 ساعات)' : 'Keep session active (8 hours)'}
                  </span>
                </label>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95 disabled:opacity-50"
                style={{
                  background: 'var(--primary)',
                  color: 'var(--on-primary)',
                }}
              >
                {isLoading ? (
                  <span>{locale === 'ar' ? 'جارٍ التحقق...' : 'Authenticating...'}</span>
                ) : (
                  <>
                    <span>{locale === 'ar' ? 'تسجيل الدخول الآمن' : 'Sign in securely'}</span>
                    {isRTL ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                  </>
                )}
              </button>
            </form>
          )}

          {/* TAB 2: FORGOT PASSWORD */}
          {activeTab === 'forgot' && (
            <form onSubmit={handleForgotSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  {locale === 'ar' ? 'أدخل بريدك الإلكتروني المسجل' : 'Registered Work Email'}
                </label>
                <div className="relative">
                  <Mail
                    className={`absolute top-3 w-4 h-4 text-neutral-400 ${isRTL ? 'right-3' : 'left-3'}`}
                  />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.ae"
                    className={`w-full rounded-xl py-2.5 text-sm transition-all outline-none border ${
                      isRTL ? 'pr-9 pl-3' : 'pl-9 pr-3'
                    }`}
                    style={{
                      background: 'var(--bg-well)',
                      borderColor: 'var(--border-subtle)',
                      color: 'var(--text-primary)',
                    }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg"
                style={{
                  background: 'var(--primary)',
                  color: 'var(--on-primary)',
                }}
              >
                <KeyRound className="w-4 h-4" />
                <span>{locale === 'ar' ? 'إرسال رابط إعادة الضبط' : 'Send Reset Link'}</span>
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('login')}
                  className="text-xs hover:underline"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  {locale === 'ar' ? 'العودة إلى شاشة تسجيل الدخول' : 'Back to sign in'}
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: SET PASSWORD FROM INVITE */}
          {activeTab === 'invite' && (
            <form onSubmit={handleSetPasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  {locale === 'ar' ? 'رمز أو رابط الدعوة' : 'Invitation Token'}
                </label>
                <input
                  type="text"
                  required
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  placeholder="Paste invite token here"
                  className="w-full rounded-xl py-2 px-3 text-xs transition-all outline-none border font-mono"
                  style={{
                    background: 'var(--bg-well)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  {locale === 'ar' ? 'كلمة المرور الجديدة' : 'New Password (min 8 characters)'}
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full rounded-xl py-2 px-3 text-sm transition-all outline-none border"
                  style={{
                    background: 'var(--bg-well)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  {locale === 'ar' ? 'تأكيد كلمة المرور' : 'Confirm Password'}
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full rounded-xl py-2 px-3 text-sm transition-all outline-none border"
                  style={{
                    background: 'var(--bg-well)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg"
                style={{
                  background: 'var(--primary)',
                  color: 'var(--on-primary)',
                }}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{locale === 'ar' ? 'تفعيل الحساب وتعيين الرمز' : 'Activate & Set Password'}</span>
              </button>
            </form>
          )}
        </div>

        {/* Quick Demo Accounts Switcher (Rendered only in non-production AND when NEXT_PUBLIC_DEMO_MODE === 'true') */}
        {process.env.NODE_ENV !== 'production' && process.env.NEXT_PUBLIC_DEMO_MODE === 'true' && (
          <div
            id="demo-personas-bar"
            className="mt-6 p-4 rounded-2xl border"
            style={{
              background: 'var(--bg-surface)',
              borderColor: 'var(--glass-border)',
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" style={{ color: 'var(--primary)' }} />
                <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {locale === 'ar' ? 'مبدل الحسابات التجريبية (شامل الأدوار الـ 8)' : 'Demo Personas (Section 5.2)'}
                </span>
              </div>
              <span className="text-[10px] font-mono" style={{ color: 'var(--text-tertiary)' }}>
                Pass: Nextal@2026!
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {Object.entries(DEMO_USERS).map(([key, demo]) => {
                const isActive = email === demo.email;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleQuickDemoFill(key)}
                    className={`p-2 rounded-xl text-start transition-all border flex flex-col justify-between ${
                      isActive ? 'scale-[1.02]' : 'hover:opacity-85'
                    }`}
                    style={{
                      background: isActive ? 'var(--primary-wash)' : 'var(--bg-well)',
                      borderColor: isActive ? 'var(--primary)' : 'var(--border-subtle)',
                    }}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span
                        className="text-[10px] font-bold tracking-tight truncate"
                        style={{ color: isActive ? 'var(--primary-strong)' : 'var(--text-primary)' }}
                      >
                        {locale === 'ar' ? demo.roleNameAr : demo.roleNameEn}
                      </span>
                      {demo.sees_salary && (
                        <span className="text-[8px] px-1 py-0.2 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20">
                          WPS
                        </span>
                      )}
                    </div>
                    <span className="text-[9px] font-mono truncate" style={{ color: 'var(--text-tertiary)' }}>
                      {demo.email.split('@')[0]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Footer System Meta */}
      <div className="w-full max-w-6xl mx-auto flex items-center justify-between text-[11px] py-2" style={{ color: 'var(--text-tertiary)' }}>
        <span>Nextal HR & Payroll Software · UAE MOHRE Compliance</span>
        <span>Version 3.1 · Sprint Phase 2 Complete</span>
      </div>
    </div>
  );
}
