# STATE OF PLAY

Where the project is, what is still open, and the order things should happen in.

Written 2026-10-01 at commit `b4f2765`. Update the numbers when they move; the
reasoning is the part worth preserving.

**Reviewed 2026-10-26.** Every number in §1 is unchanged. Twenty-five days of
work went into security, the visual rebuild and tooling — all of it real, none
of it content. That is the single most important line in this file: the code
side is close to done and the content side has not moved since it was written.
See §7.

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

### ~~`questions-src/` is publicly fetchable~~ — CLOSED 2026-10-26
The directory was renamed and is no longer served, the answers were stripped
out of the public `quizzes/` document, and `quizKeys/` is unreadable from the
client. Verified by reading the live document from a browser: the public
payload carries `id, options, question, memory_hook, category` and nothing
else, and a direct read of `quizKeys` returns `permission-denied`.

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

### ~~Server-side grading absent~~ — CLOSED 2026-10-26
`commitAnswer` writes the choice in a transaction *before* returning a
verdict, so a second call replays rather than regrades; `submitQuiz` reads the
committed attempt and is the only writer of `scores/`. Verified under direct
attack: sending the correct index to an already-answered question returns
`correct:false, replay:true`.

Two holes found and closed on the same day, both worth remembering:

- `submitQuiz` returned `correctIndex` and the explanation for **every**
  question in the key, so one call on a quiz you had never opened handed back
  the whole answer key. The reveal is now earned per committed answer.
- A partial attempt wrote a `scores/` row. The row is write-once, so a signup
  mid-quiz locked a 0 in permanently while the player's own profile showed the
  real score. Partial attempts are now refused.

Both existed because the server trusted the client to call it at the right
moment. That is not a control.

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

**Eleven** instances of one mistake: a rule written in two places, then
allowed to drift. It has caused more defects here than every other cause
combined, and it keeps arriving in a new disguise.

| where | what happened |
| --- | --- |
| Firestore rules | admin email copied into five rules |
| `admin.html` | accumulator keyed `Pop Culture`, DOM table keyed `Music/Movies` — threw, killed two panels |
| `under-siege.html` | rig scale in the SVG attribute and again in the physics |
| `review.html` | reported the retired ratio rule as a live gate |
| triage | the retired ratio rule restated from memory, inventing 426 defects |
| `auth.js` | a dead `FR_CATEGORIES` const — redeclaration is a SyntaxError that aborted the entire file, so every auth function silently vanished |
| `auth.js` | its own alias table pointing the OPPOSITE way to `categories.js`, canonicalising every stored category onto the retired name |
| `createUserProfile` | seeded three categories, under retired names, so every account was born missing Geography and Science & Nature |
| `mastery.js` | `CAT_META` keyed by display name, which the fix above renamed under it |
| `quiz.js` / `auth.js` | the Apps Script URL typed out twice; `contact.js` was about to make three |
| `go-live.sh` | computed the re-date start with `date -u +%F` while the tool used the quiz-day boundary — agreeing 19 hours a day, wrong for 5 |

Current owners, to import rather than restate:

- content gates → `tools/preflight.py`
- structure and references → `tools/check.py`
- who is admin → `isAdmin()` in `firestore.rules`
- writing `sourceRefs` → `tools/add-source.py`
- the review queue UI → `review-queue.js`, shared by both pages
- the rig transform → the SVG attribute, parsed back by the script
- what counts as evidence → `docs/SOURCING-STANDARD.md`
- **category names, labels, colours → `categories.js`**
- **the Apps Script endpoint → `FR_SHEET_URL` in `_app/sheet.js`**
- **design values → `tokens.css`** (no classes in it, ever)
- **the site footer → `_app/footer.js`**
- **the re-date start date → `migrate-to-firestore.js --print-start-date`**

If a rule needs to exist in two places, make the second read the first.

**Still not converted**, and therefore the next three instances waiting to
happen: `admin.html` (`DI_LEGACY_KEYS` plus a `catMap` with its own aliases),
`live.html` (`const CATEGORIES`) and `studio.html` (`const CATS`). All three
hold their own copy of the category list and none of them loads
`categories.js`. They are internal tools, so drift there breaks a dashboard
rather than a score — which is exactly how instance #2 was found.

### Two sub-patterns worth naming separately

**A guard that cannot fail is not a guard.** The sync loop in
`serve-local.sh` inherited `set -e`, died on a transient `sed` temp file, and
went on looking healthy for an hour while half the files froze. The credential
preflight in `migrate-to-firestore.js` once checked only that an environment
variable was non-empty. Both *looked* like safety.

**Trusting the client to call the server at the right moment is not a
control.** Both `submitQuiz` holes were this.

---

## 7. The review of 2026-10-26

Measured, not remembered. Run the tools if you doubt any of it.

### What moved in 25 days

| | 2026-10-01 | 2026-10-26 |
| --- | --- | --- |
| Questions | 984 | 984 |
| Sourced | 118 (12%) | **118 (12%)** |
| Publishable days | 7 | **7** |
| Facts approved | 0 / 93 | **0 / 93** |
| Archive snapshots | 0 / 288 | **0 / 288** |
| Server-side grading | absent | done, verified under attack |
| Answer key exposure | questions-src public | closed, verified |
| Player-facing UI | pre-rebuild | rebuilt: home, quiz, reveal, results, footer, legal |

Everything in the bottom three rows is real work and most of it was necessary.
But the top five rows are the scarce resource, and **not one of them moved.**

### The actual risk, in order

**1. 866 unsourced questions are about to be published.** 88% of the corpus
has never been checked against a source. A trivia site survives on being
right; one confidently wrong answer costs more trust than fifty good questions
earn. The gates in `preflight.py` catch *structural* defects — they cannot
tell you a claim is false.

This is not an argument against launching. It is an argument for knowing that
the thing most likely to hurt Fact Royale is not downtime or a leaked answer
key. It is a question that is simply wrong, published under a crest that says
"the reason it is the answer is the part you keep."

**2. There is no content pipeline.** 82 days is roughly three months of
runway. Nothing currently produces new days at the rate the site consumes
them, and the generation track that was supposed to — the fact layer — has 93
facts and zero approved, unchanged since it was built. Three months is enough
time to fix this and not enough to ignore it.

**3. `style.css` is still 4,244 lines and loaded on every page.** It was
scheduled for deletion at the end of Phase 3. Phase 3 is over. It still owns
`.screen`, `.modal-card`, `.cat-*` and the legacy landing, which is why
`app.css` carries rules whose only job is to undo it. Every one of those
override rules is a future collision.

**4. `_app/quiz.js` is 3,001 lines.** It is the largest player-facing file by
a factor of three and it holds the quiz, the results, the archive, sharing,
challenges and the notify form. The next hard bug will be in here, and it will
be hard because of the size.

### What is genuinely strong

- **The security model.** Commit-then-reveal, a key collection the client
  cannot read, a reveal earned per answer, write-once leaderboard rows.
  Verified by attacking it rather than by reading it.
- **The tooling.** 26 tools, real runbooks, scripts that refuse rather than
  guess, and error messages that translate Google's into something true. The
  credential preflight and `go-live.sh`'s abort-before-destroy ordering are
  better than most production systems.
- **The documentation.** 2,300 lines that explain *why*. This file exists so a
  cold start does not have to reconstruct the state from a chat transcript,
  and that has already paid for itself more than once.

### What I would do next, in order

1. **Launch.** It is ready, the rollback is one command, and nothing on this
   list gets easier while dark.
2. **Source the 21 days behind the launch window** before they are served.
   That is the cheapest possible version of risk #1: you only need the days
   ahead of the player, not all 82.
3. **Decide the content pipeline** — generation from the fact layer, manual
   authoring, or a deliberate reduced cadence. Any answer beats discovering
   the cliff in January.
4. **Delete `style.css`** and the `#legacy-landing` block together. They are
   one job.
5. **Convert `admin.html`, `live.html`, `studio.html`** to `categories.js`.
6. **Split `quiz.js`.** Results and archive are the obvious seams.
