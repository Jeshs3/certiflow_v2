/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

const pdfDocCache = new Map<string, Promise<pdfjsLib.PDFDocumentProxy>>();

function getCachedPdfDocument(pdfPath: string): Promise<pdfjsLib.PDFDocumentProxy> {
  const existing = pdfDocCache.get(pdfPath);
  if (existing) return existing;

  const loadingTask = pdfjsLib.getDocument({ url: pdfPath });
  const promise = loadingTask.promise.catch((err) => {
    pdfDocCache.delete(pdfPath);
    throw err;
  });
  pdfDocCache.set(pdfPath, promise);
  return promise;
}

interface PdfPageCanvasProps {
  pdfPath: string;
  pageIndex: number; // 0-indexed
  width?: number;
  height?: number;
  renderScale?: number;
  hidden?: boolean;
  className?: string;
}

export const PdfPageCanvas: React.FC<PdfPageCanvasProps> = ({
  pdfPath,
  pageIndex,
  width = 612,
  height = 936,
  renderScale = 2,
  hidden = false,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    if (hidden) return;
    let cancelled = false;
    let renderTask: pdfjsLib.RenderTask | null = null;

    const renderPage = async () => {
      try {
        setStatus((prev) => (prev === 'ready' ? 'ready' : 'loading'));
        const pdf = await getCachedPdfDocument(pdfPath);
        if (cancelled) return;

        const targetPageNum = Math.min(Math.max(1, pageIndex + 1), pdf.numPages);
        const page = await pdf.getPage(targetPageNum);
        if (cancelled || !canvasRef.current) return;

        const baseViewport = page.getViewport({ scale: 1 });
        const fitScale = (width / baseViewport.width) * renderScale;
        const viewport = page.getViewport({ scale: fitScale });

        const canvas = canvasRef.current;
        canvas.width = Math.round(viewport.width);
        canvas.height = Math.round(viewport.height);

        renderTask = page.render({
          canvas,
          viewport,
        });

        await renderTask.promise;
        if (!cancelled) {
          setStatus('ready');
          setErrorMsg('');
        }
      } catch (err: unknown) {
        if (
          err &&
          typeof err === 'object' &&
          'name' in err &&
          (err as { name?: string }).name === 'RenderingCancelledException'
        ) {
          return;
        }
        if (!cancelled) {
          setStatus('error');
          setErrorMsg(err instanceof Error ? err.message : 'Unable to render PDF page');
        }
      }
    };

    void renderPage();

    return () => {
      cancelled = true;
      if (renderTask) {
        try {
          renderTask.cancel();
        } catch {
          // Ignore cancellation errors
        }
      }
    };
  }, [pdfPath, pageIndex, width, height, renderScale, hidden]);

  if (hidden) {
    return (
      <div
        className={`bg-white pointer-events-none select-none ${className}`}
        style={{ width: `${width}px`, height: `${height}px` }}
      />
    );
  }

  return (
    <div
      className={`relative bg-white pointer-events-none select-none ${className}`}
      style={{ width: `${width}px`, height: `${height}px` }}
    >
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%' }}
        className="block w-full h-full"
      />
      {status === 'loading' && (
        <div className="no-print absolute inset-0 flex items-center justify-center bg-slate-50/70 text-[11px] font-medium text-slate-500">
          Loading official PDF page {pageIndex + 1}...
        </div>
      )}
      {status === 'error' && (
        <div className="no-print absolute inset-0 flex items-center justify-center bg-rose-50/90 p-4 text-center text-xs text-rose-700">
          {errorMsg || 'Failed to load PDF template'}
        </div>
      )}
    </div>
  );
};
