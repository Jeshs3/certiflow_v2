/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { ComDetails, MarriageCertificateData } from '../types/certificate';
import {
  calculateAge,
  formatName,
  formatDateMMMMDDYYYY,
  normalizeNotApplicable,
  toIsoDateInput,
  fromMonthDayYearToIso,
  parseIsoDateToColbParts,
} from '../utils/certificateUtils';
import {
  Save,
  Eye,
  Download,
  RotateCcw,
  Check,
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Copy,
  Clock,
  Home,
  Pencil,
  Lock,
} from 'lucide-react';
import { IconTooltip } from './IconTooltip';
import {
  PhilippineAddressSelector,
  SingleLinePhilippineAddressInput,
  mergeStreetWithBarangay,
} from './PhilippineAddressSelector';

interface MarriageCertificateFormProps {
  data: MarriageCertificateData;
  onChange: (newData: MarriageCertificateData) => void;
  onReset: () => void;
  onBackToDashboard?: () => void;
  onPreview?: () => void;
  onSaveDraft?: () => void;
  onDownloadPDF?: () => void;
  isDownloadingPDF?: boolean;
  isEditingFile?: boolean;
  startUnlocked?: boolean;
}

const getSteps = () => [
  { id: 1, title: "Groom's Information", range: 'Items 1–14 (Husband & Parents)' },
  { id: 2, title: "Bride's Information", range: 'Items 1–14 (Wife & Parents)' },
  { id: 3, title: 'Ceremony, Place & Settlement', range: 'Items 15–18' },
  { id: 4, title: 'Witnesses & Preparation', range: 'Item 20a & Prep' },
  { id: 5, title: 'Form 97 Registry & Signing', range: 'Header, Items 19–22' },
  { id: 6, title: 'Page 2: Affidavits', range: 'Solemnizing Officer & Delayed Reg.' },
] as const;

const TOTAL_STEPS = 6;

const LONG_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function parseIsoDateParts(dateStr: string) {
  if (!dateStr) return { day: '', month: '', year: '' };
  const parts = dateStr.split('-');
  if (parts.length !== 3) return { day: '', month: '', year: '' };
  const year = parts[0];
  const monthIdx = parseInt(parts[1], 10) - 1;
  const month = (LONG_MONTHS[monthIdx] || parts[1]).toUpperCase();
  const day = parts[2];
  return { day, month, year };
}

function computeNumericAgeYears(birthDateStr: string, refDateStr?: string): string {
  if (!birthDateStr) return '';
  const birth = new Date(birthDateStr);
  if (isNaN(birth.getTime())) return '';
  const ref = refDateStr ? new Date(refDateStr) : new Date();
  if (isNaN(ref.getTime()) || ref < birth) return '';

  let years = ref.getFullYear() - birth.getFullYear();
  const m = ref.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && ref.getDate() < birth.getDate())) {
    years -= 1;
  }
  return years >= 0 ? String(years) : '';
}

const inputClass =
  'w-full px-3 py-2 text-sm text-slate-900 bg-white border border-purple-700 rounded-lg focus:outline-none focus:border-purple-900 focus:ring-2 focus:ring-purple-700/20 transition-colors placeholder:text-slate-400 uppercase';

const fieldsetClass =
  'bg-white rounded-xl border border-purple-700/45 px-4 pb-4 pt-2.5 space-y-3';

const legendClass = 'px-2 text-xs font-bold text-purple-800 tracking-tight';

const labelClass = 'block text-[13px] font-medium text-slate-900 mb-1.5';
const subLabelClass = 'block text-[11px] text-slate-500 mt-1';

const shortcutBtnClass =
  'inline-flex items-center gap-1 text-[11px] font-semibold text-purple-800 bg-purple-50 hover:bg-purple-100 border border-purple-700/30 px-2 py-1 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer';

export const MarriageCertificateForm: React.FC<MarriageCertificateFormProps> = ({
  data,
  onChange,
  onReset,
  onBackToDashboard,
  onPreview,
  onSaveDraft,
  onDownloadPDF,
  isDownloadingPDF = false,
  isEditingFile = false,
  startUnlocked = false,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isLocked, setIsLocked] = useState<boolean>(isEditingFile && !startUnlocked);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const formTopRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsLocked(isEditingFile && !startUnlocked);
    if (!isEditingFile || startUnlocked) {
      setCurrentStep(1);
    }
  }, [isEditingFile, startUnlocked]);

  const { groom, bride, marriage, additional, com } = data;

  const currentCom: ComDetails = com || {
    province: marriage.provinceState || '',
    cityMunicipality: marriage.cityMunicipality || '',
    registryNo: '',
    husbandFirstName: groom.firstName || '',
    husbandMiddleName: groom.middleName || '',
    husbandLastName: groom.lastName || '',
    husbandPlaceOfBirth: groom.placeOfBirth || '',
    husbandCitizenship: groom.nationality || '',
    husbandResidence: groom.currentAddress || '',
    wifeFirstName: bride.firstName || '',
    wifeMiddleName: bride.middleName || '',
    wifeLastName: bride.lastName || '',
    wifePlaceOfBirth: bride.placeOfBirth || '',
    wifeCitizenship: bride.nationality || '',
    wifeResidence: bride.currentAddress || '',
    placeOfMarriage: marriage.placeOfMarriage || '',
    marriageSettlement: undefined,
    licenseType: undefined,
    solemnizingOfficerName: marriage.officiantName || '',
  };

  const goToStep = (nextStep: number) => {
    const clamped = Math.max(1, Math.min(TOTAL_STEPS, nextStep));
    setCurrentStep(clamped);
    formTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleSaveClick = () => {
    if (onSaveDraft) {
      onSaveDraft();
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    }
  };

  const COM_PRESERVE_CASE_FIELDS = new Set<keyof ComDetails>([
    'marriageSettlement',
    'marriageTimeAmPm',
    'licenseType',
    'solemnizingQualification',
    'delayedApplicantType',
    'delayedAffiantCivilStatus',
    'delayedCeremonyType',
  ]);

  const updateCom = (field: keyof ComDetails, rawVal: unknown) => {
    const val =
      typeof rawVal === 'string'
        ? COM_PRESERVE_CASE_FIELDS.has(field)
          ? rawVal
          : normalizeNotApplicable(rawVal).toUpperCase()
        : rawVal;
    const nextCom = { ...currentCom, [field]: val };
    if (String(field).startsWith('delayed') && val) {
      nextCom.affidavitDelayedReg = true;
    }
    const nextGroom = { ...groom };
    const nextBride = { ...bride };
    const nextMarriage = { ...marriage };
    const nextAdditional = { ...additional };

    if (typeof val === 'string') {
      if (field === 'husbandFirstName') {
        nextGroom.firstName = val;
        nextGroom.fullName = formatName(val, nextGroom.middleName, nextGroom.lastName);
      } else if (field === 'husbandMiddleName') {
        nextGroom.middleName = val;
        nextGroom.fullName = formatName(nextGroom.firstName, val, nextGroom.lastName);
      } else if (field === 'husbandLastName') {
        nextGroom.lastName = val;
        nextGroom.fullName = formatName(nextGroom.firstName, nextGroom.middleName, val);
      } else if (field === 'husbandCitizenship') {
        nextGroom.nationality = val;
      } else if (field === 'husbandResidence') {
        nextGroom.currentAddress = val;
      } else if (field === 'husbandPlaceOfBirth') {
        nextGroom.placeOfBirth = val;
      } else if (field === 'wifeFirstName') {
        nextBride.firstName = val;
        nextBride.fullName = formatName(val, nextBride.middleName, nextBride.lastName);
      } else if (field === 'wifeMiddleName') {
        nextBride.middleName = val;
        nextBride.fullName = formatName(nextBride.firstName, val, nextBride.lastName);
      } else if (field === 'wifeLastName') {
        nextBride.lastName = val;
        nextBride.fullName = formatName(nextBride.firstName, nextBride.middleName, val);
      } else if (field === 'wifeCitizenship') {
        nextBride.nationality = val;
      } else if (field === 'wifeResidence') {
        nextBride.currentAddress = val;
      } else if (field === 'wifePlaceOfBirth') {
        nextBride.placeOfBirth = val;
      } else if (field === 'province') {
        nextMarriage.provinceState = val;
      } else if (field === 'cityMunicipality') {
        nextMarriage.cityMunicipality = val;
      } else if (field === 'solemnizingOfficerName') {
        nextMarriage.officiantName = val;
      } else if (field === 'marriageTime') {
        nextMarriage.timeOfMarriage = val;
      } else if (field === 'witness1') {
        nextAdditional.witness1Name = val;
      } else if (field === 'witness2') {
        nextAdditional.witness2Name = val;
      } else if (
        field === 'placeOfMarriageVenue' ||
        field === 'placeOfMarriageCity' ||
        field === 'placeOfMarriageProvince'
      ) {
        const venue =
          field === 'placeOfMarriageVenue'
            ? val
            : nextCom.placeOfMarriageVenue ?? nextMarriage.placeOfMarriage ?? '';
        const city =
          field === 'placeOfMarriageCity'
            ? val
            : nextCom.placeOfMarriageCity ?? nextMarriage.cityMunicipality ?? '';
        const prov =
          field === 'placeOfMarriageProvince'
            ? val
            : nextCom.placeOfMarriageProvince ?? nextMarriage.provinceState ?? '';
        nextMarriage.placeOfMarriage = venue;
        nextMarriage.cityMunicipality = city;
        nextMarriage.provinceState = prov;
        nextCom.placeOfMarriage = [venue, city, prov]
          .map((p) => p?.trim())
          .filter(Boolean)
          .join(', ');
      }
    }

    onChange({
      ...data,
      groom: nextGroom,
      bride: nextBride,
      marriage: nextMarriage,
      additional: nextAdditional,
      com: nextCom,
    });
  };

  const updateGroom = (field: keyof typeof groom, rawVal: string) => {
    const val = field === 'dateOfBirth' ? rawVal : normalizeNotApplicable(rawVal).toUpperCase();
    const updated = { ...groom, [field]: val };
    const nextCom: ComDetails = { ...currentCom };

    if (field === 'firstName' || field === 'middleName' || field === 'lastName') {
      const f = field === 'firstName' ? val : groom.firstName;
      const m = field === 'middleName' ? val : groom.middleName;
      const l = field === 'lastName' ? val : groom.lastName;
      updated.fullName = formatName(f, m, l);
      nextCom.husbandFirstName = f;
      nextCom.husbandMiddleName = m;
      nextCom.husbandLastName = l;
    } else if (field === 'dateOfBirth') {
      const { day, month, year } = parseIsoDateParts(val);
      nextCom.husbandDobDay = day;
      nextCom.husbandDobMonth = month;
      nextCom.husbandDobYear = year;
      nextCom.husbandAge = computeNumericAgeYears(val, marriage.dateOfMarriage);
    } else if (field === 'placeOfBirth') {
      nextCom.husbandPlaceOfBirth = val;
    } else if (field === 'nationality') {
      nextCom.husbandCitizenship = val;
    } else if (field === 'currentAddress') {
      nextCom.husbandResidence = val;
    }

    onChange({
      ...data,
      groom: updated,
      com: nextCom,
    });
  };

  const updateBride = (field: keyof typeof bride, rawVal: string) => {
    const val = field === 'dateOfBirth' ? rawVal : normalizeNotApplicable(rawVal).toUpperCase();
    const updated = { ...bride, [field]: val };
    const nextCom: ComDetails = { ...currentCom };

    if (field === 'firstName' || field === 'middleName' || field === 'lastName') {
      const f = field === 'firstName' ? val : bride.firstName;
      const m = field === 'middleName' ? val : bride.middleName;
      const l = field === 'lastName' ? val : bride.lastName;
      updated.fullName = formatName(f, m, l);
      nextCom.wifeFirstName = f;
      nextCom.wifeMiddleName = m;
      nextCom.wifeLastName = l;
    } else if (field === 'dateOfBirth') {
      const { day, month, year } = parseIsoDateParts(val);
      nextCom.wifeDobDay = day;
      nextCom.wifeDobMonth = month;
      nextCom.wifeDobYear = year;
      nextCom.wifeAge = computeNumericAgeYears(val, marriage.dateOfMarriage);
    } else if (field === 'placeOfBirth') {
      nextCom.wifePlaceOfBirth = val;
    } else if (field === 'nationality') {
      nextCom.wifeCitizenship = val;
    } else if (field === 'currentAddress') {
      nextCom.wifeResidence = val;
    }

    onChange({
      ...data,
      bride: updated,
      com: nextCom,
    });
  };

  const updateMarriage = (field: keyof typeof marriage, rawVal: string) => {
    const val = field === 'dateOfMarriage' ? rawVal : normalizeNotApplicable(rawVal).toUpperCase();
    const updated = { ...marriage, [field]: val };
    const nextCom: ComDetails = { ...currentCom };

    if (field === 'dateOfMarriage') {
      const { day, month, year } = parseIsoDateParts(val);
      nextCom.marriageDay = day;
      nextCom.marriageMonth = month;
      nextCom.marriageYear = year;
      if (groom.dateOfBirth) {
        nextCom.husbandAge = computeNumericAgeYears(groom.dateOfBirth, val);
      }
      if (bride.dateOfBirth) {
        nextCom.wifeAge = computeNumericAgeYears(bride.dateOfBirth, val);
      }
    } else if (field === 'timeOfMarriage') {
      nextCom.marriageTime = val;
    } else if (field === 'placeOfMarriage' || field === 'cityMunicipality' || field === 'provinceState') {
      const venue = field === 'placeOfMarriage' ? val : updated.placeOfMarriage;
      const city = field === 'cityMunicipality' ? val : updated.cityMunicipality;
      const prov = field === 'provinceState' ? val : updated.provinceState;
      nextCom.placeOfMarriageVenue = venue;
      nextCom.placeOfMarriageCity = city;
      nextCom.placeOfMarriageProvince = prov;
      nextCom.placeOfMarriage = [venue, city, prov].map((p) => p?.trim()).filter(Boolean).join(', ');
      if (field === 'cityMunicipality') nextCom.cityMunicipality = val;
      if (field === 'provinceState') nextCom.province = val;
    } else if (field === 'officiantName') {
      nextCom.solemnizingOfficerName = val;
    }

    onChange({
      ...data,
      marriage: updated,
      com: nextCom,
    });
  };

  const updateAdditional = (field: keyof typeof additional, rawVal: string) => {
    const val = normalizeNotApplicable(rawVal).toUpperCase();
    const nextCom: ComDetails = { ...currentCom };
    if (field === 'witness1Name') nextCom.witness1 = val;
    if (field === 'witness2Name') nextCom.witness2 = val;

    onChange({
      ...data,
      additional: { ...additional, [field]: val },
      com: nextCom,
    });
  };

  const handleConfirmReset = () => {
    onReset();
    setShowResetConfirm(false);
  };

  const autofillSolemnizingFromPage1 = () => {
    const venue = currentCom.placeOfMarriageVenue || marriage.placeOfMarriage || '';
    const city = currentCom.placeOfMarriageCity || marriage.cityMunicipality || currentCom.cityMunicipality || '';
    const prov = currentCom.placeOfMarriageProvince || marriage.provinceState || currentCom.province || '';
    const lcrPlace = [city, prov].filter(Boolean).join(', ');
    const hName = formatName(groom.firstName, groom.middleName, groom.lastName) || groom.fullName;
    const wName = formatName(bride.firstName, bride.middleName, bride.lastName) || bride.fullName;
    onChange({
      ...data,
      com: {
        ...currentCom,
        affidavitSolemnizingOfficerEnabled: true,
        solemnizingOfficerOffice: currentCom.solemnizingOfficerOffice || venue || currentCom.solemnizingOfficerReligion || '',
        solemnizingOfficerAddress: currentCom.solemnizingOfficerAddress || lcrPlace,
        solemnizingQualification: currentCom.solemnizingQualification || '2a',
        solemnizing2cParty1: currentCom.solemnizing2cParty1 || hName || '',
        solemnizing2cParty2: currentCom.solemnizing2cParty2 || wName || '',
        solemnizingSwornPlace: currentCom.solemnizingSwornPlace || lcrPlace,
        solemnizingJuratPlace: currentCom.solemnizingJuratPlace || lcrPlace,
        solemnizingAdminOfficerName:
          currentCom.solemnizingAdminOfficerName || currentCom.registeredByName || currentCom.receivedByName || '',
        solemnizingAdminOfficerTitle:
          (currentCom.solemnizingAdminOfficerTitle || currentCom.registeredByTitle || 'MUNICIPAL CIVIL REGISTRAR').toUpperCase(),
        solemnizingAdminOfficerAddress: (currentCom.solemnizingAdminOfficerAddress || lcrPlace).toUpperCase(),
      },
    });
  };

  const autofillDelayedFromPage1 = () => {
    const hName = formatName(groom.firstName, groom.middleName, groom.lastName) || groom.fullName;
    const wName = formatName(bride.firstName, bride.middleName, bride.lastName) || bride.fullName;
    const venue = currentCom.placeOfMarriageVenue || marriage.placeOfMarriage || '';
    const city = currentCom.placeOfMarriageCity || marriage.cityMunicipality || currentCom.cityMunicipality || '';
    const prov = currentCom.placeOfMarriageProvince || marriage.provinceState || currentCom.province || '';
    const fullPlace = [venue, city, prov].filter(Boolean).join(', ').toUpperCase() || (currentCom.placeOfMarriage || '').toUpperCase();
    const lcrPlace = [city, prov].filter(Boolean).join(', ').toUpperCase();
    const cTypeLower = (marriage.ceremonyType || '').toLowerCase();
    const inferredCeremony: 'religious' | 'civil' | 'muslim' | 'tribal' =
      cTypeLower.includes('relig') || cTypeLower.includes('church') || cTypeLower.includes('catholic')
        ? 'religious'
        : cTypeLower.includes('muslim') || cTypeLower.includes('islam')
        ? 'muslim'
        : cTypeLower.includes('tribal') || cTypeLower.includes('ethnic')
        ? 'tribal'
        : 'civil';

    onChange({
      ...data,
      com: {
        ...currentCom,
        affidavitDelayedReg: true,
        delayedAffiantName: (currentCom.delayedAffiantName || hName || wName || '').toUpperCase(),
        delayedAffiantCivilStatus: currentCom.delayedAffiantCivilStatus || 'married',
        delayedAffiantResidence:
          (currentCom.delayedAffiantResidence || currentCom.husbandResidence || groom.currentAddress || '').toUpperCase(),
        delayedSpouseName: (currentCom.delayedSpouseName || wName || '').toUpperCase(),
        delayedMarriagePlace: (currentCom.delayedMarriagePlace || fullPlace).toUpperCase(),
        delayedMarriageDate: currentCom.delayedMarriageDate || formatDateMMMMDDYYYY(marriage.dateOfMarriage),
        delayedCeremonyType: currentCom.delayedCeremonyType || inferredCeremony,
        delayedApplicantCitizenship:
          (currentCom.delayedApplicantCitizenship || currentCom.husbandCitizenship || groom.nationality || 'FILIPINO').toUpperCase(),
        delayedSpouseCitizenship:
          (currentCom.delayedSpouseCitizenship || currentCom.wifeCitizenship || bride.nationality || 'FILIPINO').toUpperCase(),
        delayedHusbandCitizenship:
          (currentCom.delayedHusbandCitizenship || currentCom.husbandCitizenship || groom.nationality || 'FILIPINO').toUpperCase(),
        delayedWifeCitizenship:
          (currentCom.delayedWifeCitizenship || currentCom.wifeCitizenship || bride.nationality || 'FILIPINO').toUpperCase(),
        delayedSwornPlace: (currentCom.delayedSwornPlace || lcrPlace).toUpperCase(),
        delayedAdminOfficerName:
          (currentCom.delayedAdminOfficerName || currentCom.registeredByName || currentCom.receivedByName || '').toUpperCase(),
        delayedAdminOfficerTitle:
          (currentCom.delayedAdminOfficerTitle || currentCom.registeredByTitle || 'MUNICIPAL CIVIL REGISTRAR').toUpperCase(),
        delayedAdminOfficerAddress: (currentCom.delayedAdminOfficerAddress || lcrPlace).toUpperCase(),
      },
    });
  };

  const groomAge = calculateAge(groom.dateOfBirth, marriage.dateOfMarriage);
  const brideAge = calculateAge(bride.dateOfBirth, marriage.dateOfMarriage);

  const getConsentNameParts = (side: 'husband' | 'wife') => {
    const first =
      side === 'husband' ? currentCom.husbandConsentFirstName : currentCom.wifeConsentFirstName;
    const middle =
      side === 'husband' ? currentCom.husbandConsentMiddleName : currentCom.wifeConsentMiddleName;
    const last =
      side === 'husband' ? currentCom.husbandConsentLastName : currentCom.wifeConsentLastName;
    const legacy =
      side === 'husband' ? currentCom.husbandConsentPerson : currentCom.wifeConsentPerson;

    if (first !== undefined || middle !== undefined || last !== undefined) {
      return {
        first: first ?? '',
        middle: middle ?? '',
        last: last ?? '',
      };
    }
    const trimmed = normalizeNotApplicable((legacy || '').trim()).trim().toUpperCase();
    if (!trimmed) return { first: '', middle: '', last: '' };
    if (trimmed === 'N/A') return { first: '', middle: 'N/A', last: '' };
    const tokens = trimmed.split(/\s+/).filter(Boolean);
    if (tokens.length === 1) return { first: tokens[0], middle: '', last: '' };
    if (tokens.length === 2) return { first: tokens[0], middle: '', last: tokens[1] };
    return {
      first: tokens[0],
      middle: tokens.slice(1, -1).join(' '),
      last: tokens[tokens.length - 1],
    };
  };

  const updateConsentNamePart = (
    side: 'husband' | 'wife',
    part: 'first' | 'middle' | 'last',
    rawVal: string
  ) => {
    const currentParts = getConsentNameParts(side);
    const cleaned = normalizeNotApplicable(rawVal).toUpperCase();
    const nextParts = {
      ...currentParts,
      [part]: cleaned,
    };
    const combined =
      !nextParts.first.trim() &&
      !nextParts.last.trim() &&
      nextParts.middle.trim().toUpperCase() === 'N/A'
        ? 'N/A'
        : formatName(nextParts.first, nextParts.middle, nextParts.last);

    onChange({
      ...data,
      com: {
        ...currentCom,
        ...(side === 'husband'
          ? {
              husbandConsentFirstName: nextParts.first,
              husbandConsentMiddleName: nextParts.middle,
              husbandConsentLastName: nextParts.last,
              husbandConsentPerson: combined,
            }
          : {
              wifeConsentFirstName: nextParts.first,
              wifeConsentMiddleName: nextParts.middle,
              wifeConsentLastName: nextParts.last,
              wifeConsentPerson: combined,
            }),
      },
    });
  };

  const renderTimeOfMarriageControl = () => {
    const rawTime = currentCom.marriageTime || marriage.timeOfMarriage || '';
    const timePeriod: 'AM' | 'PM' = /\bpm\b/i.test(rawTime)
      ? 'PM'
      : /\bam\b/i.test(rawTime)
      ? 'AM'
      : currentCom.marriageTimeAmPm === 'pm'
      ? 'PM'
      : 'AM';
    const timeDigits = rawTime.replace(/\s*\b(am|pm)\b\s*$/i, '');

    const commitTime = (nextDigits: string, nextPeriod: 'AM' | 'PM') => {
      const cleanedDigits = nextDigits.replace(/\b(am|pm)\b/gi, '').trim().toUpperCase();
      const composed = cleanedDigits ? `${cleanedDigits} ${nextPeriod}` : '';
      onChange({
        ...data,
        marriage: { ...marriage, timeOfMarriage: composed },
        com: {
          ...currentCom,
          marriageTime: composed,
          marriageTimeAmPm: nextPeriod.toLowerCase() as 'am' | 'pm',
        },
      });
    };

    return (
      // <div className="flex items-center gap-2">
      //   <input
      //     type="text"
      //     value={timeDigits}
      //     onChange={(e) => commitTime(e.target.value, timePeriod)}
      //     placeholder="07:35"
      //     className={`${inputClass} flex-1 min-w-0`}
      //   />
      //   <select
      //     aria-label="Time of marriage AM/PM"
      //     value={timePeriod}
      //     onChange={(e) => commitTime(timeDigits, e.target.value === 'PM' ? 'PM' : 'AM')}
      //     className={`${inputClass} w-24 shrink-0 cursor-pointer`}
      //   >
      //     <option value="AM">AM</option>
      //     <option value="PM">PM</option>
      //   </select>
      // </div>


     <div className="flex w-full items-center gap-2">
  <input
    type="text"
    value={timeDigits}
    onChange={(e) => commitTime(e.target.value, timePeriod)}
    placeholder="07:35"
    className={`${inputClass} !w-0 flex-1 min-w-0`}
  />

  <select
    aria-label="Time of marriage AM/PM"
    value={timePeriod}
    onChange={(e) =>
      commitTime(timeDigits, e.target.value === 'PM' ? 'PM' : 'AM')
    }
    className={`${inputClass} !w-[75px] !shrink-0 cursor-pointer`}
  >
    <option value="AM">AM</option>
    <option value="PM">PM</option>
  </select>
</div>

    );
  };

  const updateWitnessWhereofDate = (isoVal: string) => {
    const { day, month, year } = parseIsoDateParts(isoVal);
    onChange({
      ...data,
      com: {
        ...currentCom,
        witnessWhereofDate: isoVal ? formatDateMMMMDDYYYY(isoVal) : '',
        witnessWhereofDay: day,
        witnessWhereofMonth: month,
        witnessWhereofYear: year,
      },
    });
  };

  const steps = getSteps();
  const activeStepMeta = steps[currentStep - 1];
  const progressPercent = Math.round((currentStep / TOTAL_STEPS) * 100);

  return (
    <div ref={formTopRef} className="space-y-3.5 scroll-mt-20">
      <datalist id="com-civil-status-options">
        <option value="SINGLE" />
        <option value="WIDOWED" />
        <option value="DIVORCED" />
        <option value="ANNULLED" />
      </datalist>

      {/* Home Button Above Form */}
      {onBackToDashboard && (
        <div className="flex items-center">
          <button
            type="button"
            onClick={onBackToDashboard}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 hover:text-slate-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-700"
          >
            <Home className="w-3.5 h-3.5 text-purple-700" />
            <span>Home</span>
          </button>
        </div>
      )}

      {/* Google Form Style Title Card */}
      <div className="bg-white rounded-xl border border-purple-700/40 border-t-[5px] border-t-purple-700 p-4 sm:p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight leading-snug">
              Certificate of Marriage Form Registry
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Municipal Form No. 97 (August 2016)
            </p>
          </div>

          {/* Top-right Action Icon Sequence: Save Draft, (Edit when draft open), Preview, Download, Reset */}
          <div className="flex items-center gap-1.5 shrink-0">
            <IconTooltip label={isSaved ? 'Saved Draft' : 'Save Draft'} placement="bottom" align="center">
              <button
                type="button"
                onClick={handleSaveClick}
                disabled={!onSaveDraft}
                aria-label="Save Draft"
                className={`w-9 h-9 rounded-lg border flex items-center justify-center transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-700 ${
                  isSaved
                    ? 'bg-purple-50 border-purple-700 text-purple-800'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                {isSaved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              </button>
            </IconTooltip>

            {isEditingFile && (
              <IconTooltip
                label={isLocked ? 'Edit Certificate (Page 1 & Page 2)' : 'Lock Registry Table'}
                placement="bottom"
                align="center"
              >
                <button
                  type="button"
                  onClick={() => setIsLocked((prev) => !prev)}
                  aria-label={isLocked ? 'Edit Certificate (Page 1 & Page 2)' : 'Lock Registry Table'}
                  className={`w-9 h-9 rounded-lg border flex items-center justify-center transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D4ED8] ${
                    isLocked
                      ? 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      : 'bg-[#1D4ED8] border-[#1D4ED8] text-white hover:bg-[#1E40AF]'
                  }`}
                >
                  {isLocked ? <Pencil className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                </button>
              </IconTooltip>
            )}

            <IconTooltip label="Preview Certificate" placement="bottom" align="center">
              <button
                type="button"
                onClick={() => onPreview?.()}
                aria-label="Preview Certificate"
                className="w-9 h-9 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-700"
              >
                <Eye className="w-4 h-4" />
              </button>
            </IconTooltip>

            <IconTooltip label="Download PDF (2 Pages)" placement="bottom" align="center">
              <button
                type="button"
                onClick={() => onDownloadPDF?.()}
                disabled={isDownloadingPDF}
                aria-label="Download PDF"
                className="w-9 h-9 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 flex items-center justify-center transition-colors disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-700"
              >
                {isDownloadingPDF ? (
                  <Loader2 className="w-4 h-4 animate-spin text-purple-700" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
              </button>
            </IconTooltip>

            <IconTooltip
              label={isEditingFile ? 'Reset disabled on saved drafts' : 'Reset Form'}
              placement="bottom"
              align="right"
            >
              <button
                type="button"
                disabled={isEditingFile}
                onClick={() => setShowResetConfirm(true)}
                aria-label="Reset Form"
                className="w-9 h-9 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 flex items-center justify-center transition-colors disabled:opacity-40 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </IconTooltip>
          </div>
        </div>

        {/* Progress Indicator, Quick-Step Pills, or Locked Record Banner */}
        {isEditingFile && isLocked ? (
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
            <span className="inline-flex items-center gap-1.5 font-semibold text-slate-700">
              <Lock className="w-3.5 h-3.5 text-[#1D4ED8]" />
              <span>Locked Registry Table</span>
            </span>
            <button
              type="button"
              onClick={() => setIsLocked(false)}
              className="inline-flex items-center gap-1 text-[#1D4ED8] hover:underline font-semibold cursor-pointer"
            >
              <Pencil className="w-3 h-3" />
              <span>Edit Page 1 &amp; Page 2</span>
            </button>
          </div>
        ) : (
          <div className="space-y-2.5 pt-2 border-t border-slate-100">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs gap-2">
                <span className="font-semibold text-slate-800 truncate">{activeStepMeta.title}</span>
                <span className="text-slate-500 tabular-nums shrink-0">
                  Step {currentStep} of {TOTAL_STEPS} &middot; {activeStepMeta.range}
                </span>
              </div>
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-700 transition-all duration-200 rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Step Quick-Nav Pills */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1">
              {steps.map((s) => {
                const isActive = currentStep === s.id;
                const shortLabel =
                  s.id === 1
                    ? '1. Groom'
                    : s.id === 2
                    ? '2. Bride'
                    : s.id === 3
                    ? '3. Ceremony'
                    : s.id === 4
                    ? '4. Witnesses'
                    : s.id === 5
                    ? '5. Registry'
                    : '6. Page 2';
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => goToStep(s.id)}
                    className={`px-2 py-1 rounded-md text-[11px] font-semibold border transition-colors truncate cursor-pointer ${
                      isActive
                        ? 'bg-purple-700 text-white border-purple-700'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-purple-50 hover:text-purple-800 hover:border-purple-700/40'
                    }`}
                  >
                    {shortLabel}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* =================================================================== */}
      {/* LOCKED DRAFT VIEW: READ-ONLY TABLE SUMMARY                          */}
      {/* =================================================================== */}
      {isEditingFile && isLocked && (
        <div className="bg-white rounded-xl border border-purple-700/45 overflow-hidden">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                <th className="py-2.5 px-4 font-semibold w-[42%]">Field</th>
                <th className="py-2.5 px-4 font-semibold w-[58%]">Recorded Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[
                {
                  section: 'Registry Header',
                  rows: [
                    ['Province', currentCom.province || marriage.provinceState],
                    ['City / Municipality', currentCom.cityMunicipality || marriage.cityMunicipality],
                    ['Registry No.', currentCom.registryNo],
                  ],
                },
                {
                  section: "Husband / Groom's Information (Items 1–14)",
                  rows: [
                    [
                      '1. Full Name',
                      formatName(groom.firstName, groom.middleName, groom.lastName) || groom.fullName,
                    ],
                    ['2a. Date of Birth', formatDateMMMMDDYYYY(groom.dateOfBirth)],
                    ['2b. Age at Marriage', currentCom.husbandAge],
                    ['3. Place of Birth', groom.placeOfBirth],
                    ['4b. Citizenship', currentCom.husbandCitizenship || groom.nationality],
                    ['5. Residence', currentCom.husbandResidence || groom.currentAddress],
                    ['6. Religion / Sect', currentCom.husbandReligion],
                    ['7. Civil Status', currentCom.husbandCivilStatus],
                    [
                      '8. Father Name',
                      formatName(
                        currentCom.husbandFatherFirstName || '',
                        currentCom.husbandFatherMiddleName || '',
                        currentCom.husbandFatherLastName || ''
                      ),
                    ],
                    ['9. Father Citizenship', currentCom.husbandFatherCitizenship],
                    [
                      '10. Mother Maiden Name',
                      formatName(
                        currentCom.husbandMotherMaidenFirstName || '',
                        currentCom.husbandMotherMaidenMiddleName || '',
                        currentCom.husbandMotherMaidenLastName || ''
                      ),
                    ],
                    ['11. Mother Citizenship', currentCom.husbandMotherCitizenship],
                    [
                      '12–14. Consent / Wali',
                      (() => {
                        const p = getConsentNameParts('husband');
                        const fullConsent =
                          !p.first.trim() && !p.last.trim() && p.middle.trim().toUpperCase() === 'N/A'
                            ? 'N/A'
                            : formatName(p.first, p.middle, p.last);
                        return (
                          [
                            fullConsent,
                            currentCom.husbandConsentRelationship,
                            currentCom.husbandConsentResidence,
                          ]
                            .filter(Boolean)
                            .join(' · ') || 'N/A'
                        );
                      })(),
                    ],
                  ],
                },
                {
                  section: "Wife / Bride's Information (Items 1–14)",
                  rows: [
                    [
                      '1. Full Name',
                      formatName(bride.firstName, bride.middleName, bride.lastName) || bride.fullName,
                    ],
                    ['2a. Date of Birth', formatDateMMMMDDYYYY(bride.dateOfBirth)],
                    ['2b. Age at Marriage', currentCom.wifeAge],
                    ['3. Place of Birth', bride.placeOfBirth],
                    ['4b. Citizenship', currentCom.wifeCitizenship || bride.nationality],
                    ['5. Residence', currentCom.wifeResidence || bride.currentAddress],
                    ['6. Religion / Sect', currentCom.wifeReligion],
                    ['7. Civil Status', currentCom.wifeCivilStatus],
                    [
                      '8. Father Name',
                      formatName(
                        currentCom.wifeFatherFirstName || '',
                        currentCom.wifeFatherMiddleName || '',
                        currentCom.wifeFatherLastName || ''
                      ),
                    ],
                    ['9. Father Citizenship', currentCom.wifeFatherCitizenship],
                    [
                      '10. Mother Maiden Name',
                      formatName(
                        currentCom.wifeMotherMaidenFirstName || '',
                        currentCom.wifeMotherMaidenMiddleName || '',
                        currentCom.wifeMotherMaidenLastName || ''
                      ),
                    ],
                    ['11. Mother Citizenship', currentCom.wifeMotherCitizenship],
                    [
                      '12–14. Consent / Wali',
                      (() => {
                        const p = getConsentNameParts('wife');
                        const fullConsent =
                          !p.first.trim() && !p.last.trim() && p.middle.trim().toUpperCase() === 'N/A'
                            ? 'N/A'
                            : formatName(p.first, p.middle, p.last);
                        return (
                          [
                            fullConsent,
                            currentCom.wifeConsentRelationship,
                            currentCom.wifeConsentResidence,
                          ]
                            .filter(Boolean)
                            .join(' · ') || 'N/A'
                        );
                      })(),
                    ],
                  ],
                },
                {
                  section: 'Ceremony, Place & Settlement (Items 15–18)',
                  rows: [
                    [
                      '15. Place of Marriage',
                      [
                        currentCom.placeOfMarriageVenue || marriage.placeOfMarriage,
                        currentCom.placeOfMarriageCity || marriage.cityMunicipality,
                        currentCom.placeOfMarriageProvince || marriage.provinceState,
                      ]
                        .filter(Boolean)
                        .join(', ') || currentCom.placeOfMarriage,
                    ],
                    ['16. Date of Marriage', formatDateMMMMDDYYYY(marriage.dateOfMarriage)],
                    [
                      '17. Time of Marriage',
                      currentCom.marriageTime
                        ? /\b(am|pm)\b/i.test(currentCom.marriageTime)
                          ? currentCom.marriageTime
                          : `${currentCom.marriageTime} ${(currentCom.marriageTimeAmPm || '').toUpperCase()}`.trim()
                        : marriage.timeOfMarriage || '',
                    ],
                    [
                      '18. Marriage Settlement',
                      currentCom.marriageSettlement === 'entered'
                        ? 'ENTERED INTO A MARRIAGE SETTLEMENT'
                        : currentCom.marriageSettlement === 'not_entered'
                        ? 'NOT ENTERED INTO A MARRIAGE SETTLEMENT'
                        : '',
                    ],
                    [
                      '18. In Witness Whereof Date',
                      formatDateMMMMDDYYYY(
                        currentCom.witnessWhereofDate ||
                          fromMonthDayYearToIso(
                            currentCom.witnessWhereofMonth,
                            currentCom.witnessWhereofDay,
                            currentCom.witnessWhereofYear
                          )
                      ),
                    ],
                    ['Ceremony Type', marriage.ceremonyType],
                  ],
                },
                {
                  section: 'License, Solemnizing Officer, Witnesses & LCRO (Items 19–22)',
                  rows: [
                    [
                      '19a–c. License / Legal Basis',
                      currentCom.licenseType === 'license'
                        ? [
                            currentCom.marriageLicenseNo && `LICENSE NO. ${currentCom.marriageLicenseNo}`,
                            formatDateMMMMDDYYYY(currentCom.licenseIssuedDate),
                            currentCom.licenseIssuedPlace,
                          ]
                            .filter(Boolean)
                            .join(' · ') || 'WITH MARRIAGE LICENSE'
                        : currentCom.licenseType === 'art_209'
                        ? `ART. ${currentCom.art209Specify || ''} OF E.O. 209`.trim()
                        : currentCom.licenseType === 'pd_1083'
                        ? 'UNDER P.D. NO. 1083'
                        : '',
                    ],
                    [
                      '19. Solemnizing Officer',
                      [
                        currentCom.solemnizingOfficerName || marriage.officiantName,
                        currentCom.solemnizingOfficerPosition,
                        currentCom.solemnizingOfficerReligion,
                        currentCom.solemnizingOfficerRegistryNo,
                      ]
                        .filter(Boolean)
                        .join(' · '),
                    ],
                    [
                      '20a–b. Witnesses',
                      [
                        currentCom.witness1 || additional.witness1Name,
                        currentCom.witness2 || additional.witness2Name,
                        currentCom.witness3,
                        currentCom.witness4,
                        currentCom.witness5,
                        currentCom.witness6,
                        currentCom.witness7,
                        currentCom.witness8,
                      ]
                        .filter(Boolean)
                        .join(', '),
                    ],
                    [
                      '21. Received By (LCRO)',
                      [
                        currentCom.receivedByName,
                        currentCom.receivedByTitle,
                        formatDateMMMMDDYYYY(currentCom.receivedByDate),
                      ]
                        .filter(Boolean)
                        .join(' · '),
                    ],
                    [
                      '22. Registered By',
                      [
                        currentCom.registeredByName,
                        currentCom.registeredByTitle,
                        formatDateMMMMDDYYYY(currentCom.registeredByDate),
                      ]
                        .filter(Boolean)
                        .join(' · '),
                    ],
                    ['Remarks / Annotations', currentCom.remarksAnnotation || marriage.remarks],
                  ],
                },
                ...(currentCom.affidavitSolemnizingOfficerEnabled !== false || currentCom.affidavitDelayedReg
                  ? [
                      {
                        section: 'Page 2 Affidavits',
                        rows: [
                          ...(currentCom.affidavitSolemnizingOfficerEnabled !== false
                            ? [
                                [
                                  'Solemnizing Officer Affidavit',
                                  [
                                    currentCom.solemnizingOfficerName || marriage.officiantName,
                                    currentCom.solemnizingQualification &&
                                      `Item ${currentCom.solemnizingQualification}`,
                                    currentCom.solemnizingAdminOfficerName,
                                  ]
                                    .filter(Boolean)
                                    .join(' · ') || 'Enabled',
                                ],
                              ]
                            : []),
                          ...(currentCom.affidavitDelayedReg
                            ? [
                                [
                                  'Delayed Registration',
                                  [
                                    currentCom.delayedAffiantName,
                                    currentCom.delayedReason,
                                    currentCom.delayedAdminOfficerName,
                                  ]
                                    .filter(Boolean)
                                    .join(' · ') || 'Enabled',
                                ],
                              ]
                            : []),
                        ],
                      },
                    ]
                  : []),
              ].map((group) => (
                <React.Fragment key={group.section}>
                  <tr className="bg-purple-50/70 border-y border-purple-200/70">
                    <th
                      colSpan={2}
                      className="py-2 px-4 text-[11px] font-bold text-purple-900 tracking-tight"
                    >
                      {group.section}
                    </th>
                  </tr>
                  {group.rows.map(([fieldLabel, fieldValue]) => (
                    <tr key={fieldLabel} className="hover:bg-slate-50/60">
                      <td className="py-2 px-4 text-slate-500 font-medium align-top">
                        {fieldLabel}
                      </td>
                      <td className="py-2 px-4 text-slate-900 font-medium tabular-nums break-words uppercase">
                        {fieldValue ? String(fieldValue).toUpperCase() : <span className="text-slate-300">—</span>}
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* =================================================================== */}
      {/* STEP 1: GROOM'S / HUSBAND'S INFORMATION (ITEMS 1–14)                */}
      {/* =================================================================== */}
      {!(isEditingFile && isLocked) && currentStep === 1 && (
        <div className="space-y-3.5">
          <fieldset className={fieldsetClass}>
            <legend className={legendClass}>
              Item 1: Husband / Groom&apos;s Name <span className="text-rose-600">*</span>
            </legend>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <input
                  type="text"
                  value={groom.firstName ?? ''}
                  onChange={(e) => updateGroom('firstName', e.target.value)}
                  placeholder="e.g. JUAN CARLOS"
                  className={`${inputClass} uppercase`}
                />
                <span className={subLabelClass}>First Name *</span>
              </div>
              <div>
                <input
                  type="text"
                  value={groom.middleName ?? ''}
                  onChange={(e) => updateGroom('middleName', e.target.value)}
                  placeholder="e.g. MENDOZA"
                  className={`${inputClass} uppercase`}
                />
                <span className={subLabelClass}>Middle Name</span>
              </div>
              <div>
                <input
                  type="text"
                  value={groom.lastName ?? ''}
                  onChange={(e) => updateGroom('lastName', e.target.value)}
                  placeholder="e.g. DELA CRUZ"
                  className={`${inputClass} uppercase`}
                />
                <span className={subLabelClass}>Last Name *</span>
              </div>
            </div>
          </fieldset>

          <fieldset className={fieldsetClass}>
            <legend className={legendClass}>Items 2–7: Birth, Citizenship, Residence, Religion &amp; Civil Status</legend>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[13px] font-medium text-slate-900">
                    2a. Date of Birth <span className="text-rose-600">*</span>
                  </label>
                  {groomAge && (
                    <span className="text-[10px] font-semibold text-purple-800 bg-purple-50 border border-purple-700/30 px-1.5 py-0.5 rounded">
                      {groomAge}
                    </span>
                  )}
                </div>
                <input
                  type="date"
                  value={toIsoDateInput(groom.dateOfBirth)}
                  onChange={(e) => updateGroom('dateOfBirth', e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>2b. Age at Marriage</label>
                <input
                  type="text"
                  value={currentCom.husbandAge ?? ''}
                  onChange={(e) => updateCom('husbandAge', e.target.value)}
                  placeholder="e.g. 28"
                  className={inputClass}
                />
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className={labelClass}>3. Place of Birth</label>
                <SingleLinePhilippineAddressInput
                  variant="com"
                  showBarangay={false}
                  showStreet={false}
                  showCountry={true}
                  includeCountry={true}
                  value={groom.placeOfBirth ?? ''}
                  onChange={(nextVal) => updateGroom('placeOfBirth', nextVal)}
                />
              </div>

              <div>
                <label className={labelClass}>4b. Citizenship (4a. Sex: MALE)</label>
                <input
                  type="text"
                  value={currentCom.husbandCitizenship ?? groom.nationality ?? ''}
                  onChange={(e) => updateCom('husbandCitizenship', e.target.value)}
                  placeholder="e.g. Filipino"
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>5. Residence</label>
              <SingleLinePhilippineAddressInput
                variant="com"
                showBarangay={true}
                showStreet={true}
                includeCountry={true}
                value={currentCom.husbandResidence ?? groom.currentAddress ?? ''}
                onChange={(nextVal) => updateCom('husbandResidence', nextVal)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>6. Religion / Religious Sect</label>
                <input
                  type="text"
                  value={currentCom.husbandReligion ?? ''}
                  onChange={(e) => updateCom('husbandReligion', e.target.value)}
                  placeholder="e.g. Roman Catholic"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>7. Civil Status</label>
                <input
                  type="text"
                  list="com-civil-status-options"
                  value={currentCom.husbandCivilStatus ?? ''}
                  onChange={(e) => updateCom('husbandCivilStatus', e.target.value)}
                  placeholder="e.g. Single"
                  className={inputClass}
                />
              </div>
            </div>
          </fieldset>

          <fieldset className={fieldsetClass}>
            <legend className={legendClass}>Items 8–11: Groom&apos;s Parents&apos; Particulars</legend>
            <div>
              <span className="block text-xs font-semibold text-slate-800 mb-1.5">
                8. Name of Father
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <input
                    type="text"
                    value={currentCom.husbandFatherFirstName ?? ''}
                    onChange={(e) => updateCom('husbandFatherFirstName', e.target.value)}
                    placeholder="e.g. ROBERTO"
                    className={`${inputClass} uppercase`}
                  />
                  <span className={subLabelClass}>First Name</span>
                </div>
                <div>
                  <input
                    type="text"
                    value={currentCom.husbandFatherMiddleName ?? ''}
                    onChange={(e) => updateCom('husbandFatherMiddleName', e.target.value)}
                    placeholder="e.g. GARCIA"
                    className={`${inputClass} uppercase`}
                  />
                  <span className={subLabelClass}>Middle Name</span>
                </div>
                <div>
                  <input
                    type="text"
                    value={currentCom.husbandFatherLastName ?? ''}
                    onChange={(e) => updateCom('husbandFatherLastName', e.target.value)}
                    placeholder="e.g. DELA CRUZ"
                    className={`${inputClass} uppercase`}
                  />
                  <span className={subLabelClass}>Last Name</span>
                </div>
              </div>
            </div>

            <div>
              <label className={labelClass}>9. Father&apos;s Citizenship</label>
              <input
                type="text"
                value={currentCom.husbandFatherCitizenship ?? ''}
                onChange={(e) => updateCom('husbandFatherCitizenship', e.target.value)}
                placeholder="e.g. Filipino"
                className={inputClass}
              />
            </div>

            <div className="pt-1 border-t border-slate-100">
              <span className="block text-xs font-semibold text-slate-800 mb-1.5">
                10. Maiden Name of Mother
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <input
                    type="text"
                    value={currentCom.husbandMotherMaidenFirstName ?? ''}
                    onChange={(e) => updateCom('husbandMotherMaidenFirstName', e.target.value)}
                    placeholder="e.g. TERESA"
                    className={`${inputClass} uppercase`}
                  />
                  <span className={subLabelClass}>First Name</span>
                </div>
                <div>
                  <input
                    type="text"
                    value={currentCom.husbandMotherMaidenMiddleName ?? ''}
                    onChange={(e) => updateCom('husbandMotherMaidenMiddleName', e.target.value)}
                    placeholder="e.g. CASTRO"
                    className={`${inputClass} uppercase`}
                  />
                  <span className={subLabelClass}>Middle Name</span>
                </div>
                <div>
                  <input
                    type="text"
                    value={currentCom.husbandMotherMaidenLastName ?? ''}
                    onChange={(e) => updateCom('husbandMotherMaidenLastName', e.target.value)}
                    placeholder="e.g. MENDOZA"
                    className={`${inputClass} uppercase`}
                  />
                  <span className={subLabelClass}>Maiden Last Name</span>
                </div>
              </div>
            </div>

            <div>
              <label className={labelClass}>11. Mother&apos;s Citizenship</label>
              <input
                type="text"
                value={currentCom.husbandMotherCitizenship ?? ''}
                onChange={(e) => updateCom('husbandMotherCitizenship', e.target.value)}
                placeholder="e.g. Filipino"
                className={inputClass}
              />
            </div>
          </fieldset>

          <fieldset className={fieldsetClass}>
            <legend className={legendClass}>
              Items 12–14: Person / Wali Who Gave Consent or Advice (If Applicable)
            </legend>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-slate-500">
                Fill if groom is 18–25 yrs old or requires consent/advice; otherwise N/A applies.
              </p>
              <button
                type="button"
                onClick={() =>
                  onChange({
                    ...data,
                    com: {
                      ...currentCom,
                      husbandConsentFirstName: '',
                      husbandConsentMiddleName: 'N/A',
                      husbandConsentLastName: '',
                      husbandConsentPerson: 'N/A',
                      husbandConsentRelationship: 'N/A',
                      husbandConsentResidence: 'N/A',
                    },
                  })
                }
                className={shortcutBtnClass}
              >
                <span>Set N/A</span>
              </button>
            </div>
            {(() => {
              const hConsent = getConsentNameParts('husband');
              return (
                <div>
                  <span className="block text-[13px] font-medium text-slate-900 mb-1.5">
                    12. Name of Person / Wali
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <input
                        type="text"
                        value={hConsent.first}
                        onChange={(e) => updateConsentNamePart('husband', 'first', e.target.value)}
                        placeholder="e.g. JUAN CARLOS"
                        className={`${inputClass} uppercase`}
                      />
                      <span className={subLabelClass}>First Name</span>
                    </div>
                    <div>
                      <input
                        type="text"
                        value={hConsent.middle}
                        onChange={(e) => updateConsentNamePart('husband', 'middle', e.target.value)}
                        placeholder="e.g. GARCIA"
                        className={`${inputClass} uppercase`}
                      />
                      <span className={subLabelClass}>Middle Name</span>
                    </div>
                    <div>
                      <input
                        type="text"
                        value={hConsent.last}
                        onChange={(e) => updateConsentNamePart('husband', 'last', e.target.value)}
                        placeholder="e.g. DELA CRUZ"
                        className={`${inputClass} uppercase`}
                      />
                      <span className={subLabelClass}>Last Name</span>
                    </div>
                  </div>
                </div>
              );
            })()}

            <div>
              <label className={labelClass}>13. Relationship</label>
              <input
                type="text"
                value={currentCom.husbandConsentRelationship ?? ''}
                onChange={(e) => updateCom('husbandConsentRelationship', e.target.value)}
                placeholder="e.g. Father / Mother / Guardian"
                className={inputClass}
              />
            </div>

            <div>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <label className="block text-[13px] font-medium text-slate-900">
                  14. Residence of Person / Wali
                </label>
                <button
                  type="button"
                  onClick={() =>
                    updateCom('husbandConsentResidence', currentCom.husbandResidence || groom.currentAddress || '')
                  }
                  className={shortcutBtnClass}
                >
                  <Copy className="w-3 h-3" />
                  <span>Same as Groom&apos;s Residence</span>
                </button>
              </div>
              <SingleLinePhilippineAddressInput
                variant="com"
                showBarangay={true}
                showStreet={true}
                includeCountry={true}
                value={currentCom.husbandConsentResidence ?? ''}
                onChange={(nextVal) => updateCom('husbandConsentResidence', nextVal)}
              />
            </div>
          </fieldset>
        </div>
      )}

      {/* =================================================================== */}
      {/* STEP 2: BRIDE'S / WIFE'S INFORMATION (ITEMS 1–14)                   */}
      {/* =================================================================== */}
      {!(isEditingFile && isLocked) && currentStep === 2 && (
        <div className="space-y-3.5">
          <fieldset className={fieldsetClass}>
            <legend className={legendClass}>
              Item 1: Wife / Bride&apos;s Name <span className="text-rose-600">*</span>
            </legend>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <input
                  type="text"
                  value={bride.firstName ?? ''}
                  onChange={(e) => updateBride('firstName', e.target.value)}
                  placeholder="e.g. MARIA CLARA"
                  className={`${inputClass} uppercase`}
                />
                <span className={subLabelClass}>First Name *</span>
              </div>
              <div>
                <input
                  type="text"
                  value={bride.middleName ?? ''}
                  onChange={(e) => updateBride('middleName', e.target.value)}
                  placeholder="e.g. BAUTISTA"
                  className={`${inputClass} uppercase`}
                />
                <span className={subLabelClass}>Middle Name</span>
              </div>
              <div>
                <input
                  type="text"
                  value={bride.lastName ?? ''}
                  onChange={(e) => updateBride('lastName', e.target.value)}
                  placeholder="e.g. SANTOS"
                  className={`${inputClass} uppercase`}
                />
                <span className={subLabelClass}>Last Name *</span>
              </div>
            </div>
          </fieldset>

          <fieldset className={fieldsetClass}>
            <legend className={legendClass}>Items 2–7: Birth, Citizenship, Residence, Religion &amp; Civil Status</legend>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[13px] font-medium text-slate-900">
                    2a. Date of Birth <span className="text-rose-600">*</span>
                  </label>
                  {brideAge && (
                    <span className="text-[10px] font-semibold text-purple-800 bg-purple-50 border border-purple-700/30 px-1.5 py-0.5 rounded">
                      {brideAge}
                    </span>
                  )}
                </div>
                <input
                  type="date"
                  value={toIsoDateInput(bride.dateOfBirth)}
                  onChange={(e) => updateBride('dateOfBirth', e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>2b. Age at Marriage</label>
                <input
                  type="text"
                  value={currentCom.wifeAge ?? ''}
                  onChange={(e) => updateCom('wifeAge', e.target.value)}
                  placeholder="e.g. 25"
                  className={inputClass}
                />
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <label className="block text-[13px] font-medium text-slate-900">3. Place of Birth</label>
                  <button
                    type="button"
                    onClick={() => updateBride('placeOfBirth', groom.placeOfBirth || '')}
                    className={shortcutBtnClass}
                  >
                    <Copy className="w-3 h-3" />
                    <span>Same as Groom</span>
                  </button>
                </div>
                <SingleLinePhilippineAddressInput
                  variant="com"
                  showBarangay={false}
                  showStreet={false}
                  showCountry={true}
                  includeCountry={true}
                  value={bride.placeOfBirth ?? ''}
                  onChange={(nextVal) => updateBride('placeOfBirth', nextVal)}
                />
              </div>

              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <label className="block text-[13px] font-medium text-slate-900">
                    4b. Citizenship (4a. Sex: FEMALE)
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      updateCom('wifeCitizenship', currentCom.husbandCitizenship || groom.nationality || 'FILIPINO')
                    }
                    className={shortcutBtnClass}
                  >
                    <Copy className="w-3 h-3" />
                    <span>Copy Groom</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={currentCom.wifeCitizenship ?? bride.nationality ?? ''}
                  onChange={(e) => updateCom('wifeCitizenship', e.target.value)}
                  placeholder="e.g. Filipino"
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <label className="block text-[13px] font-medium text-slate-900">5. Residence</label>
                <button
                  type="button"
                  onClick={() =>
                    updateCom('wifeResidence', currentCom.husbandResidence || groom.currentAddress || '')
                  }
                  className={shortcutBtnClass}
                >
                  <Copy className="w-3 h-3" />
                  <span>Same as Groom&apos;s Residence</span>
                </button>
              </div>
              <SingleLinePhilippineAddressInput
                variant="com"
                showBarangay={true}
                showStreet={true}
                includeCountry={true}
                value={currentCom.wifeResidence ?? bride.currentAddress ?? ''}
                onChange={(nextVal) => updateCom('wifeResidence', nextVal)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>6. Religion / Religious Sect</label>
                <input
                  type="text"
                  value={currentCom.wifeReligion ?? ''}
                  onChange={(e) => updateCom('wifeReligion', e.target.value)}
                  placeholder="e.g. Roman Catholic"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>7. Civil Status</label>
                <input
                  type="text"
                  list="com-civil-status-options"
                  value={currentCom.wifeCivilStatus ?? ''}
                  onChange={(e) => updateCom('wifeCivilStatus', e.target.value)}
                  placeholder="e.g. Single"
                  className={inputClass}
                />
              </div>
            </div>
          </fieldset>

          <fieldset className={fieldsetClass}>
            <legend className={legendClass}>Items 8–11: Bride&apos;s Parents&apos; Particulars</legend>
            <div>
              <span className="block text-xs font-semibold text-slate-800 mb-1.5">
                8. Name of Father
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <input
                    type="text"
                    value={currentCom.wifeFatherFirstName ?? ''}
                    onChange={(e) => updateCom('wifeFatherFirstName', e.target.value)}
                    placeholder="e.g. RAMON"
                    className={`${inputClass} uppercase`}
                  />
                  <span className={subLabelClass}>First Name</span>
                </div>
                <div>
                  <input
                    type="text"
                    value={currentCom.wifeFatherMiddleName ?? ''}
                    onChange={(e) => updateCom('wifeFatherMiddleName', e.target.value)}
                    placeholder="e.g. LOPEZ"
                    className={`${inputClass} uppercase`}
                  />
                  <span className={subLabelClass}>Middle Name</span>
                </div>
                <div>
                  <input
                    type="text"
                    value={currentCom.wifeFatherLastName ?? ''}
                    onChange={(e) => updateCom('wifeFatherLastName', e.target.value)}
                    placeholder="e.g. SANTOS"
                    className={`${inputClass} uppercase`}
                  />
                  <span className={subLabelClass}>Last Name</span>
                </div>
              </div>
            </div>

            <div>
              <label className={labelClass}>9. Father&apos;s Citizenship</label>
              <input
                type="text"
                value={currentCom.wifeFatherCitizenship ?? ''}
                onChange={(e) => updateCom('wifeFatherCitizenship', e.target.value)}
                placeholder="e.g. Filipino"
                className={inputClass}
              />
            </div>

            <div className="pt-1 border-t border-slate-100">
              <span className="block text-xs font-semibold text-slate-800 mb-1.5">
                10. Maiden Name of Mother
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <input
                    type="text"
                    value={currentCom.wifeMotherMaidenFirstName ?? ''}
                    onChange={(e) => updateCom('wifeMotherMaidenFirstName', e.target.value)}
                    placeholder="e.g. ISABEL"
                    className={`${inputClass} uppercase`}
                  />
                  <span className={subLabelClass}>First Name</span>
                </div>
                <div>
                  <input
                    type="text"
                    value={currentCom.wifeMotherMaidenMiddleName ?? ''}
                    onChange={(e) => updateCom('wifeMotherMaidenMiddleName', e.target.value)}
                    placeholder="e.g. FLORES"
                    className={`${inputClass} uppercase`}
                  />
                  <span className={subLabelClass}>Middle Name</span>
                </div>
                <div>
                  <input
                    type="text"
                    value={currentCom.wifeMotherMaidenLastName ?? ''}
                    onChange={(e) => updateCom('wifeMotherMaidenLastName', e.target.value)}
                    placeholder="e.g. BAUTISTA"
                    className={`${inputClass} uppercase`}
                  />
                  <span className={subLabelClass}>Maiden Last Name</span>
                </div>
              </div>
            </div>

            <div>
              <label className={labelClass}>11. Mother&apos;s Citizenship</label>
              <input
                type="text"
                value={currentCom.wifeMotherCitizenship ?? ''}
                onChange={(e) => updateCom('wifeMotherCitizenship', e.target.value)}
                placeholder="e.g. Filipino"
                className={inputClass}
              />
            </div>
          </fieldset>

          <fieldset className={fieldsetClass}>
            <legend className={legendClass}>
              Items 12–14: Person / Wali Who Gave Consent or Advice (If Applicable)
            </legend>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-slate-500">
                Fill if bride is 18–25 yrs old or requires consent/advice; otherwise N/A applies.
              </p>
              <button
                type="button"
                onClick={() =>
                  onChange({
                    ...data,
                    com: {
                      ...currentCom,
                      wifeConsentFirstName: '',
                      wifeConsentMiddleName: 'N/A',
                      wifeConsentLastName: '',
                      wifeConsentPerson: 'N/A',
                      wifeConsentRelationship: 'N/A',
                      wifeConsentResidence: 'N/A',
                    },
                  })
                }
                className={shortcutBtnClass}
              >
                <span>Set N/A</span>
              </button>
            </div>
            {(() => {
              const wConsent = getConsentNameParts('wife');
              return (
                <div>
                  <span className="block text-[13px] font-medium text-slate-900 mb-1.5">
                    12. Name of Person / Wali
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <input
                        type="text"
                        value={wConsent.first}
                        onChange={(e) => updateConsentNamePart('wife', 'first', e.target.value)}
                        placeholder="e.g. MARIA CLARA"
                        className={`${inputClass} uppercase`}
                      />
                      <span className={subLabelClass}>First Name</span>
                    </div>
                    <div>
                      <input
                        type="text"
                        value={wConsent.middle}
                        onChange={(e) => updateConsentNamePart('wife', 'middle', e.target.value)}
                        placeholder="e.g. LOPEZ"
                        className={`${inputClass} uppercase`}
                      />
                      <span className={subLabelClass}>Middle Name</span>
                    </div>
                    <div>
                      <input
                        type="text"
                        value={wConsent.last}
                        onChange={(e) => updateConsentNamePart('wife', 'last', e.target.value)}
                        placeholder="e.g. SANTOS"
                        className={`${inputClass} uppercase`}
                      />
                      <span className={subLabelClass}>Last Name</span>
                    </div>
                  </div>
                </div>
              );
            })()}

            <div>
              <label className={labelClass}>13. Relationship</label>
              <input
                type="text"
                value={currentCom.wifeConsentRelationship ?? ''}
                onChange={(e) => updateCom('wifeConsentRelationship', e.target.value)}
                placeholder="e.g. Father / Mother / Guardian"
                className={inputClass}
              />
            </div>

            <div>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <label className="block text-[13px] font-medium text-slate-900">
                  14. Residence of Person / Wali
                </label>
                <button
                  type="button"
                  onClick={() =>
                    updateCom('wifeConsentResidence', currentCom.wifeResidence || bride.currentAddress || '')
                  }
                  className={shortcutBtnClass}
                >
                  <Copy className="w-3 h-3" />
                  <span>Same as Bride&apos;s Residence</span>
                </button>
              </div>
              <SingleLinePhilippineAddressInput
                variant="com"
                showBarangay={true}
                showStreet={true}
                includeCountry={true}
                value={currentCom.wifeConsentResidence ?? ''}
                onChange={(nextVal) => updateCom('wifeConsentResidence', nextVal)}
              />
            </div>
          </fieldset>
        </div>
      )}

      {/* =================================================================== */}
      {/* STEP 3: CEREMONY, PLACE OF MARRIAGE & SETTLEMENT (ITEMS 15–18)      */}
      {/* =================================================================== */}
      {!(isEditingFile && isLocked) && currentStep === 3 && (
        <div className="space-y-3.5">
          <fieldset className={fieldsetClass}>
            <legend className={legendClass}>Items 16 &amp; 17: Date &amp; Time of Marriage</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>
                  16. Date of Marriage <span className="text-rose-600">*</span>
                </label>
                <input
                  type="date"
                  value={toIsoDateInput(marriage.dateOfMarriage)}
                  onChange={(e) => updateMarriage('dateOfMarriage', e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-[13px] font-medium text-slate-900 mb-1.5">
                  <Clock className="w-3.5 h-3.5 text-purple-700" />
                  <span>17. Time of Marriage</span>
                </label>
                {renderTimeOfMarriageControl()}
              </div>
            </div>
          </fieldset>

          <fieldset className={fieldsetClass}>
            <legend className={legendClass}>Item 15: Place of Marriage</legend>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  const city = currentCom.cityMunicipality || marriage.cityMunicipality || '';
                  const prov = currentCom.province || marriage.provinceState || '';
                  const venue = currentCom.placeOfMarriageVenue ?? marriage.placeOfMarriage ?? '';
                  onChange({
                    ...data,
                    marriage: {
                      ...marriage,
                      cityMunicipality: city,
                      provinceState: prov,
                    },
                    com: {
                      ...currentCom,
                      placeOfMarriageVenue: venue,
                      placeOfMarriageCity: city,
                      placeOfMarriageProvince: prov,
                      placeOfMarriage: [venue, city, prov].filter(Boolean).join(', '),
                    },
                  });
                }}
                className={shortcutBtnClass}
              >
                <Copy className="w-3 h-3" />
                <span>Copy Header Location</span>
              </button>
            </div>

            <div>
              <label className={labelClass}>
                15a. Office of the / House of / Barangay of / Church of / Mosque of{' '}
                <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                value={currentCom.placeOfMarriageVenue ?? marriage.placeOfMarriage ?? ''}
                onChange={(e) => updateCom('placeOfMarriageVenue', e.target.value)}
                placeholder="e.g. St. Augustine Parish Church"
                className={`${inputClass} uppercase`}
              />
            </div>

            <PhilippineAddressSelector
              variant="com"
              provinceRequired
              cityRequired
              showBarangay={true}
              showStreet={false}
              showCountry={true}
              province={currentCom.placeOfMarriageProvince ?? marriage.provinceState ?? ''}
              cityMunicipality={currentCom.placeOfMarriageCity ?? marriage.cityMunicipality ?? ''}
              barangay={currentCom.placeOfMarriageBarangay ?? ''}
              street={currentCom.placeOfMarriageVenue ?? marriage.placeOfMarriage ?? ''}
              country={marriage.country ?? ''}
              onChange={(nextAddr) => {
                const currentVenue =
                  currentCom.placeOfMarriageVenue ?? marriage.placeOfMarriage ?? '';
                const prevBarangays = currentCom.placeOfMarriageBarangay
                  ? [currentCom.placeOfMarriageBarangay]
                  : undefined;
                const nextVenue =
                  nextAddr.barangay !== (currentCom.placeOfMarriageBarangay ?? '')
                    ? mergeStreetWithBarangay(currentVenue, nextAddr.barangay, prevBarangays)
                    : currentVenue;
                const city = nextAddr.cityMunicipality;
                const prov = nextAddr.province;
                onChange({
                  ...data,
                  marriage: {
                    ...marriage,
                    placeOfMarriage: nextVenue.toUpperCase(),
                    cityMunicipality: city.toUpperCase(),
                    provinceState: prov.toUpperCase(),
                    country: nextAddr.country.toUpperCase(),
                  },
                  com: {
                    ...currentCom,
                    placeOfMarriageVenue: nextVenue.toUpperCase(),
                    placeOfMarriageBarangay: nextAddr.barangay.toUpperCase(),
                    placeOfMarriageCity: city.toUpperCase(),
                    placeOfMarriageProvince: prov.toUpperCase(),
                    cityMunicipality: (city || currentCom.cityMunicipality || '').toUpperCase(),
                    province: (prov || currentCom.province || '').toUpperCase(),
                    placeOfMarriage: [nextVenue, city, prov]
                      .map((p) => p?.trim())
                      .filter(Boolean)
                      .join(', ')
                      .toUpperCase(),
                  },
                });
              }}
            />

            <div>
              <label className={labelClass}>
                15. Complete Place of Marriage
              </label>
              <input
                type="text"
                value={currentCom.placeOfMarriage ?? ''}
                onChange={(e) => updateCom('placeOfMarriage', e.target.value)}
                placeholder="e.g. St. Augustine Parish Church, Sagbayan, Bohol"
                className={`${inputClass} uppercase`}
              />
            </div>
          </fieldset>

          <fieldset className={fieldsetClass}>
            <legend className={legendClass}>Item 18: Certification of Contracting Parties (Marriage Settlement)</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <label
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors ${
                  currentCom.marriageSettlement === 'not_entered'
                    ? 'border-purple-700 bg-purple-50/70 text-purple-950'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="com-marriage-settlement"
                  checked={currentCom.marriageSettlement === 'not_entered'}
                  onChange={() => updateCom('marriageSettlement', 'not_entered')}
                  className="w-4 h-4 accent-purple-700"
                />
                <span className="text-xs font-medium leading-snug">
                  Have <strong>not entered</strong> into a marriage settlement
                </span>
              </label>

              <label
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors ${
                  currentCom.marriageSettlement === 'entered'
                    ? 'border-purple-700 bg-purple-50/70 text-purple-950'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="com-marriage-settlement"
                  checked={currentCom.marriageSettlement === 'entered'}
                  onChange={() => updateCom('marriageSettlement', 'entered')}
                  className="w-4 h-4 accent-purple-700"
                />
                <span className="text-xs font-medium leading-snug">
                  Have <strong>entered</strong> into a marriage settlement (copy attached)
                </span>
              </label>
            </div>

            <div className="pt-2 border-t border-slate-100 sm:max-w-xs">
              <label className={labelClass}>18. In Witness Whereof Date</label>
              <input
                type="date"
                value={
                  toIsoDateInput(currentCom.witnessWhereofDate) ||
                  fromMonthDayYearToIso(
                    currentCom.witnessWhereofMonth,
                    currentCom.witnessWhereofDay,
                    currentCom.witnessWhereofYear
                  )
                }
                onChange={(e) => updateWitnessWhereofDate(e.target.value)}
                className={inputClass}
              />
            </div>
          </fieldset>

          <fieldset className={fieldsetClass}>
            <legend className={legendClass}>Ceremony &amp; Officiant Details</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Ceremony Type (optional)</label>
                <input
                  type="text"
                  value={marriage.ceremonyType ?? ''}
                  onChange={(e) => updateMarriage('ceremonyType', e.target.value)}
                  placeholder="e.g. Religious Ceremony / Civil"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Officiant / Celebrant Name</label>
                <input
                  type="text"
                  value={marriage.officiantName ?? ''}
                  onChange={(e) => updateMarriage('officiantName', e.target.value)}
                  placeholder="e.g. REV. FR. BERNARDO M. TORRES"
                  className={`${inputClass} uppercase`}
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>Additional Remarks (optional)</label>
              <input
                type="text"
                value={marriage.remarks ?? ''}
                onChange={(e) => updateMarriage('remarks', e.target.value)}
                placeholder="e.g. Registered at the Office of the Local Civil Registrar"
                className={inputClass}
              />
            </div>
          </fieldset>
        </div>
      )}

      {/* =================================================================== */}
      {/* STEP 4: WITNESSES & PREPARATION (ITEM 20a)                          */}
      {/* =================================================================== */}
      {!(isEditingFile && isLocked) && currentStep === 4 && (
        <div className="space-y-3.5">
          <fieldset className={fieldsetClass}>
            <legend className={legendClass}>Item 20a &amp; 20b: Attesting Witnesses</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Witness 1 Name</label>
                <input
                  type="text"
                  value={currentCom.witness1 ?? additional.witness1Name ?? ''}
                  onChange={(e) => updateAdditional('witness1Name', e.target.value)}
                  className={`${inputClass} uppercase`}
                />
              </div>

              <div>
                <label className={labelClass}>Witness 2 Name</label>
                <input
                  type="text"
                  value={currentCom.witness2 ?? additional.witness2Name ?? ''}
                  onChange={(e) => updateAdditional('witness2Name', e.target.value)}
                  className={`${inputClass} uppercase`}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <label className="block text-[13px] font-medium text-slate-900">
                    Witness 3 Name (optional)
                  </label>
                  <button
                    type="button"
                    onClick={() => updateCom('witness3', 'N/A')}
                    className={shortcutBtnClass}
                  >
                    <span>Set N/A</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={currentCom.witness3 ?? ''}
                  onChange={(e) => updateCom('witness3', e.target.value)}
                  className={`${inputClass} uppercase`}
                />
              </div>

              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <label className="block text-[13px] font-medium text-slate-900">
                    Witness 4 Name (optional)
                  </label>
                  <button
                    type="button"
                    onClick={() => updateCom('witness4', 'N/A')}
                    className={shortcutBtnClass}
                  >
                    <span>Set N/A</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={currentCom.witness4 ?? ''}
                  onChange={(e) => updateCom('witness4', e.target.value)}
                  className={`${inputClass} uppercase`}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <label className="block text-[13px] font-medium text-slate-900">
                    Witness 5 Name (optional)
                  </label>
                  <button
                    type="button"
                    onClick={() => updateCom('witness5', 'N/A')}
                    className={shortcutBtnClass}
                  >
                    <span>Set N/A</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={currentCom.witness5 ?? ''}
                  onChange={(e) => updateCom('witness5', e.target.value)}
                  className={`${inputClass} uppercase`}
                />
              </div>

              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <label className="block text-[13px] font-medium text-slate-900">
                    Witness 6 Name (optional)
                  </label>
                  <button
                    type="button"
                    onClick={() => updateCom('witness6', 'N/A')}
                    className={shortcutBtnClass}
                  >
                    <span>Set N/A</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={currentCom.witness6 ?? ''}
                  onChange={(e) => updateCom('witness6', e.target.value)}
                  className={`${inputClass} uppercase`}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <label className="block text-[13px] font-medium text-slate-900">
                    Witness 7 Name (optional)
                  </label>
                  <button
                    type="button"
                    onClick={() => updateCom('witness7', 'N/A')}
                    className={shortcutBtnClass}
                  >
                    <span>Set N/A</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={currentCom.witness7 ?? ''}
                  onChange={(e) => updateCom('witness7', e.target.value)}
                  className={`${inputClass} uppercase`}
                />
              </div>

              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <label className="block text-[13px] font-medium text-slate-900">
                    Witness 8 Name (optional)
                  </label>
                  <button
                    type="button"
                    onClick={() => updateCom('witness8', 'N/A')}
                    className={shortcutBtnClass}
                  >
                    <span>Set N/A</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={currentCom.witness8 ?? ''}
                  onChange={(e) => updateCom('witness8', e.target.value)}
                  className={`${inputClass} uppercase`}
                />
              </div>
            </div>
          </fieldset>

          <fieldset className={fieldsetClass}>
            <legend className={legendClass}>Preparation Information</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Date of Preparation</label>
                <input
                  type="date"
                  value={toIsoDateInput(additional.dateOfPreparation)}
                  onChange={(e) =>
                    updateAdditional('dateOfPreparation', formatDateMMMMDDYYYY(e.target.value))
                  }
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Prepared By (optional)</label>
                <input
                  type="text"
                  value={additional.preparedBy ?? ''}
                  onChange={(e) => updateAdditional('preparedBy', e.target.value)}
                  placeholder="e.g. CARMINA R. REYES"
                  className={`${inputClass} uppercase`}
                />
              </div>
            </div>
          </fieldset>
        </div>
      )}

      {/* =================================================================== */}
      {/* STEP 5: FORM 97 REGISTRY, LICENSE & LCRO (HEADER, ITEMS 19–22)      */}
      {/* =================================================================== */}
      {!(isEditingFile && isLocked) && currentStep === 5 && (
        <div className="space-y-3.5">
          <fieldset className={fieldsetClass}>
            <legend className={legendClass}>Header: Registry Location &amp; Number</legend>
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-slate-500">
                Province, Municipality, and LCR Registry Number
              </p>
              <button
                type="button"
                onClick={() =>
                  onChange({
                    ...data,
                    com: {
                      ...currentCom,
                      province: currentCom.placeOfMarriageProvince || marriage.provinceState || '',
                      cityMunicipality: currentCom.placeOfMarriageCity || marriage.cityMunicipality || '',
                    },
                  })
                }
                className={shortcutBtnClass}
              >
                <Copy className="w-3 h-3" />
                <span>Copy Item 15 Location</span>
              </button>
            </div>
            <div className="space-y-3">
              <PhilippineAddressSelector
                variant="com"
                showBarangay={false}
                showStreet={false}
                province={currentCom.province ?? ''}
                cityMunicipality={currentCom.cityMunicipality ?? ''}
                onChange={(nextAddr) => {
                  onChange({
                    ...data,
                    marriage: {
                      ...marriage,
                      provinceState: nextAddr.province || marriage.provinceState,
                      cityMunicipality: nextAddr.cityMunicipality || marriage.cityMunicipality,
                    },
                    com: {
                      ...currentCom,
                      province: nextAddr.province,
                      cityMunicipality: nextAddr.cityMunicipality,
                    },
                  });
                }}
              />

              <div className="sm:max-w-xs">
                <label className={labelClass}>Registry Number</label>
                <input
                  type="text"
                  value={currentCom.registryNo ?? ''}
                  onChange={(e) => updateCom('registryNo', e.target.value)}
                  placeholder="e.g. 2023-0941"
                  className={`${inputClass} font-mono tabular-nums`}
                />
              </div>
            </div>
          </fieldset>

          <fieldset className={fieldsetClass}>
            <legend className={legendClass}>Item 19: Marriage License &amp; Solemnizing Authority</legend>

            <div>
              <label className={labelClass}>Legal Basis of Marriage (Item 19 a / b / c)</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[
                  { value: 'license', label: 'a. With Marriage License' },
                  { value: 'art_209', label: 'b. Art. of E.O. 209 (Exempt)' },
                  { value: 'pd_1083', label: 'c. Under P.D. No. 1083' },
                ].map((opt) => {
                  const active = currentCom.licenseType === opt.value;
                  return (
                    <label
                      key={opt.value}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-xs font-medium transition-colors ${
                        active
                          ? 'border-purple-700 bg-purple-50 text-purple-950'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="com-license-type"
                        checked={active}
                        onChange={() => updateCom('licenseType', opt.value)}
                        className="w-3.5 h-3.5 accent-purple-700"
                      />
                      <span>{opt.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {(!currentCom.licenseType || currentCom.licenseType === 'license') && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Marriage License No.</label>
                    <input
                      type="text"
                      value={currentCom.marriageLicenseNo ?? ''}
                      onChange={(e) => updateCom('marriageLicenseNo', e.target.value)}
                      placeholder="e.g. ML-2023-8941"
                      className={`${inputClass} font-mono tabular-nums`}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>License Issued Date</label>
                    <input
                      type="date"
                      value={toIsoDateInput(currentCom.licenseIssuedDate)}
                      onChange={(e) =>
                        updateCom('licenseIssuedDate', formatDateMMMMDDYYYY(e.target.value))
                      }
                      className={inputClass}
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Place Issued</label>
                  <SingleLinePhilippineAddressInput
                    variant="com"
                    showBarangay={false}
                    showStreet={false}
                    includeCountry={false}
                    value={currentCom.licenseIssuedPlace ?? ''}
                    onChange={(nextVal) => updateCom('licenseIssuedPlace', nextVal)}
                  />
                </div>
              </div>
            )}

            {currentCom.licenseType === 'art_209' && (
              <div>
                <label className={labelClass}>Article No. of Executive Order No. 209 (e.g. Art. 34)</label>
                <input
                  type="text"
                  value={currentCom.art209Specify ?? ''}
                  onChange={(e) => updateCom('art209Specify', e.target.value)}
                  placeholder="e.g. 34"
                  className={inputClass}
                />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Solemnizing Officer Name</label>
                <input
                  type="text"
                  value={currentCom.solemnizingOfficerName ?? ''}
                  onChange={(e) => updateCom('solemnizingOfficerName', e.target.value)}
                  placeholder="e.g. REV. FR. BERNARDO M. TORRES"
                  className={`${inputClass} uppercase font-semibold`}
                />
              </div>

              <div>
                <label className={labelClass}>Position / Designation</label>
                <input
                  type="text"
                  value={currentCom.solemnizingOfficerPosition ?? ''}
                  onChange={(e) => updateCom('solemnizingOfficerPosition', e.target.value)}
                  placeholder="e.g. PARISH PRIEST / TRIAL JUDGE"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Religious Sect / Civil Agency</label>
                <input
                  type="text"
                  value={currentCom.solemnizingOfficerReligion ?? ''}
                  onChange={(e) => updateCom('solemnizingOfficerReligion', e.target.value)}
                  placeholder="e.g. ROMAN CATHOLIC CHURCH"
                  className={inputClass}
                />
              </div>

              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <label className="block text-[13px] font-medium text-slate-900">
                    CRASM Registry No. &amp; Expiration (if applicable)
                  </label>
                  <button
                    type="button"
                    onClick={() => updateCom('solemnizingOfficerRegistryNo', 'N/A')}
                    className={shortcutBtnClass}
                  >
                    <span>Set N/A</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={currentCom.solemnizingOfficerRegistryNo ?? ''}
                  onChange={(e) => updateCom('solemnizingOfficerRegistryNo', e.target.value)}
                  placeholder="e.g. Reg. No. 2023-112 / Exp. Dec 31, 2025 or N/A"
                  className={inputClass}
                />
              </div>
            </div>
          </fieldset>

          <fieldset className={fieldsetClass}>
            <legend className={legendClass}>Items 21 &amp; 22: LCRO Reception &amp; Registration</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 rounded-lg border border-purple-700/30 space-y-2.5">
                <span className="text-[11px] font-bold text-purple-800 uppercase block">
                  21. Received By (LCRO Staff)
                </span>
                <div>
                  <label className={labelClass}>Name in Print</label>
                  <input
                    type="text"
                    value={currentCom.receivedByName ?? ''}
                    onChange={(e) => updateCom('receivedByName', e.target.value)}
                    placeholder="Name: CARMINA R. REYES"
                    className={`${inputClass} uppercase`}
                  />
                </div>
                <div>
                  <label className={labelClass}>Title or Position</label>
                  <input
                    type="text"
                    value={currentCom.receivedByTitle ?? ''}
                    onChange={(e) => updateCom('receivedByTitle', e.target.value)}
                    placeholder="Title: RECORDS CLERK"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Date</label>
                  <input
                    type="date"
                    value={toIsoDateInput(currentCom.receivedByDate)}
                    onChange={(e) =>
                      updateCom('receivedByDate', formatDateMMMMDDYYYY(e.target.value))
                    }
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-purple-700/30 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-purple-800 uppercase block">
                    22. Registered By (Civil Registrar)
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      onChange({
                        ...data,
                        com: {
                          ...currentCom,
                          registeredByName: currentCom.receivedByName || '',
                          registeredByTitle: currentCom.receivedByTitle || '',
                          registeredByDate: currentCom.receivedByDate || '',
                        },
                      })
                    }
                    className={shortcutBtnClass}
                  >
                    <Copy className="w-3 h-3" />
                    <span>Same as 21</span>
                  </button>
                </div>
                <div>
                  <label className={labelClass}>Name in Print</label>
                  <input
                    type="text"
                    value={currentCom.registeredByName ?? ''}
                    onChange={(e) => updateCom('registeredByName', e.target.value)}
                    placeholder="Name: ATTY. GREGORIO L. SANTOS"
                    className={`${inputClass} uppercase font-semibold`}
                  />
                </div>
                <div>
                  <label className={labelClass}>Title or Position</label>
                  <input
                    type="text"
                    value={currentCom.registeredByTitle ?? ''}
                    onChange={(e) => updateCom('registeredByTitle', e.target.value)}
                    className={inputClass}
                    placeholder="Title: MUNICIPAL CIVIL REGISTRAR"
                  />
                </div>
                <div>
                  <label className={labelClass}>Date</label>
                  <input
                    type="date"
                    value={toIsoDateInput(currentCom.registeredByDate)}
                    onChange={(e) =>
                      updateCom('registeredByDate', formatDateMMMMDDYYYY(e.target.value))
                    }
                    className={inputClass}
                  />
                </div>
              </div>
            </div>
          </fieldset>

          <fieldset className={fieldsetClass}>
            <legend className={legendClass}>Remarks / Annotations (LCRO / OCRG Use)</legend>
            <div>
              <label className={labelClass}>Remarks / Annotations Box</label>
              <textarea
                rows={2}
                value={currentCom.remarksAnnotation ?? ''}
                onChange={(e) => updateCom('remarksAnnotation', e.target.value)}
                placeholder="For LCRO / OCRG / Shari'a Circuit Registrar Annotations"
                className={inputClass}
              />
            </div>
          </fieldset>
        </div>
      )}

      {/* =================================================================== */}
      {/* STEP 6: PAGE 2 AFFIDAVITS (SOLEMNIZING OFFICER & DELAYED REG.)      */}
      {/* =================================================================== */}
      {!(isEditingFile && isLocked) && currentStep === 6 && (
        <div className="space-y-3.5">
          {/* Affidavit of Solemnizing Officer */}
          <fieldset className={fieldsetClass}>
            <legend className={legendClass}>Page 2: Affidavit of Solemnizing Officer</legend>
            <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 rounded-lg border border-purple-700/40 bg-purple-50/40">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={currentCom.affidavitSolemnizingOfficerEnabled !== false}
                  onChange={(e) => updateCom('affidavitSolemnizingOfficerEnabled', e.target.checked)}
                  className="w-4 h-4 rounded accent-purple-700 shrink-0"
                />
                <span className="text-xs font-medium text-slate-800">
                  Include Affidavit of Solemnizing Officer on Page 2
                </span>
              </label>
              <button
                type="button"
                onClick={autofillSolemnizingFromPage1}
                className={shortcutBtnClass}
              >
                <Copy className="w-3 h-3" />
                <span>Auto-fill from Page 1</span>
              </button>
            </div>

            {currentCom.affidavitSolemnizingOfficerEnabled !== false && (
              <div className="space-y-3 pt-1">
                <div className="space-y-3">
                  <div>
                    <label className={labelClass}>Solemnizing Officer of (Church / Office / Agency)</label>
                    <input
                      type="text"
                      placeholder="e.g. St. Augustine Parish Church"
                      value={currentCom.solemnizingOfficerOffice ?? ''}
                      onChange={(e) => updateCom('solemnizingOfficerOffice', e.target.value)}
                      className={`${inputClass} uppercase`}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Officer&apos;s Office / Residence Address</label>
                    <SingleLinePhilippineAddressInput
                      variant="com"
                      showBarangay={true}
                      showStreet={true}
                      includeCountry={false}
                      value={currentCom.solemnizingOfficerAddress ?? ''}
                      onChange={(nextVal) => updateCom('solemnizingOfficerAddress', nextVal)}
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Item 2: Qualification / Legal Ground Checked</label>
                  <div className="space-y-1.5">
                    {[
                      {
                        value: '2a',
                        label: '2a. Ascertained qualifications & no legal impediment (Art. 34 Family Code)',
                      },
                      {
                        value: '2b',
                        label: '2b. Marriage performed in articulo mortis (at point of death)',
                      },
                      {
                        value: '2c',
                        label: '2c. Witness signed for dying party physically unable to sign',
                      },
                      {
                        value: '2d',
                        label: '2d. Remote residence with no transportation to appear before LCRO',
                      },
                      {
                        value: '2e',
                        label: '2e. Marriage among Muslims or Ethnic Cultural Communities',
                      },
                    ].map((opt) => {
                      const active = currentCom.solemnizingQualification === opt.value;
                      return (
                        <label
                          key={opt.value}
                          className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border cursor-pointer text-xs transition-colors ${
                            active
                              ? 'border-purple-700 bg-purple-50 text-purple-950 font-semibold'
                              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <input
                            type="radio"
                            name="com-solemnizing-qual"
                            checked={active}
                            onChange={() => updateCom('solemnizingQualification', opt.value)}
                            className="w-3.5 h-3.5 accent-purple-700 shrink-0"
                          />
                          <span>{opt.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {currentCom.solemnizingQualification === '2c' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-lg bg-purple-50/40 border border-purple-700/30">
                    <div>
                      <label className={labelClass}>2c. Contracting Party 1 Name</label>
                      <input
                        type="text"
                        placeholder="Full name of party 1"
                        value={currentCom.solemnizing2cParty1 ?? ''}
                        onChange={(e) => updateCom('solemnizing2cParty1', e.target.value)}
                        className={`${inputClass} uppercase`}
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <label className="block text-[13px] font-medium text-slate-900">
                          2c. Contracting Party 2 Name (optional)
                        </label>
                        <button
                          type="button"
                          onClick={() => updateCom('solemnizing2cParty2', 'N/A')}
                          className={shortcutBtnClass}
                        >
                          <span>Set N/A</span>
                        </button>
                      </div>
                      <input
                        type="text"
                        placeholder="Full name of party 2 or N/A"
                        value={currentCom.solemnizing2cParty2 ?? ''}
                        onChange={(e) => updateCom('solemnizing2cParty2', e.target.value)}
                        className={`${inputClass} uppercase`}
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>In Truth Whereof / Witness Date</label>
                    <input
                      type="date"
                      value={fromMonthDayYearToIso(
                        currentCom.solemnizingSwornMonth,
                        currentCom.solemnizingSwornDay,
                        currentCom.solemnizingSwornYear
                      )}
                      onChange={(e) => {
                        const parts = parseIsoDateToColbParts(e.target.value);
                        onChange({
                          ...data,
                          com: {
                            ...currentCom,
                            solemnizingSwornDay: parts ? parts.dayOrdinal : '',
                            solemnizingSwornMonth: parts ? parts.monthName : '',
                            solemnizingSwornYear: parts ? parts.year : '',
                          },
                        });
                      }}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>In Truth Whereof / Witness Place</label>
                    <input
                      type="text"
                      placeholder="e.g. Sagbayan, Bohol"
                      value={currentCom.solemnizingSwornPlace ?? ''}
                      onChange={(e) => updateCom('solemnizingSwornPlace', e.target.value)}
                      className={`${inputClass} uppercase`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-100">
                  <div>
                    <label className={labelClass}>Subscribed &amp; Sworn Jurat Date</label>
                    <input
                      type="date"
                      value={fromMonthDayYearToIso(
                        currentCom.solemnizingJuratMonth,
                        currentCom.solemnizingJuratDay,
                        currentCom.solemnizingJuratYear
                      )}
                      onChange={(e) => {
                        const parts = parseIsoDateToColbParts(e.target.value);
                        onChange({
                          ...data,
                          com: {
                            ...currentCom,
                            solemnizingJuratDay: parts ? parts.dayOrdinal : '',
                            solemnizingJuratMonth: parts ? parts.monthName : '',
                            solemnizingJuratYear: parts ? parts.year : '',
                          },
                        });
                      }}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Subscribed &amp; Sworn Jurat Place</label>
                    <input
                      type="text"
                      placeholder="e.g. Sagbayan, Bohol"
                      value={currentCom.solemnizingJuratPlace ?? ''}
                      onChange={(e) => updateCom('solemnizingJuratPlace', e.target.value)}
                      className={`${inputClass} uppercase`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className={labelClass}>Affiant CTC / Valid ID No.</label>
                    <input
                      type="text"
                      placeholder="CTC / ID Number"
                      value={currentCom.solemnizingAffiantCtc ?? ''}
                      onChange={(e) => updateCom('solemnizingAffiantCtc', e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>CTC Issued On</label>
                    <input
                      type="date"
                      value={toIsoDateInput(currentCom.solemnizingAffiantCtcDate)}
                      onChange={(e) =>
                        updateCom('solemnizingAffiantCtcDate', formatDateMMMMDDYYYY(e.target.value))
                      }
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>CTC Issued At</label>
                    <input
                      type="text"
                      placeholder="Place issued"
                      value={currentCom.solemnizingAffiantCtcPlace ?? ''}
                      onChange={(e) => updateCom('solemnizingAffiantCtcPlace', e.target.value)}
                      className={`${inputClass} uppercase`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className={labelClass}>Administering Officer Name</label>
                    <input
                      type="text"
                      placeholder="ATTY. GREGORIO L. SANTOS"
                      value={currentCom.solemnizingAdminOfficerName ?? ''}
                      onChange={(e) => updateCom('solemnizingAdminOfficerName', e.target.value)}
                      className={`${inputClass} uppercase`}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Title / Designation</label>
                    <input
                      type="text"
                      placeholder="Municipal Civil Registrar"
                      value={currentCom.solemnizingAdminOfficerTitle ?? ''}
                      onChange={(e) => updateCom('solemnizingAdminOfficerTitle', e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Officer Address</label>
                    <input
                      type="text"
                      placeholder="Sagbayan, Bohol"
                      value={currentCom.solemnizingAdminOfficerAddress ?? ''}
                      onChange={(e) => updateCom('solemnizingAdminOfficerAddress', e.target.value)}
                      className={`${inputClass} uppercase`}
                    />
                  </div>
                </div>
              </div>
            )}
          </fieldset>

          {/* Affidavit for Delayed Registration of Marriage */}
          <fieldset className={fieldsetClass}>
            <legend className={legendClass}>Page 2: Affidavit for Delayed Registration of Marriage</legend>
            <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 rounded-lg border border-purple-700/40 bg-purple-50/40">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(currentCom.affidavitDelayedReg)}
                  onChange={(e) => updateCom('affidavitDelayedReg', e.target.checked)}
                  className="w-4 h-4 rounded accent-purple-700 shrink-0"
                />
                <span className="text-xs font-medium text-slate-800">
                  Include Affidavit for Delayed Registration of Marriage
                </span>
              </label>
              <button
                type="button"
                onClick={autofillDelayedFromPage1}
                className={shortcutBtnClass}
              >
                <Copy className="w-3 h-3" />
                <span>Auto-fill from Page 1</span>
              </button>
            </div>

            {currentCom.affidavitDelayedReg && (
              <div className="space-y-3 pt-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Affiant Name</label>
                    <input
                      type="text"
                      placeholder="Full name of affiant"
                      value={currentCom.delayedAffiantName || ''}
                      onChange={(e) => updateCom('delayedAffiantName', e.target.value)}
                      className={`${inputClass} uppercase`}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Affiant Civil Status</label>
                    <select
                      value={currentCom.delayedAffiantCivilStatus || 'married'}
                      onChange={(e) => updateCom('delayedAffiantCivilStatus', e.target.value)}
                      className={inputClass}
                    >
                      <option value="single">Single</option>
                      <option value="married">Married</option>
                      <option value="divorced">Divorced</option>
                      <option value="widow">Widow / Widower</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelClass}>Affiant Residence &amp; Postal Address</label>
                    <SingleLinePhilippineAddressInput
                      variant="com"
                      showBarangay={true}
                      showStreet={true}
                      includeCountry={false}
                      value={currentCom.delayedAffiantResidence || ''}
                      onChange={(nextVal) => updateCom('delayedAffiantResidence', nextVal)}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Applicant Type</label>
                    <select
                      value={currentCom.delayedApplicantType || 'marriage_between'}
                      onChange={(e) => updateCom('delayedApplicantType', e.target.value)}
                      className={inputClass}
                    >
                      <option value="marriage_between">Marriage Between Contracting Parties</option>
                      <option value="my_marriage">My Own Marriage With Spouse</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Ceremony Type</label>
                    <select
                      value={currentCom.delayedCeremonyType || 'civil'}
                      onChange={(e) => updateCom('delayedCeremonyType', e.target.value)}
                      className={inputClass}
                    >
                      <option value="religious">a. Religious ceremony</option>
                      <option value="civil">b. Civil ceremony</option>
                      <option value="muslim">c. Muslim rites</option>
                      <option value="tribal">d. Tribal rites</option>
                    </select>
                  </div>
                  {currentCom.delayedApplicantType === 'my_marriage' && (
                    <div className="sm:col-span-2">
                      <label className={labelClass}>Spouse Name</label>
                      <input
                        type="text"
                        placeholder="Full name of spouse"
                        value={currentCom.delayedSpouseName || ''}
                        onChange={(e) => updateCom('delayedSpouseName', e.target.value)}
                        className={`${inputClass} uppercase`}
                      />
                    </div>
                  )}
                  <div>
                    <label className={labelClass}>Place of Marriage (Item 1)</label>
                    <input
                      type="text"
                      placeholder="e.g. St. Augustine Parish, Sagbayan, Bohol"
                      value={currentCom.delayedMarriagePlace || ''}
                      onChange={(e) => updateCom('delayedMarriagePlace', e.target.value)}
                      className={`${inputClass} uppercase`}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Date of Marriage (Item 1)</label>
                    <input
                      type="date"
                      value={toIsoDateInput(currentCom.delayedMarriageDate)}
                      onChange={(e) =>
                        updateCom('delayedMarriageDate', formatDateMMMMDDYYYY(e.target.value))
                      }
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Applicant Citizenship</label>
                    <input
                      type="text"
                      placeholder="Filipino"
                      value={currentCom.delayedApplicantCitizenship || ''}
                      onChange={(e) => updateCom('delayedApplicantCitizenship', e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Spouse Citizenship</label>
                    <input
                      type="text"
                      placeholder="Filipino"
                      value={currentCom.delayedSpouseCitizenship || ''}
                      onChange={(e) => updateCom('delayedSpouseCitizenship', e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Wife Citizenship (if other affiant)</label>
                    <input
                      type="text"
                      placeholder="Filipino"
                      value={currentCom.delayedWifeCitizenship || ''}
                      onChange={(e) => updateCom('delayedWifeCitizenship', e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Husband Citizenship (if other affiant)</label>
                    <input
                      type="text"
                      placeholder="Filipino"
                      value={currentCom.delayedHusbandCitizenship || ''}
                      onChange={(e) => updateCom('delayedHusbandCitizenship', e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelClass}>Reason for Delayed Registration</label>
                    <input
                      type="text"
                      placeholder="Reason for registering late"
                      value={currentCom.delayedReason || ''}
                      onChange={(e) => updateCom('delayedReason', e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>In Truth Whereof / Sworn Date</label>
                    <input
                      type="date"
                      value={fromMonthDayYearToIso(
                        currentCom.delayedSwornMonth,
                        currentCom.delayedSwornDay,
                        currentCom.delayedSwornYear
                      )}
                      onChange={(e) => {
                        const parts = parseIsoDateToColbParts(e.target.value);
                        onChange({
                          ...data,
                          com: {
                            ...currentCom,
                            affidavitDelayedReg: true,
                            delayedSwornDay: parts ? parts.dayOrdinal : '',
                            delayedSwornMonth: parts ? parts.monthName : '',
                            delayedSwornYear: parts ? parts.year : '',
                          },
                        });
                      }}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Sworn Place</label>
                    <input
                      type="text"
                      placeholder="Sagbayan, Bohol"
                      value={currentCom.delayedSwornPlace || ''}
                      onChange={(e) => updateCom('delayedSwornPlace', e.target.value)}
                      className={`${inputClass} uppercase`}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Affiant CTC / Valid ID</label>
                    <input
                      type="text"
                      placeholder="CTC / Valid ID No."
                      value={currentCom.delayedAffiantCtc || ''}
                      onChange={(e) => updateCom('delayedAffiantCtc', e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <div>
                      <label className={labelClass}>CTC Issued Date</label>
                      <input
                        type="date"
                        value={toIsoDateInput(currentCom.delayedAffiantCtcDate)}
                        onChange={(e) =>
                          updateCom('delayedAffiantCtcDate', formatDateMMMMDDYYYY(e.target.value))
                        }
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>CTC Issued Place</label>
                      <input
                        type="text"
                        placeholder="Place"
                        value={currentCom.delayedAffiantCtcPlace || ''}
                        onChange={(e) => updateCom('delayedAffiantCtcPlace', e.target.value)}
                        className={`${inputClass} uppercase`}
                      />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Administering Officer Name</label>
                    <input
                      type="text"
                      placeholder="ATTY. GREGORIO L. SANTOS"
                      value={currentCom.delayedAdminOfficerName || ''}
                      onChange={(e) => updateCom('delayedAdminOfficerName', e.target.value)}
                      className={`${inputClass} uppercase`}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Officer Title / Designation</label>
                    <input
                      type="text"
                      placeholder="Municipal Civil Registrar"
                      value={currentCom.delayedAdminOfficerTitle || ''}
                      onChange={(e) => updateCom('delayedAdminOfficerTitle', e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelClass}>Administering Officer Address</label>
                    <input
                      type="text"
                      placeholder="Municipal Hall, Sagbayan, Bohol"
                      value={currentCom.delayedAdminOfficerAddress || ''}
                      onChange={(e) => updateCom('delayedAdminOfficerAddress', e.target.value)}
                      className={`${inputClass} uppercase`}
                    />
                  </div>
                </div>
              </div>
            )}
          </fieldset>
        </div>
      )}

      {/* =================================================================== */}
      {/* GOOGLE FORM STEP NAVIGATION (BACK / NEXT)                           */}
      {/* =================================================================== */}
      {!(isEditingFile && isLocked) && (
        <div className="flex items-center justify-between gap-3 pt-1">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={() => goToStep(currentStep - 1)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-sm font-medium text-slate-700 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            {currentStep < TOTAL_STEPS ? (
              <button
                type="button"
                onClick={() => goToStep(currentStep + 1)}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-purple-700 hover:bg-purple-800 text-white text-sm font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => goToStep(1)}
                  className="px-4 py-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-sm font-medium text-slate-700 transition-colors cursor-pointer"
                >
                  Back to Start
                </button>
                {onSaveDraft && (
                  <button
                    type="button"
                    onClick={handleSaveClick}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-purple-700 hover:bg-purple-800 text-white text-sm font-semibold shadow-xs transition-colors cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>Save Draft</span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm">Reset Marriage Information?</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to clear all entered groom, bride, and ceremony fields? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReset}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-700 text-white"
              >
                Yes, Reset All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
