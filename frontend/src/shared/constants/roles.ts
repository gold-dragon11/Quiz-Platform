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
