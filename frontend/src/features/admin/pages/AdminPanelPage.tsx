import { AnimatePresence, motion } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import { fadeInUp, TRANSITION } from '@/shared/constants/motion';
import { PageHeader } from '@/shared/ui/PageHeader';
import { AdminTabs } from '@/features/admin/components/AdminTabs';
import { ADMIN_TABS, type AdminTabId } from '@/features/admin/components/admin-tabs';
import { SubjectsSection } from '@/features/admin/components/subjects/SubjectsSection';
import { TopicsSection } from '@/features/admin/components/topics/TopicsSection';
import { QuestionsSection } from '@/features/admin/components/questions/QuestionsSection';
import { QuizzesSection } from '@/features/admin/components/quizzes/QuizzesSection';
import { UsersSection } from '@/features/admin/components/users/UsersSection';

/** Query parameter holding the open section. */
const TAB_PARAM = 'tab';

function isTabId(value: string | null): value is AdminTabId {
  return ADMIN_TABS.some((tab) => tab.id === value);
}

/**
 * `/admin` (RequireAdmin). The MVP admin panel — a single page with in-page
 * tabs for Subjects, Topics, Questions, Quizzes and Users, each over the
 * documented `admin/*` endpoints (docs/04-api/admin.md). The first four are
 * full CRUD; Users is a directory with exactly one decision on it — who is a
 * teacher — for correcting the role chosen at registration.
 *
 * The open section lives in the URL (`?tab=users`) rather than in component
 * state. It was local, which meant the back button left the panel instead of
 * returning to the previous section, a reload always dropped the reader back
 * on Предмети, and «open the users list» could not be sent to anybody as a
 * link. The subjects browser already stores its open subject this way; there
 * was no reason for this screen to answer the same question differently.
 *
 * An unknown or missing value falls back to the first section rather than
 * rendering nothing, so a hand-edited address degrades instead of breaking.
 */
export function AdminPanelPage(): React.JSX.Element {
  const [searchParams, setSearchParams] = useSearchParams();
  const param = searchParams.get(TAB_PARAM);
  const tab: AdminTabId = isTabId(param) ? param : 'subjects';

  const openTab = (next: AdminTabId): void => {
    setSearchParams(
      (params) => {
        params.set(TAB_PARAM, next);
        return params;
      },
      // Sections are siblings, not a trail: pushing each one would make the
      // back button walk through every tab the reader glanced at.
      { replace: true },
    );
  };

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader eyebrow="Адміністрування" title="Каталог" />

      <div className="mt-10">
        <AdminTabs active={tab} onChange={openTab} />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          variants={fadeInUp}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={TRANSITION.fade}
          className="mt-8"
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
