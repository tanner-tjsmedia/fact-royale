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


---

# Under Siege: state as of 2026-10-19

Worked on heavily. Structural faults found and fixed with measurements; what
remains is visual iteration.

## Fixed, with the evidence

- **Parallax lag.** `--mx`/`--my` were written to `document.documentElement`
  every frame, invalidating style for the whole document 60x a second,
  permanently. Scoped to `.stage`. Also removed a `transition` on a transform
  that was being rewritten per frame - two owners of the same easing.
- **Arm curve.** Was `smoothstep`, whose angular speed peaks at the midpoint;
  release fires at 58%, so the arm was decelerating as it let go and then
  eased to a dead stop. Now accelerates from rest through release, then runs
  down. Peak speed 2.00 vs 1.46, landing exactly on the release.
- **Speed discontinuity at release.** `GAIN = 0.44` meant the stone travelled
  9.6px/frame in the sling and 4.1px/frame the instant it left: a 56% brake
  applied at the moment of launch. GAIN is 1.0 now; range comes from gravity.
- **One-frame teleport.** The stone was placed at the pouch position AND
  advanced a full velocity step on the same frame, covering 2v between two
  drawn frames. Series read `9.9 9.9 10.1 19.8 9.5`. Fixed with a
  `justReleased` guard; now smooth through the release.
- **Scripted sling replaced with a simulated one.** See below.
- **Flames flailing.** `.flame` used keyword `transform-origin: bottom
  center` without `transform-box: fill-box`, so it resolved against the
  400x250 view-box, not each flame. Every flame was scaling about a point
  halfway across the stage. Banners had the same fault.
- **Sling rotoring on reset.** The winch-back swung the arm 150 degrees in a
  dozen frames and that tip acceleration drove the pendulum harder than the
  throw. Capped angular speed, slowed the winch, and the reset now EASES the
  sling home rather than simulating it. 5.67 revolutions -> 1.75.
- **Damage localisation.** `knockOut` had no distance limit, so once the
  impact area was hollow the "nearest" block could be in the far tower.
  `collapse` dropped every block on the stage. Both now local: verified at a
  breach, gatehouse 24/24 down, curtains 6/12, both towers standing.
- **Hit box.** Was one rectangle from the tallest crest to the ground, so a
  stone clearing the LOW curtain still scored. Now reads the per-segment
  profile.
- **Wall rebuilt** as tower / curtain / gatehouse / curtain / tower, with a
  curtain running off both edges of the frame, and a castle and city behind.
  Stone darkened to `#14141f`: it was `#232336` against a `#1e1e36` castle,
  which is no contrast at all.

## The one structural fault NOT fixed

**The sling is too short to behave like a sling.** It is 35 units against a
95-unit arm, about 1:3. Real trebuchets run close to 1:1, and that ratio is
what makes a sling matter - it lets the stone trail, get dragged forward, and
take a second rotation at the end. At 1:3 under high angular speed the sling
just locks radially outward along the arm, which is correct physics for the
geometry it has been given. The geometry is what is wrong.

Symptom the user reported: "the swing and release point is still off".

Fixing it means lengthening the drawn sling in the SVG (the `REST`/`TIE`
points, which is where `SLING_L` is derived from), then re-deriving the
release gate and re-tuning `GRAV`. `tools/` has no script for this; the
tuning was done by simulating the whole flight at 21 power settings and
choosing for most-hits plus widest spread across the wall face.

## The lesson worth carrying into the rest of the site

Every fault above except the flames came from the same root: the motion was
SCRIPTED - an angle as a function of elapsed time - rather than modelled. So
each behaviour had to be authored by hand, and anything nobody thought to
author came out wrong. Four separate "fix the throw" passes each fixed a real
thing and left another.

Replacing the scripted sling with ten lines of pendulum integration produced
the lag, the whip, the release angle, the follow-through and the rest pose at
once, because they are all consequences of one equation.

**Rule: if it has mass, contact, or a handoff between two bodies, model it.
Only decorate what does not move.** A scripted curve is fine for a fade or a
slide; it is not fine for anything that is supposed to look physical.

## Debugging technique that worked

The browser tab gets throttled in the background, which makes frame timing
unreliable and wasted several rounds. The fix is to take manual control of the
clock from the console:

```js
window.__raf = window.requestAnimationFrame.bind(window);
window.__pending = null;
window.requestAnimationFrame = cb => { window.__pending = cb; return 1; };
window.__step = n => { for (let i=0;i<(n||1);i++){ const cb=window.__pending;
                       window.__pending=null; if(cb) cb(performance.now()); } };
```

Then `__step(n)` advances exactly n frames, and screenshots can be taken at
any point in the throw. Note the machine must be armed from a FRESH page load,
or the first keypress fires a zero-power shot instead of arming.
