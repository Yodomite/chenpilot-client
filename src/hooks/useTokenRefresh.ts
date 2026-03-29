import { useDispatch } from 'react-redux';
import { useCallback } from 'react';
import { refreshToken } from '@/store/slices/authSlice';
import { useAppSelector } from '@/store';
import type { AppDispatch } from '@/store';

export function useTokenRefresh() {
  const dispatch = useDispatch<AppDispatch>();
  const { isLoading, error, token } = useAppSelector((state) => state.auth);

  const refreshAccessToken = useCallback(async () => {
    try {
      const result = await dispatch(refreshToken()).unwrap();
      return result;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return false;
    }
  }, [dispatch]);

  const isTokenExpired = useCallback(() => {
    if (!token) return true;
    
    try {
      // Decode JWT token to check expiration
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      return payload.exp < currentTime;
    } catch (error) {
      console.error('Error decoding token:', error);
      return true;
    }
  }, [token]);

  const refreshTokenIfNeeded = useCallback(async () => {
    if (isTokenExpired()) {
      return await refreshAccessToken();
    }
    return true;
  }, [isTokenExpired, refreshAccessToken]);

  return {
    refreshToken: refreshAccessToken,
    refreshTokenIfNeeded,
    isRefreshing: isLoading,
    refreshError: error,
    isTokenExpired,
  };
}
