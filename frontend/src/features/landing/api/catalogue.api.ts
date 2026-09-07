import axios from 'axios';
import { env } from '@/config/env';

/** One subject as the landing lists it. Mirrors the backend's CatalogueSubject. */
export interface CatalogueSubject {
  name: string;
  slug: string;
  topics: string[];
  questionCount: number;
  materialCount: number;
}

export interface Catalogue {
  subjects: CatalogueSubject[];
  totalQuestions: number;
  totalTopics: number;
  totalMaterials: number;
}

/**
 * The catalogue is fetched with a bare Axios call, not the shared apiClient.
 *
 * The shared client attaches a bearer token and, on a 401, tries to refresh
 * and then bounces to /login. None of that belongs on a public marketing page:
 * an anonymous visitor has no session, and a redirect to a login form would be
 * the worst possible answer to «the landing failed to load its numbers».
 */
export async function fetchCatalogue(): Promise<Catalogue> {
  const { data } = await axios.get<Catalogue>(`${env.apiUrl}/catalogue`);
  return data;
}
