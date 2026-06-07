import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sun, 
  Moon, 
  Trash2, 
  LogOut, 
  Database, 
  Download, 
  Upload, 
  Gamepad2, 
  Info, 
  HelpCircle,
  MessageSquare,
  X
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { signOut } from '../../services/auth';
import { formatBytes, cn, getRelativeTime } from '../../utils/utils';
import { toast } from 'sonner';
import { db, handleFirestoreError, OperationType, auth } from '../../services/firebase';
import { collection, query, where, getDocs, deleteDoc, doc, writeBatch, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';

interface SettingsDropdownProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsDropdown = ({ isOpen, onClose }: SettingsDropdownProps) => {
  const { 
    user, 
    userProfile, 
    theme, 
    storageLimit, 
    isGuest,
    isManageDataOpen,
    setIsManageDataOpen,
    clipboardItems,
    setClipboardItems,
    toggleTheme
  } = useStore();

  const storageUsed = userProfile?.storageUsed || 0;
  const storagePercentage = (storageUsed / storageLimit) * 100;

  const handleClearClipboard = async () => {
    const message = "Are you sure you want to clear your entire clipboard? This cannot be undone. All snippets, images, and notes will be permanently deleted.";
    if (!confirm(message)) return;
    
    if (user) {
      try {
        const q = query(collection(db, 'users', user.uid, 'clips'));
        const snapshot = await getDocs(q);
        const batch = writeBatch(db);
        snapshot.docs.forEach((d) => batch.delete(d.ref));
        
        batch.set(doc(db, 'users', user.uid), {
          storageUsed: 0,
          updatedAt: serverTimestamp()
        }, { merge: true });
        
        await batch.commit();
        toast.success("Clipboard cleared");
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}/clips`);
      }
    } else {
      localStorage.removeItem('guest_clipboard');
      setClipboardItems([]);
      toast.success("Guest clipboard cleared");
    }
  };

  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(clipboardItems));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `vault_export_${new Date().toISOString().split('T')[0]}.json`);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    toast.success("Data exported successfully");
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (re) => {
        try {
          const imported = JSON.parse(re.target?.result as string);
          if (!Array.isArray(imported)) throw new Error("Invalid format");
          
          if (user) {
            const batch = writeBatch(db);
            let totalImportSize = 0;
            imported.forEach(item => {
              const newRef = doc(collection(db, 'users', user.uid, 'clips'));
              const { id, ...rest } = item;
              totalImportSize += item.size || 0;
              batch.set(newRef, { 
                ...rest, 
                userId: user.uid, 
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
              });
            });

            await setDoc(doc(db, 'users', user.uid), {
              storageUsed: (userProfile?.storageUsed || 0) + totalImportSize
            }, { merge: true });

            await batch.commit();
            toast.success(`Imported ${imported.length} items`);
          } else if (isGuest) {
            const current = JSON.parse(localStorage.getItem('guest_clipboard') || '[]');
            const updated = [...current, ...imported];
            localStorage.setItem('guest_clipboard', JSON.stringify(updated));
            setClipboardItems(updated);
            toast.success(`Imported ${imported.length} items locally`);
          }
        } catch (err) { 
          toast.error("Invalid format or corrupted file"); 
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              onClose();
              setIsManageDataOpen(false);
            }}
            className="fixed inset-0 z-[100]"
          />
          
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="absolute top-full right-0 mt-4 w-[340px] max-w-[calc(100vw-32px)] max-h-[80vh] overflow-y-auto rounded-[32px] border border-border-primary bg-bg-secondary shadow-2xl backdrop-blur-3xl z-[110] p-6 custom-scrollbar font-['Poppins']"
          >
            <div className="space-y-8">
              {!isManageDataOpen ? (
                <>
                  <div className="space-y-4">
                    <h3 className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] px-2">Account</h3>
                    <div className="flex items-center gap-4 px-2 py-1">
                      <div className="h-12 w-12 rounded-2xl bg-bg-primary border border-border-primary/50 flex items-center justify-center text-text-muted overflow-hidden">
                        {user?.photoURL ? (
                          <img src={user.photoURL} className="w-full h-full object-cover" alt="User" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center bg-blue-500/10 text-blue-500">
                             <Database className="h-6 w-6" />
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col">
                        <p className="text-sm font-black text-text-primary">{user?.displayName || "Guest User"}</p>
                        {user ? (
                           <div className="flex items-center gap-1.5 mt-0.5">
                             <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                             <p className="text-[9px] font-bold text-text-muted uppercase tracking-wider">
                               Synced {getRelativeTime(userProfile?.updatedAt)}
                             </p>
                           </div>
                        ) : (
                          <p className="text-[10px] font-bold text-text-muted truncate max-w-[180px]">{user?.email || "Local storage session"}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] px-2">Appearance</h3>
                    <button
                      onClick={toggleTheme}
                      className="w-full flex items-center gap-4 p-2 rounded-2xl transition-all hover:bg-bg-primary group text-left"
                    >
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-bg-primary border border-border-primary/50 text-text-secondary group-hover:text-blue-500 group-hover:bg-blue-500/10 transition-all">
                        {theme === 'dark' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                      </div>
                      <div>
                        <p className="text-sm font-bold tracking-tight text-text-primary">Theme</p>
                        <p className="text-[10px] font-bold text-text-muted">{theme === 'dark' ? "Dark Mode" : "Light Mode"}</p>
                      </div>
                    </button>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] px-2">Vault Size</h3>
                    <div className="px-2 space-y-3">
                      <div className="flex items-center justify-between">
                         <span className="text-[10px] font-black text-text-muted uppercase">Digital Weight</span>
                         <span className="text-sm font-black text-text-primary">
                           {((storageUsed) / (1024 * 1024)).toFixed(2)} MB / 10 MB Used
                         </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-border-primary overflow-hidden">
                        <motion.div 
                          className="h-full bg-blue-500"
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(storagePercentage, 100)}%` }}
                        />
                      </div>
                    </div>
                    
                    <button
                      onClick={() => setIsManageDataOpen(true)}
                      className="w-full flex items-center gap-4 p-2 rounded-2xl transition-all hover:bg-bg-primary group text-left"
                    >
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-bg-primary border border-border-primary/50 text-text-secondary group-hover:text-blue-500 group-hover:bg-blue-500/10 transition-all">
                        <Database className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold tracking-tight text-text-primary">Manage Clipboard Data</p>
                        <p className="text-[10px] font-bold text-text-muted">Import, Export, Clear All</p>
                      </div>
                    </button>
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={() => {
                        if (isGuest) useStore.getState().setIsGuest(false);
                        else signOut();
                        onClose();
                      }}
                      className="w-full flex items-center gap-4 p-2 rounded-2xl transition-all hover:bg-red-500/5 group text-left"
                    >
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-bg-primary border border-border-primary/50 text-text-secondary group-hover:text-red-500 group-hover:bg-red-500/10 transition-all">
                        <LogOut className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold tracking-tight text-text-primary group-hover:text-red-500">Sign Out</p>
                        <p className="text-[10px] font-bold text-text-muted">Exit session</p>
                      </div>
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-3 mb-6">
                    <button 
                      onClick={() => setIsManageDataOpen(false)}
                      className="p-2 rounded-xl bg-bg-primary border border-border-primary hover:border-blue-500/30 text-text-secondary hover:text-blue-500 transition-all"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    <h3 className="text-lg font-black text-text-primary tracking-tight">Manage Data</h3>
                  </div>

                  <div className="space-y-2">
                    <button
                      onClick={handleImport}
                      className="w-full flex items-center gap-4 p-4 rounded-[24px] transition-all bg-bg-primary border border-border-primary hover:border-blue-500/30 group text-left"
                    >
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-bg-secondary border border-border-primary/50 text-text-secondary group-hover:text-blue-500 group-hover:bg-blue-500/10 transition-all">
                        <Upload className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold tracking-tight text-text-primary">Import Backup</p>
                        <p className="text-[10px] font-bold text-text-muted">Restore from JSON file</p>
                      </div>
                    </button>

                    <button
                      onClick={handleExport}
                      className="w-full flex items-center gap-4 p-4 rounded-[24px] transition-all bg-bg-primary border border-border-primary hover:border-blue-500/30 group text-left"
                    >
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-bg-secondary border border-border-primary/50 text-text-secondary group-hover:text-blue-500 group-hover:bg-blue-500/10 transition-all">
                        <Download className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold tracking-tight text-text-primary">Export Vault</p>
                        <p className="text-[10px] font-bold text-text-muted">Download all data</p>
                      </div>
                    </button>

                    <button
                      onClick={handleClearClipboard}
                      className="w-full flex items-center gap-4 p-4 rounded-[24px] transition-all bg-red-500/5 border border-red-500/10 hover:bg-red-500/10 group text-left mt-8"
                    >
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white dark:bg-neutral-900 border border-red-500/20 text-red-500 transition-all">
                        <Trash2 className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold tracking-tight text-red-500">Atomic Wipe</p>
                        <p className="text-[10px] font-bold text-red-500/60 uppercase">Permanent Deletion</p>
                      </div>
                    </button>
                  </div>

                  <p className="text-[9px] font-medium text-text-muted px-4 text-center mt-6 leading-relaxed">
                    Data management is permanent. We recommend exporting your vault before performing an atomic wipe.
                  </p>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default SettingsDropdown;
