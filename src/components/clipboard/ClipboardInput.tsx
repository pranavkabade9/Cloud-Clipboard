import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  type Image as ImageIcon, 
  Plus, 
  Send, 
  X, 
  Clipboard as ClipboardIcon, 
  Paperclip, 
  Layout, 
  Upload,
  CheckSquare,
  Pencil,
  Sparkles,
  Command,
  Image as LucideImage
} from 'lucide-react';
import { toast } from 'sonner';
import { useStore } from '../../store/useStore';
import { db, storage, OperationType, handleFirestoreError } from '../../services/firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc, increment } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import imageCompression from 'browser-image-compression';
import { cn } from '../../utils/utils';
import DrawingCanvas from '../drawing/DrawingCanvas';

import { handleImageUpload } from '../../services/uploadService';

const ClipboardInput = () => {
  const { user, isGuest, userProfile, storageLimit, addUploadingItem, removeUploadingItem } = useStore();
  const [content, setContent] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isDrawingOpen, setIsDrawingOpen] = useState(false);
  const [initialDrawingImage, setInitialDrawingImage] = useState<string | undefined>(undefined);
  
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const saveToClipboard = async (data: any) => {
    const itemSize = data.type === 'text' ? new Blob([data.content]).size : data.size || 0;
    
    if (user && userProfile) {
      if (userProfile.storageUsed + itemSize > storageLimit) {
        toast.error("Storage limit reached! Please delete some items.");
        return;
      }
    }

    if (user) {
      try {
        const itemData = {
          ...data,
          userId: user.uid,
          createdAt: serverTimestamp(),
          size: itemSize,
          pinned: false,
        };
        
        await addDoc(collection(db, 'clipboardItems'), itemData);
        
        await updateDoc(doc(db, 'users', user.uid), {
          storageUsed: increment(itemSize),
          updatedAt: serverTimestamp(),
        });

        toast.success("Saved to your vault");
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, 'clipboardItems');
      }
    } else if (isGuest) {
      const localItems = JSON.parse(localStorage.getItem('guest_clipboard') || '[]');
      const newItem = {
        id: crypto.randomUUID(),
        ...data,
        size: itemSize,
        createdAt: new Date().toISOString(),
        pinned: false,
      };
      const updatedItems = [newItem, ...localItems];
      localStorage.setItem('guest_clipboard', JSON.stringify(updatedItems));
      useStore.getState().setClipboardItems(updatedItems);
      toast.success("Saved locally");
    }
  };

  const handleTextSubmit = async () => {
    if (!content.trim()) return;
    const text = content.trim();
    setContent('');
    setIsExpanded(false);
    await saveToClipboard({ type: 'text', content: text });
  };

  const handleImageFile = async (file: File, skipCompression = false) => {
    await handleImageUpload({
      file,
      userId: user?.uid,
      isGuest,
      skipCompression,
      onSuccess: () => setIsUploading(false),
      onError: () => setIsUploading(false)
    });
  };

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleImageFile(file);
  }, []);

  const handleDrawingSave = async (blob: Blob) => {
    setIsDrawingOpen(false);
    const file = new File([blob], `drawing-${Date.now()}.png`, { type: 'image/png' });
    await handleImageFile(file, true);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        if (content.trim()) handleTextSubmit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [content]);

  return (
    <div 
      className="w-full max-w-2xl relative font-['Poppins']"
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <motion.div 
        layout
        className={cn(
          "w-full bg-bg-secondary border border-border-primary rounded-[28px] overflow-hidden transition-all duration-300 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)]",
          isExpanded ? "ring-4 ring-blue-500/10 border-blue-500/30" : "hover:border-border-hover",
          isDragging && "ring-4 ring-blue-500/40 border-blue-500 bg-blue-500/5 backdrop-blur-sm"
        )}
      >
        <div className="flex flex-col">
          {/* Top Bar for Mode selection */}
          <div className="flex items-center gap-1.5 px-4 pt-4 pb-1 overflow-x-auto no-scrollbar">
             <ModeButton active={!isExpanded} onClick={() => inputRef.current?.focus()} icon={Command} label="Note" />
             <ModeButton active={false} onClick={() => setIsDrawingOpen(true)} icon={Pencil} label="Sketch" />
             <ModeButton active={false} onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.onchange = (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0];
                  if (file) handleImageFile(file);
                };
                input.click();
             }} icon={LucideImage} label="Media" />
             <div className="flex-1" />
             {isExpanded && (
               <button 
                 onClick={() => {
                   setContent('');
                   setIsExpanded(false);
                 }}
                 className="p-2 rounded-lg hover:bg-bg-primary text-text-muted transition-colors"
               >
                 <X className="h-4 w-4" />
               </button>
             )}
          </div>

          <div className="flex items-start gap-3 px-5 py-2">
             <textarea 
               ref={inputRef}
               value={content}
               onChange={(e) => setContent(e.target.value)}
               onFocus={() => setIsExpanded(true)}
               placeholder="Capture a fragment..."
               className="w-full bg-transparent border-none focus:ring-0 text-text-primary placeholder-text-muted resize-none py-2 min-h-[48px] transition-all font-semibold text-base leading-relaxed"
               style={{ height: isExpanded ? '140px' : '48px' }}
             />
          </div>

          <AnimatePresence>
            {isExpanded && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center justify-between px-6 pb-6 pt-2 overflow-hidden"
              >
                <div className="flex items-center gap-2 text-text-muted">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 hidden sm:inline">⌘ + Enter</span>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button 
                    disabled={(!content.trim() && !isUploading) || isUploading}
                    onClick={handleTextSubmit}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-3 bg-blue-500 hover:bg-blue-600 disabled:opacity-30 px-10 py-3.5 rounded-[22px] text-xs font-black uppercase tracking-widest text-white transition-all active:scale-95 shadow-2xl shadow-blue-500/20"
                  >
                    {isUploading ? "Uploading..." : "Save Clip"}
                    {!isUploading && <Send className="h-4 w-4" />}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Drawing Overlay */}
      <AnimatePresence>
        {isDrawingOpen && (
          <DrawingCanvas 
            onClose={() => {
              setIsDrawingOpen(false);
              setInitialDrawingImage(undefined);
            }}
            onSave={handleDrawingSave}
            initialImage={initialDrawingImage}
          />
        )}
      </AnimatePresence>

      {/* Drop zone overlay */}
      <AnimatePresence>
        {isDragging && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute inset-0 z-50 flex items-center justify-center rounded-[32px] bg-blue-500/10 backdrop-blur-md pointer-events-none"
          >
            <div className="flex flex-col items-center gap-6 text-blue-500">
               <div className="h-24 w-24 rounded-full bg-bg-secondary flex items-center justify-center shadow-2xl border-4 border-blue-500/50">
                  <Upload className="h-10 w-10" />
               </div>
               <span className="text-2xl font-black uppercase tracking-tighter">Release to Save</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const ModeButton = ({ active, onClick, icon: Icon, label }: any) => (
  <button 
    onClick={onClick}
    className={cn(
      "flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all active:scale-95",
      active 
        ? "bg-blue-500/10 text-blue-500 decoration-blue-500/30" 
        : "text-text-muted hover:bg-bg-primary hover:text-text-primary"
    )}
  >
    <Icon className="h-3.5 w-3.5" />
    {label}
  </button>
);

export default ClipboardInput;
