import { INestApplication, ValidationPipe } from '@nestjs/common';
import type { App } from 'supertest/types';
import { Test, TestingModule } from '@nestjs/testing';
import { AccountStatus, UserRole } from '@prisma/client';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import { listenOnLoopback } from './loopback';

interface PublicBody {
  mainSession: {
    startDate: string;
    startsAt: string;
    sourceUrl: string;
  } | null;
}

/**
 * The NMT calendar (decision 49, docs/04-api/admin.md §21): an administrator
 * enters the main session from the official order, and the public view counts
 * down to it while it is ahead.
 */
describe('NMT calendar (e2e)', () => {
  const EMAIL_PREFIX = 'nmt-calendar';
  const PASSWORD = 'ValidPass1!';
  const SOURCE = 'https://testportal.gov.ua/kalendar';
  const nextYear = new Date().getUTCFullYear() + 1;
  const FUTURE = `${nextYear}-05-14`;
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let counter = 0;

  const signIn = async (role: UserRole): Promise<string> => {
    counter += 1;
    const email = `${EMAIL_PREFIX}-${counter}@example.com`;
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email, username: `nmtcal${counter}`, password: PASSWORD })
      .expect(201);
    await prisma.user.update({
      where: { email },
      data: { accountStatus: AccountStatus.ACTIVE, role },
    });
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: PASSWORD })
      .expect(200);
    return (login.body as { accessToken: string }).accessToken;
  };

  const publicView = async (): Promise<PublicBody> =>
    (await request(app.getHttpServer()).get('/api/v1/calendar/nmt').expect(200))
      .body as PublicBody;

  const put = (token: string, body: unknown): request.Test =>
    request(app.getHttpServer())
      .put('/api/v1/admin/calendar/nmt')
      .set('Authorization', `Bearer ${token}`)
      .send(body as object);

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
    await prisma.nmtCalendar.deleteMany();
    await prisma.user.deleteMany({
      where: { email: { startsWith: EMAIL_PREFIX } },
    });
  });

  afterAll(async () => {
    await prisma.nmtCalendar.deleteMany();
    await prisma.user.deleteMany({
      where: { email: { startsWith: EMAIL_PREFIX } },
    });
    await app.close();
  });

  it('shows nothing, to anyone, until a date is entered', async () => {
    expect(await publicView()).toEqual({ mainSession: null });
  });

  it('lets only an administrator set the date', async () => {
    const body = { mainSessionStart: FUTURE, sourceUrl: SOURCE };
    await request(app.getHttpServer())
      .put('/api/v1/admin/calendar/nmt')
      .send(body)
      .expect(401);
    await put(await signIn(UserRole.USER), body).expect(403);
    await put(await signIn(UserRole.TEACHER), body).expect(403);
    expect(await publicView()).toEqual({ mainSession: null });
  });

  it('refuses a date that is past, not a day, or has no https source', async () => {
    const admin = await signIn(UserRole.ADMIN);

    await put(admin, {
      mainSessionStart: '2020-05-14',
      sourceUrl: SOURCE,
    }).expect(400);
    await put(admin, {
      mainSessionStart: `${nextYear}-02-30`,
      sourceUrl: SOURCE,
    }).expect(400);
    await put(admin, {
      mainSessionStart: '14.05.2027',
      sourceUrl: SOURCE,
    }).expect(400);
    await put(admin, {
      mainSessionStart: FUTURE,
      sourceUrl: 'http://testportal.gov.ua',
    }).expect(400);
    await put(admin, { mainSessionStart: FUTURE }).expect(400);

    expect(await publicView()).toEqual({ mainSession: null });
  });

  it('counts down to Kyiv midnight of the first day, and can be removed', async () => {
    const admin = await signIn(UserRole.ADMIN);

    const saved = await put(admin, {
      mainSessionStart: FUTURE,
      sourceUrl: SOURCE,
    }).expect(200);
    expect(
      (saved.body as { calendar: { mainSessionStart: string } }).calendar
        .mainSessionStart,
    ).toBe(FUTURE);

    // 14 May is summer time in Kyiv, UTC+3: midnight there is 21:00 UTC the day before.
    expect(await publicView()).toEqual({
      mainSession: {
        startDate: FUTURE,
        startsAt: `${nextYear}-05-13T21:00:00.000Z`,
        sourceUrl: SOURCE,
      },
    });

    const adminView = await request(app.getHttpServer())
      .get('/api/v1/admin/calendar/nmt')
      .set('Authorization', `Bearer ${admin}`)
      .expect(200);
    expect(
      (adminView.body as { calendar: { sourceUrl: string } }).calendar
        .sourceUrl,
    ).toBe(SOURCE);

    await request(app.getHttpServer())
      .delete('/api/v1/admin/calendar/nmt')
      .set('Authorization', `Bearer ${admin}`)
      .expect(204);
    expect(await publicView()).toEqual({ mainSession: null });
  });

  it('stops counting once the session has begun, even if nobody removed the date', async () => {
    // Written straight to the table: the API refuses a past date.
    await prisma.nmtCalendar.create({
      data: {
        id: 1,
        mainSessionStart: new Date('2020-05-14T00:00:00Z'),
        sourceUrl: SOURCE,
      },
    });

    expect(await publicView()).toEqual({ mainSession: null });
    await prisma.nmtCalendar.deleteMany();
  });
});
