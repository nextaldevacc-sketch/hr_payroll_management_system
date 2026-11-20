'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from 'next-themes';
import { Sun, Moon, Globe, ShieldCheck, Play, Pause, Sparkles } from 'lucide-react';

/**
 * AuthShell: Split-card layout matching frontend/docs/design/login-reference.png
 * - 50/50 Desktop split: Left Media Panel (Video/Poster) + Right Interactive Form
 * - In Arabic (RTL): Swapped naturally (Form on the reading side, Media on the other)
 * - Single column on mobile (< 768px) with compact top visual branding
 * - Prefers-reduced-motion: Pauses video, presents high-res poster with manual toggle
 * - Dual-mode video selection: Light vs Dark themes with WebM & MP4 fallback sources
 */
export function AuthShell({ children, showVideo = true }) {
  const { locale, toggleLanguage, isRTL } = useLanguage();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isReducedMotion, setIsReducedMotion] = useState(false);
  const videoRef = useRef(null);

  const isAr = locale === 'ar';
  const isDark = mounted ? resolvedTheme === 'dark' : true;

  useEffect(() => {
    setMounted(true);
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setIsReducedMotion(mediaQuery.matches);
    if (mediaQuery.matches) {
      setIsPlaying(false);
    }

    const handler = (e) => {
      setIsReducedMotion(e.matches);
      if (e.matches) setIsPlaying(false);
    };
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  const toggleVideoPlayback = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  // Video and Poster Assets Selection based on active theme
  const videoSources = isDark
    ? {
        webm: '/media/login/login-dark.webm',
        mp4: '/media/login/login-dark.mp4',
        mobileMp4: '/media/login/login-dark-mobile.mp4',
        poster: '/media/login/login-dark-poster.jpg',
      }
    : {
        webm: '/media/login/login-light.webm',
        mp4: '/media/login/login-light.mp4',
        mobileMp4: '/media/login/login-light-mobile.mp4',
        poster: '/media/login/login-light-poster.jpg',
      };

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className="min-h-screen w-full flex items-center justify-center p-3 sm:p-6 lg:p-10 bg-slate-100 dark:bg-[#07090D] text-slate-900 dark:text-slate-100 transition-colors"
      style={{
        backgroundImage: isDark
          ? 'radial-gradient(ellipse at 50% 0%, rgba(230, 166, 14, 0.05), transparent 70%), radial-gradient(ellipse at 80% 80%, rgba(14, 165, 233, 0.04), transparent 60%)'
          : 'radial-gradient(ellipse at 50% 0%, rgba(230, 166, 14, 0.08), transparent 70%), radial-gradient(ellipse at 80% 80%, rgba(99, 102, 241, 0.06), transparent 60%)',
      }}
    >
      {/* Centered Floating Card Container */}
      <div className="w-full max-w-[1160px] min-h-[640px] lg:min-h-[680px] rounded-3xl overflow-hidden border border-slate-200/90 dark:border-white/10 bg-white dark:bg-[#0C101A] shadow-2xl shadow-slate-300/40 dark:shadow-black/70 flex flex-col md:flex-row rtl:md:flex-row-reverse relative">
        {/* Top Controls: Language and Theme Switchers */}
        <div className="absolute top-4 end-4 z-30 flex items-center gap-2">
          <button
            type="button"
            onClick={toggleLanguage}
            title={isAr ? 'Switch to English' : 'التحويل إلى العربية'}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border border-slate-200 dark:border-white/15 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 shadow-sm transition-all active:scale-95"
          >
            <Globe className="w-3.5 h-3.5 text-amber-500" />
            <span>{isAr ? 'English' : 'العربية'}</span>
          </button>

          {mounted && (
            <button
              type="button"
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
              title={isAr ? 'تبديل المظهر' : 'Toggle theme'}
              className="p-2 rounded-full border border-slate-200 dark:border-white/15 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 shadow-sm transition-all active:scale-95"
            >
              {isDark ? (
                <Sun className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <Moon className="w-3.5 h-3.5 text-slate-700" />
              )}
            </button>
          )}
        </div>

        {/* LEFT PANEL: Media & Brand Showcase (50% on md+) */}
        <div className="md:w-1/2 relative bg-slate-950 overflow-hidden flex flex-col justify-between p-6 sm:p-10 text-white min-h-[320px] md:min-h-full">
          {/* Background Video Element */}
          {showVideo ? (
            <video
              ref={videoRef}
              key={isDark ? 'dark-video' : 'light-video'}
              autoPlay={!isReducedMotion}
              loop
              muted
              playsInline
              preload="metadata"
              poster={videoSources.poster}
              className="absolute inset-0 w-full h-full object-cover object-center scale-[1.02]"
            >
              <source src={videoSources.webm} type="video/webm" />
              <source src={videoSources.mp4} type="video/mp4" />
              <source src={videoSources.mobileMp4} type="video/mp4" media="(max-width: 640px)" />
              {/* Fallback to poster image if HTML5 video is unsupported */}
              <img
                src={videoSources.poster}
                alt="Nextal Platform Interface"
                className="w-full h-full object-cover"
              />
            </video>
          ) : (
            <img
              src={videoSources.poster}
              alt="Nextal Platform Interface"
              className="absolute inset-0 w-full h-full object-cover object-center"
            />
          )}

          {/* High-Contrast Gradient Scrim Overlays for WCAG AAA Readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/45 to-slate-950/40 pointer-events-none" />
          <div className="absolute inset-0 bg-radial-gradient from-transparent via-slate-950/20 to-slate-950/70 pointer-events-none" />

          {/* Top Branding Chip & Reduced-Motion Play Button */}
          <div className="relative z-10 flex items-center justify-between">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-[11px] font-semibold text-amber-300 shadow-lg">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>
                {isAr ? 'نظام موارد بشرية متوافق مع المرسوم بقانون 33/2021' : '⚡ UAE Enterprise · Law 33/2021'}
              </span>
            </div>

            {/* Video Play/Pause Control (Crucial for Accessibility / Reduced Motion) */}
            {showVideo && (
              <button
                type="button"
                onClick={toggleVideoPlayback}
                aria-label={isPlaying ? 'Pause video background' : 'Play video background'}
                className="p-2 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/20 text-white/90 transition-transform active:scale-95"
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>

          {/* Bottom Brand Narrative & Floating Glass Feature Chip */}
          <div className="relative z-10 space-y-4 pt-16 md:pt-0">
            {/* Feature Floating Chip */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-amber-500/20 backdrop-blur-md border border-amber-400/30 text-amber-300 text-xs font-semibold shadow-xl">
              <span>{isAr ? '⚡ تدقيق ملفات حماية الأجور (WPS SIF) فوري' : '⚡ Live WPS SIF validation · Law 33/2021'}</span>
            </div>

            <div className="space-y-2">
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-white drop-shadow-md">
                {isAr
                  ? 'الجيل الجديد لإدارة الموارد البشرية والرواتب للمؤسسات'
                  : 'Next-generation HR & Payroll for UAE enterprise'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-200/90 leading-relaxed font-normal drop-shadow">
                {isAr
                  ? 'منصة مؤسسية متكاملة لرواتب WPS، مكافأة نهاية الخدمة التلقائية، البصمة البيومترية، وإدارة الشركات المتعددة.'
                  : 'WPS-compliant SIF generation, automated gratuity calculation, biometric attendance, and multi-company governance.'}
              </p>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: Centered Interactive Form (50% on md+) */}
        <div className="md:w-1/2 flex flex-col justify-center px-6 py-8 sm:p-10 lg:p-14 bg-white dark:bg-[#0C101A] relative z-20">
          <div className="w-full max-w-[420px] mx-auto space-y-6">
            {/* Brand Header: Logo + NEXTAL wordmark + Badge */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-sm">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
                    NEXTAL
                  </h1>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                    UAE Enterprise
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  {isAr ? 'إدارة الموارد البشرية والرواتب' : 'HR & Payroll Platform'}
                </p>
              </div>
            </div>

            {/* Injected Interactive Form Content */}
            <div className="w-full">
              {children}
            </div>

            {/* Compliance Footer Note */}
            <div className="pt-4 border-t border-slate-100 dark:border-white/5 text-center">
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                {isAr
                  ? 'مرخص ومتوافق مع وزارة الموارد البشرية والتوطين ومصرف الإمارات المركزي'
                  : 'Compliant with MOHRE regulations and UAE Central Bank WPS guidelines'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AuthShell;
