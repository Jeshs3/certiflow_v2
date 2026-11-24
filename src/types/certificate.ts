export type CertificateType = 'birth' | 'marriage';

export type DateFormatOption = 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'Month DD, YYYY';
export type PaperSize = 'a4' | 'letter' | 'colb-custom';
export type PageOrientation = 'portrait' | 'landscape';
export type PageMargins = 'compact' | 'normal' | 'generous';
export type FontStyle = 'serif' | 'formal' | 'modern' | 'classic';
export type FontSize = 'small' | 'medium' | 'large';
export type TextAlign = 'left' | 'center';

export type BorderStyle = 
  | 'double-gold'
  | 'classic-navy'
  | 'ornate-slate'
  | 'minimal-subtle'
  | 'vintage-frame';

export type BackgroundColor =
  | 'pure-white'
  | 'warm-ivory'
  | 'soft-parchment'
  | 'subtle-cream'
  | 'cool-slate';

export type BirthTemplateId = 
  | 'ph-colb-102'
  | 'classic-minimalist'
  | 'modern-professional'
  | 'simple-admin'
  | 'elegant-decorative';

export type MarriageTemplateId = 
  | 'ph-com-97'
  | 'classic-minimalist'
  | 'elegant-formal'
  | 'modern-professional'
  | 'simple-decorative';

export interface ChildInfo {
  firstName: string;
  middleName: string;
  lastName: string;
  fullName: string;
  sex: 'Male' | 'Female' | 'Other' | '';
  dateOfBirth: string; // YYYY-MM-DD
  timeOfBirth?: string;
  placeOfBirth: string;
  cityMunicipality: string;
  provinceState: string;
  country: string;
}

export interface ParentInfo {
  fullName: string;
  dateOfBirth?: string;
  placeOfBirth?: string;
  nationality?: string;
}

export interface BirthAdditionalInfo {
  birthType: 'Single' | 'Twin' | 'Triplet' | 'Multiple' | '';
  birthOrder?: string;
  hospitalFacility?: string;
  attendantAtBirth?: string;
  dateOfRegistration?: string;
  remarks?: string;
}

export interface ColbDetails {
  formNumber?: string;
  province: string;
  cityMunicipality: string;
  registryNo: string;
  remarksAnnotation?: string;
  
  // Child specifics
  birthOrder?: string; // Item 5c e.g. First, Second
  weightAtBirth?: string; // Item 6
  typeOfBirth?: string; // Item 5a e.g. Single, Twin, Triplet
  multipleBirthChildWas?: string; // Item 5b e.g. First, Second, Third
  multipleBirthOrder?: '1' | '2' | '3' | 'N/A' | ''; // Item 5b
  multipleBirthSpecify?: string;
  
  // Mother specifics (Items 7 - 13)
  motherFirstName?: string;
  motherMiddleName?: string;
  motherLastName?: string;
  motherCitizenship?: string; // Item 8
  motherReligion?: string; // Item 9
  totalChildrenBornAlive?: string; // Item 10a
  childrenStillLiving?: string; // Item 10b
  childrenNowDead?: string; // Item 10c
  motherOccupation?: string; // Item 11
  motherAgeAtBirth?: string; // Item 12
  motherResidenceStreet?: string; // Item 13
  motherResidenceCity?: string;
  motherResidenceProvince?: string;
  motherResidenceCountry?: string;

  // Father specifics (Items 14 - 19)
  fatherFirstName?: string;
  fatherMiddleName?: string;
  fatherLastName?: string;
  fatherCitizenship?: string; // Item 15
  fatherReligion?: string; // Item 16
  fatherOccupation?: string; // Item 17
  fatherAgeAtBirth?: string; // Item 18
  fatherResidenceStreet?: string; // Item 19
  fatherResidenceCity?: string;
  fatherResidenceProvince?: string;
  fatherResidenceCountry?: string;

  // Marriage of Parents (Item 20)
  parentsMarried?: boolean;
  parentsMarriageDatePlace?: string;
  parentsMarriageDateMonth?: string;
  parentsMarriageDateDay?: string;
  parentsMarriageDateYear?: string;
  parentsMarriagePlaceCity?: string;
  parentsMarriagePlaceProvince?: string;
  parentsMarriagePlaceCountry?: string;
  
  // Attendant (Item 21a, 21b)
  attendantType?: '1' | '2' | '3' | '4' | '5';
  attendantOtherSpecify?: string;
  attendantTime?: string;
  attendantTimeAmPm?: 'am' | 'pm';
  attendantSignatureName?: string;
  attendantTitlePosition?: string;
  attendantAddress?: string;
  attendantDate?: string;

  // Informant (Item 22)
  informantSignatureName?: string;
  informantRelationship?: string;
  informantAddress?: string;
  informantDate?: string;

  // Prepared By (Item 23)
  preparedByName?: string;
  preparedByTitle?: string;
  preparedByDate?: string;

  // Received by Civil Registrar (Item 24)
  receivedByName?: string;
  receivedByTitle?: string;
  receivedByDate?: string;

  // Registered at Civil Registrar (Item 25)
  registeredByName?: string;
  registeredByTitle?: string;
  registeredByDate?: string;

  // Page 2 Affidavits - Paternity
  affidavitPaternityEnabled?: boolean;
  paternityEra?: 'before_1988' | 'on_or_after_1988';
  paternityFatherName?: string;
  paternityMotherName?: string;
  paternityChildName?: string;
  paternityBirthDate?: string;
  paternityBirthPlace?: string;
  paternityFatherSignatory?: string;
  paternityMotherSignatory?: string;
  affidavitPaternityFatherCtc?: string;
  paternityFatherCtcDate?: string;
  paternityFatherCtcPlace?: string;
  affidavitPaternityMotherCtc?: string;
  paternityMotherCtcDate?: string;
  paternityMotherCtcPlace?: string;
  paternitySwornDay?: string;
  paternitySwornMonth?: string;
  paternitySwornYear?: string;
  paternitySwornPlace?: string;
  affidavitPaternityAdminOfficer?: string;
  paternityAdminOfficerTitle?: string;
  paternityAdminOfficerAddress?: string;

  // Page 2 Affidavits - Delayed Registration
  affidavitDelayedRegEnabled?: boolean;
  delayedAffiantName?: string;
  delayedAffiantCivilStatus?: 'single' | 'married' | 'divorced' | 'widow' | 'widower' | string;
  delayedAffiantResidence?: string;
  delayedApplicantType?: 'my_birth' | 'birth_of';
  delayedApplicantPlace?: string;
  delayedApplicantDate?: string;
  delayedChildName?: string;
  delayedAttendantName?: string;
  delayedAttendantAddress?: string;
  delayedCitizenship?: string;
  delayedParentsStatus?: 'married' | 'not_married';
  delayedParentsMarriageDatePlace?: string;
  delayedFatherName?: string;
  delayedAcknowledged?: boolean;
  delayedReason?: string;
  delayedApplicantMarriedTo?: string;
  delayedAffiantRelationship?: string;
  delayedSwornDay?: string;
  delayedSwornMonth?: string;
  delayedSwornYear?: string;
  delayedSwornPlace?: string;
  delayedAffiantCtc?: string;
  delayedAffiantCtcDate?: string;
  delayedAffiantCtcPlace?: string;
  delayedAdminOfficerName?: string;
  delayedAdminOfficerTitle?: string;
  delayedAdminOfficerAddress?: string;
}

export interface BirthCertificateData {
  child: ChildInfo;
  father: ParentInfo;
  mother: ParentInfo;
  additional: BirthAdditionalInfo;
  colb?: ColbDetails;
}

export interface SpouseInfo {
  firstName: string;
  middleName: string;
  lastName: string;
  fullName: string;
  dateOfBirth: string;
  placeOfBirth: string;
  nationality?: string;
  currentAddress?: string;
}

export interface MarriageDetails {
  dateOfMarriage: string;
  timeOfMarriage?: string;
  placeOfMarriage: string;
  cityMunicipality: string;
  provinceState: string;
  country: string;
  ceremonyType?: string;
  officiantName?: string;
  remarks?: string;
}

export interface MarriageAdditionalDetails {
  witness1Name?: string;
  witness2Name?: string;
  dateOfPreparation: string;
  preparedBy?: string;
}

export interface ComDetails {
  province: string;
  cityMunicipality: string;
  registryNo: string;
  remarksAnnotation?: string;

  // Husband
  husbandFirstName: string;
  husbandMiddleName: string;
  husbandLastName: string;
  husbandDobDay?: string;
  husbandDobMonth?: string;
  husbandDobYear?: string;
  husbandAge?: string;
  husbandPlaceOfBirth?: string;
  husbandCitizenship?: string;
  husbandResidence?: string;
  husbandReligion?: string;
  husbandCivilStatus?: string;
  husbandFatherFirstName?: string;
  husbandFatherMiddleName?: string;
  husbandFatherLastName?: string;
  husbandFatherCitizenship?: string;
  husbandMotherMaidenFirstName?: string;
  husbandMotherMaidenMiddleName?: string;
  husbandMotherMaidenLastName?: string;
  husbandMotherCitizenship?: string;
  husbandConsentPerson?: string;
  husbandConsentRelationship?: string;
  husbandConsentResidence?: string;

  // Wife
  wifeFirstName: string;
  wifeMiddleName: string;
  wifeLastName: string;
  wifeDobDay?: string;
  wifeDobMonth?: string;
  wifeDobYear?: string;
  wifeAge?: string;
  wifePlaceOfBirth?: string;
  wifeCitizenship?: string;
  wifeResidence?: string;
  wifeReligion?: string;
  wifeCivilStatus?: string;
  wifeFatherFirstName?: string;
  wifeFatherMiddleName?: string;
  wifeFatherLastName?: string;
  wifeFatherCitizenship?: string;
  wifeMotherMaidenFirstName?: string;
  wifeMotherMaidenMiddleName?: string;
  wifeMotherMaidenLastName?: string;
  wifeMotherCitizenship?: string;
  wifeConsentPerson?: string;
  wifeConsentRelationship?: string;
  wifeConsentResidence?: string;

  // Marriage Particulars
  placeOfMarriage: string;
  placeOfMarriageVenue?: string;
  placeOfMarriageBarangay?: string;
  placeOfMarriageCity?: string;
  placeOfMarriageProvince?: string;
  marriageDay?: string;
  marriageMonth?: string;
  marriageYear?: string;
  marriageTime?: string;
  marriageTimeAmPm?: 'am' | 'pm';
  marriageSettlement?: 'entered' | 'not_entered';
  husbandSignature?: string;
  wifeSignature?: string;

  // Solemnizing Officer
  licenseType?: 'license' | 'art_209' | 'pd_1083';
  marriageLicenseNo?: string;
  licenseIssuedDate?: string;
  licenseIssuedPlace?: string;
  art209Specify?: string;
  solemnizingOfficerName?: string;
  solemnizingOfficerPosition?: string;
  solemnizingOfficerReligion?: string;
  solemnizingOfficerRegistryNo?: string;

  // Witnesses
  witness1?: string;
  witness2?: string;
  witness3?: string;
  witness4?: string;
  witness5?: string;
  witness6?: string;
  witness7?: string;
  witness8?: string;

  // Registration
  receivedByName?: string;
  receivedByTitle?: string;
  receivedByDate?: string;
  registeredByName?: string;
  registeredByTitle?: string;
  registeredByDate?: string;

  // Page 2 Affidavits
  affidavitSolemnizingOfficerEnabled?: boolean;
  solemnizingOfficerOffice?: string;
  solemnizingOfficerAddress?: string;
  solemnizingQualification?: '2a' | '2b' | '2c' | '2d' | '2e';
  solemnizing2cParty1?: string;
  solemnizing2cParty2?: string;
  solemnizingSwornDay?: string;
  solemnizingSwornMonth?: string;
  solemnizingSwornYear?: string;
  solemnizingSwornPlace?: string;
  solemnizingJuratDay?: string;
  solemnizingJuratMonth?: string;
  solemnizingJuratYear?: string;
  solemnizingJuratPlace?: string;
  solemnizingAffiantCtc?: string;
  solemnizingAffiantCtcDate?: string;
  solemnizingAffiantCtcPlace?: string;
  solemnizingAdminOfficerName?: string;
  solemnizingAdminOfficerTitle?: string;
  solemnizingAdminOfficerAddress?: string;
  affidavitDelayedRegMarriageEnabled?: boolean;
  affidavitDelayedReg?: boolean;
  delayedAffiantName?: string;
  delayedAffiantCivilStatus?: string;
  delayedAffiantResidence?: string;
  delayedApplicantType?: 'my_marriage' | 'marriage_between';
  delayedSpouseName?: string;
  delayedMarriagePlace?: string;
  delayedMarriageDate?: string;
  delayedCeremonyType?: 'religious' | 'civil' | 'muslim' | 'tribal';
  delayedApplicantCitizenship?: string;
  delayedSpouseCitizenship?: string;
  delayedWifeCitizenship?: string;
  delayedHusbandCitizenship?: string;
  delayedReason?: string;
  delayedSwornDay?: string;
  delayedSwornMonth?: string;
  delayedSwornYear?: string;
  delayedSwornPlace?: string;
  delayedAffiantCtc?: string;
  delayedAffiantCtcDate?: string;
  delayedAffiantCtcPlace?: string;
  delayedAdminOfficerName?: string;
  delayedAdminOfficerTitle?: string;
  delayedAdminOfficerAddress?: string;
}

export interface MarriageCertificateData {
  groom: SpouseInfo;
  bride: SpouseInfo;
  marriage: MarriageDetails;
  additional: MarriageAdditionalDetails;
  com?: ComDetails;
}

export interface CertificateStyle {
  templateId: string;
  certificateTitle: string;
  subTitle?: string;
  fontStyle: FontStyle;
  fontSize: FontSize;
  textAlign: TextAlign;
  pageOrientation: PageOrientation;
  paperSize: PaperSize;
  pageMargins: PageMargins;
  borderStyle: BorderStyle;
  backgroundColor: BackgroundColor;
  showDecorativeElements: boolean;
  dateFormat: DateFormatOption;
  watermarkText: string;
  watermarkOpacity: number;
}

export interface SavedDraft {
  id: string;
  type: CertificateType;
  title: string;
  createdAt: number;
  updatedAt: number;
  birthData?: BirthCertificateData;
  marriageData?: MarriageCertificateData;
  style: CertificateStyle;
}
