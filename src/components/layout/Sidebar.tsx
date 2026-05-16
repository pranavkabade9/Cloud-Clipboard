import React from 'react';
import { motion } from 'motion/react';
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
      "h-5 w-5 transition-transform duration-300 group-hover:scale-110",
      activeFilter === item.id && "scale-110"
    )} />
    {isOpen && (
      <motion.span 
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        className="font-bold text-sm tracking-tight"
      >
        {item.label}
      </motion.span>
    )}
    {activeFilter === item.id && (
      <motion.div 
        layoutId="active-pill"
        className="absolute left-0 w-1 h-6 bg-blue-500 rounded-r-full"
      />
    )}
  </button>
);

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

const Sidebar = ({ isOpen, setIsOpen }: SidebarProps) => {
  const { activeFilter, setActiveFilter, userProfile, storageLimit } = useStore();

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
      animate={{ width: isOpen ? 280 : 88 }}
      className="relative z-50 flex flex-col h-screen border-r dark:border-white/5 border-neutral-200 dark:bg-neutral-950 bg-white font-['Poppins']"
    >
      <div className="flex items-center h-20 px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500 shadow-xl shadow-blue-500/20 rotate-3">
            <Zap className="h-6 w-6 text-white" />
          </div>
          {isOpen && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="ml-2">
              <span className="text-xl font-black tracking-tighter dark:text-white text-neutral-900 block leading-tight">Vault</span>
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
              isOpen={isOpen} 
            />
          ))}
        </div>

        <div className="space-y-3">
          {isOpen && (
            <div className="px-4">
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-neutral-400/60">Organization</span>
            </div>
          )}
          <div className="space-y-1">
            {secondaryItems.map(item => (
              <NavButton 
                key={item.id} 
                item={item} 
                activeFilter={activeFilter} 
                setActiveFilter={setActiveFilter} 
                isOpen={isOpen} 
              />
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {isOpen && (
            <div className="px-4">
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-neutral-400/60">Cleanup</span>
            </div>
          )}
          <div className="space-y-1">
            {managementItems.map(item => (
              <NavButton 
                key={item.id} 
                item={item} 
                activeFilter={activeFilter} 
                setActiveFilter={setActiveFilter} 
                isOpen={isOpen} 
              />
            ))}
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6 mt-auto">
        {isOpen && (
          <div className="p-5 rounded-3xl bg-neutral-50 dark:bg-white/[0.02] border dark:border-white/5 border-neutral-100">
            <div className="flex items-center justify-between mb-3 text-neutral-500">
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

        <div className="flex items-center justify-between">
           <button onClick={() => setIsOpen(!isOpen)} className="p-3.5 rounded-2xl hover:bg-neutral-100 dark:hover:bg-white/5 text-neutral-400 hover:text-blue-500 transition-all border border-transparent hover:border-neutral-200 dark:hover:border-white/5">
             <ChevronLeft className={cn("h-5 w-5 transition-transform duration-500", !isOpen && "rotate-180")} />
           </button>
           
           <button className="p-3.5 rounded-2xl hover:bg-neutral-100 dark:hover:bg-white/5 text-neutral-400 hover:text-blue-500 transition-all border border-transparent hover:border-neutral-200 dark:hover:border-white/5">
             <Settings className="h-5 w-5" />
           </button>
        </div>
      </div>
    </motion.aside>
  );
};

export default Sidebar;
