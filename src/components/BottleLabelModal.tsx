import React from 'react';
import { Printer, X } from 'lucide-react';
import { SampleBottle } from '../types/sample';
import { formatDateTimeID } from '../utils/storage';
import { BarcodeSvg, QrMatrixSvg } from './BarcodeSvg';

interface BottleLabelModalProps {
  sample: SampleBottle;
  onClose: () => void;
}

export const BottleLabelModal: React.FC<BottleLabelModalProps> = ({ sample, onClose }) => {
  const indices = Array.from({ length: sample.bottleCount }, (_, i) => i + 1);

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="label-modal-title"
    >
      <div className="bg-white border border-slate-200 rounded-lg w-full max-w-3xl max-h-[92vh] flex flex-col">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4 no-print">
          <div>
            <h2 id="label-modal-title" className="font-display text-lg font-semibold text-slate-900">
              Label Identifikasi Botol Sampel
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Tempelkan label ini pada setiap botol fisik untuk mencegah tertukarnya sampel selama preparasi dan pengujian.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="h-9 px-4 inline-flex items-center gap-2 text-sm font-medium text-white bg-sky-800 hover:bg-sky-900 rounded-md transition-colors whitespace-nowrap"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Label ({sample.bottleCount})</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup pratinjau label"
              className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto space-y-4 print-area">
          {indices.map((idx) => (
            <div
              key={idx}
              className="border-2 border-slate-900 rounded-md p-4 bg-white break-inside-avoid"
            >
              <div className="flex items-start justify-between gap-4 border-b border-slate-300 pb-3">
                <div className="min-w-0">
                  <div className="text-[11px] font-medium text-slate-500">
                    LabTrace · Label Identifikasi Botol Resmi
                  </div>
                  <div className="font-mono text-2xl font-bold text-slate-900 tracking-tight mt-0.5">
                    {sample.sampleCode}
                  </div>
                  <div className="text-xs font-mono text-slate-700 mt-0.5">
                    Segel: <strong>{sample.sealNumber}</strong> · Botol {idx} dari {sample.bottleCount} · {sample.rackLocation}
                  </div>
                </div>
                <div className="shrink-0 border border-slate-200 p-1 bg-white">
                  <QrMatrixSvg
                    value={`${sample.sampleCode}|${sample.sealNumber}|B${idx}`}
                    size={72}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-x-6 gap-y-2 py-3 text-xs border-b border-slate-200">
                <div>
                  <span className="text-slate-500 block">Perusahaan / Klien</span>
                  <span className="font-semibold text-slate-900">{sample.companyName}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Matriks &amp; Work Order</span>
                  <span className="font-semibold text-slate-900">
                    {sample.matrix} · <span className="font-mono">{sample.workOrderNo}</span>
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Titik Pengambilan Sampel</span>
                  <span className="text-slate-900">{sample.samplingLocation}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Diterima Lab</span>
                  <span className="font-mono tabular-nums text-slate-900">
                    {formatDateTimeID(sample.receivedAt)} ({sample.temperatureOnReceipt}°C)
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-500 block">Wadah &amp; Pengawet</span>
                  <span className="text-slate-900">{sample.containerType}</span>
                </div>
              </div>

              <div className="pt-3 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-semibold text-slate-600 mb-1">
                    Parameter Uji Wajib ({sample.parameters.length}):
                  </div>
                  <div className="text-xs text-slate-900 leading-relaxed">
                    {sample.parameters.map((p) => p.name).join(' · ')}
                  </div>
                </div>
                <div className="w-48 shrink-0">
                  <BarcodeSvg value={`${sample.sampleCode}-${idx}`} height={36} className="w-full h-9" />
                  <div className="text-[10px] font-mono text-center text-slate-500 mt-0.5">
                    {sample.sampleCode}-B{idx}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
