export interface PhilatlasProvince {
  name: string;
  path: string;
  region?: string;
}

export interface PhilatlasMunicipality {
  name: string;
  path: string;
  isCity?: boolean;
}

export interface PhilatlasBarangay {
  name: string;
  path?: string;
}

let cachedProvinces: PhilatlasProvince[] | null = null;
let provincesPromise: Promise<PhilatlasProvince[]> | null = null;

export function getCachedPhilatlasProvinces(): PhilatlasProvince[] | null {
  return cachedProvinces;
}

const municipalitiesCache = new Map<string, PhilatlasMunicipality[]>();
const municipalitiesPromises = new Map<string, Promise<PhilatlasMunicipality[]>>();

const barangaysCache = new Map<string, PhilatlasBarangay[]>();
const barangaysPromises = new Map<string, Promise<PhilatlasBarangay[]>>();

export function normalizePhilatlasKey(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\bcity of\b/g, '')
    .replace(/\bprovince of\b/g, '')
    .replace(/\bmunicipality of\b/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export async function fetchPhilatlasProvinces(): Promise<PhilatlasProvince[]> {
  if (cachedProvinces) return cachedProvinces;
  if (provincesPromise) return provincesPromise;

  provincesPromise = (async () => {
    try {
      const res = await fetch('/api/locations/provinces');
      const json = (await res.json()) as {
        ok?: boolean;
        provinces?: PhilatlasProvince[];
        error?: string;
      };
      if (!res.ok || !json.ok || !Array.isArray(json.provinces)) {
        throw new Error(json.error || 'Could not load provinces.');
      }
      cachedProvinces = json.provinces;
      return json.provinces;
    } finally {
      provincesPromise = null;
    }
  })();

  return provincesPromise;
}

export async function fetchPhilatlasMunicipalities(params: {
  provincePath?: string;
  province?: string;
}): Promise<PhilatlasMunicipality[]> {
  const key = (params.provincePath || normalizePhilatlasKey(params.province || '')).trim();
  if (!key) return [];

  const cached = municipalitiesCache.get(key);
  if (cached) return cached;

  const pending = municipalitiesPromises.get(key);
  if (pending) return pending;

  const qs = new URLSearchParams();
  if (params.provincePath) qs.set('provincePath', params.provincePath);
  if (params.province) qs.set('province', params.province);

  const reqPromise = (async () => {
    try {
      const res = await fetch(`/api/locations/municipalities?${qs.toString()}`);
      const json = (await res.json()) as {
        ok?: boolean;
        municipalities?: PhilatlasMunicipality[];
        province?: PhilatlasProvince;
        error?: string;
      };
      if (!res.ok || !json.ok || !Array.isArray(json.municipalities)) {
        throw new Error(json.error || 'Could not load cities/municipalities.');
      }
      municipalitiesCache.set(key, json.municipalities);
      if (json.province?.path) {
        municipalitiesCache.set(json.province.path, json.municipalities);
      }
      return json.municipalities;
    } finally {
      municipalitiesPromises.delete(key);
    }
  })();

  municipalitiesPromises.set(key, reqPromise);
  return reqPromise;
}

export async function fetchPhilatlasBarangays(params: {
  municipalityPath?: string;
  provincePath?: string;
  province?: string;
  municipality?: string;
}): Promise<PhilatlasBarangay[]> {
  const key = (
    params.municipalityPath ||
    `${normalizePhilatlasKey(params.province || '')}::${normalizePhilatlasKey(params.municipality || '')}`
  ).trim();
  if (!key || key === '::') return [];

  const cached = barangaysCache.get(key);
  if (cached) return cached;

  const pending = barangaysPromises.get(key);
  if (pending) return pending;

  const qs = new URLSearchParams();
  if (params.municipalityPath) qs.set('municipalityPath', params.municipalityPath);
  if (params.provincePath) qs.set('provincePath', params.provincePath);
  if (params.province) qs.set('province', params.province);
  if (params.municipality) qs.set('municipality', params.municipality);

  const reqPromise = (async () => {
    try {
      const res = await fetch(`/api/locations/barangays?${qs.toString()}`);
      const json = (await res.json()) as {
        ok?: boolean;
        barangays?: PhilatlasBarangay[];
        municipalityPath?: string;
        error?: string;
      };
      if (!res.ok || !json.ok || !Array.isArray(json.barangays)) {
        throw new Error(json.error || 'Could not load barangays.');
      }
      barangaysCache.set(key, json.barangays);
      if (json.municipalityPath) {
        barangaysCache.set(json.municipalityPath, json.barangays);
      }
      return json.barangays;
    } finally {
      barangaysPromises.delete(key);
    }
  })();

  barangaysPromises.set(key, reqPromise);
  return reqPromise;
}
