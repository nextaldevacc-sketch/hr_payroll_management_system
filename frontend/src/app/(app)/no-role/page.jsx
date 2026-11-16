'use client';

import React from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useLanguage } from '../../../context/LanguageContext';
import { ShieldAlert, LogOut, RefreshCw } from 'lucide-react';

export default function NoRolePage() {
  const { user, logout, refreshUser } = useAuth();
  const { language } = useLanguage();
  const isAr = language === 'ar';

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div
        data-testid="no-role-page"
        className="max-w-md w-full p-6 md:p-8 rounded-3xl bg-surface/90 border border-border shadow-2xl backdrop-blur-xl text-center space-y-6"
      >
        <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div>
          <h1 className="text-lg md:text-xl font-bold text-text mb-2">
            {isAr ? 'لم يتم تعيين أي دور لحسابك' : 'No Role Assigned'}
          </h1>
          <p className="text-xs text-text-muted leading-relaxed">
            {isAr
              ? 'تم تسجيل دخولك بنجاح، ولكن لم يتم تعيين أي دور أو صلاحيات لحسابك بعد. يرجى مراجعة مسؤول الشركة.'
              : 'No role assigned - contact your Company Admin. Your account is active, but no operational roles or employee permissions have been assigned yet.'}
          </p>
        </div>

        {user && (
          <div className="p-4 rounded-2xl bg-surface-raised border border-border text-start space-y-2 text-xs">
            <div className="flex justify-between items-center text-text-muted">
              <span>{isAr ? 'البريد الإلكتروني:' : 'Account Email:'}</span>
              <span className="font-mono text-text font-semibold">{user.email}</span>
            </div>
            <div className="flex justify-between items-center text-text-muted">
              <span>{isAr ? 'المنشأة:' : 'Organization:'}</span>
              <span className="text-text font-semibold">{user.company_name || 'Nextal Platform'}</span>
            </div>
            <div className="flex justify-between items-center text-text-muted">
              <span>{isAr ? 'حالة الدور:' : 'Role Status:'}</span>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-500">
                {isAr ? 'بانتظار التعيين' : 'Awaiting Assignment'}
              </span>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            type="button"
            onClick={() => refreshUser()}
            className="flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold bg-surface border border-border hover:bg-surface-hover text-text flex items-center justify-center gap-2 transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            <span>{isAr ? 'إعادة الفحص' : 'Check Status'}</span>
          </button>
          <button
            type="button"
            onClick={() => logout()}
            className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-500/20"
          >
            <LogOut className="w-4 h-4" />
            <span>{isAr ? 'تسجيل الخروج' : 'Sign Out'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

