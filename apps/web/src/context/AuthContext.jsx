'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export const DEMO_USERS = {
  PLATFORM_ADMIN: {
    email: 'platform@nextal.ae',
    name: 'Nextal Platform Admin',
    name_ar: 'مدير منصة نكستال',
    role: 'PLATFORM_ADMIN',
    roleNameEn: 'Platform Administrator',
    roleNameAr: 'مدير المنصة',
    is_platform_admin: true,
    company_name: 'Nextal Platform Inc',
    roles: ['PLATFORM_ADMIN'],
    sees_salary: false,
    description: 'Creates companies, manages platform status. No tenant data access without support grant (FR-PL1–3).',
  },
  COMPANY_ADMIN: {
    email: 'admin@gulftech.ae',
    name: 'Tariq Al-Hashemi',
    name_ar: 'طارق الهاشمي',
    role: 'COMPANY_ADMIN',
    roleNameEn: 'Company Administrator',
    roleNameAr: 'مسؤول النظام للشركة',
    is_platform_admin: false,
    company_name: 'Gulf Tech Logistics LLC',
    roles: ['COMPANY_ADMIN'],
    sees_salary: false,
    description: 'Full administrative access across settings, users & roles, approval flows, visas and branches. Salary figures hidden unless holding salary role.',
  },
  HR_MANAGER: {
    email: 'hr.mgr@gulftech.ae',
    name: 'Maryam Al-Nuaimi',
    name_ar: 'مريم النعيمي',
    role: 'HR_MANAGER',
    roleNameEn: 'HR Manager',
    roleNameAr: 'مدير الموارد البشرية',
    is_platform_admin: false,
    company_name: 'Gulf Tech Logistics LLC',
    roles: ['HR_MANAGER'],
    sees_salary: true,
    description: 'Edits HR records, verifies new hires, validates pay runs and settlements, reviews variances.',
  },
  HR_OFFICER: {
    email: 'hr.officer@gulftech.ae',
    name: 'Saeed Al-Ketbi',
    name_ar: 'سعيد الكتبي',
    role: 'HR_OFFICER',
    roleNameEn: 'HR Officer',
    roleNameAr: 'مسؤول موارد بشرية',
    is_platform_admin: false,
    company_name: 'Gulf Tech Logistics LLC',
    roles: ['HR_OFFICER'],
    sees_salary: false,
    description: 'Maintains records, attendance, documents. Salary figures are strictly hidden (Section 5.3).',
  },
  PAYROLL_OFFICER: {
    email: 'payroll@gulftech.ae',
    name: 'Zaid Al-Marzooqi',
    name_ar: 'زيد المرزوقي',
    role: 'PAYROLL_OFFICER',
    roleNameEn: 'Payroll Officer',
    roleNameAr: 'مسؤول الرواتب والأجور',
    is_platform_admin: false,
    company_name: 'Gulf Tech Logistics LLC',
    roles: ['PAYROLL_OFFICER'],
    sees_salary: true,
    description: 'Prepares pay runs, contracts, salary adjustments, SIF export, edits salary rules.',
  },
  DEPT_MANAGER: {
    email: 'dept.mgr@gulftech.ae',
    name: 'Fatima Al-Zaabi',
    name_ar: 'فاطمة الزعابي',
    role: 'DEPT_MANAGER',
    roleNameEn: 'Department Manager',
    roleNameAr: 'مدير قسم (الهندسة والعمليات)',
    is_platform_admin: false,
    company_name: 'Gulf Tech Logistics LLC',
    roles: ['DEPT_MANAGER'],
    sees_salary: false,
    description: 'Supervises team, confirms attendance, gives 1st leave & OT approval. Salary figures hidden.',
  },
  GM: {
    email: 'gm@gulftech.ae',
    name: 'Rashid Al-Falasi',
    name_ar: 'راشد الفلاسي',
    role: 'GM',
    roleNameEn: 'General Manager',
    roleNameAr: 'المدير العام',
    is_platform_admin: false,
    company_name: 'Gulf Tech Logistics LLC',
    roles: ['GM'],
    sees_salary: true,
    description: 'Executive sign-off: final approval on pay runs, settlements, and flagged leaves.',
  },
  FINANCE: {
    email: 'finance@gulftech.ae',
    name: 'Hassan Al-Balooshi',
    name_ar: 'حسن البلوشي',
    role: 'FINANCE',
    roleNameEn: 'Finance / Accounts',
    roleNameAr: 'المالية والحسابات',
    is_platform_admin: false,
    company_name: 'Gulf Tech Logistics LLC',
    roles: ['FINANCE'],
    sees_salary: true,
    description: 'Executes payments, marks pay runs Paid, handles accounting ledger integrations.',
  },
  EMPLOYEE: {
    email: 'employee@gulftech.ae',
    name: 'Ahmed Al-Mansoori',
    name_ar: 'أحمد المنصوري',
    role: 'EMPLOYEE',
    roleNameEn: 'Employee (Self-Service)',
    roleNameAr: 'موظف (الخدمة الذاتية)',
    is_platform_admin: false,
    company_name: 'Gulf Tech Logistics LLC',
    roles: ['EMPLOYEE'],
    sees_salary: false,
    description: 'Views own profile, own payslips, attendance & leave balance. Requests leave & overtime.',
  },
};

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(DEMO_USERS.COMPANY_ADMIN);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Check saved session in browser
    try {
      const savedUser = localStorage.getItem('nextal_user');
      if (savedUser) {
        setUser(JSON.parse(savedUser));
      }
    } catch (e) {}
  }, []);

  const switchDemoUser = useCallback((roleKey) => {
    const target = DEMO_USERS[roleKey];
    if (target) {
      setUser(target);
      try {
        localStorage.setItem('nextal_user', JSON.stringify(target));
      } catch (e) {}
    }
  }, []);

  const login = useCallback(async (email, password) => {
    setIsLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        const error = new Error(data.message || 'Login failed');
        error.code = data.code;
        error.status = res.status;
        throw error;
      }

      const activeUser = {
        id: data.user.id,
        email: data.user.email,
        name: data.user.employee?.name || data.user.email.split('@')[0],
        name_ar: data.user.employee?.arabic_name || data.user.email.split('@')[0],
        company_name: data.user.company_name,
        company_status: data.user.company_status,
        is_platform_admin: data.user.is_platform_admin,
        roles: data.user.roles || [],
        sees_salary: data.user.sees_salary,
        last_login_at: data.user.last_login_at,
      };

      setUser(activeUser);
      setToken(data.token);
      localStorage.setItem('nextal_user', JSON.stringify(activeUser));
      return { status: 'success', user: activeUser };
    } catch (err) {
      // If API server is not running during client preview, allow seamless fallback matching demo accounts
      const matchedDemo = Object.values(DEMO_USERS).find(
        (u) => u.email.toLowerCase() === email.trim().toLowerCase()
      );
      if (matchedDemo && password === 'Nextal@2026!') {
        setUser(matchedDemo);
        localStorage.setItem('nextal_user', JSON.stringify(matchedDemo));
        return { status: 'success', user: matchedDemo };
      }
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch('http://localhost:5000/api/v1/auth/logout', {
        method: 'POST',
        credentials: 'include',
      }).catch(() => {});
    } finally {
      setUser(DEMO_USERS.COMPANY_ADMIN);
      setToken(null);
      localStorage.removeItem('nextal_user');
    }
  }, []);

  const seesSalary = Boolean(user?.sees_salary);

  // Section 5.3 permission checking helper for UI components
  const canAccess = useCallback(
    (area, action = 'view') => {
      if (!user) return false;
      if (user.is_platform_admin) return true;
      if (area === 'payroll' || area === 'salary') {
        return seesSalary;
      }

      if (user.roles?.includes('COMPANY_ADMIN')) return true;

      if (area === 'audit') {
        return user.roles?.some((r) => ['COMPANY_ADMIN', 'HR_MANAGER', 'GM'].includes(r));
      }

      if (area === 'settings') {
        return user.roles?.some((r) => ['COMPANY_ADMIN', 'HR_MANAGER', 'PAYROLL_OFFICER', 'FINANCE'].includes(r));
      }

      return true;
    },
    [user, seesSalary]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        logout,
        switchDemoUser,
        seesSalary,
        canAccess,
        demoUsers: DEMO_USERS,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
