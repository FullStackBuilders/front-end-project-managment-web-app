import { configureStore } from '@reduxjs/toolkit';
import projectSlice from './projectSlice';
import issueSlice from './issueSlice';
import chatSlice from './chatSlice';

export const store = configureStore({
  reducer: {
    project: projectSlice,
    issues: issueSlice,
    chat: chatSlice,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }),
});
