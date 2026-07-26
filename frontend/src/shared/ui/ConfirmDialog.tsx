import { useEffect, useId, useRef } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { fade, overlayPanel, TRANSITION } from '@/shared/constants/motion';
import { Button, type ButtonVariant } from '@/shared/ui/Button';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: ButtonVariant;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Modal confirmation dialog (docs/07-design/components.md §10) for
 * irreversible actions. Renders in a portal above the app, animates with the
 * shared motion presets, traps intent behind an explicit confirm, closes on
 * Escape or backdrop click, and focuses itself on open for keyboard users.
 * While `isLoading`, both actions are disabled so the confirm can't double-fire.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmVariant = 'primary',
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps): React.JSX.Element | null {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape' && !isLoading) {
        onCancel();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    panelRef.current?.focus();
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, isLoading, onCancel]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div
            className="absolute inset-0 bg-black/60"
            aria-hidden="true"
            onClick={() => !isLoading && onCancel()}
            variants={fade}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={TRANSITION.fade}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            className="bg-surface border-border relative w-full max-w-md rounded-xl border p-6 shadow-xl outline-none"
            variants={overlayPanel}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={TRANSITION.fade}
          >
            <h2 id={titleId} className="text-text-primary text-lg font-semibold">
              {title}
            </h2>
            {description && <div className="text-text-secondary mt-2 text-sm">{description}</div>}
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="ghost" onClick={onCancel} disabled={isLoading}>
                {cancelLabel}
              </Button>
              <Button variant={confirmVariant} onClick={onConfirm} isLoading={isLoading}>
                {confirmLabel}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
