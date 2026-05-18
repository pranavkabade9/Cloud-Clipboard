import { 
  signInWithPopup, 
  signOut as firebaseSignOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  serverTimestamp,
  onSnapshot 
} from 'firebase/firestore';
import { auth, googleProvider, db } from './firebase';
import { useStore } from '../store/useStore';

let profileUnsubscribe: (() => void) | null = null;

export const initAuth = () => {
  onAuthStateChanged(auth, async (user) => {
    // Clean up previous subscription
    if (profileUnsubscribe) {
      profileUnsubscribe();
      profileUnsubscribe = null;
    }

    useStore.getState().setUser(user);
    useStore.getState().setAuthInitialized(true);
    
    if (user) {
      useStore.getState().setIsGuest(false);
      
      const userRef = doc(db, 'users', user.uid);
      profileUnsubscribe = onSnapshot(userRef, (docSnap) => {
        if (docSnap.exists()) {
          useStore.getState().setUserProfile({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            storageUsed: docSnap.data().storageUsed || 0,
            updatedAt: docSnap.data({ serverTimestamps: 'estimate' }).updatedAt,
          });
        } else {
          setDoc(userRef, {
            userId: user.uid,
            storageUsed: 0,
            updatedAt: serverTimestamp(),
          }, { merge: true });
        }
      }, (error) => {
        console.error("Profile sync failed", error);
        useStore.getState().setUserProfile({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          storageUsed: 0,
        });
      });
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
