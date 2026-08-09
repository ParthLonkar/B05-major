/**
 * API Service for communicating with the backend
 * Handles all HTTP requests for complaints, dashboard, and admin operations
 */

import axios, { AxiosInstance } from 'axios';
import { Complaint, DashboardStats, HeatmapMarker, ApiResponse } from '../types/index.js';
import { notifyComplaintsChanged } from '../hooks/useComplaintSync';

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000/api';

const axiosInstance: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

axiosInstance.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('user');
      localStorage.removeItem('authToken');
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export const complaintApi = {
  getAll: async (): Promise<ApiResponse<Complaint[]>> => {
    return (await axiosInstance.get('/complaints')) as ApiResponse<Complaint[]>;
  },

  getById: async (id: string): Promise<ApiResponse<Complaint>> => {
    return (await axiosInstance.get(`/complaints/${id}`)) as ApiResponse<Complaint>;
  },

  create: async (data: any): Promise<ApiResponse<Complaint>> => {
    const response = (await axiosInstance.post('/complaints', data)) as ApiResponse<Complaint>;
    if (response.success) {
      notifyComplaintsChanged();
    }
    return response;
  },

  updateStatus: async (
    id: string,
    status: 'Pending' | 'Progressed' | 'Under Construction' | 'Done'
  ): Promise<ApiResponse<Complaint>> => {
    const response = (await axiosInstance.put(`/complaints/${id}/status`, { status })) as ApiResponse<Complaint>;
    if (response.success) {
      notifyComplaintsChanged();
    }
    return response;
  },

  delete: async (id: string): Promise<ApiResponse<void>> => {
    const response = (await axiosInstance.delete(`/complaints/${id}`)) as ApiResponse<void>;
    if (response.success) {
      notifyComplaintsChanged();
    }
    return response;
  },

  search: async (query: string): Promise<ApiResponse<Complaint[]>> => {
    return (await axiosInstance.get('/complaints/search/query', {
      params: { q: query },
    })) as ApiResponse<Complaint[]>;
  },
};

export const dashboardApi = {
  getStats: async (): Promise<ApiResponse<DashboardStats>> => {
    return (await axiosInstance.get('/dashboard/stats')) as ApiResponse<DashboardStats>;
  },

  getHeatmapData: async (): Promise<ApiResponse<HeatmapMarker[]>> => {
    return (await axiosInstance.get('/dashboard/heatmap')) as ApiResponse<HeatmapMarker[]>;
  },
};

export const healthCheck = async (): Promise<any> => {
  return axiosInstance.get('/health');
};

export const api = {
  get: (path: string, config?: any) => axiosInstance.get(path, config),
  post: (path: string, data?: any, config?: any) => axiosInstance.post(path, data, config),
  put: (path: string, data?: any, config?: any) => axiosInstance.put(path, data, config),
  delete: (path: string, config?: any) => axiosInstance.delete(path, config),
};

export default axiosInstance;