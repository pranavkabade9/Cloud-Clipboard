import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function getRelativeTime(date: Date | any) {
  if (!date) return 'Recently';
  
  // Handle Firestore Timestamps and other formats
  let d: Date;
  if (date?.toDate) {
    d = date.toDate();
  } else if (date?.seconds) {
    d = new Date(date.seconds * 1000);
  } else {
    d = new Date(date);
  }
  
  if (isNaN(d.getTime())) return 'Recently';
  
  // Handle Unix Epoch (1970) or extremely old dates as invalid for this app's context
  if (d.getTime() < 1000000000) return 'Recently';
  
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  
  // If the date is in the future or very close to now (less than 1 minute)
  if (diff < 30000) return 'Just now';
  if (diff < 60000) return 'Recently';
  
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  
  const weeks = Math.floor(days / 7);
  if (weeks > 52) return 'Long ago';
  return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`;
}
