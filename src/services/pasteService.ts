import { toast } from 'sonner';
import { useStore } from '../store/useStore';
import { db, OperationType, handleFirestoreError } from './firebase';
import { collection, addDoc, serverTimestamp, setDoc, doc, increment } from 'firebase/firestore';
import { handleImageUpload } from './uploadService';

export const handleGlobalPaste = async () => {
  const { user, isGuest } = useStore.getState();
  
  try {
    // 1. Feature detection
    if (!navigator.clipboard) {
      throw new Error("Clipboard API not supported in this browser");
    }

    let handled = false;

    // Helper to process plain text
    const processText = async (text: string) => {
      const trimmedText = text.trim();
      if (!trimmedText) return false;

      const itemSize = new Blob([trimmedText]).size;
      
      if (user) {
         const itemData = { 
           type: 'text', 
           content: trimmedText, 
           userId: user.uid, 
           createdAt: serverTimestamp(), 
           size: itemSize, 
           pinned: false 
         };
         
         await addDoc(collection(db, 'users', user.uid, 'clips'), itemData);
         // Use setDoc with { merge: true } to create profile if not exists, preventing updateDoc NOT_FOUND crashes
         await setDoc(doc(db, 'users', user.uid), { 
           storageUsed: increment(itemSize), 
           updatedAt: serverTimestamp() 
         }, { merge: true });
      } else {
         const localItems = JSON.parse(localStorage.getItem('guest_clipboard') || '[]');
         const newItem = { 
           id: crypto.randomUUID(), 
           type: 'text', 
           content: trimmedText, 
           size: itemSize, 
           createdAt: new Date().toISOString(), 
           pinned: false 
         };
         const updated = [newItem, ...localItems];
         localStorage.setItem('guest_clipboard', JSON.stringify(updated));
         useStore.getState().setClipboardItems(updated);
      }
      toast.success("Content pasted to vault");
      return true;
    };

    // 2. Try rich navigator.clipboard.read first
    try {
      console.log("[Paste Service] Pulling full clipboard representation...");
      const items = await navigator.clipboard.read();
      
      for (const item of items) {
        // Image support
        const imageType = item.types.find(t => t.startsWith('image/'));
        if (imageType) {
          console.log(`[Paste Service] Found image of type "${imageType}" in clipboard. Initiating upload...`);
          const blob = await item.getType(imageType);
          const file = new File([blob], `pasted_image_${Date.now()}.png`, { type: imageType });
          await handleImageUpload({ file, userId: user?.uid, isGuest });
          handled = true;
          break; 
        }

        // Text support
        if (item.types.includes('text/plain')) {
          console.log("[Paste Service] Found text/plain in clipboard. Processing clip...");
          const blob = await item.getType('text/plain');
          const text = await blob.text();
          handled = await processText(text);
          if (handled) break;
        }
      }
    } catch (richReadError: any) {
      console.warn("[Paste Service] Failed rich clipboard read, falling back to readText():", richReadError);
      
      // 3. Fallback: Try readText (widely supported, lower security threshold in browsers)
      const text = await navigator.clipboard.readText();
      if (text && text.trim()) {
        handled = await processText(text);
      } else {
        throw richReadError; // Propagate initial error if no fallback text was found
      }
    }

    if (!handled) {
      toast.error("Nothing to paste", { description: "Clipboard is empty or data type is not supported yet." });
    }
  } catch (err: any) {
    console.error("[Paste Service] Fatal Clipboard API Error:", err);
    if (err.name === 'NotAllowedError') {
      toast.error("Allow clipboard access", { 
        description: "Please check your browser site options to unlock clipboard permissions." 
      });
    } else {
      toast.error("Failed to paste", { description: err.message || "An unexpected error occurred." });
    }
  }
};
