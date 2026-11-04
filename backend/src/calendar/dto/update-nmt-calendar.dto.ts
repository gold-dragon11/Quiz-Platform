import { IsUrl, Matches, MaxLength } from 'class-validator';

/** Body of PUT /api/v1/admin/calendar/nmt (decision 49). */
export class UpdateNmtCalendarDto {
  /** The first day of the main session, «2027-05-14», a Kyiv date. */
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Дата у форматі РРРР-ММ-ДД.',
  })
  mainSessionStart!: string;

  /** The ministry order or the testing centre's page the date comes from. */
  @IsUrl(
    { protocols: ['https'], require_protocol: true },
    { message: 'Посилання на джерело має починатися з https://.' },
  )
  @MaxLength(500)
  sourceUrl!: string;
}
