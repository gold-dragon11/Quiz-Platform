import { Injectable, NotFoundException } from '@nestjs/common';
import { ScoredAttempt } from '@prisma/client';
import { GroupsRepository } from '../../groups/repositories/groups.repository';
import { AssignmentsRepository } from '../repositories/assignments.repository';
import {
  AttemptRow,
  CompletedRun,
  ReviewRepository,
} from '../repositories/review.repository';
import {
  GroupAnalytics,
  QuestionBreakdownRow,
  StudentProfile,
  SubmissionRow,
  TopicPerformance,
} from '../types/review.types';

const GROUP_NOT_FOUND_MESSAGE = 'Групу не знайдено.';
const ASSIGNMENT_NOT_FOUND_MESSAGE = 'Завдання не знайдено.';
const STUDENT_NOT_FOUND_MESSAGE = 'Учня не знайдено в цій групі.';

/** How many weak topics a profile or a group summary leads with. */
const WEAKEST_TOPICS_SHOWN = 5;

/**
 * The teacher's view of how the work went (docs/02-domain/group.md §6).
 *
 * Everything here is computed from assignments. That is what makes the
 * time-bounded access rule structural instead of a check somebody has to
 * remember: an assignment's recipient list is frozen at issue, so a query
 * anchored to assignments can only ever return work this teacher actually set.
 * A student who has since left keeps appearing in the results of work they
 * were given, and never appears anywhere else.
 */
@Injectable()
export class ReviewService {
  constructor(
    private readonly reviewRepository: ReviewRepository,
    private readonly assignmentsRepository: AssignmentsRepository,
    private readonly groupsRepository: GroupsRepository,
  ) {}

  /**
   * Who did the work, who did not, and how they scored — the screen a teacher
   * opens before the next lesson.
   */
  async submissions(
    teacherId: string,
    assignmentId: string,
  ): Promise<SubmissionRow[]> {
    const assignment = await this.requireOwnedAssignment(
      teacherId,
      assignmentId,
    );

    const [targets, runs, inProgress] = await Promise.all([
      this.reviewRepository.assignmentTargets(assignmentId, assignment.groupId),
      this.reviewRepository.completedRuns([assignmentId]),
      this.reviewRepository.studentsInProgress([assignmentId]),
    ]);

    const runsByStudent = new Map<string, CompletedRun[]>();
    for (const run of runs) {
      const list = runsByStudent.get(run.studentId) ?? [];
      list.push(run);
      runsByStudent.set(run.studentId, list);
    }

    return targets.map((target) => {
      const attempts = runsByStudent.get(target.studentId) ?? [];
      const scored = this.pickScoredRun(attempts, assignment.scoredAttempt);

      return {
        student: {
          id: target.studentId,
          displayName: target.displayName,
          username: target.username,
          stillInGroup: target.stillInGroup,
        },
        status:
          attempts.length > 0
            ? 'SUBMITTED'
            : inProgress.has(target.studentId)
              ? 'IN_PROGRESS'
              : 'NOT_STARTED',
        attempts: attempts.length,
        score: scored
          ? {
              correctAnswers: scored.correctAnswers,
              totalQuestions: scored.totalQuestions,
              accuracy: scored.accuracy,
              completedAt: scored.completedAt,
              durationSeconds: scored.durationSeconds,
              late: scored.completedAt.getTime() > assignment.dueAt.getTime(),
            }
          : null,
      };
    });
  }

  /**
   * Which questions the class fell over. This is the part that turns results
   * into a lesson plan, so the ordering keeps the assignment's own order rather
   * than sorting by difficulty — a teacher walks through the paper.
   */
  async questionBreakdown(
    teacherId: string,
    assignmentId: string,
  ): Promise<QuestionBreakdownRow[]> {
    await this.requireOwnedAssignment(teacherId, assignmentId);

    const [questions, attempts] = await Promise.all([
      this.reviewRepository.assignmentQuestions(assignmentId),
      this.reviewRepository.attempts([assignmentId]),
    ]);

    const byQuestion = new Map<string, { answered: number; correct: number }>();
    for (const attempt of attempts) {
      const tally = byQuestion.get(attempt.questionId) ?? {
        answered: 0,
        correct: 0,
      };
      tally.answered += 1;
      if (attempt.isCorrect) {
        tally.correct += 1;
      }
      byQuestion.set(attempt.questionId, tally);
    }

    return questions.map((question) => {
      const tally = byQuestion.get(question.questionId);
      return {
        questionId: question.questionId,
        order: question.order,
        title: question.title,
        topic: question.topic,
        difficulty: question.difficulty,
        answered: tally?.answered ?? 0,
        correct: tally?.correct ?? 0,
        accuracy: tally?.answered
          ? Math.round((tally.correct / tally.answered) * 100)
          : null,
      };
    });
  }

  /** One student inside one group, built only from work set in that group. */
  async studentProfile(
    teacherId: string,
    groupId: string,
    studentId: string,
  ): Promise<StudentProfile> {
    await this.requireOwnedGroup(teacherId, groupId);

    const membership = await this.findMembership(groupId, studentId);
    if (!membership) {
      throw new NotFoundException(STUDENT_NOT_FOUND_MESSAGE);
    }

    const issued = await this.reviewRepository.assignmentIdsFor(
      groupId,
      studentId,
    );
    const assignmentIds = issued.map((one) => one.id);
    const dueByAssignment = new Map(issued.map((one) => [one.id, one.dueAt]));

    const [runs, attempts] = await Promise.all([
      this.reviewRepository.completedRuns(assignmentIds),
      this.reviewRepository.attempts(assignmentIds),
    ]);

    const mine = runs.filter((run) => run.studentId === studentId);
    const submitted = new Set(mine.map((run) => run.assignmentId));
    const late = mine.filter((run) => {
      const dueAt = dueByAssignment.get(run.assignmentId);
      return dueAt ? run.completedAt.getTime() > dueAt.getTime() : false;
    });

    const myAttempts = attempts.filter(
      (attempt) => attempt.studentId === studentId,
    );

    return {
      student: {
        id: studentId,
        displayName: membership.displayName,
        username: membership.username,
        joinedAt: membership.joinedAt,
        leftAt: membership.leftAt,
      },
      assignmentsIssued: assignmentIds.length,
      assignmentsSubmitted: submitted.size,
      // Counted per assignment, not per run: three late attempts at one
      // assignment is one piece of late work, not three.
      assignmentsLate: new Set(late.map((run) => run.assignmentId)).size,
      overallAccuracy: this.accuracyOf(myAttempts),
      weakestTopics: this.topicPerformance(myAttempts).slice(
        0,
        WEAKEST_TOPICS_SHOWN,
      ),
    };
  }

  /** The group as a whole — what to spend the next lesson on. */
  async groupAnalytics(
    teacherId: string,
    groupId: string,
  ): Promise<GroupAnalytics> {
    await this.requireOwnedGroup(teacherId, groupId);

    const assignmentIds =
      await this.reviewRepository.assignmentIdsOfGroup(groupId);
    const [members, runs, attempts] = await Promise.all([
      this.groupsRepository.listOpenMembers(groupId),
      this.reviewRepository.completedRuns(assignmentIds),
      this.reviewRepository.attempts(assignmentIds),
    ]);

    const expected = await this.reviewRepository.countTargets(assignmentIds);
    const handedIn = new Set(
      runs.map((run) => `${run.assignmentId}:${run.studentId}`),
    ).size;

    return {
      studentCount: members.length,
      assignmentsIssued: assignmentIds.length,
      completionRate:
        expected > 0 ? Math.round((handedIn / expected) * 100) : null,
      topics: this.topicPerformance(attempts),
    };
  }

  /**
   * The topics this group struggles with most — the pool the MISTAKES
   * selection mode draws from.
   */
  async weakestTopicIds(groupId: string, limit: number): Promise<string[]> {
    const assignmentIds =
      await this.reviewRepository.assignmentIdsOfGroup(groupId);
    const attempts = await this.reviewRepository.attempts(assignmentIds);

    return this.topicPerformance(attempts)
      .slice(0, limit)
      .map((topic) => topic.topicId);
  }

  // ----------------------------------------------------------------- shared

  /**
   * Which run counts. A teacher who allowed three attempts and chose FIRST
   * meant it — the later runs stay visible in the attempt count, but they do
   * not become the mark.
   */
  private pickScoredRun(
    runs: CompletedRun[],
    rule: ScoredAttempt,
  ): CompletedRun | null {
    if (runs.length === 0) {
      return null;
    }
    switch (rule) {
      case ScoredAttempt.FIRST:
        return runs[0];
      case ScoredAttempt.LAST:
        return runs[runs.length - 1];
      case ScoredAttempt.BEST:
        return runs.reduce((best, run) =>
          run.accuracy > best.accuracy ? run : best,
        );
    }
  }

  /** Worst accuracy first, and ties broken by volume so noise sinks. */
  private topicPerformance(attempts: AttemptRow[]): TopicPerformance[] {
    const byTopic = new Map<string, TopicPerformance>();

    for (const attempt of attempts) {
      const entry = byTopic.get(attempt.topicId) ?? {
        topicId: attempt.topicId,
        topicName: attempt.topicName,
        answered: 0,
        correct: 0,
        accuracy: 0,
      };
      entry.answered += 1;
      if (attempt.isCorrect) {
        entry.correct += 1;
      }
      byTopic.set(attempt.topicId, entry);
    }

    return [...byTopic.values()]
      .map((entry) => ({
        ...entry,
        accuracy: Math.round((entry.correct / entry.answered) * 100),
      }))
      .sort(
        (left, right) =>
          left.accuracy - right.accuracy || right.answered - left.answered,
      );
  }

  private accuracyOf(attempts: AttemptRow[]): number | null {
    if (attempts.length === 0) {
      return null;
    }
    const correct = attempts.filter((attempt) => attempt.isCorrect).length;
    return Math.round((correct / attempts.length) * 100);
  }

  private async findMembership(
    groupId: string,
    studentId: string,
  ): Promise<{
    displayName: string | null;
    username: string | null;
    joinedAt: Date;
    leftAt: Date | null;
  } | null> {
    const members = await this.groupsRepository.listOpenMembers(groupId);
    const open = members.find((member) => member.student.id === studentId);
    if (open) {
      return {
        displayName: open.student.profile?.displayName ?? null,
        username: open.student.profile?.username ?? null,
        joinedAt: open.joinedAt,
        leftAt: null,
      };
    }
    return this.groupsRepository.findClosedMembership(groupId, studentId);
  }

  private async requireOwnedGroup(
    teacherId: string,
    groupId: string,
  ): Promise<void> {
    const group = await this.groupsRepository.findById(groupId);
    if (!group || group.ownerId !== teacherId) {
      throw new NotFoundException(GROUP_NOT_FOUND_MESSAGE);
    }
  }

  private async requireOwnedAssignment(
    teacherId: string,
    assignmentId: string,
  ): Promise<{
    groupId: string;
    dueAt: Date;
    scoredAttempt: ScoredAttempt;
  }> {
    const assignment = await this.assignmentsRepository.findById(assignmentId);
    if (!assignment || assignment.group.ownerId !== teacherId) {
      throw new NotFoundException(ASSIGNMENT_NOT_FOUND_MESSAGE);
    }
    return {
      groupId: assignment.groupId,
      dueAt: assignment.dueAt,
      scoredAttempt: assignment.scoredAttempt,
    };
  }
}
