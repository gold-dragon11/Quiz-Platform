import { LEARNER_ROLES } from '@/shared/constants/roles';
import { useCurrentUser } from '@/shared/hooks/use-current-user';

/**
 * Whether the signed-in account is one that sits tests.
 *
 * Screens shared across roles use this to decide whether to offer a link into
 * the quiz flow at all. `RequireLearner` closed those routes to a teacher, and
 * the shared screens they can still reach — a subject's topics, a material —
 * went on showing «Пройти тест» buttons that now land on a 403. Refusing a
 * route and offering it are two halves of the same rule, so both read from
 * `LEARNER_ROLES`.
 *
 * Undefined while the session is loading, which reads as "not yet" — the
 * action appears once the role is known rather than flashing and vanishing.
 */
export function useIsLearner(): boolean {
  const { data: user } = useCurrentUser();
  return user !== undefined && LEARNER_ROLES.some((role) => role === user.role);
}
