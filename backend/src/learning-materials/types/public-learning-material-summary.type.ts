/**
 * A learning material as listed for a whole subject
 * (docs/04-api/learning-materials.md §4).
 *
 * Carries no `content`: the list tells the browser which topics have a
 * material and how long it is to read, and the body is fetched only when the
 * reader actually opens one.
 */
export interface PublicLearningMaterialSummary {
  id: string;
  topicId: string | null;
  title: string;
  slug: string;
  description: string | null;
  estimatedReadingTime: number | null;
}
