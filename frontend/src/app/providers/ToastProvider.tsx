import { useEffect } from 'react';
import type { PropsWithChildren } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { TRANSITION } from '@/shared/constants/motion';
import { useToastStore, type Toast, type ToastVariant } from '@/stores/toast-store';

/**
 * Renders the in-house toast channel (Phase 6.1 decision F7, constraint 6).
 * Toasts are client state in the toast store; this provider animates them
 * with Framer Motion. No third-party toast dependency.
 */
export function ToastProvider({ children }: PropsWithChildren): React.JSX.Element {
  const toasts = useToastStore((state) => state.toasts);

  return (
    <>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-4 sm:items-end">
        <AnimatePresence initial={false}>
          {toasts.map((t) => (
            <ToastItem key={t.id} toast={t} />
          ))}
        </AnimatePresence>
      </div>
    </>
  );
}

const VARIANT_CLASS: Record<ToastVariant, string> = {
  success: 'border-success/40 text-text-primary',
  error: 'border-error/40 text-text-primary',
  info: 'border-info/40 text-text-primary',
  warning: 'border-warning/40 text-text-primary',
};

function ToastItem({ toast }: { toast: Toast }): React.JSX.Element {
  const dismiss = useToastStore((state) => state.dismiss);

  useEffect(() => {
    const timer = setTimeout(() => dismiss(toast.id), toast.duration);
    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, dismiss]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.98 }}
      transition={TRANSITION.fade}
      role="status"
      onClick={() => dismiss(toast.id)}
      className={`bg-surface-elevated pointer-events-auto w-full max-w-sm cursor-pointer rounded-lg border px-4 py-3 text-sm shadow-lg ${VARIANT_CLASS[toast.variant]}`}
    >
      {toast.message}
    </motion.div>
  );
}
