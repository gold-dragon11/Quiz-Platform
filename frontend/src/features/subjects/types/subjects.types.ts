/**
 * Subjects & Topics browser types, mirrored exactly from the public content
 * API (docs/04-api/questions.md §4) — never redesigned here. Note the payloads
 * carry no per-subject/topic question count or difficulty (those live on
 * individual questions, which this feature does not fetch).
 */

/** GET /subjects item. */
export interface PublicSubject {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  color: string | null;
}

/** GET /subjects/:subjectId/topics item. */
export interface PublicTopic {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  displayOrder: number;
}
