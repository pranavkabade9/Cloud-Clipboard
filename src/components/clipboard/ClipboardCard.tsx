import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Archive,
  Trash2,
  Maximize2,
  Clock,
  Type,
  Image as ImageIcon,
  Check,
  Pin,
  Tag,
  Download,
  X,
  Pencil,
  Star,
  RefreshCcw,
  RotateCcw,
  Copy
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  doc, 
  deleteDoc, 
  updateDoc, 
  increment, 
  serverTimestamp,
  collection,
  addDoc
} from 'firebase/firestore';
import { db, storage, OperationType, handleFirestoreError } from '../../services/firebase';
import { useStore } from '../../store/useStore';
import { cn, formatBytes, getRelativeTime } from '../../utils/utils';
import DrawingCanvas from '../drawing/DrawingCanvas';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import imageCompression from 'browser-image-compression';

interface ClipboardCardProps {
  item: any;
}

const ClipboardCard = React.memo(({ item }: ClipboardCardProps) => {
  const { user, isGuest, labels, isMobile } = useStore();
  const [isCopied, setIsCopied] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isAnnotating, setIsAnnotating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(item.content || '');
  const [relativeTime, setRelativeTime] = useState(getRelativeTime(new Date(item.createdAt?.seconds * 1000 || item.createdAt)));

  useEffect(() => {
    const timer = setInterval(() => {
      setRelativeTime(getRelativeTime(new Date(item.createdAt?.seconds * 1000 || item.createdAt)));
    }, 60000);
    return () => clearInterval(timer);
  }, [item.createdAt]);

  const handleCopy = useCallback(async () => {
    try {
      if (item.type === 'text') {
        await navigator.clipboard.writeText(item.content);
      } else {
        const response = await fetch(item.imageUrl);
        const blob = await response.blob();
        const clipboardItem = new ClipboardItem({ [blob.type]: blob });
        await navigator.clipboard.write([clipboardItem]);
      }
      setIsCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      toast.error("Copy failed");
    }
  }, [item.content, item.imageUrl, item.type]);

  const handlePin = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    const newPinned = !item.pinned;
    if (user) {
      try {
        await updateDoc(doc(db, 'clipboardItems', item.id), { pinned: newPinned });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `clipboardItems/${item.id}`);
      }
    } else if (isGuest) {
      const localItems = JSON.parse(localStorage.getItem('guest_clipboard') || '[]');
      const updated = localItems.map((i: any) => i.id === item.id ? { ...i, pinned: newPinned } : i);
      localStorage.setItem('guest_clipboard', JSON.stringify(updated));
      useStore.getState().setClipboardItems(updated);
    }
  }, [item.id, item.pinned, user, isGuest]);

  const handleArchive = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    const newArchived = !item.archived;
    if (user) {
      try {
        await updateDoc(doc(db, 'clipboardItems', item.id), { archived: newArchived });
        toast.success(newArchived ? "Archived" : "Restored from archive");
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `clipboardItems/${item.id}`);
      }
    } else if (isGuest) {
      const localItems = JSON.parse(localStorage.getItem('guest_clipboard') || '[]');
      const updated = localItems.map((i: any) => i.id === item.id ? { ...i, archived: newArchived } : i);
      localStorage.setItem('guest_clipboard', JSON.stringify(updated));
      useStore.getState().setClipboardItems(updated);
      toast.success(newArchived ? "Archived" : "Restored");
    }
  }, [item.id, item.archived, user, isGuest]);

  const handleRestore = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (user) {
      try {
        await updateDoc(doc(db, 'clipboardItems', item.id), { deleted: false, archived: false });
        toast.success("Item restored");
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `clipboardItems/${item.id}`);
      }
    } else if (isGuest) {
      const localItems = JSON.parse(localStorage.getItem('guest_clipboard') || '[]');
      const updated = localItems.map((i: any) => i.id === item.id ? { ...i, deleted: false, archived: false } : i);
      localStorage.setItem('guest_clipboard', JSON.stringify(updated));
      useStore.getState().setClipboardItems(updated);
      toast.success("Restored");
    }
  }, [item.id, user, isGuest]);

  const handlePermanentDelete = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Permanently delete this item? This cannot be undone.")) return;
    
    setIsDeleting(true);
    if (user) {
      try {
        await deleteDoc(doc(db, 'clipboardItems', item.id));
        await updateDoc(doc(db, 'users', user.uid), {
          storageUsed: increment(-item.size),
          updatedAt: serverTimestamp()
        });
        toast.success("Permanently deleted");
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `clipboardItems/${item.id}`);
        setIsDeleting(false);
      }
    } else if (isGuest) {
      const localItems = JSON.parse(localStorage.getItem('guest_clipboard') || '[]');
      const filtered = localItems.filter((i: any) => i.id !== item.id);
      localStorage.setItem('guest_clipboard', JSON.stringify(filtered));
      useStore.getState().setClipboardItems(filtered);
      toast.success("Permanently removed");
    }
  }, [item.id, item.size, user, isGuest]);

  const startDelete = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    const originalState = { deleted: !!item.deleted, archived: !!item.archived };
    
  const performSoftDelete = async (shouldDelete: boolean) => {
    // Optimistic update for both guest and user
    const currentItems = useStore.getState().clipboardItems;
    const updated = currentItems.map((i: any) => i.id === item.id ? { ...i, deleted: shouldDelete } : i);
    useStore.getState().setClipboardItems(updated);

    if (user) {
      try {
        await updateDoc(doc(db, 'clipboardItems', item.id), { deleted: shouldDelete });
      } catch (error) {
        // Rollback on error
        useStore.getState().setClipboardItems(currentItems);
        handleFirestoreError(error, OperationType.UPDATE, `clipboardItems/${item.id}`);
      }
    } else if (isGuest) {
      localStorage.setItem('guest_clipboard', JSON.stringify(updated));
    }
  };

    try {
      await performSoftDelete(true);
      toast.success("Moved to Bin", {
        action: {
          label: "Undo",
          onClick: () => performSoftDelete(false)
        },
        duration: 5000
      });
    } catch (error) {
      toast.error("Failed to delete");
    }
  }, [item.id, user, isGuest]);

  const handleDownload = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (item.imageUrl) {
      const link = document.createElement('a');
      link.href = item.imageUrl;
      link.download = `clip_${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }, [item.imageUrl]);

  const handleSaveEdit = useCallback(async () => {
    if (!editContent.trim()) return;
    if (user) {
      try {
        await updateDoc(doc(db, 'clipboardItems', item.id), { 
          content: editContent.trim(),
          updatedAt: serverTimestamp() 
        });
        toast.success("Clip updated");
        setIsEditing(false);
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `clipboardItems/${item.id}`);
      }
    } else if (isGuest) {
      const localItems = JSON.parse(localStorage.getItem('guest_clipboard') || '[]');
      const updated = localItems.map((i: any) => i.id === item.id ? { ...i, content: editContent.trim() } : i);
      localStorage.setItem('guest_clipboard', JSON.stringify(updated));
      useStore.getState().setClipboardItems(updated);
      toast.success("Updated locally");
      setIsEditing(false);
    }
  }, [item.id, editContent, user, isGuest]);

  const handleAnnotateSave = useCallback(async (blob: Blob) => {
    const loadingToast = toast.loading("Saving edit...");
    try {
      const file = new File([blob], `edit-${Date.now()}.png`, { type: 'image/png' });
      const options = { maxSizeMB: 0.8, maxWidthOrHeight: 1600, useWebWorker: true };
      const compressedFile = await imageCompression(file, options);
      
      let imageUrl = '';
      if (user) {
        const storageRef = ref(storage, `clips/${user.uid}/edit-${Date.now()}.png`);
        const snapshot = await uploadBytes(storageRef, compressedFile);
        imageUrl = await getDownloadURL(snapshot.ref);

        const itemData = {
          type: 'image',
          imageUrl,
          userId: user.uid,
          createdAt: serverTimestamp(),
          size: compressedFile.size,
          pinned: false,
        };
        await addDoc(collection(db, 'clipboardItems'), itemData);
        await updateDoc(doc(db, 'users', user.uid), {
          storageUsed: increment(compressedFile.size),
          updatedAt: serverTimestamp(),
        });
      } else {
        const reader = new FileReader();
        imageUrl = await new Promise((resolve) => {
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsDataURL(compressedFile);
        });
        const localItems = JSON.parse(localStorage.getItem('guest_clipboard') || '[]');
        const newItem = {
          id: crypto.randomUUID(),
          type: 'image',
          imageUrl,
          size: compressedFile.size,
          createdAt: new Date().toISOString(),
          pinned: false,
        };
        const updated = [newItem, ...localItems];
        localStorage.setItem('guest_clipboard', JSON.stringify(updated));
        useStore.getState().setClipboardItems(updated);
      }
      toast.dismiss(loadingToast);
      toast.success("Annotation saved");
      setIsAnnotating(false);
    } catch (err) {
      toast.dismiss(loadingToast);
      toast.error("Save failed");
    }
  }, [user, isGuest]);

  const cardLabel = labels.find(l => l.id === item.labelId);

  return (
    <motion.div
      layout
      className={cn(
        "group relative dark:bg-neutral-900 bg-white border dark:border-white/5 border-neutral-200 rounded-[28px] overflow-hidden transition-all duration-300 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] dark:hover:border-blue-500/30",
        item.pinned && "ring-1 ring-orange-500/30 border-orange-500/30",
        isDeleting && "scale-95 opacity-50 grayscale pointer-events-none"
      )}
    >
      <div className="p-4 flex flex-col h-full">
        <div className="flex items-center justify-between mb-3">
           <div className="flex items-center gap-2">
              <div className={cn(
                "p-1.5 rounded-lg text-neutral-500 transition-colors",
                item.type === 'image' ? "bg-purple-500/5 text-purple-400" : "bg-blue-500/5 text-blue-400"
              )}>
                {item.type === 'text' ? <Type className="h-3.5 w-3.5" /> : <ImageIcon className="h-3.5 w-3.5" />}
              </div>
              <span className="text-[9px] font-black uppercase tracking-widest text-neutral-400">{item.type}</span>
           </div>
           
           <div className="lg:opacity-0 group-hover:opacity-100 transition-all flex items-center gap-1">
              {!item.deleted ? (
                <>
                  <button 
                    onClick={handleArchive} 
                    className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-all"
                    title="Archive"
                  >
                    <Archive className="h-3.5 w-3.5" />
                  </button>
                  <button 
                    onClick={handlePin} 
                    className={cn(
                      "p-2 rounded-lg transition-all", 
                      item.pinned ? "text-orange-500 bg-orange-500/10" : "text-neutral-400 hover:text-white hover:bg-neutral-800"
                    )}
                    title="Pin"
                  >
                    <Pin className={cn("h-3.5 w-3.5", item.pinned && "fill-current")} />
                  </button>
                  <button onClick={startDelete} className="p-2 rounded-lg text-neutral-400 hover:text-red-500 hover:bg-red-500/10 transition-all" title="Delete">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </>
              ) : (
                <>
                  <button onClick={handleRestore} className="p-2 rounded-lg text-neutral-400 hover:text-green-500 hover:bg-green-500/10 transition-all" title="Restore">
                    <Clock className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={handlePermanentDelete} className="p-2 rounded-lg text-neutral-400 hover:text-red-500 hover:bg-red-500/10 transition-all" title="Delete Permanently">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </>
              )}
           </div>
        </div>

        {item.type === 'image' ? (
          <div className="relative rounded-2xl overflow-hidden aspect-video bg-neutral-100 dark:bg-neutral-800 border dark:border-white/5 border-neutral-200 mb-4 cursor-pointer" onClick={() => setIsExpanded(true)}>
             <img 
               src={item.imageUrl} 
               className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
               alt="Snippet" 
               referrerPolicy="no-referrer"
               loading="lazy"
             />
             <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <div className="p-3 rounded-full bg-white/20 backdrop-blur-md border border-white/20">
                   <Maximize2 className="h-4 w-4 text-white" />
                </div>
             </div>
          </div>
        ) : (
          <div className="flex-1 min-h-[100px] mb-4 cursor-pointer px-1" onClick={() => setIsExpanded(true)}>
            <p className="text-neutral-800 dark:text-neutral-200 text-sm font-medium leading-relaxed line-clamp-6 whitespace-pre-wrap">
              {item.content}
            </p>
          </div>
        )}

        <div className="flex items-center gap-3 mt-auto pt-4 border-t dark:border-white/5 border-neutral-100">
           {cardLabel && (
             <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-neutral-100 dark:bg-white/5 text-[8px] font-black uppercase text-neutral-500 tracking-wider">
               <Tag className="h-2.5 w-2.5" />
               {cardLabel.name}
             </div>
           )}
           <div className="flex items-center gap-1.5 text-neutral-400 text-[9px] font-black uppercase tracking-widest">
              <Clock className="h-3 w-3" />
              {relativeTime}
           </div>
           <div className="text-[8px] font-bold text-neutral-400 opacity-40 ml-auto uppercase tracking-tighter">
             {formatBytes(item.size || 0)}
           </div>
        </div>

        <div className="flex items-center gap-2 mt-4">
           <button 
             onClick={handleCopy}
             className={cn(
               "flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-[0.98]",
               isCopied 
                ? "bg-green-500/10 text-green-500 border border-green-500/20" 
                : "bg-blue-500 text-white shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20 hover:bg-blue-600"
             )}
           >
             {isCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
             {isCopied ? "Copied" : "Copy"}
           </button>
           {item.type === 'image' && (
             <button onClick={() => setIsAnnotating(true)} className="p-3.5 rounded-xl bg-neutral-100 dark:bg-white/5 text-neutral-500 hover:text-white dark:hover:bg-white/20 transition-all">
                <Pencil className="h-3.5 w-3.5" />
             </button>
           )}
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] flex items-center justify-center p-4 lg:p-12 bg-neutral-950/98 backdrop-blur-3xl"
            onClick={() => setIsExpanded(false)}
          >
             <button className="absolute top-6 right-6 lg:top-8 lg:right-8 p-3 lg:p-4 rounded-full bg-white/5 text-white hover:bg-white/20 transition-all border border-white/10 scale-100 hover:scale-110">
                <X className="h-6 w-6 lg:h-8 lg:w-8" />
             </button>

             <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 30 }}
              className="max-w-6xl w-full h-full flex flex-col lg:flex-row gap-8 lg:gap-12 overflow-y-auto lg:overflow-visible custom-scrollbar"
              onClick={e => e.stopPropagation()}
             >
                <div className={cn(
                   "flex-1 bg-neutral-900 rounded-[32px] lg:rounded-[48px] border border-white/5 overflow-hidden shadow-2xl relative min-h-[400px] flex flex-col",
                   isEditing && "ring-2 ring-blue-500"
                 )}>
                  {item.type === 'image' ? (
                    <img src={item.imageUrl} className="w-full h-full object-contain" alt="Deep view" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full p-8 lg:p-16 overflow-y-auto custom-scrollbar flex flex-col h-full">
                      {isEditing ? (
                        <textarea
                          autoFocus
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          className="w-full flex-1 bg-transparent border-none focus:ring-0 text-white text-lg lg:text-2xl font-medium leading-relaxed whitespace-pre-wrap resize-none no-scrollbar"
                          placeholder="Edit your clip..."
                        />
                      ) : (
                        <div className="text-white text-lg lg:text-2xl font-medium leading-relaxed whitespace-pre-wrap">
                          {item.content}
                        </div>
                      )}
                    </div>
                  )}
                   {!item.deleted && (
                    <div className="absolute bottom-6 right-6 lg:bottom-10 lg:right-10 flex items-center gap-4">
                      {item.type === 'text' && (
                        <button 
                          onClick={() => isEditing ? handleSaveEdit() : setIsEditing(true)} 
                          className={cn(
                            "flex items-center gap-3 px-6 lg:px-10 py-3 lg:py-5 rounded-2xl lg:rounded-[24px] font-black text-xs lg:text-sm transition-all active:scale-95 shadow-2xl",
                            isEditing ? "bg-green-500 hover:bg-green-600 text-white" : "bg-white/10 hover:bg-white/20 text-white backdrop-blur-xl border border-white/10"
                          )}
                        >
                           {isEditing ? <Check className="h-4 lg:h-5 lg:w-5" /> : <Pencil className="h-4 lg:h-5 lg:w-5" />}
                           {isEditing ? "Save Changes" : "Edit Note"}
                        </button>
                      )}
                      {item.type === 'image' && (
                        <button onClick={() => setIsAnnotating(true)} className="flex items-center gap-3 px-6 lg:px-10 py-3 lg:py-5 bg-blue-500 hover:bg-blue-600 text-white rounded-2xl lg:rounded-[24px] font-black text-xs lg:text-sm transition-all active:scale-95 shadow-2xl">
                           <Pencil className="h-4 lg:h-5 lg:w-5" />
                           Draw / Annotate
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="w-full lg:w-96 flex flex-col gap-6 lg:gap-8 pb-8 lg:pb-0">
                   <div className="space-y-2">
                      <h2 className="text-2xl lg:text-3xl font-black text-white tracking-tight">Snippet Insights</h2>
                      <p className="text-neutral-500 font-bold uppercase tracking-widest text-[10px]">Captured {relativeTime}</p>
                   </div>

                   <div className="space-y-4">
                      <div className="p-6 rounded-[28px] bg-white/5 border border-white/10 space-y-4 shadow-xl">
                         <div className="flex items-center justify-between text-neutral-400">
                            <span className="text-[10px] font-black uppercase tracking-widest">Digital Weight</span>
                            <span className="text-sm font-black text-white">{formatBytes(item.size || 0)}</span>
                         </div>
                         <div className="flex items-center justify-between text-neutral-400">
                            <span className="text-[10px] font-black uppercase tracking-widest">MIME Type</span>
                            <span className="text-sm font-black text-white uppercase">{item.type}</span>
                         </div>
                      </div>
                   </div>

                   <div className="mt-auto space-y-3 lg:space-y-4">
                      {!item.deleted ? (
                        <>
                          <button onClick={handleDownload} className="w-full flex items-center justify-center gap-3 py-5 rounded-[24px] bg-white/10 hover:bg-white text-white hover:text-black font-black text-xs transition-all hover:scale-[1.02] border border-white/5">
                            <Download className="h-5 w-5" />
                            Download Original
                          </button>
                          <button onClick={handleCopy} className="w-full flex items-center justify-center gap-3 py-5 rounded-[24px] bg-blue-500 text-white font-black text-xs transition-all hover:scale-[1.02] shadow-2xl border border-blue-400/20">
                            <Copy className="h-5 w-5" />
                            Copy Clip
                          </button>
                        </>
                      ) : (
                        <button onClick={handleRestore} className="w-full flex items-center justify-center gap-3 py-5 rounded-[24px] bg-green-500 text-white font-black text-xs transition-all hover:scale-[1.02] shadow-2xl border border-green-400/20">
                          <RotateCcw className="h-5 w-5" />
                          Restore Item
                        </button>
                      )}
                   </div>
                </div>
             </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isAnnotating && (
          <DrawingCanvas 
            initialImage={item.imageUrl}
            onClose={() => setIsAnnotating(false)}
            onSave={handleAnnotateSave}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
});

export default ClipboardCard;
