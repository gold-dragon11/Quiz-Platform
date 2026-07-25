import { create } from 'zustand';

/**
 * In-house toast state (Phase 6.1 decision F7 + constraint 6 — no third-party
 * toast library). The toast channel is client UI state (Zustand); the
 * ToastProvider renders it with Framer Motion. Features raise toasts through
 * the exported `toast` helper.
 */
export type ToastVariant = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
  /** Auto-dismiss delay in ms. */
  duration: number;
}

interface ToastState {
  toasts: Toast[];
  add: (toast: Omit<Toast, 'id'>) => string;
  dismiss: (id: string) => void;
}

const DEFAULT_DURATION = 4000;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  add: (toast) => {
    const id =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`;
    set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }));
    return id;
  },
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

/**
 * Imperative helper so any layer (including the Axios error handler) can raise
 * a toast without a hook. Precise per-error UX (which failures toast) is a
 * feature concern.
 */
export const toast = {
  show(message: string, variant: ToastVariant = 'info', duration = DEFAULT_DURATION): string {
    return useToastStore.getState().add({ message, variant, duration });
  },
  success: (message: string) => toast.show(message, 'success'),
  error: (message: string) => toast.show(message, 'error'),
  info: (message: string) => toast.show(message, 'info'),
  warning: (message: string) => toast.show(message, 'warning'),
};
