import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { User, LoginRequest, RegisterRequest, LoginResponse, RegisterResponse } from '@/types';
import apiService from '@/services/api';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

// Async thunks
export const login = createAsyncThunk(
  'auth/login',
  async (credentials: LoginRequest, { rejectWithValue }) => {
    // Mock login - always succeed
    const mockUser: User = {
      id: 'mock-user-id',
      email: credentials.email,
      name: 'Mock User',
      address: '0x1234567890abcdef',
      publicKey: '0xabcdef1234567890',
      isDeployed: true,
      isFunded: true,
      tokenType: "STRK",
      authProvider: "email",
      isEmailVerified: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const mockToken = 'mock-jwt-token';
    return { user: mockUser, token: mockToken };
  }
);

export const register = createAsyncThunk(
  'auth/register',
  async (userData: RegisterRequest, { rejectWithValue }) => {
    // Mock register - always succeed
    const mockUser: User = {
      id: 'mock-user-id',
      email: userData.email,
      name: userData.name || 'Mock User',
      address: '0x1234567890abcdef',
      publicKey: '0xabcdef1234567890',
      isDeployed: true,
      isFunded: true,
      tokenType: "STRK",
      authProvider: "email",
      isEmailVerified: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const mockToken = 'mock-jwt-token';
    return { user: mockUser, token: mockToken };
  }
);

export const logout = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      await apiService.logout();
    } catch (error: any) {
      // Even if logout fails on server, clear local state
      console.error('Logout error:', error);
    }
  }
);

export const loadUser = createAsyncThunk(
  'auth/loadUser',
  async (_, { rejectWithValue }) => {
    // Mock load user - return mock user
    const mockUser: User = {
      id: 'mock-user-id',
      email: 'mock@example.com',
      name: 'Mock User',
      address: '0x1234567890abcdef',
      publicKey: '0xabcdef1234567890',
      isDeployed: true,
      isFunded: true,
      tokenType: "STRK",
      authProvider: "email",
      isEmailVerified: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return mockUser;
  }
);

export const updateProfile = createAsyncThunk(
  'auth/updateProfile',
  async (userData: Partial<User>, { rejectWithValue }) => {
    // Mock update profile - return updated mock user
    const mockUser: User = {
      id: 'mock-user-id',
      email: userData.email || 'mock@example.com',
      name: userData.name || 'Mock User',
      address: '0x1234567890abcdef',
      publicKey: '0xabcdef1234567890',
      isDeployed: true,
      isFunded: true,
      tokenType: "STRK",
      authProvider: "email",
      isEmailVerified: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return mockUser;
  }
);

export const changePassword = createAsyncThunk(
  'auth/changePassword',
  async ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }, { rejectWithValue }) => {
    // Mock change password - always succeed
    return { success: true };
  }
);

export const googleAuth = createAsyncThunk(
  'auth/googleAuth',
  async (token: string, { rejectWithValue }) => {
    // Mock google auth - always succeed
    const mockUser: User = {
      id: 'mock-google-user-id',
      email: 'mockgoogle@example.com',
      name: 'Mock Google User',
      address: '0x1234567890abcdef',
      publicKey: '0xabcdef1234567890',
      isDeployed: true,
      isFunded: true,
      tokenType: "STRK",
      authProvider: "google",
      isEmailVerified: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const mockToken = 'mock-google-jwt-token';
    return { user: mockUser, token: mockToken };
  }
);

export const refreshToken = createAsyncThunk(
  'auth/refreshToken',
  async (_, { rejectWithValue }) => {
    try {
      // Call the API service refresh token method
      const response = await apiService.refreshToken();
      return { token: response.token };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Token refresh failed');
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setToken: (state, action: PayloadAction<string>) => {
      state.token = action.payload;
      state.isAuthenticated = true;
    },
    clearAuth: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.error = null;
    },
    initializeAuth: (state) => {
      // Always set mock authenticated user for development without backend
      const mockUser: User = {
        id: 'mock-user-id',
        email: 'mock@example.com',
        name: 'Mock User',
        address: '0x1234567890abcdef',
        publicKey: '0xabcdef1234567890',
        isDeployed: true,
        isFunded: true,
        tokenType: "STRK",
        authProvider: "email",
        isEmailVerified: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      state.user = mockUser;
      state.token = 'mock-jwt-token';
      state.isAuthenticated = true;
    },
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(login.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
        state.error = null;
        // Save to localStorage for persistence
        if (typeof window !== 'undefined') {
          localStorage.setItem('auth_token', action.payload.token);
          localStorage.setItem('user_data', JSON.stringify(action.payload.user));
        }
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        state.isAuthenticated = false;
      })
      // Register
      .addCase(register.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
        state.error = null;
        // Save to localStorage for persistence
        if (typeof window !== 'undefined') {
          localStorage.setItem('auth_token', action.payload.token);
          localStorage.setItem('user_data', JSON.stringify(action.payload.user));
        }
      })
      .addCase(register.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        state.isAuthenticated = false;
      })
      // Logout
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        state.error = null;
        // Clear localStorage on logout
        if (typeof window !== 'undefined') {
          localStorage.removeItem('auth_token');
          localStorage.removeItem('user_data');
        }
      })
      // Load User
      .addCase(loadUser.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(loadUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        state.error = null;
      })
      .addCase(loadUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        state.isAuthenticated = false;
        state.token = null;
      })
      // Update Profile
      .addCase(updateProfile.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        state.error = null;
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Change Password
      .addCase(changePassword.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(changePassword.fulfilled, (state) => {
        state.isLoading = false;
        state.error = null;
      })
      .addCase(changePassword.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Google Auth
      .addCase(googleAuth.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(googleAuth.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(googleAuth.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        state.isAuthenticated = false;
      })
      // Refresh Token
      .addCase(refreshToken.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(refreshToken.fulfilled, (state, action) => {
        state.isLoading = false;
        state.token = action.payload.token;
        state.isAuthenticated = true;
        state.error = null;
        // Update localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem('auth_token', action.payload.token);
        }
      })
      .addCase(refreshToken.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        state.isAuthenticated = false;
        state.token = null;
        // Clear localStorage on refresh failure
        if (typeof window !== 'undefined') {
          localStorage.removeItem('auth_token');
          localStorage.removeItem('user_data');
        }
      });
  },
});

export const { clearError, setToken, clearAuth, initializeAuth } = authSlice.actions;
export { login, register, logout, loadUser, updateProfile, changePassword, googleAuth, refreshToken };
export default authSlice.reducer;
