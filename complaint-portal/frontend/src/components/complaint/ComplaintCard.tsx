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
      'Assigned': 'info',
      'In Progress': 'warning',
      'Completed': 'success',
    };
    return map[status] || 'info';
  };

  return (
    <Card clickable onClick={() => onClick?.(complaint)} className="cursor-pointer">
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white text-lg">{complaint.complaintId}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">{complaint.category}</p>
          </div>
          <div className="flex gap-2">
            <Badge label={complaint.severity} variant={getSeverityVariant(complaint.severity)} size="sm" />
            <Badge label={complaint.status} variant={getStatusVariant(complaint.status)} size="sm" />
          </div>
        </div>

        <p className="text-gray-700 dark:text-gray-300 line-clamp-2">{complaint.description}</p>

        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>📍 {complaint.address}</span>
          <span>{new Date(complaint.createdAt).toLocaleDateString()}</span>
        </div>

        {complaint.status !== 'Completed' && complaint.estimatedCompletion && (
          <div className="text-xs font-medium text-blue-600 dark:text-blue-400">
            Est. Completion: {new Date(complaint.estimatedCompletion).toLocaleDateString()}
          </div>
        )}
      </div>
    </Card>
  );
};
