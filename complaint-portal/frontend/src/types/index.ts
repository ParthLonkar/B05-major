/**
 * Type definitions for the Complaint Management Portal
 */

export interface Complaint {
  id: string;
  complaintId: string;
  fullName: string;
  mobileNumber: string;
  email?: string;
  category: 'Pothole' | 'Road Damage' | 'Water Logging' | 'Other';
  description: string;
  imagePreview?: string;
  latitude: number;
  longitude: number;
  address: string;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  status: 'Pending' | 'Assigned' | 'In Progress' | 'Completed';
  createdAt: string;
  updatedAt: string;
  estimatedCompletion?: string;
  assignedTo?: string;
  notes?: string;
}

export interface HeatmapMarker {
  id: string;
  latitude: number;
  longitude: number;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  status: 'Pending' | 'Assigned' | 'In Progress' | 'Completed';
  description: string;
  category: string;
  createdAt: string;
}

export interface DashboardStats {
  total: number;
  pending: number;
  assigned: number;
  inProgress: number;
  completed: number;
  severityCounts: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  statusCounts: {
    pending: number;
    assigned: number;
    inProgress: number;
    completed: number;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  total?: number;
  emailSent?: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
}
