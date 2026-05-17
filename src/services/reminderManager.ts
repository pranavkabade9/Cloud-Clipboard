import { toast } from 'sonner';
import { useStore } from '../store/useStore';

class ReminderManager {
  private interval: NodeJS.Timeout | null = null;
  private notifiedIds: Set<string> = new Set();

  start() {
    if (this.interval) return;
    
    // Request notification permission
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    this.interval = setInterval(() => this.checkReminders(), 30000); // Check every 30 seconds
    this.checkReminders();
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  private checkReminders() {
    const now = new Date();
    const items = useStore.getState().clipboardItems;

    items.forEach(item => {
      if (item.reminder && !item.deleted) {
        const reminderDate = new Date(item.reminder);
        
        // If reminder is due and we haven't notified for this specific reminder timestamp yet
        const notifiedKey = `${item.id}-${item.reminder}`;
        
        if (reminderDate <= now && !this.notifiedIds.has(notifiedKey)) {
          this.fireNotification(item);
          this.notifiedIds.add(notifiedKey);
        }
      }
    });
  }

  private fireNotification(item: any) {
    const title = item.type === 'image' ? 'Media Reminder' : 'Note Reminder';
    const body = item.content || 'You have a saved snippet to review.';

    // In-app notification (Toast)
    toast.info(title, {
      description: body,
      duration: 10000,
      action: {
        label: "View",
        onClick: () => {
          // You could implement logic to focus the item or open a modal
          console.log("Viewing item", item.id);
        }
      }
    });

    // Browser notification
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(title, {
        body,
        icon: '/favicon.ico', // Update with actual icon if available
        silent: false,
      });
    }

    // Play sound? (Optional, based on user preference)
  }
}

export const reminderManager = new ReminderManager();
