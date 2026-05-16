import React, { useEffect } from 'react';
import { Toaster } from 'sonner';
import { useStore } from './store/useStore';
import { initAuth } from './services/auth';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';

import { cn } from './utils/utils';

export default function App() {
  const { user, isGuest, theme } = useStore();

  useEffect(() => {
    initAuth();
  }, []);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  return (
    <div className={`min-h-screen font-sans transition-colors duration-300 ${theme === 'dark' ? 'bg-neutral-950 text-neutral-100' : 'bg-neutral-50 text-neutral-900'}`}>
      {(user || isGuest) ? <Dashboard /> : <LandingPage />}
      <Toaster 
        theme={theme}
        position="bottom-center"
        toastOptions={{
          className: cn(
            'rounded-2xl shadow-2xl border font-sans',
            theme === 'dark' 
              ? 'bg-neutral-900 border-neutral-800 text-neutral-100' 
              : 'bg-white border-neutral-200 text-neutral-900'
          ),
        }}
      />
    </div>
  );
}
