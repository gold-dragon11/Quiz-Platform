/**
 * The two public demo accounts (docs/08-development/deployment.md §17.9).
 *
 * Not a secret: the same addresses and password are printed in the README, and
 * the backend refuses a demo account the changes that would spoil it for the
 * next visitor. They live here so the landing can offer «Спробувати демо» as
 * one click: `/login?demo=student` arrives with the form already filled.
 */
export const DEMO_ACCOUNTS = {
  student: { email: 'demo-student@learn-ls.com', password: 'LsDemo2026!', label: 'учня' },
  teacher: { email: 'demo-teacher@learn-ls.com', password: 'LsDemo2026!', label: 'вчителя' },
} as const;

export type DemoRole = keyof typeof DEMO_ACCOUNTS;

/** The login address that arrives with a demo account filled in. */
export function demoLoginPath(role: DemoRole): string {
  return `/login?demo=${role}`;
}

/** The demo account a `?demo=` value names, or null for anything else. */
export function demoAccountFor(value: string | null): (typeof DEMO_ACCOUNTS)[DemoRole] | null {
  return value === 'student' || value === 'teacher' ? DEMO_ACCOUNTS[value] : null;
}
