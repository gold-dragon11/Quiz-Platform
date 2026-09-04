import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { fadeInUp, TRANSITION } from '@/shared/constants/motion';
import { AdminTabs, type AdminTabId } from '@/features/admin/components/AdminTabs';
import { SubjectsSection } from '@/features/admin/components/subjects/SubjectsSection';
import { TopicsSection } from '@/features/admin/components/topics/TopicsSection';
import { QuestionsSection } from '@/features/admin/components/questions/QuestionsSection';
import { QuizzesSection } from '@/features/admin/components/quizzes/QuizzesSection';
import { UsersSection } from '@/features/admin/components/users/UsersSection';

/**
 * `/admin` (RequireAdmin). The MVP admin panel — a single page with in-page
 * tabs for Subjects, Topics, Questions, Quizzes and Users, each over the
 * documented `admin/*` endpoints (docs/04-api/admin.md). The first four are
 * full CRUD; Users is a directory with exactly one decision on it — who is a
 * teacher — because there is no self-service path to that role. Server state
 * is TanStack Query; the active tab is local UI state.
 */
export function AdminPanelPage(): React.JSX.Element {
  const [tab, setTab] = useState<AdminTabId>('subjects');

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-text-primary text-3xl font-semibold">Адміністрування</h1>
        <p className="text-text-muted">Керування каталогом контенту та ролями облікових записів.</p>
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
          {tab === 'users' && <UsersSection />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
