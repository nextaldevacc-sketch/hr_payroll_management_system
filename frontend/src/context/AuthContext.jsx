'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { API_BASE } from '../services/apiClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('loading'); // 'loading' | 'authenticated' | 'unauthenticated'
  const router = useRouter();
  const queryClient = useQueryClient();

  // Load session from server truth on mount (/api/v1/auth/me)
  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setStatus('authenticated');
        return data.user;
      } else {
        setUser(null);
        setStatus('unauthenticated');
        return null;
      }
    } catch (err) {
      setUser(null);
      setStatus('unauthenticated');
      return null;
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  // Handle session expiration broadcast from API client
  useEffect(() => {
    const handleSessionExpired = () => {
      queryClient.clear();
      setUser(null);
      setStatus('unauthenticated');
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        router.replace('/login?reason=session_expired');
      }
    };

    window.addEventListener('nextal:session-expired', handleSessionExpired);
    return () => window.removeEventListener('nextal:session-expired', handleSessionExpired);
  }, [router, queryClient]);

  // Log in with email + password via server truth
  const login = useCallback(
    async (email, password) => {
      setStatus('loading');
      try {
        const res = await fetch(`${API_BASE}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ email, password }),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setStatus('unauthenticated');
          const error = new Error(data.message || 'Invalid email or password');
          error.status = res.status;
          error.code = data.code;
          error.remainingAttempts = data.remainingAttempts;
          throw error;
        }

        queryClient.clear();
        setUser(data.user);
        setStatus('authenticated');

        // Determine destination by role
        const roles = data.user.roles || [];
        const isEmployeeOnly = roles.length === 1 && roles[0] === 'EMPLOYEE';
        const defaultLanding = isEmployeeOnly ? '/me' : '/';

        return {
          status: 'success',
          user: data.user,
          defaultLanding,
        };
      } catch (err) {
        setStatus('unauthenticated');
        throw err;
      }
    },
    [queryClient]
  );

  // Log out via server truth (invalidates token_version and clears cookie)
  const logout = useCallback(async () => {
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      }).catch(() => {});
    } finally {
      queryClient.clear();
      setUser(null);
      setStatus('unauthenticated');
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      } else {
        router.replace('/login');
      }
    }
  }, [router, queryClient]);

  const seesSalary = Boolean(user?.sees_salary);

  // Section 5.3 Permission Helper: strictly defaults to DENY (false)
  const canAccess = useCallback(
    (area, action = 'view') => {
      if (!user) return false;
      const roles = user.roles || [];

      // Employee self-service
      if (area === 'me') {
        return Boolean(user?.employee_id) || roles.includes('EMPLOYEE');
      }

      // Root Dashboard: all enterprise roles except employee-only
      if (area === 'dashboard') {
        if (roles.length === 1 && roles[0] === 'EMPLOYEE') return false;
        return true;
      }

      // Payroll and salary figures: strictly salary roles (HR Manager, Payroll Officer, GM, Finance)
      if (area === 'payroll' || area === 'salary') {
        return Boolean(user.sees_salary);
      }

      // Employees Directory
      if (area === 'employees') {
        if (action === 'verify') {
          return roles.includes('HR_MANAGER');
        }
        if (action === 'edit' || action === 'create') {
          return roles.some((r) => ['HR_MANAGER', 'HR_OFFICER'].includes(r));
        }
        return roles.some((r) =>
          ['COMPANY_ADMIN', 'HR_MANAGER', 'HR_OFFICER', 'PAYROLL_OFFICER', 'GM', 'DEPT_MANAGER'].includes(r)
        );
      }

      // Attendance
      if (area === 'attendance') {
        return roles.some((r) => ['COMPANY_ADMIN', 'HR_MANAGER', 'HR_OFFICER', 'DEPT_MANAGER', 'PAYROLL_OFFICER', 'GM'].includes(r));
      }

      // Leave
      if (area === 'leave') {
        return roles.some((r) => ['COMPANY_ADMIN', 'HR_MANAGER', 'HR_OFFICER', 'DEPT_MANAGER', 'PAYROLL_OFFICER', 'GM'].includes(r));
      }

      // Offboarding (Company Admin has no offboarding rights per Section 5.3)
      if (area === 'offboarding') {
        if (action === 'approve') {
          return roles.includes('HR_MANAGER');
        }
        return roles.some((r) =>
          ['HR_MANAGER', 'HR_OFFICER', 'PAYROLL_OFFICER', 'GM', 'FINANCE', 'DEPT_MANAGER'].includes(r)
        );
      }

      // Compliance
      if (area === 'compliance') {
        return roles.some((r) => ['COMPANY_ADMIN', 'HR_MANAGER', 'HR_OFFICER', 'GM'].includes(r));
      }

      // Reports
      if (area === 'reports') {
        return roles.some((r) => ['COMPANY_ADMIN', 'HR_MANAGER', 'PAYROLL_OFFICER', 'GM', 'FINANCE'].includes(r));
      }

      // Settings
      if (area === 'settings') {
        if (action === 'users') {
          return roles.includes('COMPANY_ADMIN');
        }
        return roles.some((r) => ['COMPANY_ADMIN', 'HR_MANAGER', 'PAYROLL_OFFICER', 'FINANCE'].includes(r));
      }

      // Audit Logs
      if (area === 'audit') {
        return roles.some((r) => ['COMPANY_ADMIN', 'HR_MANAGER', 'GM'].includes(r));
      }

      // Platform Admin: strictly platform admin
      if (area === 'platform') {
        return Boolean(user.is_platform_admin);
      }

      // Default: DENY
      return false;
    },
    [user]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        status,
        isLoading: status === 'loading',
        isAuthenticated: status === 'authenticated',
        login,
        logout,
        refreshUser,
        seesSalary,
        canAccess,
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
