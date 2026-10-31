// A human message for every `details.rule` the API can return (see docs/API_MAP.md).
export const RULE_MESSAGES = {
  // Subscriptions
  INVALID_TRANSITION: "This change isn't allowed from the subscription's current status.",
  NO_LINES: 'Add at least one line before continuing.',
  PLAN_LINE_REQUIRED: "The plan's own product must stay on the subscription.",
  MIN_QUANTITY: "The plan's product line needs a higher quantity.",
  QUOTE_EXPIRED: 'This quotation has expired. Update the validity date and send it again.',
  PLAN_UNAVAILABLE: "This plan isn't available on the chosen dates.",
  PLAN_INACTIVE: 'This plan is no longer offered.',
  PLAN_NOT_PAUSABLE: "This plan can't be paused.",
  PLAN_NOT_CLOSABLE: "This plan can't be closed before it expires.",
  PLAN_NOT_RENEWABLE: "This plan isn't renewable.",
  NO_EXPIRY: 'Only subscriptions with an expiry date can be renewed.',
  NOT_RENEWABLE_STATUS: "A subscription in this status can't be renewed.",
  EDIT_NOT_ALLOWED: "This subscription can't be edited in its current status.",
  ADDON_ONLY: 'Only add-on products can be added to a running subscription.',
  CUSTOMER_INACTIVE: 'This customer is inactive.',
  // Billing
  NOT_ACTIVE: 'Only active subscriptions can be invoiced.',
  PAST_EXPIRY: 'The next billing period starts after the expiry date.',
  FUTURE_DATE_NOT_ALLOWED: 'Billing for a future date needs demo mode on the server.',
  // Invoices
  INVALID_INVOICE_STATUS: "The invoice's status doesn't allow this.",
  INVOICE_HAS_PAYMENTS: 'Remove its payments before cancelling this invoice.',
  NOT_OVERDUE: 'Only overdue invoices get reminders.',
  NO_EMAIL: 'The customer has no email address.',
  // Payments
  INVOICE_NOT_CONFIRMED: 'Payments can only be recorded on confirmed invoices.',
  OVERPAYMENT: 'The amount is more than what is due.',
  // Discounts
  DISCOUNT_IN_USE: 'This discount has been used, so its type, value and scope are locked.',
  DISCOUNT_SCOPE: 'Only subscription-wide discounts can be attached to a subscription.',
  SUBSCRIPTION_CLOSED: "A closed subscription can't get discounts.",
  // Users
  CANNOT_DEACTIVATE_SELF: "You can't deactivate your own account.",
  CANNOT_CHANGE_OWN_ROLE: "You can't change your own role.",
  CUSTOMER_ROLE_FIXED: "Customer accounts can't be given a staff role.",
};

// Fallback copy per error code, used when there is no rule or server message to show.
export const CODE_MESSAGES = {
  NETWORK: 'Could not reach the server. Check your connection and try again.',
  UNAUTHORIZED: 'Your session has ended. Sign in again.',
  FORBIDDEN: "You don't have access",
  NOT_FOUND: "That record doesn't exist or you can't see it.",
  RATE_LIMITED: 'Too many attempts. Wait a few minutes and try again.',
  AUTH_PROVIDER_ERROR: 'The sign-in service is unavailable right now.',
  INTERNAL: 'Something went wrong on the server. Try again.',
  BAD_JSON: 'The request was malformed.',
};
