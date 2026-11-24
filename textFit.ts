/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PdfFontFamily } from '../types/pdfMapping';

let measureCtx: CanvasRenderingContext2D | null = null;

function getMeasureContext(): CanvasRenderingContext2D | null {
  if (typeof document === 'undefined') return null;
  if (!measureCtx) {
    const canvas = document.createElement('canvas');
    measureCtx = canvas.getContext('2d');
  }
  return measureCtx;
}

export function getCanvasFontCss(family: PdfFontFamily, fontSize: number): string {
  const weight = family === 'HelveticaBold' ? '700' : '500';
  switch (family) {
    case 'Courier':
      return `${weight} ${fontSize}px "Courier New", Courier, monospace`;
    case 'TimesRoman':
      return `${weight} ${fontSize}px "Times New Roman", Times, serif`;
    case 'Helvetica':
    case 'HelveticaBold':
    default:
      return `${weight} ${fontSize}px "Helvetica Neue", Helvetica, Arial, sans-serif`;
  }
}

/**
 * Computes an adjusted font size (stepping down in 0.5pt increments to minFontSize)
 * so single-line text fits inside maxWidth instead of overflowing or truncating.
 */
export function fitFontSizeToWidth(
  text: string,
  fontFamily: PdfFontFamily,
  targetFontSize: number,
  maxWidth: number,
  minFontSize: number = 5.5
): number {
  if (!text || maxWidth <= 0) return targetFontSize;

  const ctx = getMeasureContext();
  if (!ctx) {
    // Fallback approximation when DOM canvas is unavailable
    const approxWidth = text.length * targetFontSize * 0.56;
    if (approxWidth <= maxWidth) return targetFontSize;
    const scaled = (targetFontSize * maxWidth) / approxWidth;
    return Math.max(minFontSize, Math.floor(scaled * 2) / 2);
  }

  let size = targetFontSize;
  const safeWidth = Math.max(10, maxWidth - 2);
  while (size > minFontSize) {
    ctx.font = getCanvasFontCss(fontFamily, size);
    if (ctx.measureText(text).width <= safeWidth) {
      return size;
    }
    size -= 0.5;
  }
  return minFontSize;
}

/**
 * Computes an adjusted font size for wrapped multi-line fields so wrapped lines
 * fit within maxLines lines inside maxWidth without spilling past a block border.
 */
export function fitWrappedFontSize(
  text: string,
  fontFamily: PdfFontFamily,
  targetFontSize: number,
  maxWidth: number,
  maxLines: number = 2,
  minFontSize: number = 5.5
): number {
  if (!text || maxWidth <= 0) return targetFontSize;

  const ctx = getMeasureContext();
  if (!ctx) return targetFontSize;

  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return targetFontSize;

  let size = targetFontSize;
  const safeWidth = Math.max(12, maxWidth - 2);

  while (size > minFontSize) {
    ctx.font = getCanvasFontCss(fontFamily, size);
    let lines = 1;
    let currentLine = '';

    for (const word of words) {
      const candidate = currentLine ? `${currentLine} ${word}` : word;
      if (ctx.measureText(candidate).width <= safeWidth) {
        currentLine = candidate;
      } else {
        if (currentLine) {
          lines += 1;
          currentLine = word;
        } else {
          // Single ultra-long word exceeds width
          lines += 1;
          currentLine = word;
        }
      }
    }

    if (lines <= maxLines && ctx.measureText(currentLine).width <= safeWidth) {
      return size;
    }
    size -= 0.5;
  }

  return minFontSize;
}
