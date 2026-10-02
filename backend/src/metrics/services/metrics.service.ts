import { Injectable } from '@nestjs/common';
import { Prisma, QuizStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { REAL_ACCOUNT, REAL_ACCOUNT_SQL } from '../real-account';
import type {
  DailyPoint,
  Funnel,
  PeriodCounts,
  PlatformMetrics,
  RecentAccount,
  SubjectUsage,
} from '../metrics.types';

const DAY_MS = 24 * 60 * 60 * 1000;
const FUNNEL_DAYS = 30;
const CHART_DAYS = 30;
const RECENT_LIMIT = 20;

/**
 * What the platform looks like from the outside, for the one person who runs
 * it (docs/01-prd/admin-panel.md §8).
 *
 * Everything is read from tables the product already fills — registrations,
 * sessions, attempts — rather than from a separate stream of events. That
 * answers every question from the moment somebody registers onward, which is
 * most of them, and leaves exactly two it cannot: where visitors came from,
 * and what they did before signing up. Nothing anonymous leaves a row, so
 * neither can be invented here; both wait for an events table.
 *
 * Read-only, administrator-only, and deliberately a handful of independent
 * queries rather than one clever join: each is cheap, each is legible, and
 * they run together.
 */
@Injectable()
export class MetricsService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(now: Date = new Date()): Promise<PlatformMetrics> {
    const dayAgo = new Date(now.getTime() - DAY_MS);
    const weekAgo = new Date(now.getTime() - 7 * DAY_MS);

    const [totals, today, week, funnel, registrations, subjects, recent] =
      await Promise.all([
        this.totals(),
        this.countsSince(dayAgo),
        this.countsSince(weekAgo),
        this.funnel(new Date(now.getTime() - FUNNEL_DAYS * DAY_MS)),
        this.registrations(now),
        this.subjects(),
        this.recent(),
      ]);

    return { totals, today, week, funnel, registrations, subjects, recent };
  }

  private async totals(): Promise<PlatformMetrics['totals']> {
    const [byRole, testsCompleted] = await Promise.all([
      this.prisma.user.groupBy({
        by: ['role'],
        where: REAL_ACCOUNT,
        _count: { _all: true },
      }),
      this.prisma.quizSession.count({
        where: { status: QuizStatus.COMPLETED, user: REAL_ACCOUNT },
      }),
    ]);

    const of = (role: UserRole): number =>
      byRole.find((row) => row.role === role)?._count._all ?? 0;

    const learners = of(UserRole.USER);
    const teachers = of(UserRole.TEACHER);

    return {
      // Administrators are accounts too, so the total is the sum of every
      // row rather than of the two roles shown beside it.
      accounts: byRole.reduce((sum, row) => sum + row._count._all, 0),
      learners,
      teachers,
      testsCompleted,
    };
  }

  private async countsSince(since: Date): Promise<PeriodCounts> {
    const sittings = {
      status: QuizStatus.COMPLETED,
      completedAt: { gte: since },
      user: REAL_ACCOUNT,
    };

    const [newAccounts, testsCompleted, people] = await Promise.all([
      this.prisma.user.count({
        where: { ...REAL_ACCOUNT, createdAt: { gte: since } },
      }),
      this.prisma.quizSession.count({ where: sittings }),
      this.prisma.quizSession.findMany({
        where: sittings,
        select: { userId: true },
        distinct: ['userId'],
      }),
    ]);

    return { newAccounts, testsCompleted, activePeople: people.length };
  }

  /**
   * Each step counts the same cohort — everybody who registered in the window
   * — so the drops are comparable. Counting «verified» over all accounts and
   * «took a test» over this month's would produce a funnel that rises.
   */
  private async funnel(since: Date): Promise<Funnel> {
    const cohort = { ...REAL_ACCOUNT, createdAt: { gte: since } };

    const [registered, verified, tookATest, returned] = await Promise.all([
      this.prisma.user.count({ where: cohort }),
      this.prisma.user.count({ where: { ...cohort, emailVerified: true } }),
      this.prisma.user.count({
        where: {
          ...cohort,
          quizSessions: { some: { status: QuizStatus.COMPLETED } },
        },
      }),
      this.returnedCount(since),
    ]);

    return { registered, verified, tookATest, returned };
  }

  /**
   * «Came back» without an events table: finished tests on two different
   * calendar days. It undercounts — somebody who opened the app daily to read
   * their notes and never sat a test does not appear — and that is the right
   * direction for a number used to decide whether anything is working.
   */
  private async returnedCount(since: Date): Promise<number> {
    const rows = await this.prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*)::bigint AS count FROM (
        SELECT q."userId"
        FROM quiz_sessions q
        JOIN users u ON u.id = q."userId"
        WHERE q.status = 'COMPLETED'
          AND u."createdAt" >= ${since}
          AND ${REAL_ACCOUNT_SQL}
        GROUP BY q."userId"
        HAVING COUNT(DISTINCT DATE(q."completedAt")) >= 2
      ) AS returning_people`;

    return Number(rows[0]?.count ?? 0);
  }

  /**
   * One row per day including the empty ones, so a chart does not silently
   * close the gaps and turn a quiet fortnight into a gentle slope.
   */
  private async registrations(now: Date): Promise<DailyPoint[]> {
    const since = new Date(now.getTime() - (CHART_DAYS - 1) * DAY_MS);

    const rows = await this.prisma.$queryRaw<{ day: Date; count: bigint }[]>`
      SELECT DATE_TRUNC('day', u."createdAt") AS day, COUNT(*)::bigint AS count
      FROM users u
      WHERE u."createdAt" >= ${startOfDay(since)} AND ${REAL_ACCOUNT_SQL}
      GROUP BY 1
      ORDER BY 1`;

    const counted = new Map(
      rows.map((row) => [toDayKey(row.day), Number(row.count)]),
    );

    return Array.from({ length: CHART_DAYS }, (_, index) => {
      const day = toDayKey(new Date(since.getTime() + index * DAY_MS));
      return { day, count: counted.get(day) ?? 0 };
    });
  }

  /** Which subjects people actually sit, rather than which exist. */
  private async subjects(): Promise<SubjectUsage[]> {
    const rows = await this.prisma.$queryRaw<
      { subject: string; sessions: bigint; people: bigint }[]
    >`
      SELECT t.name AS subject,
             COUNT(*)::bigint AS sessions,
             COUNT(DISTINCT q."userId")::bigint AS people
      FROM quiz_sessions q
      JOIN users u ON u.id = q."userId"
      JOIN subjects t ON t.id = q."subjectId"
      WHERE q.status = 'COMPLETED' AND ${REAL_ACCOUNT_SQL}
      GROUP BY t.name
      ORDER BY sessions DESC`;

    return rows.map((row) => ({
      subject: row.subject,
      sessions: Number(row.sessions),
      people: Number(row.people),
    }));
  }

  /**
   * The newest accounts, named. While there are tens of people rather than
   * thousands, this is the most useful screen on the page: a column of totals
   * says the month was quiet, a list says who arrived and whether they stayed.
   */
  private async recent(): Promise<RecentAccount[]> {
    const rows = await this.prisma.user.findMany({
      where: REAL_ACCOUNT,
      orderBy: { createdAt: 'desc' },
      take: RECENT_LIMIT,
      select: {
        role: true,
        createdAt: true,
        emailVerified: true,
        profile: { select: { username: true } },
        _count: {
          select: { quizSessions: { where: { status: QuizStatus.COMPLETED } } },
        },
      },
    });

    return rows.map((row) => ({
      // An account always has a profile; the fallback is there so a broken row
      // shows up as a line to investigate rather than crashing the page.
      username: row.profile?.username ?? '—',
      role: row.role,
      createdAt: row.createdAt,
      verified: row.emailVerified,
      tookATest: row._count.quizSessions > 0,
    }));
  }
}

function startOfDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

function toDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Keeps the raw queries above honest about what Prisma interpolates. */
export type RawDate = Prisma.Sql;
