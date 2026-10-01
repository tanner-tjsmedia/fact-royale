# STATE OF PLAY

Where the project is, what is still open, and the order things should happen in.

Written 2026-10-01 at commit `b4f2765`. Update the numbers when they move; the
reasoning is the part worth preserving.

This file exists so a cold start does not have to reconstruct the state from a
chat transcript. The other docs explain *why* decisions were made; this one
says *where we are*.

---

## 1. Numbers, measured not remembered

| | |
| --- | --- |
| Question days | 82 (2026-06-13 to 2026-09-06) |
| Questions | 984 |
| Sourced | **118** (12%) |
| Unsourced | 866 |
| Days clean on every owned gate | 28 |
| Days **publishable** (clean AND fully sourced) | **7** |
| Source registry | 288 entries, **0 with archive snapshots** |
| Facts | 93, **0 approved** |

Publishable days: `2026-08-09, 08-10, 08-11, 08-13, 08-14, 08-25, 09-06`.

Regenerate all of this with `tools/preflight.py`, `tools/check.py` and
`tools/add-source.py --status`. Do not trust the table over the tools.

---

## 2. The one thing blocking relaunch

**Sourcing.** Not content quality.

An earlier triage claimed 426 "shallow" questions and a 50% answer-is-longest
exploit. Both were wrong. The ratio rule had been **retired on purpose** in
`preflight.py` (it rejected 48 of 48 numeric questions) and was resurrected by
mistake; "answer is longest" was counted without the `TELL_MAX` margin that
makes it a defect. Against the project's own gates the real figures are 96
length tells and 744 clean questions.

The lesson, which has now cost this project five times: **import a rule from
its owner, never restate it.** See §6.

Target: all 28 clean days = 239 questions. 118 done. Work them cheapest-first
so complete days accumulate early; you cross 21 days (three weeks) at roughly
question 149 and can relaunch while the rest finishes.

Standard: `docs/SOURCING-STANDARD.md`. Measured cost about one search per
question, because the corpus is ~90% singletons and offers no clustering
advantage.

---

## 3. Open decisions

### `questions-src/` is publicly fetchable
Tracked in git and served by GitHub Pages, so anyone can read tomorrow's
answers. The `publishAt` gating in Firestore is decorative while the flat
files are public. **Firebase Hosting closes this.** It is a security fix, not
a migration chore.

### `groups` leaks across users
`allow read: if request.auth != null` lets *any* signed-in user read *every*
group document, and those documents carry `memberNames`, which falls back to
`currentUser.email`. Latent only because `_app/groups.js` is dark.

The naive fix (`request.auth.uid in resource.data.memberUids`) **breaks
joining**, because `joinGroup` queries by code as a non-member. Needs either a
separate `groupCodes` lookup collection or a Cloud Function. Design before
relaunching groups.

### `plays` accepts anything and now feeds the dashboard
`allow create: if true` with no field validation. Admin can now read it, so
junk goes straight into the admin numbers. Cheap fix: validate the shape
`quiz.js` actually writes.

### Server-side grading absent
A signed-in user can still post 12/12 without playing. Rules cannot regrade a
quiz. Needs Cloud Functions, which needs the Blaze plan. Only matters while a
public leaderboard exists.

### Facts: 0 of 93 approved
`approvedBy` must be a human and nothing publishes without it. The review
queue in `/admin.html` is the approval list.

### Fact layer migration path (#133) undesigned
How a fact attaches to a question. Worth doing for the **generation** track,
not as a sourcing shortcut — measured coverage is only ~8 of 239 runway
questions, so it saves no meaningful sourcing work.

### No archive snapshots
0 of 288 sources. Every citation is a live URL that can move.

---

## 4. Fact base: what it is actually for

For **generation** — learning mode, live events, distractor supply — not for
citing existing questions. Measuring it by question coverage measures the
wrong thing.

Current generative readiness: **63 of 93 facts have 3+ sibling answers**,
enough to build a question with plausible distractors. Blockers are not
volume:

- **39 tags hold only one fact.** Dead ends. `colosseum` cannot generate;
  `ancient-rome` can. For generation the tag *is* the distractor pool, so the
  taxonomy is too granular in places.
- **Only 3 enumeration facts.** Per `FACT-LAYER.md` §9 enumeration is the only
  claim type licensing automatic refutation.

So: depth per subject and more enumerations. Not broader coverage.

---

## 5. Platform: the sequence

Cowork's "run on your computer" mode ends 2026-10-06 for new tasks. Existing
tasks keep working. There is no cliff, so **do not migrate mid-repair.**

The destination is right: Firestore for live data, Firebase Hosting for
serving. Both fix real problems rather than merely relocating them. Much of it
is already built and never run — `tools/migrate-to-firestore.js` (225 lines)
and `tools/sync-questions.js` (242) exist; the service-account key was never
generated.

**Keep the repo.** Not nostalgia — `sync-questions.js` already states the
reason in its own header:

> `questions-src/*.json` — THE MANUSCRIPT. Git history, diffs, revert, and
> preflight.py as a blocking gate. This is what makes a bad edit recoverable.
> `questionBank/{frq-id}` — THE WORKBENCH. Has no history of its own, which is
> exactly why `--pull` exists.

Firestore cannot diff, blame or revert. The dual store was designed for that
reason and the reason still holds. The repo is also what keeps **2,972 lines
of Python across 16 tools** working unchanged — 12 of them read these files
directly, and `preflight.py` and `check.py` (768 lines together) *are* the
quality system.

Suggested order:

1. **Finish sourcing.** No platform changes. Longest pole, unblocks relaunch.
2. **Firebase Hosting.** Closes the `questions-src` exposure. Only 2 client
   files fetch local JSON (`review.html`, `review-queue.js`), so the client
   migration is small.
3. **Run the migration** to Firestore. Tools exist; generate the key.
4. **Fix `groups` and `plays`** before restoring those features.
5. **Cloud Functions** only when a public leaderboard returns.

Tooling after the move: Claude Code, not cloud Cowork. The Python toolchain
needs a real filesystem and the repo it already reads.

---

## 6. The recurring bug in this project

Five instances of one mistake: a rule written in two places, then allowed to
drift.

| where | what happened |
| --- | --- |
| Firestore rules | admin email copied into five rules |
| `admin.html` | accumulator keyed `Pop Culture`, DOM table keyed `Music/Movies` — threw, killed two panels |
| `under-siege.html` | rig scale in the SVG attribute and again in the physics |
| `review.html` | reported the retired ratio rule as a live gate |
| triage | the retired ratio rule restated from memory, inventing 426 defects |

Current owners, to import rather than restate:

- content gates → `tools/preflight.py`
- structure and references → `tools/check.py`
- who is admin → `isAdmin()` in `firestore.rules`
- writing `sourceRefs` → `tools/add-source.py`
- the review queue UI → `review-queue.js`, shared by both pages
- the rig transform → the SVG attribute, parsed back by the script
- what counts as evidence → `docs/SOURCING-STANDARD.md`

If a rule needs to exist in two places, make the second read the first.
