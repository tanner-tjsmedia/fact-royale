#!/usr/bin/env node
/**
 * FACT ROYALE — QUESTION MIGRATION
 *
 * Pushes questions/*.json into Firestore as two collections:
 *
 *   quizzes/{date}    the playable quiz.  Publicly readable, but ONLY once
 *                     publishAt has passed (enforced by rules).  Through
 *                     phase 2 this includes the answer, because grading is
 *                     still client-side.
 *   quizKeys/{date}   answers as option indices.  Never client-readable.
 *                     Unused until phase 3 moves grading server-side; written
 *                     now so that is a small change rather than a migration.
 *
 * Answers are stored as the option INDEX, not the text, so a leak of one
 * collection cannot be joined against the other by string matching.
 *
 * ---------------------------------------------------------------------------
 * SETUP (once)
 *
 *   1. Firebase console -> Project settings -> Service accounts
 *      -> "Generate new private key". Saves a JSON file.
 *
 *   2. Put it OUTSIDE the repo. Anywhere in the repo risks committing it.
 *        e.g.  C:\Users\tanne\.fact-royale\service-account.json
 *
 *   3. Point at it and run:
 *        export GOOGLE_APPLICATION_CREDENTIALS="/c/Users/tanne/.fact-royale/service-account.json"
 *        npm install firebase-admin
 *        node tools/migrate-to-firestore.js --dry-run
 *
 * That key has full admin rights on the project. It is not an API key and it
 * is not safe to paste anywhere, including into a chat window.
 * ---------------------------------------------------------------------------
 *
 * USAGE
 *
 *   node tools/migrate-to-firestore.js --dry-run          report only, writes nothing
 *   node tools/migrate-to-firestore.js --from 2026-08-25  a date onward
 *   node tools/migrate-to-firestore.js --only 2026-09-15  a single day
 *   node tools/migrate-to-firestore.js                    everything
 *
 * Idempotent: re-running overwrites the same document ids with the same
 * content. Safe to run repeatedly.
 */

const fs   = require('fs');
const path = require('path');

const QDIR = path.join(__dirname, '..', 'questions-src');

// Publish at 05:00 UTC on the quiz date: one global reset for every player,
// which is midnight in New York in winter and 01:00 there in summer.
//
// This was -14. The quiz date used to come from the player's own clock, so
// publication had to run 14 hours early to cover UTC+14 and spare the first
// timezone on Earth a locked quiz. The cost was that everybody else could
// fetch tomorrow's questions up to eighteen hours before their own day began
// - fine for a solo puzzle, not fine next to a leaderboard.
//
// Changed 2026-10-09 with quiz.js moving to a shared reset. The two constants
// must agree: this one decides when a document becomes readable, and
// QUIZ_RESET_UTC_HOUR in _app/quiz.js decides which date the client asks for.
// If they drift the client requests a day the server has not published yet.
const PUBLISH_OFFSET_HOURS = 5;

function parseArgs(argv) {
  const a = { dryRun: false, from: null, only: null, publishAs: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--dry-run') a.dryRun = true;
    else if (argv[i] === '--from') a.from = argv[++i];
    else if (argv[i] === '--only') a.only = argv[++i];
    else if (argv[i] === '--publish-as') a.publishAs = argv[++i];
    else { console.error(`unknown argument: ${argv[i]}`); process.exit(2); }
  }

  // --publish-as writes one source day under a DIFFERENT date key. It exists
  // because the corpus stops at 2026-09-06 while the clock does not: with
  // every document in the past there is no "today" to load, and the main
  // quiz path cannot be exercised at all.
  //
  // Narrow on purpose. It demands --only, so it can never re-date a range by
  // accident, and it is a testing affordance rather than a content tool. If
  // the decision is ever taken to republish the back catalogue on new dates,
  // that belongs in a script of its own that also deals with the players who
  // already answered those questions. This one would happily hand someone a
  // quiz they have seen.
  if (a.publishAs) {
    if (!a.only) {
      console.error('--publish-as requires --only <source-date>.');
      process.exit(2);
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(a.publishAs)) {
      console.error('--publish-as needs a YYYY-MM-DD date.');
      process.exit(2);
    }
  }
  return a;
}

function publishAtFor(dateKey) {
  const d = new Date(`${dateKey}T00:00:00Z`);
  d.setUTCHours(d.getUTCHours() + PUBLISH_OFFSET_HOURS);
  return d;
}

/** Split one day's file into the public doc and the private key doc. */
function splitDay(dateKey, data) {
  const pub  = [];
  const keys = {};
  const expl = {};
  const refs = {};
  const problems = [];

  (data.questions || []).forEach((q, i) => {
    const id  = `q${i + 1}`;
    const idx = (q.options || []).indexOf(q.answer);

    if (idx === -1) {
      problems.push(`${dateKey}#${i}: answer is not among the options`);
      return;
    }
    if (!q.question || !Array.isArray(q.options) || q.options.length !== 4) {
      problems.push(`${dateKey}#${i}: malformed question or option count`);
      return;
    }

    pub.push({
      id,
      category:    q.category || '',
      question:    q.question,
      options:     q.options,
      memory_hook: q.memory_hook || ''
      // NO answer, NO explanation.
      //
      // Through phase 2 these rode in the public document, because grading
      // was client-side and a client that cannot read the answer cannot mark
      // the quiz. publishAt still hid tomorrow's answers, which was the leak
      // that mattered most, and that was a reasonable trade at the time.
      //
      // Dropped 2026-10-09. The decision was taken to ship server-side
      // grading before relaunch rather than after, so there is no phase-2
      // window to support: writing them here would mean publishing 82
      // documents in a shape we would immediately rewrite, and running a
      // knowingly readable answer key in the meantime for no gain, since
      // nobody is playing while the site is dark.
      //
      // The answers live in quizKeys/, which no client can read in any
      // circumstance. functions/ grades against it and returns only a score.
      // The client never holds an answer it has not already committed to.
      // NO verification metadata. An earlier version shipped riskTier and
      // sourceRefs in the public document, on the theory that showing
      // sources differentiates a trivia app built on accuracy.
      //
      // Reversed 2026-09-15. Accuracy is the baseline expectation of a
      // trivia platform, not a claim needing evidence attached. The whole
      // verification apparatus stays internal, so nothing about facts,
      // sources or review reaches a client in any format.
      //
      // Practical rule: if the client must render it, assume it leaks.
      // See docs/FACT-LAYER.md section 8.
    });

    keys[id] = idx;
    if (q.explanation) expl[id] = q.explanation;
    if (q.sourceRefs)  refs[id] = q.sourceRefs;
  });

  return {
    problems,
    quiz: {
      date: dateKey,
      publishAt: publishAtFor(dateKey),
      version: 3,
      questionCount: pub.length,
      questions: pub
    },
    key: {
      date: dateKey,
      answers: keys,
      explanations: expl,
      sourceRefs: refs
    }
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  // Dated files only. questions-src/ also holds index.json, which is a
  // manifest, not a quiz day: it has no date, so publishAtFor() returns an
  // Invalid Date and the run dies printing the summary. preflight.py hit the
  // same thing after the go-dark rename. Every tool that walks this directory
  // needs the same guard, so it is spelled the same way in each.
  let files = fs.readdirSync(QDIR)
                .filter(f => /^\d{4}-\d{2}-\d{2}\.json$/.test(f))
                .sort();
  if (args.only) files = files.filter(f => f.slice(0, -5) === args.only);
  if (args.from) files = files.filter(f => f.slice(0, -5) >= args.from);

  if (files.length === 0) {
    console.error('No files matched.');
    process.exit(1);
  }

  const payloads = [];
  const allProblems = [];

  for (const f of files) {
    const sourceKey = f.slice(0, -5);
    // The key the documents are written under. Normally the source date.
    const dateKey   = args.publishAs || sourceKey;
    if (args.publishAs) {
      console.log(`publishing ${sourceKey} AS ${dateKey}`);
    }
    const data = JSON.parse(fs.readFileSync(path.join(QDIR, f), 'utf8'));
    const split = splitDay(dateKey, data);
    allProblems.push(...split.problems);
    payloads.push(split);
  }

  console.log(`${payloads.length} days  ${payloads.reduce((n, p) => n + p.quiz.questionCount, 0)} questions`);
  console.log(`publish offset  ${PUBLISH_OFFSET_HOURS}h from UTC midnight`);
  console.log(`first  ${payloads[0].quiz.date}  publishAt ${payloads[0].quiz.publishAt.toISOString()}`);
  console.log(`last   ${payloads[payloads.length - 1].quiz.date}  publishAt ${payloads[payloads.length - 1].quiz.publishAt.toISOString()}`);

  if (allProblems.length) {
    console.error(`\n${allProblems.length} PROBLEMS - nothing will be written:`);
    allProblems.slice(0, 20).forEach(p => console.error('  ' + p));
    console.error('\nFix these in the JSON first. Run tools/preflight.py to find them.');
    process.exit(1);
  }

  if (args.dryRun) {
    const s = payloads[0];
    console.log('\n--- sample public doc (quizzes/' + s.quiz.date + ') ---');
    console.log(JSON.stringify({ ...s.quiz, questions: [s.quiz.questions[0], '…'] }, null, 2));
    console.log('\n--- sample key doc (quizKeys/' + s.key.date + ') ---');
    console.log(JSON.stringify({ date: s.key.date, answers: s.key.answers, explanations: '…' }, null, 2));
    console.log('\nDRY RUN - nothing written. Drop --dry-run to write.');
    return;
  }

  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.error('\nGOOGLE_APPLICATION_CREDENTIALS is not set. See the header of this file.');
    process.exit(1);
  }

  const admin = require('firebase-admin');
  admin.initializeApp({ credential: admin.credential.applicationDefault() });
  const db = admin.firestore();

  let written = 0;
  // Firestore caps a batch at 500 writes. Two documents per day, so 200 days
  // per batch is comfortably inside it.
  const PER_BATCH = 200;

  for (let i = 0; i < payloads.length; i += PER_BATCH) {
    const batch = db.batch();
    for (const p of payloads.slice(i, i + PER_BATCH)) {
      batch.set(db.collection('quizzes').doc(p.quiz.date), p.quiz);
      batch.set(db.collection('quizKeys').doc(p.key.date), p.key);
      written++;
    }
    await batch.commit();
    console.log(`  committed through ${payloads[Math.min(i + PER_BATCH, payloads.length) - 1].quiz.date}`);
  }

  console.log(`\nWrote ${written} days to quizzes/ and quizKeys/.`);
  console.log('Nothing on the site reads these yet. That is phase 2.');
}

main().catch(e => { console.error(e); process.exit(1); });
