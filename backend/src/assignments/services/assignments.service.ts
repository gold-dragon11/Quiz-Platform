import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ExplanationVisibility, ScoredAttempt } from '@prisma/client';
import { GroupsRepository } from '../../groups/repositories/groups.repository';
import { NotificationsService } from '../../notifications/services/notifications.service';
import { QuizService } from '../../quiz/services/quiz.service';
import { QuizSessionMetadata } from '../../quiz/types/quiz.types';
import { CreateAssignmentDto } from '../dto/create-assignment.dto';
import { UpdateAssignmentDto } from '../dto/update-assignment.dto';
import {
  AssignmentRow,
  AssignmentsRepository,
} from '../repositories/assignments.repository';
import {
  AssignmentStatus,
  StudentAssignment,
  TeacherAssignment,
} from '../types/assignment.types';
import { QuestionSelectionService } from './question-selection.service';

const GROUP_NOT_FOUND_MESSAGE = 'Групу не знайдено.';
const ASSIGNMENT_NOT_FOUND_MESSAGE = 'Завдання не знайдено.';
const ARCHIVED_GROUP_MESSAGE =
  'Групу заархівовано — нові завдання видавати не можна.';
const NO_STUDENTS_MESSAGE =
  'У групі немає учнів. Спершу поділіться кодом запрошення.';
const NOT_MEMBERS_MESSAGE = 'Не всі вибрані учні є в цій групі.';
const DUE_IN_PAST_MESSAGE = 'Дедлайн має бути в майбутньому.';
const OPEN_AFTER_DUE_MESSAGE = 'Відкриття не може бути пізніше за дедлайн.';
const NOT_OPEN_YET_MESSAGE = 'Завдання ще не відкрите.';
const NO_ATTEMPTS_LEFT_MESSAGE = 'Спроби вичерпано.';

/**
 * Assignments (docs/02-domain/assignment.md).
 *
 * The one idea worth holding while reading this file: an assignment is a
 * *record of an event*, not a live view. At the moment of issue the question
 * list and the recipient list are copied into their own tables and never
 * change again. Everything else here follows from that — why a later joiner
 * receives nothing, why a departing student keeps appearing in results, and
 * why the update path accepts three fields and no more.
 */
@Injectable()
export class AssignmentsService {
  constructor(
    private readonly assignmentsRepository: AssignmentsRepository,
    private readonly groupsRepository: GroupsRepository,
    private readonly questionSelection: QuestionSelectionService,
    private readonly quizService: QuizService,
    private readonly notificationsService: NotificationsService,
  ) {}

  // ---------------------------------------------------------------- teacher

  async create(
    teacherId: string,
    groupId: string,
    dto: CreateAssignmentDto,
  ): Promise<TeacherAssignment> {
    const group = await this.requireOwnedGroup(teacherId, groupId);
    if (group.archivedAt) {
      throw new ConflictException(ARCHIVED_GROUP_MESSAGE);
    }
    this.validateSchedule(dto.dueAt, dto.openAt);

    const questionIds = await this.questionSelection.resolve(
      dto,
      group.subject.id,
      groupId,
    );
    const studentIds = await this.resolveTargets(groupId, dto.studentIds);

    const assignment = await this.assignmentsRepository.createWithSnapshots({
      groupId,
      createdById: teacherId,
      title: dto.title,
      description: dto.description,
      openAt: dto.openAt,
      dueAt: dto.dueAt,
      attemptsAllowed: dto.attemptsAllowed ?? 1,
      scoredAttempt: dto.scoredAttempt ?? ScoredAttempt.FIRST,
      explanations: dto.explanations ?? ExplanationVisibility.AFTER_SUBMIT,
      questionIds,
      studentIds,
    });

    // Awaited rather than fired and forgotten: the teacher deserves to know
    // the mail went out, and NotificationsService swallows its own failures,
    // so setting homework cannot fail because a provider is down.
    await this.notificationsService.assignmentIssued(assignment.id);

    return this.toTeacherAssignment(assignment, 0);
  }

  async listForGroup(
    teacherId: string,
    groupId: string,
  ): Promise<TeacherAssignment[]> {
    await this.requireOwnedGroup(teacherId, groupId);
    const assignments = await this.assignmentsRepository.listForGroup(groupId);
    const submitted = await this.assignmentsRepository.submittedCounts(
      assignments.map((one) => one.id),
    );

    return assignments.map((assignment) =>
      this.toTeacherAssignment(assignment, submitted.get(assignment.id) ?? 0),
    );
  }

  async findForTeacher(
    teacherId: string,
    assignmentId: string,
  ): Promise<TeacherAssignment> {
    const assignment = await this.requireOwnedAssignment(
      teacherId,
      assignmentId,
    );
    const submitted = await this.assignmentsRepository.submittedCounts([
      assignmentId,
    ]);

    return this.toTeacherAssignment(
      assignment,
      submitted.get(assignmentId) ?? 0,
    );
  }

  /**
   * Title, description and deadline only. Moving the deadline is ordinary —
   * a teacher misreading a date should not have to delete an assignment and
   * lose what students already submitted.
   */
  async update(
    teacherId: string,
    assignmentId: string,
    dto: UpdateAssignmentDto,
  ): Promise<TeacherAssignment> {
    const existing = await this.requireOwnedAssignment(teacherId, assignmentId);
    if (dto.dueAt) {
      this.validateSchedule(dto.dueAt, existing.openAt ?? undefined);
    }

    const assignment = await this.assignmentsRepository.update(assignmentId, {
      title: dto.title,
      description: dto.description,
      dueAt: dto.dueAt,
    });
    const submitted = await this.assignmentsRepository.submittedCounts([
      assignmentId,
    ]);

    return this.toTeacherAssignment(
      assignment,
      submitted.get(assignmentId) ?? 0,
    );
  }

  // ---------------------------------------------------------------- student

  /**
   * A student's homework across every group they were issued work in.
   *
   * Driven by the frozen target list, never by current membership: work set
   * while they were in the group stays visible after they leave, and work set
   * before they joined never appears.
   */
  async listForStudent(studentId: string): Promise<StudentAssignment[]> {
    const assignments =
      await this.assignmentsRepository.listForStudent(studentId);
    const sessions = await this.assignmentsRepository.completedSessions(
      assignments.map((one) => one.id),
      studentId,
    );

    return assignments.map((assignment) =>
      this.toStudentAssignment(assignment, sessions.get(assignment.id)),
    );
  }

  /**
   * Starts — or resumes — work on an assignment.
   *
   * This method owns the question of *whether* the student may begin; the quiz
   * engine owns what happens once they do. Three gates, in the order a student
   * runs into them: were you given this, has it opened, have you any attempts
   * left.
   *
   * A missed deadline is deliberately not a gate. Late work is still work
   * (decision 11) — it is marked late, not refused, so a student who was ill
   * does not lose the material along with the marks.
   */
  async start(
    studentId: string,
    assignmentId: string,
  ): Promise<QuizSessionMetadata> {
    const assignment = await this.assignmentsRepository.findById(assignmentId);
    if (
      !assignment ||
      !(await this.assignmentsRepository.isTarget(assignmentId, studentId))
    ) {
      throw new NotFoundException(ASSIGNMENT_NOT_FOUND_MESSAGE);
    }

    if (assignment.openAt && assignment.openAt.getTime() > Date.now()) {
      throw new ConflictException(NOT_OPEN_YET_MESSAGE);
    }

    const completed = await this.assignmentsRepository.completedSessions(
      [assignmentId],
      studentId,
    );
    const used = completed.get(assignmentId)?.attempts ?? 0;
    if (used >= assignment.attemptsAllowed) {
      throw new ConflictException(NO_ATTEMPTS_LEFT_MESSAGE);
    }

    const questionIds =
      await this.assignmentsRepository.findQuestionIds(assignmentId);

    return this.quizService.startFromAssignment(studentId, {
      assignmentId,
      subjectId: assignment.group.subject.id,
      questionIds,
    });
  }

  async findForStudent(
    studentId: string,
    assignmentId: string,
  ): Promise<StudentAssignment> {
    const assignment = await this.assignmentsRepository.findById(assignmentId);
    if (
      !assignment ||
      !(await this.assignmentsRepository.isTarget(assignmentId, studentId))
    ) {
      throw new NotFoundException(ASSIGNMENT_NOT_FOUND_MESSAGE);
    }

    const sessions = await this.assignmentsRepository.completedSessions(
      [assignmentId],
      studentId,
    );

    return this.toStudentAssignment(assignment, sessions.get(assignmentId));
  }

  // ----------------------------------------------------------------- shared

  private async requireOwnedGroup(
    teacherId: string,
    groupId: string,
  ): Promise<NonNullable<Awaited<ReturnType<GroupsRepository['findById']>>>> {
    const group = await this.groupsRepository.findById(groupId);
    if (!group || group.ownerId !== teacherId) {
      throw new NotFoundException(GROUP_NOT_FOUND_MESSAGE);
    }
    return group;
  }

  /** Same rule as groups: someone else's assignment is a 404, never a 403. */
  private async requireOwnedAssignment(
    teacherId: string,
    assignmentId: string,
  ): Promise<AssignmentRow> {
    const assignment = await this.assignmentsRepository.findById(assignmentId);
    if (!assignment || assignment.group.ownerId !== teacherId) {
      throw new NotFoundException(ASSIGNMENT_NOT_FOUND_MESSAGE);
    }
    return assignment;
  }

  /**
   * Turns the request into a concrete recipient list.
   *
   * Omitting `studentIds` means the group *as it stands now* — the list is
   * materialised here, so later joiners are not retroactively included.
   */
  private async resolveTargets(
    groupId: string,
    requested?: string[],
  ): Promise<string[]> {
    const members = await this.groupsRepository.listOpenMembers(groupId);
    const memberIds = new Set(members.map((member) => member.student.id));

    if (memberIds.size === 0) {
      throw new ConflictException(NO_STUDENTS_MESSAGE);
    }
    if (!requested) {
      return [...memberIds];
    }
    if (requested.some((id) => !memberIds.has(id))) {
      throw new BadRequestException(NOT_MEMBERS_MESSAGE);
    }
    return requested;
  }

  private validateSchedule(dueAt: Date, openAt?: Date): void {
    if (dueAt.getTime() <= Date.now()) {
      throw new BadRequestException(DUE_IN_PAST_MESSAGE);
    }
    if (openAt && openAt.getTime() >= dueAt.getTime()) {
      throw new BadRequestException(OPEN_AFTER_DUE_MESSAGE);
    }
  }

  private toTeacherAssignment(
    assignment: AssignmentRow,
    submittedCount: number,
  ): TeacherAssignment {
    return {
      id: assignment.id,
      groupId: assignment.groupId,
      title: assignment.title,
      description: assignment.description,
      openAt: assignment.openAt,
      dueAt: assignment.dueAt,
      attemptsAllowed: assignment.attemptsAllowed,
      scoredAttempt: assignment.scoredAttempt,
      explanations: assignment.explanations,
      questionCount: assignment._count.questions,
      targetCount: assignment._count.targets,
      submittedCount,
      createdAt: assignment.createdAt,
    };
  }

  private toStudentAssignment(
    assignment: AssignmentRow,
    completed?: { attempts: number; firstCompletedAt: Date },
  ): StudentAssignment {
    const now = Date.now();
    const status: AssignmentStatus = completed
      ? 'SUBMITTED'
      : assignment.openAt && assignment.openAt.getTime() > now
        ? 'SCHEDULED'
        : assignment.dueAt.getTime() < now
          ? 'OVERDUE'
          : 'OPEN';

    return {
      id: assignment.id,
      title: assignment.title,
      description: assignment.description,
      group: { id: assignment.group.id, name: assignment.group.name },
      subject: assignment.group.subject,
      teacherName: assignment.group.owner.profile?.displayName ?? null,
      openAt: assignment.openAt,
      dueAt: assignment.dueAt,
      questionCount: assignment._count.questions,
      attemptsAllowed: assignment.attemptsAllowed,
      attemptsUsed: completed?.attempts ?? 0,
      status,
      late: completed
        ? completed.firstCompletedAt.getTime() > assignment.dueAt.getTime()
        : false,
    };
  }
}
