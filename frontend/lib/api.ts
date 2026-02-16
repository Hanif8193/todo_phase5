import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Task interface matching backend schema
export interface Task {
  id: number;
  title: string;
  description: string | null;
  due_date: string | null;
  priority: 'low' | 'medium' | 'high';
  completed: boolean;
  completed_at: string | null;
  user_id: number;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: number;
  email: string;
  name: string | null;
  created_at: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name?: string;
}

export interface TaskCreate {
  title: string;
  description?: string;
  due_date?: string;
  priority?: 'low' | 'medium' | 'high';
}

export interface TaskUpdate {
  title?: string;
  description?: string;
  due_date?: string;
  priority?: 'low' | 'medium' | 'high';
  completed?: boolean;
}

export interface ChatRequest {
  message: string;
}

export interface ChatResponse {
  response: string;
  action?: string;
  task_created?: Task;
}

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests if available
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Auth API
export const authApi = {
  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/api/auth/register', data);
    return response.data;
  },

  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/api/auth/login', data);
    return response.data;
  },

  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
    }
  },

  getCurrentUser: (): User | null => {
    if (typeof window === 'undefined') return null;
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  getToken: (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('auth_token');
  },

  setAuth: (token: string, user: User) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
      localStorage.setItem('user', JSON.stringify(user));
    }
  },
};

// Task API
export const taskApi = {
  // Get all tasks for current user
  getTasks: async (filters?: {
    q?: string;
    priority?: string;
    status?: string;
    overdue?: boolean;
    sort_by?: string;
    sort_order?: string;
  }): Promise<Task[]> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
    }
    const response = await api.get<Task[]>(`/api/tasks?${params.toString()}`);
    return response.data;
  },

  // Create a new task
  createTask: async (data: TaskCreate): Promise<Task> => {
    const response = await api.post<Task>('/api/tasks', data);
    return response.data;
  },

  // Update a task
  updateTask: async (userId: number, taskId: number, data: TaskUpdate): Promise<Task> => {
    const response = await api.put<Task>(`/api/tasks/${userId}/${taskId}`, data);
    return response.data;
  },

  // Complete a task
  completeTask: async (userId: number, taskId: number): Promise<Task> => {
    const response = await api.put<Task>(`/api/tasks/${userId}/${taskId}/complete`, {});
    return response.data;
  },

  // Delete a task
  deleteTask: async (userId: number, taskId: number): Promise<void> => {
    await api.delete(`/api/tasks/${userId}/${taskId}`);
  },
};

// Chat API
export const chatApi = {
  sendMessage: async (message: string): Promise<ChatResponse> => {
    const response = await api.post<ChatResponse>('/api/chat', { message });
    return response.data;
  },
};

// Recurring Rule interface
export interface RecurringRule {
  id: number;
  user_id: number;
  title: string;
  description: string | null;
  recurrence_type: 'daily' | 'weekly' | 'monthly';
  recurrence_rule: {
    interval: number;
    weekdays?: string[];
    month_day?: number;
  };
  start_date: string | null;
  end_date: string | null;
  max_occurrences: number | null;
  timezone: string | null;
}

export interface RecurringRuleCreate {
  title: string;
  description?: string;
  recurrence_type: 'daily' | 'weekly' | 'monthly';
  recurrence_rule: {
    interval: number;
    weekdays?: string[];
    month_day?: number;
  };
  start_date: string;
  end_date?: string;
  max_occurrences?: number;
  timezone?: string;
}

export interface RecurringRuleUpdate {
  title?: string;
  description?: string;
  recurrence_type?: 'daily' | 'weekly' | 'monthly';
  recurrence_rule?: {
    interval?: number;
    weekdays?: string[];
    month_day?: number;
  };
  end_date?: string;
  max_occurrences?: number;
  timezone?: string;
}

// Recurring Tasks API
export const recurringApi = {
  // Get all recurring rules
  getRules: async (activeOnly: boolean = true): Promise<RecurringRule[]> => {
    const response = await api.get<RecurringRule[]>(`/api/tasks/recurring?active_only=${activeOnly}`);
    return response.data;
  },

  // Create a new recurring rule
  createRule: async (data: RecurringRuleCreate): Promise<RecurringRule> => {
    const response = await api.post<RecurringRule>('/api/tasks/recurring', data);
    return response.data;
  },

  // Get a specific recurring rule
  getRule: async (ruleId: number): Promise<RecurringRule> => {
    const response = await api.get<RecurringRule>(`/api/tasks/recurring/${ruleId}`);
    return response.data;
  },

  // Update a recurring rule
  updateRule: async (ruleId: number, data: RecurringRuleUpdate): Promise<RecurringRule> => {
    const response = await api.put<RecurringRule>(`/api/tasks/recurring/${ruleId}`, data);
    return response.data;
  },

  // Delete a recurring rule
  deleteRule: async (ruleId: number): Promise<void> => {
    await api.delete(`/api/tasks/recurring/${ruleId}`);
  },

  // Generate a task from a specific rule
  generateTask: async (ruleId: number): Promise<Task> => {
    const response = await api.post<Task>(`/api/tasks/recurring/${ruleId}/generate`, {});
    return response.data;
  },

  // Generate tasks from all due recurring rules
  generateDueTasks: async (): Promise<Task[]> => {
    const response = await api.post<Task[]>('/api/tasks/recurring/generate-due', {});
    return response.data;
  },
};

// Health check
export const healthCheck = async (): Promise<{ status: string }> => {
  const response = await api.get('/health');
  return response.data;
};
