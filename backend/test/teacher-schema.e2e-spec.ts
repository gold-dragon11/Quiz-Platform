import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  AccountStatus,
  SubscriptionStatus,
  SubscriptionTier,
  UserRole,
} from '@prisma/client';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import { listenOnLoopback } from './loopback';

/**
 * Database invariants for the teacher side (docs/02-domain/group.md,
 * docs/02-domain/subscription.md).
 *
 * These rules live in SQL, not in TypeScript: the compiler cannot tell that a
 * student may hold only one *open* membership in a group, and a service that
 * forgets to check would simply create a second row. There are no endpoints in
 * this phase, so the tests talk to Prisma directly — the point is the schema,
 * not the transport.
 */
describe('Teacher schema (e2e)', () => {
  const PREFIX = 'teacher-schema';

  let app: INestApplication;
  let prisma: PrismaService;
  let subjectId: string;
  let teacherId: string;
  let studentId: string;
  let groupId: string;
  let counter = 0;

  const email = (name: string): string => `${PREFIX}-${name}@example.com`;

  const createUser = async (name: string, role: UserRole): Promise<string> => {
    const user = await prisma.user.create({
      data: {
        email: email(name),
        passwordHash: 'not-a-real-hash',
        accountStatus: AccountStatus.ACTIVE,
        role,
      },
      select: { id: true },
    });
    return user.id;
  };

  const createGroup = async (): Promise<string> => {
    counter += 1;
    const group = await prisma.group.create({
      data: {
        ownerId: teacherId,
        subjectId,
        name: `Група ${counter}`,
        inviteCode: `${PREFIX}-${counter}`,
      },
      select: { id: true },
    });
    return group.id;
  };

  const removeFixtures = async (): Promise<void> => {
    await prisma.group.deleteMany({
      where: { inviteCode: { startsWith: PREFIX } },
    });
    await prisma.user.deleteMany({ where: { email: { startsWith: PREFIX } } });
    await prisma.subject.deleteMany({ where: { slug: PREFIX } });
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await listenOnLoopback(app);
    prisma = app.get(PrismaService);

    await removeFixtures();

    const subject = await prisma.subject.create({
      data: {
        name: 'Teacher schema fixture',
        slug: PREFIX,
        displayOrder: 9999,
      },
      select: { id: true },
    });
    subjectId = subject.id;
    teacherId = await createUser('teacher', UserRole.TEACHER);
    studentId = await createUser('student', UserRole.USER);
  });

  beforeEach(async () => {
    groupId = await createGroup();
  });

  afterAll(async () => {
    await removeFixtures();
    await app.close();
  });

  describe('teacher role', () => {
    it('is a role a user can actually hold', async () => {
      const teacher = await prisma.user.findUniqueOrThrow({
        where: { id: teacherId },
        select: { role: true },
      });

      expect(teacher.role).toBe(UserRole.TEACHER);
    });
  });

  describe('group membership', () => {
    it('accepts one open membership per student', async () => {
      const membership = await prisma.groupMembership.create({
        data: { groupId, studentId },
        select: { leftAt: true },
      });

      expect(membership.leftAt).toBeNull();
    });

    it('refuses a second open membership for the same pair', async () => {
      await prisma.groupMembership.create({ data: { groupId, studentId } });

      await expect(
        prisma.groupMembership.create({ data: { groupId, studentId } }),
      ).rejects.toThrow();
    });

    it('lets a student rejoin after leaving', async () => {
      const first = await prisma.groupMembership.create({
        data: { groupId, studentId },
        select: { id: true },
      });
      await prisma.groupMembership.update({
        where: { id: first.id },
        data: { leftAt: new Date() },
      });

      const second = await prisma.groupMembership.create({
        data: { groupId, studentId },
        select: { id: true },
      });

      expect(second.id).not.toBe(first.id);
    });

    it('keeps every closed membership — leaving never deletes history', async () => {
      for (let round = 0; round < 3; round += 1) {
        const membership = await prisma.groupMembership.create({
          data: { groupId, studentId },
          select: { id: true },
        });
        await prisma.groupMembership.update({
          where: { id: membership.id },
          data: { leftAt: new Date() },
        });
      }

      const closed = await prisma.groupMembership.count({
        where: { groupId, studentId, NOT: { leftAt: null } },
      });

      expect(closed).toBe(3);
    });

    it('scopes the constraint to one group — the same student may join another', async () => {
      const otherGroupId = await createGroup();

      await prisma.groupMembership.create({ data: { groupId, studentId } });
      const other = await prisma.groupMembership.create({
        data: { groupId: otherGroupId, studentId },
        select: { groupId: true },
      });

      expect(other.groupId).toBe(otherGroupId);
    });
  });

  describe('group', () => {
    it('rejects a duplicate invite code', async () => {
      const existing = await prisma.group.findUniqueOrThrow({
        where: { id: groupId },
        select: { inviteCode: true },
      });

      await expect(
        prisma.group.create({
          data: {
            ownerId: teacherId,
            subjectId,
            name: 'Клон',
            inviteCode: existing.inviteCode,
          },
        }),
      ).rejects.toThrow();
    });

    it('archives rather than deletes', async () => {
      await prisma.group.update({
        where: { id: groupId },
        data: { archivedAt: new Date() },
      });

      const archived = await prisma.group.findUniqueOrThrow({
        where: { id: groupId },
        select: { archivedAt: true },
      });

      expect(archived.archivedAt).not.toBeNull();
    });
  });

  describe('subscription', () => {
    afterEach(async () => {
      await prisma.subscription.deleteMany({ where: { userId: teacherId } });
    });

    it('starts a trial without payment provider identifiers', async () => {
      const subscription = await prisma.subscription.create({
        data: { userId: teacherId },
        select: {
          tier: true,
          status: true,
          providerCustomerId: true,
        },
      });

      expect(subscription.status).toBe(SubscriptionStatus.TRIALING);
      expect(subscription.tier).toBe(SubscriptionTier.TIER_10);
      expect(subscription.providerCustomerId).toBeNull();
    });

    it('allows only one subscription per teacher', async () => {
      await prisma.subscription.create({ data: { userId: teacherId } });

      await expect(
        prisma.subscription.create({ data: { userId: teacherId } }),
      ).rejects.toThrow();
    });
  });

  describe('usage snapshot', () => {
    const periodStart = new Date('2026-09-01T00:00:00.000Z');

    afterEach(async () => {
      await prisma.usageSnapshot.deleteMany({ where: { userId: teacherId } });
    });

    it('records what a teacher was billed for in one month', async () => {
      const snapshot = await prisma.usageSnapshot.create({
        data: {
          userId: teacherId,
          periodStart,
          activeStudents: 11,
          tierAtSnapshot: SubscriptionTier.TIER_10,
        },
        select: { activeStudents: true, tierAtSnapshot: true },
      });

      expect(snapshot.activeStudents).toBe(11);
      expect(snapshot.tierAtSnapshot).toBe(SubscriptionTier.TIER_10);
    });

    it('holds one snapshot per teacher per month', async () => {
      await prisma.usageSnapshot.create({
        data: {
          userId: teacherId,
          periodStart,
          activeStudents: 4,
          tierAtSnapshot: SubscriptionTier.TIER_10,
        },
      });

      await expect(
        prisma.usageSnapshot.create({
          data: {
            userId: teacherId,
            periodStart,
            activeStudents: 5,
            tierAtSnapshot: SubscriptionTier.TIER_10,
          },
        }),
      ).rejects.toThrow();
    });
  });
});
