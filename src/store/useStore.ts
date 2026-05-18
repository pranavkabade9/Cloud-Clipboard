import { create } from 'zustand';
import { User as FirebaseUser } from 'firebase/auth';

interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  storageUsed: number;
  updatedAt?: any;
}

interface ClipboardItem {
  id: string;
  type: 'text' | 'image' | 'sketch';
  content?: string;
  imageUrl?: string;
  size: number;
  labelId?: string;
  pinned: boolean;
  archived?: boolean;
  deleted?: boolean;
  reminder?: string | null;
  createdAt: any;
  userId: string;
  metadata?: any;
  isOptimistic?: boolean;
}

interface Label {
  id: string;
  name: string;
  color?: string;
}

interface AppState {
  user: FirebaseUser | null;
  userProfile: UserProfile | null;
  isGuest: boolean;
  clipboardItems: ClipboardItem[];
  uploadingItems: Partial<ClipboardItem>[];
  labels: Label[];
  storageLimit: number;
  theme: 'dark' | 'light';
  searchQuery: string;
  activeFilter: string;
  animationsEnabled: boolean;
  isMobile: boolean;
  isSidebarOpen: boolean;
  isNoteEditorOpen: boolean;
  isSettingsOpen: boolean;
  isManageDataOpen: boolean;
  authInitialized: boolean;
  undoAction: {
    message: string;
    action: () => void;
    id: string;
  } | null;
  
  setAuthInitialized: (initialized: boolean) => void;
  setUser: (user: FirebaseUser | null) => void;
  setUserProfile: (profile: UserProfile | null) => void;
  setIsGuest: (isGuest: boolean) => void;
  setClipboardItems: (items: ClipboardItem[]) => void;
  addUploadingItem: (item: Partial<ClipboardItem>) => void;
  removeUploadingItem: (id: string) => void;
  setLabels: (labels: Label[]) => void;
  setTheme: (theme: 'dark' | 'light') => void;
  toggleTheme: () => void;
  setSearchQuery: (query: string) => void;
  setActiveFilter: (filter: string) => void;
  setAnimationsEnabled: (enabled: boolean) => void;
  setIsMobile: (isMobile: boolean) => void;
  setIsSidebarOpen: (isOpen: boolean) => void;
  setIsNoteEditorOpen: (isOpen: boolean) => void;
  setIsSettingsOpen: (isOpen: boolean) => void;
  setIsManageDataOpen: (isOpen: boolean) => void;
  setUndoAction: (action: { message: string; action: () => void; id: string } | null) => void;
}

export const useStore = create<AppState>((set) => ({
  user: null,
  userProfile: null,
  isGuest: localStorage.getItem('is_guest') === 'true',
  clipboardItems: [],
  uploadingItems: [],
  labels: [],
  storageLimit: 10 * 1024 * 1024,
  theme: (localStorage.getItem('theme') as 'dark' | 'light') || 'light',
  searchQuery: '',
  activeFilter: 'all',
  animationsEnabled: JSON.parse(localStorage.getItem('animations_enabled') ?? 'true'),
  isMobile: false,
  isSidebarOpen: true,
  isNoteEditorOpen: false,
  isSettingsOpen: false,
  isManageDataOpen: false,
  authInitialized: false,
  undoAction: null,

  setAuthInitialized: (authInitialized) => set({ authInitialized }),
  setUser: (user) => set({ user }),
  setUserProfile: (userProfile) => set({ userProfile }),
  setIsGuest: (isGuest) => {
    localStorage.setItem('is_guest', String(isGuest));
    set({ isGuest });
  },
  setClipboardItems: (clipboardItems) => set({ clipboardItems }),
  addUploadingItem: (item) => set((state) => ({ uploadingItems: [item, ...state.uploadingItems] })),
  removeUploadingItem: (id) => set((state) => ({ uploadingItems: state.uploadingItems.filter(i => i.id !== id) })),
  setLabels: (labels) => set({ labels }),
  setTheme: (theme) => {
    localStorage.setItem('theme', theme);
    set({ theme });
  },
  toggleTheme: () => set((state) => {
    const newTheme = state.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('theme', newTheme);
    return { theme: newTheme };
  }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setActiveFilter: (activeFilter) => set({ activeFilter }),
  setAnimationsEnabled: (animationsEnabled) => {
    localStorage.setItem('animations_enabled', JSON.stringify(animationsEnabled));
    set({ animationsEnabled });
  },
  setIsMobile: (isMobile) => set({ isMobile }),
  setIsSidebarOpen: (isSidebarOpen) => set({ isSidebarOpen }),
  setIsNoteEditorOpen: (isNoteEditorOpen) => set({ isNoteEditorOpen }),
  setIsSettingsOpen: (isSettingsOpen) => set({ isSettingsOpen }),
  setIsManageDataOpen: (isManageDataOpen) => set({ isManageDataOpen }),
  setUndoAction: (undoAction) => set({ undoAction }),
}));


