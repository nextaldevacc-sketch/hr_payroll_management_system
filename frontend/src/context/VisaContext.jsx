'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from './AuthContext';

const VisaContext = createContext(null);

export function VisaProvider({ children }) {
  const { user } = useAuth();

  const companyName = user?.company_name || '';
  const companyNameAr = user?.company_name_ar || null;

  // Check if role is employee-only
  const isEmployeeOnly = useMemo(() => {
    const roles = user?.roles || [];
    return roles.length === 1 && roles[0] === 'EMPLOYEE';
  }, [user?.roles]);

  // Any Company-scoped role grants company-wide access across all visas
  const isCompanyScoped = useMemo(() => {
    if (!user?.scopes || user.scopes.length === 0) return true;
    return user.scopes.some((s) => !s.scope_type || s.scope_type === 'Company');
  }, [user?.scopes]);

  // Extract scoped visa IDs if restricted by CompanyVisa scope
  const scopedVisaIds = useMemo(() => {
    if (isCompanyScoped) return null;
    const ids = (user?.scopes || [])
      .filter((s) => s.scope_type === 'CompanyVisa' && s.scope_id)
      .map((s) => s.scope_id);
    return ids.length > 0 ? ids : null;
  }, [user?.scopes, isCompanyScoped]);

  // Extract visas from authenticated user, filtered to viewer's scope
  const visas = useMemo(() => {
    const rawVisas = Array.isArray(user?.visas) ? user.visas : [];
    if (!scopedVisaIds) return rawVisas;
    return rawVisas.filter((v) => scopedVisaIds.includes(v.id));
  }, [user?.visas, scopedVisaIds]);

  const isSingleVisaScope = Boolean(
    scopedVisaIds?.length === 1 || (!isCompanyScoped && visas.length <= 1) || (isCompanyScoped && visas.length === 1)
  );

  const allowAllVisas = Boolean(isCompanyScoped && visas.length > 1);

  // Initialize selected visa from localStorage per user ID
  const storageKey = user?.id ? `nextal_selected_visa_${user.id}` : 'nextal_selected_visa';
  const [selectedVisaId, setSelectedVisaIdState] = useState('all');

  useEffect(() => {
    if (scopedVisaIds?.length === 1) {
      setSelectedVisaIdState(scopedVisaIds[0]);
    } else if (visas.length === 1) {
      setSelectedVisaIdState(visas[0].id);
    } else if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(storageKey);
      if (saved && (saved === 'all' && allowAllVisas)) {
        setSelectedVisaIdState('all');
      } else if (saved && visas.some((v) => v.id === saved)) {
        setSelectedVisaIdState(saved);
      } else {
        setSelectedVisaIdState(allowAllVisas ? 'all' : (visas[0]?.id || 'all'));
      }
    }
  }, [scopedVisaIds, visas, storageKey, allowAllVisas]);

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
      allowAllVisas,
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
      allowAllVisas,
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
      companyName: '',
      companyNameAr: null,
      isSingleVisaScope: false,
      allowAllVisas: false,
      isEmployeeOnly: false,
    };
  }
  return context;
}

