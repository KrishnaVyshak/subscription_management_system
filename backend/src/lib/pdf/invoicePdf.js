import PDFDocument from 'pdfkit';

// The built-in PDF fonts have no ₹ glyph, so amounts are printed as "INR 1,180.00".
const inr = (v) =>
  `INR ${Number(v ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const date = (d) => {
  if (!d) return '';
  const [y, m, day] = String(d).slice(0, 10).split('-');
  return `${day}/${m}/${y}`;
};

const COLS = [
  { key: 'description', label: 'Description', x: 50, w: 190, align: 'left' },
  { key: 'quantity', label: 'Qty', x: 240, w: 35, align: 'right' },
  { key: 'unit_price', label: 'Unit price', x: 280, w: 70, align: 'right' },
  { key: 'discount_amount', label: 'Discount', x: 355, w: 60, align: 'right' },
  { key: 'tax_amount', label: 'Tax', x: 420, w: 60, align: 'right' },
  { key: 'amount', label: 'Amount', x: 485, w: 60, align: 'right' },
];

function stampFor(invoice) {
  if (invoice.status === 'paid') return { text: 'PAID', color: '#1a7f37' };
  if (invoice.status === 'cancelled') return { text: 'CANCELLED', color: '#6e7781' };
  if (invoice.is_overdue) return { text: 'OVERDUE', color: '#cf222e' };
  return null;
}

/**
 * Renders an invoice to a PDF Buffer using only snapshot data: the invoice row (with
 * customer_snapshot, company_snapshot and is_overdue), its lines (with tax snapshots).
 */
export function renderInvoicePdf(invoice, lines) {
  const doc = new PDFDocument({ size: 'A4', margin: 50, info: { Title: invoice.number } });
  const chunks = [];
  doc.on('data', (c) => chunks.push(c));
  const done = new Promise((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });

  const company = invoice.company_snapshot ?? {};
  const customer = invoice.customer_snapshot ?? {};

  // Company block (left) and invoice facts (right).
  doc.font('Helvetica-Bold').fontSize(18).text(company.name || 'Brightloop', 50, 50);
  doc.font('Helvetica').fontSize(9).fillColor('#444');
  for (const line of [company.address, company.email, company.phone, company.gstin && `GSTIN ${company.gstin}`]) {
    if (line) doc.text(line, { width: 250 });
  }
  doc.fillColor('#000').font('Helvetica-Bold').fontSize(16).text('TAX INVOICE', 350, 50, { width: 195, align: 'right' });
  doc.font('Helvetica').fontSize(9);
  const facts = [
    ['Invoice no.', invoice.number],
    ['Invoice date', date(invoice.invoice_date)],
    ['Due date', date(invoice.due_date)],
    ['Period', `${date(invoice.period_start)} – ${date(invoice.period_end)}`],
  ];
  let y = 75;
  for (const [label, value] of facts) {
    doc.fillColor('#666').text(label, 350, y, { width: 80 });
    doc.fillColor('#000').text(value, 430, y, { width: 115, align: 'right' });
    y += 14;
  }

  // Bill to.
  y = Math.max(y, doc.y) + 20;
  doc.font('Helvetica-Bold').fontSize(10).text('Bill to', 50, y);
  doc.font('Helvetica').fontSize(9);
  for (const line of [
    customer.name,
    customer.billing_address,
    customer.email,
    customer.phone,
    customer.gstin && `GSTIN ${customer.gstin}`,
  ]) {
    if (line) doc.text(line, { width: 280 });
  }

  // Lines table.
  y = doc.y + 20;
  const header = () => {
    doc.rect(50, y - 4, 495, 18).fill('#f3f4f6').fillColor('#000');
    doc.font('Helvetica-Bold').fontSize(9);
    for (const c of COLS) doc.text(c.label, c.x, y, { width: c.w, align: c.align });
    y += 20;
    doc.font('Helvetica').fontSize(9);
  };
  header();
  for (const line of lines) {
    const taxNote = (line.taxes ?? []).map((t) => `${t.tax_name}${t.price_included ? ' (incl.)' : ''}`).join(', ');
    const rowHeight = Math.max(doc.heightOfString(line.description, { width: COLS[0].w }), 11) + (taxNote ? 11 : 0) + 6;
    if (y + rowHeight > 720) {
      doc.addPage();
      y = 50;
      header();
    }
    const values = {
      description: line.description,
      quantity: String(line.quantity),
      unit_price: inr(line.unit_price),
      discount_amount: Number(line.discount_amount) ? inr(line.discount_amount) : '—',
      tax_amount: inr(line.tax_amount),
      amount: inr(line.amount),
    };
    for (const c of COLS) doc.text(values[c.key], c.x, y, { width: c.w, align: c.align });
    if (taxNote) {
      doc.fillColor('#666').fontSize(7.5).text(taxNote, COLS[0].x, y + rowHeight - 17, { width: COLS[0].w });
      doc.fillColor('#000').fontSize(9);
    }
    y += rowHeight;
    doc.moveTo(50, y - 3).lineTo(545, y - 3).strokeColor('#e5e7eb').stroke();
  }

  // Totals.
  if (y > 640) {
    doc.addPage();
    y = 50;
  }
  y += 10;
  const totals = [
    ['Subtotal', invoice.subtotal],
    ['Discount', `- ${inr(invoice.discount_total)}`, true],
    ['Tax', invoice.tax_total],
    ['Total', invoice.total],
    ['Paid', invoice.amount_paid],
    ['Amount due', invoice.amount_due],
  ];
  for (const [label, value, raw] of totals) {
    const bold = label === 'Total' || label === 'Amount due';
    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(bold ? 10 : 9);
    doc.text(label, 355, y, { width: 100 });
    doc.text(raw ? value : inr(value), 445, y, { width: 100, align: 'right' });
    y += bold ? 16 : 14;
  }

  // PAID / OVERDUE / CANCELLED stamp.
  const stamp = stampFor(invoice);
  if (stamp) {
    doc.save();
    doc.rotate(-20, { origin: [150, y - 40] });
    doc.font('Helvetica-Bold').fontSize(36).fillColor(stamp.color).opacity(0.75);
    doc.text(stamp.text, 60, y - 60, { width: 240, align: 'center' });
    doc.restore();
    doc.opacity(1);
  }

  doc.font('Helvetica').fontSize(8).fillColor('#666')
    .text('Thank you for your business.', 50, 770, { width: 495, align: 'center' });

  doc.end();
  return done;
}

export function pdfFileName(invoice) {
  return `${invoice.number.replace(/\//g, '-')}.pdf`;
}
