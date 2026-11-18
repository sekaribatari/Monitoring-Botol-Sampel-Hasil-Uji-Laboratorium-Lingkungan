import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Award,
  Camera,
  CheckCircle2,
  ClipboardPlus,
  QrCode,
  ShieldCheck,
  Trash2,
  X,
  ZoomIn,
} from 'lucide-react';
import { STAGE_ORDER } from '../data/presets';
import {
  deleteSamplePhoto,
  subscribeToSamplePhotos,
  uploadSamplePhoto,
} from '../services/firestoreService';
import {
  BottleStage,
  CustodyLogEntry,
  PhotoCategory,
  SampleBottle,
  SamplePhoto,
  TestParameter,
} from '../types/sample';
import { compressImageFile } from '../utils/photo';
import {
  evaluateCompliance,
  formatDateID,
  formatDateTimeID,
} from '../utils/storage';
import {
  ComplianceIndicator,
  SealConditionText,
  StageIndicator,
} from './StageIndicator';

interface SampleDetailDrawerProps {
  sample: SampleBottle;
  userUid: string;
  userDisplayName: string;
  onClose: () => void;
  onUpdateSample: (updated: SampleBottle) => Promise<void>;
  onDeleteSample: (id: string) => Promise<void>;
  onOpenLabel: (sample: SampleBottle) => void;
  onOpenCertificate: (sample: SampleBottle) => void;
  onIssueCertificate: (
    sample: SampleBottle,
    technicalManager: string,
    conclusion: string
  ) => Promise<void>;
}

export const SampleDetailDrawer: React.FC<SampleDetailDrawerProps> = ({
  sample,
  userUid,
  userDisplayName,
  onClose,
  onUpdateSample,
  onDeleteSample,
  onOpenLabel,
  onOpenCertificate,
  onIssueCertificate,
}) => {
  const [editingParamId, setEditingParamId] = useState<string | null>(null);
  const [paramDraftValue, setParamDraftValue] = useState('');
  const [paramDraftAnalyst, setParamDraftAnalyst] = useState('');

  const [logActor, setLogActor] = useState('');
  const [logRole, setLogRole] = useState<CustodyLogEntry['role']>('Analis Lab');
  const [logAction, setLogAction] = useState('Serah Terima Antar Unit Lab');
  const [logNote, setLogNote] = useState('');

  const [showIssueForm, setShowIssueForm] = useState(false);
  const [techManager, setTechManager] = useState('Dr. Ratna Kusuma, M.Si.');
  const [certConclusion, setCertConclusion] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [stageError, setStageError] = useState('');
  const [savingAction, setSavingAction] = useState(false);

  // Foto bukti fisik botol & segel dari Firestore subcollection
  const [photos, setPhotos] = useState<SamplePhoto[]>([]);
  const [photoLoading, setPhotoLoading] = useState(true);
  const [photoCategory, setPhotoCategory] = useState<PhotoCategory>('Segel & Botol');
  const [photoCaption, setPhotoCaption] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const [previewPhoto, setPreviewPhoto] = useState<SamplePhoto | null>(null);

  useEffect(() => {
    setPhotoLoading(true);
    setPhotoError('');
    const unsub = subscribeToSamplePhotos(
      sample.id,
      userUid,
      (list) => {
        setPhotos(list);
        setPhotoLoading(false);
      },
      (err) => {
        setPhotoError(err.message);
        setPhotoLoading(false);
      }
    );
    return () => unsub();
  }, [sample.id, userUid]);

  const completedParamsCount = sample.parameters.filter(
    (p) => p.status === 'Selesai' && p.resultValue.trim() !== ''
  ).length;
  const allParamsCompleted =
    sample.parameters.length > 0 && completedParamsCount === sample.parameters.length;
  const currentStageIndex = STAGE_ORDER.indexOf(sample.stage);

  const startEditParam = (p: TestParameter) => {
    setEditingParamId(p.id);
    setParamDraftValue(p.resultValue);
    setParamDraftAnalyst(
      p.analystName === 'Belum Ditugaskan' ? userDisplayName || 'Bagus Santoso, S.Si.' : p.analystName
    );
  };

  const saveParamResult = async (paramId: string) => {
    const trimmedVal = paramDraftValue.trim();
    const analyst = paramDraftAnalyst.trim() || userDisplayName || 'Analis Lab';
    const nowIso = new Date().toISOString();

    const updatedParams = sample.parameters.map((p) => {
      if (p.id !== paramId) return p;
      const compliance = evaluateCompliance(p, trimmedVal);
      return {
        ...p,
        resultValue: trimmedVal,
        analystName: analyst,
        status: trimmedVal ? ('Selesai' as const) : ('Sedang Diuji' as const),
        compliance,
        ...(trimmedVal ? { testedAt: nowIso } : {}),
      };
    });

    const targetParam = updatedParams.find((p) => p.id === paramId);
    const nextStage: BottleStage =
      sample.stage === 'Diterima Lab' || sample.stage === 'Preparasi'
        ? 'Proses Uji'
        : sample.stage;

    const newLog: CustodyLogEntry = {
      id: `log-${Date.now()}`,
      timestamp: nowIso,
      actor: analyst,
      role: 'Analis Lab',
      action: `Input Hasil Uji: ${targetParam?.name}`,
      note: trimmedVal
        ? `Hasil terukur ${trimmedVal} ${targetParam?.unit} (${targetParam?.compliance}).`
        : 'Parameter sedang dalam proses pengujian.',
      stageAfter: nextStage,
    };

    setSavingAction(true);
    try {
      await onUpdateSample({
        ...sample,
        stage: nextStage,
        parameters: updatedParams,
        custodyLogs: [...sample.custodyLogs, newLog],
      });
      setEditingParamId(null);
      setStageError('');
    } catch (err) {
      setStageError(err instanceof Error ? err.message : 'Gagal menyimpan hasil parameter.');
    } finally {
      setSavingAction(false);
    }
  };

  const handleStageAdvance = async (targetStage: BottleStage) => {
    setStageError('');
    if (
      (targetStage === 'Verifikasi QC' || targetStage === 'Sertifikat Terbit') &&
      !allParamsCompleted
    ) {
      setStageError(
        `Seluruh ${sample.parameters.length} parameter uji harus selesai diisi sebelum masuk tahap ${targetStage}.`
      );
      return;
    }

    if (targetStage === 'Sertifikat Terbit') {
      const anyExceeds = sample.parameters.some((p) => p.compliance === 'Melebihi Baku Mutu');
      setCertConclusion(
        anyExceeds
          ? `Pengujian sampel ${sample.sampleCode} (${sample.matrix}) telah selesai diverifikasi. Terdapat parameter yang melebihi ambang batas baku mutu.`
          : `Seluruh parameter uji pada sampel ${sample.sampleCode} (${sample.matrix}) telah diverifikasi dan memenuhi ambang batas baku mutu yang dipersyaratkan.`
      );
      setShowIssueForm(true);
      return;
    }

    const newLog: CustodyLogEntry = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actor: targetStage === 'Verifikasi QC' ? userDisplayName || 'Penyelia Kendali Mutu' : sample.labReceiver,
      role: targetStage === 'Verifikasi QC' ? 'Penyelia QC' : 'Penerima Sampel Lab',
      action: `Pembaruan Tahap → ${targetStage}`,
      note: `Botol ${sample.sampleCode} (Segel ${sample.sealNumber}) dipindahkan ke tahap ${targetStage}.`,
      stageAfter: targetStage,
    };

    setSavingAction(true);
    try {
      await onUpdateSample({
        ...sample,
        stage: targetStage,
        custodyLogs: [...sample.custodyLogs, newLog],
      });
    } catch (err) {
      setStageError(err instanceof Error ? err.message : 'Gagal memperbarui tahap sampel.');
    } finally {
      setSavingAction(false);
    }
  };

  const handleAddCustodyLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!logActor.trim() || !logNote.trim()) return;
    const entry: CustodyLogEntry = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actor: logActor.trim(),
      role: logRole,
      action: logAction.trim() || 'Catatan Serah Terima',
      note: logNote.trim(),
      stageAfter: sample.stage,
    };

    setSavingAction(true);
    try {
      await onUpdateSample({
        ...sample,
        custodyLogs: [...sample.custodyLogs, entry],
      });
      setLogActor('');
      setLogNote('');
    } catch (err) {
      setStageError(err instanceof Error ? err.message : 'Gagal menambahkan log serah terima.');
    } finally {
      setSavingAction(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (files.length === 0) return;

    setPhotoError('');
    setUploadingPhoto(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const compressed = await compressImageFile(files[i]);
        const caption =
          photoCaption.trim() || `${photoCategory} — ${sample.sampleCode} (${compressed.fileName})`;
        await uploadSamplePhoto(
          sample.id,
          {
            id: `ph-${Date.now()}-${i}`,
            category: photoCategory,
            caption,
            fileName: compressed.fileName,
            dataUrl: compressed.dataUrl,
            sizeKb: compressed.sizeKb,
          },
          userUid,
          userDisplayName
        );
      }
      setPhotoCaption('');
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : 'Gagal mengunggah foto bukti botol.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    setPhotoError('');
    try {
      await deleteSamplePhoto(sample.id, photoId);
      if (previewPhoto?.id === photoId) setPreviewPhoto(null);
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : 'Gagal menghapus foto.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-40 bg-slate-900/40 flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-labelledby="drawer-sample-title"
    >
      <div className="w-full max-w-4xl bg-white h-full border-l border-slate-200 flex flex-col">
        {/* Header Identifikasi Anti-Tertukar */}
        <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 bg-white">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className="font-mono font-semibold text-slate-900">{sample.sampleCode}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono">Segel {sample.sealNumber}</span>
              <span aria-hidden="true">·</span>
              <span>{sample.matrix}</span>
              <span aria-hidden="true">·</span>
              <StageIndicator stage={sample.stage} />
            </div>
            <h2
              id="drawer-sample-title"
              className="font-display text-xl font-semibold text-slate-900 mt-1 truncate"
            >
              {sample.companyName}
            </h2>
            <p className="text-xs text-slate-600 truncate">
              {sample.samplingLocation} · WO: <span className="font-mono">{sample.workOrderNo}</span>
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onOpenLabel(sample)}
              className="h-9 px-3 inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md transition-colors whitespace-nowrap"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>Label Botol</span>
            </button>

            {sample.certificate ? (
              <button
                type="button"
                onClick={() => onOpenCertificate(sample)}
                className="h-9 px-3.5 inline-flex items-center gap-1.5 text-xs font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-md transition-colors whitespace-nowrap"
              >
                <Award className="w-3.5 h-3.5" />
                <span>Lihat Sertifikat</span>
              </button>
            ) : (
              <button
                type="button"
                disabled={savingAction}
                onClick={() => handleStageAdvance('Sertifikat Terbit')}
                className="h-9 px-3.5 inline-flex items-center gap-1.5 text-xs font-medium text-white bg-sky-800 hover:bg-sky-900 rounded-md transition-colors whitespace-nowrap disabled:opacity-60"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Terbitkan Sertifikat</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup detail botol sampel"
              className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Konten Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {stageError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-md flex items-start gap-2.5 text-xs text-rose-800">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{stageError}</span>
            </div>
          )}

          {/* Form Konfirmasi Penerbitan Sertifikat */}
          {showIssueForm && !sample.certificate && (
            <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-md space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">
                  Pengesahan &amp; Penerbitan Sertifikat Hasil Uji (CoA)
                </h3>
                <button
                  type="button"
                  onClick={() => setShowIssueForm(false)}
                  className="text-xs text-slate-500 hover:text-slate-800"
                >
                  Batal
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Manajer Teknis Penandatangan
                  </label>
                  <input
                    type="text"
                    value={techManager}
                    onChange={(e) => setTechManager(e.target.value)}
                    className="w-full h-9 px-3 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:border-emerald-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Kesimpulan Hasil Uji
                  </label>
                  <input
                    type="text"
                    value={certConclusion}
                    onChange={(e) => setCertConclusion(e.target.value)}
                    className="w-full h-9 px-3 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:border-emerald-700"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={savingAction}
                  onClick={async () => {
                    setSavingAction(true);
                    try {
                      await onIssueCertificate(
                        sample,
                        techManager.trim() || 'Dr. Ratna Kusuma, M.Si.',
                        certConclusion.trim()
                      );
                      setShowIssueForm(false);
                    } finally {
                      setSavingAction(false);
                    }
                  }}
                  className="h-9 px-4 text-xs font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-md transition-colors disabled:opacity-60"
                >
                  {savingAction ? 'Menerbitkan...' : 'Sahkan & Terbitkan Sertifikat Sekarang'}
                </button>
              </div>
            </div>
          )}

          {/* Stepper Tahapan Monitoring */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">
                01. Monitoring Tahapan Sampel
              </h3>
              <span className="font-mono tabular-nums text-xs text-slate-500">
                Target Selesai: {formatDateID(sample.dueDate)}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {STAGE_ORDER.map((st, idx) => {
                const isCurrent = st === sample.stage;
                const isDone = idx < currentStageIndex || sample.stage === 'Sertifikat Terbit';
                return (
                  <button
                    key={st}
                    type="button"
                    disabled={sample.stage === 'Sertifikat Terbit' || savingAction}
                    onClick={() => handleStageAdvance(st)}
                    className={`p-2.5 text-left border rounded-md transition-colors ${
                      isCurrent
                        ? 'border-sky-800 bg-sky-50 text-slate-900 font-semibold'
                        : isDone
                        ? 'border-emerald-200 bg-emerald-50/40 text-emerald-900'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    } disabled:cursor-default`}
                  >
                    <div className="font-mono text-[11px] text-slate-400">
                      0{idx + 1}
                    </div>
                    <div className="text-xs mt-0.5 flex items-center justify-between gap-1">
                      <span className="truncate">{st}</span>
                      {isDone && !isCurrent && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Identifikasi Fisik & Rantai Penerimaan */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-900">
              02. Identitas Botol, Segel &amp; Penerimaan Teknis
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-y-4 gap-x-6 p-4 bg-slate-50 border border-slate-200 rounded-md text-xs">
              <div>
                <div className="text-slate-500">Kode Botol / Rak</div>
                <div className="font-mono font-semibold text-slate-900 mt-0.5">
                  {sample.sampleCode} · {sample.rackLocation}
                </div>
              </div>
              <div>
                <div className="text-slate-500">Nomor &amp; Kondisi Segel</div>
                <div className="mt-0.5 flex items-center gap-2">
                  <span className="font-mono font-semibold text-slate-900">{sample.sealNumber}</span>
                  <SealConditionText condition={sample.sealCondition} />
                </div>
              </div>
              <div>
                <div className="text-slate-500">Jumlah &amp; Suhu Diterima</div>
                <div className="font-mono tabular-nums text-slate-900 mt-0.5">
                  {sample.bottleCount} botol · {sample.temperatureOnReceipt}°C
                </div>
              </div>
              <div className="sm:col-span-2">
                <div className="text-slate-500">Jenis Wadah &amp; Pengawet</div>
                <div className="text-slate-900 font-medium mt-0.5">{sample.containerType}</div>
              </div>
              <div>
                <div className="text-slate-500">PIC Perusahaan</div>
                <div className="text-slate-900 mt-0.5">{sample.companyPic}</div>
              </div>
              <div>
                <div className="text-slate-500">Tim Teknis Lapangan</div>
                <div className="text-slate-900 font-medium mt-0.5">{sample.fieldTechnician}</div>
                <div className="font-mono text-[11px] text-slate-500">
                  {formatDateTimeID(sample.sampledAt)}
                </div>
              </div>
              <div>
                <div className="text-slate-500">Petugas Penerima Lab</div>
                <div className="text-slate-900 font-medium mt-0.5">{sample.labReceiver}</div>
                <div className="font-mono text-[11px] text-slate-500">
                  {formatDateTimeID(sample.receivedAt)}
                </div>
              </div>
              <div>
                <div className="text-slate-500">Catatan Khusus</div>
                <div className="text-slate-700 mt-0.5">{sample.notes || 'Tidak ada catatan'}</div>
              </div>
            </div>
          </section>

          {/* Bagian 3: Dokumentasi Foto Botol & Segel */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">
                03. Dokumentasi Foto Botol &amp; Segel Fisik
              </h3>
              <span className="font-mono tabular-nums text-xs text-slate-500">
                {photos.length} foto tersimpan
              </span>
            </div>

            {photoError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded text-xs text-rose-800">
                {photoError}
              </div>
            )}

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-md space-y-3">
              <div className="flex flex-col sm:flex-row gap-2.5">
                <select
                  value={photoCategory}
                  onChange={(e) => setPhotoCategory(e.target.value as PhotoCategory)}
                  aria-label="Kategori foto unggahan"
                  className="h-9 px-3 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:border-sky-700"
                >
                  <option value="Segel & Botol">Segel &amp; Botol</option>
                  <option value="Kondisi Penerimaan">Kondisi Penerimaan</option>
                  <option value="Preparasi & Uji">Preparasi &amp; Uji</option>
                </select>

                <input
                  type="text"
                  value={photoCaption}
                  onChange={(e) => setPhotoCaption(e.target.value)}
                  placeholder="Keterangan foto (mis. Segel utuh saat diterima lab)"
                  className="flex-1 h-9 px-3 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:border-sky-700"
                />

                <label className="h-9 px-4 inline-flex items-center justify-center gap-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-md cursor-pointer transition-colors whitespace-nowrap shrink-0">
                  <Camera className="w-3.5 h-3.5" />
                  <span>{uploadingPhoto ? 'Mengunggah...' : 'Unggah Foto'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    disabled={uploadingPhoto}
                    onChange={handlePhotoUpload}
                    className="sr-only"
                  />
                </label>
              </div>

              {photoLoading ? (
                <div className="text-xs text-slate-500 py-4">Memuat foto dokumentasi botol...</div>
              ) : photos.length === 0 ? (
                <div className="text-xs text-slate-500 py-3">
                  Belum ada foto fisik botol yang diunggah. Unggah foto botol atau segel untuk memperkuat bukti identifikasi anti-tertukar.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  {photos.map((ph) => (
                    <div
                      key={ph.id}
                      className="bg-white border border-slate-200 rounded-md overflow-hidden flex flex-col"
                    >
                      <div className="aspect-4/3 bg-slate-100 relative group">
                        <img
                          src={ph.dataUrl}
                          alt={ph.caption}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-2 right-2 flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setPreviewPhoto(ph)}
                            aria-label={`Perbesar foto ${ph.caption}`}
                            className="p-1.5 bg-white/90 hover:bg-white text-slate-700 border border-slate-200 rounded-md"
                          >
                            <ZoomIn className="w-3.5 h-3.5" />
                          </button>
                          {sample.stage !== 'Sertifikat Terbit' && (
                            <button
                              type="button"
                              onClick={() => handleDeletePhoto(ph.id)}
                              aria-label={`Hapus foto ${ph.caption}`}
                              className="p-1.5 bg-white/90 hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-200 rounded-md"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="p-2.5 space-y-1 text-xs">
                        <div className="text-[11px] font-medium text-sky-900">{ph.category}</div>
                        <div className="text-slate-900 font-medium line-clamp-2">{ph.caption}</div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {ph.uploadedBy} · {formatDateTimeID(ph.createdAt)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Parameter Uji & Input Hasil */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">
                04. Parameter Uji &amp; Hasil Analisis
              </h3>
              <span className="font-mono tabular-nums text-xs text-slate-600">
                {completedParamsCount}/{sample.parameters.length} parameter selesai
              </span>
            </div>

            <div className="border border-slate-200 rounded-md overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                    <th className="py-2.5 px-3 font-semibold">Parameter Uji</th>
                    <th className="py-2.5 px-3 font-semibold">Metode</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Baku Mutu</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Hasil Uji</th>
                    <th className="py-2.5 px-3 font-semibold">Evaluasi</th>
                    <th className="py-2.5 px-3 font-semibold">Analis</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {sample.parameters.map((param) => {
                    const isEditing = editingParamId === param.id;
                    return (
                      <tr key={param.id} className="hover:bg-slate-50/60">
                        <td className="py-2.5 px-3 font-medium text-slate-900">
                          {param.name}
                          <div className="text-[11px] text-slate-500 font-normal">
                            Satuan: {param.unit}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-600">
                          {param.method}
                        </td>
                        <td className="py-2.5 px-3 font-mono tabular-nums text-right text-slate-700 whitespace-nowrap">
                          {param.limitText}
                        </td>
                        <td className="py-2.5 px-3 font-mono tabular-nums text-right font-semibold text-slate-900">
                          {isEditing ? (
                            <input
                              type="text"
                              autoFocus
                              value={paramDraftValue}
                              onChange={(e) => setParamDraftValue(e.target.value)}
                              placeholder="Nilai"
                              className="w-24 h-8 px-2 text-right font-mono text-xs border border-sky-700 rounded bg-white focus:outline-none"
                            />
                          ) : param.resultValue ? (
                            <span>
                              {param.resultValue} {param.unit}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-normal">Menunggu</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <ComplianceIndicator compliance={param.compliance} />
                        </td>
                        <td className="py-2.5 px-3 text-slate-700">
                          {isEditing ? (
                            <input
                              type="text"
                              value={paramDraftAnalyst}
                              onChange={(e) => setParamDraftAnalyst(e.target.value)}
                              placeholder="Nama Analis"
                              className="w-36 h-8 px-2 text-xs border border-slate-300 rounded bg-white focus:outline-none focus:border-sky-700"
                            />
                          ) : (
                            <div>
                              <div>{param.analystName}</div>
                              {param.testedAt && (
                                <div className="font-mono text-[10px] text-slate-400">
                                  {formatDateTimeID(param.testedAt)}
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right whitespace-nowrap">
                          {sample.stage === 'Sertifikat Terbit' ? (
                            <span className="text-[11px] text-slate-400">Terkunci</span>
                          ) : isEditing ? (
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                disabled={savingAction}
                                onClick={() => saveParamResult(param.id)}
                                className="px-2.5 py-1 text-[11px] font-medium bg-sky-800 text-white rounded hover:bg-sky-900 disabled:opacity-60"
                              >
                                Simpan
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingParamId(null)}
                                className="px-2 py-1 text-[11px] text-slate-600 hover:text-slate-900"
                              >
                                Batal
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => startEditParam(param)}
                              className="text-xs font-medium text-sky-800 hover:text-sky-900 hover:underline"
                            >
                              {param.resultValue ? 'Ubah Hasil' : 'Input Hasil'}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* Jejak Audit & Serah Terima (Chain of Custody) */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-900">
              05. Log Serah Terima &amp; Jejak Audit (Chain of Custody)
            </h3>

            <div className="border border-slate-200 rounded-md divide-y divide-slate-200">
              {sample.custodyLogs.map((log) => (
                <div key={log.id} className="p-3.5 flex flex-col sm:flex-row sm:items-start justify-between gap-2 text-xs">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-semibold text-slate-900">{log.action}</span>
                      <span className="text-slate-400">·</span>
                      <span className="text-slate-700">{log.actor}</span>
                      <span className="text-slate-400">({log.role})</span>
                    </div>
                    <p className="text-slate-600">{log.note}</p>
                  </div>
                  <div className="text-left sm:text-right shrink-0">
                    <div className="font-mono tabular-nums text-slate-500">
                      {formatDateTimeID(log.timestamp)}
                    </div>
                    <div className="mt-0.5 flex sm:justify-end items-center gap-1 text-[11px] text-slate-500">
                      <ArrowRight className="w-3 h-3" />
                      <span>{log.stageAfter}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {sample.stage !== 'Sertifikat Terbit' && (
              <form
                onSubmit={handleAddCustodyLog}
                className="p-4 bg-slate-50 border border-slate-200 rounded-md space-y-3"
              >
                <div className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                  <ClipboardPlus className="w-3.5 h-3.5 text-sky-800" />
                  <span>Catat Serah Terima Internal / Pergerakan Botol</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <input
                    type="text"
                    placeholder="Nama Petugas / Analis"
                    value={logActor}
                    onChange={(e) => setLogActor(e.target.value)}
                    className="h-9 px-3 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:border-sky-700"
                  />
                  <select
                    value={logRole}
                    onChange={(e) => setLogRole(e.target.value as CustodyLogEntry['role'])}
                    className="h-9 px-3 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:border-sky-700"
                  >
                    <option value="Penerima Sampel Lab">Penerima Sampel Lab</option>
                    <option value="Analis Lab">Analis Lab</option>
                    <option value="Penyelia QC">Penyelia QC</option>
                    <option value="Tim Teknis Lapangan">Tim Teknis Lapangan</option>
                    <option value="Manajer Teknis">Manajer Teknis</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Aktivitas (mis. Pemindahan Rak)"
                    value={logAction}
                    onChange={(e) => setLogAction(e.target.value)}
                    className="h-9 px-3 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:border-sky-700"
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-2.5">
                  <input
                    type="text"
                    placeholder="Catatan kondisi botol, pemindahan rak, atau pembagian aliquot..."
                    value={logNote}
                    onChange={(e) => setLogNote(e.target.value)}
                    className="flex-1 h-9 px-3 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:border-sky-700"
                  />
                  <button
                    type="submit"
                    disabled={savingAction}
                    className="h-9 px-4 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-md whitespace-nowrap disabled:opacity-60"
                  >
                    Tambah Log
                  </button>
                </div>
              </form>
            )}
          </section>

          {/* Hapus Sampel dengan Konfirmasi Aman */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
            {confirmDelete ? (
              <div className="flex items-center gap-3 text-xs">
                <span className="text-rose-700 font-medium">
                  Hapus permanen catatan botol {sample.sampleCode} beserta fotonya?
                </span>
                <button
                  type="button"
                  disabled={savingAction}
                  onClick={async () => {
                    setSavingAction(true);
                    try {
                      await onDeleteSample(sample.id);
                    } finally {
                      setSavingAction(false);
                    }
                  }}
                  className="px-3 py-1.5 bg-rose-700 text-white rounded hover:bg-rose-800 font-medium disabled:opacity-60"
                >
                  Ya, Hapus
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="px-3 py-1.5 text-slate-600 hover:text-slate-900"
                >
                  Batal
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-rose-700 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus Data Sampel</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Lightbox Preview Foto */}
      {previewPhoto && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/80 flex items-center justify-center p-4"
          onClick={() => setPreviewPhoto(null)}
        >
          <div
            className="bg-white border border-slate-200 rounded-lg max-w-3xl w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <div className="text-xs">
                <span className="font-semibold text-slate-900">{previewPhoto.caption}</span>
                <span className="text-slate-500 ml-2 font-mono">
                  {previewPhoto.category} · {previewPhoto.uploadedBy}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setPreviewPhoto(null)}
                aria-label="Tutup pratinjau foto"
                className="p-1.5 text-slate-500 hover:text-slate-900 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="bg-slate-900 flex items-center justify-center max-h-[75vh]">
              <img
                src={previewPhoto.dataUrl}
                alt={previewPhoto.caption}
                className="max-h-[75vh] w-auto object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
