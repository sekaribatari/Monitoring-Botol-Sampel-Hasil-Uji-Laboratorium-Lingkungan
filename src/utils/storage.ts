import { INITIAL_PARAMETER_CATALOG, INITIAL_SAMPLES } from '../data/presets';
import { ComplianceResult, ParameterPreset, SampleBottle, TestParameter } from '../types/sample';

const SAMPLES_KEY = 'labtrace_samples_v1';
const CATALOG_KEY = 'labtrace_parameter_catalog_v1';

export function loadSamples(): SampleBottle[] {
  try {
    const raw = localStorage.getItem(SAMPLES_KEY);
    if (!raw) {
      localStorage.setItem(SAMPLES_KEY, JSON.stringify(INITIAL_SAMPLES));
      return INITIAL_SAMPLES;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : INITIAL_SAMPLES;
  } catch {
    return INITIAL_SAMPLES;
  }
}

export function saveSamples(samples: SampleBottle[]): void {
  try {
    localStorage.setItem(SAMPLES_KEY, JSON.stringify(samples));
  } catch {
    // Ignore storage quota errors gracefully
  }
}

export function loadParameterCatalog(): ParameterPreset[] {
  try {
    const raw = localStorage.getItem(CATALOG_KEY);
    if (!raw) {
      localStorage.setItem(CATALOG_KEY, JSON.stringify(INITIAL_PARAMETER_CATALOG));
      return INITIAL_PARAMETER_CATALOG;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : INITIAL_PARAMETER_CATALOG;
  } catch {
    return INITIAL_PARAMETER_CATALOG;
  }
}

export function saveParameterCatalog(catalog: ParameterPreset[]): void {
  try {
    localStorage.setItem(CATALOG_KEY, JSON.stringify(catalog));
  } catch {
    // Ignore storage quota errors gracefully
  }
}

export function resetAllData(): { samples: SampleBottle[]; catalog: ParameterPreset[] } {
  saveSamples(INITIAL_SAMPLES);
  saveParameterCatalog(INITIAL_PARAMETER_CATALOG);
  return { samples: INITIAL_SAMPLES, catalog: INITIAL_PARAMETER_CATALOG };
}

export function generateNextSampleCode(existing: SampleBottle[]): string {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const prefix = `SMP-${yy}${mm}-`;
  let maxSeq = 0;
  for (const s of existing) {
    if (s.sampleCode.startsWith(prefix)) {
      const seq = parseInt(s.sampleCode.slice(prefix.length), 10);
      if (!Number.isNaN(seq) && seq > maxSeq) maxSeq = seq;
    }
  }
  return `${prefix}${String(maxSeq + 1).padStart(3, '0')}`;
}

export function generateNextSealNumber(existing: SampleBottle[]): string {
  let maxNum = 90440;
  for (const s of existing) {
    const match = s.sealNumber.match(/SGL-(\d+)/);
    if (match) {
      const n = parseInt(match[1], 10);
      if (!Number.isNaN(n) && n > maxNum) maxNum = n;
    }
  }
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const suffix = letters[(existing.length + 1) % letters.length];
  return `SGL-${maxNum + 5}-${suffix}`;
}

export function generateCertificateNumber(existing: SampleBottle[]): string {
  const year = new Date().getFullYear();
  let count = 11042;
  for (const s of existing) {
    if (s.certificate?.certificateNumber) {
      const parts = s.certificate.certificateNumber.split('/');
      const seq = parseInt(parts[parts.length - 1], 10);
      if (!Number.isNaN(seq) && seq >= count) count = seq + 1;
    }
  }
  return `SHU/LAB/${year}/${count + 1}`;
}

export function evaluateCompliance(
  param: Pick<TestParameter, 'limitMin' | 'limitMax'>,
  rawValue: string
): ComplianceResult {
  const trimmed = rawValue.trim().replace(',', '.');
  if (!trimmed) return 'Belum Dievaluasi';

  // Handle "<" detection limit values like "<0.01" as compliant when max limit exists
  if (trimmed.startsWith('<')) {
    const num = parseFloat(trimmed.slice(1));
    if (!Number.isNaN(num)) {
      if (param.limitMax !== undefined && num <= param.limitMax) return 'Memenuhi';
      if (param.limitMin !== undefined && num < param.limitMin) return 'Melebihi Baku Mutu';
      return 'Memenuhi';
    }
  }

  const numeric = parseFloat(trimmed);
  if (Number.isNaN(numeric)) return 'Belum Dievaluasi';

  if (param.limitMin !== undefined && numeric < param.limitMin) {
    return 'Melebihi Baku Mutu';
  }
  if (param.limitMax !== undefined && numeric > param.limitMax) {
    return 'Melebihi Baku Mutu';
  }
  return 'Memenuhi';
}

export function formatDateTimeID(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export function formatDateID(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(d);
}
