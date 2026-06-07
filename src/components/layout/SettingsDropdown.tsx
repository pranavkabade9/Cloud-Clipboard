import React from 'react';
import { motion } from 'motion/react';
import { Sun, Moon, Trash2, LogOut, Database, Download, Upload, X } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { signOut } from '../../services/auth';
import { getRelativeTime } from '../../utils/utils';
import { toast } from 'sonner';
import { db, handleFirestoreError, OperationType } from '../../services/firebase';
import { collection, query, getDocs, doc, writeBatch, serverTimestamp, setDoc } from 'firebase/firestore';

interface SettingsDropdownProps {
  isOpen?: boolean;
  onClose: () => void;
}

const SettingsDropdown = ({ onClose }: SettingsDropdownProps) => {
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

  const closeSettings = () => {
    setIsManageDataOpen(false);
    onClose();
  };

  const handleClearClipboard = async () => {
    const message = 'Are you sure you want to clear your entire clipboard? This cannot be undone. All snippets, images, and notes will be permanently deleted.';
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
        toast.success('Clipboard cleared');
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}/clips`);
      }
    } else {
      localStorage.removeItem('guest_clipboard');
      setClipboardItems([]);
      toast.success('Guest clipboard cleared');
    }
  };

  const handleExport = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(clipboardItems));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute('href', dataStr);
    downloadAnchorNode.setAttribute('download', `clipboard_export_${new Date().toISOString().split('T')[0]}.json`);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    toast.success('Data exported successfully');
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
          if (!Array.isArray(imported)) throw new Error('Invalid format');

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
          toast.error('Invalid format or corrupted file');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  return (
    <div className="p-5 sm:p-6 font-['Poppins']">
      <div className="mb-6 flex items-start justify-between gap-4 pr-12">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-blue-500">Profile Settings</p>
          <h2 className="mt-1 text-2xl font-black tracking-tight text-text-primary">Account</h2>
        </div>
        <button
          onClick={closeSettings}
          className="rounded-2xl border border-border-primary bg-bg-primary/70 p-2.5 text-text-secondary transition-all hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          aria-label="Close settings"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-8">
        {!isManageDataOpen ? (
          <>
            <div className="space-y-4">
              <h3 className="px-2 text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">Account</h3>
              <div className="flex items-center gap-4 rounded-[24px] border border-border-primary bg-bg-primary/60 px-4 py-3">
                <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl border border-border-primary/50 bg-bg-secondary text-text-muted">
                  {user?.photoURL ? (
                    <img src={user.photoURL} className="h-full w-full object-cover" alt="User" />
                  ) : (
                    <Database className="h-6 w-6 text-blue-500" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black text-text-primary">{user?.displayName || 'Guest User'}</p>
                  {user ? (
                    <div className="mt-0.5 flex items-center gap-1.5">
                      <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                      <p className="text-[9px] font-bold uppercase tracking-wider text-text-muted">Synced {getRelativeTime(userProfile?.updatedAt)}</p>
                    </div>
                  ) : (
                    <p className="truncate text-[10px] font-bold text-text-muted">Local storage session</p>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="px-2 text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">Appearance</h3>
              <button onClick={toggleTheme} className="group flex w-full items-center gap-4 rounded-2xl p-2 text-left transition-all hover:bg-bg-primary">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border-primary/50 bg-bg-primary text-text-secondary transition-all group-hover:bg-blue-500/10 group-hover:text-blue-500">
                  {theme === 'dark' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                </div>
                <div>
                  <p className="text-sm font-bold tracking-tight text-text-primary">Theme</p>
                  <p className="text-[10px] font-bold text-text-muted">{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</p>
                </div>
              </button>
            </div>

            <div className="space-y-4">
              <h3 className="px-2 text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">Storage</h3>
              <div className="space-y-3 px-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[10px] font-black uppercase text-text-muted">Clipboard Size</span>
                  <span className="text-sm font-black text-text-primary">{(storageUsed / (1024 * 1024)).toFixed(2)} MB / 10 MB Used</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-border-primary">
                  <motion.div className="h-full bg-blue-500" initial={{ width: 0 }} animate={{ width: `${Math.min(storagePercentage, 100)}%` }} />
                </div>
              </div>

              <button onClick={() => setIsManageDataOpen(true)} className="group flex w-full items-center gap-4 rounded-2xl p-2 text-left transition-all hover:bg-bg-primary">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border-primary/50 bg-bg-primary text-text-secondary transition-all group-hover:bg-blue-500/10 group-hover:text-blue-500">
                  <Database className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-bold tracking-tight text-text-primary">Manage Clipboard Data</p>
                  <p className="text-[10px] font-bold text-text-muted">Import, export, clear all</p>
                </div>
              </button>
            </div>

            <button
              onClick={() => {
                if (isGuest) useStore.getState().setIsGuest(false);
                else signOut();
                closeSettings();
              }}
              className="group flex w-full items-center gap-4 rounded-2xl p-2 text-left transition-all hover:bg-red-500/5"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border-primary/50 bg-bg-primary text-text-secondary transition-all group-hover:bg-red-500/10 group-hover:text-red-500">
                <LogOut className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold tracking-tight text-text-primary group-hover:text-red-500">Sign Out</p>
                <p className="text-[10px] font-bold text-text-muted">Exit session</p>
              </div>
            </button>
          </>
        ) : (
          <>
            <div className="mb-6 flex items-center gap-3">
              <button onClick={() => setIsManageDataOpen(false)} className="rounded-xl border border-border-primary bg-bg-primary p-2 text-text-secondary transition-all hover:border-blue-500/30 hover:text-blue-500">
                <X className="h-4 w-4" />
              </button>
              <h3 className="text-lg font-black tracking-tight text-text-primary">Manage Data</h3>
            </div>

            <div className="space-y-2">
              <button onClick={handleImport} className="group flex w-full items-center gap-4 rounded-[24px] border border-border-primary bg-bg-primary p-4 text-left transition-all hover:border-blue-500/30">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border-primary/50 bg-bg-secondary text-text-secondary transition-all group-hover:bg-blue-500/10 group-hover:text-blue-500">
                  <Upload className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-bold tracking-tight text-text-primary">Import Backup</p>
                  <p className="text-[10px] font-bold text-text-muted">Restore from JSON file</p>
                </div>
              </button>

              <button onClick={handleExport} className="group flex w-full items-center gap-4 rounded-[24px] border border-border-primary bg-bg-primary p-4 text-left transition-all hover:border-blue-500/30">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border-primary/50 bg-bg-secondary text-text-secondary transition-all group-hover:bg-blue-500/10 group-hover:text-blue-500">
                  <Download className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-bold tracking-tight text-text-primary">Export Clipboard</p>
                  <p className="text-[10px] font-bold text-text-muted">Download all data</p>
                </div>
              </button>

              <button onClick={handleClearClipboard} className="group mt-8 flex w-full items-center gap-4 rounded-[24px] border border-red-500/10 bg-red-500/5 p-4 text-left transition-all hover:bg-red-500/10">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-red-500/20 bg-white text-red-500 transition-all dark:bg-neutral-900">
                  <Trash2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-bold tracking-tight text-red-500">Atomic Wipe</p>
                  <p className="text-[10px] font-bold uppercase text-red-500/60">Permanent deletion</p>
                </div>
              </button>
            </div>

            <p className="mt-6 px-4 text-center text-[9px] font-medium leading-relaxed text-text-muted">
              Data management is permanent. We recommend exporting your clipboard before performing an atomic wipe.
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default SettingsDropdown;
