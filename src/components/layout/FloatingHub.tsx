import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus,
  StickyNote,
  Image as ImageIcon,
  Zap,
  Settings,
  LogOut,
  Clipboard,
  X,
  Loader2
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { cn } from '../../utils/utils';
import { signOut } from '../../services/auth';
import { toast } from 'sonner';
import { handleGlobalPaste } from '../../services/pasteService';

const FloatingHub = () => {
  const {
    user,
    isGuest,
    theme,
    setIsNoteEditorOpen,
    isMobile
  } = useStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isPasting, setIsPasting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePaste = async () => {
    if (isPasting) return;
    setIsPasting(true);
    await handleGlobalPaste();
    setIsPasting(false);
    setIsOpen(false);
  };

  useEffect(() => {
    const handleMobilePaste = () => handlePaste();
    window.addEventListener('clipboard-paste-mobile', handleMobilePaste);
    return () => window.removeEventListener('clipboard-paste-mobile', handleMobilePaste);
  }, [user, isGuest]);

  const actions = [
    {
      id: 'paste',
      icon: isPasting ? Loader2 : Clipboard,
      label: 'Paste Now',
      color: 'bg-green-500',
      desc: isMobile ? 'Cloud Sync Paste' : 'Desktop Link',
      mobileOnly: true,
      action: handlePaste
    },
    {
      id: 'note',
      icon: StickyNote,
      label: 'New Snippet',
      color: 'bg-blue-500',
      desc: 'Instant text fragment',
      action: () => {
        setIsNoteEditorOpen(true);
        setIsOpen(false);
      }
    },
    {
      id: 'upload',
      icon: ImageIcon,
      label: 'Upload Image',
      color: 'bg-indigo-500',
      desc: 'Capture reference',
      action: () => {
        fileInputRef.current?.click();
        setIsOpen(false);
      }
    },
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      import('../../services/uploadService').then(({ handleImageUpload }) => {
        handleImageUpload({
          file,
          userId: user?.uid,
          isGuest
        });
      });
    }
  };

  return (
    <div className={cn(
      "fixed z-[120] font-['Poppins']",
      isMobile ? "bottom-24 right-6" : "bottom-8 right-8"
    )}>
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        onChange={handleFileChange}
      />

      {/* Dock Background - if we want it attached, but user said "dock-style" */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-neutral-950/20 backdrop-blur-[2px] z-[-1]"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 10, x: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10, x: 10 }}
              className="absolute bottom-20 right-0 w-64 rounded-[32px] border border-border-primary p-4 shadow-2xl backdrop-blur-3xl overflow-hidden bg-bg-secondary/90"
            >
              <div className="flex flex-col gap-1">
                <div className="px-3 py-2 mb-2 border-b border-border-primary/50">
                  <span className="text-[9px] font-black uppercase tracking-[0.3em] text-text-secondary/60">Quick Actions</span>
                </div>

                {actions.map((action) => (
                  <button
                    key={action.id}
                    onClick={action.action}
                    className="group flex items-center gap-3 p-3 rounded-2xl hover:bg-neutral-100 dark:hover:bg-white/5 transition-all text-left"
                  >
                    <div className={cn(
                      "h-10 w-10 rounded-xl flex items-center justify-center text-white shadow-lg transition-transform group-hover:scale-110",
                      action.color
                    )}>
                      <action.icon className="h-5 w-5" />
                    </div>
                    <div className="flex flex-col overflow-hidden">
                      <span className="text-xs font-bold text-text-primary truncate">{action.label}</span>
                      <span className="text-[9px] font-medium text-text-secondary truncate">{action.desc}</span>
                    </div>
                  </button>
                ))}

                {!isGuest && (
                  <button
                  onClick={() => signOut()}
                  className="mt-2 flex items-center gap-3 p-3 rounded-2xl text-red-500 hover:bg-red-500/10 transition-all text-left group"
                  >
                    <div className="h-10 w-10 rounded-xl bg-red-500/10 flex items-center justify-center transition-transform group-hover:scale-110">
                      <LogOut className="h-5 w-5" />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-tight">Logout</span>
                  </button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Lightning Trigger Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "relative h-14 w-14 rounded-2xl flex items-center justify-center shadow-2xl transition-all duration-300",
          isOpen ? "bg-red-500 ring-4 ring-red-500/20" : "bg-blue-600 ring-4 ring-blue-500/20 shadow-blue-600/40"
        )}
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
            >
              <X className="h-6 w-6 text-white" />
            </motion.div>
          ) : (
            <motion.div
              key="zap"
              initial={{ scale: 0.8, opacity: 0, rotate: -10 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              exit={{ scale: 0.8, opacity: 0, rotate: 10 }}
            >
              <Zap className="h-6 w-6 text-white fill-current" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Subtle Glow */}
        {!isOpen && (
           <div className="absolute inset-0 rounded-2xl bg-blue-400/20 blur-xl animate-pulse -z-10" />
        )}
      </motion.button>
    </div>
  );
};

export default FloatingHub;
