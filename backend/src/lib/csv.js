// RFC 4180 CSV. `columns` is [[header, row => value], …].
const escape = (value) => {
  if (value === null || value === undefined) return '';
  const s = value instanceof Date ? value.toISOString() : String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function toCsv(rows, columns) {
  const lines = [columns.map(([h]) => escape(h)).join(',')];
  for (const row of rows) lines.push(columns.map(([, get]) => escape(get(row))).join(','));
  return `${lines.join('\r\n')}\r\n`;
}
