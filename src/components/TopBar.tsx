import React from 'react';
import { Plus, QrCode, Search, X } from 'lucide-react';
import { WorkspaceTab } from '../types/sample';

interface TopBarProps {
  activeTab: WorkspaceTab;
  searchQuery: string;
  onSearchChange: (val: string) => void;
  onOpenNewSample: () => void;
}

const TAB_TITLES: Record<WorkspaceTab, { section: string; breadcrumb: string }> = {
  overview: {
    section: 'Ringkasan Operasional Laboratorium',
    breadcrumb: 'Laboratorium / Ringkasan & Antrean',
  },
  samples: {
    section: 'Daftar & Identifikasi Botol Sampel',
    breadcrumb: 'Laboratorium / Monitoring Botol',
  },
  custody: {
    section: 'Serah Terima & Verifikasi Kendali Mutu',
    breadcrumb: 'Laboratorium / Verifikasi & Serah Terima',
  },
  certificates: {
    section: 'Arsip Sertifikat Hasil Uji (CoA)',
    breadcrumb: 'Laboratorium / Sertifikat Terbit',
  },
  catalog: {
    section: 'Katalog Parameter & Standar Baku Mutu',
    breadcrumb: 'Laboratorium / Katalog Parameter',
  },
};

export const TopBar: React.FC<TopBarProps> = ({
  activeTab,
  searchQuery,
  onSearchChange,
  onOpenNewSample,
}) => {
  const meta = TAB_TITLES[activeTab];

  return (
    <header className="bg-white border-b border-slate-200 px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="min-w-0">
        <div className="text-xs text-slate-500 truncate">{meta.breadcrumb}</div>
        <h1 className="font-display text-lg font-semibold text-slate-900 truncate">
          {meta.section}
        </h1>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <div className="relative flex-1 sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Scan / cari Kode Botol, No. Segel, Perusahaan..."
            aria-label="Cari kode botol, nomor segel, atau nama perusahaan"
            className="w-full h-10 pl-9 pr-14 text-sm bg-slate-50 border border-slate-200 rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-sky-700 transition-colors"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              aria-label="Hapus pencarian"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <span
              title="Mendukung input scanner barcode atau nomor segel"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            >
              <QrCode className="w-4 h-4" />
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={onOpenNewSample}
          className="h-10 px-4 inline-flex items-center gap-2 text-sm font-medium text-white bg-sky-800 hover:bg-sky-900 rounded-md transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700"
        >
          <Plus className="w-4 h-4 shrink-0" />
          <span>Terima Sampel</span>
        </button>
      </div>
    </header>
  );
};
