import React, { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { CONTAINER_PRESETS, MATRIX_OPTIONS } from '../data/presets';
import { ParameterPreset, SampleMatrix } from '../types/sample';

interface ParameterCatalogViewProps {
  catalog: ParameterPreset[];
  onAddParameter: (param: ParameterPreset) => void;
}

export const ParameterCatalogView: React.FC<ParameterCatalogViewProps> = ({
  catalog,
  onAddParameter,
}) => {
  const [selectedMatrix, setSelectedMatrix] = useState<'Semua' | SampleMatrix>('Semua');
  const [showAddForm, setShowAddForm] = useState(false);

  const [name, setName] = useState('');
  const [matrix, setMatrix] = useState<SampleMatrix>('Air Limbah');
  const [method, setMethod] = useState('');
  const [unit, setUnit] = useState('mg/L');
  const [limitText, setLimitText] = useState('');
  const [limitMax, setLimitMax] = useState('');
  const [recommendedContainer, setRecommendedContainer] = useState(
    CONTAINER_PRESETS['Air Limbah'][0]
  );

  const filtered = useMemo(() => {
    if (selectedMatrix === 'Semua') return catalog;
    return catalog.filter((item) => item.matrix === selectedMatrix);
  }, [catalog, selectedMatrix]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !method.trim()) return;
    const parsedMax = limitMax.trim() ? parseFloat(limitMax.replace(',', '.')) : undefined;
    onAddParameter({
      id: `cat-${Date.now()}`,
      name: name.trim(),
      matrix,
      method: method.trim(),
      unit: unit.trim() || 'mg/L',
      limitText: limitText.trim() || (parsedMax !== undefined ? `≤ ${parsedMax}` : 'Sesuai Regulasi'),
      limitMax: parsedMax !== undefined && !Number.isNaN(parsedMax) ? parsedMax : undefined,
      recommendedContainer,
    });
    setName('');
    setMethod('');
    setLimitText('');
    setLimitMax('');
    setShowAddForm(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-md overflow-x-auto">
          <button
            type="button"
            onClick={() => setSelectedMatrix('Semua')}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
              selectedMatrix === 'Semua'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Semua Matriks
          </button>
          {MATRIX_OPTIONS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setSelectedMatrix(m)}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                selectedMatrix === m
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setShowAddForm((prev) => !prev)}
          className="h-9 px-3.5 inline-flex items-center gap-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors whitespace-nowrap shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Tambah Parameter Baku</span>
        </button>
      </div>

      {showAddForm && (
        <form
          onSubmit={handleSubmit}
          className="p-5 bg-white border border-slate-200 rounded-lg space-y-4"
        >
          <h3 className="text-sm font-semibold text-slate-900">
            Tambah Standar Parameter Uji Baru
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Nama Parameter *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Kromium Heksavalen (Cr⁶⁺)"
                className="w-full h-9 px-3 text-xs border border-slate-300 rounded-md focus:outline-none focus:border-sky-700"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Matriks Sampel
              </label>
              <select
                value={matrix}
                onChange={(e) => {
                  const m = e.target.value as SampleMatrix;
                  setMatrix(m);
                  setRecommendedContainer(CONTAINER_PRESETS[m][0]);
                }}
                className="w-full h-9 px-3 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:border-sky-700"
              >
                {MATRIX_OPTIONS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Metode Uji (SNI / APHA / ASTM) *
              </label>
              <input
                type="text"
                required
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                placeholder="Contoh: SNI 6989.71:2009"
                className="w-full h-9 px-3 text-xs border border-slate-300 rounded-md focus:outline-none focus:border-sky-700"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Satuan Pengukuran
              </label>
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full h-9 px-3 text-xs border border-slate-300 rounded-md focus:outline-none focus:border-sky-700"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Teks Baku Mutu
              </label>
              <input
                type="text"
                value={limitText}
                onChange={(e) => setLimitText(e.target.value)}
                placeholder="Contoh: ≤ 0.1"
                className="w-full h-9 px-3 font-mono text-xs border border-slate-300 rounded-md focus:outline-none focus:border-sky-700"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Batas Numerik Maks (Opsional)
              </label>
              <input
                type="text"
                value={limitMax}
                onChange={(e) => setLimitMax(e.target.value)}
                placeholder="Contoh: 0.1"
                className="w-full h-9 px-3 font-mono text-xs border border-slate-300 rounded-md focus:outline-none focus:border-sky-700"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="h-9 px-4 text-xs font-medium text-slate-700 border border-slate-300 rounded-md hover:bg-slate-50"
            >
              Batal
            </button>
            <button
              type="submit"
              className="h-9 px-4 text-xs font-medium text-white bg-sky-800 hover:bg-sky-900 rounded-md"
            >
              Simpan ke Katalog
            </button>
          </div>
        </form>
      )}

      <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-600">
              <th className="py-3 px-4 font-semibold">Parameter Uji</th>
              <th className="py-3 px-4 font-semibold">Matriks</th>
              <th className="py-3 px-4 font-semibold">Metode Standar</th>
              <th className="py-3 px-4 font-semibold text-right">Baku Mutu</th>
              <th className="py-3 px-4 font-semibold">Satuan</th>
              <th className="py-3 px-4 font-semibold">Rekomendasi Botol / Wadah</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-xs">
            {filtered.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50/70">
                <td className="py-3 px-4 font-medium text-slate-900">{item.name}</td>
                <td className="py-3 px-4 text-slate-700">{item.matrix}</td>
                <td className="py-3 px-4 font-mono text-slate-600">{item.method}</td>
                <td className="py-3 px-4 font-mono tabular-nums text-right font-semibold text-slate-900">
                  {item.limitText}
                </td>
                <td className="py-3 px-4 text-slate-600">{item.unit}</td>
                <td className="py-3 px-4 text-slate-600">{item.recommendedContainer}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
