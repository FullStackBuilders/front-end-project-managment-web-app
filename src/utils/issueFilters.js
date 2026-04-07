import { isToday, isThisWeek, isThisMonth, parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { issueSprintId } from './scrumBacklogUtils';

/** Scrum board: show issues from every ACTIVE sprint (not a specific sprint id). */
export const SCRUM_BOARD_SPRINT_ALL = 'all';

export const INITIAL_FILTERS = {
  assignedToMe: false,
  priorities: [],       // [] = no filter; e.g. ['HIGH', 'MEDIUM']
  statuses: [],         // [] = no filter; e.g. ['TO_DO', 'IN_PROGRESS']
  dueDatePreset: null,  // null | 'TODAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'CUSTOM'
  dueDateFrom: null,    // ISO date string — only meaningful when dueDatePreset === 'CUSTOM'
  dueDateTo: null,      // ISO date string — only meaningful when dueDatePreset === 'CUSTOM'
  /** Scrum board only: scope to this sprint id; null = unused (other views). */
  sprintId: null,
};

/**
 * Returns true when every field in `filters` matches its default (nothing active).
 */
export function isFiltersEmpty(filters) {
  return (
    !filters.assignedToMe &&
    filters.priorities.length === 0 &&
    filters.statuses.length === 0 &&
    filters.dueDatePreset === null &&
    (filters.sprintId === null || filters.sprintId === undefined)
  );
}

/**
 * Count how many filter *groups* are currently active.
 * Each group counts as 1 regardless of how many values within it are selected.
 */
export function countActiveFilters(filters) {
  const sprintScoped =
    filters.sprintId != null &&
    filters.sprintId !== undefined &&
    filters.sprintId !== SCRUM_BOARD_SPRINT_ALL;
  return (
    (filters.assignedToMe ? 1 : 0) +
    (filters.priorities.length > 0 ? 1 : 0) +
    (filters.statuses.length > 0 ? 1 : 0) +
    (filters.dueDatePreset !== null ? 1 : 0) +
    (sprintScoped ? 1 : 0)
  );
}

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

  return issues.filter((issue) => {
    // ── Sprint (scrum board) ──────────────────────────────────────────────────
    if (
      filters.sprintId != null &&
      filters.sprintId !== undefined &&
      filters.sprintId !== SCRUM_BOARD_SPRINT_ALL
    ) {
      if (issueSprintId(issue) !== filters.sprintId) return false;
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
    if (filters.dueDatePreset !== null) {
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
