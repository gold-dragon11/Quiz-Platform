import { Injectable } from '@nestjs/common';
import { Language } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Persistence for the Settings module. Currently read-only: preference
 * management endpoints arrive in the User Profile phase.
 */
@Injectable()
export class SettingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findLanguageForUser(userId: string): Promise<Language | null> {
    const settings = await this.prisma.userSettings.findUnique({
      where: { userId },
      select: { language: true },
    });
    return settings?.language ?? null;
  }
}
