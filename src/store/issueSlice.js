import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit';
import { isToday, isThisWeek, isThisMonth, parseISO } from 'date-fns';
import { INITIAL_FILTERS, applyFilters, countActiveFilters } from '../utils/issueFilters';
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

const makeInitialFiltersByView = () => ({
  board:    { ...INITIAL_FILTERS },
  list:     { ...INITIAL_FILTERS },
  calendar: { ...INITIAL_FILTERS },
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
      state.filtersByView[action.payload.view] = { ...INITIAL_FILTERS };
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch issues
      .addCase(fetchIssuesByProject.pending, (state, action) => {
        state.loading = true;
        state.error = null;
        state.currentProjectId = action.meta.arg; // Store the project ID being fetched
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

// ── Analytics Selectors ───────────────────────────────────────────────────────

const selectAllIssues = (state) => state.issues.issues;

// Exported for components that need raw issue data alongside local state (e.g. KanbanMetrics)
export const selectAllIssuesRaw = selectAllIssues;

// Summary counts used by the Analytics tab summary cards.
export const selectAnalyticsSummary = createSelector(
  [selectAllIssues],
  (issues) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const total      = issues.length;
    const completed  = issues.filter((i) => i.status === 'DONE').length;
    const inProgress = issues.filter((i) => i.status === 'IN_PROGRESS').length;
    const overdue    = issues.filter(
      (i) => i.dueDate && new Date(i.dueDate) < today && i.status !== 'DONE'
    ).length;
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
