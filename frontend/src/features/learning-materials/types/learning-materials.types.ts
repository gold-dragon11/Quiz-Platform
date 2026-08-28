/**
 * Public learning material shapes (docs/04-api/learning-materials.md §4).
 *
 * `content` is Markdown with LaTeX between `$…$` and `$$…$$`, served exactly
 * as authored — never HTML. It is rendered with raw HTML disabled.
 */

/** GET /subjects/:subjectId/materials item — no body, just enough to link. */
export interface LearningMaterialSummary {
  id: string;
  topicId: string | null;
  title: string;
  slug: string;
  description: string | null;
  estimatedReadingTime: number | null;
}

/** GET /topics/:topicId/material — the full material. */
export interface LearningMaterial extends LearningMaterialSummary {
  /** Lets the page start a quiz on the topic without fetching the subject. */
  subjectId: string;
  content: string;
}
