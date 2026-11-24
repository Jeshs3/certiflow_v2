/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface IconTooltipProps {
  label: string;
  placement?: 'top' | 'bottom';
  align?: 'center' | 'left' | 'right';
  children: React.ReactNode;
  className?: string;
}

export const IconTooltip: React.FC<IconTooltipProps> = ({
  label,
  placement = 'bottom',
  align = 'center',
  children,
  className = '',
}) => {
  const positionClasses =
    placement === 'top'
      ? 'bottom-full mb-2'
      : 'top-full mt-2';

  const alignClasses =
    align === 'right'
      ? 'right-0'
      : align === 'left'
      ? 'left-0'
      : 'left-1/2 -translate-x-1/2';

  const arrowPositionClasses =
    placement === 'top'
      ? 'top-full -mt-1 border-r border-b'
      : 'bottom-full -mb-1 border-l border-t';

  const arrowAlignClasses =
    align === 'right'
      ? 'right-3'
      : align === 'left'
      ? 'left-3'
      : 'left-1/2 -translate-x-1/2';

  return (
    <div className={`relative inline-flex group/tooltip ${className}`}>
      {children}
      <span
        role="tooltip"
        className={`pointer-events-none absolute ${positionClasses} ${alignClasses} z-50 px-2.5 py-1 rounded-lg bg-slate-900/95 backdrop-blur-sm text-white text-[11px] font-medium tracking-wide whitespace-nowrap shadow-lg border border-slate-700/70 opacity-0 scale-95 group-hover/tooltip:opacity-100 group-hover/tooltip:scale-100 group-focus-within/tooltip:opacity-100 group-focus-within/tooltip:scale-100 transition-all duration-150 ease-out`}
      >
        {label}
        <span
          aria-hidden="true"
          className={`absolute ${arrowPositionClasses} ${arrowAlignClasses} w-2 h-2 rotate-45 bg-slate-900/95 border-slate-700/70`}
        />
      </span>
    </div>
  );
};
