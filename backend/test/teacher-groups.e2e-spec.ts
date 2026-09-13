import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AccountStatus, UserRole } from '@prisma/client';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import { listenOnLoopback } from './loopback';

interface GroupBody {
  id: string;
  name: string;
  subject: { id: string; name: string; slug: string };
  inviteCode: string;
  studentCount: number;
  archivedAt: string | null;
}

interface StudentGroupBody {
  id: string;
  name: string;
  teacherName: string | null;
  joinedAt: string;
}

interface StudentBody {
  id: string;
  displayName: string | null;
  username: string | null;
}

/**
 * Groups end to end (docs/02-domain/group.md).
 *
 * The happy path is the least interesting part. What matters here is the
 * boundary: a teacher must not reach another teacher's group, a student must
 * not reach the teacher routes at all, and leaving a group must close the
 * membership rather than erase it.
 */
describe('Groups (e2e)', () => {
  const PREFIX = 'groups-e2e';
  const PASSWORD = 'ValidPass1!';
  const REGISTER_URL = '/api/v1/auth/register';
  const LOGIN_URL = '/api/v1/auth/login';
  const TEACHER_URL = '/api/v1/teacher/groups';
  const STUDENT_URL = '/api/v1/groups';

  let app: INestApplication;
  let prisma: PrismaService;
  let subjectId: string;
  let counter = 0;

  let teacher: string;
  let otherTeacher: string;
  let student: string;
  let studentId: string;

  const register = async (
    role: UserRole,
  ): Promise<{ token: string; userId: string }> => {
    counter += 1;
    const email = `${PREFIX}-${counter}@example.com`;
    const username = `${PREFIX.replace(/-/g, '')}${counter}`;

    await request(app.getHttpServer())
      .post(REGISTER_URL)
      .send({ email, username, password: PASSWORD })
      .expect(201);

    const user = await prisma.user.update({
      where: { email },
      data: { accountStatus: AccountStatus.ACTIVE, role },
      select: { id: true },
    });

    const response = await request(app.getHttpServer())
      .post(LOGIN_URL)
      .send({ email, password: PASSWORD })
      .expect(200);

    return {
      token: (response.body as { accessToken: string }).accessToken,
      userId: user.id,
    };
  };

  const createGroup = async (
    token: string,
    name = 'Математика 11-А',
  ): Promise<GroupBody> => {
    const response = await request(app.getHttpServer())
      .post(TEACHER_URL)
      .set('Authorization', `Bearer ${token}`)
      .send({ name, subjectId })
      .expect(201);

    return response.body as GroupBody;
  };

  const removeFixtures = async (): Promise<void> => {
    await prisma.group.deleteMany({ where: { subjectId } });
    await prisma.user.deleteMany({ where: { email: { startsWith: PREFIX } } });
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.setGlobalPrefix('api/v1', { exclude: ['health'] });
    await listenOnLoopback(app);
    prisma = app.get(PrismaService);

    const subject = await prisma.subject.upsert({
      where: { slug: PREFIX },
      update: { isPublished: true, deletedAt: null },
      create: {
        name: 'Groups fixture',
        slug: PREFIX,
        displayOrder: 9998,
        isPublished: true,
      },
      select: { id: true },
    });
    subjectId = subject.id;

    await removeFixtures();

    teacher = (await register(UserRole.TEACHER)).token;
    otherTeacher = (await register(UserRole.TEACHER)).token;
    const registered = await register(UserRole.USER);
    student = registered.token;
    studentId = registered.userId;
  });

  afterAll(async () => {
    await removeFixtures();
    await prisma.subject.deleteMany({ where: { slug: PREFIX } });
    await app.close();
  });

  describe('creating a group', () => {
    it('issues a typable invite code and starts empty', async () => {
      const group = await createGroup(teacher);

      expect(group.studentCount).toBe(0);
      expect(group.archivedAt).toBeNull();
      expect(group.inviteCode).toMatch(
        /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{8}$/,
      );
    });

    it('gives every group its own code', async () => {
      const first = await createGroup(teacher);
      const second = await createGroup(teacher);

      expect(first.inviteCode).not.toBe(second.inviteCode);
    });

    it('refuses a subject that is not published', async () => {
      const hidden = await prisma.subject.create({
        data: {
          name: 'Hidden',
          slug: `${PREFIX}-hidden`,
          displayOrder: 9997,
          isPublished: false,
        },
        select: { id: true },
      });

      await request(app.getHttpServer())
        .post(TEACHER_URL)
        .set('Authorization', `Bearer ${teacher}`)
        .send({ name: 'Група', subjectId: hidden.id })
        .expect(404);

      await prisma.subject.delete({ where: { id: hidden.id } });
    });

    it('rejects a student trying to create one', async () => {
      await request(app.getHttpServer())
        .post(TEACHER_URL)
        .set('Authorization', `Bearer ${student}`)
        .send({ name: 'Моя група', subjectId })
        .expect(403);
    });
  });

  describe('another teacher cannot reach the group', () => {
    it('answers 404 rather than 403 — the id must not be probeable', async () => {
      const group = await createGroup(teacher);

      await request(app.getHttpServer())
        .get(`${TEACHER_URL}/${group.id}`)
        .set('Authorization', `Bearer ${otherTeacher}`)
        .expect(404);
    });

    it('cannot rename, archive, reissue the code or read the roster', async () => {
      const group = await createGroup(teacher);
      const auth = { Authorization: `Bearer ${otherTeacher}` };

      await request(app.getHttpServer())
        .patch(`${TEACHER_URL}/${group.id}`)
        .set(auth)
        .send({ name: 'Викрадено' })
        .expect(404);
      await request(app.getHttpServer())
        .post(`${TEACHER_URL}/${group.id}/archive`)
        .set(auth)
        .expect(404);
      await request(app.getHttpServer())
        .post(`${TEACHER_URL}/${group.id}/invite-code`)
        .set(auth)
        .expect(404);
      await request(app.getHttpServer())
        .get(`${TEACHER_URL}/${group.id}/students`)
        .set(auth)
        .expect(404);
    });

    it('leaves the group untouched after all of that', async () => {
      const group = await createGroup(teacher, 'Недоторкана');

      await request(app.getHttpServer())
        .patch(`${TEACHER_URL}/${group.id}`)
        .set('Authorization', `Bearer ${otherTeacher}`)
        .send({ name: 'Викрадено' })
        .expect(404);

      const after = await request(app.getHttpServer())
        .get(`${TEACHER_URL}/${group.id}`)
        .set('Authorization', `Bearer ${teacher}`)
        .expect(200);

      expect((after.body as GroupBody).name).toBe('Недоторкана');
    });
  });

  describe('joining', () => {
    it('adds the student and names the teacher', async () => {
      const group = await createGroup(teacher);

      const response = await request(app.getHttpServer())
        .post(`${STUDENT_URL}/join`)
        .set('Authorization', `Bearer ${student}`)
        .send({ inviteCode: group.inviteCode })
        .expect(200);

      const joined = response.body as StudentGroupBody;
      expect(joined.id).toBe(group.id);
      expect(joined.teacherName).not.toBeNull();
    });

    it('accepts a code pasted with spaces and in lower case', async () => {
      const group = await createGroup(teacher);

      await request(app.getHttpServer())
        .post(`${STUDENT_URL}/join`)
        .set('Authorization', `Bearer ${student}`)
        .send({ inviteCode: `  ${group.inviteCode.toLowerCase()} ` })
        .expect(200);
    });

    it('is idempotent — joining twice is not an error', async () => {
      const group = await createGroup(teacher);
      const body = { inviteCode: group.inviteCode };

      await request(app.getHttpServer())
        .post(`${STUDENT_URL}/join`)
        .set('Authorization', `Bearer ${student}`)
        .send(body)
        .expect(200);
      await request(app.getHttpServer())
        .post(`${STUDENT_URL}/join`)
        .set('Authorization', `Bearer ${student}`)
        .send(body)
        .expect(200);

      const roster = await request(app.getHttpServer())
        .get(`${TEACHER_URL}/${group.id}/students`)
        .set('Authorization', `Bearer ${teacher}`)
        .expect(200);

      expect((roster.body as StudentBody[]).length).toBe(1);
    });

    it('rejects an unknown code with 404', async () => {
      await request(app.getHttpServer())
        .post(`${STUDENT_URL}/join`)
        .set('Authorization', `Bearer ${student}`)
        .send({ inviteCode: 'ZZZZZZZZ' })
        .expect(404);
    });

    it('refuses an archived group with 409', async () => {
      const group = await createGroup(teacher);
      await request(app.getHttpServer())
        .post(`${TEACHER_URL}/${group.id}/archive`)
        .set('Authorization', `Bearer ${teacher}`)
        .expect(201);

      await request(app.getHttpServer())
        .post(`${STUDENT_URL}/join`)
        .set('Authorization', `Bearer ${student}`)
        .send({ inviteCode: group.inviteCode })
        .expect(409);
    });

    it('stops working once the code is reissued', async () => {
      const group = await createGroup(teacher);
      const oldCode = group.inviteCode;

      const reissued = await request(app.getHttpServer())
        .post(`${TEACHER_URL}/${group.id}/invite-code`)
        .set('Authorization', `Bearer ${teacher}`)
        .expect(201);

      expect((reissued.body as GroupBody).inviteCode).not.toBe(oldCode);

      await request(app.getHttpServer())
        .post(`${STUDENT_URL}/join`)
        .set('Authorization', `Bearer ${student}`)
        .send({ inviteCode: oldCode })
        .expect(404);
    });
  });

  describe('leaving and removal', () => {
    it('closes the membership instead of deleting it', async () => {
      const group = await createGroup(teacher);
      await request(app.getHttpServer())
        .post(`${STUDENT_URL}/join`)
        .set('Authorization', `Bearer ${student}`)
        .send({ inviteCode: group.inviteCode })
        .expect(200);

      await request(app.getHttpServer())
        .delete(`${STUDENT_URL}/${group.id}/membership`)
        .set('Authorization', `Bearer ${student}`)
        .expect(204);

      const rows = await prisma.groupMembership.findMany({
        where: { groupId: group.id, studentId },
        select: { leftAt: true },
      });

      expect(rows).toHaveLength(1);
      expect(rows[0].leftAt).not.toBeNull();
    });

    it('drops the student off the roster and out of the count', async () => {
      const group = await createGroup(teacher);
      await request(app.getHttpServer())
        .post(`${STUDENT_URL}/join`)
        .set('Authorization', `Bearer ${student}`)
        .send({ inviteCode: group.inviteCode })
        .expect(200);
      await request(app.getHttpServer())
        .delete(`${STUDENT_URL}/${group.id}/membership`)
        .set('Authorization', `Bearer ${student}`)
        .expect(204);

      const roster = await request(app.getHttpServer())
        .get(`${TEACHER_URL}/${group.id}/students`)
        .set('Authorization', `Bearer ${teacher}`)
        .expect(200);
      const detail = await request(app.getHttpServer())
        .get(`${TEACHER_URL}/${group.id}`)
        .set('Authorization', `Bearer ${teacher}`)
        .expect(200);

      expect(roster.body as StudentBody[]).toHaveLength(0);
      expect((detail.body as GroupBody).studentCount).toBe(0);
    });

    it('lets the student rejoin afterwards', async () => {
      const group = await createGroup(teacher);
      const body = { inviteCode: group.inviteCode };

      await request(app.getHttpServer())
        .post(`${STUDENT_URL}/join`)
        .set('Authorization', `Bearer ${student}`)
        .send(body)
        .expect(200);
      await request(app.getHttpServer())
        .delete(`${STUDENT_URL}/${group.id}/membership`)
        .set('Authorization', `Bearer ${student}`)
        .expect(204);
      await request(app.getHttpServer())
        .post(`${STUDENT_URL}/join`)
        .set('Authorization', `Bearer ${student}`)
        .send(body)
        .expect(200);

      const rows = await prisma.groupMembership.count({
        where: { groupId: group.id, studentId },
      });

      expect(rows).toBe(2);
    });

    it('lets the teacher remove a student', async () => {
      const group = await createGroup(teacher);
      await request(app.getHttpServer())
        .post(`${STUDENT_URL}/join`)
        .set('Authorization', `Bearer ${student}`)
        .send({ inviteCode: group.inviteCode })
        .expect(200);

      await request(app.getHttpServer())
        .delete(`${TEACHER_URL}/${group.id}/students/${studentId}`)
        .set('Authorization', `Bearer ${teacher}`)
        .expect(204);

      const roster = await request(app.getHttpServer())
        .get(`${TEACHER_URL}/${group.id}/students`)
        .set('Authorization', `Bearer ${teacher}`)
        .expect(200);

      expect(roster.body as StudentBody[]).toHaveLength(0);
    });

    it('answers 404 when leaving a group the student is not in', async () => {
      const group = await createGroup(teacher);

      await request(app.getHttpServer())
        .delete(`${STUDENT_URL}/${group.id}/membership`)
        .set('Authorization', `Bearer ${student}`)
        .expect(404);
    });
  });

  describe('what each side sees', () => {
    it('never shows the invite code to a student', async () => {
      const group = await createGroup(teacher);
      await request(app.getHttpServer())
        .post(`${STUDENT_URL}/join`)
        .set('Authorization', `Bearer ${student}`)
        .send({ inviteCode: group.inviteCode })
        .expect(200);

      const listed = await request(app.getHttpServer())
        .get(STUDENT_URL)
        .set('Authorization', `Bearer ${student}`)
        .expect(200);

      expect(JSON.stringify(listed.body)).not.toContain(group.inviteCode);
    });

    it('hides an archived group from the student list', async () => {
      const group = await createGroup(teacher);
      await request(app.getHttpServer())
        .post(`${STUDENT_URL}/join`)
        .set('Authorization', `Bearer ${student}`)
        .send({ inviteCode: group.inviteCode })
        .expect(200);
      await request(app.getHttpServer())
        .post(`${TEACHER_URL}/${group.id}/archive`)
        .set('Authorization', `Bearer ${teacher}`)
        .expect(201);

      const listed = await request(app.getHttpServer())
        .get(STUDENT_URL)
        .set('Authorization', `Bearer ${student}`)
        .expect(200);

      const ids = (listed.body as StudentGroupBody[]).map((one) => one.id);
      expect(ids).not.toContain(group.id);
    });

    it('shows a teacher only their own groups', async () => {
      const mine = await createGroup(teacher, 'Моя');
      await createGroup(otherTeacher, 'Чужа');

      const listed = await request(app.getHttpServer())
        .get(TEACHER_URL)
        .set('Authorization', `Bearer ${teacher}`)
        .expect(200);

      const names = (listed.body as GroupBody[]).map((one) => one.name);
      expect(names).toContain(mine.name);
      expect(names).not.toContain('Чужа');
    });

    it('requires a token everywhere', async () => {
      await request(app.getHttpServer()).get(TEACHER_URL).expect(401);
      await request(app.getHttpServer()).get(STUDENT_URL).expect(401);
      await request(app.getHttpServer())
        .post(`${STUDENT_URL}/join`)
        .send({ inviteCode: 'ABCDEFGH' })
        .expect(401);
    });
  });
});
