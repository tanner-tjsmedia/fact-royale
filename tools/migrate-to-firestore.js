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

const QDIR = path.join(__dirname, '..', 'questions');

// Publish at local midnight of the quiz date. The daily quiz is keyed to the
// player's local clock (see quiz.js getTodayKey), so a player east of UTC
// reaches their date first. Publishing at UTC midnight would leave them
// staring at a locked quiz for up to twelve hours.
//
// PUBLISH_OFFSET_HOURS shifts publication earlier to cover that. -14 covers
// every inhabited timezone (UTC+14, Kiritimati). Set to 0 for strict UTC
// midnight if the daily quiz ever moves to a fixed global reset.
const PUBLISH_OFFSET_HOURS = -14;

function parseArgs(argv) {
  const a = { dryRun: false, from: null, only: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--dry-run') a.dryRun = true;
    else if (argv[i] === '--from') a.from = argv[++i];
    else if (argv[i] === '--only') a.only = argv[++i];
    else { console.error(`unknown argument: ${argv[i]}`); process.exit(2); }
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
      memory_hook: q.memory_hook || '',
      // answer and explanation ride in the PUBLIC document through phase 2,
      // because grading is still client-side and a client that cannot read the
      // answer cannot mark the quiz. They are still behind publishAt, so
      // tomorrow's answers are unreachable today - which is the leak that
      // actually matters. Phase 3 moves grading to a Cloud Function and these
      // two fields come out. quizKeys/ below is populated now so that is a
      // one-line change rather than a second migration.
      answer:      q.answer,
      explanation: q.explanation || '',
      // Verification metadata rides with the public document deliberately.
      // Showing sources on the results screen is a feature for a trivia app
      // that has made accuracy its whole argument. See design doc, item 8.4.
      riskTier:    q.riskTier || 'unclassified',
      sourceRefs:  q.sourceRefs || []
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

  let files = fs.readdirSync(QDIR).filter(f => f.endsWith('.json')).sort();
  if (args.only) files = files.filter(f => f.slice(0, -5) === args.only);
  if (args.from) files = files.filter(f => f.slice(0, -5) >= args.from);

  if (files.length === 0) {
    console.error('No files matched.');
    process.exit(1);
  }

  const payloads = [];
  const allProblems = [];

  for (const f of files) {
    const dateKey = f.slice(0, -5);
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
