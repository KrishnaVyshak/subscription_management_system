// Illustrative data for the design-system showcase only.

export const mrrTrend = [
  { month: 'Nov', mrr: 812000 },
  { month: 'Dec', mrr: 846000 },
  { month: 'Jan', mrr: 871000 },
  { month: 'Feb', mrr: 905000 },
  { month: 'Mar', mrr: 948000 },
  { month: 'Apr', mrr: 962000 },
  { month: 'May', mrr: 1010000 },
  { month: 'Jun', mrr: 1064000 },
  { month: 'Jul', mrr: 1092000 },
  { month: 'Aug', mrr: 1138000 },
  { month: 'Sep', mrr: 1187000 },
  { month: 'Oct', mrr: 1245000 },
];

export const PLANS = [
  { key: 'starter', label: 'Starter', color: 'var(--chart-1)' },
  { key: 'growth', label: 'Growth', color: 'var(--chart-2)' },
  { key: 'enterprise', label: 'Enterprise', color: 'var(--chart-3)' },
];

export const revenueByPlan = [
  { month: 'May', starter: 182000, growth: 438000, enterprise: 390000 },
  { month: 'Jun', starter: 190000, growth: 462000, enterprise: 412000 },
  { month: 'Jul', starter: 194000, growth: 471000, enterprise: 427000 },
  { month: 'Aug', starter: 201000, growth: 489000, enterprise: 448000 },
  { month: 'Sep', starter: 207000, growth: 512000, enterprise: 468000 },
  { month: 'Oct', starter: 214000, growth: 538000, enterprise: 493000 },
];

export const subscriptions = [
  {
    id: 'SUB-1042',
    customer: 'Aarav Mehta',
    email: 'aarav@northwind.in',
    plan: 'Growth',
    period: 'monthly',
    amount: 4999,
    status: 'active',
    nextBilling: '12 Nov 2026',
  },
  {
    id: 'SUB-1041',
    customer: 'Priya Raman',
    email: 'priya@lumen.co',
    plan: 'Enterprise',
    period: 'yearly',
    amount: 189000,
    status: 'confirmed',
    nextBilling: '01 Nov 2026',
  },
  {
    id: 'SUB-1039',
    customer: 'Kabir Shah',
    email: 'kabir@fernhill.io',
    plan: 'Starter',
    period: 'monthly',
    amount: 999,
    status: 'paused',
    nextBilling: '—',
  },
  {
    id: 'SUB-1036',
    customer: 'Neha Iyer',
    email: 'neha@quillstack.com',
    plan: 'Growth',
    period: 'monthly',
    amount: 4999,
    status: 'quotation',
    nextBilling: '—',
  },
  {
    id: 'SUB-1031',
    customer: 'Rohan Das',
    email: 'rohan@saltbox.in',
    plan: 'Starter',
    period: 'weekly',
    amount: 299,
    status: 'closed',
    nextBilling: '—',
  },
];

export const invoices = [
  { id: 'INV-2208', customer: 'Aarav Mehta', amount: 5899, status: 'paid', due: '12 Oct 2026' },
  {
    id: 'INV-2207',
    customer: 'Priya Raman',
    amount: 223020,
    status: 'confirmed',
    due: '05 Nov 2026',
  },
  { id: 'INV-2205', customer: 'Kabir Shah', amount: 1179, status: 'cancelled', due: '28 Sep 2026' },
  { id: 'INV-2204', customer: 'Neha Iyer', amount: 5899, status: 'draft', due: '—' },
];
