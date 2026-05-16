import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import ClipboardCard from './ClipboardCard';
import { useStore } from '../../store/useStore';
import { 
  Zap, 
  Clock, 
  Inbox, 
  Star,
  Loader2
} from 'lucide-react';

const ClipboardGrid = () => {
  const { clipboardItems, uploadingItems, searchQuery, activeFilter } = useStore();

  const filteredItems = useMemo(() => {
    let items = [...clipboardItems];

    // Filter by type/section
    if (activeFilter === 'all') {
      items = items.filter(item => !item.archived && !item.deleted);
    } else if (activeFilter === 'notes') {
      items = items.filter(item => item.type === 'text' && !item.archived && !item.deleted);
    } else if (activeFilter === 'reminders') {
      items = items.filter(item => !!item.reminder && !item.deleted);
    } else if (activeFilter === 'images') {
      items = items.filter(item => item.type === 'image' && !item.archived && !item.deleted);
    } else if (activeFilter === 'pinned') {
      items = items.filter(item => item.pinned && !item.deleted);
    } else if (activeFilter === 'recent') {
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      items = items.filter(item => {
        const itemDate = item.createdAt?.toDate ? item.createdAt.toDate() : new Date(item.createdAt);
        return itemDate > dayAgo && !item.deleted;
      });
    } else if (activeFilter === 'archived') {
      items = items.filter(item => item.archived && !item.deleted);
    } else if (activeFilter === 'bin') {
      items = items.filter(item => item.deleted);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      items = items.filter(item => 
        item.content?.toLowerCase().includes(query) || 
        item.imageUrl?.toLowerCase().includes(query)
      );
    }

    return items;
  }, [clipboardItems, searchQuery, activeFilter]);

  const pinnedItems = filteredItems.filter(i => i.pinned && !i.deleted);
  const recentItems = filteredItems.filter(i => !i.pinned || activeFilter === 'bin');

  if (filteredItems.length === 0 && uploadingItems.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-32 space-y-6"
      >
        <div className="relative">
           <div className="h-24 w-24 rounded-[32px] bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex items-center justify-center text-neutral-300 dark:text-neutral-700">
             <Inbox className="h-10 w-10" />
           </div>
           <div className="absolute -bottom-2 -right-2 h-10 w-10 rounded-2xl bg-blue-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
             <Zap className="h-6 w-6 text-white" />
           </div>
        </div>
        <div className="text-center">
          <h3 className="text-xl font-bold dark:text-white text-neutral-900 tracking-tight">Vault is empty</h3>
          <p className="text-sm font-medium text-neutral-500 max-w-xs mx-auto mt-2 leading-relaxed">
            Start saving your digital fragments to see them beautifully organized here.
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-12 font-['Poppins']">
      {pinnedItems.length > 0 && activeFilter !== 'bin' && (
        <div className="space-y-6">
           <div className="flex items-center gap-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-500/10 text-orange-500 border border-orange-500/20">
                <Star className="h-3.5 w-3.5 fill-current" />
              </div>
              <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-neutral-400">Pinned</h2>
              <div className="flex-1 h-px bg-neutral-200 dark:bg-neutral-800/50" />
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence mode="popLayout">
                {pinnedItems.map((item) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                  >
                    <ClipboardCard item={item} />
                  </motion.div>
                ))}
              </AnimatePresence>
           </div>
        </div>
      )}

      {(recentItems.length > 0 || uploadingItems.length > 0) && (
        <div className="space-y-6">
           <div className="flex items-center gap-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500 border border-blue-500/20">
                <Clock className="h-3.5 w-3.5" />
              </div>
              <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-neutral-400">
                {activeFilter === 'bin' ? 'Bin Items' : 'Recently Saved'}
              </h2>
              <div className="flex-1 h-px bg-neutral-200 dark:bg-neutral-800/50" />
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence mode="popLayout">
                {uploadingItems.map((item) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-8 dark:bg-neutral-900 bg-white border dark:border-white/5 border-neutral-200 rounded-[28px] flex flex-col items-center justify-center gap-4 opacity-50"
                  >
                    <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500">Syncing...</span>
                  </motion.div>
                ))}
                {recentItems.map((item) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                  >
                    <ClipboardCard item={item} />
                  </motion.div>
                ))}
              </AnimatePresence>
           </div>
        </div>
      )}
    </div>
  );
};

export default ClipboardGrid;
