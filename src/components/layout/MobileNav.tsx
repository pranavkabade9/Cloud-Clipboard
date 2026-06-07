import React, { useCallback } from 'react';
import { motion } from 'motion/react';
import {
  LayoutGrid,
  StickyNote,
  Search,
  Archive,
  Settings
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { cn } from '../../utils/utils';
import SettingsDropdown from './SettingsDropdown';
import { useModal } from '../ui/ModalProvider';

const MobileNav = () => {
  const { activeFilter, setActiveFilter, setIsManageDataOpen } = useStore();
  const { openModal } = useModal();

  const openSearch = useCallback(() => {
    window.dispatchEvent(new CustomEvent('cloudclip-open-search'));
  }, []);

  const openSettings = useCallback(() => {
    setIsManageDataOpen(false);
    openModal({
      id: 'mobile-settings',
      title: 'Settings',
      size: 'sm',
      hideCloseButton: true,
      contentClassName: 'max-h-[min(820px,calc(100dvh-24px))]',
      content: ({ close }) => <SettingsDropdown onClose={close} />,
      onClose: () => useStore.getState().setIsManageDataOpen(false)
    });
  }, [openModal, setIsManageDataOpen]);

  const navItems = [
    { id: 'all', icon: LayoutGrid, label: 'Everything', action: () => setActiveFilter('all'), active: activeFilter === 'all' },
    { id: 'notes', icon: StickyNote, label: 'Notes', action: () => setActiveFilter('notes'), active: activeFilter === 'notes' },
    { id: 'search', icon: Search, label: 'Search', action: openSearch, active: false },
    { id: 'archived', icon: Archive, label: 'Archive', action: () => setActiveFilter('archived'), active: activeFilter === 'archived' },
    { id: 'settings', icon: Settings, label: 'Settings', action: openSettings, active: false },
  ];

  return (
    <div className="fixed inset-x-0 bottom-0 z-[120] px-3 pb-[calc(env(safe-area-inset-bottom)+10px)] pt-3 pointer-events-none lg:hidden">
      <nav className="mx-auto grid max-w-md grid-cols-5 gap-1 rounded-[28px] border border-border-primary bg-bg-secondary/95 p-1.5 shadow-[0_20px_60px_rgba(0,0,0,0.28)] backdrop-blur-3xl pointer-events-auto">
        {navItems.map((item) => {
          const isActive = item.active;
          return (
            <button
              key={item.id}
              onClick={item.action}
              className="relative flex min-h-[56px] min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-1 outline-none transition-all active:scale-95"
              aria-label={item.label}
            >
              {isActive && (
                <motion.div
                  layoutId="mobile-nav-pill"
                  className="absolute inset-1 rounded-2xl bg-blue-500/12"
                  transition={{ type: 'spring', bounce: 0.18, duration: 0.45 }}
                />
              )}
              <item.icon className={cn('relative z-10 h-5 w-5 transition-colors', isActive ? 'text-blue-500' : 'text-text-secondary')} />
              <span className={cn('relative z-10 truncate text-[9px] font-black uppercase tracking-tight', isActive ? 'text-blue-500' : 'text-text-muted')}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default MobileNav;
