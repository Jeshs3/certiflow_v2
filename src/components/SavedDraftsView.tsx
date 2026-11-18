import React, { useState } from 'react';
import { CertificateType, SavedDraft } from '../types/certificate';
import { clearAllDrafts, deleteDraft, duplicateDraft, getSavedDrafts } from '../utils/certificateUtils';
import {
  Baby,
  Heart,
  Copy,
  Trash2,
  AlertCircle,
  FolderOpen,
  ArrowRight,
} from 'lucide-react';

interface SavedDraftsViewProps {
  onLoadDraft: (draft: SavedDraft) => void;
  onNavigateToGenerator: (type: CertificateType) => void;
}

function formatDraftDateTime(timestamp?: number): string {
  if (!timestamp) return '—';
  const d = new Date(timestamp);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const SavedDraftsView: React.FC<SavedDraftsViewProps> = ({
  onLoadDraft,
  onNavigateToGenerator,
}) => {
  const [drafts, setDrafts] = useState<SavedDraft[]>(getSavedDrafts());
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const handleDelete = (id: string) => {
    const updated = deleteDraft(id);
    setDrafts(updated);
    setDeleteTargetId(null);
  };

  const handleDuplicate = (id: string) => {
    const copy = duplicateDraft(id);
    if (copy) {
      setDrafts(getSavedDrafts());
    }
  };

  const handleClearAll = () => {
    clearAllDrafts();
    setDrafts([]);
    setShowClearConfirm(false);
  };

  return (
    <div className="font-helvetica max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b-2 border-[#1E3A8A]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#1E3A8A] tracking-tight flex items-center gap-2.5">
            <FolderOpen className="w-7 h-7 text-[#1D4ED8]" />
            Saved Registry
          </h1>
        </div>

        {drafts.length > 0 && (
          <button
            type="button"
            onClick={() => setShowClearConfirm(true)}
            className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear All Drafts</span>
          </button>
        )}
      </div>

      {/* Drafts Table or Empty State */}
      {drafts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center space-y-4 max-w-lg mx-auto shadow-xs">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
            <FolderOpen className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-semibold text-slate-800">No Saved Drafts Yet</h3>
          <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
            When you create a certificate of birth or marriage, click "Save Draft" in the editor
            to preserve your work for future editing and printing.
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => onNavigateToGenerator('birth')}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-[#348e38] hover:bg-[#2a752e] text-white shadow-xs transition-colors"
            >
              <Baby className="w-4 h-4" />
              <span>Create Birth Certificate</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateToGenerator('marriage')}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-colors"
            >
              <Heart className="w-4 h-4" />
              <span>Create Marriage Certificate</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-sm border-2 border-[#1E3A8A] shadow-[6px_6px_0px_0px_rgba(30,58,138,0.14)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#EFF4FF] border-b border-[#BFDBFE] text-[#1E3A8A] uppercase text-[11px] tracking-wider">
                  <th className="py-3 px-4 font-bold">Document Title</th>
                  <th className="py-3 px-4 font-bold">Type of Document</th>
                  <th className="py-3 px-4 font-bold">Event Date</th>
                  <th className="py-3 px-4 font-bold">Created Date</th>
                  <th className="py-3 px-4 font-bold">Updated At</th>
                  <th className="py-3 px-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {drafts.map((draft) => {
                  const isBirth = draft.type === 'birth';
                  const subjectName = isBirth
                    ? draft.birthData?.child.fullName ||
                      draft.birthData?.child.firstName ||
                      draft.title ||
                      'Untitled Birth Draft'
                    : `${draft.marriageData?.groom.firstName || 'Groom'} & ${draft.marriageData?.bride.firstName || 'Bride'}`;

                  const eventDate = isBirth
                    ? draft.birthData?.child.dateOfBirth
                    : draft.marriageData?.marriage.dateOfMarriage;

                  return (
                    <tr
                      key={draft.id}
                      onClick={() => onLoadDraft(draft)}
                      className="hover:bg-slate-50/90 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {subjectName}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`text-xs font-semibold ${
                            isBirth ? 'text-[#266b29]' : 'text-rose-700'
                          }`}
                        >
                          {isBirth ? 'Birth Certificate' : 'Marriage Certificate'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        {eventDate || '—'}
                      </td>
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        {formatDraftDateTime(draft.createdAt)}
                      </td>
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        {formatDraftDateTime(draft.updatedAt)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div
                          className="inline-flex items-center justify-end gap-1.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => onLoadDraft(draft)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-sm bg-[#1D4ED8] hover:bg-[#1E40AF] text-white transition-colors cursor-pointer"
                          >
                            <span>Edit &amp; Preview</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDuplicate(draft.id)}
                            title="Duplicate Draft"
                            aria-label="Duplicate Draft"
                            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTargetId(draft.id)}
                            title="Delete Draft"
                            aria-label="Delete Draft"
                            className="p-1.5 text-slate-500 hover:text-red-700 hover:bg-red-50 rounded-lg border border-slate-200 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete Single Draft Modal */}
      {deleteTargetId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-slate-900">Delete this draft?</h3>
            </div>
            <p className="text-xs sm:text-sm text-slate-600">
              This draft will be removed from your saved drafts. This action cannot be reversed.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTargetId(null)}
                className="px-3 py-1.5 text-xs font-medium rounded-lg text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deleteTargetId)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-600 hover:bg-red-700 text-white"
              >
                Delete Draft
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear All Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-slate-900">Clear All Saved Drafts?</h3>
            </div>
            <p className="text-xs sm:text-sm text-slate-600">
              Are you sure you want to delete all saved drafts? All saved certificate drafts will be permanently cleared.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="px-3 py-1.5 text-xs font-medium rounded-lg text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClearAll}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-600 hover:bg-red-700 text-white"
              >
                Yes, Clear Everything
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
