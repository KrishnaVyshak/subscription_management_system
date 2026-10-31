import {
  Building2,
  CalendarClock,
  CalendarDays,
  FileText,
  Hourglass,
  Layers,
  LayoutDashboard,
  Package,
  Percent,
  Receipt,
  Repeat,
  Scale,
  Tags,
  UserCog,
  Users,
  Wallet,
} from 'lucide-react';

// The AppLayout sidebar (spec §3). `roles` hides an item from other roles.
export const APP_NAV = [
  { group: 'Overview', items: [{ label: 'Dashboard', to: '/app/dashboard', icon: LayoutDashboard }] },
  {
    group: 'Sales',
    items: [
      { label: 'Customers', to: '/app/customers', icon: Users },
      { label: 'Subscriptions', to: '/app/subscriptions', icon: Repeat },
      { label: 'Templates', to: '/app/templates', icon: FileText },
    ],
  },
  {
    group: 'Billing',
    items: [
      { label: 'Invoices', to: '/app/invoices', icon: Receipt },
      { label: 'Payments', to: '/app/payments', icon: Wallet },
      { label: 'Receivables', to: '/app/receivables', icon: Hourglass },
      { label: 'Billing runs', to: '/app/billing', icon: CalendarClock },
    ],
  },
  {
    group: 'Catalog',
    items: [
      { label: 'Products', to: '/app/catalog/products', icon: Package },
      { label: 'Attributes', to: '/app/catalog/attributes', icon: Tags },
      { label: 'Plans', to: '/app/catalog/plans', icon: Layers },
      { label: 'Discounts', to: '/app/discounts', icon: Percent },
    ],
  },
  {
    group: 'Settings',
    items: [
      { label: 'Taxes', to: '/app/settings/taxes', icon: Scale },
      { label: 'Payment terms', to: '/app/settings/payment-terms', icon: CalendarDays },
      { label: 'Company', to: '/app/settings/company', icon: Building2 },
      { label: 'Users', to: '/app/users', icon: UserCog, roles: ['admin'] },
    ],
  },
];

export const PORTAL_NAV = [
  { label: 'Overview', to: '/portal', end: true },
  { label: 'Subscriptions', to: '/portal/subscriptions' },
  { label: 'Invoices', to: '/portal/invoices' },
  { label: 'Payments', to: '/portal/payments' },
  { label: 'Profile', to: '/portal/profile' },
];

/** The nav entry (and its group) that owns a path, for the topbar breadcrumb. */
export function findNav(pathname) {
  for (const { group, items } of APP_NAV) {
    const item = items.find((i) => pathname === i.to || pathname.startsWith(`${i.to}/`));
    if (item) return { group, item };
  }
  return null;
}
