import React from 'react';
import {
  Baby,
  Heart,
  FolderOpen,
  Home,
  FileCheck2,
  Printer,
  LogOut,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { IconTooltip } from './IconTooltip';

interface NavbarProps {
  currentView: 'dashboard' | 'birth' | 'marriage' | 'drafts' | 'about' | 'help' | 'field-mapper';
  onNavigate: (view: 'dashboard' | 'birth' | 'marriage' | 'drafts' | 'about' | 'help' | 'field-mapper') => void;
  draftsCount: number;
  sessionCount?: number;
  officerName?: string;
  onLogout?: () => void;
  onFullscreenView?: () => void;
  isFullscreen?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onNavigate,
  draftsCount,
  sessionCount = 0,
  officerName,
  onLogout,
  onFullscreenView,
  isFullscreen = false,
}) => {
  return (
    <header className="no-print font-helvetica bg-[#1D4ED8] border-b-2 border-[#1E3A8A] sticky top-0 z-20 text-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 min-h-16 py-2 flex flex-wrap items-center justify-between gap-3">
        {/* Brand Logo & Name */}
        <div
          onClick={() => onNavigate('dashboard')}
          className="flex items-center gap-2.5 cursor-pointer select-none group shrink-0"
        >
          <div className="w-10 h-10 rounded-sm bg-[#1E3A8A] border border-white/25 flex items-center justify-center text-white group-hover:bg-[#172E6E] transition-colors">
            <FileCheck2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-bold text-white text-sm sm:text-base md:text-lg tracking-tight block leading-tight">
              Certiflow: Sagbayan Documents
            </span>
            <span className="text-[11px] text-blue-100 font-medium tracking-wide block">
              Certificate Template Generator
            </span>
          </div>
        </div>

        {/* Header Navigation & Icons */}
        <nav className="flex flex-wrap items-center gap-1.5 sm:gap-2.5">
          <IconTooltip label="Home" placement="bottom" align="center">
            <button
              type="button"
              onClick={() => onNavigate('dashboard')}
              aria-label="Home"
              className={`inline-flex items-center justify-center w-9 h-9 rounded-sm border text-xs font-semibold transition-colors cursor-pointer ${
                currentView === 'dashboard'
                  ? 'bg-white border-white text-[#1E3A8A]'
                  : 'border-white/25 bg-[#1E40AF]/60 text-white hover:bg-[#1E3A8A]'
              }`}
            >
              <Home className="w-4 h-4" />
            </button>
          </IconTooltip>

          <button
            type="button"
            onClick={() => onNavigate('birth')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm border text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              currentView === 'birth'
                ? 'bg-white border-white text-[#266b29] font-bold'
                : 'border-white/25 bg-[#1E40AF]/60 text-white hover:bg-[#1E3A8A]'
            }`}
          >
            <Baby
              className={`w-4 h-4 ${currentView === 'birth' ? 'text-[#348e38]' : 'text-blue-100'}`}
            />
            <span>Birth Certificate</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('marriage')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm border text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              currentView === 'marriage'
                ? 'bg-white border-white text-rose-700 font-bold'
                : 'border-white/25 bg-[#1E40AF]/60 text-white hover:bg-[#1E3A8A]'
            }`}
          >
            <Heart
              className={`w-4 h-4 ${
                currentView === 'marriage' ? 'text-rose-600' : 'text-blue-100'
              }`}
            />
            <span>Marriage Certificate</span>
          </button>

          {onFullscreenView && (
            <IconTooltip
              label={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen View'}
              placement="bottom"
              align="center"
            >
              <button
                type="button"
                onClick={onFullscreenView}
                aria-label={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen View'}
                className={`inline-flex items-center justify-center w-9 h-9 rounded-sm border transition-colors cursor-pointer ${
                  isFullscreen
                    ? 'bg-white border-white text-[#1E3A8A]'
                    : 'border-white/25 bg-[#1E40AF]/60 text-white hover:bg-[#1E3A8A]'
                }`}
              >
                {isFullscreen ? (
                  <Minimize2 className="w-4 h-4" />
                ) : (
                  <Maximize2 className="w-4 h-4" />
                )}
              </button>
            </IconTooltip>
          )}

          {/* Icon-only Exports with Top-Right Notification Counter */}
          <IconTooltip label={`Exports (${sessionCount})`} placement="bottom" align="center">
            <div
              role="status"
              aria-label={`Exports: ${sessionCount}`}
              className="relative inline-flex items-center justify-center w-9 h-9 rounded-sm bg-[#1E40AF]/70 border border-white/25 text-white"
            >
              <Printer className="w-4 h-4 text-blue-100" />
              <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-white text-[#1E3A8A] border border-[#1E3A8A] text-[10px] font-bold tabular-nums flex items-center justify-center leading-none shadow-xs">
                {sessionCount}
              </span>
            </div>
          </IconTooltip>

          {/* Icon-only Drafts with Hover Label */}
          <IconTooltip label={`Drafts (${draftsCount})`} placement="bottom" align="center">
            <button
              type="button"
              onClick={() => onNavigate('drafts')}
              aria-label={`Drafts (${draftsCount})`}
              className={`relative inline-flex items-center justify-center w-9 h-9 rounded-sm border transition-colors cursor-pointer ${
                currentView === 'drafts'
                  ? 'bg-white border-white text-[#1E3A8A]'
                  : 'bg-[#1E40AF]/70 hover:bg-[#1E3A8A] border-white/25 text-white'
              }`}
            >
              <FolderOpen className="w-4 h-4" />
              <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#1E3A8A] text-white border border-white/40 text-[10px] font-bold tabular-nums flex items-center justify-center leading-none shadow-xs">
                {draftsCount}
              </span>
            </button>
          </IconTooltip>

          {/* Icon-only Sign Out with Hover Label */}
          {onLogout && (
            <IconTooltip
              label={officerName ? `Sign Out (${officerName})` : 'Sign Out'}
              placement="bottom"
              align="right"
            >
              <button
                type="button"
                onClick={onLogout}
                aria-label="Sign Out"
                className="inline-flex items-center justify-center w-9 h-9 rounded-sm border border-white/25 bg-[#1E40AF]/60 hover:bg-[#1E3A8A] text-white transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </IconTooltip>
          )}
        </nav>
      </div>
    </header>
  );
};
