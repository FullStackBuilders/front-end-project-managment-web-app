/**
 * Sentinel for "no assignee" in form state. Maps to API null (create) or DELETE assignee (existing task).
 * Never a real user id.
 */
export const UNASSIGNED = 'UNASSIGNED';

export function isUnassignedSelection(value) {
  return value == null || value === '' || value === UNASSIGNED;
}

/** Compare user/member ids from JWT vs API (number vs string safe). */
export function sameUserId(a, b) {
  if (a == null || b == null) return false;
  return String(a) === String(b);
}

/** @param {object | null | undefined} issue */
export function assigneeIdStringFromIssue(issue) {
  if (!issue) return UNASSIGNED;
  const id = issue.assigneeId ?? issue.assignee?.id;
  return id != null ? String(id) : UNASSIGNED;
}

/**
 * @param {string} stringValue from form (UNASSIGNED or numeric string)
 * @returns {number | null} for create JSON body
 */
export function assigneeIdToCreateApiPayload(stringValue) {
  if (isUnassignedSelection(stringValue)) return null;
  const n = Number(stringValue);
  return Number.isFinite(n) ? n : null;
}
