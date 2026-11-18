/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  BirthCertificateData,
  CertificateStyle,
  CertificateType,
  MarriageCertificateData,
} from '../types/certificate';
import { BirthCertificateTemplate } from './BirthCertificateTemplate';
import { MarriageCertificateTemplate } from './MarriageCertificateTemplate';
import { downloadCertificatePDF, printCertificate } from '../utils/certificateUtils';
import {
  Download,
  Eye,
  Maximize2,
  Minimize2,
  Printer,
  RotateCw,
  ZoomIn,
  ZoomOut,
  FileCheck2,
  Loader2,
  FileText,
  Sliders,
  Sparkles,
  Columns,
  CheckCircle2,
  X,
  Ruler,
  Calculator,
  Monitor,
  Settings,
  ArrowLeft,
} from 'lucide-react';
import { IconTooltip } from './IconTooltip';
import { generatePdfFromTemplate, downloadPdfBytes } from '../services/pdfGenerationService';
import { PdfMapperPreview } from './PdfMapperPreview';

interface CertificatePreviewProps {
  type: CertificateType;
  birthData?: BirthCertificateData;
  marriageData?: MarriageCertificateData;
  style: CertificateStyle;
  onUpdateStyle?: (updates: Partial<CertificateStyle>) => void;
  documentTitle?: string;
  activeBindingField?: string | null;
  onSelectBindingField?: (fieldId: string) => void;
  onLoadBirthDataset?: (dataset: BirthCertificateData) => void;
  onOpenFieldMapper?: () => void;
  externalFullscreen?: boolean;
  onFullscreenChange?: (open: boolean) => void;
  onPrint?: () => void;
  printDataOnly?: boolean;
  onTogglePrintDataOnly?: () => void;
  mapperMode?: boolean;
  onToggleMapperMode?: () => void;
}

export const CertificatePreview: React.FC<CertificatePreviewProps> = ({
  type,
  birthData,
  marriageData,
  style,
  onUpdateStyle,
  documentTitle = 'Sample Certificate',
  activeBindingField,
  onSelectBindingField,
  onOpenFieldMapper,
  externalFullscreen,
  onFullscreenChange,
  onPrint,
  printDataOnly = true,
  onTogglePrintDataOnly,
  mapperMode: controlledMapperMode,
  onToggleMapperMode,
}) => {
  const [zoom, setZoom] = useState<number>(100);
  const [internalFullscreen, setInternalFullscreen] = useState<boolean>(false);
  const isFullscreen = externalFullscreen !== undefined ? externalFullscreen : internalFullscreen;
  const setIsFullscreen = (next: boolean) => {
    if (onFullscreenChange) {
      onFullscreenChange(next);
    } else {
      setInternalFullscreen(next);
    }
  };
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportSuccess, setExportSuccess] = useState<boolean>(false);
  const [isPdfLibExporting, setIsPdfLibExporting] = useState<boolean>(false);

  const [internalMapperMode, setInternalMapperMode] = useState<boolean>(true);
  const mapperMode = controlledMapperMode !== undefined ? controlledMapperMode : internalMapperMode;
  const handleToggleMapperMode = () => {
    if (onToggleMapperMode) {
      onToggleMapperMode();
    } else {
      setInternalMapperMode((prev) => !prev);
    }
  };

  const isColb = type === 'birth' && style.templateId === 'ph-colb-102';
  const isCom =
    type === 'marriage' &&
    (!style.templateId ||
      style.templateId === 'ph-com-97' ||
      style.templateId === 'official-ceremonial' ||
      style.templateId === 'traditional-filipino');
  const supportsPdfMapper = isColb || isCom;
  const isMapperActive = supportsPdfMapper && mapperMode;

  const [colbPage, setColbPage] = useState<'page1' | 'page2' | 'both'>('both');
  const [showTokens, setShowTokens] = useState<boolean>(false);
  const [comparePdfMode, setComparePdfMode] = useState<boolean>(false);
  const [pdfOverlayOpacity, setPdfOverlayOpacity] = useState<number>(0); // 0 = off, 0.1 to 1 = overlay
  const [showBorderSpecs, setShowBorderSpecs] = useState<boolean>(false);
  const [showRulerGrid, setShowRulerGrid] = useState<boolean>(false);
  const [blankMode, setBlankMode] = useState<boolean>(false);
  const [previewDataOnly, setPreviewDataOnly] = useState<boolean>(false);
  const [placeholderScale, setPlaceholderScale] = useState<'large' | 'extra-large' | 'standard'>('large');
  const [showDisplayMenu, setShowDisplayMenu] = useState<boolean>(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState<boolean>(false);
  const [viewportWidth, setViewportWidth] = useState<number>(0);
  const [unscaledHeight, setUnscaledHeight] = useState<number>(0);
  const toolbarMenusRef = useRef<HTMLDivElement>(null);
  const previewViewportRef = useRef<HTMLDivElement>(null);
  const docContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showDisplayMenu && !showSettingsMenu) return;
    const handleOutside = (e: MouseEvent) => {
      if (toolbarMenusRef.current && !toolbarMenusRef.current.contains(e.target as Node)) {
        setShowDisplayMenu(false);
        setShowSettingsMenu(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [showDisplayMenu, showSettingsMenu]);

  useEffect(() => {
    const vpEl = previewViewportRef.current;
    if (!vpEl || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setViewportWidth(entry.contentRect.width);
      }
    });
    ro.observe(vpEl);
    setViewportWidth(vpEl.clientWidth);
    return () => ro.disconnect();
  }, [comparePdfMode]);

  useEffect(() => {
    const docEl = docContentRef.current;
    if (!docEl || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setUnscaledHeight(entry.contentRect.height);
      }
    });
    ro.observe(docEl);
    setUnscaledHeight(docEl.scrollHeight);
    return () => ro.disconnect();
  }, [colbPage, placeholderScale, showRulerGrid, comparePdfMode, type, style.pageOrientation, isMapperActive]);

  const placeholderConfig = {
    large: {
      portraitWidth: '850px',
      landscapeWidth: '1180px',
      minHeight: undefined,
      label: 'Large (13")',
      desc: 'Full 850px / 18.5×31.7cm frame - Displays full certificate',
    },
    'extra-large': {
      portraitWidth: '960px',
      landscapeWidth: '1320px',
      minHeight: undefined,
      label: 'Extra Large (14")',
      desc: 'Expanded 960px / 14 in Special Paper',
    },
    standard: {
      portraitWidth: '760px',
      landscapeWidth: '1000px',
      minHeight: undefined,
      label: 'Standard',
      desc: 'Standard 760px fit',
    },
  }[placeholderScale];

  const officialPdfPath =
    type === 'marriage'
      ? '/assets/aistudio/CertificateofMarriage_1a42b846.pdf'
      : '/assets/aistudio/Certificate_of_Live_Birth__COLB__7c104446.pdf';

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 10, 160));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 10, 60));
  const handleZoomReset = () => setZoom(100);

  const handlePrint = () => {
    setShowSettingsMenu(false);
    if (onPrint) {
      onPrint();
    } else {
      printCertificate();
    }
  };

  const handleDownloadPDF = async () => {
    setIsExporting(true);
    setExportSuccess(false);

    if (isColb && mapperMode && birthData) {
      try {
        const pdfBytes = await generatePdfFromTemplate(birthData, {
          templateId: 'ph-colb-102',
          dataOnly: previewDataOnly,
        });
        const name = (birthData.child?.fullName || birthData.child?.firstName || 'Certificate').replace(/\s+/g, '_');
        downloadPdfBytes(pdfBytes, `Official_Form102_${name}_${Date.now()}.pdf`);
        setExportSuccess(true);
        setTimeout(() => setExportSuccess(false), 3500);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('pdf-lib generation failed:', msg);
      } finally {
        setIsExporting(false);
      }
      return;
    }

    if (isCom && mapperMode && marriageData) {
      try {
        const pdfBytes = await generatePdfFromTemplate(marriageData, {
          templateId: 'ph-com-97',
          dataOnly: previewDataOnly,
        });
        const couple = `${marriageData.groom?.lastName || 'Groom'}_${marriageData.bride?.lastName || 'Bride'}`.replace(/\s+/g, '_');
        downloadPdfBytes(pdfBytes, `Official_Form97_${couple}_${Date.now()}.pdf`);
        setExportSuccess(true);
        setTimeout(() => setExportSuccess(false), 3500);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('pdf-lib generation failed:', msg);
      } finally {
        setIsExporting(false);
      }
      return;
    }

    const filename = `${
      type === 'birth'
        ? style.templateId === 'ph-colb-102'
          ? 'PH_Form102_Birth_Certificate'
          : 'Sample_Birth_Certificate'
        : 'PH_Form97_Marriage_Certificate'
    }_${Date.now()}`;

    const success = await downloadCertificatePDF(
      'certificate-print-root',
      filename,
      style.paperSize,
      style.pageOrientation
    );

    setIsExporting(false);
    if (success) {
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 3500);
    }
  };

  const handleDownloadOfficialPdfLib = async () => {
    if (type === 'birth' && birthData) {
      setIsPdfLibExporting(true);
      try {
        const pdfBytes = await generatePdfFromTemplate(birthData, {
          templateId: 'ph-colb-102',
          dataOnly: previewDataOnly,
        });
        const name = (birthData.child?.fullName || birthData.child?.firstName || 'Certificate').replace(/\s+/g, '_');
        downloadPdfBytes(pdfBytes, `Official_Form102_${name}_${Date.now()}.pdf`);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('pdf-lib generation failed:', msg);
      } finally {
        setIsPdfLibExporting(false);
      }
      return;
    }

    if (type === 'marriage' && marriageData) {
      setIsPdfLibExporting(true);
      try {
        const pdfBytes = await generatePdfFromTemplate(marriageData, {
          templateId: 'ph-com-97',
          dataOnly: previewDataOnly,
        });
        const couple = `${marriageData.groom?.lastName || 'Groom'}_${marriageData.bride?.lastName || 'Bride'}`.replace(/\s+/g, '_');
        downloadPdfBytes(pdfBytes, `Official_Form97_${couple}_${Date.now()}.pdf`);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('pdf-lib generation failed:', msg);
      } finally {
        setIsPdfLibExporting(false);
      }
    }
  };

  const toggleOrientation = () => {
    if (onUpdateStyle) {
      onUpdateStyle({
        pageOrientation: style.pageOrientation === 'portrait' ? 'landscape' : 'portrait',
      });
    }
  };

  const currentPlaceholderWidth = isMapperActive
    ? '612px'
    : isColb || isCom
    ? style.pageOrientation === 'landscape'
      ? placeholderConfig.landscapeWidth
      : placeholderConfig.portraitWidth
    : style.pageOrientation === 'landscape'
    ? '860px'
    : '680px';

  const numericSheetWidth = isMapperActive ? 612 : parseInt(currentPlaceholderWidth, 10) || 850;
  const rulerExtraWidth = !isMapperActive && showRulerGrid && isColb ? 60 : 0;
  const naturalTotalWidth = numericSheetWidth + rulerExtraWidth;
  const availableViewportWidth = viewportWidth > 0 ? Math.max(180, viewportWidth - 28) : naturalTotalWidth;
  const autoFitScale = viewportWidth > 0 ? Math.min(1, availableViewportWidth / naturalTotalWidth) : 1;
  const effectiveScale = autoFitScale * (zoom / 100);
  const isMiniPreview = autoFitScale < 0.65;

  const currentMinHeight = isColb && !isMapperActive
    ? style.pageOrientation === 'landscape'
      ? '770px'
      : placeholderConfig.minHeight
    : undefined;

  return (
    <div className="flex flex-col h-full bg-slate-100 rounded-xl border border-slate-200/80 shadow-sm">
      {/* Top Main Toolbar */}
      <div className="no-print bg-white border-b border-slate-200 rounded-t-xl px-3 sm:px-4 py-2 flex flex-wrap items-center justify-between gap-2 z-20 relative">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 truncate">
            <Eye className={`w-3.5 h-3.5 shrink-0 ${type === 'marriage' ? 'text-purple-700' : 'text-emerald-700'}`} />
            <span className="truncate">{isMiniPreview ? 'Preview' : 'Live Document Preview'}</span>
          </span>

          {/* Mapper Toggle right next to Preview in Form 102 COLB & Form 97 COM templates (Default ON) */}
          {supportsPdfMapper && (
            <IconTooltip
              label={
                mapperMode
                  ? 'Mapper ON (Official PDF only) — Click to view soft copy'
                  : 'Mapper OFF — Click to switch back to PDF Mapper'
              }
              placement="bottom"
              align="left"
            >
              <button
                type="button"
                onClick={handleToggleMapperMode}
                aria-pressed={mapperMode}
                aria-label="Toggle Mapper Mode"
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] font-bold tracking-wide transition-colors shrink-0 ${
                  mapperMode
                    ? 'bg-[#1D4ED8] text-white border-[#1D4ED8] shadow-xs'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-300'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span
                  className={`text-[10px] font-mono px-1 rounded ${
                    mapperMode ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {mapperMode ? 'ON' : 'OFF'}
                </span>
              </button>
            </IconTooltip>
          )}
        </div>

        {/* Top-Right Icon Sequence: Max-Min, Display size, Rotate, Show ruler, Blank form, Setting */}
        <div ref={toolbarMenusRef} className="flex items-center gap-1 relative shrink-0">
          {/* 1. Max-Min */}
          <IconTooltip label={isFullscreen ? 'Minimize Preview' : 'Maximize Preview'} placement="bottom" align="center">
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className={`p-2 rounded-lg border transition-colors ${
                isFullscreen
                  ? type === 'marriage'
                    ? 'bg-purple-700 text-white border-purple-700'
                    : 'bg-emerald-700 text-white border-emerald-700'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
              aria-label={isFullscreen ? 'Minimize Preview' : 'Maximize Preview'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </IconTooltip>

          {/* 2. Display size */}
          <IconTooltip label="Display Size & Zoom" placement="bottom" align="center">
            <button
              type="button"
              onClick={() => {
                setShowDisplayMenu((prev) => !prev);
                setShowSettingsMenu(false);
              }}
              className={`p-2 rounded-lg border transition-colors ${
                showDisplayMenu
                  ? type === 'marriage'
                    ? 'bg-purple-700 text-white border-purple-700'
                    : 'bg-emerald-700 text-white border-emerald-700'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
              aria-label="Display Size"
            >
              <Monitor className="w-4 h-4" />
            </button>
          </IconTooltip>

          {/* 3. Rotate (non-PDF HTML templates only) */}
          {!isMapperActive && (
            <IconTooltip label={`Rotate (${style.pageOrientation === 'portrait' ? 'Portrait' : 'Landscape'})`} placement="bottom" align="center">
              <button
                type="button"
                onClick={toggleOrientation}
                disabled={!onUpdateStyle}
                className="p-2 rounded-lg border bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200 transition-colors disabled:opacity-40"
                aria-label="Rotate Orientation"
              >
                <RotateCw className="w-4 h-4" />
              </button>
            </IconTooltip>
          )}

          {/* 4. Show ruler (soft-copy HTML template only) */}
          {!isMapperActive && (
            <IconTooltip label={showRulerGrid ? 'Hide Ruler (13 in / cm)' : 'Show Ruler (13 in / cm)'} placement="bottom" align="center">
              <button
                type="button"
                onClick={() => setShowRulerGrid(!showRulerGrid)}
                className={`p-2 rounded-lg border transition-colors ${
                  showRulerGrid
                    ? 'bg-amber-500 text-slate-950 border-amber-500'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
                aria-label="Show Ruler"
              >
                <Ruler className="w-4 h-4" />
              </button>
            </IconTooltip>
          )}

          {/* 5. Print */}
          <IconTooltip label="Print Certificate (Ctrl+P)" placement="bottom" align="center">
            <button
              type="button"
              onClick={handlePrint}
              className="p-2 rounded-lg border bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200 transition-colors"
              aria-label="Print Certificate"
            >
              <Printer className="w-4 h-4" />
            </button>
          </IconTooltip>

          {/* 5b. Data-Only Print Preview (Pre-Templated Paper) */}
          <IconTooltip
            label={previewDataOnly ? 'Data-Only Print Preview (ON)' : 'Preview Data-Only Output'}
            placement="bottom"
            align="right"
          >
            <button
              type="button"
              onClick={() => setPreviewDataOnly((prev) => !prev)}
              className={`p-2 rounded-lg border transition-colors ${
                previewDataOnly
                  ? 'bg-[#1D4ED8] text-white border-[#1D4ED8]'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
              aria-label="Preview Data-Only Output"
            >
              <Sparkles className="w-4 h-4" />
            </button>
          </IconTooltip>

          {/* 5. Blank form */}
          <IconTooltip label={blankMode ? 'Blank Form (ON)' : 'Blank Form'} placement="bottom" align="right">
            <button
              type="button"
              onClick={() => setBlankMode(!blankMode)}
              className={`p-2 rounded-lg border transition-colors ${
                blankMode
                  ? 'bg-amber-400 text-slate-950 border-amber-400'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
              aria-label="Blank Form"
            >
              <FileText className="w-4 h-4" />
            </button>
          </IconTooltip>

          {/* 6. Setting */}
          <IconTooltip label="Settings & Export" placement="bottom" align="right">
            <button
              type="button"
              onClick={() => {
                setShowSettingsMenu((prev) => !prev);
                setShowDisplayMenu(false);
              }}
              className={`p-2 rounded-lg border transition-colors ${
                showSettingsMenu
                  ? type === 'marriage'
                    ? 'bg-purple-700 text-white border-purple-700'
                    : 'bg-emerald-700 text-white border-emerald-700'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
              aria-label="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          </IconTooltip>

          {/* Display Size Popover */}
          {showDisplayMenu && (
            <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl border border-slate-200 shadow-lg p-3 z-40 space-y-3">
              {!isMapperActive && (
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Display Size
                  </p>
                  <div className="grid grid-cols-1 gap-1">
                    {([
                      { id: 'large', label: 'Large (13")', desc: '850px / 18.5×31.7 cm' },
                      { id: 'extra-large', label: 'Extra Large (14")', desc: '960px Special Paper' },
                      { id: 'standard', label: 'Standard', desc: '760px compact fit' },
                    ] as const).map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setPlaceholderScale(opt.id)}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-colors flex items-center justify-between ${
                          placeholderScale === opt.id
                            ? type === 'marriage'
                              ? 'bg-purple-700 text-white font-semibold'
                              : 'bg-emerald-700 text-white font-semibold'
                            : 'text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <span>{opt.label}</span>
                        <span
                          className={`text-[10px] ${
                            placeholderScale === opt.id
                              ? type === 'marriage'
                                ? 'text-purple-100'
                                : 'text-emerald-100'
                              : 'text-slate-400'
                          }`}
                        >
                          {opt.desc}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className={!isMapperActive ? 'border-t border-slate-200 pt-2.5' : ''}>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Zoom ({zoom}%)
                </p>
                <div className="flex items-center justify-between gap-1.5 bg-slate-100 rounded-lg p-1 border border-slate-200">
                  <IconTooltip label="Zoom Out" placement="top" align="left">
                    <button
                      type="button"
                      onClick={handleZoomOut}
                      disabled={zoom <= 60}
                      className="p-1.5 rounded text-slate-700 hover:bg-white disabled:opacity-40"
                      aria-label="Zoom Out"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                  </IconTooltip>
                  <IconTooltip label="Reset Zoom to 100%" placement="top" align="center">
                    <button
                      type="button"
                      onClick={handleZoomReset}
                      className="text-xs font-mono font-semibold text-slate-800 px-2 py-1 rounded hover:bg-white"
                      aria-label="Reset Zoom"
                    >
                      {zoom}% Reset
                    </button>
                  </IconTooltip>
                  <IconTooltip label="Zoom In" placement="top" align="right">
                    <button
                      type="button"
                      onClick={handleZoomIn}
                      disabled={zoom >= 160}
                      className="p-1.5 rounded text-slate-700 hover:bg-white disabled:opacity-40"
                      aria-label="Zoom In"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                  </IconTooltip>
                </div>
              </div>
            </div>
          )}

          {/* Settings & Export Popover */}
          {showSettingsMenu && (
            <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl border border-slate-200 shadow-lg p-3 z-40 space-y-3 text-xs">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Document Pages
                </p>
                <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setColbPage('page1')}
                    className={`px-2 py-1 rounded text-[11px] font-semibold transition-all ${
                      colbPage === 'page1'
                        ? type === 'marriage'
                          ? 'bg-purple-700 text-white'
                          : 'bg-emerald-700 text-white'
                        : 'text-slate-700 hover:bg-white'
                    }`}
                  >
                    Page 1
                  </button>
                  <button
                    type="button"
                    onClick={() => setColbPage('page2')}
                    className={`px-2 py-1 rounded text-[11px] font-semibold transition-all ${
                      colbPage === 'page2'
                        ? type === 'marriage'
                          ? 'bg-purple-700 text-white'
                          : 'bg-emerald-700 text-white'
                        : 'text-slate-700 hover:bg-white'
                    }`}
                  >
                    Page 2
                  </button>
                  <button
                    type="button"
                    onClick={() => setColbPage('both')}
                    className={`px-2 py-1 rounded text-[11px] font-semibold transition-all ${
                      colbPage === 'both'
                        ? type === 'marriage'
                          ? 'bg-purple-700 text-white'
                          : 'bg-emerald-700 text-white'
                        : 'text-slate-700 hover:bg-white'
                    }`}
                  >
                    Both
                  </button>
                </div>
              </div>

              {isColb && !isMapperActive && (
                <div className="border-t border-slate-200 pt-2.5 space-y-1.5">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Calibration &amp; Overlay
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowBorderSpecs(!showBorderSpecs)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-left transition-colors ${
                      showBorderSpecs
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-semibold'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <Calculator className="w-3.5 h-3.5 text-emerald-700" />
                      Border Specs (8.5 × 13 in)
                    </span>
                    <span className="text-[10px] font-mono">{showBorderSpecs ? 'ON' : 'OFF'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowTokens(!showTokens)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-left transition-colors ${
                      showTokens
                        ? 'bg-amber-50 border-amber-300 text-amber-900 font-semibold'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      Show Binding Tokens
                    </span>
                    <span className="text-[10px] font-mono">{showTokens ? 'ON' : 'OFF'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setComparePdfMode(!comparePdfMode)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-left transition-colors ${
                      comparePdfMode
                        ? 'bg-sky-50 border-sky-300 text-sky-900 font-semibold'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <Columns className="w-3.5 h-3.5 text-sky-700" />
                      Compare with Official PDF
                    </span>
                    <span className="text-[10px] font-mono">{comparePdfMode ? 'ON' : 'OFF'}</span>
                  </button>

                  <div className="px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-medium text-slate-700">PDF Overlay Opacity</span>
                      <span className="text-[11px] font-mono text-slate-600">{pdfOverlayOpacity}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="80"
                      step="10"
                      value={pdfOverlayOpacity}
                      onChange={(e) => setPdfOverlayOpacity(Number(e.target.value))}
                      className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-700"
                    />
                  </div>
                </div>
              )}

              <div className="border-t border-slate-200 pt-2.5 space-y-1.5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Pre-Templated Paper Print
                </p>
                {onTogglePrintDataOnly && (
                  <button
                    type="button"
                    onClick={onTogglePrintDataOnly}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-left transition-colors ${
                      printDataOnly
                        ? 'bg-blue-50 border-blue-300 text-blue-900 font-semibold'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <Printer className="w-3.5 h-3.5 text-[#1D4ED8]" />
                      Print Inputted Data Only
                    </span>
                    <span className="text-[10px] font-mono">{printDataOnly ? 'ON' : 'OFF'}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setPreviewDataOnly((prev) => !prev)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-left transition-colors ${
                    previewDataOnly
                      ? 'bg-blue-50 border-blue-300 text-blue-900 font-semibold'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-[#1D4ED8]" />
                    Preview Data-Only Output
                  </span>
                  <span className="text-[10px] font-mono">{previewDataOnly ? 'ON' : 'OFF'}</span>
                </button>
              </div>

              <div className="border-t border-slate-200 pt-2.5 space-y-1.5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Tools &amp; Export
                </p>
                {onOpenFieldMapper && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowSettingsMenu(false);
                      onOpenFieldMapper();
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 font-medium transition-colors"
                  >
                    <Sliders className="w-3.5 h-3.5 text-indigo-600" />
                    Field Mapper Studio
                  </button>
                )}
                {supportsPdfMapper && (
                  <button
                    type="button"
                    onClick={handleDownloadOfficialPdfLib}
                    disabled={isPdfLibExporting}
                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-white font-semibold transition-colors disabled:opacity-70 ${
                      type === 'marriage'
                        ? 'bg-purple-700 hover:bg-purple-800'
                        : 'bg-emerald-700 hover:bg-emerald-800'
                    }`}
                  >
                    {isPdfLibExporting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <FileText className="w-3.5 h-3.5" />
                    )}
                    {isPdfLibExporting ? 'Generating (pdf-lib)...' : 'Official PDF (pdf-lib)'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleDownloadPDF}
                  disabled={isExporting}
                  className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-800 text-white font-medium transition-colors disabled:opacity-70"
                >
                  {isExporting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : exportSuccess ? (
                    <FileCheck2 className="w-3.5 h-3.5 text-emerald-300" />
                  ) : (
                    <Download className="w-3.5 h-3.5" />
                  )}
                  {exportSuccess ? 'Saved!' : 'Download PDF'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sizing & Border Calculator Panel */}
      {isColb && !isMapperActive && showBorderSpecs && (
        <div className="no-print bg-slate-850 bg-slate-900 border-b border-slate-800 px-3 sm:px-4 py-2.5 text-slate-200">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded bg-emerald-500/20 text-emerald-400">
                <Calculator className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  Philippine Civil Registry Template Sizing &amp; Border Calculator
                  <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-700 px-1.5 py-0.2 rounded font-mono font-normal">
                    Form 102 (Legal 8.5 × 13 in Paper)
                  </span>
                </h4>
                <p className="text-[11px] text-slate-400">
                  Exact physical sheet dimensions (8.5 × 13 inches / 21.59 × 33.02 cm), 13-inch overall border frame, and coordinate breakdown.
                </p>
              </div>
            </div>

            {/* Quick Dimension Pill Badges */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="bg-slate-800 border border-slate-700 px-2.5 py-1 rounded text-center">
                <span className="text-[9px] text-slate-400 block uppercase font-semibold">Border Length</span>
                <span className="text-xs font-mono font-bold text-emerald-400">13.0 in (33.02 cm)</span>
              </div>
              <div className="bg-slate-800 border border-slate-700 px-2.5 py-1 rounded text-center">
                <span className="text-[9px] text-slate-400 block uppercase font-semibold">Imperial</span>
                <span className="text-xs font-mono font-bold text-amber-300">8.50 × 13.00 in</span>
              </div>
              <div className="bg-slate-800 border border-slate-700 px-2.5 py-1 rounded text-center">
                <span className="text-[9px] text-slate-400 block uppercase font-semibold">Paper Type</span>
                <span className="text-xs font-mono font-bold text-sky-400">13-Inch Legal Bond</span>
              </div>
            </div>
          </div>

          {/* Border Calculations Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 text-[11px]">
            {/* Column 1: Border & Frame Specifications */}
            <div className="bg-slate-950/60 p-2 rounded border border-slate-800">
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block mb-1">
                1. Border Gauges &amp; Strokes
              </span>
              <ul className="space-y-1 text-slate-300">
                <li className="flex justify-between items-center">
                  <span className="text-slate-400">Outer Sheet Border:</span>
                  <span className="font-mono font-semibold text-white">2px (0.53 mm) solid #348e38</span>
                </li>
                <li className="flex justify-between items-center">
                  <span className="text-slate-400">Internal Grid Dividers:</span>
                  <span className="font-mono font-semibold text-white">1px (0.26 mm) solid #348e38</span>
                </li>
                <li className="flex justify-between items-center">
                  <span className="text-slate-400">Baseline Field Accents:</span>
                  <span className="font-mono font-semibold text-white">1px solid #82c286</span>
                </li>
                <li className="flex justify-between items-center">
                  <span className="text-slate-400">Outer Border Width:</span>
                  <span className="font-mono font-semibold text-white">18.50 cm (fixed frame)</span>
                </li>
                <li className="flex justify-between items-center">
                  <span className="text-slate-400">Coding Boxes Height:</span>
                  <span className="font-mono font-semibold text-white">0.50 cm (0.10 cm gap)</span>
                </li>
              </ul>
            </div>

            {/* Column 2: Vertical Heights & Section Coordinate Offsets */}
            <div className="bg-slate-950/60 p-2 rounded border border-slate-800 md:col-span-2">
              <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider block mb-1">
                2. Section Heights &amp; Border Line Coordinates (Y-Axis)
              </span>
              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-[10px]">
                  <thead>
                    <tr className="text-slate-400 border-b border-slate-800">
                      <th className="py-0.5 font-normal">Section</th>
                      <th className="py-0.5 font-normal">Items</th>
                      <th className="py-0.5 font-normal">Height (cm)</th>
                      <th className="py-0.5 font-normal">% of Page</th>
                      <th className="py-0.5 font-normal">Border Y-Position</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    <tr>
                      <td className="py-0.5 font-semibold text-white">1. Main Header</td>
                      <td>Form 102, Republic, OCRG, Title</td>
                      <td className="text-emerald-400">2.00 cm</td>
                      <td>6.31%</td>
                      <td className="text-slate-400">0.00 cm → 2.00 cm</td>
                    </tr>
                    <tr>
                      <td className="py-0.5 font-semibold text-white">2. Second Header</td>
                      <td>Province, City/Mun, Registry No.</td>
                      <td className="text-emerald-400">1.50 cm</td>
                      <td>4.73%</td>
                      <td className="text-slate-400">2.00 cm → 3.50 cm</td>
                    </tr>
                    <tr>
                      <td className="py-0.5 font-semibold text-white">3. CHILD</td>
                      <td>Items 1 – 6 (Row 5: 0.5 in)</td>
                      <td className="text-emerald-400">4.40 cm</td>
                      <td>13.88%</td>
                      <td className="text-slate-400">3.50 cm → 7.90 cm</td>
                    </tr>
                    <tr>
                      <td className="py-0.5 font-semibold text-white">4. MOTHER</td>
                      <td>Items 7 – 13 (Row 10: 0.4 in)</td>
                      <td className="text-emerald-400">4.00 cm</td>
                      <td>12.62%</td>
                      <td className="text-slate-400">7.90 cm → 11.90 cm</td>
                    </tr>
                    <tr>
                      <td className="py-0.5 font-semibold text-white">5. FATHER</td>
                      <td>Items 14 – 19</td>
                      <td className="text-emerald-400">3.00 cm</td>
                      <td>9.46%</td>
                      <td className="text-slate-400">11.90 cm → 14.90 cm</td>
                    </tr>
                    <tr>
                      <td className="py-0.5 font-semibold text-white">6. Marriage Desc</td>
                      <td>Marriage of Parents notice</td>
                      <td className="text-emerald-400">0.50 cm</td>
                      <td>1.58%</td>
                      <td className="text-slate-400">14.90 cm → 15.40 cm</td>
                    </tr>
                    <tr>
                      <td className="py-0.5 font-semibold text-white">7. 20a – 21b</td>
                      <td>Marriage Date/Place &amp; Attendant Cert</td>
                      <td className="text-emerald-400">5.00 cm</td>
                      <td>15.77%</td>
                      <td className="text-slate-400">15.40 cm → 20.40 cm</td>
                    </tr>
                    <tr>
                      <td className="py-0.5 font-semibold text-white">8. Items 22 – 23</td>
                      <td>Informant &amp; Prepared By</td>
                      <td className="text-emerald-400">4.00 cm</td>
                      <td>12.62%</td>
                      <td className="text-slate-400">20.40 cm → 24.40 cm</td>
                    </tr>
                    <tr>
                      <td className="py-0.5 font-semibold text-white">9. Items 24 – 25</td>
                      <td>Received &amp; Registered at LCR</td>
                      <td className="text-emerald-400">3.00 cm</td>
                      <td>9.46%</td>
                      <td className="text-slate-400">24.40 cm → 27.40 cm</td>
                    </tr>
                    <tr>
                      <td className="py-0.5 font-semibold text-white">10. Remarks</td>
                      <td>REMARKS/ANNOTATIONS (Bold)</td>
                      <td className="text-emerald-400">2.80 cm</td>
                      <td>8.83%</td>
                      <td className="text-slate-400">27.40 cm → 30.20 cm</td>
                    </tr>
                    <tr>
                      <td className="py-0.5 font-semibold text-white">11. To Be Filled</td>
                      <td>Boxes 8,9,11,13,15,16,17,19 (0.5cm × 0.1cm gap)</td>
                      <td className="text-emerald-400">1.50 cm</td>
                      <td>4.73%</td>
                      <td className="text-slate-400">30.20 cm → 31.70 cm</td>
                    </tr>
                    <tr className="font-bold text-amber-300 border-t border-slate-700">
                      <td className="py-0.5">Total Border Size</td>
                      <td>18.50 cm width × 31.70 cm height</td>
                      <td>31.70 cm</td>
                      <td>100.0%</td>
                      <td>0.00 cm → 31.70 cm</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Preview Container with responsive File Manager scaling and Microsoft Word multi-page layout */}
      <div
        ref={previewViewportRef}
        className="flex-1 overflow-auto p-3 sm:p-5 bg-slate-200/80 rounded-b-xl"
      >
        {comparePdfMode && isColb && !isMapperActive ? (
          /* Side-by-Side Official PDF Comparison */
          <div className="w-full max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
            {/* Left: Generated Dynamic Template */}
            <div className="bg-white p-3 rounded-xl shadow-lg border border-slate-300 overflow-x-auto">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200">
                <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Dynamic Bound Template (Form 102)
                </span>
                <span className="text-[10px] bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded font-mono font-bold">
                  {colbPage === 'page2' ? 'Page 2' : 'Page 1'}
                </span>
              </div>
              <div id="printable-certificate" className="relative select-text">
                {birthData && (
                  <BirthCertificateTemplate
                    data={birthData}
                    style={style}
                    page={colbPage === 'page2' ? 'page2' : 'page1'}
                    activeBindingField={activeBindingField}
                    onSelectBindingField={onSelectBindingField}
                    showTokens={showTokens}
                    blankMode={blankMode}
                  />
                )}
              </div>
            </div>

            {/* Right: Attached Official PDF Reference */}
            <div className="bg-white p-3 rounded-xl shadow-lg border border-slate-300">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-sky-600" />
                  Official Attached PDF Reference
                </span>
                <a
                  href={officialPdfPath}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] text-sky-600 hover:underline font-semibold"
                >
                  Open Original PDF
                </a>
              </div>
              <div className="rounded overflow-hidden border border-slate-200" style={{ height: '780px' }}>
                <iframe
                  src={`${officialPdfPath}#page=${colbPage === 'page2' ? 2 : 1}&view=FitH`}
                  className="w-full h-full"
                  title="Official PDF Reference"
                />
              </div>
            </div>
          </div>
        ) : (
          /* Microsoft Word Multi-Page Print Layout Preview (automatically scales down smoothly in compact preview pane) */
          <div className="w-full flex justify-center">
            <div
              className="relative transition-[width,height] duration-200 ease-out shrink-0"
              style={{
                width: `${Math.round(naturalTotalWidth * effectiveScale)}px`,
                height: unscaledHeight > 0 ? `${Math.round(unscaledHeight * effectiveScale)}px` : undefined,
              }}
            >
              <div
                ref={docContentRef}
                className="origin-top-left transition-transform duration-200 ease-out flex flex-col items-center"
                style={{
                  width: `${naturalTotalWidth}px`,
                  transform: `scale(${effectiveScale})`,
                }}
              >
                {/* Top Centimeter Ruler */}
                {showRulerGrid && isColb && !isMapperActive && (
                  <div
                    className="no-print bg-amber-50 border border-amber-300 rounded-t text-slate-800 text-[9px] font-mono select-none relative mb-1 h-7"
                    style={{
                      width: currentPlaceholderWidth,
                    }}
                  >
                    <div className="flex justify-between items-center h-full px-1 text-[8px] font-bold">
                      <span className="text-emerald-700 bg-emerald-100 px-1 py-0.2 rounded border border-emerald-300">0.0 cm</span>
                      <span className="hidden sm:inline text-slate-600">Left Strip: 1.50 cm (5.6%)</span>
                      <span className="hidden md:inline text-sky-700 bg-sky-100 px-1 py-0.2 rounded border border-sky-300">Border Width: 18.50 cm</span>
                      <span className="text-amber-800 font-bold">TOTAL WIDTH: 21.59 cm (8.5 in)</span>
                      <span className="text-emerald-700 bg-emerald-100 px-1 py-0.2 rounded border border-emerald-300">21.59 cm</span>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-1.5 flex justify-between px-0.5 border-t border-amber-300">
                      {Array.from({ length: 22 }).map((_, idx) => (
                        <div
                          key={idx}
                          className={`w-px bg-amber-600/70 ${idx % 5 === 0 ? 'h-full bg-amber-900 font-bold' : 'h-1'}`}
                        />
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-stretch justify-center gap-1">
                  {/* Left Vertical Centimeter Ruler */}
                  {showRulerGrid && isColb && !isMapperActive && (
                    <div
                      className="no-print w-12 sm:w-14 bg-amber-50 border border-amber-300 rounded-l text-[7.5px] font-mono text-slate-800 select-none flex flex-col justify-between py-1 px-0.5 shrink-0"
                    >
                      <div className="text-center font-bold text-emerald-800 border-b border-amber-200 pb-0.5">
                        0.0cm
                      </div>
                      <div className="text-center text-[6.5px] text-emerald-700 bg-emerald-100/80 rounded py-0.5 border border-emerald-200 leading-tight">
                        <span className="block font-bold">2.0cm</span>
                        <span>Main Hdr</span>
                      </div>
                      <div className="text-center text-[6.5px] text-emerald-700 bg-emerald-100/80 rounded py-0.5 border border-emerald-200 leading-tight">
                        <span className="block font-bold">1.5cm</span>
                        <span>2nd Hdr</span>
                      </div>
                      <div className="text-center text-[6.5px] text-emerald-700 bg-emerald-100/80 rounded py-0.5 border border-emerald-200 leading-tight">
                        <span className="block font-bold">4.4cm</span>
                        <span>Child</span>
                      </div>
                      <div className="text-center text-[6.5px] text-emerald-700 bg-emerald-100/80 rounded py-0.5 border border-emerald-200 leading-tight">
                        <span className="block font-bold">4.0cm</span>
                        <span>Mother</span>
                      </div>
                      <div className="text-center text-[6.5px] text-emerald-700 bg-emerald-100/80 rounded py-0.5 border border-emerald-200 leading-tight">
                        <span className="block font-bold">3.0cm</span>
                        <span>Father</span>
                      </div>
                      <div className="text-center text-[6.5px] text-emerald-700 bg-emerald-100/80 rounded py-0.5 border border-emerald-200 leading-tight">
                        <span className="block font-bold">5.5cm</span>
                        <span>20-21b</span>
                      </div>
                      <div className="text-center text-[6.5px] text-emerald-700 bg-emerald-100/80 rounded py-0.5 border border-emerald-200 leading-tight">
                        <span className="block font-bold">4.0cm</span>
                        <span>22-23</span>
                      </div>
                      <div className="text-center text-[6.5px] text-emerald-700 bg-emerald-100/80 rounded py-0.5 border border-emerald-200 leading-tight">
                        <span className="block font-bold">3.0cm</span>
                        <span>24-25</span>
                      </div>
                      <div className="text-center text-[6.5px] text-emerald-700 bg-emerald-100/80 rounded py-0.5 border border-emerald-200 leading-tight">
                        <span className="block font-bold">2.8cm</span>
                        <span>Remarks</span>
                      </div>
                      <div className="text-center font-bold text-emerald-800 border-t border-amber-200 pt-0.5">
                        31.7cm (+1.5cm)
                      </div>
                    </div>
                  )}

                  {/* Document Pages Stack (Microsoft Word Print Layout) */}
                  <div
                    id="printable-certificate"
                    className={`flex flex-col gap-6 relative select-text shrink-0 ${
                      previewDataOnly ? 'screen-print-data-only' : ''
                    }`}
                    style={{ width: currentPlaceholderWidth }}
                  >
                    {/* Semi-transparent PDF Overlay Mode */}
                    {pdfOverlayOpacity > 0 && isColb && !isMapperActive && (
                      <div
                        className="absolute inset-0 pointer-events-none z-30 overflow-hidden mix-blend-multiply"
                        style={{ opacity: pdfOverlayOpacity / 100 }}
                      >
                        <iframe
                          src={`${officialPdfPath}#page=${colbPage === 'page2' ? 2 : 1}&view=FitH&toolbar=0`}
                          className="w-full h-full pointer-events-none"
                          title="PDF Overlay"
                        />
                      </div>
                    )}

                    {type === 'birth' && birthData && (
                      isMapperActive ? (
                        <PdfMapperPreview
                          birthData={birthData}
                          colbPage={colbPage}
                          blankMode={blankMode}
                          previewDataOnly={previewDataOnly}
                          activeBindingField={activeBindingField}
                          onSelectBindingField={onSelectBindingField}
                          onOpenFieldMapper={onOpenFieldMapper}
                          showMapperBar={true}
                        />
                      ) : (
                        <>
                          {colbPage === 'both' || !isColb ? (
                            <>
                              <div
                                data-cert-sheet="page1"
                                className="bg-white shadow-[0_6px_24px_rgba(15,23,42,0.12)] ring-1 ring-slate-300/80 rounded-[2px] overflow-hidden"
                                style={{ minHeight: currentMinHeight }}
                              >
                                <BirthCertificateTemplate
                                  data={birthData}
                                  style={style}
                                  page="page1"
                                  activeBindingField={activeBindingField}
                                  onSelectBindingField={onSelectBindingField}
                                  showTokens={showTokens}
                                  blankMode={blankMode}
                                />
                              </div>
                              {isColb && (
                                <div
                                  data-cert-sheet="page2"
                                  className="bg-white shadow-[0_6px_24px_rgba(15,23,42,0.12)] ring-1 ring-slate-300/80 rounded-[2px] overflow-hidden"
                                  style={{
                                    minHeight: currentMinHeight,
                                    aspectRatio: '8.5 / 13',
                                  }}
                                >
                                  <BirthCertificateTemplate
                                    data={birthData}
                                    style={style}
                                    page="page2"
                                    activeBindingField={activeBindingField}
                                    onSelectBindingField={onSelectBindingField}
                                    showTokens={showTokens}
                                    blankMode={blankMode}
                                  />
                                </div>
                              )}
                            </>
                          ) : (
                            <div
                              data-cert-sheet={colbPage}
                              className="bg-white shadow-[0_6px_24px_rgba(15,23,42,0.12)] ring-1 ring-slate-300/80 rounded-[2px] overflow-hidden"
                              style={{
                                minHeight: currentMinHeight,
                                aspectRatio: colbPage === 'page2' ? '8.5 / 13' : undefined,
                              }}
                            >
                              <BirthCertificateTemplate
                                data={birthData}
                                style={style}
                                page={colbPage}
                                activeBindingField={activeBindingField}
                                onSelectBindingField={onSelectBindingField}
                                showTokens={showTokens}
                                blankMode={blankMode}
                              />
                            </div>
                          )}
                        </>
                      )
                    )}

                    {type === 'marriage' && marriageData && (
                      isMapperActive ? (
                        <PdfMapperPreview
                          certificateType="marriage"
                          marriageData={marriageData}
                          colbPage={colbPage}
                          blankMode={blankMode}
                          previewDataOnly={previewDataOnly}
                          onOpenFieldMapper={onOpenFieldMapper}
                          showMapperBar={true}
                        />
                      ) : (
                        <>
                          {colbPage === 'both' ? (
                            <>
                              <div
                                data-cert-sheet="page1"
                                className="bg-white shadow-[0_6px_24px_rgba(15,23,42,0.12)] ring-1 ring-slate-300/80 rounded-[2px] overflow-hidden"
                              >
                                <MarriageCertificateTemplate
                                  data={marriageData}
                                  style={style}
                                  page="page1"
                                  blankMode={blankMode}
                                />
                              </div>
                              <div
                                data-cert-sheet="page2"
                                className="bg-white shadow-[0_6px_24px_rgba(15,23,42,0.12)] ring-1 ring-slate-300/80 rounded-[2px] overflow-hidden"
                                style={{ aspectRatio: '8.5 / 13' }}
                              >
                                <MarriageCertificateTemplate
                                  data={marriageData}
                                  style={style}
                                  page="page2"
                                  blankMode={blankMode}
                                />
                              </div>
                            </>
                          ) : (
                            <div
                              data-cert-sheet={colbPage}
                              className="bg-white shadow-[0_6px_24px_rgba(15,23,42,0.12)] ring-1 ring-slate-300/80 rounded-[2px] overflow-hidden"
                              style={{
                                aspectRatio: colbPage === 'page2' ? '8.5 / 13' : undefined,
                              }}
                            >
                              <MarriageCertificateTemplate
                                data={marriageData}
                                style={style}
                                page={colbPage === 'page2' ? 'page2' : 'page1'}
                                blankMode={blankMode}
                              />
                            </div>
                          )}
                        </>
                      )
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Fullscreen Overlay Modal rendered above Certiflow Header via Portal */}
      {isFullscreen &&
        createPortal(
          <div className="no-print fixed inset-0 z-[9999] bg-slate-900/90 backdrop-blur-sm flex flex-col p-4 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 text-white border-b border-slate-700">
            <div className="flex items-center gap-3 min-w-0">
              <IconTooltip label="Return to Form" placement="bottom" align="left">
                <button
                  type="button"
                  onClick={() => setIsFullscreen(false)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-600 text-xs font-semibold transition-colors"
                  aria-label="Return to Form"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Return</span>
                </button>
              </IconTooltip>
              <div className="min-w-0">
                <h3 className="font-semibold text-base sm:text-lg truncate">{documentTitle}</h3>
                <p className="text-xs text-slate-300 truncate">
                  {type === 'marriage' ? 'Municipal Form No. 97' : 'Municipal Form No. 102'} &bull; {style.paperSize.toUpperCase()} &bull; {style.pageOrientation}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
              {(isColb || type === 'marriage') && (
                <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700 text-xs">
                  <button
                    type="button"
                    onClick={() => setColbPage('both')}
                    className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all ${
                      colbPage === 'both'
                        ? type === 'marriage'
                          ? 'bg-purple-600 text-white'
                          : 'bg-emerald-600 text-white'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    All Pages (1–2)
                  </button>
                  <button
                    type="button"
                    onClick={() => setColbPage('page1')}
                    className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all ${
                      colbPage === 'page1'
                        ? type === 'marriage'
                          ? 'bg-purple-600 text-white'
                          : 'bg-emerald-600 text-white'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    Page 1
                  </button>
                  <button
                    type="button"
                    onClick={() => setColbPage('page2')}
                    className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all ${
                      colbPage === 'page2'
                        ? type === 'marriage'
                          ? 'bg-purple-600 text-white'
                          : 'bg-emerald-600 text-white'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    Page 2
                  </button>
                </div>
              )}
              <IconTooltip label="Print Certificate (Ctrl+P)" placement="bottom" align="center">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white text-slate-900 hover:bg-slate-100 flex items-center gap-1.5"
                  aria-label="Print Certificate"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print</span>
                </button>
              </IconTooltip>
              <IconTooltip label="Download PDF (2 Pages)" placement="bottom" align="center">
                <button
                  type="button"
                  onClick={handleDownloadPDF}
                  disabled={isExporting}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg text-white flex items-center gap-1.5 disabled:opacity-70 ${
                    type === 'marriage'
                      ? 'bg-purple-600 hover:bg-purple-500'
                      : 'bg-emerald-600 hover:bg-emerald-500'
                  }`}
                  aria-label="Download PDF"
                >
                  {isExporting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Download className="w-3.5 h-3.5" />
                  )}
                  <span>Download PDF</span>
                </button>
              </IconTooltip>
              <IconTooltip label="Close Preview" placement="bottom" align="right">
                <button
                  type="button"
                  onClick={() => setIsFullscreen(false)}
                  className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700"
                  aria-label="Close Preview"
                >
                  <X className="w-5 h-5" />
                </button>
              </IconTooltip>
            </div>
          </div>
          <div className="flex-1 overflow-auto p-4 sm:p-6">
            <div
              className={`mx-auto flex flex-col gap-6 shrink-0 ${
                previewDataOnly ? 'screen-print-data-only' : ''
              }`}
              style={{ width: currentPlaceholderWidth }}
            >
              {type === 'birth' && birthData && (
                isMapperActive ? (
                  <PdfMapperPreview
                    birthData={birthData}
                    colbPage={colbPage}
                    blankMode={blankMode}
                    previewDataOnly={previewDataOnly}
                    activeBindingField={activeBindingField}
                    onSelectBindingField={(fieldId) => {
                      onSelectBindingField?.(fieldId);
                      setIsFullscreen(false);
                    }}
                    onOpenFieldMapper={() => {
                      setIsFullscreen(false);
                      onOpenFieldMapper?.();
                    }}
                    showMapperBar={true}
                  />
                ) : (
                  <>
                    {colbPage === 'both' && isColb ? (
                      <>
                        <div
                          className="bg-white shadow-2xl rounded-[2px] overflow-hidden"
                          style={{ minHeight: currentMinHeight }}
                        >
                          <BirthCertificateTemplate
                            data={birthData}
                            style={style}
                            page="page1"
                            activeBindingField={activeBindingField}
                            onSelectBindingField={onSelectBindingField}
                            showTokens={showTokens}
                            blankMode={blankMode}
                          />
                        </div>
                        <div
                          className="bg-white shadow-2xl rounded-[2px] overflow-hidden"
                          style={{
                            minHeight: currentMinHeight,
                            aspectRatio: '8.5 / 13',
                          }}
                        >
                          <BirthCertificateTemplate
                            data={birthData}
                            style={style}
                            page="page2"
                            activeBindingField={activeBindingField}
                            onSelectBindingField={onSelectBindingField}
                            showTokens={showTokens}
                            blankMode={blankMode}
                          />
                        </div>
                      </>
                    ) : (
                      <div
                        className="bg-white shadow-2xl rounded-[2px] overflow-hidden"
                        style={{
                          minHeight: currentMinHeight,
                          aspectRatio: isColb && colbPage === 'page2' ? '8.5 / 13' : undefined,
                        }}
                      >
                        <BirthCertificateTemplate
                          data={birthData}
                          style={style}
                          page={colbPage === 'page2' ? 'page2' : 'page1'}
                          activeBindingField={activeBindingField}
                          onSelectBindingField={onSelectBindingField}
                          showTokens={showTokens}
                          blankMode={blankMode}
                        />
                      </div>
                    )}
                  </>
                )
              )}
              {type === 'marriage' && marriageData && (
                isMapperActive ? (
                  <PdfMapperPreview
                    certificateType="marriage"
                    marriageData={marriageData}
                    colbPage={colbPage}
                    blankMode={blankMode}
                    previewDataOnly={previewDataOnly}
                    onOpenFieldMapper={() => {
                      setIsFullscreen(false);
                      onOpenFieldMapper?.();
                    }}
                    showMapperBar={true}
                  />
                ) : (
                  <>
                    {colbPage === 'both' ? (
                      <>
                        <div className="bg-white shadow-2xl rounded-[2px] overflow-hidden">
                          <MarriageCertificateTemplate
                            data={marriageData}
                            style={style}
                            page="page1"
                            blankMode={blankMode}
                          />
                        </div>
                        <div
                          className="bg-white shadow-2xl rounded-[2px] overflow-hidden"
                          style={{ aspectRatio: '8.5 / 13' }}
                        >
                          <MarriageCertificateTemplate
                            data={marriageData}
                            style={style}
                            page="page2"
                            blankMode={blankMode}
                          />
                        </div>
                      </>
                    ) : (
                      <div
                        className="bg-white shadow-2xl rounded-[2px] overflow-hidden"
                        style={{
                          aspectRatio: colbPage === 'page2' ? '8.5 / 13' : undefined,
                        }}
                      >
                        <MarriageCertificateTemplate
                          data={marriageData}
                          style={style}
                          page={colbPage === 'page2' ? 'page2' : 'page1'}
                          blankMode={blankMode}
                        />
                      </div>
                    )}
                  </>
                )
              )}
            </div>
          </div>
        </div>,
          document.body
        )}
    </div>
  );
};
