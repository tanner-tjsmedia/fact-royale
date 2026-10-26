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
 *
 * STAGING A RE-DATE FOR LAUNCH DAY
 *
 *   node tools/migrate-to-firestore.js --stage --from 2026-06-13 --limit 82
 *   node tools/migrate-to-firestore.js --run-staged
 *
 * The back catalogue has to be re-dated so the published run starts on the
 * day the site comes back up — but that day is not known in advance, so the
 * work cannot simply be done early and left. --stage records the INTENT in
 * PENDING-REPUBLISH.json (and rehearses it in full, including credentials,
 * so launch day holds no surprises). --run-staged reads that file, resolves
 * the start date to today, writes, and stamps the file as executed.
 *
 * go-live.sh calls --run-staged itself, before it touches any file, so the
 * re-date cannot be forgotten and a failure cannot leave a half-launched
 * site. See the pre-flight section in that script.
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

/* Firebase's own error for an expired ADC blames a "certificate key file"
 * that may not exist — this project authenticates with gcloud ADC, not a
 * key — and sends you to the service-accounts console, which is the wrong
 * place entirely. Translate it.
 *
 * The distinction that causes this: `gcloud auth login` refreshes the
 * gcloud CLI's own credential; `gcloud auth application-default login`
 * refreshes the one Node and firebase-admin read. They expire separately,
 * and a Workspace reauth policy expires both on a schedule. */
function explainCredentialError(e) {
  var m = String((e && e.message) || e);
  if (/invalid_rapt|reauth related error/.test(m)) {
    return 'Your application-default credential needs reauthentication.\n\n' +
           '  gcloud auth application-default login\n\n' +
           'Note this is NOT the same as `gcloud auth login`, which refreshes\n' +
           'the gcloud CLI only. Nothing is wrong with any key file.';
  }
  if (/invalid_grant/.test(m)) {
    return 'The application-default credential was rejected (invalid_grant).\n\n' +
           '  gcloud auth application-default login';
  }
  if (/PERMISSION_DENIED|insufficient permissions/i.test(m)) {
    return 'Authenticated, but this account lacks permission on the project.\n' +
           'Check: gcloud projects get-iam-policy fact-royale';
  }
  return m;
}

/* ── The staged re-date ───────────────────────────────────────────────
 *
 * PENDING-REPUBLISH.json sits at the repo root, tracked, deliberately
 * SHOUTY in a directory listing and in `git status`. It is not in .local/
 * and not a dotfile: the whole point is that it is impossible to miss.
 *
 * It holds an intent, not data — which day the catalogue starts from and
 * how many days to publish — because the one value that matters, the date
 * the run starts on, is not knowable until the site actually comes back up.
 *
 * It is also the idempotency guard. Once executed, the file records when
 * and onto which start date, and --run-staged refuses to run again. That
 * refusal is the important part: a second run would re-date the whole
 * catalogue onto a NEW today, silently moving every quiz. go-live.sh can
 * be run twice (a failed push, a half-finished restore) and must not
 * reshuffle the content on the second pass.
 */
const PLAN = path.join(__dirname, '..', 'PENDING-REPUBLISH.json');

/* The QUIZ day, not the calendar day.
 *
 * A quiz day rolls over at PUBLISH_OFFSET_HOURS past UTC midnight, not at
 * UTC midnight, and the client's getTodayKey() uses that same boundary to
 * decide which document to ask for. The re-date has to agree with it.
 *
 * Using the plain UTC date meant a launch run between 00:00 and 05:00 UTC
 * published the catalogue starting on a date the site would not ask for
 * until 05:00 — so the site came back up and the homepage requested
 * YESTERDAY, which the re-date had just moved out from under it. No quiz
 * at all, for up to five hours, on launch morning. Tanner works at 3am;
 * this was not a theoretical window.
 *
 * Subtracting the offset before taking the date gives the key the client
 * will actually request at this instant. One rule, two places, same
 * answer. */
function today() {
  const d = new Date();
  d.setUTCHours(d.getUTCHours() - PUBLISH_OFFSET_HOURS);
  return d.toISOString().slice(0, 10);
}

function readPlan() {
  if (!fs.existsSync(PLAN)) return null;
  try { return JSON.parse(fs.readFileSync(PLAN, 'utf8')); }
  catch (e) {
    console.error(`\n${path.basename(PLAN)} is not readable as JSON: ${e.message}`);
    console.error('Fix or delete it. Nothing will run while it is malformed.');
    process.exit(1);
  }
}

function parseArgs(argv) {
  const a = { dryRun: false, from: null, only: null, publishAs: null, limit: null,
              stage: false, runStaged: false, force: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--dry-run') a.dryRun = true;
    else if (argv[i] === '--from') a.from = argv[++i];
    else if (argv[i] === '--only') a.only = argv[++i];
    else if (argv[i] === '--publish-as') a.publishAs = argv[++i];
    else if (argv[i] === '--limit') a.limit = parseInt(argv[++i], 10);
    else if (argv[i] === '--stage') a.stage = true;
    else if (argv[i] === '--run-staged') a.runStaged = true;
    else if (argv[i] === '--force') a.force = true;
    else { console.error(`unknown argument: ${argv[i]}`); process.exit(2); }
  }

  if (a.stage && a.runStaged) {
    console.error('--stage and --run-staged are opposites. Pick one.');
    process.exit(2);
  }

  // --stage is a full rehearsal that happens to leave a note behind. Making
  // it literally a dry run means it exercises the same code path as the real
  // thing rather than a parallel one that can drift out of agreement with it.
  if (a.stage) {
    if (!a.from || !a.limit) {
      console.error('--stage needs --from <date> and --limit <n>, so the span is stated rather than implied.');
      process.exit(2);
    }
    if (a.publishAs) {
      console.error('--stage cannot take --publish-as: the start date is resolved on launch day,\n' +
                    'which is the entire reason this mode exists.');
      process.exit(2);
    }
    a.dryRun   = true;
    a.publishAs = today();   // preview only; recomputed by --run-staged
  }

  if (a.runStaged) {
    if (a.from || a.only || a.limit || a.publishAs) {
      console.error('--run-staged takes its span from PENDING-REPUBLISH.json. Do not also pass --from/--limit.');
      process.exit(2);
    }
    const plan = readPlan();
    if (!plan) {
      console.error(`\nNo ${path.basename(PLAN)} to run. Stage one first:\n` +
                    '  node tools/migrate-to-firestore.js --stage --from <date> --limit <n>');
      process.exit(1);
    }
    if (plan.executed && !a.force) {
      console.error(`\nAlready executed on ${plan.executed.at}, publishing from ${plan.executed.publishedFrom}.`);
      console.error('Refusing to run again: a second run would re-date the whole catalogue onto');
      console.error("today's date and move every quiz out from under anyone mid-streak.");
      console.error('\nIf that is genuinely what you want:  --run-staged --force');
      process.exit(1);
    }
    a.from      = plan.from;
    a.limit     = plan.limit;
    a.publishAs = today();
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
    if (!a.only && !a.from) {
      console.error('--publish-as requires --only <date> or --from <date>.');
      process.exit(2);
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(a.publishAs)) {
      console.error('--publish-as needs a YYYY-MM-DD date.');
      process.exit(2);
    }
    if (a.from && !a.limit) {
      console.error('--publish-as with --from also needs --limit <n>, so the span is stated rather than implied.');
      process.exit(2);
    }
  }
  if (a.limit !== null && !(a.limit > 0)) {
    console.error('--limit needs a positive number.');
    process.exit(2);
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
  if (args.limit) files = files.slice(0, args.limit);

  if (files.length === 0) {
    console.error('No files matched.');
    process.exit(1);
  }

  const payloads = [];
  const allProblems = [];

  // When --publish-as maps a RUN of days, each source day lands on the next
  // consecutive date from the start. Source dates have gaps (days were deleted
  // during the content cleanup) and the published run must not: a missing day
  // in the middle is a day the quiz does not load.
  function addDays(dateKey, n) {
    const d = new Date(`${dateKey}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  }

  let offset = 0;
  for (const f of files) {
    const sourceKey = f.slice(0, -5);
    // The key the documents are written under. Normally the source date.
    const dateKey   = args.publishAs ? addDays(args.publishAs, offset++) : sourceKey;
    // One line per day is useful when re-dating a handful by hand. For the
    // staged run it is 82 lines that bury the summary and, on failure, the
    // error — so the staged path reports the first and last dates only,
    // which is the whole of what you need to check.
    if (args.publishAs && !args.stage && !args.runStaged) {
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
  }

  // The credential check runs on a DRY RUN TOO.
  //
  // It used to sit after the dry-run return, which meant the rehearsal
  // skipped the one step that had actually been failing: you could get a
  // clean --dry-run and then watch the real run die on authentication. A
  // rehearsal that omits the risky part is not a rehearsal.
  //
  // It is only filesystem reads, so it costs nothing to run either way.
  //
  // This used to test only that the variable was non-empty, so a path with a
  // typo in it passed, and the run then died inside firebase-admin with a
  // TypeError about a property of undefined. The real problem - "that file is
  // not there" - appeared nowhere in the output. A guard that confirms the
  // variable is set but not that it points at anything is not a guard.
  // Two ways to authenticate, and the second one is better.
  //
  //   A. A downloaded service-account key, pointed at by
  //      GOOGLE_APPLICATION_CREDENTIALS. Works everywhere, needs no extra
  //      tooling, and leaves a file on disk that never expires and carries
  //      full administrative rights over the whole project.
  //
  //   B. gcloud application-default credentials:
  //        gcloud auth application-default login
  //      Google's own recommendation for local development. Writes
  //      short-lived, refreshable credentials to a well-known path, tied to
  //      a human account rather than a permanent robot one, and revocable
  //      from the Google account page. Nothing to leak and nothing to
  //      rotate. Costs one install of the Google Cloud SDK.
  //
  // applicationDefault() finds either. This preflight used to demand the
  // environment variable, which would have rejected B outright and quietly
  // pushed the worse option.
  const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (!keyPath) {
    // No explicit key. Look for gcloud ADC at its well-known location.
    const adc = process.platform === 'win32'
      ? path.join(process.env.APPDATA || '', 'gcloud', 'application_default_credentials.json')
      : path.join(process.env.HOME || '', '.config', 'gcloud', 'application_default_credentials.json');

    if (fs.existsSync(adc)) {
      console.log(`\ncredential  gcloud application-default\n            ${adc}`);
    } else {
      console.error('\nNo credential found. Either:');
      console.error('\n  gcloud auth application-default login      (recommended, no key file)');
      console.error('\nor point at a downloaded service-account key:');
      console.error('  export GOOGLE_APPLICATION_CREDENTIALS="/c/Users/tanne/.fact-royale/key.json"');
      console.error('\nSee the header of this file.');
      process.exit(1);
    }
  } else if (!fs.existsSync(keyPath)) {
    console.error(`\nGOOGLE_APPLICATION_CREDENTIALS points at a file that does not exist:\n  ${keyPath}`);
    console.error('\nFind the key (Git Bash):');
    console.error('  ls ~/keys ~/.fact-royale 2>/dev/null');
    console.error('  find /c/Users/tanne -maxdepth 4 -name "*firebase*adminsdk*.json" 2>/dev/null');
    console.error('\nIf there is no key, generate one: Firebase console -> Project settings');
    console.error('-> Service accounts -> Generate new private key. Save it OUTSIDE this repo.');
    process.exit(1);
  }
  // Only a service-account key can be inspected this way. gcloud ADC is a
  // different shape, already reported above, and reading it here would have
  // thrown on an undefined path.
  if (keyPath) try {
    const parsed = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
    if (parsed.type !== 'service_account' || !parsed.project_id) {
      console.error(`\n${keyPath} is JSON but not a service account key.`);
      process.exit(1);
    }
    console.log(`\ncredential  ${parsed.client_email}  (project ${parsed.project_id})`);
  } catch (e) {
    console.error(`\n${keyPath} could not be read as JSON: ${e.message}`);
    process.exit(1);
  }

  if (args.stage) {
    const existing = readPlan();
    if (existing && existing.executed && !args.force) {
      console.error(`\n${path.basename(PLAN)} already records an executed run on ${existing.executed.at}.`);
      console.error('Re-staging would arm a second re-date of the same catalogue.');
      console.error('If the content really needs republishing, say so explicitly:  --stage ... --force');
      process.exit(1);
    }
    fs.writeFileSync(PLAN, JSON.stringify({
      _what: 'A re-date of the question catalogue, armed and waiting for launch day.',
      _who:  'Written by tools/migrate-to-firestore.js --stage. Executed by go-live.sh,',
      _how:  'or by hand: node tools/migrate-to-firestore.js --run-staged',
      _note: 'The start date is deliberately absent. It is resolved to the day the ' +
             'run actually happens, because that is the day the site comes back up.',
      from:    args.from,
      limit:   args.limit,
      days:    payloads.length,
      questions: payloads.reduce((n, p) => n + p.quiz.questionCount, 0),
      stagedAt: new Date().toISOString(),
      executed: null
    }, null, 2) + '\n');

    console.log(`\nSTAGED - rehearsed in full, nothing written to Firestore.`);
    console.log(`  plan        ${path.basename(PLAN)}`);
    console.log(`  catalogue   ${payloads.length} days from ${args.from}`);
    console.log(`  start date  resolved on launch day (previewed above as ${args.publishAs})`);
    console.log(`\nIt now runs by itself:  ./go-live.sh`);
    console.log(`Or on its own:          node tools/migrate-to-firestore.js --run-staged`);
    console.log(`\nCommit the plan file so it is visible in the repo:`);
    console.log(`  git add ${path.basename(PLAN)} && git commit -m "Arm the launch-day re-date"`);
    return;
  }

  if (args.dryRun) {
    console.log('\nDRY RUN - credential checked, nothing written. Drop --dry-run to write.');
    return;
  }

  // Modular entry points, not the legacy default export.
  //
  // firebase-admin 14 (installed at the repo root) no longer exposes
  // admin.credential on the package's main export, so
  // `require('firebase-admin').credential.applicationDefault()` threw
  // "Cannot read properties of undefined". functions/index.js already uses
  // the modular form; this file was written against v12 and never updated.
  const { initializeApp, applicationDefault } = require('firebase-admin/app');
  const { getFirestore } = require('firebase-admin/firestore');

  // Say which project explicitly.
  //
  // A service-account key names its own project, so this never came up. gcloud
  // ADC does not: the credential is a user, and the project has to come from
  // somewhere else. When it could not be found the SDK failed deep inside a
  // batch commit with "Unable to detect a Project Id in the current
  // environment" and a stack trace through google-gax - an error about the
  // environment, raised at write time, that says nothing about what to do.
  //
  // .firebaserc is the repo's own statement of which project this is, and the
  // Firebase CLI already reads it for deploys. Using it here means one owner
  // for that answer rather than a second copy in an environment variable.
  const RC = path.join(__dirname, '..', '.firebaserc');
  let projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || null;
  if (!projectId && fs.existsSync(RC)) {
    try {
      projectId = (JSON.parse(fs.readFileSync(RC, 'utf8')).projects || {}).default || null;
    } catch (e) { /* fall through to the error below */ }
  }
  if (!projectId) {
    console.error('\nCould not determine the project id.');
    console.error('Expected a "projects.default" in .firebaserc, or GOOGLE_CLOUD_PROJECT set.');
    process.exit(1);
  }
  console.log(`project     ${projectId}`);
  initializeApp({ credential: applicationDefault(), projectId: projectId });
  const db = getFirestore();

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

  // The stamp goes on AFTER the commits, never before. If the batch throws
  // half way the plan stays unexecuted and the next run picks it up again —
  // the writes are idempotent, so re-running costs nothing but re-running
  // something recorded as done would silently shift every date.
  if (args.runStaged) {
    const plan = readPlan() || {};
    plan.executed = {
      at: new Date().toISOString(),
      publishedFrom: args.publishAs,
      through: payloads[payloads.length - 1].quiz.date,
      days: payloads.length
    };
    fs.writeFileSync(PLAN, JSON.stringify(plan, null, 2) + '\n');
    console.log(`\nThe staged re-date is done and stamped as executed.`);
    console.log(`  published   ${args.publishAs} through ${plan.executed.through}`);
    console.log(`  plan file   ${path.basename(PLAN)}  (commit it)`);
    console.log(`\nIt will not run a second time. --run-staged --force overrides that.`);
  } else {
    console.log('Nothing on the site reads these yet. That is phase 2.');
  }
}

main().catch(e => { console.error('\n' + explainCredentialError(e)); process.exit(1); });
