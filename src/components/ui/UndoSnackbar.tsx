import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RotateCcw, X } from 'lucide-react';
import { useStore } from '../../store/useStore';

const UndoSnackbar = () => {
  const { undoAction, setUndoAction } = useStore();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (undoAction) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => setUndoAction(null), 300);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [undoAction, setUndoAction]);

  const handleUndo = () => {
    if (undoAction) {
      undoAction.action();
      setIsVisible(false);
      setTimeout(() => setUndoAction(null), 300);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(() => setUndoAction(null), 300);
  };

  return (
    <AnimatePresence>
      {isVisible && undoAction && (
        <motion.div
          initial={{ opacity: 0, y: 100, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 100, scale: 0.9 }}
          className="fixed bottom-24 lg:bottom-12 left-1/2 -translate-x-1/2 z-[200] w-full max-w-sm px-4"
        >
          <div className="bg-bg-secondary/80 backdrop-blur-2xl border border-border-primary rounded-2xl p-3 shadow-2xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 ml-2">
              <span className="text-sm font-medium text-text-primary whitespace-nowrap">{undoAction.message}</span>
            </div>
            
            <div className="flex items-center gap-1">
              <button
                onClick={handleUndo}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500 text-white text-xs font-black uppercase tracking-widest hover:bg-blue-600 transition-all active:scale-95"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Undo
              </button>
              <button
                onClick={handleDismiss}
                className="p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-bg-primary transition-all"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default UndoSnackbar;
