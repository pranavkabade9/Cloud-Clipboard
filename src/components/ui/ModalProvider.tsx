import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { cn } from '../../utils/utils';

type ModalSize = 'sm' | 'md' | 'lg' | 'fullscreen';

type ModalRender = React.ReactNode | ((helpers: { close: () => void }) => React.ReactNode);

interface ModalOptions {
  id: string;
  title?: string;
  content: ModalRender;
  size?: ModalSize;
  className?: string;
  contentClassName?: string;
  overlayClassName?: string;
  hideCloseButton?: boolean;
  ariaLabel?: string;
  onClose?: () => void;
}

interface ModalContextValue {
  activeModal: ModalOptions | null;
  openModal: (options: ModalOptions) => void;
  closeModal: () => void;
  isModalOpen: boolean;
}

const ModalContext = createContext<ModalContextValue | null>(null);

const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(',');

const sizeClasses: Record<ModalSize, string> = {
  sm: 'w-[min(420px,calc(100vw-24px))] max-h-[min(760px,calc(100dvh-24px))]',
  md: 'w-[min(560px,calc(100vw-24px))] max-h-[min(820px,calc(100dvh-24px))]',
  lg: 'w-[min(1120px,calc(100vw-24px))] max-h-[min(860px,calc(100dvh-24px))]',
  fullscreen: 'w-[min(1280px,calc(100vw-24px))] h-[min(900px,calc(100dvh-24px))]'
};

export const ModalProvider = ({ children }: { children: React.ReactNode }) => {
  const [activeModal, setActiveModal] = useState<ModalOptions | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const touchStartYRef = useRef<number | null>(null);

  const closeModal = useCallback(() => {
    setActiveModal((current) => {
      current?.onClose?.();
      return null;
    });
  }, []);

  const openModal = useCallback((options: ModalOptions) => {
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    setActiveModal(options);
  }, []);

  useEffect(() => {
    if (!activeModal) return;

    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`;

    const frame = window.requestAnimationFrame(() => {
      const focusable = modalRef.current?.querySelectorAll<HTMLElement>(focusableSelector);
      focusable?.[0]?.focus();
    });

    return () => {
      window.cancelAnimationFrame(frame);
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
      previousFocusRef.current?.focus?.();
      previousFocusRef.current = null;
    };
  }, [activeModal]);

  useEffect(() => {
    if (!activeModal) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeModal();
        return;
      }

      if (event.key !== 'Tab' || !modalRef.current) return;
      const focusable = Array.from(modalRef.current.querySelectorAll(focusableSelector)) as HTMLElement[];
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [activeModal, closeModal]);

  const value = useMemo(() => ({ activeModal, openModal, closeModal, isModalOpen: Boolean(activeModal) }), [activeModal, openModal, closeModal]);

  return (
    <ModalContext.Provider value={value}>
      {children}
      {createPortal(
        <AnimatePresence>
          {activeModal && (
            <motion.div
              key={activeModal.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className={cn(
                'fixed inset-0 z-[1000] flex items-center justify-center p-3 sm:p-6 bg-black/25 backdrop-blur-[10px] font-[\'Poppins\']',
                activeModal.overlayClassName
              )}
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) closeModal();
              }}
              onTouchStart={(event) => {
                touchStartYRef.current = event.touches[0]?.clientY ?? null;
              }}
              onTouchEnd={(event) => {
                if (touchStartYRef.current === null) return;
                const deltaY = (event.changedTouches[0]?.clientY ?? touchStartYRef.current) - touchStartYRef.current;
                touchStartYRef.current = null;
                if (deltaY > 90) closeModal();
              }}
            >
              <motion.div
                ref={modalRef}
                role="dialog"
                aria-modal="true"
                aria-label={activeModal.ariaLabel || activeModal.title || 'Application modal'}
                initial={{ opacity: 0, scale: 0.96, y: 18 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 18 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className={cn(
                  'relative overflow-hidden rounded-[32px] border border-border-primary bg-bg-secondary/92 shadow-[0_32px_120px_rgba(0,0,0,0.35)] backdrop-blur-3xl outline-none',
                  sizeClasses[activeModal.size || 'md'],
                  activeModal.className
                )}
              >
                {!activeModal.hideCloseButton && (
                  <button
                    type="button"
                    onClick={closeModal}
                    aria-label="Close modal"
                    className="absolute right-4 top-4 z-20 rounded-2xl border border-border-primary bg-bg-primary/70 p-2.5 text-text-secondary shadow-lg backdrop-blur-xl transition-all hover:scale-105 hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
                <div className={cn('h-full overflow-y-auto custom-scrollbar', activeModal.contentClassName)}>
                  {typeof activeModal.content === 'function' ? activeModal.content({ close: closeModal }) : activeModal.content}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </ModalContext.Provider>
  );
};

export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) throw new Error('useModal must be used inside ModalProvider');
  return context;
};
