import { UserRole } from '@/shared/types/enums';

/**
 * Roles that sit tests.
 *
 * Spelled out as "everyone except a teacher" rather than `[USER]`: an
 * administrator managing the question bank has a real reason to sit a test and
 * see what a learner sees, while a teacher does not — they set the work, they
 * do not do it.
 *
 * Lives here rather than in the navigation because two places need the same
 * answer: the sidebar decides what to *show*, and the router decides what to
 * *serve*. While the rule existed only in the navigation, hiding «Пробний НМТ»
 * from a teacher left the route itself wide open — typing the address still
 * gave them a full mock exam.
 */
export const LEARNER_ROLES = [UserRole.USER, UserRole.ADMIN] as const;

/**
 * Roles that may sit a mock exam: every learner, and a teacher as well.
 *
 * A teacher sets work rather than doing it, but a mock is the one paper worth
 * seeing from the inside before setting it for a group — the clock, the
 * answer sheet, the scale. So it is open to them, and the backend keeps XP and
 * the review ladder out of their account (decision 29).
 */
export const MOCK_EXAM_ROLES = [...LEARNER_ROLES, UserRole.TEACHER] as const;
