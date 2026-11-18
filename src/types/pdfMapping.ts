/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type PdfFontFamily = 'Helvetica' | 'HelveticaBold' | 'TimesRoman' | 'Courier';
export type PdfTextAlign = 'left' | 'center' | 'right';
export type PdfFieldCategory =
  | 'header'
  | 'child'
  | 'mother'
  | 'father'
  | 'marriage'
  | 'attendant'
  | 'informant'
  | 'registry'
  | 'page2_paternity'
  | 'page2_delayed'
  | 'husband'
  | 'wife'
  | 'husband_parents'
  | 'wife_parents'
  | 'ceremony'
  | 'solemnizing'
  | 'witnesses'
  | 'page2_witnesses'
  | 'page2_solemnizing_affidavit'
  | 'page2_delayed_marriage';

export interface PdfTemplateFieldMapping {
  /** Unique identifier for the field mapping */
  id: string;
  /** Programmatic field key (e.g., 'childFirstName', 'registryNo') */
  fieldName: string;
  /** Human-readable label for administrators */
  label: string;
  /** Logical grouping category */
  category: PdfFieldCategory;
  /** 0-indexed page number in the PDF template (0 for Page 1, 1 for Page 2) */
  pageIndex: number;
  /** X coordinate in PDF points from left edge (0 to page width) */
  x: number;
  /** Y coordinate in PDF points from bottom edge (0 to page height, PDF standard origin) */
  y: number;
  /** Font size in points */
  fontSize: number;
  /** Maximum allowable width in PDF points before auto-scaling or wrapping occurs */
  maxWidth: number;
  /** Text horizontal alignment relative to (x, y) */
  textAlign: PdfTextAlign;
  /** Font family for standard embedding */
  fontFamily: PdfFontFamily;
  /** If true, wraps text across lines instead of scaling font down */
  allowWrap?: boolean;
  /** Maximum number of lines if text wrapping is enabled */
  maxLines?: number;
  /** Line spacing multiplier when wrapped (default: 1.15) */
  lineHeightMultiplier?: number;
  /** Minimum allowable font size when automatically shrinking text (default: 6) */
  minFontSize?: number;
  /** Whether this field is a checkbox or mark */
  isCheckbox?: boolean;
  /** Mark character for checkboxes ('X' or 'check') */
  checkboxChar?: 'X' | 'check';
  /** Path to property in BirthCertificateData (e.g. 'child.firstName', 'colb.registryNo') */
  dataPath: string;
  /** Realistic sample value for visual preview and alignment calibration */
  sampleValue?: string;
  /** Text color RGB (default: black { r: 0.05, g: 0.05, b: 0.05 }) */
  color?: { r: number; g: number; b: number };
}

export interface PdfPageDimension {
  pageIndex: number;
  width: number;
  height: number;
  unit: 'pt' | 'mm' | 'in';
}

export interface PdfTemplateConfig {
  /** Unique ID of the template configuration */
  templateId: string;
  /** Display name of the template */
  name: string;
  /** Description and revision notes */
  description: string;
  /** Path or URL to the underlying official PDF template file */
  pdfPath: string;
  /** Total number of pages in the template */
  pageCount: number;
  /** Physical page dimensions for each page */
  pageDimensions: PdfPageDimension[];
  /** Array of mapped fields with exact coordinates */
  fields: PdfTemplateFieldMapping[];
  /** Schema/layout revision used to invalidate stale localStorage mappings when default coordinates improve */
  configVersion?: number;
  /** Version or last updated timestamp */
  lastModified?: number;
}
