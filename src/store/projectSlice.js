import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { projectApi } from '../services/projectApi';

// Async thunk for fetching project details
export const fetchProjectById = createAsyncThunk(
  'project/fetchById',
  async (projectId, { rejectWithValue }) => {
    try {
      const project = await projectApi.getProjectById(projectId);
      let myRole = null;
      try {
        const mem = await projectApi.getMyMembership(projectId);
        myRole = mem?.role ?? null;
      } catch {
        myRole = null;
      }
      return { ...project, myRole };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const projectSlice = createSlice({
  name: 'project',
  initialState: {
    currentProject: null,
    loading: false,
    error: null,
  },
  reducers: {
    clearCurrentProject: (state) => {
      state.currentProject = null;
      state.error = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProjectById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProjectById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentProject = action.payload;
        state.error = null;
      })
      .addCase(fetchProjectById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearCurrentProject, clearError } = projectSlice.actions;
export default projectSlice.reducer;