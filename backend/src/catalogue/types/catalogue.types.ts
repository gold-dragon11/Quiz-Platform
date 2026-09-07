/** One subject as the public landing page lists it. */
export interface CatalogueSubject {
  name: string;
  slug: string;
  /** Published topic names, in display order. */
  topics: string[];
  /** Published, non-deleted questions across those topics. */
  questionCount: number;
  /** Topics that have a written material. The landing claims one per topic. */
  materialCount: number;
}

/**
 * The catalogue as an anonymous visitor sees it.
 *
 * Totals travel alongside the subjects so the page never has to add the parts
 * up itself — a landing that computed «3308» client-side would be one filter
 * away from advertising a different number than the one the bank holds.
 */
export interface Catalogue {
  subjects: CatalogueSubject[];
  totalQuestions: number;
  totalTopics: number;
  totalMaterials: number;
}
