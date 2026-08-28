/**
 * A learning material as exposed by the public content API
 * (docs/04-api/learning-materials.md §4).
 *
 * `content` is Markdown with LaTeX between `$…$` and `$$…$$`; it is served as
 * authored, never as HTML — the client renders it with raw HTML disabled, so
 * there is no markup to trust in the first place.
 */
export interface PublicLearningMaterial {
  id: string;
  /** Carried so a reader can start a quiz on the topic without a second call. */
  subjectId: string;
  topicId: string | null;
  title: string;
  slug: string;
  description: string | null;
  content: string;
  estimatedReadingTime: number | null;
}
