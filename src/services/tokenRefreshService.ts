import axios from 'axios';

export class TokenRefreshService {
  private static instance: TokenRefreshService;
  private isRefreshing = false;
  private failedQueue: Array<{
    resolve: (value?: any) => void;
    reject: (reason?: any) => void;
  }> = [];

  static getInstance(): TokenRefreshService {
    if (!TokenRefreshService.instance) {
      TokenRefreshService.instance = new TokenRefreshService();
    }
    return TokenRefreshService.instance;
  }

  private processQueue = (error: any, token: string | null = null) => {
    this.failedQueue.forEach(({ resolve, reject }) => {
      if (error) {
        reject(error);
      } else {
        resolve(token);
      }
    });
    
    this.failedQueue = [];
  };

  async refreshToken(apiBaseUrl: string): Promise<{ token: string }> {
    if (this.isRefreshing) {
      return new Promise((resolve, reject) => {
        this.failedQueue.push({ resolve, reject });
      });
    }

    this.isRefreshing = true;

    try {
      const response = await axios.post<{ token: string }>(
        `${apiBaseUrl}/auth/refresh`,
        {},
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      
      this.processQueue(null, response.data.token);
      return response.data;
    } catch (error) {
      this.processQueue(error, null);
      throw error;
    } finally {
      this.isRefreshing = false;
    }
  }

  isTokenRefreshing(): boolean {
    return this.isRefreshing;
  }
}

export const tokenRefreshService = TokenRefreshService.getInstance();
