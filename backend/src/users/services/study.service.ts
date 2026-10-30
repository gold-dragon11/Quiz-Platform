import { BadRequestException, Injectable } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateStudyDto } from '../dto/update-study.dto';

/** What the dashboard needs to decide whether to show the first screen. */
export interface StudyView {
  /** The subjects the learner said they take, in the order they chose them. */
  subjectIds: string[];
  /**
   * A learner who has neither answered nor skipped the first screen and has
   * never finished a test. Anyone with a history already knows the way in;
   * a teacher sits no diagnostic.
   */
  needsOnboarding: boolean;
}

const UNKNOWN_SUBJECT_MESSAGE = 'Такого предмета немає.';

/**
 * The first screen (the retention plan's PR 4): which subjects a learner takes
 * and whether they have been through the screen that asks.
 */
@Injectable()
export class StudyService {
  constructor(private readonly prisma: PrismaService) {}

  async get(userId: string): Promise<StudyView> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        role: true,
        settings: { select: { onboardedAt: true } },
        statistics: { select: { totalQuizzes: true } },
        studySubjects: {
          select: { subjectId: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    return {
      subjectIds: user.studySubjects.map((row) => row.subjectId),
      needsOnboarding:
        user.role === UserRole.USER &&
        !user.settings?.onboardedAt &&
        (user.statistics?.totalQuizzes ?? 0) === 0,
    };
  }

  /**
   * Replaces the learner's subjects and marks the first screen as answered,
   * whether with subjects or, when the list is empty, as skipped.
   */
  async update(userId: string, dto: UpdateStudyDto): Promise<StudyView> {
    const ids = [...new Set(dto.subjectIds)];
    const found = await this.prisma.subject.count({
      where: { id: { in: ids }, isPublished: true, deletedAt: null },
    });
    if (found !== ids.length) {
      throw new BadRequestException(UNKNOWN_SUBJECT_MESSAGE);
    }

    const now = Date.now();
    await this.prisma.$transaction([
      this.prisma.studySubject.deleteMany({ where: { userId } }),
      this.prisma.studySubject.createMany({
        // A millisecond apart, so the order they were chosen in survives.
        data: ids.map((subjectId, index) => ({
          userId,
          subjectId,
          createdAt: new Date(now + index),
        })),
      }),
      this.prisma.userSettings.upsert({
        where: { userId },
        update: { onboardedAt: new Date(now) },
        create: { userId, onboardedAt: new Date(now) },
      }),
    ]);

    return this.get(userId);
  }
}
