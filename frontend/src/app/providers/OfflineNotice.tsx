import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { TRANSITION, toastItem } from '@/shared/constants/motion';

/**
 * Says the quiet part out loud: there is no network.
 *
 * Installed on a phone, the app now opens from its own cache, which means it
 * opens in a lift or on a train and then sits there showing skeletons that
 * will never fill. A screen full of pulsing placeholders reads as «broken»;
 * one line saying the connection is gone reads as «wait a moment», and those
 * are very different impressions of the same failure.
 *
 * `navigator.onLine` only really knows when it is false — a laptop attached
 * to a router with no internet behind it still reports true. That asymmetry
 * suits this: a false «online» leaves the screen exactly as it is today,
 * while a true «offline» is always worth saying.
 */
export function OfflineNotice(): React.JSX.Element {
  const [offline, setOffline] = useState(() => typeof navigator !== 'undefined' && !navigator.onLine);

  useEffect(() => {
    const goOffline = (): void => setOffline(true);
    const goOnline = (): void => setOffline(false);
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  return (
    <AnimatePresence>
      {offline && (
        <motion.div
          variants={toastItem}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={TRANSITION.fade}
          role="status"
          aria-live="polite"
          className="border-warning/40 bg-surface text-text-secondary fixed inset-x-4 top-4 z-50 rounded-lg border px-4 py-2.5 text-center text-sm shadow-lg sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2"
        >
          Немає зв’язку. Застосунок відкрито, але нові дані не завантажаться.
        </motion.div>
      )}
    </AnimatePresence>
  );
}
