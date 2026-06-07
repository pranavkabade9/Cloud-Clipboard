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
  setDoc, 
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
  const { addUploadingItem, removeUploadingItem, setClipboardItems, storageLimit, userProfile } = useStore.getState();
  const tempId = crypto.randomUUID();
  const previewUrl = URL.createObjectURL(file);

  console.log(`[Upload Pipeline] Selected file: "${file.name}" | Size: ${file.size} bytes | MIME: ${file.type}`);
  console.log(`[Upload Pipeline] Context details - User ID: ${userId || 'guest'} | isGuest: ${isGuest}`);

  // 0. File Format & Limit Validation
  if (!file.type.startsWith('image/')) {
    console.error(`[Upload Pipeline] Validation Failed: unsupported file type "${file.type}"`);
    toast.error("Unsupported file type!", { description: "Please select an image file." });
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    onError?.(new Error("Unsupported file type"));
    return;
  }

  const currentUsage = userProfile?.storageUsed || 0;
  console.log(`[Upload Pipeline] Storage quota check - Current: ${currentUsage} / Limit: ${storageLimit} bytes`);
  
  if (currentUsage + file.size > storageLimit) {
    console.error(`[Upload Pipeline] Validation Failed: storage quota limit exceeded. Space requested: ${file.size} bytes, space left: ${storageLimit - currentUsage} bytes.`);
    toast.error("Storage limit exceeded!", {
      description: `Your vault is limited to 10 MB. ${Math.round((storageLimit - currentUsage) / 1024 / 1024 * 100) / 100} MB remaining.`
    });
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    onError?.(new Error("Quota Exceeded"));
    return;
  }

  console.log(`[Upload Pipeline] Validation passed. Registering immediate optimistic UI item: ${tempId}`);
  // 1. Instant local preview
  addUploadingItem({ 
    id: tempId, 
    type: 'image', 
    imageUrl: previewUrl,
    isOptimistic: true 
  });

  const loadingToast = toast.loading("Processing image...", {
    description: "Optimizing clip."
  });

  try {
    // 2. Async Lightweight Compression
    let compressedFile = file;
    
    if (!skipCompression) {
      console.log(`[Upload Pipeline] Initializing async compression using browser-image-compression...`);
      const options = {
        maxSizeMB: 0.8,
        maxWidthOrHeight: 1600,
        useWebWorker: true,
        initialQuality: 0.8,
        fileType: 'image/webp'
      };
      try {
        const result = await imageCompression(file, options);
        compressedFile = result;
        console.log(`[Upload Pipeline] Compression complete. Size optimization: ${file.size} -> ${compressedFile.size} bytes (${Math.round((compressedFile.size / file.size) * 100)}% of original size)`);
      } catch (e) {
        console.warn("[Upload Pipeline] Warning: Compression task failed, falling back to original file:", e);
      }
    } else {
      console.log(`[Upload Pipeline] Compression bypassed due to skipCompression instructions.`);
    }
    
    let finalImageUrl = '';
    let storagePath = '';

    if (!isGuest && userId) {
      // 3. Managed Firebase Upload
      console.log(`[Upload Pipeline] Starting Firebase Cloud Storage upload...`);
      toast.loading("Uploading to cloud...", { id: loadingToast });
      
      storagePath = `clips/${userId}/${Date.now()}_${file.name.replace(/[^a-z0-9.]/gi, '_')}`;
      const storageRef = ref(storage, storagePath);
      const uploadTask = uploadBytesResumable(storageRef, compressedFile);

      finalImageUrl = await new Promise<string>((resolve, reject) => {
        const timeout = setTimeout(() => {
           console.error("[Upload Pipeline] Resumable upload process hit 30-second timeout. Cancelling uploadTask.");
           uploadTask.cancel();
           reject(new Error("Upload timeout (30 seconds)"));
        }, 30000);

        uploadTask.on('state_changed', 
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            console.log(`[Upload Pipeline] Resumable progress sync: ${Math.round(progress)}% (${snapshot.bytesTransferred}/${snapshot.totalBytes} bytes)`);
          }, 
          (error) => {
            console.error(`[Upload Pipeline] Resumable upload listener caught error:`, error);
            clearTimeout(timeout);
            reject(error);
          }, 
          async () => {
            clearTimeout(timeout);
            try {
              console.log(`[Upload Pipeline] UploadTask completed successfully. Resolving download URL...`);
              const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
              console.log(`[Upload Pipeline] URL resolved: ${downloadUrl}`);
              resolve(downloadUrl);
            } catch (e) {
              reject(e);
            }
          }
        );
      });
    } else {
      // 4. Guest Mode - use IndexedDB instead of Base64
      console.log(`[Upload Pipeline] Guest Mode active. Persisting compressed image locally into IndexedDB block...`);
      const mediaId = crypto.randomUUID();
      await setMedia(mediaId, compressedFile);
      finalImageUrl = `idb://${mediaId}`; // Custom protocol for IDB lookup
      console.log(`[Upload Pipeline] Local IndexedDB persistence completed with ID: ${mediaId}`);
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
      console.log(`[Upload Pipeline] Saving clip metadata database record in 'users/${userId}/clips'...`);
      await addDoc(collection(db, 'users', userId, 'clips'), itemData);
      console.log(`[Upload Pipeline] Incrementing storage footprint in root user profile record...`);
      await setDoc(doc(db, 'users', userId), {
        storageUsed: increment(itemSize),
        updatedAt: serverTimestamp()
      }, { merge: true });
      console.log(`[Upload Pipeline] Firestore storage usage updated successfully by ${itemSize} bytes.`);
    } else {
      const localItems = JSON.parse(localStorage.getItem('guest_clipboard') || '[]');
      const newItem = { id: crypto.randomUUID(), ...itemData };
      const updatedItems = [newItem, ...localItems];
      localStorage.setItem('guest_clipboard', JSON.stringify(updatedItems));
      setClipboardItems(updatedItems);
      console.log(`[Upload Pipeline] Guest items array updated. Count: ${updatedItems.length}`);
    }

    toast.success("Saved perfectly", { id: loadingToast });
    onSuccess?.();
  } catch (error: any) {
    console.error("[Upload Pipeline] FATAL: pipeline execution crashed:", error);
    const errorDetail = error?.message || String(error);
    const errorMsg = errorDetail.includes('Quota exceeded') ? "Storage quota exceeded" : `Failed to save image.`;
    toast.error(errorMsg, { 
      id: loadingToast,
      description: errorDetail.length > 80 ? `${errorDetail.substring(0, 80)}...` : errorDetail
    });
    onError?.(error);
  } finally {
    console.log(`[Upload Pipeline] Reclaim task lifecycle: removing optimistic loading card with ID ${tempId}.`);
    removeUploadingItem(tempId);
    if (previewUrl) {
      console.log(`[Upload Pipeline] Reclaiming local objectURL memory allocation: ${previewUrl}`);
      URL.revokeObjectURL(previewUrl);
    }
  }
};
