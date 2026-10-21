# Visual build plan

Direction approved 2026-10-21 from `_mockups/`. This is how it gets built,
and how it fits around the relaunch.

---

## The sequencing decision, first

The site has been dark since 2026-09-03. Two orders are possible:

**A. Relaunch on the current look, then ship the redesign.**
Gets the site back faster. Costs you two reopenings, and the first one is on
a design you have just said is not good enough. Anyone who returns for that
window sees the old site and forms an opinion.

**B. Build the redesign, then relaunch once.**
One reopening, on the design you want. Costs more dark time. The security
work is already done and will sit finished-but-unlaunched for longer.

**Recommended: B.** Seven weeks dark means the audience is already cold;
another two does not change much, and reopening twice spends the attention
you get from reopening at all. The exception would be a reason to be live
on a specific date.

Either way, two things are independent of the look and should be settled
regardless, because they block launch on their own:

- **The content cliff.** Firestore has 82 historical days plus 14 re-dated
  onto Oct 13-26. After Oct 26 there is no quiz for any date. See
  `docs/PRE-LAUNCH.md` A1.
- **The signed-in path has never run.** `submitQuiz` has never written a
  leaderboard row. See `docs/PRE-LAUNCH.md` A2.

---

## Phase 1 — Foundation

Nothing visible ships in this phase. It is the thing that stops phases 2-4
from each inventing their own version of a button.

1. **Extract the token set** from `_mockups/mock.css` into `tokens.css`.
2. **End the duplication.** `tokens.css` carries a note admitting `style.css`
   keeps its own copies "during the migration", and the migration never
   finished. Every colour and type value gets ONE owner. This is the single
   highest-value item in the whole plan: it is why a palette change is
   currently a search-and-replace rather than an edit.
3. **Build the shared components**, each once:
   - the shield (category chip, results breakdown, standard, mastery crest)
   - the six rank symbols as an SVG sprite
   - `hrule`, `hhead`, `seal`, `charter`
   - buttons, cards, the progress segments
   - the castle scene as one reusable SVG, not pasted per page

**Done when** a page can be built without writing a new colour, a new radius
or a new button.

---

## Phase 2 — The play loop

Highest traffic, and the thing people are actually here for.

- Question screen
- Reveal
- Results

These live inside `_app/index.html` as `#screen-quiz` and `#screen-results`,
so this is a rework of existing markup rather than new pages. The mockups are
standalone documents; the real app is one page with screens.

**Watch:** `_app/quiz.js` renders options and the reveal from JS. The markup
it generates has to change with the CSS, and that file also carries the
server-grading wiring finished this month. Change them in one pass, not two.

---

## Phase 3 — The two homes

- Public home: scene hero, standards, three steps
- Member home: same scene and chrome, member content

**New behaviour, not just new styling:** the home becomes stateful. Signed
out gets the public page, signed in gets the board. Today `index.html` is one
page with nine sections that show and hide. The replacement is two layouts
behind one route.

---

## Phase 4 — Supporting pages

Royal Record, archive, leaderboard, groups, challenge and share, auth.

Lower traffic, and by this point every component exists, so these are mostly
assembly. The share card is the exception: it is drawn to a canvas in
`_app/quiz.js`, so the new design has to be reimplemented in canvas rather
than CSS.

---

## Phase 5 — Integration and launch

1. Flip `FR_USE_FIRESTORE` and run the pre-launch tests from
   `docs/PRE-LAUNCH.md` against the new UI
2. Settle the content cliff
3. `./go-live.sh` (its pre-flight will refuse if the cutover is incomplete)
4. Play a full quiz on the real site as a stranger would

---

## Who does what

This session established the pattern the hard way on Under Siege: structural
and model work goes fast here, and visual iteration is expensive — every
look-adjust-look cycle costs a round trip and a lot of context.

- **Here:** phase 1 entirely, the stateful home logic, the quiz.js rework,
  the canvas share card, integration and testing.
- **Claude Code:** the look-adjust-look passes in phases 2-4, working from
  the approved mockups as the spec. `_mockups/` is the contract — it already
  exists, it is already approved, and it is the thing to build against.

The handoff boundary that matters: Claude Code should not touch
`_app/quiz.js`, `auth.js`, `functions/`, `firestore.rules` or
`tools/migrate-to-firestore.js`. See `docs/CLAUDE-CODE-HANDOFF-VISUALS.md`.

---

## Rules carried forward

1. **One owner per rule.** The recurring bug class in this project. Three
   copies of the holding page, five copies of the admin email, two copies of
   the colour palette. Every one of those cost real time.
2. **If it moves, model it.** Scripted keyframes produce an endless tail of
   symptoms. Only decorate what does not move.
3. **Bump `?v=` on every changed file.** GitHub Pages gives no cache-header
   control. Five pages shipped with no cache-buster at all this month.
4. **The theme is structural, not decorative.** A rule, a seal, a corner
   tick. The moment something reads as ornament it comes out.
