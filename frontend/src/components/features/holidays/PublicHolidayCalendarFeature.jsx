'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import {
  Calendar,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Building,
} from 'lucide-react';
import { GlassCard } from '../../primitives/GlassCard';
import { fetchHolidays } from '../../../services/settingsApi';

export default function PublicHolidayCalendarFeature() {
  const { user, language } = useAuth();
  const isAr = language === 'ar';

  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const data = await fetchHolidays(2026);
        setHolidays(Array.isArray(data) ? data : (data?.items || []));
      } catch (err) {
        console.error('Failed to load public holidays:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="space-y-4" data-testid="public-holiday-calendar-container">
      {/* Top Banner */}
      <GlassCard className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-text flex items-center gap-2">
              <Calendar className="w-5 h-5 text-purple-400" />
              <span>{isAr ? 'تقويم العطلات الرسمية لدولة الإمارات (2026)' : 'UAE Official Public Holidays Calendar (2026)'}</span>
            </h3>
            <p className="text-xs text-text-muted mt-0.5">
              {isAr
                ? 'العطلات الرسمية مدفوعة الأجر بالكامل، لا تُحسب كغياب (T14)، وتُستثنى تلقائياً من أيام خصم الإجازة السنوية (T31)'
                : 'Public holidays are 100% paid, never counted as absence (T14), and excluded from annual leave deductions (T31).'}
            </p>
          </div>
          <span className="text-xs font-mono font-bold px-3 py-1 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300">
            {holidays.length} {isAr ? 'عطلة رسمية' : 'Statutory Holidays'}
          </span>
        </div>
      </GlassCard>

      {/* Holidays Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {holidays.map((h) => {
          const dateObj = new Date(h.holiday_date || h.date);
          const dateFormatted = dateObj.toLocaleDateString(isAr ? 'ar-AE' : 'en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            timeZone: 'Asia/Dubai',
          });

          return (
            <GlassCard key={h.id || h.name} className="p-4 border-border/80 hover:border-purple-500/30 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="text-xs font-bold text-text">
                    {isAr ? (h.name_ar || h.name) : h.name}
                  </h4>
                  <span className="text-[11px] font-mono text-purple-400 block mt-1">
                    {dateFormatted}
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-500/15 text-purple-300 border border-purple-500/25 shrink-0">
                  Paid 100%
                </span>
              </div>
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
}
