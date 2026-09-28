import { AnimatePresence, motion } from 'framer-motion';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { TRANSITION, toastItem } from '@/shared/constants/motion';
import { Button } from '@/shared/ui/Button';

/**
 * «A new version is ready» — the one thing a service worker has to say out
 * loud.
 *
 * Once the app is installable it is also cacheable, and a cached app will
 * happily serve last month's build forever unless something goes and fetches
 * the new one. The usual answer is to swap it silently, which is wrong here:
 * a reader is often on a clock — a timed test, a mock paper, a live duel —
 * and replacing the running build mid-question is precisely the failure
 * `src/lib/stale-build.ts` exists to recover from. So the new version waits
 * where it cannot do harm, and this asks.
 *
 * Dismissing is allowed and means «not now»: the update stays waiting and the
 * next cold start picks it up regardless, so nobody is stuck on an old build
 * by saying no once.
 */
export function NewVersionPrompt(): React.JSX.Element {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  return (
    <AnimatePresence>
      {needRefresh && (
        <motion.div
          variants={toastItem}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={TRANSITION.fade}
          role="status"
          className="bg-surface border-border fixed inset-x-4 bottom-20 z-50 flex flex-col gap-3 rounded-xl border p-4 shadow-xl sm:inset-x-auto sm:right-6 sm:bottom-6 sm:max-w-sm lg:bottom-6"
        >
          <div>
            <p className="text-text-primary text-sm font-medium">Є новіша версія</p>
            <p className="text-text-secondary mt-1 text-sm">
              Оновлення застосується після перезавантаження. Незавершений тест на цьому не позначиться —
              відповіді зберігаються на сервері.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => void updateServiceWorker(true)}>
              Оновити
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setNeedRefresh(false)}>
              Пізніше
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
