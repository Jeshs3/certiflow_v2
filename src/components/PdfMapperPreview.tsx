/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { BirthCertificateData, CertificateType, MarriageCertificateData } from '../types/certificate';
import {
  PdfFontFamily,
  PdfTemplateConfig,
  PdfTemplateFieldMapping,
  PdfTextAlign,
} from '../types/pdfMapping';
import {
  getStoredConfig,
  PDF_CONFIG_UPDATED_EVENT,
  resetConfigInStorage,
  resolveFieldValue,
  resolveMarriageFieldValue,
  saveConfigToStorage,
} from '../services/pdfGenerationService';
import { fitFontSizeToWidth, fitWrappedFontSize } from '../utils/textFit';
import { PdfPageCanvas } from './PdfPageCanvas';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Crosshair,
  Move,
  RotateCcw,
  Save,
  Sliders,
} from 'lucide-react';

interface PdfMapperPreviewProps {
  certificateType?: CertificateType;
  birthData?: BirthCertificateData;
  marriageData?: MarriageCertificateData;
  colbPage: 'page1' | 'page2' | 'both';
  blankMode?: boolean;
  previewDataOnly?: boolean;
  activeBindingField?: string | null;
  onSelectBindingField?: (fieldId: string) => void;
  onOpenFieldMapper?: () => void;
  showMapperBar?: boolean;
}

const BINDING_ID_BY_DATAPATH: Record<string, string> = {
  'colb.province': 'header.province',
  'colb.cityMunicipality': 'header.cityMunicipality',
  'colb.registryNo': 'header.registryNo',
  'colb.remarksAnnotation': 'header.remarks',
  'child.firstName': 'child.firstName',
  'child.middleName': 'child.middleName',
  'child.lastName': 'child.lastName',
  'child.sex': 'child.sex',
  'child.dateOfBirth_day': 'child.dateOfBirth',
  'child.dateOfBirth_month': 'child.dateOfBirth',
  'child.dateOfBirth_year': 'child.dateOfBirth',
  'child.placeOfBirth': 'child.placeOfBirthHospital',
  'child.cityMunicipality': 'child.placeOfBirthCity',
  'child.provinceState': 'child.placeOfBirthProvince',
  'additional.birthType': 'child.birthType',
  'colb.multipleBirthOrder': 'child.multipleBirthOrder',
  'colb.birthOrder': 'child.birthOrder',
  'colb.weightAtBirth': 'child.weightAtBirth',
  'colb.motherFirstName': 'mother.firstName',
  'colb.motherMiddleName': 'mother.middleName',
  'colb.motherLastName': 'mother.lastName',
  'colb.motherCitizenship': 'mother.citizenship',
  'colb.motherReligion': 'mother.religion',
  'colb.totalChildrenBornAlive': 'mother.totalBornAlive',
  'colb.childrenStillLiving': 'mother.childrenStillLiving',
  'colb.childrenNowDead': 'mother.childrenNowDead',
  'colb.motherOccupation': 'mother.occupation',
  'colb.motherAgeAtBirth': 'mother.ageAtBirth',
  'colb.motherResidenceStreet': 'mother.residenceStreet',
  'colb.motherResidenceCity': 'mother.residenceCity',
  'colb.motherResidenceProvince': 'mother.residenceProvince',
  'colb.fatherFirstName': 'father.firstName',
  'colb.fatherMiddleName': 'father.middleName',
  'colb.fatherLastName': 'father.lastName',
  'colb.fatherCitizenship': 'father.citizenship',
  'colb.fatherReligion': 'father.religion',
  'colb.fatherOccupation': 'father.occupation',
  'colb.fatherAgeAtBirth': 'father.ageAtBirth',
  'colb.fatherResidenceStreet': 'father.residenceStreet',
  'colb.parentsMarriageDate': 'parents.marriageDatePlace',
  'colb.parentsMarriagePlace': 'parents.marriageDatePlace',
  'colb.parentsMarriageDatePlace': 'parents.marriageDatePlace',
  'colb.attendantType': 'attendant.type',
  'colb.attendantOtherSpecify': 'attendant.otherSpecify',
  'colb.attendantTime': 'attendant.time',
  'colb.attendantSignatureName': 'attendant.signatureName',
  'colb.attendantTitlePosition': 'attendant.titlePosition',
  'colb.attendantAddress': 'attendant.address',
  'colb.attendantDate': 'attendant.date',
  'colb.informantSignatureName': 'informant.signatureName',
  'colb.informantRelationship': 'informant.relationship',
  'colb.informantAddress': 'informant.address',
  'colb.informantDate': 'informant.date',
  'colb.preparedByName': 'registry.preparedByName',
  'colb.preparedByTitle': 'registry.preparedByTitle',
  'colb.receivedByName': 'registry.receivedByName',
  'colb.receivedByTitle': 'registry.receivedByTitle',
  'colb.receivedByDate': 'registry.receivedByDate',
  'colb.registeredByName': 'registry.registeredByName',
  'colb.registeredByTitle': 'registry.registeredByTitle',
  'colb.registeredByDate': 'registry.registeredByDate',
  'colb.paternityFatherName': 'paternity.fatherCtc',
  'colb.paternityMotherName': 'paternity.fatherCtc',
  'colb.paternityChildName': 'paternity.fatherCtc',
  'colb.affidavitPaternityFatherCtc': 'paternity.fatherCtc',
  'colb.affidavitPaternityAdminOfficer': 'paternity.adminOfficer',
  'colb.delayedAffiantName': 'delayed.affiantName',
  'colb.delayedReason': 'delayed.reason',
};

function getFontCss(family: PdfFontFamily): string {
  switch (family) {
    case 'Courier':
      return '"Courier New", Courier, monospace';
    case 'TimesRoman':
      return '"Times New Roman", Times, serif';
    case 'Helvetica':
    case 'HelveticaBold':
    default:
      return '"Helvetica Neue", Helvetica, Arial, sans-serif';
  }
}

export const PdfMapperPreview: React.FC<PdfMapperPreviewProps> = ({
  certificateType = 'birth',
  birthData,
  marriageData,
  colbPage,
  blankMode = false,
  previewDataOnly = false,
  activeBindingField,
  onSelectBindingField,
  onOpenFieldMapper,
  showMapperBar = true,
}) => {
  const templateId = certificateType === 'marriage' ? 'ph-com-97' : 'ph-colb-102';
  const [config, setConfig] = useState<PdfTemplateConfig>(() => getStoredConfig(templateId));
  const [calibratePins, setCalibratePins] = useState<boolean>(false);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [draggingFieldId, setDraggingFieldId] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState<boolean>(false);
  const [mapperNotice, setMapperNotice] = useState<string | null>(null);
  const sheetRefs = useRef<Record<number, HTMLDivElement | null>>({});

  useEffect(() => {
    setConfig(getStoredConfig(templateId));
    setSelectedFieldId(null);
  }, [templateId]);

  useEffect(() => {
    const handleConfigUpdate = (ev: Event) => {
      const detail = (ev as CustomEvent<PdfTemplateConfig>).detail;
      if (detail && detail.templateId === templateId) {
        setConfig(detail);
      } else {
        setConfig(getStoredConfig(templateId));
      }
    };
    window.addEventListener(PDF_CONFIG_UPDATED_EVENT, handleConfigUpdate);
    return () => window.removeEventListener(PDF_CONFIG_UPDATED_EVENT, handleConfigUpdate);
  }, [templateId]);

  const flashNotice = (msg: string) => {
    setMapperNotice(msg);
    setTimeout(() => setMapperNotice(null), 2200);
  };

  const updateSelectedField = (updates: Partial<PdfTemplateFieldMapping>) => {
    if (!selectedFieldId) return;
    setConfig((prev) => {
      const next: PdfTemplateConfig = {
        ...prev,
        fields: prev.fields.map((f) => (f.id === selectedFieldId ? { ...f, ...updates } : f)),
      };
      saveConfigToStorage(next);
      return next;
    });
  };

  const handleSheetMouseMove = (
    e: React.MouseEvent<HTMLDivElement>,
    pageIndex: number,
    dimWidth: number,
    dimHeight: number
  ) => {
    if (!calibratePins || !draggingFieldId) return;
    const sheetEl = sheetRefs.current[pageIndex];
    if (!sheetEl) return;
    const rect = sheetEl.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const pdfX = Math.max(0, Math.min(dimWidth, Math.round((clickX / rect.width) * dimWidth)));
    const pdfY = Math.max(0, Math.min(dimHeight, Math.round((1 - clickY / rect.height) * dimHeight)));

    setConfig((prev) => ({
      ...prev,
      fields: prev.fields.map((f) =>
        f.id === draggingFieldId && (f.pageIndex ?? 0) === pageIndex ? { ...f, x: pdfX, y: pdfY } : f
      ),
    }));
  };

  const handleSheetMouseUp = () => {
    if (!draggingFieldId) return;
    setDraggingFieldId(null);
    saveConfigToStorage(config);
  };

  const pagesToRender =
    colbPage === 'both' ? [0, 1] : colbPage === 'page2' ? [1] : [0];

  const selectedField = config.fields.find((f) => f.id === selectedFieldId) || null;

  return (
    <div className="flex flex-col items-center gap-4 w-[612px]" onMouseUp={handleSheetMouseUp}>
      {showMapperBar && (
        <div className="no-print w-full bg-white rounded-lg border border-slate-300 shadow-xs px-3 py-2 space-y-2 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 font-bold text-[#1E3A8A]">
                <Sliders className="w-3.5 h-3.5 text-[#1D4ED8]" />
                <span>PDF Mapper Active</span>
              </span>
              <span className="text-[11px] font-mono text-slate-500">
                612 &times; 936 pt &bull; {config.fields.length} mapped fields
              </span>
              {mapperNotice && (
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {mapperNotice}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setCalibratePins((prev) => !prev);
                  if (calibratePins) {
                    setDraggingFieldId(null);
                  }
                }}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md border text-[11px] font-semibold transition-colors ${
                  calibratePins
                    ? 'bg-[#1D4ED8] text-white border-[#1D4ED8]'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-300'
                }`}
              >
                <Crosshair className="w-3.5 h-3.5" />
                <span>{calibratePins ? 'Calibrate Pins: ON' : 'Calibrate Pins'}</span>
              </button>

              {onOpenFieldMapper && (
                <button
                  type="button"
                  onClick={onOpenFieldMapper}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-800 text-[11px] font-semibold transition-colors"
                >
                  <Sliders className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Full Studio</span>
                </button>
              )}
            </div>
          </div>

          {calibratePins && (
            <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 bg-slate-50/80 -mx-3 -mb-2 px-3 py-2 rounded-b-lg">
              {selectedField ? (
                <>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-bold text-slate-900 truncate max-w-[170px]">
                      {selectedField.label}
                    </span>
                    <span className="font-mono text-[10px] text-slate-500">
                      P{(selectedField.pageIndex ?? 0) + 1} ({selectedField.x}, {selectedField.y} pt)
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <label className="inline-flex items-center gap-1 text-[10px] font-mono text-slate-700">
                      <Move className="w-3 h-3 text-slate-500" />
                      X:
                      <input
                        type="number"
                        value={selectedField.x}
                        onChange={(e) => updateSelectedField({ x: Number(e.target.value) })}
                        className="w-12 px-1 py-0.5 bg-white border border-slate-300 rounded text-center"
                      />
                    </label>
                    <label className="inline-flex items-center gap-1 text-[10px] font-mono text-slate-700">
                      Y:
                      <input
                        type="number"
                        value={selectedField.y}
                        onChange={(e) => updateSelectedField({ y: Number(e.target.value) })}
                        className="w-12 px-1 py-0.5 bg-white border border-slate-300 rounded text-center"
                      />
                    </label>
                    <label className="inline-flex items-center gap-1 text-[10px] font-mono text-slate-700">
                      Pt:
                      <input
                        type="number"
                        step={0.5}
                        min={6}
                        max={24}
                        value={selectedField.fontSize}
                        onChange={(e) => updateSelectedField({ fontSize: Number(e.target.value) })}
                        className="w-11 px-1 py-0.5 bg-white border border-slate-300 rounded text-center"
                      />
                    </label>
                    <label className="inline-flex items-center gap-1 text-[10px] font-mono text-slate-700">
                      W:
                      <input
                        type="number"
                        step={5}
                        min={10}
                        max={550}
                        value={selectedField.maxWidth}
                        onChange={(e) => updateSelectedField({ maxWidth: Number(e.target.value) })}
                        className="w-12 px-1 py-0.5 bg-white border border-slate-300 rounded text-center"
                      />
                    </label>

                    <div className="flex items-center bg-white border border-slate-300 rounded overflow-hidden">
                      {(['left', 'center', 'right'] as PdfTextAlign[]).map((align) => (
                        <button
                          key={align}
                          type="button"
                          onClick={() => updateSelectedField({ textAlign: align })}
                          className={`p-1 ${
                            selectedField.textAlign === align
                              ? 'bg-[#1D4ED8] text-white'
                              : 'text-slate-600 hover:bg-slate-100'
                          }`}
                          title={`Align ${align}`}
                        >
                          {align === 'left' ? (
                            <AlignLeft className="w-3 h-3" />
                          ) : align === 'center' ? (
                            <AlignCenter className="w-3 h-3" />
                          ) : (
                            <AlignRight className="w-3 h-3" />
                          )}
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        saveConfigToStorage(config);
                        flashNotice('Saved coordinates');
                      }}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-700 hover:bg-emerald-800 text-white text-[10px] font-semibold"
                    >
                      <Save className="w-3 h-3" />
                      <span>Save</span>
                    </button>

                    {!confirmReset ? (
                      <button
                        type="button"
                        onClick={() => setConfirmReset(true)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white hover:bg-amber-50 border border-slate-300 text-slate-700 text-[10px] font-semibold"
                        title="Reset all coordinates to default"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Reset</span>
                      </button>
                    ) : (
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            const def = resetConfigInStorage(config.templateId);
                            setConfig(def);
                            setConfirmReset(false);
                            flashNotice('Reset to default coordinates');
                          }}
                          className="px-2 py-0.5 rounded bg-rose-600 text-white text-[10px] font-semibold"
                        >
                          Confirm Reset
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmReset(false)}
                          className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 text-[10px]"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="w-full flex items-center justify-between text-[11px] text-slate-600">
                  <span>Click or drag any mapped field box on the PDF below to calibrate coordinates.</span>
                  <button
                    type="button"
                    onClick={() => {
                      const def = resetConfigInStorage(config.templateId);
                      setConfig(def);
                      flashNotice('Reset to default coordinates');
                    }}
                    className="inline-flex items-center gap-1 text-slate-700 hover:text-slate-900 font-semibold"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset Defaults</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {pagesToRender.map((pageIndex) => {
        const dim = config.pageDimensions[pageIndex] || {
          pageIndex,
          width: 612,
          height: 936,
          unit: 'pt' as const,
        };
        const pageFields = config.fields.filter((f) => (f.pageIndex ?? 0) === pageIndex);

        return (
          <div
            key={pageIndex}
            data-cert-sheet={pageIndex === 0 ? 'page1' : 'page2'}
            ref={(el) => {
              sheetRefs.current[pageIndex] = el;
            }}
            onMouseMove={(e) => handleSheetMouseMove(e, pageIndex, dim.width, dim.height)}
            onMouseLeave={handleSheetMouseUp}
            onClick={(e) => {
              if (calibratePins && selectedFieldId && e.altKey) {
                const sheetEl = sheetRefs.current[pageIndex];
                if (!sheetEl) return;
                const rect = sheetEl.getBoundingClientRect();
                const pdfX = Math.round(((e.clientX - rect.left) / rect.width) * dim.width);
                const pdfY = Math.round((1 - (e.clientY - rect.top) / rect.height) * dim.height);
                updateSelectedField({ x: pdfX, y: pdfY });
                flashNotice(`Moved to (${pdfX}, ${pdfY})`);
              }
            }}
            style={{ width: `${dim.width}px`, height: `${dim.height}px` }}
            className={`relative bg-white shadow-[0_6px_24px_rgba(15,23,42,0.14)] ring-1 ring-slate-300/90 rounded-[2px] overflow-hidden shrink-0 ${
              previewDataOnly ? 'screen-print-data-only' : ''
            }`}
          >
            {/* Official PDF Page Background (hidden in data-only pre-templated mode) */}
            <PdfPageCanvas
              pdfPath={config.pdfPath}
              pageIndex={pageIndex}
              width={dim.width}
              height={dim.height}
              hidden={previewDataOnly}
            />

            {/* Mapped Data Overlays at Exact Configured PDF Coordinates */}
            {pageFields.map((field) => {
              const value = blankMode
                ? ''
                : certificateType === 'marriage' && marriageData
                ? resolveMarriageFieldValue(field, marriageData)
                : birthData
                ? resolveFieldValue(field, birthData)
                : '';
              const isSelected = selectedFieldId === field.id;
              const bindingId =
                certificateType === 'birth' ? BINDING_ID_BY_DATAPATH[field.dataPath] : undefined;
              const isFormActive = Boolean(activeBindingField && bindingId === activeBindingField);
              const baseFontSize = field.fontSize || 10;
              const maxWidth = field.maxWidth || 160;
              const fontSize =
                !field.isCheckbox && value
                  ? field.allowWrap
                    ? fitWrappedFontSize(
                        value,
                        field.fontFamily,
                        baseFontSize,
                        maxWidth,
                        field.maxLines || 2,
                        field.minFontSize || 5.5
                      )
                    : fitFontSizeToWidth(
                        value,
                        field.fontFamily,
                        baseFontSize,
                        maxWidth,
                        field.minFontSize || 5.5
                      )
                  : baseFontSize;

              // PDF Y=0 is bottom baseline; position top relative to ascent so single/multi-line text sits cleanly on the line
              const baselineAscent = Math.round(fontSize * 0.85 * 10) / 10;
              const topPx = dim.height - field.y - baselineAscent;

              const horizontalTransform = field.isCheckbox
                ? 'translateX(-50%)'
                : field.textAlign === 'center'
                ? 'translateX(-50%)'
                : field.textAlign === 'right'
                ? 'translateX(-100%)'
                : 'none';

              return (
                <div
                  key={field.id}
                  onMouseDown={(e) => {
                    if (calibratePins) {
                      e.stopPropagation();
                      setSelectedFieldId(field.id);
                      setDraggingFieldId(field.id);
                    }
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (calibratePins) {
                      setSelectedFieldId(field.id);
                    } else if (bindingId && onSelectBindingField) {
                      onSelectBindingField(bindingId);
                    }
                  }}
                  style={{
                    left: `${field.x}px`,
                    top: `${topPx}px`,
                    width: field.isCheckbox ? `${Math.max(14, maxWidth)}px` : `${maxWidth}px`,
                    transform: horizontalTransform,
                  }}
                  className={`absolute z-20 ${
                    calibratePins
                      ? `cursor-move select-none ${
                          isSelected
                            ? 'ring-2 ring-[#1D4ED8] bg-blue-500/15 z-30'
                            : value
                            ? 'ring-1 ring-sky-400/80 bg-sky-100/20 hover:ring-sky-600'
                            : 'ring-1 ring-sky-500/75 bg-transparent hover:ring-sky-600'
                        }`
                      : bindingId && onSelectBindingField
                      ? `cursor-pointer ${
                          isFormActive
                            ? 'ring-1 ring-emerald-500 bg-emerald-100/40 rounded-[2px]'
                            : 'hover:bg-blue-50/40 rounded-[2px]'
                        }`
                      : 'pointer-events-none'
                  }`}
                  title={
                    calibratePins
                      ? `${field.label} (${field.x}, ${field.y} pt)`
                      : value || field.label
                  }
                >
                  {value ? (
                    <span
                      data-print-value="true"
                      style={{
                        fontSize: `${fontSize}px`,
                        lineHeight: field.allowWrap ? `${field.lineHeightMultiplier || 1.15}` : '1.1',
                        fontFamily: getFontCss(field.fontFamily),
                        fontWeight:
                          field.fontFamily === 'HelveticaBold' || field.isCheckbox ? 700 : 500,
                        textAlign: field.isCheckbox ? 'center' : field.textAlign || 'left',
                      }}
                      className={`block text-slate-950 overflow-hidden ${
                        field.allowWrap ? 'break-words' : 'whitespace-nowrap'
                      }`}
                    >
                      {field.isCheckbox ? 'X' : value}
                    </span>
                  ) : calibratePins ? (
                    <span
                      style={{ height: `${Math.max(10, Math.round(baseFontSize * 1.1))}px` }}
                      className="block"
                      aria-hidden="true"
                    />
                  ) : null}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};
