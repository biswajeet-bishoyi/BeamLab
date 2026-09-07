import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { WorkspaceLayout } from './layouts/WorkspaceLayout';
import { Dashboard } from './components/Dashboard';
import { Gallery } from './components/Gallery';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useStore } from './store';
import { Moon, Sun } from 'lucide-react';

function AppContent() {
  const currentView = useStore(state => state.currentView);
  const setView = useStore(state => state.setView);
  const navigate = useNavigate();
  const location = useLocation();

  // 1. Sync route URL into Zustand store only when the route changes (deep-link, browser back/forward)
  useEffect(() => {
    const path = location.pathname;
    const storeView = useStore.getState().currentView;
    if (path.includes('/workspace')) {
      if (storeView !== 'workspace') setView('workspace');
    } else if (path.includes('/gallery')) {
      if (storeView !== 'gallery') setView('gallery');
    } else {
      if (storeView !== 'dashboard') setView('dashboard');
    }
  }, [location.pathname, setView]);

  // 2. Sync Zustand store updates (e.g. setView or loadPreset actions) to React Router
  useEffect(() => {
    const path = location.pathname;
    if (currentView === 'workspace') {
      if (!path.includes('/workspace')) {
        navigate('/workspace');
      }
    } else if (currentView === 'gallery') {
      if (!path.includes('/gallery')) {
        navigate('/gallery');
      }
    } else if (currentView === 'dashboard') {
      if (path.includes('/workspace') || path.includes('/gallery')) {
        navigate('/');
      }
    }
  }, [currentView, location.pathname, navigate]);

  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/workspace" element={<WorkspaceLayout />} />
        <Route path="/gallery" element={<Gallery />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ErrorBoundary>
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
