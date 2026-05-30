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
  console.log("[Firebase Auth] Initializing auth state handler...");
  onAuthStateChanged(auth, async (user) => {
    console.log(`[Firebase Auth] Auth state changed. Current User: ${user ? `${user.email} (${user.uid})` : 'Anonymous / None'}`);
    
    // Clean up previous subscription
    if (profileUnsubscribe) {
      console.log("[Firebase Auth] Cleaning up previous user profile listener...");
      profileUnsubscribe();
      profileUnsubscribe = null;
    }

    useStore.getState().setUser(user);
    useStore.getState().setAuthInitialized(true);
    
    if (user) {
      useStore.getState().setIsGuest(false);
      
      const userRef = doc(db, 'users', user.uid);
      console.log(`[Firebase Auth] Ready, subscribing to remote Firestore profile: users/${user.uid}`);
      profileUnsubscribe = onSnapshot(userRef, (docSnap) => {
        if (docSnap.exists()) {
          const profileData = docSnap.data();
          console.log(`[Firebase Auth] Firestore profile snapshot update received:`, profileData);
          useStore.getState().setUserProfile({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            storageUsed: profileData.storageUsed || 0,
            updatedAt: profileData.updatedAt,
          });
        } else {
          console.log(`[Firebase Auth] Remote profile users/${user.uid} not found. Launching initial creation...`);
          setDoc(userRef, {
            userId: user.uid,
            storageUsed: 0,
            updatedAt: serverTimestamp(),
          }, { merge: true }).then(() => {
            console.log(`[Firebase Auth] Initial remote profile created successfully.`);
          }).catch(err => {
            console.error(`[Firebase Auth] Failed to initialize remote user profile record:`, err);
          });
        }
      }, (error) => {
        console.error("[Firebase Auth] Real-time profile sync listener failed:", error);
        useStore.getState().setUserProfile({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          storageUsed: 0,
        });
      });
    } else {
      console.log("[Firebase Auth] No authenticated user detected. Clearing remote userProfile state.");
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
