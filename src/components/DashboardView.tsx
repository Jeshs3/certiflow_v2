import React from 'react';
import { CertificateType, SavedDraft } from '../types/certificate';
import { getSavedDrafts } from '../utils/certificateUtils';
import { ArrowRight, ShieldAlert, Clock, Pencil } from 'lucide-react';

interface DashboardViewProps {
  onSelectGenerator: (type: CertificateType) => void;
  onViewDrafts: () => void;
  onViewHelp?: () => void;
  onLoadDraft: (draft: SavedDraft, startEditable?: boolean) => void;
}

function formatDraftTimestamp(timestamp?: number): string {
  if (!timestamp) return '—';
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onSelectGenerator,
  onViewDrafts,
  onLoadDraft,
}) => {
  const drafts = getSavedDrafts();
  const recentDrafts = drafts.slice(0, 5);

  return (
    <div className="font-helvetica max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-7 space-y-6">
      {/* Compact Confidential Document Notice */}
      <div className="bg-amber-50 border-2 border-amber-600 rounded-sm px-4 py-2.5 flex items-start gap-2.5 shadow-[3px_3px_0px_0px_rgba(217,119,6,0.16)]">
        <ShieldAlert className="w-4 h-4 text-amber-800 shrink-0 mt-0.5" />
        <div className="text-[11px] sm:text-xs text-amber-950 leading-snug">
          <span className="font-bold uppercase tracking-wide text-amber-900 mr-1.5">
            Confidential Document Notice:
          </span>
          <span className="text-amber-900">
            This system contains confidential civil registry records. Unauthorized access,
            reproduction, alteration, or disclosure is strictly prohibited and subject to legal
            prosecution under data privacy laws.
          </span>
        </div>
      </div>

      {/* Registry Header & Royal Blue Two-Folio Grid */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-2 pb-2.5 border-b-2 border-[#1E3A8A]">
          <h2 className="text-xl sm:text-2xl font-bold text-[#1E3A8A] tracking-tight">
            Certiflow Document Registry
          </h2>
          <span className="text-xs text-slate-600 font-medium">
            Select a certificate folio · Sagbayan, Bohol
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch">
          {/* Folio 01: Certificate of Live Birth */}
          <div className="bg-[#1D4ED8] border-2 border-[#1E3A8A] rounded-sm shadow-[6px_6px_0px_0px_rgba(30,58,138,0.18)] text-white flex flex-col justify-between group overflow-hidden">
            <div className="px-5 py-2.5 bg-[#1E40AF] border-b border-white/20 flex items-center justify-between gap-2 text-[11px] font-semibold text-blue-100">
              <span>01 · Municipal Form No. 102</span>
              <span>Revised August 2016</span>
            </div>

            <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between gap-6">
              <div className="space-y-1.5">
                <h3 className="text-xl font-bold text-white tracking-tight">
                  Certificate of Live Birth
                </h3>
                <p className="text-xs text-blue-100 leading-relaxed">
                  Office of the Municipal Civil Registrar · Sagbayan, Bohol
                </p>
              </div>

              <div className="pt-2 flex items-center justify-between gap-3 border-t border-white/20">
                <span className="text-[11px] text-blue-100">2-Page Official Template</span>
                <button
                  type="button"
                  onClick={() => onSelectGenerator('birth')}
                  className="inline-flex items-center justify-center gap-2 py-2.5 px-5 rounded-sm bg-transparent hover:bg-white/10 border border-white text-white text-xs sm:text-sm font-bold transition-colors cursor-pointer shrink-0 whitespace-nowrap"
                >
                  <span>Create Birth Certificate</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </div>
          </div>

          {/* Folio 02: Certificate of Marriage */}
          <div className="bg-[#1D4ED8] border-2 border-[#1E3A8A] rounded-sm shadow-[6px_6px_0px_0px_rgba(30,58,138,0.18)] text-white flex flex-col justify-between group overflow-hidden">
            <div className="px-5 py-2.5 bg-[#1E40AF] border-b border-white/20 flex items-center justify-between gap-2 text-[11px] font-semibold text-blue-100">
              <span>02 · Municipal Form No. 97</span>
              <span>Dual-Page Record</span>
            </div>

            <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between gap-6">
              <div className="space-y-1.5">
                <h3 className="text-xl font-bold text-white tracking-tight">
                  Certificate of Marriage
                </h3>
                <p className="text-xs text-blue-100 leading-relaxed">
                  Office of the Municipal Civil Registrar · Sagbayan, Bohol
                </p>
              </div>

              <div className="pt-2 flex items-center justify-between gap-3 border-t border-white/20">
                <span className="text-[11px] text-blue-100">2-Page Official Template</span>
                <button
                  type="button"
                  onClick={() => onSelectGenerator('marriage')}
                  className="inline-flex items-center justify-center gap-2 py-2.5 px-5 rounded-sm bg-transparent hover:bg-white/10 border border-white text-white text-xs sm:text-sm font-bold transition-colors cursor-pointer shrink-0 whitespace-nowrap"
                >
                  <span>Create Marriage Certificate</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Recently Saved Drafts Ledger Table */}
      <section className="bg-white border-2 border-[#1E3A8A] rounded-sm shadow-[6px_6px_0px_0px_rgba(30,58,138,0.14)] overflow-hidden">
        <div className="px-5 py-3.5 bg-[#1E40AF] text-white border-b border-[#1E3A8A] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-100 shrink-0" />
            <h3 className="font-bold text-sm sm:text-base tracking-tight">
              Recently Saved Drafts
            </h3>
          </div>
          {drafts.length > 0 && (
            <button
              type="button"
              onClick={onViewDrafts}
              className="text-xs font-semibold text-white hover:text-blue-100 flex items-center gap-1 cursor-pointer whitespace-nowrap"
            >
              <span>View All ({drafts.length})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#EFF4FF] border-b border-[#BFDBFE] text-[#1E3A8A] text-[11px] tracking-wide">
                <th className="py-3 px-4 font-bold">Document Title</th>
                <th className="py-3 px-4 font-bold">Type of Document</th>
                <th className="py-3 px-4 font-bold">Created Date</th>
                <th className="py-3 px-4 font-bold">Updated At</th>
                <th className="py-3 px-4 font-bold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80">
              {recentDrafts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 px-4 text-center text-slate-500">
                    No saved drafts yet. Open a certificate folio and click Save Draft to record it
                    here.
                  </td>
                </tr>
              ) : (
                recentDrafts.map((draft) => {
                  const isBirth = draft.type === 'birth';
                  const name = isBirth
                    ? draft.birthData?.child.fullName ||
                      draft.birthData?.child.firstName ||
                      draft.title ||
                      'Untitled Birth'
                    : `${draft.marriageData?.groom.firstName || 'Groom'} & ${
                        draft.marriageData?.bride.firstName || 'Bride'
                      }`;

                  return (
                    <tr
                      key={draft.id}
                      onClick={() => onLoadDraft(draft)}
                      className="hover:bg-[#F5F8FF] cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4 font-bold text-slate-900">{name}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`text-xs font-semibold ${
                            isBirth ? 'text-[#266b29]' : 'text-rose-700'
                          }`}
                        >
                          {isBirth ? 'Birth Certificate' : 'Marriage Certificate'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap tabular-nums">
                        {formatDraftTimestamp(draft.createdAt)}
                      </td>
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap tabular-nums">
                        {formatDraftTimestamp(draft.updatedAt)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onLoadDraft(draft, true);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-sm bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition-colors cursor-pointer whitespace-nowrap"
                          >
                            <Pencil className="w-3 h-3" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onLoadDraft(draft, false);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm bg-[#1D4ED8] hover:bg-[#1E40AF] text-white font-semibold transition-colors cursor-pointer whitespace-nowrap"
                          >
                            <span>Open</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
