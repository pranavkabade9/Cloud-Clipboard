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
  ];

  return (
    <div className="fixed bottom-6 left-0 right-0 z-[100] px-4 flex justify-center pointer-events-none">
      <div className="flex items-center gap-3 pointer-events-auto">
        <nav className="flex items-center gap-1 p-2 rounded-[32px] border border-border-primary bg-bg-secondary/90 backdrop-blur-3xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] transition-all duration-500">
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
                    : "text-text-secondary group-active:scale-90"
                )} />
              </button>
            );
          })}
          
          <div className="w-px h-6 bg-border-primary mx-1" />
          
          <button
            onClick={toggleTheme}
            className="p-4 rounded-2xl transition-all relative overflow-hidden group bg-bg-primary border border-border-primary/50"
          >
            {theme === 'dark' ? (
              <Sun className="h-5 w-5 text-text-secondary relative z-10" />
            ) : (
              <Moon className="h-5 w-5 text-text-secondary relative z-10" />
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
