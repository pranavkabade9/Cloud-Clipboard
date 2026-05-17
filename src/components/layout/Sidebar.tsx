import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutGrid, 
  Type, 
  Bell, 
  Image as ImageIcon, 
  Star, 
  Clock, 
  Archive, 
  Trash2, 
  ChevronLeft,
  Settings,
  HardDrive,
  Zap,
  StickyNote
} from 'lucide-react';
import { cn } from '../../utils/utils';
import { useStore } from '../../store/useStore';

const NavButton = ({ item, activeFilter, setActiveFilter, isOpen }: any) => (
  <button
    onClick={() => setActiveFilter(item.id)}
    className={cn(
      "group relative flex items-center w-full gap-3 px-4 py-3 rounded-2xl transition-all duration-300",
      activeFilter === item.id 
        ? "dark:bg-blue-500/10 bg-blue-50 text-blue-600 dark:text-blue-400 shadow-sm" 
        : "text-neutral-500 hover:bg-neutral-100 dark:hover:bg-white/[0.03] hover:text-neutral-900 dark:hover:text-neutral-300"
    )}
  >
    <item.icon className={cn(
      "h-5 w-5 transition-transform duration-300 group-hover:scale-110 shrink-0",
      activeFilter === item.id && "scale-110"
    )} />
    
    {!isOpen && (
      <div className="absolute left-full ml-4 px-3 py-1.5 rounded-lg bg-neutral-900 text-white text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-[100] shadow-xl border border-white/10">
        {item.label}
        <div className="absolute top-1/2 -left-1 -translate-y-1/2 border-4 border-transparent border-r-neutral-900" />
      </div>
    )}

    <AnimatePresence>
      {isOpen && (
        <motion.span 
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          className="font-bold text-sm tracking-tight whitespace-nowrap"
        >
          {item.label}
        </motion.span>
      )}
    </AnimatePresence>

    {activeFilter === item.id && (
      <motion.div 
        layoutId="active-pill"
        className="absolute left-0 w-1 h-6 bg-blue-500 rounded-r-full"
      />
    )}
  </button>
);

interface SidebarProps {
  // Props removed in favor of global store
}

const Sidebar = () => {
  const { activeFilter, setActiveFilter, userProfile, storageLimit, isSidebarOpen, setIsSidebarOpen } = useStore();

  const primaryItems = [
    { id: 'all', icon: LayoutGrid, label: 'Everything' },
    { id: 'notes', icon: StickyNote, label: 'Notes' },
    { id: 'reminders', icon: Bell, label: 'Reminders' },
    { id: 'images', icon: ImageIcon, label: 'Media Vault' },
  ];

  const secondaryItems = [
    { id: 'pinned', icon: Star, label: 'Pinned Clips' },
    { id: 'recent', icon: Clock, label: 'Recently Saved' },
  ];

  const managementItems = [
    { id: 'archived', icon: Archive, label: 'Archive' },
    { id: 'bin', icon: Trash2, label: 'Bin' },
  ];

  const storagePercentage = userProfile ? (userProfile.storageUsed / storageLimit) * 100 : 0;

  return (
    <motion.aside
      initial={false}
      animate={{ width: isSidebarOpen ? 280 : 88 }}
      className="relative z-50 flex flex-col h-screen border-r border-border-primary bg-bg-secondary font-['Poppins']"
    >
      <div 
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="flex items-center h-20 px-6 cursor-pointer group"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500 shadow-xl shadow-blue-500/20 rotate-3 group-hover:rotate-6 transition-transform">
            <Zap className="h-6 w-6 text-white" />
          </div>
          {isSidebarOpen && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }} 
              animate={{ opacity: 1, x: 0 }} 
              className="ml-2"
            >
              <span className="text-xl font-black tracking-tighter text-text-primary block leading-tight">Vault</span>
              <span className="text-[8px] font-black uppercase tracking-[0.4em] text-blue-500 block">Cloud Clip</span>
            </motion.div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-8 space-y-8 custom-scrollbar">
        <div className="space-y-1">
          {primaryItems.map(item => (
            <NavButton 
              key={item.id} 
              item={item} 
              activeFilter={activeFilter} 
              setActiveFilter={setActiveFilter} 
              isOpen={isSidebarOpen} 
            />
          ))}
        </div>

        <div className="space-y-3">
          {isSidebarOpen && (
            <div className="px-4">
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-text-secondary/60">Organization</span>
            </div>
          )}
          <div className="space-y-1">
            {secondaryItems.map(item => (
              <NavButton 
                key={item.id} 
                item={item} 
                activeFilter={activeFilter} 
                setActiveFilter={setActiveFilter} 
                isOpen={isSidebarOpen} 
              />
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {isSidebarOpen && (
            <div className="px-4">
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-text-secondary/60">Cleanup</span>
            </div>
          )}
          <div className="space-y-1">
            {managementItems.map(item => (
              <NavButton 
                key={item.id} 
                item={item} 
                activeFilter={activeFilter} 
                setActiveFilter={setActiveFilter} 
                isOpen={isSidebarOpen} 
              />
            ))}
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6 mt-auto">
        {isSidebarOpen && (
          <div className="p-5 rounded-3xl bg-bg-primary border border-border-primary">
            <div className="flex items-center justify-between mb-3 text-text-secondary">
               <div className="flex items-center gap-2">
                  <HardDrive className="h-3.5 w-3.5" />
                  <span className="text-[9px] font-black uppercase tracking-widest">Digital Weight</span>
               </div>
               <span className="text-[9px] font-bold">{Math.round(storagePercentage)}%</span>
            </div>
            <div className="h-1.5 w-full bg-neutral-200 dark:bg-white/5 rounded-full overflow-hidden">
               <motion.div 
                 initial={{ width: 0 }}
                 animate={{ width: `${Math.min(100, storagePercentage)}%` }} 
                 className={cn(
                   "h-full transition-all duration-1000", 
                   storagePercentage > 90 ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" : 
                   storagePercentage > 70 ? "bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]" : 
                   "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"
                 )} 
               />
            </div>
          </div>
        )}

        <div className="flex items-center gap-3">
           <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
            className="flex-1 flex items-center justify-center p-3.5 rounded-2xl bg-bg-primary border border-border-primary hover:border-blue-500/30 text-text-secondary hover:text-blue-500 transition-all group overflow-hidden relative shadow-sm"
           >
             <ChevronLeft className={cn("h-5 w-5 transition-transform duration-500 relative z-10", !isSidebarOpen && "rotate-180")} />
             <div className="absolute inset-0 bg-blue-500/0 group-hover:bg-blue-500/[0.03] transition-colors" />
           </button>
           
           <button 
            className="flex-1 flex items-center justify-center p-3.5 rounded-2xl bg-bg-primary border border-border-primary hover:border-blue-500/30 text-text-secondary hover:text-blue-500 transition-all group overflow-hidden relative shadow-sm"
           >
             <Settings className="h-5 w-5 relative z-10 transition-transform group-hover:rotate-45" />
             <div className="absolute inset-0 bg-blue-500/0 group-hover:bg-blue-500/[0.03] transition-colors" />
           </button>
        </div>
      </div>
    </motion.aside>
  );
};

export default Sidebar;
