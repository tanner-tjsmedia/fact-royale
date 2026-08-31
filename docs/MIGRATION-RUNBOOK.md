# Migration Runbook — Static Files to Firestore

Work through in order. Every step has a check. If a check fails, stop rather
than continuing — each step is safe on its own, but the order matters.

Nothing below changes what players see until **step 7**.

---

## Step 1 — Service account key (yours to do)

Firebase console → **Project settings → Service accounts → Generate new private key.**
Saves a JSON file.

Put it **outside the repo**:

```
C:\Users\tanne\.fact-royale\service-account.json
```

> This key has full admin rights over the whole project — read and write on
> every collection, bypassing all security rules. It is not an API key. Do not
> commit it, do not paste it into a chat window, and do not put it anywhere
> under `Desktop\fact-royale`.

If it is ever exposed: Firebase console → Service accounts → delete that key
and generate a new one. Same drill as the CI token.

**Check:** the file exists and is not inside the repo folder.

---

## Step 2 — Install the admin SDK

```bash
cd ~/Desktop/fact-royale
npm install firebase-admin
```

**Check:** `node -e "require('firebase-admin'); console.log('ok')"` prints `ok`.

If `npm` is not found, install Node from nodejs.org. Add `node_modules/` to
`.gitignore` before committing anything.

---

## Step 3 — Dry run

```bash
node tools/migrate-to-firestore.js --dry-run
```

**Check:** reports the day count, zero problems, and prints a sample document.
If it lists problems it writes nothing — fix the JSON and re-run.

---

## Step 4 — Migrate

```bash
export GOOGLE_APPLICATION_CREDENTIALS="/c/Users/tanne/.fact-royale/service-account.json"
node tools/migrate-to-firestore.js
```

**Check:** Firebase console → Firestore → two new collections, `quizzes` and
`quizKeys`, with one document per quiz day. Open any `quizzes` document and
confirm `publishAt` is a Timestamp, not a string.

Re-running is safe. It overwrites the same document ids.

---

## Step 5 — Deploy the rules

```bash
firebase deploy --only firestore:rules
```

(If it asks you to log in: `firebase login`. The CI token from earlier also works.)

**Check:** Firebase console → Firestore → Rules shows `match /quizzes/{dateKey}`
with the `publishAt <= request.time` condition.

---

## Step 6 — Verify the gate actually gates

**This is the step that proves the whole exercise worked, and it has a trap.**

The rules include an admin override so the live host console can read the whole
corpus. **Signed in as yourself, you can read everything, published or not.**
Testing from your own account proves nothing.

Test **signed out**, in a private window, on the site:

```js
// Should SUCCEED — a day already published
firebase.firestore().collection('quizzes').doc('2026-08-25').get()
  .then(d => console.log('published day readable:', d.exists))
  .catch(e => console.log('unexpected denial:', e.code));

// Should FAIL with permission-denied — a day not yet published
firebase.firestore().collection('quizzes').doc('2026-09-08').get()
  .then(d => console.log('PROBLEM - unpublished day was readable:', d.exists))
  .catch(e => console.log('correctly denied:', e.code));

// Should FAIL always — the answer keys
firebase.firestore().collection('quizKeys').doc('2026-08-25').get()
  .then(() => console.log('PROBLEM - quizKeys readable'))
  .catch(e => console.log('quizKeys correctly denied:', e.code));
```

**Check:** first succeeds, second and third both report `permission-denied`.
If the second one succeeds, the gate is not working — stop and send me the output.

---

## Step 7 — Cut the client over

In `quiz.js`:

```js
const FR_USE_FIRESTORE = true;   // was false
```

Commit, push, wait for Pages to rebuild, hard-refresh.

**Check:** open the console on the site and play. You should see

```
[FR] quiz 2026-08-31 from Firestore
```

If it says `from static file`, the Firestore read failed and the fallback
caught it — the quiz still works, but check the warning line above it.

**This is the first step players could notice.** It is also fully reversible:
flip the flag back, push, and you are on static files again.

---

## Step 8 — Stop deploying the static files

Only once step 7 has been running cleanly for a day or two.

Rename the folder so it cannot be served by accident:

```bash
git mv questions questions-src
```

Then update the paths in `tools/preflight.py`, `tools/build-index.py`,
`tools/migrate-to-firestore.js` and `live.html`, and delete the static fallback
in `loadQuizData()`.

**Check:** `https://fact-royale.com/questions/2026-09-08.json` returns 404.

**At this point problem A is closed.** Future content is no longer fetchable by
anyone, and the only way to read a quiz is to wait for it to publish.

---

## What is still open after step 8

**Today's answers are still readable** by anyone who opens devtools while
playing, because grading happens on the client and the client must have the
answer. Closing that needs a Cloud Function to grade server-side — phase 3 in
the design doc.

Cloud Functions require the **Blaze plan**, which needs a billing account
attached. Usage at this scale stays inside the free allowance, but attaching
billing is a decision, not a detail. `quizKeys/` is already populated so phase 3
is a small change rather than another migration.

Worth doing when the leaderboard matters enough that someone would cheat on it.
Not before.

---

## Rollback

| Step reached | To undo |
|---|---|
| 4 (migrated) | Nothing to undo. Nothing reads it. |
| 5 (rules) | Nothing to undo. Nothing reads it. |
| 7 (cutover) | `FR_USE_FIRESTORE = false`, push. |
| 8 (files removed) | `git mv questions-src questions`, restore the fallback, push. |
