import React, { useMemo, useState } from 'react';
import { AlertTriangle, Camera, Check, Plus, ShieldCheck, Trash2, X } from 'lucide-react';
import { CONTAINER_PRESETS, MATRIX_OPTIONS } from '../data/presets';
import {
  ParameterPreset,
  PendingPhotoUpload,
  PhotoCategory,
  SampleBottle,
  SampleMatrix,
  SealCondition,
  TestParameter,
} from '../types/sample';
import { compressImageFile } from '../utils/photo';
import { generateNextSampleCode, generateNextSealNumber } from '../utils/storage';

interface SampleIntakeModalProps {
  existingSamples: SampleBottle[];
  catalog: ParameterPreset[];
  defaultReceiverName: string;
  onClose: () => void;
  onCreateSample: (sample: SampleBottle, photos: PendingPhotoUpload[]) => Promise<void>;
}

export const SampleIntakeModal: React.FC<SampleIntakeModalProps> = ({
  existingSamples,
  catalog,
  defaultReceiverName,
  onClose,
  onCreateSample,
}) => {
  const defaultSampleCode = useMemo(
    () => generateNextSampleCode(existingSamples),
    [existingSamples]
  );
  const defaultSealNumber = useMemo(
    () => generateNextSealNumber(existingSamples),
    [existingSamples]
  );

  const nowLocal = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
  const defaultDue = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

  const [sampleCode, setSampleCode] = useState(defaultSampleCode);
  const [sealNumber, setSealNumber] = useState(defaultSealNumber);
  const [workOrderNo, setWorkOrderNo] = useState(
    `WO/2026/XI/${String(existingSamples.length + 102).padStart(3, '0')}`
  );
  const [companyName, setCompanyName] = useState('');
  const [companyPic, setCompanyPic] = useState('');
  const [samplingLocation, setSamplingLocation] = useState('');
  const [matrix, setMatrix] = useState<SampleMatrix>('Air Limbah');
  const [containerType, setContainerType] = useState(CONTAINER_PRESETS['Air Limbah'][0]);
  const [bottleCount, setBottleCount] = useState(2);
  const [sealCondition, setSealCondition] = useState<SealCondition>('Segel Utuh');
  const [temperatureOnReceipt, setTemperatureOnReceipt] = useState('4.0');
  const [fieldTechnician, setFieldTechnician] = useState('');
  const [labReceiver, setLabReceiver] = useState(defaultReceiverName || 'Dewi Kartika, A.Md.');
  const [sampledAt, setSampledAt] = useState(nowLocal);
  const [receivedAt, setReceivedAt] = useState(nowLocal);
  const [dueDate, setDueDate] = useState(defaultDue);
  const [rackLocation, setRackLocation] = useState('RAK-A1 / SLOT-01');
  const [notes, setNotes] = useState('');
  const [sealVerified, setSealVerified] = useState(false);

  const [selectedPresetIds, setSelectedPresetIds] = useState<string[]>(() =>
    catalog.filter((p) => p.matrix === 'Air Limbah').slice(0, 3).map((p) => p.id)
  );
  const [customParams, setCustomParams] = useState<
    { name: string; method: string; unit: string; limitText: string; limitMax?: string }[]
  >([]);
  const [newCustomName, setNewCustomName] = useState('');
  const [newCustomMethod, setNewCustomMethod] = useState('');
  const [newCustomUnit, setNewCustomUnit] = useState('mg/L');
  const [newCustomLimit, setNewCustomLimit] = useState('');

  // Unggah Foto Bukti Fisik Botol & Segel
  const [photos, setPhotos] = useState<PendingPhotoUpload[]>([]);
  const [photoCategory, setPhotoCategory] = useState<PhotoCategory>('Segel & Botol');
  const [compressingPhoto, setCompressingPhoto] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const matrixPresets = useMemo(
    () => catalog.filter((p) => p.matrix === matrix),
    [catalog, matrix]
  );

  const duplicateSampleCode = useMemo(
    () =>
      existingSamples.some(
        (s) => s.sampleCode.trim().toLowerCase() === sampleCode.trim().toLowerCase()
      ),
    [existingSamples, sampleCode]
  );

  const duplicateSealNumber = useMemo(
    () =>
      existingSamples.some(
        (s) => s.sealNumber.trim().toLowerCase() === sealNumber.trim().toLowerCase()
      ),
    [existingSamples, sealNumber]
  );

  const handleMatrixChange = (nextMatrix: SampleMatrix) => {
    setMatrix(nextMatrix);
    setContainerType(CONTAINER_PRESETS[nextMatrix][0]);
    const defaults = catalog.filter((p) => p.matrix === nextMatrix).slice(0, 2).map((p) => p.id);
    setSelectedPresetIds(defaults);
  };

  const togglePreset = (id: string) => {
    setSelectedPresetIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleAddCustomParam = () => {
    if (!newCustomName.trim()) return;
    setCustomParams((prev) => [
      ...prev,
      {
        name: newCustomName.trim(),
        method: newCustomMethod.trim() || 'Metode Internal Lab',
        unit: newCustomUnit.trim() || 'mg/L',
        limitText: newCustomLimit.trim() ? `≤ ${newCustomLimit.trim()}` : 'Sesuai Regulasi',
        limitMax: newCustomLimit.trim() || undefined,
      },
    ]);
    setNewCustomName('');
    setNewCustomMethod('');
    setNewCustomLimit('');
  };

  const handlePhotoFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (files.length === 0) return;

    setErrorMsg('');
    setCompressingPhoto(true);
    try {
      const remainingSlots = Math.max(0, 6 - photos.length);
      const selectedFiles = files.slice(0, remainingSlots);
      const processed: PendingPhotoUpload[] = [];

      for (let i = 0; i < selectedFiles.length; i++) {
        const result = await compressImageFile(selectedFiles[i]);
        processed.push({
          id: `ph-${Date.now()}-${i}`,
          category: photoCategory,
          caption: `${photoCategory} — ${sampleCode.trim().toUpperCase()}`,
          fileName: result.fileName,
          dataUrl: result.dataUrl,
          sizeKb: result.sizeKb,
        });
      }

      setPhotos((prev) => [...prev, ...processed]);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal memproses foto yang diunggah.');
    } finally {
      setCompressingPhoto(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (duplicateSampleCode) {
      setErrorMsg('Kode botol sudah terdaftar. Gunakan kode unik lain untuk mencegah sampel tertukar.');
      return;
    }
    if (duplicateSealNumber) {
      setErrorMsg('Nomor segel fisik sudah tercatat pada sampel lain. Periksa ulang label segel botol.');
      return;
    }
    if (!companyName.trim() || !samplingLocation.trim() || !fieldTechnician.trim() || !labReceiver.trim()) {
      setErrorMsg('Lengkapi nama perusahaan, titik pengambilan sampel, tim teknis lapangan, dan penerima lab.');
      return;
    }
    if (selectedPresetIds.length === 0 && customParams.length === 0) {
      setErrorMsg('Pilih minimal 1 parameter uji yang dibutuhkan perusahaan agar pengujian tidak tertukar.');
      return;
    }
    if (!sealVerified) {
      setErrorMsg('Centang konfirmasi pemeriksaan segel fisik dan kesesuaian label sebelum menyimpan.');
      return;
    }

    const chosenPresets = catalog.filter((p) => selectedPresetIds.includes(p.id));
    const parameters: TestParameter[] = [
      ...chosenPresets.map((p, idx) => ({
        id: `prm-${Date.now()}-${idx}`,
        name: p.name,
        method: p.method,
        unit: p.unit,
        limitText: p.limitText,
        ...(p.limitMin !== undefined ? { limitMin: p.limitMin } : {}),
        ...(p.limitMax !== undefined ? { limitMax: p.limitMax } : {}),
        resultValue: '',
        status: 'Menunggu' as const,
        compliance: 'Belum Dievaluasi' as const,
        analystName: 'Belum Ditugaskan',
      })),
      ...customParams.map((c, idx) => {
        const parsedMax = c.limitMax ? parseFloat(c.limitMax.replace(',', '.')) : undefined;
        return {
          id: `prm-c-${Date.now()}-${idx}`,
          name: c.name,
          method: c.method,
          unit: c.unit,
          limitText: c.limitText,
          ...(parsedMax !== undefined && !Number.isNaN(parsedMax) ? { limitMax: parsedMax } : {}),
          resultValue: '',
          status: 'Menunggu' as const,
          compliance: 'Belum Dievaluasi' as const,
          analystName: 'Belum Ditugaskan',
        };
      }),
    ];

    const newSample: SampleBottle = {
      id: `smp-${Date.now()}`,
      sampleCode: sampleCode.trim().toUpperCase(),
      sealNumber: sealNumber.trim().toUpperCase(),
      workOrderNo: workOrderNo.trim(),
      companyName: companyName.trim(),
      companyPic: companyPic.trim() || 'PIC Perusahaan',
      samplingLocation: samplingLocation.trim(),
      matrix,
      containerType,
      bottleCount: Math.max(1, Number(bottleCount) || 1),
      sealCondition,
      temperatureOnReceipt: parseFloat(temperatureOnReceipt) || 4.0,
      fieldTechnician: fieldTechnician.trim(),
      labReceiver: labReceiver.trim(),
      sampledAt,
      receivedAt,
      dueDate,
      stage: 'Diterima Lab',
      rackLocation: rackLocation.trim() || 'RAK-PENERIMAAN',
      notes: notes.trim(),
      parameters,
      custodyLogs: [
        {
          id: `log-${Date.now()}-1`,
          timestamp: sampledAt,
          actor: fieldTechnician.trim(),
          role: 'Tim Teknis Lapangan',
          action: 'Pengambilan & Penyegelan Sampel Lapangan',
          note: `${bottleCount} botol (${containerType}) disegel dengan nomor ${sealNumber.trim().toUpperCase()} di ${samplingLocation.trim()}.`,
          stageAfter: 'Diterima Lab',
        },
        {
          id: `log-${Date.now()}-2`,
          timestamp: receivedAt,
          actor: labReceiver.trim(),
          role: 'Penerima Sampel Lab',
          action: 'Verifikasi Fisik, Segel & Registrasi Botol Masuk',
          note: `Identitas botol dan segel terverifikasi (${sealCondition}, suhu ${temperatureOnReceipt}°C, ${photos.length} foto terlampir). Ditempatkan di ${rackLocation.trim() || 'RAK-PENERIMAAN'}.`,
          stageAfter: 'Diterima Lab',
        },
      ],
    };

    setSubmitting(true);
    try {
      await onCreateSample(newSample, photos);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Gagal menyimpan botol sampel ke database.'
      );
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="intake-modal-title"
    >
      <div className="bg-white border border-slate-200 rounded-lg w-full max-w-4xl max-h-[92vh] flex flex-col">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4 shrink-0">
          <div>
            <h2 id="intake-modal-title" className="font-display text-lg font-semibold text-slate-900">
              Penerimaan &amp; Identifikasi Botol Sampel Baru
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Input identitas botol dari tim teknis lapangan, unggah foto fisik botol/segel, dan tentukan parameter uji klien.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup form penerimaan sampel"
            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-6 space-y-6">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-md flex items-start gap-2.5 text-sm text-rose-800">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Bagian 1: Identifikasi Anti-Tertukar */}
          <section className="space-y-4">
            <div className="border-b border-slate-200 pb-2">
              <h3 className="text-sm font-semibold text-slate-900">
                01. Identifikasi Unik Botol &amp; Segel Fisik
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Kode Botol Internal (Unik)
                </label>
                <input
                  type="text"
                  required
                  value={sampleCode}
                  onChange={(e) => setSampleCode(e.target.value)}
                  className={`w-full h-10 px-3 font-mono text-sm border rounded-md focus:outline-none ${
                    duplicateSampleCode
                      ? 'border-rose-500 bg-rose-50 text-rose-900'
                      : 'border-slate-300 bg-white text-slate-900 focus:border-sky-700'
                  }`}
                />
                {duplicateSampleCode && (
                  <p className="text-xs text-rose-700 mt-1">Kode botol ini sudah digunakan.</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Nomor Segel Botol Lapangan
                </label>
                <input
                  type="text"
                  required
                  value={sealNumber}
                  onChange={(e) => setSealNumber(e.target.value)}
                  className={`w-full h-10 px-3 font-mono text-sm border rounded-md focus:outline-none ${
                    duplicateSealNumber
                      ? 'border-rose-500 bg-rose-50 text-rose-900'
                      : 'border-slate-300 bg-white text-slate-900 focus:border-sky-700'
                  }`}
                />
                {duplicateSealNumber && (
                  <p className="text-xs text-rose-700 mt-1">Nomor segel sudah tercatat di sampel lain.</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  No. Work Order / Surat Tugas
                </label>
                <input
                  type="text"
                  required
                  value={workOrderNo}
                  onChange={(e) => setWorkOrderNo(e.target.value)}
                  className="w-full h-10 px-3 font-mono text-sm border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:border-sky-700"
                />
              </div>
            </div>
          </section>

          {/* Bagian 2: Data Perusahaan & Tim Teknis */}
          <section className="space-y-4">
            <div className="border-b border-slate-200 pb-2">
              <h3 className="text-sm font-semibold text-slate-900">
                02. Asal Perusahaan &amp; Serah Terima Tim Teknis
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Nama Perusahaan / Klien *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: PT Industri Kimia Jaya"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full h-10 px-3 text-sm border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:border-sky-700"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  PIC Perusahaan (Bapak/Ibu)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Ibu Kartika Sari"
                  value={companyPic}
                  onChange={(e) => setCompanyPic(e.target.value)}
                  className="w-full h-10 px-3 text-sm border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:border-sky-700"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Titik Pengambilan Sampel di Lapangan *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Outlet IPAL Gedung B — Koordinat -6.2145, 106.8451"
                  value={samplingLocation}
                  onChange={(e) => setSamplingLocation(e.target.value)}
                  className="w-full h-10 px-3 text-sm border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:border-sky-700"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Tim Teknis Pengambil Sampel (Lapangan) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Rizky Pratama, S.T."
                  value={fieldTechnician}
                  onChange={(e) => setFieldTechnician(e.target.value)}
                  className="w-full h-10 px-3 text-sm border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:border-sky-700"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Petugas Penerima Sampel (Laboratorium) *
                </label>
                <input
                  type="text"
                  required
                  value={labReceiver}
                  onChange={(e) => setLabReceiver(e.target.value)}
                  className="w-full h-10 px-3 text-sm border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:border-sky-700"
                />
              </div>
            </div>
          </section>

          {/* Bagian 3: Spesifikasi Wadah Botol & Kondisi Penerimaan */}
          <section className="space-y-4">
            <div className="border-b border-slate-200 pb-2">
              <h3 className="text-sm font-semibold text-slate-900">
                03. Matriks, Wadah Botol &amp; Kondisi Penerimaan
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Matriks Sampel
                </label>
                <select
                  value={matrix}
                  onChange={(e) => handleMatrixChange(e.target.value as SampleMatrix)}
                  className="w-full h-10 px-3 text-sm border border-slate-300 rounded-md bg-white text-slate-900 focus:outline-none focus:border-sky-700"
                >
                  {MATRIX_OPTIONS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Jenis Botol / Wadah &amp; Bahan Pengawet
                </label>
                <select
                  value={containerType}
                  onChange={(e) => setContainerType(e.target.value)}
                  className="w-full h-10 px-3 text-sm border border-slate-300 rounded-md bg-white text-slate-900 focus:outline-none focus:border-sky-700"
                >
                  {CONTAINER_PRESETS[matrix].map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Jumlah Botol Diterima
                </label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={bottleCount}
                  onChange={(e) => setBottleCount(parseInt(e.target.value, 10) || 1)}
                  className="w-full h-10 px-3 font-mono tabular-nums text-sm border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:border-sky-700"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Kondisi Segel Fisik
                </label>
                <select
                  value={sealCondition}
                  onChange={(e) => setSealCondition(e.target.value as SealCondition)}
                  className="w-full h-10 px-3 text-sm border border-slate-300 rounded-md bg-white text-slate-900 focus:outline-none focus:border-sky-700"
                >
                  <option value="Segel Utuh">Segel Utuh</option>
                  <option value="Segel Pengaman Ganda">Segel Pengaman Ganda</option>
                  <option value="Perlu Verifikasi Ulang">Perlu Verifikasi Ulang</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Suhu Coolbox Diterima (°C)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={temperatureOnReceipt}
                  onChange={(e) => setTemperatureOnReceipt(e.target.value)}
                  className="w-full h-10 px-3 font-mono tabular-nums text-sm border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:border-sky-700"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Waktu Pengambilan (Lapangan)
                </label>
                <input
                  type="datetime-local"
                  value={sampledAt}
                  onChange={(e) => setSampledAt(e.target.value)}
                  className="w-full h-10 px-3 font-mono text-xs border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:border-sky-700"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Waktu Diterima (Lab)
                </label>
                <input
                  type="datetime-local"
                  value={receivedAt}
                  onChange={(e) => setReceivedAt(e.target.value)}
                  className="w-full h-10 px-3 font-mono text-xs border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:border-sky-700"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Target Selesai &amp; Rak Penyimpanan
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full h-10 px-2 font-mono text-xs border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:border-sky-700"
                  />
                  <input
                    type="text"
                    value={rackLocation}
                    onChange={(e) => setRackLocation(e.target.value)}
                    placeholder="RAK-A1"
                    className="w-full h-10 px-2 font-mono text-xs border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:border-sky-700"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Bagian 4: Parameter Uji yang Dibutuhkan */}
          <section className="space-y-4">
            <div className="border-b border-slate-200 pb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">
                04. Parameter Uji yang Dibutuhkan ({matrix})
              </h3>
              <span className="font-mono tabular-nums text-xs text-slate-500">
                {selectedPresetIds.length + customParams.length} parameter dipilih
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {matrixPresets.map((preset) => {
                const checked = selectedPresetIds.includes(preset.id);
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => togglePreset(preset.id)}
                    className={`p-3 text-left border rounded-md transition-colors flex items-start justify-between gap-3 ${
                      checked
                        ? 'border-sky-700 bg-sky-50/60'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-slate-900 truncate">
                        {preset.name}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 font-mono">
                        {preset.method} · Baku Mutu: {preset.limitText} {preset.unit}
                      </div>
                    </div>
                    <span
                      className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 mt-0.5 ${
                        checked
                          ? 'bg-sky-800 border-sky-800 text-white'
                          : 'border-slate-300 bg-white'
                      }`}
                    >
                      {checked && <Check className="w-3.5 h-3.5" />}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-md space-y-3">
              <div className="text-xs font-semibold text-slate-700">
                Tambah Parameter Uji Khusus Permintaan Klien
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                <input
                  type="text"
                  placeholder="Nama Parameter (mis. Fenol)"
                  value={newCustomName}
                  onChange={(e) => setNewCustomName(e.target.value)}
                  className="sm:col-span-4 h-9 px-3 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:border-sky-700"
                />
                <input
                  type="text"
                  placeholder="Metode (mis. SNI 06-6989.21)"
                  value={newCustomMethod}
                  onChange={(e) => setNewCustomMethod(e.target.value)}
                  className="sm:col-span-3 h-9 px-3 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:border-sky-700"
                />
                <input
                  type="text"
                  placeholder="Satuan"
                  value={newCustomUnit}
                  onChange={(e) => setNewCustomUnit(e.target.value)}
                  className="sm:col-span-2 h-9 px-3 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:border-sky-700"
                />
                <input
                  type="text"
                  placeholder="Batas Maks"
                  value={newCustomLimit}
                  onChange={(e) => setNewCustomLimit(e.target.value)}
                  className="sm:col-span-2 h-9 px-3 font-mono text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:border-sky-700"
                />
                <button
                  type="button"
                  onClick={handleAddCustomParam}
                  className="sm:col-span-1 h-9 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-md inline-flex items-center justify-center"
                  title="Tambahkan parameter khusus"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {customParams.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  {customParams.map((c, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between text-xs bg-white border border-slate-200 px-3 py-2 rounded"
                    >
                      <span>
                        <strong className="text-slate-900">{c.name}</strong> ·{' '}
                        <span className="font-mono text-slate-500">
                          {c.method} · {c.limitText} {c.unit}
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setCustomParams((prev) => prev.filter((_, i) => i !== idx))
                        }
                        className="text-slate-400 hover:text-rose-700 p-1"
                        aria-label="Hapus parameter khusus"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Bagian 5: Unggah Foto Bukti Fisik Botol & Segel */}
          <section className="space-y-4">
            <div className="border-b border-slate-200 pb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">
                05. Unggah Foto Bukti Fisik Botol &amp; Segel (Opsional, Maks. 6 Foto)
              </h3>
              <span className="font-mono tabular-nums text-xs text-slate-500">
                {photos.length}/6 foto siap diunggah
              </span>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-md space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <select
                  value={photoCategory}
                  onChange={(e) => setPhotoCategory(e.target.value as PhotoCategory)}
                  aria-label="Kategori foto botol"
                  className="h-9 px-3 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:border-sky-700"
                >
                  <option value="Segel & Botol">Foto Segel &amp; Botol</option>
                  <option value="Kondisi Penerimaan">Foto Kondisi Coolbox / Penerimaan</option>
                  <option value="Preparasi & Uji">Foto Label &amp; Preparasi</option>
                </select>

                <label className="h-9 px-4 inline-flex items-center gap-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-md cursor-pointer transition-colors whitespace-nowrap">
                  <Camera className="w-3.5 h-3.5" />
                  <span>
                    {compressingPhoto ? 'Memproses Foto...' : 'Pilih / Ambil Foto Botol'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    disabled={compressingPhoto || photos.length >= 6}
                    onChange={handlePhotoFilesSelected}
                    className="sr-only"
                  />
                </label>

                <span className="text-[11px] text-slate-500">
                  Foto otomatis dikompresi agar cepat tersimpan ke database Firestore.
                </span>
              </div>

              {photos.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  {photos.map((ph) => (
                    <div
                      key={ph.id}
                      className="bg-white border border-slate-200 rounded-md overflow-hidden flex flex-col"
                    >
                      <div className="aspect-4/3 bg-slate-100 relative">
                        <img
                          src={ph.dataUrl}
                          alt={ph.caption}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setPhotos((prev) => prev.filter((item) => item.id !== ph.id))
                          }
                          aria-label={`Hapus foto ${ph.fileName}`}
                          className="absolute top-2 right-2 p-1.5 bg-white/90 hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-200 rounded-md"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="p-2.5 space-y-1.5">
                        <div className="text-[11px] font-medium text-slate-500 flex items-center justify-between">
                          <span>{ph.category}</span>
                          <span className="font-mono tabular-nums">{ph.sizeKb} KB</span>
                        </div>
                        <input
                          type="text"
                          value={ph.caption}
                          onChange={(e) =>
                            setPhotos((prev) =>
                              prev.map((item) =>
                                item.id === ph.id ? { ...item, caption: e.target.value } : item
                              )
                            )
                          }
                          placeholder="Keterangan foto..."
                          className="w-full h-8 px-2 text-xs border border-slate-200 rounded focus:outline-none focus:border-sky-700"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Catatan & Konfirmasi Anti-Tertukar */}
          <section className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Catatan Penerimaan &amp; Kondisi Pengawetan
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Catat kondisi khusus botol, pH pengawet, atau instruksi prioritas uji..."
                className="w-full p-3 text-sm border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:border-sky-700"
              />
            </div>

            <label className="flex items-start gap-3 p-3.5 bg-sky-50/70 border border-sky-200 rounded-md cursor-pointer">
              <input
                type="checkbox"
                checked={sealVerified}
                onChange={(e) => setSealVerified(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-sky-800"
              />
              <span className="text-xs text-slate-800 leading-relaxed">
                <strong className="font-semibold text-slate-900 inline-flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-sky-800" />
                  Verifikasi Ganda Anti-Tertukar:
                </strong>{' '}
                Saya memastikan label fisik botol, nomor segel{' '}
                <span className="font-mono font-semibold">{sealNumber}</span>, dan daftar parameter
                uji telah dicocokkan langsung dengan surat serah terima tim teknis lapangan.
              </span>
            </label>
          </section>

          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="h-10 px-4 text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting || compressingPhoto}
              className="h-10 px-5 text-sm font-medium text-white bg-sky-800 hover:bg-sky-900 rounded-md transition-colors whitespace-nowrap disabled:opacity-60"
            >
              {submitting ? 'Menyimpan ke Database...' : 'Simpan & Terbitkan Label Botol'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
