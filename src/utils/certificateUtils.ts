import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import {
  CertificateType,
  DateFormatOption,
  PageOrientation,
  PaperSize,
  SavedDraft,
} from '../types/certificate';
import { getAuthHeaders } from '../services/authService';

const STORAGE_KEY = 'cert_generator_saved_drafts_v1';
const SESSION_COUNTER_KEY = 'cert_generator_session_count';

/**
 * Format individual name components into a single clean string.
 */
export function formatName(first: string, middle: string, last: string): string {
  const parts = [first, middle, last]
    .map((p) => p?.trim())
    .filter(Boolean);
  return parts.join(' ');
}

/**
 * Capitalize first letters of names cleanly.
 */
export function toTitleCase(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Calculate age from birth date.
 */
export function calculateAge(birthDateStr: string, referenceDateStr?: string): string | null {
  if (!birthDateStr) return null;
  const birthDate = new Date(birthDateStr);
  if (isNaN(birthDate.getTime())) return null;

  const refDate = referenceDateStr ? new Date(referenceDateStr) : new Date();
  if (isNaN(refDate.getTime()) || refDate < birthDate) return null;

  let years = refDate.getFullYear() - birthDate.getFullYear();
  let months = refDate.getMonth() - birthDate.getMonth();
  const days = refDate.getDate() - birthDate.getDate();

  if (days < 0) {
    months -= 1;
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  if (years < 0) return null;

  if (years === 0) {
    if (months === 0) {
      return 'Newborn';
    }
    return `${months} month${months > 1 ? 's' : ''} old`;
  }

  return `${years} year${years > 1 ? 's' : ''} old`;
}

/**
 * Format ISO dates (YYYY-MM-DD) into user-specified date format.
 */
export function formatDisplayDate(dateStr?: string, format: DateFormatOption = 'Month DD, YYYY'): string {
  if (!dateStr) return '—';
  
  // Handle ISO string or simple YYYY-MM-DD
  const parts = dateStr.split('-');
  if (parts.length !== 3) {
    return dateStr;
  }

  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);

  const d = new Date(year, month, day);
  if (isNaN(d.getTime())) return dateStr;

  const mm = String(month + 1).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  const yyyy = String(year);

  const monthsLong = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  switch (format) {
    case 'MM/DD/YYYY':
      return `${mm}/${dd}/${yyyy}`;
    case 'DD/MM/YYYY':
      return `${dd}/${mm}/${yyyy}`;
    case 'Month DD, YYYY':
    default:
      return `${monthsLong[month]} ${day}, ${yyyy}`;
  }
}

const MONTHS_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function parseMonthIndex(monthInput?: string): number {
  if (!monthInput) return -1;
  const cleaned = monthInput.trim().toLowerCase();
  if (!cleaned) return -1;
  const numeric = parseInt(cleaned, 10);
  if (!isNaN(numeric) && String(numeric) === cleaned && numeric >= 1 && numeric <= 12) {
    return numeric - 1;
  }
  return MONTHS_LONG.findIndex(
    (m) => m.toLowerCase() === cleaned || m.slice(0, 3).toLowerCase() === cleaned.slice(0, 3)
  );
}

/**
 * Expand abbreviated or numeric month input to complete full month name (MMMM).
 */
export function toFullMonthName(monthInput?: string): string {
  if (!monthInput) return '';
  const cleaned = monthInput.trim();
  if (!cleaned) return '';
  const mIdx = parseMonthIndex(cleaned);
  return (mIdx >= 0 ? MONTHS_LONG[mIdx] : cleaned).toUpperCase();
}

/**
 * Replace any "Not Applicable" phrase with concise "N/A".
 */
export function normalizeNotApplicable(value?: string): string {
  if (!value) return '';
  return value.replace(/\bnot\s+applicable\b/gi, 'N/A');
}

/**
 * Normalize any date string (ISO YYYY-MM-DD, MM/DD/YYYY, Month D, YYYY, or MMMM-DD-YYYY) to YYYY-MM-DD for <input type="date" />.
 */
export function toIsoDateInput(dateStr?: string): string {
  if (!dateStr) return '';
  const trimmed = dateStr.trim();
  if (!trimmed) return '';

  const isoMatch = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(trimmed);
  if (isoMatch) {
    const yyyy = isoMatch[1];
    const mm = isoMatch[2].padStart(2, '0');
    const dd = isoMatch[3].padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  const slashMatch = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmed);
  if (slashMatch) {
    const mm = slashMatch[1].padStart(2, '0');
    const dd = slashMatch[2].padStart(2, '0');
    const yyyy = slashMatch[3];
    return `${yyyy}-${mm}-${dd}`;
  }

  const hyphenTextMatch = /^([A-Za-z]+)-(\d{1,2})(?:st|nd|rd|th)?-(\d{4})$/i.exec(trimmed);
  if (hyphenTextMatch) {
    const mIdx = parseMonthIndex(hyphenTextMatch[1]);
    if (mIdx >= 0) {
      const mm = String(mIdx + 1).padStart(2, '0');
      const dd = hyphenTextMatch[2].padStart(2, '0');
      const yyyy = hyphenTextMatch[3];
      return `${yyyy}-${mm}-${dd}`;
    }
  }

  const commaAfterMonthMatch = /^([A-Za-z]+),\s*(\d{1,2})(?:st|nd|rd|th)?\s+(\d{4})$/i.exec(trimmed);
  if (commaAfterMonthMatch) {
    const mIdx = parseMonthIndex(commaAfterMonthMatch[1]);
    if (mIdx >= 0) {
      const mm = String(mIdx + 1).padStart(2, '0');
      const dd = commaAfterMonthMatch[2].padStart(2, '0');
      const yyyy = commaAfterMonthMatch[3];
      return `${yyyy}-${mm}-${dd}`;
    }
  }

  const textMatch = /^([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})$/i.exec(trimmed);
  if (textMatch) {
    const mIdx = parseMonthIndex(textMatch[1]);
    if (mIdx >= 0) {
      const mm = String(mIdx + 1).padStart(2, '0');
      const dd = textMatch[2].padStart(2, '0');
      const yyyy = textMatch[3];
      return `${yyyy}-${mm}-${dd}`;
    }
  }

  return '';
}

/**
 * Convert discrete Month, Day (including ordinals like "10th"), and Year into ISO YYYY-MM-DD.
 */
export function fromMonthDayYearToIso(month?: string, day?: string, year?: string): string {
  const mIdx = parseMonthIndex(month);
  const cleanDay = (day || '').replace(/(st|nd|rd|th)$/i, '').trim();
  const dNum = parseInt(cleanDay, 10);
  const yClean = (year || '').trim();
  if (mIdx < 0 || isNaN(dNum) || dNum < 1 || dNum > 31 || !/^\d{4}$/.test(yClean)) {
    return '';
  }
  return `${yClean}-${String(mIdx + 1).padStart(2, '0')}-${String(dNum).padStart(2, '0')}`;
}

/**
 * Format a date string strictly as "MMMM, DD YYYY" in uppercase (e.g., "SEPTEMBER, 10 2023").
 */
export function formatDateMMMMCommaDDYYYY(dateStr?: string): string {
  if (!dateStr) return '';
  const trimmed = dateStr.trim();
  if (!trimmed) return '';

  const iso = toIsoDateInput(trimmed);
  if (!iso) return normalizeNotApplicable(trimmed).toUpperCase();

  const [yyyy, mmStr, ddStr] = iso.split('-');
  const mIdx = parseInt(mmStr, 10) - 1;
  const dNum = parseInt(ddStr, 10);
  const monthName = MONTHS_LONG[mIdx];
  if (!monthName || isNaN(dNum)) return normalizeNotApplicable(trimmed).toUpperCase();

  return `${monthName.toUpperCase()}, ${String(dNum).padStart(2, '0')} ${yyyy}`;
}

/**
 * Format a date string strictly as "MMMM DD, YYYY" in uppercase (e.g., "SEPTEMBER 10, 2023").
 */
export function formatDateMMMMDDYYYY(dateStr?: string): string {
  if (!dateStr) return '';
  const trimmed = dateStr.trim();
  if (!trimmed) return '';

  const iso = toIsoDateInput(trimmed);
  if (!iso) return normalizeNotApplicable(trimmed).toUpperCase();

  const [yyyy, mmStr, ddStr] = iso.split('-');
  const mIdx = parseInt(mmStr, 10) - 1;
  const dNum = parseInt(ddStr, 10);
  const monthName = MONTHS_LONG[mIdx];
  if (!monthName || isNaN(dNum)) return normalizeNotApplicable(trimmed).toUpperCase();

  return `${monthName.toUpperCase()} ${String(dNum).padStart(2, '0')}, ${yyyy}`;
}

/**
 * Format a date string strictly as "MMMM dd, YYYY" (legacy alias).
 */
export function formatDateMMMMddYYYY(dateStr?: string): string {
  return formatDateMMMMCommaDDYYYY(dateStr);
}

/**
 * Format a date string strictly as "MMMM-DD-YYYY" (legacy alias).
 */
export function formatDateMMMMHyphenDDYYYY(dateStr?: string): string {
  return formatDateMMMMCommaDDYYYY(dateStr);
}

/**
 * Format day integer to ordinal string (e.g., 1 -> "1ST", 2 -> "2ND", 10 -> "10TH").
 */
export function toOrdinalDay(dayNum: number): string {
  if (isNaN(dayNum) || dayNum < 1) return '';
  const mod100 = dayNum % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${dayNum}TH`;
  switch (dayNum % 10) {
    case 1:
      return `${dayNum}ST`;
    case 2:
      return `${dayNum}ND`;
    case 3:
      return `${dayNum}RD`;
    default:
      return `${dayNum}TH`;
  }
}

/**
 * Parse an ISO YYYY-MM-DD date string into COLB template date components.
 */
export function parseIsoDateToColbParts(isoDate?: string): {
  monthName: string;
  day: string;
  dayPadded: string;
  dayOrdinal: string;
  year: string;
} | null {
  const iso = toIsoDateInput(isoDate);
  if (!iso) return null;
  const [yyyy, mmStr, ddStr] = iso.split('-');
  const mIdx = parseInt(mmStr, 10) - 1;
  const dNum = parseInt(ddStr, 10);
  const monthName = MONTHS_LONG[mIdx];
  if (!monthName || isNaN(dNum)) return null;
  return {
    monthName: monthName.toUpperCase(),
    day: String(dNum),
    dayPadded: String(dNum).padStart(2, '0'),
    dayOrdinal: toOrdinalDay(dNum),
    year: yyyy,
  };
}

/**
 * LocalStorage draft management
 */
export function getSavedDrafts(): SavedDraft[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to load drafts from localStorage:', err);
    return [];
  }
}

export function saveDraft(draft: SavedDraft): SavedDraft[] {
  try {
    const drafts = getSavedDrafts();
    const existingIndex = drafts.findIndex((d) => d.id === draft.id);
    if (existingIndex >= 0) {
      drafts[existingIndex] = {
        ...draft,
        createdAt: drafts[existingIndex].createdAt || draft.createdAt || Date.now(),
        updatedAt: Date.now(),
      };
    } else {
      drafts.unshift({
        ...draft,
        createdAt: draft.createdAt || Date.now(),
        updatedAt: Date.now(),
      });
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
    return drafts;
  } catch (err) {
    console.error('Failed to save draft to localStorage:', err);
    return getSavedDrafts();
  }
}

export function deleteDraft(id: string): SavedDraft[] {
  try {
    const drafts = getSavedDrafts().filter((d) => d.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
    return drafts;
  } catch (err) {
    console.error('Failed to delete draft:', err);
    return getSavedDrafts();
  }
}

export function duplicateDraft(id: string): SavedDraft | null {
  try {
    const drafts = getSavedDrafts();
    const target = drafts.find((d) => d.id === id);
    if (!target) return null;

    const copy: SavedDraft = {
      ...target,
      id: 'draft_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      title: `${target.title} (Copy)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    drafts.unshift(copy);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
    return copy;
  } catch (err) {
    console.error('Failed to duplicate draft:', err);
    return null;
  }
}

export function clearAllDrafts(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.error('Failed to clear drafts:', err);
  }
}

/**
 * Session generation counter
 */
export function getSessionCount(): number {
  try {
    const count = sessionStorage.getItem(SESSION_COUNTER_KEY);
    return count ? parseInt(count, 10) : 0;
  } catch {
    return 0;
  }
}

export function incrementSessionCount(): number {
  try {
    const count = getSessionCount() + 1;
    sessionStorage.setItem(SESSION_COUNTER_KEY, String(count));
    return count;
  } catch {
    return 1;
  }
}

export interface PrintCertificateOptions {
  elementId?: string;
  paperSize?: PaperSize;
  orientation?: PageOrientation;
  certificateType?: CertificateType;
  documentTitle?: string;
}

export interface PrintCertificateResult {
  ok: boolean;
  totalExports?: number;
  error?: string;
}

/**
 * Trigger native print dialog directly like Ctrl+P while logging export to backend
 */
export function printCertificate(
  options: PrintCertificateOptions = {}
): PrintCertificateResult {
  const {
    elementId = 'certificate-print-root',
    certificateType = 'birth',
    documentTitle = 'Civil Registry Certificate',
  } = options;

  incrementSessionCount();

  const rootElement =
    document.getElementById(elementId) ||
    document.getElementById('certificate-print-root') ||
    document.getElementById('printable-certificate');

  const sheetNodes = rootElement
    ? Array.from(rootElement.querySelectorAll<HTMLElement>('[data-cert-sheet]'))
    : [];
  const pages = sheetNodes.length > 0 ? sheetNodes.length : 1;

  try {
    void fetch('/api/print/log', {
      method: 'POST',
      credentials: 'include',
      keepalive: true,
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify({
        certificateType,
        documentTitle,
        action: 'print',
        pages,
      }),
    });
  } catch {
    // Non-blocking export log
  }

  try {
    window.print();
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Unable to open print dialog.',
    };
  }
}

/**
 * Resolve any browser-supported CSS color (including oklch/oklab/color-mix) to rgba(...)
 */
function createCssColorNormalizer(): (colorValue: string) => string {
  const cache = new Map<string, string>();
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  return (colorValue: string): string => {
    const trimmed = colorValue.trim();
    if (!trimmed) return trimmed;
    const cached = cache.get(trimmed);
    if (cached !== undefined) return cached;

    if (!ctx) {
      cache.set(trimmed, 'rgb(0, 0, 0)');
      return 'rgb(0, 0, 0)';
    }

    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = 'rgba(1, 2, 3, 0)';
    ctx.fillStyle = trimmed;
    // If canvas rejected the CSS expression (e.g., unresolved var()), fallback safely
    const parsedCheck = ctx.fillStyle;
    if (parsedCheck === 'rgba(1, 2, 3, 0)' && !/transparent/i.test(trimmed)) {
      cache.set(trimmed, trimmed);
      return trimmed;
    }

    ctx.fillRect(0, 0, 1, 1);
    const data = ctx.getImageData(0, 0, 1, 1).data;
    const alpha = Math.round((data[3] / 255) * 1000) / 1000;
    const resolved =
      alpha >= 1
        ? `rgb(${data[0]}, ${data[1]}, ${data[2]})`
        : `rgba(${data[0]}, ${data[1]}, ${data[2]}, ${alpha})`;
    cache.set(trimmed, resolved);
    return resolved;
  };
}

function buildRootCssVarMap(normalizeColor: (val: string) => string): Map<string, string> {
  const varMap = new Map<string, string>();
  const rootStyle = window.getComputedStyle(document.documentElement);
  for (let i = 0; i < rootStyle.length; i++) {
    const prop = rootStyle[i];
    if (prop.startsWith('--')) {
      const val = rootStyle.getPropertyValue(prop).trim();
      if (val) {
        varMap.set(prop, /\b(oklch|oklab|lch|lab)\s*\(/i.test(val) ? normalizeColor(val) : val);
      }
    }
  }
  return varMap;
}

function resolveSimpleVars(expr: string, varMap: Map<string, string>): string {
  return expr.replace(/var\(\s*(--[a-zA-Z0-9_-]+)\s*(?:,\s*([^)]+))?\)/g, (_m, varName, fallback) => {
    return varMap.get(varName) || fallback || 'transparent';
  });
}

function replaceUnsupportedColorFunctions(
  cssText: string,
  normalizeColor: (val: string) => string,
  varMap?: Map<string, string>
): string {
  const fnNames = ['oklch', 'oklab', 'color-mix', 'lab', 'lch', 'color'];
  let result = '';
  let idx = 0;

  while (idx < cssText.length) {
    let earliestStart = -1;
    for (const fn of fnNames) {
      const needle = `${fn}(`;
      const pos = cssText.indexOf(needle, idx);
      if (pos !== -1 && (earliestStart === -1 || pos < earliestStart)) {
        const prevChar = pos > 0 ? cssText[pos - 1] : ' ';
        if (!/[a-zA-Z0-9_-]/.test(prevChar)) {
          earliestStart = pos;
        }
      }
    }

    if (earliestStart === -1) {
      result += cssText.slice(idx);
      break;
    }

    result += cssText.slice(idx, earliestStart);
    const openParen = cssText.indexOf('(', earliestStart);
    let depth = 0;
    let end = openParen;
    while (end < cssText.length) {
      if (cssText[end] === '(') depth++;
      else if (cssText[end] === ')') {
        depth--;
        if (depth === 0) {
          end++;
          break;
        }
      }
      end++;
    }

    let expr = cssText.slice(earliestStart, end);
    if (varMap && expr.includes('var(')) {
      expr = resolveSimpleVars(expr, varMap);
    }
    // Only normalize if no unresolved var() remains; otherwise downgrade color-mix space safely
    if (expr.includes('var(')) {
      result += expr.replace(/\bin\s+(oklab|oklch)\b/gi, 'in srgb');
    } else {
      result += normalizeColor(expr);
    }
    idx = end;
  }

  return result;
}

function prepareCloneForHtml2Canvas(
  originalRoot: HTMLElement,
  clonedDoc: Document,
  clonedRoot: HTMLElement
): void {
  const normalizeColor = createCssColorNormalizer();
  const varMap = buildRootCssVarMap(normalizeColor);
  const unsupportedPattern = /\b(oklch|oklab|color-mix|lch|lab|color)\s*\(/i;

  // 1. Sanitize <style> blocks in clonedDoc so html2canvas stylesheet parser never throws on oklch/oklab/color-mix
  const styleTags = Array.from(clonedDoc.querySelectorAll('style'));
  for (const tag of styleTags) {
    const content = tag.textContent || '';
    if (unsupportedPattern.test(content)) {
      tag.textContent = replaceUnsupportedColorFunctions(content, normalizeColor, varMap);
    }
  }

  // 2. Normalize concrete computed color properties onto cloned elements
  const colorProps: Array<[keyof CSSStyleDeclaration, string]> = [
    ['color', 'color'],
    ['backgroundColor', 'background-color'],
    ['borderTopColor', 'border-top-color'],
    ['borderRightColor', 'border-right-color'],
    ['borderBottomColor', 'border-bottom-color'],
    ['borderLeftColor', 'border-left-color'],
    ['outlineColor', 'outline-color'],
    ['textDecorationColor', 'text-decoration-color'],
    ['fill', 'fill'],
    ['stroke', 'stroke'],
  ];

  const origElements = [originalRoot, ...Array.from(originalRoot.querySelectorAll<HTMLElement>('*'))];
  const cloneElements = [clonedRoot, ...Array.from(clonedRoot.querySelectorAll<HTMLElement>('*'))];
  const count = Math.min(origElements.length, cloneElements.length);

  for (let i = 0; i < count; i++) {
    const origEl = origElements[i];
    const cloneEl = cloneElements[i];
    const computed = window.getComputedStyle(origEl);

    for (const [propKey, cssName] of colorProps) {
      const val = computed.getPropertyValue(cssName);
      if (val && unsupportedPattern.test(val)) {
        (cloneEl.style as unknown as Record<string, string>)[propKey as string] = normalizeColor(val);
      }
    }

    const boxShadow = computed.getPropertyValue('box-shadow');
    if (boxShadow && boxShadow !== 'none' && unsupportedPattern.test(boxShadow)) {
      cloneEl.style.boxShadow = replaceUnsupportedColorFunctions(boxShadow, normalizeColor, varMap);
    }
  }
}

/**
 * High-quality multi-page PDF export matching exact preview dimensions and layout
 */
export async function downloadCertificatePDF(
  elementId: string,
  filename: string,
  paperSize: PaperSize = 'a4',
  orientation: PageOrientation = 'portrait'
): Promise<boolean> {
  const rootElement =
    document.getElementById(elementId) ||
    document.getElementById('certificate-print-root') ||
    document.getElementById('printable-certificate');

  if (!rootElement) {
    console.error('Certificate element not found for export');
    return false;
  }

  const prevClassName = rootElement.className;
  const prevCssText = rootElement.style.cssText;
  const computedRoot = window.getComputedStyle(rootElement);
  const wasHidden = computedRoot.display === 'none' || rootElement.offsetParent === null;

  try {
    incrementSessionCount();

    if ('fonts' in document && document.fonts?.ready) {
      await document.fonts.ready;
    }

    if (wasHidden) {
      rootElement.className = '';
      rootElement.style.cssText =
        'display: block !important; position: fixed !important; left: 0 !important; top: 0 !important; width: auto !important; background: #ffffff !important; opacity: 1 !important; pointer-events: none !important; z-index: -9999 !important;';
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      );
    }

    const sheetNodes = Array.from(rootElement.querySelectorAll<HTMLElement>('[data-cert-sheet]'));
    const targets = sheetNodes.length > 0 ? sheetNodes : [rootElement];

    const isLetter = paperSize === 'letter';
    const isColbCustom = paperSize === 'colb-custom';
    const isLandscape = orientation === 'landscape';

    const pdfFormat: string | [number, number] = isColbCustom
      ? isLandscape
        ? [330.2, 215.9]
        : [215.9, 330.2]
      : isLetter
      ? 'letter'
      : 'a4';

    const pdf = new jsPDF({
      orientation: isLandscape ? 'landscape' : 'portrait',
      unit: 'mm',
      format: pdfFormat,
      compress: true,
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const safeMarginMm = 3;
    const printableWidth = pageWidth - safeMarginMm * 2;
    const printableHeight = pageHeight - safeMarginMm * 2;

    for (let i = 0; i < targets.length; i++) {
      const sheet = targets[i];
      if (i > 0) {
        pdf.addPage(pdfFormat, isLandscape ? 'landscape' : 'portrait');
      }

      const targetW = Math.ceil(sheet.scrollWidth || sheet.getBoundingClientRect().width);
      const targetH = Math.ceil(sheet.scrollHeight || sheet.getBoundingClientRect().height);

      const canvas = await html2canvas(sheet, {
        scale: 2.2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        scrollX: 0,
        scrollY: 0,
        x: 0,
        y: 0,
        width: targetW,
        height: targetH,
        windowWidth: Math.max(targetW + 40, 1024),
        windowHeight: Math.max(targetH + 40, 1400),
        onclone: (clonedDoc, clonedEl) => {
          prepareCloneForHtml2Canvas(sheet, clonedDoc, clonedEl);
        },
      });

      const imgData = canvas.toDataURL('image/png');
      const widthScale = printableWidth / canvas.width;
      const heightScale = printableHeight / canvas.height;
      const fitRatio = Math.min(widthScale, heightScale);
      const drawWidth = canvas.width * fitRatio;
      const drawHeight = canvas.height * fitRatio;
      const xPos = (pageWidth - drawWidth) / 2;
      const yPos = (pageHeight - drawHeight) / 2;

      pdf.addImage(imgData, 'PNG', xPos, yPos, drawWidth, drawHeight);
    }

    pdf.save(`${filename.replace(/[^a-z0-9_-]/gi, '_')}.pdf`);
    return true;
  } catch (error) {
    console.error('Error generating PDF:', error);
    return false;
  } finally {
    if (wasHidden) {
      rootElement.className = prevClassName;
      rootElement.style.cssText = prevCssText;
    }
  }
}
