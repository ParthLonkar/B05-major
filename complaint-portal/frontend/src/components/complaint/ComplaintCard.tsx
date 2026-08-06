/**
 * Complaint Card Component
 * Displays a single complaint in list/grid view
 */

import React from 'react';
import { Card } from '../ui/Card.js';
import { Badge } from '../ui/Badge.js';
import { Complaint } from '../../types/index.js';

interface ComplaintCardProps {
  complaint: Complaint;
  onClick?: (complaint: Complaint) => void;
}

export const ComplaintCard: React.FC<ComplaintCardProps> = ({ complaint, onClick }) => {
  const getSeverityVariant = (severity: string) => {
    const map: Record<string, 'low' | 'medium' | 'high' | 'critical'> = {
      'Low': 'low',
      'Medium': 'medium',
      'High': 'high',
      'Critical': 'critical',
    };
    return map[severity] || 'info';
  };

  const getStatusVariant = (status: string) => {
    const map: Record<string, 'success' | 'warning' | 'danger' | 'info'> = {
      'Pending': 'warning',
      'Progressed': 'info',
      'Under Construction': 'warning',
      'Done': 'success',
    };
    return map[status] || 'info';
  };

  return (
    <Card clickable onClick={() => onClick?.(complaint)} className="cursor-pointer touch-feedback">
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-gray-900 dark:text-white text-base sm:text-lg truncate">{complaint.complaintId}</h3>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">{complaint.category}</p>
          </div>
          <div className="flex gap-1 sm:gap-2 shrink-0">
            <Badge label={complaint.severity} variant={getSeverityVariant(complaint.severity)} size="sm" />
            <Badge label={complaint.status} variant={getStatusVariant(complaint.status)} size="sm" />
          </div>
        </div>

        <p className="text-gray-700 dark:text-gray-300 line-clamp-2 text-sm sm:text-base">{complaint.description}</p>

        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span className="truncate">📍 {complaint.address}</span>
          <span className="shrink-0 ml-2">{new Date(complaint.createdAt).toLocaleDateString()}</span>
        </div>

        {complaint.status !== 'Completed' && complaint.estimatedCompletion && (
          <div className="text-xs font-medium text-blue-600 dark:text-blue-400 truncate">
            Est. Completion: {new Date(complaint.estimatedCompletion).toLocaleDateString()}
          </div>
        )}
      </div>
    </Card>
  );
};
