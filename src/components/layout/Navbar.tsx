import React, { useState, useRef, useEffect } from 'react';
import { 
  RotateCw,
  Search, 
  Bell, 
  User, 
  LogOut, 
  Moon, 
  Sun, 
  Database, 
  Settings, 
  Globe, 
  Command,
  Menu,
  X,
  Clock,
  Star,
  Zap,
  Image as ImageIcon,
  StickyNote
} from 'lucide-react';
import { signOut } from '../../services/auth';
import { useStore } from '../../store/useStore';
import { formatBytes, cn } from '../../utils/utils';
import SettingsDropdown from './SettingsDropdown';
import { motion, AnimatePresence } from 'motion/react';

const Navbar = () => {
  const { 
    user, 
    userProfile, 
    isGuest, 
    storageLimit, 
    theme, 
    toggleTheme, 
    searchQuery, 
    setSearchQuery,
    isSidebarOpen,
    setIsSidebarOpen,
    isMobile,
    clipboardItems,
    setActiveFilter,
    isSettingsOpen,
    setIsSettingsOpen
  } = useStore();
  
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  
  const storageUsed = userProfile?.storageUsed || 0;
  const storagePercentage = (storageUsed / storageLimit) * 100;

  const placeholders = [
    "Search clips, notes, snippets...",
    "Find your screenshots...",
    "Search everything...",
    "Paste or search instantly..."
  ];
  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % placeholders.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const recentItems = clipboardItems.slice(0, 4);
  const pinnedItems = clipboardItems.filter(i => i.pinned).slice(0, 2);

  return (
    <header className="fixed top-0 right-0 left-0 z-40 flex items-center justify-between h-20 px-4 lg:px-8 border-b border-border-primary bg-bg-secondary/80 backdrop-blur-3xl font-['Poppins']">
      <div className="flex items-center gap-4 lg:w-64">
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className={cn(
            "p-3 rounded-2xl transition-all active:scale-90 border border-border-primary bg-bg-primary text-text-primary hover:border-blue-500/50",
            "shadow-sm backdrop-blur-md"
          )}
        >
          {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
        
        {!isSidebarOpen && !isMobile && (
          <div 
            onClick={() => setIsSidebarOpen(true)}
            className="flex items-center gap-2 cursor-pointer group"
          >
            <div className="h-10 w-10 rounded-xl bg-blue-500 flex items-center justify-center shadow-xl shadow-blue-500/30 group-hover:scale-110 transition-transform">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-black tracking-tighter text-text-primary leading-none">Vault</span>
              <span className="text-[7px] font-black uppercase tracking-[0.2em] text-blue-500">Cloud Clip</span>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 flex justify-center max-w-2xl mx-auto px-2 lg:px-4 relative" ref={searchRef}>
        <div className="relative group w-full max-w-lg">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none">
            <Search className={cn(
              "h-4 w-4 transition-colors",
              isSearchFocused ? "text-blue-500" : "text-text-secondary"
            )} />
          </div>
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            placeholder={placeholders[placeholderIndex]}
            className="w-full h-11 pl-11 pr-12 rounded-2xl border border-border-primary bg-input-bg text-text-primary placeholder-text-muted/60 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-semibold text-sm"
          />
          <div className="absolute right-4 top-1/2 -translate-y-1/2 hidden md:flex items-center gap-1 opacity-40">
             <Command className="h-3 w-3" />
             <span className="text-[10px] font-black">K</span>
          </div>
        </div>

        <AnimatePresence>
          {isSearchFocused && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute top-full left-0 right-0 mt-2 p-4 rounded-[32px] border border-border-primary bg-bg-secondary shadow-2xl backdrop-blur-3xl z-[100] max-h-[480px] overflow-y-auto custom-scrollbar"
            >
              <div className="space-y-6">
                {pinnedItems.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 px-2 mb-3">
                      <Star className="h-3 w-3 text-orange-500 fill-current" />
                      <span className="text-[9px] font-black uppercase tracking-widest text-text-secondary">Pinned Highlights</span>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                       {pinnedItems.map(item => (
                         <button 
                           key={item.id}
                           onClick={() => {
                             setSearchQuery(item.content || '');
                             setIsSearchFocused(false);
                           }}
                           className="flex items-center gap-3 p-3 rounded-2xl bg-bg-primary hover:border-border-hover border border-transparent transition-all text-left"
                         >
                            <div className="h-8 w-8 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-500">
                               {item.type === 'image' ? <ImageIcon className="h-4 w-4" /> : <StickyNote className="h-4 w-4" />}
                            </div>
                            <span className="text-xs font-bold text-text-primary line-clamp-1">{item.content || 'Image Clip'}</span>
                         </button>
                       ))}
                    </div>
                  </div>
                )}

                <div>
                  <div className="flex items-center gap-2 px-2 mb-3">
                    <Clock className="h-3 w-3 text-blue-500" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-text-secondary">Recently Saved</span>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                     {recentItems.map(item => (
                       <button 
                         key={item.id}
                         onClick={() => {
                           setSearchQuery(item.content || '');
                           setIsSearchFocused(false);
                         }}
                         className="flex items-center gap-3 p-3 rounded-2xl bg-bg-primary hover:border-border-hover border border-transparent transition-all text-left"
                       >
                          <div className={cn(
                            "h-8 w-8 rounded-lg flex items-center justify-center",
                            item.type === 'image' ? "bg-purple-500/10 text-purple-500" : "bg-blue-500/10 text-blue-500"
                          )}>
                             {item.type === 'image' ? <ImageIcon className="h-4 w-4" /> : <StickyNote className="h-4 w-4" />}
                          </div>
                          <span className="text-xs font-medium text-text-primary line-clamp-1">{item.content || 'Stored Media'}</span>
                       </button>
                     ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-4">
                   <button 
                    onClick={() => { setActiveFilter('notes'); setIsSearchFocused(false); }}
                    className="flex items-center gap-2 p-3 rounded-xl bg-blue-500/10 text-blue-500 font-bold text-[10px] uppercase tracking-widest hover:bg-blue-500 hover:text-white transition-all"
                   >
                      <StickyNote className="h-3.5 w-3.5" />
                      Browse Notes
                   </button>
                   <button 
                    onClick={() => { setActiveFilter('images'); setIsSearchFocused(false); }}
                    className="flex items-center gap-2 p-3 rounded-xl bg-purple-500/10 text-purple-500 font-bold text-[10px] uppercase tracking-widest hover:bg-purple-500 hover:text-white transition-all"
                   >
                      <ImageIcon className="h-3.5 w-3.5" />
                      Media Gallery
                   </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex items-center gap-2 lg:w-80 justify-end">
        {!isMobile && (
          <button 
            className="p-2.5 rounded-[18px] border border-border-primary bg-bg-primary text-text-secondary hover:text-blue-500 transition-all shadow-sm active:scale-95"
            title="Notifications"
          >
            <Bell className="h-5 w-5" />
            <div className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-blue-500 border-2 border-bg-primary" />
          </button>
        )}

        <div className="relative">
          <button 
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-[22px] border border-border-primary bg-bg-primary shadow-sm hover:border-blue-500/30 transition-all outline-none",
              isMobile ? "pl-2 pr-1" : "pl-4 pr-1.5"
            )}
          >
            {isMobile && (
              <Bell className="h-4 w-4 text-text-secondary mr-1" />
            )}
            
            <div className="flex items-center gap-3 pr-1">
               <span className={cn(
                 "text-sm font-bold text-text-primary leading-none truncate max-w-[120px] sm:max-w-[200px]",
                 isMobile && "text-[12px]"
               )}>
                 {user?.displayName || "Guest User"}
               </span>
            </div>
            {user?.photoURL ? (
              <img 
                src={user.photoURL} 
                className={cn(
                  "rounded-[14px] object-cover border border-border-primary/50",
                  isMobile ? "h-8 w-8" : "h-10 w-10"
                )} 
                alt="Profile" 
              />
            ) : (
              <div className={cn(
                "flex items-center justify-center bg-bg-secondary text-text-secondary rounded-[14px] border border-border-primary/50",
                isMobile ? "h-8 w-8" : "h-10 w-10"
              )}>
                <User className="h-4 w-4" />
              </div>
            )}
          </button>
          <SettingsDropdown isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
        </div>
      </div>

      {/* Click outside search to close */}
      {isSearchFocused && (
        <div 
          className="fixed inset-0 -z-10" 
          onClick={() => setIsSearchFocused(false)} 
        />
      )}
    </header>
  );
};

export default Navbar;
