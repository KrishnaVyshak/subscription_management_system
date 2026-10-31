const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const inrCompact = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  notation: 'compact',
  maximumFractionDigits: 1,
});

// ₹1,24,500 or, with { compact: true }, ₹1.2L.
export function formatCurrency(amount, { compact = false } = {}) {
  return (compact ? inrCompact : inr).format(amount);
}

export function formatPercent(value, digits = 1) {
  return `${value.toFixed(digits)}%`;
}
