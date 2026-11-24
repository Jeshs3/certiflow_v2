/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { BirthCertificateData, ColbDetails } from '../types/certificate';
import {
  formatName,
  formatDateMMMMCommaDDYYYY,
  normalizeNotApplicable,
  toFullMonthName,
  toIsoDateInput,
  fromMonthDayYearToIso,
  parseIsoDateToColbParts,
} from '../utils/certificateUtils';
import { COLB_DATA_BINDINGS } from '../utils/dataBinding';
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
  Home,
  Pencil,
  Lock,
} from 'lucide-react';
import { IconTooltip } from './IconTooltip';
import {
  ColbStreetBarangayAddressInput,
  PhilippineAddressSelector,
  SingleLinePhilippineAddressInput,
} from './PhilippineAddressSelector';

interface BirthCertificateFormProps {
  data: BirthCertificateData;
  onChange: (newData: BirthCertificateData) => void;
  onReset: () => void;
  onBackToDashboard?: () => void;
  onPreview?: () => void;
  onSaveDraft?: () => void;
  onDownloadPDF?: () => void;
  isDownloadingPDF?: boolean;
  activeBindingField?: string | null;
  onActiveBindingFieldChange?: (fieldId: string | null) => void;
  isEditingFile?: boolean;
  startUnlocked?: boolean;
  multipleBirthChildNumber?: number;
  onSubmitMultipleChild?: (mode: 'next' | 'finish') => void;
}

const getSteps = () => [
  { id: 1, title: 'Registry Header & Child Particulars', range: 'Items 1–6' },
  { id: 2, title: "Mother's Information", range: 'Items 7–13' },
  { id: 3, title: "Father's Information & Marriage", range: 'Items 14–20' },
  { id: 4, title: 'Certifications & Civil Registry', range: 'Items 21–25 & Remarks' },
  { id: 5, title: 'Page 2: Admission of Paternity', range: 'Paternity Affidavit' },
  { id: 6, title: 'Page 2: Delayed Registration', range: 'Delayed Reg. Affidavit' },
] as const;

const TOTAL_STEPS = 6;

const inputBaseClass =
  'px-3 py-2 text-sm text-slate-900 bg-white border border-[#348e38] rounded-lg focus:outline-none focus:border-[#1f6123] focus:ring-2 focus:ring-[#348e38]/20 transition-colors placeholder:text-slate-400 uppercase';

const inputClass = `w-full ${inputBaseClass}`;

const fieldsetClass =
  'bg-white rounded-xl border border-[#348e38]/45 px-4 pb-4 pt-2.5 space-y-3';

const legendClass = 'px-2 text-xs font-bold text-[#246b27] tracking-tight';

const labelClass = 'block text-[13px] font-medium text-slate-900 mb-1.5';
const subLabelClass = 'block text-[11px] text-slate-500 mt-1';

const shortcutBtnClass =
  'inline-flex items-center gap-1 text-[11px] font-semibold text-[#246b27] bg-emerald-50 hover:bg-emerald-100 border border-[#348e38]/30 px-2 py-1 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer';

function formatReadableDateFromIso(dateStr?: string): string {
  return formatDateMMMMCommaDDYYYY(dateStr);
}

export const BirthCertificateForm: React.FC<BirthCertificateFormProps> = ({
  data,
  onChange,
  onReset,
  onBackToDashboard,
  onPreview,
  onSaveDraft,
  onDownloadPDF,
  isDownloadingPDF = false,
  activeBindingField,
  onActiveBindingFieldChange,
  isEditingFile = false,
  startUnlocked = false,
  multipleBirthChildNumber = 1,
  onSubmitMultipleChild,
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

  const { child, father, mother, additional, colb } = data;

  const currentColb: ColbDetails = colb || {
    formNumber: 'Municipal Form No. 102 (Revised August 2016)',
    province: child.provinceState || '',
    cityMunicipality: child.cityMunicipality || '',
    registryNo: '',
    motherCitizenship: '',
    motherReligion: '',
    fatherCitizenship: '',
    fatherReligion: '',
    attendantType: undefined,
    parentsMarried: true,
  };

  // Auto-jump to corresponding step when a field is clicked on the live certificate preview
  useEffect(() => {
    if (!activeBindingField) return;
    if (isEditingFile && isLocked) return;

    const binding = COLB_DATA_BINDINGS.find((b) => b.id === activeBindingField);
    if (!binding) return;

    let targetStep = 1;
    if (binding.id === 'header.remarks') {
      targetStep = 4;
    } else if (binding.category === 'header' || binding.category === 'child') {
      targetStep = 1;
    } else if (binding.category === 'mother') {
      targetStep = 2;
    } else if (binding.category === 'father' || binding.category === 'marriage') {
      targetStep = 3;
    } else if (
      binding.category === 'attendant' ||
      binding.category === 'informant' ||
      binding.category === 'registry'
    ) {
      targetStep = 4;
    } else if (binding.category === 'paternity') {
      targetStep = 5;
    } else if (binding.category === 'delayed') {
      targetStep = 6;
    }

    setCurrentStep(targetStep);

    setTimeout(() => {
      const el = document.getElementById(`field-input-${activeBindingField}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.focus();
      }
    }, 150);
  }, [activeBindingField, isEditingFile, isLocked]);

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

  const syncPage1ToPaternity = (
    nextChild: BirthCertificateData['child'],
    nextMother: BirthCertificateData['mother'],
    nextFather: BirthCertificateData['father'],
    nextColb: ColbDetails
  ): ColbDetails => {
    const fName =
      formatName(
        nextColb.fatherFirstName || '',
        nextColb.fatherMiddleName || '',
        nextColb.fatherLastName || ''
      ) || nextFather.fullName || '';
    const mName =
      formatName(
        nextColb.motherFirstName || '',
        nextColb.motherMiddleName || '',
        nextColb.motherLastName || ''
      ) || nextMother.fullName || '';
    const cName =
      formatName(nextChild.firstName, nextChild.middleName, nextChild.lastName) ||
      nextChild.fullName ||
      '';
    const birthPlace = [nextChild.placeOfBirth, nextChild.cityMunicipality, nextChild.provinceState]
      .filter(Boolean)
      .join(', ');

    return {
      ...nextColb,
      paternityFatherName: fName.toUpperCase(),
      paternityMotherName: mName.toUpperCase(),
      paternityChildName: cName.toUpperCase(),
      paternityBirthDate: formatDateMMMMCommaDDYYYY(nextChild.dateOfBirth),
      paternityBirthPlace: birthPlace.toUpperCase(),
    };
  };

  const updateChild = (field: keyof typeof child, rawVal: string) => {
    const val =
      field === 'sex' || field === 'dateOfBirth'
        ? rawVal
        : normalizeNotApplicable(rawVal).toUpperCase();
    const updated = { ...child, [field]: val };
    const nextAdditional = { ...additional };
    let nextColb = { ...currentColb };

    if (field === 'firstName' || field === 'middleName' || field === 'lastName') {
      const f = field === 'firstName' ? val : child.firstName;
      const m = field === 'middleName' ? val : child.middleName;
      const l = field === 'lastName' ? val : child.lastName;
      updated.fullName = formatName(f, m, l);
    }
    if (field === 'placeOfBirth') {
      nextAdditional.hospitalFacility = val;
    }
    if (field === 'cityMunicipality') {
      nextColb.cityMunicipality = val;
    }
    if (field === 'provinceState') {
      nextColb.province = val;
    }
    if (field === 'timeOfBirth') {
      nextColb.attendantTime = val;
    }

    nextColb = syncPage1ToPaternity(updated, mother, father, nextColb);
    onChange({ ...data, child: updated, additional: nextAdditional, colb: nextColb });
  };

  const formatColbParentsMarriageDate = (
    month?: string,
    day?: string,
    year?: string
  ): string => {
    const iso = fromMonthDayYearToIso(month, day, year);
    if (iso) return formatDateMMMMCommaDDYYYY(iso);
    const cleanMonth = toFullMonthName(month);
    const cleanDay = (day || '').trim();
    const cleanYear = (year || '').trim();
    if (!cleanMonth && !cleanDay && !cleanYear) return '';
    return `${[cleanMonth, cleanDay].filter(Boolean).join(' ')}${
      cleanYear ? `${cleanMonth || cleanDay ? ', ' : ''}${cleanYear}` : ''
    }`
      .trim()
      .toUpperCase();
  };

  const syncItem20ToDelayedItem4 = (nextColb: ColbDetails, fatherFull: string): ColbDetails => {
    const isMarried =
      nextColb.parentsMarried !== false && !nextColb.parentsMarriageDatePlace?.includes('NOT MARRIED');
    const updated: ColbDetails = {
      ...nextColb,
      delayedParentsStatus: isMarried ? 'married' : 'not_married',
    };
    if (isMarried) {
      const dateStr = formatColbParentsMarriageDate(
        nextColb.parentsMarriageDateMonth,
        nextColb.parentsMarriageDateDay,
        nextColb.parentsMarriageDateYear
      );
      const placeStr = [
        nextColb.parentsMarriagePlaceCity,
        nextColb.parentsMarriagePlaceProvince,
        nextColb.parentsMarriagePlaceCountry,
      ]
        .filter(Boolean)
        .join(', ')
        .trim()
        .toUpperCase();
      if (dateStr || placeStr) {
        updated.delayedParentsMarriageDatePlace = [dateStr, placeStr].filter(Boolean).join(' AT ');
      } else if (
        nextColb.parentsMarriageDatePlace &&
        !nextColb.parentsMarriageDatePlace.includes('NOT MARRIED')
      ) {
        updated.delayedParentsMarriageDatePlace = nextColb.parentsMarriageDatePlace.toUpperCase();
      }
    } else {
      updated.delayedFatherName = (fatherFull || nextColb.paternityFatherName || updated.delayedFatherName || '').toUpperCase();
      updated.delayedAcknowledged = true;
    }
    return updated;
  };

  const COLB_PRESERVE_CASE_FIELDS = new Set<keyof ColbDetails>([
    'attendantType',
    'attendantTimeAmPm',
    'multipleBirthOrder',
    'delayedApplicantType',
    'delayedAffiantCivilStatus',
    'delayedParentsStatus',
  ]);

  const updateColb = (field: keyof ColbDetails, rawVal: unknown) => {
    const val =
      typeof rawVal === 'string'
        ? COLB_PRESERVE_CASE_FIELDS.has(field)
          ? rawVal
          : normalizeNotApplicable(rawVal).toUpperCase()
        : rawVal;
    let nextColb: ColbDetails = { ...currentColb, [field]: val };
    if (String(field).startsWith('delayed') && field !== 'delayedParentsStatus' && val) {
      nextColb.affidavitDelayedRegEnabled = true;
    }
    const nextChild = { ...child };
    const nextMother = { ...mother };
    const nextFather = { ...father };
    const nextAdditional = { ...additional };

    if (field === 'province' && typeof val === 'string') {
      nextChild.provinceState = val;
    } else if (field === 'cityMunicipality' && typeof val === 'string') {
      nextChild.cityMunicipality = val;
    } else if (field === 'birthOrder' && typeof val === 'string') {
      nextAdditional.birthOrder = val;
    } else if (field === 'motherCitizenship' && typeof val === 'string') {
      nextMother.nationality = val;
    } else if (field === 'fatherCitizenship' && typeof val === 'string') {
      nextFather.nationality = val;
    } else if (field === 'attendantTime' && typeof val === 'string') {
      nextChild.timeOfBirth = val;
    } else if (field === 'attendantType' && typeof val === 'string') {
      const map: Record<string, string> = {
        '1': 'Physician',
        '2': 'Nurse',
        '3': 'Midwife',
        '4': 'Hilot',
        '5': 'Others',
      };
      nextAdditional.attendantAtBirth = map[val] || nextAdditional.attendantAtBirth;
    }

    // Bidirectional sync for Item 20 discrete fields <-> combined parentsMarriageDatePlace + Delayed Reg #4
    const item20Fields: Array<keyof ColbDetails> = [
      'parentsMarried',
      'parentsMarriageDatePlace',
      'parentsMarriageDateMonth',
      'parentsMarriageDateDay',
      'parentsMarriageDateYear',
      'parentsMarriagePlaceCity',
      'parentsMarriagePlaceProvince',
      'parentsMarriagePlaceCountry',
    ];
    if (item20Fields.includes(field)) {
      if (
        field === 'parentsMarriageDateMonth' ||
        field === 'parentsMarriageDateDay' ||
        field === 'parentsMarriageDateYear' ||
        field === 'parentsMarriagePlaceCity' ||
        field === 'parentsMarriagePlaceProvince' ||
        field === 'parentsMarriagePlaceCountry'
      ) {
        const dPart = formatColbParentsMarriageDate(
          nextColb.parentsMarriageDateMonth,
          nextColb.parentsMarriageDateDay,
          nextColb.parentsMarriageDateYear
        );
        const pPart = [
          nextColb.parentsMarriagePlaceCity,
          nextColb.parentsMarriagePlaceProvince,
          nextColb.parentsMarriagePlaceCountry,
        ]
          .filter(Boolean)
          .join(', ')
          .trim()
          .toUpperCase();
        if (nextColb.parentsMarried !== false) {
          nextColb.parentsMarriageDatePlace = [dPart, pPart].filter(Boolean).join(' - ');
        }
      } else if (field === 'parentsMarriageDatePlace' && typeof val === 'string' && !val.includes('NOT MARRIED')) {
        const dashIdx = val.indexOf(' - ');
        const dateStr = dashIdx >= 0 ? val.slice(0, dashIdx).trim() : val.split('-')[0]?.trim() || '';
        const placeStr = dashIdx >= 0 ? val.slice(dashIdx + 3).trim() : val.includes('-') ? val.split('-').slice(1).join('-').trim() : '';
        if (dateStr) {
          const parsed = parseIsoDateToColbParts(dateStr);
          if (parsed) {
            nextColb.parentsMarriageDateMonth = parsed.monthName;
            nextColb.parentsMarriageDateDay = parsed.dayPadded;
            nextColb.parentsMarriageDateYear = parsed.year;
          } else {
            const commaSplit = dateStr.split(',');
            const md = commaSplit[0]?.trim().split(/\s+/) || [];
            nextColb.parentsMarriageDateMonth = (md[0] || '').toUpperCase();
            nextColb.parentsMarriageDateDay = md[1] || '';
            nextColb.parentsMarriageDateYear = commaSplit[1]?.trim() || '';
          }
        }
        if (placeStr) {
          const locs = placeStr.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean);
          nextColb.parentsMarriagePlaceCity = locs[0] || '';
          nextColb.parentsMarriagePlaceProvince = locs[1] || '';
          nextColb.parentsMarriagePlaceCountry = locs[2] || (locs.length > 0 ? 'PHILIPPINES' : '');
        }
      }
      const fatherFull =
        formatName(
          nextColb.fatherFirstName || '',
          nextColb.fatherMiddleName || '',
          nextColb.fatherLastName || ''
        ) || nextFather.fullName;
      nextColb = syncItem20ToDelayedItem4(nextColb, fatherFull);
    }

    if (field === 'province' || field === 'cityMunicipality') {
      nextColb = syncPage1ToPaternity(nextChild, nextMother, nextFather, nextColb);
    }

    onChange({
      ...data,
      child: nextChild,
      mother: nextMother,
      father: nextFather,
      additional: nextAdditional,
      colb: nextColb,
    });
  };

  const updateMotherNames = (rawFirst: string, rawMid: string, rawLast: string) => {
    const first = normalizeNotApplicable(rawFirst).toUpperCase();
    const mid = normalizeNotApplicable(rawMid).toUpperCase();
    const last = normalizeNotApplicable(rawLast).toUpperCase();
    const full = formatName(first, mid, last);
    const nextMother = { ...mother, fullName: full };
    const nextColb = syncPage1ToPaternity(child, nextMother, father, {
      ...currentColb,
      motherFirstName: first,
      motherMiddleName: mid,
      motherLastName: last,
    });
    onChange({
      ...data,
      mother: nextMother,
      colb: nextColb,
    });
  };

  const updateFatherNames = (rawFirst: string, rawMid: string, rawLast: string) => {
    const first = normalizeNotApplicable(rawFirst).toUpperCase();
    const mid = normalizeNotApplicable(rawMid).toUpperCase();
    const last = normalizeNotApplicable(rawLast).toUpperCase();
    const full = formatName(first, mid, last);
    const nextFather = { ...father, fullName: full };
    let nextColb: ColbDetails = {
      ...currentColb,
      fatherFirstName: first,
      fatherMiddleName: mid,
      fatherLastName: last,
    };
    if (currentColb.parentsMarried === false || currentColb.delayedParentsStatus === 'not_married') {
      nextColb = syncItem20ToDelayedItem4(nextColb, full);
    }
    nextColb = syncPage1ToPaternity(child, mother, nextFather, nextColb);
    onChange({
      ...data,
      father: nextFather,
      colb: nextColb,
    });
  };

  const copyMotherResidenceToFather = () => {
    onChange({
      ...data,
      colb: {
        ...currentColb,
        fatherResidenceStreet: currentColb.motherResidenceStreet || '',
        fatherResidenceCity: currentColb.motherResidenceCity || child.cityMunicipality || '',
        fatherResidenceProvince: currentColb.motherResidenceProvince || child.provinceState || '',
        fatherResidenceCountry: currentColb.motherResidenceCountry || child.country || '',
      },
    });
  };

  const copyChildBirthplaceToMotherResidence = () => {
    onChange({
      ...data,
      colb: {
        ...currentColb,
        motherResidenceCity: child.cityMunicipality || currentColb.cityMunicipality || '',
        motherResidenceProvince: child.provinceState || currentColb.province || '',
        motherResidenceCountry: child.country || '',
      },
    });
  };

  const copyChildBirthplaceToParentsMarriagePlace = () => {
    const city = (child.cityMunicipality || currentColb.cityMunicipality || '').toUpperCase();
    const prov = (child.provinceState || currentColb.province || '').toUpperCase();
    const country = (child.country || '').toUpperCase();
    const dPart = formatColbParentsMarriageDate(
      currentColb.parentsMarriageDateMonth,
      currentColb.parentsMarriageDateDay,
      currentColb.parentsMarriageDateYear
    );
    const pPart = [city, prov, country].filter(Boolean).join(', ').toUpperCase();
    const nextColb = syncItem20ToDelayedItem4(
      {
        ...currentColb,
        parentsMarried: true,
        parentsMarriagePlaceCity: city,
        parentsMarriagePlaceProvince: prov,
        parentsMarriagePlaceCountry: country,
        parentsMarriageDatePlace: [dPart, pPart].filter(Boolean).join(' - '),
      },
      father.fullName
    );
    onChange({ ...data, colb: nextColb });
  };

  const copyParentToInformant = (role: 'father' | 'mother') => {
    const name =
      (role === 'father'
        ? formatName(
            currentColb.fatherFirstName || '',
            currentColb.fatherMiddleName || '',
            currentColb.fatherLastName || ''
          ) || father.fullName
        : formatName(
            currentColb.motherFirstName || '',
            currentColb.motherMiddleName || '',
            currentColb.motherLastName || ''
          ) || mother.fullName
      ).toUpperCase();
    const addr = (
      role === 'father'
        ? [
            currentColb.fatherResidenceStreet || currentColb.motherResidenceStreet,
            currentColb.fatherResidenceCity || currentColb.motherResidenceCity || child.cityMunicipality,
            currentColb.fatherResidenceProvince || currentColb.motherResidenceProvince || child.provinceState,
          ]
            .filter(Boolean)
            .join(', ')
        : [
            currentColb.motherResidenceStreet,
            currentColb.motherResidenceCity || child.cityMunicipality,
            currentColb.motherResidenceProvince || child.provinceState,
          ]
            .filter(Boolean)
            .join(', ')
    ).toUpperCase();
    onChange({
      ...data,
      colb: {
        ...currentColb,
        informantSignatureName: name,
        informantRelationship: role === 'father' ? 'FATHER' : 'MOTHER',
        informantAddress: addr,
      },
    });
  };

  const copyReceivedToRegistered = () => {
    onChange({
      ...data,
      colb: {
        ...currentColb,
        registeredByName: currentColb.receivedByName || currentColb.registeredByName || '',
        registeredByTitle: currentColb.receivedByTitle || currentColb.registeredByTitle || '',
        registeredByDate: currentColb.receivedByDate || currentColb.registeredByDate || '',
      },
    });
  };

  const autofillPaternityFromPage1 = () => {
    const fName =
      (formatName(
        currentColb.fatherFirstName || '',
        currentColb.fatherMiddleName || '',
        currentColb.fatherLastName || ''
      ) || father.fullName).toUpperCase();
    const mName =
      (formatName(
        currentColb.motherFirstName || '',
        currentColb.motherMiddleName || '',
        currentColb.motherLastName || ''
      ) || mother.fullName).toUpperCase();
    const cName =
      (formatName(child.firstName, child.middleName, child.lastName) || child.fullName).toUpperCase();
    const birthPlace = [child.placeOfBirth, child.cityMunicipality, child.provinceState]
      .filter(Boolean)
      .join(', ')
      .toUpperCase();
    const lcrPlace = [child.cityMunicipality || currentColb.cityMunicipality, child.provinceState || currentColb.province]
      .filter(Boolean)
      .join(', ')
      .toUpperCase();
    onChange({
      ...data,
      colb: {
        ...currentColb,
        affidavitPaternityEnabled: true,
        paternityFatherName: fName,
        paternityMotherName: mName,
        paternityChildName: cName,
        paternityBirthDate: formatReadableDateFromIso(child.dateOfBirth),
        paternityBirthPlace: birthPlace,
        paternitySwornPlace: (currentColb.paternitySwornPlace || lcrPlace).toUpperCase(),
        affidavitPaternityAdminOfficer:
          (currentColb.affidavitPaternityAdminOfficer || currentColb.registeredByName || currentColb.receivedByName || '').toUpperCase(),
        paternityAdminOfficerTitle:
          (currentColb.paternityAdminOfficerTitle || currentColb.registeredByTitle || 'MUNICIPAL CIVIL REGISTRAR').toUpperCase(),
      },
    });
  };

  const autofillDelayedFromPage1 = () => {
    const fName =
      (formatName(
        currentColb.fatherFirstName || '',
        currentColb.fatherMiddleName || '',
        currentColb.fatherLastName || ''
      ) || father.fullName).toUpperCase();
    const mName =
      (formatName(
        currentColb.motherFirstName || '',
        currentColb.motherMiddleName || '',
        currentColb.motherLastName || ''
      ) || mother.fullName).toUpperCase();
    const cName =
      (formatName(child.firstName, child.middleName, child.lastName) || child.fullName).toUpperCase();
    const affiantAddr = [
      currentColb.motherResidenceStreet,
      currentColb.motherResidenceCity || child.cityMunicipality,
      currentColb.motherResidenceProvince || child.provinceState,
    ]
      .filter(Boolean)
      .join(', ')
      .toUpperCase();
    const birthPlace = [child.placeOfBirth, child.cityMunicipality, child.provinceState]
      .filter(Boolean)
      .join(', ')
      .toUpperCase();
    const lcrPlace = [child.cityMunicipality || currentColb.cityMunicipality, child.provinceState || currentColb.province]
      .filter(Boolean)
      .join(', ')
      .toUpperCase();
    const synced = syncItem20ToDelayedItem4(
      {
        ...currentColb,
        affidavitDelayedRegEnabled: true,
        delayedAffiantName: (currentColb.delayedAffiantName || fName || mName || '').toUpperCase(),
        delayedAffiantResidence: (currentColb.delayedAffiantResidence || affiantAddr).toUpperCase(),
        delayedChildName: cName,
        delayedApplicantPlace: birthPlace,
        delayedApplicantDate: formatReadableDateFromIso(child.dateOfBirth),
        delayedAttendantName: (currentColb.delayedAttendantName || currentColb.attendantSignatureName || '').toUpperCase(),
        delayedAttendantAddress: (currentColb.delayedAttendantAddress || currentColb.attendantAddress || '').toUpperCase(),
        delayedCitizenship: (currentColb.delayedCitizenship || currentColb.motherCitizenship || 'FILIPINO').toUpperCase(),
        delayedAffiantRelationship:
          (currentColb.delayedAffiantRelationship || (fName ? 'FATHER' : mName ? 'MOTHER' : '')).toUpperCase(),
        delayedSwornPlace: (currentColb.delayedSwornPlace || lcrPlace).toUpperCase(),
        delayedAdminOfficerName:
          (currentColb.delayedAdminOfficerName || currentColb.registeredByName || currentColb.receivedByName || '').toUpperCase(),
        delayedAdminOfficerTitle:
          (currentColb.delayedAdminOfficerTitle || currentColb.registeredByTitle || 'MUNICIPAL CIVIL REGISTRAR').toUpperCase(),
      },
      fName
    );
    onChange({ ...data, colb: synced });
  };

  const getFocusProps = (fieldId: string) => ({
    id: `field-input-${fieldId}`,
    onFocus: () => onActiveBindingFieldChange?.(fieldId),
    onBlur: () => {
      if (activeBindingField === fieldId) {
        onActiveBindingFieldChange?.(null);
      }
    },
  });

  const renderTimeOfBirthControl = () => {
    const rawTime = currentColb.attendantTime || child.timeOfBirth || '';
    const timePeriod: 'AM' | 'PM' = /\bpm\b/i.test(rawTime)
      ? 'PM'
      : /\bam\b/i.test(rawTime)
      ? 'AM'
      : currentColb.attendantTimeAmPm === 'pm'
      ? 'PM'
      : 'AM';
    const timeDigits = rawTime.replace(/\s*\b(am|pm)\b\s*$/i, '');

    const commitTime = (nextDigits: string, nextPeriod: 'AM' | 'PM') => {
      const cleanedDigits = nextDigits.replace(/\b(am|pm)\b/gi, '').trim();
      const composed = cleanedDigits ? `${cleanedDigits} ${nextPeriod}` : '';
      onChange({
        ...data,
        child: { ...child, timeOfBirth: composed },
        colb: {
          ...currentColb,
          attendantTime: composed,
          attendantTimeAmPm: nextPeriod.toLowerCase() as 'am' | 'pm',
        },
      });
    };

    return (
      <div className="flex items-center gap-2">
        <input
          type="text"
          {...getFocusProps('attendant.time')}
          placeholder="07:35"
          value={timeDigits}
          onChange={(e) => commitTime(e.target.value, timePeriod)}
          className={`${inputBaseClass} flex-1 min-w-0`}
        />
        <select
          aria-label="Time of birth AM/PM"
          value={timePeriod}
          onChange={(e) => commitTime(timeDigits, e.target.value === 'PM' ? 'PM' : 'AM')}
          className={`${inputBaseClass} w-24 shrink-0 cursor-pointer`}
        >
          <option value="AM">AM</option>
          <option value="PM">PM</option>
        </select>
      </div>
    );
  };

  const steps = getSteps();
  const activeStepMeta = steps[currentStep - 1];
  const progressPercent = Math.round((currentStep / TOTAL_STEPS) * 100);
  const isMultipleBirth =
    additional.birthType === 'Twin' ||
    additional.birthType === 'Triplet' ||
    additional.birthType === 'Multiple';
  const targetMultipleCount =
    additional.birthType === 'Twin' ? 2 : additional.birthType === 'Triplet' ? 3 : null;
  const shouldAutoAddNextChild =
    isMultipleBirth &&
    (targetMultipleCount === null || multipleBirthChildNumber < targetMultipleCount);

  return (
    <div ref={formTopRef} className="space-y-3.5 scroll-mt-20">
      {/* Home Button Above Form */}
      {onBackToDashboard && (
        <div className="flex items-center">
          <button
            type="button"
            onClick={onBackToDashboard}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 hover:text-slate-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#348e38]"
          >
            <Home className="w-3.5 h-3.5 text-[#348e38]" />
            <span>Home</span>
          </button>
        </div>
      )}

      {/* Google Form Style Title Card */}
      <div className="bg-white rounded-xl border border-[#348e38]/40 border-t-[5px] border-t-[#348e38] p-4 sm:p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight leading-snug">
              Certificate of Live Birth Form Registry
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Municipal Form No. 102 (August 2016)
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
                className={`w-9 h-9 rounded-lg border flex items-center justify-center transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#348e38] ${
                  isSaved
                    ? 'bg-emerald-50 border-[#348e38] text-[#246b27]'
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
                className="w-9 h-9 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#348e38]"
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
                className="w-9 h-9 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 flex items-center justify-center transition-colors disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#348e38]"
              >
                {isDownloadingPDF ? (
                  <Loader2 className="w-4 h-4 animate-spin text-[#348e38]" />
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
                  className="h-full bg-[#348e38] transition-all duration-200 rounded-full"
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
                    ? '1. Child'
                    : s.id === 2
                    ? '2. Mother'
                    : s.id === 3
                    ? '3. Father'
                    : s.id === 4
                    ? '4. Registry'
                    : s.id === 5
                    ? '5. Paternity'
                    : '6. Delayed';
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => goToStep(s.id)}
                    className={`px-2 py-1 rounded-md text-[11px] font-semibold border transition-colors truncate cursor-pointer ${
                      isActive
                        ? 'bg-[#348e38] text-white border-[#348e38]'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-emerald-50 hover:text-[#246b27] hover:border-[#348e38]/40'
                    }`}
                  >
                    {shortLabel}
                  </button>
                );
              })}
            </div>

            {isMultipleBirth && (
              <div className="px-3 py-2 rounded-lg bg-emerald-50/70 border border-[#348e38]/30 text-[11px] text-[#1f5c22] flex items-center justify-between gap-2">
                <span className="font-semibold">
                  Multiple Birth ({additional.birthType}) &middot; Child {multipleBirthChildNumber}
                  {targetMultipleCount ? ` of ${targetMultipleCount}` : ''}
                </span>
                <span className="text-[#246b27]/85">
                  {multipleBirthChildNumber > 1
                    ? 'Parents & delivery details carried over'
                    : 'Next child form will auto-open after submit'}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* =================================================================== */}
      {/* LOCKED DRAFT VIEW: READ-ONLY TABLE SUMMARY                          */}
      {/* =================================================================== */}
      {isEditingFile && isLocked && (
        <div className="bg-white rounded-xl border border-[#348e38]/45 overflow-hidden">
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
                    ['Province', currentColb.province],
                    ['City / Municipality', currentColb.cityMunicipality],
                    ['Registry No.', currentColb.registryNo],
                  ],
                },
                {
                  section: 'Child Particulars (Items 1–6)',
                  rows: [
                    ['1. Child Name', formatName(child.firstName, child.middleName, child.lastName) || child.fullName],
                    ['2. Sex', child.sex],
                    ['3. Date of Birth', formatDateMMMMCommaDDYYYY(child.dateOfBirth)],
                    [
                      'Time of Birth',
                      currentColb.attendantTime
                        ? /\b(am|pm)\b/i.test(currentColb.attendantTime)
                          ? currentColb.attendantTime
                          : `${currentColb.attendantTime} ${(currentColb.attendantTimeAmPm || '').toUpperCase()}`.trim()
                        : child.timeOfBirth || '',
                    ],
                    [
                      '4. Place of Birth',
                      [child.placeOfBirth, child.cityMunicipality, child.provinceState].filter(Boolean).join(', '),
                    ],
                    ['5a. Type of Birth', additional.birthType],
                    [
                      '5b. Multiple Birth Order',
                      (additional.birthType || currentColb.typeOfBirth || '').toLowerCase() === 'single'
                        ? 'N/A'
                        : currentColb.multipleBirthOrder,
                    ],
                    ['5c. Birth Order', currentColb.birthOrder || additional.birthOrder],
                    ['6. Weight at Birth', currentColb.weightAtBirth ? `${currentColb.weightAtBirth} grams` : ''],
                  ],
                },
                {
                  section: "Mother's Information (Items 7–13)",
                  rows: [
                    [
                      '7. Maiden Name',
                      formatName(
                        currentColb.motherFirstName || '',
                        currentColb.motherMiddleName || '',
                        currentColb.motherLastName || ''
                      ) || mother.fullName,
                    ],
                    ['8. Citizenship', currentColb.motherCitizenship || mother.nationality],
                    ['9. Religion', currentColb.motherReligion],
                    [
                      '10a–c. Children Born / Living / Dead',
                      [
                        currentColb.totalChildrenBornAlive && `Born Alive: ${currentColb.totalChildrenBornAlive}`,
                        currentColb.childrenStillLiving && `Living: ${currentColb.childrenStillLiving}`,
                        currentColb.childrenNowDead && `Dead: ${currentColb.childrenNowDead}`,
                      ]
                        .filter(Boolean)
                        .join(' · '),
                    ],
                    ['11. Occupation', currentColb.motherOccupation],
                    ['12. Age at Birth', currentColb.motherAgeAtBirth],
                    [
                      '13. Residence',
                      [
                        currentColb.motherResidenceStreet,
                        currentColb.motherResidenceCity,
                        currentColb.motherResidenceProvince,
                      ]
                        .filter(Boolean)
                        .join(', '),
                    ],
                  ],
                },
                {
                  section: "Father's Information & Parents' Marriage (Items 14–20)",
                  rows: [
                    [
                      '14. Father Name',
                      formatName(
                        currentColb.fatherFirstName || '',
                        currentColb.fatherMiddleName || '',
                        currentColb.fatherLastName || ''
                      ) || father.fullName,
                    ],
                    ['15. Citizenship', currentColb.fatherCitizenship || father.nationality],
                    ['16. Religion', currentColb.fatherReligion],
                    ['17. Occupation', currentColb.fatherOccupation],
                    ['18. Age at Birth', currentColb.fatherAgeAtBirth],
                    [
                      '19. Residence',
                      [
                        currentColb.fatherResidenceStreet,
                        currentColb.fatherResidenceCity,
                        currentColb.fatherResidenceProvince,
                      ]
                        .filter(Boolean)
                        .join(', '),
                    ],
                    [
                      '20. Marriage of Parents',
                      currentColb.parentsMarried === false
                        ? 'NOT MARRIED'
                        : [
                            formatColbParentsMarriageDate(
                              currentColb.parentsMarriageDateMonth,
                              currentColb.parentsMarriageDateDay,
                              currentColb.parentsMarriageDateYear
                            ),
                            [
                              currentColb.parentsMarriagePlaceCity,
                              currentColb.parentsMarriagePlaceProvince,
                              currentColb.parentsMarriagePlaceCountry,
                            ]
                              .filter(Boolean)
                              .join(', '),
                          ]
                            .filter(Boolean)
                            .join(' — ') || currentColb.parentsMarriageDatePlace,
                    ],
                  ],
                },
                {
                  section: 'Certifications & Civil Registry (Items 21–25)',
                  rows: [
                    [
                      '21a. Attendant Type',
                      ({ '1': 'PHYSICIAN', '2': 'NURSE', '3': 'MIDWIFE', '4': 'HILOT', '5': currentColb.attendantOtherSpecify || 'OTHERS' } as Record<string, string>)[
                        currentColb.attendantType || ''
                      ] || '',
                    ],
                    [
                      '21b. Attendant & Time',
                      [
                        currentColb.attendantTime
                          ? /\b(am|pm)\b/i.test(currentColb.attendantTime)
                            ? currentColb.attendantTime
                            : `${currentColb.attendantTime} ${(currentColb.attendantTimeAmPm || '').toUpperCase()}`.trim()
                          : '',
                        currentColb.attendantSignatureName,
                        currentColb.attendantTitlePosition,
                        formatDateMMMMCommaDDYYYY(currentColb.attendantDate),
                      ]
                        .filter(Boolean)
                        .join(' · '),
                    ],
                    [
                      '22. Informant',
                      [
                        currentColb.informantSignatureName,
                        currentColb.informantRelationship,
                        currentColb.informantAddress,
                        formatDateMMMMCommaDDYYYY(currentColb.informantDate),
                      ]
                        .filter(Boolean)
                        .join(' · '),
                    ],
                    [
                      '23. Prepared By',
                      [
                        currentColb.preparedByName,
                        currentColb.preparedByTitle,
                        formatDateMMMMCommaDDYYYY(currentColb.preparedByDate),
                      ]
                        .filter(Boolean)
                        .join(' · '),
                    ],
                    [
                      '24. Received By',
                      [
                        currentColb.receivedByName,
                        currentColb.receivedByTitle,
                        formatDateMMMMCommaDDYYYY(currentColb.receivedByDate),
                      ]
                        .filter(Boolean)
                        .join(' · '),
                    ],
                    [
                      '25. Registered at LCR',
                      [
                        currentColb.registeredByName,
                        currentColb.registeredByTitle,
                        formatDateMMMMCommaDDYYYY(currentColb.registeredByDate),
                      ]
                        .filter(Boolean)
                        .join(' · '),
                    ],
                    ['Remarks / Annotations', currentColb.remarksAnnotation],
                  ],
                },
                ...(currentColb.affidavitPaternityEnabled || currentColb.affidavitDelayedRegEnabled
                  ? [
                      {
                        section: 'Page 2 Affidavits',
                        rows: [
                          [
                            'Admission of Paternity',
                            currentColb.affidavitPaternityEnabled
                              ? [
                                  currentColb.affidavitPaternityFatherCtc,
                                  currentColb.affidavitPaternityMotherCtc,
                                  currentColb.affidavitPaternityAdminOfficer,
                                ]
                                  .filter(Boolean)
                                  .join(' · ') || 'ENABLED'
                              : 'NOT ENABLED',
                          ],
                          [
                            'Delayed Registration',
                            currentColb.affidavitDelayedRegEnabled
                              ? [
                                  currentColb.delayedAffiantName,
                                  currentColb.delayedReason,
                                  currentColb.delayedAdminOfficerName,
                                ]
                                  .filter(Boolean)
                                  .join(' · ') || 'ENABLED'
                              : 'NOT ENABLED',
                          ],
                        ],
                      },
                    ]
                  : []),
              ].map((group) => (
                <React.Fragment key={group.section}>
                  <tr className="bg-emerald-50/70 border-y border-emerald-200/70">
                    <th
                      colSpan={2}
                      className="py-2 px-4 text-[11px] font-bold text-[#246b27] tracking-tight"
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
      {/* STEP 1: REGISTRY HEADER & CHILD PARTICULARS (ITEMS 1–6)             */}
      {/* =================================================================== */}
      {!(isEditingFile && isLocked) && currentStep === 1 && (
        <div className="space-y-3.5">
          <fieldset className={fieldsetClass}>
            <legend className={legendClass}>Registry Location &amp; Number</legend>
            <p className="text-xs text-slate-500">Province, Municipality, and LCR Registry Number</p>
            <div className="space-y-3">
              <PhilippineAddressSelector
                variant="colb"
                showBarangay={false}
                showStreet={false}
                province={currentColb.province ?? ''}
                cityMunicipality={currentColb.cityMunicipality ?? ''}
                onChange={(nextAddr) => {
                  const nextChild = {
                    ...child,
                    provinceState: nextAddr.province,
                    cityMunicipality: nextAddr.cityMunicipality,
                  };
                  const nextColb = syncPage1ToPaternity(nextChild, mother, father, {
                    ...currentColb,
                    province: nextAddr.province,
                    cityMunicipality: nextAddr.cityMunicipality,
                  });
                  onChange({ ...data, child: nextChild, colb: nextColb });
                }}
              />
              <div className="sm:max-w-xs">
                <label className={labelClass}>Registry No.</label>
                <input
                  type="text"
                  {...getFocusProps('header.registryNo')}
                  placeholder="2023-081602"
                  value={currentColb.registryNo || ''}
                  onChange={(e) => updateColb('registryNo', e.target.value)}
                  className={`${inputClass} font-mono tabular-nums`}
                />
              </div>
            </div>
          </fieldset>

          <fieldset className={fieldsetClass}>
            <legend className={legendClass}>
              1. Child Name <span className="text-rose-600">*</span>
            </legend>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <input
                  type="text"
                  {...getFocusProps('child.firstName')}
                  placeholder="First Name"
                  value={child.firstName}
                  onChange={(e) => updateChild('firstName', e.target.value)}
                  className={`${inputClass} uppercase`}
                />
                <span className={subLabelClass}>First</span>
              </div>
              <div>
                <input
                  type="text"
                  {...getFocusProps('child.middleName')}
                  placeholder="Middle Name"
                  value={child.middleName}
                  onChange={(e) => updateChild('middleName', e.target.value)}
                  className={`${inputClass} uppercase`}
                />
                <span className={subLabelClass}>Middle</span>
              </div>
              <div>
                <input
                  type="text"
                  {...getFocusProps('child.lastName')}
                  placeholder="Last Name"
                  value={child.lastName}
                  onChange={(e) => updateChild('lastName', e.target.value)}
                  className={`${inputClass} uppercase`}
                />
                <span className={subLabelClass}>Last</span>
              </div>
            </div>
          </fieldset>

          <fieldset className={fieldsetClass}>
            <legend className={legendClass}>2. Sex &amp; 3. Date / Time of Birth</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className={labelClass}>
                  2. Sex <span className="text-rose-600">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  {['Male', 'Female'].map((gender) => (
                    <button
                      key={gender}
                      type="button"
                      {...getFocusProps('child.sex')}
                      onClick={() => updateChild('sex', gender)}
                      className={`py-2 px-3 text-sm font-medium rounded-lg border flex items-center gap-2 transition-colors ${
                        child.sex === gender
                          ? 'bg-emerald-50 text-emerald-950 border-[#348e38]'
                          : 'bg-white border-[#348e38]/60 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span
                        className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${
                          child.sex === gender ? 'border-[#348e38]' : 'border-slate-400'
                        }`}
                      >
                        {child.sex === gender && (
                          <span className="w-2 h-2 rounded-full bg-[#348e38]" />
                        )}
                      </span>
                      <span>{gender === 'Male' ? '1 Male' : '2 Female'}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className={labelClass}>
                  3. Date of Birth <span className="text-rose-600">*</span>
                </label>
                <input
                  type="date"
                  {...getFocusProps('child.dateOfBirth')}
                  value={child.dateOfBirth}
                  onChange={(e) => updateChild('dateOfBirth', e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Time of Birth</label>
                {renderTimeOfBirthControl()}
              </div>
            </div>
          </fieldset>

          <fieldset className={fieldsetClass}>
            <legend className={legendClass}>
              4. Place of Birth <span className="text-rose-600">*</span>
            </legend>
            <ColbStreetBarangayAddressInput
              required
              streetLabel="Name of Hospital / Clinic / Institution or House No., Street"
              streetPlaceholder="Name of Hospital / Clinic / Institution or House No., Street"
              streetInputProps={getFocusProps('child.placeOfBirthHospital')}
              streetLine={child.placeOfBirth || ''}
              cityMunicipality={child.cityMunicipality ?? ''}
              province={child.provinceState ?? ''}
              country={child.country ?? ''}
              onChange={(nextAddr) => {
                const nextChild = {
                  ...child,
                  placeOfBirth: nextAddr.streetLine,
                  cityMunicipality: nextAddr.cityMunicipality,
                  provinceState: nextAddr.province,
                  country: nextAddr.country,
                };
                const nextAdditional = {
                  ...additional,
                  hospitalFacility: nextAddr.streetLine,
                };
                const nextColb = syncPage1ToPaternity(nextChild, mother, father, {
                  ...currentColb,
                  cityMunicipality: nextAddr.cityMunicipality,
                  province: nextAddr.province,
                });
                onChange({
                  ...data,
                  child: nextChild,
                  additional: nextAdditional,
                  colb: nextColb,
                });
              }}
            />
          </fieldset>

          <fieldset className={fieldsetClass}>
            <legend className={legendClass}>5a–6. Birth Type, Order &amp; Weight</legend>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className={labelClass}>5a. Type of Birth</label>
                <select
                  {...getFocusProps('child.birthType')}
                  value={additional.birthType || ''}
                  onChange={(e) => {
                    const nextType = e.target.value as '' | 'Single' | 'Twin' | 'Triplet' | 'Multiple';
                    const isNextSingle = nextType === 'Single';
                    const existingNonSingleOrder =
                      currentColb.multipleBirthOrder && currentColb.multipleBirthOrder !== 'N/A'
                        ? currentColb.multipleBirthOrder
                        : '';
                    const defaultOrder = !nextType
                      ? ''
                      : isNextSingle
                      ? 'N/A'
                      : existingNonSingleOrder ||
                        (multipleBirthChildNumber === 1
                          ? '1'
                          : multipleBirthChildNumber === 2
                          ? '2'
                          : '3');
                    onChange({
                      ...data,
                      additional: {
                        ...additional,
                        birthType: nextType,
                      },
                      colb: {
                        ...currentColb,
                        multipleBirthOrder: defaultOrder as '' | '1' | '2' | '3' | 'N/A',
                        ...(isNextSingle
                          ? { multipleBirthChildWas: 'N/A', multipleBirthSpecify: '' }
                          : currentColb.multipleBirthChildWas === 'N/A'
                          ? { multipleBirthChildWas: '' }
                          : {}),
                      },
                    });
                  }}
                  className={inputClass}
                >
                  <option value="">-- Select Type --</option>
                  <option value="Single">1 Single</option>
                  <option value="Twin">2 Twin</option>
                  <option value="Triplet">3 Triplet</option>
                  <option value="Multiple">4 Multiple (4+)</option>
                </select>
              </div>

              <div>
                <label className={labelClass}>5b. Multiple Order</label>
                <select
                  {...getFocusProps('child.multipleBirthOrder')}
                  value={
                    additional.birthType === 'Single'
                      ? 'N/A'
                      : currentColb.multipleBirthOrder || ''
                  }
                  disabled={!additional.birthType || additional.birthType === 'Single'}
                  onChange={(e) => updateColb('multipleBirthOrder', e.target.value)}
                  className={`${inputClass} disabled:opacity-60 disabled:bg-slate-50`}
                >
                  {additional.birthType === 'Single' ? (
                    <option value="N/A">N/A</option>
                  ) : (
                    <>
                      <option value="">-- Select Order --</option>
                      <option value="1">1 First</option>
                      <option value="2">2 Second</option>
                      <option value="3">3 Third / Others</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className={labelClass}>5c. Birth Order</label>
                <input
                  type="text"
                  {...getFocusProps('child.birthOrder')}
                  placeholder="e.g. First"
                  value={currentColb.birthOrder ?? additional.birthOrder ?? ''}
                  onChange={(e) => updateColb('birthOrder', e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            {additional.birthType &&
              additional.birthType !== 'Single' &&
              currentColb.multipleBirthOrder === '3' && (
                <div className="max-w-sm">
                  <label className={labelClass}>5b. Specify Order (If 3rd / 4th / Others)</label>
                  <input
                    type="text"
                    placeholder="e.g. Third / Fourth"
                    value={currentColb.multipleBirthSpecify || ''}
                    onChange={(e) => updateColb('multipleBirthSpecify', e.target.value)}
                    className={inputClass}
                  />
                </div>
              )}

            <div className="max-w-xs">
              <label className={labelClass}>6. Weight at Birth (grams)</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  {...getFocusProps('child.weightAtBirth')}
                  placeholder="3250"
                  value={currentColb.weightAtBirth || ''}
                  onChange={(e) => updateColb('weightAtBirth', e.target.value)}
                  className={`${inputClass} tabular-nums`}
                />
                <span className="text-xs font-medium text-slate-500 shrink-0">grams</span>
              </div>
            </div>
          </fieldset>
        </div>
      )}

      {/* =================================================================== */}
      {/* STEP 2: MOTHER'S INFORMATION (ITEMS 7–13)                           */}
      {/* =================================================================== */}
      {!(isEditingFile && isLocked) && currentStep === 2 && (
        <div className="space-y-3.5">
          <fieldset className={fieldsetClass}>
            <legend className={legendClass}>
              7. Mother&apos;s Maiden Name <span className="text-rose-600">*</span>
            </legend>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <input
                  type="text"
                  {...getFocusProps('mother.firstName')}
                  placeholder="First Name"
                  value={currentColb.motherFirstName || ''}
                  onChange={(e) =>
                    updateMotherNames(
                      e.target.value,
                      currentColb.motherMiddleName || '',
                      currentColb.motherLastName || ''
                    )
                  }
                  className={`${inputClass} uppercase`}
                />
                <span className={subLabelClass}>First</span>
              </div>
              <div>
                <input
                  type="text"
                  {...getFocusProps('mother.middleName')}
                  placeholder="Middle Name"
                  value={currentColb.motherMiddleName || ''}
                  onChange={(e) =>
                    updateMotherNames(
                      currentColb.motherFirstName || '',
                      e.target.value,
                      currentColb.motherLastName || ''
                    )
                  }
                  className={`${inputClass} uppercase`}
                />
                <span className={subLabelClass}>Middle</span>
              </div>
              <div>
                <input
                  type="text"
                  {...getFocusProps('mother.lastName')}
                  placeholder="Last Name"
                  value={currentColb.motherLastName || ''}
                  onChange={(e) =>
                    updateMotherNames(
                      currentColb.motherFirstName || '',
                      currentColb.motherMiddleName || '',
                      e.target.value
                    )
                  }
                  className={`${inputClass} uppercase`}
                />
                <span className={subLabelClass}>Last</span>
              </div>
            </div>
          </fieldset>

          <fieldset className={fieldsetClass}>
            <legend className={legendClass}>8. Citizenship &amp; 9. Religion</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>8. Citizenship</label>
                <input
                  type="text"
                  {...getFocusProps('mother.citizenship')}
                  placeholder="Filipino"
                  value={currentColb.motherCitizenship ?? ''}
                  onChange={(e) => updateColb('motherCitizenship', e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>9. Religion / Religious Sect</label>
                <input
                  type="text"
                  {...getFocusProps('mother.religion')}
                  placeholder="Roman Catholic"
                  value={currentColb.motherReligion ?? ''}
                  onChange={(e) => updateColb('motherReligion', e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
          </fieldset>

          <fieldset className={fieldsetClass}>
            <legend className={legendClass}>10. Children Born to this Mother</legend>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <input
                  type="number"
                  {...getFocusProps('mother.totalBornAlive')}
                  placeholder="1"
                  value={currentColb.totalChildrenBornAlive ?? ''}
                  onChange={(e) => updateColb('totalChildrenBornAlive', e.target.value)}
                  className={`${inputClass} tabular-nums`}
                />
                <span className={subLabelClass}>10a. Total born alive</span>
              </div>
              <div>
                <input
                  type="number"
                  {...getFocusProps('mother.childrenStillLiving')}
                  placeholder="1"
                  value={currentColb.childrenStillLiving ?? ''}
                  onChange={(e) => updateColb('childrenStillLiving', e.target.value)}
                  className={`${inputClass} tabular-nums`}
                />
                <span className={subLabelClass}>10b. Still living</span>
              </div>
              <div>
                <input
                  type="number"
                  {...getFocusProps('mother.childrenNowDead')}
                  placeholder="0"
                  value={currentColb.childrenNowDead ?? ''}
                  onChange={(e) => updateColb('childrenNowDead', e.target.value)}
                  className={`${inputClass} tabular-nums`}
                />
                <span className={subLabelClass}>10c. Born alive now dead</span>
              </div>
            </div>
          </fieldset>

          <fieldset className={fieldsetClass}>
            <legend className={legendClass}>11. Occupation &amp; 12. Age at Birth</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>11. Occupation</label>
                <input
                  type="text"
                  {...getFocusProps('mother.occupation')}
                  placeholder="e.g. Teacher"
                  value={currentColb.motherOccupation || ''}
                  onChange={(e) => updateColb('motherOccupation', e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>12. Age at Time of Birth (completed years)</label>
                <input
                  type="number"
                  {...getFocusProps('mother.ageAtBirth')}
                  placeholder="e.g. 29"
                  value={currentColb.motherAgeAtBirth || ''}
                  onChange={(e) => updateColb('motherAgeAtBirth', e.target.value)}
                  className={`${inputClass} tabular-nums`}
                />
              </div>
            </div>
          </fieldset>

          <fieldset className={fieldsetClass}>
            <legend className={legendClass}>13. Mother&apos;s Residence</legend>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-slate-500">
                Select Province, Municipality, and Barangay
              </span>
              <button
                type="button"
                onClick={copyChildBirthplaceToMotherResidence}
                className={shortcutBtnClass}
              >
                <Copy className="w-3 h-3" />
                <span>Same as Child&apos;s Birthplace</span>
              </button>
            </div>
            <ColbStreetBarangayAddressInput
              streetLabel="House No. / Street / Purok (Optional)"
              streetPlaceholder="House No., Street, Purok"
              streetInputProps={getFocusProps('mother.residenceStreet')}
              streetLine={currentColb.motherResidenceStreet || ''}
              cityMunicipality={currentColb.motherResidenceCity ?? ''}
              province={currentColb.motherResidenceProvince ?? ''}
              country={currentColb.motherResidenceCountry ?? ''}
              onChange={(nextAddr) => {
                onChange({
                  ...data,
                  colb: {
                    ...currentColb,
                    motherResidenceStreet: nextAddr.streetLine,
                    motherResidenceCity: nextAddr.cityMunicipality,
                    motherResidenceProvince: nextAddr.province,
                    motherResidenceCountry: nextAddr.country,
                  },
                });
              }}
            />
          </fieldset>
        </div>
      )}

      {/* =================================================================== */}
      {/* STEP 3: FATHER'S INFORMATION & MARRIAGE OF PARENTS (ITEMS 14–20)    */}
      {/* =================================================================== */}
      {!(isEditingFile && isLocked) && currentStep === 3 && (
        <div className="space-y-3.5">
          <fieldset className={fieldsetClass}>
            <legend className={legendClass}>
              14. Father&apos;s Name <span className="text-rose-600">*</span>
            </legend>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <input
                  type="text"
                  {...getFocusProps('father.firstName')}
                  placeholder="First Name"
                  value={currentColb.fatherFirstName || ''}
                  onChange={(e) =>
                    updateFatherNames(
                      e.target.value,
                      currentColb.fatherMiddleName || '',
                      currentColb.fatherLastName || ''
                    )
                  }
                  className={`${inputClass} uppercase`}
                />
                <span className={subLabelClass}>First</span>
              </div>
              <div>
                <input
                  type="text"
                  {...getFocusProps('father.middleName')}
                  placeholder="Middle Name"
                  value={currentColb.fatherMiddleName || ''}
                  onChange={(e) =>
                    updateFatherNames(
                      currentColb.fatherFirstName || '',
                      e.target.value,
                      currentColb.fatherLastName || ''
                    )
                  }
                  className={`${inputClass} uppercase`}
                />
                <span className={subLabelClass}>Middle</span>
              </div>
              <div>
                <input
                  type="text"
                  {...getFocusProps('father.lastName')}
                  placeholder="Last Name"
                  value={currentColb.fatherLastName || ''}
                  onChange={(e) =>
                    updateFatherNames(
                      currentColb.fatherFirstName || '',
                      currentColb.fatherMiddleName || '',
                      e.target.value
                    )
                  }
                  className={`${inputClass} uppercase`}
                />
                <span className={subLabelClass}>Last</span>
              </div>
            </div>
          </fieldset>

          <fieldset className={fieldsetClass}>
            <legend className={legendClass}>15. Citizenship &amp; 16. Religion</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>15. Citizenship</label>
                <input
                  type="text"
                  {...getFocusProps('father.citizenship')}
                  placeholder="Filipino"
                  value={currentColb.fatherCitizenship ?? ''}
                  onChange={(e) => updateColb('fatherCitizenship', e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>16. Religion / Religious Sect</label>
                <input
                  type="text"
                  {...getFocusProps('father.religion')}
                  placeholder="Roman Catholic"
                  value={currentColb.fatherReligion ?? ''}
                  onChange={(e) => updateColb('fatherReligion', e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
          </fieldset>

          <fieldset className={fieldsetClass}>
            <legend className={legendClass}>17. Occupation &amp; 18. Age at Birth</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>17. Occupation</label>
                <input
                  type="text"
                  {...getFocusProps('father.occupation')}
                  placeholder="e.g. Civil Engineer"
                  value={currentColb.fatherOccupation || ''}
                  onChange={(e) => updateColb('fatherOccupation', e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>18. Age at Time of Birth (completed years)</label>
                <input
                  type="number"
                  {...getFocusProps('father.ageAtBirth')}
                  placeholder="e.g. 32"
                  value={currentColb.fatherAgeAtBirth || ''}
                  onChange={(e) => updateColb('fatherAgeAtBirth', e.target.value)}
                  className={`${inputClass} tabular-nums`}
                />
              </div>
            </div>
          </fieldset>

          <fieldset className={fieldsetClass}>
            <legend className={legendClass}>19. Father&apos;s Residence</legend>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-slate-500">
                Select Province, Municipality, and Barangay
              </span>
              <button
                type="button"
                onClick={copyMotherResidenceToFather}
                className={shortcutBtnClass}
              >
                <Copy className="w-3 h-3" />
                <span>Copy Mother&apos;s Residence</span>
              </button>
            </div>
            <ColbStreetBarangayAddressInput
              streetLabel="House No. / Street / Purok (Optional)"
              streetPlaceholder={currentColb.motherResidenceStreet || 'House No., Street, Purok'}
              streetInputProps={getFocusProps('father.residenceStreet')}
              streetLine={currentColb.fatherResidenceStreet ?? ''}
              cityMunicipality={currentColb.fatherResidenceCity ?? ''}
              province={currentColb.fatherResidenceProvince ?? ''}
              country={currentColb.fatherResidenceCountry ?? ''}
              onChange={(nextAddr) => {
                onChange({
                  ...data,
                  colb: {
                    ...currentColb,
                    fatherResidenceStreet: nextAddr.streetLine,
                    fatherResidenceCity: nextAddr.cityMunicipality,
                    fatherResidenceProvince: nextAddr.province,
                    fatherResidenceCountry: nextAddr.country,
                  },
                });
              }}
            />
          </fieldset>

          <fieldset className={fieldsetClass}>
            <legend className={legendClass}>20. Marriage of Parents</legend>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-[13px] font-medium text-slate-900">
                Were the child&apos;s parents married at the time of birth?
              </label>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    const fallbackMarriage =
                      currentColb.parentsMarriageDatePlace?.includes('NOT MARRIED') ||
                      !currentColb.parentsMarriageDatePlace
                        ? 'OCTOBER 18, 2020 - SAGBAYAN, BOHOL, PHILIPPINES'
                        : currentColb.parentsMarriageDatePlace;
                    const nextColb = syncItem20ToDelayedItem4(
                      {
                        ...currentColb,
                        parentsMarried: true,
                        parentsMarriageDatePlace: fallbackMarriage,
                      },
                      father.fullName
                    );
                    onChange({ ...data, colb: nextColb });
                  }}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                    currentColb.parentsMarried !== false
                      ? 'bg-emerald-50 text-emerald-950 border-[#348e38]'
                      : 'bg-white text-slate-700 border-[#348e38]/60 hover:bg-slate-50'
                  }`}
                >
                  Yes, Married
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const fName =
                      formatName(
                        currentColb.fatherFirstName || '',
                        currentColb.fatherMiddleName || '',
                        currentColb.fatherLastName || ''
                      ) || father.fullName;
                    const nextColb = syncItem20ToDelayedItem4(
                      {
                        ...currentColb,
                        parentsMarried: false,
                        parentsMarriageDatePlace:
                          'NOT MARRIED - ACCOMPLISH AFFIDAVIT OF PATERNITY AT BACK',
                        affidavitPaternityEnabled: true,
                      },
                      fName
                    );
                    onChange({ ...data, colb: nextColb });
                  }}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                    currentColb.parentsMarried === false
                      ? 'bg-amber-50 text-amber-900 border-amber-600'
                      : 'bg-white text-slate-700 border-[#348e38]/60 hover:bg-slate-50'
                  }`}
                >
                  No, Unmarried
                </button>
              </div>
            </div>

            {currentColb.parentsMarried === false ? (
              <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-center justify-between gap-3">
                <p>
                  Accomplish the <strong>Affidavit of Acknowledgment / Admission of Paternity</strong> on Page 2 (Step 5).
                </p>
                <button
                  type="button"
                  onClick={() => goToStep(5)}
                  className="px-3 py-1.5 rounded-lg bg-amber-700 text-white font-medium hover:bg-amber-800 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Go to Step 5
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className={labelClass}>20a. Date of Marriage</label>
                  <input
                    type="date"
                    {...getFocusProps('parents.marriageDateMonth')}
                    value={fromMonthDayYearToIso(
                      currentColb.parentsMarriageDateMonth,
                      currentColb.parentsMarriageDateDay,
                      currentColb.parentsMarriageDateYear
                    )}
                    onChange={(e) => {
                      const parts = parseIsoDateToColbParts(e.target.value);
                      const nextMonth = parts ? parts.monthName : '';
                      const nextDay = parts ? parts.dayPadded : '';
                      const nextYear = parts ? parts.year : '';
                      const dPart = parts ? `${parts.monthName}, ${parts.dayPadded} ${parts.year}` : '';
                      const pPart = [
                        currentColb.parentsMarriagePlaceCity,
                        currentColb.parentsMarriagePlaceProvince,
                        currentColb.parentsMarriagePlaceCountry,
                      ]
                        .filter(Boolean)
                        .join(', ')
                        .trim()
                        .toUpperCase();
                      const fatherFull =
                        formatName(
                          currentColb.fatherFirstName || '',
                          currentColb.fatherMiddleName || '',
                          currentColb.fatherLastName || ''
                        ) || father.fullName;
                      const updatedColb = syncItem20ToDelayedItem4(
                        {
                          ...currentColb,
                          parentsMarried: true,
                          parentsMarriageDateMonth: nextMonth,
                          parentsMarriageDateDay: nextDay,
                          parentsMarriageDateYear: nextYear,
                          parentsMarriageDatePlace: [dPart, pPart].filter(Boolean).join(' - '),
                        },
                        fatherFull
                      );
                      onChange({ ...data, colb: updatedColb });
                    }}
                    className={inputClass}
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[13px] font-medium text-slate-900">20b. Place of Marriage</span>
                    <button
                      type="button"
                      onClick={copyChildBirthplaceToParentsMarriagePlace}
                      className={shortcutBtnClass}
                    >
                      <Copy className="w-3 h-3" />
                      <span>Same as Child&apos;s Birthplace</span>
                    </button>
                  </div>
                  <PhilippineAddressSelector
                    variant="colb"
                    showBarangay={false}
                    showStreet={false}
                    showCountry={true}
                    province={currentColb.parentsMarriagePlaceProvince ?? ''}
                    cityMunicipality={currentColb.parentsMarriagePlaceCity ?? ''}
                    country={currentColb.parentsMarriagePlaceCountry ?? ''}
                    onChange={(nextAddr) => {
                      const dPart = formatColbParentsMarriageDate(
                        currentColb.parentsMarriageDateMonth,
                        currentColb.parentsMarriageDateDay,
                        currentColb.parentsMarriageDateYear
                      );
                      const pPart = [
                        nextAddr.cityMunicipality,
                        nextAddr.province,
                        nextAddr.country,
                      ]
                        .filter(Boolean)
                        .join(', ')
                        .trim()
                        .toUpperCase();
                      const fatherFull =
                        formatName(
                          currentColb.fatherFirstName || '',
                          currentColb.fatherMiddleName || '',
                          currentColb.fatherLastName || ''
                        ) || father.fullName;
                      const updatedColb = syncItem20ToDelayedItem4(
                        {
                          ...currentColb,
                          parentsMarried: true,
                          parentsMarriagePlaceCity: nextAddr.cityMunicipality,
                          parentsMarriagePlaceProvince: nextAddr.province,
                          parentsMarriagePlaceCountry: nextAddr.country,
                          parentsMarriageDatePlace: [dPart, pPart].filter(Boolean).join(' - '),
                        },
                        fatherFull
                      );
                      onChange({ ...data, colb: updatedColb });
                    }}
                  />
                </div>

                <div>
                  <label className={labelClass}>Combined Date &amp; Place</label>
                  <input
                    type="text"
                    {...getFocusProps('parents.marriageDatePlace')}
                    placeholder="e.g. OCTOBER 18, 2020 - SAGBAYAN, BOHOL, PHILIPPINES"
                    value={currentColb.parentsMarriageDatePlace || ''}
                    onChange={(e) => updateColb('parentsMarriageDatePlace', e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>
            )}
          </fieldset>
        </div>
      )}

      {/* =================================================================== */}
      {/* STEP 4: CERTIFICATIONS & REGISTRY SIGN-OFFS (ITEMS 21–25 & REMARKS) */}
      {/* =================================================================== */}
      {!(isEditingFile && isLocked) && currentStep === 4 && (
        <div className="space-y-3.5">
          <fieldset className={fieldsetClass}>
            <legend className={legendClass}>21a. Attendant at Birth</legend>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {[
                { id: '1', label: '1 Physician' },
                { id: '2', label: '2 Nurse' },
                { id: '3', label: '3 Midwife' },
                { id: '4', label: '4 Hilot' },
                { id: '5', label: '5 Others' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  {...getFocusProps('attendant.type')}
                  onClick={() => {
                    const attendantLabelMap: Record<string, string> = {
                      '1': 'Physician',
                      '2': 'Nurse',
                      '3': 'Midwife',
                      '4': 'Hilot',
                      '5': 'Others',
                    };
                    onChange({
                      ...data,
                      additional: {
                        ...additional,
                        attendantAtBirth: attendantLabelMap[item.id] || additional.attendantAtBirth,
                      },
                      colb: {
                        ...currentColb,
                        attendantType: item.id as ColbDetails['attendantType'],
                        ...(item.id !== '5' ? { attendantOtherSpecify: '' } : {}),
                      },
                    });
                  }}
                  className={`py-2 px-2.5 text-xs font-medium rounded-lg border transition-colors ${
                    currentColb.attendantType === item.id
                      ? 'bg-emerald-50 text-emerald-950 border-[#348e38]'
                      : 'bg-white border-[#348e38]/60 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            {currentColb.attendantType === '5' && (
              <div className="pt-1">
                <label className={labelClass}>Specify Other Attendant at Birth</label>
                <input
                  type="text"
                  {...getFocusProps('attendant.otherSpecify')}
                  placeholder="e.g. Barangay Health Worker / Mother / Relative"
                  value={currentColb.attendantOtherSpecify || ''}
                  onChange={(e) => updateColb('attendantOtherSpecify', e.target.value)}
                  className={inputClass}
                />
              </div>
            )}
          </fieldset>

          <fieldset className={fieldsetClass}>
            <legend className={legendClass}>21b. Certification of Attendant</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Time of Birth</label>
                {renderTimeOfBirthControl()}
              </div>
              <div>
                <label className={labelClass}>Certification Date</label>
                <input
                  type="date"
                  {...getFocusProps('attendant.date')}
                  value={toIsoDateInput(currentColb.attendantDate)}
                  onChange={(e) => updateColb('attendantDate', formatDateMMMMCommaDDYYYY(e.target.value))}
                  className={inputClass}
                />
              </div>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-[#348e38]/30 space-y-2.5">
              <span className="text-[11px] font-bold text-[#246b27] uppercase block">
                Attendant Signatory Details
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Attendant Name in Print</label>
                  <input
                    type="text"
                    {...getFocusProps('attendant.signatureName')}
                    placeholder="DR. ELEANOR G. MARTINEZ, MD"
                    value={currentColb.attendantSignatureName || ''}
                    onChange={(e) => updateColb('attendantSignatureName', e.target.value)}
                    className={`${inputClass} uppercase`}
                  />
                </div>
                <div>
                  <label className={labelClass}>Title or Position</label>
                  <input
                    type="text"
                    {...getFocusProps('attendant.titlePosition')}
                    placeholder="Attending Physician / MHO"
                    value={currentColb.attendantTitlePosition || ''}
                    onChange={(e) => updateColb('attendantTitlePosition', e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>
              <div>
                <label className={labelClass}>Attendant Address</label>
                <SingleLinePhilippineAddressInput
                  variant="colb"
                  includeCountry={false}
                  value={currentColb.attendantAddress || ''}
                  streetLabel="Health Facility / Clinic / Street (Optional)"
                  streetPlaceholder="e.g. Sagbayan Rural Health Unit"
                  summaryInputProps={getFocusProps('attendant.address')}
                  onChange={(nextVal) => updateColb('attendantAddress', nextVal)}
                />
              </div>
            </div>
          </fieldset>

          <fieldset className={fieldsetClass}>
            <legend className={legendClass}>22. Certification of Informant</legend>
            <div className="flex flex-wrap items-center justify-between gap-2 pb-1">
              <span className="text-xs text-slate-500">Quick-fill informant from parent records:</span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => copyParentToInformant('father')}
                  className={shortcutBtnClass}
                >
                  <Copy className="w-3 h-3" />
                  <span>Copy Father</span>
                </button>
                <button
                  type="button"
                  onClick={() => copyParentToInformant('mother')}
                  className={shortcutBtnClass}
                >
                  <Copy className="w-3 h-3" />
                  <span>Copy Mother</span>
                </button>
              </div>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-[#348e38]/30">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Informant Name in Print</label>
                  <input
                    type="text"
                    {...getFocusProps('informant.signatureName')}
                    placeholder={father.fullName || 'ROBERTO M. DELA CRUZ'}
                    value={currentColb.informantSignatureName ?? ''}
                    onChange={(e) => updateColb('informantSignatureName', e.target.value)}
                    className={`${inputClass} uppercase`}
                  />
                </div>
                <div>
                  <label className={labelClass}>Relationship to the Child</label>
                  <input
                    type="text"
                    {...getFocusProps('informant.relationship')}
                    placeholder="Father"
                    value={currentColb.informantRelationship ?? ''}
                    onChange={(e) => updateColb('informantRelationship', e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>Informant Address</label>
                  <SingleLinePhilippineAddressInput
                    variant="colb"
                    includeCountry={false}
                    value={currentColb.informantAddress ?? ''}
                    streetLabel="House No. / Street / Purok (Optional)"
                    streetPlaceholder="e.g. Purok 2, Rizal St."
                    summaryInputProps={getFocusProps('informant.address')}
                    onChange={(nextVal) => updateColb('informantAddress', nextVal)}
                  />
                </div>
                <div>
                  <label className={labelClass}>Date of Certification</label>
                  <input
                    type="date"
                    {...getFocusProps('informant.date')}
                    value={toIsoDateInput(currentColb.informantDate)}
                    onChange={(e) => updateColb('informantDate', formatDateMMMMCommaDDYYYY(e.target.value))}
                    className={inputClass}
                  />
                </div>
              </div>
            </div>
          </fieldset>

          <fieldset className={fieldsetClass}>
            <legend className={legendClass}>23–25. Civil Registry Sign-Offs</legend>
            <div className="p-3 bg-slate-50 rounded-lg border border-[#348e38]/30 space-y-2.5">
              <span className="text-[11px] font-bold text-[#246b27] uppercase block">
                23. Prepared By
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className={labelClass}>Name in Print</label>
                  <input
                    type="text"
                    {...getFocusProps('registry.preparedByName')}
                    placeholder="CARMINA R. REYES"
                    value={currentColb.preparedByName ?? ''}
                    onChange={(e) => updateColb('preparedByName', e.target.value)}
                    className={`${inputClass} uppercase`}
                  />
                </div>
                <div>
                  <label className={labelClass}>Title or Position</label>
                  <input
                    type="text"
                    {...getFocusProps('registry.preparedByTitle')}
                    placeholder="Registration Assistant"
                    value={currentColb.preparedByTitle ?? ''}
                    onChange={(e) => updateColb('preparedByTitle', e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Date Prepared</label>
                  <input
                    type="date"
                    value={toIsoDateInput(currentColb.preparedByDate)}
                    onChange={(e) => updateColb('preparedByDate', formatDateMMMMCommaDDYYYY(e.target.value))}
                    className={inputClass}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="p-3 bg-slate-50 rounded-lg border border-[#348e38]/30 space-y-2.5">
                <span className="text-[11px] font-bold text-[#246b27] uppercase block">
                  24. Received By
                </span>
                <div>
                  <label className={labelClass}>Name in Print</label>
                  <input
                    type="text"
                    {...getFocusProps('registry.receivedByName')}
                    placeholder="ATTY. GREGORIO L. SANTOS"
                    value={currentColb.receivedByName ?? ''}
                    onChange={(e) => updateColb('receivedByName', e.target.value)}
                    className={`${inputClass} uppercase`}
                  />
                </div>
                <div>
                  <label className={labelClass}>Title or Position</label>
                  <input
                    type="text"
                    {...getFocusProps('registry.receivedByTitle')}
                    placeholder="Records Clerk"
                    value={currentColb.receivedByTitle ?? ''}
                    onChange={(e) => updateColb('receivedByTitle', e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Date</label>
                  <input
                    type="date"
                    {...getFocusProps('registry.receivedByDate')}
                    value={toIsoDateInput(currentColb.receivedByDate)}
                    onChange={(e) => updateColb('receivedByDate', formatDateMMMMCommaDDYYYY(e.target.value))}
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-[#348e38]/30 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-[#246b27] uppercase">
                    25. Registered By
                  </span>
                  <button
                    type="button"
                    onClick={copyReceivedToRegistered}
                    className={shortcutBtnClass}
                  >
                    <Copy className="w-3 h-3" />
                    <span>Same as 24</span>
                  </button>
                </div>
                <div>
                  <label className={labelClass}>Name in Print</label>
                  <input
                    type="text"
                    {...getFocusProps('registry.registeredByName')}
                    placeholder={currentColb.receivedByName || 'Civil Registrar Name'}
                    value={currentColb.registeredByName ?? ''}
                    onChange={(e) => updateColb('registeredByName', e.target.value)}
                    className={`${inputClass} uppercase`}
                  />
                </div>
                <div>
                  <label className={labelClass}>Title or Position</label>
                  <input
                    type="text"
                    {...getFocusProps('registry.registeredByTitle')}
                    placeholder="Municipal Civil Registrar"
                    value={currentColb.registeredByTitle ?? ''}
                    onChange={(e) => updateColb('registeredByTitle', e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Date</label>
                  <input
                    type="date"
                    {...getFocusProps('registry.registeredByDate')}
                    value={toIsoDateInput(currentColb.registeredByDate)}
                    onChange={(e) => updateColb('registeredByDate', formatDateMMMMCommaDDYYYY(e.target.value))}
                    className={inputClass}
                  />
                </div>
              </div>
            </div>
          </fieldset>

          <fieldset className={fieldsetClass}>
            <legend className={legendClass}>Remarks / Annotations (For LCRO/OCRG Use Only)</legend>
            <input
              type="text"
              {...getFocusProps('header.remarks')}
              placeholder="e.g. OFFICE OF THE MUNICIPAL CIVIL REGISTRAR - SAGBAYAN, BOHOL"
              value={currentColb.remarksAnnotation || ''}
              onChange={(e) => updateColb('remarksAnnotation', e.target.value)}
              className={inputClass}
            />
          </fieldset>
        </div>
      )}

      {/* =================================================================== */}
      {/* STEP 5: PAGE 2 — AFFIDAVIT OF ADMISSION OF PATERNITY                */}
      {/* =================================================================== */}
      {!(isEditingFile && isLocked) && currentStep === 5 && (() => {
        const autoFatherName =
          formatName(
            currentColb.fatherFirstName || '',
            currentColb.fatherMiddleName || '',
            currentColb.fatherLastName || ''
          ) || father.fullName || '';
        const autoMotherName =
          formatName(
            currentColb.motherFirstName || '',
            currentColb.motherMiddleName || '',
            currentColb.motherLastName || ''
          ) || mother.fullName || '';
        const autoChildName =
          formatName(child.firstName, child.middleName, child.lastName) || child.fullName || '';
        const autoBirthDate = formatDateMMMMCommaDDYYYY(child.dateOfBirth);
        const autoBirthPlace = [
          child.placeOfBirth || additional.hospitalFacility,
          child.cityMunicipality,
          child.provinceState,
        ]
          .filter(Boolean)
          .join(', ');

        return (
          <div className="space-y-3.5">
            <fieldset className={fieldsetClass}>
              <legend className={legendClass}>
                Affidavit of Acknowledgment / Admission of Paternity (Page 2 Top)
              </legend>
              <div className="flex flex-wrap items-center justify-between gap-2 pb-1">
                <label className="flex items-center gap-2.5 text-xs font-medium text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={currentColb.affidavitPaternityEnabled || false}
                    onChange={(e) => {
                      if (e.target.checked) {
                        autofillPaternityFromPage1();
                      } else {
                        updateColb('affidavitPaternityEnabled', false);
                      }
                    }}
                    className="w-4 h-4 accent-[#348e38] rounded shrink-0"
                  />
                  <span>Include Paternity Affidavit on Page 2</span>
                </label>
                <span className="text-[11px] font-medium text-[#246b27] bg-emerald-50 border border-[#348e38]/30 px-2 py-0.5 rounded">
                  Affidavit body auto-synced from Page 1
                </span>
              </div>

              {/* Automatic Page 1 Affidavit Narrative Preview */}
              <div className="p-3 bg-emerald-50/50 rounded-lg border border-[#348e38]/30 space-y-2">
                <span className="text-[11px] font-bold text-[#246b27] uppercase block">
                  Affidavit Narrative Particulars (Auto-populated from Page 1)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[11px]">Father (I/We)</span>
                    <span className="font-semibold text-slate-900 uppercase">
                      {autoFatherName || '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Mother (and)</span>
                    <span className="font-semibold text-slate-900 uppercase">
                      {autoMotherName || '—'}
                    </span>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-slate-500 block text-[11px]">Child&apos;s Full Name</span>
                    <span className="font-semibold text-slate-900 uppercase">
                      {autoChildName || '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Birth Date</span>
                    <span className="font-semibold text-slate-900">
                      {autoBirthDate || '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Birth Place</span>
                    <span className="font-semibold text-slate-900 uppercase">
                      {autoBirthPlace || '—'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Editable Father & Mother Signatories with Border Separation */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="p-3 bg-slate-50 rounded-lg border border-[#348e38]/35 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-[#246b27] uppercase">
                      Father Signatory (Editable)
                    </span>
                    {currentColb.paternityFatherSignatory !== undefined && (
                      <button
                        type="button"
                        onClick={() => updateColb('paternityFatherSignatory', undefined)}
                        className={shortcutBtnClass}
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Reset to Page 1</span>
                      </button>
                    )}
                  </div>
                  <div>
                    <label className={labelClass}>Printed Name of Father (Signatory)</label>
                    <input
                      type="text"
                      placeholder={autoFatherName || 'ROBERTO MENDEZ DELA CRUZ'}
                      value={currentColb.paternityFatherSignatory ?? autoFatherName}
                      onChange={(e) => updateColb('paternityFatherSignatory', e.target.value)}
                      className={`${inputClass} uppercase`}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Father CTC / Valid ID No.</label>
                    <input
                      type="text"
                      {...getFocusProps('paternity.fatherCtc')}
                      placeholder="CTC No. 0829103-B"
                      value={currentColb.affidavitPaternityFatherCtc || ''}
                      onChange={(e) => updateColb('affidavitPaternityFatherCtc', e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <div>
                      <label className={labelClass}>Father ID Date</label>
                      <input
                        type="date"
                        value={toIsoDateInput(currentColb.paternityFatherCtcDate)}
                        onChange={(e) => updateColb('paternityFatherCtcDate', formatDateMMMMCommaDDYYYY(e.target.value))}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Father ID Place</label>
                      <input
                        type="text"
                        placeholder="Issued at"
                        value={currentColb.paternityFatherCtcPlace || ''}
                        onChange={(e) => updateColb('paternityFatherCtcPlace', e.target.value)}
                        className={`${inputClass} uppercase`}
                      />
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-[#348e38]/35 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-[#246b27] uppercase">
                      Mother Signatory (Editable)
                    </span>
                    {currentColb.paternityMotherSignatory !== undefined && (
                      <button
                        type="button"
                        onClick={() => updateColb('paternityMotherSignatory', undefined)}
                        className={shortcutBtnClass}
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Reset to Page 1</span>
                      </button>
                    )}
                  </div>
                  <div>
                    <label className={labelClass}>Printed Name of Mother (Signatory)</label>
                    <input
                      type="text"
                      placeholder={autoMotherName || 'MARIA CLARA BAUTISTA SANTOS'}
                      value={currentColb.paternityMotherSignatory ?? autoMotherName}
                      onChange={(e) => updateColb('paternityMotherSignatory', e.target.value)}
                      className={`${inputClass} uppercase`}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Mother CTC / Valid ID No. (optional)</label>
                    <input
                      type="text"
                      placeholder="CTC No. / Valid ID"
                      value={currentColb.affidavitPaternityMotherCtc || ''}
                      onChange={(e) => updateColb('affidavitPaternityMotherCtc', e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <div>
                      <label className={labelClass}>Mother ID Date</label>
                      <input
                        type="date"
                        value={toIsoDateInput(currentColb.paternityMotherCtcDate)}
                        onChange={(e) => updateColb('paternityMotherCtcDate', formatDateMMMMCommaDDYYYY(e.target.value))}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Mother ID Place</label>
                      <input
                        type="text"
                        placeholder="Issued at"
                        value={currentColb.paternityMotherCtcPlace || ''}
                        onChange={(e) => updateColb('paternityMotherCtcPlace', e.target.value)}
                        className={`${inputClass} uppercase`}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Jurat & Administering Officer */}
              <div className="pt-2 border-t border-slate-100 space-y-3">
                <span className="text-xs font-bold text-[#246b27] block">
                  Jurat &amp; Administering Officer
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Sworn Date (Jurat)</label>
                    <input
                      type="date"
                      value={fromMonthDayYearToIso(
                        currentColb.paternitySwornMonth,
                        currentColb.paternitySwornDay,
                        currentColb.paternitySwornYear
                      )}
                      onChange={(e) => {
                        const parts = parseIsoDateToColbParts(e.target.value);
                        onChange({
                          ...data,
                          colb: {
                            ...currentColb,
                            paternitySwornDay: parts ? parts.dayOrdinal : '',
                            paternitySwornMonth: parts ? parts.monthName : '',
                            paternitySwornYear: parts ? parts.year : '',
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
                      value={currentColb.paternitySwornPlace || ''}
                      onChange={(e) => updateColb('paternitySwornPlace', e.target.value)}
                      className={`${inputClass} uppercase`}
                    />
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-[#348e38]/35 space-y-2.5">
                  <span className="text-[11px] font-bold text-[#246b27] uppercase block">
                    Administering Officer Signatory (Editable)
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Administering Officer Name</label>
                      <input
                        type="text"
                        {...getFocusProps('paternity.adminOfficer')}
                        placeholder="ATTY. GREGORIO L. SANTOS"
                        value={currentColb.affidavitPaternityAdminOfficer || ''}
                        onChange={(e) => updateColb('affidavitPaternityAdminOfficer', e.target.value)}
                        className={`${inputClass} uppercase`}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Officer Position / Title</label>
                      <input
                        type="text"
                        placeholder="Municipal Civil Registrar"
                        value={currentColb.paternityAdminOfficerTitle || ''}
                        onChange={(e) => updateColb('paternityAdminOfficerTitle', e.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className={labelClass}>Administering Officer Address</label>
                      <input
                        type="text"
                        placeholder="Municipal Hall, Sagbayan, Bohol"
                        value={currentColb.paternityAdminOfficerAddress || ''}
                        onChange={(e) => updateColb('paternityAdminOfficerAddress', e.target.value)}
                        className={`${inputClass} uppercase`}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </fieldset>
          </div>
        );
      })()}

      {/* =================================================================== */}
      {/* STEP 6: PAGE 2 — AFFIDAVIT FOR DELAYED REGISTRATION OF BIRTH        */}
      {/* =================================================================== */}
      {!(isEditingFile && isLocked) && currentStep === 6 && (
        <div className="space-y-3.5">
          <fieldset className={fieldsetClass}>
            <legend className={legendClass}>
              Affidavit for Delayed Registration of Birth (Page 2 Bottom)
            </legend>
            <div className="flex flex-wrap items-center justify-between gap-2 pb-1">
              <label className="flex items-center gap-2.5 text-xs font-medium text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={currentColb.affidavitDelayedRegEnabled || false}
                  onChange={(e) => updateColb('affidavitDelayedRegEnabled', e.target.checked)}
                  className="w-4 h-4 accent-[#348e38] rounded shrink-0"
                />
                <span>Include Delayed Registration Affidavit on Page 2</span>
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

            <div className="space-y-3 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Affiant Name</label>
                  <input
                    type="text"
                    {...getFocusProps('delayed.affiantName')}
                    placeholder="ROBERTO M. DELA CRUZ"
                    value={currentColb.delayedAffiantName || ''}
                    onChange={(e) => updateColb('delayedAffiantName', e.target.value)}
                    className={`${inputClass} uppercase`}
                  />
                </div>
                <div>
                  <label className={labelClass}>Civil Status</label>
                  <select
                    value={currentColb.delayedAffiantCivilStatus || 'single'}
                    onChange={(e) => updateColb('delayedAffiantCivilStatus', e.target.value)}
                    className={inputClass}
                  >
                    <option value="single">Single</option>
                    <option value="married">Married</option>
                    <option value="divorced">Divorced</option>
                    <option value="widowed">Widow / Widower</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>Affiant Residence &amp; Postal Address</label>
                  <SingleLinePhilippineAddressInput
                    variant="colb"
                    includeCountry={false}
                    value={currentColb.delayedAffiantResidence || ''}
                    streetLabel="House No. / Street / Purok (Optional)"
                    streetPlaceholder="e.g. Purok 1"
                    onChange={(nextVal) => updateColb('delayedAffiantResidence', nextVal)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>1. Applicant Registration Type</label>
                  <select
                    value={currentColb.delayedApplicantType || 'birth_of'}
                    onChange={(e) => updateColb('delayedApplicantType', e.target.value)}
                    className={inputClass}
                  >
                    <option value="birth_of">The birth of child (Third Party / Parent)</option>
                    <option value="my_birth">My own birth (18 years old or over)</option>
                  </select>
                </div>
                {currentColb.delayedApplicantType !== 'my_birth' && (
                  <div>
                    <label className={labelClass}>1. Child&apos;s Name (the birth of)</label>
                    <input
                      type="text"
                      placeholder={child.fullName || 'Full name of child'}
                      value={currentColb.delayedChildName || ''}
                      onChange={(e) => updateColb('delayedChildName', e.target.value)}
                      className={`${inputClass} uppercase`}
                    />
                  </div>
                )}
                <div>
                  <label className={labelClass}>1. Birth Place (in)</label>
                  <input
                    type="text"
                    placeholder="Sagbayan, Bohol"
                    value={currentColb.delayedApplicantPlace || ''}
                    onChange={(e) => updateColb('delayedApplicantPlace', e.target.value)}
                    className={`${inputClass} uppercase`}
                  />
                </div>
                <div>
                  <label className={labelClass}>1. Birth Date (on)</label>
                  <input
                    type="date"
                    value={toIsoDateInput(currentColb.delayedApplicantDate)}
                    onChange={(e) => updateColb('delayedApplicantDate', formatDateMMMMCommaDDYYYY(e.target.value))}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>2. Attended at Birth By</label>
                  <input
                    type="text"
                    placeholder="Name of attendant"
                    value={currentColb.delayedAttendantName || ''}
                    onChange={(e) => updateColb('delayedAttendantName', e.target.value)}
                    className={`${inputClass} uppercase`}
                  />
                </div>
                <div>
                  <label className={labelClass}>2. Attendant Address</label>
                  <input
                    type="text"
                    placeholder="Address of attendant"
                    value={currentColb.delayedAttendantAddress || ''}
                    onChange={(e) => updateColb('delayedAttendantAddress', e.target.value)}
                    className={`${inputClass} uppercase`}
                  />
                </div>
                <div>
                  <label className={labelClass}>3. Child / Applicant Citizenship</label>
                  <input
                    type="text"
                    placeholder="Filipino"
                    value={currentColb.delayedCitizenship || ''}
                    onChange={(e) => updateColb('delayedCitizenship', e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>4. Parents&apos; Marital Status</label>
                  <select
                    value={
                      currentColb.delayedParentsStatus ||
                      (currentColb.parentsMarried === false ? 'not_married' : 'married')
                    }
                    onChange={(e) => updateColb('delayedParentsStatus', e.target.value)}
                    className={inputClass}
                  >
                    <option value="married">Married</option>
                    <option value="not_married">Not Married (Acknowledged by Father)</option>
                  </select>
                </div>

                {(currentColb.delayedParentsStatus ||
                  (currentColb.parentsMarried === false ? 'not_married' : 'married')) === 'married' ? (
                  <div className="sm:col-span-2">
                    <label className={labelClass}>4a. Parents Married On &amp; At</label>
                    <input
                      type="text"
                      placeholder="e.g. October 18, 2020 at Sagbayan, Bohol, Philippines"
                      value={
                        currentColb.delayedParentsMarriageDatePlace ??
                        (!currentColb.parentsMarriageDatePlace?.includes('NOT MARRIED')
                          ? currentColb.parentsMarriageDatePlace || ''
                          : '')
                      }
                      onChange={(e) => updateColb('delayedParentsMarriageDatePlace', e.target.value)}
                      className={inputClass}
                    />
                  </div>
                ) : (
                  <div className="sm:col-span-2">
                    <label className={labelClass}>
                      4b. Acknowledged by Father Whose Name Is
                    </label>
                    <input
                      type="text"
                      placeholder={father.fullName || 'FATHER FULL NAME'}
                      value={currentColb.delayedFatherName ?? father.fullName ?? ''}
                      onChange={(e) => updateColb('delayedFatherName', e.target.value)}
                      className={`${inputClass} uppercase`}
                    />
                  </div>
                )}

                <div className="sm:col-span-2">
                  <label className={labelClass}>5. Reason for Delay in Registration</label>
                  <input
                    type="text"
                    {...getFocusProps('delayed.reason')}
                    placeholder="Reason for delayed registration"
                    value={currentColb.delayedReason || ''}
                    onChange={(e) => updateColb('delayedReason', e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>6. (For applicant only) Married To</label>
                  <input
                    type="text"
                    placeholder="Spouse name (if applicable)"
                    value={currentColb.delayedApplicantMarriedTo || ''}
                    onChange={(e) => updateColb('delayedApplicantMarriedTo', e.target.value)}
                    className={`${inputClass} uppercase`}
                  />
                </div>
                <div>
                  <label className={labelClass}>6. Relationship to Child (if not self)</label>
                  <input
                    type="text"
                    placeholder="Father / Mother / Guardian"
                    value={currentColb.delayedAffiantRelationship || ''}
                    onChange={(e) => updateColb('delayedAffiantRelationship', e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Sworn Date (Jurat)</label>
                  <input
                    type="date"
                    value={fromMonthDayYearToIso(
                      currentColb.delayedSwornMonth,
                      currentColb.delayedSwornDay,
                      currentColb.delayedSwornYear
                    )}
                    onChange={(e) => {
                      const parts = parseIsoDateToColbParts(e.target.value);
                      onChange({
                        ...data,
                        colb: {
                          ...currentColb,
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
                    value={currentColb.delayedSwornPlace || ''}
                    onChange={(e) => updateColb('delayedSwornPlace', e.target.value)}
                    className={`${inputClass} uppercase`}
                  />
                </div>
                <div className="sm:col-span-2 p-3 bg-slate-50 rounded-lg border border-[#348e38]/35 space-y-2.5">
                  <span className="text-[11px] font-bold text-[#246b27] uppercase block">
                    Affiant Signatory &amp; CTC / Valid ID
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className={labelClass}>Affiant CTC / Valid ID No.</label>
                      <input
                        type="text"
                        placeholder="CTC No. / Valid ID"
                        value={currentColb.delayedAffiantCtc || ''}
                        onChange={(e) => updateColb('delayedAffiantCtc', e.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>CTC Issued On</label>
                      <input
                        type="date"
                        value={toIsoDateInput(currentColb.delayedAffiantCtcDate)}
                        onChange={(e) => updateColb('delayedAffiantCtcDate', formatDateMMMMCommaDDYYYY(e.target.value))}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>CTC Issued At</label>
                      <input
                        type="text"
                        placeholder="Place"
                        value={currentColb.delayedAffiantCtcPlace || ''}
                        onChange={(e) => updateColb('delayedAffiantCtcPlace', e.target.value)}
                        className={`${inputClass} uppercase`}
                      />
                    </div>
                  </div>
                </div>
                <div className="sm:col-span-2 p-3 bg-slate-50 rounded-lg border border-[#348e38]/35 space-y-2.5">
                  <span className="text-[11px] font-bold text-[#246b27] uppercase block">
                    Administering Officer Signatory
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Administering Officer Name</label>
                      <input
                        type="text"
                        placeholder="ATTY. GREGORIO L. SANTOS"
                        value={currentColb.delayedAdminOfficerName || ''}
                        onChange={(e) => updateColb('delayedAdminOfficerName', e.target.value)}
                        className={`${inputClass} uppercase`}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Officer Title / Designation</label>
                      <input
                        type="text"
                        placeholder="Municipal Civil Registrar"
                        value={currentColb.delayedAdminOfficerTitle || ''}
                        onChange={(e) => updateColb('delayedAdminOfficerTitle', e.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className={labelClass}>Administering Officer Address</label>
                      <input
                        type="text"
                        placeholder="Municipal Hall, Sagbayan, Bohol"
                        value={currentColb.delayedAdminOfficerAddress || ''}
                        onChange={(e) => updateColb('delayedAdminOfficerAddress', e.target.value)}
                        className={`${inputClass} uppercase`}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
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
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-sm font-medium text-slate-700 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex flex-wrap items-center justify-end gap-2">
            {currentStep < TOTAL_STEPS ? (
              <button
                type="button"
                onClick={() => goToStep(currentStep + 1)}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-[#348e38] hover:bg-[#246b27] text-white text-sm font-semibold shadow-xs transition-colors"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => goToStep(1)}
                  className="px-4 py-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-sm font-medium text-slate-700 transition-colors"
                >
                  Back to Start
                </button>
                {isMultipleBirth && onSubmitMultipleChild ? (
                  <>
                    {multipleBirthChildNumber >= 2 && targetMultipleCount === null && (
                      <button
                        type="button"
                        onClick={() => onSubmitMultipleChild('finish')}
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-[#348e38] bg-white hover:bg-emerald-50 text-[#246b27] text-sm font-semibold transition-colors cursor-pointer"
                      >
                        <Check className="w-4 h-4" />
                        <span>Submit &amp; Finish</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        onSubmitMultipleChild(shouldAutoAddNextChild ? 'next' : 'finish')
                      }
                      className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-[#348e38] hover:bg-[#246b27] text-white text-sm font-semibold shadow-xs transition-colors cursor-pointer"
                    >
                      <Save className="w-4 h-4" />
                      <span>
                        {shouldAutoAddNextChild
                          ? `Submit Child ${multipleBirthChildNumber} & Add Child ${
                              multipleBirthChildNumber + 1
                            }`
                          : `Submit Child ${multipleBirthChildNumber}${
                              targetMultipleCount ? ` of ${targetMultipleCount}` : ''
                            }`}
                      </span>
                    </button>
                  </>
                ) : (
                  onSaveDraft && (
                    <button
                      type="button"
                      onClick={handleSaveClick}
                      className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-[#348e38] hover:bg-[#246b27] text-white text-sm font-semibold shadow-xs transition-colors"
                    >
                      <Save className="w-4 h-4" />
                      <span>Submit &amp; Save Draft</span>
                    </button>
                  )
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Confirmation Modal for Reset */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-5 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertCircle className="w-6 h-6" />
              <h3 className="font-bold text-slate-900 text-sm">Reset Certificate Form?</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to clear this birth form? All currently entered particulars will
              be wiped.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onReset();
                  setShowResetConfirm(false);
                }}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-700 text-white"
              >
                Yes, Reset Form
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
