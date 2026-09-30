# Progressive Web App

**Status:** Implemented
**Last Updated:** September 2026

---

# 1. Purpose

The platform installs. A reader adds it from the browser's own menu, it lands
on the home screen with its own icon, opens without an address bar, and starts
from its cache rather than from the network.

This is not a step towards an app store. It is the cheapest way to make a
study tool behave like something you return to daily: instant to open, and not
broken when the signal is.

Three files do all of it — a manifest, a service worker, and a set of icons —
and all three are produced at build time by `vite-plugin-pwa`, configured in
`frontend/vite.config.ts`.

---

# 2. The manifest

| Field | Value | Why |
|---|---|---|
| `start_url` | `/dashboard` | Whoever installed this already read the landing page. Signed-out readers are sent to `/login` by the route guard, as they would be anywhere. |
| `display` | `standalone` | No address bar. |
| `orientation` | `portrait` | Every screen is designed down to 390px; a rotated phone gains nothing. |
| `theme_color`, `background_color` | `#0b0a0f` | The splash screen and the task switcher, painted before any CSS has run. Dark because dark is the default theme — the light theme repaints the address bar at runtime through the `theme-color` meta tag. |
| `lang` | `uk` | The interface is Ukrainian-only. |

## Icons

`pwa-192.png` and `pwa-512.png` carry the mark on the dark background. A third,
`pwa-maskable-512.png`, exists because Android crops an icon into whatever
shape the launcher uses — a circle, a squircle, a rounded square — and would
cut the corners off the plain one. Its mark sits at half the canvas, well
inside the safe zone.

`apple-touch-icon.png` is linked from `index.html` rather than the manifest:
iOS ignores manifest icons and takes that link, and without it an installed app
gets a screenshot of the page for an icon.

---

# 3. What the service worker caches

## The shell — precached

Every HTML, JS, CSS and font file of the build, minus the two heaviest lazy
chunks (`katex.min`, `MarkdownContent`). About 1.6 MB, fetched once on the
first visit. This is what makes the app open with no network.

The two chunks are left out on purpose: together they are around 430 KB, and a
reader who never opens a set of notes with formulas in it never needs either.
They are cached at runtime, the first time something actually asks.

## The API — never cached

`NetworkOnly` for everything under `/api/`, and this is a privacy rule rather
than a performance one. A cached answer sheet or page of statistics outlives
the session that fetched it, and on a shared family phone the next person to
pick it up would be able to read it. The session is deliberately long-lived
(decision 36), which makes this stricter rather than looser.

The practical consequence: offline, the app opens and shows its shell, and
every screen that needs data says so. There is no offline study mode, and
there was never a plan for one — answering a timed test, a mock paper or a live
duel without a server is not a caching problem.

## Question images — `CacheFirst`

`/content/` holds fixed illustrations at stable paths. Worth keeping, capped at
120 entries and thirty days.

---

# 4. Updates

`registerType: 'prompt'`. A new build waits in the service worker and
`NewVersionPrompt` asks; it does not take over on its own.

The alternative, `autoUpdate`, swaps the running build underneath whoever is
using it. This app is regularly open on a clock — a timed test, a mock paper, a
live duel — and a mid-question swap is exactly the failure
`frontend/src/lib/stale-build.ts` exists to recover from. Announcing the update
and waiting costs nothing.

Dismissing the prompt means «not now»: the update stays waiting and the next
cold start takes it regardless, so nobody is stranded on an old build by
saying no once.

`stale-build.ts` stays in place. It covers the reader whose service worker is
itself still the old one — the first load after a deploy, before any of this
has had a chance to update.

---

# 5. Two things the host has to get right

Both are in `frontend/vercel.json`, and both fail silently if forgotten.

**The SPA rewrite must not swallow the service worker.** `vite-plugin-pwa`
writes `sw.js`, `workbox-*.js`, `manifest.webmanifest` and `registerSW.js` to
the root of `dist`, not under `assets/`. A rewrite that sends everything but
`assets/` to `index.html` therefore answers `/sw.js` with HTML, the browser
refuses to register a service worker served as `text/html`, and nothing works —
with no error that says why. The rewrite's exclusion list names each of them.

**`sw.js` must not be cached.** The long `immutable` header belongs to
`/assets/`, whose filenames carry a content hash. The service worker's name
never changes, so a cached copy of it means updates stop arriving. It is served
`max-age=0, must-revalidate`, along with `registerSW.js` and the manifest.

---

# 6. Checking it

The service worker is disabled in `npm run dev` — one serving a stale build is
the last thing wanted while editing. Verify against a real build:

```bash
npm run build && npm run preview
```

Then, in DevTools → Application: the worker is activated, the manifest parses,
and Chrome offers to install. Switch the network to «Offline» and reload — the
shell must still draw, with the offline notice on top of it.

A real phone is worth the trouble at least once: an emulator will not show you
how the launcher crops your icon.
