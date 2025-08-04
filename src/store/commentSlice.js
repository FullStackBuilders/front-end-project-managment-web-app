import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { commentApi } from '../services/commentApi';

// Async thunks
export const fetchCommentsByIssue = createAsyncThunk(
  'comments/fetchByIssue',
  async (issueId, { rejectWithValue }) => {
    try {
      const comments = await commentApi.getCommentsByIssue(issueId);
      return { issueId, comments }; // Remove the extra .data since commentApi already returns response.data
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const addComment = createAsyncThunk(
  'comments/add',
  async ({ issueId, content }, { rejectWithValue }) => {
    try {
      const comment = await commentApi.addComment(issueId, content);
      return { issueId, comment }; // Remove the extra .data since commentApi already returns response.data
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const commentSlice = createSlice({
  name: 'comments',
  initialState: {
    commentsByIssue: {}, // { issueId: [comments] }
    loading: false,
    error: null,
    currentIssueId: null,
  },
  reducers: {
    clearComments: (state) => {
      state.commentsByIssue = {};
      state.currentIssueId = null;
      state.error = null;
    },
    clearCommentsForIssue: (state, action) => {
      const issueId = action.payload;
      delete state.commentsByIssue[issueId];
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch comments by issue
      .addCase(fetchCommentsByIssue.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCommentsByIssue.fulfilled, (state, action) => {
        state.loading = false;
        const { issueId, comments } = action.payload;
        // Ensure comments is an array and handle potential undefined values
        state.commentsByIssue[issueId] = Array.isArray(comments) ? comments : [];
        state.currentIssueId = issueId;
      })
      .addCase(fetchCommentsByIssue.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Add comment
      .addCase(addComment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addComment.fulfilled, (state, action) => {
        state.loading = false;
        const { issueId, comment } = action.payload;
        if (state.commentsByIssue[issueId]) {
          state.commentsByIssue[issueId].push(comment);
        } else {
          state.commentsByIssue[issueId] = [comment];
        }
      })
      .addCase(addComment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearComments, clearCommentsForIssue } = commentSlice.actions;
export default commentSlice.reducer;