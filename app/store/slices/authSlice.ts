import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface User {
  id: string;
  email: string;
  name: string;
  isAdmin?: boolean;
}

interface AuthState {
  isAuthenticated: boolean;
  token: string | null;
  user: User | null;
  isLoading: boolean;
}

const initialState: AuthState = {
  isAuthenticated: false,
  token: null,
  user: null,
  isLoading: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // Login action
    login: (state, action: PayloadAction<{ email: string; password: string }>) => {
      state.isLoading = true;
    },
    loginSuccess: (state, action: PayloadAction<{ token: string; user: User }>) => {
      state.isAuthenticated = true;
      state.token = action.payload.token;
      state.user = action.payload.user;
      state.isLoading = false;
    },
    loginFailure: state => {
      state.isAuthenticated = false;
      state.token = null;
      state.user = null;
      state.isLoading = false;
    },

    // Logout action
    logout: state => {
      state.isAuthenticated = false;
      state.token = null;
      state.user = null;
      state.isLoading = false;
    },

    // Initialize auth state (for app startup)
    initializeAuth: (state, action: PayloadAction<{ token: string | null; user: User | null }>) => {
      // Consider user presence sufficient for authentication (Firebase)
      if (action.payload.user) {
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.token = action.payload.token ?? null;
      } else if (action.payload.token) {
        state.isAuthenticated = true;
        state.token = action.payload.token;
        state.user = state.user; // keep any existing user if set by other means
      } else {
        state.isAuthenticated = false;
        state.token = null;
        state.user = null;
      }
      state.isLoading = false;
    },

    // Set loading state
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
  },
});

export const { login, loginSuccess, loginFailure, logout, initializeAuth, setLoading } =
  authSlice.actions;

export default authSlice.reducer;
