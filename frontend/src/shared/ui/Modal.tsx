import { useEffect, useId, useRef } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { TRANSITION } from '@/shared/constants/motion';

interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** Optional sticky footer (e.g. form actions). */
  footer?: ReactNode;
  /** Disables Escape / backdrop close (e.g. while submitting). */
  busy?: boolean;
}

/**
 * Generic modal dialog (docs/07-design/components.md §10) for create/edit
 * forms — a portal above the app with an animated backdrop and panel, Escape /
 * backdrop close, a scrollable body for long forms, and an optional sticky
 * footer. ConfirmDialog stays the choice for simple confirmations.
 */
export function Modal({
  open,
  title,
  onClose,
  children,
  footer,
  busy = false,
}: ModalProps): React.JSX.Element | null {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape' && !busy) {
        onClose();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    panelRef.current?.focus();
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, busy, onClose]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto p-4 sm:p-6">
          <motion.div
            className="fixed inset-0 bg-black/60"
            aria-hidden="true"
            onClick={() => !busy && onClose()}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={TRANSITION.fade}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={TRANSITION.fade}
            className="bg-surface border-border relative my-4 flex w-full max-w-2xl flex-col rounded-xl border shadow-xl outline-none"
          >
            <div className="border-border flex items-center justify-between gap-4 border-b px-6 py-4">
              <h2 id={titleId} className="text-text-primary text-lg font-semibold">
                {title}
              </h2>
              <button
                type="button"
                onClick={() => !busy && onClose()}
                aria-label="Close"
                className="text-text-muted hover:text-text-primary rounded p-1 outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                ✕
              </button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto px-6 py-5">{children}</div>
            {footer && (
              <div className="border-border flex justify-end gap-3 border-t px-6 py-4">{footer}</div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
