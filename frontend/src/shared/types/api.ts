/**
 * Cross-cutting API primitives shared by every feature (Phase 6.1 decision
 * F8). These mirror the backend contracts exactly and must never redesign
 * them. Feature-specific request/response DTOs live inside each feature's own
 * `types/`, not here.
 */

/**
 * The normalized error every feature consumes (decision F7). The Axios layer
 * derives this from the backend's consistent JSON error envelope, so no
 * feature ever parses a raw Axios error.
 */
export interface ApiError {
  /** HTTP status code (0 for network/timeout failures). */
  status: number;
  /** Human-readable message suitable for a toast or inline display. */
  message: string;
  /** Optional per-field validation messages, keyed by field name. */
  fields?: Record<string, string[]>;
}

/** The standard pagination envelope returned by every list endpoint. */
export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

/**
 * What login, email verification and refresh answer with.
 *
 * Only the access token: the refresh token never reaches JavaScript at all —
 * it arrives as an HttpOnly cookie the browser keeps and this code cannot
 * read, which is what lets a session outlive the tab without becoming
 * something a cross-site scripting flaw could steal.
 */
export interface AccessTokenResponse {
  accessToken: string;
}
