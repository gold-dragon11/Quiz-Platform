import { Controller, Get } from '@nestjs/common';
import { CatalogueService } from '../services/catalogue.service';
import { Catalogue } from '../types/catalogue.types';

/**
 * The public catalogue — the only unauthenticated read of content there is.
 *
 * Deliberately no guard. What it returns is what a school would print on a
 * poster: subject and topic names, and how many questions sit behind them. It
 * carries no question text, no answers, no materials, and nothing about any
 * user. The global rate limiter applies as it does everywhere.
 */
@Controller('catalogue')
export class CatalogueController {
  constructor(private readonly catalogueService: CatalogueService) {}

  /** GET /api/v1/catalogue — published subjects, their topics, and totals. */
  @Get()
  async get(): Promise<Catalogue> {
    return this.catalogueService.get();
  }
}
