import { INestApplication, ValidationPipe } from '@nestjs/common';
import type { App } from 'supertest/types';
import { Test, TestingModule } from '@nestjs/testing';
import {
  AccountStatus,
  NotificationKind,
  QuestionType,
  QuizStatus,
  QuizType,
  UserRole,
} from '@prisma/client';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import {
  EmailService,
  MistakesEmailContext,
} from './../src/email/email.service';
import { dayRefId } from './../src/notifications/mistakes-day';
import { MistakesEmailService } from './../src/notifications/services/mistakes-email.service';
import { PrismaService } from './../src/prisma/prisma.service';
import { listenOnLoopback } from './loopback';

interface Captured {
  recipient: string;
  context: MistakesEmailContext;
}

class CapturingEmailService extends EmailService {
  readonly sent: Captured[] = [];

  sendVerificationEmail(): Promise<void> {
    return Promise.resolve();
  }
  sendPasswordResetEmail(): Promise<void> {
    return Promise.resolve();
  }
  sendAssignmentIssuedEmail(): Promise<void> {
    return Promise.resolve();
  }
  sendAssignmentDueSoonEmail(): Promise<void> {
    return Promise.resolve();
  }
  sendMistakesWaitingEmail(
    recipient: string,
    context: MistakesEmailContext,
  ): Promise<void> {
    this.sent.push({ recipient, context });
    return Promise.resolve();
  }

  to(recipient: string): Captured[] {
    return this.sent.filter((one) => one.recipient === recipient);
  }
}

/** 16:30 in Kyiv (UTC+2 in November), inside the afternoon window. */
const AFTERNOON = new Date('2026-11-02T14:30:00Z');
const TODAY = '2026-11-02';
const HOUR = 60 * 60 * 1000;

/**
 * The «mistakes are waiting» email (decision 48): who gets it, when, how
 * often, and the link that turns it off without signing in.
 */
describe('Mistakes email (e2e)', () => {
  const PREFIX = 'mistakes-mail';
  const PASSWORD = 'ValidPass1!';
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let email: CapturingEmailService;
  let service: MistakesEmailService;
  let subjectId: string;
  let topicId: string;
  let questionId: string;
  let counter = 0;

  /** A learner with one mistake due, switched on unless told otherwise. */
  const learner = async (
    options: {
      enabled?: boolean;
      role?: UserRole;
      isDemo?: boolean;
      due?: number;
    } = {},
  ): Promise<{ id: string; email: string }> => {
    counter += 1;
    const address = `${PREFIX}-${counter}@example.com`;
    const user = await prisma.user.create({
      data: {
        email: address,
        passwordHash: 'not-a-hash',
        emailVerified: true,
        accountStatus: AccountStatus.ACTIVE,
        role: options.role ?? UserRole.USER,
        isDemo: options.isDemo ?? false,
        settings: {
          create: { mistakeEmailsEnabled: options.enabled ?? true },
        },
      },
      select: { id: true, email: true },
    });
    if ((options.due ?? 1) > 0) {
      await prisma.mistakeReview.create({
        data: {
          userId: user.id,
          questionId,
          dueAt: new Date(AFTERNOON.getTime() - 2 * HOUR),
        },
      });
    }
    return user;
  };

  const removeTestData = async (): Promise<void> => {
    await prisma.quizSession.deleteMany({
      where: { user: { email: { startsWith: PREFIX } } },
    });
    await prisma.user.deleteMany({
      where: { email: { startsWith: PREFIX } },
    });
    await prisma.question.deleteMany({
      where: { topic: { slug: PREFIX } },
    });
    await prisma.topic.deleteMany({ where: { slug: PREFIX } });
    await prisma.subject.deleteMany({ where: { slug: PREFIX } });
  };

  beforeAll(async () => {
    email = new CapturingEmailService();
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(EmailService)
      .useValue(email)
      .compile();
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
    service = app.get(MistakesEmailService);
    await removeTestData();

    subjectId = (
      await prisma.subject.create({
        data: {
          name: PREFIX,
          slug: PREFIX,
          displayOrder: 901,
          isPublished: true,
        },
        select: { id: true },
      })
    ).id;
    topicId = (
      await prisma.topic.create({
        data: {
          subjectId,
          name: PREFIX,
          slug: PREFIX,
          displayOrder: 1,
          isPublished: true,
        },
        select: { id: true },
      })
    ).id;
    questionId = (
      await prisma.question.create({
        data: {
          topicId,
          type: QuestionType.SINGLE_CHOICE,
          title: 'Питання',
          isPublished: true,
        },
        select: { id: true },
      })
    ).id;
  });

  afterAll(async () => {
    await removeTestData();
    await app.close();
  });

  beforeEach(() => {
    email.sent.length = 0;
  });

  it('sends once a Kyiv day to a learner who asked for it, with the count and an off link', async () => {
    const one = await learner();

    await service.sendDue(AFTERNOON);
    await service.sendDue(new Date(AFTERNOON.getTime() + HOUR));

    const mails = email.to(one.email);
    expect(mails).toHaveLength(1);
    expect(mails[0].context.due).toBe(1);
    expect(mails[0].context.reviewUrl).toMatch(/\/mistake-review$/);
    expect(mails[0].context.unsubscribeUrl).toMatch(/\/unsubscribe\?token=/);
    const dispatches = await prisma.emailDispatch.findMany({
      where: { userId: one.id, kind: NotificationKind.MISTAKES_WAITING },
      select: { refId: true },
    });
    expect(dispatches).toEqual([{ refId: dayRefId(TODAY) }]);
  });

  it('sends nothing outside the afternoon', async () => {
    const one = await learner();

    // 10:30 and 21:30 in Kyiv.
    await service.sendDue(new Date('2026-11-02T08:30:00Z'));
    await service.sendDue(new Date('2026-11-02T19:30:00Z'));

    expect(email.to(one.email)).toHaveLength(0);
  });

  it('leaves out whoever did not ask, has nothing due, is not a learner, or is the demo', async () => {
    const off = await learner({ enabled: false });
    const nothingDue = await learner({ due: 0 });
    const teacher = await learner({ role: UserRole.TEACHER });
    const demo = await learner({ isDemo: true });

    await service.sendDue(AFTERNOON);

    for (const one of [off, nothingDue, teacher, demo]) {
      expect(email.to(one.email)).toHaveLength(0);
    }
  });

  it('does not remind a learner who has already started a test today', async () => {
    const one = await learner();
    await prisma.quizSession.create({
      data: {
        userId: one.id,
        subjectId,
        mode: QuizType.SUBJECT_QUIZ,
        timerEnabled: false,
        questionCount: 1,
        status: QuizStatus.COMPLETED,
        // 09:00 in Kyiv the same day.
        startedAt: new Date('2026-11-02T07:00:00Z'),
      },
    });

    await service.sendDue(AFTERNOON);

    expect(email.to(one.email)).toHaveLength(0);
  });

  it('keeps twenty hours between two emails, even across midnight', async () => {
    const one = await learner();
    // Sent late yesterday, 20:50 Kyiv: today at 16:30 is under 20 hours on.
    await prisma.emailDispatch.create({
      data: {
        userId: one.id,
        kind: NotificationKind.MISTAKES_WAITING,
        refId: dayRefId('2026-11-01'),
        sentAt: new Date('2026-11-01T18:50:00Z'),
      },
    });

    await service.sendDue(AFTERNOON);
    expect(email.to(one.email)).toHaveLength(0);

    // 18:00 Kyiv: past the gap, still the afternoon.
    await service.sendDue(new Date('2026-11-02T16:00:00Z'));
    expect(email.to(one.email)).toHaveLength(1);
  });

  describe('turning it off', () => {
    it('works from the link, without signing in, and answers the same twice', async () => {
      const one = await learner();
      const url = new URL(service.unsubscribeUrl(one.id));
      const token = url.searchParams.get('token');

      for (let i = 0; i < 2; i += 1) {
        await request(app.getHttpServer())
          .post('/api/v1/notifications/unsubscribe')
          .send({ token })
          .expect(200);
      }

      const settings = await prisma.userSettings.findUniqueOrThrow({
        where: { userId: one.id },
        select: { mistakeEmailsEnabled: true },
      });
      expect(settings.mistakeEmailsEnabled).toBe(false);
      await service.sendDue(AFTERNOON);
      expect(email.to(one.email)).toHaveLength(0);
    });

    it('refuses a token that was not written by the server, or for someone else', async () => {
      const one = await learner();
      const other = await learner();
      const token = new URL(service.unsubscribeUrl(one.id)).searchParams.get(
        'token',
      ) as string;
      const signature = token.split('.')[1];

      for (const forged of [
        `${other.id}.${signature}`,
        `${one.id}.AAAA`,
        'nonsense',
        '',
      ]) {
        await request(app.getHttpServer())
          .post('/api/v1/notifications/unsubscribe')
          .send({ token: forged })
          .expect(400);
      }

      const settings = await prisma.userSettings.findMany({
        where: { userId: { in: [one.id, other.id] } },
        select: { mistakeEmailsEnabled: true },
      });
      expect(settings.every((row) => row.mistakeEmailsEnabled)).toBe(true);
    });
  });

  describe('the setting', () => {
    it('is off for a new account and can be switched in settings', async () => {
      counter += 1;
      const address = `${PREFIX}-${counter}@example.com`;
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: address,
          username: `mistakesmail${counter}`,
          password: PASSWORD,
        })
        .expect(201);
      await prisma.user.update({
        where: { email: address },
        data: { accountStatus: AccountStatus.ACTIVE },
      });
      const login = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: address, password: PASSWORD })
        .expect(200);
      const auth = {
        Authorization: `Bearer ${(login.body as { accessToken: string }).accessToken}`,
      };

      const before = await request(app.getHttpServer())
        .get('/api/v1/users/me/settings')
        .set(auth)
        .expect(200);
      expect(
        (before.body as { mistakeEmailsEnabled: boolean }).mistakeEmailsEnabled,
      ).toBe(false);

      const after = await request(app.getHttpServer())
        .patch('/api/v1/users/me/settings')
        .set(auth)
        .send({ mistakeEmailsEnabled: true })
        .expect(200);
      expect(
        (after.body as { mistakeEmailsEnabled: boolean }).mistakeEmailsEnabled,
      ).toBe(true);
    });
  });
});
