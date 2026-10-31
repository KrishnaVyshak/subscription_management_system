import { formatCurrency } from './format';

// Shared chart chrome from the design system (PatternsSection): recessive axes and grid, mono
// ticks, CSS variables so both themes work.
export const axisProps = {
  axisLine: false,
  tickLine: false,
  tick: { fill: 'var(--chart-axis)', fontSize: 11, fontFamily: 'var(--font-mono)' },
};

export const moneyTick = (v) => formatCurrency(v, { compact: true });

export const CHART_COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)'];
