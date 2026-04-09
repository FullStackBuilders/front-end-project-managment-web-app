import { isToday, isThisWeek, isThisMonth, parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { issueSprintId } from './scrumBacklogUtils';

/** @deprecated Legacy single-select sentinel; prefer `sprintIds: []` for "all active". */
export const SCRUM_BOARD_SPRINT_ALL = 'all';

export const INITIAL_FILTERS = {
  assignedToMe: false,
  priorities: [],       // [] = no filter; e.g. ['HIGH', 'MEDIUM']
  statuses: [],         // [] = no filter; e.g. ['TO_DO', 'IN_PROGRESS']
  dueDatePreset: null,  // null | 'TODAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'CUSTOM'
  dueDateFrom: null,    // ISO date string — only meaningful when dueDatePreset === 'CUSTOM'
  dueDateTo: null,      // ISO date string — only meaningful when dueDatePreset === 'CUSTOM'
  /** Scrum board: narrow to these sprint ids; [] = all ACTIVE sprints (no extra filter). */
  sprintIds: [],
};

/**
 * Normalized sprint id list for filtering (handles legacy `sprintId` from older state).
 * @param {object} filters
 * @returns {number[]}
 */
export function getScrumSprintIdsFilter(filters) {
  if (Array.isArray(filters.sprintIds) && filters.sprintIds.length > 0) {
    return [...new Set(filters.sprintIds.map((id) => Number(id)))];
  }
  const legacy = filters.sprintId;
  if (
    legacy != null &&
    legacy !== undefined &&
    legacy !== SCRUM_BOARD_SPRINT_ALL
  ) {
    return [Number(legacy)];
  }
  return [];
}

/**
 * True when the due-date filter should apply and count toward the badge.
 * Preset quick filters (today / week / month) apply as soon as selected.
 * Custom applies only when both start and end dates are set.
 */
export function isDueDateFilterActive(filters) {
  const p = filters.dueDatePreset;
  if (p == null || p === undefined) return false;
  if (p === 'CUSTOM') {
    return Boolean(filters.dueDateFrom && filters.dueDateTo);
  }
  return true;
}

/**
 * Returns true when every field in `filters` matches its default (nothing active).
 */
export function isFiltersEmpty(filters) {
  return (
    !filters.assignedToMe &&
    filters.priorities.length === 0 &&
    filters.statuses.length === 0 &&
    !isDueDateFilterActive(filters) &&
    getScrumSprintIdsFilter(filters).length === 0
  );
}

/**
 * Count how many filter *groups* are currently active.
 * Each group counts as 1 regardless of how many values within it are selected.
 */
export function countActiveFilters(filters) {
  const sprintScoped = getScrumSprintIdsFilter(filters).length > 0;
  return (
    (filters.assignedToMe ? 1 : 0) +
    (filters.priorities.length > 0 ? 1 : 0) +
    (filters.statuses.length > 0 ? 1 : 0) +
    (isDueDateFilterActive(filters) ? 1 : 0) +
    (sprintScoped ? 1 : 0)
  );
}

/** Shared empty state when filters are active but no tasks match. */
export const EMPTY_STATE_FILTER_ACTIVE_MESSAGE =
  'No tasks found for applied filter.';

/**
 * Pure filter function — applies all active filters with AND logic.
 * Produces a new array; never mutates the input.
 *
 * @param {Array}  issues        - full issues array from Redux
 * @param {Object} filters       - activeFilters shape (see INITIAL_FILTERS)
 * @param {number|null} currentUserId - current authenticated user's ID
 */
export function applyFilters(issues, filters, currentUserId) {
  if (isFiltersEmpty(filters)) return issues;

  const sprintIdSet = new Set(getScrumSprintIdsFilter(filters));

  return issues.filter((issue) => {
    // ── Sprint (scrum board) — OR within selected ids ─────────────────────────
    if (sprintIdSet.size > 0) {
      const sid = issueSprintId(issue);
      if (sid == null || !sprintIdSet.has(Number(sid))) return false;
    }

    // ── Assigned to Me ────────────────────────────────────────────────────────
    if (filters.assignedToMe) {
      if (!currentUserId || issue.assigneeId !== currentUserId) return false;
    }

    // ── Priority (multi-select) ───────────────────────────────────────────────
    if (filters.priorities.length > 0) {
      if (!filters.priorities.includes(issue.priority)) return false;
    }

    // ── Status (multi-select) ─────────────────────────────────────────────────
    if (filters.statuses.length > 0) {
      if (!filters.statuses.includes(issue.status)) return false;
    }

    // ── Due Date ──────────────────────────────────────────────────────────────
    if (isDueDateFilterActive(filters)) {
      // Issues without a due date are always excluded when a date filter is active
      if (!issue.dueDate) return false;

      const d = parseISO(issue.dueDate.split('T')[0]);

      switch (filters.dueDatePreset) {
        case 'TODAY':
          if (!isToday(d)) return false;
          break;
        case 'THIS_WEEK':
          if (!isThisWeek(d, { weekStartsOn: 1 })) return false;
          break;
        case 'THIS_MONTH':
          if (!isThisMonth(d)) return false;
          break;
        case 'CUSTOM': {
          // Only apply if both bounds are present; otherwise treat as no filter
          if (filters.dueDateFrom && filters.dueDateTo) {
            const inRange = isWithinInterval(d, {
              start: startOfDay(parseISO(filters.dueDateFrom)),
              end:   endOfDay(parseISO(filters.dueDateTo)),
            });
            if (!inRange) return false;
          }
          break;
        }
        default:
          break;
      }
    }

    return true;
  });
}
