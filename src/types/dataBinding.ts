/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BirthCertificateData } from './certificate';

export type BindingValueType = 'text' | 'date' | 'number' | 'boolean' | 'radio' | 'select';

export interface DataBindingDefinition {
  id: string; // unique identifier, e.g. 'child.firstName'
  token: string; // template token e.g. '{{child.firstName}}'
  itemNumber?: string; // Form 102 official item number e.g. '1', '2', '3', '4', '5a', '6', etc.
  label: string; // Human readable label
  category: 'header' | 'child' | 'mother' | 'father' | 'marriage' | 'attendant' | 'informant' | 'registry' | 'paternity' | 'delayed';
  page: 1 | 2;
  type: BindingValueType;
  placeholder?: string;
  options?: { value: string; label: string }[];
  description?: string;
  getValue: (data: BirthCertificateData) => string | number | boolean | undefined;
  setValue?: (data: BirthCertificateData, value: any) => BirthCertificateData;
}

export interface DynamicBindingDataset {
  id: string;
  name: string;
  subtitle: string;
  badge?: string;
  data: BirthCertificateData;
}

export interface BindingState {
  activeFieldId: string | null;
  hoveredFieldId: string | null;
  showTokens: boolean;
  highlightBindings: boolean;
  activeDatasetIndex: number;
}
