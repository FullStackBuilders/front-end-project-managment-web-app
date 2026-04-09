import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit';
import { isToday, isThisWeek, isThisMonth, parseISO } from 'date-fns';
import {
  INITIAL_FILTERS,
  applyFilters,
} from '../utils/issueFilters';
import { isIssueOverdue } from '../utils/issueDue';
import AuthService from '../services/AuthService';
import { issueApi } from '../services/issueApi';

// Fetch issues by projectId
export const fetchIssuesByProject = createAsyncThunk(
  'issues/fetchByProject',
  async (projectId, { rejectWithValue }) => {
    try {
      const response = await issueApi.getIssuesByProjectId(projectId);
      return response;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Create new issue
export const createIssue = createAsyncThunk(
  'issues/create',
  async ({ projectId, issueData }, { rejectWithValue }) => {
    try {
      const response = await issueApi.createIssue(projectId, issueData);
      return response;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Update issue
export const updateIssue = createAsyncThunk(
  'issues/update',
  async ({ issueId, issueData }, { rejectWithValue }) => {
    try {
      const response = await issueApi.updateIssue(issueId, issueData);
      return response;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Delete issue
export const deleteIssue = createAsyncThunk(
  'issues/delete',
  async (issueId, { rejectWithValue }) => {
    try {
      await issueApi.deleteIssue(issueId);
      return issueId;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Update issue status
export const updateIssueStatus = createAsyncThunk(
  'issues/updateStatus',
  async ({ issueId, status }, { rejectWithValue }) => {
    try {
      const response = await issueApi.updateIssueStatus(issueId, status);
      return response;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Add assignee to issue
export const addAssignee = createAsyncThunk(
  'issues/addAssignee',
  async ({ issueId, userId }, { rejectWithValue }) => {
    try {
      const response = await issueApi.addAssigneeToIssue(issueId, userId);
      return response;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const clearAssignee = createAsyncThunk(
  'issues/clearAssignee',
  async (issueId, { rejectWithValue }) => {
    try {
      const response = await issueApi.removeAssigneeFromIssue(issueId);
      return response;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const assignIssueSprint = createAsyncThunk(
  'issues/assignSprint',
  async ({ issueId, sprintId }, { rejectWithValue }) => {
    try {
      const response = await issueApi.assignIssueSprint(issueId, sprintId);
      return response;
    } catch (error) {
      return rejectWithValue(
        error?.message || (typeof error === 'string' ? error : 'Failed to move task'),
      );
    }
  }
);

const makeInitialFiltersByView = () => ({
  board:          { ...INITIAL_FILTERS },
  scrumBoard:     { ...INITIAL_FILTERS },
  scrumCalendar:  { ...INITIAL_FILTERS },
  scrumList:      { ...INITIAL_FILTERS },
  list:           { ...INITIAL_FILTERS },
  calendar:       { ...INITIAL_FILTERS },
});

const issueSlice = createSlice({
  name: 'issues',
  initialState: {
    issues: [],
    loading: false,
    error: null,
    currentProjectId: null,
    filtersByView: makeInitialFiltersByView(),
  },
  reducers: {
    clearIssues: (state) => {
      state.issues = [];
      state.error = null;
      state.currentProjectId = null;
      state.filtersByView = makeInitialFiltersByView();
    },
    clearError: (state) => {
      state.error = null;
    },
    // For drag and drop functionality with rollback support
    moveIssue: (state, action) => {
      const { issueId, newStatus } = action.payload;
      const issue = state.issues.find(issue => issue.id === issueId);
      if (issue) {
        issue.status = newStatus;
      }
    },
    // Rollback issue status change on API failure
    rollbackIssueMove: (state, action) => {
      const { issueId, originalStatus } = action.payload;
      const issue = state.issues.find(issue => issue.id === issueId);
      if (issue) {
        issue.status = originalStatus;
      }
    },
    // Apply filters for a specific view — payload: { view, filters }
    setFilters: (state, action) => {
      const { view, filters } = action.payload;
      state.filtersByView[view] = filters;
    },
    // Reset filters for a specific view — payload: { view }
    clearFilters: (state, action) => {
      const { view } = action.payload;
      state.filtersByView[view] = { ...INITIAL_FILTERS };
    },
    assignSprintOptimistic: (state, action) => {
      const { issueId, sprintId, sprintName, sprintStatus } = action.payload;
      const issue = state.issues.find((i) => i.id === issueId);
      if (issue) {
        issue.sprintId = sprintId;
        issue.sprintName = sprintName ?? null;
        issue.sprintStatus = sprintStatus ?? null;
      }
    },
    rollbackAssignSprint: (state, action) => {
      const { issueId, sprintId, sprintName, sprintStatus } = action.payload;
      const issue = state.issues.find((i) => i.id === issueId);
      if (issue) {
        issue.sprintId = sprintId;
        issue.sprintName = sprintName ?? null;
        issue.sprintStatus = sprintStatus ?? null;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch issues
      .addCase(fetchIssuesByProject.pending, (state, action) => {
        const projectId = action.meta.arg;
        // Refetch for the same project must not flip global loading — ManageProject uses
        // issuesLoading to show a full-page spinner, which unmounts ScrumProjectWorkspace and
        // drops tab state (e.g. switching to Board after Start sprint).
        const isSameProjectRefetch = state.currentProjectId === projectId;
        state.error = null;
        if (!isSameProjectRefetch) {
          state.loading = true;
        }
        state.currentProjectId = projectId;
      })
      .addCase(fetchIssuesByProject.fulfilled, (state, action) => {
        state.loading = false;
        state.issues = action.payload || []; // Handle empty array
        state.error = null;
        // Only update currentProjectId if this is still the current request
        if (state.currentProjectId === action.meta.arg) {
          state.currentProjectId = action.meta.arg;
        }
      })
      .addCase(fetchIssuesByProject.rejected, (state, action) => {
        state.loading = false;
        // Only show error if it's not an empty issues scenario
        if (action.payload && !action.payload.includes('No issues found')) {
          state.error = action.payload;
        } else {
          state.error = null;
          state.issues = []; // Set empty array for no issues
        }
      })
      
      // Create issue
      .addCase(createIssue.fulfilled, (state, action) => {
        state.issues.push(action.payload);
      })
      .addCase(createIssue.rejected, (state, action) => {
        state.error = action.payload;
      })
      
      // Update issue — no global loading/error; components handle via .unwrap()
      .addCase(updateIssue.fulfilled, (state, action) => {
        const index = state.issues.findIndex(issue => issue.id === action.payload.id);
        if (index !== -1) {
          state.issues[index] = action.payload;
        }
      })
      .addCase(updateIssue.rejected, (_state, _action) => {
        // Intentionally not stored in global state — callers use .unwrap() to handle locally
      })

      // Delete issue — no global loading/error; components handle via .unwrap()
      .addCase(deleteIssue.fulfilled, (state, action) => {
        state.issues = state.issues.filter(issue => issue.id !== action.payload);
      })
      .addCase(deleteIssue.rejected, (_state, _action) => {
        // Intentionally not stored in global state — callers use .unwrap() to handle locally
      })
      
      // Update status
      .addCase(updateIssueStatus.fulfilled, (state, action) => {
        const index = state.issues.findIndex(issue => issue.id === action.payload.id);
        if (index !== -1) {
          state.issues[index] = action.payload;
        }
      })
      .addCase(updateIssueStatus.rejected, (state, action) => {
        // Don't set general error for status updates - let KanbanBoard handle it locally
        // state.error = action.payload;
      })
      
      // Add assignee
      .addCase(addAssignee.fulfilled, (state, action) => {
        const index = state.issues.findIndex(issue => issue.id === action.payload.id);
        if (index !== -1) {
          state.issues[index] = action.payload;
        }
      })
      .addCase(addAssignee.rejected, (state, action) => {
        state.error = action.payload;
      })

      .addCase(clearAssignee.fulfilled, (state, action) => {
        const index = state.issues.findIndex((issue) => issue.id === action.payload.id);
        if (index !== -1) {
          state.issues[index] = action.payload;
        }
      })
      .addCase(clearAssignee.rejected, (state, action) => {
        state.error = action.payload;
      })

      .addCase(assignIssueSprint.fulfilled, (state, action) => {
        const updated = action.payload;
        if (!updated?.id) return;
        const index = state.issues.findIndex((issue) => issue.id === updated.id);
        if (index !== -1) {
          state.issues[index] = updated;
        } else {
          state.issues.push(updated);
        }
      })
      .addCase(assignIssueSprint.rejected, (_state, _action) => {
        // Handled in UI with rollback + ErrorModal
      });
  },
});

export const {
  clearIssues,
  clearError,
  moveIssue,
  rollbackIssueMove,
  setFilters,
  clearFilters,
  assignSprintOptimistic,
  rollbackAssignSprint,
} = issueSlice.actions;

export default issueSlice.reducer;

// ── Selectors ────────────────────────────────────────────────────────────────

// Factory — builds a memoised selector for one view.
// Selectors are created outside components so they are not recreated on every render.
const makeSelectFilteredIssues = (view) =>
  createSelector(
    (state) => state.issues.issues,
    (state) => state.issues.filtersByView[view],
    (issues, filters) => applyFilters(issues, filters, AuthService.getCurrentUserId())
  );

export const selectBoardFilteredIssues    = makeSelectFilteredIssues('board');
export const selectListFilteredIssues     = makeSelectFilteredIssues('list');
export const selectCalendarFilteredIssues = makeSelectFilteredIssues('calendar');

/** Scrum List tab: only issues in ACTIVE or COMPLETED sprints, then view filters. */
export const selectScrumListFilteredIssues = createSelector(
  (state) => state.issues.issues,
  (state) => state.issues.filtersByView.scrumList,
  (issues, filters) => {
    const scoped = issues.filter(
      (i) =>
        i.sprintId != null &&
        i.sprintId !== '' &&
        (i.sprintStatus === 'ACTIVE' || i.sprintStatus === 'COMPLETED'),
    );
    return applyFilters(scoped, filters, AuthService.getCurrentUserId());
  },
);

// ── Issue summary selectors (Kanban Summary tab + KanbanMetrics) ───────────────

const selectAllIssues = (state) => state.issues.issues;

// Exported for components that need raw issue data alongside local state (e.g. KanbanMetrics)
export const selectAllIssuesRaw = selectAllIssues;

// Summary counts used by the Summary tab cards and KanbanMetrics.
export const selectIssueSummary = createSelector(
  [selectAllIssues],
  (issues) => {
    const total      = issues.length;
    const completed  = issues.filter((i) => i.status === 'DONE').length;
    const inProgress = issues.filter((i) => i.status === 'IN_PROGRESS').length;
    const overdue    = issues.filter((i) => isIssueOverdue(i)).length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { total, completed, inProgress, overdue, completionRate };
  }
);

// Data array for the status donut chart.
export const selectStatusDistribution = createSelector(
  [selectAllIssues],
  (issues) => {
    const todo       = issues.filter((i) => i.status === 'TO_DO').length;
    const inProgress = issues.filter((i) => i.status === 'IN_PROGRESS').length;
    const done       = issues.filter((i) => i.status === 'DONE').length;

    return [
      { name: 'To Do',       value: todo,       color: '#94a3b8' },
      { name: 'In Progress', value: inProgress,  color: '#3b82f6' },
      { name: 'Done',        value: done,        color: '#22c55e' },
    ];
  }
);

// Data array for the priority bar chart.
export const selectPriorityDistribution = createSelector(
  [selectAllIssues],
  (issues) => {
    const high   = issues.filter((i) => i.priority === 'HIGH').length;
    const medium = issues.filter((i) => i.priority === 'MEDIUM').length;
    const low    = issues.filter((i) => i.priority === 'LOW').length;

    return [
      { name: 'High',   value: high,   color: '#ef4444' },
      { name: 'Medium', value: medium, color: '#f59e0b' },
      { name: 'Low',    value: low,    color: '#22c55e' },
    ];
  }
);

const ASSIGNEE_CHART_COLORS = [
  '#3b82f6',
  '#8b5cf6',
  '#14b8a6',
  '#ec4899',
  '#f59e0b',
  '#6366f1',
  '#0ea5e9',
  '#a855f7',
];

const UNASSIGNED_BUCKET_KEY = '__unassigned__';

function issueAssigneeId(issue) {
  if (issue == null) return null;
  if (issue.assigneeId != null && issue.assigneeId !== '') {
    const n = Number(issue.assigneeId);
    return Number.isNaN(n) ? null : n;
  }
  if (issue.assignee?.id != null) {
    const n = Number(issue.assignee.id);
    return Number.isNaN(n) ? null : n;
  }
  return null;
}

function assigneeColorForUserId(idKey) {
  const s = String(idKey);
  let h = 0;
  for (let i = 0; i < s.length; i += 1) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return ASSIGNEE_CHART_COLORS[Math.abs(h) % ASSIGNEE_CHART_COLORS.length];
}

function memberDisplayName(user) {
  if (!user) return '';
  const name = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
  if (name) return name;
  if (user.email) return user.email;
  return user.id != null ? `User ${user.id}` : '';
}

/** Horizontal bar rows: project members (non-zero), orphan assignees, Unassigned last. */
export const selectAssigneeDistribution = createSelector(
  [selectAllIssues, (state) => state.project.currentProject],
  (issues, currentProject) => {
    const total = issues.length;
    if (total === 0) {
      return { data: [], total: 0 };
    }

    const counts = new Map();
    const idToLabel = new Map();

    for (const issue of issues) {
      const aid = issueAssigneeId(issue);
      if (aid == null) {
        counts.set(UNASSIGNED_BUCKET_KEY, (counts.get(UNASSIGNED_BUCKET_KEY) || 0) + 1);
      } else {
        const key = String(aid);
        counts.set(key, (counts.get(key) || 0) + 1);
        if (!idToLabel.has(key) && issue.assigneeName) {
          idToLabel.set(key, String(issue.assigneeName).trim());
        }
      }
    }

    const memberIdsOrdered = [];
    const memberLabelById = new Map();
    if (currentProject) {
      const owner = currentProject.owner;
      const team = currentProject.team || [];
      if (owner?.id != null) {
        const oid = String(owner.id);
        memberIdsOrdered.push(oid);
        memberLabelById.set(oid, memberDisplayName(owner));
      }
      const seenOwner = new Set(memberIdsOrdered);
      for (const m of team) {
        if (m?.id == null) continue;
        const mid = String(m.id);
        if (seenOwner.has(mid)) continue;
        seenOwner.add(mid);
        memberIdsOrdered.push(mid);
        memberLabelById.set(mid, memberDisplayName(m));
      }
    }

    const data = [];
    const includedAssigneeKeys = new Set();

    for (const mid of memberIdsOrdered) {
      const c = counts.get(mid) || 0;
      if (c <= 0) continue;
      data.push({
        rowKey: `member-${mid}`,
        name: memberLabelById.get(mid) || idToLabel.get(mid) || `User ${mid}`,
        value: c,
        color: assigneeColorForUserId(mid),
        pct: Math.round((c / total) * 100),
      });
      includedAssigneeKeys.add(mid);
    }

    const orphanKeys = [...counts.keys()].filter(
      (k) => k !== UNASSIGNED_BUCKET_KEY && !includedAssigneeKeys.has(k) && (counts.get(k) || 0) > 0,
    );
    orphanKeys.sort((a, b) =>
      (idToLabel.get(a) || a).localeCompare(idToLabel.get(b) || b, undefined, { sensitivity: 'base' }),
    );
    for (const k of orphanKeys) {
      const c = counts.get(k) || 0;
      data.push({
        rowKey: `orphan-${k}`,
        name: idToLabel.get(k) || `User ${k}`,
        value: c,
        color: assigneeColorForUserId(k),
        pct: Math.round((c / total) * 100),
      });
      includedAssigneeKeys.add(k);
    }

    const unassigned = counts.get(UNASSIGNED_BUCKET_KEY) || 0;
    if (unassigned > 0) {
      data.push({
        rowKey: 'unassigned',
        name: 'Unassigned',
        value: unassigned,
        color: '#9ca3af',
        pct: Math.round((unassigned / total) * 100),
      });
    }

    return { data, total };
  },
);

// Counts for the optional due-date cards (excludes completed tasks).
export const selectDueDateSummary = createSelector(
  [selectAllIssues],
  (issues) => {
    const open  = issues.filter((i) => i.status !== 'DONE' && i.dueDate);
    const parse = (d) => parseISO(String(d));
    return {
      dueToday:     open.filter((i) => isToday(parse(i.dueDate))).length,
      dueThisWeek:  open.filter((i) => isThisWeek(parse(i.dueDate), { weekStartsOn: 1 })).length,
      dueThisMonth: open.filter((i) => isThisMonth(parse(i.dueDate))).length,
    };
  }
);
