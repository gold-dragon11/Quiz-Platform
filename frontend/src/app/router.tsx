import { lazy } from 'react';
import { MOCK_EXAM_ROLES } from '@/shared/constants/roles';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { RootLayout } from '@/shared/layouts/RootLayout';
import { PublicLayout } from '@/shared/layouts/PublicLayout';
import { MainLayout } from '@/shared/layouts/MainLayout';
import { RequireAuth } from '@/shared/guards/RequireAuth';
import { RequireGuest } from '@/shared/guards/RequireGuest';
import { RequireAdmin } from '@/shared/guards/RequireAdmin';
import { RequireLearner } from '@/shared/guards/RequireLearner';
import { RequireRole } from '@/shared/guards/RequireRole';
import { UserRole } from '@/shared/types/enums';
import { RequireTeacher } from '@/shared/guards/RequireTeacher';
import { PageTransition } from '@/shared/components/PageTransition';
import { RouteError } from '@/shared/components/RouteError';
import { ROUTES } from '@/shared/constants/routes';
import {
  ForgotPasswordPage,
  LoginPage,
  RegisterPage,
  ResetPasswordPage,
  VerifyEmailPage,
} from '@/features/auth';
import { ProfilePage, PublicProfilePage, SettingsPage } from '@/features/user';
import { DashboardPage } from '@/features/dashboard';
import { QuizStartPage, QuizSessionPage, QuizResultPage } from '@/features/quiz';
import { MockExamPage } from '@/features/mock-exam';
import { MistakeReviewPage } from '@/features/mistake-review';
import { DuelPage, DuelsPage, LiveDuelHost, LiveDuelPage } from '@/features/duels';
import { StudentGroupsPage, TeacherGroupPage, TeacherGroupsPage } from '@/features/groups';
import {
  AssignmentReviewPage,
  NewAssignmentPage,
  StudentAssignmentPage,
  StudentAssignmentsPage,
  StudentProfilePage,
} from '@/features/assignments';
import { StatisticsPage } from '@/features/statistics';
import { QuestionBankPage } from '@/features/question-bank';
import { MaterialPage } from '@/features/learning-materials';
import { SubjectsBrowserPage } from '@/features/subjects';
import { AdminPanelPage } from '@/features/admin';
import { LandingPage } from '@/features/landing';

/**
 * Full route tree per docs/05-frontend/routing.md, assembled in Phase 6.1.
 *
 * Structure (decisions F4/F10/F14):
 * - a single `RootLayout` owns scroll restoration and the lazy-route Suspense
 *   boundary, and its `errorElement` (RouteError) is the routing error layer;
 * - route groups are gated by guards — RequireGuest (auth-only pages),
 *   RequireAuth (member area), RequireAdmin (admin area);
 * - pages are code-split with React.lazy.
 */
const NotFoundPage = lazy(() =>
  import('@/pages/not-found/NotFoundPage').then((m) => ({
    default: m.NotFoundPage,
  })),
);

/**
 * The admin panel is one page with its section in `?tab=`. The per-section
 * paths were planned before it existed and only ever showed a stub; they now
 * open the panel at that section, so an old bookmark still lands somewhere.
 */
function adminTab(tab: string): React.JSX.Element {
  return <Navigate to={`${ROUTES.admin}?tab=${tab}`} replace />;
}

/** Wraps an implemented feature page in the shared route transition. */
function page(node: React.ReactNode): React.JSX.Element {
  return <PageTransition>{node}</PageTransition>;
}

const notFoundElement = (
  <PageTransition>
    <NotFoundPage />
  </PageTransition>
);

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    errorElement: <RouteError />,
    children: [
      // Public landing page — full-bleed, outside PublicLayout's centered chrome.
      { path: ROUTES.home, element: page(<LandingPage />) },

      // Public routes
      {
        element: <PublicLayout />,
        children: [
          { path: ROUTES.verifyEmail, element: page(<VerifyEmailPage />) },
          // Open to everyone, signed in or not: the owner shares the link.
          { path: ROUTES.publicProfile, element: page(<PublicProfilePage />) },

          // Guest-only routes (redirect authenticated users away)
          {
            element: <RequireGuest />,
            children: [
              { path: ROUTES.login, element: page(<LoginPage />) },
              { path: ROUTES.register, element: page(<RegisterPage />) },
              {
                path: ROUTES.forgotPassword,
                element: page(<ForgotPasswordPage />),
              },
              {
                path: ROUTES.resetPassword,
                element: page(<ResetPasswordPage />),
              },
            ],
          },

          { path: ROUTES.notFound, element: notFoundElement },
          // Catch-all for any unmatched path
          { path: '*', element: notFoundElement },
        ],
      },

      // Authenticated routes
      {
        element: <RequireAuth />,
        children: [
          {
            // The live duel socket and its incoming-challenge dialog, on every
            // page of the app (docs/02-domain/duel.md §5.1).
            element: <LiveDuelHost />,
            children: [
              {
                element: <MainLayout />,
                children: [
                  // Open to every signed-in role.
                  { path: ROUTES.dashboard, element: page(<DashboardPage />) },
                  { path: ROUTES.subjects, element: page(<SubjectsBrowserPage />) },
                  {
                    path: ROUTES.topicMaterial,
                    element: page(<MaterialPage />),
                  },
                  { path: ROUTES.statistics, element: page(<StatisticsPage />) },
                  { path: ROUTES.profile, element: page(<ProfilePage />) },
                  { path: ROUTES.settings, element: page(<SettingsPage />) },

                  // Sitting a test. The navigation has always hidden these from a
                  // teacher; until now the routes themselves were still served, so
                  // typing the address gave them a mock exam their own statistics
                  // page would never show them.
                  {
                    element: <RequireLearner />,
                    children: [
                      { path: ROUTES.quiz, element: page(<QuizStartPage />) },
                      {
                        path: ROUTES.mistakeReview,
                        element: page(<MistakeReviewPage />),
                      },
                      { path: ROUTES.duels, element: page(<DuelsPage />) },
                      { path: ROUTES.duel, element: page(<DuelPage />) },
                      { path: ROUTES.liveDuel, element: page(<LiveDuelPage />) },
                    ],
                  },

                  // A mock exam, and the session and result screens it runs on:
                  // open to a teacher too, who sits a paper to see what they are
                  // about to set. The only sessions a teacher can start are mocks.
                  {
                    element: <RequireLearner roles={MOCK_EXAM_ROLES} />,
                    children: [
                      {
                        path: ROUTES.quizSession,
                        element: page(<QuizSessionPage />),
                      },
                      {
                        path: ROUTES.quizResult,
                        element: page(<QuizResultPage />),
                      },
                      { path: ROUTES.mockExam, element: page(<MockExamPage />) },
                    ],
                  },

                  // Being taught: a student's own groups and homework. An
                  // administrator joins no groups, so this is USER alone rather
                  // than the learner set above.
                  {
                    element: <RequireRole role={UserRole.USER} />,
                    children: [
                      { path: ROUTES.groups, element: page(<StudentGroupsPage />) },
                      { path: ROUTES.assignments, element: page(<StudentAssignmentsPage />) },
                      { path: ROUTES.assignment, element: page(<StudentAssignmentPage />) },
                    ],
                  },

                  // Teacher routes — own role gate. Deliberately not open to
                  // administrators: the backend's @TeacherOnly() refuses them too,
                  // because an administrator owns no groups.
                  //
                  // The gates sit inside the shell, as the learner gates above do.
                  // Outside it, a wrong role got a 403 on a bare page with no way
                  // back but the one link, while the same refusal on a learner route
                  // kept the navigation.
                  {
                    element: <RequireTeacher />,
                    children: [
                      { path: ROUTES.teacherGroups, element: page(<TeacherGroupsPage />) },
                      { path: ROUTES.teacherQuestions, element: page(<QuestionBankPage />) },
                      { path: ROUTES.teacherGroup, element: page(<TeacherGroupPage />) },
                      {
                        path: ROUTES.teacherAssignmentNew,
                        element: page(<NewAssignmentPage />),
                      },
                      {
                        path: ROUTES.teacherAssignment,
                        element: page(<AssignmentReviewPage />),
                      },
                      {
                        path: ROUTES.teacherStudent,
                        element: page(<StudentProfilePage />),
                      },
                    ],
                  },

                  // Administrator routes.
                  {
                    element: <RequireAdmin />,
                    children: [
                      { path: ROUTES.admin, element: page(<AdminPanelPage />) },
                      {
                        path: ROUTES.adminSubjects,
                        element: adminTab('subjects'),
                      },
                      {
                        path: ROUTES.adminTopics,
                        element: adminTab('topics'),
                      },
                      {
                        path: ROUTES.adminQuizzes,
                        element: adminTab('quizzes'),
                      },
                      {
                        path: ROUTES.adminQuestions,
                        element: adminTab('questions'),
                      },
                      {
                        path: ROUTES.adminQuestionNew,
                        element: adminTab('questions'),
                      },
                      {
                        path: ROUTES.adminQuestionEdit,
                        element: adminTab('questions'),
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
]);
