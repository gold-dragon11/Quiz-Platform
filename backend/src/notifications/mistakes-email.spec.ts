import { ConfigService } from '@nestjs/config';
import { EmailService } from '../email/email.service';
import { mistakesLabel, waitVerb } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';
import { dayRefId, kyivDate, kyivHour } from './mistakes-day';
import { EmailDispatchService } from './services/email-dispatch.service';
import {
  MISTAKES_EMAILS_PER_DAY,
  MistakesEmailService,
} from './services/mistakes-email.service';
import {
  readUnsubscribeToken,
  signUnsubscribeToken,
} from './unsubscribe-token';

describe('the Kyiv calendar of the mistakes email', () => {
  it('reads the hour in Kyiv in winter and in summer', () => {
    expect(kyivHour(new Date('2026-11-02T14:30:00Z'))).toBe(16); // UTC+2
    expect(kyivHour(new Date('2026-07-02T13:30:00Z'))).toBe(16); // UTC+3
  });

  it('turns over the date at Kyiv midnight, not UTC', () => {
    expect(kyivDate(new Date('2026-11-01T22:30:00Z'))).toBe('2026-11-02');
    expect(kyivDate(new Date('2026-11-01T21:30:00Z'))).toBe('2026-11-01');
  });

  it('writes a day as a uuid', () => {
    expect(dayRefId('2026-11-02')).toBe('00000000-0000-4000-8000-000020261102');
  });
});

describe('the unsubscribe token', () => {
  const secret = 'unit-test-secret';
  const userId = '11111111-2222-4333-8444-555555555555';

  it('reads back the account it was written for', () => {
    expect(
      readUnsubscribeToken(secret, signUnsubscribeToken(secret, userId)),
    ).toBe(userId);
  });

  it('is worthless under another secret or with the id swapped', () => {
    const token = signUnsubscribeToken(secret, userId);
    expect(readUnsubscribeToken('another-secret', token)).toBeNull();
    const signature = token.split('.')[1];
    expect(
      readUnsubscribeToken(
        secret,
        `22222222-2222-4333-8444-555555555555.${signature}`,
      ),
    ).toBeNull();
    expect(readUnsubscribeToken(secret, `${token}.extra`)).toBeNull();
  });
});

describe('the email copy', () => {
  it('agrees the noun and the verb with the number', () => {
    expect(`${mistakesLabel(1)} ${waitVerb(1)}`).toBe('1 помилка чекає');
    expect(`${mistakesLabel(3)} ${waitVerb(3)}`).toBe('3 помилки чекають');
    expect(`${mistakesLabel(11)} ${waitVerb(11)}`).toBe('11 помилок чекають');
    expect(`${mistakesLabel(21)} ${waitVerb(21)}`).toBe('21 помилка чекає');
    expect(`${mistakesLabel(25)} ${waitVerb(25)}`).toBe('25 помилок чекають');
  });
});

describe('MistakesEmailService ceiling', () => {
  it('sends nothing once the day has reached the ceiling', async () => {
    const queryRaw = jest.fn();
    const prisma = {
      emailDispatch: {
        count: jest.fn().mockResolvedValue(MISTAKES_EMAILS_PER_DAY),
      },
      $queryRaw: queryRaw,
    } as unknown as PrismaService;
    const config = {
      get: (key: string) =>
        key === 'frontendUrl' ? 'https://learn-ls.com' : { secret: 's' },
    } as unknown as ConfigService;
    const service = new MistakesEmailService(
      prisma,
      {} as EmailService,
      {} as EmailDispatchService,
      config as never,
    );

    await expect(
      service.sendDue(new Date('2026-11-02T14:30:00Z')),
    ).resolves.toBe(0);
    expect(queryRaw).not.toHaveBeenCalled();
  });
});
