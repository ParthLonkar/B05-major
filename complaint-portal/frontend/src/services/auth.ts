import axios from './api';
import { ApiResponse, User } from '../types/index.js';

export const authApi = {
  login: async (email: string, password: string): Promise<ApiResponse<{ user: User; token: string }>> => {
    return (await axios.post('/auth/login', { email, password })) as ApiResponse<{ user: User; token: string }>;
  },

  register: async (name: string, email: string, password: string): Promise<ApiResponse<{ user: User; token: string }>> => {
    return (await axios.post('/auth/register', { name, email, password })) as ApiResponse<{ user: User; token: string }>;
  },
};
