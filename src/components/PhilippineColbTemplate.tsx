/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BirthCertificateData, CertificateStyle } from '../types/certificate';
import { ShieldAlert } from 'lucide-react';
import { parseDateComponents } from '../utils/dataBinding';
import { splitFullNameParts } from '../services/pdfGenerationService';
import {
  formatDateMMMMCommaDDYYYY,
  parseIsoDateToColbParts,
} from '../utils/certificateUtils';

interface PhilippineColbTemplateProps {
  data: BirthCertificateData;
  style: CertificateStyle;
  page?: 'page1' | 'page2';
  activeBindingField?: string | null;
  onSelectBindingField?: (fieldId: string) => void;
  showTokens?: boolean;
  blankMode?: boolean;
}

export const PhilippineColbTemplate: React.FC<PhilippineColbTemplateProps> = ({
  data,
  page = 'page1',
  activeBindingField,
  onSelectBindingField,
  showTokens = false,
  blankMode = false,
}) => {
  const { child, father, mother, additional, colb } = data;

  // Split child names
  const childFirst = blankMode ? '' : (child.firstName || '');
  const childMiddle = blankMode ? '' : (child.middleName || '');
  const childLast = blankMode ? '' : (child.lastName || '');

  // Dates
  const { day: bDay, monthName: bMonth, year: bYear } = blankMode
    ? { day: '', monthName: '', year: '' }
    : parseDateComponents(child.dateOfBirth);

  // Mother name
  const motherNameParts = splitFullNameParts(mother.fullName);
  const motherFirst = blankMode ? '' : (colb?.motherFirstName || motherNameParts.first);
  const motherMiddle = blankMode ? '' : (colb?.motherMiddleName || motherNameParts.middle);
  const motherLast = blankMode ? '' : (colb?.motherLastName || motherNameParts.last);

  // Father name
  const fatherNameParts = splitFullNameParts(father.fullName);
  const fatherFirst = blankMode ? '' : (colb?.fatherFirstName || fatherNameParts.first);
  const fatherMiddle = blankMode ? '' : (colb?.fatherMiddleName || fatherNameParts.middle);
  const fatherLast = blankMode ? '' : (colb?.fatherLastName || fatherNameParts.last);

  // Dynamic field wrapper
  const BoundBox: React.FC<{
    bindingId: string;
    token: string;
    className?: string;
    children: React.ReactNode;
    fallbackUnderline?: boolean;
    fallbackClassName?: string;
    as?: 'div' | 'span';
  }> = ({
    bindingId,
    token,
    className = '',
    children,
    fallbackUnderline = true,
    fallbackClassName = 'text-slate-300 select-none font-mono',
    as,
  }) => {
    const isActive = activeBindingField === bindingId;
    const isHoverable = Boolean(onSelectBindingField);
    const Component = as || (className.includes('inline') ? 'span' : 'div');

    return (
      <Component
        data-binding-id={bindingId}
        onClick={(e: React.MouseEvent) => {
          if (onSelectBindingField) {
            e.stopPropagation();
            onSelectBindingField(bindingId);
          }
        }}
        className={`relative transition-all duration-200 ${
          isActive
            ? 'ring-2 ring-emerald-500 bg-emerald-50/70 shadow-sm z-30'
            : isHoverable
            ? 'hover:ring-1 hover:ring-emerald-400 hover:bg-emerald-50/30 cursor-pointer'
            : ''
        } ${className}`}
      >
        {showTokens ? (
          <span className="font-mono text-[7px] bg-emerald-100 text-emerald-800 px-1 py-0.5 rounded border border-emerald-300 font-bold tracking-tight inline-block select-none truncate max-w-full">
            {token}
          </span>
        ) : blankMode ? (
          fallbackUnderline ? (
            <span
              className={`inline-block w-full border-b border-slate-300/80 min-h-[12px] leading-none ${fallbackClassName}`}
            >
              &nbsp;
            </span>
          ) : null
        ) : (
          children
        )}
      </Component>
    );
  };

  // Checkbox or blank line
  const CheckBoxLine: React.FC<{
    checked: boolean;
    label: React.ReactNode;
    bindingId?: string;
    token?: string;
    boxGap?: string;
    fullWidth?: boolean;
  }> = ({ checked, label, bindingId, token, boxGap, fullWidth }) => {
    const isActive = bindingId && activeBindingField === bindingId;
    const isChecked = !blankMode && checked;

    return (
      <span
        onClick={(e) => {
          if (bindingId && onSelectBindingField) {
            e.stopPropagation();
            onSelectBindingField(bindingId);
          }
        }}
        style={boxGap ? { gap: boxGap } : undefined}
        className={`${fullWidth ? 'flex w-full' : 'inline-flex'} items-start ${boxGap ? '' : 'gap-1'} cursor-pointer transition-all ${
          isActive ? 'ring-1 ring-emerald-500 bg-emerald-50 rounded px-0.5' : ''
        }`}
      >
        <span className="inline-block w-3.5 h-3.5 mt-[1px] border border-[#348e38] text-center leading-none text-[8pt] font-bold text-slate-950 bg-white shrink-0">
          {isChecked ? <span data-print-value="true">X</span> : ''}
        </span>
        <span className={`text-[8pt] font-helvetica text-slate-800 ${fullWidth ? 'flex-1 min-w-0' : ''}`}>{label}</span>
      </span>
    );
  };

  // =========================================================================
  // PAGE 2: AFFIDAVITS (Form 102 Back Page - 2 Slices: 11.1 cm + 21.7 cm)
  // =========================================================================
  if (page === 'page2') {
    const showPaternity = !blankMode && Boolean(colb?.affidavitPaternityEnabled);
    const showDelayed = !blankMode && Boolean(colb?.affidavitDelayedRegEnabled);

    const page1FatherFull =
      [fatherFirst, fatherMiddle, fatherLast].filter(Boolean).join(' ') || father.fullName || '';
    const page1MotherFull =
      [motherFirst, motherMiddle, motherLast].filter(Boolean).join(' ') || mother.fullName || '';
    const page1ChildFull =
      [childFirst, childMiddle, childLast].filter(Boolean).join(' ') || child.fullName || '';
    const page1BirthDateFormatted = formatDateMMMMCommaDDYYYY(child.dateOfBirth);
    const page1BirthPlace = [
      child.placeOfBirth || additional.hospitalFacility,
      child.cityMunicipality,
      child.provinceState,
    ]
      .filter(Boolean)
      .join(', ');

    const paternityNarrativeFather = page1FatherFull || colb?.paternityFatherName || '';
    const paternityNarrativeMother = page1MotherFull || colb?.paternityMotherName || '';
    const paternityNarrativeChild = page1ChildFull || colb?.paternityChildName || '';
    const paternityNarrativeBirthDate =
      page1BirthDateFormatted || formatDateMMMMCommaDDYYYY(colb?.paternityBirthDate) || '';
    const paternityNarrativeBirthPlace = page1BirthPlace || colb?.paternityBirthPlace || '';

    const paternityFatherSig =
      colb?.paternityFatherSignatory !== undefined
        ? colb.paternityFatherSignatory
        : paternityNarrativeFather;
    const paternityMotherSig =
      colb?.paternityMotherSignatory !== undefined
        ? colb.paternityMotherSignatory
        : paternityNarrativeMother;

    const renderGreenBlank = (
      value: string | undefined,
      blankWidth: string,
      flexClass?: string
    ) => {
      const minW = flexClass ? undefined : `${Math.round(blankWidth.length * 5.2)}px`;
      if (blankMode || !value) {
        return (
          <span
            style={minW ? { minWidth: minW } : undefined}
            className={`${flexClass ? `${flexClass} min-w-0` : 'inline-block'} border-b border-[#348e38] px-1 leading-tight text-center align-baseline select-none`}
          >
            &nbsp;
          </span>
        );
      }
      return (
        <span
          style={minW ? { minWidth: minW } : undefined}
          className={`${flexClass ? `${flexClass} min-w-0 truncate` : 'inline-block max-w-full truncate align-baseline'} border-b border-[#348e38] font-bold uppercase px-1 leading-tight text-slate-900 text-center`}
        >
          <span data-print-value="true">{value.toUpperCase()}</span>
        </span>
      );
    };

    const renderCmBlank = (value: string | undefined, widthCm: string) => {
      const text = blankMode ? '' : (value || '').toUpperCase();
      return (
        <span
          style={{ width: widthCm, minWidth: widthCm, maxWidth: widthCm }}
          className="inline-block border-b border-[#348e38] px-1 leading-tight text-center align-baseline truncate font-bold uppercase text-slate-900"
        >
          {text ? (
            <span data-print-value="true">{text}</span>
          ) : (
            <span className="select-none font-normal">&nbsp;</span>
          )}
        </span>
      );
    };

    return (
      <div
        className="relative w-full min-w-fit bg-white text-slate-900 font-helvetica select-text p-2 sm:p-3 flex flex-col items-center"
        style={{ aspectRatio: '8.5 / 13' }}
      >
        {/* Inner Green Framed Box (18.5 cm border width, 32.8 cm total height: 11.1 cm + 21.7 cm) */}
        <div
          style={{ width: '18.5cm', minWidth: '18.5cm', maxWidth: '18.5cm' }}
          className="relative mx-auto bg-white border-[1.5px] sm:border-[2px] border-[#348e38] p-0 flex flex-col"
        >
          {/* 1st Slice: 11.1 cm - Affidavit of Acknowledgment */}
          <div
            style={{ height: '11.1cm', minHeight: '11.1cm', maxHeight: '11.1cm' }}
            className="relative z-20 px-3 pt-0 pb-2 border-b-2 border-[#348e38] flex flex-col justify-between shrink-0"
          >
            {/* Top Group: Title (+1 top padding) + Paragraphs (reduced before-space) */}
            <div className="shrink-0">
              {/* Title + Parenthetical descriptions */}
              <div className="w-fit mx-auto text-center pt-2 mt-0">
                <h2 className="font-bold text-[10pt] uppercase tracking-wide text-slate-900 leading-tight pt-0 mt-0">
                  AFFIDAVIT OF ACKNOWLEDGMENT/ADMISSION OF PATERNITY
                </h2>
                <div className="grid grid-cols-2 gap-4 text-[7.5pt] font-helvetica not-italic text-slate-700 pt-[1px] pb-[1px] leading-none">
                  <span className="text-center text-slate-600">
                    (For births before 3 August 1988)
                  </span>
                  <span className="text-center text-slate-700">
                    (For births on or after 3 August 1988)
                  </span>
                </div>
              </div>

              {/* First Paragraph block (blanks stretch to occupy full line width, breaks preserved after 2nd blank & "was") */}
              <div className="mt-1 space-y-1.5 text-[8.5pt] leading-relaxed">
                <div className="space-y-1 text-left leading-relaxed">
                  <div className="flex items-baseline gap-1 w-full pl-8">
                    <span className="shrink-0 whitespace-nowrap">I/We,</span>
                    {renderGreenBlank(showPaternity ? paternityNarrativeFather.toUpperCase() : '', '_________________________', 'flex-1')}
                    <span className="shrink-0 whitespace-nowrap">and</span>
                    {renderGreenBlank(showPaternity ? paternityNarrativeMother.toUpperCase() : '', '_________________________', 'flex-1')}
                    <span className="shrink-0">,</span>
                  </div>
                  <div className="flex items-baseline gap-1 w-full">
                    <span className="shrink-0 whitespace-nowrap">of legal age, am/are the natural father and/or mother of</span>
                    {renderGreenBlank(showPaternity ? paternityNarrativeChild.toUpperCase() : '', '_________________________', 'flex-1')}
                    <span className="shrink-0 whitespace-nowrap">, who was</span>
                  </div>
                  <div className="flex items-baseline gap-1 w-full">
                    <span className="shrink-0 whitespace-nowrap">born on</span>
                    {renderCmBlank(showPaternity ? paternityNarrativeBirthDate : '', '4.2cm')}
                    <span className="shrink-0 whitespace-nowrap">at</span>
                    {renderCmBlank(showPaternity ? paternityNarrativeBirthPlace.toUpperCase() : '', '7.5cm')}
                    <span className="shrink-0">.</span>
                  </div>
                </div>
                <p className="indent-8 text-justify leading-relaxed">
                  I am / We are executing this affidavit to attest to the truthfulness of the foregoing
                  statements and for purposes of acknowledging my/our child.
                </p>
              </div>
            </div>

            {/* Father & Mother Signature Lines (separated by vertical border line) */}
            <div className="grid grid-cols-2 border-t border-[#348e38]/40 pt-1.5 text-center shrink-0">
              <div className="border-r border-[#348e38]/50 pr-4">
                <div className="border-b border-[#348e38] text-[9pt] min-h-[16px] pb-0 font-bold font-helvetica text-slate-900 uppercase">
                  {showPaternity && paternityFatherSig ? (
                    <span data-print-value="true">{paternityFatherSig.toUpperCase()}</span>
                  ) : ''}
                </div>
                <p className="text-[7.5pt] font-helvetica m-0 p-0 leading-tight text-slate-600">
                  (Signature Over Printed Name of Father)
                </p>
              </div>
              <div className="pl-4">
                <div className="border-b border-[#348e38] text-[9pt] min-h-[16px] pb-0 font-bold font-helvetica text-slate-900 uppercase">
                  {showPaternity && paternityMotherSig ? (
                    <span data-print-value="true">{paternityMotherSig.toUpperCase()}</span>
                  ) : ''}
                </div>
                <p className="text-[7.5pt] font-helvetica m-0 p-0 leading-tight text-slate-600">
                  (Signature Over Printed Name of Mother)
                </p>
              </div>
            </div>

            {/* Second Paragraph: SUBSCRIBED AND SWORN (Jurat) - breaks after "by", "her", "at" with full-width blanks */}
            <div className="pt-0 text-[8.5pt] leading-relaxed shrink-0 space-y-1 text-left">
              <div className="flex items-baseline gap-1 w-full pl-8">
                <span className="shrink-0 whitespace-nowrap">
                  <span className="font-bold">SUBSCRIBED AND SWORN</span> to before me this
                </span>
                {renderGreenBlank(showPaternity ? colb?.paternitySwornDay : '', '________', 'flex-[1]')}
                <span className="shrink-0 whitespace-nowrap">day of</span>
                {renderGreenBlank(
                  showPaternity && colb?.paternitySwornMonth
                    ? `${colb.paternitySwornMonth}${colb?.paternitySwornYear ? `, ${colb.paternitySwornYear}` : ''}`
                    : '',
                  '________________',
                  'flex-[2]'
                )}
                <span className="shrink-0 whitespace-nowrap">by</span>
              </div>
              <div className="flex items-baseline gap-1 w-full">
                {renderGreenBlank(
                  showPaternity ? paternityFatherSig.toUpperCase() : '',
                  '_________________________',
                  'flex-1'
                )}
                <span className="shrink-0 whitespace-nowrap">and</span>
                {renderGreenBlank(
                  showPaternity ? paternityMotherSig.toUpperCase() : '',
                  '_________________________',
                  'flex-1'
                )}
                <span className="shrink-0 whitespace-nowrap">who exhibited to me his/her</span>
              </div>
              <div className="flex items-baseline gap-1 w-full">
                <span className="shrink-0 whitespace-nowrap">CTC/valid ID</span>
                {renderGreenBlank(showPaternity ? colb?.affidavitPaternityFatherCtc : '', '__________________', 'flex-[1.2]')}
                <span className="shrink-0 whitespace-nowrap">issued on</span>
                {renderGreenBlank(showPaternity ? formatDateMMMMCommaDDYYYY(colb?.paternityFatherCtcDate) : '', '________________', 'flex-1')}
                <span className="shrink-0 whitespace-nowrap">at</span>
              </div>
              <div className="flex items-baseline gap-1 w-full">
                {renderCmBlank(
                  showPaternity ? (colb?.paternityFatherCtcPlace || colb?.paternitySwornPlace || '').toUpperCase() : '',
                  '7.5cm'
                )}
                <span className="shrink-0">.</span>
              </div>
            </div>

            {/* Administering Officer Signature Lines (separated by border lines) */}
            <div className="grid grid-cols-2 border-t border-[#348e38]/40 pt-1.5 text-center shrink-0">
              {/* Left Column: Signature & Name in Print */}
              <div className="space-y-1.5 border-r border-[#348e38]/50 pr-4">
                <div>
                  <div className="border-b border-[#348e38] text-[9pt] min-h-[16px] pb-0 font-bold font-helvetica text-slate-900">
                    {''}
                  </div>
                  <p className="text-[7.5pt] font-helvetica m-0 p-0 leading-tight text-slate-600">
                    (Signature of the Administering Officer)
                  </p>
                </div>
                <div>
                  <div className="border-b border-[#348e38] text-[9pt] min-h-[16px] pb-0 font-bold font-helvetica text-slate-900 uppercase">
                    {showPaternity && colb?.affidavitPaternityAdminOfficer ? (
                      <span data-print-value="true">{colb.affidavitPaternityAdminOfficer.toUpperCase()}</span>
                    ) : ''}
                  </div>
                  <p className="text-[7.5pt] font-helvetica m-0 p-0 leading-tight text-slate-600">
                    (Name in Print)
                  </p>
                </div>
              </div>

              {/* Right Column: Position / Title / Designation & Address */}
              <div className="space-y-1.5 pl-4">
                <div>
                  <div className="border-b border-[#348e38] text-[9pt] min-h-[16px] pb-0 font-bold font-helvetica uppercase text-slate-900">
                    {showPaternity && colb?.paternityAdminOfficerTitle ? (
                      <span data-print-value="true">{colb.paternityAdminOfficerTitle.toUpperCase()}</span>
                    ) : ''}
                  </div>
                  <p className="text-[7.5pt] font-helvetica m-0 p-0 leading-tight text-slate-600">
                    (Position / Title / Designation)
                  </p>
                </div>
                <div>
                  <div className="border-b border-[#348e38] text-[9pt] min-h-[16px] pb-0 font-bold font-helvetica text-slate-900 uppercase">
                    {showPaternity && colb?.paternityAdminOfficerAddress ? (
                      <span data-print-value="true">{colb.paternityAdminOfficerAddress.toUpperCase()}</span>
                    ) : ''}
                  </div>
                  <p className="text-[7.5pt] font-helvetica m-0 p-0 leading-tight text-slate-600">
                    (Address)
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 2nd Slice: 21.7 cm - Affidavit for Delayed Registration */}
          <div
            style={{ height: '21.7cm', minHeight: '21.7cm', maxHeight: '21.7cm' }}
            className="relative z-20 px-2.5 pt-0 pb-2 flex flex-col justify-between shrink-0"
          >
            <div className="pt-0 mt-0">
              {/* Title (No top padding, +1 font size, not italic subtitle with very small padding) */}
              <div className="text-center pt-0 mt-0">
                <h2 className="font-bold text-[10pt] uppercase tracking-wide text-slate-900 leading-tight pt-0 mt-0">
                  AFFIDAVIT FOR DELAYED REGISTRATION OF BIRTH
                </h2>
                <p className="text-center text-[7.5pt] font-helvetica not-italic text-slate-700 pt-[1px] pb-[1px] leading-tight">
                  (To be accomplished by the hospital/clinic administrator, father, mother, or guardian or the person himself if 18 years old or over.)
                </p>
              </div>

              {/* Opening Paragraph: no comma/space after "I", 3rd blank 13cm, no comma before "after", justified */}
              <div className="mt-1.5 text-justify leading-relaxed text-[8.5pt] space-y-1">
                <div className="flex items-baseline w-full pl-8">
                  <span className="shrink-0 whitespace-nowrap">I</span>
                  {renderGreenBlank(
                    showDelayed ? (colb?.delayedAffiantName || father.fullName).toUpperCase() : '',
                    '_________________________',
                    'flex-1'
                  )}
                  <span className="shrink-0 whitespace-nowrap mr-1">, of legal age,</span>
                  {renderCmBlank(
                    showDelayed ? colb?.delayedAffiantCivilStatus : '',
                    '2.5cm'
                  )}
                  <span className="shrink-0 whitespace-nowrap">, with</span>
                </div>
                <div className="text-justify [text-align-last:justify] leading-relaxed w-full">
                  residence and postal address at{' '}
                  {renderCmBlank(
                    showDelayed ? (colb?.delayedAffiantResidence || colb?.motherResidenceStreet || '').toUpperCase() : '',
                    '13cm'
                  )}
                </div>
                <div className="text-justify [text-align-last:justify] leading-relaxed w-full">
                  {renderCmBlank('', '6cm')} after having been duly sworn in accordance with law, do hereby depose and say:
                </div>
              </div>

              {/* Numbered Affidavit Statements (paddingLeft: 1.5 cm, justified) */}
              <ol
                style={{ paddingLeft: '1.5cm' }}
                className="list-decimal list-outside w-full space-y-1.5 text-[8.5pt] leading-snug mt-2 pr-0 text-justify"
              >
                {/* Item 1: 0.6cm space between box and first word */}
                <li className="text-justify">
                  That I am the applicant for the delayed registration of:
                  <div className="pl-4 space-y-1 mt-0.5">
                    <div>
                      <CheckBoxLine
                        checked={showDelayed && colb?.delayedApplicantType === 'my_birth'}
                        boxGap="0.6cm"
                        fullWidth
                        label={
                          <span className="block w-full text-justify [text-align-last:justify] leading-relaxed">
                            my birth in{' '}
                            {renderCmBlank(
                              showDelayed && colb?.delayedApplicantType === 'my_birth'
                                ? (colb?.delayedApplicantPlace || child.placeOfBirth).toUpperCase()
                                : '',
                              '5.5cm'
                            )}{' '}
                            <span className="whitespace-nowrap">
                              on{' '}
                              {renderCmBlank(
                                showDelayed && colb?.delayedApplicantType === 'my_birth'
                                  ? formatDateMMMMCommaDDYYYY(colb?.delayedApplicantDate || child.dateOfBirth)
                                  : '',
                                '3.8cm'
                              )}
                            </span>
                          </span>
                        }
                      />
                    </div>
                    <div>
                      <CheckBoxLine
                        checked={showDelayed && colb?.delayedApplicantType !== 'my_birth'}
                        boxGap="0.6cm"
                        fullWidth
                        label={
                          <span className="block w-full text-justify leading-relaxed">
                            the birth of{' '}
                            {renderCmBlank(
                              showDelayed && colb?.delayedApplicantType !== 'my_birth'
                                ? (colb?.delayedChildName || child.fullName).toUpperCase()
                                : '',
                              '4.6cm'
                            )}{' '}
                            who was born in{' '}
                            {renderCmBlank(
                              showDelayed && colb?.delayedApplicantType !== 'my_birth'
                                ? (colb?.delayedApplicantPlace || child.placeOfBirth).toUpperCase()
                                : '',
                              '4.3cm'
                            )}
                            <br />
                            {renderCmBlank('', '4.7cm')}{' '}
                            on{' '}
                            {renderCmBlank(
                              showDelayed && colb?.delayedApplicantType !== 'my_birth'
                                ? formatDateMMMMCommaDDYYYY(colb?.delayedApplicantDate || child.dateOfBirth)
                                : '',
                              '3.8cm'
                            )}.
                          </span>
                        }
                      />
                    </div>
                  </div>
                </li>

                {/* Item 2: 1st blank 8.2cm, break line only after 'at', 2nd blank 14cm */}
                <li className="leading-relaxed text-justify">
                  That I/he/she was attended at birth by{' '}
                  {renderCmBlank(
                    showDelayed ? (colb?.delayedAttendantName || colb?.attendantSignatureName || '').toUpperCase() : '',
                    '8.2cm'
                  )}{' '}
                  who resides at
                  <br />
                  {renderCmBlank(
                    showDelayed ? (colb?.delayedAttendantAddress || colb?.attendantAddress || '').toUpperCase() : '',
                    '14cm'
                  )}.
                </li>

                {/* Item 3: Blank length 7.5cm */}
                <li className="text-justify [text-align-last:justify]">
                  That I am/he/she is a citizen of{' '}
                  {renderCmBlank(showDelayed ? colb?.delayedCitizenship : '', '7.5cm')}.
                </li>

                {/* Item 4: 0.5cm after 'were:', 0.5cm between checkbox and words, parallel checkboxes, justified */}
                <li className="leading-relaxed">
                  {(() => {
                    const effectiveStatus =
                      colb?.delayedParentsStatus ||
                      (colb?.parentsMarried === false || colb?.parentsMarriageDatePlace?.toUpperCase().includes('NOT MARRIED')
                        ? 'not_married'
                        : 'married');
                    const isDelayedNotMarried = effectiveStatus === 'not_married';
                    const rawMarriageStr =
                      (colb?.delayedParentsMarriageDatePlace || '').trim() ||
                      (!colb?.parentsMarriageDatePlace?.toUpperCase().includes('NOT MARRIED')
                        ? colb?.parentsMarriageDatePlace || ''
                        : '');
                    let datePart = '';
                    let placePart = '';
                    if (rawMarriageStr) {
                      const atIdx = rawMarriageStr.toLowerCase().indexOf(' at ');
                      const dashIdx = rawMarriageStr.indexOf(' - ');
                      if (atIdx >= 0) {
                        datePart = rawMarriageStr.slice(0, atIdx).trim();
                        placePart = rawMarriageStr.slice(atIdx + 4).trim();
                      } else if (dashIdx >= 0) {
                        datePart = rawMarriageStr.slice(0, dashIdx).trim();
                        placePart = rawMarriageStr.slice(dashIdx + 3).trim();
                      } else if (rawMarriageStr.includes('-')) {
                        const dashParts = rawMarriageStr.split('-');
                        datePart = dashParts[0]?.trim() || '';
                        placePart = dashParts.slice(1).join('-').trim();
                      } else {
                        datePart = rawMarriageStr;
                      }
                    }
                    if (!datePart) {
                      datePart = [
                        colb?.parentsMarriageDateMonth,
                        colb?.parentsMarriageDateDay,
                        colb?.parentsMarriageDateYear,
                      ]
                        .filter(Boolean)
                        .join(' ')
                        .trim();
                    }
                    const formattedDatePart = formatDateMMMMCommaDDYYYY(datePart);
                    if (!placePart) {
                      placePart = [
                        colb?.parentsMarriagePlaceCity,
                        colb?.parentsMarriagePlaceProvince,
                        colb?.parentsMarriagePlaceCountry,
                      ]
                        .filter(Boolean)
                        .join(', ')
                        .trim();
                    }
                    const fatherFallbackName =
                      [colb?.fatherFirstName, colb?.fatherMiddleName, colb?.fatherLastName]
                        .filter(Boolean)
                        .join(' ') || father.fullName;
                    return (
                      <div className="flex items-start w-full">
                        <span className="shrink-0 whitespace-nowrap" style={{ marginRight: '0.5cm' }}>
                          That my/his/her parents were:
                        </span>
                        <div className="flex-1 min-w-0 space-y-0.5">
                          <div>
                            <CheckBoxLine
                              checked={showDelayed && !isDelayedNotMarried}
                              boxGap="0.5cm"
                              fullWidth
                              label={
                                <span className="block w-full text-justify leading-relaxed">
                                  married on{' '}
                                  {renderCmBlank(showDelayed && !isDelayedNotMarried ? formattedDatePart : '', '4.5cm')}{' '}
                                  at{' '}
                                  {renderCmBlank(showDelayed && !isDelayedNotMarried ? (placePart || '').toUpperCase() : '', '3.8cm')}
                                  <br />
                                  {renderCmBlank('', '8.5cm')}.
                                </span>
                              }
                            />
                          </div>
                          <div>
                            <CheckBoxLine
                              checked={showDelayed && isDelayedNotMarried}
                              boxGap="0.5cm"
                              fullWidth
                              label={
                                <span className="block w-full text-justify [text-align-last:justify] leading-relaxed">
                                  not married but I/he/she was acknowledged by my/his/her
                                  <br />
                                  father whose name is{' '}
                                  {renderCmBlank(
                                    showDelayed && isDelayedNotMarried
                                      ? (colb?.delayedFatherName || colb?.paternityFatherName || fatherFallbackName).toUpperCase()
                                      : '',
                                    '6.5cm'
                                  )}
                                </span>
                              }
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </li>

                {/* Item 5: 1st blank 7cm, continue blank on new line 12cm */}
                <li className="leading-relaxed text-justify">
                  That the reason for the delay in registering my/his/her birth was:{' '}
                  {renderCmBlank(
                    showDelayed ? colb?.delayedReason : '',
                    '7cm'
                  )}
                  <br />
                  {renderCmBlank('', '12cm')}.
                </li>

                {/* Item 6: Move (For applicant only) next to 6, 1st blank 6.5cm, 2nd blank 3.5cm, justified */}
                <li className="leading-relaxed">
                  <div className="text-justify [text-align-last:justify]">
                    (For applicant only) That I am married to{' '}
                    {renderCmBlank(showDelayed ? (colb?.delayedApplicantMarriedTo || '').toUpperCase() : '', '6.5cm')}.
                  </div>
                  <div className="text-justify [text-align-last:justify]">
                    (If the applicant is other than the document owner) That I am the{' '}
                    {renderCmBlank(showDelayed ? colb?.delayedAffiantRelationship : '', '3.5cm')}{' '}
                    of the said person.
                  </div>
                </li>

                {/* Item 7 */}
                <li className="text-justify">
                  That I am executing this affidavit to attest to the truthfulness of the foregoing
                  statements for all legal intents and purposes.
                </li>
              </ol>

              {/* In truth whereof: 1cm space below Item 7, justified to occupy right space */}
              <div style={{ marginTop: '1cm' }} className="text-[8.5pt] leading-relaxed text-justify space-y-1">
                <div className="indent-8 text-justify [text-align-last:justify] leading-relaxed">
                  In truth whereof, I have affixed my signature below this{' '}
                  {renderCmBlank(showDelayed ? colb?.delayedSwornDay : '', '1.5cm')}{' '}
                  day of{' '}
                  {renderCmBlank(showDelayed ? colb?.delayedSwornMonth : '', '6cm')},
                </div>
                <div className="text-justify [text-align-last:justify] leading-relaxed">
                  {renderCmBlank(showDelayed ? colb?.delayedSwornYear : '', '7.6cm')}{' '}
                  at{' '}
                  {renderCmBlank(showDelayed ? (colb?.delayedSwornPlace || '').toUpperCase() : '', '7.4cm')}, Philippines.
                </div>
              </div>

              {/* Affiant Signature Line (Right aligned below In truth whereof, 7.8cm, bordered separation) */}
              <div className="flex justify-end pt-2 border-t border-[#348e38]/35 pr-2">
                <div className="w-[7.8cm] text-center border-l border-[#348e38]/40 pl-3">
                  <div className="border-b border-[#348e38] text-[9pt] min-h-[16px] pb-0 font-bold font-helvetica text-slate-900 uppercase">
                    {showDelayed && (colb?.delayedAffiantName || father.fullName) ? (
                      <span data-print-value="true">{(colb?.delayedAffiantName || father.fullName).toUpperCase()}</span>
                    ) : ''}
                  </div>
                  <p className="text-[7.5pt] font-helvetica m-0 p-0 leading-tight text-slate-600">
                    (Signature Over Printed Name of Affiant)
                  </p>
                </div>
              </div>
            </div>

            {/* SUBSCRIBED AND SWORN (Jurat - Delayed Registration): justified across full width */}
            <div className="pt-0 text-[8.5pt] leading-relaxed shrink-0 space-y-1 text-justify">
              <div className="indent-8 text-justify [text-align-last:justify] leading-relaxed">
                <span className="font-bold">SUBSCRIBED AND SWORN</span> to before me this{' '}
                {renderCmBlank(showDelayed ? colb?.delayedSwornDay : '', '1.5cm')}{' '}
                day of{' '}
                {renderCmBlank(showDelayed ? colb?.delayedSwornMonth : '', '4.2cm')},{' '}
                {renderCmBlank(showDelayed ? colb?.delayedSwornYear : '', '2cm')}{' '}
                at
              </div>
              <div className="text-justify [text-align-last:justify] leading-relaxed">
                {renderCmBlank(showDelayed ? (colb?.delayedSwornPlace || '').toUpperCase() : '', '9cm')}, Philippines, affiant who exhibited to me his/her CTC/valid ID
              </div>
              <div className="text-justify [text-align-last:justify] leading-relaxed">
                {renderCmBlank(showDelayed ? colb?.delayedAffiantCtc : '', '3.6cm')}{' '}
                issued on{' '}
                {renderCmBlank(showDelayed ? formatDateMMMMCommaDDYYYY(colb?.delayedAffiantCtcDate) : '', '3.2cm')}{' '}
                at{' '}
                {renderCmBlank(showDelayed ? (colb?.delayedAffiantCtcPlace || colb?.delayedSwornPlace || '').toUpperCase() : '', '7.5cm')}.
              </div>
            </div>

            {/* Administering Officer Signature Lines (2x2 Green blank lines, separated by border lines) */}
            <div className="grid grid-cols-2 border-t border-[#348e38]/40 pt-1.5 text-center shrink-0">
              {/* Left Column: Signature & Name in Print */}
              <div className="space-y-1.5 border-r border-[#348e38]/50 pr-4">
                <div className="w-[7.8cm] mx-auto">
                  <div className="border-b border-[#348e38] text-[9pt] min-h-[16px] pb-0 font-bold font-helvetica text-slate-900">
                    {''}
                  </div>
                  <p className="text-[7.5pt] font-helvetica m-0 p-0 leading-tight text-slate-600">
                    (Signature of the Administering Officer)
                  </p>
                </div>
                <div className="w-[7.8cm] mx-auto">
                  <div className="border-b border-[#348e38] text-[9pt] min-h-[16px] pb-0 font-bold font-helvetica text-slate-900 uppercase">
                    {showDelayed && colb?.delayedAdminOfficerName ? (
                      <span data-print-value="true">{colb.delayedAdminOfficerName.toUpperCase()}</span>
                    ) : ''}
                  </div>
                  <p className="text-[7.5pt] font-helvetica m-0 p-0 leading-tight text-slate-600">
                    (Name in Print)
                  </p>
                </div>
              </div>

              {/* Right Column: Position / Title / Designation & Address */}
              <div className="space-y-1.5 pl-4">
                <div className="w-[7.8cm] mx-auto">
                  <div className="border-b border-[#348e38] text-[9pt] min-h-[16px] pb-0 font-bold font-helvetica uppercase text-slate-900">
                    {showDelayed && colb?.delayedAdminOfficerTitle ? (
                      <span data-print-value="true">{colb.delayedAdminOfficerTitle.toUpperCase()}</span>
                    ) : ''}
                  </div>
                  <p className="text-[7.5pt] font-helvetica m-0 p-0 leading-tight text-slate-600">
                    (Position / Title / Designation)
                  </p>
                </div>
                <div className="w-[7.8cm] mx-auto">
                  <div className="border-b border-[#348e38] text-[9pt] min-h-[16px] pb-0 font-bold font-helvetica text-slate-900 uppercase">
                    {showDelayed && colb?.delayedAdminOfficerAddress ? (
                      <span data-print-value="true">{colb.delayedAdminOfficerAddress.toUpperCase()}</span>
                    ) : ''}
                  </div>
                  <p className="text-[7.5pt] font-helvetica m-0 p-0 leading-tight text-slate-600">
                    (Address)
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // PAGE 1: EXACT BOND PAPER REPLICA MATCHING image_c19b7345.png
  // Exact Border Height Breakdown (Total Inner Frame: 31.7 cm × 18.5 cm width):
  // 1. Main Header: 2cm | 2. Second Header: 1.5cm | 3. Child: 4.4cm | 4. Mother: 4cm
  // 5. Father: 3cm | 6. Marriage Desc: 0.5cm | 7. 20a-21b: 5cm | 8. 22-23: 4cm
  // 9. 24-25: 3cm | 10. Remarks: 2.8cm | 11. To be filled: 1.5cm (boxes: 0.5cm)
  // =========================================================================
  return (
    <div
      className="relative w-full min-w-fit bg-white text-slate-900 font-helvetica select-text p-2 sm:p-3 flex flex-col items-center"
    >
      {/* =================================================================== */}
      <div
        style={{ width: '18.5cm', minWidth: '18.5cm', maxWidth: '18.5cm' }}
        className="relative mx-auto bg-white border-[1.5px] sm:border-[2px] border-[#348e38] flex flex-col"
      >
        
        {/* 1. 2 cm - MAIN HEADER (Form 102, Republic, Title) */}
        <div
          style={{ height: '2cm', minHeight: '2cm', maxHeight: '2cm' }}
          className="relative z-20 border-t border-b border-[#348e38] px-2 py-0.5 flex flex-col justify-center shrink-0"
        >
          <div className="grid grid-cols-1 w-full">
            {/* Layer 1: Top Left & Top Right Corner Notices */}
            <div className="col-start-1 row-start-1 flex justify-between items-start w-full">
              {/* Top Left: Form Number and Revision */}
              <div className="text-left font-helvetica text-[6.5pt] text-[#222222] leading-tight whitespace-nowrap">
                <p className="font-normal">
                  Municipal Form No. 102
                </p>
                <p className="font-normal whitespace-nowrap">
                  (Revised August 2016)
                </p>
              </div>

              {/* Top Right: Accomplishment Notice */}
              <div className="text-right font-helvetica text-[6.5pt] text-[#222222] leading-tight">
                <p className="whitespace-nowrap">
                  (To be accomplished in quadruplicate using black ink)
                </p>
              </div>
            </div>

            {/* Layer 2: Center Official Document Heading (True Geometric Center) */}
            <div className="col-start-1 row-start-1 w-full text-center font-helvetica pt-2.5 sm:pt-3 whitespace-nowrap pointer-events-none">
              <p className="text-[8.5pt] text-[#222222] font-normal leading-none tracking-normal">
                Republic of the Philippines
              </p>

              <p className="text-[9.5pt] text-[#222222] font-medium uppercase tracking-[0.05em] leading-none mt-0.5">
                OFFICE OF THE CIVIL REGISTRAR GENERAL
              </p>

              <h1 className="text-[15pt] sm:text-[16pt] font-bold text-[#111111] uppercase tracking-[0.08em] sm:tracking-[0.11em] leading-none mt-0.5">
                CERTIFICATE OF LIVE BIRTH
              </h1>
            </div>
          </div>
        </div>

        {/* 2. 1.5 cm - SECOND HEADER (Province & City/Municipality | Registry No.) */}
        <div
          style={{ height: '1.5cm', minHeight: '1.5cm', maxHeight: '1.5cm' }}
          className="relative z-20 border-t border-b border-[#348e38] grid grid-cols-12 shrink-0"
        >
          {/* Left 8 Cols (Approx 67% width) */}
          <div className="col-span-8 px-1.5 py-0.5 font-helvetica flex flex-col justify-center gap-0.5">
            {/* Province Line: zero space between word and blank line */}
            <div className="flex items-baseline">
              <span className="text-[9.5pt] text-[#222222] font-normal whitespace-nowrap">
                Province
              </span>
              <BoundBox
                bindingId="header.province"
                token="{{colb.province}}"
                className="flex-1 min-w-0 border-b border-[#348e38] min-h-[14px] flex items-end overflow-hidden"
              >
                <span data-print-value="true" className="font-helvetica font-bold text-[9.5pt] uppercase text-black tracking-wide block leading-tight pl-1 truncate w-full">
                  {colb?.province ?? child.provinceState ?? ''}
                </span>
              </BoundBox>
            </div>

            {/* City/Municipality Line: zero space between word and blank line */}
            <div className="flex items-baseline mt-0.5">
              <span className="text-[9.5pt] text-[#222222] font-normal whitespace-nowrap">
                City/Municipality
              </span>
              <BoundBox
                bindingId="header.cityMunicipality"
                token="{{colb.cityMunicipality}}"
                className="flex-1 min-w-0 border-b border-[#348e38] min-h-[14px] flex items-end overflow-hidden"
              >
                <span data-print-value="true" className="font-helvetica font-bold text-[9.5pt] uppercase text-black tracking-wide block leading-tight pl-1 truncate w-full">
                  {colb?.cityMunicipality ?? child.cityMunicipality ?? ''}
                </span>
              </BoundBox>
            </div>
          </div>

          {/* Right 4 Cols: Registry No. (No top padding/margin, no blank line, value below label) */}
          <div className="col-span-4 border-l border-[#348e38] px-1.5 pt-0 pb-0.5 font-helvetica flex flex-col justify-start min-w-0 overflow-hidden">
            <span className="text-[9.5pt] text-[#222222] font-normal whitespace-nowrap leading-none m-0 p-0">
              Registry No.
            </span>
            <BoundBox
              bindingId="header.registryNo"
              token="{{colb.registryNo}}"
              className="w-full pt-0.5 min-h-[16px]"
            >
              <span data-print-value="true" className="font-helvetica font-bold text-[10pt] uppercase text-black tracking-wider block leading-tight truncate">
                {(colb?.registryNo ?? '').toUpperCase()}
              </span>
            </BoundBox>
          </div>
        </div>

        {/* ================================================================ */}
        {/* 3. 4.4 cm - CHILD SECTION (ITEMS 1 - 6) WITH LEFT VERTICAL STRIP */}
        {/* ================================================================ */}
        <div
          style={{ height: '4.4cm', minHeight: '4.4cm', maxHeight: '4.4cm' }}
          className="relative z-20 border-t border-b border-[#348e38] font-helvetica flex shrink-0"
        >
          {/* Left Vertical Strip: CHILD */}
          <div className="w-[0.45cm] border-r border-[#348e38] bg-white flex flex-col items-center justify-center py-1 select-none shrink-0">
            <div className="flex flex-col items-center justify-center font-helvetica font-bold text-[8.5pt] text-[#111111] space-y-1 leading-none">
              <span>C</span>
              <span>H</span>
              <span>I</span>
              <span>L</span>
              <span>D</span>
            </div>
          </div>

          {/* Form Content: Items 1 - 6 */}
          <div className="flex-1 flex flex-col font-helvetica h-full">
            {/* 1. NAME OF CHILD */}
            <div className="border-b border-[#348e38] px-1.5 py-0.5 font-helvetica flex-1 flex flex-col justify-center">
              {/* Top Row: Field Number/Label and Green Guide Texts */}
              <div className="grid grid-cols-12 items-baseline leading-none">
                <div className="col-span-2 text-[8pt] font-medium text-black uppercase whitespace-nowrap">
                  1. NAME
                </div>
                <div className="col-span-10 grid grid-cols-3 text-center text-[7.5pt] text-[#288330]">
                  <span>(First)</span>
                  <span>(Middle)</span>
                  <span>(Last)</span>
                </div>
              </div>

              {/* Bottom Row: Actual Data Values Placed Below */}
              <div className="grid grid-cols-12 items-baseline pt-0.5 min-h-[14px]">
                <div className="col-span-2"></div>
                <div className="col-span-10 grid grid-cols-3 text-center">
                  <BoundBox bindingId="child.firstName" token="{{child.firstName}}" className="px-1 min-w-0">
                    <p data-print-value="true" className="font-bold text-[9pt] uppercase text-black leading-tight min-h-[14px] truncate">{childFirst}</p>
                  </BoundBox>
                  <BoundBox bindingId="child.middleName" token="{{child.middleName}}" className="px-1 min-w-0">
                    <p data-print-value="true" className="font-bold text-[9pt] uppercase text-black leading-tight min-h-[14px] truncate">{childMiddle}</p>
                  </BoundBox>
                  <BoundBox bindingId="child.lastName" token="{{child.lastName}}" className="px-1 min-w-0">
                    <p data-print-value="true" className="font-bold text-[9pt] uppercase text-black leading-tight min-h-[14px] truncate">{childLast}</p>
                  </BoundBox>
                </div>
              </div>
            </div>

            {/* 2. SEX & 3. DATE OF BIRTH */}
            <div className="grid grid-cols-12 border-b border-[#348e38] flex-1">
              {/* 2. SEX (col-span-4, approx 33% width) */}
              <div className="col-span-4 border-r border-[#348e38] px-1.5 py-0.5 flex flex-col justify-between min-w-0">
                <span className="font-helvetica font-medium text-[8pt] uppercase block text-black leading-none">
                  2. SEX <span className="font-normal normal-case text-[7.5pt] text-[#288330]">(Male / Female)</span>
                </span>
                <BoundBox bindingId="child.sex" token="{{child.sex}}">
                  <p data-print-value="true" className="font-helvetica font-bold text-[9pt] uppercase text-black leading-tight text-center min-h-[14px] truncate">
                    {child.sex || ''}
                  </p>
                </BoundBox>
              </div>

              {/* 3. DATE OF BIRTH (col-span-8, exact layout from image_60962b96.png) */}
              <div className="col-span-8 px-1.5 py-0.5 font-helvetica flex items-center min-w-0">
                <div className="flex items-start w-full">
                  {/* Left side: 3. DATE OF / BIRTH stacked */}
                  <div className="font-helvetica font-medium text-[8pt] uppercase text-black leading-tight shrink-0 w-20 sm:w-24">
                    <div>3. DATE OF</div>
                    <div className="pl-3">BIRTH</div>
                  </div>

                  {/* Right side: (Day), (Month), (Year) helper labels above and Values below, no internal dividing borders */}
                  <div className="flex-1 font-helvetica min-w-0">
                    <div className="grid grid-cols-3 text-center text-[7.5pt] text-[#288330] font-normal leading-none">
                      <span>(Day)</span>
                      <span>(Month)</span>
                      <span>(Year)</span>
                    </div>
                    <BoundBox bindingId="child.dateOfBirth" token="{{child.dateOfBirth}}" className="mt-0.5">
                      <div className="grid grid-cols-3 text-center font-helvetica font-bold text-[9pt] text-black leading-tight">
                        <div data-print-value="true" className="min-h-[14px] truncate">{bDay}</div>
                        <div data-print-value="true" className="min-h-[14px] truncate">{bMonth}</div>
                        <div data-print-value="true" className="min-h-[14px] truncate">{bYear}</div>
                      </div>
                    </BoundBox>
                  </div>
                </div>
              </div>
            </div>

            {/* 4. PLACE OF BIRTH (0.9cm distance between label and Hospital column) */}
            <div className="border-b border-[#348e38] px-1.5 py-0.5 font-helvetica flex-1 flex flex-col justify-center">
              {/* Top Row: Field Number/Label and Green Guide Texts */}
              <div className="flex items-start leading-none">
                <div className="text-[8pt] font-medium text-black uppercase whitespace-nowrap shrink-0 leading-tight">
                  4. PLACE OF<br />BIRTH
                </div>
                <div style={{ marginLeft: '0.9cm' }} className="flex-1 flex text-center text-[7pt] text-[#288330]">
                  <span className="flex-1 min-w-0 px-1 leading-tight">(Name of Hospital/Clinic/Institution/<br />House No., St., Barangay)</span>
                  <span className="w-[23%] shrink-0 px-1">(City/Municipality)</span>
                  <span className="w-[23%] shrink-0 px-1">(Province)</span>
                </div>
              </div>

              {/* Bottom Row: Actual Data Values Placed Below - Hospital name uses remaining space */}
              <div className="flex items-baseline mt-0.5">
                <div className="text-[8pt] font-medium uppercase whitespace-nowrap shrink-0 invisible select-none pointer-events-none leading-none">
                  4. PLACE OF
                </div>
                <div style={{ marginLeft: '0.9cm' }} className="flex-1 flex items-center text-center">
                  <div className="flex-1 min-w-0 px-1">
                    <BoundBox bindingId="child.placeOfBirthHospital" token="{{child.placeOfBirth}}" className="w-full">
                      <p data-print-value="true" className="font-bold text-[8.5pt] uppercase text-black leading-tight truncate">
                        {child.placeOfBirth || additional.hospitalFacility || ''}
                      </p>
                    </BoundBox>
                  </div>
                  <div className="w-[23%] shrink-0 px-1">
                    <BoundBox bindingId="child.placeOfBirthCity" token="{{child.cityMunicipality}}" className="w-full">
                      <p data-print-value="true" className="font-bold text-[8.5pt] uppercase text-black leading-tight truncate">
                        {child.cityMunicipality || ''}
                      </p>
                    </BoundBox>
                  </div>
                  <div className="w-[23%] shrink-0 px-1">
                    <BoundBox bindingId="child.placeOfBirthProvince" token="{{child.provinceState}}" className="w-full">
                      <p data-print-value="true" className="font-bold text-[8.5pt] uppercase text-black leading-tight truncate">
                        {child.provinceState || ''}
                      </p>
                    </BoundBox>
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Border 5 and 6 lengths must be 0.5 inch and reduce the width of 5a so that there will be no spacing on that square 5a */}
            <div className="flex font-helvetica min-h-[0.5in] h-[0.5in] shrink-0">
              {/* 5a. TYPE OF BIRTH: reduced width to remove excess empty spacing */}
              <div
                style={{ width: '18%', minWidth: '95px' }}
                className="border-r border-[#348e38] px-1 py-0.5 flex flex-col justify-between shrink-0 overflow-hidden"
              >
                <div>
                  <span className="font-medium text-[7.5pt] block text-black leading-none">
                    5a. <span className="uppercase">TYPE OF BIRTH</span>
                  </span>
                  <span className="text-[5.5pt] text-[#288330] block leading-none mt-0.5 font-normal">(Single, Twin, Triplet, etc.)</span>
                </div>
                <div>
                  <BoundBox bindingId="child.birthType" token="{{additional.birthType}}">
                    <p data-print-value="true" className="font-helvetica font-bold text-[8pt] uppercase text-black border-b border-[#348e38] min-h-[12px] leading-none text-center truncate">
                      {(colb?.typeOfBirth || additional.birthType || '').toUpperCase()}
                    </p>
                  </BoundBox>
                </div>
              </div>

              {/* 5b. IF MULTIPLE BIRTH, CHILD WAS */}
              <div
                style={{ width: '27%', minWidth: '120px' }}
                className="border-r border-[#348e38] px-1 py-0.5 flex flex-col justify-between shrink-0 overflow-hidden"
              >
                <div>
                  <span className="font-medium text-[7.5pt] block text-black leading-none">
                    5b. <span className="uppercase">IF MULTIPLE BIRTH, CHILD WAS</span>
                  </span>
                  <span className="text-[5.5pt] text-[#288330] block leading-none mt-0.5 font-normal">[First, Second, Third, etc.]</span>
                </div>
                <div>
                  <BoundBox bindingId="child.multipleBirthOrder" token="{{colb.multipleBirthOrder}}">
                    <p data-print-value="true" className="font-helvetica font-bold text-[8pt] uppercase text-black border-b border-[#348e38] min-h-[12px] leading-none text-center truncate">
                      {((colb?.typeOfBirth || additional.birthType || '').toLowerCase() === 'single'
                        ? 'N/A'
                        : colb?.multipleBirthChildWas ||
                          (colb?.multipleBirthOrder
                            ? colb.multipleBirthOrder === '1'
                              ? 'FIRST'
                              : colb.multipleBirthOrder === '2'
                              ? 'SECOND'
                              : colb.multipleBirthSpecify || 'THIRD'
                            : '')).toUpperCase()}
                    </p>
                  </BoundBox>
                </div>
              </div>

              {/* 5c. BIRTH ORDER */}
              <div
                style={{ width: '36%', minWidth: '155px' }}
                className="border-r border-[#348e38] px-1 py-0.5 font-helvetica flex flex-col justify-between shrink-0 overflow-hidden"
              >
                <div>
                  <div className="text-[7.5pt] text-black leading-none">
                    <span className="font-medium">
                      5c. <span className="uppercase">BIRTH ORDER</span>{' '}
                    </span>
                    <span className="text-[5pt] text-[#288330] font-normal">
                      (Order of this birth to previous live births including fetal death)
                    </span>
                  </div>
                  <span className="text-[5.5pt] text-[#288330] block font-normal mt-0.5 leading-none">
                    (First, Second, Third, etc.)
                  </span>
                </div>

                <div>
                  <BoundBox bindingId="child.birthOrder" token="{{additional.birthOrder}}">
                    <p data-print-value="true" className="font-helvetica font-bold text-[8pt] uppercase text-black border-b border-[#348e38] min-h-[12px] leading-none text-center truncate">
                      {(colb?.birthOrder ?? additional.birthOrder ?? '').toUpperCase()}
                    </p>
                  </BoundBox>
                </div>
              </div>

              {/* 6. WEIGHT AT BIRTH */}
              <div
                className="px-1 py-0.5 flex flex-col justify-between shrink-0 flex-1 min-w-[80px] overflow-hidden"
              >
                <div>
                  <span className="font-helvetica font-medium text-[7.5pt] uppercase block text-black leading-none">6. WEIGHT AT BIRTH</span>
                </div>
                <div>
                  <BoundBox bindingId="child.weightAtBirth" token="{{colb.weightAtBirth}}">
                    <div className="flex items-baseline gap-1 border-b border-[#348e38] min-h-[12px]">
                      <span data-print-value="true" className="font-helvetica font-bold text-[8pt] uppercase text-black leading-none pl-1 truncate">
                        {(colb?.weightAtBirth || '').toUpperCase()}
                      </span>
                      <span className="text-[6.5pt] font-helvetica text-[#288330] font-normal ml-auto pr-1 shrink-0">grams</span>
                    </div>
                  </BoundBox>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ================================================================ */}
        {/* 4. 4 cm - MOTHER SECTION (ITEMS 7 - 13) WITH LEFT VERTICAL STRIP */}
        {/* ================================================================ */}
        <div
          style={{ height: '4cm', minHeight: '4cm', maxHeight: '4cm' }}
          className="relative z-20 border-t border-b border-[#348e38] font-helvetica flex shrink-0"
        >
          {/* Left Vertical Strip: MOTHER */}
          <div className="w-[0.45cm] border-r border-[#348e38] bg-white flex flex-col items-center justify-center py-1 select-none shrink-0">
            <div className="flex flex-col items-center justify-center font-helvetica font-bold text-[8.5pt] text-[#111111] space-y-1 leading-none">
              <span>M</span>
              <span>O</span>
              <span>T</span>
              <span>H</span>
              <span>E</span>
              <span>R</span>
            </div>
          </div>

          {/* Form Content: Items 7 - 13 */}
          <div className="flex-1 flex flex-col font-helvetica h-full">
            {/* 7. MAIDEN NAME (With line break matching Form 102) */}
            <div className="border-b border-[#348e38] px-1.5 py-0.5 font-helvetica flex-1 flex flex-col justify-center">
              {/* Top Row: Field Number/Label and Green Guide Texts */}
              <div className="grid grid-cols-12 items-start leading-none">
                <div className="col-span-2 text-[8pt] font-medium text-black uppercase whitespace-nowrap leading-tight">
                  7. MAIDEN<br /><span className="pl-2.5">NAME</span>
                </div>
                <div className="col-span-10 grid grid-cols-3 text-center text-[7.5pt] text-[#288330] pt-0.5">
                  <span>(First)</span>
                  <span>(Middle)</span>
                  <span>(Last)</span>
                </div>
              </div>

              {/* Bottom Row: Actual Data Values Placed Below */}
              <div className="grid grid-cols-12 items-baseline">
                <div className="col-span-2"></div>
                <div className="col-span-10 grid grid-cols-3 text-center">
                  <BoundBox bindingId="mother.firstName" token="{{mother.firstName}}" className="px-1">
                    <p data-print-value="true" className="font-bold text-[9pt] uppercase text-black leading-tight truncate">{motherFirst}</p>
                  </BoundBox>
                  <BoundBox bindingId="mother.middleName" token="{{mother.middleName}}" className="px-1">
                    <p data-print-value="true" className="font-bold text-[9pt] uppercase text-black leading-tight truncate">{motherMiddle}</p>
                  </BoundBox>
                  <BoundBox bindingId="mother.lastName" token="{{mother.lastName}}" className="px-1">
                    <p data-print-value="true" className="font-bold text-[9pt] uppercase text-black leading-tight truncate">{motherLast}</p>
                  </BoundBox>
                </div>
              </div>
            </div>

            {/* 8. CITIZENSHIP & 9. RELIGION */}
            <div className="grid grid-cols-2 border-b border-[#348e38] font-helvetica flex-1">
              <div className="border-r border-[#348e38] px-1.5 py-0.5 flex flex-col justify-center min-w-0">
                <span className="font-helvetica font-medium text-[8pt] uppercase text-black block leading-none">8. CITIZENSHIP</span>
                <BoundBox bindingId="mother.citizenship" token="{{mother.citizenship}}" className="mt-0.5">
                  <p data-print-value="true" className="font-helvetica font-bold text-[8.5pt] uppercase text-black min-h-[14px] leading-tight truncate">
                    {colb?.motherCitizenship ?? mother.nationality ?? ''}
                  </p>
                </BoundBox>
              </div>
              <div className="px-1.5 py-0.5 flex flex-col justify-center min-w-0">
                <span className="font-helvetica font-medium text-[8pt] uppercase text-black block leading-none">9. RELIGION/RELIGIOUS SECT</span>
                <BoundBox bindingId="mother.religion" token="{{mother.religion}}" className="mt-0.5">
                  <p data-print-value="true" className="font-helvetica font-bold text-[8.5pt] uppercase text-black min-h-[14px] leading-tight truncate">
                    {colb?.motherReligion ?? ''}
                  </p>
                </BoundBox>
              </div>
            </div>

            {/* 10. CHILDREN COUNTS, 11. OCCUPATION, 12. AGE */}
            {/* Widths: 10a = 2.8cm, 10b = 3.2cm, 10c = 3.3cm, 11 = 5.8cm, 12 = 3.1cm (total ratio = 18.2) */}
            <div className="flex font-helvetica border-b border-[#348e38] min-h-[0.4in] h-[0.4in] shrink-0">
              {/* 10a. Total number of children born alive (2.8 cm) */}
              <div
                style={{ width: 'calc(100% * 2.8 / 18.2)' }}
                className="border-r border-[#348e38] px-1 py-0.5 flex flex-col justify-between shrink-0"
              >
                <span className="font-helvetica font-medium text-[6pt] leading-none text-black block">
                  10a. Total number of children born alive
                </span>
                <BoundBox bindingId="mother.totalBornAlive" token="{{mother.totalChildrenBornAlive}}">
                  <span data-print-value="true" className="font-helvetica font-bold text-[8pt] text-black block min-h-[11px] text-center leading-none">
                    {colb?.totalChildrenBornAlive || ''}
                  </span>
                </BoundBox>
              </div>

              {/* 10b. No. of children still living including this birth (3.2 cm) */}
              <div
                style={{ width: 'calc(100% * 3.2 / 18.2)' }}
                className="border-r border-[#348e38] px-1 py-0.5 flex flex-col justify-between shrink-0"
              >
                <span className="font-helvetica font-medium text-[6pt] leading-none text-black block">
                  10b. No. of children still living including this birth
                </span>
                <BoundBox bindingId="mother.childrenStillLiving" token="{{mother.childrenStillLiving}}">
                  <span data-print-value="true" className="font-helvetica font-bold text-[8pt] text-black block min-h-[11px] text-center leading-none">
                    {colb?.childrenStillLiving || ''}
                  </span>
                </BoundBox>
              </div>

              {/* 10c. No. of children born alive but are now dead (3.3 cm) */}
              <div
                style={{ width: 'calc(100% * 3.3 / 18.2)' }}
                className="border-r border-[#348e38] px-1 py-0.5 flex flex-col justify-between shrink-0"
              >
                <span className="font-helvetica font-medium text-[6pt] leading-none text-black block">
                  10c. No. of children born alive but are now dead
                </span>
                <BoundBox bindingId="mother.childrenNowDead" token="{{mother.childrenNowDead}}">
                  <span data-print-value="true" className="font-helvetica font-bold text-[8pt] text-black block min-h-[11px] text-center leading-none">
                    {colb?.childrenNowDead || ''}
                  </span>
                </BoundBox>
              </div>

              {/* 11. OCCUPATION (5.8 cm) */}
              <div
                style={{ width: 'calc(100% * 5.8 / 18.2)' }}
                className="border-r border-[#348e38] px-1 py-0.5 flex flex-col justify-between shrink-0"
              >
                <span className="font-helvetica font-medium text-[7.5pt] uppercase leading-none text-black block">
                  11. OCCUPATION
                </span>
                <BoundBox bindingId="mother.occupation" token="{{mother.occupation}}">
                  <span data-print-value="true" className="font-helvetica font-bold truncate block text-[8pt] uppercase text-black min-h-[11px] leading-none">
                    {colb?.motherOccupation || ''}
                  </span>
                </BoundBox>
              </div>

              {/* 12. AGE at the time of this birth (completed years) (3.1 cm) */}
              <div
                className="px-1 py-0.5 flex flex-col justify-between flex-1 min-w-0"
              >
                <span className="font-helvetica font-medium text-[6pt] leading-none text-black block">
                  12. AGE at the time of this birth{' '}
                  <span className="font-normal text-[5pt] text-[#288330]">(completed years)</span>
                </span>
                <BoundBox bindingId="mother.ageAtBirth" token="{{mother.ageAtBirth}}">
                  <span data-print-value="true" className="font-helvetica font-bold text-[8pt] text-black block min-h-[11px] text-center leading-none">
                    {colb?.motherAgeAtBirth || ''}
                  </span>
                </BoundBox>
              </div>
            </div>

            {/* 13. RESIDENCE (includes Country) */}
            <div className="px-1.5 py-0.5 font-helvetica flex-1 flex flex-col justify-center">
              {/* Top Row: Field Number/Label and Green Guide Texts */}
              <div className="grid grid-cols-12 items-baseline leading-none">
                <div className="col-span-2 text-[8pt] font-medium text-black uppercase whitespace-nowrap">
                  13. RESIDENCE
                </div>
                <div className="col-span-10 grid grid-cols-5 text-center text-[7pt] text-[#288330]">
                  <span className="col-span-2 truncate">(House No., St., Barangay)</span>
                  <span className="truncate">(City/Municipality)</span>
                  <span className="truncate">(Province)</span>
                  <span className="truncate">(Country)</span>
                </div>
              </div>

              {/* Bottom Row: Actual Data Values Placed Below (Clean, no underlines) */}
              <div className="grid grid-cols-12 items-baseline mt-0.5">
                <div className="col-span-2"></div>
                <div className="col-span-10 grid grid-cols-5 gap-1 text-center">
                  <div className="col-span-2 min-w-0">
                    <BoundBox bindingId="mother.residenceStreet" token="{{mother.residenceStreet}}" className="px-1">
                      <p data-print-value="true" className="font-bold text-[8.5pt] uppercase text-black min-h-[14px] leading-tight truncate">
                        {(colb?.motherResidenceStreet || '').toUpperCase()}
                      </p>
                    </BoundBox>
                  </div>
                  <div className="min-w-0">
                    <BoundBox bindingId="mother.residenceCity" token="{{mother.residenceCity}}" className="px-1">
                      <p data-print-value="true" className="font-bold text-[8.5pt] uppercase text-black min-h-[14px] leading-tight truncate">
                        {colb?.motherResidenceCity || child.cityMunicipality || ''}
                      </p>
                    </BoundBox>
                  </div>
                  <div className="min-w-0">
                    <BoundBox bindingId="mother.residenceProvince" token="{{mother.residenceProvince}}" className="px-1">
                      <p data-print-value="true" className="font-bold text-[8.5pt] uppercase text-black min-h-[14px] leading-tight truncate">
                        {colb?.motherResidenceProvince || child.provinceState || ''}
                      </p>
                    </BoundBox>
                  </div>
                  <div className="min-w-0">
                    <BoundBox bindingId="mother.residenceCountry" token="{{mother.residenceCountry}}" className="px-1">
                      <p data-print-value="true" className="font-bold text-[8.5pt] uppercase text-black min-h-[14px] leading-tight truncate">
                        {colb?.motherResidenceCountry || child.country || ''}
                      </p>
                    </BoundBox>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ================================================================ */}
        {/* 5. 3 cm - FATHER SECTION (ITEMS 14 - 19) WITH LEFT VERTICAL STRIP */}
        {/* ================================================================ */}
        <div
          style={{ height: '3cm', minHeight: '3cm', maxHeight: '3cm' }}
          className="relative z-20 border-t border-b border-[#348e38] font-helvetica flex shrink-0"
        >
          {/* Left Vertical Strip: FATHER */}
          <div className="w-[0.45cm] border-r border-[#348e38] bg-white flex flex-col items-center justify-center py-0.5 select-none shrink-0">
            <div className="flex flex-col items-center justify-center font-helvetica font-bold text-[8.5pt] text-[#111111] space-y-0.5 leading-none">
              <span>F</span>
              <span>A</span>
              <span>T</span>
              <span>H</span>
              <span>E</span>
              <span>R</span>
            </div>
          </div>

          {/* Form Content: Items 14 - 19 */}
          <div className="flex-1 flex flex-col font-helvetica h-full">
            {/* 14. FATHER'S NAME */}
            <div className="border-b border-[#348e38] px-1.5 py-0.5 font-helvetica flex-1 flex flex-col justify-center">
              {/* Top Row: Field Number/Label and Green Guide Texts */}
              <div className="grid grid-cols-12 items-baseline leading-none">
                <div className="col-span-2 text-[8pt] font-medium text-black uppercase whitespace-nowrap">
                  14. NAME
                </div>
                <div className="col-span-10 grid grid-cols-3 text-center text-[7.5pt] text-[#288330]">
                  <span>(First)</span>
                  <span>(Middle)</span>
                  <span>(Last)</span>
                </div>
              </div>

              {/* Bottom Row: Actual Data Values Placed Below */}
              <div className="grid grid-cols-12 items-baseline mt-0.5">
                <div className="col-span-2"></div>
                <div className="col-span-10 grid grid-cols-3 text-center">
                  <BoundBox bindingId="father.firstName" token="{{father.firstName}}" className="px-1 min-w-0">
                    <p data-print-value="true" className="font-bold text-[9pt] uppercase text-black leading-tight min-h-[14px] truncate">{fatherFirst}</p>
                  </BoundBox>
                  <BoundBox bindingId="father.middleName" token="{{father.middleName}}" className="px-1 min-w-0">
                    <p data-print-value="true" className="font-bold text-[9pt] uppercase text-black leading-tight min-h-[14px] truncate">{fatherMiddle}</p>
                  </BoundBox>
                  <BoundBox bindingId="father.lastName" token="{{father.lastName}}" className="px-1 min-w-0">
                    <p data-print-value="true" className="font-bold text-[9pt] uppercase text-black leading-tight min-h-[14px] truncate">{fatherLast}</p>
                  </BoundBox>
                </div>
              </div>
            </div>

            {/* 15. CITIZENSHIP, 16. RELIGION, 17. OCCUPATION, 18. AGE */}
            {/* Sizing: 15 is 4.5 cm, 16 is 5.5 cm, 17 is 5 cm, 18 is remaining space */}
            <div className="flex border-b border-[#348e38] font-helvetica flex-1">
              {/* 15. CITIZENSHIP: 4.5 cm */}
              <div
                style={{ width: 'calc(100% * 4.5 / 24.2)', minWidth: '105px' }}
                className="border-r border-[#348e38] px-1 py-0.5 flex flex-col justify-between shrink-0 overflow-hidden"
              >
                <span className="font-helvetica font-medium text-[7.5pt] uppercase text-black leading-none block">
                  15. CITIZENSHIP
                </span>
                <BoundBox bindingId="father.citizenship" token="{{father.citizenship}}">
                  <p data-print-value="true" className="font-helvetica font-bold text-[8.5pt] uppercase text-black min-h-[12px] leading-tight truncate">
                    {colb?.fatherCitizenship ?? father.nationality ?? ''}
                  </p>
                </BoundBox>
              </div>

              {/* 16. RELIGION/RELIGIOUS SECT: 5.5 cm */}
              <div
                style={{ width: 'calc(100% * 5.5 / 24.2)', minWidth: '130px' }}
                className="border-r border-[#348e38] px-1 py-0.5 flex flex-col justify-between shrink-0 overflow-hidden"
              >
                <span className="font-helvetica font-medium text-[7.5pt] uppercase text-black whitespace-nowrap leading-none block">
                  16. RELIGION/RELIGIOUS SECT
                </span>
                <BoundBox bindingId="father.religion" token="{{father.religion}}">
                  <p data-print-value="true" className="font-helvetica font-bold text-[8.5pt] uppercase text-black min-h-[12px] leading-tight truncate">
                    {colb?.fatherReligion ?? ''}
                  </p>
                </BoundBox>
              </div>

              {/* 17. OCCUPATION: 5.0 cm */}
              <div
                style={{ width: 'calc(100% * 5.0 / 24.2)', minWidth: '115px' }}
                className="border-r border-[#348e38] px-1 py-0.5 flex flex-col justify-between shrink-0 overflow-hidden"
              >
                <span className="font-helvetica font-medium text-[7.5pt] uppercase text-black leading-none block">
                  17. OCCUPATION
                </span>
                <BoundBox bindingId="father.occupation" token="{{father.occupation}}">
                  <p data-print-value="true" className="font-helvetica font-bold text-[8.5pt] uppercase truncate text-black min-h-[12px] leading-tight">
                    {colb?.fatherOccupation ?? ''}
                  </p>
                </BoundBox>
              </div>

              {/* 18. AGE: Remaining space */}
              <div className="flex-1 px-1 py-0.5 flex flex-col justify-between min-w-0 overflow-hidden">
                <span className="font-helvetica font-medium text-[7pt] text-black leading-none block">
                  18. AGE at the time of this birth <span className="font-normal text-[6.5pt] text-[#288330]">(completed years)</span>
                </span>
                <BoundBox bindingId="father.ageAtBirth" token="{{father.ageAtBirth}}">
                  <p data-print-value="true" className="font-helvetica font-bold text-[8.5pt] text-black min-h-[12px] leading-tight truncate">
                    {colb?.fatherAgeAtBirth ?? ''}
                  </p>
                </BoundBox>
              </div>
            </div>

            {/* 19. FATHER RESIDENCE (includes Country) */}
            <div className="px-1.5 py-0.5 font-helvetica flex-1 flex flex-col justify-center">
              {/* Top Row: Field Number/Label and Green Guide Texts */}
              <div className="grid grid-cols-12 items-baseline leading-none">
                <div className="col-span-2 text-[8pt] font-medium text-black uppercase whitespace-nowrap">
                  19. RESIDENCE
                </div>
                <div className="col-span-10 grid grid-cols-5 text-center text-[7pt] text-[#288330]">
                  <span className="col-span-2 truncate">(House No., St., Barangay)</span>
                  <span className="truncate">(City/Municipality)</span>
                  <span className="truncate">(Province)</span>
                  <span className="truncate">(Country)</span>
                </div>
              </div>

              {/* Bottom Row: Actual Data Values Placed Below (Clean, no underlines) */}
              <div className="grid grid-cols-12 items-baseline mt-0.5">
                <div className="col-span-2"></div>
                <div className="col-span-10 grid grid-cols-5 gap-1 text-center">
                  <div className="col-span-2 min-w-0">
                    <BoundBox bindingId="father.residenceStreet" token="{{father.residenceStreet}}" className="px-1">
                      <p data-print-value="true" className="font-bold text-[8.5pt] uppercase text-black min-h-[14px] leading-tight truncate">
                        {(colb?.fatherResidenceStreet || colb?.motherResidenceStreet || '').toUpperCase()}
                      </p>
                    </BoundBox>
                  </div>
                  <div className="min-w-0">
                    <BoundBox bindingId="father.residenceCity" token="{{father.residenceCity}}" className="px-1">
                      <p data-print-value="true" className="font-bold text-[8.5pt] uppercase text-black min-h-[14px] leading-tight truncate">
                        {colb?.fatherResidenceCity || colb?.motherResidenceCity || child.cityMunicipality || ''}
                      </p>
                    </BoundBox>
                  </div>
                  <div className="min-w-0">
                    <BoundBox bindingId="father.residenceProvince" token="{{father.residenceProvince}}" className="px-1">
                      <p data-print-value="true" className="font-bold text-[8.5pt] uppercase text-black min-h-[14px] leading-tight truncate">
                        {colb?.fatherResidenceProvince || colb?.motherResidenceProvince || child.provinceState || ''}
                      </p>
                    </BoundBox>
                  </div>
                  <div className="min-w-0">
                    <BoundBox bindingId="father.residenceCountry" token="{{father.residenceCountry}}" className="px-1">
                      <p data-print-value="true" className="font-bold text-[8.5pt] uppercase text-black min-h-[14px] leading-tight truncate">
                        {colb?.fatherResidenceCountry || colb?.motherResidenceCountry || child.country || ''}
                      </p>
                    </BoundBox>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ================================================================ */}
        {/* LOWER SECTION: ITEMS 20 - 25, REMARKS & LCRO BOXES */}
        {/* ================================================================ */}
        <div className="relative z-20 font-helvetica flex flex-col">
          {/* 6. 0.5 cm - MARRIAGE OF PARENTS DESCRIPTION */}
          <div
            style={{ height: '0.5cm', minHeight: '0.5cm', maxHeight: '0.5cm' }}
            className="border-b border-[#348e38] px-1.5 flex items-center shrink-0"
          >
            <span className="font-helvetica font-medium text-[8pt] uppercase text-black leading-none">
              MARRIAGE OF PARENTS{' '}
              <span className="font-normal normal-case text-[7.5pt] text-black">
                (If not married, accomplish Affidavit of Acknowledgment/Admission of Paternity at the back.)
              </span>
            </span>
          </div>

          {/* 7. 5 cm - 20a TO 21b (21b bottom border has +1 weight) */}
          <div
            style={{ height: '5cm', minHeight: '5cm', maxHeight: '5cm' }}
            className="border-b-2 border-[#348e38] flex flex-col shrink-0"
          >
            {/* 20a. DATE & 20b. PLACE */}
            {(() => {
              const isNotMarried = Boolean(colb?.parentsMarried === false || colb?.parentsMarriageDatePlace?.toUpperCase().includes('NOT MARRIED'));
              let mMonth = (colb?.parentsMarriageDateMonth || '').toUpperCase();
              let mDay = (colb?.parentsMarriageDateDay || '').toUpperCase();
              let mYear = (colb?.parentsMarriageDateYear || '').toUpperCase();

              if (!mMonth && !mDay && !mYear && colb?.parentsMarriageDatePlace && !isNotMarried) {
                const rawCombined = colb.parentsMarriageDatePlace.trim();
                const atIdx = rawCombined.toLowerCase().indexOf(' at ');
                const dashIdx = rawCombined.indexOf(' - ');
                const datePart =
                  atIdx >= 0
                    ? rawCombined.slice(0, atIdx).trim()
                    : dashIdx >= 0
                    ? rawCombined.slice(0, dashIdx).trim()
                    : rawCombined.split('-')[0]?.trim();
                if (datePart) {
                  const parsed = parseIsoDateToColbParts(datePart);
                  if (parsed) {
                    mMonth = parsed.monthName;
                    mDay = parsed.dayPadded;
                    mYear = parsed.year;
                  } else {
                    const commaSplit = datePart.split(',');
                    if (commaSplit.length > 1) {
                      const md = commaSplit[0].trim().split(' ');
                      mMonth = (md[0] || '').toUpperCase();
                      mDay = (md[1] || '').toUpperCase();
                      mYear = commaSplit[1].trim().toUpperCase();
                    } else {
                      mMonth = datePart.toUpperCase();
                    }
                  }
                }
              }

              const freeText20a =
                !isNotMarried &&
                !mDay.trim() &&
                !mYear.trim() &&
                Boolean(mMonth.trim()) &&
                !/^(JANUARY|FEBRUARY|MARCH|APRIL|MAY|JUNE|JULY|AUGUST|SEPTEMBER|OCTOBER|NOVEMBER|DECEMBER)$/i.test(
                  mMonth.trim()
                )
                  ? mMonth.trim().toUpperCase()
                  : '';

              let pCity = colb?.parentsMarriagePlaceCity || '';
              let pProvince = colb?.parentsMarriagePlaceProvince || '';
              let pCountry = colb?.parentsMarriagePlaceCountry || '';

              if (!pCity && !pProvince && colb?.parentsMarriageDatePlace && !isNotMarried) {
                const rawCombined = colb.parentsMarriageDatePlace.trim();
                const atIdx = rawCombined.toLowerCase().indexOf(' at ');
                const dashIdx = rawCombined.indexOf(' - ');
                const placePart =
                  atIdx >= 0
                    ? rawCombined.slice(atIdx + 4).trim()
                    : dashIdx >= 0
                    ? rawCombined.slice(dashIdx + 3).trim()
                    : rawCombined.split('-')[1]?.trim();
                if (placePart) {
                  const locs = placePart.split(',').map((s) => s.trim());
                  if (locs.length >= 3) {
                    pCity = locs[0];
                    pProvince = locs[1];
                    pCountry = locs[2];
                  } else if (locs.length === 2) {
                    pCity = locs[0];
                    pProvince = locs[1];
                    pCountry = 'PHILIPPINES';
                  } else {
                    pCity = locs[0];
                    pCountry = 'PHILIPPINES';
                  }
                }
              }

              return (
                <div className="border-b border-[#348e38] flex font-helvetica">
                  {/* 20a: DATE and inside parenthesis in one line */}
                  <div className="w-[40%] p-1 pr-1.5 border-r border-[#348e38]">
                    {/* Top Row: 20a. DATE and (Month) (Day) (Year) in one line */}
                    <div className="flex items-baseline leading-none">
                      <span className="font-helvetica text-[8pt] font-medium text-black whitespace-nowrap">
                        20a. <span className="uppercase">DATE</span>
                      </span>
                      <div className="flex-1 grid grid-cols-3 text-center text-[7pt] text-[#288330] font-normal pl-1">
                        <span>(Month)</span>
                        <span>(Day)</span>
                        <span>(Year)</span>
                      </div>
                    </div>

                    {/* Bottom Row: Values aligned directly beneath */}
                    <div className="flex items-baseline mt-0.5">
                      <span className="text-[8pt] invisible whitespace-nowrap select-none pointer-events-none">
                        20a. <span className="uppercase">DATE</span>
                      </span>
                      <div className="flex-1 grid grid-cols-3 text-center pl-1">
                        {freeText20a ? (
                          <div className="col-span-3">
                            <BoundBox bindingId="parents.marriageDateMonth" token="{{parents.marriageDateMonth}}">
                              <p data-print-value="true" className="font-helvetica font-bold text-[8.5pt] uppercase truncate text-black min-h-[14px] leading-tight">
                                {blankMode ? '' : freeText20a}
                              </p>
                            </BoundBox>
                          </div>
                        ) : (
                          <>
                            <div>
                              <BoundBox bindingId="parents.marriageDateMonth" token="{{parents.marriageDateMonth}}">
                                <p data-print-value="true" className="font-helvetica font-bold text-[8.5pt] uppercase truncate text-black min-h-[14px] leading-tight">
                                  {blankMode ? '' : (isNotMarried ? 'NOT' : mMonth)}
                                </p>
                              </BoundBox>
                            </div>
                            <div>
                              <BoundBox bindingId="parents.marriageDateDay" token="{{parents.marriageDateDay}}">
                                <p data-print-value="true" className="font-helvetica font-bold text-[8.5pt] uppercase truncate text-black min-h-[14px] leading-tight">
                                  {blankMode ? '' : (isNotMarried ? 'MARRIED' : mDay)}
                                </p>
                              </BoundBox>
                            </div>
                            <div>
                              <BoundBox bindingId="parents.marriageDateYear" token="{{parents.marriageDateYear}}">
                                <p data-print-value="true" className="font-helvetica font-bold text-[8.5pt] uppercase truncate text-black min-h-[14px] leading-tight">
                                  {blankMode ? '' : (isNotMarried ? '' : mYear)}
                                </p>
                              </BoundBox>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 20b: PLACE and inside parenthesis in one line */}
                  <div className="flex-1 p-1 pl-2">
                    {/* Top Row: 20b. PLACE and (City/Municipality) (Province) (Country) in one line */}
                    <div className="flex items-baseline leading-none">
                      <span className="font-helvetica text-[8pt] font-medium text-black whitespace-nowrap">
                        20b. <span className="uppercase">PLACE</span>
                      </span>
                      <div className="flex-1 grid grid-cols-3 text-center text-[7pt] text-[#288330] font-normal pl-1">
                        <span className="truncate">(City/Municipality)</span>
                        <span className="truncate">(Province)</span>
                        <span className="truncate">(Country)</span>
                      </div>
                    </div>

                    {/* Bottom Row: Values aligned directly beneath */}
                    <div className="flex items-baseline mt-0.5">
                      <span className="text-[8pt] invisible whitespace-nowrap select-none pointer-events-none">
                        20b. <span className="uppercase">PLACE</span>
                      </span>
                      <div className="flex-1 grid grid-cols-3 text-center pl-1 gap-1">
                        <div className="min-w-0">
                          <BoundBox bindingId="parents.marriagePlaceCity" token="{{parents.marriagePlaceCity}}">
                            <p data-print-value="true" className="font-helvetica font-bold text-[8.5pt] uppercase truncate text-black min-h-[14px] leading-tight">
                              {blankMode ? '' : (isNotMarried ? 'N/A' : pCity)}
                            </p>
                          </BoundBox>
                        </div>
                        <div className="min-w-0">
                          <BoundBox bindingId="parents.marriagePlaceProvince" token="{{parents.marriagePlaceProvince}}">
                            <p data-print-value="true" className="font-helvetica font-bold text-[8.5pt] uppercase truncate text-black min-h-[14px] leading-tight">
                              {blankMode ? '' : (isNotMarried ? 'N/A' : pProvince)}
                            </p>
                          </BoundBox>
                        </div>
                        <div className="min-w-0">
                          <BoundBox bindingId="parents.marriagePlaceCountry" token="{{parents.marriagePlaceCountry}}">
                            <p data-print-value="true" className="font-helvetica font-bold text-[8.5pt] uppercase truncate text-black min-h-[14px] leading-tight">
                              {blankMode ? '' : (isNotMarried ? 'N/A' : pCountry)}
                            </p>
                          </BoundBox>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* 21a. ATTENDANT */}
            <div className="px-1.5 py-1 border-b border-[#348e38] font-helvetica">
              <span className="font-helvetica font-medium text-[8pt] text-black block leading-tight">
                21a. <span className="uppercase">ATTENDANT</span>
              </span>
              <div className="flex flex-nowrap items-baseline gap-[0.1cm] font-helvetica pt-0.5 whitespace-nowrap overflow-hidden justify-between text-[7pt] sm:text-[7.5pt]">
                {/* 1 Physician */}
                <div className="flex items-baseline gap-[0.1cm] shrink-0">
                  <span className="border-b border-[#348e38] w-4 sm:w-5 inline-block text-center font-bold text-black text-[7.5pt] leading-none pb-0.5">
                    {!blankMode && (colb?.attendantType === '1' || additional.attendantAtBirth?.toLowerCase().includes('physician')) ? (
                      <span data-print-value="true">✓</span>
                    ) : ''}
                  </span>
                  <span className="text-black font-medium">1 Physician</span>
                </div>
                {/* 2 Nurse */}
                <div className="flex items-baseline gap-[0.1cm] shrink-0">
                  <span className="border-b border-[#348e38] w-4 sm:w-5 inline-block text-center font-bold text-black text-[7.5pt] leading-none pb-0.5">
                    {!blankMode && colb?.attendantType === '2' ? (
                      <span data-print-value="true">✓</span>
                    ) : ''}
                  </span>
                  <span className="text-black font-medium">2 Nurse</span>
                </div>
                {/* 3 Midwife */}
                <div className="flex items-baseline gap-[0.1cm] shrink-0">
                  <span className="border-b border-[#348e38] w-4 sm:w-5 inline-block text-center font-bold text-black text-[7.5pt] leading-none pb-0.5">
                    {!blankMode && (colb?.attendantType === '3' || additional.attendantAtBirth?.toLowerCase().includes('midwife')) ? (
                      <span data-print-value="true">✓</span>
                    ) : ''}
                  </span>
                  <span className="text-black font-medium">3 Midwife</span>
                </div>
                {/* 4 Hilot */}
                <div className="flex items-baseline gap-[0.1cm] shrink-0">
                  <span className="border-b border-[#348e38] w-4 sm:w-5 inline-block text-center font-bold text-black text-[7.5pt] leading-none pb-0.5">
                    {!blankMode && colb?.attendantType === '4' ? (
                      <span data-print-value="true">✓</span>
                    ) : ''}
                  </span>
                  <span className="text-black font-medium">4 Hilot (Traditional Birth Attendant)</span>
                </div>
                {/* 5 Others */}
                <div className="flex items-baseline gap-[0.1cm] shrink-0">
                  <span className="border-b border-[#348e38] w-4 sm:w-5 inline-block text-center font-bold text-black text-[7.5pt] leading-none pb-0.5">
                    {!blankMode && colb?.attendantType === '5' ? (
                      <span data-print-value="true">✓</span>
                    ) : ''}
                  </span>
                  <span className="text-black font-medium">5 Others (Specify)</span>
                  <BoundBox bindingId="attendant.otherSpecify" token="{{attendant.otherSpecify}}" className="inline-block" as="span">
                    <span className="border-b border-[#348e38] min-w-[35px] sm:min-w-[45px] inline-block text-center font-bold uppercase text-black text-[7.5pt] leading-none px-1 pb-0.5">
                      {!blankMode && colb?.attendantType === '5' && colb?.attendantOtherSpecify ? (
                        <span data-print-value="true">{colb.attendantOtherSpecify.toUpperCase()}</span>
                      ) : ''}
                    </span>
                  </BoundBox>
                </div>
              </div>
            </div>

            {/* 21b. CERTIFICATION OF ATTENDANT */}
            <div className="flex-1 px-1.5 py-1 font-helvetica flex flex-col justify-between">
              <div>
                <span className="font-helvetica font-medium text-[8pt] block text-black leading-tight">
                  21b. <span className="uppercase">CERTIFICATION OF ATTENDANT AT BIRTH</span>{' '}
                  <span className="font-normal normal-case text-[7.5pt] text-[#288330]">
                    (Physician, Nurse, Midwife, Traditional Birth Attendant/Hilot, etc.)
                  </span>
                </span>
                <div className="text-[7.5pt] leading-tight text-black pt-0.5">
                  I hereby certify that I attended the birth of the child who was born alive at{' '}
                  <BoundBox bindingId="attendant.time" token="{{attendant.time}}" className="inline-block" as="span">
                    <span className="font-helvetica font-bold underline px-1 text-black">
                      {!blankMode && (colb?.attendantTime || child.timeOfBirth) ? (
                        <span data-print-value="true">
                          {(() => {
                            const raw = (colb?.attendantTime || child.timeOfBirth || '').trim();
                            if (!raw) return '';
                            if (/\b(am|pm)\b/i.test(raw)) return raw.toUpperCase();
                            return colb?.attendantTimeAmPm
                              ? `${raw} ${colb.attendantTimeAmPm.toUpperCase()}`
                              : raw;
                          })()}
                        </span>
                      ) : (
                        '__________'
                      )}
                    </span>
                  </BoundBox>{' '}
                  am/pm on the date of birth specified above.
                </div>
              </div>

              {/* Attendant Signatures Grid with border separation */}
              <div className="grid grid-cols-12 gap-2 pt-0.5 border-t border-[#348e38]/40 font-helvetica">
                {/* Left 7 cols: Signature, Name in Print, Title or Position */}
                <div className="col-span-7 space-y-0.5 min-w-0 border-r border-[#348e38]/50 pr-2">
                  <div className="flex items-baseline gap-1">
                    <span className="text-[7.5pt] text-[#222222] whitespace-nowrap">Signature</span>
                    <span data-print-value="true" className="flex-1 min-w-0 border-b border-[#348e38] font-bold text-[8.5pt] uppercase text-black px-1 min-h-[12px] truncate">
                      {blankMode ? '' : (colb?.attendantSignatureName || '').toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-[7.5pt] text-[#222222] whitespace-nowrap">Name in Print</span>
                    <BoundBox bindingId="attendant.signatureName" token="{{attendant.signatureName}}" className="flex-1 min-w-0">
                      <span data-print-value="true" className="block border-b border-[#348e38] font-bold text-[8.5pt] text-black uppercase px-1 min-h-[12px] truncate">
                        {(colb?.attendantSignatureName || '').toUpperCase()}
                      </span>
                    </BoundBox>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-[7.5pt] text-[#222222] whitespace-nowrap">Title or Position</span>
                    <BoundBox bindingId="attendant.titlePosition" token="{{attendant.titlePosition}}" className="flex-1 min-w-0">
                      <span data-print-value="true" className="block border-b border-[#348e38] text-[8pt] uppercase text-black px-1 min-h-[12px] truncate">
                        {(colb?.attendantTitlePosition || '').toUpperCase()}
                      </span>
                    </BoundBox>
                  </div>
                </div>

                {/* Right 5 cols: Address, Date */}
                <div className="col-span-5 space-y-0.5 min-w-0">
                  <div className="flex items-baseline gap-1">
                    <span className="text-[7.5pt] text-[#222222] whitespace-nowrap">Address</span>
                    <BoundBox bindingId="attendant.address" token="{{attendant.address}}" className="flex-1 min-w-0">
                      <span data-print-value="true" className="block border-b border-[#348e38] text-[8pt] uppercase text-black px-1 min-h-[12px] truncate">
                        {(colb?.attendantAddress || '').toUpperCase()}
                      </span>
                    </BoundBox>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-[7.5pt] text-[#222222] whitespace-nowrap">Date</span>
                    <BoundBox bindingId="attendant.date" token="{{attendant.date}}" className="flex-1 min-w-0">
                      <span data-print-value="true" className="block border-b border-[#348e38] text-[8pt] uppercase text-black px-1 min-h-[12px] truncate">
                        {formatDateMMMMCommaDDYYYY(colb?.attendantDate)}
                      </span>
                    </BoundBox>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 8. 4 cm - 22. CERTIFICATION OF INFORMANT & 23. PREPARED BY (Parallel Signature lines) */}
          <div
            style={{ height: '4cm', minHeight: '4cm', maxHeight: '4cm' }}
            className="grid grid-cols-2 border-b border-[#348e38] px-1.5 py-0.5 gap-2 font-helvetica shrink-0 overflow-hidden"
          >
            {/* 22. INFORMANT */}
            <div className="border-r border-[#348e38] pr-2 flex flex-col min-w-0">
              <div className="h-[38px] shrink-0">
                <span className="font-helvetica font-medium text-[8pt] uppercase block text-black leading-tight">
                  22. CERTIFICATION OF INFORMANT
                </span>
                <p className="text-[6.5pt] leading-tight text-black">
                  I hereby certify that all information supplied are true and correct to my own knowledge and belief.
                </p>
              </div>
              <div className="space-y-0.5 font-helvetica pt-0.5 border-t border-[#348e38]/35">
                <div className="flex items-baseline gap-1">
                  <span className="text-[7.5pt] text-[#222222] whitespace-nowrap">Signature</span>
                  <span data-print-value="true" className="flex-1 min-w-0 border-b border-[#348e38] font-bold text-[8.5pt] uppercase text-black px-1 min-h-[13px] truncate">
                    {blankMode ? '' : (colb?.informantSignatureName || father.fullName || '').toUpperCase()}
                  </span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-[7.5pt] text-[#222222] whitespace-nowrap">Name in Print</span>
                  <BoundBox bindingId="informant.signatureName" token="{{informant.signatureName}}" className="flex-1 min-w-0">
                    <span data-print-value="true" className="block border-b border-[#348e38] font-bold text-[8.5pt] text-black uppercase px-1 min-h-[13px] truncate">
                      {(colb?.informantSignatureName || father.fullName || '').toUpperCase()}
                    </span>
                  </BoundBox>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-[7.5pt] text-[#222222] whitespace-nowrap">Relationship to the Child</span>
                  <BoundBox bindingId="informant.relationship" token="{{informant.relationship}}" className="flex-1 min-w-0">
                    <span data-print-value="true" className="block border-b border-[#348e38] text-[8pt] uppercase text-black px-1 min-h-[13px] truncate">
                      {(colb?.informantRelationship || '').toUpperCase()}
                    </span>
                  </BoundBox>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-[7.5pt] text-[#222222] whitespace-nowrap">Address</span>
                  <BoundBox bindingId="informant.address" token="{{informant.address}}" className="flex-1 min-w-0">
                    <span data-print-value="true" className="block border-b border-[#348e38] text-[8pt] uppercase text-black px-1 min-h-[13px] truncate">
                      {(colb?.informantAddress || colb?.motherResidenceStreet || '').toUpperCase()}
                    </span>
                  </BoundBox>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-[7.5pt] text-[#222222] whitespace-nowrap">Date</span>
                  <BoundBox bindingId="informant.date" token="{{informant.date}}" className="flex-1 min-w-0">
                    <span data-print-value="true" className="block border-b border-[#348e38] text-[8pt] uppercase text-black px-1 min-h-[13px] truncate">
                      {formatDateMMMMCommaDDYYYY(colb?.informantDate)}
                    </span>
                  </BoundBox>
                </div>
              </div>
            </div>

            {/* 23. PREPARED BY */}
            <div className="pl-1 font-helvetica flex flex-col min-w-0">
              <div className="h-[38px] shrink-0">
                <span className="font-helvetica font-medium text-[8pt] uppercase block text-black leading-tight">23. PREPARED BY</span>
              </div>
              <div className="space-y-0.5 font-helvetica pt-0.5 border-t border-[#348e38]/35">
                <div className="flex items-baseline gap-1">
                  <span className="text-[7.5pt] text-[#222222] whitespace-nowrap">Signature</span>
                  <span data-print-value="true" className="flex-1 min-w-0 border-b border-[#348e38] font-bold text-[8.5pt] uppercase text-black px-1 min-h-[13px] truncate">
                    {blankMode ? '' : (colb?.preparedByName || '').toUpperCase()}
                  </span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-[7.5pt] text-[#222222] whitespace-nowrap">Name in Print</span>
                  <BoundBox bindingId="registry.preparedByName" token="{{registry.preparedByName}}" className="flex-1 min-w-0">
                    <span data-print-value="true" className="block border-b border-[#348e38] font-bold text-[8.5pt] text-black uppercase px-1 min-h-[13px] truncate">
                      {(colb?.preparedByName || '').toUpperCase()}
                    </span>
                  </BoundBox>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-[7.5pt] text-[#222222] whitespace-nowrap">Title or Position</span>
                  <BoundBox bindingId="registry.preparedByTitle" token="{{registry.preparedByTitle}}" className="flex-1 min-w-0">
                    <span data-print-value="true" className="block border-b border-[#348e38] text-[8pt] uppercase text-black px-1 min-h-[13px] truncate">
                      {(colb?.preparedByTitle || '').toUpperCase()}
                    </span>
                  </BoundBox>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-[7.5pt] text-[#222222] whitespace-nowrap">Date</span>
                  <span data-print-value="true" className="flex-1 min-w-0 border-b border-[#348e38] text-[8pt] uppercase text-black px-1 min-h-[13px] truncate">
                    {formatDateMMMMCommaDDYYYY(colb?.preparedByDate)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 9. 3 cm - 24. RECEIVED BY & 25. REGISTERED AT CIVIL REGISTRAR */}
          <div
            style={{ height: '3cm', minHeight: '3cm', maxHeight: '3cm' }}
            className="grid grid-cols-2 border-b border-[#348e38] px-1.5 py-1 gap-2 font-helvetica shrink-0 overflow-hidden"
          >
            {/* 24. RECEIVED BY */}
            <div className="border-r border-[#348e38] pr-2 flex flex-col justify-between min-w-0">
              <span className="font-helvetica font-medium text-[8pt] uppercase block text-black">24. RECEIVED BY</span>
              <div className="space-y-0.5 font-helvetica border-t border-[#348e38]/35 pt-0.5">
                <div className="flex items-baseline gap-1">
                  <span className="text-[7.5pt] text-[#222222] whitespace-nowrap">Signature</span>
                  <span data-print-value="true" className="flex-1 min-w-0 border-b border-[#348e38] font-bold text-[8.5pt] uppercase text-black px-1 min-h-[12px] truncate">
                    {blankMode ? '' : (colb?.receivedByName || '').toUpperCase()}
                  </span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-[7.5pt] text-[#222222] whitespace-nowrap">Name in Print</span>
                  <BoundBox bindingId="registry.receivedByName" token="{{registry.receivedByName}}" className="flex-1 min-w-0">
                    <span data-print-value="true" className="block border-b border-[#348e38] font-bold text-[8.5pt] text-black uppercase px-1 min-h-[12px] truncate">
                      {(colb?.receivedByName || '').toUpperCase()}
                    </span>
                  </BoundBox>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-[7.5pt] text-[#222222] whitespace-nowrap">Title or Position</span>
                  <BoundBox bindingId="registry.receivedByTitle" token="{{registry.receivedByTitle}}" className="flex-1 min-w-0">
                    <span data-print-value="true" className="block border-b border-[#348e38] text-[8pt] uppercase text-black px-1 min-h-[12px] truncate">
                      {(colb?.receivedByTitle || '').toUpperCase()}
                    </span>
                  </BoundBox>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-[7.5pt] text-[#222222] whitespace-nowrap">Date</span>
                  <BoundBox bindingId="registry.receivedByDate" token="{{registry.receivedByDate}}" className="flex-1 min-w-0">
                    <span data-print-value="true" className="block border-b border-[#348e38] text-[8pt] uppercase text-black px-1 min-h-[12px] truncate">
                      {formatDateMMMMCommaDDYYYY(colb?.receivedByDate)}
                    </span>
                  </BoundBox>
                </div>
              </div>
            </div>

            {/* 25. REGISTERED AT CIVIL REGISTRAR */}
            <div className="pl-1 font-helvetica flex flex-col justify-between min-w-0">
              <span className="font-helvetica font-medium text-[8pt] uppercase block text-black truncate">
                25. REGISTERED AT THE OFFICE OF THE CIVIL REGISTRAR
              </span>
              <div className="space-y-0.5 font-helvetica border-t border-[#348e38]/35 pt-0.5">
                <div className="flex items-baseline gap-1">
                  <span className="text-[7.5pt] text-[#222222] whitespace-nowrap">Signature</span>
                  <span data-print-value="true" className="flex-1 min-w-0 border-b border-[#348e38] font-bold text-[8.5pt] uppercase text-black px-1 min-h-[12px] truncate">
                    {blankMode ? '' : (colb?.registeredByName || colb?.receivedByName || '').toUpperCase()}
                  </span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-[7.5pt] text-[#222222] whitespace-nowrap">Name in Print</span>
                  <BoundBox bindingId="registry.registeredByName" token="{{registry.registeredByName}}" className="flex-1 min-w-0">
                    <span data-print-value="true" className="block border-b border-[#348e38] font-bold text-[8.5pt] text-black uppercase px-1 min-h-[12px] truncate">
                      {(colb?.registeredByName || colb?.receivedByName || '').toUpperCase()}
                    </span>
                  </BoundBox>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-[7.5pt] text-[#222222] whitespace-nowrap">Title or Position</span>
                  <BoundBox bindingId="registry.registeredByTitle" token="{{registry.registeredByTitle}}" className="flex-1 min-w-0">
                    <span data-print-value="true" className="block border-b border-[#348e38] text-[8pt] uppercase text-black px-1 min-h-[12px] truncate">
                      {(colb?.registeredByTitle || '').toUpperCase()}
                    </span>
                  </BoundBox>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-[7.5pt] text-[#222222] whitespace-nowrap">Date</span>
                  <BoundBox bindingId="registry.registeredByDate" token="{{registry.registeredByDate}}" className="flex-1 min-w-0">
                    <span data-print-value="true" className="block border-b border-[#348e38] text-[8pt] uppercase text-black px-1 min-h-[12px] truncate">
                      {formatDateMMMMCommaDDYYYY(colb?.registeredByDate)}
                    </span>
                  </BoundBox>
                </div>
              </div>
            </div>
          </div>

          {/* 10. 2.8 cm - REMARKS / ANNOTATIONS (bottom border has +1 weight) */}
          <div
            style={{ height: '2.8cm', minHeight: '2.8cm', maxHeight: '2.8cm' }}
            className="border-b-2 border-[#348e38] px-1.5 py-1 font-helvetica flex flex-col justify-between shrink-0 overflow-hidden"
          >
            <span className="font-helvetica font-bold text-[8pt] uppercase block text-black">
              REMARKS/ANNOTATIONS <span className="font-normal normal-case text-[7.5pt] text-[#288330]">(For LCRO/OCRG Use Only)</span>
            </span>
            <BoundBox bindingId="header.remarks" token="{{colb.remarksAnnotation}}" fallbackUnderline={false} className="flex-1 min-h-0 overflow-hidden">
              <p data-print-value="true" className="font-helvetica text-[7.5pt] uppercase text-slate-800 italic pt-0.5 leading-tight line-clamp-4">
                {(colb?.remarksAnnotation || '').toUpperCase()}
              </p>
            </BoundBox>
          </div>

          {/* 11. 1.5 cm - TO BE FILLED-UP AT THE OFFICE OF THE CIVIL REGISTRAR */}
          {/* Spaces for To be filled-up boxes: 0.1 cm | Box length (height): 0.5 cm */}
          {/* Box counts: 8 (2), 9 (2), 11 (3), 13 (8), 15 (2), 16 (2), 17 (3), 19 (8) */}
          <div
            style={{ height: '1.5cm', minHeight: '1.5cm', maxHeight: '1.5cm' }}
            className="px-1.5 py-1 font-helvetica flex flex-col justify-between shrink-0"
          >
            <span className="font-helvetica font-bold text-[6.5pt] text-black uppercase leading-none block">
              TO BE FILLED-UP AT THE OFFICE OF THE CIVIL REGISTRAR
            </span>
            <div className="flex items-end gap-[0.1cm] w-full">
              {/* 8 - 2 boxes */}
              <div className="flex flex-col items-center flex-[2] min-w-0">
                <span className="text-[6pt] font-helvetica font-bold text-black leading-none mb-0.5">8</span>
                <div style={{ height: '0.5cm' }} className="grid grid-cols-2 w-full border border-dotted border-black bg-white">
                  <div className="bg-white border-r border-dotted border-black"></div>
                  <div className="bg-white"></div>
                </div>
              </div>

              {/* 9 - 2 boxes */}
              <div className="flex flex-col items-center flex-[2] min-w-0">
                <span className="text-[6pt] font-helvetica font-bold text-black leading-none mb-0.5">9</span>
                <div style={{ height: '0.5cm' }} className="grid grid-cols-2 w-full border border-dotted border-black bg-white">
                  <div className="bg-white border-r border-dotted border-black"></div>
                  <div className="bg-white"></div>
                </div>
              </div>

              {/* 11 - 3 boxes */}
              <div className="flex flex-col items-center flex-[3] min-w-0">
                <span className="text-[6pt] font-helvetica font-bold text-black leading-none mb-0.5">11</span>
                <div style={{ height: '0.5cm' }} className="grid grid-cols-3 w-full border border-dotted border-black bg-white">
                  <div className="bg-white border-r border-dotted border-black"></div>
                  <div className="bg-white border-r border-dotted border-black"></div>
                  <div className="bg-white"></div>
                </div>
              </div>

              {/* 13 - 8 boxes */}
              <div className="flex flex-col items-center flex-[8] min-w-0">
                <span className="text-[6pt] font-helvetica font-bold text-black leading-none mb-0.5">13</span>
                <div style={{ height: '0.5cm' }} className="grid grid-cols-8 w-full border border-dotted border-black bg-white">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className={`bg-white ${i < 7 ? 'border-r border-dotted border-black' : ''}`}></div>
                  ))}
                </div>
              </div>

              {/* 15 - 2 boxes */}
              <div className="flex flex-col items-center flex-[2] min-w-0">
                <span className="text-[6pt] font-helvetica font-bold text-black leading-none mb-0.5">15</span>
                <div style={{ height: '0.5cm' }} className="grid grid-cols-2 w-full border border-dotted border-black bg-white">
                  <div className="bg-white border-r border-dotted border-black"></div>
                  <div className="bg-white"></div>
                </div>
              </div>

              {/* 16 - 2 boxes */}
              <div className="flex flex-col items-center flex-[2] min-w-0">
                <span className="text-[6pt] font-helvetica font-bold text-black leading-none mb-0.5">16</span>
                <div style={{ height: '0.5cm' }} className="grid grid-cols-2 w-full border border-dotted border-black bg-white">
                  <div className="bg-white border-r border-dotted border-black"></div>
                  <div className="bg-white"></div>
                </div>
              </div>

              {/* 17 - 3 boxes */}
              <div className="flex flex-col items-center flex-[3] min-w-0">
                <span className="text-[6pt] font-helvetica font-bold text-black leading-none mb-0.5">17</span>
                <div style={{ height: '0.5cm' }} className="grid grid-cols-3 w-full border border-dotted border-black bg-white">
                  <div className="bg-white border-r border-dotted border-black"></div>
                  <div className="bg-white border-r border-dotted border-black"></div>
                  <div className="bg-white"></div>
                </div>
              </div>

              {/* 19 - 8 boxes */}
              <div className="flex flex-col items-center flex-[8] min-w-0">
                <span className="text-[6pt] font-helvetica font-bold text-black leading-none mb-0.5">19</span>
                <div style={{ height: '0.5cm' }} className="grid grid-cols-8 w-full border border-dotted border-black bg-white">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className={`bg-white ${i < 7 ? 'border-r border-dotted border-black' : ''}`}></div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
