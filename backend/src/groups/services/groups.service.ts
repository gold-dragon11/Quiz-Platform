import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CreateGroupDto } from '../dto/create-group.dto';
import { JoinGroupDto } from '../dto/join-group.dto';
import { UpdateGroupDto } from '../dto/update-group.dto';
import { GroupRow, GroupsRepository } from '../repositories/groups.repository';
import { GroupStudent, StudentGroup, TeacherGroup } from '../types/group.types';
import { generateInviteCode, normalizeInviteCode } from '../utils/invite-code';

const GROUP_NOT_FOUND_MESSAGE = 'Групу не знайдено.';
const SUBJECT_NOT_FOUND_MESSAGE =
  'Предмет не знайдено або він не опублікований.';
const INVALID_CODE_MESSAGE =
  'Такого коду немає. Перевірте, чи правильно введено.';
const ARCHIVED_MESSAGE = 'Групу заархівовано, приєднатися вже не можна.';
const NOT_A_MEMBER_MESSAGE = 'Ви не в цій групі.';
const CODE_GENERATION_MESSAGE = 'Не вдалося згенерувати код запрошення.';

/** Collisions are vanishingly unlikely; a bounded retry keeps it that way. */
const CODE_ATTEMPTS = 5;

/**
 * Group management (docs/02-domain/group.md).
 *
 * Two rules run through everything here.
 *
 * A teacher reaches their **own** groups only, and a group belonging to someone
 * else answers 404 rather than 403: a teacher has no business learning that a
 * particular group id exists at all.
 *
 * Leaving a group closes the membership instead of deleting it
 * (docs/02-domain/group.md §5.1), so every roster read filters on open
 * memberships. Forgetting that filter would quietly put former students back
 * on the register — and, once billing exists, back on the invoice.
 */
@Injectable()
export class GroupsService {
  constructor(private readonly groupsRepository: GroupsRepository) {}

  // ---------------------------------------------------------------- teacher

  async create(ownerId: string, dto: CreateGroupDto): Promise<TeacherGroup> {
    if (!(await this.groupsRepository.subjectIsAvailable(dto.subjectId))) {
      throw new NotFoundException(SUBJECT_NOT_FOUND_MESSAGE);
    }

    const group = await this.groupsRepository.createGroup({
      ownerId,
      subjectId: dto.subjectId,
      name: dto.name,
      inviteCode: await this.allocateInviteCode(),
    });

    return this.toTeacherGroup(group, 0);
  }

  async listForTeacher(ownerId: string): Promise<TeacherGroup[]> {
    const groups = await this.groupsRepository.listOwnedBy(ownerId);
    const counts = await this.groupsRepository.countOpenMemberships(
      groups.map((group) => group.id),
    );

    return groups.map((group) =>
      this.toTeacherGroup(group, counts.get(group.id) ?? 0),
    );
  }

  async findForTeacher(
    ownerId: string,
    groupId: string,
  ): Promise<TeacherGroup> {
    const group = await this.requireOwnedGroup(ownerId, groupId);
    const counts = await this.groupsRepository.countOpenMemberships([groupId]);

    return this.toTeacherGroup(group, counts.get(groupId) ?? 0);
  }

  async rename(
    ownerId: string,
    groupId: string,
    dto: UpdateGroupDto,
  ): Promise<TeacherGroup> {
    await this.requireOwnedGroup(ownerId, groupId);
    const group = await this.groupsRepository.updateGroup(groupId, {
      name: dto.name,
    });
    const counts = await this.groupsRepository.countOpenMemberships([groupId]);

    return this.toTeacherGroup(group, counts.get(groupId) ?? 0);
  }

  /**
   * Archiving is the closest thing to deletion a group has. Last year's work is
   * what a teacher shows when deciding whether to renew, so the row stays and
   * only stops accepting new members.
   */
  async archive(ownerId: string, groupId: string): Promise<TeacherGroup> {
    const existing = await this.requireOwnedGroup(ownerId, groupId);
    if (existing.archivedAt) {
      return this.findForTeacher(ownerId, groupId);
    }

    const group = await this.groupsRepository.updateGroup(groupId, {
      archivedAt: new Date(),
    });
    const counts = await this.groupsRepository.countOpenMemberships([groupId]);

    return this.toTeacherGroup(group, counts.get(groupId) ?? 0);
  }

  /**
   * Replaces the invite code. The old one stops working immediately, which is
   * the only way a teacher has to lock a group that leaked into the wrong chat.
   */
  async regenerateInviteCode(
    ownerId: string,
    groupId: string,
  ): Promise<TeacherGroup> {
    await this.requireOwnedGroup(ownerId, groupId);
    const group = await this.groupsRepository.updateGroup(groupId, {
      inviteCode: await this.allocateInviteCode(),
    });
    const counts = await this.groupsRepository.countOpenMemberships([groupId]);

    return this.toTeacherGroup(group, counts.get(groupId) ?? 0);
  }

  async listStudents(
    ownerId: string,
    groupId: string,
  ): Promise<GroupStudent[]> {
    await this.requireOwnedGroup(ownerId, groupId);
    const members = await this.groupsRepository.listOpenMembers(groupId);

    return members.map((member) => ({
      id: member.student.id,
      displayName: member.student.profile?.displayName ?? null,
      username: member.student.profile?.username ?? null,
      joinedAt: member.joinedAt,
    }));
  }

  /**
   * Removing a student and a student leaving are the same event: the membership
   * closes. The student keeps their account, their statistics and their whole
   * mistake history — none of it ever belonged to the group.
   */
  async removeStudent(
    ownerId: string,
    groupId: string,
    studentId: string,
  ): Promise<void> {
    await this.requireOwnedGroup(ownerId, groupId);
    const membership = await this.groupsRepository.findOpenMembership(
      groupId,
      studentId,
    );
    if (!membership) {
      throw new NotFoundException(NOT_A_MEMBER_MESSAGE);
    }

    await this.groupsRepository.closeMembership(membership.id);
  }

  // ---------------------------------------------------------------- student

  /**
   * Joining is idempotent. A student who pastes the code twice is not making a
   * mistake worth an error page — they get the group either way.
   */
  async join(studentId: string, dto: JoinGroupDto): Promise<StudentGroup> {
    const group = await this.groupsRepository.findByInviteCode(
      normalizeInviteCode(dto.inviteCode),
    );
    if (!group) {
      throw new NotFoundException(INVALID_CODE_MESSAGE);
    }
    if (group.archivedAt) {
      throw new ConflictException(ARCHIVED_MESSAGE);
    }

    const existing = await this.groupsRepository.findOpenMembership(
      group.id,
      studentId,
    );
    const membership =
      existing ??
      (await this.groupsRepository.createMembership(group.id, studentId));

    return this.toStudentGroup(group, membership.joinedAt);
  }

  async listForStudent(studentId: string): Promise<StudentGroup[]> {
    const memberships =
      await this.groupsRepository.listGroupsForStudent(studentId);

    return memberships.map((membership) =>
      this.toStudentGroup(membership.group, membership.joinedAt),
    );
  }

  async leave(studentId: string, groupId: string): Promise<void> {
    const membership = await this.groupsRepository.findOpenMembership(
      groupId,
      studentId,
    );
    if (!membership) {
      throw new NotFoundException(NOT_A_MEMBER_MESSAGE);
    }

    await this.groupsRepository.closeMembership(membership.id);
  }

  // ----------------------------------------------------------------- shared

  /**
   * Loads a group and proves it belongs to this teacher. Anything else is a
   * 404: a group that is not yours should not be distinguishable from a group
   * that does not exist.
   */
  private async requireOwnedGroup(
    ownerId: string,
    groupId: string,
  ): Promise<GroupRow> {
    const group = await this.groupsRepository.findById(groupId);
    if (!group || group.ownerId !== ownerId) {
      throw new NotFoundException(GROUP_NOT_FOUND_MESSAGE);
    }
    return group;
  }

  private async allocateInviteCode(): Promise<string> {
    for (let attempt = 0; attempt < CODE_ATTEMPTS; attempt += 1) {
      const candidate = generateInviteCode();
      if (!(await this.groupsRepository.inviteCodeExists(candidate))) {
        return candidate;
      }
    }
    // Five collisions across 8.5 × 10¹¹ combinations means something is wrong
    // with the generator, not with luck.
    throw new InternalServerErrorException(CODE_GENERATION_MESSAGE);
  }

  private toTeacherGroup(group: GroupRow, studentCount: number): TeacherGroup {
    return {
      id: group.id,
      name: group.name,
      subject: group.subject,
      inviteCode: group.inviteCode,
      studentCount,
      archivedAt: group.archivedAt,
      createdAt: group.createdAt,
    };
  }

  private toStudentGroup(group: GroupRow, joinedAt: Date): StudentGroup {
    return {
      id: group.id,
      name: group.name,
      subject: group.subject,
      teacherName: group.owner.profile?.displayName ?? null,
      joinedAt,
    };
  }
}
