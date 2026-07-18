/**
 * Route path constants, matching docs/05-frontend/routing.md exactly.
 */
export const ROUTES = {
  // Public
  home: '/',
  login: '/login',
  register: '/register',
  forgotPassword: '/forgot-password',
  resetPassword: '/reset-password',
  verifyEmail: '/verify-email',
  publicProfile: '/u/:username',
  notFound: '/404',

  // Authenticated
  dashboard: '/dashboard',
  quiz: '/quiz',
  quizSession: '/quiz/:sessionId',
  quizResult: '/quiz/:sessionId/result',
  statistics: '/statistics',
  profile: '/profile',
  settings: '/settings',

  // Administrator
  admin: '/admin',
  adminSubjects: '/admin/subjects',
  adminTopics: '/admin/topics',
  adminQuizzes: '/admin/quizzes',
  adminQuestions: '/admin/questions',
  adminQuestionNew: '/admin/questions/new',
  adminQuestionEdit: '/admin/questions/:id/edit',
} as const;
