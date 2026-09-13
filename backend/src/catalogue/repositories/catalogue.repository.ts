import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CatalogueSubject } from '../types/catalogue.types';

/**
 * The one read behind the public catalogue.
 *
 * Published, non-deleted content only, at every level: an unpublished subject
 * hides its topics, and a soft-deleted question is not counted. This endpoint
 * is the only unauthenticated window into the content, so the filters are the
 * whole security surface — there is no guard behind them to catch a mistake.
 */
@Injectable()
export class CatalogueRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findPublished(): Promise<CatalogueSubject[]> {
    const subjects = await this.prisma.subject.findMany({
      where: { isPublished: true, deletedAt: null },
      orderBy: { displayOrder: 'asc' },
      select: {
        name: true,
        slug: true,
        topics: {
          where: { isPublished: true, deletedAt: null },
          orderBy: { displayOrder: 'asc' },
          select: {
            name: true,
            _count: {
              select: {
                questions: { where: { isPublished: true, deletedAt: null } },
                learningMaterials: true,
              },
            },
          },
        },
      },
    });

    return subjects.map((subject) => ({
      name: subject.name,
      slug: subject.slug,
      topics: subject.topics.map((topic) => topic.name),
      questionCount: subject.topics.reduce(
        (sum, topic) => sum + topic._count.questions,
        0,
      ),
      materialCount: subject.topics.filter(
        (topic) => topic._count.learningMaterials > 0,
      ).length,
    }));
  }
}
