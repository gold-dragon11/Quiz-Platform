import { skipToken, useQuery } from '@tanstack/react-query';
import { matchPath, useLocation } from 'react-router-dom';
import { ROUTES } from '@/shared/constants/routes';
import { QuizType } from '@/shared/types/enums';

/**
 * Whether the screen open now is a mock sitting or its result.
 *
 * The address cannot say: practice and a mock both run on `/quiz/:sessionId`,
 * so the navigation lit «Тест» for a mock exam. The session and the result
 * each carry their `mode`, and the page has already fetched one of them, so
 * this reads that cached answer instead of asking the server again.
 *
 * The keys are spelled out rather than imported from the quiz feature, which
 * the shared layout does not depend on; they must match `QUIZ_QUERY_KEYS`.
 */
export function useMockSittingOpen(): boolean {
  const { pathname } = useLocation();
  const result = matchPath(ROUTES.quizResult, pathname);
  const sessionId = (result ?? matchPath(ROUTES.quizSession, pathname))?.params.sessionId ?? '';

  const { data } = useQuery<{ session?: { mode?: string } }>({
    queryKey: ['quiz', result ? 'result' : 'session', sessionId],
    // Observe only: the page that owns this data fetches it. `skipToken`, not
    // `enabled: false` alone — without a query function the library logged an
    // error on every page, whenever it looked at this query.
    queryFn: skipToken,
  });

  return sessionId !== '' && data?.session?.mode === QuizType.MOCK_EXAM;
}

/** The highlight a navigation entry should show, given the router's own verdict. */
export function isNavItemActive(to: string, routerActive: boolean, mockSitting: boolean): boolean {
  if (mockSitting && (to === ROUTES.quiz || to === ROUTES.mockExam)) {
    return to === ROUTES.mockExam;
  }
  return routerActive;
}
