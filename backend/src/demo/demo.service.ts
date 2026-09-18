import { Injectable, Logger } from '@nestjs/common';
import {
  AccountStatus,
  AvatarType,
  Language,
  Prisma,
  QuestionType,
} from '@prisma/client';
import * as Sentry from '@sentry/nestjs';
import { randomBytes } from 'node:crypto';
import { QuestionSelectionMode } from '../assignments/dto/create-assignment.dto';
import type { CreateAssignmentDto } from '../assignments/dto/create-assignment.dto';
import { AssignmentsService } from '../assignments/services/assignments.service';
import { PasswordUtil } from '../auth/utils/password.util';
import { DEFAULT_AVATAR_URL } from '../common/constants/avatar.constants';
import { DuelsService } from '../duels/services/duels.service';
import { GroupsService } from '../groups/services/groups.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  correctAnswerFor,
  evaluateAnswer,
  type EvaluableOption,
} from '../quiz/quiz-answer.util';
import { QuizService } from '../quiz/services/quiz.service';
import {
  DEMO_CLASSMATES,
  DEMO_PASSWORD,
  DEMO_PRACTICE,
  DEMO_STUDENT,
  DEMO_TEACHER,
  type DemoAccountSpec,
} from './demo.constants';

const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (days: number, hour = 17): Date => {
  const at = new Date(Date.now() - days * DAY);
  at.setUTCHours(hour, (days * 7) % 60, 0, 0);
  return at;
};

export interface DemoResetReport {
  accounts: number;
  sessions: number;
  durationMs: number;
}

interface SnapshotQuestion {
  questionId: string;
  question: {
    type: QuestionType;
    configuration: Prisma.JsonValue;
    answerOptions: EvaluableOption[];
  };
}

/**
 * Rebuilds the public demo from nothing (docs/08-development/deployment.md
 * §17.9).
 *
 * Everything goes through the product's own services — a group is created
 * and joined, homework is issued and started, every sitting is completed by
 * the engine. Only the answers are written in bulk, marked right or wrong by
 * the same `evaluateAnswer` the engine uses. So the scores, XP, statistics and
 * the mistake ladder the demo shows are the ones the product computed, not
 * numbers typed into a table; and the whole rebuild is a few hundred queries
 * rather than the thousand a request per answer would cost on a database an
 * ocean away.
 *
 * Afterwards each sitting is moved back to a day in the past, so the history
 * reads like weeks of work rather than one minute of it.
 *
 * The demo is sealed — its accounts cannot join a real group or duel a real
 * learner — so deleting it can never take anybody else's work with it.
 */
@Injectable()
export class DemoService {
  private readonly logger = new Logger(DemoService.name);
  private running: Promise<DemoResetReport> | null = null;
  private sessions = 0;

  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordUtil: PasswordUtil,
    private readonly quizService: QuizService,
    private readonly groupsService: GroupsService,
    private readonly assignmentsService: AssignmentsService,
    private readonly duelsService: DuelsService,
  ) {}

  /**
   * Starts a reset without waiting for it. The scheduler's request would
   * otherwise sit open for the minute a rebuild takes against production.
   * Returns false when one is already running.
   */
  startInBackground(): boolean {
    if (this.running) {
      return false;
    }
    void this.reset().catch((error: unknown) => {
      this.logger.error(
        'Demo reset failed',
        error instanceof Error ? error.stack : undefined,
      );
      Sentry.captureException(error, { tags: { job: 'demo-reset' } });
    });
    return true;
  }

  /** Deletes the demo and builds it again. One at a time. */
  reset(): Promise<DemoResetReport> {
    if (!this.running) {
      this.running = this.rebuild().finally(() => {
        this.running = null;
      });
    }
    return this.running;
  }

  /** Removes the demo without rebuilding it — for tests that need a clean slate. */
  async clear(): Promise<void> {
    await this.running;
    await this.removeDemo();
  }

  private async rebuild(): Promise<DemoResetReport> {
    const startedAt = Date.now();
    this.sessions = 0;

    await this.removeDemo();

    const passwordHash = await this.passwordUtil.hashPassword(DEMO_PASSWORD);
    const student = await this.createAccount(DEMO_STUDENT, passwordHash);
    const teacher = await this.createAccount(DEMO_TEACHER, passwordHash);
    const classmates: { id: string; username: string; accuracy: number }[] = [];
    for (const spec of DEMO_CLASSMATES) {
      // Nobody signs in as a classmate, so theirs is a password nobody knows.
      const hidden = await this.passwordUtil.hashPassword(
        randomBytes(24).toString('base64'),
      );
      classmates.push({
        id: await this.createAccount(spec, hidden),
        username: spec.username,
        accuracy: spec.accuracy,
      });
    }

    const rng = seeded('l&s-demo');
    const mathematics = await this.subject('mathematics');

    // The student's own practice, oldest first so the ladder moves in order.
    for (const item of DEMO_PRACTICE) {
      const subject = await this.subject(item.subject);
      const topic = await this.topic(subject, item.topic);
      const session = await this.quizService.start(student, {
        subjectId: subject,
        topicId: topic,
        questionCount: 10,
        timerEnabled: false,
      });
      await this.sit(
        student,
        session.sessionId,
        item.accuracy,
        rng,
        daysAgo(item.daysAgo),
        11,
      );
    }

    // Two mock papers: one comfortably above the threshold, one short of it.
    for (const [slug, days, accuracy, minutes] of [
      ['mathematics', 8, 0.72, 128],
      ['history-of-ukraine', 4, 0.6, 104],
    ] as const) {
      const session = await this.quizService.startMockExam(student, {
        subjectId: await this.subject(slug),
      });
      await this.sit(
        student,
        session.sessionId,
        accuracy,
        rng,
        daysAgo(days),
        minutes,
      );
    }

    // Two review sessions, so the ladder shows mistakes on their way up rather
    // than all stuck on the first rung, which reads as never having reviewed.
    for (const [days, accuracy, count] of [
      [9, 0.8, 12],
      [4, 0.75, 15],
      [1, 0.7, 15],
    ] as const) {
      const session = await this.quizService.startMistakeReview(student, {
        questionCount: count,
      });
      await this.sit(
        student,
        session.sessionId,
        accuracy,
        rng,
        daysAgo(days, 19),
        count,
      );
    }

    // The class: one group, everyone in it.
    const group = await this.groupsService.create(teacher, {
      name: '11-А · математика',
      subjectId: mathematics,
    });
    for (const member of [student, ...classmates.map((one) => one.id)]) {
      await this.groupsService.join(member, { inviteCode: group.inviteCode });
    }
    await this.prisma.group.update({
      where: { id: group.id },
      data: { createdAt: daysAgo(30, 9) },
    });
    await this.prisma.groupMembership.updateMany({
      where: { groupId: group.id },
      data: { joinedAt: daysAgo(29, 15) },
    });

    // Homework past its deadline, handed in by nearly everyone — one late.
    const equations = await this.issue(
      teacher,
      group.id,
      {
        title: 'Рівняння: самостійна',
        description: 'Лінійні й квадратні рівняння. Без калькулятора.',
        mode: QuestionSelectionMode.TOPIC,
        topicId: await this.topic(mathematics, 'equations'),
        count: 10,
      },
      { createdDaysAgo: 12, dueDaysAgo: 5 },
    );
    await this.handIn(student, equations, 0.8, rng, daysAgo(6, 19));
    for (const [index, mate] of classmates.entries()) {
      // The last two: one late, one never handed it in.
      if (index === classmates.length - 1) continue;
      const late = index === classmates.length - 2;
      await this.handIn(
        mate.id,
        equations,
        mate.accuracy,
        rng,
        daysAgo(late ? 4 : 7 - (index % 3), 18),
      );
    }

    // Open homework, half the class through it; the student has not started.
    const trigonometry = await this.issue(
      teacher,
      group.id,
      {
        title: 'Тригонометрія перед контрольною',
        mode: QuestionSelectionMode.TOPIC,
        topicId: await this.topic(mathematics, 'trigonometry'),
        count: 10,
      },
      { createdDaysAgo: 3, dueDaysAgo: -3 },
    );
    for (const mate of classmates.slice(0, 3)) {
      await this.handIn(
        mate.id,
        trigonometry,
        mate.accuracy,
        rng,
        daysAgo(1, 20),
      );
    }

    // A mock paper as homework, just issued.
    const mock = await this.issue(
      teacher,
      group.id,
      {
        title: 'Пробний НМТ з математики',
        mode: QuestionSelectionMode.MOCK_EXAM,
      },
      { createdDaysAgo: 1, dueDaysAgo: -6 },
    );
    await this.handIn(
      classmates[0].id,
      mock,
      classmates[0].accuracy,
      rng,
      daysAgo(0, 8),
    );

    // A finished duel with a classmate.
    const rival = classmates[1];
    const duel = await this.duelsService.challenge(student, {
      opponentUsername: rival.username,
      subjectId: mathematics,
      questionCount: 5,
    });
    await this.duelsService.accept(rival.id, duel.id);
    for (const [player, accuracy] of [
      [student, 0.8],
      [rival.id, rival.accuracy],
    ] as const) {
      const session = await this.duelsService.play(player, duel.id);
      await this.sit(
        player,
        session.sessionId,
        accuracy,
        rng,
        daysAgo(3, 21),
        6,
      );
    }
    await this.prisma.duel.update({
      where: { id: duel.id },
      data: { createdAt: daysAgo(3, 20), acceptedAt: daysAgo(3, 20) },
    });

    // Learning time is added up when a session completes, which here is a
    // moment after it started; the sittings were moved into the past with a
    // real duration, so the total is taken from those.
    await this.prisma.$executeRaw`
      UPDATE "statistics" AS st
      SET "totalLearningTimeSeconds" = sums.total
      FROM (
        SELECT s."userId", COALESCE(SUM(s."durationSeconds"), 0)::int AS total
        FROM "quiz_sessions" s
        JOIN "users" u ON u.id = s."userId" AND u."isDemo" = true
        WHERE s.status = 'COMPLETED'
        GROUP BY s."userId"
      ) AS sums
      WHERE st."userId" = sums."userId"`;

    const report: DemoResetReport = {
      accounts: 2 + classmates.length,
      sessions: this.sessions,
      durationMs: Date.now() - startedAt,
    };
    this.logger.log(`Demo rebuilt: ${JSON.stringify(report)}`);
    return report;
  }

  /**
   * Removes every demo account and everything it made, in the order the
   * foreign keys allow. Sealing guarantees nothing here belongs to a real
   * account: a real learner can join neither the demo group nor a demo duel.
   */
  private async removeDemo(): Promise<void> {
    const users = await this.prisma.user.findMany({
      where: { isDemo: true },
      select: { id: true },
    });
    const ids = users.map((user) => user.id);
    if (ids.length === 0) {
      return;
    }

    await this.prisma.$transaction(async (tx) => {
      const sessions = await tx.quizSession.findMany({
        where: { userId: { in: ids } },
        select: { id: true },
      });
      const sessionIds = sessions.map((session) => session.id);
      await tx.xPTransaction.deleteMany({
        where: {
          OR: [{ userId: { in: ids } }, { quizSessionId: { in: sessionIds } }],
        },
      });
      // Attempts, results and snapshots cascade with their session.
      await tx.quizSession.deleteMany({ where: { id: { in: sessionIds } } });
      await tx.assignment.deleteMany({ where: { createdById: { in: ids } } });
      await tx.group.deleteMany({ where: { ownerId: { in: ids } } });
      await tx.duel.deleteMany({
        where: {
          OR: [{ challengerId: { in: ids } }, { opponentId: { in: ids } }],
        },
      });
      // Profile, settings, statistics, ladder, exposures, tokens cascade.
      await tx.user.deleteMany({ where: { id: { in: ids } } });
    });
  }

  private async createAccount(
    spec: DemoAccountSpec,
    passwordHash: string,
  ): Promise<string> {
    const joined = daysAgo(34, 11);
    const user = await this.prisma.user.create({
      data: {
        email: spec.email,
        passwordHash,
        role: spec.role,
        isDemo: true,
        emailVerified: true,
        accountStatus: AccountStatus.ACTIVE,
        createdAt: joined,
        profile: {
          create: {
            username: spec.username,
            displayName: spec.displayName,
            bio: spec.bio,
            createdAt: joined,
          },
        },
        avatar: {
          create: { type: AvatarType.PREDEFINED, imageUrl: DEFAULT_AVATAR_URL },
        },
        // No mail to an address that is published or made up.
        settings: {
          create: {
            language: Language.UKRAINIAN,
            assignmentEmailsEnabled: false,
          },
        },
        statistics: { create: {} },
      },
      select: { id: true },
    });
    return user.id;
  }

  private async issue(
    teacherId: string,
    groupId: string,
    dto: Omit<CreateAssignmentDto, 'dueAt'>,
    when: { createdDaysAgo: number; dueDaysAgo: number },
  ): Promise<string> {
    // Issued with a future deadline, as the form requires, then moved to
    // where the story needs it.
    const assignment = await this.assignmentsService.create(
      teacherId,
      groupId,
      {
        ...dto,
        dueAt: new Date(Date.now() + 7 * DAY),
      },
    );
    await this.prisma.assignment.update({
      where: { id: assignment.id },
      data: {
        createdAt: daysAgo(when.createdDaysAgo, 8),
        dueAt: daysAgo(when.dueDaysAgo, 21),
      },
    });
    return assignment.id;
  }

  private async handIn(
    studentId: string,
    assignmentId: string,
    accuracy: number,
    rng: () => number,
    at: Date,
  ): Promise<void> {
    const session = await this.assignmentsService.start(
      studentId,
      assignmentId,
    );
    await this.sit(studentId, session.sessionId, accuracy, rng, at, 24);
  }

  /** Answers a started session at roughly `accuracy` and has the engine score it. */
  private async sit(
    userId: string,
    sessionId: string,
    accuracy: number,
    rng: () => number,
    at: Date,
    minutes: number,
  ): Promise<void> {
    const snapshot: SnapshotQuestion[] =
      await this.prisma.quizSessionQuestion.findMany({
        where: { quizSessionId: sessionId },
        orderBy: { position: 'asc' },
        select: {
          questionId: true,
          question: {
            select: {
              type: true,
              configuration: true,
              answerOptions: {
                select: { id: true, order: true, isCorrect: true },
              },
            },
          },
        },
      });

    const attempts: Prisma.QuestionAttemptCreateManyInput[] = [];
    for (const item of snapshot) {
      const answer = answerFor(item.question, rng() < accuracy, rng);
      if (!answer) {
        continue;
      }
      let isCorrect: boolean;
      try {
        isCorrect = evaluateAnswer(
          item.question.type,
          answer,
          item.question.answerOptions,
          item.question.configuration,
        );
      } catch {
        continue; // a shape this question does not accept: left unanswered
      }
      attempts.push({
        quizSessionId: sessionId,
        questionId: item.questionId,
        selectedAnswer: answer as Prisma.InputJsonValue,
        isCorrect,
        timeSpentSeconds: 25 + Math.floor(rng() * 80),
      });
    }
    await this.prisma.questionAttempt.createMany({ data: attempts });
    await this.quizService.complete(userId, sessionId);
    this.sessions += 1;

    await this.moveToPast(
      userId,
      sessionId,
      snapshot.map((item) => item.questionId),
      at,
      minutes,
    );
  }

  /** Moves a finished sitting — and what it did to the ladder — back in time. */
  private async moveToPast(
    userId: string,
    sessionId: string,
    questionIds: string[],
    at: Date,
    minutes: number,
  ): Promise<void> {
    const shiftMs = Math.max(0, Date.now() - at.getTime());
    const startedAt = new Date(at.getTime() - minutes * 60 * 1000);

    await this.prisma.$transaction([
      this.prisma.quizSession.update({
        where: { id: sessionId },
        data: { startedAt, completedAt: at, durationSeconds: minutes * 60 },
      }),
      this.prisma.result.updateMany({
        where: { quizSessionId: sessionId },
        data: { completedAt: at, createdAt: at },
      }),
      this.prisma.xPTransaction.updateMany({
        where: { quizSessionId: sessionId },
        data: { createdAt: at },
      }),
      this.prisma.questionAttempt.updateMany({
        where: { quizSessionId: sessionId },
        data: { answeredAt: at },
      }),
      // A mistake from ten days ago is due by now; one from yesterday is not.
      this.prisma.$executeRaw`
        UPDATE "mistake_reviews"
        SET "dueAt" = "dueAt" - (${shiftMs} * interval '1 millisecond'),
            "createdAt" = "createdAt" - (${shiftMs} * interval '1 millisecond')
        WHERE "userId" = ${userId}::uuid AND "questionId" = ANY(${questionIds}::uuid[])`,
      this.prisma.$executeRaw`
        UPDATE "question_exposures"
        SET "shownAt" = "shownAt" - (${shiftMs} * interval '1 millisecond')
        WHERE "userId" = ${userId}::uuid AND "questionId" = ANY(${questionIds}::uuid[])`,
    ]);
  }

  private async subject(slug: string): Promise<string> {
    const subject = await this.prisma.subject.findUniqueOrThrow({
      where: { slug },
      select: { id: true },
    });
    return subject.id;
  }

  private async topic(subjectId: string, slug: string): Promise<string> {
    const topic = await this.prisma.topic.findUniqueOrThrow({
      where: { subjectId_slug: { subjectId, slug } },
      select: { id: true },
    });
    return topic.id;
  }
}

/**
 * An answer of the shape the engine accepts, right or wrong on request.
 * Matching is left unanswered: building a valid wrong pairing is more code
 * than the demo is worth, and an unanswered task scores as a wrong one.
 */
function answerFor(
  question: SnapshotQuestion['question'],
  right: boolean,
  rng: () => number,
): Record<string, unknown> | null {
  const options = question.answerOptions;
  const correct = options.filter((option) => option.isCorrect);
  const wrong = options.filter((option) => !option.isCorrect);

  switch (question.type) {
    case QuestionType.SINGLE_CHOICE: {
      const pool = right ? correct : wrong;
      const pick = pool[Math.floor(rng() * pool.length)];
      return pick ? { answerOptionId: pick.id } : null;
    }
    case QuestionType.MULTIPLE_CHOICE: {
      const ids = correct.map((option) => option.id);
      if (right) return { answerOptionIds: ids };
      return wrong[0]
        ? { answerOptionIds: [...ids.slice(1), wrong[0].id] }
        : null;
    }
    case QuestionType.ORDERING: {
      const sequence = [...options]
        .sort((a, b) => a.order - b.order)
        .map((option) => option.id);
      return { sequence: right ? sequence : [...sequence].reverse() };
    }
    case QuestionType.NUMERIC: {
      const expected = correctAnswerFor(
        question.type,
        options,
        question.configuration,
      ).numericAnswer;
      if (typeof expected !== 'number') return null;
      return { numericAnswer: right ? expected : expected + 1 };
    }
    default:
      return null;
  }
}

/** A small deterministic generator, so a reset draws the same shape of story. */
function seeded(seed: string): () => number {
  let state = 0;
  for (const char of seed) {
    state = (Math.imul(state, 31) + char.charCodeAt(0)) | 0;
  }
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
