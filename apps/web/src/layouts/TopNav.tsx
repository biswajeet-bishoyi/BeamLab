
import React from 'react';
import { Layers, Search, Bell, Settings, User } from 'lucide-react';
import { Button } from '@beamworks/design-system';
import { useStore } from '../store';

export const TopNav: React.FC = () => {
  const setView = useStore(state => state.setView);

  return (
    <header className="h-14 border-b border-subtle bg-panel flex items-center justify-between px-4 shrink-0">
      <div className="flex items-center gap-4">
        <button 
          onClick={() => setView('dashboard')}
          className="flex items-center gap-2 text-accent font-bold text-lg hover:opacity-80 transition-opacity"
        >
          <Layers className="w-6 h-6" />
          <span>BeamLab</span>
        </button>
        <div className="h-6 w-px bg-subtle mx-2" />
        <span className="text-sm text-primary font-medium">New Project</span>
      </div>
      
      <div className="flex items-center gap-2">
        <div className="relative group hidden md:block">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input 
            type="text" 
            placeholder="Search (Ctrl+/)" 
            className="h-8 bg-app border border-subtle rounded-md pl-9 pr-3 text-sm text-primary w-64 focus:outline-none focus:border-accent"
          />
        </div>
        <Button variant="ghost" size="icon" className="text-muted hover:text-primary"><Bell className="w-4 h-4" /></Button>
        <Button variant="ghost" size="icon" className="text-muted hover:text-primary"><Settings className="w-4 h-4" /></Button>
        <Button variant="ghost" size="icon" className="text-muted hover:text-primary"><User className="w-4 h-4" /></Button>
      </div>
    </header>
  );
};
