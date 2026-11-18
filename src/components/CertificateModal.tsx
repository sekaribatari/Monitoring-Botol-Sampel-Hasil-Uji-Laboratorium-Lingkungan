import React from 'react';
import { Printer, ShieldCheck, X } from 'lucide-react';
import { SampleBottle } from '../types/sample';
import { formatDateID, formatDateTimeID } from '../utils/storage';
import { QrMatrixSvg } from './BarcodeSvg';
import { ComplianceIndicator } from './StageIndicator';

interface CertificateModalProps {
  sample: SampleBottle;
  onClose: () => void;
}

export const CertificateModal: React.FC<CertificateModalProps> = ({ sample, onClose }) => {
  const cert = sample.certificate;
  if (!cert) return null;

  const hasNonCompliant = sample.parameters.some(
    (p) => p.compliance === 'Melebihi Baku Mutu'
  );

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="certificate-modal-title"
    >
      <div className="bg-white border border-slate-200 rounded-lg w-full max-w-4xl max-h-[94vh] flex flex-col">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4 no-print">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-700" />
            <div>
              <h2 id="certificate-modal-title" className="font-display text-base font-semibold text-slate-900">
                Sertifikat Hasil Uji Resmi · {cert.certificateNumber}
              </h2>
              <p className="text-xs text-slate-500">
                Terverifikasi dengan jejak botol {sample.sampleCode} dan segel {sample.sealNumber}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="h-9 px-4 inline-flex items-center gap-2 text-sm font-medium text-white bg-sky-800 hover:bg-sky-900 rounded-md transition-colors whitespace-nowrap"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak / Simpan PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup sertifikat"
              className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Dokumen Sertifikat */}
        <div className="p-8 overflow-y-auto print-area bg-white text-slate-900 space-y-6">
          {/* Kop Laboratorium */}
          <div className="border-b-2 border-slate-900 pb-5 flex items-start justify-between gap-6">
            <div>
              <div className="font-display text-xl font-bold tracking-tight text-slate-900">
                {cert.issuedBy}
              </div>
              <div className="text-xs text-slate-600 mt-1">
                {cert.accreditationRef}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                Divisi Verifikasi Kualitas Lingkungan, Air, Emisi &amp; Material Industri
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="font-display text-sm font-bold text-slate-900">
                SERTIFIKAT HASIL UJI
              </div>
              <div className="text-xs text-slate-500">Certificate of Analysis (CoA)</div>
              <div className="font-mono text-sm font-semibold text-sky-900 mt-1">
                {cert.certificateNumber}
              </div>
            </div>
          </div>

          {/* Identitas Sampel & Rantai Pengawasan */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs border-b border-slate-200 pb-5">
            <div className="space-y-2">
              <h3 className="font-semibold text-slate-900 text-sm mb-2">
                Identitas Pemohon &amp; Lokasi Sampling
              </h3>
              <div className="grid grid-cols-3 gap-2">
                <span className="text-slate-500">Perusahaan</span>
                <span className="col-span-2 font-semibold text-slate-900">{sample.companyName}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <span className="text-slate-500">PIC / Kontak</span>
                <span className="col-span-2 text-slate-900">{sample.companyPic}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <span className="text-slate-500">No. Work Order</span>
                <span className="col-span-2 font-mono text-slate-900">{sample.workOrderNo}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <span className="text-slate-500">Titik Sampling</span>
                <span className="col-span-2 text-slate-900">{sample.samplingLocation}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <span className="text-slate-500">Tim Teknis</span>
                <span className="col-span-2 text-slate-900">{sample.fieldTechnician}</span>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold text-slate-900 text-sm mb-2">
                Identitas Fisik Botol &amp; Segel
              </h3>
              <div className="grid grid-cols-3 gap-2">
                <span className="text-slate-500">Kode Sampel</span>
                <span className="col-span-2 font-mono font-semibold text-slate-900">{sample.sampleCode}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <span className="text-slate-500">Nomor Segel</span>
                <span className="col-span-2 font-mono font-semibold text-slate-900">
                  {sample.sealNumber} ({sample.sealCondition})
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <span className="text-slate-500">Matriks / Wadah</span>
                <span className="col-span-2 text-slate-900">
                  {sample.matrix} · {sample.bottleCount} botol
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <span className="text-slate-500">Waktu Sampling</span>
                <span className="col-span-2 font-mono tabular-nums text-slate-900">
                  {formatDateTimeID(sample.sampledAt)}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <span className="text-slate-500">Diterima Lab</span>
                <span className="col-span-2 font-mono tabular-nums text-slate-900">
                  {formatDateTimeID(sample.receivedAt)} · {sample.temperatureOnReceipt}°C
                </span>
              </div>
            </div>
          </div>

          {/* Tabel Hasil Pengujian */}
          <div className="space-y-2">
            <h3 className="font-semibold text-slate-900 text-sm">
              Hasil Pengujian Parameter Laboratorium
            </h3>
            <div className="border border-slate-300 rounded-md overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-300 text-slate-700">
                    <th className="py-2.5 px-3 font-semibold w-10">No</th>
                    <th className="py-2.5 px-3 font-semibold">Parameter Uji</th>
                    <th className="py-2.5 px-3 font-semibold">Metode Uji</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Baku Mutu</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Hasil Uji</th>
                    <th className="py-2.5 px-3 font-semibold">Satuan</th>
                    <th className="py-2.5 px-3 font-semibold">Evaluasi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {sample.parameters.map((param, index) => (
                    <tr key={param.id} className="bg-white">
                      <td className="py-2.5 px-3 font-mono tabular-nums text-slate-500">
                        {index + 1}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-900">
                        {param.name}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">
                        {param.method}
                      </td>
                      <td className="py-2.5 px-3 font-mono tabular-nums text-right text-slate-700">
                        {param.limitText}
                      </td>
                      <td className="py-2.5 px-3 font-mono tabular-nums text-right font-semibold text-slate-900">
                        {param.resultValue || '—'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">{param.unit}</td>
                      <td className="py-2.5 px-3">
                        <ComplianceIndicator compliance={param.compliance} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Kesimpulan & Catatan */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-md space-y-1.5 text-xs">
            <div className="font-semibold text-slate-900">
              Kesimpulan Verifikasi Laboratorium:
            </div>
            <p className="text-slate-700 leading-relaxed">{cert.conclusion}</p>
            {hasNonCompliant && (
              <p className="text-rose-700 font-medium pt-1">
                Perhatian: Terdapat parameter yang melebihi ambang batas baku mutu. Direkomendasikan evaluasi teknis pada titik sampling terkait.
              </p>
            )}
          </div>

          {/* Tanda Tangan & QR Verifikasi */}
          <div className="pt-4 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="border border-slate-300 p-1.5 bg-white">
                <QrMatrixSvg
                  value={`${cert.certificateNumber}|${sample.sampleCode}|${cert.verificationHash}`}
                  size={84}
                />
              </div>
              <div className="text-xs space-y-1">
                <div className="font-semibold text-slate-900">Verifikasi Keaslian Sertifikat</div>
                <div className="font-mono text-slate-600">ID Verifikasi: {cert.verificationHash}</div>
                <div className="text-slate-500">
                  Hasil uji hanya berlaku untuk botol sampel dengan kode dan nomor segel di atas.
                </div>
              </div>
            </div>

            <div className="text-xs text-left sm:text-right min-w-56">
              <div className="text-slate-600">
                Diterbitkan pada {formatDateID(cert.issuedAt)}
              </div>
              <div className="text-slate-900 font-medium mt-1">Manajer Teknis Laboratorium,</div>
              <div className="h-12 flex items-end sm:justify-end">
                <span className="font-mono text-[11px] text-emerald-700">
                  [Ditandatangani Secara Digital]
                </span>
              </div>
              <div className="font-semibold text-slate-900 border-t border-slate-300 pt-1">
                {cert.technicalManager}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
