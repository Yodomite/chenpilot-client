// User and Authentication Types
export interface User {
  id: string;
  email: string;
  name: string;
  address: string;
  publicKey: string;
  isDeployed: boolean;
  isFunded: boolean;
  tokenType: "XLM";
  authProvider: "email" | "google";
  isEmailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StellarAccountInfo {
  address: string;
  publicKey: string;
  isDeployed: boolean;
  deploymentTransactionHash?: string;
}

// Keep for backward compatibility
export type StarknetAccountInfo = StellarAccountInfo;

export interface AccountStatus {
  isDeployed: boolean;
  isFunded: boolean;
  deploymentTransactionHash?: string;
  fundingTransactionHash?: string;
  balance: string;
  address: string;
  publicKey: string;
}

// Authentication Request/Response Types
export interface RegisterRequest {
  email: string;
  password: string;
  name?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterResponse {
  success: boolean;
  message: string;
  data: {
    user: User;
    token: string;
    stellarAccount: StellarAccountInfo;
    starknetAccount: StellarAccountInfo; // Alias for backward compatibility
    setupStatus: {
      funding: {
        success: boolean;
        error?: string;
        amount: string;
        transactionHash?: string;
      };
      deployment: {
        success: boolean;
        transactionHash?: string;
        contractAddress?: string;
      };
      fullyReady: boolean;
    };
  };
}

export interface LoginResponse {
  success: boolean;
  message: string;
  data: {
    user: User;
    token: string;
    stellarAccount: StellarAccountInfo;
    starknetAccount: StellarAccountInfo; // Alias for backward compatibility
  };
}

// Contact Management Types
export interface Contact {
  id: string;
  name: string;
  address: string;
  tokenType: "XLM" | "USDC" | "USDT" | "BTC" | "ETH";
  createdAt: string;
  updatedAt: string;
}

export interface CreateContactRequest {
  name: string;
  address: string;
  tokenType: "XLM" | "USDC" | "USDT" | "BTC" | "ETH";
}

export interface UpdateContactRequest {
  name?: string;
  address?: string;
  tokenType?: "XLM" | "USDC" | "USDT" | "BTC" | "ETH";
}

// Balance and Wallet Types
export interface BalanceResponse {
  success: boolean;
  data: {
    hasBalance: boolean;
    balance: string;
    required: string;
    nativeBalance: string;
  };
}

export interface WalletBalance {
  hasBalance: boolean;
  balance: string;
  required: string;
  nativeBalance: string;
}

// Stellar Transaction Types
export interface StellarOperation {
  id: string;
  type: string; // e.g., 'payment', 'create_account', 'trust', etc.
  amount?: string;
  asset?: string;
  from?: string;
  to?: string;
  source_account: string;
}

export interface StellarTransaction {
  id: string;
  hash: string;
  ledger: number;
  created_at: string;
  source_account: string;
  fee_charged: string;
  operation_count: number;
  successful: boolean;
  operations: StellarOperation[];
}

export interface TransactionHistory {
  transactions: StellarTransaction[];
  isLoading: boolean;
  error: string | null;
}

// Agent Query Types
export interface AgentQueryRequest {
  userId: string;
  query: string;
}

export interface AgentQueryResponse {
  result: {
    success: boolean;
    data: string;
    error?: string;
    executionTrace?: ExecutionTrace;
  };
}

// Execution Trace Types
export interface ExecutionTrace {
  steps: ExecutionStep[];
  totalTime: number;
  startTime: string;
  endTime: string;
}

export interface ExecutionStep {
  id: string;
  name: string;
  type: 'thought' | 'action' | 'tool_call' | 'result' | 'error';
  timestamp: string;
  duration: number;
  description: string;
  details?: any;
  substeps?: ExecutionStep[];
}

// Chat and Message Types
export interface ChatMessage {
  id: string;
  type: "user" | "agent" | "system";
  content: string;
  timestamp: string;
  metadata?: {
    transactionHash?: string;
    amount?: string;
    tokenType?: string;
    status?: "pending" | "success" | "failed";
    success?: boolean;
    error?: string;
    type?: string;
    action?: string;
    asset?: string;
    requiresConfirmation?: boolean;
    executionTrace?: ExecutionTrace;
  };
}

export interface Conversation {
  id: string;
  title: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  userId: string;
  messageCount: number;
  messages?: ChatMessage[];
}

export interface PromptVersionRecord {
  [key: string]: unknown;
}

export interface PromptVersion {
  id: string;
  label: string;
  description: string;
  template: string;
  version: string;
  isActive: boolean;
  createdAt: string | null;
  updatedAt: string | null;
  tags: string[];
  raw: PromptVersionRecord;
}

// API Response Types
export interface ApiError {
  success: false;
  status: number;
  message: string;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
  message?: string;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// UI State Types
export interface Notification {
  id: string;
  type: "success" | "error" | "warning" | "info";
  title: string;
  message: string;
  duration?: number;
  timestamp: string;
}

export interface Theme {
  mode: "light" | "dark";
}

// Form Types
export interface FormField {
  name: string;
  label: string;
  type: "text" | "email" | "password" | "number" | "select";
  placeholder?: string;
  required?: boolean;
  validation?: any;
  options?: { value: string; label: string }[];
}

// Navigation Types
export interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: string;
  badge?: string | number;
  children?: NavItem[];
}

// Environment Configuration
export interface Environment {
  API_BASE_URL: string;
  GOOGLE_CLIENT_ID: string;
  APP_NAME: string;
  APP_VERSION: string;
  NODE_ENV: "development" | "production" | "test";
}

// Redux State Types
export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface AccountState {
  status: AccountStatus | null;
  balance: WalletBalance | null;
  transactions: TransactionHistory;
  isLoading: boolean;
  error: string | null;
  network: {
    status: 'healthy' | 'degraded' | 'down' | 'unknown';
    latestLedger: number | null;
    ledgerCloseTimeMs: number | null;
    ledgerAgeSeconds: number | null;
    congestion: boolean;
    accountSyncState: 'synced' | 'syncing' | 'desynced';
    lastUpdated: string | null;
    isLoading: boolean;
    error: string | null;
  };
}

export interface ContactsState {
  list: Contact[];
  isLoading: boolean;
  error: string | null;
  selectedContact: Contact | null;
}

export interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  isTyping: boolean;
}

export interface UIState {
  theme: Theme;
  sidebarOpen: boolean;
  notifications: Notification[];
  modals: {
    [key: string]: boolean;
  };
}

export interface RootState {
  auth: AuthState;
  account: AccountState;
  contacts: ContactsState;
  chat: ChatState;
  ui: UIState;
}

// Component Props Types
export interface ButtonProps {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  loading?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
  className?: string;
}

export interface InputProps {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  [key: string]: any;
}

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

export interface CardProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  actions?: React.ReactNode;
}

// Utility Types
export type TokenType = "XLM" | "USDC" | "USDT" | "BTC" | "ETH" | "AQUA";
export type AuthProvider = "email" | "google";
export type MessageType = "user" | "agent" | "system";
export type NotificationType = "success" | "error" | "warning" | "info";
export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";
export type ModalSize = "sm" | "md" | "lg" | "xl";

// Liquidity Pool Types
export interface LiquidityPool {
  id: string;
  name: string;
  token1: {
    symbol: string;
    name: string;
    address: string;
    decimals: number;
  };
  token2: {
    symbol: string;
    name: string;
    address: string;
    decimals: number;
  };
  reserve1: string;
  reserve2: string;
  totalLiquidity: string;
  apr: number;
  volume24h: string;
  fee: number;
  isActive: boolean;
  created_at: string;
}

export interface LiquidityStats {
  totalPools: number;
  totalLiquidity: string;
  totalVolume24h: string;
  averageAPR: number;
  activePools: number;
  topPools: LiquidityPool[];
  networkMetrics: {
    gasPrice: string;
    blockNumber: number;
    timestamp: string;
  };
}

export interface LiquidityRequest {
  includeInactive?: boolean;
  limit?: number;
  sortBy?: 'liquidity' | 'volume' | 'apr';
  sortOrder?: 'asc' | 'desc';
}
