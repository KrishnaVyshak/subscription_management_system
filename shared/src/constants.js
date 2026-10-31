// Single source of truth for enum-like values shared by frontend and backend.
// Keep these in sync with the Postgres enums in supabase/migrations.

export const APP_TIMEZONE = 'Asia/Kolkata';

export const ROLES = Object.freeze({
  ADMIN: 'admin',
  STAFF: 'staff',
  CUSTOMER: 'customer',
});

export const PRODUCT_TYPES = Object.freeze(['service', 'goods', 'addon']);

export const BILLING_PERIODS = Object.freeze(['daily', 'weekly', 'monthly', 'yearly']);

export const SUBSCRIPTION_STATUS = Object.freeze({
  DRAFT: 'draft',
  QUOTATION: 'quotation',
  CONFIRMED: 'confirmed',
  ACTIVE: 'active',
  PAUSED: 'paused',
  CLOSED: 'closed',
});

// Allowed status transitions; domain/stateMachine.js adds the per-transition rules.
export const SUBSCRIPTION_TRANSITIONS = Object.freeze({
  draft: ['quotation', 'closed'],
  quotation: ['confirmed', 'draft', 'closed'],
  confirmed: ['active', 'closed'],
  active: ['paused', 'closed'],
  paused: ['active', 'closed'],
  closed: [],
});

export const INVOICE_STATUS = Object.freeze({
  DRAFT: 'draft',
  CONFIRMED: 'confirmed',
  PAID: 'paid',
  CANCELLED: 'cancelled',
});

export const DISCOUNT_TYPES = Object.freeze(['percent', 'fixed']);
export const DISCOUNT_SCOPES = Object.freeze(['product', 'subscription']);
export const TAX_TYPES = Object.freeze(['percent', 'fixed']);

export const PAYMENT_METHODS = Object.freeze([
  'cash',
  'bank_transfer',
  'upi',
  'card',
  'cheque',
  'other',
]);

export const DEFAULT_PAGE_SIZE = 25;
