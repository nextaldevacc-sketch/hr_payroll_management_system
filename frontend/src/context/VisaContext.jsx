'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from './AuthContext';

const VisaContext = createContext(null);

export function VisaProvider({ children }) {
  const { user } = useAuth();

  // Extract visas from authenticated user (supplied by /api/v1/auth/me)
  const visas = useMemo(() => {
    return Array.isArray(user?.visas) ? user.visas : [];
  }, [user?.visas]);

  const companyName = user?.company_name || 'Gulf Tech Logistics LLC';
  const companyNameAr = user?.company_name_ar || 'شركة الخليج للتقنية اللوجستية ذ.م.م';

  // Check if role is single-visa scoped or employee-only
  const isEmployeeOnly = useMemo(() => {
    const roles = user?.roles || [];
    return roles.length === 1 && roles[0] === 'EMPLOYEE';
  }, [user?.roles]);

  const scopedVisaId = useMemo(() => {
    const visaScope = user?.scopes?.find((s) => s.scope_type === 'VISA');
    return visaScope?.scope_id || null;
  }, [user?.scopes]);

  const isSingleVisaScope = Boolean(scopedVisaId || visas.length === 1);

  // Initialize selected visa from localStorage per user ID
  const storageKey = user?.id ? `nextal_selected_visa_${user.id}` : 'nextal_selected_visa';
  const [selectedVisaId, setSelectedVisaIdState] = useState('all');

  useEffect(() => {
    if (scopedVisaId) {
      setSelectedVisaIdState(scopedVisaId);
    } else if (visas.length === 1) {
      setSelectedVisaIdState(visas[0].id);
    } else if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(storageKey);
      if (saved && (saved === 'all' || visas.some((v) => v.id === saved))) {
        setSelectedVisaIdState(saved);
      } else {
        setSelectedVisaIdState('all');
      }
    }
  }, [scopedVisaId, visas, storageKey]);

  const setSelectedVisaId = useCallback(
    (id) => {
      setSelectedVisaIdState(id);
      if (typeof window !== 'undefined') {
        localStorage.setItem(storageKey, id);
      }
    },
    [storageKey]
  );

  const selectedVisa = useMemo(() => {
    if (selectedVisaId === 'all') return null;
    return visas.find((v) => v.id === selectedVisaId) || null;
  }, [visas, selectedVisaId]);

  const value = useMemo(
    () => ({
      selectedVisaId,
      selectedVisa,
      visas,
      setSelectedVisaId,
      companyName,
      companyNameAr,
      isSingleVisaScope,
      isEmployeeOnly,
    }),
    [
      selectedVisaId,
      selectedVisa,
      visas,
      setSelectedVisaId,
      companyName,
      companyNameAr,
      isSingleVisaScope,
      isEmployeeOnly,
    ]
  );

  return <VisaContext.Provider value={value}>{children}</VisaContext.Provider>;
}

export function useVisa() {
  const context = useContext(VisaContext);
  if (!context) {
    return {
      selectedVisaId: 'all',
      selectedVisa: null,
      visas: [],
      setSelectedVisaId: () => {},
      companyName: 'Gulf Tech Logistics LLC',
      companyNameAr: null,
      isSingleVisaScope: false,
      isEmployeeOnly: false,
    };
  }
  return context;
}

