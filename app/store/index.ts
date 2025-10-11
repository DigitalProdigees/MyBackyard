// Redux store configuration
// This file is not a React component, so no default export is needed

import { configureStore } from '@reduxjs/toolkit';
import { combineReducers } from '@reduxjs/toolkit';
import listingsReducer from './slices/listingsSlice';

// Combine reducers
const rootReducer = combineReducers({
  listings: listingsReducer,
});

// Configure store
export const store = configureStore({
  reducer: rootReducer,
});

// Export types
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
