import React, { useState } from 'react';
import { Printer, Eye, EyeOff, Layers } from 'lucide-react';

/**
 * Technical Specs:
 * - Document: Philippine Certificate of Live Birth (Municipal Form No. 102, Revised August 2016)
 * - Page Dimensions: Legal size (215.9mm wide x 330.2mm high)
 * - Layout Engine: CSS absolute positioning with physical 'mm' units
 * - Target: Direct millimeter overlay for pre-printed government security paper or clean plain paper printing
 */

export interface ColbFormData {
  // Administrative Header
  province: string;
  cityMunicipality: string;
  registryNo: string;

  // CHILD (Items 1 - 6)
  childFirstName: string;
  childMiddleName: string;
  childLastName: string;
  sex: 'Male' | 'Female' | '';
  dateOfBirthDay: string;
  dateOfBirthMonth: string;
  dateOfBirthYear: string;
  placeOfBirthHospital: string;
  placeOfBirthCity: string;
  placeOfBirthProvince: string;
  typeOfBirth: 'Single' | 'Twin' | 'Triplet' | 'Multiple' | string;
  multipleBirthChildWas: 'First' | 'Second' | 'Third' | string;
  birthOrder: string;
  weightAtBirth: string; // in grams

  // MOTHER (Items 7 - 13)
  motherFirstName: string;
  motherMiddleName: string;
  motherLastName: string;
  motherCitizenship: string;
  motherReligion: string;
  motherTotalBornAlive: string;
  motherChildrenStillLiving: string;
  motherChildrenNowDead: string;
  motherOccupation: string;
  motherAge: string;
  motherResidenceStreet: string;
  motherResidenceCity: string;
  motherResidenceProvince: string;
  motherResidenceCountry: string;

  // FATHER (Items 14 - 19)
  fatherFirstName: string;
  fatherMiddleName: string;
  fatherLastName: string;
  fatherCitizenship: string;
  fatherReligion: string;
  fatherOccupation: string;
  fatherAge: string;
  fatherResidenceStreet: string;
  fatherResidenceCity: string;
  fatherResidenceProvince: string;
  fatherResidenceCountry: string;

  // MARRIAGE OF PARENTS (Item 20)
  parentsMarried: boolean;
  marriageMonth?: string;
  marriageDay?: string;
  marriageYear?: string;
  marriageCity?: string;
  marriageProvince?: string;
  marriageCountry?: string;

  // ATTENDANT (Item 21)
  attendantType: '1' | '2' | '3' | '4' | '5' | ''; // 1=Physician, 2=Nurse, 3=Midwife, 4=Hilot, 5=Others
  attendantOtherSpecify?: string;
  attendantTime?: string;
  attendantTimeAmPm?: 'am' | 'pm';
  attendantName?: string;
  attendantTitle?: string;
  attendantAddress?: string;
  attendantDate?: string;
}

export const defaultMockColbData: ColbFormData = {
  province: 'BOHOL',
  cityMunicipality: 'SAGBAYAN',
  registryNo: '2023-0842',

  childFirstName: 'JUAN MIGUEL',
  childMiddleName: 'BAUTISTA',
  childLastName: 'DELA CRUZ',
  sex: 'Male',
  dateOfBirthDay: '16',
  dateOfBirthMonth: 'AUGUST',
  dateOfBirthYear: '2023',
  placeOfBirthHospital: 'SAGBAYAN DISTRICT HOSPITAL, POBLACION',
  placeOfBirthCity: 'SAGBAYAN',
  placeOfBirthProvince: 'BOHOL',
  typeOfBirth: 'Single',
  multipleBirthChildWas: '',
  birthOrder: 'First',
  weightAtBirth: '3250',

  motherFirstName: 'MARIA CLARA',
  motherMiddleName: 'SANTOS',
  motherLastName: 'BAUTISTA',
  motherCitizenship: 'FILIPINO',
  motherReligion: 'ROMAN CATHOLIC',
  motherTotalBornAlive: '1',
  motherChildrenStillLiving: '1',
  motherChildrenNowDead: '0',
  motherOccupation: 'PUBLIC SCHOOL TEACHER',
  motherAge: '28',
  motherResidenceStreet: '0142 RIZAL STREET, BARANGAY SAN AGUSTIN',
  motherResidenceCity: 'SAGBAYAN',
  motherResidenceProvince: 'BOHOL',
  motherResidenceCountry: 'PHILIPPINES',

  fatherFirstName: 'ROBERTO',
  fatherMiddleName: 'MENDEZ',
  fatherLastName: 'DELA CRUZ',
  fatherCitizenship: 'FILIPINO',
  fatherReligion: 'ROMAN CATHOLIC',
  fatherOccupation: 'CIVIL ENGINEER',
  fatherAge: '31',
  fatherResidenceStreet: '0142 RIZAL STREET, BARANGAY SAN AGUSTIN',
  fatherResidenceCity: 'SAGBAYAN',
  fatherResidenceProvince: 'BOHOL',
  fatherResidenceCountry: 'PHILIPPINES',

  parentsMarried: true,
  marriageMonth: 'OCTOBER',
  marriageDay: '18',
  marriageYear: '2020',
  marriageCity: 'SAGBAYAN',
  marriageProvince: 'BOHOL',
  marriageCountry: 'PHILIPPINES',

  attendantType: '1',
  attendantTime: '08:45',
  attendantTimeAmPm: 'am',
  attendantName: 'DR. ELEANOR M. MARTINEZ, MD',
  attendantTitle: 'ATTENDING PHYSICIAN',
  attendantAddress: 'POBLACION, SAGBAYAN, BOHOL',
  attendantDate: 'AUGUST 16, 2023',
};

interface Props {
  formData?: ColbFormData;
  showBackgroundForm?: boolean;
  showFieldGuides?: boolean;
}

export const PhilippineColbPrintOverlay: React.FC<Props> = ({
  formData = defaultMockColbData,
  showBackgroundForm: initialShowBg = false,
  showFieldGuides: initialShowGuides = false,
}) => {
  const [showBg, setShowBg] = useState(initialShowBg);
  const [showGuides, setShowGuides] = useState(initialShowGuides);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-col items-center gap-4 p-4 bg-slate-900 min-h-screen text-slate-100 font-sans">
      {/* Interactive Control Header (Hidden during physical printing) */}
      <div className="no-print w-full max-w-[215.9mm] bg-slate-800 border border-slate-700 p-3 rounded-lg flex flex-wrap items-center justify-between gap-3 shadow-md">
        <div>
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <span>Philippine Form 102 — Precise Millimeter Print Overlay Engine</span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700 font-mono">
              215.9mm × 330.2mm
            </span>
          </h2>
          <p className="text-xs text-slate-400">
            Absolute coordinate positioning in physical millimeters (`mm`) for pixel-perfect alignment.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setShowBg(!showBg)}
            className={`px-2.5 py-1 text-xs font-semibold rounded border flex items-center gap-1.5 transition-colors ${
              showBg
                ? 'bg-emerald-600 text-white border-emerald-500'
                : 'bg-slate-700 text-slate-300 border-slate-600 hover:bg-slate-600'
            }`}
          >
            {showBg ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>{showBg ? 'Hide Form Guide' : 'Show Form Guide'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowGuides(!showGuides)}
            className={`px-2.5 py-1 text-xs font-semibold rounded border flex items-center gap-1.5 transition-colors ${
              showGuides
                ? 'bg-amber-600 text-white border-amber-500'
                : 'bg-slate-700 text-slate-300 border-slate-600 hover:bg-slate-600'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{showGuides ? 'Hide Wireframes' : 'Show Wireframes'}</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="px-3.5 py-1 text-xs font-bold rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center gap-1.5 shadow-sm transition-all"
          >
            <Printer className="w-3.5 h-3.5" />
            Print to Legal Paper
          </button>
        </div>
      </div>

      {/* Embedded Print & Millimeter Layout CSS */}
      <style>{`
        /* Root container calibrated to exact physical Legal size (215.9mm x 330.2mm) */
        .colb-print-page {
          width: 215.9mm;
          height: 330.2mm;
          position: relative;
          background-color: #ffffff;
          box-sizing: border-box;
          overflow: hidden;
          margin: 0 auto;
          color: #000000;
          font-family: Arial, Helvetica, sans-serif;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        /* Generic Field Overlay Style */
        .colb-field {
          position: absolute;
          display: flex;
          align-items: center;
          font-weight: bold;
          font-size: 9.5pt;
          line-height: 1;
          color: #000000;
          text-transform: uppercase;
          box-sizing: border-box;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .colb-field.center {
          justify-content: center;
          text-align: center;
        }

        .colb-field.right {
          justify-content: flex-end;
          text-align: right;
        }

        .colb-field.wrap {
          white-space: normal;
          line-height: 1.1;
          align-items: flex-start;
        }

        /* Optional Field Wireframe Boundary Boxes for Visual Calibration */
        .show-guides .colb-field {
          outline: 1px dashed rgba(16, 185, 129, 0.7);
          background-color: rgba(16, 185, 129, 0.08);
        }

        /* Print Media Query Rules */
        @media print {
          @page {
            size: 215.9mm 330.2mm;
            margin: 0mm;
          }

          body, html {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            width: 215.9mm !important;
            height: 330.2mm !important;
          }

          .no-print {
            display: none !important;
          }

          .colb-print-page {
            margin: 0 !important;
            border: none !important;
            box-shadow: none !important;
            page-break-after: always;
            page-break-inside: avoid;
          }

          /* Hide background template graphic if printing onto official pre-printed blank form */
          .hide-bg-print {
            background-image: none !important;
          }
        }
      `}</style>

      {/* Main Print Container */}
      <div
        className={`colb-print-page shadow-2xl relative select-text ${showGuides ? 'show-guides' : ''} ${!showBg ? 'hide-bg-print' : ''}`}
        style={{
          // If showBg is enabled, overlay atop the official high-resolution government form template
          backgroundImage: showBg ? 'url(/assets/aistudio/image_c19b7345.png)' : 'none',
          backgroundSize: '100% 100%',
          backgroundRepeat: 'no-repeat',
        }}
      >
        {/* =================================================================== */}
        {/* TOP ADMINISTRATIVE HEADER: PROVINCE, CITY/MUNICIPALITY, REGISTRY NO. */}
        {/* =================================================================== */}
        {/* Province (Item row: 29.5mm from top, 27mm from left) */}
        <div className="colb-field" style={{ top: '29.5mm', left: '27.0mm', width: '103.0mm', height: '4.5mm' }}>
          {formData.province}
        </div>

        {/* City / Municipality (Item row: 35.0mm from top, 37mm from left) */}
        <div className="colb-field" style={{ top: '35.0mm', left: '37.0mm', width: '93.0mm', height: '4.5mm' }}>
          {formData.cityMunicipality}
        </div>

        {/* Registry Number (Item row: 32.5mm from top, 142mm from left) */}
        <div className="colb-field" style={{ top: '32.5mm', left: '142.0mm', width: '65.0mm', height: '5.5mm', fontSize: '10.5pt' }}>
          {formData.registryNo}
        </div>

        {/* =================================================================== */}
        {/* SECTION 1: CHILD (ITEMS 1 - 6) */}
        {/* =================================================================== */}
        {/* 1. CHILD'S NAME */}
        {/* 1 (First Name) */}
        <div className="colb-field center" style={{ top: '46.0mm', left: '42.0mm', width: '55.0mm', height: '5.0mm' }}>
          {formData.childFirstName}
        </div>
        {/* 1 (Middle Name) */}
        <div className="colb-field center" style={{ top: '46.0mm', left: '100.0mm', width: '50.0mm', height: '5.0mm' }}>
          {formData.childMiddleName}
        </div>
        {/* 1 (Last Name) */}
        <div className="colb-field center" style={{ top: '46.0mm', left: '153.0mm', width: '55.0mm', height: '5.0mm' }}>
          {formData.childLastName}
        </div>

        {/* 2. SEX */}
        {/* Male indicator / checkmark */}
        {formData.sex === 'Male' && (
          <div className="colb-field center" style={{ top: '56.0mm', left: '33.0mm', width: '6.0mm', height: '4.5mm', fontSize: '11pt' }}>
            ✓
          </div>
        )}
        {/* Female indicator / checkmark */}
        {formData.sex === 'Female' && (
          <div className="colb-field center" style={{ top: '56.0mm', left: '50.0mm', width: '6.0mm', height: '4.5mm', fontSize: '11pt' }}>
            ✓
          </div>
        )}
        {/* Fallback text display if plain text is preferred */}
        <div className="colb-field" style={{ top: '56.2mm', left: '60.0mm', width: '20.0mm', height: '4.5mm', fontSize: '8pt' }}>
          {formData.sex}
        </div>

        {/* 3. DATE OF BIRTH */}
        {/* 3 (Day) */}
        <div className="colb-field center" style={{ top: '56.0mm', left: '114.0mm', width: '22.0mm', height: '5.0mm' }}>
          {formData.dateOfBirthDay}
        </div>
        {/* 3 (Month) */}
        <div className="colb-field center" style={{ top: '56.0mm', left: '141.0mm', width: '33.0mm', height: '5.0mm' }}>
          {formData.dateOfBirthMonth}
        </div>
        {/* 3 (Year) */}
        <div className="colb-field center" style={{ top: '56.0mm', left: '177.0mm', width: '28.0mm', height: '5.0mm' }}>
          {formData.dateOfBirthYear}
        </div>

        {/* 4. PLACE OF BIRTH */}
        {/* 4 (Hospital / Clinic / House No., St., Barangay) - takes remaining space */}
        <div className="colb-field wrap" style={{ top: '67.0mm', left: '44.0mm', width: '70.0mm', height: '6.5mm', fontSize: '8.5pt' }}>
          {formData.placeOfBirthHospital}
        </div>
        {/* 4 (City / Municipality) */}
        <div className="colb-field center" style={{ top: '67.5mm', left: '117.0mm', width: '42.0mm', height: '5.0mm' }}>
          {formData.placeOfBirthCity}
        </div>
        {/* 4 (Province) */}
        <div className="colb-field center" style={{ top: '67.5mm', left: '162.0mm', width: '45.0mm', height: '5.0mm' }}>
          {formData.placeOfBirthProvince}
        </div>

        {/* 5a, 5b, 5c, 6 (ROW HEIGHT: 12.7mm / 0.5 in) */}
        {/* 5a. TYPE OF BIRTH */}
        <div className="colb-field center" style={{ top: '80.0mm', left: '16.0mm', width: '35.0mm', height: '5.0mm', fontSize: '8.5pt' }}>
          {formData.typeOfBirth}
        </div>
        {/* 5b. IF MULTIPLE BIRTH, CHILD WAS */}
        <div className="colb-field center" style={{ top: '80.0mm', left: '55.0mm', width: '47.0mm', height: '5.0mm', fontSize: '8.5pt' }}>
          {formData.multipleBirthChildWas || '—'}
        </div>
        {/* 5c. BIRTH ORDER */}
        <div className="colb-field center" style={{ top: '80.0mm', left: '106.0mm', width: '52.0mm', height: '5.0mm', fontSize: '8.5pt' }}>
          {formData.birthOrder}
        </div>
        {/* 6. WEIGHT AT BIRTH */}
        <div className="colb-field center" style={{ top: '80.0mm', left: '162.0mm', width: '32.0mm', height: '5.0mm', fontSize: '9pt' }}>
          {formData.weightAtBirth}
        </div>

        {/* =================================================================== */}
        {/* SECTION 2: MOTHER (ITEMS 7 - 13) */}
        {/* =================================================================== */}
        {/* 7. MAIDEN NAME */}
        {/* 7 (First Name) */}
        <div className="colb-field center" style={{ top: '91.5mm', left: '42.0mm', width: '55.0mm', height: '5.0mm' }}>
          {formData.motherFirstName}
        </div>
        {/* 7 (Middle Name) */}
        <div className="colb-field center" style={{ top: '91.5mm', left: '100.0mm', width: '50.0mm', height: '5.0mm' }}>
          {formData.motherMiddleName}
        </div>
        {/* 7 (Last Name) */}
        <div className="colb-field center" style={{ top: '91.5mm', left: '153.0mm', width: '55.0mm', height: '5.0mm' }}>
          {formData.motherLastName}
        </div>

        {/* 8. CITIZENSHIP */}
        <div className="colb-field" style={{ top: '101.5mm', left: '22.0mm', width: '82.0mm', height: '5.0mm' }}>
          {formData.motherCitizenship}
        </div>

        {/* 9. RELIGION / RELIGIOUS SECT */}
        <div className="colb-field" style={{ top: '101.5mm', left: '115.0mm', width: '92.0mm', height: '5.0mm' }}>
          {formData.motherReligion}
        </div>

        {/* 10a, 10b, 10c, 11, 12 (ROW HEIGHT: 10.16mm / 0.4 in) */}
        {/* 10a. Total number of children born alive */}
        <div className="colb-field center" style={{ top: '112.5mm', left: '18.0mm', width: '22.0mm', height: '4.5mm' }}>
          {formData.motherTotalBornAlive}
        </div>
        {/* 10b. No. of children still living including this birth */}
        <div className="colb-field center" style={{ top: '112.5mm', left: '45.0mm', width: '26.0mm', height: '4.5mm' }}>
          {formData.motherChildrenStillLiving}
        </div>
        {/* 10c. No. of children born alive but are now dead (Expanded width) */}
        <div className="colb-field center" style={{ top: '112.5mm', left: '76.0mm', width: '31.0mm', height: '4.5mm' }}>
          {formData.motherChildrenNowDead}
        </div>
        {/* 11. OCCUPATION */}
        <div className="colb-field" style={{ top: '112.5mm', left: '112.0mm', width: '55.0mm', height: '4.5mm', fontSize: '8.5pt' }}>
          {formData.motherOccupation}
        </div>
        {/* 12. AGE at the time of this birth */}
        <div className="colb-field center" style={{ top: '112.5mm', left: '172.0mm', width: '33.0mm', height: '4.5mm' }}>
          {formData.motherAge}
        </div>

        {/* 13. RESIDENCE */}
        {/* 13 (House No., St., Barangay) */}
        <div className="colb-field wrap" style={{ top: '122.5mm', left: '44.0mm', width: '70.0mm', height: '6.5mm', fontSize: '8pt' }}>
          {formData.motherResidenceStreet}
        </div>
        {/* 13 (City / Municipality) */}
        <div className="colb-field center" style={{ top: '123.5mm', left: '117.0mm', width: '42.0mm', height: '5.0mm' }}>
          {formData.motherResidenceCity}
        </div>
        {/* 13 (Province) */}
        <div className="colb-field center" style={{ top: '123.5mm', left: '162.0mm', width: '45.0mm', height: '5.0mm' }}>
          {formData.motherResidenceProvince}
        </div>

        {/* =================================================================== */}
        {/* SECTION 3: FATHER (ITEMS 14 - 19) */}
        {/* =================================================================== */}
        {/* 14. FATHER'S NAME */}
        {/* 14 (First Name) */}
        <div className="colb-field center" style={{ top: '134.5mm', left: '42.0mm', width: '55.0mm', height: '5.0mm' }}>
          {formData.fatherFirstName}
        </div>
        {/* 14 (Middle Name) */}
        <div className="colb-field center" style={{ top: '134.5mm', left: '100.0mm', width: '50.0mm', height: '5.0mm' }}>
          {formData.fatherMiddleName}
        </div>
        {/* 14 (Last Name) */}
        <div className="colb-field center" style={{ top: '134.5mm', left: '153.0mm', width: '55.0mm', height: '5.0mm' }}>
          {formData.fatherLastName}
        </div>

        {/* 15. CITIZENSHIP */}
        <div className="colb-field" style={{ top: '144.5mm', left: '20.0mm', width: '40.0mm', height: '5.0mm', fontSize: '8.5pt' }}>
          {formData.fatherCitizenship}
        </div>

        {/* 16. RELIGION / RELIGIOUS SECT */}
        <div className="colb-field" style={{ top: '144.5mm', left: '68.0mm', width: '46.0mm', height: '5.0mm', fontSize: '8.5pt' }}>
          {formData.fatherReligion}
        </div>

        {/* 17. OCCUPATION */}
        <div className="colb-field" style={{ top: '144.5mm', left: '119.0mm', width: '46.0mm', height: '5.0mm', fontSize: '8.5pt' }}>
          {formData.fatherOccupation}
        </div>

        {/* 18. AGE at the time of this birth */}
        <div className="colb-field center" style={{ top: '144.5mm', left: '172.0mm', width: '33.0mm', height: '5.0mm' }}>
          {formData.fatherAge}
        </div>

        {/* 19. RESIDENCE */}
        {/* 19 (House No., St., Barangay) */}
        <div className="colb-field wrap" style={{ top: '155.5mm', left: '44.0mm', width: '70.0mm', height: '6.5mm', fontSize: '8pt' }}>
          {formData.fatherResidenceStreet}
        </div>
        {/* 19 (City / Municipality) */}
        <div className="colb-field center" style={{ top: '156.5mm', left: '117.0mm', width: '42.0mm', height: '5.0mm' }}>
          {formData.fatherResidenceCity}
        </div>
        {/* 19 (Province) */}
        <div className="colb-field center" style={{ top: '156.5mm', left: '162.0mm', width: '45.0mm', height: '5.0mm' }}>
          {formData.fatherResidenceProvince}
        </div>

        {/* =================================================================== */}
        {/* SECTION 4: MARRIAGE OF PARENTS (ITEM 20) */}
        {/* =================================================================== */}
        {/* 20a. DATE */}
        <div className="colb-field center" style={{ top: '173.0mm', left: '22.0mm', width: '22.0mm', height: '4.5mm', fontSize: '8pt' }}>
          {formData.parentsMarried ? (formData.marriageMonth || 'OCTOBER') : 'NOT'}
        </div>
        <div className="colb-field center" style={{ top: '173.0mm', left: '47.0mm', width: '16.0mm', height: '4.5mm', fontSize: '8pt' }}>
          {formData.parentsMarried ? (formData.marriageDay || '18') : 'MARRIED'}
        </div>
        <div className="colb-field center" style={{ top: '173.0mm', left: '67.0mm', width: '18.0mm', height: '4.5mm', fontSize: '8pt' }}>
          {formData.parentsMarried ? (formData.marriageYear || '2020') : ''}
        </div>

        {/* 20b. PLACE */}
        <div className="colb-field center" style={{ top: '173.0mm', left: '98.0mm', width: '36.0mm', height: '4.5mm', fontSize: '8pt' }}>
          {formData.parentsMarried ? (formData.marriageCity || 'SAGBAYAN') : 'N/A'}
        </div>
        <div className="colb-field center" style={{ top: '173.0mm', left: '137.0mm', width: '36.0mm', height: '4.5mm', fontSize: '8pt' }}>
          {formData.parentsMarried ? (formData.marriageProvince || 'BOHOL') : 'N/A'}
        </div>
        <div className="colb-field center" style={{ top: '173.0mm', left: '175.0mm', width: '32.0mm', height: '4.5mm', fontSize: '8pt' }}>
          {formData.parentsMarried ? (formData.marriageCountry || 'PHILIPPINES') : 'N/A'}
        </div>

        {/* =================================================================== */}
        {/* SECTION 5: ATTENDANT (ITEM 21) */}
        {/* =================================================================== */}
        {/* 21a. Attendant Checkmarks (aligned on bottom edge of number with green underline) */}
        {formData.attendantType === '1' && (
          <div className="colb-field center" style={{ top: '187.0mm', left: '19.0mm', width: '5.0mm', height: '4.0mm', fontSize: '9pt', color: '#000000' }}>
            ✓
          </div>
        )}
        {formData.attendantType === '2' && (
          <div className="colb-field center" style={{ top: '187.0mm', left: '47.0mm', width: '5.0mm', height: '4.0mm', fontSize: '9pt', color: '#000000' }}>
            ✓
          </div>
        )}
        {formData.attendantType === '3' && (
          <div className="colb-field center" style={{ top: '187.0mm', left: '73.0mm', width: '5.0mm', height: '4.0mm', fontSize: '9pt', color: '#000000' }}>
            ✓
          </div>
        )}
        {formData.attendantType === '4' && (
          <div className="colb-field center" style={{ top: '187.0mm', left: '99.0mm', width: '5.0mm', height: '4.0mm', fontSize: '9pt', color: '#000000' }}>
            ✓
          </div>
        )}
        {formData.attendantType === '5' && (
          <div className="colb-field center" style={{ top: '187.0mm', left: '158.0mm', width: '5.0mm', height: '4.0mm', fontSize: '9pt', color: '#000000' }}>
            ✓
          </div>
        )}

        {/* 21b. Certification text time */}
        <div className="colb-field" style={{ top: '198.5mm', left: '124.0mm', width: '25.0mm', height: '4.0mm', fontSize: '8.5pt' }}>
          {formData.attendantTime || '08:45 AM'}
        </div>

        {/* 21b. Attendant Signatures */}
        <div className="colb-field" style={{ top: '209.5mm', left: '44.0mm', width: '70.0mm', height: '4.5mm', fontSize: '8.5pt' }}>
          {formData.attendantName}
        </div>
        <div className="colb-field" style={{ top: '215.5mm', left: '44.0mm', width: '70.0mm', height: '4.5mm', fontSize: '8pt' }}>
          {formData.attendantTitle}
        </div>
        <div className="colb-field" style={{ top: '209.5mm', left: '136.0mm', width: '70.0mm', height: '4.5mm', fontSize: '8pt' }}>
          {formData.attendantAddress}
        </div>
        <div className="colb-field" style={{ top: '215.5mm', left: '136.0mm', width: '70.0mm', height: '4.5mm', fontSize: '8pt' }}>
          {formData.attendantDate}
        </div>
      </div>
    </div>
  );
};

export default PhilippineColbPrintOverlay;
