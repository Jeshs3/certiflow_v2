/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { BirthCertificateData, ColbDetails } from '../types/certificate';
import { formatName } from '../utils/certificateUtils';
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
  multipleBirthChildNumber?: number;
  onSubmitMultipleChild?: (mode: 'next' | 'finish') => void;
}

const getSteps = () => [
  { id: 1, title: 'Registry Header & Child Particulars', range: 'Items 1–6' },
  { id: 2, title: "Mother's Information", range: 'Items 7–13' },
  { id: 3, title: "Father's Information & Marriage", range: 'Items 14–20' },
  { id: 4, title: 'Certifications & Civil Registry', range: 'Items 21–25 & Remarks' },
  { id: 5, title: 'Page 2 Affidavits', range: 'Admission of Paternity' },
] as const;

const TOTAL_STEPS = 5;

const inputClass =
  'w-full px-3 py-2 text-sm text-slate-900 bg-white border border-[#348e38] rounded-lg focus:outline-none focus:border-[#1f6123] focus:ring-2 focus:ring-[#348e38]/20 transition-colors placeholder:text-slate-400';

const fieldsetClass =
  'bg-white rounded-xl border border-[#348e38]/45 px-4 pb-4 pt-2.5 space-y-3';

const legendClass = 'px-2 text-xs font-bold text-[#246b27] tracking-tight';

const labelClass = 'block text-[13px] font-medium text-slate-900 mb-1.5';
const subLabelClass = 'block text-[11px] text-slate-500 mt-1';

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
  multipleBirthChildNumber = 1,
  onSubmitMultipleChild,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isLocked, setIsLocked] = useState<boolean>(isEditingFile);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const formTopRef = useRef<HTMLDivElement>(null);

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

  // Auto-jump to corresponding Google Form step when a field is clicked on the live certificate preview
  useEffect(() => {
    if (!activeBindingField) return;

    const binding = COLB_DATA_BINDINGS.find((b) => b.id === activeBindingField);
    if (!binding) return;

    if (isEditingFile) {
      if (isLocked || binding.category !== 'delayed') return;
      setTimeout(() => {
        const el = document.getElementById(`field-input-${activeBindingField}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.focus();
        }
      }, 150);
      return;
    }

    if (binding.category === 'delayed') return;

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

  const updateChild = (field: keyof typeof child, val: string) => {
    const updated = { ...child, [field]: val };
    const nextAdditional = { ...additional };
    const nextColb = { ...currentColb };

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

    onChange({ ...data, child: updated, additional: nextAdditional, colb: nextColb });
  };

  const updateColb = (field: keyof ColbDetails, val: unknown) => {
    const nextColb = { ...currentColb, [field]: val };
    if (String(field).startsWith('delayed') && val) {
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

    onChange({
      ...data,
      child: nextChild,
      mother: nextMother,
      father: nextFather,
      additional: nextAdditional,
      colb: nextColb,
    });
  };

  const updateMotherNames = (first: string, mid: string, last: string) => {
    const full = formatName(first, mid, last);
    onChange({
      ...data,
      mother: { ...mother, fullName: full },
      colb: {
        ...currentColb,
        motherFirstName: first,
        motherMiddleName: mid,
        motherLastName: last,
      },
    });
  };

  const updateFatherNames = (first: string, mid: string, last: string) => {
    const full = formatName(first, mid, last);
    onChange({
      ...data,
      father: { ...father, fullName: full },
      colb: {
        ...currentColb,
        fatherFirstName: first,
        fatherMiddleName: mid,
        fatherLastName: last,
      },
    });
  };

  const copyMotherResidenceToFather = () => {
    updateColb('fatherResidenceStreet', currentColb.motherResidenceStreet || '');
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
                  <span>Affidavit for Delayed Registration of Birth</span>
                </>
              )}
            </span>
            <span className="text-slate-500">
              {isLocked ? 'Click edit icon to fill delayed affidavit' : 'Only delayed registration affidavit is editable'}
            </span>
          </div>
        ) : (
          <div className="space-y-2 pt-1 border-t border-slate-100">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-800">{activeStepMeta.title}</span>
                <span className="text-slate-500 tabular-nums">
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
                    ['3. Date of Birth', child.dateOfBirth],
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
                        ? 'Not Married'
                        : [
                            [
                              currentColb.parentsMarriageDateMonth,
                              currentColb.parentsMarriageDateDay,
                              currentColb.parentsMarriageDateYear,
                            ]
                              .filter(Boolean)
                              .join(' '),
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
                      ({ '1': 'Physician', '2': 'Nurse', '3': 'Midwife', '4': 'Hilot', '5': currentColb.attendantOtherSpecify || 'Others' } as Record<string, string>)[
                        currentColb.attendantType || ''
                      ] || '',
                    ],
                    [
                      '21b. Attendant & Time',
                      [
                        currentColb.attendantTime
                          ? `${currentColb.attendantTime} ${currentColb.attendantTimeAmPm || ''}`.trim()
                          : '',
                        currentColb.attendantSignatureName,
                        currentColb.attendantTitlePosition,
                        currentColb.attendantDate,
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
                        currentColb.informantDate,
                      ]
                        .filter(Boolean)
                        .join(' · '),
                    ],
                    [
                      '23. Prepared By',
                      [currentColb.preparedByName, currentColb.preparedByTitle, currentColb.preparedByDate]
                        .filter(Boolean)
                        .join(' · '),
                    ],
                    [
                      '24. Received By',
                      [currentColb.receivedByName, currentColb.receivedByTitle, currentColb.receivedByDate]
                        .filter(Boolean)
                        .join(' · '),
                    ],
                    [
                      '25. Registered at LCR',
                      [currentColb.registeredByName, currentColb.registeredByTitle, currentColb.registeredByDate]
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
                                  .join(' · ') || 'Enabled'
                              : 'Not Enabled',
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
                                  .join(' · ') || 'Enabled'
                              : 'Not Enabled',
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
            <legend className={legendClass}>Affidavit for Delayed Registration of Birth</legend>
            <label className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border border-[#348e38]/40 bg-emerald-50/40 cursor-pointer">
              <span className="text-xs font-medium text-slate-800">
                Include Page 2 Affidavit for Delayed Registration of Birth
              </span>
              <input
                type="checkbox"
                checked={currentColb.affidavitDelayedRegEnabled || false}
                onChange={(e) => updateColb('affidavitDelayedRegEnabled', e.target.checked)}
                className="w-4 h-4 accent-[#348e38] rounded shrink-0"
              />
            </label>

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
                  <input
                    type="text"
                    placeholder="Barangay, Sagbayan, Bohol"
                    value={currentColb.delayedAffiantResidence || ''}
                    onChange={(e) => updateColb('delayedAffiantResidence', e.target.value)}
                    className={`${inputClass} uppercase`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Applicant Registration Type</label>
                  <select
                    value={currentColb.delayedApplicantType || 'birth_of'}
                    onChange={(e) => updateColb('delayedApplicantType', e.target.value)}
                    className={inputClass}
                  >
                    <option value="birth_of">Birth of Child (Third Party / Parent)</option>
                    <option value="my_birth">My Own Birth</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Child&apos;s Name (if third party)</label>
                  <input
                    type="text"
                    placeholder="Full name of child"
                    value={currentColb.delayedChildName || ''}
                    onChange={(e) => updateColb('delayedChildName', e.target.value)}
                    className={`${inputClass} uppercase`}
                  />
                </div>
                <div>
                  <label className={labelClass}>Birth Place (Delayed Record)</label>
                  <input
                    type="text"
                    placeholder="Sagbayan, Bohol"
                    value={currentColb.delayedApplicantPlace || ''}
                    onChange={(e) => updateColb('delayedApplicantPlace', e.target.value)}
                    className={`${inputClass} uppercase`}
                  />
                </div>
                <div>
                  <label className={labelClass}>Birth Date (Delayed Record)</label>
                  <input
                    type="text"
                    placeholder="e.g. June 12, 2021"
                    value={currentColb.delayedApplicantDate || ''}
                    onChange={(e) => updateColb('delayedApplicantDate', e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Attendant Name</label>
                  <input
                    type="text"
                    placeholder="Name of attendant"
                    value={currentColb.delayedAttendantName || ''}
                    onChange={(e) => updateColb('delayedAttendantName', e.target.value)}
                    className={`${inputClass} uppercase`}
                  />
                </div>
                <div>
                  <label className={labelClass}>Attendant Address</label>
                  <input
                    type="text"
                    placeholder="Address of attendant"
                    value={currentColb.delayedAttendantAddress || ''}
                    onChange={(e) => updateColb('delayedAttendantAddress', e.target.value)}
                    className={`${inputClass} uppercase`}
                  />
                </div>
                <div>
                  <label className={labelClass}>Child / Applicant Citizenship</label>
                  <input
                    type="text"
                    placeholder="Filipino"
                    value={currentColb.delayedCitizenship || ''}
                    onChange={(e) => updateColb('delayedCitizenship', e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Parents&apos; Marital Status</label>
                  <select
                    value={currentColb.delayedParentsStatus || 'married'}
                    onChange={(e) => updateColb('delayedParentsStatus', e.target.value)}
                    className={inputClass}
                  >
                    <option value="married">Married</option>
                    <option value="not_married">Not Married</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>Reason for Delay in Registration</label>
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
                  <label className={labelClass}>Relationship to Child (if not self)</label>
                  <input
                    type="text"
                    placeholder="Father / Mother / Guardian"
                    value={currentColb.delayedAffiantRelationship || ''}
                    onChange={(e) => updateColb('delayedAffiantRelationship', e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Affiant CTC / Valid ID</label>
                  <input
                    type="text"
                    placeholder="CTC No. / Valid ID"
                    value={currentColb.delayedAffiantCtc || ''}
                    onChange={(e) => updateColb('delayedAffiantCtc', e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Sworn Day / Month / Year</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    <input
                      type="text"
                      placeholder="Day"
                      value={currentColb.delayedSwornDay || ''}
                      onChange={(e) => updateColb('delayedSwornDay', e.target.value)}
                      className={inputClass}
                    />
                    <input
                      type="text"
                      placeholder="Month"
                      value={currentColb.delayedSwornMonth || ''}
                      onChange={(e) => updateColb('delayedSwornMonth', e.target.value)}
                      className={inputClass}
                    />
                    <input
                      type="text"
                      placeholder="Year"
                      value={currentColb.delayedSwornYear || ''}
                      onChange={(e) => updateColb('delayedSwornYear', e.target.value)}
                      className={inputClass}
                    />
                  </div>
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
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#348e38] hover:bg-[#246b27] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Draft</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* STEP 1: REGISTRY HEADER & CHILD PARTICULARS (ITEMS 1–6)             */}
      {/* =================================================================== */}
      {!isEditingFile && currentStep === 1 && (
        <div className="space-y-3.5">
          <fieldset className={fieldsetClass}>
            <legend className={legendClass}>Registry Location &amp; Number</legend>
            <p className="text-xs text-slate-500">Province, Municipality, and LCR Registry Number</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className={labelClass}>Province</label>
                <input
                  type="text"
                  {...getFocusProps('header.province')}
                  placeholder="BOHOL"
                  value={currentColb.province ?? ''}
                  onChange={(e) => updateColb('province', e.target.value)}
                  className={`${inputClass} uppercase font-semibold`}
                />
              </div>
              <div>
                <label className={labelClass}>City / Municipality</label>
                <input
                  type="text"
                  {...getFocusProps('header.cityMunicipality')}
                  placeholder="SAGBAYAN"
                  value={currentColb.cityMunicipality ?? ''}
                  onChange={(e) => updateColb('cityMunicipality', e.target.value)}
                  className={`${inputClass} uppercase font-semibold`}
                />
              </div>
              <div>
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
            <legend className={legendClass}>2. Sex &amp; 3. Date of Birth</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
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
            </div>
          </fieldset>

          <fieldset className={fieldsetClass}>
            <legend className={legendClass}>
              4. Place of Birth <span className="text-rose-600">*</span>
            </legend>
            <input
              type="text"
              {...getFocusProps('child.placeOfBirthHospital')}
              placeholder="Name of Hospital / Clinic / Institution or House No., Street, Barangay"
              value={child.placeOfBirth}
              onChange={(e) => updateChild('placeOfBirth', e.target.value)}
              className={`${inputClass} uppercase`}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <input
                  type="text"
                  {...getFocusProps('child.placeOfBirthCity')}
                  placeholder="City / Municipality"
                  value={child.cityMunicipality ?? ''}
                  onChange={(e) => updateChild('cityMunicipality', e.target.value)}
                  className={`${inputClass} uppercase`}
                />
                <span className={subLabelClass}>City / Municipality</span>
              </div>
              <div>
                <input
                  type="text"
                  {...getFocusProps('child.placeOfBirthProvince')}
                  placeholder="Province"
                  value={child.provinceState ?? ''}
                  onChange={(e) => updateChild('provinceState', e.target.value)}
                  className={`${inputClass} uppercase`}
                />
                <span className={subLabelClass}>Province</span>
              </div>
            </div>
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
      {!isEditingFile && currentStep === 2 && (
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
            <input
              type="text"
              {...getFocusProps('mother.residenceStreet')}
              placeholder="House No., Street, Barangay"
              value={currentColb.motherResidenceStreet || ''}
              onChange={(e) => updateColb('motherResidenceStreet', e.target.value)}
              className={`${inputClass} uppercase`}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <input
                  type="text"
                  {...getFocusProps('mother.residenceCity')}
                  placeholder={child.cityMunicipality || 'City / Municipality'}
                  value={currentColb.motherResidenceCity ?? ''}
                  onChange={(e) => updateColb('motherResidenceCity', e.target.value)}
                  className={`${inputClass} uppercase`}
                />
                <span className={subLabelClass}>City / Municipality</span>
              </div>
              <div>
                <input
                  type="text"
                  {...getFocusProps('mother.residenceProvince')}
                  placeholder={child.provinceState || 'Province'}
                  value={currentColb.motherResidenceProvince ?? ''}
                  onChange={(e) => updateColb('motherResidenceProvince', e.target.value)}
                  className={`${inputClass} uppercase`}
                />
                <span className={subLabelClass}>Province</span>
              </div>
            </div>
          </fieldset>
        </div>
      )}

      {/* =================================================================== */}
      {/* STEP 3: FATHER'S INFORMATION & MARRIAGE OF PARENTS (ITEMS 14–20)    */}
      {/* =================================================================== */}
      {!isEditingFile && currentStep === 3 && (
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
              <label className="text-[13px] font-medium text-slate-900">
                House No., St., Barangay, City/Municipality, Province
              </label>
              <button
                type="button"
                onClick={copyMotherResidenceToFather}
                className="inline-flex items-center gap-1 text-xs font-medium text-[#246b27] hover:underline whitespace-nowrap shrink-0"
              >
                <Copy className="w-3.5 h-3.5" />
                Copy Mother&apos;s Residence
              </button>
            </div>
            <input
              type="text"
              {...getFocusProps('father.residenceStreet')}
              placeholder={currentColb.motherResidenceStreet || 'Complete address'}
              value={currentColb.fatherResidenceStreet ?? ''}
              onChange={(e) => updateColb('fatherResidenceStreet', e.target.value)}
              className={`${inputClass} uppercase`}
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
                    updateColb('parentsMarried', true);
                    if (currentColb.parentsMarriageDatePlace?.includes('NOT MARRIED')) {
                      updateColb('parentsMarriageDatePlace', 'October 18, 2020 - Sagbayan Parish Church, Bohol');
                    }
                  }}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
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
                    updateColb('parentsMarried', false);
                    updateColb(
                      'parentsMarriageDatePlace',
                      'NOT MARRIED - ACCOMPLISH AFFIDAVIT OF PATERNITY AT BACK'
                    );
                    updateColb('affidavitPaternityEnabled', true);
                  }}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
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
                  className="px-3 py-1.5 rounded-lg bg-amber-700 text-white font-medium hover:bg-amber-800 whitespace-nowrap shrink-0"
                >
                  Go to Step 5
                </button>
              </div>
            ) : (
              <div>
                <label className={labelClass}>Date and Place of Marriage</label>
                <input
                  type="text"
                  {...getFocusProps('parents.marriageDatePlace')}
                  placeholder="e.g. October 18, 2020 - Sagbayan Parish Church, Bohol"
                  value={currentColb.parentsMarriageDatePlace || ''}
                  onChange={(e) => updateColb('parentsMarriageDatePlace', e.target.value)}
                  className={inputClass}
                />
                <span className={subLabelClass}>Formats automatically into Date (20a) and Place (20b)</span>
              </div>
            )}
          </fieldset>
        </div>
      )}

      {/* =================================================================== */}
      {/* STEP 4: CERTIFICATIONS & REGISTRY SIGN-OFFS (ITEMS 21–25 & REMARKS) */}
      {/* =================================================================== */}
      {!isEditingFile && currentStep === 4 && (
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
                <input
                  type="text"
                  {...getFocusProps('attendant.time')}
                  placeholder="07:35 AM"
                  value={currentColb.attendantTime ?? child.timeOfBirth ?? ''}
                  onChange={(e) => updateColb('attendantTime', e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Certification Date</label>
                <input
                  type="date"
                  {...getFocusProps('attendant.date')}
                  value={currentColb.attendantDate ?? ''}
                  onChange={(e) => updateColb('attendantDate', e.target.value)}
                  className={inputClass}
                />
              </div>
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
              <input
                type="text"
                {...getFocusProps('attendant.address')}
                placeholder="Sagbayan Rural Health Unit, Sagbayan, Bohol"
                value={currentColb.attendantAddress || ''}
                onChange={(e) => updateColb('attendantAddress', e.target.value)}
                className={`${inputClass} uppercase`}
              />
            </div>
          </fieldset>

          <fieldset className={fieldsetClass}>
            <legend className={legendClass}>22. Certification of Informant</legend>
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
              <div>
                <label className={labelClass}>Informant Address</label>
                <input
                  type="text"
                  {...getFocusProps('informant.address')}
                  placeholder={currentColb.motherResidenceStreet || 'Address'}
                  value={currentColb.informantAddress ?? ''}
                  onChange={(e) => updateColb('informantAddress', e.target.value)}
                  className={`${inputClass} uppercase`}
                />
              </div>
              <div>
                <label className={labelClass}>Date of Certification</label>
                <input
                  type="date"
                  {...getFocusProps('informant.date')}
                  value={currentColb.informantDate ?? ''}
                  onChange={(e) => updateColb('informantDate', e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
          </fieldset>

          <fieldset className={fieldsetClass}>
            <legend className={legendClass}>23–25. Civil Registry Sign-Offs</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>23. Prepared By (Name)</label>
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
                <label className={labelClass}>23. Title or Position</label>
                <input
                  type="text"
                  {...getFocusProps('registry.preparedByTitle')}
                  placeholder="Registration Assistant"
                  value={currentColb.preparedByTitle ?? ''}
                  onChange={(e) => updateColb('preparedByTitle', e.target.value)}
                  className={inputClass}
                />
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
                    value={currentColb.receivedByDate ?? ''}
                    onChange={(e) => updateColb('receivedByDate', e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-[#348e38]/30 space-y-2.5">
                <span className="text-[11px] font-bold text-[#246b27] uppercase block">
                  25. Registered By (Civil Registrar)
                </span>
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
                    value={currentColb.registeredByDate ?? ''}
                    onChange={(e) => updateColb('registeredByDate', e.target.value)}
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
      {/* STEP 5: PAGE 2 AFFIDAVITS                                           */}
      {/* =================================================================== */}
      {!isEditingFile && currentStep === 5 && (
        <div className="space-y-3.5">
          <fieldset className={fieldsetClass}>
            <legend className={legendClass}>
              Affidavit of Acknowledgment / Admission of Paternity
            </legend>
            <div className="flex items-start justify-between gap-3">
              <p className="text-xs text-slate-500">
                For children whose parents were not married at time of birth
              </p>
              <input
                type="checkbox"
                checked={currentColb.affidavitPaternityEnabled || false}
                onChange={(e) => updateColb('affidavitPaternityEnabled', e.target.checked)}
                className="w-4 h-4 accent-[#348e38] mt-0.5 rounded shrink-0"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className={labelClass}>Father CTC / Valid ID</label>
                <input
                  type="text"
                  {...getFocusProps('paternity.fatherCtc')}
                  placeholder="CTC No. 0829103-B"
                  value={currentColb.affidavitPaternityFatherCtc || ''}
                  onChange={(e) => updateColb('affidavitPaternityFatherCtc', e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Administering Officer</label>
                <input
                  type="text"
                  {...getFocusProps('paternity.adminOfficer')}
                  placeholder="Atty. Gregorio L. Santos"
                  value={currentColb.affidavitPaternityAdminOfficer || ''}
                  onChange={(e) => updateColb('affidavitPaternityAdminOfficer', e.target.value)}
                  className={`${inputClass} uppercase`}
                />
              </div>
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
