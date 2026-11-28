import React from 'react';
import { CertificateStyle, MarriageCertificateData } from '../types/certificate';
import {
  formatDateMMMMDDYYYY,
  fromMonthDayYearToIso,
  normalizeNotApplicable,
  parseIsoDateToColbParts,
  toFullMonthName,
} from '../utils/certificateUtils';

interface PhilippineComTemplateProps {
  data: MarriageCertificateData;
  style?: CertificateStyle;
  page?: 'page1' | 'page2';
  blankMode?: boolean;
}

export const PhilippineComTemplate: React.FC<PhilippineComTemplateProps> = ({
  data,
  style,
  page = 'page1',
  blankMode = false,
}) => {
  const { groom, bride, marriage, additional, com } = data;

  const val = (v?: string, fallback = '') =>
    blankMode ? '' : normalizeNotApplicable(v || fallback).toUpperCase();

  const longMonths = [
    'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
    'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER',
  ];

  // Husband info
  const hFirst = val(com?.husbandFirstName || groom.firstName);
  const hMiddle = val(com?.husbandMiddleName || groom.middleName);
  const hLast = val(com?.husbandLastName || groom.lastName);

  let hDay = com?.husbandDobDay || '';
  let hMonth = toFullMonthName(com?.husbandDobMonth);
  let hYear = com?.husbandDobYear || '';
  if (!hDay && groom.dateOfBirth) {
    const parsed = parseIsoDateToColbParts(groom.dateOfBirth);
    if (parsed) {
      hYear = parsed.year;
      hMonth = parsed.monthName;
      hDay = parsed.dayPadded;
    }
  }
  if (blankMode) {
    hDay = '';
    hMonth = '';
    hYear = '';
  }

  // Wife info
  const wFirst = val(com?.wifeFirstName || bride.firstName);
  const wMiddle = val(com?.wifeMiddleName || bride.middleName);
  const wLast = val(com?.wifeLastName || bride.lastName);

  let wDay = com?.wifeDobDay || '';
  let wMonth = toFullMonthName(com?.wifeDobMonth);
  let wYear = com?.wifeDobYear || '';
  if (!wDay && bride.dateOfBirth) {
    const parsed = parseIsoDateToColbParts(bride.dateOfBirth);
    if (parsed) {
      wYear = parsed.year;
      wMonth = parsed.monthName;
      wDay = parsed.dayPadded;
    }
  }
  if (blankMode) {
    wDay = '';
    wMonth = '';
    wYear = '';
  }

  // Marriage date
  let mDay = com?.marriageDay || '';
  let mMonth = toFullMonthName(com?.marriageMonth);
  let mYear = com?.marriageYear || '';
  if (!mDay && !mMonth && !mYear && marriage.dateOfMarriage) {
    const parsed = parseIsoDateToColbParts(marriage.dateOfMarriage);
    if (parsed) {
      mYear = parsed.year;
      mMonth = parsed.monthName;
      mDay = parsed.dayPadded;
    }
  }
  if (blankMode) {
    mDay = '';
    mMonth = '';
    mYear = '';
  }

  // Witness Whereof signing date (independent from Date of Marriage)
  const wWhereofParsed = parseIsoDateToColbParts(com?.witnessWhereofDate);
  let wWhereofDay = com?.witnessWhereofDay || wWhereofParsed?.dayPadded || '';
  let wWhereofMonth = toFullMonthName(com?.witnessWhereofMonth || wWhereofParsed?.monthName || '');
  let wWhereofYear = com?.witnessWhereofYear || wWhereofParsed?.year || '';
  if (blankMode) {
    wWhereofDay = '';
    wWhereofMonth = '';
    wWhereofYear = '';
  }

  const parsePlaceParts = (raw?: string) => {
    if (blankMode || !raw) {
      return { city: '', province: '', country: '' };
    }
    const parts = raw
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length >= 3) {
      return { city: parts[0], province: parts[1], country: parts.slice(2).join(', ') };
    }
    if (parts.length === 2) {
      return { city: parts[0], province: parts[1], country: 'PHILIPPINES' };
    }
    return { city: parts[0] || '', province: '', country: '' };
  };

  const hBirthPlace = parsePlaceParts(com?.husbandPlaceOfBirth || groom.placeOfBirth);
  const wBirthPlace = parsePlaceParts(com?.wifePlaceOfBirth || bride.placeOfBirth);

  const parseConsentNameParts = (raw?: string) => {
    if (blankMode) {
      return { first: '', middle: '', last: '' };
    }
    const trimmed = normalizeNotApplicable((raw || '').trim()).trim();
    if (!trimmed || trimmed.toUpperCase() === 'N/A') {
      return { first: '', middle: 'N/A', last: '' };
    }
    const tokens = trimmed.split(/\s+/).filter(Boolean);
    if (tokens.length === 1) {
      return { first: tokens[0], middle: '', last: '' };
    }
    if (tokens.length === 2) {
      return { first: tokens[0], middle: '', last: tokens[1] };
    }
    return {
      first: tokens[0],
      middle: tokens.slice(1, -1).join(' '),
      last: tokens[tokens.length - 1],
    };
  };

  const resolveConsentNameParts = (
    first?: string,
    middle?: string,
    last?: string,
    legacyCombined?: string
  ) => {
    if (blankMode) {
      return { first: '', middle: '', last: '' };
    }
    if (first !== undefined || middle !== undefined || last !== undefined) {
      const f = normalizeNotApplicable((first || '').trim()).trim().toUpperCase();
      const m = normalizeNotApplicable((middle || '').trim()).trim().toUpperCase();
      const l = normalizeNotApplicable((last || '').trim()).trim().toUpperCase();
      if (!f && !m && !l) {
        return { first: '', middle: 'N/A', last: '' };
      }
      if (!f && !l && m === 'N/A') {
        return { first: '', middle: 'N/A', last: '' };
      }
      return { first: f, middle: m, last: l };
    }
    return parseConsentNameParts(legacyCombined);
  };

  const hConsentName = resolveConsentNameParts(
    com?.husbandConsentFirstName,
    com?.husbandConsentMiddleName,
    com?.husbandConsentLastName,
    com?.husbandConsentPerson
  );
  const wConsentName = resolveConsentNameParts(
    com?.wifeConsentFirstName,
    com?.wifeConsentMiddleName,
    com?.wifeConsentLastName,
    com?.wifeConsentPerson
  );

  const pv = (text?: string | null) => {
    if (blankMode || !text) return '\u00A0';
    return <span data-print-value="true">{normalizeNotApplicable(text).toUpperCase()}</span>;
  };

  const pvEmpty = (text?: string | null) => {
    if (blankMode || !text) return '';
    return <span data-print-value="true">{normalizeNotApplicable(text).toUpperCase()}</span>;
  };

  const CheckX: React.FC<{ checked: boolean; label?: string; black?: boolean; sizeCm?: boolean }> = ({ checked, label, black, sizeCm }) => (
    <span className={`inline-flex items-center gap-1 font-helvetica indent-0 ${black ? 'text-black' : ''}`}>
      <span
        style={sizeCm ? { width: '0.5cm', height: '0.5cm' } : undefined}
        className={`inline-flex items-center justify-center indent-0 border border-rose-700 leading-none font-bold bg-white shrink-0 ${
          sizeCm ? 'text-[9.5pt]' : 'w-3 h-3 text-[8.5pt]'
        } ${black ? 'text-black' : 'text-rose-950'}`}
      >
        {!blankMode && checked ? <span data-print-value="true">X</span> : ''}
      </span>
      {label && <span>{label}</span>}
    </span>
  );

  // PAGE 2: BACK AFFIDAVITS & WITNESSES
  // Exact Slice Measurements (Total Interior Height: 33.0 cm):
  // 1st slice: 2.8 cm (20b. WITNESSES)
  // 2nd slice: 13.2 cm (AFFIDAVIT OF SOLEMNIZING OFFICER)
  // 3rd slice: 17.0 cm (AFFIDAVIT FOR DELAYED REGISTRATION OF MARRIAGE)
  if (page === 'page2') {
    return (
      <div className="relative w-full min-w-fit bg-white text-rose-950 font-helvetica select-text p-2 sm:p-3 flex flex-col items-center">
        <div
          style={{ width: 'calc(18.7cm + 4px)', minWidth: 'calc(18.7cm + 4px)', maxWidth: 'calc(18.7cm + 4px)' }}
          className="relative mx-auto bg-white border-2 border-rose-700 flex flex-col overflow-hidden font-helvetica"
        >
          {/* 1st Slice (2.8 cm): 20b. WITNESSES */}
          <div
            style={{ height: '2.8cm', minHeight: '2.8cm', maxHeight: '2.8cm' }}
            className="relative z-20 border-b-2 border-rose-700 px-2 pt-1.5 pb-0 flex flex-col justify-start shrink-0 overflow-hidden"
          >
            <span className="font-helvetica font-normal text-black text-[7pt] block leading-tight pl-1">
              20b. <span className="font-bold">WITNESSES</span> (Print Name and Sign):
            </span>

            <div style={{ paddingTop: '0.4cm' }} className="flex flex-col text-center text-[6.8pt] pb-0">
              <div className="flex justify-between items-end w-full">
                <div
                  style={{ width: '4cm' }}
                  className="border-b border-dotted border-rose-700 flex items-end justify-center pb-0 leading-none font-semibold uppercase text-black min-h-[12px] truncate shrink-0"
                >
                  {pv(val(com?.witness1 || additional.witness1Name))}
                </div>
                <div
                  style={{ width: '4cm' }}
                  className="border-b border-dotted border-rose-700 flex items-end justify-center pb-0 leading-none font-semibold uppercase text-black min-h-[12px] truncate shrink-0"
                >
                  {pv(val(com?.witness2 || additional.witness2Name))}
                </div>
                <div
                  style={{ width: '4cm' }}
                  className="border-b border-dotted border-rose-700 flex items-end justify-center pb-0 leading-none font-semibold uppercase text-black min-h-[12px] truncate shrink-0"
                >
                  {pv(val(com?.witness3))}
                </div>
                <div
                  style={{ width: '4cm' }}
                  className="border-b border-dotted border-rose-700 flex items-end justify-center pb-0 leading-none font-semibold uppercase text-black min-h-[12px] truncate shrink-0"
                >
                  {pv(val(com?.witness4))}
                </div>
              </div>
              <div style={{ paddingTop: '0.6cm' }} className="flex justify-between items-end w-full pb-0">
                <div
                  style={{ width: '4cm' }}
                  className="border-b border-dotted border-rose-700 flex items-end justify-center pb-0 leading-none font-semibold uppercase text-black min-h-[12px] truncate shrink-0"
                >
                  {pv(val(com?.witness5))}
                </div>
                <div
                  style={{ width: '4cm' }}
                  className="border-b border-dotted border-rose-700 flex items-end justify-center pb-0 leading-none font-semibold uppercase text-black min-h-[12px] truncate shrink-0"
                >
                  {pv(val(com?.witness6))}
                </div>
                <div
                  style={{ width: '4cm' }}
                  className="border-b border-dotted border-rose-700 flex items-end justify-center pb-0 leading-none font-semibold uppercase text-black min-h-[12px] truncate shrink-0"
                >
                  {pv(val(com?.witness7))}
                </div>
                <div
                  style={{ width: '4cm' }}
                  className="border-b border-dotted border-rose-700 flex items-end justify-center pb-0 leading-none font-semibold uppercase text-black min-h-[12px] truncate shrink-0"
                >
                  {pv(val(com?.witness8))}
                </div>
              </div>
            </div>
          </div>

          {/* 2nd Slice (13.2 cm): AFFIDAVIT OF SOLEMNIZING OFFICER */}
          {(() => {
            const showSolemnizing = !blankMode && com?.affidavitSolemnizingOfficerEnabled !== false;
            const activeQual =
              com?.solemnizingQualification ||
              (com?.solemnizingOfficerName || marriage.officiantName ? '2a' : '');
            const officerOffice =
              com?.solemnizingOfficerOffice ||
              com?.placeOfMarriageVenue ||
              marriage.placeOfMarriage ||
              '';
            const officerAddr =
              com?.solemnizingOfficerAddress ||
              [
                com?.placeOfMarriageCity || marriage.cityMunicipality,
                com?.placeOfMarriageProvince || marriage.provinceState,
              ]
                .filter(Boolean)
                .join(', ') ||
              [com?.cityMunicipality, com?.province].filter(Boolean).join(', ');
            const solemnizingHusband = [hFirst, hMiddle, hLast].filter(Boolean).join(' ');
            const solemnizingWife = [wFirst, wMiddle, wLast].filter(Boolean).join(' ');

            return (
              <div
                style={{ height: '13.2cm', minHeight: '13.2cm', maxHeight: '13.2cm' }}
                className="relative z-20 border-b-2 border-rose-700 px-3 py-1 font-helvetica text-[7.2pt] text-black leading-[1.24] flex flex-col justify-between shrink-0 overflow-hidden"
              >
                <div>
                  <h2 className="text-center font-bold text-[9.5pt] text-black uppercase tracking-wide leading-tight mb-1">
                    AFFIDAVIT OF SOLEMNIZING OFFICER
                  </h2>
                  <div className="mb-1.5 space-y-0.5 text-[7.2pt] leading-[1.24] text-black">
                    <div style={{ textIndent: '1.5cm' }} className="text-justify [text-align-last:justify]">
                      I,{' '}
                      <span
                        style={{ width: '4.4cm' }}
                        className="inline-block border-b border-rose-700 font-bold uppercase text-center truncate align-bottom indent-0"
                      >
                        {pv(showSolemnizing ? val(com?.solemnizingOfficerName || marriage.officiantName).toUpperCase() : '')}
                      </span>
                      , of legal age, Solemnizing Officer of{' '}
                      <span
                        style={{ width: '3.9cm' }}
                        className="inline-block border-b border-rose-700 uppercase text-center truncate align-bottom indent-0"
                      >
                        {pv(showSolemnizing ? officerOffice.toUpperCase() : '')}
                      </span>{' '}
                      with address at
                    </div>
                    <div className="text-justify">
                      <span
                        style={{ width: '5.4cm' }}
                        className="inline-block border-b border-rose-700 uppercase text-center truncate align-bottom"
                      >
                        {pv(showSolemnizing ? officerAddr.toUpperCase() : '')}
                      </span>
                      , after having been sworn to in accordance with law, do hereby depose and say:
                    </div>
                  </div>

                  <p
                    style={{ marginBottom: '0.4cm' }}
                    className="text-justify text-[7.2pt] leading-[1.24] text-black"
                  >
                    1. That I have solemnized the marriage between{' '}
                    <span className="border-b border-rose-700 font-bold uppercase px-1.5">
                      {showSolemnizing && solemnizingHusband ? (
                        <span data-print-value="true">{solemnizingHusband.toUpperCase()}</span>
                      ) : (
                        '\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0'
                      )}
                    </span>{' '}
                    and{' '}
                    <span className="border-b border-rose-700 font-bold uppercase px-1.5">
                      {showSolemnizing && solemnizingWife ? (
                        <span data-print-value="true">{solemnizingWife.toUpperCase()}</span>
                      ) : (
                        '\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0'
                      )}
                    </span>
                    ;
                  </p>

                  <div className="space-y-0.5 text-[7.2pt] leading-[1.24] text-black">
                    <div className="flex items-start gap-1.5">
                      <span className="shrink-0 w-3.5 leading-[0.5cm]">2</span>
                      <CheckX sizeCm black checked={showSolemnizing && activeQual === '2a'} />
                      <div className="flex-1 flex items-start min-w-0">
                        <span className="shrink-0 w-3.5">a.</span>
                        <span className="flex-1 text-justify">
                          That I have ascertained the qualifications of the contracting parties and have found no legal impediment for them to marry as required by Article 34 of the Family Code;
                        </span>
                      </div>
                    </div>
                    <div className="flex items-start gap-1.5">
                      <span className="shrink-0 w-3.5" aria-hidden="true" />
                      <CheckX sizeCm black checked={showSolemnizing && activeQual === '2b'} />
                      <div className="flex-1 flex items-start min-w-0">
                        <span className="shrink-0 w-3.5">b.</span>
                        <span className="flex-1 text-justify">
                          That this marriage was performed in articulo mortis or at the point of death;
                        </span>
                      </div>
                    </div>
                    <div className="flex items-start gap-1.5">
                      <span className="shrink-0 w-3.5" aria-hidden="true" />
                      <CheckX sizeCm black checked={showSolemnizing && activeQual === '2c'} />
                      <div className="flex-1 flex items-start min-w-0">
                        <span className="shrink-0 w-3.5">c.</span>
                        <span className="flex-1 text-justify">
                          That the contracting party/ies{' '}
                          <span
                            style={{ width: '4.3cm' }}
                            className="inline-block border-b border-rose-700 font-bold uppercase text-center truncate align-bottom"
                          >
                            {pvEmpty(showSolemnizing && activeQual === '2c' ? (com?.solemnizing2cParty1 || '').toUpperCase() : '')}
                          </span>{' '}
                          and{' '}
                          <span
                            style={{ width: '4.3cm' }}
                            className="inline-block border-b border-rose-700 font-bold uppercase text-center truncate align-bottom"
                          >
                            {pvEmpty(showSolemnizing && activeQual === '2c' ? (com?.solemnizing2cParty2 || '').toUpperCase() : '')}
                          </span>
                          , being at the point of death and physically unable to sign the foregoing certificate of marriage by signature or mark, one of the witnesses to the marriage sign for him or her by writing the dying party&apos;s name and beneath it, the witness&apos; own signature preceded by the preposition &quot;By&quot;;
                        </span>
                      </div>
                    </div>
                    <div className="flex items-start gap-1.5">
                      <span className="shrink-0 w-3.5" aria-hidden="true" />
                      <CheckX sizeCm black checked={showSolemnizing && activeQual === '2d'} />
                      <div className="flex-1 flex items-start min-w-0">
                        <span className="shrink-0 w-3.5">d.</span>
                        <span className="flex-1 text-justify">
                          That the residence of either party is so located that there is no means of transportation to enable concerned party to appear personally before the civil registrar;
                        </span>
                      </div>
                    </div>
                    <div className="flex items-start gap-1.5">
                      <span className="shrink-0 w-3.5" aria-hidden="true" />
                      <CheckX sizeCm black checked={showSolemnizing && activeQual === '2e'} />
                      <div className="flex-1 flex items-start min-w-0">
                        <span className="shrink-0 w-3.5">e.</span>
                        <span className="flex-1 text-justify">
                          That the marriage was among Muslims or among members of the Ethnic Cultural Communities and that the marriage was solemnized in accordance with their customs and practices;
                        </span>
                      </div>
                    </div>
                  </div>

                  <p className="text-[7.2pt] leading-[1.24] text-justify">
                    3. That I took the necessary steps to ascertain the ages and relationship of the contracting parties and that neither of them are under any legal impediment to marry each other.
                  </p>

                  <p
                    style={{ marginBottom: '0.4cm' }}
                    className="text-[7.2pt] leading-[1.24] text-justify"
                  >
                    4. That I am executing this affidavit to attest to the truthfulness of the foregoing statements for all legal intents and purposes.
                  </p>

                  <p
                    style={{ textIndent: '1.5cm', marginBottom: '0.4cm' }}
                    className="text-[7.2pt] leading-[1.24] text-justify"
                  >
                    In truth whereof, I have affixed my signature below this{' '}
                    <span
                      style={{ width: '1cm' }}
                      className="inline-block border-b border-rose-700 text-center align-bottom indent-0 truncate"
                    >
                      {pvEmpty(showSolemnizing ? com?.solemnizingSwornDay : '')}
                    </span>{' '}
                    day of{' '}
                    <span
                      style={{ width: '3.7cm' }}
                      className="inline-block border-b border-rose-700 text-center align-bottom indent-0 truncate"
                    >
                      {pvEmpty(showSolemnizing ? com?.solemnizingSwornMonth : '')}
                    </span>
                    ,{' '}
                    <span
                      style={{ width: '1.5cm' }}
                      className="inline-block border-b border-rose-700 text-center align-bottom indent-0 truncate"
                    >
                      {pvEmpty(showSolemnizing ? com?.solemnizingSwornYear : '')}
                    </span>{' '}
                    at{' '}
                    <span
                      style={{ width: '6.7cm' }}
                      className="inline-block border-b border-rose-700 uppercase text-center align-bottom indent-0 truncate"
                    >
                      {pvEmpty(showSolemnizing ? (com?.solemnizingSwornPlace || '').toUpperCase() : '')}
                    </span>
                    , Philippines.
                  </p>

                  {/* Solemnizing Officer Signature Line */}
                  <div className="flex justify-end pr-2">
                    <div className="w-[7.8cm] text-center">
                      <div className="border-b border-rose-700 font-signature text-sm italic uppercase min-h-[12px] pb-0 leading-none text-black">
                        {pvEmpty(showSolemnizing ? val(com?.solemnizingOfficerName || marriage.officiantName).toUpperCase() : '')}
                      </div>
                      <p className="text-[7.2pt] font-helvetica font-normal m-0 p-0 leading-tight text-black">
                        Signature Over Printed Name of Solemnizing Officer
                      </p>
                    </div>
                  </div>
                </div>

                {/* SUBSCRIBED AND SWORN */}
                <div className="pt-0 text-[7.2pt] text-black leading-[1.24] shrink-0 space-y-1 text-justify">
                  <div
                    style={{ textIndent: '1.5cm' }}
                    className="text-justify [text-align-last:justify] leading-[1.24] w-full mb-1.5"
                  >
                    SUBSCRIBED AND SWORN to before me this{' '}
                    <span
                      style={{ width: '1.3cm' }}
                      className="inline-block border-b border-rose-700 text-center align-bottom indent-0 truncate"
                    >
                      {pvEmpty(showSolemnizing ? com?.solemnizingJuratDay : '')}
                    </span>{' '}
                    day of{' '}
                    <span
                      style={{ width: '4.3cm' }}
                      className="inline-block border-b border-rose-700 text-center align-bottom indent-0 truncate"
                    >
                      {pvEmpty(showSolemnizing ? com?.solemnizingJuratMonth : '')}
                    </span>
                    ,{' '}
                    <span
                      style={{ width: '1.7cm' }}
                      className="inline-block border-b border-rose-700 text-center align-bottom indent-0 truncate"
                    >
                      {pvEmpty(showSolemnizing ? com?.solemnizingJuratYear : '')}
                    </span>{' '}
                    at
                  </div>
                  <div className="text-justify [text-align-last:justify] leading-[1.24] w-full">
                    <span
                      style={{ width: '6.4cm' }}
                      className="inline-block border-b border-rose-700 uppercase text-center align-bottom truncate"
                    >
                      {pvEmpty(showSolemnizing ? (com?.solemnizingJuratPlace || '').toUpperCase() : '')}
                    </span>
                    , Philippines, affiant who exhibited to me his/her CTC/valid ID
                  </div>
                  <div className="text-justify [text-align-last:justify] leading-[1.24] w-full">
                    <span
                      style={{ width: '3.9cm' }}
                      className="inline-block border-b border-rose-700 text-center align-bottom truncate"
                    >
                      {pvEmpty(showSolemnizing ? com?.solemnizingAffiantCtc : '')}
                    </span>{' '}
                    issued on{' '}
                    <span
                      style={{ width: '2.8cm' }}
                      className="inline-block border-b border-rose-700 text-center align-bottom truncate"
                    >
                      {pvEmpty(showSolemnizing ? formatDateMMMMDDYYYY(com?.solemnizingAffiantCtcDate) : '')}
                    </span>{' '}
                    at{' '}
                    <span
                      style={{ width: '6.2cm' }}
                      className="inline-block border-b border-rose-700 uppercase text-center align-bottom truncate"
                    >
                      {pvEmpty(showSolemnizing ? (com?.solemnizingAffiantCtcPlace || '').toUpperCase() : '')}
                    </span>
                    .
                  </div>
                </div>

                {/* Administering Officer Signature Lines */}
                <div className="grid grid-cols-2 gap-8 text-center shrink-0">
                  <div className="space-y-0.5 w-[7.8cm] mx-auto">
                    <div>
                      <div className="border-b border-rose-700 text-[8pt] min-h-[12px] pb-0 font-bold font-helvetica text-black">
                        {'\u00A0'}
                      </div>
                      <p className="text-[7.2pt] font-helvetica font-normal m-0 p-0 leading-tight text-black">
                        Signature of the Administering Officer
                      </p>
                    </div>
                    <div>
                      <div className="border-b border-rose-700 text-[8pt] min-h-[12px] pb-0 font-bold font-helvetica text-black uppercase truncate">
                        {pvEmpty(showSolemnizing ? (com?.solemnizingAdminOfficerName || '').toUpperCase() : '')}
                      </div>
                      <p className="text-[7.2pt] font-helvetica font-normal m-0 p-0 leading-tight text-black">
                        Name in Print
                      </p>
                    </div>
                  </div>

                  <div className="space-y-0.5 w-[7.8cm] mx-auto">
                    <div>
                      <div className="border-b border-rose-700 text-[8pt] min-h-[12px] pb-0 font-bold font-helvetica text-black truncate">
                        {pvEmpty(showSolemnizing ? com?.solemnizingAdminOfficerTitle : '')}
                      </div>
                      <p className="text-[7.2pt] font-helvetica font-normal m-0 p-0 leading-tight text-black">
                        Position / Title / Designation
                      </p>
                    </div>
                    <div>
                      <div className="border-b border-rose-700 text-[8pt] min-h-[12px] pb-0 font-bold font-helvetica text-black uppercase truncate">
                        {pvEmpty(showSolemnizing ? (com?.solemnizingAdminOfficerAddress || '').toUpperCase() : '')}
                      </div>
                      <p className="text-[7.2pt] font-helvetica font-normal m-0 p-0 leading-tight text-black">
                        Address
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* 3rd Slice (17 cm): AFFIDAVIT FOR DELAYED REGISTRATION OF MARRIAGE */}
          {(() => {
            const showDelayed = !blankMode && Boolean(com?.affidavitDelayedReg);
            const delayedMarriageDateStr = formatDateMMMMDDYYYY(
              com?.delayedMarriageDate ||
                marriage.dateOfMarriage ||
                fromMonthDayYearToIso(mMonth, mDay, mYear)
            );
            const delayedMarriagePlaceStr =
              com?.delayedMarriagePlace || marriage.placeOfMarriage || com?.placeOfMarriage || '';
            const defaultHusbandName = [hFirst, hLast].filter(Boolean).join(' ');
            const defaultWifeName = [wFirst, wLast].filter(Boolean).join(' ');
            const delayedAffiant = com?.delayedAffiantName || defaultHusbandName;
            const delayedResidence =
              com?.delayedAffiantResidence || com?.husbandResidence || groom.currentAddress || '';
            const isSelfApplicant = com?.delayedApplicantType === 'my_marriage';
            const ceremonyType = com?.delayedCeremonyType || 'civil';

            return (
              <div
                style={{ height: '17cm', minHeight: '17cm', maxHeight: '17cm' }}
                className="relative z-20 px-2 py-2 text-[7.2pt] leading-[1.24] flex flex-col justify-between shrink-0 overflow-hidden"
              >
                <div className="space-y-1.5">
                  <h2 className="text-center font-bold text-[9pt] text-black uppercase tracking-wide leading-tight">
                    AFFIDAVIT FOR DELAYED REGISTRATION OF MARRIAGE
                  </h2>
                  <p
                    style={{ textIndent: '1.5cm' }}
                    className="text-justify leading-[1.24] text-[7.2pt]"
                  >
                    I,{' '}
                    <span
                      style={{ width: '7.1cm' }}
                      className="inline-block border-b border-rose-700 font-bold uppercase text-center truncate align-bottom indent-0"
                    >
                      {pv(showDelayed ? delayedAffiant.toUpperCase() : '')}
                    </span>
                    , of legal age, single/married/divorced/widow/widower, with residence and postal address at{' '}
                    <span
                      style={{ width: '16cm' }}
                      className="inline-block border-b border-rose-700 uppercase text-center truncate align-bottom indent-0"
                    >
                      {pv(showDelayed ? delayedResidence.toUpperCase() : '')}
                    </span>
                    <br />
                    <span
                      style={{ width: '4.1cm' }}
                      className="inline-block border-b border-rose-700 text-center align-bottom indent-0"
                    >
                      {pv(showDelayed ? com?.delayedAffiantCivilStatus : '')}
                    </span>
                    , after having been duly sworn in accordance with law, do hereby depose and say:
                  </p>

                  <div className="space-y-1 text-[7.2pt] leading-[1.24] pl-1">
                    <div>
                      <p>1. That I am the applicant for the delayed registration of</p>
                      <div className="pl-3 space-y-0.5 pt-0.5">
                        <div className="flex items-start gap-1.5">
                          <CheckX sizeCm checked={showDelayed && isSelfApplicant} />
                          <span className="flex-1 text-justify leading-[1.24]">
                            my marriage with{' '}
                            <span
                              style={{ width: '4.4cm' }}
                              className="inline-block border-b border-rose-700 font-bold uppercase text-center truncate align-bottom"
                            >
                              {pv(showDelayed && isSelfApplicant ? (com?.delayedSpouseName || defaultWifeName).toUpperCase() : '')}
                            </span>{' '}
                            in{' '}
                            <span
                              style={{ width: '3.2cm' }}
                              className="inline-block border-b border-rose-700 uppercase text-center truncate align-bottom"
                            >
                              {pv(showDelayed && isSelfApplicant ? delayedMarriagePlaceStr.toUpperCase() : '')}
                            </span>{' '}
                            on{' '}
                            <span
                              style={{ width: '2.9cm' }}
                              className="inline-block border-b border-rose-700 text-center truncate align-bottom"
                            >
                              {pv(showDelayed && isSelfApplicant ? delayedMarriageDateStr : '')}
                            </span>
                          </span>
                        </div>
                        <div className="flex items-start gap-1.5">
                          <CheckX sizeCm checked={showDelayed && !isSelfApplicant} />
                          <span className="flex-1 text-justify leading-[1.24]">
                            my marriage between{' '}
                            <span
                              style={{ width: '5.3cm' }}
                              className="inline-block border-b border-rose-700 font-bold uppercase text-center truncate align-bottom"
                            >
                              {pv(showDelayed && !isSelfApplicant ? defaultHusbandName.toUpperCase() : '')}
                            </span>{' '}
                            and{' '}
                            <span
                              style={{ width: '3cm' }}
                              className="inline-block border-b border-rose-700 font-bold uppercase text-center truncate align-bottom"
                            >
                              {pv(showDelayed && !isSelfApplicant ? defaultWifeName.toUpperCase() : '')}
                            </span>{' '}
                            in{' '}
                            <span
                              style={{ width: '3.1cm' }}
                              className="inline-block border-b border-rose-700 uppercase text-center truncate align-bottom"
                            >
                              {pv(showDelayed && !isSelfApplicant ? delayedMarriagePlaceStr.toUpperCase() : '')}
                            </span>{' '}
                            on{' '}
                            <span
                              style={{ width: '2.9cm' }}
                              className="inline-block border-b border-rose-700 text-center truncate align-bottom"
                            >
                              {pv(showDelayed && !isSelfApplicant ? delayedMarriageDateStr : '')}
                            </span>
                            .
                          </span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <p>
                        2. That the said marriage was solemnized by{' '}
                        <span
                          style={{ width: '6.9cm' }}
                          className="inline-block border-b border-rose-700 uppercase text-center truncate align-bottom"
                        >
                          {pv(showDelayed ? (com?.solemnizingOfficerName || marriage.officiantName || '').toUpperCase() : '')}
                        </span>{' '}
                        under
                      </p>
                      <div
                        style={{ paddingLeft: '1.5cm' }}
                        className="pt-0.5 flex flex-wrap items-center gap-x-5 gap-y-0.5"
                      >
                        <span className="inline-flex items-center gap-1">
                          <CheckX sizeCm checked={showDelayed && ceremonyType === 'religious'} />
                          <span>a. religious ceremony</span>
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <CheckX sizeCm checked={showDelayed && ceremonyType === 'civil'} />
                          <span>b. civil ceremony</span>
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <CheckX sizeCm checked={showDelayed && ceremonyType === 'muslim'} />
                          <span>c. Muslim rites</span>
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <CheckX sizeCm checked={showDelayed && ceremonyType === 'tribal'} />
                          <span>d. tribal rites</span>
                        </span>
                      </div>
                    </div>

                    <div>
                      <p>3. That the marriage was solemnized:</p>
                      <div className="pl-3 space-y-0.5 pt-0.5">
                        <div className="flex items-start gap-1.5">
                          <CheckX sizeCm checked={showDelayed && Boolean(com?.marriageLicenseNo) && com?.licenseType !== 'art_209'} />
                          <span className="flex-1 text-justify leading-[1.24]">
                            a. with marriage license no.{' '}
                            <span
                              style={{ width: '1.8cm' }}
                              className="inline-block border-b border-rose-700 text-center truncate align-bottom"
                            >
                              {pv(showDelayed ? com?.marriageLicenseNo : '')}
                            </span>{' '}
                            issued on{' '}
                            <span
                              style={{ width: '3cm' }}
                              className="inline-block border-b border-rose-700 text-center truncate align-bottom"
                            >
                              {pv(showDelayed ? formatDateMMMMDDYYYY(com?.licenseIssuedDate) : '')}
                            </span>{' '}
                            at{' '}
                            <span
                              style={{ width: '4.5cm' }}
                              className="inline-block border-b border-rose-700 uppercase text-center truncate align-bottom"
                            >
                              {pv(showDelayed ? (com?.licenseIssuedPlace || '').toUpperCase() : '')}
                            </span>
                          </span>
                        </div>
                        <div className="flex items-start gap-1.5">
                          <CheckX sizeCm checked={showDelayed && com?.licenseType === 'art_209'} />
                          <span className="flex-1 text-justify leading-[1.24]">
                            b. under Article{' '}
                            <span
                              style={{ width: '1cm' }}
                              className="inline-block border-b border-rose-700 text-center truncate align-bottom"
                            >
                              {pv(showDelayed && com?.licenseType === 'art_209' ? com?.art209Specify : '')}
                            </span>{' '}
                            (marriages of exceptional character);
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-0.5 text-justify">
                      <p>
                        4. (If the applicant is either the wife or husband) That I am a citizen of{' '}
                        <span
                          style={{ width: '5cm' }}
                          className="inline-block border-b border-rose-700 text-center truncate align-bottom"
                        >
                          {pv(showDelayed ? com?.delayedApplicantCitizenship : '')}
                        </span>{' '}
                        and my spouse is a citizen of{' '}
                        <span
                          style={{ width: '4.4cm' }}
                          className="inline-block border-b border-rose-700 text-center truncate align-bottom"
                        >
                          {pv(showDelayed ? com?.delayedSpouseCitizenship : '')}
                        </span>
                        ;
                      </p>
                      <p className="pl-3">
                        (If the applicant is other than the wife or husband) That the wife is a citizen of{' '}
                        <span
                          style={{ width: '5cm' }}
                          className="inline-block border-b border-rose-700 text-center truncate align-bottom"
                        >
                          {pv(showDelayed ? com?.delayedWifeCitizenship : '')}
                        </span>{' '}
                        and the husband is a citizen of{' '}
                        <span
                          style={{ width: '5cm' }}
                          className="inline-block border-b border-rose-700 text-center truncate align-bottom"
                        >
                          {pv(showDelayed ? com?.delayedHusbandCitizenship : '')}
                        </span>
                        .
                      </p>
                    </div>

                    <p>
                      5. That the reason for registering our/their marriage is{' '}
                      <span
                        style={{ width: '6.4cm' }}
                        className="inline-block border-b border-rose-700 text-center truncate align-bottom"
                      >
                        {pv(showDelayed ? com?.delayedReason : '')}
                      </span>
                      .
                    </p>

                    <p className="text-justify">
                      6. That I am executing this affidavit to attest to the truthfulness of the foregoing statements for all legal intents and purposes.
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <p
                    style={{ textIndent: '1.5cm' }}
                    className="text-[7.2pt] leading-[1.24] text-justify"
                  >
                    In truth whereof, I have affixed my signature below this{' '}
                    <span
                      style={{ width: '1cm' }}
                      className="inline-block border-b border-rose-700 text-center align-bottom indent-0"
                    >
                      {pv(showDelayed ? com?.delayedSwornDay : '')}
                    </span>{' '}
                    day of{' '}
                    <span
                      style={{ width: '3.9cm' }}
                      className="inline-block border-b border-rose-700 text-center align-bottom indent-0"
                    >
                      {pv(showDelayed ? com?.delayedSwornMonth : '')}
                    </span>
                    ,{' '}
                    <span
                      style={{ width: '1.5cm' }}
                      className="inline-block border-b border-rose-700 text-center align-bottom indent-0"
                    >
                      {pv(showDelayed ? com?.delayedSwornYear : '')}
                    </span>{' '}
                    at{' '}
                    <span
                      style={{ width: '6.9cm' }}
                      className="inline-block border-b border-rose-700 uppercase text-center align-bottom indent-0"
                    >
                      {pv(showDelayed ? (com?.delayedSwornPlace || '').toUpperCase() : '')}
                    </span>
                    , Philippines.
                  </p>

                  {/* Affiant Signature Line (COLB-style right aligned 7.8cm, 1.8cm right padding, zero label padding) */}
                  <div style={{ paddingRight: '1.8cm' }} className="flex justify-end pt-2">
                    <div className="w-[7.8cm] text-center">
                      <div className="border-b border-rose-700 font-signature text-sm italic uppercase min-h-[16px] pb-0 leading-none text-black">
                        {pvEmpty(showDelayed ? delayedAffiant.toUpperCase() : '')}
                      </div>
                      <p className="text-[6.5pt] font-helvetica m-0 p-0 leading-tight text-black">
                        Signature Over Printed Name of Affiant
                      </p>
                    </div>
                  </div>
                </div>

                {/* SUBSCRIBED AND SWORN (Jurat - matching COLB full-width justified rows & rose underlines) */}
                <div className="pt-0 text-[8.2pt] text-black leading-relaxed shrink-0 space-y-1 text-justify">
                  <div className="indent-8 text-justify [text-align-last:justify] leading-relaxed flex items-baseline gap-1 w-full">
                    <span className="shrink-0 whitespace-nowrap indent-0 pl-8">
                      <span className="font-bold">SUBSCRIBED AND SWORN</span> to before me this
                    </span>
                    <span className="flex-[1] min-w-0 border-b border-rose-700 px-1 text-center leading-tight indent-0 truncate">
                      {pv(showDelayed ? com?.delayedSwornDay : '')}
                    </span>
                    <span className="shrink-0 whitespace-nowrap indent-0">day of</span>
                    <span className="flex-[2] min-w-0 border-b border-rose-700 px-1 text-center leading-tight indent-0 truncate">
                      {pv(showDelayed ? com?.delayedSwornMonth : '')}
                    </span>
                    <span className="shrink-0 indent-0">,</span>
                    <span className="flex-[1] min-w-0 border-b border-rose-700 px-1 text-center leading-tight indent-0 truncate">
                      {pv(showDelayed ? com?.delayedSwornYear : '')}
                    </span>
                    <span className="shrink-0 whitespace-nowrap indent-0">at</span>
                  </div>
                  <div className="flex items-baseline gap-1 w-full">
                    <span className="flex-1 min-w-0 border-b border-rose-700 px-1 uppercase text-center leading-tight truncate">
                      {pv(showDelayed ? (com?.delayedSwornPlace || '').toUpperCase() : '')}
                    </span>
                    <span className="shrink-0 whitespace-nowrap">, Philippines, affiant who exhibited to me his/her CTC/valid ID</span>
                  </div>
                  <div className="flex items-baseline gap-1 w-full">
                    <span className="flex-[1.2] min-w-0 border-b border-rose-700 px-1 text-center leading-tight truncate">
                      {pv(showDelayed ? com?.delayedAffiantCtc : '')}
                    </span>
                    <span className="shrink-0 whitespace-nowrap">issued on</span>
                    <span className="flex-1 min-w-0 border-b border-rose-700 px-1 text-center leading-tight truncate">
                      {pv(showDelayed ? formatDateMMMMDDYYYY(com?.delayedAffiantCtcDate) : '')}
                    </span>
                    <span className="shrink-0 whitespace-nowrap">at</span>
                    <span className="flex-[1.5] min-w-0 border-b border-rose-700 px-1 uppercase text-center leading-tight truncate">
                      {pv(showDelayed ? (com?.delayedAffiantCtcPlace || '').toUpperCase() : '')}
                    </span>
                    <span className="shrink-0">.</span>
                  </div>
                </div>

                {/* Administering Officer Signature Lines (COLB 2x2 Rose blank lines measuring 7.8cm, no parentheses, zero label padding) */}
                <div className="grid grid-cols-2 gap-8 text-center shrink-0">
                  {/* Left Column: Signature & Name in Print */}
                  <div className="space-y-1.5 w-[7.8cm] mx-auto">
                    <div>
                      <div className="border-b border-rose-700 text-[8pt] min-h-[16px] pb-0 font-bold font-helvetica text-black">
                        {'\u00A0'}
                      </div>
                      <p className="text-[6.5pt] font-helvetica m-0 p-0 leading-tight text-black">
                        Signature of the Administering Officer
                      </p>
                    </div>
                    <div>
                      <div className="border-b border-rose-700 text-[8pt] min-h-[16px] pb-0 font-bold font-helvetica text-black uppercase">
                        {pv(showDelayed ? (com?.delayedAdminOfficerName || '').toUpperCase() : '')}
                      </div>
                      <p className="text-[6.5pt] font-helvetica m-0 p-0 leading-tight text-black">
                        Name in Print
                      </p>
                    </div>
                  </div>

                  {/* Right Column: Position / Title / Designation & Address */}
                  <div className="space-y-1.5 w-[7.8cm] mx-auto">
                    <div>
                      <div className="border-b border-rose-700 text-[8pt] min-h-[16px] pb-0 font-bold font-helvetica text-black">
                        {pv(showDelayed ? com?.delayedAdminOfficerTitle : '')}
                      </div>
                      <p className="text-[6.5pt] font-helvetica m-0 p-0 leading-tight text-black">
                        Position / Title / Designation
                      </p>
                    </div>
                    <div>
                      <div className="border-b border-rose-700 text-[8pt] min-h-[16px] pb-0 font-bold font-helvetica text-black uppercase">
                        {pv(showDelayed ? (com?.delayedAdminOfficerAddress || '').toUpperCase() : '')}
                      </div>
                      <p className="text-[6.5pt] font-helvetica m-0 p-0 leading-tight text-black">
                        Address
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    );
  }

  // =========================================================================
  // PAGE 1: MUNICIPAL FORM NO. 97 - CERTIFICATE OF MARRIAGE
  // Exact Slice Measurements (Total Interior Frame: 18.7 cm × 32.9 cm):
  // a. 1st Header: 1.6 cm
  // b. 2nd Header: 1.0 cm
  // c. Husband & Wife Particulars (1-14): 12.8 cm (2.5cm | 8.1cm | 8.1cm; border-2 between 2nd & 3rd)
  // d. Square 15-21 (incl. 22 Registered): 13.5 cm
  // e. Remarks: 2.5 cm
  // f. To be filled-up: 1.5 cm (copied from COLB)
  // =========================================================================
  const aboveTriRowCell = 'grid grid-cols-3 text-center items-start leading-none';
  const labelColClass =
    'border-r border-rose-700 pl-[0.3cm] pr-1 py-0.5 font-helvetica font-normal text-[7.5pt] leading-[1.06] text-black flex items-center overflow-hidden';
  const husbandColClass =
    'border-r-2 border-rose-700 px-1.5 py-[1px] font-helvetica text-[7.5pt] text-black flex flex-col justify-between overflow-hidden';
  const wifeColClass =
    'px-1.5 py-[1px] font-helvetica text-[7.5pt] text-black flex flex-col justify-between overflow-hidden';

  return (
    <div className="relative w-full min-w-fit bg-white text-rose-950 font-helvetica select-text p-2 sm:p-3 flex flex-col items-center">
      {/* Outer Heavy Border Weight 2 Frame (Interior Width: 18.7 cm = 2.5cm + 8.1cm + 8.1cm) */}
      <div
        style={{
          width: 'calc(18.7cm + 4px)',
          minWidth: 'calc(18.7cm + 4px)',
          maxWidth: 'calc(18.7cm + 4px)',
        }}
        className="relative mx-auto bg-white border-2 border-rose-700 flex flex-col overflow-hidden font-helvetica"
      >

        {/* ================================================================ */}
        {/* a. 1.6 cm - 1ST HEADER (Form 97, Republic, OCRG, Title)          */}
        {/* ================================================================ */}
        <div
          style={{ height: '1.6cm', minHeight: '1.6cm', maxHeight: '1.6cm' }}
          className="relative z-20 border-b-2 border-rose-700 px-2 py-0.5 flex flex-col justify-center shrink-0 overflow-hidden"
        >
          <div className="grid grid-cols-1 w-full">
            {/* Layer 1: Top-left Form Number & Top-right Black Ink Notice */}
            <div className="col-start-1 row-start-1 flex justify-between items-start w-full text-[6pt] text-black leading-tight not-italic">
              <div className="text-left whitespace-nowrap">
                <p className="font-bold leading-none">Municipal Form No. 97</p>
                <p className="leading-tight">(Revised August 2016)</p>
              </div>
              <p className="text-right whitespace-nowrap leading-none">
                (To be accomplished in quadruplicate using black ink)
              </p>
            </div>

            {/* Layer 2: Centered Title Block */}
            <div className="col-start-1 row-start-1 w-full text-center pt-1.5 pointer-events-none">
              <p className="text-[7pt] font-semibold leading-none text-black">
                Republic of the Philippines
              </p>
              <p className="text-[8pt] font-bold uppercase tracking-wider leading-none mt-0.5 text-black">
                OFFICE OF THE CIVIL REGISTRAR GENERAL
              </p>
              <h1 className="text-[13pt] font-extrabold uppercase tracking-[0.08em] leading-none mt-0.5 text-black">
                CERTIFICATE OF MARRIAGE
              </h1>
            </div>
          </div>
        </div>

        {/* ================================================================ */}
        {/* b. 1 cm - 2ND HEADER (Province, City/Municipality | Registry No) */}
        {/* ================================================================ */}
        <div
          style={{ height: '1cm', minHeight: '1cm', maxHeight: '1cm' }}
          className="relative z-20 border-b-2 border-rose-700 grid grid-cols-12 shrink-0 overflow-hidden"
        >
          <div className="col-span-8 px-1.5 py-0.5 flex flex-col justify-center gap-0.5 text-[7.5pt]">
            <div className="flex items-baseline leading-none">
              <span className="font-normal text-black whitespace-nowrap shrink-0">
                Province
              </span>
              <span className="flex-1 border-b border-rose-800 uppercase font-bold text-black text-[8pt] pl-1.5 leading-tight truncate">
                {pvEmpty(val(com?.province || marriage.provinceState))}
              </span>
            </div>
            <div className="flex items-baseline leading-none">
              <span className="font-normal text-black whitespace-nowrap shrink-0">
                City/Municipality
              </span>
              <span className="flex-1 border-b border-rose-800 uppercase font-bold text-black text-[8pt] pl-1.5 leading-tight truncate">
                {pvEmpty(val(com?.cityMunicipality || marriage.cityMunicipality))}
              </span>
            </div>
          </div>

          <div className="col-span-4 border-l border-rose-700 px-1.5 py-0.5 flex flex-col justify-between text-[7.5pt]">
            <span className="font-normal text-black leading-none">
              Registry No.
            </span>
            <span className="font-helvetica font-bold text-[8.5pt] text-black tracking-wide leading-tight truncate">
              {pvEmpty(val(com?.registryNo))}
            </span>
          </div>
        </div>

        {/* ================================================================ */}
        {/* c. 12.8 cm - HUSBAND & WIFE PARTICULARS (1-14)                   */}
        {/*    Vertical Slice 3 Columns: 2.5 cm | 8.1 cm | 8.1 cm            */}
        {/*    2nd & 3rd columns separated with heavy border weight 2        */}
        {/* ================================================================ */}
        <div
          style={{ height: '12.8cm', minHeight: '12.8cm', maxHeight: '12.8cm' }}
          className="relative z-20 border-b-2 border-rose-700 flex flex-col shrink-0 overflow-hidden font-helvetica"
        >
          {/* Row Block 1: Merged Item 1 label | HUSBAND & WIFE Header + (First), (Middle), (Last) */}
          <div className="grid grid-cols-[2.5cm_8.1cm_8.1cm] border-b border-rose-700 shrink-0">
            {/* Left 2.5cm column: Merged cell (no top/bottom padding) */}
            <div
              style={{ paddingLeft: '0.3cm' }}
              className="border-r border-rose-700 pr-1 py-0 font-helvetica font-normal text-[7.5pt] leading-[1.1] text-black flex items-center h-full"
            >
              <span>
                1. Name of
                <br />
                Contracting
                <br />
                Parties
              </span>
            </div>

            {/* Middle 8.1cm HUSBAND: Header + (First), (Middle), (Last) without after-space, pt-0 pb-0.5 px-0.5 */}
            <div className="border-r-2 border-rose-700 flex flex-col">
              {/* Row 1: HUSBAND header (no bottom padding) */}
              <div className="h-[0.42cm] border-b border-rose-700 bg-rose-50/50 flex items-end justify-center pb-0 font-bold uppercase tracking-[0.14em] text-[8pt] leading-[0.88] text-rose-950 shrink-0">
                HUSBAND
              </div>
              {/* Rows 2-4: (First), (Middle), (Last) with pt-0 pb-0.5 px-0.5, no vertical after-space, slight space after parenthesis */}
              <div className="pt-0 pb-0.5 px-0.5 flex flex-col justify-start gap-0">
                <div className="flex items-baseline leading-tight gap-1">
                  <span className="text-[6pt] text-rose-800 whitespace-nowrap shrink-0 leading-none">(First)</span>
                  <span className="flex-1 border-b border-rose-800 font-bold uppercase text-[7.5pt] text-black px-0 pt-0 pb-[1.5px] leading-tight truncate">
                    {pv(hFirst)}
                  </span>
                </div>
                <div className="flex items-baseline leading-tight gap-1">
                  <span className="text-[6pt] text-rose-800 whitespace-nowrap shrink-0 leading-none">(Middle)</span>
                  <span className="flex-1 border-b border-rose-800 font-bold uppercase text-[7.5pt] text-black px-0 pt-0 pb-[1.5px] leading-tight truncate">
                    {pv(hMiddle)}
                  </span>
                </div>
                <div className="flex items-baseline leading-tight gap-1">
                  <span className="text-[6pt] text-rose-800 whitespace-nowrap shrink-0 leading-none">(Last)</span>
                  <span className="flex-1 border-b border-rose-800 font-bold uppercase text-[7.5pt] text-black px-0 pt-0 pb-[1.5px] leading-tight truncate">
                    {pv(hLast)}
                  </span>
                </div>
              </div>
            </div>

            {/* Right 8.1cm WIFE: identical Header + (First), (Middle), (Last) without after-space, pt-0 pb-0.5 px-0.5 */}
            <div className="flex flex-col">
              {/* Row 1: WIFE header (no bottom padding) */}
              <div className="h-[0.42cm] border-b border-rose-700 bg-rose-50/50 flex items-end justify-center pb-0 font-bold uppercase tracking-[0.14em] text-[8pt] leading-[0.88] text-rose-950 shrink-0">
                WIFE
              </div>
              {/* Rows 2-4: (First), (Middle), (Last) with pt-0 pb-0.5 px-0.5, no vertical after-space, slight space after parenthesis */}
              <div className="pt-0 pb-0.5 px-0.5 flex flex-col justify-start gap-0">
                <div className="flex items-baseline leading-tight gap-1">
                  <span className="text-[6pt] text-rose-800 whitespace-nowrap shrink-0 leading-none">(First)</span>
                  <span className="flex-1 border-b border-rose-800 font-bold uppercase text-[7.5pt] text-black px-0 pt-0 pb-[1.5px] leading-tight truncate">
                    {pv(wFirst)}
                  </span>
                </div>
                <div className="flex items-baseline leading-tight gap-1">
                  <span className="text-[6pt] text-rose-800 whitespace-nowrap shrink-0 leading-none">(Middle)</span>
                  <span className="flex-1 border-b border-rose-800 font-bold uppercase text-[7.5pt] text-black px-0 pt-0 pb-[1.5px] leading-tight truncate">
                    {pv(wMiddle)}
                  </span>
                </div>
                <div className="flex items-baseline leading-tight gap-1">
                  <span className="text-[6pt] text-rose-800 whitespace-nowrap shrink-0 leading-none">(Last)</span>
                  <span className="flex-1 border-b border-rose-800 font-bold uppercase text-[7.5pt] text-black px-0 pt-0 pb-[1.5px] leading-tight truncate">
                    {pv(wLast)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 2a. Date of Birth & 2b. Age (Combined in Same Border: 6.6cm [approx 6.7cm] + 1.5cm Age = 8.1cm) */}
          <div className="grid grid-cols-[2.5cm_8.1cm_8.1cm] border-b border-rose-700 flex-[1.05] min-h-0">
            <div className={`${labelColClass} flex-col !items-start justify-center`}>
              <span>2a. Date of Birth</span>
              <span>2b. Age</span>
            </div>

            {/* HUSBAND 2a + 2b */}
            <div className="border-r-2 border-rose-700 grid grid-cols-[1fr_1.5cm] h-full min-h-0">
              <div className="border-r border-rose-700 px-1 py-[1px] flex flex-col justify-between">
                <div className={`${aboveTriRowCell} text-[6.2pt] text-rose-800 pt-[1px]`}>
                  <span>(Day)</span>
                  <span>(Month)</span>
                  <span>(Year)</span>
                </div>
                <div className="grid grid-cols-3 text-center font-bold text-[7.5pt] text-black leading-none pb-[2px]">
                  <span className="truncate">{pv(hDay)}</span>
                  <span className="truncate">{pv(hMonth)}</span>
                  <span className="truncate">{pv(hYear)}</span>
                </div>
              </div>
              <div className="px-1 py-[1px] flex flex-col justify-between text-center">
                <span className="text-[6.2pt] text-rose-800 leading-none pt-[1px]">(Age)</span>
                <p className="font-bold text-[7.5pt] text-black leading-none pb-[2px] truncate">
                  {pvEmpty(val(com?.husbandAge))}
                </p>
              </div>
            </div>

            {/* WIFE 2a + 2b */}
            <div className="grid grid-cols-[1fr_1.5cm] h-full min-h-0">
              <div className="border-r border-rose-700 px-1 py-[1px] flex flex-col justify-between">
                <div className={`${aboveTriRowCell} text-[6.2pt] text-rose-800 pt-[1px]`}>
                  <span>(Day)</span>
                  <span>(Month)</span>
                  <span>(Year)</span>
                </div>
                <div className="grid grid-cols-3 text-center font-bold text-[7.5pt] text-black leading-none pb-[2px]">
                  <span className="truncate">{pv(wDay)}</span>
                  <span className="truncate">{pv(wMonth)}</span>
                  <span className="truncate">{pv(wYear)}</span>
                </div>
              </div>
              <div className="px-1 py-[1px] flex flex-col justify-between text-center">
                <span className="text-[6.2pt] text-rose-800 leading-none pt-[1px]">(Age)</span>
                <p className="font-bold text-[7.5pt] text-black leading-none pb-[2px] truncate">
                  {pvEmpty(val(com?.wifeAge))}
                </p>
              </div>
            </div>
          </div>

          {/* 3. Place of Birth (Same structure as Date of Birth: City/Municipality, Province, Country ABOVE) */}
          <div className="grid grid-cols-[2.5cm_8.1cm_8.1cm] border-b border-rose-700 flex-[1.05] min-h-0">
            <div className={labelColClass}>3. Place of Birth</div>
            <div className={husbandColClass}>
              <div className={`${aboveTriRowCell} text-[6pt] text-rose-800 pt-[1px]`}>
                <span className="truncate">(City/Municipality)</span>
                <span className="truncate">(Province)</span>
                <span className="truncate">(Country)</span>
              </div>
              <div className="grid grid-cols-3 text-center font-bold uppercase text-[6.8pt] text-black leading-none pb-[2px] gap-0.5">
                <span className="truncate">{pv(hBirthPlace.city)}</span>
                <span className="truncate">{pv(hBirthPlace.province)}</span>
                <span className="truncate">{pv(hBirthPlace.country)}</span>
              </div>
            </div>
            <div className={wifeColClass}>
              <div className={`${aboveTriRowCell} text-[6pt] text-rose-800 pt-[1px]`}>
                <span className="truncate">(City/Municipality)</span>
                <span className="truncate">(Province)</span>
                <span className="truncate">(Country)</span>
              </div>
              <div className="grid grid-cols-3 text-center font-bold uppercase text-[6.8pt] text-black leading-none pb-[2px] gap-0.5">
                <span className="truncate">{pv(wBirthPlace.city)}</span>
                <span className="truncate">{pv(wBirthPlace.province)}</span>
                <span className="truncate">{pv(wBirthPlace.country)}</span>
              </div>
            </div>
          </div>

          {/* 4a. Sex & 4b. Citizenship (Combined in Same Border: 2.9cm Sex + 5.2cm Citizenship = 8.1cm; legend above 4b) */}
          <div className="grid grid-cols-[2.5cm_8.1cm_8.1cm] border-b border-rose-700 flex-[0.95] min-h-0">
            <div className={`${labelColClass} flex-col !items-start justify-center`}>
              <span>4a. Sex</span>
              <span>4b. Citizenship</span>
            </div>

            {/* HUSBAND 4a + 4b */}
            <div className="border-r-2 border-rose-700 grid grid-cols-[2.9cm_1fr] h-full min-h-0">
              <div className="border-r border-rose-700 px-1 flex items-center justify-center text-center">
                <p className="font-bold text-[7.5pt] uppercase text-black leading-none">
                  {pvEmpty(blankMode ? '' : 'MALE')}
                </p>
              </div>
              <div className="px-1 py-[1px] flex flex-col justify-between text-center">
                <span className="text-[6pt] text-rose-800 leading-none pt-[1px]">(Citizenship)</span>
                <p className="font-bold text-[7.5pt] uppercase text-black leading-none pb-[2px] truncate">
                  {pvEmpty(val(com?.husbandCitizenship || groom.nationality))}
                </p>
              </div>
            </div>

            {/* WIFE 4a + 4b */}
            <div className="grid grid-cols-[2.9cm_1fr] h-full min-h-0">
              <div className="border-r border-rose-700 px-1 flex items-center justify-center text-center">
                <p className="font-bold text-[7.5pt] uppercase text-black leading-none">
                  {pvEmpty(blankMode ? '' : 'FEMALE')}
                </p>
              </div>
              <div className="px-1 py-[1px] flex flex-col justify-between text-center">
                <span className="text-[6pt] text-rose-800 leading-none pt-[1px]">(Citizenship)</span>
                <p className="font-bold text-[7.5pt] uppercase text-black leading-none pb-[2px] truncate">
                  {pvEmpty(val(com?.wifeCitizenship || bride.nationality))}
                </p>
              </div>
            </div>
          </div>

          {/* 5. Residence (Same as 2a structure with full address legend above) */}
          <div className="grid grid-cols-[2.5cm_8.1cm_8.1cm] border-b border-rose-700 flex-[1.05] min-h-0">
            <div className={labelColClass}>5. Residence</div>
            <div className={husbandColClass}>
              <span className="text-[5.8pt] text-rose-800 text-center leading-none pt-[1px] truncate">
                (House No., St., Barangay, City/Municipality, Province, Country)
              </span>
              <p className="font-bold text-[7pt] uppercase text-black text-center truncate leading-none pb-[2px]">
                {pvEmpty(val(com?.husbandResidence || groom.currentAddress))}
              </p>
            </div>
            <div className={wifeColClass}>
              <span className="text-[5.8pt] text-rose-800 text-center leading-none pt-[1px] truncate">
                (House No., St., Barangay, City/Municipality, Province, Country)
              </span>
              <p className="font-bold text-[7pt] uppercase text-black text-center truncate leading-none pb-[2px]">
                {pvEmpty(val(com?.wifeResidence || bride.currentAddress))}
              </p>
            </div>
          </div>

          {/* 6. Religion/Religious Sect (no legend above) */}
          <div className="grid grid-cols-[2.5cm_8.1cm_8.1cm] border-b border-rose-700 flex-[0.9] min-h-0">
            <div className={labelColClass}>
              <span>
                6. Religion/
                <br />
                Religious Sect
              </span>
            </div>
            <div className={`${husbandColClass} !justify-center`}>
              <p className="font-bold text-[7pt] uppercase text-black truncate leading-none">
                {pvEmpty(val(com?.husbandReligion))}
              </p>
            </div>
            <div className={`${wifeColClass} !justify-center`}>
              <p className="font-bold text-[7pt] uppercase text-black truncate leading-none">
                {pvEmpty(val(com?.wifeReligion))}
              </p>
            </div>
          </div>

          {/* 7. Civil Status (no legend above) */}
          <div className="grid grid-cols-[2.5cm_8.1cm_8.1cm] border-b border-rose-700 flex-[0.85] min-h-0">
            <div className={labelColClass}>7. Civil Status</div>
            <div className={`${husbandColClass} !justify-center`}>
              <p className="font-bold text-[7.5pt] uppercase text-black truncate leading-none">
                {pvEmpty(val(com?.husbandCivilStatus))}
              </p>
            </div>
            <div className={`${wifeColClass} !justify-center`}>
              <p className="font-bold text-[7.5pt] uppercase text-black truncate leading-none">
                {pvEmpty(val(com?.wifeCivilStatus))}
              </p>
            </div>
          </div>

          {/* 8. Name of Father (Legend ABOVE) */}
          <div className="grid grid-cols-[2.5cm_8.1cm_8.1cm] border-b border-rose-700 flex-[1.05] min-h-0">
            <div className={labelColClass}>8. Name of Father</div>
            <div className={husbandColClass}>
              <div className={`${aboveTriRowCell} text-[6.2pt] text-rose-800 pt-[1px]`}>
                <span>(First)</span>
                <span>(Middle)</span>
                <span>(Last)</span>
              </div>
              <div className="grid grid-cols-3 text-center font-bold uppercase text-[7pt] text-black leading-none pb-[2px] gap-0.5">
                <span className="truncate">{pv(val(com?.husbandFatherFirstName))}</span>
                <span className="truncate">{pv(val(com?.husbandFatherMiddleName))}</span>
                <span className="truncate">{pv(val(com?.husbandFatherLastName))}</span>
              </div>
            </div>
            <div className={wifeColClass}>
              <div className={`${aboveTriRowCell} text-[6.2pt] text-rose-800 pt-[1px]`}>
                <span>(First)</span>
                <span>(Middle)</span>
                <span>(Last)</span>
              </div>
              <div className="grid grid-cols-3 text-center font-bold uppercase text-[7pt] text-black leading-none pb-[2px] gap-0.5">
                <span className="truncate">{pv(val(com?.wifeFatherFirstName))}</span>
                <span className="truncate">{pv(val(com?.wifeFatherMiddleName))}</span>
                <span className="truncate">{pv(val(com?.wifeFatherLastName))}</span>
              </div>
            </div>
          </div>

          {/* 9. Citizenship */}
          <div className="grid grid-cols-[2.5cm_8.1cm_8.1cm] border-b border-rose-700 flex-[0.85] min-h-0">
            <div className={labelColClass}>9. Citizenship</div>
            <div className={husbandColClass}>
              <span className="text-[6pt] text-rose-800 leading-none pt-[1px]">(Citizenship)</span>
              <p className="font-bold text-[7.5pt] uppercase text-black truncate leading-none pb-[2px]">
                {pvEmpty(val(com?.husbandFatherCitizenship))}
              </p>
            </div>
            <div className={wifeColClass}>
              <span className="text-[6pt] text-rose-800 leading-none pt-[1px]">(Citizenship)</span>
              <p className="font-bold text-[7.5pt] uppercase text-black truncate leading-none pb-[2px]">
                {pvEmpty(val(com?.wifeFatherCitizenship))}
              </p>
            </div>
          </div>

          {/* 10. Maiden Name of Mother (Legend ABOVE) */}
          <div className="grid grid-cols-[2.5cm_8.1cm_8.1cm] border-b border-rose-700 flex-[1.05] min-h-0">
            <div className={`${labelColClass} !pr-0.5`}>
              <span className="tracking-[-0.015em]">
                <span className="whitespace-nowrap">10. Maiden Name</span>
                <br />
                <span>of Mother</span>
              </span>
            </div>
            <div className={husbandColClass}>
              <div className={`${aboveTriRowCell} text-[6.2pt] text-rose-800 pt-[1px]`}>
                <span>(First)</span>
                <span>(Middle)</span>
                <span>(Last)</span>
              </div>
              <div className="grid grid-cols-3 text-center font-bold uppercase text-[7pt] text-black leading-none pb-[2px] gap-0.5">
                <span className="truncate">{pv(val(com?.husbandMotherMaidenFirstName))}</span>
                <span className="truncate">{pv(val(com?.husbandMotherMaidenMiddleName))}</span>
                <span className="truncate">{pv(val(com?.husbandMotherMaidenLastName))}</span>
              </div>
            </div>
            <div className={wifeColClass}>
              <div className={`${aboveTriRowCell} text-[6.2pt] text-rose-800 pt-[1px]`}>
                <span>(First)</span>
                <span>(Middle)</span>
                <span>(Last)</span>
              </div>
              <div className="grid grid-cols-3 text-center font-bold uppercase text-[7pt] text-black leading-none pb-[2px] gap-0.5">
                <span className="truncate">{pv(val(com?.wifeMotherMaidenFirstName))}</span>
                <span className="truncate">{pv(val(com?.wifeMotherMaidenMiddleName))}</span>
                <span className="truncate">{pv(val(com?.wifeMotherMaidenLastName))}</span>
              </div>
            </div>
          </div>

          {/* 11. Citizenship (no legend above) */}
          <div className="grid grid-cols-[2.5cm_8.1cm_8.1cm] border-b border-rose-700 flex-[0.85] min-h-0">
            <div className={labelColClass}>11. Citizenship</div>
            <div className={`${husbandColClass} !justify-center`}>
              <p className="font-bold text-[7.5pt] uppercase text-black truncate leading-none">
                {pvEmpty(val(com?.husbandMotherCitizenship))}
              </p>
            </div>
            <div className={`${wifeColClass} !justify-center`}>
              <p className="font-bold text-[7.5pt] uppercase text-black truncate leading-none">
                {pvEmpty(val(com?.wifeMotherCitizenship))}
              </p>
            </div>
          </div>

          {/* 12. Name of Person/Wali Who Gave Consent or Advice (reduced by 1pt -> 5.5pt, break after '/' and 'Consent') */}
          <div className="grid grid-cols-[2.5cm_8.1cm_8.1cm] border-b border-rose-700 flex-[1.2] min-h-0">
            <div className={`${labelColClass} !text-[5.5pt] !pr-0.5`}>
              <span className="leading-[1.06] tracking-[-0.02em]">
                <span className="whitespace-nowrap">12. Name of Person/</span>
                <br />
                <span className="whitespace-nowrap">Wali Who Gave Consent</span>
                <br />
                <span>or Advice</span>
              </span>
            </div>
            <div className={husbandColClass}>
              <div className={`${aboveTriRowCell} text-[6.2pt] text-rose-800 pt-[1px]`}>
                <span>(First)</span>
                <span>(Middle)</span>
                <span>(Last)</span>
              </div>
              <div className="grid grid-cols-3 text-center font-bold uppercase text-[7pt] text-black leading-none pb-[2px] gap-0.5">
                <span className="truncate">{pv(hConsentName.first)}</span>
                <span className="truncate">{pv(hConsentName.middle)}</span>
                <span className="truncate">{pv(hConsentName.last)}</span>
              </div>
            </div>
            <div className={wifeColClass}>
              <div className={`${aboveTriRowCell} text-[6.2pt] text-rose-800 pt-[1px]`}>
                <span>(First)</span>
                <span>(Middle)</span>
                <span>(Last)</span>
              </div>
              <div className="grid grid-cols-3 text-center font-bold uppercase text-[7pt] text-black leading-none pb-[2px] gap-0.5">
                <span className="truncate">{pv(wConsentName.first)}</span>
                <span className="truncate">{pv(wConsentName.middle)}</span>
                <span className="truncate">{pv(wConsentName.last)}</span>
              </div>
            </div>
          </div>

          {/* 13. Relationship (no legend above) */}
          <div className="grid grid-cols-[2.5cm_8.1cm_8.1cm] border-b border-rose-700 flex-[0.85] min-h-0">
            <div className={labelColClass}>13. Relationship</div>
            <div className={`${husbandColClass} !justify-center`}>
              <p className="font-bold text-[7.5pt] uppercase text-black text-center truncate leading-none">
                {pvEmpty(val(com?.husbandConsentRelationship?.trim() || 'N/A'))}
              </p>
            </div>
            <div className={`${wifeColClass} !justify-center`}>
              <p className="font-bold text-[7.5pt] uppercase text-black text-center truncate leading-none">
                {pvEmpty(val(com?.wifeConsentRelationship?.trim() || 'N/A'))}
              </p>
            </div>
          </div>

          {/* 14. Residence */}
          <div className="grid grid-cols-[2.5cm_8.1cm_8.1cm] flex-[1] min-h-0">
            <div className={labelColClass}>14. Residence</div>
            <div className={husbandColClass}>
              <span className="text-[5.8pt] text-rose-800 text-center leading-none pt-[1px] truncate">
                (House No., St., Barangay, City/Municipality, Province, Country)
              </span>
              <p className="font-semibold text-[7pt] uppercase text-black text-center truncate leading-none pb-[2px]">
                {pvEmpty(val(com?.husbandConsentResidence?.trim() || 'N/A'))}
              </p>
            </div>
            <div className={wifeColClass}>
              <span className="text-[5.8pt] text-rose-800 text-center leading-none pt-[1px] truncate">
                (House No., St., Barangay, City/Municipality, Province, Country)
              </span>
              <p className="font-semibold text-[7pt] uppercase text-black text-center truncate leading-none pb-[2px]">
                {pvEmpty(val(com?.wifeConsentResidence?.trim() || 'N/A'))}
              </p>
            </div>
          </div>
        </div>

        {/* ================================================================ */}
        {/* d. 13.5 cm - SQUARE 15-21 (Marriage Particulars, Certs, 21-22)   */}
        {/* ================================================================ */}
        <div
          style={{ height: '13.5cm', minHeight: '13.5cm', maxHeight: '13.5cm' }}
          className="relative z-20 border-b-2 border-rose-700 flex flex-col justify-between shrink-0 overflow-hidden text-[7pt]"
        >
          {/* 15. Place of Marriage | 16. Date | 17. Time (no bottom border -> removes top border of square 18) */}
          <div className="px-2 py-1 space-y-1 shrink-0">
            {(() => {
              const legacyParts = (com?.placeOfMarriage || '').split(',').map((s) => s.trim()).filter(Boolean);
              const venuePart =
                com?.placeOfMarriageVenue ||
                marriage.placeOfMarriage ||
                (legacyParts.length >= 2 ? legacyParts.slice(0, -2).join(', ') || legacyParts[0] : legacyParts[0]) ||
                '';
              const cityPart =
                com?.placeOfMarriageCity ||
                marriage.cityMunicipality ||
                (legacyParts.length >= 2 ? legacyParts[legacyParts.length - 2] : '') ||
                '';
              const provincePart =
                com?.placeOfMarriageProvince ||
                marriage.provinceState ||
                (legacyParts.length >= 3 ? legacyParts[legacyParts.length - 1] : legacyParts.length === 2 ? legacyParts[1] : '') ||
                '';

              return (
                <div className="flex items-start gap-1.5">
                  <span className="font-normal text-black capitalize shrink-0 leading-tight">
                    15. Place of Marriage:
                  </span>
                  <div className="flex-1 flex flex-col min-w-0">
                    <div className="grid grid-cols-12 gap-2 border-b border-dotted border-rose-800 font-bold uppercase text-black text-center leading-tight min-h-[12px]">
                      <span className="col-span-6 truncate">{pvEmpty(val(venuePart))}</span>
                      <span className="col-span-3 truncate">{pvEmpty(val(cityPart))}</span>
                      <span className="col-span-3 truncate">{pvEmpty(val(provincePart))}</span>
                    </div>
                    <div className="grid grid-cols-12 gap-2 text-center text-[5.8pt] leading-none pt-[1px]">
                      <span className="col-span-6 truncate">(Office of the/House of/Barangay of/Church of/Mosque of)</span>
                      <span className="col-span-3 truncate">(City/Municipality)</span>
                      <span className="col-span-3 truncate">(Province)</span>
                    </div>
                  </div>
                </div>
              );
            })()}

            <div className="grid grid-cols-12 gap-3 items-start pt-0.5">
              <div className="col-span-7 flex items-start gap-1.5">
                <span className="font-normal text-black capitalize shrink-0 leading-tight">
                  16. Date of Marriage:
                </span>
                <div className="flex-1 flex flex-col">
                  <div className="grid grid-cols-3 text-center text-[5.8pt] border-b border-dotted border-rose-800 font-normal text-black leading-tight">
                    <span className="truncate">{pv(mDay)}</span>
                    <span className="truncate">{pv(mMonth)}</span>
                    <span className="truncate">{pv(mYear)}</span>
                  </div>
                  <div className="grid grid-cols-3 text-center text-[5.8pt] text-rose-800 leading-none pt-[1px]">
                    <span>(Day)</span>
                    <span>(Month)</span>
                    <span>(Year)</span>
                  </div>
                </div>
              </div>
              <div className="col-span-5 flex items-baseline gap-1.5 min-w-0">
                <span className="font-normal text-black capitalize shrink-0 leading-tight">
                  17. Time of Marriage:
                </span>
                <span className="flex-1 min-w-0 border-b border-dotted border-rose-800 font-bold text-black text-center leading-tight min-h-[12px] truncate">
                  {pvEmpty(
                    val(
                      (() => {
                        const raw = (com?.marriageTime || marriage.timeOfMarriage || '').trim();
                        if (!raw) return '';
                        if (/\b(am|pm)\b/i.test(raw)) return raw.toUpperCase();
                        return com?.marriageTimeAmPm
                          ? `${raw} ${com.marriageTimeAmPm.toUpperCase()}`
                          : raw;
                      })()
                    )
                  )}
                </span>
                <span className="text-[6pt] text-black shrink-0 whitespace-nowrap leading-tight">
                  am/pm
                </span>
              </div>
            </div>
          </div>

          {/* 18. Certification of the Contracting Parties (no bottom border -> removes top border of 19; shrink-0 so 19 follows right after signatories) */}
          <div className="px-2 pt-1 pb-0.5 shrink-0 flex flex-col justify-start text-black">
            <div>
              <span className="font-normal uppercase text-black block text-[7pt] leading-tight">
                18. Certification of the Contracting Parties:
              </span>
              <p
                style={{ textIndent: '1.5cm' }}
                className="text-[7pt] leading-snug text-black text-justify mb-0"
              >
                THIS IS TO CERTIFY: That I,{' '}
                <span
                  style={{ width: '5.5cm' }}
                  className="inline-block border-b border-dotted border-rose-700 font-bold uppercase text-black text-center px-1 pb-[1.5px] indent-0 truncate align-bottom"
                >
                  {pv([hFirst, hMiddle, hLast].filter(Boolean).join(' '))}
                </span>{' '}
                and I,{' '}
                <span
                  style={{ width: '5.5cm' }}
                  className="inline-block border-b border-dotted border-rose-700 font-bold uppercase text-black text-center px-1 pb-[1.5px] indent-0 truncate align-bottom"
                >
                  {pv([wFirst, wMiddle, wLast].filter(Boolean).join(' '))}
                </span>{' '}
                both of legal age, of our own free will and accord, and in the presence of the person solemnizing this marriage and of the witnesses named below, take each other as husband and wife and certifying further that we:{' '}
                <span className="align-middle indent-0"><CheckX black sizeCm checked={com?.marriageSettlement !== 'entered'} /></span>{' '}
                have not entered, a copy of which is hereto attached / {' '}
                <span className="align-middle indent-0"><CheckX black sizeCm checked={com?.marriageSettlement === 'entered'} /></span>{' '}
                have entered into a marriage settlement.
              </p>
              <p
                style={{ textIndent: '1.5cm' }}
                className="text-[7pt] leading-snug text-black mb-0"
              >
                IN WITNESS WHEREOF, we have signed / marked with our fingerprint this certificate in quadruplicate this{' '}
                <span className="inline-block min-w-[28px] border-b border-dotted border-rose-700 font-bold text-center text-black indent-0">{pv(wWhereofDay)}</span> day of{' '}
                <span className="inline-block min-w-[72px] border-b border-dotted border-rose-700 font-bold text-center text-black indent-0">{pv(wWhereofMonth)}</span>,{' '}
                <span className="inline-block min-w-[36px] border-b border-dotted border-rose-700 font-bold text-center text-black indent-0">{pv(wWhereofYear)}</span>.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-10 pt-1.5 px-4 text-center">
              <div>
                <div className="border-b border-dotted border-rose-700 font-signature text-xs italic uppercase text-black min-h-[14px] pb-0.5">
                  {pvEmpty([hFirst, hLast].filter(Boolean).join(' ').toUpperCase())}
                </div>
                <span className="text-[6.2pt] text-black">(Signature of Husband)</span>
              </div>
              <div>
                <div className="border-b border-dotted border-rose-700 font-signature text-xs italic uppercase text-black min-h-[14px] pb-0.5">
                  {pvEmpty([wFirst, wLast].filter(Boolean).join(' ').toUpperCase())}
                </div>
                <span className="text-[6.2pt] text-black">(Signature of Wife)</span>
              </div>
            </div>
          </div>

          {/* 19. Certification of the Solemnizing Officer (no top/bottom border -> removes top border of 20a; 1.5cm tabs; 4cm/4cm/4.5cm blanks; black 4th blank) */}
          <div className="px-2 pt-1 pb-0.5 flex-1 flex flex-col justify-between min-h-0">
            <div>
              <span className="font-normal uppercase text-rose-950 block text-[7pt] leading-tight">
                19. Certification of the Solemnizing Officer:
              </span>
              <p
                style={{ textIndent: '1.5cm' }}
                className="text-[7pt] leading-snug text-rose-950 mt-0.5 text-justify"
              >
                THIS IS TO CERTIFY: THAT BEFORE ME, on the date and place above-written, personally appeared the above-mentioned parties,
                with their mutual consent, lawfully joined together in holy matrimony which was
                solemnized by me in the presence of the witnesses named below, all of legal age.
              </p>
              <div className="pt-0.5 space-y-0.5 text-[7.6pt] text-rose-950">
                <p style={{ textIndent: '1.5cm' }} className="font-normal uppercase">I Certify Further That:</p>
                <div style={{ paddingLeft: '0.2cm' }} className="-ml-2 flex items-end gap-1 leading-tight">
                  <CheckX sizeCm checked={(com?.licenseType || 'license') === 'license'} />
                  <span className="leading-tight">
                    a. Marriage License No.{' '}
                    <span
                      style={{ width: '4cm' }}
                      className="inline-block border-b border-dotted border-rose-700 font-helvetica font-bold text-black px-1 text-center truncate align-bottom"
                    >
                      {pv((com?.licenseType || 'license') === 'license' ? val(com?.marriageLicenseNo) : '')}
                    </span>{' '}
                    issued on{' '}
                    <span
                      style={{ width: '4cm' }}
                      className="inline-block border-b border-dotted border-rose-700 font-semibold text-black px-1 text-center truncate align-bottom"
                    >
                      {pv(
                        (com?.licenseType || 'license') === 'license'
                          ? val(formatDateMMMMDDYYYY(com?.licenseIssuedDate))
                          : ''
                      )}
                    </span>{' '}
                    at{' '}
                    <span
                      style={{ width: '4.5cm' }}
                      className="inline-block border-b border-dotted border-rose-700 font-semibold uppercase text-black px-1 text-center truncate align-bottom"
                    >
                      {pv((com?.licenseType || 'license') === 'license' ? val(com?.licenseIssuedPlace).toUpperCase() : '')}
                    </span>
                    <br />
                    in favor of said parties, was exhibited to me.
                  </span>
                </div>
                <div style={{ paddingLeft: '0.2cm' }} className="-ml-2 flex items-end gap-1 leading-tight">
                  <CheckX sizeCm checked={com?.licenseType === 'art_209'} />
                  <span className="leading-tight">
                    b. no marriage license was necessary, the marriage being solemnized under Art.{' '}
                    <span className="inline-block min-w-[40px] max-w-[100px] border-b border-dotted border-black font-semibold text-black px-1 text-center truncate align-bottom">
                      {pvEmpty(val(com?.art209Specify))}
                    </span>{' '}
                    of Executive Order No. 209.
                  </span>
                </div>
                <div style={{ paddingLeft: '0.2cm' }} className="-ml-2 flex items-end gap-1 leading-tight">
                  <CheckX sizeCm checked={com?.licenseType === 'pd_1083'} />
                  <span className="leading-tight">
                    c. the marriage was solemnized in accordance with the provisions of Presidential Decree No. 1083.
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-1 text-center items-start">
              <div style={{ width: '6.3cm' }} className="shrink-0">
                <div className="border-b border-dotted border-rose-700 font-bold uppercase text-[8pt] text-black min-h-[15px] truncate">
                  {pvEmpty(val(com?.solemnizingOfficerName || marriage.officiantName))}
                </div>
                <span className="text-[6.5pt] text-rose-900 block leading-tight">
                  (Signature Over Printed Name of Solemnizing Officer)
                </span>
              </div>
              <div style={{ width: '4.6cm' }} className="shrink-0">
                <div className="border-b border-dotted border-rose-700 font-semibold uppercase text-[8pt] text-black min-h-[15px] truncate">
                  {pvEmpty(val(com?.solemnizingOfficerPosition))}
                </div>
                <span className="text-[6.5pt] text-rose-900 block leading-tight">
                  (Position/Designation)
                </span>
              </div>
              <div style={{ width: '6.3cm' }} className="shrink-0">
                <div className="border-b border-dotted border-rose-700 font-semibold uppercase text-[8pt] text-black min-h-[15px] truncate">
                  {pvEmpty(val([com?.solemnizingOfficerReligion, com?.solemnizingOfficerRegistryNo].filter(Boolean).join(' • ')))}
                </div>
                <span className="text-[6.5pt] text-rose-900 block leading-tight">
                  (Religion/Religious Sect, Registry No. and Expiration Date, if applicable)
                </span>
              </div>
            </div>
          </div>

          {/* 20a. WITNESSES (no top border, lowercase 20a, capitalized Print Name and Sign, Additional at the back, 4 dotted lines) */}
          <div className="border-b border-rose-700 px-2 py-1 shrink-0">
            <span className="font-normal text-rose-950 text-[7pt] block leading-tight">
              20a. WITNESSES (Print Name and Sign):
            </span>
            <span className="text-[6.5pt] block leading-none mt-0.5">
              <span className="invisible select-none text-[7pt] font-normal" aria-hidden="true">20a.{' '}</span>Additional at the back
            </span>
            <div className="grid grid-cols-4 gap-3 pt-1.5 text-center text-[6.5pt]">
              <div className="border-b border-dotted border-rose-700 font-semibold uppercase text-black min-h-[14px] truncate">
                {pvEmpty(val(com?.witness1 || additional.witness1Name))}
              </div>
              <div className="border-b border-dotted border-rose-700 font-semibold uppercase text-black min-h-[14px] truncate">
                {pvEmpty(val(com?.witness2 || additional.witness2Name))}
              </div>
              <div className="border-b border-dotted border-rose-700 font-semibold uppercase text-black min-h-[14px] truncate">
                {pvEmpty(val(com?.witness3))}
              </div>
              <div className="border-b border-dotted border-rose-700 font-semibold uppercase text-black min-h-[14px] truncate">
                {pvEmpty(val(com?.witness4))}
              </div>
            </div>
          </div>

          {/* 21. RECEIVED BY & 22. REGISTERED AT THE OFFICE OF THE CIVIL REGISTRAR */}
          <div className="grid grid-cols-2 shrink-0 min-h-[2.05cm]">
            <div className="border-r border-rose-700 px-2 py-1 flex flex-col justify-between font-helvetica text-black font-normal min-w-0">
              <span className="font-helvetica font-normal uppercase text-black text-[7pt]">
                21. RECEIVED BY
              </span>
              <div className="space-y-0.5 text-[6.8pt] pt-0.5 font-helvetica text-black font-normal">
                <div className="flex items-baseline gap-1">
                  <span className="w-16 shrink-0 font-helvetica text-black font-normal">Signature</span>
                  <span style={{ borderBottomWidth: '0.5px' }} className="flex-1 border-b border-rose-800 min-h-[12px]" />
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="w-16 shrink-0 font-helvetica text-black font-normal">Name in Print</span>
                  <span style={{ borderBottomWidth: '0.5px' }} className="flex-1 min-w-0 border-b border-rose-800 font-helvetica font-normal uppercase text-black min-h-[12px] truncate">
                    {pvEmpty(val(com?.receivedByName?.toUpperCase()))}
                  </span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="w-16 shrink-0 font-helvetica text-black font-normal">Title/Position</span>
                  <span style={{ borderBottomWidth: '0.5px' }} className="flex-1 min-w-0 border-b border-rose-800 font-helvetica font-normal uppercase text-black min-h-[12px] truncate">
                    {pvEmpty(val(com?.receivedByTitle))}
                  </span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="w-16 shrink-0 font-helvetica text-black font-normal">Date</span>
                  <span style={{ borderBottomWidth: '0.5px' }} className="flex-1 min-w-0 border-b border-rose-800 font-normal font-helvetica text-black min-h-[12px] truncate">
                    {pvEmpty(val(formatDateMMMMDDYYYY(com?.receivedByDate)))}
                  </span>
                </div>
              </div>
            </div>

            <div className="px-2 py-1 flex flex-col justify-between min-w-0">
              <span className="font-bold uppercase text-rose-950 text-[7pt]">
                22. REGISTERED BY THE CIVIL REGISTRAR
              </span>
              <div className="space-y-0.5 text-[6.8pt] pt-0.5">
                <div className="flex items-baseline gap-1">
                  <span className="w-16 shrink-0">Signature</span>
                  <span className="flex-1 border-b border-rose-800 min-h-[12px]" />
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="w-16 shrink-0">Name in Print</span>
                  <span className="flex-1 min-w-0 border-b border-rose-800 font-bold uppercase text-black min-h-[12px] truncate">
                    {pvEmpty(val(com?.registeredByName?.toUpperCase()))}
                  </span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="w-16 shrink-0">Title/Position</span>
                  <span className="flex-1 min-w-0 border-b border-rose-800 uppercase text-black min-h-[12px] truncate">
                    {pvEmpty(val(com?.registeredByTitle))}
                  </span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="w-16 shrink-0">Date</span>
                  <span className="flex-1 min-w-0 border-b border-rose-800 font-helvetica text-black min-h-[12px] truncate">
                    {pvEmpty(val(formatDateMMMMDDYYYY(com?.registeredByDate)))}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ================================================================ */}
        {/* e. 2.5 cm - REMARKS/ANNOTATIONS                                  */}
        {/* ================================================================ */}
        <div
          style={{ height: '2.5cm', minHeight: '2.5cm', maxHeight: '2.5cm' }}
          className="relative z-20 border-b-2 border-rose-700 px-2 py-1.5 flex flex-col shrink-0 overflow-hidden"
        >
          <span className="font-bold text-[7.5pt] text-black leading-tight block">
            REMARKS/ANNOTATIONS (For LCRO/OCRG/Shari&apos;a Circuit Registrar Use Only)
          </span>
          <p className="text-[7.5pt] text-slate-800 italic pt-1 leading-snug line-clamp-4">
            {pvEmpty(val(com?.remarksAnnotation || marriage.remarks))}
          </p>
        </div>

        {/* ================================================================ */}
        {/* f. 1.5 cm - TO BE FILLED-UP AT THE OFFICE OF THE CIVIL REGISTRAR */}
        {/* ================================================================ */}
        <div
          style={{ height: '1.5cm', minHeight: '1.5cm', maxHeight: '1.5cm' }}
          className="relative z-20 px-1.5 py-1 flex flex-col justify-between shrink-0 overflow-hidden"
        >
          <span className="font-bold text-[7.5pt] text-black uppercase leading-none block">
            TO BE FILLED-UP AT THE OFFICE OF THE CIVIL REGISTRAR
          </span>
          <div className="flex items-end gap-[0.1cm] w-full">
            {/* 4bH - 2 squares */}
            <div className="flex flex-col items-center flex-[2] min-w-0">
              <span className="text-[7pt] font-bold text-black leading-none mb-0.5">4bH</span>
              <div style={{ height: '0.5cm' }} className="grid grid-cols-2 w-full border border-dotted border-black bg-white">
                <div className="bg-white border-r border-dotted border-black"></div>
                <div className="bg-white"></div>
              </div>
            </div>

            {/* 4bW - 2 squares */}
            <div className="flex flex-col items-center flex-[2] min-w-0">
              <span className="text-[7pt] font-bold text-black leading-none mb-0.5">4bW</span>
              <div style={{ height: '0.5cm' }} className="grid grid-cols-2 w-full border border-dotted border-black bg-white">
                <div className="bg-white border-r border-dotted border-black"></div>
                <div className="bg-white"></div>
              </div>
            </div>

            {/* 5H - 5 squares */}
            <div className="flex flex-col items-center flex-[5] min-w-0">
              <span className="text-[7pt] font-bold text-black leading-none mb-0.5">5H</span>
              <div style={{ height: '0.5cm' }} className="grid grid-cols-5 w-full border border-dotted border-black bg-white">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className={`bg-white ${i < 4 ? 'border-r border-dotted border-black' : ''}`}></div>
                ))}
              </div>
            </div>

            {/* 5W (3 squares) connected to 5 squares (8 connected squares total), with 7H on the 4th square */}
            <div className="flex flex-col flex-[8] min-w-0">
              <div className="grid grid-cols-8 w-full text-[7pt] font-bold text-black leading-none mb-0.5 text-center">
                <span className="col-span-3">5W</span>
                <span className="col-span-1">7H</span>
                <span className="col-span-4"></span>
              </div>
              <div style={{ height: '0.5cm' }} className="grid grid-cols-8 w-full border border-dotted border-black bg-white">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className={`bg-white ${i < 7 ? 'border-r border-dotted border-black' : ''}`}></div>
                ))}
              </div>
            </div>

            {/* 6H - 2 squares */}
            <div className="flex flex-col items-center flex-[2] min-w-0">
              <span className="text-[7pt] font-bold text-black leading-none mb-0.5">6H</span>
              <div style={{ height: '0.5cm' }} className="grid grid-cols-2 w-full border border-dotted border-black bg-white">
                <div className="bg-white border-r border-dotted border-black"></div>
                <div className="bg-white"></div>
              </div>
            </div>

            {/* 6W - 2 squares */}
            <div className="flex flex-col items-center flex-[2] min-w-0">
              <span className="text-[7pt] font-bold text-black leading-none mb-0.5">6W</span>
              <div style={{ height: '0.5cm' }} className="grid grid-cols-2 w-full border border-dotted border-black bg-white">
                <div className="bg-white border-r border-dotted border-black"></div>
                <div className="bg-white"></div>
              </div>
            </div>

            {/* 7H - 1 square */}
            <div className="flex flex-col items-center flex-[1] min-w-0">
              <span className="text-[7pt] font-bold text-black leading-none mb-0.5">7H</span>
              <div style={{ height: '0.5cm' }} className="w-full border border-dotted border-black bg-white"></div>
            </div>

            {/* 7W - 1 square */}
            <div className="flex flex-col items-center flex-[1] min-w-0">
              <span className="text-[7pt] font-bold text-black leading-none mb-0.5">7W</span>
              <div style={{ height: '0.5cm' }} className="w-full border border-dotted border-black bg-white"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

