import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Bell, 
  Calendar as CalendarIcon, 
  Clock, 
  ChevronRight,
  Zap
} from 'lucide-react';
import { cn } from '../../utils/utils';

interface ReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (date: Date) => void;
  initialDate?: string | null;
}

const ReminderModal = ({ isOpen, onClose, onSave, initialDate }: ReminderModalProps) => {
  const [selectedDate, setSelectedDate] = useState<string>(
    initialDate ? new Date(initialDate).toISOString().slice(0, 16) : ''
  );

  const presets = [
    { label: 'Later Today', get: () => {
      const d = new Date();
      d.setHours(d.getHours() + 3);
      return d;
    }},
    { label: 'Tomorrow morning', get: () => {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      d.setHours(9, 0, 0, 0);
      return d;
    }},
    { label: 'Next Week', get: () => {
      const d = new Date();
      d.setDate(d.getDate() + 7);
      d.setHours(9, 0, 0, 0);
      return d;
    }},
  ];

  const handleSave = () => {
    if (!selectedDate) return;
    onSave(new Date(selectedDate));
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="w-full max-w-sm dark:bg-neutral-900 bg-white rounded-[32px] p-8 shadow-2xl border dark:border-white/10 border-neutral-200"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                  <Bell className="h-5 w-5" />
                </div>
                <h2 className="text-xl font-bold dark:text-white text-neutral-900 tracking-tight">Set Reminder</h2>
              </div>
              <button 
                onClick={onClose}
                className="p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 mb-8">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 mb-2 px-1">Quick Presets</div>
              <div className="grid grid-cols-1 gap-2">
                {presets.map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => {
                      const d = preset.get();
                      setSelectedDate(d.toISOString().slice(0, 16));
                    }}
                    className="flex items-center justify-between p-4 rounded-2xl bg-neutral-50 dark:bg-white/[0.03] hover:bg-blue-500/10 hover:text-blue-500 transition-all group"
                  >
                    <span className="text-sm font-bold">{preset.label}</span>
                    <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4 mb-8">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 mb-2 px-1">Custom Time</div>
              <div className="relative">
                <input 
                  type="datetime-local" 
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full bg-neutral-50 dark:bg-white/[0.03] border-none rounded-2xl p-4 text-sm font-bold dark:text-white text-neutral-900 placeholder-neutral-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={!selectedDate}
              className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-blue-500 hover:bg-blue-600 disabled:opacity-30 text-white font-bold transition-all active:scale-95 shadow-xl shadow-blue-500/20"
            >
              <Zap className="h-4 w-4" />
              Save Reminder
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ReminderModal;
