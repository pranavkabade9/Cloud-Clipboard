import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Sidebar from '../components/layout/Sidebar';
import Navbar from '../components/layout/Navbar';
import MobileNav from '../components/layout/MobileNav';
import ClipboardInput from '../components/clipboard/ClipboardInput';
import ClipboardGrid from '../components/clipboard/ClipboardGrid';
import { useStore } from '../store/useStore';
import { db, auth, OperationType, handleFirestoreError, storage } from '../services/firebase';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, updateDoc, doc, increment } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import imageCompression from 'browser-image-compression';
import { toast } from 'sonner';
import { cn } from '../utils/utils';
import { Upload, Cloud as CloudIcon } from 'lucide-react';

const Dashboard = () => {
  const { user, isGuest, theme, setClipboardItems, setLabels, userProfile, storageLimit, isMobile, setIsMobile } = useStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isDragging, setIsDragging] = useState(false);

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
        await addDoc(collection(db, 'clipboardItems'), itemData);
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
      toast.success("Saved locally");
    }
  };

  const handleImageFile = useCallback(async (file: File) => {
    const loadingToast = toast.loading("Uploading media...");
    const tempId = crypto.randomUUID();
    const { addUploadingItem, removeUploadingItem } = useStore.getState();
    addUploadingItem({ id: tempId, type: 'image' });

    try {
      const options = { maxSizeMB: 0.8, maxWidthOrHeight: 1600, useWebWorker: true };
      const compressedFile = await imageCompression(file, options);
      
      let imageUrl = '';
      if (user) {
        const storageRef = ref(storage, `clips/${user.uid}/${Date.now()}-${file.name.replace(/[^a-z0-9.]/gi, '_')}`);
        const snapshot = await uploadBytes(storageRef, compressedFile);
        imageUrl = await getDownloadURL(snapshot.ref);
      } else {
        const reader = new FileReader();
        imageUrl = await new Promise((resolve) => {
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsDataURL(compressedFile);
        });
      }
      await saveToClipboard({ type: 'image', imageUrl, size: compressedFile.size });
      toast.dismiss(loadingToast);
      toast.success("Saved to vault");
    } catch (err) {
      toast.dismiss(loadingToast);
      toast.error("Upload failed");
      console.error(err);
    } finally {
      removeUploadingItem(tempId);
    }
  }, [user, isGuest, userProfile, storageLimit]);

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
  }, [user, isGuest]);

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
      {!isMobile && <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />}
      
      <main className="relative flex-1 flex flex-col min-w-0 transition-all duration-500 overflow-hidden">
        <Navbar />
        
        <div className="flex-1 overflow-y-auto px-4 lg:px-8 pt-24 lg:pt-28 pb-32 lg:pb-12 custom-scrollbar">
          <div className="max-w-5xl mx-auto space-y-12">
            <div className="flex justify-center">
              <ClipboardInput />
            </div>
            
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
