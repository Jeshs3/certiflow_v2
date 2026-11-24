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

const PHILATLAS_ORIGIN = 'https://www.philatlas.com';
const CACHE_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours
const FETCH_TIMEOUT_MS = 12000;

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const provincesCache: { entry: CacheEntry<PhilatlasProvince[]> | null } = { entry: null };
const municipalitiesCache = new Map<string, CacheEntry<PhilatlasMunicipality[]>>();
const barangaysCache = new Map<string, CacheEntry<PhilatlasBarangay[]>>();

const EXCLUDED_LGU_SLUGS = new Set([
  'municipalities.html',
  'cities.html',
  'barangays.html',
  'provinces.html',
  'glossary.html',
  'index.html',
]);

export function decodeHtmlEntities(input: string): string {
  if (!input) return '';
  const withoutTags = input.replace(/<[^>]*>/g, ' ');
  return withoutTags
    .replace(/&#(\d+);/g, (_m, dec) => {
      const code = Number(dec);
      return Number.isFinite(code) ? String.fromCodePoint(code) : '';
    })
    .replace(/&#x([0-9a-f]+);/gi, (_m, hex) => {
      const code = parseInt(hex, 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : '';
    })
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&apos;|&#039;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&ndash;/gi, '-')
    .replace(/&mdash;/gi, '-')
    .replace(/&ntilde;/g, 'ñ')
    .replace(/&Ntilde;/g, 'Ñ')
    .replace(/\u00a0/g, ' ')
    .replace(/\u2011/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeLocationKey(value: string): string {
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

export function isValidPhilatlasPath(rawPath: string): boolean {
  const cleaned = rawPath.trim().replace(/^\/+/, '');
  return /^(?:provinces\.html|(?:luzon|visayas|mindanao)(?:\/[a-z0-9-]+)*\.html)$/i.test(cleaned);
}

function cleanPhilatlasPath(rawPath: string): string {
  return rawPath.trim().replace(/^\/+/, '');
}

async function fetchPhilatlasHtml(relPath: string): Promise<string> {
  const cleaned = cleanPhilatlasPath(relPath);
  if (!isValidPhilatlasPath(cleaned)) {
    throw new Error(`Invalid PhilAtlas path: ${relPath}`);
  }
  const url = `${PHILATLAS_ORIGIN}/${cleaned}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; CertiFlow-LocationLookup/1.0)',
      Accept: 'text/html,application/xhtml+xml',
    },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) {
    throw new Error(`PhilAtlas returned HTTP ${res.status} for ${cleaned}`);
  }
  return await res.text();
}

function extractTbodyRowsFromTable(html: string, tableId = 'lguTable'): string {
  const tableRegex = new RegExp(
    `<table[^>]*id=['"]${tableId}['"][^>]*>[\\s\\S]*?<tbody>([\\s\\S]*?)<\\/tbody>`,
    'i'
  );
  const match = html.match(tableRegex);
  return match?.[1] || '';
}

export function parseProvincesHtml(html: string): PhilatlasProvince[] {
  const tbody = extractTbodyRowsFromTable(html, 'lguTable');
  const results = new Map<string, PhilatlasProvince>();

  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch: RegExpExecArray | null;
  while ((rowMatch = rowRegex.exec(tbody)) !== null) {
    const rowHtml = rowMatch[1];
    const linkMatch = rowHtml.match(
      /<th[^>]*scope=['"]row['"][^>]*>\s*<a[^>]*href=['"]([^'"]+)['"][^>]*>([\s\S]*?)<\/a>/i
    );
    if (!linkMatch) continue;
    const relPath = cleanPhilatlasPath(linkMatch[1]);
    const name = decodeHtmlEntities(linkMatch[2]);
    if (!name || !isValidPhilatlasPath(relPath)) continue;
    results.set(relPath, { name, path: relPath });
  }

  // Metro Manila (NCR) is listed as a region rather than a province on provinces.html,
  // and its page luzon/ncr.html lists all 17 NCR cities/municipalities in the same #lguTable.
  if (!results.has('luzon/ncr.html')) {
    results.set('luzon/ncr.html', {
      name: 'Metro Manila',
      path: 'luzon/ncr.html',
      region: 'National Capital Region (NCR)',
    });
  }

  return Array.from(results.values()).sort((a, b) =>
    a.name.localeCompare(b.name, 'en', { sensitivity: 'base' })
  );
}

export function parseMunicipalitiesHtml(html: string): PhilatlasMunicipality[] {
  const results = new Map<string, PhilatlasMunicipality>();

  const sectionMatch = html.match(
    /<section[^>]*id=['"]sectionLguTable['"][^>]*>([\s\S]*?)<\/section>/i
  );
  const scopedSection = sectionMatch ? sectionMatch[1] : html;

  // 1. Capture Highly Urbanized / Independent Component Cities mentioned in sectionLguTable intro paragraphs
  if (sectionMatch) {
    const articleRegex = /<p[^>]*class=['"][^'"]*articleContent[^'"]*['"][^>]*>([\s\S]*?)<\/p>/gi;
    let pMatch: RegExpExecArray | null;
    while ((pMatch = articleRegex.exec(scopedSection)) !== null) {
      const pHtml = pMatch[1];
      const anchorRegex = /<a[^>]*href=['"]([^'"]+)['"][^>]*>([\s\S]*?)<\/a>/gi;
      let aMatch: RegExpExecArray | null;
      while ((aMatch = anchorRegex.exec(pHtml)) !== null) {
        const href = cleanPhilatlasPath(aMatch[1]);
        const slug = href.split('/').pop()?.toLowerCase() || '';
        if (EXCLUDED_LGU_SLUGS.has(slug)) continue;
        // LGU pages are 3 segments deep: island/region-or-province/lgu.html (e.g. visayas/r07/cebu-city.html)
        if (!/^(luzon|visayas|mindanao)\/[^/]+\/[a-z0-9-]+\.html$/i.test(href)) continue;
        const name = decodeHtmlEntities(aMatch[2]);
        if (!name) continue;
        if (!results.has(href)) {
          results.set(href, { name, path: href, isCity: true });
        }
      }
    }
  }

  // 2. Capture all municipalities and component cities inside #lguTable tbody
  const tbody = extractTbodyRowsFromTable(scopedSection, 'lguTable');
  const rowLinkRegex =
    /<th[^>]*scope=['"]row['"][^>]*>\s*<a[^>]*href=['"]([^'"]+)['"][^>]*>([\s\S]*?)<\/a>/gi;
  let linkMatch: RegExpExecArray | null;
  while ((linkMatch = rowLinkRegex.exec(tbody)) !== null) {
    const relPath = cleanPhilatlasPath(linkMatch[1]);
    const name = decodeHtmlEntities(linkMatch[2]);
    if (!name || !isValidPhilatlasPath(relPath)) continue;
    const isCity =
      /\bcity\b/i.test(name) ||
      relPath.split('/').length === 3; // NCR & HUCs sit at island/region/city.html
    results.set(relPath, { name, path: relPath, isCity });
  }

  return Array.from(results.values()).sort((a, b) =>
    a.name.localeCompare(b.name, 'en', { sensitivity: 'base' })
  );
}

export function parseBarangaysHtml(html: string): PhilatlasBarangay[] {
  const sectionMatch = html.match(
    /<section[^>]*id=['"]sectionBrgys['"][^>]*>([\s\S]*?)<\/section>/i
  );
  const scope = sectionMatch ? sectionMatch[1] : html;
  const tbody = extractTbodyRowsFromTable(scope, 'lguTable');
  const results = new Map<string, PhilatlasBarangay>();

  const rowHeaderRegex =
    /<th[^>]*scope=['"]row['"][^>]*>\s*(?:<a[^>]*href=['"]([^'"]+)['"][^>]*>)?([\s\S]*?)(?:<\/a>)?\s*<\/th>/gi;
  let match: RegExpExecArray | null;
  while ((match = rowHeaderRegex.exec(scope ? tbody : '')) !== null) {
    const rawHref = match[1] ? cleanPhilatlasPath(match[1]) : undefined;
    const name = decodeHtmlEntities(match[2]);
    if (!name) continue;
    const key = name.toLowerCase();
    if (!results.has(key)) {
      results.set(key, {
        name,
        ...(rawHref && isValidPhilatlasPath(rawHref) ? { path: rawHref } : {}),
      });
    }
  }

  return Array.from(results.values()).sort((a, b) =>
    a.name.localeCompare(b.name, 'en', { numeric: true, sensitivity: 'base' })
  );
}

export async function getProvinces(): Promise<PhilatlasProvince[]> {
  const now = Date.now();
  if (provincesCache.entry && provincesCache.entry.expiresAt > now) {
    return provincesCache.entry.data;
  }
  try {
    const html = await fetchPhilatlasHtml('provinces.html');
    const parsed = parseProvincesHtml(html);
    if (parsed.length > 0) {
      provincesCache.entry = { data: parsed, expiresAt: now + CACHE_TTL_MS };
      return parsed;
    }
    throw new Error('Parsed zero provinces from PhilAtlas.');
  } catch (err) {
    if (provincesCache.entry?.data?.length) {
      return provincesCache.entry.data;
    }
    throw err;
  }
}

export async function resolveProvincePath(
  provincePath?: string,
  provinceName?: string
): Promise<PhilatlasProvince | null> {
  if (provincePath && isValidPhilatlasPath(provincePath)) {
    const cleaned = cleanPhilatlasPath(provincePath);
    const provinces = await getProvinces();
    return (
      provinces.find((p) => p.path.toLowerCase() === cleaned.toLowerCase()) || {
        name: provinceName || cleaned,
        path: cleaned,
      }
    );
  }
  if (!provinceName) return null;
  const provinces = await getProvinces();
  const target = normalizeLocationKey(provinceName);
  if (!target) return null;
  return (
    provinces.find((p) => normalizeLocationKey(p.name) === target) ||
    provinces.find(
      (p) =>
        normalizeLocationKey(p.name).includes(target) ||
        target.includes(normalizeLocationKey(p.name))
    ) ||
    null
  );
}

export async function getMunicipalities(params: {
  provincePath?: string;
  province?: string;
}): Promise<{ province: PhilatlasProvince; municipalities: PhilatlasMunicipality[] }> {
  const resolved = await resolveProvincePath(params.provincePath, params.province);
  if (!resolved) {
    throw new Error('Province not found.');
  }
  const now = Date.now();
  const cached = municipalitiesCache.get(resolved.path);
  if (cached && cached.expiresAt > now) {
    return { province: resolved, municipalities: cached.data };
  }
  try {
    const html = await fetchPhilatlasHtml(resolved.path);
    const parsed = parseMunicipalitiesHtml(html);
    municipalitiesCache.set(resolved.path, {
      data: parsed,
      expiresAt: now + CACHE_TTL_MS,
    });
    return { province: resolved, municipalities: parsed };
  } catch (err) {
    if (cached?.data) {
      return { province: resolved, municipalities: cached.data };
    }
    throw err;
  }
}

export async function getBarangays(params: {
  municipalityPath?: string;
  provincePath?: string;
  province?: string;
  municipality?: string;
}): Promise<{ municipalityPath: string; barangays: PhilatlasBarangay[] }> {
  let targetPath =
    params.municipalityPath && isValidPhilatlasPath(params.municipalityPath)
      ? cleanPhilatlasPath(params.municipalityPath)
      : '';

  if (!targetPath && params.municipality && (params.provincePath || params.province)) {
    const { municipalities } = await getMunicipalities({
      provincePath: params.provincePath,
      province: params.province,
    });
    const targetKey = normalizeLocationKey(params.municipality);
    const matched =
      municipalities.find((m) => normalizeLocationKey(m.name) === targetKey) ||
      municipalities.find(
        (m) =>
          normalizeLocationKey(m.name).includes(targetKey) ||
          targetKey.includes(normalizeLocationKey(m.name))
      );
    if (matched) {
      targetPath = matched.path;
    }
  }

  if (!targetPath) {
    throw new Error('City / Municipality not found.');
  }

  const now = Date.now();
  const cached = barangaysCache.get(targetPath);
  if (cached && cached.expiresAt > now) {
    return { municipalityPath: targetPath, barangays: cached.data };
  }
  try {
    const html = await fetchPhilatlasHtml(targetPath);
    const parsed = parseBarangaysHtml(html);
    barangaysCache.set(targetPath, {
      data: parsed,
      expiresAt: now + CACHE_TTL_MS,
    });
    return { municipalityPath: targetPath, barangays: parsed };
  } catch (err) {
    if (cached?.data) {
      return { municipalityPath: targetPath, barangays: cached.data };
    }
    throw err;
  }
}
