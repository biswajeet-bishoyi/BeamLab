
import React from 'react';
import { Database } from 'lucide-react';

export const ContextTab: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full text-sm text-muted p-6 text-center">
      <Database className="w-8 h-8 mb-4 opacity-50" />
      <p className="font-medium text-primary mb-1">Context Engine Ready</p>
      <p className="text-xs">Selected structural members, materials, and loads will appear here once connected to the Runtime Gateway.</p>
    </div>
  );
};
