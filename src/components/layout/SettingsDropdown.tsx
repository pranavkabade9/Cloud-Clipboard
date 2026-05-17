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
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-neutral-950/60 backdrop-blur-md"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-xl max-h-[85vh] overflow-hidden rounded-[48px] border border-white/10 dark:bg-neutral-900/90 bg-white/90 shadow-[0_32px_64px_rgba(0,0,0,0.5)] backdrop-blur-3xl flex flex-col font-['Poppins']"
          >
            {/* Header */}
            <div className="p-8 pb-4 flex items-center justify-between">
               <div>
                  <h2 className="text-3xl font-black text-text-primary tracking-tight">Console</h2>
                  <p className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-500 mt-1">Workspace Preferences</p>
               </div>
               <button 
                onClick={onClose}
                className="h-12 w-12 rounded-2xl bg-neutral-100 dark:bg-white/5 flex items-center justify-center text-text-secondary hover:text-blue-500 transition-all hover:scale-110 active:scale-95"
               >
                 <X className="h-5 w-5" />
               </button>
            </div>

            <div className="flex-1 overflow-y-auto px-8 py-2 custom-scrollbar space-y-8">
              {menuSections.map((section, idx) => (
                <div key={idx} className="space-y-4">
                  <div className="flex items-center gap-3 px-2">
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-text-secondary/50">
                      {section.title}
                    </span>
                    <div className="flex-1 h-px bg-border-primary" />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {section.items.map((item: any, i) => (
                      item.custom ? (
                        <div key={i} className="md:col-span-2">{item.custom}</div>
                      ) : (
                        <button
                          key={i}
                          onClick={item.onClick}
                          className={cn(
                            "group flex items-center gap-4 p-4 rounded-3xl transition-all border border-transparent",
                            item.danger 
                              ? "hover:bg-red-500/10 hover:border-red-500/20" 
                              : "hover:bg-neutral-100 dark:hover:bg-white/5 hover:border-border-primary"
                          )}
                        >
                          <div className={cn(
                            "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-sm transition-all group-hover:scale-110",
                            item.danger 
                              ? "bg-red-500/10 text-red-500" 
                              : "bg-bg-primary text-text-secondary group-hover:text-blue-500 dark:border-white/5 border"
                          )}>
                            {item.icon && <item.icon className="h-6 w-6" />}
                          </div>
                          <div className="flex-1 overflow-hidden">
                            <p className="text-sm font-black text-text-primary uppercase tracking-tight">{item.label}</p>
                            {item.desc && (
                              <p className="text-[10px] font-bold text-text-secondary/60 line-clamp-1">{item.desc}</p>
                            )}
                          </div>
                        </button>
                      )
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="p-8 pt-4">
               <div className="p-4 rounded-3xl bg-blue-500/5 border border-blue-500/10 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                     <div className="h-10 w-10 rounded-xl bg-blue-500 flex items-center justify-center text-white">
                        <Database className="h-5 w-5" />
                     </div>
                     <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-blue-500">System Version</p>
                        <p className="text-xs font-bold text-text-primary">Vault Protocol v2.4.0</p>
                     </div>
                  </div>
                  <span className="text-[10px] font-black text-text-secondary opacity-30 tracking-tighter">SECURED BY AES-256</span>
               </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default SettingsDropdown;
