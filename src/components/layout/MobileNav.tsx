import React from 'react';
import { motion } from 'motion/react';
import { 
  LayoutGrid, 
  StickyNote, 
  Image as ImageIcon, 
  Bell,
  Sun,
  Moon
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { cn } from '../../utils/utils';

const MobileNav = () => {
  const { activeFilter, setActiveFilter, theme, toggleTheme } = useStore();

  const navItems = [
    { id: 'all', icon: LayoutGrid, label: 'Everything' },
    { id: 'notes', icon: StickyNote, label: 'Notes' },
    { id: 'images', icon: ImageIcon, label: 'Media' },
    { id: 'reminders', icon: Bell, label: 'Soon' },
  ];

  return (
    <div className="fixed bottom-6 left-0 right-0 z-[100] px-4 flex justify-center pointer-events-none">
      <div className="flex items-center gap-3 pointer-events-auto">
        <nav className={cn(
          "flex items-center gap-1 p-2 rounded-[32px] border backdrop-blur-3xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] transition-all duration-500",
          theme === 'dark' 
            ? "bg-neutral-900/90 border-white/10 shadow-black" 
            : "bg-white/90 border-neutral-200/50 shadow-neutral-200/20"
        )}>
          {navItems.map((item) => {
            const isActive = activeFilter === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveFilter(item.id)}
                className="relative p-4 outline-none group"
              >
                {isActive && (
                  <motion.div
                    layoutId="mobile-nav-pill"
                    className="absolute inset-2 bg-blue-500/10 rounded-2xl"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <item.icon className={cn(
                  "h-5 w-5 transition-all duration-300 relative z-10",
                  isActive 
                    ? "text-blue-500 scale-110" 
                    : "text-neutral-500 group-active:scale-90"
                )} />
              </button>
            );
          })}
          
          <div className="w-px h-6 bg-neutral-200 dark:bg-white/10 mx-1" />
          
          <button
            onClick={toggleTheme}
            className={cn(
              "p-4 rounded-2xl transition-all relative overflow-hidden group",
              theme === 'dark' ? "bg-white/5" : "bg-neutral-100"
            )}
          >
            {theme === 'dark' ? (
              <Sun className="h-5 w-5 text-neutral-500 relative z-10" />
            ) : (
              <Moon className="h-5 w-5 text-neutral-500 relative z-10" />
            )}
            <motion.div 
              className="absolute inset-0 bg-blue-500/0 group-active:bg-blue-500/10 transition-colors"
            />
          </button>
        </nav>
      </div>
    </div>
  );
};

export default MobileNav;
