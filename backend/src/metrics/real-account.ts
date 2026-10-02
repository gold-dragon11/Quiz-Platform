import { AccountStatus, Prisma } from '@prisma/client';

/**
 * Which accounts count as people.
 *
 * Two exclusions, for different reasons, and both matter more than they look.
 *
 * **Demo.** Eight accounts are rebuilt every night and they sit tests of their
 * own, so without this a morning digest would report five completed tests on a
 * day nobody came — exactly the noise that teaches a reader to stop opening
 * it. On production right now the demo is half of every account and all of the
 * recent activity.
 *
 * **Deleted.** A soft delete keeps the row so history survives and the
 * username stays reserved (decisions A5/A6). Counting it would mean a figure
 * whose only job is to convey scale drifting further from the truth with every
 * person who leaves.
 *
 * Shared between the digest and the admin dashboard on purpose: two places
 * answering «how many accounts» differently is the kind of bug nobody reports,
 * because each number looks plausible on its own.
 */
export const REAL_ACCOUNT = {
  isDemo: false,
  accountStatus: { not: AccountStatus.DELETED },
} satisfies Prisma.UserWhereInput;

/** The same rule in SQL, for the queries Prisma's builder cannot express. */
export const REAL_ACCOUNT_SQL = Prisma.sql`u."isDemo" = false AND u."accountStatus" <> 'DELETED'`;
