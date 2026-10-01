import { useEffect, useState, useRef } from 'react';
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

  const prevPathRef = useRef<string | null>(null);
  const prevViewRef = useRef<string | null>(null);

  // Synchronize route URL and Zustand currentView without feedback loops
  useEffect(() => {
    const currentPath = location.pathname;
    const prevPath = prevPathRef.current;
    const prevView = prevViewRef.current;

    const urlView: 'dashboard' | 'workspace' | 'gallery' = currentPath.startsWith('/workspace')
      ? 'workspace'
      : currentPath.startsWith('/gallery')
      ? 'gallery'
      : 'dashboard';

    const viewPath =
      currentView === 'workspace'
        ? '/workspace'
        : currentView === 'gallery'
        ? '/gallery'
        : '/';

    if (prevPath === null) {
      // Initial mount: synchronize store to match initial URL if needed
      prevPathRef.current = currentPath;
      prevViewRef.current = urlView;
      if (useStore.getState().currentView !== urlView) {
        setView(urlView);
      }
    } else if (currentPath !== prevPath) {
      // 1. URL changed (Browser back/forward, direct link, or router navigation)
      prevPathRef.current = currentPath;
      prevViewRef.current = urlView;
      if (useStore.getState().currentView !== urlView) {
        setView(urlView);
      }
    } else if (currentView !== prevView) {
      // 2. Store view changed via user action (e.g. setView, loadPreset), but URL hasn't changed yet
      prevViewRef.current = currentView;
      if (currentPath !== viewPath) {
        prevPathRef.current = viewPath;
        navigate(viewPath);
      }
    }
  }, [location.pathname, currentView, navigate, setView]);

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
      <BrowserRouter basename={import.meta.env.BASE_URL}>
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
