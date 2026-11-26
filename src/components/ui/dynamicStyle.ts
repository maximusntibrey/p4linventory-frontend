import type { CSSProperties } from 'react';

/**
 * The ONE allowed inline style: a data-driven width (progress bar, bar-chart cell).
 * Write `style={widthStyle(pct)}`; the design-token check accepts only this form.
 */
export const widthStyle = (percent: number): CSSProperties => ({
  width: `${Math.min(100, Math.max(0, percent))}%`,
});
