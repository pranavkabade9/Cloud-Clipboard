import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Sidebar from '../components/layout/Sidebar';
import Navbar from '../components/layout/Navbar';
import MobileNav from '../components/layout/MobileNav';
import FloatingHub from '../components/layout/FloatingHub';
import ClipboardInput from '../components/clipboard/ClipboardInput';
import ClipboardGrid from '../components/clipboard/ClipboardGrid';
import NoteEditor from '../components/clipboard/NoteEditor';
import { useStore } from '../store/useStore';
import { db, auth, OperationType, handleFirestoreError, storage } from '../services/firebase';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, updateDoc, doc, increment, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import imageCompression from 'browser-image-compression';
import { toast } from 'sonner';
import { cn } from '../utils/utils';
import { Upload, Cloud as CloudIcon, Plus, StickyNote } from 'lucide-react';

import { handleImageUpload } from '../services/uploadService';

const Dashboard = () => {
  const { 
    user, 
    isGuest, 
    theme, 
    setClipboardItems, 
    setLabels, 
    userProfile, 
    storageLimit, 
    isMobile, 
    setIsMobile,
    isSidebarOpen,
    setIsSidebarOpen,
    activeFilter,
    isNoteEditorOpen,
    setIsNoteEditorOpen,
    undo,
    refreshTrigger
  } = useStore();
  const [isDragging, setIsDragging] = useState(false);

  const handleUndoAction = useCallback(async () => {
    const lastAction = undo();
    if (!lastAction) return;

    const { type, payload } = lastAction;
    
    try {
      if (type === 'CLIP_DELETE') {
        const { id, originalState } = payload;
        if (user) {
          await updateDoc(doc(db, 'clipboardItems', id), originalState);
        } else if (isGuest) {
          const localItems = JSON.parse(localStorage.getItem('guest_clipboard') || '[]');
          const updated = localItems.map((i: any) => i.id === id ? { ...i, ...originalState } : i);
          localStorage.setItem('guest_clipboard', JSON.stringify(updated));
          useStore.getState().setClipboardItems(updated);
        }
        toast.info("Delete undone");
      } else if (type === 'CLIP_CREATE') {
        // Undo create = delete
        const { id, size } = payload;
        if (user) {
          await deleteDoc(doc(db, 'clipboardItems', id));
          await updateDoc(doc(db, 'users', user.uid), {
            storageUsed: increment(-size),
            updatedAt: serverTimestamp()
          });
        } else if (isGuest) {
          const localItems = JSON.parse(localStorage.getItem('guest_clipboard') || '[]');
          const filtered = localItems.filter((i: any) => i.id !== id);
          localStorage.setItem('guest_clipboard', JSON.stringify(filtered));
          useStore.getState().setClipboardItems(filtered);
        }
        toast.info("Creation undone");
      } else if (type === 'CLIP_EDIT') {
        const { id, previousContent } = payload;
        if (user) {
          await updateDoc(doc(db, 'clipboardItems', id), { content: previousContent });
        } else if (isGuest) {
          const localItems = JSON.parse(localStorage.getItem('guest_clipboard') || '[]');
          const updated = localItems.map((i: any) => i.id === id ? { ...i, content: previousContent } : i);
          localStorage.setItem('guest_clipboard', JSON.stringify(updated));
          useStore.getState().setClipboardItems(updated);
        }
        toast.info("Edit undone");
      }
    } catch (error) {
      console.error("Undo failed:", error);
      toast.error("Could not undo action");
    }
  }, [undo, user, isGuest]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl + Z Undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        const active = document.activeElement;
        if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) return;
        e.preventDefault();
        handleUndoAction();
      }
      
      // Refresh with 'r' key (if not in input)
      if (e.key.toLowerCase() === 'r') {
        const active = document.activeElement;
        if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) return;
        e.preventDefault();
        useStore.getState().refreshData();
        toast.info("Vault refreshed");
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndoAction]);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) setIsSidebarOpen(false);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const saveToClipboard = async (data: any) => {
    const itemSize = data.type === 'text' ? new Blob([data.content]).size : data.size || 0;
    
    if (user && userProfile) {
      if (userProfile.storageUsed + itemSize > storageLimit) {
        toast.error("Storage limit reached!");
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
          pinned: data.pinned || false,
        };
        await addDoc(collection(db, 'clipboardItems'), itemData).then(docRef => {
          useStore.getState().pushToHistory({
            type: 'CLIP_CREATE',
            payload: { id: docRef.id, size: itemSize }
          });
        });
        await updateDoc(doc(db, 'users', user.uid), {
          storageUsed: increment(itemSize),
          updatedAt: serverTimestamp(),
        });
        toast.success("Snippet saved");
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
        pinned: data.pinned || false,
      };
      const updatedItems = [newItem, ...localItems];
      localStorage.setItem('guest_clipboard', JSON.stringify(updatedItems));
      setClipboardItems(updatedItems);
      useStore.getState().pushToHistory({
        type: 'CLIP_CREATE',
        payload: { id: newItem.id, size: itemSize }
      });
      toast.success("Saved locally");
    }
  };

  const handleImageFile = useCallback(async (file: File) => {
    await handleImageUpload({
      file,
      userId: user?.uid,
      isGuest,
    });
  }, [user, isGuest]);

  const handleGlobalPaste = useCallback(async (e: ClipboardEvent) => {
    if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

    const items = e.clipboardData?.items;
    if (!items) return;

    let handled = false;
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          handleImageFile(file);
          handled = true;
        }
      } else if (item.type === 'text/plain') {
        item.getAsString(async (text) => {
          if (text.trim()) {
            await saveToClipboard({ type: 'text', content: text.trim() });
          }
        });
        handled = true;
      }
    }
    if (handled) e.preventDefault();
  }, [saveToClipboard, handleImageFile]);

  useEffect(() => {
    window.addEventListener('paste', handleGlobalPaste);
    return () => window.removeEventListener('paste', handleGlobalPaste);
  }, [handleGlobalPaste]);

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.relatedTarget === null) {
      setIsDragging(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files) as File[];
    files.forEach(file => {
      if (file.type && file.type.startsWith('image/')) {
        handleImageFile(file);
      }
    });
  };

  useEffect(() => {
    if (user) {
      const itemsQuery = query(
        collection(db, 'clipboardItems'),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );

      const unsubscribeItems = onSnapshot(itemsQuery, (snapshot) => {
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
        setClipboardItems(items);
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, 'clipboardItems');
      });

      const labelsQuery = query(
        collection(db, 'labels'),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'asc')
      );

      const unsubscribeLabels = onSnapshot(labelsQuery, (snapshot) => {
        const labels = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
        setLabels(labels);
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, 'labels');
      });

      return () => {
        unsubscribeItems();
        unsubscribeLabels();
      };
    } else if (isGuest) {
      const localItems = JSON.parse(localStorage.getItem('guest_clipboard') || '[]');
      setClipboardItems(localItems);
      const localLabels = JSON.parse(localStorage.getItem('guest_labels') || '[]');
      setLabels(localLabels);
    }
  }, [user, isGuest, refreshTrigger]);

  return (
    <div 
      className={cn(
        "flex h-screen overflow-hidden transition-colors duration-500 font-['Poppins'] select-none lg:select-text",
        theme === 'dark' ? "bg-neutral-950 text-neutral-100" : "bg-neutral-50 text-neutral-900"
      )}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <AnimatePresence mode="wait">
        {(!isMobile || isSidebarOpen) && (
          <motion.div
            initial={isMobile ? { x: -300 } : false}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={cn(
              isMobile ? "fixed inset-y-0 left-0 z-[110] shadow-2xl" : "relative"
            )}
          >
            <Sidebar />
          </motion.div>
        )}
      </AnimatePresence>

      {isMobile && isSidebarOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[105]"
        />
      )}
      
      <main className="relative flex-1 flex flex-col min-w-0 transition-all duration-500 overflow-hidden">
        <Navbar />
        
        <div className="flex-1 overflow-y-auto px-4 lg:px-8 pt-24 lg:pt-28 pb-32 lg:pb-12 custom-scrollbar">
          <div className="max-w-5xl mx-auto space-y-12">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-500">
                  {activeFilter === 'all' ? 'Unified Stream' : 
                  activeFilter === 'reminders' ? 'Time Sensitive' :
                  activeFilter === 'notes' ? 'Text Collection' :
                  activeFilter === 'images' ? 'Media Gallery' :
                  activeFilter === 'bin' ? 'Cleanup required' : 'Collection'}
                </span>
                <h1 className="text-3xl lg:text-4xl font-black dark:text-white text-neutral-900 tracking-tight capitalize">
                  {activeFilter === 'all' ? 'Everything' : activeFilter}
                </h1>
              </div>

              {activeFilter === 'notes' && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setIsNoteEditorOpen(true)}
                  className="flex items-center gap-3 px-6 py-3.5 rounded-2xl bg-blue-500 hover:bg-blue-600 text-white font-bold transition-all shadow-xl shadow-blue-500/20"
                >
                  <Plus className="h-4 w-4" />
                  New Note
                </motion.button>
              )}
            </div>

            <AnimatePresence>
              {isNoteEditorOpen && (
                <NoteEditor 
                  isOpen={isNoteEditorOpen}
                  onClose={() => setIsNoteEditorOpen(false)}
                  onSave={(content) => {
                    saveToClipboard({
                      type: 'text',
                      content: content,
                    });
                  }}
                />
              )}
            </AnimatePresence>

            {activeFilter === 'all' && (
              <div className="flex justify-center">
                <ClipboardInput onSave={saveToClipboard} />
              </div>
            )}
            
            <ClipboardGrid />
          </div>
        </div>

        {isMobile && <MobileNav />}
        <FloatingHub />

        <AnimatePresence>
          {isDragging && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center bg-blue-500/10 backdrop-blur-xl pointer-events-none"
            >
              <div className="flex flex-col items-center gap-6 p-16 rounded-[64px] border-4 border-dashed border-blue-500/30 bg-neutral-900/40 shadow-2xl">
                 <div className="h-24 w-24 rounded-full bg-blue-500/20 flex items-center justify-center ring-8 ring-blue-500/10 mb-2">
                    <CloudIcon className="h-12 w-12 text-blue-500 animate-bounce" />
                 </div>
                 <div className="text-center">
                    <h2 className="text-4xl font-black text-white px-8">Drop to save</h2>
                    <p className="text-blue-400 font-bold uppercase tracking-[0.3em] text-[10px] mt-4">Safe & Secure Upload</p>
                 </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default Dashboard;
