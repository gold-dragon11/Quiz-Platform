/**
 * A topic as exposed by the public content API
 * (docs/04-api/questions.md §4).
 */
export interface PublicTopic {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  displayOrder: number;
}
