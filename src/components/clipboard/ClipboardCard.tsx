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
  setDoc,
  increment,
  serverTimestamp,
  collection,
  addDoc
} from 'firebase/firestore';
import { db, storage, OperationType, handleFirestoreError } from '../../services/firebase';
import { useStore } from '../../store/useStore';
import { cn, formatBytes, getRelativeTime } from '../../utils/utils';
import DrawingCanvas from '../drawing/DrawingCanvas';
import { useModal } from '../ui/ModalProvider';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import imageCompression from 'browser-image-compression';

import { handleImageUpload } from '../../services/uploadService';

interface ClipboardCardProps {
  item: any;
}


interface ExpandedClipModalProps {
  item: any;
  imageUrl?: string;
  relativeTime: string;
  onUpdate: (data: any) => Promise<void>;
  onDownload: () => void;
  onCopy: () => void;
  onRestore: (event: React.MouseEvent) => void;
  onAnnotate: () => void;
  onClose: () => void;
}

const ExpandedClipModal = ({ item, imageUrl, relativeTime, onUpdate, onDownload, onCopy, onRestore, onAnnotate, onClose }: ExpandedClipModalProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(item.content || '');

  const handleSaveEdit = async () => {
    await onUpdate({ content: editContent, updatedAt: serverTimestamp() });
    setIsEditing(false);
    toast.success('Clip updated');
  };

  return (
    <div className="flex h-full flex-col gap-5 p-4 sm:p-6 lg:flex-row lg:gap-8 lg:p-8">
      <button
        onClick={onClose}
        aria-label="Close expanded view"
        className="absolute right-4 top-4 z-30 rounded-2xl border border-border-primary bg-bg-primary/80 p-3 text-text-primary shadow-xl backdrop-blur-xl transition-all hover:scale-105 hover:bg-bg-secondary focus:outline-none focus:ring-2 focus:ring-blue-500/40"
      >
        <X className="h-5 w-5" />
      </button>

      <div className={cn(
        'relative flex min-h-[55dvh] flex-1 flex-col overflow-hidden rounded-[28px] border border-border-primary bg-bg-secondary shadow-2xl sm:rounded-[36px]',
        isEditing && 'ring-2 ring-blue-500'
      )}>
        {item.type === 'image' ? (
          <img src={imageUrl} className="h-full w-full object-contain bg-bg-primary" alt="Expanded clip" referrerPolicy="no-referrer" />
        ) : item.checklist ? (
          <div className="h-full overflow-y-auto p-6 sm:p-10 custom-scrollbar">
            <div className="space-y-4">
              {item.checklist.filter((i: any) => !i.completed).map((task: any) => (
                <button
                  key={task.id}
                  className="group flex w-full items-center gap-4 rounded-2xl p-2 text-left transition-all hover:bg-bg-primary"
                  onClick={async (event) => {
                    event.stopPropagation();
                    const newChecklist = item.checklist.map((i: any) => i.id === task.id ? { ...i, completed: true } : i);
                    await onUpdate({ checklist: newChecklist });
                    toast.success('Task completed');
                  }}
                >
                  <div className="h-6 w-6 rounded-lg border-2 border-border-primary transition-colors group-hover:border-blue-500" />
                  <span className="text-lg font-medium text-text-primary sm:text-xl">{task.text}</span>
                </button>
              ))}
            </div>
            {item.checklist.some((i: any) => i.completed) && (
              <div className="mt-8 border-t border-border-primary pt-8">
                <p className="mb-4 text-[10px] font-black uppercase tracking-[0.25em] text-text-muted">Completed Tasks</p>
                <div className="space-y-3 opacity-60">
                  {item.checklist.filter((i: any) => i.completed).map((task: any) => (
                    <div key={task.id} className="flex items-center gap-4 p-2">
                      <Check className="h-5 w-5 text-blue-500" />
                      <span className="text-base font-medium text-text-muted line-through">{task.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="h-full overflow-y-auto p-6 sm:p-10 custom-scrollbar">
            {isEditing ? (
              <textarea
                value={editContent}
                onChange={(event) => setEditContent(event.target.value)}
                className="h-full min-h-[52dvh] w-full resize-none border-none bg-transparent text-lg font-medium leading-relaxed text-text-primary outline-none focus:ring-0 sm:text-2xl"
                placeholder="Edit your clip..."
              />
            ) : (
              <div className="whitespace-pre-wrap text-lg font-medium leading-relaxed text-text-primary sm:text-2xl">{item.content}</div>
            )}
          </div>
        )}

        {!item.deleted && (
          <div className="absolute bottom-4 right-4 flex flex-wrap items-center justify-end gap-3 sm:bottom-6 sm:right-6">
            {item.type === 'text' && (
              <button
                onClick={() => isEditing ? handleSaveEdit() : setIsEditing(true)}
                className={cn(
                  'flex items-center gap-2 rounded-2xl px-5 py-3 text-xs font-black shadow-2xl transition-all active:scale-95',
                  isEditing ? 'bg-green-500 text-white hover:bg-green-600' : 'border border-border-primary bg-bg-primary/70 text-text-primary backdrop-blur-xl hover:bg-bg-primary'
                )}
              >
                {isEditing ? <Check className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
                {isEditing ? 'Save Changes' : 'Edit Note'}
              </button>
            )}
            {item.type === 'image' && (
              <button onClick={onAnnotate} className="flex items-center gap-2 rounded-2xl bg-blue-500 px-5 py-3 text-xs font-black text-white shadow-2xl transition-all hover:bg-blue-600 active:scale-95">
                <Pencil className="h-4 w-4" />
                Draw / Annotate
              </button>
            )}
          </div>
        )}
      </div>

      <aside className="flex w-full flex-col gap-5 pb-2 lg:w-80">
        <div className="space-y-2 pr-14 lg:pr-0">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-500">Expanded View</p>
          <h2 className="text-2xl font-black tracking-tight text-text-primary lg:text-3xl">Snippet Insights</h2>
          <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Captured {relativeTime}</p>
        </div>

        <div className="space-y-3 rounded-[28px] border border-border-primary bg-bg-primary p-5 shadow-xl">
          <div className="flex items-center justify-between gap-4">
            <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">Digital Weight</span>
            <span className="text-sm font-black text-text-primary">{formatBytes(item.size || 0)}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">Item Type</span>
            <span className="text-sm font-black uppercase text-text-primary">{item.type}</span>
          </div>
        </div>

        <div className="mt-auto space-y-3">
          {!item.deleted ? (
            <>
              <button onClick={onDownload} className="flex w-full items-center justify-center gap-3 rounded-[22px] border border-border-primary bg-bg-primary py-4 text-xs font-black text-text-primary transition-all hover:scale-[1.02] hover:bg-text-primary hover:text-bg-primary">
                <Download className="h-5 w-5" />
                Download Original
              </button>
              <button onClick={onCopy} className="flex w-full items-center justify-center gap-3 rounded-[22px] border border-blue-400/20 bg-blue-500 py-4 text-xs font-black text-white shadow-2xl transition-all hover:scale-[1.02]">
                <Copy className="h-5 w-5" />
                Copy Clip
              </button>
            </>
          ) : (
            <button onClick={onRestore} className="flex w-full items-center justify-center gap-3 rounded-[22px] border border-green-400/20 bg-green-500 py-4 text-xs font-black text-white shadow-2xl transition-all hover:scale-[1.02]">
              <RotateCcw className="h-5 w-5" />
              Restore Item
            </button>
          )}
        </div>
      </aside>
    </div>
  );
};

const ClipboardCard = React.memo(({ item }: ClipboardCardProps) => {
  const { user, isGuest, isMobile, setUndoAction } = useStore();
  const { openModal } = useModal();
  const [isCopied, setIsCopied] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAnnotating, setIsAnnotating] = useState(false);

  const performUpdate = useCallback(async (updateData: any) => {
    if (user) {
      try {
        await updateDoc(doc(db, 'users', user.uid, 'clips', item.id), updateData);
        // Also update sync timestamp on profile
        await setDoc(doc(db, 'users', user.uid), {
          updatedAt: serverTimestamp()
        }, { merge: true });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}/clips/${item.id}`);
      }
    } else if (isGuest) {
      const localItems = JSON.parse(localStorage.getItem('guest_clipboard') || '[]');
      const updated = localItems.map((i: any) => i.id === item.id ? { ...i, ...updateData } : i);
      localStorage.setItem('guest_clipboard', JSON.stringify(updated));
      useStore.getState().setClipboardItems(updated);
    }
  }, [item.id, user, isGuest]);
  const [relativeTime, setRelativeTime] = useState(getRelativeTime(item.createdAt));
  const [resolvedImageUrl, setResolvedImageUrl] = useState<string | undefined>(undefined);

  useEffect(() => {
    let url: string | undefined = undefined;
    if (item.imageUrl?.startsWith('idb://')) {
      const mediaId = item.imageUrl.replace('idb://', '');
      import('../../utils/idb').then(({ getMedia }) => {
        getMedia(mediaId).then(blob => {
          if (blob) {
            url = URL.createObjectURL(blob);
            setResolvedImageUrl(url);
          }
        });
      });
    } else {
      setResolvedImageUrl(item.imageUrl);
    }

    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [item.imageUrl]);

  useEffect(() => {
    setRelativeTime(getRelativeTime(item.createdAt));
    const timer = setInterval(() => {
      setRelativeTime(getRelativeTime(item.createdAt));
    }, 60000);
    return () => clearInterval(timer);
  }, [item.createdAt]);

  const handleCopy = useCallback(async () => {
    try {
      if (item.type === 'text') {
        await navigator.clipboard.writeText(item.content);
      } else {
        const response = await fetch(resolvedImageUrl || '');
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
  }, [item.content, resolvedImageUrl, item.type]);

  const handlePin = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    const newPinned = !item.pinned;
    if (user) {
      try {
        await updateDoc(doc(db, 'users', user.uid, 'clips', item.id), { pinned: newPinned });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}/clips/${item.id}`);
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
    await performUpdate({ archived: newArchived });

    setUndoAction({
      message: newArchived ? "Snippet archived" : "Snippet restored",
      action: () => performUpdate({ archived: !newArchived }),
      id: `archive-${item.id}`
    });
  }, [item.id, item.archived, performUpdate, setUndoAction]);

  const handleRestore = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    await performUpdate({ deleted: false, archived: false });
    toast.success("Snippet restored");
  }, [performUpdate]);

  const startDelete = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    await performUpdate({ deleted: true });

    setUndoAction({
      message: "Moved to bin",
      action: () => performUpdate({ deleted: false }),
      id: `delete-${item.id}`
    });
  }, [item.id, performUpdate, setUndoAction]);

  const handlePermanentDelete = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Permanently delete this item? This cannot be undone.")) return;

    setIsDeleting(true);
    if (user) {
      try {
        await deleteDoc(doc(db, 'users', user.uid, 'clips', item.id));
        await setDoc(doc(db, 'users', user.uid), {
          storageUsed: increment(-item.size),
          updatedAt: serverTimestamp()
        }, { merge: true });
        toast.success("Permanently deleted");
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}/clips/${item.id}`);
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

  const handleDownload = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (resolvedImageUrl) {
      const link = document.createElement('a');
      link.href = resolvedImageUrl;
      link.download = `clip_${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }, [resolvedImageUrl]);


  const handleAnnotateSave = useCallback(async (blob: Blob) => {
    const file = new File([blob], `edit-${Date.now()}.png`, { type: 'image/png' });
    await handleImageUpload({
      file,
      userId: user?.uid,
      isGuest,
      onSuccess: () => setIsAnnotating(false),
    });
  }, [user, isGuest]);

  const cardLabel = null;

  return (
    <motion.div
      layout
      onClick={handleCopy}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "group relative bg-bg-secondary border border-border-primary rounded-[28px] overflow-hidden transition-all duration-300 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] hover:border-blue-500/30 shadow-sm cursor-pointer",
        item.pinned && "ring-1 ring-orange-500/30 border-orange-500/30",
        isDeleting && "scale-95 opacity-50 grayscale pointer-events-none",
        isCopied && "ring-2 ring-green-500/50 border-green-500/50"
      )}
    >
      <AnimatePresence>
        {isCopied && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-green-500/10 backdrop-blur-[2px] pointer-events-none"
          >
            <div className="flex flex-col items-center gap-2">
              <div className="h-12 w-12 rounded-full bg-green-500 flex items-center justify-center shadow-lg shadow-green-500/40">
                <Check className="h-6 w-6 text-white" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-green-600 dark:text-green-400 bg-bg-secondary/80 px-3 py-1 rounded-full backdrop-blur-md">Copied to Vault</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="p-4 flex flex-col h-full">
        <div className="flex items-center justify-between mb-3">
           <div className="flex items-center gap-2">
              <div className={cn(
                "p-1.5 rounded-lg transition-colors",
                item.type === 'image' ? "bg-purple-500/5 text-purple-500" : "bg-blue-500/5 text-blue-500"
              )}>
                {item.type === 'text' ? <Type className="h-3.5 w-3.5" /> : <ImageIcon className="h-3.5 w-3.5" />}
              </div>
              <span className="text-[9px] font-black uppercase tracking-widest text-text-muted">{item.type}</span>
           </div>

           <div className={cn(
             "transition-all flex items-center gap-1",
             "lg:opacity-0 group-hover:opacity-100"
           )}>
              {!item.deleted ? (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openModal({
                        id: `clip-preview-${item.id}`,
                        title: 'Expanded Clip View',
                        size: 'fullscreen',
                        hideCloseButton: true,
                        contentClassName: 'h-full',
                        content: ({ close }) => (
                          <ExpandedClipModal
                            item={item}
                            imageUrl={resolvedImageUrl}
                            relativeTime={relativeTime}
                            onUpdate={performUpdate}
                            onDownload={handleDownload}
                            onCopy={handleCopy}
                            onRestore={handleRestore}
                            onAnnotate={() => { close(); setIsAnnotating(true); }}
                            onClose={close}
                          />
                        )
                      });
                    }}
                    className="p-3 sm:p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-primary border border-transparent hover:border-border-primary transition-all"
                    title="Expand View"
                  >
                    <Maximize2 className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                  </button>
                  <button
                    onClick={handleArchive}
                    className="p-3 sm:p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-primary border border-transparent hover:border-border-primary transition-all"
                    title="Archive"
                  >
                    <Archive className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                  </button>
                  <button
                    onClick={handlePin}
                    className={cn(
                      "p-3 sm:p-2 rounded-lg transition-all border border-transparent",
                      item.pinned ? "text-orange-500 bg-orange-500/10 border-orange-500/20" : "text-text-muted hover:text-text-primary hover:bg-bg-primary hover:border-border-primary"
                    )}
                    title="Pin"
                  >
                    <Pin className={cn("h-4 w-4 sm:h-3.5 sm:w-3.5", item.pinned && "fill-current")} />
                  </button>
                  <button onClick={startDelete} className="p-3 sm:p-2 rounded-lg text-text-muted hover:text-red-500 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all" title="Delete">
                    <Trash2 className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                  </button>
                </>
              ) : (
                <>
                  <button onClick={handleRestore} className="p-3 sm:p-2 rounded-lg text-text-muted hover:text-green-500 hover:bg-green-500/10 border border-transparent hover:border-green-500/20 transition-all" title="Restore">
                    <Clock className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                  </button>
                  <button onClick={handlePermanentDelete} className="p-3 sm:p-2 rounded-lg text-text-muted hover:text-red-500 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all" title="Delete Permanently">
                    <Trash2 className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                  </button>
                </>
              )}
           </div>
        </div>

        {item.type === 'image' ? (
          <div className="relative rounded-2xl overflow-hidden aspect-video bg-bg-primary border border-border-primary mb-4">
             <img
               src={resolvedImageUrl}
               className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
               alt="Snippet"
               referrerPolicy="no-referrer"
               loading="lazy"
             />
          </div>
        ) : item.checklist ? (
          <div className="flex-1 min-h-[100px] mb-4 px-1 space-y-2">
            <div className="space-y-1.5">
              {item.checklist.filter((i: any) => !i.completed).slice(0, 4).map((task: any) => (
                <div key={task.id} className="flex items-center gap-2 group/task">
                  <div className="h-3.5 w-3.5 rounded-sm border border-border-primary flex-shrink-0" />
                  <span className="text-xs text-text-primary line-clamp-1 font-medium">{task.text}</span>
                </div>
              ))}
            </div>
            {item.checklist.some((i: any) => i.completed) && (
              <div className="pt-2 border-t border-border-primary/50 opacity-50">
                 {item.checklist.filter((i: any) => i.completed).slice(0, 2).map((task: any) => (
                    <div key={task.id} className="flex items-center gap-2">
                      <Check className="h-3 w-3 text-blue-500 flex-shrink-0" />
                      <span className="text-[10px] text-text-muted line-through decoration-blue-500/30 line-clamp-1">{task.text}</span>
                    </div>
                  ))}
              </div>
            )}
            {item.checklist.length > 6 && (
              <p className="text-[8px] font-black text-blue-500 uppercase tracking-widest">+ {item.checklist.length - 6} more tasks</p>
            )}
          </div>
        ) : (
          <div className="flex-1 min-h-[100px] mb-4 px-1">
            <p className="text-text-primary text-sm font-medium leading-relaxed line-clamp-6 whitespace-pre-wrap">
              {item.content}
            </p>
          </div>
        )}

        <div className="flex items-center gap-3 mt-auto pt-4 border-t border-border-primary">
           <div className="flex items-center gap-1.5 text-text-muted text-[9px] font-black uppercase tracking-widest">
              <Clock className="h-3 w-3" />
              {relativeTime}
           </div>
           <div className="text-[8px] font-bold text-text-muted opacity-40 ml-auto uppercase tracking-tighter">
             {formatBytes(item.size || 0)}
           </div>
        </div>

        <div className="flex items-center gap-2 mt-4">
           {item.type === 'image' && (
             <button
              onClick={(e) => {
                e.stopPropagation();
                setIsAnnotating(true);
              }}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl bg-bg-primary border border-border-primary text-text-secondary hover:text-blue-500 hover:bg-blue-500/5 hover:border-blue-500/20 transition-all text-[10px] font-black uppercase tracking-widest"
             >
                <Pencil className="h-3.5 w-3.5" />
                Annotate
             </button>
           )}
        </div>
      </div>

      <AnimatePresence>
        {isAnnotating && (
          <DrawingCanvas
            initialImage={resolvedImageUrl}
            onClose={() => setIsAnnotating(false)}
            onSave={handleAnnotateSave}
          />
        )}
      </AnimatePresence>

    </motion.div>
  );
});

export default ClipboardCard;
