import { Module } from '@nestjs/common';
import { DevelopmentEmailService } from './development-email.service';
import { EmailService } from './email.service';

/**
 * Binds the EmailService abstraction to its active implementation. Integrating
 * a real provider later (Resend, per the project decision) is a change to this
 * one binding.
 */
@Module({
  providers: [{ provide: EmailService, useClass: DevelopmentEmailService }],
  exports: [EmailService],
})
export class EmailModule {}
