import { toast } from 'sonner';
import { CODE_MESSAGES, RULE_MESSAGES } from './rules';

/** The message a person should read for an API error. */
export function errorMessage(err) {
  if (!err) return '';
  if (err.rule && RULE_MESSAGES[err.rule]) return RULE_MESSAGES[err.rule];
  if (err.code === 'FORBIDDEN') return CODE_MESSAGES.FORBIDDEN;
  if (err.code === 'VALIDATION_ERROR' && Array.isArray(err.details) && err.details.length) {
    return err.details[0].message;
  }
  return err.message || CODE_MESSAGES[err.code] || 'Something went wrong';
}

/**
 * 400 zod issues → { fieldName: message }. `path` [ 'lines', 0, 'quantity' ] becomes
 * 'lines.0.quantity', which is how React Hook Form names nested fields.
 */
export function fieldErrors(err) {
  if (err?.status !== 400 || !Array.isArray(err.details)) return {};
  const out = {};
  for (const issue of err.details) {
    const path = Array.isArray(issue.path) ? issue.path.join('.') : '';
    if (path && !out[path]) out[path] = issue.message;
  }
  return out;
}

/**
 * Puts 400 field errors on a form (RHF `setError`). Only fields the form knows are set.
 * Returns true when at least one was applied; otherwise the caller should toast.
 */
export function applyFieldErrors(err, setError, knownFields) {
  const errors = fieldErrors(err);
  let applied = false;
  for (const [name, message] of Object.entries(errors)) {
    if (knownFields && !knownFields.includes(name.split('.')[0])) continue;
    setError(name, { type: 'server', message });
    applied = true;
  }
  return applied;
}

const TITLES = {
  409: 'That conflicts with existing data',
  422: "That can't be done",
  403: "You don't have access",
};

/** Toast for any failed request. 422/409 get a friendly per-rule message. */
export function notifyError(err, title) {
  const message = errorMessage(err);
  if (err?.status === 403) {
    toast.error(TITLES[403]);
    return;
  }
  const heading = title ?? TITLES[err?.status];
  if (heading && heading !== message) toast.error(heading, { description: message });
  else toast.error(message);
}

/** For form submits: field errors go on the fields; anything else becomes a toast. */
export function handleFormError(err, form, knownFields) {
  if (form && applyFieldErrors(err, form.setError, knownFields)) return;
  notifyError(err);
}
