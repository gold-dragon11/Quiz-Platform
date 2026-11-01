import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { UnsubscribeDto } from '../dto/unsubscribe.dto';
import { MistakesEmailService } from '../services/mistakes-email.service';

/**
 * The link at the bottom of the mistakes email (decision 48). Public: the
 * person clicking may be signed out, on another device, or long past their
 * last visit. The token in the body is the whole authorisation, and all it
 * can do is switch that one email off.
 *
 * A POST, sent by the page the link opens, and not a GET on the link itself:
 * mail scanners fetch every link in a message, and a GET that changed a
 * setting would be switched off by the scanner before the person read it.
 */
@Controller('notifications')
export class UnsubscribeController {
  constructor(private readonly mistakesEmail: MistakesEmailService) {}

  /** POST /api/v1/notifications/unsubscribe */
  @Post('unsubscribe')
  @HttpCode(HttpStatus.OK)
  async unsubscribe(@Body() dto: UnsubscribeDto): Promise<{ ok: true }> {
    await this.mistakesEmail.unsubscribe(dto.token);
    return { ok: true };
  }
}
