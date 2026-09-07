import { Injectable } from '@nestjs/common';
import { QuizStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

/** One completed run at an assignment, with everything scoring needs. */
export interface CompletedRun {
  studentId: string;
  assignmentId: string;
  sessionId: string;
  completedAt: Date;
  durationSeconds: number | null;
  correctAnswers: number;
  totalQuestions: number;
  accuracy: number;
}

/** One answer, reduced to what the aggregates need. */
export interface AttemptRow {
  studentId: string;
  questionId: string;
  topicId: string;
  topicName: string;
  isCorrect: boolean;
}

/**
 * Reads behind the teacher's review screens (docs/02-domain/group.md §6).
 *
 * Every query here is anchored to assignments — never to the group's current
 * roster. That is not a stylistic choice: the target list of an assignment is
 * frozen at issue, so anchoring to it makes the time-bounded permission rule
 * *structural*. A teacher sees the work they set, for as long as they own the
 * group, and nothing else. There is no membership check to forget, because
 * membership is not what the query is built on.
 */
@Injectable()
export class ReviewRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Completed runs at these assignments, oldest first. */
  async completedRuns(assignmentIds: string[]): Promise<CompletedRun[]> {
    if (assignmentIds.length === 0) {
      return [];
    }

    const sessions = await this.prisma.quizSession.findMany({
      where: {
        assignmentId: { in: assignmentIds },
        status: QuizStatus.COMPLETED,
      },
      orderBy: { completedAt: 'asc' },
      select: {
        id: true,
        userId: true,
        assignmentId: true,
        completedAt: true,
        durationSeconds: true,
        result: {
          select: {
            correctAnswers: true,
            totalQuestions: true,
            accuracy: true,
          },
        },
      },
    });

    const runs: CompletedRun[] = [];
    for (const session of sessions) {
      if (!session.assignmentId || !session.completedAt || !session.result) {
        continue;
      }
      runs.push({
        studentId: session.userId,
        assignmentId: session.assignmentId,
        sessionId: session.id,
        completedAt: session.completedAt,
        durationSeconds: session.durationSeconds,
        correctAnswers: session.result.correctAnswers,
        totalQuestions: session.result.totalQuestions,
        accuracy: Number(session.result.accuracy),
      });
    }
    return runs;
  }

  /** Students with an unfinished run at one of these assignments. */
  async studentsInProgress(assignmentIds: string[]): Promise<Set<string>> {
    if (assignmentIds.length === 0) {
      return new Set();
    }

    const rows = await this.prisma.quizSession.findMany({
      where: {
        assignmentId: { in: assignmentIds },
        status: QuizStatus.ACTIVE,
      },
      select: { userId: true },
      distinct: ['userId'],
    });
    return new Set(rows.map((row) => row.userId));
  }

  /**
   * Every answer given inside these assignments.
   *
   * Deliberately includes answers from students who have since left the group:
   * they were recipients when the work was set, and erasing their results would
   * rewrite what actually happened in the class.
   */
  async attempts(assignmentIds: string[]): Promise<AttemptRow[]> {
    if (assignmentIds.length === 0) {
      return [];
    }

    const rows = await this.prisma.questionAttempt.findMany({
      where: {
        quizSession: {
          assignmentId: { in: assignmentIds },
          status: QuizStatus.COMPLETED,
        },
      },
      select: {
        isCorrect: true,
        questionId: true,
        quizSession: { select: { userId: true } },
        question: {
          select: { topicId: true, topic: { select: { name: true } } },
        },
      },
    });

    return rows.map((row) => ({
      studentId: row.quizSession.userId,
      questionId: row.questionId,
      topicId: row.question.topicId,
      topicName: row.question.topic.name,
      isCorrect: row.isCorrect,
    }));
  }

  /** The frozen question list with everything the breakdown displays. */
  async assignmentQuestions(assignmentId: string): Promise<
    {
      order: number;
      questionId: string;
      title: string;
      difficulty: string | null;
      topic: { id: string; name: string } | null;
    }[]
  > {
    const rows = await this.prisma.assignmentQuestion.findMany({
      where: { assignmentId },
      orderBy: { order: 'asc' },
      select: {
        order: true,
        questionId: true,
        question: {
          select: {
            title: true,
            difficulty: true,
            topicId: true,
            topic: { select: { name: true } },
          },
        },
      },
    });

    return rows.map((row) => ({
      order: row.order,
      questionId: row.questionId,
      title: row.question.title,
      difficulty: row.question.difficulty,
      topic: { id: row.question.topicId, name: row.question.topic.name },
    }));
  }

  /** The frozen recipient list, with profiles and current membership state. */
  async assignmentTargets(
    assignmentId: string,
    groupId: string,
  ): Promise<
    {
      studentId: string;
      displayName: string | null;
      username: string | null;
      stillInGroup: boolean;
    }[]
  > {
    const targets = await this.prisma.assignmentTarget.findMany({
      where: { assignmentId },
      select: {
        studentId: true,
        student: {
          select: {
            profile: { select: { displayName: true, username: true } },
            groupMemberships: {
              where: { groupId, leftAt: null },
              select: { id: true },
            },
          },
        },
      },
    });

    return targets.map((target) => ({
      studentId: target.studentId,
      displayName: target.student.profile?.displayName ?? null,
      username: target.student.profile?.username ?? null,
      stillInGroup: target.student.groupMemberships.length > 0,
    }));
  }

  /** How many recipients these assignments have between them. */
  async countTargets(assignmentIds: string[]): Promise<number> {
    if (assignmentIds.length === 0) {
      return 0;
    }
    return this.prisma.assignmentTarget.count({
      where: { assignmentId: { in: assignmentIds } },
    });
  }

  /**
   * A learner's own practice in one subject, reduced to an aggregate.
   *
   * Only sessions with no assignment and no duel: those are the ones the
   * learner chose to run. Returns counts and per-topic tallies — never the
   * sessions themselves, because decision 04 shares the shape of the work and
   * not its diary.
   */
  async selfStudyAggregate(
    studentId: string,
    subjectId: string,
  ): Promise<{
    sessions: number;
    answered: number;
    correct: number;
    lastActivityAt: Date | null;
    topics: {
      topicId: string;
      topicName: string;
      answered: number;
      correct: number;
    }[];
  }> {
    const sessions = await this.prisma.quizSession.findMany({
      where: {
        userId: studentId,
        subjectId,
        assignmentId: null,
        duelId: null,
        status: QuizStatus.COMPLETED,
      },
      select: { id: true, completedAt: true },
    });
    if (sessions.length === 0) {
      return {
        sessions: 0,
        answered: 0,
        correct: 0,
        lastActivityAt: null,
        topics: [],
      };
    }

    const attempts = await this.prisma.questionAttempt.findMany({
      where: { quizSessionId: { in: sessions.map((one) => one.id) } },
      select: {
        isCorrect: true,
        question: {
          select: { topicId: true, topic: { select: { name: true } } },
        },
      },
    });

    const byTopic = new Map<
      string,
      { topicId: string; topicName: string; answered: number; correct: number }
    >();
    for (const attempt of attempts) {
      const entry = byTopic.get(attempt.question.topicId) ?? {
        topicId: attempt.question.topicId,
        topicName: attempt.question.topic.name,
        answered: 0,
        correct: 0,
      };
      entry.answered += 1;
      if (attempt.isCorrect) {
        entry.correct += 1;
      }
      byTopic.set(attempt.question.topicId, entry);
    }

    const completions = sessions
      .map((one) => one.completedAt)
      .filter((one): one is Date => one !== null)
      .sort((left, right) => right.getTime() - left.getTime());

    return {
      sessions: sessions.length,
      answered: attempts.length,
      correct: attempts.filter((one) => one.isCorrect).length,
      lastActivityAt: completions[0] ?? null,
      topics: [...byTopic.values()],
    };
  }

  /** Whether this learner lets their tutors see that aggregate (decision 16). */
  async sharesSelfStudy(studentId: string): Promise<boolean> {
    const settings = await this.prisma.userSettings.findUnique({
      where: { userId: studentId },
      select: { shareSelfStudyWithTutors: true },
    });
    // No settings row yet means defaults, and the default is on.
    return settings?.shareSelfStudyWithTutors ?? true;
  }

  /** Assignment ids of one group — the anchor for every aggregate. */
  async assignmentIdsOfGroup(groupId: string): Promise<string[]> {
    const rows = await this.prisma.assignment.findMany({
      where: { groupId },
      select: { id: true },
    });
    return rows.map((row) => row.id);
  }

  /** Assignment ids of one group that were issued to one student. */
  async assignmentIdsFor(
    groupId: string,
    studentId: string,
  ): Promise<{ id: string; dueAt: Date }[]> {
    return this.prisma.assignment.findMany({
      where: { groupId, targets: { some: { studentId } } },
      select: { id: true, dueAt: true },
    });
  }

  /**
   * Every assignment in the group with the students it was issued to.
   *
   * One query for the whole group rather than one per student: the roster view
   * needs the same three counts for everybody, and asking per student turned a
   * class of thirty into thirty round trips.
   */
  async assignmentsWithTargets(
    groupId: string,
  ): Promise<{ id: string; dueAt: Date; studentIds: string[] }[]> {
    const rows = await this.prisma.assignment.findMany({
      where: { groupId },
      select: {
        id: true,
        dueAt: true,
        targets: { select: { studentId: true } },
      },
    });

    return rows.map((row) => ({
      id: row.id,
      dueAt: row.dueAt,
      studentIds: row.targets.map((target) => target.studentId),
    }));
  }
}
