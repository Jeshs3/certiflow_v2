/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { ComDetails, MarriageCertificateData } from '../types/certificate';
import { calculateAge, formatName } from '../utils/certificateUtils';
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
  Clock,
  Home,
  Pencil,
  Lock,
} from 'lucide-react';
import { IconTooltip } from './IconTooltip';

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
}

const getSteps = () => [
  { id: 1, title: "Groom's Information", range: 'Items 1–14 (Husband & Parents)' },
  { id: 2, title: "Bride's Information", range: 'Items 1–14 (Wife & Parents)' },
  { id: 3, title: 'Ceremony, Place & Settlement', range: 'Items 15–18' },
  { id: 4, title: 'Witnesses & Preparation', range: 'Item 20a & Prep' },
  { id: 5, title: 'Form 97 Registry & Signing', range: 'Header, Items 19–22' },
] as const;

const TOTAL_STEPS = 5;

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const LONG_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function parseIsoDateParts(dateStr: string, monthFormat: 'short' | 'long') {
  if (!dateStr) return { day: '', month: '', year: '' };
  const parts = dateStr.split('-');
  if (parts.length !== 3) return { day: '', month: '', year: '' };
  const year = parts[0];
  const monthIdx = parseInt(parts[1], 10) - 1;
  const list = monthFormat === 'short' ? SHORT_MONTHS : LONG_MONTHS;
  const month = list[monthIdx] || parts[1];
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
  'w-full px-3 py-2 text-sm text-slate-900 bg-white border border-purple-700 rounded-lg focus:outline-none focus:border-purple-900 focus:ring-2 focus:ring-purple-700/20 transition-colors placeholder:text-slate-400';

const fieldsetClass =
  'bg-white rounded-xl border border-purple-700/45 px-4 pb-4 pt-2.5 space-y-3';

const legendClass = 'px-2 text-xs font-bold text-purple-800 tracking-tight';

const labelClass = 'block text-[13px] font-medium text-slate-900 mb-1.5';
const subLabelClass = 'block text-[11px] text-slate-500 mt-1';

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
}) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isLocked, setIsLocked] = useState<boolean>(isEditingFile);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const formTopRef = useRef<HTMLDivElement>(null);

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

  const updateCom = (field: keyof ComDetails, val: unknown) => {
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
      } else if (field === 'witness1') {
        nextAdditional.witness1Name = val;
      } else if (field === 'witness2') {
        nextAdditional.witness2Name = val;
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

  const updateGroom = (field: keyof typeof groom, val: string) => {
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
      const { day, month, year } = parseIsoDateParts(val, 'short');
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

  const updateBride = (field: keyof typeof bride, val: string) => {
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
      const { day, month, year } = parseIsoDateParts(val, 'short');
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

  const updateMarriage = (field: keyof typeof marriage, val: string) => {
    const updated = { ...marriage, [field]: val };
    const nextCom: ComDetails = { ...currentCom };

    if (field === 'dateOfMarriage') {
      const { day, month, year } = parseIsoDateParts(val, 'long');
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

  const updateAdditional = (field: keyof typeof additional, val: string) => {
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

  const groomAge = calculateAge(groom.dateOfBirth, marriage.dateOfMarriage);
  const brideAge = calculateAge(bride.dateOfBirth, marriage.dateOfMarriage);

  const steps = getSteps();
  const activeStepMeta = steps[currentStep - 1];
  const progressPercent = Math.round((currentStep / TOTAL_STEPS) * 100);

  return (
    <div ref={formTopRef} className="space-y-3.5 scroll-mt-20">
      <datalist id="com-civil-status-options">
        <option value="Single" />
        <option value="Widowed" />
        <option value="Divorced" />
        <option value="Annulled" />
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
                label={isLocked ? 'Edit Affidavit for Delayed Registration' : 'Lock Registry Table'}
                placement="bottom"
                align="center"
              >
                <button
                  type="button"
                  onClick={() => setIsLocked((prev) => !prev)}
                  aria-label={isLocked ? 'Edit Affidavit for Delayed Registration' : 'Lock Registry Table'}
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

        {/* Quiet Progress Indicator or Locked Record Banner */}
        {isEditingFile ? (
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
            <span className="inline-flex items-center gap-1.5 font-semibold text-slate-700">
              {isLocked ? (
                <>
                  <Lock className="w-3.5 h-3.5 text-[#1D4ED8]" />
                  <span>Locked Registry Table</span>
                </>
              ) : (
                <>
                  <Pencil className="w-3.5 h-3.5 text-[#1D4ED8]" />
                  <span>Affidavit for Delayed Registration of Marriage</span>
                </>
              )}
            </span>
            <span className="text-slate-500">
              {isLocked ? 'Click edit icon to fill delayed affidavit' : 'Only delayed registration affidavit is editable'}
            </span>
          </div>
        ) : (
          <div className="space-y-1.5 pt-1 border-t border-slate-100">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-800">{activeStepMeta.title}</span>
              <span className="text-slate-500 tabular-nums">
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
                    ['2a. Date of Birth', groom.dateOfBirth],
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
                      [
                        currentCom.husbandConsentPerson,
                        currentCom.husbandConsentRelationship,
                        currentCom.husbandConsentResidence,
                      ]
                        .filter(Boolean)
                        .join(' · '),
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
                    ['2a. Date of Birth', bride.dateOfBirth],
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
                      [
                        currentCom.wifeConsentPerson,
                        currentCom.wifeConsentRelationship,
                        currentCom.wifeConsentResidence,
                      ]
                        .filter(Boolean)
                        .join(' · '),
                    ],
                  ],
                },
                {
                  section: 'Ceremony, Place & Settlement (Items 15–18)',
                  rows: [
                    ['15. Place of Marriage', currentCom.placeOfMarriage || marriage.placeOfMarriage],
                    ['16. Date of Marriage', marriage.dateOfMarriage],
                    ['17. Time of Marriage', marriage.timeOfMarriage],
                    [
                      '18. Marriage Settlement',
                      currentCom.marriageSettlement === 'entered'
                        ? 'Entered into a marriage settlement'
                        : currentCom.marriageSettlement === 'not_entered'
                        ? 'Not entered into a marriage settlement'
                        : '',
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
                            currentCom.marriageLicenseNo && `License No. ${currentCom.marriageLicenseNo}`,
                            currentCom.licenseIssuedDate,
                            currentCom.licenseIssuedPlace,
                          ]
                            .filter(Boolean)
                            .join(' · ') || 'With Marriage License'
                        : currentCom.licenseType === 'art_209'
                        ? `Art. ${currentCom.art209Specify || ''} of E.O. 209`.trim()
                        : currentCom.licenseType === 'pd_1083'
                        ? 'Under P.D. No. 1083'
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
                      '20a. Witnesses',
                      [
                        currentCom.witness1 || additional.witness1Name,
                        currentCom.witness2 || additional.witness2Name,
                        currentCom.witness3,
                        currentCom.witness4,
                      ]
                        .filter(Boolean)
                        .join(', '),
                    ],
                    [
                      '21. Received By (LCRO)',
                      [currentCom.receivedByName, currentCom.receivedByTitle, currentCom.receivedByDate]
                        .filter(Boolean)
                        .join(' · '),
                    ],
                    [
                      '22. Registered By',
                      [currentCom.registeredByName, currentCom.registeredByTitle, currentCom.registeredByDate]
                        .filter(Boolean)
                        .join(' · '),
                    ],
                    ['Remarks / Annotations', currentCom.remarksAnnotation || marriage.remarks],
                  ],
                },
                ...(currentCom.affidavitDelayedReg
                  ? [
                      {
                        section: 'Page 2 Affidavit for Delayed Registration',
                        rows: [
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
                      <td className="py-2 px-4 text-slate-900 font-medium tabular-nums break-words">
                        {fieldValue ? String(fieldValue) : <span className="text-slate-300">—</span>}
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
      {/* SAVED DRAFT EDIT MODE: AFFIDAVIT FOR DELAYED REGISTRATION ONLY      */}
      {/* =================================================================== */}
      {isEditingFile && !isLocked && (
        <div className="space-y-3.5">
          <fieldset className={fieldsetClass}>
            <legend className={legendClass}>Affidavit for Delayed Registration of Marriage</legend>
            <label className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border border-purple-700/40 bg-purple-50/40 cursor-pointer">
              <span className="text-xs font-medium text-slate-800">
                Include Page 2 Affidavit for Delayed Registration of Marriage
              </span>
              <input
                type="checkbox"
                checked={Boolean(currentCom.affidavitDelayedReg)}
                onChange={(e) => updateCom('affidavitDelayedReg', e.target.checked)}
                className="w-4 h-4 rounded accent-purple-700 shrink-0"
              />
            </label>

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
                  <input
                    type="text"
                    placeholder="Barangay, Sagbayan, Bohol"
                    value={currentCom.delayedAffiantResidence || ''}
                    onChange={(e) => updateCom('delayedAffiantResidence', e.target.value)}
                    className={inputClass}
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
                  <label className={labelClass}>Sworn Day / Month / Year</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    <input
                      type="text"
                      placeholder="Day"
                      value={currentCom.delayedSwornDay || ''}
                      onChange={(e) => updateCom('delayedSwornDay', e.target.value)}
                      className={inputClass}
                    />
                    <input
                      type="text"
                      placeholder="Month"
                      value={currentCom.delayedSwornMonth || ''}
                      onChange={(e) => updateCom('delayedSwornMonth', e.target.value)}
                      className={inputClass}
                    />
                    <input
                      type="text"
                      placeholder="Year"
                      value={currentCom.delayedSwornYear || ''}
                      onChange={(e) => updateCom('delayedSwornYear', e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Sworn Place</label>
                  <input
                    type="text"
                    placeholder="Sagbayan, Bohol"
                    value={currentCom.delayedSwornPlace || ''}
                    onChange={(e) => updateCom('delayedSwornPlace', e.target.value)}
                    className={inputClass}
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
                      type="text"
                      placeholder="Date"
                      value={currentCom.delayedAffiantCtcDate || ''}
                      onChange={(e) => updateCom('delayedAffiantCtcDate', e.target.value)}
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
                      className={inputClass}
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
                    className={inputClass}
                  />
                </div>
              </div>
            </div>
          </fieldset>

          <div className="flex items-center justify-between gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsLocked(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Done &amp; Lock</span>
            </button>
            {onSaveDraft && (
              <button
                type="button"
                onClick={handleSaveClick}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Draft</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* STEP 1: GROOM'S / HUSBAND'S INFORMATION (ITEMS 1–14)                */}
      {/* =================================================================== */}
      {!isEditingFile && currentStep === 1 && (
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
                  className={inputClass}
                />
                <span className={subLabelClass}>First Name *</span>
              </div>
              <div>
                <input
                  type="text"
                  value={groom.middleName ?? ''}
                  onChange={(e) => updateGroom('middleName', e.target.value)}
                  placeholder="e.g. MENDOZA"
                  className={inputClass}
                />
                <span className={subLabelClass}>Middle Name</span>
              </div>
              <div>
                <input
                  type="text"
                  value={groom.lastName ?? ''}
                  onChange={(e) => updateGroom('lastName', e.target.value)}
                  placeholder="e.g. DELA CRUZ"
                  className={inputClass}
                />
                <span className={subLabelClass}>Last Name *</span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[13px] font-medium text-slate-900">
                  Full Groom Name (Formatted)
                </label>
                <span className="text-[11px] text-slate-500 italic">
                  Auto-formatted or enter custom
                </span>
              </div>
              <input
                type="text"
                value={groom.fullName ?? ''}
                onChange={(e) => updateGroom('fullName', e.target.value)}
                placeholder="JUAN CARLOS MENDOZA DELA CRUZ"
                className={`${inputClass} font-semibold`}
              />
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
                  value={groom.dateOfBirth ?? ''}
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>3. Place of Birth</label>
                <input
                  type="text"
                  value={groom.placeOfBirth ?? ''}
                  onChange={(e) => updateGroom('placeOfBirth', e.target.value)}
                  placeholder="City/Municipality, Province, Country"
                  className={inputClass}
                />
                <span className={subLabelClass}>Separate City, Province, Country with commas</span>
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
              <input
                type="text"
                value={currentCom.husbandResidence ?? groom.currentAddress ?? ''}
                onChange={(e) => updateCom('husbandResidence', e.target.value)}
                placeholder="House No., St., Barangay, City/Municipality, Province, Country"
                className={inputClass}
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
                    className={inputClass}
                  />
                  <span className={subLabelClass}>First Name</span>
                </div>
                <div>
                  <input
                    type="text"
                    value={currentCom.husbandFatherMiddleName ?? ''}
                    onChange={(e) => updateCom('husbandFatherMiddleName', e.target.value)}
                    placeholder="e.g. GARCIA"
                    className={inputClass}
                  />
                  <span className={subLabelClass}>Middle Name</span>
                </div>
                <div>
                  <input
                    type="text"
                    value={currentCom.husbandFatherLastName ?? ''}
                    onChange={(e) => updateCom('husbandFatherLastName', e.target.value)}
                    placeholder="e.g. DELA CRUZ"
                    className={inputClass}
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
                    className={inputClass}
                  />
                  <span className={subLabelClass}>First Name</span>
                </div>
                <div>
                  <input
                    type="text"
                    value={currentCom.husbandMotherMaidenMiddleName ?? ''}
                    onChange={(e) => updateCom('husbandMotherMaidenMiddleName', e.target.value)}
                    placeholder="e.g. CASTRO"
                    className={inputClass}
                  />
                  <span className={subLabelClass}>Middle Name</span>
                </div>
                <div>
                  <input
                    type="text"
                    value={currentCom.husbandMotherMaidenLastName ?? ''}
                    onChange={(e) => updateCom('husbandMotherMaidenLastName', e.target.value)}
                    placeholder="e.g. MENDOZA"
                    className={inputClass}
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
            <p className="text-xs text-slate-500">
              Fill this section if the groom is 18–25 years old or requires parental consent/advice.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>12. Name of Person / Wali</label>
                <input
                  type="text"
                  value={currentCom.husbandConsentPerson ?? ''}
                  onChange={(e) => updateCom('husbandConsentPerson', e.target.value)}
                  placeholder="First Middle Last"
                  className={inputClass}
                />
              </div>

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
            </div>

            <div>
              <label className={labelClass}>14. Residence of Person / Wali</label>
              <input
                type="text"
                value={currentCom.husbandConsentResidence ?? ''}
                onChange={(e) => updateCom('husbandConsentResidence', e.target.value)}
                placeholder="House No., St., Barangay, City/Municipality, Province, Country"
                className={inputClass}
              />
            </div>
          </fieldset>
        </div>
      )}

      {/* =================================================================== */}
      {/* STEP 2: BRIDE'S / WIFE'S INFORMATION (ITEMS 1–14)                   */}
      {/* =================================================================== */}
      {!isEditingFile && currentStep === 2 && (
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
                  className={inputClass}
                />
                <span className={subLabelClass}>First Name *</span>
              </div>
              <div>
                <input
                  type="text"
                  value={bride.middleName ?? ''}
                  onChange={(e) => updateBride('middleName', e.target.value)}
                  placeholder="e.g. BAUTISTA"
                  className={inputClass}
                />
                <span className={subLabelClass}>Middle Name</span>
              </div>
              <div>
                <input
                  type="text"
                  value={bride.lastName ?? ''}
                  onChange={(e) => updateBride('lastName', e.target.value)}
                  placeholder="e.g. SANTOS"
                  className={inputClass}
                />
                <span className={subLabelClass}>Last Name *</span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[13px] font-medium text-slate-900">
                  Full Bride Name (Formatted)
                </label>
                <span className="text-[11px] text-slate-500 italic">
                  Auto-formatted or enter custom
                </span>
              </div>
              <input
                type="text"
                value={bride.fullName ?? ''}
                onChange={(e) => updateBride('fullName', e.target.value)}
                placeholder="MARIA CLARA BAUTISTA SANTOS"
                className={`${inputClass} font-semibold`}
              />
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
                  value={bride.dateOfBirth ?? ''}
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>3. Place of Birth</label>
                <input
                  type="text"
                  value={bride.placeOfBirth ?? ''}
                  onChange={(e) => updateBride('placeOfBirth', e.target.value)}
                  placeholder="City/Municipality, Province, Country"
                  className={inputClass}
                />
                <span className={subLabelClass}>Separate City, Province, Country with commas</span>
              </div>

              <div>
                <label className={labelClass}>4b. Citizenship (4a. Sex: FEMALE)</label>
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
              <label className={labelClass}>5. Residence</label>
              <input
                type="text"
                value={currentCom.wifeResidence ?? bride.currentAddress ?? ''}
                onChange={(e) => updateCom('wifeResidence', e.target.value)}
                placeholder="House No., St., Barangay, City/Municipality, Province, Country"
                className={inputClass}
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
                    className={inputClass}
                  />
                  <span className={subLabelClass}>First Name</span>
                </div>
                <div>
                  <input
                    type="text"
                    value={currentCom.wifeFatherMiddleName ?? ''}
                    onChange={(e) => updateCom('wifeFatherMiddleName', e.target.value)}
                    placeholder="e.g. LOPEZ"
                    className={inputClass}
                  />
                  <span className={subLabelClass}>Middle Name</span>
                </div>
                <div>
                  <input
                    type="text"
                    value={currentCom.wifeFatherLastName ?? ''}
                    onChange={(e) => updateCom('wifeFatherLastName', e.target.value)}
                    placeholder="e.g. SANTOS"
                    className={inputClass}
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
                    className={inputClass}
                  />
                  <span className={subLabelClass}>First Name</span>
                </div>
                <div>
                  <input
                    type="text"
                    value={currentCom.wifeMotherMaidenMiddleName ?? ''}
                    onChange={(e) => updateCom('wifeMotherMaidenMiddleName', e.target.value)}
                    placeholder="e.g. FLORES"
                    className={inputClass}
                  />
                  <span className={subLabelClass}>Middle Name</span>
                </div>
                <div>
                  <input
                    type="text"
                    value={currentCom.wifeMotherMaidenLastName ?? ''}
                    onChange={(e) => updateCom('wifeMotherMaidenLastName', e.target.value)}
                    placeholder="e.g. BAUTISTA"
                    className={inputClass}
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
            <p className="text-xs text-slate-500">
              Fill this section if the bride is 18–25 years old or requires parental consent/advice.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>12. Name of Person / Wali</label>
                <input
                  type="text"
                  value={currentCom.wifeConsentPerson ?? ''}
                  onChange={(e) => updateCom('wifeConsentPerson', e.target.value)}
                  placeholder="First Middle Last"
                  className={inputClass}
                />
              </div>

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
            </div>

            <div>
              <label className={labelClass}>14. Residence of Person / Wali</label>
              <input
                type="text"
                value={currentCom.wifeConsentResidence ?? ''}
                onChange={(e) => updateCom('wifeConsentResidence', e.target.value)}
                placeholder="House No., St., Barangay, City/Municipality, Province, Country"
                className={inputClass}
              />
            </div>
          </fieldset>
        </div>
      )}

      {/* =================================================================== */}
      {/* STEP 3: CEREMONY, PLACE OF MARRIAGE & SETTLEMENT (ITEMS 15–18)      */}
      {/* =================================================================== */}
      {!isEditingFile && currentStep === 3 && (
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
                  value={marriage.dateOfMarriage ?? ''}
                  onChange={(e) => updateMarriage('dateOfMarriage', e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-[13px] font-medium text-slate-900 mb-1.5">
                  <Clock className="w-3.5 h-3.5 text-purple-700" />
                  <span>17. Time of Marriage</span>
                </label>
                <input
                  type="text"
                  value={marriage.timeOfMarriage ?? ''}
                  onChange={(e) => updateMarriage('timeOfMarriage', e.target.value)}
                  placeholder="e.g. 10:00 AM"
                  className={inputClass}
                />
              </div>
            </div>
          </fieldset>

          <fieldset className={fieldsetClass}>
            <legend className={legendClass}>Item 15: Venue &amp; Place of Marriage</legend>
            <div>
              <label className={labelClass}>
                Venue / Office / Church / Barangay <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                value={marriage.placeOfMarriage ?? ''}
                onChange={(e) => updateMarriage('placeOfMarriage', e.target.value)}
                placeholder="e.g. Sagbayan Parish Church"
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className={labelClass}>
                  City / Municipality <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  value={marriage.cityMunicipality ?? ''}
                  onChange={(e) => updateMarriage('cityMunicipality', e.target.value)}
                  placeholder="e.g. Sagbayan"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Province / State</label>
                <input
                  type="text"
                  value={marriage.provinceState ?? ''}
                  onChange={(e) => updateMarriage('provinceState', e.target.value)}
                  placeholder="e.g. Bohol"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>
                  Country <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  value={marriage.country ?? ''}
                  onChange={(e) => updateMarriage('country', e.target.value)}
                  placeholder="e.g. Philippines"
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>
                15. Full Form 97 Place of Marriage Line
              </label>
              <input
                type="text"
                value={currentCom.placeOfMarriage ?? ''}
                onChange={(e) => updateCom('placeOfMarriage', e.target.value)}
                placeholder="e.g. Sagbayan Parish Church, Sagbayan, Bohol"
                className={inputClass}
              />
              <span className={subLabelClass}>
                Auto-composed from Venue, City &amp; Province above, or customize directly
              </span>
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
                  className={inputClass}
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
      {!isEditingFile && currentStep === 4 && (
        <div className="space-y-3.5">
          <fieldset className={fieldsetClass}>
            <legend className={legendClass}>Item 20a: Attesting Witnesses</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Witness 1 Name</label>
                <input
                  type="text"
                  value={currentCom.witness1 ?? additional.witness1Name ?? ''}
                  onChange={(e) => updateAdditional('witness1Name', e.target.value)}
                  placeholder="e.g. ROBERTO MENDEZ DELA CRUZ"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Witness 2 Name</label>
                <input
                  type="text"
                  value={currentCom.witness2 ?? additional.witness2Name ?? ''}
                  onChange={(e) => updateAdditional('witness2Name', e.target.value)}
                  placeholder="e.g. ELENA BAUTISTA SANTOS"
                  className={inputClass}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Witness 3 Name (optional)</label>
                <input
                  type="text"
                  value={currentCom.witness3 ?? ''}
                  onChange={(e) => updateCom('witness3', e.target.value)}
                  placeholder="e.g. MARCUS AURELIUS VANCE"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Witness 4 Name (optional)</label>
                <input
                  type="text"
                  value={currentCom.witness4 ?? ''}
                  onChange={(e) => updateCom('witness4', e.target.value)}
                  placeholder="e.g. CHARLOTTE GRACE STERLING"
                  className={inputClass}
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
                  value={additional.dateOfPreparation ?? ''}
                  onChange={(e) => updateAdditional('dateOfPreparation', e.target.value)}
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
                  className={inputClass}
                />
              </div>
            </div>
          </fieldset>
        </div>
      )}

      {/* =================================================================== */}
      {/* STEP 5: FORM 97 REGISTRY, LICENSE, LCRO & AFFIDAVITS                */}
      {/* =================================================================== */}
      {!isEditingFile && currentStep === 5 && (
        <div className="space-y-3.5">
          <fieldset className={fieldsetClass}>
            <legend className={legendClass}>Header: Registry Location &amp; Number</legend>
            <p className="text-xs text-slate-500">
              Official Civil Registry Form 97 (Revised August 2016) &mdash; Province, Municipality, and LCR Registry Number
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className={labelClass}>Province</label>
                <input
                  type="text"
                  value={currentCom.province ?? ''}
                  onChange={(e) => updateCom('province', e.target.value)}
                  placeholder="e.g. BOHOL"
                  className={`${inputClass} uppercase font-semibold`}
                />
              </div>

              <div>
                <label className={labelClass}>City / Municipality</label>
                <input
                  type="text"
                  value={currentCom.cityMunicipality ?? ''}
                  onChange={(e) => updateCom('cityMunicipality', e.target.value)}
                  placeholder="e.g. SAGBAYAN"
                  className={`${inputClass} uppercase font-semibold`}
                />
              </div>

              <div>
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
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                    value={currentCom.licenseIssuedDate ?? ''}
                    onChange={(e) => updateCom('licenseIssuedDate', e.target.value)}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Place Issued</label>
                  <input
                    type="text"
                    value={currentCom.licenseIssuedPlace ?? ''}
                    onChange={(e) => updateCom('licenseIssuedPlace', e.target.value)}
                    placeholder="e.g. Sagbayan, Bohol"
                    className={inputClass}
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
                  className={`${inputClass} font-semibold`}
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
                <label className={labelClass}>CRASM Registry No. &amp; Expiration (optional)</label>
                <input
                  type="text"
                  value={currentCom.solemnizingOfficerRegistryNo ?? ''}
                  onChange={(e) => updateCom('solemnizingOfficerRegistryNo', e.target.value)}
                  placeholder="e.g. Reg. No. 2023-112 / Exp. Dec 31, 2025"
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
                <input
                  type="text"
                  value={currentCom.receivedByName ?? ''}
                  onChange={(e) => updateCom('receivedByName', e.target.value)}
                  placeholder="Name: CARMINA R. REYES"
                  className={inputClass}
                />
                <input
                  type="text"
                  value={currentCom.receivedByTitle ?? ''}
                  onChange={(e) => updateCom('receivedByTitle', e.target.value)}
                  placeholder="Title: RECORDS CLERK"
                  className={inputClass}
                />
                <input
                  type="date"
                  value={currentCom.receivedByDate ?? ''}
                  onChange={(e) => updateCom('receivedByDate', e.target.value)}
                  className={inputClass}
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-purple-700/30 space-y-2.5">
                <span className="text-[11px] font-bold text-purple-800 uppercase block">
                  22. Registered By (Civil Registrar)
                </span>
                <input
                  type="text"
                  value={currentCom.registeredByName ?? ''}
                  onChange={(e) => updateCom('registeredByName', e.target.value)}
                  placeholder="Name: ATTY. GREGORIO L. SANTOS"
                  className={`${inputClass} font-semibold`}
                />
                <input
                  type="text"
                  value={currentCom.registeredByTitle ?? ''}
                  onChange={(e) => updateCom('registeredByTitle', e.target.value)}
                  placeholder="Title: MUNICIPAL CIVIL REGISTRAR"
                  className={inputClass}
                />
                <input
                  type="date"
                  value={currentCom.registeredByDate ?? ''}
                  onChange={(e) => updateCom('registeredByDate', e.target.value)}
                  className={inputClass}
                />
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
      {/* GOOGLE FORM STEP NAVIGATION (BACK / NEXT)                           */}
      {/* =================================================================== */}
      {!isEditingFile && (
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

          <div className="flex items-center gap-2">
            {currentStep < TOTAL_STEPS ? (
              <button
                type="button"
                onClick={() => goToStep(currentStep + 1)}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-purple-700 hover:bg-purple-800 text-white text-sm font-semibold shadow-xs transition-colors"
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
                {onSaveDraft && (
                  <button
                    type="button"
                    onClick={handleSaveClick}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-purple-700 hover:bg-purple-800 text-white text-sm font-semibold shadow-xs transition-colors"
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
