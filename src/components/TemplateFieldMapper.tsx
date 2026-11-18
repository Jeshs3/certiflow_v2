/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  PdfTemplateConfig,
  PdfTemplateFieldMapping,
  PdfFontFamily,
} from '../types/pdfMapping';
import {
  getStoredConfig,
  saveConfigToStorage,
  resetConfigInStorage,
  resolveFieldValue,
  resolveMarriageFieldValue,
} from '../services/pdfGenerationService';
import { SAMPLE_BIRTH_DATA, SAMPLE_MARRIAGE_DATA } from '../utils/sampleData';
import { BirthCertificateData, MarriageCertificateData } from '../types/certificate';
import { PdfPageCanvas } from './PdfPageCanvas';
import { IconTooltip } from './IconTooltip';
import { fitFontSizeToWidth, fitWrappedFontSize } from '../utils/textFit';
import {
  Sliders,
  ZoomIn,
  ZoomOut,
  Save,
  RotateCcw,
  CheckCircle2,
  Eye,
  Plus,
  Trash2,
  ChevronLeft,
  Search,
  Move,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Ruler,
} from 'lucide-react';

interface TemplateFieldMapperProps {
  onBackToApp?: () => void;
  birthData?: BirthCertificateData;
  marriageData?: MarriageCertificateData;
  initialTemplateId?: 'ph-colb-102' | 'ph-com-97';
}

export const TemplateFieldMapper: React.FC<TemplateFieldMapperProps> = ({
  onBackToApp,
  birthData,
  marriageData,
  initialTemplateId = 'ph-colb-102',
}) => {
  const [templateId, setTemplateId] = useState<'ph-colb-102' | 'ph-com-97'>(initialTemplateId);
  const [config, setConfig] = useState<PdfTemplateConfig>(() => getStoredConfig(initialTemplateId));
  const [activePageIndex, setActivePageIndex] = useState<number>(0);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showSampleValues, setShowSampleValues] = useState<boolean>(true);
  const [useLiveData, setUseLiveData] = useState<boolean>(
    initialTemplateId === 'ph-com-97' ? Boolean(marriageData) : Boolean(birthData)
  );
  const [zoom, setZoom] = useState<number>(100);
  const [confirmReset, setConfirmReset] = useState<boolean>(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  // Dragging & cursor coordinates state
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  const [saveToast, setSaveToast] = useState<string | null>(null);

  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const isMarriageTemplate = templateId === 'ph-com-97';
  const hasLiveData = isMarriageTemplate ? Boolean(marriageData) : Boolean(birthData);
  const activeBirthData = useLiveData && birthData ? birthData : SAMPLE_BIRTH_DATA;
  const activeMarriageData = useLiveData && marriageData ? marriageData : SAMPLE_MARRIAGE_DATA;

  const handleSwitchTemplate = (nextId: 'ph-colb-102' | 'ph-com-97') => {
    setTemplateId(nextId);
    setConfig(getStoredConfig(nextId));
    setActivePageIndex(0);
    setSelectedFieldId(null);
    setSelectedCategory('all');
    setSearchQuery('');
    setConfirmReset(false);
    setPendingDeleteId(null);
    setUseLiveData(nextId === 'ph-com-97' ? Boolean(marriageData) : Boolean(birthData));
  };

  const currentPageDim = config.pageDimensions[activePageIndex] || {
    width: 612,
    height: 936,
    unit: 'pt',
  };

  const selectedField = config.fields.find((f) => f.id === selectedFieldId) || null;

  // Filter fields for current page & inspector list
  const pageFields = config.fields.filter((f) => (f.pageIndex ?? 0) === activePageIndex);
  const filteredFields = pageFields.filter((f) => {
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      f.label.toLowerCase().includes(q) ||
      f.fieldName.toLowerCase().includes(q) ||
      f.dataPath.toLowerCase().includes(q);
    const matchesCategory = selectedCategory === 'all' || f.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Automatically select first field when switching page or template
  useEffect(() => {
    if ((!selectedFieldId || !pageFields.some((f) => f.id === selectedFieldId)) && pageFields.length > 0) {
      setSelectedFieldId(pageFields[0].id);
    }
  }, [activePageIndex, pageFields, selectedFieldId]);

  const notifyToast = (msg: string) => {
    setSaveToast(msg);
    setTimeout(() => setSaveToast(null), 2600);
  };

  const updateSelectedField = (updates: Partial<PdfTemplateFieldMapping>) => {
    if (!selectedFieldId) return;
    setConfig((prev) => {
      const updatedFields = prev.fields.map((f) =>
        f.id === selectedFieldId ? { ...f, ...updates } : f
      );
      const newConfig = { ...prev, fields: updatedFields };
      saveConfigToStorage(newConfig);
      return newConfig;
    });
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!canvasContainerRef.current) return;
    const rect = canvasContainerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const pdfX = Math.max(0, Math.min(currentPageDim.width, Math.round((clickX / rect.width) * currentPageDim.width)));
    const pdfY = Math.max(0, Math.min(currentPageDim.height, Math.round((1 - clickY / rect.height) * currentPageDim.height)));

    setCursorPos({ x: pdfX, y: pdfY });

    if (e.altKey && selectedFieldId) {
      updateSelectedField({ x: pdfX, y: pdfY });
      notifyToast(`Updated ${selectedField?.label} to (${pdfX}, ${pdfY}) pt`);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!canvasContainerRef.current) return;
    const rect = canvasContainerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const pdfX = Math.max(0, Math.min(currentPageDim.width, Math.round((mouseX / rect.width) * currentPageDim.width)));
    const pdfY = Math.max(0, Math.min(currentPageDim.height, Math.round((1 - mouseY / rect.height) * currentPageDim.height)));
    setCursorPos({ x: pdfX, y: pdfY });

    if (isDragging && selectedFieldId) {
      updateSelectedField({ x: pdfX, y: pdfY });
    }
  };

  const handleSaveToStorage = () => {
    saveConfigToStorage(config);
    notifyToast('Mapping saved');
  };

  const handleResetDefaults = () => {
    const def = resetConfigInStorage(config.templateId);
    setConfig(def);
    setConfirmReset(false);
    notifyToast('Reset to defaults');
  };

  const handleAddNewField = () => {
    const newFieldId = `field_${Date.now()}`;
    const newField: PdfTemplateFieldMapping = {
      id: newFieldId,
      fieldName: `customField_${pageFields.length + 1}`,
      label: `Custom Field ${pageFields.length + 1}`,
      category: 'registry',
      pageIndex: activePageIndex,
      x: Math.round(currentPageDim.width / 2),
      y: Math.round(currentPageDim.height / 2),
      fontSize: 9,
      minFontSize: 5.5,
      maxWidth: 160,
      textAlign: 'left',
      fontFamily: 'HelveticaBold',
      dataPath: isMarriageTemplate ? 'com.remarksAnnotation' : 'colb.remarksAnnotation',
      sampleValue: 'SAMPLE TEXT',
    };

    setConfig((prev) => {
      const next = { ...prev, fields: [...prev.fields, newField] };
      saveConfigToStorage(next);
      return next;
    });
    setSelectedFieldId(newFieldId);
    notifyToast('Added new field');
  };

  const handleDeleteField = (id: string) => {
    setConfig((prev) => {
      const next = { ...prev, fields: prev.fields.filter((f) => f.id !== id) };
      saveConfigToStorage(next);
      return next;
    });
    setSelectedFieldId(null);
    setPendingDeleteId(null);
    notifyToast('Field removed');
  };

  const categories: { id: string; label: string }[] = isMarriageTemplate
    ? [
        { id: 'all', label: 'All Categories' },
        { id: 'header', label: 'Header & Registry' },
        { id: 'husband', label: 'Husband (1-7)' },
        { id: 'husband_parents', label: 'Husband Parents/Consent (8-14)' },
        { id: 'wife', label: 'Wife (1-7)' },
        { id: 'wife_parents', label: 'Wife Parents/Consent (8-14)' },
        { id: 'ceremony', label: 'Ceremony & Parties (15-18)' },
        { id: 'solemnizing', label: 'Solemnizing Officer (19)' },
        { id: 'witnesses', label: 'Witnesses (20a)' },
        { id: 'registry', label: 'Civil Registrar (21-22)' },
        { id: 'page2_witnesses', label: 'Witnesses (Page 2)' },
        { id: 'page2_solemnizing_affidavit', label: 'Officer Affidavit (P2)' },
        { id: 'page2_delayed_marriage', label: 'Delayed Reg (Page 2)' },
      ]
    : [
        { id: 'all', label: 'All Categories' },
        { id: 'header', label: 'Header & Registry' },
        { id: 'child', label: 'Child (1-6)' },
        { id: 'mother', label: 'Mother (7-13)' },
        { id: 'father', label: 'Father (14-19)' },
        { id: 'marriage', label: 'Marriage (20)' },
        { id: 'attendant', label: 'Attendant (21)' },
        { id: 'informant', label: 'Informant (22)' },
        { id: 'registry', label: 'Civil Registrar (23-25)' },
        { id: 'page2_paternity', label: 'Paternity (Page 2)' },
        { id: 'page2_delayed', label: 'Delayed Reg (Page 2)' },
      ];

  const widthInches = (currentPageDim.width / 72).toFixed(1);
  const heightInches = (currentPageDim.height / 72).toFixed(1);
  const widthMm = ((currentPageDim.width / 72) * 25.4).toFixed(1);
  const heightMm = ((currentPageDim.height / 72) * 25.4).toFixed(1);

  return (
    <div className="flex flex-col min-h-[calc(100vh-64px)] bg-slate-950 text-slate-100 font-helvetica">
      {/* Clean Minimal Top Bar */}
      <header className="bg-slate-950 border-b border-slate-800 px-4 py-2.5 flex flex-wrap items-center justify-between gap-4 sticky top-16 z-30">
        {/* Left: Back + Title */}
        <div className="flex items-center gap-3 shrink-0">
          {onBackToApp && (
            <button
              type="button"
              onClick={onBackToApp}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          )}

          <div className="flex items-center gap-2.5 whitespace-nowrap">
            <div className="w-8 h-8 rounded-md bg-[#1D4ED8]/20 border border-[#1D4ED8]/40 flex items-center justify-center text-blue-400">
              <Sliders className="w-4 h-4" />
            </div>
            <h1 className="text-base font-bold text-white tracking-tight">
              Mapper Studio
            </h1>
          </div>
        </div>

        {/* Center: Template & Page Switchers */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-slate-900 p-0.5 rounded-md border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => handleSwitchTemplate('ph-colb-102')}
              className={`px-3 py-1 rounded text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                templateId === 'ph-colb-102'
                  ? 'bg-[#1D4ED8] text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Form 102 (Birth)
            </button>
            <button
              type="button"
              onClick={() => handleSwitchTemplate('ph-com-97')}
              className={`px-3 py-1 rounded text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                templateId === 'ph-com-97'
                  ? 'bg-[#1D4ED8] text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Form 97 (Marriage)
            </button>
          </div>

          <div className="flex items-center bg-slate-900 p-0.5 rounded-md border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setActivePageIndex(0)}
              className={`px-3 py-1 rounded text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activePageIndex === 0
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Page 1 (Front)
            </button>
            <button
              type="button"
              onClick={() => setActivePageIndex(1)}
              className={`px-3 py-1 rounded text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activePageIndex === 1
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Page 2 (Affidavits)
            </button>
          </div>
        </div>

        {/* Right: Save & Reset Icon Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <IconTooltip label="Save Mapping" placement="bottom" align="right">
            <button
              type="button"
              onClick={handleSaveToStorage}
              aria-label="Save Mapping"
              className="inline-flex items-center justify-center w-9 h-9 rounded-md bg-[#1D4ED8] hover:bg-blue-600 text-white transition-colors cursor-pointer"
            >
              <Save className="w-4 h-4" />
            </button>
          </IconTooltip>

          {!confirmReset ? (
            <IconTooltip label="Reset to Defaults" placement="bottom" align="right">
              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                aria-label="Reset to Defaults"
                className="inline-flex items-center justify-center w-9 h-9 rounded-md bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-amber-400 border border-slate-800 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </IconTooltip>
          ) : (
            <div className="inline-flex items-center gap-1.5 bg-slate-900 border border-amber-500/60 rounded-md px-2.5 py-1 text-xs">
              <span className="text-amber-300 font-medium whitespace-nowrap">Reset?</span>
              <button
                type="button"
                onClick={handleResetDefaults}
                className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-500 text-white font-semibold cursor-pointer"
              >
                Yes
              </button>
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
              >
                No
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Save Feedback Toast */}
      {saveToast && (
        <div className="fixed top-20 right-6 z-50">
          <div className="bg-emerald-600 text-white text-xs font-semibold px-3.5 py-2 rounded-md shadow-lg flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{saveToast}</span>
          </div>
        </div>
      )}

      {/* Workspace Grid: PDF Overlay Canvas (Left) + Clean Bind & Position Studio (Right) */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-hidden">
        {/* LEFT COLUMN: PDF CANVAS */}
        <div className="lg:col-span-7 bg-slate-950 flex flex-col border-b lg:border-b-0 lg:border-r border-slate-800 overflow-hidden">
          <div className="bg-slate-900/70 border-b border-slate-800 px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300">
            <div className="flex items-center gap-4 flex-wrap">
              <span className="font-semibold text-white flex items-center gap-1.5 whitespace-nowrap">
                <Eye className="w-3.5 h-3.5 text-blue-400" />
                PDF Canvas
              </span>

              <label className="inline-flex items-center gap-1.5 cursor-pointer select-none whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={showSampleValues}
                  onChange={(e) => setShowSampleValues(e.target.checked)}
                  className="rounded text-[#1D4ED8] focus:ring-0 bg-slate-800 border-slate-700"
                />
                <span className="text-xs text-slate-300">Show Values</span>
              </label>

              {hasLiveData && (
                <label className="inline-flex items-center gap-1.5 cursor-pointer select-none whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={useLiveData}
                    onChange={(e) => setUseLiveData(e.target.checked)}
                    className="rounded text-[#1D4ED8] focus:ring-0 bg-slate-800 border-slate-700"
                  />
                  <span className="text-xs text-blue-300">Active Form Data</span>
                </label>
              )}
            </div>

            {/* Cursor Coordinates & Zoom */}
            <div className="flex items-center gap-2.5 font-mono tabular-nums text-xs">
              {cursorPos && (
                <span className="text-slate-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-800 whitespace-nowrap">
                  X {cursorPos.x} · Y {cursorPos.y} pt
                </span>
              )}
              <div className="flex items-center bg-slate-900 rounded border border-slate-800">
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(z - 10, 60))}
                  aria-label="Zoom out"
                  className="px-2 py-1 text-slate-300 hover:text-white cursor-pointer"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="px-1.5 text-[11px] text-slate-300">{zoom}%</span>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(z + 10, 160))}
                  aria-label="Zoom in"
                  className="px-2 py-1 text-slate-300 hover:text-white cursor-pointer"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          <div
            className="flex-1 overflow-auto p-4 sm:p-6 flex items-start justify-center bg-slate-900/40"
            onMouseUp={() => setIsDragging(false)}
          >
            <div
              style={{
                transform: `scale(${zoom / 100})`,
                transformOrigin: 'top center',
                transition: 'transform 0.15s ease-out',
              }}
            >
              <div
                ref={canvasContainerRef}
                onClick={handleCanvasClick}
                onMouseMove={handleMouseMove}
                onMouseDown={() => setIsDragging(true)}
                onMouseUp={() => setIsDragging(false)}
                className="relative bg-white shadow-2xl rounded-sm border border-slate-700 select-none cursor-crosshair overflow-hidden"
                style={{
                  width: `${currentPageDim.width}px`,
                  height: `${currentPageDim.height}px`,
                  aspectRatio: `${currentPageDim.width} / ${currentPageDim.height}`,
                }}
              >
                <PdfPageCanvas
                  pdfPath={config.pdfPath}
                  pageIndex={activePageIndex}
                  width={currentPageDim.width}
                  height={currentPageDim.height}
                />

                {pageFields.map((field) => {
                  const isSelected = field.id === selectedFieldId;
                  const cssLeft = field.x;
                  const cssTop = currentPageDim.height - field.y;
                  const resolvedDisplay =
                    useLiveData && hasLiveData
                      ? isMarriageTemplate
                        ? resolveMarriageFieldValue(field, activeMarriageData)
                        : resolveFieldValue(field, activeBirthData)
                      : field.sampleValue || '';
                  const boxWidth = field.maxWidth || 80;
                  const baseFontSize = field.fontSize || 10;
                  const fittedFontSize =
                    !field.isCheckbox && resolvedDisplay
                      ? field.allowWrap
                        ? fitWrappedFontSize(
                            resolvedDisplay,
                            field.fontFamily,
                            baseFontSize,
                            boxWidth,
                            field.maxLines || 2,
                            field.minFontSize || 5.5
                          )
                        : fitFontSizeToWidth(
                            resolvedDisplay,
                            field.fontFamily,
                            baseFontSize,
                            boxWidth,
                            field.minFontSize || 5.5
                          )
                      : baseFontSize;

                  return (
                    <div
                      key={field.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFieldId(field.id);
                      }}
                      className={`absolute transition-colors cursor-pointer ${
                        isSelected
                          ? 'z-40 ring-2 ring-[#1D4ED8] bg-blue-500/20'
                          : 'z-20 hover:ring-1 hover:ring-blue-400 hover:bg-blue-500/10'
                      }`}
                      style={{
                        left: `${cssLeft}px`,
                        top: `${cssTop}px`,
                        width: `${boxWidth}px`,
                        transform:
                          field.textAlign === 'center'
                            ? 'translateX(-50%) translateY(-100%)'
                            : field.textAlign === 'right'
                            ? 'translateX(-100%) translateY(-100%)'
                            : 'translateY(-100%)',
                      }}
                      title={`${field.label} (${field.x}, ${field.y}) pt`}
                    >
                      <div
                        className={`border-b-2 ${
                          isSelected ? 'border-[#1D4ED8]' : 'border-sky-500/70'
                        }`}
                      >
                        {showSampleValues ? (
                          <div
                            className={`font-bold leading-tight select-none overflow-hidden ${
                              field.allowWrap ? 'break-words' : 'whitespace-nowrap'
                            } ${field.isCheckbox ? 'text-center font-black' : ''} ${
                              isSelected
                                ? 'text-blue-950 bg-blue-100/90'
                                : resolvedDisplay
                                ? 'text-slate-950 bg-white/80'
                                : 'bg-transparent'
                            }`}
                            style={{
                              fontSize: `${fittedFontSize}px`,
                              textAlign: field.textAlign || 'left',
                              fontFamily:
                                field.fontFamily === 'Courier'
                                  ? 'monospace'
                                  : field.fontFamily === 'TimesRoman'
                                  ? 'serif'
                                  : 'sans-serif',
                            }}
                          >
                            {field.isCheckbox
                              ? useLiveData && hasLiveData
                                ? resolvedDisplay || '\u00A0'
                                : 'X'
                              : resolvedDisplay || '\u00A0'}
                          </div>
                        ) : (
                          <span
                            className={`text-[8px] font-mono px-1 rounded font-bold truncate block ${
                              isSelected ? 'bg-[#1D4ED8] text-white' : 'bg-slate-800 text-slate-200'
                            }`}
                          >
                            {field.fieldName}
                          </span>
                        )}
                      </div>

                      {isSelected && (
                        <div className="absolute -top-4 -left-0.5 bg-[#1D4ED8] text-white font-mono tabular-nums text-[8px] font-bold px-1 rounded shadow-xs pointer-events-none whitespace-nowrap">
                          {field.x}, {field.y}
                        </div>
                      )}
                    </div>
                  );
                })}

                {cursorPos && (
                  <>
                    <div
                      className="absolute left-0 right-0 border-t border-dashed border-blue-400/35 pointer-events-none"
                      style={{ top: `${currentPageDim.height - cursorPos.y}px` }}
                    />
                    <div
                      className="absolute top-0 bottom-0 border-l border-dashed border-blue-400/35 pointer-events-none"
                      style={{ left: `${cursorPos.x}px` }}
                    />
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: PAGE DIMENSIONS + BIND SETTINGS + FIELD LIST */}
        <div className="lg:col-span-5 bg-slate-900 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            {/* Page Dimension Measurement (Inside & Above Bind Setting) */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                <Ruler className="w-3.5 h-3.5 text-blue-400" />
                <span>Page Dimensions</span>
              </span>
              <div className="text-xs font-mono tabular-nums text-slate-200">
                <span className="font-semibold text-white">
                  {currentPageDim.width} &times; {currentPageDim.height} pt
                </span>
                <span className="text-slate-500 mx-1.5">&middot;</span>
                <span className="text-slate-400">
                  {widthInches} &times; {heightInches} in ({widthMm} &times; {heightMm} mm)
                </span>
              </div>
            </div>

            {/* Bind Setting & Field Calibration Controls */}
            {selectedField ? (
              <div className="space-y-4 pb-5 border-b border-slate-800">
                {/* Field Header & Binding Path */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <div className="text-xs text-slate-400">
                      <span>{selectedField.category}</span>
                      <span className="mx-1.5">&middot;</span>
                      <span className="tabular-nums">Page {(selectedField.pageIndex ?? 0) + 1}</span>
                    </div>
                    <h2 className="text-sm font-bold text-white truncate">{selectedField.label}</h2>
                    <div className="flex items-center gap-2 pt-0.5">
                      <span className="text-xs text-slate-400 shrink-0">Bind Key:</span>
                      <input
                        type="text"
                        value={selectedField.dataPath}
                        onChange={(e) => updateSelectedField({ dataPath: e.target.value })}
                        className="flex-1 min-w-0 px-2 py-1 text-xs font-mono bg-slate-950 border border-slate-800 rounded text-blue-300 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {pendingDeleteId === selectedField.id ? (
                    <div className="inline-flex items-center gap-1 text-xs shrink-0">
                      <button
                        type="button"
                        onClick={() => handleDeleteField(selectedField.id)}
                        className="px-2 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white font-semibold cursor-pointer"
                      >
                        Delete
                      </button>
                      <button
                        type="button"
                        onClick={() => setPendingDeleteId(null)}
                        className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <IconTooltip label="Delete Field" placement="top" align="right">
                      <button
                        type="button"
                        onClick={() => setPendingDeleteId(selectedField.id)}
                        aria-label="Delete Field"
                        className="p-1.5 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </IconTooltip>
                  )}
                </div>

                {/* X & Y Coordinates */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-300 flex items-center gap-1">
                        <Move className="w-3.5 h-3.5 text-blue-400" />
                        X Position (pt)
                      </span>
                      <span className="font-mono tabular-nums text-blue-300 font-semibold">
                        {selectedField.x}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => updateSelectedField({ x: Math.max(selectedField.x - 5, 0) })}
                        className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs font-mono tabular-nums cursor-pointer"
                      >
                        -5
                      </button>
                      <button
                        type="button"
                        onClick={() => updateSelectedField({ x: Math.max(selectedField.x - 1, 0) })}
                        className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs font-mono tabular-nums cursor-pointer"
                      >
                        -1
                      </button>
                      <input
                        type="number"
                        value={selectedField.x}
                        onChange={(e) => updateSelectedField({ x: Number(e.target.value) })}
                        className="w-full px-2 py-1 text-center font-mono tabular-nums text-xs bg-slate-950 border border-slate-800 rounded text-white focus:outline-none focus:border-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          updateSelectedField({
                            x: Math.min(selectedField.x + 1, currentPageDim.width),
                          })
                        }
                        className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs font-mono tabular-nums cursor-pointer"
                      >
                        +1
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          updateSelectedField({
                            x: Math.min(selectedField.x + 5, currentPageDim.width),
                          })
                        }
                        className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs font-mono tabular-nums cursor-pointer"
                      >
                        +5
                      </button>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={currentPageDim.width}
                      value={selectedField.x}
                      onChange={(e) => updateSelectedField({ x: Number(e.target.value) })}
                      className="w-full accent-[#1D4ED8] h-1 bg-slate-800 rounded cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-300 flex items-center gap-1">
                        <Move className="w-3.5 h-3.5 text-sky-400 rotate-90" />
                        Y Position (pt)
                      </span>
                      <span className="font-mono tabular-nums text-sky-300 font-semibold">
                        {selectedField.y}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => updateSelectedField({ y: Math.max(selectedField.y - 5, 0) })}
                        className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs font-mono tabular-nums cursor-pointer"
                      >
                        -5
                      </button>
                      <button
                        type="button"
                        onClick={() => updateSelectedField({ y: Math.max(selectedField.y - 1, 0) })}
                        className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs font-mono tabular-nums cursor-pointer"
                      >
                        -1
                      </button>
                      <input
                        type="number"
                        value={selectedField.y}
                        onChange={(e) => updateSelectedField({ y: Number(e.target.value) })}
                        className="w-full px-2 py-1 text-center font-mono tabular-nums text-xs bg-slate-950 border border-slate-800 rounded text-white focus:outline-none focus:border-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          updateSelectedField({
                            y: Math.min(selectedField.y + 1, currentPageDim.height),
                          })
                        }
                        className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs font-mono tabular-nums cursor-pointer"
                      >
                        +1
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          updateSelectedField({
                            y: Math.min(selectedField.y + 5, currentPageDim.height),
                          })
                        }
                        className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs font-mono tabular-nums cursor-pointer"
                      >
                        +5
                      </button>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={currentPageDim.height}
                      value={selectedField.y}
                      onChange={(e) => updateSelectedField({ y: Number(e.target.value) })}
                      className="w-full accent-sky-500 h-1 bg-slate-800 rounded cursor-pointer"
                    />
                  </div>
                </div>

                {/* Size, Width, Alignment */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-300 block">Font Size (pt)</label>
                    <input
                      type="number"
                      step={0.5}
                      min={5.5}
                      max={28}
                      value={selectedField.fontSize}
                      onChange={(e) => updateSelectedField({ fontSize: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded text-white font-mono tabular-nums focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-slate-300 block">Max Width (pt)</label>
                    <input
                      type="number"
                      step={5}
                      min={10}
                      max={550}
                      value={selectedField.maxWidth}
                      onChange={(e) => updateSelectedField({ maxWidth: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded text-white font-mono tabular-nums focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-slate-300 block">Alignment</label>
                    <div className="grid grid-cols-3 gap-0.5 bg-slate-950 p-0.5 rounded border border-slate-800">
                      <button
                        type="button"
                        onClick={() => updateSelectedField({ textAlign: 'left' })}
                        className={`p-1.5 rounded flex items-center justify-center cursor-pointer ${
                          selectedField.textAlign === 'left'
                            ? 'bg-[#1D4ED8] text-white'
                            : 'text-slate-400 hover:text-white'
                        }`}
                        title="Align Left"
                      >
                        <AlignLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => updateSelectedField({ textAlign: 'center' })}
                        className={`p-1.5 rounded flex items-center justify-center cursor-pointer ${
                          selectedField.textAlign === 'center'
                            ? 'bg-[#1D4ED8] text-white'
                            : 'text-slate-400 hover:text-white'
                        }`}
                        title="Align Center"
                      >
                        <AlignCenter className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => updateSelectedField({ textAlign: 'right' })}
                        className={`p-1.5 rounded flex items-center justify-center cursor-pointer ${
                          selectedField.textAlign === 'right'
                            ? 'bg-[#1D4ED8] text-white'
                            : 'text-slate-400 hover:text-white'
                        }`}
                        title="Align Right"
                      >
                        <AlignRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Font Family & Wrap */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-300 block">Font Family</label>
                    <select
                      value={selectedField.fontFamily}
                      onChange={(e) =>
                        updateSelectedField({ fontFamily: e.target.value as PdfFontFamily })
                      }
                      className="w-full px-2.5 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="Helvetica">Helvetica</option>
                      <option value="HelveticaBold">Helvetica Bold</option>
                      <option value="TimesRoman">Times Roman</option>
                      <option value="Courier">Courier</option>
                    </select>
                  </div>

                  <label className="inline-flex items-center gap-2 cursor-pointer select-none py-1.5">
                    <input
                      type="checkbox"
                      checked={Boolean(selectedField.allowWrap)}
                      onChange={(e) => updateSelectedField({ allowWrap: e.target.checked })}
                      className="rounded text-[#1D4ED8] focus:ring-0 bg-slate-950 border-slate-700"
                    />
                    <span className="text-xs text-slate-300">Allow Multi-line Wrap</span>
                  </label>
                </div>

                {/* Sample Value */}
                <div className="space-y-1">
                  <label className="text-xs text-slate-300 block">Sample Text</label>
                  <input
                    type="text"
                    value={selectedField.sampleValue || ''}
                    onChange={(e) => updateSelectedField({ sampleValue: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded text-white font-mono focus:outline-none focus:border-blue-500"
                    placeholder="Enter sample value to preview fit..."
                  />
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-slate-500 border-b border-slate-800">
                <p className="text-xs font-medium text-slate-400">
                  Click any field box on the PDF canvas or choose one below to edit its bind settings.
                </p>
              </div>
            )}

            {/* Mapped Fields Directory & Filter Controls */}
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-300">
                  Page {activePageIndex + 1} Fields ({filteredFields.length})
                </span>
                <button
                  type="button"
                  onClick={handleAddNewField}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Field</span>
                </button>
              </div>

              {/* Clean Search + Category Filter Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search field or bind key..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded text-slate-200 focus:outline-none focus:border-blue-500"
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Field List */}
              <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
                {filteredFields.map((field) => (
                  <button
                    key={field.id}
                    type="button"
                    onClick={() => setSelectedFieldId(field.id)}
                    className={`w-full text-left px-3 py-2 rounded text-xs flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                      field.id === selectedFieldId
                        ? 'bg-[#1D4ED8]/20 text-white border border-blue-500/50'
                        : 'bg-slate-950/70 hover:bg-slate-800 text-slate-300 border border-slate-800/80'
                    }`}
                  >
                    <div className="min-w-0">
                      <span className="font-semibold block truncate">{field.label}</span>
                      <span className="text-[11px] font-mono text-slate-400 truncate block">
                        {field.dataPath}
                      </span>
                    </div>
                    <span className="font-mono tabular-nums text-[11px] text-blue-300 font-semibold shrink-0">
                      {field.x}, {field.y}
                    </span>
                  </button>
                ))}

                {filteredFields.length === 0 && (
                  <p className="text-xs text-slate-500 text-center py-4">
                    No matching fields on Page {activePageIndex + 1}.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
