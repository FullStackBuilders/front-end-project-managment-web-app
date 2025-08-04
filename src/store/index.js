import { configureStore } from '@reduxjs/toolkit';
import projectSlice from './projectSlice';
import issueSlice from './issueSlice';
import chatSlice from './chatSlice';
import commentReducer from './commentSlice';

export const store = configureStore({
  reducer: {
    project: projectSlice,
    issues: issueSlice,
    chat: chatSlice,
    comments: commentReducer
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }),
});
