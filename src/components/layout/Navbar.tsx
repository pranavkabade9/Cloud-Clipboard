import React, { useState, useRef, useEffect, useMemo } from 'react';
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
  StickyNote,
  Sparkles,
  ClipboardPaste
} from 'lucide-react';
import { signOut } from '../../services/auth';
import { handleGlobalPaste } from '../../services/pasteService';
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
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === 'Escape' && isSearchFocused) {
        setIsSearchFocused(false);
        setSearchQuery('');
        searchInputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchFocused, setSearchQuery]);

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % placeholders.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const searchResults = useMemo(() => {
    if (!searchQuery) return [];
    const query = searchQuery.toLowerCase();
    return clipboardItems.filter(item => 
      item.content?.toLowerCase().includes(query) || 
      item.type.toLowerCase().includes(query)
    ).slice(0, 5);
  }, [searchQuery, clipboardItems]);

  const recentItems = clipboardItems.slice(0, 4);
  const pinnedItems = clipboardItems.filter(i => i.pinned).slice(0, 2);

  return (
    <header className="fixed top-0 right-0 left-0 z-40 flex items-center justify-between h-16 sm:h-20 px-3 sm:px-4 lg:px-8 border-b border-border-primary bg-bg-secondary/80 backdrop-blur-3xl font-['Poppins']">
      <div className="flex items-center gap-2 sm:gap-4 lg:w-64">
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className={cn(
            "p-2.5 sm:p-3 rounded-2xl transition-all active:scale-90 border border-border-primary bg-bg-primary text-text-primary hover:border-blue-500/50",
            "shadow-sm backdrop-blur-md"
          )}
        >
          {isSidebarOpen ? <X className="h-4 w-4 sm:h-5 sm:w-5" /> : <Menu className="h-4 w-4 sm:h-5 sm:w-5" />}
        </button>
        
        {(isMobile && !isSidebarOpen) && (
          <div 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="flex items-center gap-2 cursor-pointer group"
          >
            <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-blue-500 flex items-center justify-center shadow-xl shadow-blue-500/30 group-hover:scale-110 transition-transform">
              <Zap className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
            </div>
            <div className="hidden xs:flex flex-col">
              <span className="text-xs sm:text-sm font-black tracking-tighter text-text-primary leading-none">Vault</span>
              <span className="text-[6px] sm:text-[7px] font-black uppercase tracking-[0.2em] text-blue-500">Cloud Clip</span>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 flex justify-center max-w-2xl mx-auto px-2 relative" ref={searchRef}>
        <div className={cn(
          "relative group w-full transition-all duration-300",
          isMobile && !isSearchFocused ? "max-w-[120px]" : "max-w-lg"
        )}>
          <div className="absolute left-0 sm:left-4 top-1/2 -translate-y-1/2 flex items-center justify-center w-11 h-11 pointer-events-none">
            <Search className={cn(
              "h-4 w-4 transition-colors",
              isSearchFocused ? "text-blue-500" : "text-text-secondary"
            )} />
          </div>
          <input 
            ref={searchInputRef}
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            placeholder={isMobile && !isSearchFocused ? "Search..." : placeholders[placeholderIndex]}
            className={cn(
              "w-full h-11 pr-12 rounded-2xl border border-border-primary bg-input-bg text-text-primary placeholder-text-muted/60 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-semibold text-sm",
              isMobile && !isSearchFocused ? "pl-11" : "pl-11"
            )}
          />
          {(searchQuery || isSearchFocused) && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setSearchQuery('');
                setIsSearchFocused(false);
                searchInputRef.current?.blur();
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 rounded-xl hover:bg-bg-primary text-text-secondary transition-all"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          {!searchQuery && !isSearchFocused && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2 hidden md:flex items-center gap-1 opacity-40">
               <Command className="h-3 w-3" />
               <span className="text-[10px] font-black">K</span>
            </div>
          )}
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
                {searchQuery && searchResults.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 px-2 mb-3">
                      <Sparkles className="h-3 w-3 text-blue-500" />
                      <span className="text-[9px] font-black uppercase tracking-widest text-text-secondary">Smart Suggestions</span>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                       {searchResults.map(item => (
                         <button 
                           key={item.id}
                           onClick={() => {
                             setSearchQuery(item.content || '');
                             setIsSearchFocused(false);
                           }}
                           className="flex items-center gap-3 p-3 rounded-2xl bg-bg-primary hover:bg-bg-secondary border border-transparent hover:border-border-primary transition-all text-left group"
                         >
                            <div className={cn(
                              "h-8 w-8 rounded-lg flex items-center justify-center transition-colors",
                              item.type === 'image' ? "bg-purple-500/10 text-purple-500 group-hover:bg-purple-500" : "bg-blue-500/10 text-blue-500 group-hover:bg-blue-500",
                              "group-hover:text-white"
                            )}>
                               {item.type === 'image' ? <ImageIcon className="h-4 w-4" /> : <StickyNote className="h-4 w-4" />}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-text-primary line-clamp-1">{item.content || 'Stored Media'}</span>
                              <span className="text-[8px] font-bold text-text-muted uppercase tracking-wider">{item.type}</span>
                            </div>
                         </button>
                       ))}
                    </div>
                  </div>
                )}

                {!searchQuery && pinnedItems.length > 0 && (
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
        <button 
          onClick={handleGlobalPaste}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white transition-all border border-blue-500/20 shadow-sm group"
          title="Paste from Clipboard"
        >
          <ClipboardPaste className="h-4 w-4 transition-transform group-active:scale-90" />
          <span className="hidden sm:inline text-[10px] font-black uppercase tracking-widest">Paste</span>
        </button>

        <div className="relative">
          <button 
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-[22px] border border-border-primary bg-bg-primary shadow-sm hover:border-blue-500/30 transition-all outline-none",
              isMobile ? "pl-2 pr-1" : "pl-4 pr-1.5"
            )}
          >
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
