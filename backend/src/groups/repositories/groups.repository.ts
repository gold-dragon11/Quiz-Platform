import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * A group with the two things every read in this module needs beside it: the
 * subject it is scoped to, and the owner's display name. The owner is selected
 * here rather than per query so that joining a group and listing groups cannot
 * disagree about whether the teacher has a name.
 */
const GROUP_SELECT = {
  id: true,
  name: true,
  inviteCode: true,
  archivedAt: true,
  createdAt: true,
  ownerId: true,
  subject: { select: { id: true, name: true, slug: true } },
  owner: { select: { profile: { select: { displayName: true } } } },
} as const;

export type GroupRow = Prisma.GroupGetPayload<{ select: typeof GROUP_SELECT }>;

/**
 * Data access for groups and memberships (docs/02-domain/group.md).
 *
 * Every method that reads or writes a membership filters on `leftAt: null`.
 * That is not a detail: leaving closes a row rather than deleting it, so a
 * query that forgets the filter silently counts former students as current
 * ones — in the roster, and in the bill.
 */
@Injectable()
export class GroupsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createGroup(data: {
    ownerId: string;
    subjectId: string;
    name: string;
    inviteCode: string;
  }): Promise<GroupRow> {
    return this.prisma.group.create({ data, select: GROUP_SELECT });
  }

  async findById(groupId: string): Promise<GroupRow | null> {
    return this.prisma.group.findUnique({
      where: { id: groupId },
      select: GROUP_SELECT,
    });
  }

  async findByInviteCode(inviteCode: string): Promise<GroupRow | null> {
    return this.prisma.group.findUnique({
      where: { inviteCode },
      select: GROUP_SELECT,
    });
  }

  async listOwnedBy(ownerId: string): Promise<GroupRow[]> {
    return this.prisma.group.findMany({
      where: { ownerId },
      select: GROUP_SELECT,
      orderBy: [{ archivedAt: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async updateGroup(
    groupId: string,
    data: Prisma.GroupUpdateInput,
  ): Promise<GroupRow> {
    return this.prisma.group.update({
      where: { id: groupId },
      data,
      select: GROUP_SELECT,
    });
  }

  /** Open memberships per group, for the roster counts on a group list. */
  async countOpenMemberships(groupIds: string[]): Promise<Map<string, number>> {
    if (groupIds.length === 0) {
      return new Map();
    }

    const rows = await this.prisma.groupMembership.groupBy({
      by: ['groupId'],
      where: { groupId: { in: groupIds }, leftAt: null },
      _count: { _all: true },
    });

    return new Map(rows.map((row) => [row.groupId, row._count._all]));
  }

  async findOpenMembership(
    groupId: string,
    studentId: string,
  ): Promise<{ id: string; joinedAt: Date } | null> {
    return this.prisma.groupMembership.findFirst({
      where: { groupId, studentId, leftAt: null },
      select: { id: true, joinedAt: true },
    });
  }

  async createMembership(
    groupId: string,
    studentId: string,
  ): Promise<{ id: string; joinedAt: Date }> {
    return this.prisma.groupMembership.create({
      data: { groupId, studentId },
      select: { id: true, joinedAt: true },
    });
  }

  /** Closes a membership. The row stays — see docs/02-domain/group.md §5.1. */
  async closeMembership(membershipId: string): Promise<void> {
    await this.prisma.groupMembership.update({
      where: { id: membershipId },
      data: { leftAt: new Date() },
    });
  }

  async listOpenMembers(groupId: string): Promise<
    {
      joinedAt: Date;
      student: {
        id: string;
        profile: { displayName: string; username: string } | null;
      };
    }[]
  > {
    return this.prisma.groupMembership.findMany({
      where: { groupId, leftAt: null },
      orderBy: { joinedAt: 'asc' },
      select: {
        joinedAt: true,
        student: {
          select: {
            id: true,
            profile: { select: { displayName: true, username: true } },
          },
        },
      },
    });
  }

  /**
   * Groups a student currently belongs to, newest membership first. Archived
   * groups are left out: the year is over, and the student's own statistics
   * keep whatever they did there.
   */
  async listGroupsForStudent(
    studentId: string,
  ): Promise<{ joinedAt: Date; group: GroupRow }[]> {
    return this.prisma.groupMembership.findMany({
      where: { studentId, leftAt: null, group: { archivedAt: null } },
      orderBy: { joinedAt: 'desc' },
      select: { joinedAt: true, group: { select: GROUP_SELECT } },
    });
  }

  /** True when the subject exists, is published, and is not soft-deleted. */
  async subjectIsAvailable(subjectId: string): Promise<boolean> {
    const subject = await this.prisma.subject.findFirst({
      where: { id: subjectId, isPublished: true, deletedAt: null },
      select: { id: true },
    });
    return subject !== null;
  }

  async inviteCodeExists(inviteCode: string): Promise<boolean> {
    const group = await this.prisma.group.findUnique({
      where: { inviteCode },
      select: { id: true },
    });
    return group !== null;
  }
}
