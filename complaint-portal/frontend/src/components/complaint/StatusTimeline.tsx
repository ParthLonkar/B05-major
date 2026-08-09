/**
 * Status Timeline Component
 * Shows complaint progression through statuses
 */

import React from 'react';

interface StatusTimelineProps {
  currentStatus: 'Pending' | 'Progressed' | 'Under Construction' | 'Done';
  createdAt: string;
  estimatedCompletion?: string;
}

export const StatusTimeline: React.FC<StatusTimelineProps> = ({
  currentStatus,
  createdAt,
  estimatedCompletion,
}) => {
  const statuses = ['Pending', 'Progressed', 'Under Construction', 'Done'];
  const currentIndex = statuses.indexOf(currentStatus);

  const statusIcons = {
    Pending: '📋',
    Progressed: '👤',
    'Under Construction': '🏗️',
    Done: '✅',
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Progress Timeline</h3>

      <div className="space-y-4">
        {statuses.map((status, index) => (
          <div key={status} className="flex items-start gap-4">
            {/* Timeline dot */}
            <div className="flex flex-col items-center">
              <div
                className={`
                  w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold
                  transition-all duration-300
                  ${
                    index < currentIndex
                      ? 'bg-green-500 text-white'
                      : index === currentIndex
                        ? 'bg-blue-500 text-white ring-2 ring-blue-300'
                        : 'bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400'
                  }
                `}
              >
                {statusIcons[status as keyof typeof statusIcons]}
              </div>
              {index < statuses.length - 1 && (
                <div
                  className={`
                    w-1 h-12 mt-2
                    ${index < currentIndex ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}
                  `}
                ></div>
              )}
            </div>

            {/* Status info */}
            <div className="pt-2 flex-1">
              <h4 className={`font-semibold ${index <= currentIndex ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`}>
                {status}
              </h4>
              {index === currentIndex && currentStatus !== 'Done' && estimatedCompletion && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Est. by {new Date(estimatedCompletion).toLocaleDateString()}
                </p>
              )}
              {index < currentIndex && (
                <p className="text-sm text-green-600 dark:text-green-400 mt-1">✓ Completed</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
