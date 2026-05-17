import { create } from 'zustand';
import { User as FirebaseUser } from 'firebase/auth';

interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  storageUsed: number;
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
  authInitialized: boolean;
  history: any[];
  
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
  pushToHistory: (action: { type: string; payload: any }) => void;
  undo: () => any;
  refreshData: () => void;
  refreshTrigger: number;
}

export const useStore = create<AppState>((set) => ({
  user: null,
  userProfile: null,
  isGuest: false,
  clipboardItems: [],
  uploadingItems: [],
  labels: [],
  storageLimit: 5 * 1024 * 1024 * 1024,
  theme: (localStorage.getItem('theme') as 'dark' | 'light') || 'dark',
  searchQuery: '',
  activeFilter: 'all',
  animationsEnabled: JSON.parse(localStorage.getItem('animations_enabled') ?? 'true'),
  isMobile: false,
  isSidebarOpen: true,
  isNoteEditorOpen: false,
  isSettingsOpen: false,
  authInitialized: false,
  history: [],
  refreshTrigger: 0,

  setAuthInitialized: (authInitialized) => set({ authInitialized }),
  setUser: (user) => set({ user }),
  setUserProfile: (userProfile) => set({ userProfile }),
  setIsGuest: (isGuest) => set({ isGuest }),
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
  pushToHistory: (action) => set((state) => ({ 
    history: [action, ...state.history].slice(0, 50) 
  })),
  undo: () => {
    let lastAction = null;
    set((state) => {
      if (state.history.length === 0) return state;
      const [action, ...rest] = state.history;
      lastAction = action;
      return { history: rest };
    });
    return lastAction;
  },
  refreshData: () => set((state) => ({ refreshTrigger: state.refreshTrigger + 1 })),
}));


