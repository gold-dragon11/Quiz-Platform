import { Inject, Injectable } from '@nestjs/common';
import type { NmtBlock, NmtPaper } from './nmt-paper.types';
import { MATHEMATICS_PAPER } from './papers/mathematics.paper';
import { UKRAINIAN_LANGUAGE_PAPER } from './papers/ukrainian-language.paper';

/**
 * The papers the mock exam knows, one per subject. A subject that is not here
 * keeps the provisional sitting in `mock-exam.config.ts` until its paper is
 * written — each subject is brought over whole, never half.
 */
export const DEFAULT_NMT_PAPERS: NmtPaper[] = [
  MATHEMATICS_PAPER,
  UKRAINIAN_LANGUAGE_PAPER,
];

/**
 * The joint blocks of НМТ 2026. The first block sits Ukrainian and mathematics
 * together on one 120-minute clock, in that order; the time between them is the
 * student's to divide.
 */
export const DEFAULT_NMT_BLOCKS: NmtBlock[] = [
  {
    slug: 'ukrainian-mathematics',
    title: 'Перший блок НМТ: українська мова й математика',
    minutes: 120,
    timingNote:
      'Як на НМТ: обидва зошити на одному годиннику, 120 хвилин на двох. Переходити між предметами можна будь-коли, а бали рахуються окремо для кожного.',
    subjectSlugs: ['ukrainian-language', 'mathematics'],
  },
];

/**
 * Injection tokens for the lists above. Tests replace them to sit small papers
 * on their own subjects instead of depending on seeded content.
 */
export const NMT_PAPERS = Symbol('NMT_PAPERS');
export const NMT_BLOCKS = Symbol('NMT_BLOCKS');

@Injectable()
export class NmtPaperRegistry {
  constructor(
    @Inject(NMT_PAPERS) private readonly papers: NmtPaper[],
    @Inject(NMT_BLOCKS) private readonly blocks: NmtBlock[],
  ) {}

  forSubjectSlug(slug: string): NmtPaper | null {
    return this.papers.find((paper) => paper.subjectSlug === slug) ?? null;
  }

  block(slug: string): NmtBlock | null {
    return this.blocks.find((block) => block.slug === slug) ?? null;
  }

  allBlocks(): NmtBlock[] {
    return this.blocks;
  }
}
