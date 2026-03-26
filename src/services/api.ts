import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { 
  RegisterRequest, 
  LoginRequest, 
  RegisterResponse, 
  LoginResponse, 
  User, 
  Contact, 
  CreateContactRequest, 
  UpdateContactRequest,
  BalanceResponse,
  AgentQueryRequest,
  AgentQueryResponse,
  ApiResponse,
  ChatMessage,
  Conversation,
  PromptVersionRecord
} from '@/types';
import agentService from './agentService';

class ApiService {
  private api: AxiosInstance;
  private token: string | null = null;

  constructor() {
    this.api = axios.create({
      baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:2333',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.api.interceptors.request.use(
      (config) => {
        if (this.token) {
          config.headers.Authorization = `Bearer ${this.token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          this.clearToken();
          // Redirect to login or dispatch logout action
          if (typeof window !== 'undefined') {
            window.location.href = '/auth/login';
          }
        }
        return Promise.reject(error);
      }
    );
  }

  setToken(token: string) {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
    }
  }

  clearToken() {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
    }
  }

  loadTokenFromStorage() {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('auth_token');
      if (token) {
        this.token = token;
      }
    }
  }

  // Authentication endpoints
  async register(data: RegisterRequest): Promise<RegisterResponse> {
    // Validate input data before processing
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid registration data');
    }
    
    if (!data.email || typeof data.email !== 'string') {
      throw new Error('Email is required and must be a string');
    }
    
    if (!data.password || typeof data.password !== 'string') {
      throw new Error('Password is required and must be a string');
    }
    
    if (data.name && typeof data.name !== 'string') {
      throw new Error('Name must be a string if provided');
    }
    
    const response = await this.api.post<RegisterResponse>('/auth/register', data);
    // Persist token on successful registration to keep the user authenticated
    if (response.data?.success && (response.data as any)?.data?.token) {
      this.setToken((response.data as any).data.token);
    }
    return response.data;
  }

  async login(data: LoginRequest): Promise<LoginResponse> {
    // Validate input data before processing
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid login data');
    }
    
    if (!data.email || typeof data.email !== 'string') {
      throw new Error('Email is required and must be a string');
    }
    
    if (!data.password || typeof data.password !== 'string') {
      throw new Error('Password is required and must be a string');
    }
    
    const response = await this.api.post<LoginResponse>('/auth/login', data);
    if (response.data.success && response.data.data.token) {
      this.setToken(response.data.data.token);
    }
    return response.data;
  }

  async googleAuth(token: string): Promise<LoginResponse> {
    const response = await this.api.post<LoginResponse>('/auth/google-auth', { token });
    if (response.data.success && response.data.data.token) {
      this.setToken(response.data.data.token);
    }
    return response.data;
  }

  async verifyEmail(token: string): Promise<ApiResponse<{ message: string }>> {
    const response = await this.api.get<ApiResponse<{ message: string }>>(`/auth/verify-email/${token}`);
    return response.data;
  }

  async resendVerification(email: string): Promise<ApiResponse<{ message: string }>> {
    const response = await this.api.post<ApiResponse<{ message: string }>>('/auth/resend-verification', { email });
    return response.data;
  }

  async forgotPassword(email: string): Promise<ApiResponse<{ message: string }>> {
    const response = await this.api.post<ApiResponse<{ message: string }>>('/auth/forgot-password', { email });
    return response.data;
  }

  async resetPassword(token: string, password: string): Promise<ApiResponse<{ message: string }>> {
    const response = await this.api.post<ApiResponse<{ message: string }>>(`/auth/reset-password/${token}`, { password });
    return response.data;
  }

  async logout(): Promise<void> {
    try {
      await this.api.post('/auth/logout');
    } catch (error) {
      // Even if logout fails on server, clear local token
      console.warn('Logout request failed, clearing local token anyway');
    } finally {
      this.clearToken();
    }
  }

  // Protected endpoints
  async getProfile(): Promise<ApiResponse<User>> {
    const response = await this.api.get<ApiResponse<User>>('/auth/profile');
    return response.data;
  }

  async updateProfile(data: Partial<User>): Promise<ApiResponse<User>> {
    const response = await this.api.put<ApiResponse<User>>('/auth/profile', data);
    return response.data;
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<ApiResponse<{ message: string }>> {
    const response = await this.api.post<ApiResponse<{ message: string }>>('/auth/change-password', {
      currentPassword,
      newPassword,
    });
    return response.data;
  }

  async deleteAccount(): Promise<ApiResponse<{ message: string }>> {
    const response = await this.api.delete<ApiResponse<{ message: string }>>('/auth/account');
    this.clearToken();
    return response.data;
  }

  // Starknet account management
  async deployAccount(): Promise<ApiResponse<{ transactionHash: string; contractAddress: string }>> {
    const response = await this.api.post<ApiResponse<{ transactionHash: string; contractAddress: string }>>('/auth/starknet/deploy');
    return response.data;
  }

  async getBalance(): Promise<BalanceResponse> {
    const response = await this.api.get<BalanceResponse>('/auth/starknet/balance');
    return response.data;
  }

  async getAccountStatus(): Promise<ApiResponse<{ isDeployed: boolean; isFunded: boolean; address: string; publicKey: string }>> {
    const response = await this.api.get<ApiResponse<{ isDeployed: boolean; isFunded: boolean; address: string; publicKey: string }>>('/auth/starknet/status');
    return response.data;
  }

  // Auto-funding
  async fundAccount(): Promise<ApiResponse<{ transactionHash: string; amount: string }>> {
    const response = await this.api.post<ApiResponse<{ transactionHash: string; amount: string }>>('/auth/funding/fund-account');
    return response.data;
  }

  async getAutoFundingStats(): Promise<ApiResponse<{ totalFunded: number; totalAccounts: number; averageAmount: string }>> {
    const response = await this.api.get<ApiResponse<{ totalFunded: number; totalAccounts: number; averageAmount: string }>>('/auth/funding/auto-funding-stats');
    return response.data;
  }

  async getFundedAccountBalance(): Promise<ApiResponse<{ balance: string; hasBalance: boolean }>> {
    const response = await this.api.get<ApiResponse<{ balance: string; hasBalance: boolean }>>('/auth/funding/funded-account-balance');
    return response.data;
  }

  async batchFund(amounts: string[]): Promise<ApiResponse<{ transactionHashes: string[]; totalAmount: string }>> {
    const response = await this.api.post<ApiResponse<{ transactionHashes: string[]; totalAmount: string }>>('/auth/funding/batch-fund', { amounts });
    return response.data;
  }

  // Contact management - Note: Contact endpoints are not available in experimental backend
  // Contact management is handled through the agent query system
  async getContacts(): Promise<ApiResponse<Contact[]>> {
    try {
      const response = await this.api.get<ApiResponse<Contact[]>>('/contacts');
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        // Contact endpoints not available in experimental backend
        return {
          success: true,
          data: [],
          message: 'Contact management is available through the chat interface'
        };
      }
      throw error;
    }
  }

  async createContact(data: CreateContactRequest): Promise<ApiResponse<Contact>> {
    try {
      const response = await this.api.post<ApiResponse<Contact>>('/contacts', data);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        // Contact endpoints not available in experimental backend
        return {
          success: false,
          status: 404,
          message: 'Contact creation is available through the chat interface. Try: "Add John as a contact with address 0x123..."'
        };
      }
      throw error;
    }
  }

  async updateContact(id: string, data: UpdateContactRequest): Promise<ApiResponse<Contact>> {
    try {
      const response = await this.api.put<ApiResponse<Contact>>(`/contacts/${id}`, data);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        // Contact endpoints not available in experimental backend
        return {
          success: false,
          status: 404,
          message: 'Contact updates are available through the chat interface'
        };
      }
      throw error;
    }
  }

  async deleteContact(id: string): Promise<ApiResponse<{ message: string }>> {
    try {
      const response = await this.api.delete<ApiResponse<{ message: string }>>(`/contacts/${id}`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        // Contact endpoints not available in experimental backend
        return {
          success: false,
          status: 404,
          message: 'Contact deletion is available through the chat interface. Try: "Remove John from my contacts"'
        };
      }
      throw error;
    }
  }

  // Agent query - Enhanced with experimental agent integration
  async queryAgent(data: AgentQueryRequest): Promise<AgentQueryResponse> {
    // First try the experimental agent service
    try {
      if (agentService.isAgentConnected()) {
        console.log('[ApiService] Using experimental agent service');
        return await agentService.queryAgent(data);
      }
    } catch (error) {
      console.warn('[ApiService] Experimental agent service failed, falling back to backend');
    }

    // Fallback to backend API (experimental backend)
    try {
      const response = await this.api.post('/query', data);
      
      // The experimental backend returns { result: ... } format
      if (response.data && response.data.result) {
        return {
          result: response.data.result
        };
      }
      
      // Fallback if response format is unexpected
      return {
        result: {
          success: true,
          data: response.data || 'Query processed successfully',
          error: undefined
        }
      };
    } catch (error: any) {
      console.error('[ApiService] Backend query failed:', error);
      // Convert technical errors to user-friendly messages
      let friendlyMessage = 'Query failed. Please try again.';
      const errorMsg = error.response?.data?.message || error.message || 'Unknown error';
      
      if (errorMsg.includes('invalid query')) {
        friendlyMessage = "I didn't understand that. Could you please rephrase your question?";
      } else if (errorMsg.includes('timeout')) {
        friendlyMessage = "The request is taking longer than expected. Please try again.";
      } else if (errorMsg.includes('network')) {
        friendlyMessage = "I'm having trouble connecting. Please check your internet connection and try again.";
      }
      
      return {
        result: {
          success: false,
          data: friendlyMessage,
          error: errorMsg
        }
      };
    }
  }

  // Agent-specific methods
  async getAgentStatus() {
    try {
      return await agentService.getStatus();
    } catch (error) {
      console.error('Failed to get agent status:', error);
      // Return a default status instead of throwing
      return {
        isOnline: false,
        version: '1.0.0',
        uptime: 0,
        lastActivity: new Date().toISOString(),
        activeConnections: 0,
        services: {
          vesu: { isActive: false, isHealthy: false, lastCheck: new Date().toISOString() },
          atomiq: { isActive: false, isHealthy: false, lastCheck: new Date().toISOString() },
          xverse: { isActive: false, isHealthy: false, lastCheck: new Date().toISOString() },
          troves: { isActive: false, isHealthy: false, lastCheck: new Date().toISOString() },
          database: { isActive: false, isHealthy: false, lastCheck: new Date().toISOString() }
        }
      };
    }
  }

  async getAgentCapabilities() {
    try {
      return await agentService.getCapabilities();
    } catch (error) {
      console.error('Failed to get agent capabilities:', error);
      // Return default capabilities instead of throwing
      return {
        supportedActions: [],
        supportedAssets: [],
        supportedProtocols: [],
        features: {
          defi: false,
          crossChain: false,
          voiceCommands: false,
          smartContracts: false,
          yieldFarming: false,
          lending: false,
          borrowing: false,
          swapping: false
        },
        limits: {
          maxQueryLength: 0,
          maxConcurrentQueries: 0,
          rateLimitPerMinute: 0
        }
      };
    }
  }

  async checkAgentHealth() {
    try {
      return await agentService.healthCheck();
    } catch (error) {
      console.error('Failed to check agent health:', error);
      throw error;
    }
  }

  async getAgentTools() {
    try {
      return await agentService.getTools();
    } catch (error) {
      console.error('Failed to get agent tools:', error);
      return [];
    }
  }

  async executeAgentTool(toolName: string, params: any) {
    try {
      return await agentService.executeTool(toolName, params);
    } catch (error) {
      console.error(`Failed to execute agent tool ${toolName}:`, error);
      throw error;
    }
  }

  async getAgentMemory(userId: string) {
    try {
      return await agentService.getMemory(userId);
    } catch (error) {
      console.error('Failed to get agent memory:', error);
      return [];
    }
  }

  async clearAgentMemory(userId: string) {
    try {
      await agentService.clearMemory(userId);
    } catch (error) {
      console.error('Failed to clear agent memory:', error);
      throw error;
    }
  }

  // Chat endpoints - Removed server-side conversation management
  // All conversation and message management is now handled client-side

  // Removed: getOrCreateActiveConversation - now handled client-side

  async getConversationStats(): Promise<ApiResponse<{ totalConversations: number; totalMessages: number; activeConversations: number }>> {
    const response = await this.api.get<ApiResponse<{ totalConversations: number; totalMessages: number; activeConversations: number }>>('/chat/stats');
    return response.data;
  }

  async getPromptVersions(): Promise<PromptVersionRecord[] | ApiResponse<PromptVersionRecord[]> | PromptVersionRecord> {
    const response = await this.api.get<PromptVersionRecord[] | ApiResponse<PromptVersionRecord[]> | PromptVersionRecord>('/versions');
    return response.data;
  }

  async activatePromptVersion(id: string): Promise<ApiResponse<PromptVersionRecord> | PromptVersionRecord> {
    const response = await this.api.patch<ApiResponse<PromptVersionRecord> | PromptVersionRecord>(`/versions/${id}/activate`);
    return response.data;
  }

  // Generic request method for custom endpoints
  async request<T>(config: AxiosRequestConfig): Promise<T> {
    const response = await this.api.request<T>(config);
    return response.data;
  }
}

// Create and export a singleton instance
export const apiService = new ApiService();
export default apiService;
