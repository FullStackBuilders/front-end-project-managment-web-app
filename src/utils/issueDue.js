import { parseISO, startOfDay, isBefore } from "date-fns";

/**
 * True when the issue has a due date, is not DONE, and the due calendar date
 * (local) is strictly before today. Due "today" is not overdue.
 *
 * @param {{ dueDate?: string | null; status?: string }} issue
 * @returns {boolean}
 */
export function isIssueOverdue(issue) {
  if (!issue?.dueDate || issue.status === "DONE") return false;
  const dueDay = startOfDay(parseISO(String(issue.dueDate).split("T")[0]));
  const todayStart = startOfDay(new Date());
  return isBefore(dueDay, todayStart);
}
