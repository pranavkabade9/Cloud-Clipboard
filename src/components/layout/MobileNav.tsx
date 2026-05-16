import React from 'react';
import { motion } from 'motion/react';
import { 
  LayoutGrid, 
  StickyNote, 
  Image as ImageIcon, 
  Archive, 
  Trash2 
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { cn } from '../../utils/utils';

const MobileNav = () => {
  const { activeFilter, setActiveFilter, theme } = useStore();

  const navItems = [
    { id: 'all', icon: LayoutGrid, label: 'All' },
    { id: 'notes', icon: StickyNote, label: 'Notes' },
    { id: 'images', icon: ImageIcon, label: 'Media' },
    { id: 'archived', icon: Archive, label: 'Archive' },
    { id: 'bin', icon: Trash2, label: 'Bin' },
  ];

  return (
    <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] w-[92%] max-w-sm px-2">
      <nav className={cn(
        "flex items-center justify-around p-2.5 rounded-[32px] border backdrop-blur-3xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] transition-all duration-500",
        theme === 'dark' 
          ? "bg-neutral-900/90 border-white/5 shadow-black/80" 
          : "bg-white/90 border-neutral-200/50 shadow-neutral-200/50"
      )}>
        {navItems.map((item) => {
          const isActive = activeFilter === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveFilter(item.id)}
              className="relative p-4 outline-none group flex flex-col items-center gap-1"
            >
              {isActive && (
                <motion.div
                  layoutId="mobile-nav-pill"
                  className="absolute inset-x-2 inset-y-1 bg-blue-500/10 rounded-2xl"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <item.icon className={cn(
                "h-5 w-5 transition-all duration-300 relative z-10",
                isActive 
                  ? "text-blue-500 scale-125" 
                  : "text-neutral-500 group-active:scale-90"
              )} />
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default MobileNav;
