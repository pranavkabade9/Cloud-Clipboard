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
  };

  const menuSections = [
    {
      title: "GENERAL",
      items: [
        {
          icon: Moon,
          label: "Appearance",
          desc: theme === 'dark' ? "Dark mode" : "Light mode",
          onClick: useStore.getState().toggleTheme,
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
      title: "STORAGE",
      items: [
        {
          custom: (
            <div className="space-y-3 py-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-bg-primary border border-border-primary/50 flex items-center justify-center text-text-muted">
                    <Database className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-text-primary">Cloud Usage</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-text-muted">
                  {formatBytes(storageUsed)} / {formatBytes(storageLimit)}
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-border-primary overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(storagePercentage, 100)}%` }}
                  className="h-full bg-blue-500 transition-all duration-700"
                />
              </div>
            </div>
          )
        }
      ]
    },
    {
      title: "CLIPBOARD",
      items: [
        {
          icon: Upload,
          label: "Import Data",
          desc: "Upload JSON backup",
          onClick: () => {
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
                   if (!Array.isArray(imported)) throw new Error();
                   if (user) {
                     const batch = writeBatch(db);
                     imported.forEach(item => {
                       const newRef = doc(collection(db, 'clipboardItems'));
                       const { id, ...rest } = item;
                       batch.set(newRef, { ...rest, userId: user.uid, createdAt: serverTimestamp() });
                     });
                     await batch.commit();
                     toast.success(`Imported ${imported.length} items`);
                   }
                 } catch (err) { toast.error("Invalid format"); }
               };
               reader.readAsText(file);
             };
             input.click();
          },
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
          onClick: () => {
             const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(clipboardItems));
             const downloadAnchorNode = document.createElement('a');
             downloadAnchorNode.setAttribute("href", dataStr);
             downloadAnchorNode.setAttribute("download", `vault_export.json`);
             downloadAnchorNode.click();
             downloadAnchorNode.remove();
          },
        }
      ]
    },
    {
      title: "ACCOUNT",
      items: [
        {
          icon: LogOut,
          label: "Sign Out",
          desc: isGuest ? "Logout of local session" : "Logout of account",
          onClick: () => {
            if (isGuest) useStore.getState().setIsGuest(false);
            else signOut();
            onClose();
          },
        }
      ]
    },
    {
      title: "SUPPORT",
      items: [
        { icon: HelpCircle, label: "Help Center", desc: "Coming soon!", onClick: () => {} },
      ]
    }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[100]"
          />
          
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="absolute top-full right-0 mt-4 w-[340px] max-h-[80vh] overflow-y-auto rounded-[32px] border border-border-primary bg-bg-secondary shadow-2xl backdrop-blur-3xl z-[110] p-6 custom-scrollbar font-['Poppins']"
          >
            <div className="space-y-8">
              {menuSections.map((section, idx) => (
                <div key={idx} className="space-y-4">
                  <h3 className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] px-2 outline-none">
                    {section.title}
                  </h3>
                  
                  <div className="space-y-1">
                    {section.items.map((item: any, i) => (
                      item.custom ? (
                        <div key={i} className="px-2">{item.custom}</div>
                      ) : (
                        <button
                          key={i}
                          onClick={item.onClick}
                          className="w-full flex items-center gap-4 p-2 rounded-2xl transition-all hover:bg-bg-primary group text-left outline-none"
                        >
                          <div className={cn(
                            "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-bg-primary border border-border-primary/50 transition-all",
                            item.danger ? "text-red-500 bg-red-500/5 group-hover:bg-red-500/10" : "text-text-secondary group-hover:text-blue-500 group-hover:bg-blue-500/10 group-hover:border-blue-500/20"
                          )}>
                            {item.icon && <item.icon className="h-5 w-5" />}
                          </div>
                          <div>
                            <p className={cn(
                                "text-sm font-bold tracking-tight",
                                item.danger ? "text-red-500" : "text-text-primary"
                            )}>
                                {item.label}
                            </p>
                            {item.desc && (
                              <p className="text-[10px] font-bold text-text-muted leading-none mt-0.5">
                                {item.desc}
                              </p>
                            )}
                          </div>
                        </button>
                      )
                    ))}
                  </div>
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
