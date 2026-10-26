# Pre-launch checklist

Measured 2026-10-19, not recalled. Going live is one act: `./go-live.sh`,
then commit and push. Nothing before that exposes anything.

Three categories below: things that must be true before that command runs,
things already proven, and things being accepted knowingly.

---

## A. Blockers

### A1. Content dates — RESOLVED, armed for launch day

Firestore holds 82 historical days (2026-06-13 to 2026-09-06, all in the
past) plus 14 re-dated onto Oct 13-26 for testing. With every document in
the past there is no "today" to load, and the quiz does not degrade or fall
back — it does not load at all. The static fallback is gone on purpose.

**Decision: re-date the whole back catalogue onto the launch day.** 82 days
is roughly three months of runway. 80 of those days were served live between
June and September, so returning players will see repeats; with the current
user base that is accepted. Old `scores/` rows are keyed by the old dates, so
nothing collides.

This could not simply be done early, because the one value that matters —
the date the run starts on — is the day the site actually comes back up. So
it is **armed in advance and fired by `go-live.sh`** rather than remembered:

```
# now, once: rehearses the whole thing including credentials
node tools/migrate-to-firestore.js --stage --from 2026-06-13 --limit 82
git add PENDING-REPUBLISH.json && git commit -m "Arm the launch-day re-date"

# launch day: runs the re-date itself, first, before any file moves
./go-live.sh
```

`PENDING-REPUBLISH.json` is tracked at the repo root on purpose — loud in a
listing and in `git status`. It records the intent, not the dates, and once
executed it records that too and refuses to run a second time. That refusal
matters: a second run would re-date everything onto a new today and move
every quiz out from under anyone mid-streak.

If the re-date fails on launch day (an expired credential is the likely
cause), `go-live.sh` aborts before touching a single file. The holding page
stays up and nothing is stamped, so fixing the credential and re-running is
the whole recovery.

**Authoring new days** is still the correct long-term answer and is gated on
the sourcing standard below — 118 of 984 questions are sourced, 7 days fully.
That work now has three months of runway behind it instead of one week.

### A2. The signed-in path has never executed

Not once, anywhere. `submitQuiz` has never written a leaderboard row.

- [ ] **Test 1** - sign in, play a full quiz, confirm a row appears in
      `scores/{uid}_{date}` with the right score and displayName.
- [ ] **Test 3** - play signed out, then sign up from the results nudge.
      Confirm the SAME uid is kept (account linking) and today's row appears
      **without replaying the quiz**.

Test 3 is the one to watch. It is the signup funnel, it is the most intricate
code in this change (`upgradeOrCreateEmailAccount`, `upgradeOrSignInWithPopup`,
`claimTodaysRow` in auth.js), and if it is wrong the failure is silent: the
player signs up and simply never appears on the board.

### A3. Admin console unverified on the new address

`tanner@tjs16media.com` became `tanner@takt16.com`. Both are currently allowed.

- [ ] Open `/admin` signed in as takt16 and confirm the dashboard loads.
- [ ] Then **remove the legacy address** from both owners:
      `FR_ADMIN_EMAILS` in `firebase-config.js` and `isAdmin()` in
      `firestore.rules` (2 occurrences each). Redeploy rules.

A dead domain left in an admin list means whoever registers it next inherits
admin.

### A4. Scheduled functions were broken and are unverified

`sendDailyNotifications` and `analyzePeakPlayTime` read Firestore through the
same service account that was missing `roles/datastore.user` until 2026-10-19.
They have been failing on every run since deployment.

- [ ] `firebase functions:log --only sendDailyNotifications --lines 20`
      Confirm a clean run after the IAM grant.

Launching with push notifications silently broken wastes the retention
mechanism they exist to serve.

---

## B. Verified

Do not retest these; they were measured, not assumed.

| | How it was proven |
|---|---|
| Quiz loads from Firestore, `grading mode: server` | console on localhost |
| Client receives no answer, explanation or sourcing | `Object.keys(questions[0])` returned exactly `category, id, memory_hook, options, question` |
| Answers reach the client only after a commit | reveal rendered from the `commitAnswer` response |
| A committed answer cannot be changed | sent the CORRECT index to an answered question; server returned `correct:false, replay:true` |
| Anonymous auth works and stays invisible to account code | `realUser()` returned null with a live anonymous session |
| Unreachable scorer loses nothing | question handed back, no score recorded |
| `scores/` is server-write-only | rules deployed, `allow write: if false` |
| Both callables invokable | `allUsers` -> `roles/run.invoker` on each Cloud Run service |
| Client and server agree on the quiz date | `QUIZ_RESET_UTC_HOUR` 5 == `PUBLISH_OFFSET_HOURS` 5; client asked for Oct 18 at 02:30 UTC, correctly |
| Under Siege work reaches real visitors | `index.html` and `404.html` now match `under-siege.html`; `tools/sync-holding-page.sh --check` passes |

---

## C. Accepted knowingly

Not blockers. Written down so they are decisions rather than oversights.

### C1. Sourcing is 12% complete
118 of 984 questions carry `sourceRefs`; **7 of 82 days** are fully sourced.
The standard in `docs/SOURCING-STANDARD.md` says a source must establish the
ANSWER, not the topic, and it is deliberately strict. Launching means
publishing days that do not meet it. That is survivable for a trivia app and
it is still a gap between the stated standard and the shipped product.

### C2. No archive snapshots
288 sources, **0 archived**. Every citation is a live URL that can rot or
change under us. A link that 404s later cannot be re-verified.

### C3. 93 facts, 0 approved
The fact layer exists, is seeded to `factBank`, and has an approval UI that
has never been used. Nothing publishes from it, so this blocks the generation
framework, not the launch.

Related: fact approvals currently write to Firestore only. There is an
"Export to disk" button but no approval has ever round-tripped to
`facts-src/*.json`, so approvals have no git history yet.

### C4. `groups` leaks member emails
`firestore.rules` line 184: `allow read: if request.auth != null`. Any
signed-in user can read any group document, and those carry `memberNames`
with display names and in some paths emails. Low impact at current scale,
real if the user base grows.

### C5. `plays` accepts unvalidated writes
`allow create: if true`, no shape validation. Anyone can inflate the analytics
in the admin dashboard. It is write-only and admin-read, so it corrupts
reporting rather than gameplay.

### C6. Four `?v=` cache-busters per deploy
HTML files cannot be cache-busted on GitHub Pages (~10 min, no header
control). Every JS change needs its `?v=` bumped in every page that loads it.
Five pages were found shipping with no `?v=` at all on 2026-10-09.

---

## D. The go-live sequence itself

Only after section A is clear.

1. `./go-live.sh --dry-run` - read the plan, change nothing
2. `./go-live.sh` - restores `_app/*` to root, deletes `404.html`
3. `git status --short` - confirm `index.html` is the real homepage, not
   Under Siege, and that `_app/` is gone
4. `git commit -m "Back online" && git push`
5. Within ten minutes, load `fact-royale.com` in a private window and play a
   full quiz as a stranger would

Step 5 matters because every test so far has run against `localhost` with a
flattened directory. The real site has different paths, the real Pages cache,
and a service worker.

**Rollback:** `./go-dark.sh` puts the holding page back. It is one command and
it works, which is the main reason going live early is survivable.
