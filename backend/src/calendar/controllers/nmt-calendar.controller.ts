import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Put,
} from '@nestjs/common';
import { AdminOnly } from '../../auth/decorators/admin-only.decorator';
import { UpdateNmtCalendarDto } from '../dto/update-nmt-calendar.dto';
import {
  NmtCalendarRecord,
  NmtCalendarService,
  NmtCountdownView,
} from '../services/nmt-calendar.service';

/**
 * GET /api/v1/calendar/nmt — public: the landing page counts down for
 * visitors who have no account (decision 49).
 */
@Controller('calendar')
export class NmtCalendarController {
  constructor(private readonly calendar: NmtCalendarService) {}

  @Get('nmt')
  publicView(): Promise<NmtCountdownView> {
    return this.calendar.publicView();
  }
}

/** The admin side: read, set and remove the date (docs/04-api/admin.md). */
@AdminOnly()
@Controller('admin/calendar')
export class AdminNmtCalendarController {
  constructor(private readonly calendar: NmtCalendarService) {}

  /** GET /api/v1/admin/calendar/nmt — `null` until a date is entered. */
  @Get('nmt')
  async get(): Promise<{ calendar: NmtCalendarRecord | null }> {
    return { calendar: await this.calendar.adminView() };
  }

  /** PUT /api/v1/admin/calendar/nmt */
  @Put('nmt')
  async put(
    @Body() dto: UpdateNmtCalendarDto,
  ): Promise<{ calendar: NmtCalendarRecord }> {
    return { calendar: await this.calendar.update(dto) };
  }

  /** DELETE /api/v1/admin/calendar/nmt */
  @Delete('nmt')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(): Promise<void> {
    await this.calendar.clear();
  }
}
