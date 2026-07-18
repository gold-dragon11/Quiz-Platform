import axios from 'axios';
import { env } from '@/config/env';

/**
 * Shared Axios instance used by every feature's API layer (see
 * docs/05-frontend/folder-structure.md, "lib/"). Endpoint-specific requests
 * live inside each feature's own `api/` folder, not here.
 */
export const apiClient = axios.create({
  baseURL: env.apiUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});
