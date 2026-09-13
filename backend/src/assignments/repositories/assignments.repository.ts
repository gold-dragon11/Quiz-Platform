import { Injectable } from '@nestjs/common';
import { Difficulty, Prisma, QuizStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const ASSIGNMENT_SELECT = {
  id: true,
  groupId: true,
  createdById: true,
  title: true,
  description: true,
  openAt: true,
  dueAt: true,
  attemptsAllowed: true,
  scoredAttempt: true,
  explanations: true,
  mockExam: true,
  createdAt: true,
  group: {
    select: {
      id: true,
      name: true,
      ownerId: true,
      subject: { select: { id: true, name: true, slug: true } },
      owner: { select: { profile: { select: { displayName: true } } } },
    },
  },
  _count: { select: { questions: true, targets: true } },
} as const;

export type AssignmentRow = Prisma.AssignmentGetPayload<{
  select: typeof ASSIGNMENT_SELECT;
}>;

/**
 * Data access for assignments (docs/02-domain/assignment.md).
 *
 * Creation writes three tables in one transaction: the assignment, its frozen
 * question list, and its frozen recipient list. A partial write here would
 * leave an assignment nobody was given or one with no questions — both of which
 * look like a product bug to a teacher standing in front of a class.
 */
@Injectable()
export class AssignmentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createWithSnapshots(input: {
    groupId: string;
    createdById: string;
    title: string;
    description?: string;
    openAt?: Date;
    dueAt: Date;
    attemptsAllowed: number;
    scoredAttempt: Prisma.AssignmentCreateInput['scoredAttempt'];
    explanations: Prisma.AssignmentCreateInput['explanations'];
    mockExam: boolean;
    questionIds: string[];
    studentIds: string[];
  }): Promise<AssignmentRow> {
    return this.prisma.$transaction(async (tx) => {
      const assignment = await tx.assignment.create({
        data: {
          groupId: input.groupId,
          createdById: input.createdById,
          title: input.title,
          description: input.description,
          openAt: input.openAt,
          dueAt: input.dueAt,
          attemptsAllowed: input.attemptsAllowed,
          scoredAttempt: input.scoredAttempt,
          explanations: input.explanations,
          mockExam: input.mockExam,
          questions: {
            create: input.questionIds.map((questionId, index) => ({
              questionId,
              order: index,
            })),
          },
          targets: {
            create: input.studentIds.map((studentId) => ({ studentId })),
          },
        },
        select: { id: true },
      });

      return tx.assignment.findUniqueOrThrow({
        where: { id: assignment.id },
        select: ASSIGNMENT_SELECT,
      });
    });
  }

  async findById(assignmentId: string): Promise<AssignmentRow | null> {
    return this.prisma.assignment.findUnique({
      where: { id: assignmentId },
      select: ASSIGNMENT_SELECT,
    });
  }

  async listForGroup(groupId: string): Promise<AssignmentRow[]> {
    return this.prisma.assignment.findMany({
      where: { groupId },
      select: ASSIGNMENT_SELECT,
      orderBy: { dueAt: 'desc' },
    });
  }

  /** Assignments this student was actually issued — never a live group query. */
  async listForStudent(studentId: string): Promise<AssignmentRow[]> {
    return this.prisma.assignment.findMany({
      where: { targets: { some: { studentId } } },
      select: ASSIGNMENT_SELECT,
      orderBy: { dueAt: 'asc' },
    });
  }

  async update(
    assignmentId: string,
    data: Prisma.AssignmentUpdateInput,
  ): Promise<AssignmentRow> {
    return this.prisma.assignment.update({
      where: { id: assignmentId },
      data,
      select: ASSIGNMENT_SELECT,
    });
  }

  async isTarget(assignmentId: string, studentId: string): Promise<boolean> {
    const target = await this.prisma.assignmentTarget.findUnique({
      where: { assignmentId_studentId: { assignmentId, studentId } },
      select: { id: true },
    });
    return target !== null;
  }

  /**
   * Completed sessions per assignment for one student. Used both for the
   * attempt count and for the deadline comparison that marks work late.
   */
  async completedSessions(
    assignmentIds: string[],
    studentId: string,
  ): Promise<Map<string, { attempts: number; firstCompletedAt: Date }>> {
    if (assignmentIds.length === 0) {
      return new Map();
    }

    const rows = await this.prisma.quizSession.findMany({
      where: {
        assignmentId: { in: assignmentIds },
        userId: studentId,
        status: QuizStatus.COMPLETED,
      },
      select: { assignmentId: true, completedAt: true },
      orderBy: { completedAt: 'asc' },
    });

    const byAssignment = new Map<
      string,
      { attempts: number; firstCompletedAt: Date }
    >();
    for (const row of rows) {
      if (!row.assignmentId || !row.completedAt) {
        continue;
      }
      const existing = byAssignment.get(row.assignmentId);
      if (existing) {
        existing.attempts += 1;
      } else {
        byAssignment.set(row.assignmentId, {
          attempts: 1,
          firstCompletedAt: row.completedAt,
        });
      }
    }
    return byAssignment;
  }

  /** How many recipients have completed each assignment at least once. */
  async submittedCounts(assignmentIds: string[]): Promise<Map<string, number>> {
    if (assignmentIds.length === 0) {
      return new Map();
    }

    const rows = await this.prisma.quizSession.findMany({
      where: {
        assignmentId: { in: assignmentIds },
        status: QuizStatus.COMPLETED,
      },
      select: { assignmentId: true, userId: true },
      distinct: ['assignmentId', 'userId'],
    });

    const counts = new Map<string, number>();
    for (const row of rows) {
      if (!row.assignmentId) {
        continue;
      }
      counts.set(row.assignmentId, (counts.get(row.assignmentId) ?? 0) + 1);
    }
    return counts;
  }

  // ------------------------------------------------------- question picking

  /** Published, non-deleted questions of one subject, optionally one topic. */
  async findSelectableQuestions(params: {
    subjectId: string;
    topicId?: string;
    difficulty?: Difficulty;
    limit?: number;
  }): Promise<{ id: string }[]> {
    return this.prisma.question.findMany({
      where: {
        isPublished: true,
        deletedAt: null,
        difficulty: params.difficulty,
        topic: {
          id: params.topicId,
          subjectId: params.subjectId,
          isPublished: true,
          deletedAt: null,
        },
      },
      select: { id: true },
      take: params.limit,
    });
  }

  /** Validates a manual pick: which of these ids are usable in this subject. */
  async findUsableQuestionIds(
    questionIds: string[],
    subjectId: string,
  ): Promise<Set<string>> {
    const rows = await this.prisma.question.findMany({
      where: {
        id: { in: questionIds },
        isPublished: true,
        deletedAt: null,
        topic: { subjectId, isPublished: true, deletedAt: null },
      },
      select: { id: true },
    });
    return new Set(rows.map((row) => row.id));
  }

  /** The frozen question list, in the order every recipient sees it. */
  async findQuestionIds(assignmentId: string): Promise<string[]> {
    const rows = await this.prisma.assignmentQuestion.findMany({
      where: { assignmentId },
      orderBy: { order: 'asc' },
      select: { questionId: true },
    });
    return rows.map((row) => row.questionId);
  }

  async topicBelongsToSubject(
    topicId: string,
    subjectId: string,
  ): Promise<boolean> {
    const topic = await this.prisma.topic.findFirst({
      where: { id: topicId, subjectId, isPublished: true, deletedAt: null },
      select: { id: true },
    });
    return topic !== null;
  }
}
