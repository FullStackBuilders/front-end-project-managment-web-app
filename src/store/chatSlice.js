import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { chatApi } from '../services/chatApi';

// Async thunks
export const fetchChatMessages = createAsyncThunk(
  'chat/fetchMessages',
  async (projectId, { rejectWithValue }) => {
    try {
      const response = await chatApi.getChatMessages(projectId);
      return response;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const sendMessage = createAsyncThunk(
  'chat/sendMessage',
  async ({ projectId, content }, { rejectWithValue }) => {
    try {
      const response = await chatApi.sendMessage(projectId, content);
      return response;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const chatSlice = createSlice({
  name: 'chat',
  initialState: {
    messages: [],
    loading: false,
    error: null,
    sendingMessage: false,
  },
  reducers: {
    clearMessages: (state) => {
      state.messages = [];
      state.error = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch messages
      .addCase(fetchChatMessages.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchChatMessages.fulfilled, (state, action) => {
        state.loading = false;
        state.messages = action.payload;
        state.error = null;
      })
      .addCase(fetchChatMessages.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Send message
      .addCase(sendMessage.pending, (state) => {
        state.sendingMessage = true;
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        state.sendingMessage = false;
        state.messages.push(action.payload);
      })
      .addCase(sendMessage.rejected, (state, action) => {
        state.sendingMessage = false;
        state.error = action.payload;
      });
  },
});

export const { clearMessages, clearError } = chatSlice.actions;
export default chatSlice.reducer;