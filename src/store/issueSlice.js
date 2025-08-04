import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
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

const issueSlice = createSlice({
  name: 'issues',
  initialState: {
    issues: [],
    loading: false,
    error: null,
    currentProjectId: null, // Track which project's issues we're showing
  },
  reducers: {
    clearIssues: (state) => {
      state.issues = [];
      state.error = null;
      state.currentProjectId = null;
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
      
      // Update issue
      .addCase(updateIssue.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateIssue.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.issues.findIndex(issue => issue.id === action.payload.id);
        if (index !== -1) {
          state.issues[index] = action.payload;
        }
      })
      .addCase(updateIssue.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Delete issue
      .addCase(deleteIssue.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteIssue.fulfilled, (state, action) => {
        state.loading = false;
        state.issues = state.issues.filter(issue => issue.id !== action.payload);
      })
      .addCase(deleteIssue.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
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
      });
  },
});

// Export all actions including moveIssue and rollbackIssueMove
export const { clearIssues, clearError, moveIssue, rollbackIssueMove } = issueSlice.actions;
export default issueSlice.reducer;