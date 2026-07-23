/**
 * A subject as exposed by the public content API
 * (docs/04-api/questions.md §4) — exactly the fields needed to render the
 * catalog, nothing administrative.
 */
export interface PublicSubject {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  color: string | null;
}
