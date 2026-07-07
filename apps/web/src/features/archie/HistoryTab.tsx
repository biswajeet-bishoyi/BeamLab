
import React from 'react';
import { History } from 'lucide-react';

export const HistoryTab: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full text-sm text-muted p-6 text-center">
      <History className="w-8 h-8 mb-4 opacity-50" />
      <p className="font-medium text-primary mb-1">No Recent History</p>
      <p className="text-xs">Your past conversations and execution logs will be saved here.</p>
    </div>
  );
};
