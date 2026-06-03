import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Sidebar from '../components/layout/Sidebar';
import Navbar from '../components/layout/Navbar';
import MobileNav from '../components/layout/MobileNav';
import ClipboardInput from '../components/clipboard/ClipboardInput';
import ClipboardGrid from '../components/clipboard/ClipboardGrid';
import NoteEditor from '../components/clipboard/NoteEditor';
import { useStore } from '../store/useStore';
import { db, auth, OperationType, handleFirestoreError, storage } from '../services/firebase';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, updateDoc, setDoc, doc, increment, deleteDoc, Query } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import imageCompression from 'browser-image-compression';
import { toast } from 'sonner';
import { cn } from '../utils/utils';
import { Upload, Cloud as CloudIcon, Plus, StickyNote, Clipboard, Trash2, Archive, RotateCcw } from 'lucide-react';

import { handleGlobalPaste as triggerPasteService } from '../services/pasteService';
import { handleImageUpload } from '../services/uploadService';

const Dashboard = () => {
  const {
    user,
    isGuest,
    theme,
    setClipboardItems,
    userProfile,
    storageLimit,
    isMobile,
    setIsMobile,
    isSidebarOpen,
    setIsSidebarOpen,
    activeFilter,
    isNoteEditorOpen,
    setIsNoteEditorOpen,
    isSearchOpen
  } = useStore();
  const [isDragging, setIsDragging] = useState(false);

  const [editorMode, setEditorMode] = useState<'text' | 'checklist'>('text');

  useEffect(() => {
    const handleOpenEditor = (e: any) => {
      setEditorMode(e.detail?.mode || 'text');
      setIsNoteEditorOpen(true);
    };
    globalThis.addEventListener('open-note-editor', handleOpenEditor);
    return () => globalThis.removeEventListener('open-note-editor', handleOpenEditor);
  }, [setIsNoteEditorOpen]);

  useEffect(() => {
    const handlePasteGlobal = () => {
      console.log("Triggering paste from service on button click...");
      triggerPasteService();
    };
    window.addEventListener('clipboard-paste-global', handlePasteGlobal);
    return () => window.removeEventListener('clipboard-paste-global', handlePasteGlobal);
  }, []);

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
        toast.error("Storage limit reached!", {
          description: "Free storage limit reached. Clear space or contact support."
        });
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
        await addDoc(collection(db, 'users', user.uid, 'clips'), itemData);
        await setDoc(doc(db, 'users', user.uid), {
          storageUsed: increment(itemSize),
          updatedAt: serverTimestamp(),
        }, { merge: true });
        toast.success("Snippet saved");
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, `users/${user.uid}/clips`);
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
      toast.success("Saved locally");
    }
  };

  const handleImageFile = useCallback(async (file: File) => {
    console.log(`[Dashboard Ctrl+V Upload] Handling file: ${file.name} (${file.size} bytes)`);
    await handleImageUpload({
      file,
      userId: user?.uid,
      isGuest,
    });
  }, [user, isGuest]);

  const handleGlobalPaste = useCallback(async (e: ClipboardEvent) => {
    // Avoid hijacking normal input/textarea pasting
    const targetTagName = (e.target as HTMLElement)?.tagName;
    const isEditing = ['INPUT', 'TEXTAREA'].includes(targetTagName) ||
                     (e.target as HTMLElement)?.isContentEditable ||
                     (e.target as HTMLElement)?.closest('.note-editor-container');

    if (isEditing) {
      console.log(`[Dashboard Ctrl+V Info] User is actively typing inside an input/textarea element. Allowing native browser paste.`);
      return;
    }

    const clipboardData = e.clipboardData;
    if (!clipboardData) {
      console.warn("[Dashboard Ctrl+V Warning] Paste triggered but no clipboardData found in event.");
      return;
    }

    console.log("[Dashboard Ctrl+V Debug] Clipboard paste event detected globally.", {
      types: clipboardData.types,
      itemsLength: clipboardData.items?.length
    });

    let handled = false;
    const items = Array.from(clipboardData.items);

    // 1. Image Capture (Priority)
    const imageItem = items.find(item => item.type.startsWith('image/'));
    if (imageItem) {
      const file = imageItem.getAsFile();
      if (file) {
        console.log(`[Dashboard Ctrl+V Success] Detected image/screenshot on clipboard: "${file.name}" | Size: ${file.size} bytes`);
        e.preventDefault();
        handled = true;
        // Asynchronously process to keep UI responsive
        setTimeout(() => {
          handleImageFile(file);
        }, 0);
      }
    }

    // 2. Text Capture
    if (!handled) {
      const text = clipboardData.getData('text/plain') || clipboardData.getData('text');
      if (text && text.trim()) {
        console.log(`[Dashboard Ctrl+V Success] Detected plain text input synchronously on clipboard. Content preview length: ${text.length}`);
        e.preventDefault();
        handled = true;
        setTimeout(async () => {
          await saveToClipboard({ type: 'text', content: text.trim() });
        }, 0);
      }
    }

    if (handled) {
      console.log("[Dashboard Ctrl+V Complete] Global event successfully handled and prevented default.");
    }
  }, [saveToClipboard, handleImageFile]);

  useEffect(() => {
    console.log("[Dashboard Core] Registering robust document 'paste' listener for universal Ctrl+V intercept...");
    document.addEventListener('paste', handleGlobalPaste);
    window.addEventListener('paste', handleGlobalPaste);
    return () => {
      console.log("[Dashboard Core] Cleaning up universal 'paste' listeners...");
      document.removeEventListener('paste', handleGlobalPaste);
      window.removeEventListener('paste', handleGlobalPaste);
    };
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
      const fetchItems = (useOrderBy = true): (() => void) => {
        let itemsQuery: Query;
        const clipsRef = collection(db, 'users', user.uid, 'clips');

        if (useOrderBy) {
          itemsQuery = query(
            clipsRef,
            orderBy('createdAt', 'desc')
          );
        } else {
          itemsQuery = clipsRef;
        }

        console.log(`[Realtime Sync] Setting up Firestore listener on path: 'users/${user.uid}/clips' (Ordered: ${useOrderBy})`);

        const unsub = onSnapshot(itemsQuery, { includeMetadataChanges: true }, (snapshot: any) => {
          console.log(`[Realtime Sync] Firestore update triggered. Document count received: ${snapshot.docs.length}. Metadata changes present: ${snapshot.metadata.hasPendingWrites ? 'Local Optimistic Write' : 'Cloud Sync Complete'}`);

          const items = snapshot.docs.map((doc: any) => ({
            id: doc.id,
            ...doc.data({ serverTimestamps: 'estimate' })
          } as any));

          if (!useOrderBy) {
            console.log("[Realtime Sync] Sorting items locally on client side...");
            items.sort((a, b) => {
              const ta = a.createdAt?.toMillis?.() || new Date(a.createdAt).getTime() || 0;
              const tb = b.createdAt?.toMillis?.() || new Date(b.createdAt).getTime() || 0;
              return tb - ta;
            });
          }

          console.log(`[Realtime Sync] Hydrating Zustand store with ${items.length} clips.`);
          setClipboardItems(items);
        }, (error) => {
          console.error(`[Realtime Sync] Subscription caught Firestore connection error:`, error);
          if (error.message.includes('requires an index') && useOrderBy) {
            console.warn("[Realtime Sync] Firestore index missing, falling back to local sort");
            unsubscribeItems?.();
            unsubscribeItems = fetchItems(false);
          } else {
            handleFirestoreError(error, OperationType.GET, `users/${user.uid}/clips`);
          }
        });
        return unsub;
      };

      let unsubscribeItems = fetchItems(true);

      return () => {
        unsubscribeItems?.();
      };
    } else if (isGuest) {
      const localItems = JSON.parse(localStorage.getItem('guest_clipboard') || '[]');
      setClipboardItems(localItems);
    }
  }, [user, isGuest]);

  return (
    <div
      className="flex h-screen overflow-hidden transition-colors duration-500 font-['Poppins'] select-none lg:select-text bg-bg-primary text-text-primary"
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
        <AnimatePresence>
          {isSearchOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-30 pointer-events-none bg-bg-primary/10 backdrop-blur-[3px]"
            />
          )}
        </AnimatePresence>
        <Navbar />

        <div className="flex-1 overflow-y-auto px-4 lg:px-8 pt-20 sm:pt-24 lg:pt-28 pb-40 lg:pb-12 custom-scrollbar">
          <div className="max-w-5xl mx-auto space-y-8 sm:space-y-12">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 sm:gap-6">
              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-500">
                  {activeFilter === 'all' ? 'Unified Stream' :
                  activeFilter === 'notes' ? 'Text Collection' :
                  activeFilter === 'bin' ? 'Cleanup required' : 'Collection'}
                </span>
                <h1 className="text-3xl lg:text-4xl font-black text-text-primary tracking-tight capitalize">
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
                  initialMode={editorMode}
                  onClose={() => {
                    setIsNoteEditorOpen(false);
                    setEditorMode('text');
                  }}
                  onSave={(data) => {
                    saveToClipboard({
                      type: 'text',
                      content: data.content,
                      checklist: data.checklist || null
                    });
                  }}
                />
              )}
            </AnimatePresence>

            {activeFilter === 'all' && (
              <div className="flex flex-col items-center gap-6">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                      const event = new CustomEvent('clipboard-paste-global');
                      window.dispatchEvent(event);
                  }}
                  className="group relative flex items-center justify-center gap-3 w-full max-w-[280px] px-8 py-5 rounded-full bg-bg-secondary border border-blue-500/20 shadow-[0_12px_44px_rgba(59,130,246,0.15)] overflow-hidden transition-all hover:shadow-[0_12px_44px_rgba(59,130,246,0.3)] backdrop-blur-md"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/10 to-blue-500/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />

                  <Clipboard className="h-5 w-5 text-blue-500 relative z-10" />
                  <span className="text-sm font-black text-text-primary relative z-10 tracking-widest uppercase">Paste from Clipboard</span>

                  {/* Subtle Glow */}
                  <div className="absolute -right-4 -top-4 h-16 w-16 bg-blue-500/10 blur-[32px] rounded-full group-hover:bg-blue-500/20 transition-all" />
                </motion.button>
                <ClipboardInput onSave={saveToClipboard} />
              </div>
            )}

            <ClipboardGrid />
          </div>
        </div>

        {isMobile && <MobileNav />}

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
