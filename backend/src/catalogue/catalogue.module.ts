import { Module } from '@nestjs/common';
import { CatalogueController } from './controllers/catalogue.controller';
import { CatalogueRepository } from './repositories/catalogue.repository';
import { CatalogueService } from './services/catalogue.service';

/**
 * Catalogue module — the public shape of the content, for the landing page.
 * Owns no domain of its own; it reads what Subjects, Topics and Questions
 * already hold, through a single repository whose filters are the only thing
 * standing between an anonymous visitor and unpublished work.
 */
@Module({
  controllers: [CatalogueController],
  providers: [CatalogueService, CatalogueRepository],
})
export class CatalogueModule {}
