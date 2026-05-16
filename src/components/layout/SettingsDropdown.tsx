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
  MessageSquare
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { signOut } from '../../services/auth';
import { formatBytes, cn } from '../../utils/utils';
import { toast } from 'sonner';
import { db, handleFirestoreError, OperationType, auth } from '../../services/firebase';
import { collection, query, where, getDocs, deleteDoc, doc, writeBatch, serverTimestamp, setDoc } from 'firebase/firestore';

interface SettingsDropdownProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsDropdown = ({ isOpen, onClose }: SettingsDropdownProps) => {
  const { 
    user, 
    userProfile, 
    theme, 
    toggleTheme, 
    storageLimit, 
    animationsEnabled, 
    setAnimationsEnabled,
    clipboardItems,
    isGuest
  } = useStore();

  const storageUsed = userProfile?.storageUsed || 0;
  const storagePercentage = (storageUsed / storageLimit) * 100;

  const handleClearClipboard = async () => {
    if (!confirm("Are you sure you want to clear your entire clipboard? This cannot be undone.")) return;
    
    if (user) {
      try {
        const q = query(collection(db, 'clipboardItems'), where('userId', '==', user.uid));
        const snapshot = await getDocs(q);
        const batch = writeBatch(db);
        snapshot.docs.forEach((d) => batch.delete(d.ref));
        
        // Reset storage used in user profile
        batch.update(doc(db, 'users', user.uid), {
          storageUsed: 0,
          updatedAt: serverTimestamp()
        });
        
        await batch.commit();
        toast.success("Clipboard cleared");
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, 'clipboardItems');
      }
    } else {
      localStorage.removeItem('guest_clipboard');
      useStore.getState().setClipboardItems([]);
      toast.success("Guest clipboard cleared");
    }
    onClose();
  };

  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(clipboardItems));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `cloudclip_export_${new Date().toISOString()}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    toast.success("Clipboard exported");
    onClose();
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
            imported.forEach(item => {
              const newRef = doc(collection(db, 'clipboardItems'));
              const { id, ...rest } = item;
              batch.set(newRef, { ...rest, userId: user.uid, createdAt: serverTimestamp() });
            });
            await batch.commit();
            toast.success(`Imported ${imported.length} items to cloud`);
          } else {
            const current = JSON.parse(localStorage.getItem('guest_clipboard') || '[]');
            const updated = [...imported, ...current];
            localStorage.setItem('guest_clipboard', JSON.stringify(updated));
            useStore.getState().setClipboardItems(updated);
            toast.success(`Imported ${imported.length} items locally`);
          }
        } catch (err) {
          toast.error("Failed to import: Invalid file format");
        }
      };
      reader.readAsText(file);
    };
    input.click();
    onClose();
  };

  const menuSections = [
    {
      title: "General",
      items: [
        {
          icon: theme === 'dark' ? Sun : Moon,
          label: "Appearance",
          desc: `${theme === 'dark' ? 'Light' : 'Dark'} mode`,
          onClick: toggleTheme,
        },
        {
          icon: Gamepad2,
          label: "Animations",
          desc: animationsEnabled ? "Enabled" : "Disabled",
          onClick: () => setAnimationsEnabled(!animationsEnabled),
        }
      ]
    },
    {
      title: "Storage",
      items: [
        {
          custom: (
            <div className="px-3 py-2">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-xs font-bold text-neutral-400">
                  <Database className="h-3 w-3" />
                  <span>Cloud Usage</span>
                </div>
                <span className="text-[10px] font-bold text-neutral-500">
                  {formatBytes(storageUsed)} / {formatBytes(storageLimit)}
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-neutral-800 overflow-hidden">
                <div 
                  className={cn(
                    "h-full transition-all duration-700",
                    storagePercentage > 90 ? "bg-red-500" : storagePercentage > 70 ? "bg-orange-500" : "bg-blue-500"
                  )}
                  style={{ width: `${Math.min(storagePercentage, 100)}%` }}
                />
              </div>
            </div>
          )
        }
      ]
    },
    {
      title: "Clipboard",
      items: [
        {
          icon: Upload,
          label: "Import Data",
          desc: "Upload JSON backup",
          onClick: handleImport,
        },
        {
          icon: Trash2,
          label: "Clear Clipboard",
          desc: "Delete all items",
          onClick: handleClearClipboard,
          danger: true,
        },
        {
          icon: Download,
          label: "Export Data",
          desc: "Download as JSON",
          onClick: handleExport,
        }
      ]
    },
    {
      title: "Account",
      items: [
        {
          icon: LogOut,
          label: "Sign Out",
          desc: isGuest ? "End guest session" : "Logout of account",
          onClick: () => {
            if (isGuest) {
              useStore.getState().setIsGuest(false);
            } else {
              signOut();
            }
            onClose();
          },
        }
      ]
    },
    {
      title: "Support",
      items: [
        { icon: HelpCircle, label: "Help Center", onClick: () => toast.info("Coming soon!") },
        { icon: MessageSquare, label: "Feedback", onClick: () => toast.info("Coming soon!") },
        { icon: Info, label: "About", onClick: () => toast.info("CloudClip v2.0.0") },
      ]
    }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20, x: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20, x: 20 }}
            className="absolute right-0 top-full mt-4 w-72 overflow-hidden rounded-[24px] border dark:border-neutral-800 border-neutral-200 dark:bg-neutral-900/90 bg-white shadow-2xl backdrop-blur-2xl z-50 origin-top-right"
          >
            <div className="max-h-[80vh] overflow-y-auto py-2 custom-scrollbar">
              {menuSections.map((section, idx) => (
                <div key={idx} className="px-2 py-2">
                  <div className="px-4 py-1.5 mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                      {section.title}
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    {section.items.map((item: any, i) => (
                      item.custom ? (
                        <div key={i}>{item.custom}</div>
                      ) : (
                        <button
                          key={i}
                          onClick={item.onClick}
                          className={`group flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition-all dark:hover:bg-neutral-800/80 hover:bg-neutral-100 ${item.danger ? 'text-red-400' : 'dark:text-neutral-200 text-neutral-700'}`}
                        >
                          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border dark:border-neutral-800 border-neutral-200 dark:bg-neutral-900 bg-white shadow-sm transition-colors group-hover:border-neutral-700 ${item.danger ? 'text-red-400 group-hover:bg-red-500/10' : 'text-neutral-400 group-hover:text-blue-400'}`}>
                            {item.icon && <item.icon className="h-5 w-5" />}
                          </div>
                          <div className="flex-1 overflow-hidden">
                            <p className="text-sm font-semibold truncate">{item.label}</p>
                            {item.desc && (
                              <p className="text-[11px] text-neutral-500 truncate">{item.desc}</p>
                            )}
                            {item.progress !== undefined && (
                              <div className="mt-2 h-1 w-full rounded-full dark:bg-neutral-800 bg-neutral-200 overflow-hidden">
                                <div 
                                  className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
                                  style={{ width: `${Math.min(item.progress, 100)}%` }}
                                />
                              </div>
                            )}
                          </div>
                        </button>
                      )
                    ))}
                  </div>
                  {idx < menuSections.length - 1 && (
                    <div className="mx-4 mt-2 h-[1px] dark:bg-neutral-800 bg-neutral-100" />
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default SettingsDropdown;
