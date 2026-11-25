'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { API_BASE } from '../services/apiClient';
import { canAccessNavArea, checkPermission } from '@nextal/shared';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('loading'); // 'loading' | 'authenticated' | 'unauthenticated'
  const router = useRouter();
  const queryClient = useQueryClient();

  // Load session from server truth on mount (/api/v1/auth/me)
  const refreshUser = useCallback(async () => {
    // Skip /auth/me on public auth pages when no session cookie exists
    if (typeof window !== 'undefined') {
      const p = window.location.pathname;
      const isAuthPage =
        p.startsWith('/login') ||
        p.startsWith('/forgot-password') ||
        p.startsWith('/reset-password') ||
        p.startsWith('/accept-invite');
      const hasCookie = document.cookie.includes('nextal_token');
      if (isAuthPage && !hasCookie) {
        setUser(null);
        setStatus('unauthenticated');
        return null;
      }
    }

    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          setUser(data.user);
          setStatus('authenticated');
          return data.user;
        } else {
          setUser(null);
          setStatus('unauthenticated');
          return null;
        }
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

  // Force password change guard
  useEffect(() => {
    if (user?.must_change_password) {
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/change-password') && !window.location.pathname.startsWith('/login')) {
        router.replace('/change-password');
      }
    }
  }, [user, router]);

  // Log in with email + password via server truth
  const login = useCallback(
    async (email, password) => {
      setStatus('loading');
      try {
        const cleanEmail = String(email || '').trim().toLowerCase();
        const res = await fetch(`${API_BASE}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ email: cleanEmail, password }),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setStatus('unauthenticated');
          const error = new Error(
            data.message ||
            (res.status === 429
              ? 'Too many attempts. Please try again later.'
              : res.status === 423
              ? 'Account is locked.'
              : res.status >= 500
              ? 'Server error occurred.'
              : 'Invalid email or password')
          );
          error.status = res.status;
          error.code = data.code || (res.status === 429 ? 'TOO_MANY_REQUESTS' : res.status === 423 ? 'ACCOUNT_LOCKED' : res.status >= 500 ? 'SERVER_ERROR' : 'UNAUTHORIZED');
          error.remainingAttempts = data.remainingAttempts;
          error.retryAfter = data.retryAfter;
          throw error;
        }

        if (data.mfa_required) {
          setStatus('unauthenticated');
          return {
            status: 'mfa_required',
            mfa_required: true,
            mfa_enrol_required: Boolean(data.mfa_enrol_required),
            mfa_token: data.mfa_token,
            user: data.user,
          };
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

  const verifyMfa = useCallback(
    async (mfaToken, code) => {
      setStatus('loading');
      try {
        const res = await fetch(`${API_BASE}/auth/mfa/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ mfa_token: mfaToken, code }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setStatus('unauthenticated');
          const error = new Error(data.message || 'MFA verification failed');
          error.status = res.status;
          error.code = data.code;
          error.remainingAttempts = data.remainingAttempts;
          throw error;
        }
        queryClient.clear();
        setUser(data.user);
        setStatus('authenticated');
        const roles = data.user.roles || [];
        const isEmployeeOnly = roles.length === 1 && roles[0] === 'EMPLOYEE';
        const defaultLanding = isEmployeeOnly ? '/me' : '/';
        return { status: 'success', user: data.user, defaultLanding };
      } catch (err) {
        setStatus('unauthenticated');
        throw err;
      }
    },
    [queryClient]
  );

  const initMfaEnrol = useCallback(async (mfaToken) => {
    const headers = { 'Content-Type': 'application/json' };
    if (mfaToken) headers.Authorization = `Bearer ${mfaToken}`;
    const res = await fetch(`${API_BASE}/auth/mfa/enrol-init`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({ mfa_token: mfaToken }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const error = new Error(data.message || 'Failed to initialize MFA enrolment');
      error.status = res.status;
      error.code = data.code;
      throw error;
    }
    return data.data;
  }, []);

  const confirmMfaEnrol = useCallback(
    async (mfaToken, code) => {
      setStatus('loading');
      try {
        const headers = { 'Content-Type': 'application/json' };
        if (mfaToken) headers.Authorization = `Bearer ${mfaToken}`;
        const res = await fetch(`${API_BASE}/auth/mfa/enrol-confirm`, {
          method: 'POST',
          headers,
          credentials: 'include',
          body: JSON.stringify({ mfa_token: mfaToken, code }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setStatus('unauthenticated');
          const error = new Error(data.message || 'Invalid verification code');
          error.status = res.status;
          error.code = data.code;
          throw error;
        }
        if (data.user) {
          queryClient.clear();
          setUser(data.user);
          setStatus('authenticated');
        }
        const roles = data.user?.roles || [];
        const isEmployeeOnly = roles.length === 1 && roles[0] === 'EMPLOYEE';
        const defaultLanding = isEmployeeOnly ? '/me' : '/';
        return {
          status: 'success',
          message: data.message,
          recovery_codes: data.recovery_codes,
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
      }).catch((err) => {
        console.warn('[AuthContext] logout network notification failed:', err?.message);
      });
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

  // Log out all devices via server truth
  const logoutAll = useCallback(async () => {
    try {
      await fetch(`${API_BASE}/auth/logout-all`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      }).catch((err) => {
        console.warn('[AuthContext] logoutAll network notification failed:', err?.message);
      });
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

      // Platform Admin: strictly platform admin
      if (area === 'platform') {
        return Boolean(user.is_platform_admin);
      }

      // Specific sub-action for Users & Roles under settings
      if (area === 'settings' && action === 'users') {
        return roles.includes('COMPANY_ADMIN');
      }

      // Top-level navigation views
      if (action === 'view') {
        return canAccessNavArea(roles, area, user.sees_salary);
      }

      // Granular permissions per Section 5.3 matrix
      return checkPermission(roles, area, action);
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
        verifyMfa,
        initMfaEnrol,
        confirmMfaEnrol,
        logout,
        logoutAll,
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
