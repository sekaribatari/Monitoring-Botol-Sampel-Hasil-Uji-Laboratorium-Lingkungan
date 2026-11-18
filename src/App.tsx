import React, { useEffect, useMemo, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import {
  AlertTriangle,
  Award,
  CheckCircle2,
  Database,
  Download,
  FlaskConical,
  QrCode,
  ShieldCheck,
} from 'lucide-react';
import { BottleLabelModal } from './components/BottleLabelModal';
import { CertificateModal } from './components/CertificateModal';
import { LoginScreen } from './components/LoginScreen';
import { ParameterCatalogView } from './components/ParameterCatalogView';
import { SampleDetailDrawer } from './components/SampleDetailDrawer';
import { SampleIntakeModal } from './components/SampleIntakeModal';
import { Sidebar } from './components/Sidebar';
import { ComplianceIndicator, StageIndicator } from './components/StageIndicator';
import { TopBar } from './components/TopBar';
import {
  INITIAL_PARAMETER_CATALOG,
  MATRIX_OPTIONS,
  STAGE_ORDER,
} from './data/presets';
import { auth, signOutUser } from './firebase';
import {
  createCustomParameter,
  createSampleWithPhotos,
  deleteSampleAndPhotos,
  issueSampleCertificate,
  seedInitialSamplesToFirestore,
  subscribeToCustomParameters,
  subscribeToSamples,
  syncUserProfile,
  updateSampleWorkflow,
} from './services/firestoreService';
import {
  BottleStage,
  ParameterPreset,
  PendingPhotoUpload,
  SampleBottle,
  SampleMatrix,
  WorkspaceTab,
} from './types/sample';
import {
  formatDateID,
  formatDateTimeID,
  generateCertificateNumber,
} from './utils/storage';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);

  const [samples, setSamples] = useState<SampleBottle[]>([]);
  const [samplesLoading, setSamplesLoading] = useState(true);
  const [customCatalog, setCustomCatalog] = useState<ParameterPreset[]>([]);
  const [dbError, setDbError] = useState('');
  const [seeding, setSeeding] = useState(false);

  const [activeTab, setActiveTab] = useState<WorkspaceTab>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState<'Semua' | BottleStage>('Semua');
  const [matrixFilter, setMatrixFilter] = useState<'Semua' | SampleMatrix>('Semua');

  const [showIntakeModal, setShowIntakeModal] = useState(false);
  const [selectedSampleId, setSelectedSampleId] = useState<string | null>(null);
  const [labelSample, setLabelSample] = useState<SampleBottle | null>(null);
  const [certificateSample, setCertificateSample] = useState<SampleBottle | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      setAuthReady(true);
      if (nextUser) {
        try {
          await syncUserProfile(nextUser);
        } catch (err) {
          setDbError(
            err instanceof Error ? err.message : 'Gagal menyinkronkan profil pengguna.'
          );
        }
      } else {
        setSamples([]);
        setCustomCatalog([]);
        setSelectedSampleId(null);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!authReady || !user) return;
    setSamplesLoading(true);
    setDbError('');

    const unsubSamples = subscribeToSamples(
      user.uid,
      (list) => {
        setSamples(list);
        setSamplesLoading(false);
      },
      (err) => {
        setDbError(err.message);
        setSamplesLoading(false);
      }
    );

    const unsubCatalog = subscribeToCustomParameters(
      user.uid,
      (list) => setCustomCatalog(list),
      (err) => setDbError(err.message)
    );

    return () => {
      unsubSamples();
      unsubCatalog();
    };
  }, [authReady, user]);

  const catalog = useMemo(
    () => [...customCatalog, ...INITIAL_PARAMETER_CATALOG],
    [customCatalog]
  );

  const selectedSample = useMemo(
    () => samples.find((s) => s.id === selectedSampleId) || null,
    [samples, selectedSampleId]
  );

  const counts = useMemo(() => {
    const total = samples.length;
    const activeTesting = samples.filter(
      (s) =>
        s.stage === 'Diterima Lab' ||
        s.stage === 'Preparasi' ||
        s.stage === 'Proses Uji'
    ).length;
    const pendingQc = samples.filter((s) => s.stage === 'Verifikasi QC').length;
    const certificates = samples.filter((s) => s.stage === 'Sertifikat Terbit').length;
    const totalBottles = samples.reduce((acc, s) => acc + s.bottleCount, 0);
    return {
      total,
      activeTesting,
      pendingQc,
      certificates,
      totalBottles,
      catalog: catalog.length,
    };
  }, [samples, catalog]);

  const filteredSamples = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return samples.filter((s) => {
      if (stageFilter !== 'Semua' && s.stage !== stageFilter) return false;
      if (matrixFilter !== 'Semua' && s.matrix !== matrixFilter) return false;
      if (!q) return true;
      return (
        s.sampleCode.toLowerCase().includes(q) ||
        s.sealNumber.toLowerCase().includes(q) ||
        s.companyName.toLowerCase().includes(q) ||
        s.samplingLocation.toLowerCase().includes(q) ||
        s.workOrderNo.toLowerCase().includes(q) ||
        s.fieldTechnician.toLowerCase().includes(q)
      );
    });
  }, [samples, searchQuery, stageFilter, matrixFilter]);

  const recentCustodyEvents = useMemo(() => {
    const events: {
      id: string;
      sampleId: string;
      sampleCode: string;
      sealNumber: string;
      companyName: string;
      timestamp: string;
      actor: string;
      role: string;
      action: string;
      note: string;
    }[] = [];

    for (const s of samples) {
      for (const log of s.custodyLogs) {
        events.push({
          id: log.id,
          sampleId: s.id,
          sampleCode: s.sampleCode,
          sealNumber: s.sealNumber,
          companyName: s.companyName,
          timestamp: log.timestamp,
          actor: log.actor,
          role: log.role,
          action: log.action,
          note: log.note,
        });
      }
    }

    return events.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [samples]);

  if (!authReady) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-sm text-slate-600">Memeriksa sesi autentikasi Google...</div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  const userDisplayName = user.displayName || user.email || 'Petugas Lab';

  const handleCreateSample = async (
    newSample: SampleBottle,
    photos: PendingPhotoUpload[]
  ) => {
    await createSampleWithPhotos(newSample, photos, user.uid, userDisplayName);
    setShowIntakeModal(false);
    setLabelSample(newSample);
  };

  const handleUpdateSample = async (updated: SampleBottle) => {
    await updateSampleWorkflow(updated.id, {
      stage: updated.stage,
      parameters: updated.parameters,
      custodyLogs: updated.custodyLogs,
    });
  };

  const handleDeleteSample = async (id: string) => {
    await deleteSampleAndPhotos(id, user.uid);
    setSelectedSampleId(null);
  };

  const handleIssueCertificate = async (
    sample: SampleBottle,
    technicalManager: string,
    conclusion: string
  ) => {
    const nowIso = new Date().toISOString();
    const certNumber = generateCertificateNumber(samples);
    const shortHash = `VRF-${sample.sealNumber.replace(/[^A-Z0-9]/g, '')}-${sample.sampleCode.slice(-3)}`;

    const certificate = {
      certificateNumber: certNumber,
      issuedAt: nowIso,
      issuedBy: 'Laboratorium Penguji Terakreditasi LabTrace',
      technicalManager,
      verificationHash: shortHash,
      conclusion:
        conclusion ||
        `Seluruh parameter uji pada sampel ${sample.sampleCode} telah diverifikasi.`,
      accreditationRef: 'KAN LP-1048-IDN · ISO/IEC 17025:2017',
    };

    const nextLogs = [
      ...sample.custodyLogs,
      {
        id: `log-${Date.now()}`,
        timestamp: nowIso,
        actor: technicalManager,
        role: 'Manajer Teknis' as const,
        action: `Penerbitan Sertifikat Hasil Uji (${certNumber})`,
        note: `Sertifikat resmi terbit untuk botol ${sample.sampleCode} (Segel ${sample.sealNumber}).`,
        stageAfter: 'Sertifikat Terbit' as const,
      },
    ];

    await issueSampleCertificate(sample.id, {
      certificate,
      custodyLogs: nextLogs,
    });

    setCertificateSample({
      ...sample,
      stage: 'Sertifikat Terbit',
      certificate,
      custodyLogs: nextLogs,
    });
  };

  const handleSeedSamples = async () => {
    setSeeding(true);
    setDbError('');
    try {
      await seedInitialSamplesToFirestore(user.uid);
    } catch (err) {
      setDbError(err instanceof Error ? err.message : 'Gagal memuat data contoh.');
    } finally {
      setSeeding(false);
    }
  };

  const handleExportJson = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      account: user.email,
      samples,
      parameterCatalog: catalog,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `labtrace-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCsv = () => {
    const headers = [
      'Kode Botol',
      'No Segel',
      'Work Order',
      'Perusahaan',
      'Titik Sampling',
      'Matriks',
      'Wadah',
      'Jumlah Botol',
      'Tim Teknis',
      'Diterima Lab',
      'Tahap',
      'No Sertifikat',
    ];
    const rows = filteredSamples.map((s) => [
      s.sampleCode,
      s.sealNumber,
      s.workOrderNo,
      `"${s.companyName.replace(/"/g, '""')}"`,
      `"${s.samplingLocation.replace(/"/g, '""')}"`,
      s.matrix,
      `"${s.containerType.replace(/"/g, '""')}"`,
      s.bottleCount,
      `"${s.fieldTechnician}"`,
      s.receivedAt,
      s.stage,
      s.certificate?.certificateNumber || '-',
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `monitoring-botol-sampel-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderSampleTable = (rows: SampleBottle[]) => {
    if (samplesLoading) {
      return (
        <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-200">
          {[1, 2, 3, 4].map((row) => (
            <div key={row} className="p-4 flex items-center justify-between gap-4 animate-pulse">
              <div className="space-y-2 w-1/3">
                <div className="h-3.5 bg-slate-200 rounded w-32" />
                <div className="h-3 bg-slate-100 rounded w-48" />
              </div>
              <div className="h-3.5 bg-slate-100 rounded w-40" />
              <div className="h-3.5 bg-slate-100 rounded w-28" />
            </div>
          ))}
        </div>
      );
    }

    if (rows.length === 0) {
      const hasActiveFilters =
        Boolean(searchQuery) || stageFilter !== 'Semua' || matrixFilter !== 'Semua';
      return (
        <div className="bg-white border border-slate-200 rounded-lg p-12 text-center space-y-3">
          <FlaskConical className="w-8 h-8 text-slate-400 mx-auto" />
          <div className="text-sm font-semibold text-slate-900">
            {hasActiveFilters
              ? 'Tidak ada botol sampel yang cocok dengan filter'
              : 'Database botol sampel Anda masih kosong'}
          </div>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {hasActiveFilters
              ? 'Ubah kata kunci pencarian kode botol/nomor segel atau daftarkan penerimaan botol baru.'
              : 'Mulai dengan mencatat penerimaan botol sampel dari tim teknis lapangan beserta foto segelnya, atau muat 6 data contoh laboratorium.'}
          </p>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setStageFilter('Semua');
                  setMatrixFilter('Semua');
                }}
                className="h-9 px-4 text-xs font-medium text-slate-700 border border-slate-300 rounded-md hover:bg-slate-50"
              >
                Reset Filter
              </button>
            )}
            {!hasActiveFilters && samples.length === 0 && (
              <button
                type="button"
                disabled={seeding}
                onClick={handleSeedSamples}
                className="h-9 px-4 inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-60"
              >
                <Database className="w-3.5 h-3.5" />
                <span>{seeding ? 'Memuat Data...' : 'Muat 6 Data Contoh ke Database'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowIntakeModal(true)}
              className="h-9 px-4 text-xs font-medium text-white bg-sky-800 hover:bg-sky-900 rounded-md"
            >
              Terima Sampel Baru
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-600">
              <th className="py-3 px-4 font-semibold whitespace-nowrap">Identitas Botol &amp; Segel</th>
              <th className="py-3 px-4 font-semibold">Perusahaan &amp; Titik Sampling</th>
              <th className="py-3 px-4 font-semibold">Matriks &amp; Wadah</th>
              <th className="py-3 px-4 font-semibold">Parameter Uji</th>
              <th className="py-3 px-4 font-semibold whitespace-nowrap">Tim Teknis / Rak</th>
              <th className="py-3 px-4 font-semibold whitespace-nowrap">Tahap Monitoring</th>
              <th className="py-3 px-4 font-semibold text-right whitespace-nowrap">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-xs">
            {rows.map((s) => {
              const doneCount = s.parameters.filter(
                (p) => p.status === 'Selesai' && p.resultValue.trim() !== ''
              ).length;
              const hasExceed = s.parameters.some(
                (p) => p.compliance === 'Melebihi Baku Mutu'
              );

              return (
                <tr
                  key={s.id}
                  onClick={() => setSelectedSampleId(s.id)}
                  className="hover:bg-slate-50/90 cursor-pointer transition-colors"
                >
                  <td className="py-3 px-4 align-top whitespace-nowrap">
                    <div className="font-mono font-semibold text-slate-900">
                      {s.sampleCode}
                    </div>
                    <div className="font-mono text-[11px] text-slate-500 mt-0.5">
                      Segel: {s.sealNumber} · {s.bottleCount} btl
                    </div>
                  </td>

                  <td className="py-3 px-4 align-top max-w-xs">
                    <div className="font-semibold text-slate-900 truncate">
                      {s.companyName}
                    </div>
                    <div className="text-slate-600 truncate mt-0.5">
                      {s.samplingLocation}
                    </div>
                  </td>

                  <td className="py-3 px-4 align-top max-w-xs">
                    <div className="font-medium text-slate-900">{s.matrix}</div>
                    <div className="text-slate-500 truncate mt-0.5" title={s.containerType}>
                      {s.containerType}
                    </div>
                  </td>

                  <td className="py-3 px-4 align-top max-w-xs">
                    <div className="font-mono tabular-nums font-medium text-slate-900">
                      {doneCount}/{s.parameters.length} selesai
                      {hasExceed && (
                        <span className="text-rose-700 font-sans ml-1.5">
                          · Ada melebihi baku mutu
                        </span>
                      )}
                    </div>
                    <div className="text-slate-500 truncate mt-0.5">
                      {s.parameters.map((p) => p.name).join(', ')}
                    </div>
                  </td>

                  <td className="py-3 px-4 align-top whitespace-nowrap">
                    <div className="text-slate-900">{s.fieldTechnician}</div>
                    <div className="font-mono text-[11px] text-slate-500 mt-0.5">
                      {s.rackLocation} · {formatDateID(s.receivedAt)}
                    </div>
                  </td>

                  <td className="py-3 px-4 align-top whitespace-nowrap">
                    <StageIndicator stage={s.stage} />
                    {s.certificate && (
                      <div className="font-mono text-[11px] text-emerald-700 mt-0.5">
                        {s.certificate.certificateNumber}
                      </div>
                    )}
                  </td>

                  <td
                    className="py-3 px-4 align-top text-right whitespace-nowrap"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="inline-flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setLabelSample(s)}
                        title="Cetak Label Barcode Botol"
                        className="px-2 py-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded border border-slate-200 inline-flex items-center gap-1"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        <span>Label</span>
                      </button>

                      {s.certificate ? (
                        <button
                          type="button"
                          onClick={() => setCertificateSample(s)}
                          className="px-2.5 py-1 text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded border border-emerald-200 font-medium inline-flex items-center gap-1"
                        >
                          <Award className="w-3.5 h-3.5" />
                          <span>Sertifikat</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setSelectedSampleId(s.id)}
                          className="px-2.5 py-1 text-sky-800 hover:bg-sky-50 rounded border border-sky-200 font-medium"
                        >
                          Kelola &amp; Foto
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-slate-50 text-slate-900">
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        counts={{
          total: counts.total,
          pendingQc: counts.pendingQc,
          certificates: counts.certificates,
          catalog: counts.catalog,
        }}
        user={{
          displayName: userDisplayName,
          email: user.email || '',
          photoURL: user.photoURL,
        }}
        seeding={seeding}
        onExportJson={handleExportJson}
        onSeedSamples={handleSeedSamples}
        onSignOut={() => void signOutUser()}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          activeTab={activeTab}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onOpenNewSample={() => setShowIntakeModal(true)}
        />

        <main className="flex-1 p-6 space-y-6 max-w-[1440px] w-full mx-auto">
          {dbError && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-md flex items-start justify-between gap-3 text-xs text-rose-800">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                <span>{dbError}</span>
              </div>
              <button
                type="button"
                onClick={() => setDbError('')}
                className="text-rose-700 hover:text-rose-900 font-medium shrink-0"
              >
                Tutup
              </button>
            </div>
          )}

          {/* Ringkasan Lab */}
          {activeTab === 'overview' && (
            <>
              <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-200 rounded-lg p-5">
                  <div className="text-xs font-medium text-slate-500">
                    Sampel Terdaftar &amp; Teridentifikasi
                  </div>
                  <div className="font-mono tabular-nums text-3xl font-bold text-slate-900 mt-2">
                    {counts.total}
                  </div>
                  <div className="text-xs text-slate-500 mt-1 font-mono tabular-nums">
                    Total fisik: {counts.totalBottles} botol bersegel
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-lg p-5">
                  <div className="text-xs font-medium text-slate-500">
                    Sedang Preparasi &amp; Pengujian
                  </div>
                  <div className="font-mono tabular-nums text-3xl font-bold text-sky-800 mt-2">
                    {counts.activeTesting}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Diproses di meja analisis laboratorium
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-lg p-5">
                  <div className="text-xs font-medium text-slate-500">
                    Menunggu Verifikasi QC
                  </div>
                  <div className="font-mono tabular-nums text-3xl font-bold text-amber-700 mt-2">
                    {counts.pendingQc}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Siap ditinjau penyelia untuk penerbitan CoA
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-lg p-5">
                  <div className="text-xs font-medium text-slate-500">
                    Sertifikat Hasil Uji Terbit
                  </div>
                  <div className="font-mono tabular-nums text-3xl font-bold text-emerald-700 mt-2">
                    {counts.certificates}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Terverifikasi dengan nomor sertifikat &amp; QR
                  </div>
                </div>
              </section>

              {/* Pipeline Alur 5 Tahap */}
              <section className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="font-display text-sm font-semibold text-slate-900">
                      Filter Tahapan Monitoring Botol
                    </h2>
                    <p className="text-xs text-slate-500">
                      Pilih tahapan untuk memantau botol dari penerimaan tim teknis hingga sertifikat terbit.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleExportCsv}
                    className="h-8 px-3 inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 border border-slate-300 rounded-md hover:bg-slate-50 whitespace-nowrap shrink-0"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Unduh CSV</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                  <button
                    type="button"
                    onClick={() => setStageFilter('Semua')}
                    className={`p-3 text-left border rounded-md transition-colors ${
                      stageFilter === 'Semua'
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="text-xs font-medium">Semua Tahap</div>
                    <div className="font-mono tabular-nums text-lg font-bold mt-1">
                      {samples.length}
                    </div>
                  </button>

                  {STAGE_ORDER.map((stage) => {
                    const count = samples.filter((s) => s.stage === stage).length;
                    const active = stageFilter === stage;
                    return (
                      <button
                        key={stage}
                        type="button"
                        onClick={() => setStageFilter(stage)}
                        className={`p-3 text-left border rounded-md transition-colors ${
                          active
                            ? 'border-sky-800 bg-sky-50 text-slate-900'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <div className="text-xs font-medium truncate">{stage}</div>
                        <div className="font-mono tabular-nums text-lg font-bold mt-1">
                          {count}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <h2 className="font-display text-base font-semibold text-slate-900">
                    Antrean Botol Sampel ({filteredSamples.length})
                  </h2>
                  <div className="flex items-center gap-2">
                    <label htmlFor="matrix-filter-overview" className="text-xs text-slate-500">
                      Matriks:
                    </label>
                    <select
                      id="matrix-filter-overview"
                      value={matrixFilter}
                      onChange={(e) =>
                        setMatrixFilter(e.target.value as 'Semua' | SampleMatrix)
                      }
                      className="h-8 px-2.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:border-sky-700"
                    >
                      <option value="Semua">Semua Matriks</option>
                      {MATRIX_OPTIONS.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                {renderSampleTable(filteredSamples)}
              </section>
            </>
          )}

          {/* Monitoring Botol Lengkap */}
          {activeTab === 'samples' && (
            <section className="space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-md overflow-x-auto">
                  <button
                    type="button"
                    onClick={() => setStageFilter('Semua')}
                    className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                      stageFilter === 'Semua'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Semua ({samples.length})
                  </button>
                  {STAGE_ORDER.map((stage) => (
                    <button
                      key={stage}
                      type="button"
                      onClick={() => setStageFilter(stage)}
                      className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                        stageFilter === stage
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {stage} ({samples.filter((s) => s.stage === stage).length})
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <select
                    value={matrixFilter}
                    onChange={(e) =>
                      setMatrixFilter(e.target.value as 'Semua' | SampleMatrix)
                    }
                    aria-label="Filter matriks sampel"
                    className="h-9 px-3 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:border-sky-700"
                  >
                    <option value="Semua">Semua Matriks</option>
                    {MATRIX_OPTIONS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleExportCsv}
                    className="h-9 px-3 inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 whitespace-nowrap"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Ekspor CSV</span>
                  </button>
                </div>
              </div>

              {renderSampleTable(filteredSamples)}
            </section>
          )}

          {/* Serah Terima & Verifikasi QC */}
          {activeTab === 'custody' && (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
              <section className="xl:col-span-7 space-y-4">
                <div>
                  <h2 className="font-display text-base font-semibold text-slate-900">
                    Antrean Verifikasi QC &amp; Penyelesaian Uji
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Pastikan kecocokan kode botol, nomor segel, foto bukti fisik, dan hasil parameter sebelum sertifikat diterbitkan.
                  </p>
                </div>

                <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-200">
                  {samples
                    .filter((s) => s.stage !== 'Sertifikat Terbit')
                    .map((s) => {
                      const done = s.parameters.filter(
                        (p) => p.status === 'Selesai' && p.resultValue.trim() !== ''
                      ).length;
                      return (
                        <div
                          key={s.id}
                          className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/70"
                        >
                          <div className="space-y-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 text-xs">
                              <span className="font-mono font-semibold text-slate-900">
                                {s.sampleCode}
                              </span>
                              <span className="text-slate-400">·</span>
                              <span className="font-mono text-slate-600">{s.sealNumber}</span>
                              <span className="text-slate-400">·</span>
                              <StageIndicator stage={s.stage} />
                            </div>
                            <div className="text-sm font-semibold text-slate-900 truncate">
                              {s.companyName} — {s.samplingLocation}
                            </div>
                            <div className="text-xs text-slate-500">
                              Tim Teknis: {s.fieldTechnician} · Progres Uji:{' '}
                              <span className="font-mono tabular-nums text-slate-800">
                                {done}/{s.parameters.length} parameter
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => setLabelSample(s)}
                              className="h-8 px-3 text-xs font-medium text-slate-700 border border-slate-300 rounded-md hover:bg-slate-100 whitespace-nowrap"
                            >
                              Cetak Label
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedSampleId(s.id)}
                              className="h-8 px-3 text-xs font-medium text-white bg-sky-800 hover:bg-sky-900 rounded-md whitespace-nowrap"
                            >
                              Input / Verifikasi
                            </button>
                          </div>
                        </div>
                      );
                    })}

                  {samples.filter((s) => s.stage !== 'Sertifikat Terbit').length === 0 && (
                    <div className="p-10 text-center text-xs text-slate-500">
                      Seluruh botol sampel yang masuk sudah selesai diverifikasi dan diterbitkan sertifikatnya.
                    </div>
                  )}
                </div>
              </section>

              <section className="xl:col-span-5 space-y-4">
                <div>
                  <h2 className="font-display text-base font-semibold text-slate-900">
                    Riwayat Audit Serah Terima Terbaru
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Catatan kronologis perpindahan botol dari tim teknis lapangan ke analis lab.
                  </p>
                </div>

                <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-200 max-h-[640px] overflow-y-auto">
                  {recentCustodyEvents.slice(0, 20).map((ev) => (
                    <button
                      key={ev.id}
                      type="button"
                      onClick={() => setSelectedSampleId(ev.sampleId)}
                      className="w-full text-left p-3.5 hover:bg-slate-50 transition-colors space-y-1"
                    >
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="font-mono font-semibold text-sky-900">
                          {ev.sampleCode} · {ev.sealNumber}
                        </span>
                        <span className="font-mono tabular-nums text-[11px] text-slate-400">
                          {formatDateTimeID(ev.timestamp)}
                        </span>
                      </div>
                      <div className="text-xs font-medium text-slate-900">
                        {ev.action} — {ev.actor}
                      </div>
                      <div className="text-xs text-slate-600">{ev.note}</div>
                    </button>
                  ))}
                  {recentCustodyEvents.length === 0 && (
                    <div className="p-8 text-center text-xs text-slate-500">
                      Belum ada catatan serah terima di database.
                    </div>
                  )}
                </div>
              </section>
            </div>
          )}

          {/* Arsip Sertifikat Hasil Uji */}
          {activeTab === 'certificates' && (
            <section className="space-y-6">
              <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-600">
                      <th className="py-3 px-4 font-semibold">No. Sertifikat (CoA)</th>
                      <th className="py-3 px-4 font-semibold">Kode Botol &amp; Segel</th>
                      <th className="py-3 px-4 font-semibold">Perusahaan &amp; Titik Sampling</th>
                      <th className="py-3 px-4 font-semibold">Matriks &amp; Parameter</th>
                      <th className="py-3 px-4 font-semibold">Penandatangan</th>
                      <th className="py-3 px-4 font-semibold">Tanggal Terbit</th>
                      <th className="py-3 px-4 font-semibold text-right">Dokumen</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-xs">
                    {filteredSamples
                      .filter((s) => s.certificate)
                      .map((s) => {
                        const anyExceeds = s.parameters.some(
                          (p) => p.compliance === 'Melebihi Baku Mutu'
                        );
                        return (
                          <tr key={s.id} className="hover:bg-slate-50/70">
                            <td className="py-3.5 px-4 font-mono font-semibold text-emerald-800 whitespace-nowrap">
                              {s.certificate?.certificateNumber}
                              <div className="text-[11px] text-slate-500 font-normal mt-0.5">
                                {s.certificate?.verificationHash}
                              </div>
                            </td>
                            <td className="py-3.5 px-4 font-mono whitespace-nowrap">
                              <div className="font-semibold text-slate-900">{s.sampleCode}</div>
                              <div className="text-[11px] text-slate-500">{s.sealNumber}</div>
                            </td>
                            <td className="py-3.5 px-4 max-w-xs">
                              <div className="font-semibold text-slate-900 truncate">
                                {s.companyName}
                              </div>
                              <div className="text-slate-600 truncate">{s.samplingLocation}</div>
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="font-medium text-slate-900">
                                {s.matrix} ({s.parameters.length} param)
                              </div>
                              <div className="mt-0.5">
                                <ComplianceIndicator
                                  compliance={anyExceeds ? 'Melebihi Baku Mutu' : 'Memenuhi'}
                                />
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-slate-700 whitespace-nowrap">
                              {s.certificate?.technicalManager}
                            </td>
                            <td className="py-3.5 px-4 font-mono tabular-nums text-slate-600 whitespace-nowrap">
                              {formatDateTimeID(s.certificate?.issuedAt)}
                            </td>
                            <td className="py-3.5 px-4 text-right whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => setCertificateSample(s)}
                                className="h-8 px-3 inline-flex items-center gap-1.5 text-xs font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-md"
                              >
                                <ShieldCheck className="w-3.5 h-3.5" />
                                <span>Buka &amp; Cetak CoA</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>

                {filteredSamples.filter((s) => s.certificate).length === 0 && (
                  <div className="p-10 text-center text-xs text-slate-500">
                    Belum ada sertifikat hasil uji yang cocok dengan pencarian Anda.
                  </div>
                )}
              </div>

              {samples.some((s) => s.stage === 'Verifikasi QC') && (
                <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <CheckCircle2 className="w-4 h-4 text-amber-700" />
                    <span>Siap Terbit Sertifikat (Tahap Verifikasi QC)</span>
                  </div>
                  <div className="divide-y divide-slate-200">
                    {samples
                      .filter((s) => s.stage === 'Verifikasi QC')
                      .map((s) => (
                        <div
                          key={s.id}
                          className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                        >
                          <div>
                            <span className="font-mono font-semibold text-slate-900">
                              {s.sampleCode}
                            </span>{' '}
                            · <span className="font-semibold">{s.companyName}</span> ·{' '}
                            <span className="text-slate-600">{s.samplingLocation}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setSelectedSampleId(s.id)}
                            className="h-8 px-3 text-xs font-medium text-white bg-sky-800 hover:bg-sky-900 rounded-md self-start sm:self-auto whitespace-nowrap"
                          >
                            Tinjau &amp; Terbitkan Sertifikat
                          </button>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Katalog Parameter */}
          {activeTab === 'catalog' && (
            <ParameterCatalogView
              catalog={catalog}
              onAddParameter={(param) => {
                void createCustomParameter(param, user.uid);
              }}
            />
          )}
        </main>
      </div>

      {/* Modals & Drawers */}
      {showIntakeModal && (
        <SampleIntakeModal
          existingSamples={samples}
          catalog={catalog}
          defaultReceiverName={userDisplayName}
          onClose={() => setShowIntakeModal(false)}
          onCreateSample={handleCreateSample}
        />
      )}

      {selectedSample && (
        <SampleDetailDrawer
          sample={selectedSample}
          userUid={user.uid}
          userDisplayName={userDisplayName}
          onClose={() => setSelectedSampleId(null)}
          onUpdateSample={handleUpdateSample}
          onDeleteSample={handleDeleteSample}
          onOpenLabel={(s) => setLabelSample(s)}
          onOpenCertificate={(s) => setCertificateSample(s)}
          onIssueCertificate={handleIssueCertificate}
        />
      )}

      {labelSample && (
        <BottleLabelModal sample={labelSample} onClose={() => setLabelSample(null)} />
      )}

      {certificateSample && (
        <CertificateModal
          sample={certificateSample}
          onClose={() => setCertificateSample(null)}
        />
      )}
    </div>
  );
}
