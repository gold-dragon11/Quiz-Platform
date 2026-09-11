import { Inject, Injectable } from '@nestjs/common';
import type { NmtPaper } from './nmt-paper.types';
import { MATHEMATICS_PAPER } from './papers/mathematics.paper';

/**
 * The papers the mock exam knows, one per subject. A subject that is not here
 * keeps the provisional sitting in `mock-exam.config.ts` until its paper is
 * written — each subject is brought over whole, never half.
 */
export const DEFAULT_NMT_PAPERS: NmtPaper[] = [MATHEMATICS_PAPER];

/**
 * Injection token for the list above. Tests replace it to sit a small paper on
 * their own subject instead of depending on seeded content.
 */
export const NMT_PAPERS = Symbol('NMT_PAPERS');

@Injectable()
export class NmtPaperRegistry {
  constructor(@Inject(NMT_PAPERS) private readonly papers: NmtPaper[]) {}

  forSubjectSlug(slug: string): NmtPaper | null {
    return this.papers.find((paper) => paper.subjectSlug === slug) ?? null;
  }
}
