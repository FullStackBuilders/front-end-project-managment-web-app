/**
 * Normalization for comparing task form text fields (edit modal meaningful-change detection).
 * - Trim leading/trailing whitespace only (internal spaces preserved).
 * - Description: also normalize CRLF to LF.
 */

export function normalizeTitleForCompare(value) {
  return (value ?? '').trim();
}

export function normalizeDescriptionForCompare(value) {
  return (value ?? '').replace(/\r\n/g, '\n').trim();
}

/**
 * Build baseline description from API (null-safe) for comparison against live form state.
 */
export function baselineDescriptionFromIssue(issue) {
  return issue?.description ?? '';
}
