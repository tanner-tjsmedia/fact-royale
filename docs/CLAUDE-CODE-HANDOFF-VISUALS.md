# Handoff: player-facing visual overhaul

Scoped for a separate Claude Code session running in parallel with the
security cutover. The point of the scope is to avoid two sessions editing the
same file.

## Hard boundary — do not touch these files

These are mid-rewrite for server-side grading. Editing them will cause a
merge conflict or, worse, a silent revert of a security change:

- `_app/quiz.js`
- `auth.js`
- `functions/index.js`
- `firestore.rules`
- `tools/migrate-to-firestore.js`

If a visual change *requires* one of them (e.g. a new DOM id that quiz.js must
populate), do not edit it. Write the requirement at the bottom of this file
under "Requests into quiz.js" and leave it.

## Yours

- `style.css` — the bulk of the work
- `index.html`, `mastery.html` — markup and inline critical CSS
- `icons.js` — the SVG system
- `under-siege.html` — self-contained, no shared deps
- any new `.css` / `.svg` / asset files

## Context you need

- Site is **dark** since 2026-09-03. Nothing you ship is user-visible until
  relaunch, so you can be bold; you cannot break a live experience.
- Five categories: History, Sports, Music/Movies, Geography, Science & Nature.
  Category colors are defined once in `style.css` as CSS variables and
  referenced by the `cat-*` classes. **One owner per rule** is the project's
  standing convention and its most frequent bug class — if you find a color,
  a size or a timing defined in two places, consolidate it rather than
  matching it.
- Critical layout CSS was deliberately inlined into the HTML files to stop a
  flash of unstyled content. That duplication is intentional. Keep it in sync.
- Every `<script>` and `<link>` tag carries a `?v=N` cache-buster. GitHub
  Pages gives no control over cache headers and holds HTML about ten minutes.
  **Bump `?v=` on every file you change** or the change will not land for
  users. This has bitten this project repeatedly.
- No build step. No framework. Plain CSS and vanilla JS, served straight from
  the repo by GitHub Pages. Do not introduce a bundler or a dependency.
- Copy style: no em dashes or en dashes anywhere in UI text. This was swept
  once already; do not reintroduce them.

## The actual goal

Tanner's framing: *players should have a visual understanding* of their own
progress and of the answer they just got. Right now the app tells them things
in text that it should be showing them. Specific territory, in rough priority:

1. **The answer reveal.** The single highest-traffic moment in the product and
   currently a colored border plus a paragraph. It should feel like a verdict.
2. **Progress through the quiz.** Where am I in the ten questions, how have I
   done so far, without a number that spoils the reveal cadence.
3. **The results screen.** Category breakdown bars exist and animate; they are
   thin. This is the screen people screenshot.
4. **Royal Record / mastery.** Tier graphics were elevated once. The page is
   still a list of cards rather than a picture of a trajectory.
5. **Streak.** A flame icon and an integer. A streak is the retention
   mechanic; it deserves to look like an asset the player owns.

Treat that list as the brief, not a spec. Push back on any of it.

## Verification

There is no test suite for visuals. Before claiming any item done:

- Open the page in a browser at 375px, 768px and 1440px. Mobile is the
  majority case and was fully optimized once; do not regress it.
- Check both the logged-in and anonymous paths. Anonymous play is the signup
  funnel and several elements render differently or not at all.
- `grep` for the ids and classes you styled and confirm they exist in the
  markup that is actually shipped. A past bug shipped mastery-teaser CSS
  against class names that did not exist in the HTML, so it silently did
  nothing.

## Before you try to open the page

**The app in `_app/` cannot currently be loaded in a browser.** `_app/*.html`
reference `firebase-config.js`, `auth.js` and `icons.js` relatively, but those
three live at the repo root, not in `_app/`. The relative paths are correct for
the layout the app will have *after* relaunch (everything back at root); they
404 in the layout it has now.

So to view a page, copy it and its root-level dependencies into one directory
first, outside the repo, and open it from there. Do not "fix" the paths in
`_app/*.html` - they are right for the destination, and changing them would
break the relaunch move, which is `git mv _app/* .`.

A local HTTP server is required either way: `fetch()` on `questions/*.json`
fails under `file://`.

## New hooks you can style

Server-side grading introduced one state the UI did not previously have.

- `#options-grid.awaiting` — set the instant a player taps an option, cleared
  when the verdict comes back. In server mode there is now a network round
  trip in a moment that used to be instant, and right now nothing marks it, so
  a slow connection reads as a dead tap. This needs a treatment: pulse the
  chosen option, dim the others, something. It is the one piece of this
  feature that is purely visual and it is yours.
  The chosen button is identifiable: every option button carries
  `data-ci="<index>"`, and the tapped one is the only one that will later gain
  `.correct` or `.wrong`.

## Requests into quiz.js

(append here; do not edit the file)

- _none yet_
