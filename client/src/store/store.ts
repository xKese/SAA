import { configureStore } from '@reduxjs/toolkit';
import portfolioReducer from './portfolioSlice';
import optimizationReducer from './optimizationSlice';

export const store = configureStore({
  reducer: {
    portfolio: portfolioReducer,
    optimization: optimizationReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
        // Ignore these field paths in all actions
        ignoredActionsPaths: ['meta.arg', 'payload.timestamp'],
        // Ignore these paths in the state
        ignoredPaths: ['items.dates'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;