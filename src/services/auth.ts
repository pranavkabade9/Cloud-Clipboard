import { 
  signInWithPopup, 
  signOut as firebaseSignOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { auth, googleProvider, db } from './firebase';
import { useStore } from '../store/useStore';

export const initAuth = () => {
  onAuthStateChanged(auth, async (user) => {
    useStore.getState().setUser(user);
    useStore.getState().setAuthInitialized(true);
    if (user) {
      useStore.getState().setIsGuest(false);
      try {
        // Fetch user profile from Firestore
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          useStore.getState().setUserProfile({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            storageUsed: userSnap.data().storageUsed || 0,
          });
        } else {
          // Create initial profile
          const initialProfile = {
            userId: user.uid,
            storageUsed: 0,
            updatedAt: serverTimestamp(),
          };
          await setDoc(userRef, initialProfile);
          useStore.getState().setUserProfile({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            storageUsed: 0,
          });
        }
      } catch (error) {
        console.error("Failed to sync profile", error);
        // Set a basic profile if Firestore fails but user is authenticated
        useStore.getState().setUserProfile({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          storageUsed: 0,
        });
      }
    } else {
      useStore.getState().setUserProfile(null);
    }
  });
};

export const signInWithGoogle = async () => {
  try {
    await signInWithPopup(auth, googleProvider);
  } catch (error) {
    console.error("Sign in failed", error);
    throw error;
  }
};

export const signOut = async () => {
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    console.error("Sign out failed", error);
  }
};
