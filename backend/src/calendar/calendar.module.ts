import { Module } from '@nestjs/common';
import {
  AdminNmtCalendarController,
  NmtCalendarController,
} from './controllers/nmt-calendar.controller';
import { NmtCalendarService } from './services/nmt-calendar.service';

/**
 * The NMT calendar (decision 49): the date of the main session, entered by an
 * administrator from the official order, and the countdown to it.
 */
@Module({
  controllers: [NmtCalendarController, AdminNmtCalendarController],
  providers: [NmtCalendarService],
})
export class CalendarModule {}
