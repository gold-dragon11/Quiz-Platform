import { describe, expect, it } from 'vitest';
import html from '../../index.html?raw';
import vercelJson from '../../vercel.json?raw';

const vercel = JSON.parse(vercelJson) as { headers: { headers: { key: string; value: string }[] }[] };
const policy = vercel.headers
  .flatMap((rule) => rule.headers)
  .find((header) => header.key.startsWith('Content-Security-Policy'))?.value;

async function sha256Base64(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return btoa(String.fromCharCode(...new Uint8Array(digest)));
}

/**
 * The site's CSP allows exactly one inline script — the theme snippet in
 * index.html — by its hash (vercel.json). Editing the snippet without the hash
 * would leave the policy blocking it, and every reader of the light theme
 * would see the dark one flash first. This keeps the two in step.
 */
describe('Content-Security-Policy', () => {
  it('is declared for every page', () => {
    expect(policy).toBeDefined();
  });

  it('allows every inline script of index.html by its hash', async () => {
    const inline = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((match) => match[1]);
    expect(inline.length).toBeGreaterThan(0);
    for (const body of inline) {
      expect(policy).toContain(`'sha256-${await sha256Base64(body)}'`);
    }
  });
});
