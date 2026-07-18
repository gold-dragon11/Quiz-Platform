import { createBrowserRouter } from 'react-router-dom';
import { PublicLayout } from '@/shared/layouts/PublicLayout';
import { MainLayout } from '@/shared/layouts/MainLayout';
import { AdminLayout } from '@/shared/layouts/AdminLayout';
import { PageTransition } from '@/shared/components/PageTransition';
import { PlaceholderPage } from '@/pages/PlaceholderPage';
import { NotFoundPage } from '@/pages/not-found/NotFoundPage';
import { ROUTES } from '@/constants/routes';

/**
 * Full route tree per docs/05-frontend/routing.md. Every leaf currently
 * renders PlaceholderPage — pages are implemented feature by feature in
 * later phases. Route Guards (Authentication Guard, Guest Guard, Admin
 * Guard) are intentionally not wired here; they depend on auth state, which
 * is introduced in Phase 2 — Authentication (see docs/08-development/roadmap.md).
 */
function withTransition(title: string): React.JSX.Element {
  return (
    <PageTransition>
      <PlaceholderPage title={title} />
    </PageTransition>
  );
}

export const router = createBrowserRouter([
  // Public routes
  {
    element: <PublicLayout />,
    children: [
      { path: ROUTES.home, element: withTransition('Home') },
      { path: ROUTES.login, element: withTransition('Login') },
      { path: ROUTES.register, element: withTransition('Register') },
      { path: ROUTES.forgotPassword, element: withTransition('Forgot Password') },
      { path: ROUTES.resetPassword, element: withTransition('Reset Password') },
      { path: ROUTES.verifyEmail, element: withTransition('Verify Email') },
      { path: ROUTES.publicProfile, element: withTransition('Public Profile') },
      {
        path: ROUTES.notFound,
        element: (
          <PageTransition>
            <NotFoundPage />
          </PageTransition>
        ),
      },
      {
        // Catch-all for any unmatched path
        path: '*',
        element: (
          <PageTransition>
            <NotFoundPage />
          </PageTransition>
        ),
      },
    ],
  },

  // Authenticated routes
  {
    element: <MainLayout />,
    children: [
      { path: ROUTES.dashboard, element: withTransition('Dashboard') },
      { path: ROUTES.quiz, element: withTransition('Quiz Selection') },
      { path: ROUTES.quizSession, element: withTransition('Active Quiz Session') },
      { path: ROUTES.quizResult, element: withTransition('Quiz Results') },
      { path: ROUTES.statistics, element: withTransition('Statistics') },
      { path: ROUTES.profile, element: withTransition('Profile') },
      { path: ROUTES.settings, element: withTransition('Settings') },
    ],
  },

  // Administrator routes
  {
    element: <AdminLayout />,
    children: [
      { path: ROUTES.admin, element: withTransition('Admin Dashboard') },
      { path: ROUTES.adminSubjects, element: withTransition('Subject Management') },
      { path: ROUTES.adminTopics, element: withTransition('Topic Management') },
      { path: ROUTES.adminQuizzes, element: withTransition('Quiz Template Management') },
      { path: ROUTES.adminQuestions, element: withTransition('Question Management') },
      { path: ROUTES.adminQuestionNew, element: withTransition('Create Question') },
      { path: ROUTES.adminQuestionEdit, element: withTransition('Edit Question') },
    ],
  },
]);
