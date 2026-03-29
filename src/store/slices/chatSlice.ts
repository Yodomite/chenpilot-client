import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { ChatMessage, AgentQueryRequest, Conversation } from '@/types';
import { AgentQueryResponse } from '@/types/agent';
import apiService from '@/services/api';

interface ChatState {
  messages: ChatMessage[];
  conversations: Conversation[];
  currentConversation: Conversation | null;
  isLoading: boolean;
  error: string | null;
  isTyping: boolean;
  agentStatus: {
    isConnected: boolean;
    lastHealthCheck: string | null;
    capabilities: any;
  };
  chatHistory: { [conversationId: string]: ChatMessage[] };
}

const initialState: ChatState = {
  messages: [],
  conversations: [],
  currentConversation: null,
  isLoading: false,
  error: null,
  isTyping: false,
  agentStatus: {
    isConnected: false,
    lastHealthCheck: null,
    capabilities: null,
  },
  chatHistory: {},
};

// Async thunks
// Removed server-side conversation thunks - now handled client-side

export const getOrCreateActiveConversation = createAsyncThunk(
  'chat/getOrCreateActiveConversation',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as any;
      const currentConversation = state.chat.currentConversation;
      
      // If we already have an active conversation, return it
      if (currentConversation) {
        return currentConversation;
      }
      
      // Create a new conversation locally
      const newConversation: Conversation = {
        id: `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: 'New Chat',
        description: 'A new conversation',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        userId: state.auth.user?.id || 'anonymous',
        messageCount: 0
      };
      
      return newConversation;
    } catch (error: any) {
      return rejectWithValue('Failed to create conversation');
    }
  }
);

export const sendMessage = createAsyncThunk(
  'chat/sendMessage',
  async (query: string, { getState, rejectWithValue }) => {
    try {
      const state = getState() as any;
      const userId = state.auth.user?.id;
      const currentConversation = state.chat.currentConversation;
      
      if (!userId) {
        return rejectWithValue('User not authenticated');
      }

      // Get or create active conversation locally
      let conversation = currentConversation;
      if (!conversation) {
        // Create a new conversation locally
        conversation = {
          id: `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          title: 'New Chat',
          description: 'A new conversation',
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          userId: userId,
          messageCount: 0
        };
      }

      // Save user message locally (no server call needed)
      const userMessage: ChatMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'user',
        content: query,
        timestamp: new Date().toISOString(),
      };

      // Call the API service to get actual response
      const response = await apiService.queryAgent({ userId, query });
      
      // Create agent message with execution trace if available
      const agentMessage: ChatMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'agent',
        content: response.result.data,
        timestamp: new Date().toISOString(),
        metadata: {
          success: response.result.success,
          error: response.result.error,
          executionTrace: response.result.executionTrace,
        }
      };

      return { response, conversation, userMessage, agentMessage };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to send message');
    }
  }
);

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    addMessage: (state, action: PayloadAction<ChatMessage>) => {
      state.messages.push(action.payload);
    },
    addUserMessage: (state, action: PayloadAction<string>) => {
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        type: 'user',
        content: action.payload,
        timestamp: new Date().toISOString(),
      };
      state.messages.push(userMessage);
    },
    addSystemMessage: (state, action: PayloadAction<{ content: string; metadata?: any }>) => {
      const systemMessage: ChatMessage = {
        id: Date.now().toString(),
        type: 'system',
        content: action.payload.content,
        timestamp: new Date().toISOString(),
        metadata: action.payload.metadata,
      };
      state.messages.push(systemMessage);
    },
    clearMessages: (state) => {
      state.messages = [];
    },
    setMessages: (state, action: PayloadAction<ChatMessage[]>) => {
      state.messages = action.payload;
    },
    setConversations: (state, action: PayloadAction<Conversation[]>) => {
      state.conversations = action.payload;
    },
    setCurrentConversation: (state, action: PayloadAction<Conversation | null>) => {
      state.currentConversation = action.payload;
    },
    setTyping: (state, action: PayloadAction<boolean>) => {
      state.isTyping = action.payload;
    },
    updateMessage: (state, action: PayloadAction<{ id: string; updates: Partial<ChatMessage> }>) => {
      const index = state.messages.findIndex(msg => msg.id === action.payload.id);
      if (index !== -1) {
        state.messages[index] = { ...state.messages[index], ...action.payload.updates };
      }
    },
    removeMessage: (state, action: PayloadAction<string>) => {
      state.messages = state.messages.filter(msg => msg.id !== action.payload);
    },
    updateAgentStatus: (state, action: PayloadAction<{ isConnected: boolean; lastHealthCheck: string | null; capabilities?: any }>) => {
      state.agentStatus = { ...state.agentStatus, ...action.payload };
    },
    setAgentConnected: (state, action: PayloadAction<boolean>) => {
      state.agentStatus.isConnected = action.payload;
    },
    startNewChat: (state) => {
      // Save current conversation messages to history
      if (state.currentConversation && state.messages.length > 0) {
        state.chatHistory[state.currentConversation.id] = [...state.messages];
      }
      // Clear current messages and conversation
      state.messages = [];
      state.currentConversation = null;
      // Save to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('chat_history', JSON.stringify(state.chatHistory));
      }
    },
    loadChatHistory: (state, action: PayloadAction<string>) => {
      const conversationId = action.payload;
      if (state.chatHistory[conversationId]) {
        state.messages = state.chatHistory[conversationId];
      } else {
        state.messages = [];
      }
    },
    saveChatHistory: (state) => {
      if (state.currentConversation && state.messages.length > 0) {
        state.chatHistory[state.currentConversation.id] = [...state.messages];
        // Save to localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem('chat_history', JSON.stringify(state.chatHistory));
        }
      }
    },
    deleteChatHistory: (state, action: PayloadAction<string>) => {
      const conversationId = action.payload;
      delete state.chatHistory[conversationId];
      // Save to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('chat_history', JSON.stringify(state.chatHistory));
      }
    },
    initializeChatHistory: (state) => {
      if (typeof window !== 'undefined') {
        const savedHistory = localStorage.getItem('chat_history');
        if (savedHistory) {
          try {
            state.chatHistory = JSON.parse(savedHistory);
          } catch (error) {
            console.error('Failed to parse chat history:', error);
            state.chatHistory = {};
          }
        }
      }
    },
    saveConversationLocally: (state, action: PayloadAction<Conversation>) => {
      const conversation = action.payload;
      state.conversations.unshift(conversation);
      
      // Save to localStorage
      if (typeof window !== 'undefined') {
        const conversations = JSON.parse(localStorage.getItem('conversations') || '[]');
        conversations.unshift(conversation);
        localStorage.setItem('conversations', JSON.stringify(conversations));
      }
    },
    loadConversationsLocally: (state) => {
      if (typeof window !== 'undefined') {
        const conversations = JSON.parse(localStorage.getItem('conversations') || '[]');
        state.conversations = conversations;
      }
    },
    deleteConversationLocally: (state, action: PayloadAction<string>) => {
      const conversationId = action.payload;
      state.conversations = state.conversations.filter(conv => conv.id !== conversationId);
      delete state.chatHistory[conversationId];
      
      // Update localStorage
      if (typeof window !== 'undefined') {
        const conversations = JSON.parse(localStorage.getItem('conversations') || '[]');
        const updatedConversations = conversations.filter((conv: Conversation) => conv.id !== conversationId);
        localStorage.setItem('conversations', JSON.stringify(updatedConversations));
        
        const chatHistory = JSON.parse(localStorage.getItem('chat_history') || '{}');
        delete chatHistory[conversationId];
        localStorage.setItem('chat_history', JSON.stringify(chatHistory));
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Removed server conversation extraReducers - now handled client-side
      
      // Get or Create Active Conversation
      .addCase(getOrCreateActiveConversation.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getOrCreateActiveConversation.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentConversation = action.payload;
        state.messages = action.payload.messages || [];
        state.error = null;
      })
      .addCase(getOrCreateActiveConversation.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Send Message
      .addCase(sendMessage.pending, (state) => {
        state.isLoading = true;
        state.isTyping = true;
        state.error = null;
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isTyping = false;
        state.currentConversation = action.payload.conversation;
        
        // Debug logging to see what the server is returning
        console.log('[ChatSlice] Full response:', action.payload.response);
        console.log('[ChatSlice] Response result:', action.payload.response.result);
        console.log('[ChatSlice] Response data:', action.payload.response.result.data);
        
        // Handle different response formats
        let content = action.payload.response.result.data;
        
        // If the response data is an object with structured data, use it directly
        if (typeof content === 'object' && content !== null) {
          // The content is already structured, use it as is
          console.log('[ChatSlice] Using structured content:', content);
        } else if (typeof content === 'string') {
          // Try to parse if it's a JSON string
          try {
            const parsed = JSON.parse(content);
            if (typeof parsed === 'object' && parsed !== null) {
              content = parsed;
              console.log('[ChatSlice] Parsed JSON content:', content);
            }
          } catch (e) {
            // Not JSON, use as string
            console.log('[ChatSlice] Using string content:', content);
          }
        }
        
        // Add both user and agent messages from the payload
        if (action.payload.userMessage) {
          state.messages.push(action.payload.userMessage);
        }
        
        if (action.payload.agentMessage) {
          state.messages.push(action.payload.agentMessage);
        }
        
        // Save chat history after each message
        if (state.currentConversation) {
          state.chatHistory[state.currentConversation.id] = [...state.messages];
          if (typeof window !== 'undefined') {
            localStorage.setItem('chat_history', JSON.stringify(state.chatHistory));
          }
        }
        
        state.error = null;
      })
      .addCase(sendMessage.rejected, (state, action) => {
        state.isLoading = false;
        state.isTyping = false;
        state.error = action.payload as string;
        
        // Add error message with friendly content
        const errorContent = action.payload instanceof Error 
          ? action.payload.message 
          : String(action.payload);
        
        // Convert technical error messages to user-friendly ones
        let friendlyMessage = errorContent;
        if (errorContent.includes('invalid query')) {
          friendlyMessage = "I didn't understand that. Could you please rephrase your question?";
        } else if (errorContent.includes('Failed to send message')) {
          friendlyMessage = "I'm having trouble processing your request. Please try again.";
        } else if (errorContent.includes('User not authenticated')) {
          friendlyMessage = "Please log in to continue the conversation.";
        }
        
        const errorMessage: ChatMessage = {
          id: Date.now().toString(),
          type: 'agent',
          content: friendlyMessage,
          timestamp: new Date().toISOString(),
          metadata: {
            success: false,
            type: 'error',
          },
        };
        state.messages.push(errorMessage);
      });
  },
});

export const {
  clearError,
  addMessage,
  addUserMessage,
  addSystemMessage,
  clearMessages,
  setMessages,
  setConversations,
  setCurrentConversation,
  setTyping,
  updateMessage,
  removeMessage,
  updateAgentStatus,
  setAgentConnected,
  startNewChat,
  loadChatHistory,
  saveChatHistory,
  deleteChatHistory,
  initializeChatHistory,
  saveConversationLocally,
  loadConversationsLocally,
  deleteConversationLocally,
} = chatSlice.actions;
export default chatSlice.reducer;
