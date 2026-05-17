import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Save, 
  Trash2, 
  Clock, 
  Maximize2, 
  Minimize2,
  CheckSquare,
  List,
  Type,
  Bold,
  Italic,
  ChevronLeft
} from 'lucide-react';
import { cn } from '../../utils/utils';

interface NoteEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (content: string) => void;
  initialContent?: string;
  noteId?: string;
}

const NoteEditor = ({ isOpen, onClose, onSave, initialContent = '', noteId }: NoteEditorProps) => {
  const [content, setContent] = useState(initialContent);
  const [isMaximized, setIsMaximized] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  useEffect(() => {
    setContent(initialContent);
  }, [initialContent]);

  const handleSave = () => {
    if (!content.trim()) return;
    onSave(content);
    setLastSaved(new Date());
  };

  // Auto-save logic
  useEffect(() => {
    const timer = setTimeout(() => {
      if (content !== initialContent && content.trim()) {
        handleSave();
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [content]);

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 20 }}
      className={cn(
        "fixed z-[100] dark:bg-neutral-900 bg-white border border-border-primary shadow-2xl transition-all duration-500 font-['Poppins']",
        isMaximized 
          ? "inset-4 rounded-[40px]" 
          : "bottom-8 right-8 w-full max-w-2xl h-[600px] rounded-[32px]"
      )}
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border-primary">
          <div className="flex items-center gap-4">
            <button 
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-white/5 text-text-secondary transition-all"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div>
              <h3 className="text-sm font-bold text-text-primary">Journaling Fragment</h3>
              <div className="flex items-center gap-2 mt-0.5">
                <Clock className="h-3 w-3 text-text-secondary" />
                <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">
                  {lastSaved ? `Saved at ${lastSaved.toLocaleTimeString()}` : 'Unsaved draft'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsMaximized(!isMaximized)}
              className="p-2.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-white/5 text-text-secondary transition-all"
            >
              {isMaximized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
            <button 
              onClick={handleSave}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold transition-all shadow-lg shadow-blue-500/20"
            >
              <Save className="h-3.5 w-3.5" />
              Save
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-1 p-3 px-6 border-b border-border-primary bg-neutral-50 dark:bg-white/[0.01]">
           <button className="p-2 rounded-lg hover:bg-neutral-200 dark:hover:bg-white/5 text-text-secondary transition-all">
             <Bold className="h-4 w-4" />
           </button>
           <button className="p-2 rounded-lg hover:bg-neutral-200 dark:hover:bg-white/5 text-text-secondary transition-all">
             <Italic className="h-4 w-4" />
           </button>
           <div className="w-px h-4 bg-border-primary mx-2" />
           <button className="p-2 rounded-lg hover:bg-neutral-200 dark:hover:bg-white/5 text-text-secondary transition-all">
             <CheckSquare className="h-4 w-4" />
           </button>
           <button className="p-2 rounded-lg hover:bg-neutral-200 dark:hover:bg-white/5 text-text-secondary transition-all">
             <List className="h-4 w-4" />
           </button>
           <div className="w-px h-4 bg-border-primary mx-2" />
           <button className="p-2 rounded-lg hover:bg-neutral-200 dark:hover:bg-white/5 text-text-secondary transition-all">
             <Type className="h-4 w-4" />
           </button>
        </div>

        {/* Editor Area */}
        <div className="flex-1 p-8 overflow-y-auto">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What's on your mind? Start writing fragments..."
            className="w-full h-full bg-transparent border-none focus:ring-0 resize-none text-text-primary text-lg font-medium placeholder-text-secondary/30 leading-relaxed custom-scrollbar"
            autoFocus
          />
        </div>

        {/* Footer */}
        <div className="p-4 px-8 border-t border-border-primary bg-neutral-50 dark:bg-white/[0.01]">
           <p className="text-[10px] font-bold text-text-secondary uppercase tracking-[3px] text-center">
             CloudClip Notes Engine V1
           </p>
        </div>
      </div>
    </motion.div>
  );
};

export default NoteEditor;
