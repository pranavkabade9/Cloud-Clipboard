import React, { useState } from 'react';
import { Search, Bell, User, LogOut, Moon, Sun, Database, Settings, Globe, Command } from 'lucide-react';
import { signOut } from '../../services/auth';
import { useStore } from '../../store/useStore';
import { formatBytes, cn } from '../../utils/utils';
import SettingsDropdown from './SettingsDropdown';

const Navbar = () => {
  const { user, userProfile, isGuest, storageLimit, theme, toggleTheme, searchQuery, setSearchQuery } = useStore();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const storageUsed = userProfile?.storageUsed || 0;
  const storagePercentage = (storageUsed / storageLimit) * 100;

  return (
    <header className="fixed top-0 right-0 left-0 z-40 flex items-center justify-between h-20 px-4 lg:px-8 border-b dark:border-white/5 border-neutral-200 dark:bg-neutral-950/80 bg-white/80 backdrop-blur-3xl font-['Poppins']">
      <div className="hidden lg:flex w-64">
        {/* Placeholder for balance */}
      </div>

      <div className="flex-1 flex justify-center max-w-2xl mx-auto px-2 lg:px-4">
        <div className="relative group w-full max-w-lg">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none">
            <Search className="h-4 w-4 text-neutral-400 group-focus-within:text-blue-500 transition-colors" />
          </div>
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search фрагменты..."
            className="w-full h-11 pl-11 pr-6 rounded-2xl border dark:border-white/5 border-neutral-200 dark:bg-white/5 bg-neutral-100/30 text-neutral-900 dark:text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:focus:bg-white/10 transition-all font-semibold text-sm"
          />
        </div>
      </div>

      <div className="hidden lg:flex items-center gap-6 w-64 justify-end">
        {isGuest && (
          <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20">
             <Globe className="h-3 w-3 text-blue-500" />
             <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest leading-none">Local Mode</span>
          </div>
        )}

        <div className="flex items-center gap-4">
          <button className="relative p-2.5 rounded-xl border dark:border-white/5 border-neutral-200 dark:bg-white/5 bg-neutral-50/50 dark:text-neutral-400 text-neutral-500 hover:text-blue-500 transition-all active:scale-95">
            <Bell className="h-5 w-5" />
            <span className="absolute top-2.5 right-2.5 h-2 w-2 bg-blue-500 rounded-full ring-2 ring-white dark:ring-neutral-900" />
          </button>
          
          <div className="relative">
            <button 
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              className="flex items-center gap-3 p-1 rounded-2xl border dark:border-white/5 border-neutral-200 dark:bg-white/[0.02] bg-white shadow-sm hover:border-blue-500/30 transition-all outline-none"
            >
              <div className="flex flex-col items-end px-2">
                 <span className="text-xs font-bold dark:text-white text-neutral-900 leading-none mb-1">
                   {user?.displayName || "Guest Explorer"}
                 </span>
                 <span className="text-[8px] font-black text-neutral-500 uppercase tracking-widest leading-none">
                   {isGuest ? "Free Mode" : "Sync Premium"}
                 </span>
              </div>
              {user?.photoURL ? (
                <img src={user.photoURL} className="h-9 w-9 rounded-xl object-cover" alt="Profile" />
              ) : (
                <div className="h-9 w-9 flex items-center justify-center bg-neutral-100 dark:bg-neutral-800 text-neutral-400 rounded-xl">
                  <User className="h-4 w-4" />
                </div>
              )}
            </button>
            <SettingsDropdown isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
