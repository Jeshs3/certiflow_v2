/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PDFDocument, rgb, StandardFonts, PDFFont } from 'pdf-lib';
import { BirthCertificateData, MarriageCertificateData } from '../types/certificate';
import { PdfTemplateConfig, PdfTemplateFieldMapping } from '../types/pdfMapping';
import { PH_COLB_102_CONFIG } from '../config/pdfTemplates/phColb102.config';
import { PH_COM_97_CONFIG } from '../config/pdfTemplates/phCom97.config';
import { COLB_DATA_BINDINGS, parseDateComponents } from '../utils/dataBinding';
import {
  formatDateMMMMCommaDDYYYY,
  formatDateMMMMDDYYYY,
  fromMonthDayYearToIso,
  normalizeNotApplicable,
  parseIsoDateToColbParts,
  toFullMonthName,
} from '../utils/certificateUtils';

const STORAGE_PREFIX = 'certiflow_pdf_config_';
export const PDF_CONFIG_UPDATED_EVENT = 'certiflow-pdf-config-updated';

export function getDefaultConfig(templateId: string = 'ph-colb-102'): PdfTemplateConfig {
  return templateId === 'ph-com-97' ? PH_COM_97_CONFIG : PH_COLB_102_CONFIG;
}

/**
 * Upward vertical adjustment (in PDF points) applied ONLY to data-only / hidden
 * hardcopy print output onto pre-printed official paper so inputted values sit
 * cleanly above blank fields instead of shifting downward on physical printers,
 * while keeping the on-screen template display completely unchanged.
 */
export const HARDCOPY_DATA_ONLY_Y_OFFSET_PT: Record<string, number> = {
  'ph-colb-102': 14,
  'ph-com-97': 12,
};

export function getHardcopyDataOnlyYOffsetPt(templateId?: string): number {
  if (!templateId) return 14;
  return HARDCOPY_DATA_ONLY_Y_OFFSET_PT[templateId] ?? 14;
}

/**
 * Storage helpers to persist customized admin field mappings separately
 */
export function getStoredConfig(templateId: string = 'ph-colb-102'): PdfTemplateConfig {
  const defaultCfg = getDefaultConfig(templateId);
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${templateId}`);
    if (raw) {
      const parsed = JSON.parse(raw) as PdfTemplateConfig;
      const parsedVersion = parsed?.configVersion ?? 1;
      const defaultVersion = defaultCfg.configVersion ?? 1;
      if (
        parsed &&
        Array.isArray(parsed.fields) &&
        parsed.fields.length > 0 &&
        parsedVersion >= defaultVersion
      ) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Failed to load custom PDF config from localStorage, using default:', err);
  }
  return defaultCfg;
}

export function saveConfigToStorage(config: PdfTemplateConfig): void {
  try {
    const defaultCfg = getDefaultConfig(config.templateId);
    const updated: PdfTemplateConfig = {
      ...config,
      configVersion: config.configVersion ?? defaultCfg.configVersion ?? 1,
      lastModified: Date.now(),
    };
    localStorage.setItem(`${STORAGE_PREFIX}${config.templateId}`, JSON.stringify(updated));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(PDF_CONFIG_UPDATED_EVENT, { detail: updated }));
    }
  } catch (err) {
    console.error('Failed to save PDF config to localStorage:', err);
  }
}

export function resetConfigInStorage(templateId: string = 'ph-colb-102'): PdfTemplateConfig {
  const defaultCfg = getDefaultConfig(templateId);
  try {
    localStorage.removeItem(`${STORAGE_PREFIX}${templateId}`);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent(PDF_CONFIG_UPDATED_EVENT, { detail: defaultCfg })
      );
    }
  } catch (err) {
    console.error('Failed to clear PDF config from localStorage:', err);
  }
  return defaultCfg;
}

/**
 * Splits a full name string into (first, middle, last) parts reliably
 */
export function splitFullNameParts(fullName?: string): {
  first: string;
  middle: string;
  last: string;
} {
  if (!fullName) return { first: '', middle: '', last: '' };
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: '', middle: '', last: '' };
  if (parts.length === 1) return { first: parts[0], middle: '', last: '' };
  if (parts.length === 2) return { first: parts[0], middle: '', last: parts[1] };
  return {
    first: parts[0],
    middle: parts.slice(1, -1).join(' '),
    last: parts[parts.length - 1],
  };
}

/**
 * Sanitizes strings for WinAnsi encoding used by StandardFonts in pdf-lib
 * and prevents raw control/newline characters from breaking line geometry.
 */
export function sanitizePdfText(raw: string): string {
  return raw
    .replace(/\r?\n/g, ' ')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[\u2713\u2714]/g, 'X')
    .replace(/\u2026/g, '...')
    .replace(/\u00A0/g, ' ')
    // Strip characters outside Latin-1 / printable ASCII range that WinAnsi cannot encode
    .replace(/[^\x20-\x7E\xA1-\xFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function getByDotPath(obj: unknown, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current && typeof current === 'object' && part in (current as Record<string, unknown>)) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return current;
}

function isPaternityField(field: PdfTemplateFieldMapping): boolean {
  return (
    field.category === 'page2_paternity' ||
    field.dataPath.startsWith('colb.paternity') ||
    field.dataPath.startsWith('colb.affidavitPaternity') ||
    field.dataPath.startsWith('paternity.')
  );
}

function isDelayedField(field: PdfTemplateFieldMapping): boolean {
  return (
    field.category === 'page2_delayed' ||
    field.dataPath.startsWith('colb.delayed') ||
    field.dataPath.startsWith('delayed.')
  );
}

/**
 * Resolves a field value from BirthCertificateData strictly following COLB_DATA_BINDINGS
 * and configured PdfTemplateFieldMapping paths/fallbacks.
 */
export function resolveFieldValue(
  field: PdfTemplateFieldMapping,
  data: BirthCertificateData
): string {
  const resolved = resolveFieldValueRaw(field, data);
  return field.isCheckbox ? resolved : normalizeNotApplicable(resolved).toUpperCase();
}

function resolveFieldValueRaw(
  field: PdfTemplateFieldMapping,
  data: BirthCertificateData
): string {
  const { dataPath, isCheckbox, sampleValue } = field;
  const colb = data.colb;

  // Enforce Page 2 Affidavit gating so unchecked sections never leak onto PDF or print output
  if (isPaternityField(field) && !colb?.affidavitPaternityEnabled) {
    return '';
  }
  if (isDelayedField(field) && !colb?.affidavitDelayedRegEnabled) {
    return '';
  }

  const page1FatherName =
    [colb?.fatherFirstName, colb?.fatherMiddleName, colb?.fatherLastName].filter(Boolean).join(' ') ||
    data.father?.fullName ||
    '';
  const page1MotherName =
    [colb?.motherFirstName, colb?.motherMiddleName, colb?.motherLastName].filter(Boolean).join(' ') ||
    data.mother?.fullName ||
    '';
  const page1ChildName =
    [data.child?.firstName, data.child?.middleName, data.child?.lastName].filter(Boolean).join(' ') ||
    data.child?.fullName ||
    '';
  const page1BirthDateFormatted = formatDateMMMMCommaDDYYYY(data.child?.dateOfBirth);
  const page1BirthPlace = [
    data.child?.placeOfBirth || data.additional?.hospitalFacility,
    data.child?.cityMunicipality,
    data.child?.provinceState,
  ]
    .filter(Boolean)
    .join(', ');

  if (field.id === 'page2_paternity_father_sig_name' || field.id === 'page2_paternity_by_father') {
    const val =
      colb?.paternityFatherSignatory !== undefined
        ? colb.paternityFatherSignatory
        : page1FatherName || colb?.paternityFatherName || '';
    return sanitizePdfText(val.toUpperCase());
  }
  if (field.id === 'page2_paternity_mother_sig_name' || field.id === 'page2_paternity_by_mother') {
    const val =
      colb?.paternityMotherSignatory !== undefined
        ? colb.paternityMotherSignatory
        : page1MotherName || colb?.paternityMotherName || '';
    return sanitizePdfText(val.toUpperCase());
  }

  const isSelfDelayed =
    colb?.delayedApplicantType === 'my_birth' ||
    (colb?.delayedApplicantType as string | undefined) === 'my_own';

  // Checkbox resolution
  if (isCheckbox) {
    if (dataPath === 'child.sex') {
      return data.child?.sex === sampleValue ? 'X' : '';
    }
    if (dataPath === 'additional.birthType') {
      return data.additional?.birthType === sampleValue ? 'X' : '';
    }
    if (dataPath === 'colb.multipleBirthOrder') {
      const birthTypeLower = (data.additional?.birthType || colb?.typeOfBirth || '').toLowerCase();
      if (birthTypeLower === 'single') return '';
      return colb?.multipleBirthOrder === sampleValue ? 'X' : '';
    }
    if (dataPath === 'colb.attendantType') {
      return colb?.attendantType === sampleValue ? 'X' : '';
    }
    if (dataPath === 'colb.delayedApplicantType') {
      if (sampleValue === 'my_birth') {
        return isSelfDelayed ? 'X' : '';
      }
      return !isSelfDelayed ? 'X' : '';
    }
    if (dataPath === 'colb.delayedParentsStatus') {
      const effectiveDelayedParentsStatus =
        colb?.delayedParentsStatus ||
        (colb?.parentsMarried === false || colb?.parentsMarriageDatePlace?.includes('NOT MARRIED')
          ? 'not_married'
          : 'married');
      return effectiveDelayedParentsStatus === sampleValue ? 'X' : '';
    }
  }

  // Date component splits
  if (dataPath === 'child.dateOfBirth_day') {
    const { day } = parseDateComponents(data.child?.dateOfBirth);
    return day || '';
  }
  if (dataPath === 'child.dateOfBirth_month') {
    const { monthName } = parseDateComponents(data.child?.dateOfBirth);
    return monthName?.toUpperCase() || '';
  }
  if (dataPath === 'child.dateOfBirth_year') {
    const { year } = parseDateComponents(data.child?.dateOfBirth);
    return year || '';
  }

  // Item 20: Marriage of Parents resolution (handles both combined string and discrete fields)
  const isNotMarried = Boolean(
    colb?.parentsMarried === false || colb?.parentsMarriageDatePlace?.toUpperCase().includes('NOT MARRIED')
  );
  if (
    dataPath === 'colb.parentsMarriageDate' ||
    dataPath === 'colb.parentsMarriagePlace' ||
    dataPath === 'colb.parentsMarriageDatePlace' ||
    dataPath === 'parents.marriageDatePlace' ||
    dataPath === 'colb.parentsMarriageDateMonth' ||
    dataPath === 'colb.parentsMarriageDateDay' ||
    dataPath === 'colb.parentsMarriageDateYear' ||
    dataPath === 'colb.parentsMarriagePlaceCity' ||
    dataPath === 'colb.parentsMarriagePlaceProvince' ||
    dataPath === 'colb.parentsMarriagePlaceCountry'
  ) {
    if (dataPath === 'colb.parentsMarriageDatePlace' || dataPath === 'parents.marriageDatePlace') {
      return sanitizePdfText((colb?.parentsMarriageDatePlace || '').toUpperCase());
    }
    if (isNotMarried) {
      if (dataPath === 'colb.parentsMarriageDate') return 'NOT MARRIED';
      if (dataPath === 'colb.parentsMarriagePlace') return 'N/A';
      if (dataPath === 'colb.parentsMarriageDateMonth') return 'NOT';
      if (dataPath === 'colb.parentsMarriageDateDay') return 'MARRIED';
      if (dataPath === 'colb.parentsMarriageDateYear') return '';
      return 'N/A';
    }

    const rawCombined = (colb?.parentsMarriageDatePlace || '').trim();
    const atSplitIdx = rawCombined.toLowerCase().indexOf(' at ');
    const dashSplitIdx = rawCombined.indexOf(' - ');
    const fallbackDatePart =
      atSplitIdx >= 0
        ? rawCombined.slice(0, atSplitIdx).trim()
        : dashSplitIdx >= 0
        ? rawCombined.slice(0, dashSplitIdx).trim()
        : rawCombined.split('-')[0]?.trim() || '';
    const fallbackPlacePart =
      atSplitIdx >= 0
        ? rawCombined.slice(atSplitIdx + 4).trim()
        : dashSplitIdx >= 0
        ? rawCombined.slice(dashSplitIdx + 3).trim()
        : rawCombined.includes('-')
        ? rawCombined.split('-').slice(1).join('-').trim()
        : '';

    if (dataPath === 'colb.parentsMarriageDate') {
      const explicitDate = [
        colb?.parentsMarriageDateMonth,
        colb?.parentsMarriageDateDay,
        colb?.parentsMarriageDateYear,
      ]
        .filter(Boolean)
        .join(' ')
        .trim();
      return sanitizePdfText(formatDateMMMMCommaDDYYYY(explicitDate || fallbackDatePart));
    }
    if (dataPath === 'colb.parentsMarriagePlace') {
      const explicitPlace = [
        colb?.parentsMarriagePlaceCity,
        colb?.parentsMarriagePlaceProvince,
        colb?.parentsMarriagePlaceCountry,
      ]
        .filter(Boolean)
        .join(', ')
        .trim();
      return sanitizePdfText((fallbackPlacePart || explicitPlace).toUpperCase());
    }
    if (dataPath === 'colb.parentsMarriageDateMonth') {
      if (colb?.parentsMarriageDateMonth) return sanitizePdfText(colb.parentsMarriageDateMonth.toUpperCase());
      const parsed = parseIsoDateToColbParts(fallbackDatePart);
      if (parsed) return sanitizePdfText(parsed.monthName);
      const md = fallbackDatePart.split(',')[0]?.trim().split(/\s+/) || [];
      return sanitizePdfText((md[0] || '').toUpperCase());
    }
    if (dataPath === 'colb.parentsMarriageDateDay') {
      if (colb?.parentsMarriageDateDay) return sanitizePdfText(colb.parentsMarriageDateDay.toUpperCase());
      const parsed = parseIsoDateToColbParts(fallbackDatePart);
      if (parsed) return sanitizePdfText(parsed.dayPadded);
      const md = fallbackDatePart.split(',')[0]?.trim().split(/\s+/) || [];
      return sanitizePdfText((md[1] || '').toUpperCase());
    }
    if (dataPath === 'colb.parentsMarriageDateYear') {
      if (colb?.parentsMarriageDateYear) return sanitizePdfText(colb.parentsMarriageDateYear.toUpperCase());
      const parsed = parseIsoDateToColbParts(fallbackDatePart);
      if (parsed) return sanitizePdfText(parsed.year);
      const parts = fallbackDatePart.split(',');
      return sanitizePdfText((parts[1]?.trim() || '').toUpperCase());
    }
    if (
      dataPath === 'colb.parentsMarriagePlaceCity' ||
      dataPath === 'colb.parentsMarriagePlaceProvince' ||
      dataPath === 'colb.parentsMarriagePlaceCountry'
    ) {
      const directVal = getByDotPath(data, dataPath);
      if (typeof directVal === 'string' && directVal.trim()) {
        return sanitizePdfText(directVal.toUpperCase());
      }
      const locs = fallbackPlacePart.split(',').map((s) => s.trim()).filter(Boolean);
      if (dataPath === 'colb.parentsMarriagePlaceCity') return sanitizePdfText((locs[0] || '').toUpperCase());
      if (dataPath === 'colb.parentsMarriagePlaceProvince') return sanitizePdfText((locs[1] || '').toUpperCase());
      if (dataPath === 'colb.parentsMarriagePlaceCountry') {
        return sanitizePdfText((locs[2] || (locs.length > 0 ? 'PHILIPPINES' : '')).toUpperCase());
      }
    }
  }

  // Paired COLB_DATA_BINDINGS resolution & documented fallbacks
  switch (dataPath) {
    case 'colb.province':
    case 'header.province':
      return sanitizePdfText((colb?.province || data.child?.provinceState || '').toUpperCase());
    case 'colb.cityMunicipality':
    case 'header.cityMunicipality':
      return sanitizePdfText((colb?.cityMunicipality || data.child?.cityMunicipality || '').toUpperCase());
    case 'child.firstName':
      return sanitizePdfText((data.child?.firstName || '').toUpperCase());
    case 'child.middleName':
      return sanitizePdfText((data.child?.middleName || '').toUpperCase());
    case 'child.lastName':
      return sanitizePdfText((data.child?.lastName || '').toUpperCase());
    case 'child.fullName':
      return sanitizePdfText((data.child?.fullName || '').toUpperCase());
    case 'child.placeOfBirth':
      return sanitizePdfText((data.child?.placeOfBirth || data.additional?.hospitalFacility || '').toUpperCase());
    case 'child.cityMunicipality':
      return sanitizePdfText((data.child?.cityMunicipality || '').toUpperCase());
    case 'child.provinceState':
      return sanitizePdfText((data.child?.provinceState || '').toUpperCase());
    case 'child.country':
      return sanitizePdfText((data.child?.country || '').toUpperCase());
    case 'additional.birthType':
      return sanitizePdfText(data.additional?.birthType || colb?.typeOfBirth || '');
    case 'colb.multipleBirthOrder': {
      const birthTypeLower = (data.additional?.birthType || colb?.typeOfBirth || '').toLowerCase();
      if (birthTypeLower === 'single') {
        return 'N/A';
      }
      const rawOrder = colb?.multipleBirthOrder || '';
      const orderMap: Record<string, string> = {
        '1': 'First',
        '2': 'Second',
        '3': 'Third',
      };
      return sanitizePdfText(
        colb?.multipleBirthChildWas ||
          (rawOrder === '3' && colb?.multipleBirthSpecify ? colb.multipleBirthSpecify : undefined) ||
          orderMap[rawOrder] ||
          colb?.multipleBirthSpecify ||
          rawOrder
      );
    }
    case 'colb.birthOrder':
    case 'additional.birthOrder':
      return sanitizePdfText(colb?.birthOrder || data.additional?.birthOrder || '');
    case 'colb.motherFirstName':
      return sanitizePdfText(
        (colb?.motherFirstName || splitFullNameParts(data.mother?.fullName).first).toUpperCase()
      );
    case 'colb.motherMiddleName':
      return sanitizePdfText(
        (colb?.motherMiddleName || splitFullNameParts(data.mother?.fullName).middle).toUpperCase()
      );
    case 'colb.motherLastName':
      return sanitizePdfText(
        (colb?.motherLastName || splitFullNameParts(data.mother?.fullName).last).toUpperCase()
      );
    case 'colb.motherCitizenship':
      return sanitizePdfText(colb?.motherCitizenship || data.mother?.nationality || '');
    case 'colb.motherResidenceStreet':
      return sanitizePdfText((colb?.motherResidenceStreet || '').toUpperCase());
    case 'colb.motherResidenceCity':
      return sanitizePdfText((colb?.motherResidenceCity || data.child?.cityMunicipality || '').toUpperCase());
    case 'colb.motherResidenceProvince':
      return sanitizePdfText((colb?.motherResidenceProvince || data.child?.provinceState || '').toUpperCase());
    case 'colb.motherResidenceCountry':
      return sanitizePdfText((colb?.motherResidenceCountry || data.child?.country || '').toUpperCase());
    case 'colb.fatherFirstName':
      return sanitizePdfText(
        (colb?.fatherFirstName || splitFullNameParts(data.father?.fullName).first).toUpperCase()
      );
    case 'colb.fatherMiddleName':
      return sanitizePdfText(
        (colb?.fatherMiddleName || splitFullNameParts(data.father?.fullName).middle).toUpperCase()
      );
    case 'colb.fatherLastName':
      return sanitizePdfText(
        (colb?.fatherLastName || splitFullNameParts(data.father?.fullName).last).toUpperCase()
      );
    case 'colb.fatherCitizenship':
      return sanitizePdfText(colb?.fatherCitizenship || data.father?.nationality || '');
    case 'colb.fatherResidenceStreet':
      return sanitizePdfText((colb?.fatherResidenceStreet || colb?.motherResidenceStreet || '').toUpperCase());
    case 'colb.fatherResidenceCity':
      return sanitizePdfText(
        (
          colb?.fatherResidenceCity ||
          colb?.motherResidenceCity ||
          data.child?.cityMunicipality ||
          ''
        ).toUpperCase()
      );
    case 'colb.fatherResidenceProvince':
      return sanitizePdfText(
        (
          colb?.fatherResidenceProvince ||
          colb?.motherResidenceProvince ||
          data.child?.provinceState ||
          ''
        ).toUpperCase()
      );
    case 'colb.fatherResidenceCountry':
      return sanitizePdfText(
        (
          colb?.fatherResidenceCountry ||
          colb?.motherResidenceCountry ||
          data.child?.country ||
          ''
        ).toUpperCase()
      );
    case 'colb.attendantOtherSpecify':
      return colb?.attendantType === '5'
        ? sanitizePdfText(colb?.attendantOtherSpecify || '')
        : '';
    case 'colb.attendantTime': {
      const raw = (colb?.attendantTime || data.child?.timeOfBirth || '').trim();
      if (!raw) return '';
      if (/\b(am|pm)\b/i.test(raw)) return sanitizePdfText(raw.toUpperCase());
      return sanitizePdfText(
        colb?.attendantTimeAmPm ? `${raw} ${colb.attendantTimeAmPm.toUpperCase()}` : raw
      );
    }
    case 'colb.attendantSignatureName':
      return sanitizePdfText((colb?.attendantSignatureName || '').toUpperCase());
    case 'colb.attendantAddress':
      return sanitizePdfText((colb?.attendantAddress || '').toUpperCase());
    case 'colb.attendantDate':
      return sanitizePdfText(formatDateMMMMCommaDDYYYY(colb?.attendantDate));
    case 'colb.informantSignatureName':
      return sanitizePdfText((colb?.informantSignatureName || data.father?.fullName || '').toUpperCase());
    case 'colb.informantAddress':
      return sanitizePdfText((colb?.informantAddress || colb?.motherResidenceStreet || '').toUpperCase());
    case 'colb.informantDate':
      return sanitizePdfText(formatDateMMMMCommaDDYYYY(colb?.informantDate));
    case 'colb.preparedByName':
      return sanitizePdfText((colb?.preparedByName || '').toUpperCase());
    case 'colb.preparedByDate':
      return sanitizePdfText(formatDateMMMMCommaDDYYYY(colb?.preparedByDate));
    case 'colb.receivedByName':
      return sanitizePdfText((colb?.receivedByName || '').toUpperCase());
    case 'colb.receivedByDate':
      return sanitizePdfText(formatDateMMMMCommaDDYYYY(colb?.receivedByDate));
    case 'colb.registeredByName':
      return sanitizePdfText((colb?.registeredByName || colb?.receivedByName || '').toUpperCase());
    case 'colb.registeredByTitle':
      return sanitizePdfText(colb?.registeredByTitle || colb?.receivedByTitle || '');
    case 'colb.registeredByDate':
      return sanitizePdfText(formatDateMMMMCommaDDYYYY(colb?.registeredByDate || colb?.receivedByDate));
    case 'colb.paternityFatherName':
      return sanitizePdfText((page1FatherName || colb?.paternityFatherName || '').toUpperCase());
    case 'colb.paternityMotherName':
      return sanitizePdfText((page1MotherName || colb?.paternityMotherName || '').toUpperCase());
    case 'colb.paternityChildName':
      return sanitizePdfText((page1ChildName || colb?.paternityChildName || '').toUpperCase());
    case 'colb.paternityBirthDate':
      return sanitizePdfText(page1BirthDateFormatted || formatDateMMMMCommaDDYYYY(colb?.paternityBirthDate) || '');
    case 'colb.paternityBirthPlace':
      return sanitizePdfText((page1BirthPlace || colb?.paternityBirthPlace || '').toUpperCase());
    case 'colb.paternityFatherSignatory':
      return sanitizePdfText(
        (colb?.paternityFatherSignatory !== undefined
          ? colb.paternityFatherSignatory
          : page1FatherName || colb?.paternityFatherName || ''
        ).toUpperCase()
      );
    case 'colb.paternityMotherSignatory':
      return sanitizePdfText(
        (colb?.paternityMotherSignatory !== undefined
          ? colb.paternityMotherSignatory
          : page1MotherName || colb?.paternityMotherName || ''
        ).toUpperCase()
      );
    case 'colb.paternityFatherCtcDate':
      return sanitizePdfText(formatDateMMMMCommaDDYYYY(colb?.paternityFatherCtcDate));
    case 'colb.paternityMotherCtcDate':
      return sanitizePdfText(formatDateMMMMCommaDDYYYY(colb?.paternityMotherCtcDate));
    case 'colb.paternityFatherCtcPlace':
      return sanitizePdfText((colb?.paternityFatherCtcPlace || colb?.paternitySwornPlace || '').toUpperCase());
    case 'colb.paternitySwornPlace':
      return sanitizePdfText((colb?.paternitySwornPlace || '').toUpperCase());
    case 'colb.affidavitPaternityAdminOfficer':
      return sanitizePdfText((colb?.affidavitPaternityAdminOfficer || '').toUpperCase());
    case 'colb.paternityAdminOfficerAddress':
      return sanitizePdfText((colb?.paternityAdminOfficerAddress || '').toUpperCase());
    case 'colb.delayedAffiantName':
      return sanitizePdfText((colb?.delayedAffiantName || data.father?.fullName || '').toUpperCase());
    case 'colb.delayedAffiantResidence':
      return sanitizePdfText((colb?.delayedAffiantResidence || colb?.motherResidenceStreet || '').toUpperCase());
    case 'colb.delayedApplicantPlace_self':
      return isSelfDelayed
        ? sanitizePdfText((colb?.delayedApplicantPlace || data.child?.placeOfBirth || '').toUpperCase())
        : '';
    case 'colb.delayedApplicantDate_self':
      return isSelfDelayed
        ? sanitizePdfText(formatDateMMMMCommaDDYYYY(colb?.delayedApplicantDate || data.child?.dateOfBirth))
        : '';
    case 'colb.delayedChildName':
      return !isSelfDelayed
        ? sanitizePdfText((colb?.delayedChildName || data.child?.fullName || '').toUpperCase())
        : '';
    case 'colb.delayedApplicantPlace_other':
      return !isSelfDelayed
        ? sanitizePdfText((colb?.delayedApplicantPlace || data.child?.placeOfBirth || '').toUpperCase())
        : '';
    case 'colb.delayedApplicantDate_other':
      return !isSelfDelayed
        ? sanitizePdfText(formatDateMMMMCommaDDYYYY(colb?.delayedApplicantDate || data.child?.dateOfBirth))
        : '';
    case 'colb.delayedAttendantName':
      return sanitizePdfText((colb?.delayedAttendantName || '').toUpperCase());
    case 'colb.delayedAttendantAddress':
      return sanitizePdfText((colb?.delayedAttendantAddress || '').toUpperCase());
    case 'colb.delayedAffiantCtcDate':
      return sanitizePdfText(formatDateMMMMCommaDDYYYY(colb?.delayedAffiantCtcDate));
    case 'colb.delayedParentsMarriageDate': {
      const effectiveDelayedParentsStatus =
        colb?.delayedParentsStatus ||
        (colb?.parentsMarried === false || colb?.parentsMarriageDatePlace?.toUpperCase().includes('NOT MARRIED')
          ? 'not_married'
          : 'married');
      if (effectiveDelayedParentsStatus !== 'married') return '';
      const raw = colb?.delayedParentsMarriageDatePlace || '';
      if (raw.trim()) {
        const atIdx = raw.toLowerCase().indexOf(' at ');
        const dashIdx = raw.indexOf(' - ');
        const dateStr =
          atIdx >= 0
            ? raw.slice(0, atIdx).trim()
            : dashIdx >= 0
            ? raw.slice(0, dashIdx).trim()
            : raw.split('-')[0]?.trim() || '';
        if (dateStr) return sanitizePdfText(formatDateMMMMCommaDDYYYY(dateStr));
      }
      const discreteDate = [
        colb?.parentsMarriageDateMonth,
        colb?.parentsMarriageDateDay,
        colb?.parentsMarriageDateYear,
      ]
        .filter(Boolean)
        .join(' ')
        .trim();
      if (discreteDate) return sanitizePdfText(formatDateMMMMCommaDDYYYY(discreteDate));
      const item20Raw = colb?.parentsMarriageDatePlace || '';
      if (item20Raw && !item20Raw.toUpperCase().includes('NOT MARRIED')) {
        const dashIdx = item20Raw.indexOf(' - ');
        const atIdx = item20Raw.toLowerCase().indexOf(' at ');
        const dateStr =
          dashIdx >= 0
            ? item20Raw.slice(0, dashIdx).trim()
            : atIdx >= 0
            ? item20Raw.slice(0, atIdx).trim()
            : item20Raw.split('-')[0]?.trim() || '';
        return sanitizePdfText(formatDateMMMMCommaDDYYYY(dateStr));
      }
      return '';
    }
    case 'colb.delayedParentsMarriagePlace': {
      const effectiveDelayedParentsStatus =
        colb?.delayedParentsStatus ||
        (colb?.parentsMarried === false || colb?.parentsMarriageDatePlace?.includes('NOT MARRIED')
          ? 'not_married'
          : 'married');
      if (effectiveDelayedParentsStatus !== 'married') return '';
      const raw = colb?.delayedParentsMarriageDatePlace || '';
      if (raw.trim()) {
        const atIdx = raw.toLowerCase().indexOf(' at ');
        const dashIdx = raw.indexOf(' - ');
        const placeStr =
          atIdx >= 0
            ? raw.slice(atIdx + 4).trim()
            : dashIdx >= 0
            ? raw.slice(dashIdx + 3).trim()
            : raw.includes('-')
            ? raw.split('-').slice(1).join('-').trim()
            : '';
        if (placeStr) return sanitizePdfText(placeStr.toUpperCase());
      }
      const discretePlace = [
        colb?.parentsMarriagePlaceCity,
        colb?.parentsMarriagePlaceProvince,
        colb?.parentsMarriagePlaceCountry,
      ]
        .filter(Boolean)
        .join(', ')
        .trim();
      if (discretePlace) return sanitizePdfText(discretePlace.toUpperCase());
      const item20Raw = colb?.parentsMarriageDatePlace || '';
      if (item20Raw && !item20Raw.includes('NOT MARRIED')) {
        const dashIdx = item20Raw.indexOf(' - ');
        const atIdx = item20Raw.toLowerCase().indexOf(' at ');
        const placeStr =
          dashIdx >= 0
            ? item20Raw.slice(dashIdx + 3).trim()
            : atIdx >= 0
            ? item20Raw.slice(atIdx + 4).trim()
            : item20Raw.includes('-')
            ? item20Raw.split('-').slice(1).join('-').trim()
            : '';
        return sanitizePdfText(placeStr.toUpperCase());
      }
      return '';
    }
    case 'colb.delayedFatherName': {
      const effectiveDelayedParentsStatus =
        colb?.delayedParentsStatus ||
        (colb?.parentsMarried === false || colb?.parentsMarriageDatePlace?.includes('NOT MARRIED')
          ? 'not_married'
          : 'married');
      const fatherFallback =
        [colb?.fatherFirstName, colb?.fatherMiddleName, colb?.fatherLastName].filter(Boolean).join(' ') ||
        data.father?.fullName ||
        '';
      return effectiveDelayedParentsStatus === 'not_married'
        ? sanitizePdfText((colb?.delayedFatherName || colb?.paternityFatherName || fatherFallback).toUpperCase())
        : '';
    }
    case 'colb.delayedApplicantMarriedTo':
      return sanitizePdfText((colb?.delayedApplicantMarriedTo || '').toUpperCase());
    case 'colb.delayedSwornPlace':
      return sanitizePdfText((colb?.delayedSwornPlace || '').toUpperCase());
    case 'colb.delayedAffiantCtcPlace':
      return sanitizePdfText((colb?.delayedAffiantCtcPlace || '').toUpperCase());
    case 'colb.delayedAdminOfficerName':
      return sanitizePdfText((colb?.delayedAdminOfficerName || '').toUpperCase());
    case 'colb.delayedAdminOfficerAddress':
      return sanitizePdfText((colb?.delayedAdminOfficerAddress || '').toUpperCase());
    case 'colb.delayedSwornMonthYear':
      return sanitizePdfText(
        [colb?.delayedSwornMonth, colb?.delayedSwornYear].filter(Boolean).join(', ')
      );
  }

  // Generic dot path lookup on BirthCertificateData
  const direct = getByDotPath(data, dataPath);
  if (direct !== undefined && direct !== null) {
    return sanitizePdfText(String(direct));
  }

  // Lookup in COLB_DATA_BINDINGS by id or token in case user mapped a custom binding token
  const matchedBinding = COLB_DATA_BINDINGS.find(
    (b) =>
      b.id === dataPath ||
      b.token === dataPath ||
      b.token === `{{${dataPath}}}` ||
      b.id === field.fieldName
  );
  if (matchedBinding) {
    return sanitizePdfText(String(matchedBinding.getValue(data) ?? ''));
  }

  return '';
}

function splitPlaceParts(place?: string): { city: string; province: string; country: string } {
  const raw = (place || '').trim();
  if (!raw) return { city: '', province: '', country: '' };
  const parts = raw.split(',').map((s) => s.trim()).filter(Boolean);
  return {
    city: parts[0] || '',
    province: parts[1] || '',
    country: parts[2] || (parts.length > 0 ? 'PHILIPPINES' : ''),
  };
}

/**
 * Resolves a field value from MarriageCertificateData for Municipal Form No. 97 (ph-com-97)
 */
export function resolveMarriageFieldValue(
  field: PdfTemplateFieldMapping,
  data: MarriageCertificateData
): string {
  const resolved = resolveMarriageFieldValueRaw(field, data);
  return field.isCheckbox ? resolved : normalizeNotApplicable(resolved).toUpperCase();
}

function resolveMarriageFieldValueRaw(
  field: PdfTemplateFieldMapping,
  data: MarriageCertificateData
): string {
  const { dataPath, isCheckbox, sampleValue } = field;
  const com = data.com;
  const groom = data.groom;
  const bride = data.bride;
  const marriage = data.marriage;
  const additional = data.additional;

  const hFirst = com?.husbandFirstName || groom?.firstName || '';
  const hMiddle = com?.husbandMiddleName || groom?.middleName || '';
  const hLast = com?.husbandLastName || groom?.lastName || '';
  const hFull = [hFirst, hMiddle, hLast].filter(Boolean).join(' ') || groom?.fullName || '';

  const wFirst = com?.wifeFirstName || bride?.firstName || '';
  const wMiddle = com?.wifeMiddleName || bride?.middleName || '';
  const wLast = com?.wifeLastName || bride?.lastName || '';
  const wFull = [wFirst, wMiddle, wLast].filter(Boolean).join(' ') || bride?.fullName || '';

  const mDateParts = parseDateComponents(marriage?.dateOfMarriage);
  const mDay = com?.marriageDay || mDateParts.day || '';
  const mMonth = toFullMonthName(com?.marriageMonth || mDateParts.monthName || '');
  const mYear = com?.marriageYear || mDateParts.year || '';

  // Enforce Page 2 Affidavit gating
  if (
    field.category === 'page2_solemnizing_affidavit' &&
    com?.affidavitSolemnizingOfficerEnabled === false
  ) {
    return '';
  }
  const isDelayedMarriageField =
    field.category === 'page2_delayed_marriage' || dataPath.startsWith('com.delayed');
  if (isDelayedMarriageField && !com?.affidavitDelayedReg) {
    return '';
  }

  // Checkboxes
  if (isCheckbox) {
    if (dataPath === 'com.marriageSettlement') {
      const settlement = com?.marriageSettlement || 'not_entered';
      return settlement === sampleValue ? 'X' : '';
    }
    if (dataPath === 'com.licenseType') {
      const lType = com?.licenseType || 'license';
      return lType === sampleValue ? 'X' : '';
    }
    if (dataPath === 'com.affidavitSolemnizing2a') {
      const activeQual =
        com?.solemnizingQualification ||
        (com?.solemnizingOfficerName || marriage?.officiantName ? '2a' : '');
      return activeQual === '2a' ? 'X' : '';
    }
    if (dataPath === 'com.solemnizingQualification') {
      const activeQual =
        com?.solemnizingQualification ||
        (com?.solemnizingOfficerName || marriage?.officiantName ? '2a' : '');
      return activeQual === sampleValue ? 'X' : '';
    }
    if (dataPath === 'com.delayedApplicantType') {
      const appType = com?.delayedApplicantType || 'marriage_between';
      return appType === sampleValue ? 'X' : '';
    }
    if (dataPath === 'com.delayedCeremonyType') {
      const cerType = com?.delayedCeremonyType || 'civil';
      return cerType === sampleValue ? 'X' : '';
    }
    if (dataPath === 'com.delayedLicenseUsed') {
      if (sampleValue === 'art_209') {
        return com?.licenseType === 'art_209' ? 'X' : '';
      }
      if (sampleValue === 'license') {
        return Boolean(com?.marriageLicenseNo) && com?.licenseType !== 'art_209' ? 'X' : '';
      }
    }
    return '';
  }

  const isSelfApplicant = com?.delayedApplicantType === 'my_marriage';
  const delayedMarriagePlaceStr =
    com?.delayedMarriagePlace ||
    com?.placeOfMarriage ||
    [marriage?.placeOfMarriage, marriage?.cityMunicipality, marriage?.provinceState]
      .filter(Boolean)
      .join(', ');
  const delayedMarriageDateStr = formatDateMMMMDDYYYY(
    com?.delayedMarriageDate ||
      marriage?.dateOfMarriage ||
      fromMonthDayYearToIso(mMonth, mDay, mYear)
  );

  switch (dataPath) {
    case 'com.province':
      return sanitizePdfText((com?.province || marriage?.provinceState || '').toUpperCase());
    case 'com.cityMunicipality':
      return sanitizePdfText((com?.cityMunicipality || marriage?.cityMunicipality || '').toUpperCase());
    case 'com.registryNo':
      return sanitizePdfText(com?.registryNo || '');

    // Husband
    case 'com.husbandFirstName':
      return sanitizePdfText(hFirst.toUpperCase());
    case 'com.husbandMiddleName':
      return sanitizePdfText(hMiddle.toUpperCase());
    case 'com.husbandLastName':
      return sanitizePdfText(hLast.toUpperCase());
    case 'com.husbandFullName':
      return sanitizePdfText(hFull.toUpperCase());
    case 'com.husbandDobDay':
      return sanitizePdfText(com?.husbandDobDay || parseDateComponents(groom?.dateOfBirth).day || '');
    case 'com.husbandDobMonth':
      return sanitizePdfText(
        toFullMonthName(com?.husbandDobMonth || parseDateComponents(groom?.dateOfBirth).monthName || '')
      );
    case 'com.husbandDobYear':
      return sanitizePdfText(com?.husbandDobYear || parseDateComponents(groom?.dateOfBirth).year || '');
    case 'com.husbandAge':
      return sanitizePdfText(com?.husbandAge || '');
    case 'com.husbandPlaceOfBirth_city':
      return sanitizePdfText(
        splitPlaceParts(com?.husbandPlaceOfBirth || groom?.placeOfBirth).city.toUpperCase()
      );
    case 'com.husbandPlaceOfBirth_province':
      return sanitizePdfText(
        splitPlaceParts(com?.husbandPlaceOfBirth || groom?.placeOfBirth).province.toUpperCase()
      );
    case 'com.husbandPlaceOfBirth_country':
      return sanitizePdfText(
        splitPlaceParts(com?.husbandPlaceOfBirth || groom?.placeOfBirth).country.toUpperCase()
      );
    case 'com.husbandSex':
      return 'MALE';
    case 'com.husbandCitizenship':
      return sanitizePdfText((com?.husbandCitizenship || groom?.nationality || '').toUpperCase());
    case 'com.husbandResidence':
      return sanitizePdfText((com?.husbandResidence || groom?.currentAddress || '').toUpperCase());
    case 'com.husbandReligion':
      return sanitizePdfText((com?.husbandReligion || '').toUpperCase());
    case 'com.husbandCivilStatus':
      return sanitizePdfText((com?.husbandCivilStatus || '').toUpperCase());
    case 'com.husbandFatherFirstName':
      return sanitizePdfText((com?.husbandFatherFirstName || '').toUpperCase());
    case 'com.husbandFatherMiddleName':
      return sanitizePdfText((com?.husbandFatherMiddleName || '').toUpperCase());
    case 'com.husbandFatherLastName':
      return sanitizePdfText((com?.husbandFatherLastName || '').toUpperCase());
    case 'com.husbandFatherCitizenship':
      return sanitizePdfText((com?.husbandFatherCitizenship || '').toUpperCase());
    case 'com.husbandMotherMaidenFirstName':
      return sanitizePdfText((com?.husbandMotherMaidenFirstName || '').toUpperCase());
    case 'com.husbandMotherMaidenMiddleName':
      return sanitizePdfText((com?.husbandMotherMaidenMiddleName || '').toUpperCase());
    case 'com.husbandMotherMaidenLastName':
      return sanitizePdfText((com?.husbandMotherMaidenLastName || '').toUpperCase());
    case 'com.husbandMotherCitizenship':
      return sanitizePdfText((com?.husbandMotherCitizenship || '').toUpperCase());
    case 'com.husbandConsentPerson_first': {
      if (
        com?.husbandConsentFirstName !== undefined ||
        com?.husbandConsentMiddleName !== undefined ||
        com?.husbandConsentLastName !== undefined
      ) {
        const f = normalizeNotApplicable((com?.husbandConsentFirstName || '').trim()).trim();
        return sanitizePdfText(f.toUpperCase());
      }
      const raw = normalizeNotApplicable((com?.husbandConsentPerson || '').trim()).trim();
      if (!raw || raw.toUpperCase() === 'N/A') return '';
      return sanitizePdfText(splitFullNameParts(raw).first.toUpperCase());
    }
    case 'com.husbandConsentPerson_middle': {
      if (
        com?.husbandConsentFirstName !== undefined ||
        com?.husbandConsentMiddleName !== undefined ||
        com?.husbandConsentLastName !== undefined
      ) {
        const f = (com?.husbandConsentFirstName || '').trim();
        const m = normalizeNotApplicable((com?.husbandConsentMiddleName || '').trim()).trim();
        const l = (com?.husbandConsentLastName || '').trim();
        if (!f && !m && !l) return 'N/A';
        return sanitizePdfText(m.toUpperCase());
      }
      const raw = normalizeNotApplicable((com?.husbandConsentPerson || '').trim()).trim();
      if (!raw || raw.toUpperCase() === 'N/A') return 'N/A';
      return sanitizePdfText(splitFullNameParts(raw).middle.toUpperCase());
    }
    case 'com.husbandConsentPerson_last': {
      if (
        com?.husbandConsentFirstName !== undefined ||
        com?.husbandConsentMiddleName !== undefined ||
        com?.husbandConsentLastName !== undefined
      ) {
        const l = normalizeNotApplicable((com?.husbandConsentLastName || '').trim()).trim();
        return sanitizePdfText(l.toUpperCase());
      }
      const raw = normalizeNotApplicable((com?.husbandConsentPerson || '').trim()).trim();
      if (!raw || raw.toUpperCase() === 'N/A') return '';
      return sanitizePdfText(splitFullNameParts(raw).last.toUpperCase());
    }
    case 'com.husbandConsentRelationship':
      return sanitizePdfText((com?.husbandConsentRelationship?.trim() || 'N/A').toUpperCase());
    case 'com.husbandConsentResidence':
      return sanitizePdfText((com?.husbandConsentResidence?.trim() || 'N/A').toUpperCase());

    // Wife
    case 'com.wifeFirstName':
      return sanitizePdfText(wFirst.toUpperCase());
    case 'com.wifeMiddleName':
      return sanitizePdfText(wMiddle.toUpperCase());
    case 'com.wifeLastName':
      return sanitizePdfText(wLast.toUpperCase());
    case 'com.wifeFullName':
      return sanitizePdfText(wFull.toUpperCase());
    case 'com.wifeDobDay':
      return sanitizePdfText(com?.wifeDobDay || parseDateComponents(bride?.dateOfBirth).day || '');
    case 'com.wifeDobMonth':
      return sanitizePdfText(
        toFullMonthName(com?.wifeDobMonth || parseDateComponents(bride?.dateOfBirth).monthName || '')
      );
    case 'com.wifeDobYear':
      return sanitizePdfText(com?.wifeDobYear || parseDateComponents(bride?.dateOfBirth).year || '');
    case 'com.wifeAge':
      return sanitizePdfText(com?.wifeAge || '');
    case 'com.wifePlaceOfBirth_city':
      return sanitizePdfText(
        splitPlaceParts(com?.wifePlaceOfBirth || bride?.placeOfBirth).city.toUpperCase()
      );
    case 'com.wifePlaceOfBirth_province':
      return sanitizePdfText(
        splitPlaceParts(com?.wifePlaceOfBirth || bride?.placeOfBirth).province.toUpperCase()
      );
    case 'com.wifePlaceOfBirth_country':
      return sanitizePdfText(
        splitPlaceParts(com?.wifePlaceOfBirth || bride?.placeOfBirth).country.toUpperCase()
      );
    case 'com.wifeSex':
      return 'FEMALE';
    case 'com.wifeCitizenship':
      return sanitizePdfText((com?.wifeCitizenship || bride?.nationality || '').toUpperCase());
    case 'com.wifeResidence':
      return sanitizePdfText((com?.wifeResidence || bride?.currentAddress || '').toUpperCase());
    case 'com.wifeReligion':
      return sanitizePdfText((com?.wifeReligion || '').toUpperCase());
    case 'com.wifeCivilStatus':
      return sanitizePdfText((com?.wifeCivilStatus || '').toUpperCase());
    case 'com.wifeFatherFirstName':
      return sanitizePdfText((com?.wifeFatherFirstName || '').toUpperCase());
    case 'com.wifeFatherMiddleName':
      return sanitizePdfText((com?.wifeFatherMiddleName || '').toUpperCase());
    case 'com.wifeFatherLastName':
      return sanitizePdfText((com?.wifeFatherLastName || '').toUpperCase());
    case 'com.wifeFatherCitizenship':
      return sanitizePdfText((com?.wifeFatherCitizenship || '').toUpperCase());
    case 'com.wifeMotherMaidenFirstName':
      return sanitizePdfText((com?.wifeMotherMaidenFirstName || '').toUpperCase());
    case 'com.wifeMotherMaidenMiddleName':
      return sanitizePdfText((com?.wifeMotherMaidenMiddleName || '').toUpperCase());
    case 'com.wifeMotherMaidenLastName':
      return sanitizePdfText((com?.wifeMotherMaidenLastName || '').toUpperCase());
    case 'com.wifeMotherCitizenship':
      return sanitizePdfText((com?.wifeMotherCitizenship || '').toUpperCase());
    case 'com.wifeConsentPerson_first': {
      if (
        com?.wifeConsentFirstName !== undefined ||
        com?.wifeConsentMiddleName !== undefined ||
        com?.wifeConsentLastName !== undefined
      ) {
        const f = normalizeNotApplicable((com?.wifeConsentFirstName || '').trim()).trim();
        return sanitizePdfText(f.toUpperCase());
      }
      const raw = normalizeNotApplicable((com?.wifeConsentPerson || '').trim()).trim();
      if (!raw || raw.toUpperCase() === 'N/A') return '';
      return sanitizePdfText(splitFullNameParts(raw).first.toUpperCase());
    }
    case 'com.wifeConsentPerson_middle': {
      if (
        com?.wifeConsentFirstName !== undefined ||
        com?.wifeConsentMiddleName !== undefined ||
        com?.wifeConsentLastName !== undefined
      ) {
        const f = (com?.wifeConsentFirstName || '').trim();
        const m = normalizeNotApplicable((com?.wifeConsentMiddleName || '').trim()).trim();
        const l = (com?.wifeConsentLastName || '').trim();
        if (!f && !m && !l) return 'N/A';
        return sanitizePdfText(m.toUpperCase());
      }
      const raw = normalizeNotApplicable((com?.wifeConsentPerson || '').trim()).trim();
      if (!raw || raw.toUpperCase() === 'N/A') return 'N/A';
      return sanitizePdfText(splitFullNameParts(raw).middle.toUpperCase());
    }
    case 'com.wifeConsentPerson_last': {
      if (
        com?.wifeConsentFirstName !== undefined ||
        com?.wifeConsentMiddleName !== undefined ||
        com?.wifeConsentLastName !== undefined
      ) {
        const l = normalizeNotApplicable((com?.wifeConsentLastName || '').trim()).trim();
        return sanitizePdfText(l.toUpperCase());
      }
      const raw = normalizeNotApplicable((com?.wifeConsentPerson || '').trim()).trim();
      if (!raw || raw.toUpperCase() === 'N/A') return '';
      return sanitizePdfText(splitFullNameParts(raw).last.toUpperCase());
    }
    case 'com.wifeConsentRelationship':
      return sanitizePdfText((com?.wifeConsentRelationship?.trim() || 'N/A').toUpperCase());
    case 'com.wifeConsentResidence':
      return sanitizePdfText((com?.wifeConsentResidence?.trim() || 'N/A').toUpperCase());

    // Ceremony & Solemnizing Officer
    case 'com.placeOfMarriage':
      return sanitizePdfText(
        (
          com?.placeOfMarriage ||
          [
            com?.placeOfMarriageVenue || marriage?.placeOfMarriage,
            com?.placeOfMarriageCity || marriage?.cityMunicipality,
            com?.placeOfMarriageProvince || marriage?.provinceState,
          ]
            .filter(Boolean)
            .join(', ')
        ).toUpperCase()
      );
    case 'com.placeOfMarriageVenue': {
      const legacyParts = (com?.placeOfMarriage || '').split(',').map((s) => s.trim()).filter(Boolean);
      const val =
        com?.placeOfMarriageVenue ||
        marriage?.placeOfMarriage ||
        (legacyParts.length >= 2 ? legacyParts.slice(0, -2).join(', ') || legacyParts[0] : legacyParts[0]) ||
        '';
      return sanitizePdfText(val.toUpperCase());
    }
    case 'com.placeOfMarriageCity': {
      const legacyParts = (com?.placeOfMarriage || '').split(',').map((s) => s.trim()).filter(Boolean);
      const val =
        com?.placeOfMarriageCity ||
        marriage?.cityMunicipality ||
        (legacyParts.length >= 2 ? legacyParts[legacyParts.length - 2] : '') ||
        '';
      return sanitizePdfText(val.toUpperCase());
    }
    case 'com.placeOfMarriageProvince': {
      const legacyParts = (com?.placeOfMarriage || '').split(',').map((s) => s.trim()).filter(Boolean);
      const val =
        com?.placeOfMarriageProvince ||
        marriage?.provinceState ||
        (legacyParts.length >= 3 ? legacyParts[legacyParts.length - 1] : legacyParts.length === 2 ? legacyParts[1] : '') ||
        '';
      return sanitizePdfText(val.toUpperCase());
    }
    case 'com.marriageDay':
      return sanitizePdfText(mDay);
    case 'com.marriageMonth':
      return sanitizePdfText(mMonth.toUpperCase());
    case 'com.marriageYear':
      return sanitizePdfText(mYear);
    case 'com.witnessWhereofDay': {
      const wParts = parseIsoDateToColbParts(com?.witnessWhereofDate);
      return sanitizePdfText(com?.witnessWhereofDay || wParts?.dayPadded || '');
    }
    case 'com.witnessWhereofMonth': {
      const wParts = parseIsoDateToColbParts(com?.witnessWhereofDate);
      return sanitizePdfText(
        toFullMonthName(com?.witnessWhereofMonth || wParts?.monthName || '')
      );
    }
    case 'com.witnessWhereofYear': {
      const wParts = parseIsoDateToColbParts(com?.witnessWhereofDate);
      return sanitizePdfText(com?.witnessWhereofYear || wParts?.year || '');
    }
    case 'marriage.timeOfMarriage': {
      const raw = (com?.marriageTime || marriage?.timeOfMarriage || '').trim();
      if (!raw) return '';
      if (/\b(am|pm)\b/i.test(raw)) return sanitizePdfText(raw.toUpperCase());
      return sanitizePdfText(
        com?.marriageTimeAmPm ? `${raw} ${com.marriageTimeAmPm.toUpperCase()}` : raw.toUpperCase()
      );
    }
    case 'com.solemnizingOfficerName':
      return sanitizePdfText((com?.solemnizingOfficerName || marriage?.officiantName || '').toUpperCase());
    case 'com.solemnizingOfficerOffice':
      return sanitizePdfText(
        (
          com?.solemnizingOfficerOffice ||
          com?.placeOfMarriageVenue ||
          marriage?.placeOfMarriage ||
          com?.solemnizingOfficerReligion ||
          com?.placeOfMarriage ||
          ''
        ).toUpperCase()
      );
    case 'com.solemnizingOfficerAddress': {
      const addr = [
        com?.placeOfMarriageCity || marriage?.cityMunicipality,
        com?.placeOfMarriageProvince || marriage?.provinceState,
      ]
        .filter(Boolean)
        .join(', ');
      return sanitizePdfText(
        (
          com?.solemnizingOfficerAddress ||
          addr ||
          [com?.cityMunicipality, com?.province].filter(Boolean).join(', ')
        ).toUpperCase()
      );
    }
    case 'com.solemnizing2cParty1':
      return com?.solemnizingQualification === '2c'
        ? sanitizePdfText((com?.solemnizing2cParty1 || '').toUpperCase())
        : '';
    case 'com.solemnizing2cParty2':
      return com?.solemnizingQualification === '2c'
        ? sanitizePdfText((com?.solemnizing2cParty2 || '').toUpperCase())
        : '';
    case 'com.solemnizingOfficerReligionCombined': {
      const combined = [com?.solemnizingOfficerReligion, com?.solemnizingOfficerRegistryNo]
        .filter(Boolean)
        .join(' / ');
      return sanitizePdfText(combined.toUpperCase());
    }
    case 'com.art209Specify':
      return com?.licenseType === 'art_209' ? sanitizePdfText(com?.art209Specify || '') : '';
    case 'com.witness1':
      return sanitizePdfText((com?.witness1 || additional?.witness1Name || '').toUpperCase());
    case 'com.witness2':
      return sanitizePdfText((com?.witness2 || additional?.witness2Name || '').toUpperCase());
    case 'com.witness3':
      return sanitizePdfText((com?.witness3 || '').toUpperCase());
    case 'com.witness4':
      return sanitizePdfText((com?.witness4 || '').toUpperCase());
    case 'com.witness5':
      return sanitizePdfText((com?.witness5 || '').toUpperCase());
    case 'com.witness6':
      return sanitizePdfText((com?.witness6 || '').toUpperCase());
    case 'com.witness7':
      return sanitizePdfText((com?.witness7 || '').toUpperCase());
    case 'com.witness8':
      return sanitizePdfText((com?.witness8 || '').toUpperCase());

    case 'com.marriageLicenseNo':
      return (com?.licenseType || 'license') === 'license'
        ? sanitizePdfText(com?.marriageLicenseNo || '')
        : '';
    case 'com.licenseIssuedDate':
      return (com?.licenseType || 'license') === 'license'
        ? sanitizePdfText(formatDateMMMMDDYYYY(com?.licenseIssuedDate))
        : '';
    case 'com.licenseIssuedPlace':
      return (com?.licenseType || 'license') === 'license'
        ? sanitizePdfText((com?.licenseIssuedPlace || '').toUpperCase())
        : '';
    case 'com.receivedByName':
      return sanitizePdfText((com?.receivedByName || '').toUpperCase());
    case 'com.receivedByDate':
      return sanitizePdfText(formatDateMMMMDDYYYY(com?.receivedByDate));
    case 'com.registeredByName':
      return sanitizePdfText((com?.registeredByName || '').toUpperCase());
    case 'com.registeredByDate':
      return sanitizePdfText(formatDateMMMMDDYYYY(com?.registeredByDate));
    case 'com.solemnizingSwornPlace':
      return sanitizePdfText((com?.solemnizingSwornPlace || '').toUpperCase());
    case 'com.solemnizingJuratPlace':
      return sanitizePdfText((com?.solemnizingJuratPlace || '').toUpperCase());
    case 'com.solemnizingAffiantCtcDate':
      return sanitizePdfText(formatDateMMMMDDYYYY(com?.solemnizingAffiantCtcDate));
    case 'com.solemnizingAffiantCtcPlace':
      return sanitizePdfText((com?.solemnizingAffiantCtcPlace || '').toUpperCase());
    case 'com.solemnizingAdminOfficerName':
      return sanitizePdfText((com?.solemnizingAdminOfficerName || '').toUpperCase());
    case 'com.solemnizingAdminOfficerAddress':
      return sanitizePdfText((com?.solemnizingAdminOfficerAddress || '').toUpperCase());

    // Page 2 Delayed Marriage Affidavit Conditional Helpers
    case 'com.delayedAffiantName':
      return sanitizePdfText((com?.delayedAffiantName || [hFirst, hLast].filter(Boolean).join(' ')).toUpperCase());
    case 'com.delayedAffiantResidence':
      return sanitizePdfText(
        (com?.delayedAffiantResidence || com?.husbandResidence || groom?.currentAddress || '').toUpperCase()
      );
    case 'com.delayedSpouseName':
      return isSelfApplicant ? sanitizePdfText((com?.delayedSpouseName || wFull).toUpperCase()) : '';
    case 'com.delayedMarriagePlace_self':
      return isSelfApplicant ? sanitizePdfText(delayedMarriagePlaceStr.toUpperCase()) : '';
    case 'com.delayedMarriageDate_self':
      return isSelfApplicant ? sanitizePdfText(delayedMarriageDateStr) : '';
    case 'com.delayedHusbandName':
      return !isSelfApplicant ? sanitizePdfText([hFirst, hLast].filter(Boolean).join(' ').toUpperCase()) : '';
    case 'com.delayedWifeName':
      return !isSelfApplicant ? sanitizePdfText([wFirst, wLast].filter(Boolean).join(' ').toUpperCase()) : '';
    case 'com.delayedMarriagePlace_between':
      return !isSelfApplicant ? sanitizePdfText(delayedMarriagePlaceStr.toUpperCase()) : '';
    case 'com.delayedMarriageDate_between':
      return !isSelfApplicant ? sanitizePdfText(delayedMarriageDateStr) : '';
    case 'com.delayedApplicantCitizenship_self':
      return isSelfApplicant ? sanitizePdfText((com?.delayedApplicantCitizenship || '').toUpperCase()) : '';
    case 'com.delayedSpouseCitizenship_self':
      return isSelfApplicant ? sanitizePdfText((com?.delayedSpouseCitizenship || '').toUpperCase()) : '';
    case 'com.delayedWifeCitizenship_other':
      return !isSelfApplicant ? sanitizePdfText((com?.delayedWifeCitizenship || '').toUpperCase()) : '';
    case 'com.delayedHusbandCitizenship_other':
      return !isSelfApplicant ? sanitizePdfText((com?.delayedHusbandCitizenship || '').toUpperCase()) : '';
    case 'com.delayedSwornPlace':
      return sanitizePdfText((com?.delayedSwornPlace || '').toUpperCase());
    case 'com.delayedAffiantCtcDate':
      return sanitizePdfText(formatDateMMMMDDYYYY(com?.delayedAffiantCtcDate));
    case 'com.delayedAffiantCtcPlace':
      return sanitizePdfText((com?.delayedAffiantCtcPlace || '').toUpperCase());
    case 'com.delayedAdminOfficerName':
      return sanitizePdfText((com?.delayedAdminOfficerName || '').toUpperCase());
    case 'com.delayedAdminOfficerAddress':
      return sanitizePdfText((com?.delayedAdminOfficerAddress || '').toUpperCase());
  }

  const direct = getByDotPath(data, dataPath);
  if (direct !== undefined && direct !== null) {
    return sanitizePdfText(String(direct));
  }

  return '';
}

/**
 * Loads the existing official PDF template directly
 */
export async function loadExistingPdfTemplate(pdfUrlOrPath: string): Promise<Uint8Array> {
  const response = await fetch(pdfUrlOrPath);
  if (!response.ok) {
    console.error(`Failed to load PDF template from ${pdfUrlOrPath}: ${response.status} ${response.statusText}`);
    throw new Error('We could not load the official PDF template right now. Please refresh and try again.');
  }
  const arrayBuffer = await response.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}

/**
 * Truncates text so its rendered width never exceeds maxWidth
 */
function truncateToWidth(
  text: string,
  font: PDFFont,
  fontSize: number,
  maxWidth: number
): string {
  if (!text) return '';
  if (font.widthOfTextAtSize(text, fontSize) <= maxWidth) {
    return text;
  }
  const ellipsis = '...';
  let candidate = text;
  while (candidate.length > 0 && font.widthOfTextAtSize(`${candidate}${ellipsis}`, fontSize) > maxWidth) {
    candidate = candidate.slice(0, -1);
  }
  return candidate ? `${candidate}${ellipsis}` : '';
}

/**
 * Splits text into wrapped lines guaranteed not to exceed maxWidth
 */
function wrapText(text: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (font.widthOfTextAtSize(testLine, fontSize) <= maxWidth) {
      currentLine = testLine;
      continue;
    }

    if (currentLine) {
      lines.push(currentLine);
      currentLine = '';
    }

    // If a single word is wider than maxWidth, break it cleanly at character boundaries
    if (font.widthOfTextAtSize(word, fontSize) > maxWidth) {
      let chunk = '';
      for (const ch of word) {
        if (font.widthOfTextAtSize(chunk + ch, fontSize) <= maxWidth) {
          chunk += ch;
        } else {
          if (chunk) lines.push(chunk);
          chunk = ch;
        }
      }
      currentLine = chunk;
    } else {
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

export interface GeneratePdfOptions {
  /** Template ID ('ph-colb-102' or 'ph-com-97') when config is not explicitly provided */
  templateId?: 'ph-colb-102' | 'ph-com-97';
  /** Template configuration with mapped coordinates */
  config?: PdfTemplateConfig;
  /** Explicit override fields (e.g. from live admin editor) */
  overrideFields?: PdfTemplateFieldMapping[];
  /** If true, uses field.sampleValue instead of actual data for visual preview/testing */
  useSampleData?: boolean;
  /** If true, creates blank sheets with ONLY inputted data drawn at configured coordinates (for pre-templated paper) */
  dataOnly?: boolean;
}

/**
 * Reusable PDF Generation Service using pdf-lib
 * Loads the existing PDF template directly (or blank sheets in dataOnly mode)
 * and overlays form data onto configured coordinates without overflowing or shifting.
 */
export async function generatePdfFromTemplate(
  data: BirthCertificateData | MarriageCertificateData,
  options: GeneratePdfOptions = {}
): Promise<Uint8Array> {
  const config = options.config || getStoredConfig(options.templateId || 'ph-colb-102');
  const fields = options.overrideFields || config.fields;
  const isComTemplate = config.templateId === 'ph-com-97';

  let pdfDoc: PDFDocument;
  if (options.dataOnly) {
    pdfDoc = await PDFDocument.create();
    const dims =
      config.pageDimensions && config.pageDimensions.length > 0
        ? config.pageDimensions
        : [
            { pageIndex: 0, width: 612, height: 936, unit: 'pt' as const },
            { pageIndex: 1, width: 612, height: 936, unit: 'pt' as const },
          ];
    for (const d of dims) {
      pdfDoc.addPage([d.width || 612, d.height || 936]);
    }
  } else {
    const templateBytes = await loadExistingPdfTemplate(config.pdfPath);
    pdfDoc = await PDFDocument.load(templateBytes);
  }

  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const courierFont = await pdfDoc.embedFont(StandardFonts.Courier);

  const fontMap: Record<string, PDFFont> = {
    Helvetica: helveticaFont,
    HelveticaBold: helveticaBoldFont,
    TimesRoman: timesRomanFont,
    Courier: courierFont,
  };

  const pages = pdfDoc.getPages();
  const defaultColor = rgb(0.05, 0.05, 0.05);
  const hardcopyYOffsetPt = options.dataOnly
    ? getHardcopyDataOnlyYOffsetPt(config.templateId)
    : 0;

  for (const field of fields) {
    const pageIndex = field.pageIndex ?? 0;
    if (pageIndex < 0 || pageIndex >= pages.length) {
      continue;
    }

    const page = pages[pageIndex];
    const effectiveFieldY = field.y + hardcopyYOffsetPt;
    const rawValue = options.useSampleData
      ? sanitizePdfText(field.sampleValue || 'SAMPLE')
      : isComTemplate
      ? resolveMarriageFieldValue(field, data as MarriageCertificateData)
      : resolveFieldValue(field, data as BirthCertificateData);

    if (!rawValue) {
      continue;
    }

    const font = fontMap[field.fontFamily] || helveticaBoldFont;
    const textColor = field.color
      ? rgb(field.color.r, field.color.g, field.color.b)
      : defaultColor;

    // Checkbox mark drawing
    if (field.isCheckbox) {
      if (rawValue === 'X' || rawValue === field.sampleValue) {
        const mark = sanitizePdfText(field.checkboxChar || 'X') || 'X';
        const markFontSize = field.fontSize || 10;
        const markWidth = font.widthOfTextAtSize(mark, markFontSize);
        page.drawText(mark, {
          x: field.x - markWidth / 2,
          y: effectiveFieldY,
          size: markFontSize,
          font,
          color: textColor,
        });
      }
      continue;
    }

    let effectiveFontSize = field.fontSize || 10;
    const maxWidth = Math.max(12, field.maxWidth || 200);
    const minFontSize = field.minFontSize || 5.5;

    if (field.allowWrap) {
      const maxLines = Math.max(1, field.maxLines || 3);
      let lines = wrapText(rawValue, font, effectiveFontSize, maxWidth);

      // Step down font size toward minFontSize if wrapped line count exceeds maxLines
      while (lines.length > maxLines && effectiveFontSize > minFontSize) {
        effectiveFontSize -= 0.5;
        lines = wrapText(rawValue, font, effectiveFontSize, maxWidth);
      }

      const displayLines = lines.slice(0, maxLines);
      if (lines.length > maxLines && displayLines.length > 0) {
        const lastIdx = displayLines.length - 1;
        displayLines[lastIdx] = truncateToWidth(
          `${displayLines[lastIdx]}...`,
          font,
          effectiveFontSize,
          maxWidth
        );
      }

      const lineHeight = effectiveFontSize * (field.lineHeightMultiplier || 1.15);

      displayLines.forEach((line, lineIdx) => {
        let drawX = field.x;
        const lineWidth = font.widthOfTextAtSize(line, effectiveFontSize);

        if (field.textAlign === 'center') {
          drawX = field.x - lineWidth / 2;
        } else if (field.textAlign === 'right') {
          drawX = field.x - lineWidth;
        }

        page.drawText(line, {
          x: drawX,
          y: effectiveFieldY - lineIdx * lineHeight,
          size: effectiveFontSize,
          font,
          color: textColor,
        });
      });
    } else {
      let textWidth = font.widthOfTextAtSize(rawValue, effectiveFontSize);
      while (textWidth > maxWidth && effectiveFontSize > minFontSize) {
        effectiveFontSize -= 0.5;
        textWidth = font.widthOfTextAtSize(rawValue, effectiveFontSize);
      }

      const fittedText =
        textWidth > maxWidth
          ? truncateToWidth(rawValue, font, effectiveFontSize, maxWidth)
          : rawValue;
      const fittedWidth = font.widthOfTextAtSize(fittedText, effectiveFontSize);

      let drawX = field.x;
      if (field.textAlign === 'center') {
        drawX = field.x - fittedWidth / 2;
      } else if (field.textAlign === 'right') {
        drawX = field.x - fittedWidth;
      }

      page.drawText(fittedText, {
        x: drawX,
        y: effectiveFieldY,
        size: effectiveFontSize,
        font,
        color: textColor,
      });
    }
  }

  return await pdfDoc.save();
}

/**
 * Triggers a browser download of the generated PDF
 */
export function downloadPdfBytes(bytes: Uint8Array, filename: string): void {
  const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Creates an object URL for previewing in an iframe
 */
export function createPdfBlobUrl(bytes: Uint8Array): string {
  const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' });
  return URL.createObjectURL(blob);
}
