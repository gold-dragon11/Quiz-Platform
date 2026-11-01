import { IsString, MaxLength } from 'class-validator';

/** Body of POST /api/v1/notifications/unsubscribe: the token from the email. */
export class UnsubscribeDto {
  @IsString()
  @MaxLength(200)
  token!: string;
}
