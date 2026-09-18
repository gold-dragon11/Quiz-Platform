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
  subjects: '/subjects',
  quiz: '/quiz',
  quizSession: '/quiz/:sessionId',
  quizResult: '/quiz/:sessionId/result',
  mockExam: '/mock-exam',
  mistakeReview: '/mistake-review',
  groups: '/groups',
  assignments: '/assignments',
  assignment: '/assignments/:assignmentId',
  duels: '/duels',
  duel: '/duels/:duelId',
  liveDuel: '/duels/live/:duelId',
  topicMaterial: '/topics/:topicId/material',
  statistics: '/statistics',
  profile: '/profile',
  settings: '/settings',

  // Teacher
  teacherGroups: '/teacher/groups',
  teacherQuestions: '/teacher/questions',
  teacherGroup: '/teacher/groups/:groupId',
  teacherAssignmentNew: '/teacher/groups/:groupId/assignments/new',
  teacherAssignment: '/teacher/assignments/:assignmentId',
  teacherStudent: '/teacher/groups/:groupId/students/:studentId',

  // Administrator
  admin: '/admin',
  adminSubjects: '/admin/subjects',
  adminTopics: '/admin/topics',
  adminQuizzes: '/admin/quizzes',
  adminQuestions: '/admin/questions',
  adminQuestionNew: '/admin/questions/new',
  adminQuestionEdit: '/admin/questions/:id/edit',
} as const;
