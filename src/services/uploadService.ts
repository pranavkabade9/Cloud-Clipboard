import { 
  ref, 
  uploadBytesResumable, 
  getDownloadURL, 
  deleteObject 
} from 'firebase/storage';
import { 
  collection, 
  addDoc, 
  serverTimestamp, 
  doc, 
  updateDoc, 
  increment 
} from 'firebase/firestore';
import { storage, db, OperationType, handleFirestoreError } from './firebase';
import { useStore } from '../store/useStore';
import imageCompression from 'browser-image-compression';
import { toast } from 'sonner';
import { setMedia } from '../utils/idb';

interface UploadParams {
  file: File;
  userId?: string;
  isGuest: boolean;
  onSuccess?: () => void;
  onError?: (error: any) => void;
  skipCompression?: boolean;
}

export const handleImageUpload = async ({ 
  file, 
  userId, 
  isGuest, 
  onSuccess, 
  onError,
  skipCompression = false
}: UploadParams) => {
  const { addUploadingItem, removeUploadingItem, setClipboardItems } = useStore.getState();
  const tempId = crypto.randomUUID();
  const previewUrl = URL.createObjectURL(file);
  
  // 1. Instant local preview
  addUploadingItem({ 
    id: tempId, 
    type: 'image', 
    imageUrl: previewUrl,
    isOptimistic: true 
  });

  const loadingToast = toast.loading("Processing image...", {
    description: "Hang tight, we're optimizing your media."
  });

  try {
    // 2. Async Lightweight Compression
    let compressedFile = file;
    
    if (!skipCompression) {
      const options = {
        maxSizeMB: 0.8,
        maxWidthOrHeight: 1600,
        useWebWorker: true,
        initialQuality: 0.8,
        fileType: 'image/webp'
      };
      // We run compression but don't let it block the main thread more than necessary
      compressedFile = await imageCompression(file, options);
    }
    
    let finalImageUrl = '';
    let storagePath = '';

    if (!isGuest && userId) {
      // 3. Managed Firebase Upload
      toast.loading("Syncing to vault...", { id: loadingToast });
      
      storagePath = `clips/${userId}/${Date.now()}_${file.name.replace(/[^a-z0-9.]/gi, '_')}`;
      const storageRef = ref(storage, storagePath);
      const uploadTask = uploadBytesResumable(storageRef, compressedFile);

      finalImageUrl = await new Promise((resolve, reject) => {
        uploadTask.on('state_changed', 
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            // We could update progress UI here if needed
          }, 
          (error) => reject(error), 
          async () => {
            const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(downloadUrl);
          }
        );
      });
    } else {
      // 4. Guest Mode - use IndexedDB instead of Base64
      const mediaId = crypto.randomUUID();
      await setMedia(mediaId, compressedFile);
      finalImageUrl = `idb://${mediaId}`; // Custom protocol for IDB lookup
    }

    // 5. Create Clipboard Item
    const itemSize = compressedFile.size;
    const itemData: any = {
      type: 'image',
      imageUrl: finalImageUrl,
      size: itemSize,
      pinned: false,
      createdAt: isGuest ? new Date().toISOString() : serverTimestamp(),
      userId: userId || 'guest',
      metadata: {
        name: file.name,
        type: file.type,
        storagePath: storagePath
      }
    };

    if (!isGuest && userId) {
      await addDoc(collection(db, 'clipboardItems'), itemData);
      await updateDoc(doc(db, 'users', userId), {
        storageUsed: increment(itemSize),
        updatedAt: serverTimestamp()
      });
    } else {
      const localItems = JSON.parse(localStorage.getItem('guest_clipboard') || '[]');
      const newItem = { id: crypto.randomUUID(), ...itemData };
      const updatedItems = [newItem, ...localItems];
      localStorage.setItem('guest_clipboard', JSON.stringify(updatedItems));
      setClipboardItems(updatedItems);
    }

    toast.success("Saved perfectly", { id: loadingToast });
    onSuccess?.();
  } catch (error) {
    console.error("Upload pipeline failed:", error);
    toast.error("Failed to save image", { id: loadingToast });
    onError?.(error);
  } finally {
    removeUploadingItem(tempId);
    URL.revokeObjectURL(previewUrl);
  }
};
