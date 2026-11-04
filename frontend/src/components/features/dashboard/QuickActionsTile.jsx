'use client';

import React from 'react';
import {
  Upload,
  UserPlus,
  CalendarPlus,
  FilePlus2,
  Palmtree,
  PlayCircle,
  Zap
} from 'lucide-react';
import { BentoTile } from '../../primitives/BentoTile';
import { IconWell } from '../../primitives/IconWell';
import { InsetBox } from '../../primitives/InsetBox';
import { useLanguage } from '../../../context/LanguageContext';

export function QuickActionsTile({ data = [], onAction }) {
  const { language, t } = useLanguage();

  const getActionIcon = (iconName) => {
    switch (iconName) {
      case 'Upload':
        return <Upload className="w-4 h-4 stroke-[2]" />;
      case 'UserPlus':
        return <UserPlus className="w-4 h-4 stroke-[2]" />;
      case 'CalendarPlus':
        return <CalendarPlus className="w-4 h-4 stroke-[2]" />;
      case 'FilePlus2':
        return <FilePlus2 className="w-4 h-4 stroke-[2]" />;
      case 'Palmtree':
        return <Palmtree className="w-4 h-4 stroke-[2]" />;
      case 'PlayCircle':
        return <PlayCircle className="w-4 h-4 stroke-[2]" />;
      default:
        return <Zap className="w-4 h-4 stroke-[2]" />;
    }
  };

  return (
    <BentoTile
      id="quick-actions-tile"
      area="quick"
      iconWell={
        <IconWell size="md" shape="square" color="primary">
          <Zap className="w-5 h-5 stroke-[2]" />
        </IconWell>
      }
      title={t('dashboard.quickActions.title')}
      subtitle={t('dashboard.quickActions.subtitle')}
    >
      {/* 2x3 Grid of Action Wells */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 h-full">
        {data.map((action) => (
          <InsetBox
            key={action.id}
            as="button"
            tone="neutral"
            interactive
            onClick={() => onAction && onAction(action.id)}
            className="flex flex-col items-center justify-center !p-2 text-center group"
          >
            <IconWell
              size="sm"
              shape="square"
              color="primary"
              className="mb-1.5 group-hover:scale-105 transition-transform"
            >
              {getActionIcon(action.icon)}
            </IconWell>
            <span className="text-[11px] font-semibold text-text group-hover:text-primary transition-colors leading-tight line-clamp-2">
              {language === 'ar' ? action.labelAr : action.label}
            </span>
          </InsetBox>
        ))}
      </div>
    </BentoTile>
  );
}
