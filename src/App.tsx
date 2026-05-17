import React, { useEffect } from 'react';
import { Toaster } from 'sonner';
import { useStore } from './store/useStore';
import { initAuth } from './services/auth';
import { reminderManager } from './services/reminderManager';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';

import { cn } from './utils/utils';

export default function App() {
  const { user, isGuest, theme, authInitialized } = useStore();

  useEffect(() => {
    initAuth();
    reminderManager.start();
    return () => reminderManager.stop();
  }, []);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  if (!authInitialized) {
    return (
      <div className={cn(
        "min-h-screen flex items-center justify-center bg-bg-primary"
      )}>
        <div className="relative">
          <div className="h-20 w-20 rounded-[24px] bg-blue-500 flex items-center justify-center animate-pulse shadow-2xl shadow-blue-500/20">
             <div className="h-10 w-10 border-4 border-white/30 border-t-white rounded-full animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen font-sans transition-colors duration-300 bg-bg-primary text-text-primary">
      {(user || isGuest) ? <Dashboard /> : <LandingPage />}
      <Toaster 
        theme={theme}
        position="bottom-center"
        toastOptions={{
          className: cn(
            'rounded-2xl shadow-2xl border font-sans bg-bg-secondary border-border-primary text-text-primary'
          ),
        }}
      />
    </div>
  );
}
