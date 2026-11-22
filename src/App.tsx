/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  BirthCertificateData,
  CertificateStyle,
  CertificateType,
  MarriageCertificateData,
  SavedDraft,
} from './types/certificate';
import {
  DEFAULT_BIRTH_STYLE,
  DEFAULT_MARRIAGE_STYLE,
  INITIAL_BIRTH_DATA,
  INITIAL_MARRIAGE_DATA,
} from './utils/sampleData';
import {
  downloadCertificatePDF,
  getSavedDrafts,
  getSessionCount,
  incrementSessionCount,
  printCertificate,
  saveDraft,
} from './utils/certificateUtils';
import { Navbar } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { BirthCertificateForm } from './components/BirthCertificateForm';
import { MarriageCertificateForm } from './components/MarriageCertificateForm';
import { CertificatePreview } from './components/CertificatePreview';
import { BirthCertificateTemplate } from './components/BirthCertificateTemplate';
import { MarriageCertificateTemplate } from './components/MarriageCertificateTemplate';
import { SavedDraftsView } from './components/SavedDraftsView';
import { AboutView } from './components/AboutView';
import { HelpView } from './components/HelpView';
import { TemplateFieldMapper } from './components/TemplateFieldMapper';
import { AdminLoginView } from './components/AdminLoginView';
import { IconTooltip } from './components/IconTooltip';
import { fitFontSizeToWidth, fitWrappedFontSize } from './utils/textFit';
import {
  fetchAuthSession,
  fetchBackendStats,
  logoutAdminOfficer,
  OfficerUser,
  recordBackendExport,
} from './services/authService';
import { AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, Loader2, X } from 'lucide-react';
import {
  downloadPdfBytes,
  generatePdfFromTemplate,
  getHardcopyDataOnlyYOffsetPt,
  getStoredConfig,
  PDF_CONFIG_UPDATED_EVENT,
  resolveFieldValue,
  resolveMarriageFieldValue,
} from './services/pdfGenerationService';
import { PdfPageCanvas } from './components/PdfPageCanvas';
import { PdfTemplateConfig } from './types/pdfMapping';

export default function App() {
  const [authChecking, setAuthChecking] = useState<boolean>(true);
  const [officer, setOfficer] = useState<OfficerUser | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [exportsCount, setExportsCount] = useState<number>(() => getSessionCount());

  const [currentView, setCurrentView] = useState<
    'dashboard' | 'birth' | 'marriage' | 'drafts' | 'about' | 'help' | 'field-mapper'
  >('dashboard');

  // Birth Certificate State (blank by default for new registries)
  const [birthData, setBirthData] = useState<BirthCertificateData>(INITIAL_BIRTH_DATA);
  const [birthStyle, setBirthStyle] = useState<CertificateStyle>(DEFAULT_BIRTH_STYLE);

  // Marriage Certificate State (blank by default for new registries)
  const [marriageData, setMarriageData] = useState<MarriageCertificateData>(INITIAL_MARRIAGE_DATA);
  const [marriageStyle, setMarriageStyle] = useState<CertificateStyle>(DEFAULT_MARRIAGE_STYLE);

  // Active Draft tracking & session key so opened drafts always start locked and new registries start blank
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);
  const [isOpenedDraft, setIsOpenedDraft] = useState<boolean>(false);
  const [formSessionKey, setFormSessionKey] = useState<number>(0);
  const [multipleBirthChildNumber, setMultipleBirthChildNumber] = useState<number>(1);
  const [draftsCount, setDraftsCount] = useState<number>(0);
  const [printDataOnly, setPrintDataOnly] = useState<boolean>(true);

  // Mobile view switcher: 'form' | 'preview'
  const [mobileViewMode, setMobileViewMode] = useState<'form' | 'style' | 'preview'>('form');

  // Active data binding field for two-way synchronization
  const [activeBindingField, setActiveBindingField] = useState<string | null>(null);
  const [birthMapperMode, setBirthMapperMode] = useState<boolean>(true);
  const [marriageMapperMode, setMarriageMapperMode] = useState<boolean>(true);
  const [mapperStudioSource, setMapperStudioSource] = useState<'birth' | 'marriage'>('birth');
  const [pdfMapperConfig, setPdfMapperConfig] = useState<PdfTemplateConfig>(() =>
    getStoredConfig('ph-colb-102')
  );
  const [comPdfMapperConfig, setComPdfMapperConfig] = useState<PdfTemplateConfig>(() =>
    getStoredConfig('ph-com-97')
  );
  const [birthPreviewFullscreen, setBirthPreviewFullscreen] = useState(false);
  const [marriagePreviewFullscreen, setMarriagePreviewFullscreen] = useState(false);
  const [isDownloadingBirthPdf, setIsDownloadingBirthPdf] = useState(false);
  const [isDownloadingMarriagePdf, setIsDownloadingMarriagePdf] = useState(false);
  const [formWidthPct, setFormWidthPct] = useState<number>(42);
  const [isDraggingSplit, setIsDraggingSplit] = useState(false);
  const [isDesktopViewport, setIsDesktopViewport] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : true
  );
  const splitContainerRef = useRef<HTMLDivElement>(null);
  const dragMovedRef = useRef<boolean>(false);

  // Toast notification state
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type: 'success' | 'info' | 'error';
  } | null>(null);

  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, type === 'error' ? 5000 : 3500);
  };

  const getFriendlyErrorMessage = (err: unknown, fallback: string): string => {
    if (!(err instanceof Error)) return fallback;
    const msg = err.message.trim();
    if (!msg) return fallback;
    if (
      /failed to fetch|networkerror|load failed|unexpected token|syntaxerror|typeerror|enoent|econnrefused|assets\//i.test(
        msg
      )
    ) {
      return fallback;
    }
    return msg;
  };

  useEffect(() => {
    let active = true;
    const initAuth = async () => {
      const session = await fetchAuthSession();
      if (!active) return;
      if (session.authenticated && session.user) {
        setSessionError(null);
        setOfficer(session.user);
        const total = await fetchBackendStats();
        if (active && total !== null) {
          setExportsCount(total);
        }
      } else if (session.backendError) {
        setSessionError(session.backendError);
      }
      setAuthChecking(false);
    };
    void initAuth();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const list = getSavedDrafts();
    setDraftsCount(list.length);
  }, [currentView]);

  useEffect(() => {
    const handleResize = () => {
      setIsDesktopViewport(window.innerWidth >= 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleConfigUpdate = (ev: Event) => {
      const detail = (ev as CustomEvent<PdfTemplateConfig>).detail;
      if (detail && detail.templateId === 'ph-com-97') {
        setComPdfMapperConfig(detail);
      } else if (detail && detail.templateId === 'ph-colb-102') {
        setPdfMapperConfig(detail);
      } else {
        setPdfMapperConfig(getStoredConfig('ph-colb-102'));
        setComPdfMapperConfig(getStoredConfig('ph-com-97'));
      }
    };
    window.addEventListener(PDF_CONFIG_UPDATED_EVENT, handleConfigUpdate);
    return () => window.removeEventListener(PDF_CONFIG_UPDATED_EVENT, handleConfigUpdate);
  }, []);

  useEffect(() => {
    const handleBeforePrint = () => {
      incrementSessionCount();
      setExportsCount((prev) => Math.max(prev, getSessionCount()));
    };
    window.addEventListener('beforeprint', handleBeforePrint);
    return () => window.removeEventListener('beforeprint', handleBeforePrint);
  }, []);

  const [isAppFullscreen, setIsAppFullscreen] = useState<boolean>(() =>
    typeof document !== 'undefined' ? Boolean(document.fullscreenElement) : false
  );

  useEffect(() => {
    const handleFsChange = () => {
      setIsAppFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const handleSplitterMouseDown = (e: React.MouseEvent) => {
    if (!isDesktopViewport) return;
    e.preventDefault();
    const startX = e.clientX;
    dragMovedRef.current = false;
    setIsDraggingSplit(true);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!splitContainerRef.current) return;
      if (Math.abs(moveEvent.clientX - startX) > 4) {
        dragMovedRef.current = true;
      }
      const rect = splitContainerRef.current.getBoundingClientRect();
      const rawPct = ((moveEvent.clientX - rect.left) / rect.width) * 100;
      // Never allow Form to shrink left past original scale (42%); cap expansion at 75%
      const clampedPct = Math.max(42, Math.min(75, Math.round(rawPct * 10) / 10));
      setFormWidthPct(clampedPct);
    };

    const handleMouseUp = () => {
      setIsDraggingSplit(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleSplitterClick = () => {
    if (dragMovedRef.current) {
      dragMovedRef.current = false;
      return;
    }
    // At original scale, edge always expands right; when already expanded, restore to original scale
    setFormWidthPct((prev) => (prev <= 43 ? 74 : 42));
  };

  // Load an existing draft (starts locked in table-like view)
  const handleLoadDraft = (draft: SavedDraft) => {
    setActiveDraftId(draft.id);
    setIsOpenedDraft(true);
    setActiveBindingField(null);
    setMultipleBirthChildNumber(1);
    setFormSessionKey((prev) => prev + 1);
    if (draft.type === 'birth' && draft.birthData) {
      setBirthData(draft.birthData);
      setBirthStyle(draft.style || DEFAULT_BIRTH_STYLE);
      setCurrentView('birth');
    } else if (draft.type === 'marriage' && draft.marriageData) {
      setMarriageData(draft.marriageData);
      setMarriageStyle(draft.style || DEFAULT_MARRIAGE_STYLE);
      setCurrentView('marriage');
    }
    setMobileViewMode('form');
    showToast(`Loaded draft: ${draft.title}`, 'info');
  };

  // Save current work as draft
  const handleSaveDraft = () => {
    const isBirth = currentView === 'birth';
    const draftId = activeDraftId || 'draft_' + Date.now();
    setActiveDraftId(draftId);

    const title = isBirth
      ? birthData.child.fullName || birthData.child.firstName || 'Untitled Birth Certificate'
      : `${marriageData.groom.firstName || 'Groom'} & ${marriageData.bride.firstName || 'Bride'}`;

    const newDraft: SavedDraft = {
      id: draftId,
      type: isBirth ? 'birth' : 'marriage',
      title,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      birthData: isBirth ? birthData : undefined,
      marriageData: !isBirth ? marriageData : undefined,
      style: isBirth ? birthStyle : marriageStyle,
    };

    saveDraft(newDraft);
    const updatedDrafts = getSavedDrafts();
    setDraftsCount(updatedDrafts.length);
    showToast('Draft successfully saved to local storage!');
  };

  const getOrdinalWord = (n: number): string => {
    const words = [
      '',
      'First',
      'Second',
      'Third',
      'Fourth',
      'Fifth',
      'Sixth',
      'Seventh',
      'Eighth',
      'Ninth',
      'Tenth',
    ];
    return words[n] || `${n}th`;
  };

  const incrementBirthOrder = (currentOrder?: string): string => {
    if (!currentOrder) return '';
    const trimmed = currentOrder.trim();
    if (!trimmed) return '';
    const wordMap: Record<string, string> = {
      first: 'Second',
      second: 'Third',
      third: 'Fourth',
      fourth: 'Fifth',
      fifth: 'Sixth',
      sixth: 'Seventh',
      seventh: 'Eighth',
      eighth: 'Ninth',
      ninth: 'Tenth',
    };
    const lower = trimmed.toLowerCase();
    if (wordMap[lower]) return wordMap[lower];
    const numMatch = trimmed.match(/^(\d+)(st|nd|rd|th)?$/i);
    if (numMatch) {
      const nextNum = parseInt(numMatch[1], 10) + 1;
      if (numMatch[2]) {
        const suffix =
          nextNum % 100 >= 11 && nextNum % 100 <= 13
            ? 'th'
            : nextNum % 10 === 1
            ? 'st'
            : nextNum % 10 === 2
            ? 'nd'
            : nextNum % 10 === 3
            ? 'rd'
            : 'th';
        return `${nextNum}${suffix}`;
      }
      return String(nextNum);
    }
    return trimmed;
  };

  // Special case for Multiple Births: save current child and auto-create form for the next child
  const handleSubmitMultipleChild = (mode: 'next' | 'finish') => {
    const now = Date.now();
    const draftId = activeDraftId || `draft_${now}_c${multipleBirthChildNumber}`;
    const baseName =
      birthData.child.fullName ||
      birthData.child.firstName ||
      `Child ${multipleBirthChildNumber}`;
    const birthTypeLabel = birthData.additional.birthType || 'Multiple';
    const title = `${baseName} (${birthTypeLabel} #${multipleBirthChildNumber})`;

    saveDraft({
      id: draftId,
      type: 'birth',
      title,
      createdAt: now,
      updatedAt: now,
      birthData,
      style: birthStyle,
    });
    setDraftsCount(getSavedDrafts().length);

    if (mode === 'next') {
      const nextSeq = multipleBirthChildNumber + 1;
      const nextOrdinal = getOrdinalWord(nextSeq);
      const nextBirthOrder = incrementBirthOrder(
        birthData.colb?.birthOrder ?? birthData.additional.birthOrder
      );

      const nextBirthData: BirthCertificateData = {
        child: {
          ...birthData.child,
          firstName: '',
          fullName: '',
          sex: '',
          timeOfBirth: '',
        },
        mother: { ...birthData.mother },
        father: { ...birthData.father },
        additional: {
          ...birthData.additional,
          birthOrder: nextBirthOrder,
        },
        colb: birthData.colb
          ? {
              ...birthData.colb,
              registryNo: '',
              weightAtBirth: '',
              attendantTime: '',
              birthOrder: nextBirthOrder,
              multipleBirthOrder: nextSeq === 2 ? '2' : '3',
              multipleBirthChildWas: nextSeq >= 4 ? nextOrdinal : '',
              multipleBirthSpecify: nextSeq >= 4 ? nextOrdinal : '',
              affidavitDelayedRegEnabled: false,
            }
          : {
              formNumber: 'Municipal Form No. 102 (Revised August 2016)',
              province: birthData.child.provinceState || '',
              cityMunicipality: birthData.child.cityMunicipality || '',
              registryNo: '',
              birthOrder: nextBirthOrder,
              multipleBirthOrder: nextSeq === 2 ? '2' : '3',
              multipleBirthChildWas: nextSeq >= 4 ? nextOrdinal : '',
              multipleBirthSpecify: nextSeq >= 4 ? nextOrdinal : '',
            },
      };

      setActiveDraftId(null);
      setIsOpenedDraft(false);
      setBirthData(nextBirthData);
      setMultipleBirthChildNumber(nextSeq);
      setFormSessionKey((prev) => prev + 1);
      setMobileViewMode('form');
      showToast(
        `Child ${multipleBirthChildNumber} saved! Form auto-created for Child ${nextSeq}.`,
        'success'
      );
    } else {
      setActiveDraftId(draftId);
      setIsOpenedDraft(false);
      setMultipleBirthChildNumber(1);
      showToast(`Child ${multipleBirthChildNumber} saved! Multiple birth registration complete.`);
    }
  };

  // Reset Birth Form
  const handleResetBirth = () => {
    setBirthData(INITIAL_BIRTH_DATA);
    setActiveDraftId(null);
    setIsOpenedDraft(false);
    setMultipleBirthChildNumber(1);
    showToast('Birth form cleared to blank state', 'info');
  };

  // Reset Marriage Form
  const handleResetMarriage = () => {
    setMarriageData(INITIAL_MARRIAGE_DATA);
    setActiveDraftId(null);
    setIsOpenedDraft(false);
    showToast('Marriage form cleared to blank state', 'info');
  };

  // Start a new certificate creation flow from Dashboard, Navbar, or Saved Registry (always blank form)
  const handleStartNewCertificate = (type: CertificateType) => {
    setActiveDraftId(null);
    setIsOpenedDraft(false);
    setActiveBindingField(null);
    setMultipleBirthChildNumber(1);
    setFormSessionKey((prev) => prev + 1);
    if (type === 'birth') {
      setBirthData(INITIAL_BIRTH_DATA);
    } else {
      setMarriageData(INITIAL_MARRIAGE_DATA);
    }
    setCurrentView(type);
    setMobileViewMode('form');
  };

  // Trigger native browser print dialog synchronously (matching Ctrl+P) and refresh backend export count
  const handlePrint = () => {
    const isBirth = currentView === 'birth';
    const activeStyle = isBirth ? birthStyle : marriageStyle;
    const documentTitle = isBirth
      ? birthData.child.fullName || birthData.child.firstName || 'Certificate of Live Birth'
      : `${marriageData.groom.fullName || 'Groom'} & ${marriageData.bride.fullName || 'Bride'} Marriage Certificate`;

    const result = printCertificate({
      elementId: 'certificate-print-root',
      paperSize: activeStyle.paperSize,
      orientation: activeStyle.pageOrientation,
      certificateType: isBirth ? 'birth' : 'marriage',
      documentTitle,
    });

    setExportsCount((prev) => Math.max(prev + 1, getSessionCount()));
    setTimeout(() => {
      void fetchBackendStats().then((total) => {
        if (total !== null) {
          setExportsCount(total);
        }
      });
    }, 600);

    if (!result.ok) {
      showToast(
        result.error || 'Could not open the print dialog right now. Please try again.',
        'error'
      );
    }
  };

  // Trigger Download PDF (2 Pages)
  const handleDownloadPDF = async () => {
    const isBirth = currentView === 'birth';
    const documentTitle = isBirth
      ? birthData.child.fullName || birthData.child.firstName || 'Certificate of Live Birth'
      : `${marriageData.groom.fullName || 'Groom'} & ${marriageData.bride.fullName || 'Bride'} Marriage Certificate`;
    const style = isBirth ? birthStyle : marriageStyle;

    if (isBirth && style.templateId === 'ph-colb-102' && birthMapperMode) {
      try {
        const pdfBytes = await generatePdfFromTemplate(birthData, {
          templateId: 'ph-colb-102',
          dataOnly: printDataOnly,
        });
        const safeName = (birthData.child?.fullName || birthData.child?.firstName || 'COLB').replace(/\s+/g, '_');
        downloadPdfBytes(pdfBytes, `Official_Form102_${safeName}_${Date.now()}.pdf`);
        const updatedTotal = await recordBackendExport({
          certificateType: 'birth',
          documentTitle,
          action: 'pdf',
          pages: 2,
        });
        setExportsCount(updatedTotal ?? getSessionCount());
        showToast('Official 2-Page PDF downloaded successfully!');
      } catch (err: unknown) {
        showToast(
          getFriendlyErrorMessage(
            err,
            'We could not generate the PDF right now. Please try again.'
          ),
          'error'
        );
      }
      return;
    }

    const isComForm97 =
      !isBirth &&
      (!style.templateId ||
        style.templateId === 'ph-com-97' ||
        style.templateId === 'official-ceremonial' ||
        style.templateId === 'traditional-filipino');

    if (isComForm97 && marriageMapperMode) {
      try {
        const pdfBytes = await generatePdfFromTemplate(marriageData, {
          templateId: 'ph-com-97',
          dataOnly: printDataOnly,
        });
        const safeCouple = `${marriageData.groom?.lastName || 'Groom'}_${marriageData.bride?.lastName || 'Bride'}`.replace(/\s+/g, '_');
        downloadPdfBytes(pdfBytes, `Official_Form97_${safeCouple}_${Date.now()}.pdf`);
        const updatedTotal = await recordBackendExport({
          certificateType: 'marriage',
          documentTitle,
          action: 'pdf',
          pages: 2,
        });
        setExportsCount(updatedTotal ?? getSessionCount());
        showToast('Official 2-Page Marriage PDF downloaded successfully!');
      } catch (err: unknown) {
        showToast(
          getFriendlyErrorMessage(
            err,
            'We could not generate the Marriage PDF right now. Please try again.'
          ),
          'error'
        );
      }
      return;
    }

    const filename = `${
      isBirth
        ? birthStyle.templateId === 'ph-colb-102'
          ? 'PH_Form102_Birth_Certificate'
          : 'Sample_Birth_Certificate'
        : 'Sample_Marriage_Certificate'
    }_${Date.now()}`;

    const success = await downloadCertificatePDF(
      'certificate-print-root',
      filename,
      style.paperSize,
      style.pageOrientation
    );

    if (success) {
      const updatedTotal = await recordBackendExport({
        certificateType: isBirth ? 'birth' : 'marriage',
        documentTitle,
        action: 'pdf',
        pages: isBirth && style.templateId !== 'ph-colb-102' ? 1 : 2,
      });
      setExportsCount(updatedTotal ?? getSessionCount());
      showToast('2-Page PDF downloaded successfully!');
    } else {
      showToast('We could not generate the PDF right now. Please try again.', 'error');
    }
  };

  const handleLogout = async () => {
    await logoutAdminOfficer();
    setOfficer(null);
    setSessionError(null);
    setCurrentView('dashboard');
  };

  const handleLoginSuccess = async (user: OfficerUser) => {
    setSessionError(null);
    setOfficer(user);
    const total = await fetchBackendStats();
    if (total !== null) {
      setExportsCount(total);
    }
  };

  const handleFullscreenView = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      showToast('Browser fullscreen mode is restricted in this frame.', 'info');
    }
  };

  if (authChecking) {
    return (
      <div className="min-h-screen bg-[#F3F5F8] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-[#1D4ED8]" />
      </div>
    );
  }

  if (!officer) {
    return <AdminLoginView onLoginSuccess={handleLoginSuccess} initialError={sessionError} />;
  }

  const isCertView = currentView === 'birth' || currentView === 'marriage';

  return (
    <>
      <div
        className={`min-h-screen flex flex-col font-helvetica text-slate-800 ${
          currentView === 'dashboard' || currentView === 'drafts' ? 'bg-registry-grid' : 'bg-[#F3F5F8]'
        } ${isCertView ? 'no-print' : ''}`}
      >
        {/* Navigation Header */}
        <Navbar
        currentView={currentView}
        onNavigate={(view) => {
          if ((view === 'birth' || view === 'marriage') && (view !== currentView || activeDraftId !== null)) {
            handleStartNewCertificate(view);
            return;
          }
          setCurrentView(view);
          setMobileViewMode('form');
        }}
        draftsCount={draftsCount}
        sessionCount={exportsCount}
        officerName={officer.name}
        onLogout={handleLogout}
        onFullscreenView={handleFullscreenView}
        isFullscreen={isAppFullscreen}
      />

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="no-print fixed top-18 right-4 z-[10001]">
          <div
            role={toastMessage.type === 'error' ? 'alert' : 'status'}
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-semibold shadow-xl border ${
              toastMessage.type === 'error' ? 'border-rose-500/70' : 'border-slate-700'
            }`}
          >
            {toastMessage.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            )}
            <span>{toastMessage.text}</span>
            <button
              type="button"
              onClick={() => setToastMessage(null)}
              className="ml-2 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col">
        {/* VIEW 1: DASHBOARD */}
        {currentView === 'dashboard' && (
          <DashboardView
            onSelectGenerator={handleStartNewCertificate}
            onViewDrafts={() => setCurrentView('drafts')}
            onViewHelp={() => setCurrentView('help')}
            onLoadDraft={handleLoadDraft}
          />
        )}

        {/* VIEW 2: BIRTH CERTIFICATE GENERATOR */}
        {currentView === 'birth' && (
          <div className="max-w-[1600px] w-full mx-auto px-3 sm:px-6 py-4 sm:py-6 flex-1 flex flex-col space-y-4">
            {/* Expandable Split Screen Workspace (Full-height Google AI Studio edge divider) */}
            <div
              ref={splitContainerRef}
              className={`flex flex-col lg:flex-row lg:items-stretch flex-1 relative ${
                isDraggingSplit ? 'select-none cursor-col-resize' : ''
              }`}
            >
              {/* Left Column: Google Form Style COLB Registry */}
              <div
                style={isDesktopViewport ? { width: `${formWidthPct}%` } : undefined}
                className={`w-full shrink-0 space-y-4 ${
                  isDraggingSplit ? '' : 'transition-[width] duration-300 ease-out'
                } ${mobileViewMode === 'preview' ? 'hidden lg:block' : 'block'}`}
              >
                <BirthCertificateForm
                  key={`birth-${formSessionKey}`}
                  data={birthData}
                  onChange={setBirthData}
                  onReset={handleResetBirth}
                  onBackToDashboard={() => setCurrentView('dashboard')}
                  onPreview={() => setBirthPreviewFullscreen(true)}
                  onSaveDraft={handleSaveDraft}
                  onDownloadPDF={async () => {
                    setIsDownloadingBirthPdf(true);
                    await handleDownloadPDF();
                    setIsDownloadingBirthPdf(false);
                  }}
                  isDownloadingPDF={isDownloadingBirthPdf}
                  activeBindingField={activeBindingField}
                  onActiveBindingFieldChange={setActiveBindingField}
                  isEditingFile={isOpenedDraft}
                  multipleBirthChildNumber={multipleBirthChildNumber}
                  onSubmitMultipleChild={handleSubmitMultipleChild}
                />
              </div>

              {/* Full-Edge Google AI Studio Splitter (Spans entire row height; always expands right from original scale) */}
              <div
                onMouseDown={handleSplitterMouseDown}
                onClick={handleSplitterClick}
                role="separator"
                aria-orientation="vertical"
                aria-label={formWidthPct <= 43 ? 'Expand Form Right' : 'Restore Original Scale'}
                className="group/edge hidden lg:flex w-4 shrink-0 self-stretch items-stretch justify-center relative cursor-col-resize z-30"
              >
                {/* Full-height edge highlight line */}
                <div className="w-[2px] h-full rounded-full bg-slate-200/70 group-hover/edge:bg-[#348e38] transition-colors duration-150" />

                {/* Floating Expand Arrow along the edge */}
                <div className="absolute inset-y-0 flex items-center justify-center pointer-events-none">
                  <div className="sticky top-1/2 -translate-y-1/2 opacity-0 group-hover/edge:opacity-100 transition-opacity duration-150 pointer-events-auto">
                    <IconTooltip
                      label={formWidthPct <= 43 ? 'Expand Form Right' : 'Restore Original Width'}
                      placement="top"
                      align="center"
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFormWidthPct((prev) => (prev <= 43 ? 74 : 42));
                        }}
                        aria-label={formWidthPct <= 43 ? 'Expand Form Right' : 'Restore Original Width'}
                        className="w-7 h-11 rounded-full bg-white border border-[#348e38] text-[#246b27] shadow-lg hover:bg-emerald-50 flex items-center justify-center transition-transform hover:scale-105"
                      >
                        {formWidthPct <= 43 ? (
                          <ChevronRight className="w-4 h-4" />
                        ) : (
                          <ChevronLeft className="w-4 h-4" />
                        )}
                      </button>
                    </IconTooltip>
                  </div>
                </div>
              </div>

              {/* Right Column: Live Interactive Preview (Positioned strictly above Certiflow Header z-30 > z-20) */}
              <div
                className={`flex-1 min-w-0 relative z-30 ${
                  mobileViewMode === 'preview' || birthPreviewFullscreen ? 'block' : 'hidden lg:block'
                }`}
              >
                <div className="lg:sticky lg:top-4 space-y-2">
                  {mobileViewMode === 'preview' && !birthPreviewFullscreen && (
                    <div className="lg:hidden flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-slate-200">
                      <button
                        type="button"
                        onClick={() => setMobileViewMode('form')}
                        className="text-xs font-semibold text-slate-700 hover:text-slate-900"
                      >
                        &larr; Back to Form
                      </button>
                    </div>
                  )}
                  <CertificatePreview
                    type="birth"
                    birthData={birthData}
                    style={birthStyle}
                    onUpdateStyle={(updates) => setBirthStyle({ ...birthStyle, ...updates })}
                    documentTitle={birthData.child.fullName || 'Certificate of Live Birth'}
                    activeBindingField={activeBindingField}
                    onSelectBindingField={(fieldId) => {
                      setActiveBindingField(fieldId);
                      if (mobileViewMode === 'preview') {
                        setMobileViewMode('form');
                      }
                    }}
                    onLoadBirthDataset={(ds) => {
                      setBirthData(ds);
                      showToast('Dataset bound to template!', 'info');
                    }}
                    onOpenFieldMapper={() => {
                      setMapperStudioSource('birth');
                      setCurrentView('field-mapper');
                    }}
                    externalFullscreen={birthPreviewFullscreen}
                    onFullscreenChange={setBirthPreviewFullscreen}
                    onPrint={handlePrint}
                    printDataOnly={printDataOnly}
                    onTogglePrintDataOnly={() => setPrintDataOnly((p) => !p)}
                    mapperMode={birthMapperMode}
                    onToggleMapperMode={() => setBirthMapperMode((m) => !m)}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 3: MARRIAGE CERTIFICATE GENERATOR */}
        {currentView === 'marriage' && (
          <div className="max-w-[1600px] w-full mx-auto px-3 sm:px-6 py-4 sm:py-6 flex-1 flex flex-col space-y-4">
            {/* Expandable Split Screen Workspace (Full-height Google AI Studio edge divider) */}
            <div
              ref={splitContainerRef}
              className={`flex flex-col lg:flex-row lg:items-stretch flex-1 relative ${
                isDraggingSplit ? 'select-none cursor-col-resize' : ''
              }`}
            >
              {/* Left Column: Google Form Style Marriage Registry */}
              <div
                style={isDesktopViewport ? { width: `${formWidthPct}%` } : undefined}
                className={`w-full shrink-0 space-y-4 ${
                  isDraggingSplit ? '' : 'transition-[width] duration-300 ease-out'
                } ${mobileViewMode === 'preview' ? 'hidden lg:block' : 'block'}`}
              >
                <MarriageCertificateForm
                  key={`marriage-${formSessionKey}`}
                  data={marriageData}
                  onChange={setMarriageData}
                  onReset={handleResetMarriage}
                  onBackToDashboard={() => setCurrentView('dashboard')}
                  onPreview={() => setMarriagePreviewFullscreen(true)}
                  onSaveDraft={handleSaveDraft}
                  onDownloadPDF={async () => {
                    setIsDownloadingMarriagePdf(true);
                    await handleDownloadPDF();
                    setIsDownloadingMarriagePdf(false);
                  }}
                  isDownloadingPDF={isDownloadingMarriagePdf}
                  isEditingFile={isOpenedDraft}
                />
              </div>

              {/* Full-Edge Google AI Studio Splitter (Spans entire row height; always expands right from original scale) */}
              <div
                onMouseDown={handleSplitterMouseDown}
                onClick={handleSplitterClick}
                role="separator"
                aria-orientation="vertical"
                aria-label={formWidthPct <= 43 ? 'Expand Form Right' : 'Restore Original Scale'}
                className="group/edge hidden lg:flex w-4 shrink-0 self-stretch items-stretch justify-center relative cursor-col-resize z-30"
              >
                {/* Full-height edge highlight line */}
                <div className="w-[2px] h-full rounded-full bg-slate-200/70 group-hover/edge:bg-purple-700 transition-colors duration-150" />

                {/* Floating Expand Arrow along the edge */}
                <div className="absolute inset-y-0 flex items-center justify-center pointer-events-none">
                  <div className="sticky top-1/2 -translate-y-1/2 opacity-0 group-hover/edge:opacity-100 transition-opacity duration-150 pointer-events-auto">
                    <IconTooltip
                      label={formWidthPct <= 43 ? 'Expand Form Right' : 'Restore Original Width'}
                      placement="top"
                      align="center"
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFormWidthPct((prev) => (prev <= 43 ? 74 : 42));
                        }}
                        aria-label={formWidthPct <= 43 ? 'Expand Form Right' : 'Restore Original Width'}
                        className="w-7 h-11 rounded-full bg-white border border-purple-700 text-purple-800 shadow-lg hover:bg-purple-50 flex items-center justify-center transition-transform hover:scale-105"
                      >
                        {formWidthPct <= 43 ? (
                          <ChevronRight className="w-4 h-4" />
                        ) : (
                          <ChevronLeft className="w-4 h-4" />
                        )}
                      </button>
                    </IconTooltip>
                  </div>
                </div>
              </div>

              {/* Right Column: Live Interactive Preview (Positioned strictly above Certiflow Header z-30 > z-20) */}
              <div
                className={`flex-1 min-w-0 relative z-30 ${
                  mobileViewMode === 'preview' || marriagePreviewFullscreen ? 'block' : 'hidden lg:block'
                }`}
              >
                <div className="lg:sticky lg:top-4 space-y-2">
                  {mobileViewMode === 'preview' && !marriagePreviewFullscreen && (
                    <div className="lg:hidden flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-slate-200">
                      <button
                        type="button"
                        onClick={() => setMobileViewMode('form')}
                        className="text-xs font-semibold text-slate-700 hover:text-slate-900"
                      >
                        &larr; Back to Form
                      </button>
                    </div>
                  )}
                  <CertificatePreview
                    type="marriage"
                    marriageData={marriageData}
                    style={marriageStyle}
                    onUpdateStyle={(updates) => setMarriageStyle({ ...marriageStyle, ...updates })}
                    documentTitle={`${marriageData.groom.fullName || 'Groom'} & ${marriageData.bride.fullName || 'Bride'} Marriage Certificate`}
                    onOpenFieldMapper={() => {
                      setMapperStudioSource('marriage');
                      setCurrentView('field-mapper');
                    }}
                    externalFullscreen={marriagePreviewFullscreen}
                    onFullscreenChange={setMarriagePreviewFullscreen}
                    onPrint={handlePrint}
                    printDataOnly={printDataOnly}
                    onTogglePrintDataOnly={() => setPrintDataOnly((p) => !p)}
                    mapperMode={marriageMapperMode}
                    onToggleMapperMode={() => setMarriageMapperMode((m) => !m)}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 4: SAVED DRAFTS */}
        {currentView === 'drafts' && (
          <SavedDraftsView
            onLoadDraft={handleLoadDraft}
            onNavigateToGenerator={handleStartNewCertificate}
          />
        )}

        {/* VIEW 5: ABOUT */}
        {currentView === 'about' && <AboutView />}

        {/* VIEW 6: HELP */}
        {currentView === 'help' && <HelpView />}

        {/* VIEW 7: PDF FIELD MAPPER & POSITIONING STUDIO */}
        {currentView === 'field-mapper' && (
          <TemplateFieldMapper
            birthData={birthData}
            marriageData={marriageData}
            initialTemplateId={mapperStudioSource === 'marriage' ? 'ph-com-97' : 'ph-colb-102'}
            onBackToApp={() => setCurrentView(mapperStudioSource)}
          />
        )}
      </main>

      {/* Global Minimal Footer */}
      <footer className="no-print bg-white border-t-2 border-[#1E3A8A] mt-auto py-4 text-center text-xs text-slate-600">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#1E3A8A]">Certiflow: Sagbayan Documents</span>
            <span className="text-slate-300">&bull;</span>
            <span className="text-slate-600">Civil Registry Document System</span>
          </div>

          <p className="text-[11px] text-[#1E3A8A]/80 font-semibold">
            CONFIDENTIAL CIVIL REGISTRY SYSTEM &bull; MUNICIPALITY OF SAGBAYAN, BOHOL
          </p>
        </div>
      </footer>
      </div>

      {/* Dedicated Unscaled 2-Page Print & PDF Export Root (ONLY element visible during Print / Ctrl+P) */}
      {isCertView && (
        <div
          id="certificate-print-root"
          className={`hidden print:block bg-white ${printDataOnly ? 'print-data-only' : ''}`}
        >
          {currentView === 'birth' && (
            birthStyle.templateId === 'ph-colb-102' && birthMapperMode ? (
              <>
                {[0, 1].map((pageIndex) => {
                  const dim = pdfMapperConfig.pageDimensions[pageIndex] || {
                    pageIndex,
                    width: 612,
                    height: 936,
                    unit: 'pt' as const,
                  };
                  const pageFields = pdfMapperConfig.fields.filter(
                    (f) => (f.pageIndex ?? 0) === pageIndex
                  );
                  return (
                    <div
                      key={pageIndex}
                      data-cert-sheet={pageIndex === 0 ? 'page1' : 'page2'}
                      style={{ width: `${dim.width}pt`, height: `${dim.height}pt` }}
                      className="print-pdf-sheet relative bg-white mx-auto overflow-hidden"
                    >
                      <PdfPageCanvas
                        pdfPath={pdfMapperConfig.pdfPath}
                        pageIndex={pageIndex}
                        width={dim.width}
                        height={dim.height}
                        hidden={printDataOnly}
                        className="!w-[612pt] !h-[936pt]"
                      />
                      {pageFields.map((field) => {
                        const val = resolveFieldValue(field, birthData);
                        if (!val) return null;
                        const baseFontSize = field.fontSize || 10;
                        const maxWidth = field.maxWidth || 160;
                        const fontSize = !field.isCheckbox
                          ? field.allowWrap
                            ? fitWrappedFontSize(
                                val,
                                field.fontFamily,
                                baseFontSize,
                                maxWidth,
                                field.maxLines || 2,
                                field.minFontSize || 5.5
                              )
                            : fitFontSizeToWidth(
                                val,
                                field.fontFamily,
                                baseFontSize,
                                maxWidth,
                                field.minFontSize || 5.5
                              )
                          : baseFontSize;
                        const hardcopyYOffset = printDataOnly
                          ? getHardcopyDataOnlyYOffsetPt('ph-colb-102')
                          : 0;
                        const topPt = dim.height - (field.y + hardcopyYOffset) - fontSize * 0.85;
                        const transformX =
                          field.isCheckbox || field.textAlign === 'center'
                            ? 'translateX(-50%)'
                            : field.textAlign === 'right'
                            ? 'translateX(-100%)'
                            : 'none';
                        return (
                          <div
                            key={field.id}
                            style={{
                              position: 'absolute',
                              left: `${field.x}pt`,
                              top: `${topPt}pt`,
                              width: field.isCheckbox ? `${Math.max(14, field.maxWidth || 20)}pt` : `${maxWidth}pt`,
                              transform: transformX,
                            }}
                          >
                            <span
                              data-print-value="true"
                              style={{
                                display: 'block',
                                fontSize: `${fontSize}pt`,
                                lineHeight: field.allowWrap ? `${field.lineHeightMultiplier || 1.15}` : '1.1',
                                fontFamily:
                                  field.fontFamily === 'Courier'
                                    ? 'Courier, monospace'
                                    : field.fontFamily === 'TimesRoman'
                                    ? '"Times New Roman", serif'
                                    : 'Helvetica, Arial, sans-serif',
                                fontWeight:
                                  field.fontFamily === 'HelveticaBold' || field.isCheckbox ? 700 : 500,
                                textAlign: field.isCheckbox ? 'center' : field.textAlign || 'left',
                                color: '#000000',
                              }}
                              className={`overflow-hidden ${field.allowWrap ? 'break-words' : 'whitespace-nowrap'}`}
                            >
                              {field.isCheckbox ? 'X' : val}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </>
            ) : (
              <>
                <div
                  data-cert-sheet="page1"
                  className="bg-white w-fit mx-auto [&>div]:!p-1 [&>div]:!aspect-auto"
                >
                  <BirthCertificateTemplate data={birthData} style={birthStyle} page="page1" />
                </div>
                {(!birthStyle.templateId || birthStyle.templateId === 'ph-colb-102') && (
                  <div
                    data-cert-sheet="page2"
                    className="bg-white w-fit mx-auto [&>div]:!p-1 [&>div]:!aspect-auto"
                  >
                    <BirthCertificateTemplate data={birthData} style={birthStyle} page="page2" />
                  </div>
                )}
              </>
            )
          )}
          {currentView === 'marriage' && (
            (!marriageStyle.templateId ||
              marriageStyle.templateId === 'ph-com-97' ||
              marriageStyle.templateId === 'official-ceremonial' ||
              marriageStyle.templateId === 'traditional-filipino') &&
            marriageMapperMode ? (
              <>
                {[0, 1].map((pageIndex) => {
                  const dim = comPdfMapperConfig.pageDimensions[pageIndex] || {
                    pageIndex,
                    width: 612,
                    height: 936,
                    unit: 'pt' as const,
                  };
                  const pageFields = comPdfMapperConfig.fields.filter(
                    (f) => (f.pageIndex ?? 0) === pageIndex
                  );
                  return (
                    <div
                      key={pageIndex}
                      data-cert-sheet={pageIndex === 0 ? 'page1' : 'page2'}
                      style={{ width: `${dim.width}pt`, height: `${dim.height}pt` }}
                      className="print-pdf-sheet relative bg-white mx-auto overflow-hidden"
                    >
                      <PdfPageCanvas
                        pdfPath={comPdfMapperConfig.pdfPath}
                        pageIndex={pageIndex}
                        width={dim.width}
                        height={dim.height}
                        hidden={printDataOnly}
                        className="!w-[612pt] !h-[936pt]"
                      />
                      {pageFields.map((field) => {
                        const val = resolveMarriageFieldValue(field, marriageData);
                        if (!val) return null;
                        const baseFontSize = field.fontSize || 10;
                        const maxWidth = field.maxWidth || 160;
                        const fontSize = !field.isCheckbox
                          ? field.allowWrap
                            ? fitWrappedFontSize(
                                val,
                                field.fontFamily,
                                baseFontSize,
                                maxWidth,
                                field.maxLines || 2,
                                field.minFontSize || 5.5
                              )
                            : fitFontSizeToWidth(
                                val,
                                field.fontFamily,
                                baseFontSize,
                                maxWidth,
                                field.minFontSize || 5.5
                              )
                          : baseFontSize;
                        const hardcopyYOffset = printDataOnly
                          ? getHardcopyDataOnlyYOffsetPt('ph-com-97')
                          : 0;
                        const topPt = dim.height - (field.y + hardcopyYOffset) - fontSize * 0.85;
                        const transformX =
                          field.isCheckbox || field.textAlign === 'center'
                            ? 'translateX(-50%)'
                            : field.textAlign === 'right'
                            ? 'translateX(-100%)'
                            : 'none';
                        return (
                          <div
                            key={field.id}
                            style={{
                              position: 'absolute',
                              left: `${field.x}pt`,
                              top: `${topPt}pt`,
                              width: field.isCheckbox
                                ? `${Math.max(14, field.maxWidth || 20)}pt`
                                : `${maxWidth}pt`,
                              transform: transformX,
                            }}
                          >
                            <span
                              data-print-value="true"
                              style={{
                                display: 'block',
                                fontSize: `${fontSize}pt`,
                                lineHeight: field.allowWrap ? `${field.lineHeightMultiplier || 1.15}` : '1.1',
                                fontFamily:
                                  field.fontFamily === 'Courier'
                                    ? 'Courier, monospace'
                                    : field.fontFamily === 'TimesRoman'
                                    ? '"Times New Roman", serif'
                                    : 'Helvetica, Arial, sans-serif',
                                fontWeight:
                                  field.fontFamily === 'HelveticaBold' || field.isCheckbox ? 700 : 500,
                                textAlign: field.isCheckbox ? 'center' : field.textAlign || 'left',
                                color: '#000000',
                              }}
                              className={`overflow-hidden ${field.allowWrap ? 'break-words' : 'whitespace-nowrap'}`}
                            >
                              {field.isCheckbox ? 'X' : val}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </>
            ) : (
              <>
                <div
                  data-cert-sheet="page1"
                  className="bg-white w-fit mx-auto [&>div]:!p-1 [&>div]:!aspect-auto"
                >
                  <MarriageCertificateTemplate data={marriageData} style={marriageStyle} page="page1" />
                </div>
                <div
                  data-cert-sheet="page2"
                  className="bg-white w-fit mx-auto [&>div]:!p-1 [&>div]:!aspect-auto"
                >
                  <MarriageCertificateTemplate data={marriageData} style={marriageStyle} page="page2" />
                </div>
              </>
            )
          )}
        </div>
      )}
    </>
  );
}
