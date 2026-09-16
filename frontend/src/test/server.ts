import { setupServer } from 'msw/node';
import { env } from '@/config/env';

/**
 * The API, mocked at the network boundary.
 *
 * Nothing in the app is stubbed: the component renders, its hook calls the
 * real Axios client, and MSW answers the request. A test that passes here has
 * exercised the interceptors, the query cache and the error normaliser — the
 * places these screens actually got their bugs.
 *
 * Handlers are declared per test, so every test states the API behaviour it
 * depends on instead of inheriting a shared fixture.
 */
export const server = setupServer();

/** Absolute URL of an API path, e.g. api('/quiz/active'). */
export const api = (path: string): string => `${env.apiUrl}${path}`;
