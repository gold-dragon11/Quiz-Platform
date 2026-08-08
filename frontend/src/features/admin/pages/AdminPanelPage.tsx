import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { fadeInUp, TRANSITION } from '@/shared/constants/motion';
import { AdminTabs, type AdminTabId } from '@/features/admin/components/AdminTabs';
import { SubjectsSection } from '@/features/admin/components/subjects/SubjectsSection';
import { TopicsSection } from '@/features/admin/components/topics/TopicsSection';
import { QuestionsSection } from '@/features/admin/components/questions/QuestionsSection';
import { QuizzesSection } from '@/features/admin/components/quizzes/QuizzesSection';

/**
 * `/admin` (RequireAdmin). The MVP admin panel — a single page with in-page
 * tabs for Subjects, Topics, Questions, and Quizzes, each a full CRUD surface
 * over the documented `admin/*` endpoints (docs/04-api/admin.md). Server state
 * is TanStack Query; the active tab is local UI state.
 */
export function AdminPanelPage(): React.JSX.Element {
  const [tab, setTab] = useState<AdminTabId>('subjects');

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-text-primary text-3xl font-semibold">Адміністрування</h1>
        <p className="text-text-muted">Керування каталогом контенту — предмети, теми, питання та тести.</p>
      </header>

      <AdminTabs active={tab} onChange={setTab} />

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          variants={fadeInUp}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={TRANSITION.fade}
        >
          {tab === 'subjects' && <SubjectsSection />}
          {tab === 'topics' && <TopicsSection />}
          {tab === 'questions' && <QuestionsSection />}
          {tab === 'quizzes' && <QuizzesSection />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
