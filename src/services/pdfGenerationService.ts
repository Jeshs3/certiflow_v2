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

const STORAGE_PREFIX = 'certiflow_pdf_config_';
export const PDF_CONFIG_UPDATED_EVENT = 'certiflow-pdf-config-updated';

export function getDefaultConfig(templateId: string = 'ph-colb-102'): PdfTemplateConfig {
  return templateId === 'ph-com-97' ? PH_COM_97_CONFIG : PH_COLB_102_CONFIG;
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
  const { dataPath, isCheckbox, sampleValue } = field;
  const colb = data.colb;

  // Enforce Page 2 Affidavit gating so unchecked sections never leak onto PDF or print output
  if (isPaternityField(field) && !colb?.affidavitPaternityEnabled) {
    return '';
  }
  if (isDelayedField(field) && !colb?.affidavitDelayedRegEnabled) {
    return '';
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
      return colb?.delayedParentsStatus === sampleValue ? 'X' : '';
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
    colb?.parentsMarried === false || colb?.parentsMarriageDatePlace?.includes('NOT MARRIED')
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
      return sanitizePdfText(colb?.parentsMarriageDatePlace || '');
    }
    if (isNotMarried) {
      if (dataPath === 'colb.parentsMarriageDate') return 'NOT MARRIED';
      if (dataPath === 'colb.parentsMarriagePlace') return 'N/A';
      if (dataPath === 'colb.parentsMarriageDateMonth') return 'NOT';
      if (dataPath === 'colb.parentsMarriageDateDay') return 'MARRIED';
      if (dataPath === 'colb.parentsMarriageDateYear') return '';
      return 'N/A';
    }

    const rawCombined = colb?.parentsMarriageDatePlace || '';
    const dashSplitIdx = rawCombined.indexOf(' - ');
    const fallbackDatePart =
      dashSplitIdx >= 0 ? rawCombined.slice(0, dashSplitIdx).trim() : rawCombined.split('-')[0]?.trim() || '';
    const fallbackPlacePart =
      dashSplitIdx >= 0
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
      return sanitizePdfText((explicitDate || fallbackDatePart).toUpperCase());
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
      return sanitizePdfText(fallbackPlacePart || explicitPlace);
    }
    if (dataPath === 'colb.parentsMarriageDateMonth') {
      if (colb?.parentsMarriageDateMonth) return sanitizePdfText(colb.parentsMarriageDateMonth);
      const md = fallbackDatePart.split(',')[0]?.trim().split(/\s+/) || [];
      return sanitizePdfText(md[0] || '');
    }
    if (dataPath === 'colb.parentsMarriageDateDay') {
      if (colb?.parentsMarriageDateDay) return sanitizePdfText(colb.parentsMarriageDateDay);
      const md = fallbackDatePart.split(',')[0]?.trim().split(/\s+/) || [];
      return sanitizePdfText(md[1] || '');
    }
    if (dataPath === 'colb.parentsMarriageDateYear') {
      if (colb?.parentsMarriageDateYear) return sanitizePdfText(colb.parentsMarriageDateYear);
      const parts = fallbackDatePart.split(',');
      return sanitizePdfText(parts[1]?.trim() || '');
    }
    if (
      dataPath === 'colb.parentsMarriagePlaceCity' ||
      dataPath === 'colb.parentsMarriagePlaceProvince' ||
      dataPath === 'colb.parentsMarriagePlaceCountry'
    ) {
      const directVal = getByDotPath(data, dataPath);
      if (typeof directVal === 'string' && directVal.trim()) {
        return sanitizePdfText(directVal);
      }
      const locs = fallbackPlacePart.split(',').map((s) => s.trim()).filter(Boolean);
      if (dataPath === 'colb.parentsMarriagePlaceCity') return sanitizePdfText(locs[0] || '');
      if (dataPath === 'colb.parentsMarriagePlaceProvince') return sanitizePdfText(locs[1] || '');
      if (dataPath === 'colb.parentsMarriagePlaceCountry') {
        return sanitizePdfText(locs[2] || (locs.length > 0 ? 'Philippines' : ''));
      }
    }
  }

  // Paired COLB_DATA_BINDINGS resolution & documented fallbacks
  switch (dataPath) {
    case 'colb.province':
    case 'header.province':
      return sanitizePdfText(colb?.province || data.child?.provinceState || '');
    case 'colb.cityMunicipality':
    case 'header.cityMunicipality':
      return sanitizePdfText(colb?.cityMunicipality || data.child?.cityMunicipality || '');
    case 'child.placeOfBirth':
      return sanitizePdfText(data.child?.placeOfBirth || data.additional?.hospitalFacility || '');
    case 'additional.birthType':
      return sanitizePdfText(data.additional?.birthType || colb?.typeOfBirth || '');
    case 'colb.multipleBirthOrder': {
      const birthTypeLower = (data.additional?.birthType || colb?.typeOfBirth || '').toLowerCase();
      if (birthTypeLower === 'single') {
        return sanitizePdfText(colb?.multipleBirthChildWas || '');
      }
      const rawOrder = colb?.multipleBirthOrder || '';
      const orderMap: Record<string, string> = {
        '1': 'First',
        '2': 'Second',
        '3': 'Third',
      };
      return sanitizePdfText(
        colb?.multipleBirthChildWas ||
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
        colb?.motherFirstName || splitFullNameParts(data.mother?.fullName).first
      );
    case 'colb.motherMiddleName':
      return sanitizePdfText(
        colb?.motherMiddleName || splitFullNameParts(data.mother?.fullName).middle
      );
    case 'colb.motherLastName':
      return sanitizePdfText(
        colb?.motherLastName || splitFullNameParts(data.mother?.fullName).last
      );
    case 'colb.motherCitizenship':
      return sanitizePdfText(colb?.motherCitizenship || data.mother?.nationality || '');
    case 'colb.motherResidenceCity':
      return sanitizePdfText(colb?.motherResidenceCity || data.child?.cityMunicipality || '');
    case 'colb.motherResidenceProvince':
      return sanitizePdfText(colb?.motherResidenceProvince || data.child?.provinceState || '');
    case 'colb.motherResidenceCountry':
      return sanitizePdfText(colb?.motherResidenceCountry || data.child?.country || '');
    case 'colb.fatherFirstName':
      return sanitizePdfText(
        colb?.fatherFirstName || splitFullNameParts(data.father?.fullName).first
      );
    case 'colb.fatherMiddleName':
      return sanitizePdfText(
        colb?.fatherMiddleName || splitFullNameParts(data.father?.fullName).middle
      );
    case 'colb.fatherLastName':
      return sanitizePdfText(
        colb?.fatherLastName || splitFullNameParts(data.father?.fullName).last
      );
    case 'colb.fatherCitizenship':
      return sanitizePdfText(colb?.fatherCitizenship || data.father?.nationality || '');
    case 'colb.fatherResidenceStreet':
      return sanitizePdfText(colb?.fatherResidenceStreet || colb?.motherResidenceStreet || '');
    case 'colb.fatherResidenceCity':
      return sanitizePdfText(
        colb?.fatherResidenceCity ||
          colb?.motherResidenceCity ||
          data.child?.cityMunicipality ||
          ''
      );
    case 'colb.fatherResidenceProvince':
      return sanitizePdfText(
        colb?.fatherResidenceProvince ||
          colb?.motherResidenceProvince ||
          data.child?.provinceState ||
          ''
      );
    case 'colb.fatherResidenceCountry':
      return sanitizePdfText(
        colb?.fatherResidenceCountry ||
          colb?.motherResidenceCountry ||
          data.child?.country ||
          ''
      );
    case 'colb.attendantOtherSpecify':
      return colb?.attendantType === '5'
        ? sanitizePdfText(colb?.attendantOtherSpecify || '')
        : '';
    case 'colb.attendantTime':
      return sanitizePdfText(colb?.attendantTime || data.child?.timeOfBirth || '');
    case 'colb.attendantDate':
      return sanitizePdfText(colb?.attendantDate || data.child?.dateOfBirth || '');
    case 'colb.informantSignatureName':
      return sanitizePdfText(colb?.informantSignatureName || data.father?.fullName || '');
    case 'colb.informantAddress':
      return sanitizePdfText(colb?.informantAddress || colb?.motherResidenceStreet || '');
    case 'colb.preparedByDate':
      return sanitizePdfText(colb?.preparedByDate || data.child?.dateOfBirth || '');
    case 'colb.registeredByName':
      return sanitizePdfText(colb?.registeredByName || colb?.receivedByName || '');
    case 'colb.registeredByTitle':
      return sanitizePdfText(colb?.registeredByTitle || colb?.receivedByTitle || '');
    case 'colb.registeredByDate':
      return sanitizePdfText(colb?.registeredByDate || colb?.receivedByDate || '');
    case 'colb.paternityFatherName':
      return sanitizePdfText(colb?.paternityFatherName || data.father?.fullName || '');
    case 'colb.paternityMotherName':
      return sanitizePdfText(colb?.paternityMotherName || data.mother?.fullName || '');
    case 'colb.paternityChildName':
      return sanitizePdfText(colb?.paternityChildName || data.child?.fullName || '');
    case 'colb.paternityBirthDate':
      return sanitizePdfText(colb?.paternityBirthDate || data.child?.dateOfBirth || '');
    case 'colb.paternityBirthPlace':
      return sanitizePdfText(colb?.paternityBirthPlace || data.child?.placeOfBirth || '');
    case 'colb.paternityFatherCtcPlace':
      return sanitizePdfText(colb?.paternityFatherCtcPlace || colb?.paternitySwornPlace || '');
    case 'colb.delayedAffiantName':
      return sanitizePdfText(colb?.delayedAffiantName || data.father?.fullName || '');
    case 'colb.delayedAffiantResidence':
      return sanitizePdfText(colb?.delayedAffiantResidence || colb?.motherResidenceStreet || '');
    case 'colb.delayedApplicantPlace_self':
      return isSelfDelayed
        ? sanitizePdfText(colb?.delayedApplicantPlace || data.child?.placeOfBirth || '')
        : '';
    case 'colb.delayedApplicantDate_self':
      return isSelfDelayed
        ? sanitizePdfText(colb?.delayedApplicantDate || data.child?.dateOfBirth || '')
        : '';
    case 'colb.delayedChildName':
      return !isSelfDelayed
        ? sanitizePdfText(colb?.delayedChildName || data.child?.fullName || '')
        : '';
    case 'colb.delayedApplicantPlace_other':
      return !isSelfDelayed
        ? sanitizePdfText(colb?.delayedApplicantPlace || data.child?.placeOfBirth || '')
        : '';
    case 'colb.delayedApplicantDate_other':
      return !isSelfDelayed
        ? sanitizePdfText(colb?.delayedApplicantDate || data.child?.dateOfBirth || '')
        : '';
    case 'colb.delayedParentsMarriageDate': {
      if (colb?.delayedParentsStatus !== 'married') return '';
      const raw = colb?.delayedParentsMarriageDatePlace || colb?.parentsMarriageDatePlace || '';
      const splitIdx = raw.indexOf(' - ');
      const dateStr = splitIdx >= 0 ? raw.slice(0, splitIdx).trim() : raw.split('-')[0]?.trim() || '';
      return sanitizePdfText(dateStr);
    }
    case 'colb.delayedParentsMarriagePlace': {
      if (colb?.delayedParentsStatus !== 'married') return '';
      const raw = colb?.delayedParentsMarriageDatePlace || colb?.parentsMarriageDatePlace || '';
      const splitIdx = raw.indexOf(' - ');
      const placeStr = splitIdx >= 0 ? raw.slice(splitIdx + 3).trim() : '';
      return sanitizePdfText(placeStr);
    }
    case 'colb.delayedFatherName':
      return colb?.delayedParentsStatus === 'not_married'
        ? sanitizePdfText(colb?.delayedFatherName || data.father?.fullName || '')
        : '';
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
    country: parts[2] || (parts.length > 0 ? 'Philippines' : ''),
  };
}

/**
 * Resolves a field value from MarriageCertificateData for Municipal Form No. 97 (ph-com-97)
 */
export function resolveMarriageFieldValue(
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
  const mMonth = com?.marriageMonth || mDateParts.monthName || '';
  const mYear = com?.marriageYear || mDateParts.year || '';

  // Enforce Page 2 Delayed Registration Affidavit gating
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
  const delayedMarriageDateStr =
    com?.delayedMarriageDate ||
    (mMonth || mDay || mYear ? `${mMonth} ${mDay}, ${mYear}`.trim() : '');

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
        com?.husbandDobMonth || parseDateComponents(groom?.dateOfBirth).monthName?.slice(0, 3) || ''
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
    case 'com.husbandConsentPerson_first':
      return sanitizePdfText(splitFullNameParts(com?.husbandConsentPerson).first.toUpperCase());
    case 'com.husbandConsentPerson_middle':
      return sanitizePdfText(splitFullNameParts(com?.husbandConsentPerson).middle.toUpperCase());
    case 'com.husbandConsentPerson_last':
      return sanitizePdfText(splitFullNameParts(com?.husbandConsentPerson).last.toUpperCase());
    case 'com.husbandConsentRelationship':
      return sanitizePdfText((com?.husbandConsentRelationship || '').toUpperCase());
    case 'com.husbandConsentResidence':
      return sanitizePdfText((com?.husbandConsentResidence || '').toUpperCase());

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
        com?.wifeDobMonth || parseDateComponents(bride?.dateOfBirth).monthName?.slice(0, 3) || ''
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
    case 'com.wifeConsentPerson_first':
      return sanitizePdfText(splitFullNameParts(com?.wifeConsentPerson).first.toUpperCase());
    case 'com.wifeConsentPerson_middle':
      return sanitizePdfText(splitFullNameParts(com?.wifeConsentPerson).middle.toUpperCase());
    case 'com.wifeConsentPerson_last':
      return sanitizePdfText(splitFullNameParts(com?.wifeConsentPerson).last.toUpperCase());
    case 'com.wifeConsentRelationship':
      return sanitizePdfText((com?.wifeConsentRelationship || '').toUpperCase());
    case 'com.wifeConsentResidence':
      return sanitizePdfText((com?.wifeConsentResidence || '').toUpperCase());

    // Ceremony & Solemnizing Officer
    case 'com.placeOfMarriage':
      return sanitizePdfText(
        (
          com?.placeOfMarriage ||
          [marriage?.placeOfMarriage, marriage?.cityMunicipality, marriage?.provinceState]
            .filter(Boolean)
            .join(', ')
        ).toUpperCase()
      );
    case 'com.marriageDay':
      return sanitizePdfText(mDay);
    case 'com.marriageMonth':
      return sanitizePdfText(mMonth.toUpperCase());
    case 'com.marriageYear':
      return sanitizePdfText(mYear);
    case 'marriage.timeOfMarriage': {
      const t =
        marriage?.timeOfMarriage ||
        (com?.marriageTime
          ? `${com.marriageTime}${com.marriageTimeAmPm ? ` ${com.marriageTimeAmPm.toUpperCase()}` : ''}`
          : '');
      return sanitizePdfText(t);
    }
    case 'com.solemnizingOfficerName':
      return sanitizePdfText((com?.solemnizingOfficerName || marriage?.officiantName || '').toUpperCase());
    case 'com.solemnizingOfficerOffice':
      return sanitizePdfText(
        (marriage?.placeOfMarriage || com?.solemnizingOfficerReligion || com?.placeOfMarriage || '').toUpperCase()
      );
    case 'com.solemnizingOfficerAddress': {
      const addr = [marriage?.cityMunicipality, marriage?.provinceState].filter(Boolean).join(', ');
      return sanitizePdfText(
        (addr || [com?.cityMunicipality, com?.province].filter(Boolean).join(', ')).toUpperCase()
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

    // Page 2 Delayed Marriage Affidavit Conditional Helpers
    case 'com.delayedAffiantName':
      return sanitizePdfText((com?.delayedAffiantName || [hFirst, hLast].filter(Boolean).join(' ')).toUpperCase());
    case 'com.delayedAffiantResidence':
      return sanitizePdfText(
        com?.delayedAffiantResidence || com?.husbandResidence || groom?.currentAddress || ''
      );
    case 'com.delayedSpouseName':
      return isSelfApplicant ? sanitizePdfText((com?.delayedSpouseName || wFull).toUpperCase()) : '';
    case 'com.delayedMarriagePlace_self':
      return isSelfApplicant ? sanitizePdfText(delayedMarriagePlaceStr) : '';
    case 'com.delayedMarriageDate_self':
      return isSelfApplicant ? sanitizePdfText(delayedMarriageDateStr) : '';
    case 'com.delayedHusbandName':
      return !isSelfApplicant ? sanitizePdfText([hFirst, hLast].filter(Boolean).join(' ').toUpperCase()) : '';
    case 'com.delayedWifeName':
      return !isSelfApplicant ? sanitizePdfText([wFirst, wLast].filter(Boolean).join(' ').toUpperCase()) : '';
    case 'com.delayedMarriagePlace_between':
      return !isSelfApplicant ? sanitizePdfText(delayedMarriagePlaceStr) : '';
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

  for (const field of fields) {
    const pageIndex = field.pageIndex ?? 0;
    if (pageIndex < 0 || pageIndex >= pages.length) {
      continue;
    }

    const page = pages[pageIndex];
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
          y: field.y,
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
          y: field.y - lineIdx * lineHeight,
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
        y: field.y,
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
