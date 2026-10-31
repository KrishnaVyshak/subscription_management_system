// Discount selection for billing. Filled in by the discounts phase; until then nothing applies.

export async function pickDiscounts() {
  return { lineDiscounts: new Map(), invoiceDiscount: null };
}

export async function claimDiscounts() {
  return { lineDiscounts: new Map(), invoiceDiscount: null, claimedIds: [] };
}

export async function releaseClaims() {}

export async function recordUsages() {}

export async function releaseInvoiceUsages() {}
