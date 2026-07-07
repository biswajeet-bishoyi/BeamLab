import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import { WorkspaceLayout } from './layouts/WorkspaceLayout';
import { Dashboard } from './components/Dashboard';
import { Gallery } from './components/Gallery';
import { useStore } from './store';
import { Moon, Sun } from 'lucide-react';

function AppContent() {
  const currentView = useStore(state => state.currentView);
  const navigate = useNavigate();

  // Sync Zustand store with React Router
  useEffect(() => {
    if (currentView === 'dashboard') navigate('/');
    else if (currentView === 'workspace') navigate('/workspace');
    else if (currentView === 'gallery') navigate('/gallery');
  }, [currentView, navigate]);

  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/workspace" element={<WorkspaceLayout />} />
      <Route path="/gallery" element={<Gallery />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  return (
    <div className={`h-screen w-screen overflow-hidden transition-colors duration-300 font-sans ${theme}`}>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
      
      {/* Global Theme Toggle */}
      <button 
        onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
        className="absolute bottom-6 left-6 z-[100] p-3 rounded-full bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-lg border border-slate-200 dark:border-slate-700 hover:scale-110 transition-transform"
      >
        {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
      </button>
    </div>
  );
}

export default App;
