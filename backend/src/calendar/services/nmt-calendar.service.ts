import { BadRequestException, Injectable } from '@nestjs/common';
import { kyivMidnight } from '../../common/kyiv-time';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateNmtCalendarDto } from '../dto/update-nmt-calendar.dto';

/** The main session as anyone may see it, while it is still ahead. */
export interface NmtCountdownView {
  mainSession: {
    /** «2027-05-14». */
    startDate: string;
    /** 00:00 Kyiv on that day, as an instant: what the countdown runs to. */
    startsAt: string;
    sourceUrl: string;
  } | null;
}

/** What the admin screen edits: the entered row, past or not. */
export interface NmtCalendarRecord {
  mainSessionStart: string;
  sourceUrl: string;
  updatedAt: string;
}

const ROW_ID = 1;

/**
 * The NMT calendar (decision 49): the one date the product counts down to.
 *
 * Entered by an administrator from the official order, with the link to it,
 * and never guessed. With no row, or once the session has begun, the public
 * view is empty and every countdown disappears on its own, so a forgotten
 * date can never read «до НМТ −5 днів».
 */
@Injectable()
export class NmtCalendarService {
  constructor(private readonly prisma: PrismaService) {}

  async publicView(now: Date = new Date()): Promise<NmtCountdownView> {
    const row = await this.prisma.nmtCalendar.findUnique({
      where: { id: ROW_ID },
    });
    if (!row) {
      return { mainSession: null };
    }
    const startDate = isoDate(row.mainSessionStart);
    const startsAt = kyivMidnight(startDate);
    if (startsAt.getTime() <= now.getTime()) {
      return { mainSession: null };
    }
    return {
      mainSession: {
        startDate,
        startsAt: startsAt.toISOString(),
        sourceUrl: row.sourceUrl,
      },
    };
  }

  async adminView(): Promise<NmtCalendarRecord | null> {
    const row = await this.prisma.nmtCalendar.findUnique({
      where: { id: ROW_ID },
    });
    return row ? toRecord(row) : null;
  }

  /**
   * Sets the date. It has to be a real calendar day still ahead in Kyiv: a
   * past date would be stored and never shown, and the admin would not learn
   * why the countdown stayed away.
   */
  async update(
    dto: UpdateNmtCalendarDto,
    now: Date = new Date(),
  ): Promise<NmtCalendarRecord> {
    const day = new Date(`${dto.mainSessionStart}T00:00:00Z`);
    if (Number.isNaN(day.getTime()) || isoDate(day) !== dto.mainSessionStart) {
      throw new BadRequestException('Такої дати немає.');
    }
    if (kyivMidnight(dto.mainSessionStart).getTime() <= now.getTime()) {
      throw new BadRequestException('Дата має бути в майбутньому.');
    }
    const row = await this.prisma.nmtCalendar.upsert({
      where: { id: ROW_ID },
      update: { mainSessionStart: day, sourceUrl: dto.sourceUrl },
      create: { id: ROW_ID, mainSessionStart: day, sourceUrl: dto.sourceUrl },
    });
    return toRecord(row);
  }

  /** Removes the date: the countdown goes from every page. */
  async clear(): Promise<void> {
    await this.prisma.nmtCalendar.deleteMany({ where: { id: ROW_ID } });
  }
}

/** A @db.Date comes back as UTC midnight of that day. */
function isoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function toRecord(row: {
  mainSessionStart: Date;
  sourceUrl: string;
  updatedAt: Date;
}): NmtCalendarRecord {
  return {
    mainSessionStart: isoDate(row.mainSessionStart),
    sourceUrl: row.sourceUrl,
    updatedAt: row.updatedAt.toISOString(),
  };
}
