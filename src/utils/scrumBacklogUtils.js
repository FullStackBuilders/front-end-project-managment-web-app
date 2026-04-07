import { addDays, differenceInCalendarDays, format, parseISO, startOfDay } from "date-fns";

export function isBacklogIssue(issue) {
  const sid = issue.sprintId ?? issue.sprint_id;
  return sid == null || sid === "";
}

/** Numeric sprint id for an issue, or null if unassigned / backlog. */
export function issueSprintId(issue) {
  const sid = issue.sprintId ?? issue.sprint_id;
  if (sid == null || sid === "") return null;
  return Number(sid);
}

function startDateSortKey(sprint) {
  const raw = String(sprint?.startDate ?? "").split("T")[0];
  return raw || "\uFFFF";
}

/** ACTIVE sprints sorted by startDate (ISO), then id — for dropdowns and default pick. */
export function sortActiveSprintsBySchedule(sprints) {
  const active = (sprints || []).filter((s) => s.status === "ACTIVE");
  return [...active].sort((a, b) => {
    const cmp = startDateSortKey(a).localeCompare(startDateSortKey(b));
    if (cmp !== 0) return cmp;
    return (Number(a.id) || 0) - (Number(b.id) || 0);
  });
}

/** Among ACTIVE sprints, pick id with earliest startDate (ISO); tie-break smallest id. */
export function pickDefaultActiveSprintId(sprints) {
  const sorted = sortActiveSprintsBySchedule(sprints);
  return sorted.length === 0 ? null : sorted[0].id;
}

export function isSprintEndDatePassed(sprint) {
  if (!sprint?.endDate) return false;
  const end = String(sprint.endDate).split("T")[0];
  const today = format(new Date(), "yyyy-MM-dd");
  return end < today;
}

export function sprintDateRangeLabel(sprint) {
  if (!sprint?.startDate || !sprint?.endDate) return "—";
  const a = parseISO(String(sprint.startDate).split("T")[0]);
  const b = parseISO(String(sprint.endDate).split("T")[0]);
  const days = differenceInCalendarDays(b, a) + 1;
  let dur = `${days} days`;
  if (days === 7) dur = "1 week";
  if (days === 14) dur = "2 weeks";
  return `${dur} · ${format(a, "MMM d")} – ${format(b, "MMM d, yyyy")}`;
}

export function countSprintTasksByDone(tasks) {
  const completed = tasks.filter((t) => t.status === "DONE").length;
  const incomplete = tasks.length - completed;
  return { completed, incomplete, total: tasks.length };
}

export function defaultEndDateForDuration(startDateStr, durationKey) {
  const start = parseISO(startDateStr);
  if (durationKey === "1w") return format(addDays(start, 6), "yyyy-MM-dd");
  if (durationKey === "2w") return format(addDays(start, 13), "yyyy-MM-dd");
  return format(start, "yyyy-MM-dd");
}

export function todayISODate() {
  return format(startOfDay(new Date()), "yyyy-MM-dd");
}
