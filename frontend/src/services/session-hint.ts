/**
 * A note to ourselves that this browser had a session.
 *
 * The refresh token now lives in an HttpOnly cookie, which is the point — but
 * it also means this code cannot look and see whether someone is signed in.
 * The only way to ask is to call `/auth/refresh` and read the answer, and
 * doing that on every cold start would fire a doomed request at the server
 * for every stranger who ever opens the landing page.
 *
 * So a flag is written when a session begins and removed when it ends, and
 * startup consults it before bothering the network. It is a hint and nothing
 * more: it proves nothing, grants nothing, and forging it buys an attacker
 * one 401. The cookie remains the only thing that actually authenticates.
 *
 * If storage is unavailable or was cleared while the cookie survived, the
 * worst case is a reader who has to sign in again — never a reader who gets
 * in without one.
 */
const SESSION_HINT_KEY = 'quix.hasSession';

export const sessionHint = {
  /** Whether this browser is worth asking the server about. */
  exists(): boolean {
    try {
      return localStorage.getItem(SESSION_HINT_KEY) === '1';
    } catch {
      return false;
    }
  },

  remember(): void {
    try {
      localStorage.setItem(SESSION_HINT_KEY, '1');
    } catch {
      // Private mode or storage disabled: startup will simply not attempt a
      // silent sign-in, and the reader logs in as they would anyway.
    }
  },

  forget(): void {
    try {
      localStorage.removeItem(SESSION_HINT_KEY);
    } catch {
      // ignore
    }
  },
};
