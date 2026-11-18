import React from 'react';
import { BottleStage, ComplianceResult, SealCondition } from '../types/sample';

export const StageIndicator: React.FC<{ stage: BottleStage }> = ({ stage }) => {
  const config: Record<BottleStage, { glyph: string; colorClass: string }> = {
    'Diterima Lab': { glyph: '●', colorClass: 'text-sky-700' },
    'Preparasi': { glyph: '◆', colorClass: 'text-amber-700' },
    'Proses Uji': { glyph: '▸', colorClass: 'text-indigo-700' },
    'Verifikasi QC': { glyph: '▲', colorClass: 'text-orange-700' },
    'Sertifikat Terbit': { glyph: '✓', colorClass: 'text-emerald-700' },
  };

  const { glyph, colorClass } = config[stage];

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium whitespace-nowrap ${colorClass}`}>
      <span aria-hidden="true" className="text-[11px] leading-none">
        {glyph}
      </span>
      <span>{stage}</span>
    </span>
  );
};

export const ComplianceIndicator: React.FC<{ compliance: ComplianceResult }> = ({ compliance }) => {
  if (compliance === 'Memenuhi') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 whitespace-nowrap">
        <span aria-hidden="true">✓</span>
        <span>Memenuhi</span>
      </span>
    );
  }
  if (compliance === 'Melebihi Baku Mutu') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-700 whitespace-nowrap">
        <span aria-hidden="true">▲</span>
        <span>Melebihi Baku Mutu</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 whitespace-nowrap">
      <span aria-hidden="true">·</span>
      <span>Belum Dievaluasi</span>
    </span>
  );
};

export const SealConditionText: React.FC<{ condition: SealCondition }> = ({ condition }) => {
  if (condition === 'Perlu Verifikasi Ulang') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-rose-700 whitespace-nowrap">
        <span aria-hidden="true">▲</span>
        <span>{condition}</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 whitespace-nowrap">
      <span aria-hidden="true">✓</span>
      <span>{condition}</span>
    </span>
  );
};
