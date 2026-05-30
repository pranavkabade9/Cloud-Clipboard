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
  ChevronLeft,
  Plus,
  Trash,
  GripVertical
} from 'lucide-react';
import { cn } from '../../utils/utils';
import { useStore } from '../../store/useStore';

interface NoteEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { content: string; checklist?: { id: string; text: string; completed: boolean }[] }) => void;
  initialContent?: string;
  initialChecklist?: { id: string; text: string; completed: boolean }[];
  initialMode?: 'text' | 'checklist';
  noteId?: string;
}

const NoteEditor = ({ 
  isOpen, 
  onClose, 
  onSave, 
  initialContent = '', 
  initialChecklist = [], 
  initialMode,
  noteId 
}: NoteEditorProps) => {
  const { isMobile } = useStore();
  const [content, setContent] = useState(initialContent);
  const [checklist, setChecklist] = useState<{ id: string; text: string; completed: boolean }[]>(initialChecklist);
  const [isChecklistMode, setIsChecklistMode] = useState(initialMode === 'checklist' || initialChecklist.length > 0);
  const [isMaximized, setIsMaximized] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  useEffect(() => {
    setContent(initialContent);
  }, [initialContent]);

  const handleSave = () => {
    if (isChecklistMode) {
      if (checklist.length === 0) return;
      onSave({ 
        content: checklist.map(i => `${i.completed ? '✓' : '○'} ${i.text}`).join('\n'),
        checklist 
      });
    } else {
      if (!content.trim()) return;
      onSave({ content: content.trim() });
    }
    setLastSaved(new Date());
  };

  // Auto-save logic
  useEffect(() => {
    const timer = setTimeout(() => {
      const contentChanged = content !== initialContent && content.trim();
      const checklistChanged = JSON.stringify(checklist) !== JSON.stringify(initialChecklist) && checklist.length > 0;
      
      if (contentChanged || checklistChanged) {
        handleSave();
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [content, checklist]);

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: isMobile ? 1 : 0.9, y: isMobile ? 100 : 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: isMobile ? 1 : 0.9, y: isMobile ? 100 : 20 }}
      className={cn(
        "fixed z-[150] bg-bg-secondary border border-border-primary shadow-2xl transition-all duration-500 font-['Poppins']",
        isMobile 
          ? "inset-0 rounded-none" 
          : isMaximized 
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
              className="p-2 rounded-xl hover:bg-bg-primary text-text-secondary transition-all"
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
              className="p-2.5 rounded-xl hover:bg-bg-primary text-text-secondary transition-all"
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
        <div className="flex items-center gap-1 p-3 px-6 border-b border-border-primary bg-bg-primary/30">
           <button 
             onClick={() => setIsChecklistMode(false)}
             className={cn(
               "p-2 rounded-lg transition-all",
               !isChecklistMode ? "bg-blue-500 text-white" : "hover:bg-bg-primary text-text-secondary"
             )}
             title="Text Mode"
           >
             <Type className="h-4 w-4" />
           </button>
           <button 
             onClick={() => setIsChecklistMode(true)}
             className={cn(
               "p-2 rounded-lg transition-all",
               isChecklistMode ? "bg-blue-500 text-white" : "hover:bg-bg-primary text-text-secondary"
             )}
             title="Checklist Mode"
           >
             <CheckSquare className="h-4 w-4" />
           </button>
           <div className="w-px h-4 bg-border-primary mx-2" />
           <button className="p-2 rounded-lg hover:bg-bg-primary text-text-secondary transition-all">
             <Bold className="h-4 w-4" />
           </button>
           <button className="p-2 rounded-lg hover:bg-bg-primary text-text-secondary transition-all">
             <Italic className="h-4 w-4" />
           </button>
           <div className="w-px h-4 bg-border-primary mx-2" />
           <button className="p-2 rounded-lg hover:bg-bg-primary text-text-secondary transition-all">
             <List className="h-4 w-4" />
           </button>
        </div>

        {/* Editor Area */}
        <div className="flex-1 p-6 lg:p-10 overflow-y-auto custom-scrollbar">
          {isChecklistMode ? (
            <div className="max-w-3xl mx-auto space-y-8">
              {/* Active Items */}
              <div className="space-y-3">
                <AnimatePresence mode="popLayout">
                  {checklist.filter(i => !i.completed).map((item, index) => (
                    <motion.div
                      layout
                      key={item.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="group flex items-center gap-4 p-3 bg-bg-primary/50 hover:bg-bg-primary border border-border-primary rounded-2xl transition-all"
                    >
                      <button 
                        onClick={() => {
                          const newChecklist = checklist.map(i => i.id === item.id ? { ...i, completed: true } : i);
                          setChecklist(newChecklist);
                        }}
                        className="h-6 w-6 rounded-lg border-2 border-border-primary flex items-center justify-center hover:border-blue-500 transition-colors"
                      >
                        <div className="h-3 w-3 rounded-sm bg-transparent" />
                      </button>
                      <input 
                        type="text"
                        value={item.text}
                        onChange={(e) => {
                          const newChecklist = checklist.map(i => i.id === item.id ? { ...i, text: e.target.value } : i);
                          setChecklist(newChecklist);
                        }}
                        placeholder="Task description..."
                        className="flex-1 bg-transparent border-none focus:ring-0 text-text-primary text-sm font-medium"
                      />
                      <button 
                        onClick={() => setChecklist(checklist.filter(i => i.id !== item.id))}
                        className="opacity-0 group-hover:opacity-100 p-2 text-text-muted hover:text-red-500 transition-all"
                      >
                        <Trash className="h-3.5 w-3.5" />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
                
                <button 
                  onClick={() => {
                    setChecklist([...checklist, { id: crypto.randomUUID(), text: '', completed: false }]);
                  }}
                  className="flex items-center gap-3 w-full p-4 rounded-2xl border-2 border-dashed border-border-primary text-text-muted hover:text-blue-500 hover:border-blue-500/50 hover:bg-blue-500/5 transition-all text-xs font-bold uppercase tracking-widest"
                >
                  <Plus className="h-4 w-4" />
                  Add New Task
                </button>
              </div>

              {/* Completed Items */}
              {checklist.some(i => i.completed) && (
                <div className="pt-8 border-t border-border-primary">
                  <div className="flex items-center gap-2 mb-4 px-2">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">Completed</span>
                    <div className="h-px flex-1 bg-border-primary/50" />
                  </div>
                  <div className="space-y-3 opacity-60">
                    <AnimatePresence mode="popLayout">
                      {checklist.filter(i => i.completed).map((item) => (
                        <motion.div
                          layout
                          key={item.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="flex items-center gap-4 p-3 rounded-2xl bg-bg-primary/20 border border-border-primary/50"
                        >
                          <button 
                            onClick={() => {
                              const newChecklist = checklist.map(i => i.id === item.id ? { ...i, completed: false } : i);
                              setChecklist(newChecklist);
                            }}
                            className="h-6 w-6 rounded-lg bg-blue-500 flex items-center justify-center border-2 border-blue-500"
                          >
                            <div className="h-3 w-3 rounded-sm bg-white" />
                          </button>
                          <span className={cn(
                            "flex-1 text-sm font-medium transition-all duration-300",
                            item.completed ? "text-text-muted line-through decoration-blue-500/50 decoration-2 -rotate-1 skew-x-3 opacity-60" : "text-text-primary"
                          )}>
                            {item.text}
                          </span>
                          <button 
                            onClick={() => setChecklist(checklist.filter(i => i.id !== item.id))}
                            className="p-2 text-text-muted hover:text-red-500 transition-all"
                          >
                            <Trash className="h-3.5 w-3.5" />
                          </button>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What's on your mind? Start writing fragments..."
              className="w-full h-full bg-transparent border-none focus:ring-0 resize-none text-text-primary text-lg lg:text-2xl font-medium placeholder-text-muted/30 leading-relaxed custom-scrollbar"
              autoFocus
            />
          )}
        </div>

        {/* Footer */}
        <div className="p-4 px-8 border-t border-border-primary bg-bg-primary/30">
           <p className="text-[10px] font-bold text-text-secondary uppercase tracking-[3px] text-center">
             CloudClip Notes Engine V1
           </p>
        </div>
      </div>
    </motion.div>
  );
};

export default NoteEditor;
