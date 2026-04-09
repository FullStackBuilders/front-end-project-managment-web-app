/**
 * @typedef {{ id: string|number, name?: string, status?: string, startDate?: string|null, endDate?: string|null }} CalendarSprint
 * @typedef {{ sprint: CalendarSprint, colStart: number, colEnd: number, colSpan: number, segStart: Date, segEnd: Date }} SprintSegment
 * @typedef {SprintSegment & { lane: number }} PlacedSegment
 */

/**
 * Scrum month calendar layout (ACTIVE sprint strips).
 *
 * Rules:
 * - Calendar uses ACTIVE sprints only, sorted globally by startDate then id.
 * - Per calendar day D: among sprints touching D, the first two in that order are
 *   “strip-visible” on D; the rest appear only under +N more for D.
 * - Week row strips are sub-segments: a sprint’s bar may split when visibility
 *   changes mid-week (different top-2 composition).
 * - Lanes per week are capped (greedy assignLanesCapped) as a safety net.
 *
 * Phase 2 (optional): react-big-calendar vs FullCalendar — see earlier notes.
 */

import {
  addDays,
  differenceInCalendarDays,
  format,
  isSameDay,
  parseISO,
  startOfDay,
} from "date-fns";

/** Max concurrent sprint strips per calendar day (and lane cap per week row). */
export const MAX_SPRINT_STRIP_LANES = 2;

/** @param {string|undefined|null} dateStr */
export function parseDay(dateStr) {
  if (!dateStr) return null;
  try {
    return startOfDay(parseISO(String(dateStr).split("T")[0]));
  } catch {
    return null;
  }
}

/** @param {Date} d */
function toDateKey(d) {
  return format(startOfDay(d), "yyyy-MM-dd");
}

/**
 * @param {CalendarSprint} a
 * @param {CalendarSprint} b
 */
export function compareActiveSprintsByStartDate(a, b) {
  const aStart = parseDay(a.startDate)?.getTime() ?? 0;
  const bStart = parseDay(b.startDate)?.getTime() ?? 0;
  if (aStart !== bStart) return aStart - bStart;
  return String(a.id).localeCompare(String(b.id));
}

/**
 * ACTIVE sprints with valid date range, deterministic order for overflow + strips.
 * @param {CalendarSprint[]} sprints
 * @returns {CalendarSprint[]}
 */
export function sortActiveSprintsForCalendar(sprints) {
  return sprints
    .filter(
      (s) =>
        s.status === "ACTIVE" &&
        s.startDate &&
        s.endDate &&
        parseDay(s.startDate) &&
        parseDay(s.endDate),
    )
    .sort(compareActiveSprintsByStartDate);
}

/**
 * @param {SprintSegment} a
 * @param {SprintSegment} b
 */
export function compareSegmentsForLane(a, b) {
  const cmp = compareActiveSprintsByStartDate(a.sprint, b.sprint);
  if (cmp !== 0) return cmp;
  if (a.colStart !== b.colStart) return a.colStart - b.colStart;
  return b.colSpan - a.colSpan;
}

/**
 * @param {import('date-fns').Date} weekStart first day of row (Sunday)
 * @param {import('date-fns').Date} weekEnd
 * @param {CalendarSprint} sprint
 * @returns {SprintSegment | null}
 */
export function sprintSegmentForWeek(sprint, weekStart, weekEnd) {
  const sStart = parseDay(sprint.startDate);
  const sEnd = parseDay(sprint.endDate);
  if (!sStart || !sEnd) return null;
  const segStart = sStart > weekStart ? sStart : weekStart;
  const segEnd = sEnd < weekEnd ? sEnd : weekEnd;
  if (segStart > segEnd) return null;
  const colStart = differenceInCalendarDays(segStart, weekStart);
  const colEnd = differenceInCalendarDays(segEnd, weekStart);
  if (colStart < 0 || colStart > 6 || colEnd < 0 || colEnd > 6) return null;
  return {
    sprint,
    colStart,
    colEnd,
    colSpan: colEnd - colStart + 1,
    segStart,
    segEnd,
  };
}

/**
 * Ids of sprints that may render as strips on this day (top MAX by sort among touching).
 * @param {Date} day
 * @param {CalendarSprint[]} sortedActiveSprints from sortActiveSprintsForCalendar
 */
export function visibleSprintIdsForDay(day, sortedActiveSprints) {
  const touching = sprintsTouchingDay(sortedActiveSprints, day);
  const sorted = [...touching].sort(compareActiveSprintsByStartDate);
  return new Set(
    sorted.slice(0, MAX_SPRINT_STRIP_LANES).map((s) => s.id),
  );
}

/**
 * @param {Date} day
 * @param {CalendarSprint[]} sortedActiveSprints
 */
export function visibleSprintsForDay(day, sortedActiveSprints) {
  const touching = sprintsTouchingDay(sortedActiveSprints, day);
  const sorted = [...touching].sort(compareActiveSprintsByStartDate);
  return sorted.slice(0, MAX_SPRINT_STRIP_LANES);
}

/**
 * Touching sprints not in the top-2 for this day.
 * @param {Date} day
 * @param {CalendarSprint[]} sortedActiveSprints
 */
export function hiddenSprintsForDay(day, sortedActiveSprints) {
  const touching = sprintsTouchingDay(sortedActiveSprints, day);
  const visible = visibleSprintIdsForDay(day, sortedActiveSprints);
  return touching.filter((s) => !visible.has(s.id));
}

/**
 * @param {Date[]} days typically full month grid (42 cells)
 * @param {CalendarSprint[]} sortedActiveSprints
 * @returns {Map<string, Set<string|number>>}
 */
export function buildVisibleSprintIdsByDayKey(days, sortedActiveSprints) {
  /** @type {Map<string, Set<string|number>>} */
  const map = new Map();
  for (const day of days) {
    const key = toDateKey(day);
    map.set(key, visibleSprintIdsForDay(day, sortedActiveSprints));
  }
  return map;
}

/**
 * Contiguous column runs where this sprint is in the per-day top-2.
 * @param {CalendarSprint} sprint
 * @param {Date} weekStart
 * @param {Date} weekEnd
 * @param {Map<string, Set<string|number>>} visibleIdsByDayKey
 * @returns {SprintSegment[]}
 */
export function subSegmentsVisibleInWeek(
  sprint,
  weekStart,
  weekEnd,
  visibleIdsByDayKey,
) {
  const base = sprintSegmentForWeek(sprint, weekStart, weekEnd);
  if (!base) return [];

  const sStart = parseDay(sprint.startDate);
  const sEnd = parseDay(sprint.endDate);
  if (!sStart || !sEnd) return [];

  const { colStart, colEnd, sprint: sp } = base;
  /** @type {SprintSegment[]} */
  const out = [];

  let runStart = /** @type {number | null} */ (null);
  let runEnd = /** @type {number | null} */ (null);
  let runSegStart = /** @type {Date | null} */ (null);
  let runSegEnd = /** @type {Date | null} */ (null);

  const flush = () => {
    if (runStart === null || runEnd === null || !runSegStart || !runSegEnd) {
      runStart = null;
      runEnd = null;
      runSegStart = null;
      runSegEnd = null;
      return;
    }
    out.push({
      sprint: sp,
      colStart: runStart,
      colEnd: runEnd,
      colSpan: runEnd - runStart + 1,
      segStart: runSegStart,
      segEnd: runSegEnd,
    });
    runStart = null;
    runEnd = null;
    runSegStart = null;
    runSegEnd = null;
  };

  for (let c = colStart; c <= colEnd; c++) {
    const dayCol = startOfDay(addDays(weekStart, c));
    const key = toDateKey(dayCol);
    const set = visibleIdsByDayKey.get(key);
    const isVis = set?.has(sp.id) ?? false;

    if (isVis) {
      if (runStart === null) {
        runStart = c;
        runEnd = c;
        runSegStart = dayCol < sStart ? sStart : dayCol;
        runSegEnd = dayCol > sEnd ? sEnd : dayCol;
      } else {
        runEnd = c;
        runSegEnd = dayCol > sEnd ? sEnd : dayCol;
      }
    } else {
      flush();
    }
  }
  flush();

  return out;
}

/**
 * Greedy lane packing with a hard cap. Unplaced segments go to `dropped`.
 * @param {SprintSegment[]} segments
 * @param {number} [maxLanes]
 * @returns {{ placed: PlacedSegment[], dropped: SprintSegment[] }}
 */
export function assignLanesCapped(
  segments,
  maxLanes = MAX_SPRINT_STRIP_LANES,
) {
  const sorted = [...segments].sort(compareSegmentsForLane);
  const laneLastEnd = [];
  /** @type {PlacedSegment[]} */
  const placed = [];
  /** @type {SprintSegment[]} */
  const dropped = [];

  for (const seg of sorted) {
    let assigned = false;
    for (let lane = 0; lane < laneLastEnd.length && lane < maxLanes; lane++) {
      if (seg.colStart > laneLastEnd[lane]) {
        laneLastEnd[lane] = seg.colEnd;
        placed.push({ ...seg, lane });
        assigned = true;
        break;
      }
    }
    if (assigned) continue;
    if (laneLastEnd.length < maxLanes) {
      const lane = laneLastEnd.length;
      laneLastEnd.push(seg.colEnd);
      placed.push({ ...seg, lane });
    } else {
      dropped.push(seg);
    }
  }

  return { placed, dropped };
}

/**
 * @param {CalendarSprint[]} sprints
 * @param {import('date-fns').Date} day
 */
export function sprintsTouchingDay(sprints, day) {
  const d = startOfDay(day);
  return sprints.filter((s) => {
    const a = parseDay(s.startDate);
    const b = parseDay(s.endDate);
    if (!a || !b) return false;
    return d >= a && d <= b;
  });
}

/**
 * Label rule: title only on the segment that contains the sprint's real calendar start.
 * @param {CalendarSprint} sprint
 * @param {Date|null|undefined} segStart
 */
export function shouldShowSprintNameOnSegment(sprint, segStart) {
  const sStart = parseDay(sprint.startDate);
  return Boolean(sStart && segStart && isSameDay(sStart, segStart));
}

/**
 * @param {import('date-fns').Date} segStart
 * @param {import('date-fns').Date} segEnd
 * @param {CalendarSprint} sprint
 */
export function sprintStripRadiusClass(segStart, segEnd, sprint) {
  const sStart = parseDay(sprint.startDate);
  const sEnd = parseDay(sprint.endDate);
  if (!sStart || !sEnd) return "rounded-md";
  const startHere = isSameDay(sStart, segStart);
  const endHere = isSameDay(sEnd, segEnd);
  if (startHere && endHere) return "rounded-md";
  if (startHere) return "rounded-l-md";
  if (endHere) return "rounded-r-md";
  return "";
}
