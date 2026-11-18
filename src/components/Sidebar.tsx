import React from 'react';
import {
  Award,
  BookOpen,
  ClipboardCheck,
  Database,
  Download,
  FlaskConical,
  LayoutDashboard,
  LogOut,
} from 'lucide-react';
import { WorkspaceTab } from '../types/sample';

interface SidebarProps {
  activeTab: WorkspaceTab;
  onSelectTab: (tab: WorkspaceTab) => void;
  counts: {
    total: number;
    pendingQc: number;
    certificates: number;
    catalog: number;
  };
  user: {
    displayName: string;
    email: string;
    photoURL?: string | null;
  };
  seeding: boolean;
  onExportJson: () => void;
  onSeedSamples: () => void;
  onSignOut: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  counts,
  user,
  seeding,
  onExportJson,
  onSeedSamples,
  onSignOut,
}) => {
  const navItems: {
    id: WorkspaceTab;
    label: string;
    icon: React.ReactNode;
    count?: number;
  }[] = [
    {
      id: 'overview',
      label: 'Ringkasan Lab',
      icon: <LayoutDashboard className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'samples',
      label: 'Monitoring Botol',
      icon: <FlaskConical className="w-4 h-4 shrink-0" />,
      count: counts.total,
    },
    {
      id: 'custody',
      label: 'Serah Terima & QC',
      icon: <ClipboardCheck className="w-4 h-4 shrink-0" />,
      count: counts.pendingQc,
    },
    {
      id: 'certificates',
      label: 'Sertifikat Hasil Uji',
      icon: <Award className="w-4 h-4 shrink-0" />,
      count: counts.certificates,
    },
    {
      id: 'catalog',
      label: 'Katalog Parameter',
      icon: <BookOpen className="w-4 h-4 shrink-0" />,
      count: counts.catalog,
    },
  ];

  const initials = (user.displayName || user.email || 'U')
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');

  return (
    <aside className="w-full lg:w-64 shrink-0 bg-white border-b lg:border-b-0 lg:border-r border-slate-200 flex flex-col justify-between">
      <div>
        <div className="h-16 px-6 flex items-center justify-between border-b border-slate-200">
          <span className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap">
            LabTrace
          </span>
          <button
            type="button"
            onClick={onSignOut}
            className="lg:hidden inline-flex items-center gap-1.5 text-xs font-medium text-rose-700 hover:text-rose-800 whitespace-nowrap"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Keluar</span>
          </button>
        </div>

        <nav className="p-3 flex lg:flex-col gap-1 overflow-x-auto" aria-label="Navigasi utama">
          {navItems.map((item) => {
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`flex items-center justify-between gap-3 px-3 py-2.5 text-sm rounded-md transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-sky-700 ${
                  active
                    ? 'bg-slate-900 text-white font-medium'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  {item.icon}
                  <span>{item.label}</span>
                </span>
                {item.count !== undefined && (
                  <span
                    className={`font-mono tabular-nums text-xs ${
                      active ? 'text-slate-300' : 'text-slate-400'
                    }`}
                  >
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="hidden lg:block p-4 border-t border-slate-200 space-y-3">
        <div className="flex items-center gap-2.5 px-1">
          {user.photoURL ? (
            <img
              src={user.photoURL}
              alt={user.displayName}
              referrerPolicy="no-referrer"
              className="w-8 h-8 rounded-md object-cover border border-slate-200 shrink-0"
            />
          ) : (
            <div className="w-8 h-8 rounded-md bg-slate-900 text-white text-xs font-semibold flex items-center justify-center shrink-0">
              {initials}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold text-slate-900 truncate">
              {user.displayName}
            </div>
            <div className="text-[11px] text-slate-500 truncate">{user.email}</div>
          </div>
        </div>

        <div className="flex flex-col gap-1 pt-1 border-t border-slate-100">
          <button
            type="button"
            disabled={seeding}
            onClick={onSeedSamples}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-md transition-colors whitespace-nowrap disabled:opacity-60"
          >
            <Database className="w-3.5 h-3.5 text-slate-500" />
            <span>{seeding ? 'Menambahkan Data...' : 'Tambah Data Contoh Lab'}</span>
          </button>
          <button
            type="button"
            onClick={onExportJson}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-md transition-colors whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Ekspor Cadangan JSON</span>
          </button>
          <button
            type="button"
            onClick={onSignOut}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-rose-700 hover:bg-rose-50 rounded-md transition-colors whitespace-nowrap"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Keluar Akun Google</span>
          </button>
        </div>
      </div>
    </aside>
  );
};
