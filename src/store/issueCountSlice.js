import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { issueApi } from '../services/issueApi';

export const fetchIssueCounts = createAsyncThunk(
  'issueCounts/fetchCounts',
  async (_, { rejectWithValue }) => {
    try {
      const response = await issueApi.getIssueCounts();
      return response;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const issueCountSlice = createSlice({
  name: 'issueCounts',
  initialState: {
    counts: {
      assignedTasks: 0,
      overdueTasks: 0,
      dueTodayTasks: 0,
      highPriorityTasks: 0,
      completedTasks: 0,
    },
    loading: false,
    error: null,
  },
  reducers: {
    clearIssueCounts: (state) => {
      state.counts = {
        assignedTasks: 0,
        overdueTasks: 0,
        dueTodayTasks: 0,
        highPriorityTasks: 0,
        completedTasks: 0,
      };
      state.loading = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchIssueCounts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchIssueCounts.fulfilled, (state, action) => {
        state.loading = false;
        state.counts = action.payload;
        state.error = null;
      })
      .addCase(fetchIssueCounts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearIssueCounts } = issueCountSlice.actions;
export default issueCountSlice.reducer;
