export type AdminTabId = 'subjects' | 'topics' | 'questions' | 'quizzes' | 'users';

/**
 * The panel's sections, in order.
 *
 * Kept out of the component file so the page can validate a `?tab=` value
 * against it: a module that exports both a component and a constant breaks
 * fast refresh, and the list is data rather than markup anyway.
 */
export const ADMIN_TABS: { id: AdminTabId; label: string }[] = [
  { id: 'subjects', label: 'Предмети' },
  { id: 'topics', label: 'Теми' },
  { id: 'questions', label: 'Питання' },
  { id: 'quizzes', label: 'Тести' },
  { id: 'users', label: 'Користувачі' },
];
