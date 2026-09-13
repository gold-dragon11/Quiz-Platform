import { Injectable } from '@nestjs/common';
import { CatalogueRepository } from '../repositories/catalogue.repository';
import { Catalogue } from '../types/catalogue.types';

/**
 * What the landing page is allowed to say about the content.
 *
 * The landing used to carry four hand-written numbers, and a comment
 * explaining that a marketing page was a poor reason to open an endpoint. For
 * four numbers that was right. It stopped being right when the page began
 * listing seventy-six topic names: a hand-kept list drifts from the bank
 * silently, and nobody proof-reads a landing page against the database.
 */
@Injectable()
export class CatalogueService {
  constructor(private readonly catalogueRepository: CatalogueRepository) {}

  async get(): Promise<Catalogue> {
    const subjects = await this.catalogueRepository.findPublished();

    return {
      subjects,
      totalQuestions: subjects.reduce(
        (sum, subject) => sum + subject.questionCount,
        0,
      ),
      totalTopics: subjects.reduce(
        (sum, subject) => sum + subject.topics.length,
        0,
      ),
      totalMaterials: subjects.reduce(
        (sum, subject) => sum + subject.materialCount,
        0,
      ),
    };
  }
}
