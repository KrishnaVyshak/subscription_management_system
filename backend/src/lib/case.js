// DB rows are snake_case, the API is camelCase. Dates, Buffers and other class instances pass through.
const isPlainObject = (v) => v !== null && typeof v === 'object' && Object.getPrototypeOf(v) === Object.prototype;

const snakeToCamel = (k) => k.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());
const camelToSnake = (k) => k.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);

function convert(value, keyFn) {
  if (Array.isArray(value)) return value.map((v) => convert(v, keyFn));
  if (!isPlainObject(value)) return value;
  const out = {};
  for (const [k, v] of Object.entries(value)) out[keyFn(k)] = convert(v, keyFn);
  return out;
}

export const toCamel = (value) => convert(value, snakeToCamel);
export const toSnake = (value) => convert(value, camelToSnake);
export { camelToSnake, snakeToCamel };
