#!/usr/bin/env node
/**
 * FACT ROYALE — SYNC THE QUESTION BANK
 *
 * Moves questions between the repo and Firestore's questionBank collection,
 * in both directions, keyed on the permanent frq- id.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS EXISTS
 *
 * Three stores, three jobs. Keeping them straight is the whole design:
 *
 *   questions-src/*.json   THE MANUSCRIPT.
 *                          Git history, diffs, revert, and preflight.py as a
 *                          blocking gate. This is what makes a bad edit
 *                          recoverable.
 *
 *   questionBank/{frq-id}  THE WORKBENCH.
 *                          Author and review from any device or browser.
 *                          Admin-only. Has no history of its own -- which is
 *                          exactly why --pull exists.
 *
 *   quizzes/{date}         THE PRINTING PRESS.
 *                          What players fetch, gated on publishAt. Populated
 *                          by tools/migrate-to-firestore.js, never by this
 *                          script and never directly from the bank.
 *
 * The bank is deliberately NOT the thing players read. Publishing stays an
 * explicit step through the gate, so working in the bank can never put an
 * unreviewed question in front of a player by accident.
 * ---------------------------------------------------------------------------
 *
 * SETUP
 *   Needs the service-account key, same as migrate-to-firestore.js:
 *     export GOOGLE_APPLICATION_CREDENTIALS="/c/Users/tanne/.fact-royale/service-account.json"
 *
 * USAGE
 *   node tools/sync-questions.js --push            repo  -> bank  (and sources)
 *   node tools/sync-questions.js --pull            bank  -> repo
 *   node tools/sync-questions.js --pull --dry-run  show what would change
 *   node tools/sync-questions.js --status          compare without writing
 *
 * AFTER A PULL, ALWAYS:
 *   git diff                 <- read it. This is your review step.
 *   python tools/preflight.py
 *   git add -A && git commit
 *
 * The pull is a straight overwrite of the repo from the bank. That is
 * intentional: drift then shows up as a git diff you have to look at, rather
 * than as a silent merge nobody reviewed.
 */

const fs = require('fs');
const path = require('path');

const QDIR = path.join(__dirname, '..', 'questions-src');
const REG  = path.join(__dirname, '..', 'sources.json');

const ORDER = ['id', 'category', 'question', 'options', 'answer',
               'explanation', 'memory_hook', 'riskTier', 'sourceRefs', 'review'];

function orderKeys(q) {
  const out = {};
  ORDER.forEach(k => { if (k in q) out[k] = q[k]; });
  Object.keys(q).forEach(k => { if (!(k in out)) out[k] = q[k]; });
  return out;
}

/** Read the repo into a flat map of id -> { q, dateKey }. */
function readRepo() {
  const byId = new Map();
  const files = fs.readdirSync(QDIR)
    .filter(f => f.endsWith('.json') && /^\d{4}-/.test(f)).sort();
  for (const f of files) {
    const dateKey = f.slice(0, -5);
    const data = JSON.parse(fs.readFileSync(path.join(QDIR, f), 'utf8'));
    (data.questions || []).forEach(q => {
      if (!q.id) throw new Error(
        `${f}: a question has no id. Run tools/mint-ids.py first.`);
      if (byId.has(q.id)) throw new Error(
        `Duplicate id ${q.id} in ${f} and ${byId.get(q.id).dateKey}.`);
      byId.set(q.id, { q, dateKey });
    });
  }
  return byId;
}

async function readBank(db) {
  const byId = new Map();
  const snap = await db.collection('questionBank').get();
  snap.forEach(d => {
    const q = d.data();
    byId.set(d.id, { q, dateKey: q._date || 'unscheduled' });
  });
  return byId;
}

/** Field-level comparison that ignores bookkeeping the bank adds. */
function differs(a, b) {
  const strip = q => {
    const c = { ...q }; delete c._date; delete c._updatedAt; return c;
  };
  return JSON.stringify(orderKeys(strip(a))) !== JSON.stringify(orderKeys(strip(b)));
}

function report(repo, bank) {
  const onlyRepo = [...repo.keys()].filter(k => !bank.has(k));
  const onlyBank = [...bank.keys()].filter(k => !repo.has(k));
  const changed  = [...repo.keys()].filter(k => bank.has(k) &&
                     differs(repo.get(k).q, bank.get(k).q));
  const moved    = [...repo.keys()].filter(k => bank.has(k) &&
                     repo.get(k).dateKey !== bank.get(k).dateKey);
  console.log(`  repo ${repo.size} questions   bank ${bank.size} questions`);
  console.log(`  only in repo  ${onlyRepo.length}`);
  console.log(`  only in bank  ${onlyBank.length}`);
  console.log(`  differing     ${changed.length}`);
  console.log(`  rescheduled   ${moved.length}`);
  const show = (label, ids) => {
    if (!ids.length) return;
    console.log(`\n  ${label}:`);
    ids.slice(0, 12).forEach(i => console.log(`    ${i}`));
    if (ids.length > 12) console.log(`    ...and ${ids.length - 12} more`);
  };
  show('only in repo', onlyRepo);
  show('only in bank', onlyBank);
  show('differing', changed);
  return { onlyRepo, onlyBank, changed, moved };
}

async function main() {
  const argv = process.argv.slice(2);
  const dry = argv.includes('--dry-run');
  const mode = argv.includes('--push') ? 'push'
             : argv.includes('--pull') ? 'pull'
             : argv.includes('--status') ? 'status' : null;
  if (!mode) {
    console.error('Pick one: --push, --pull or --status. See the header of this file.');
    process.exit(2);
  }
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.error('GOOGLE_APPLICATION_CREDENTIALS is not set.');
    console.error('See docs/MIGRATION-RUNBOOK.md step 1.');
    process.exit(1);
  }

  const admin = require('firebase-admin');
  if (!admin.apps.length)
    admin.initializeApp({ credential: admin.credential.applicationDefault() });
  const db = admin.firestore();

  const repo = readRepo();
  const bank = await readBank(db);
  console.log(`\n${mode.toUpperCase()}\n`);
  const d = report(repo, bank);

  if (mode === 'status') { console.log('\nRead only. Nothing written.'); return; }

  if (mode === 'push') {
    if (dry) { console.log('\nDRY RUN - nothing written.'); return; }
    let batch = db.batch(), n = 0, inBatch = 0;
    for (const [id, { q, dateKey }] of repo) {
      const doc = orderKeys(q);
      doc._date = dateKey;
      doc._updatedAt = admin.firestore.FieldValue.serverTimestamp();
      batch.set(db.collection('questionBank').doc(id), doc);
      n++; inBatch++;
      if (inBatch >= 450) { await batch.commit(); batch = db.batch(); inBatch = 0; }
    }
    if (inBatch) await batch.commit();

    // Questions deleted from the repo must also leave the bank, or they
    // reappear on the next pull like nothing happened.
    if (d.onlyBank.length) {
      let del = db.batch();
      d.onlyBank.forEach(id => del.delete(db.collection('questionBank').doc(id)));
      await del.commit();
      console.log(`\n  removed ${d.onlyBank.length} from the bank (gone from the repo)`);
    }

    // The registry travels too, so the studio can show what a citation
    // establishes when it is running against the bank rather than files.
    const reg = JSON.parse(fs.readFileSync(REG, 'utf8'));
    await db.collection('meta').doc('sources').set(reg);
    console.log(`\n  pushed ${n} questions and ${Object.keys(reg.sources || {}).length} registry entries`);
    return;
  }

  // ---- pull ----------------------------------------------------------
  const byDate = new Map();
  for (const [, { q, dateKey }] of bank) {
    if (dateKey === 'unscheduled') continue;   // not yet assigned to a day
    if (!byDate.has(dateKey)) byDate.set(dateKey, []);
    const clean = orderKeys(q);
    delete clean._date; delete clean._updatedAt;
    byDate.get(dateKey).push(clean);
  }
  for (const [, qs] of byDate) qs.sort((a, b) => a.id.localeCompare(b.id));

  const unscheduled = [...bank.values()].filter(v => v.dateKey === 'unscheduled').length;
  if (unscheduled)
    console.log(`\n  ${unscheduled} bank questions have no date and will NOT be written to the repo.`);

  if (dry) {
    console.log(`\n  would write ${byDate.size} files covering ${
      [...byDate.values()].reduce((n, a) => n + a.length, 0)} questions`);
    console.log('\nDRY RUN - nothing written.');
    return;
  }

  let wrote = 0;
  for (const [dateKey, questions] of byDate) {
    const p = path.join(QDIR, dateKey + '.json');

    // Preserve the file's existing envelope instead of inventing one.
    // 30 of the current files carry no top-level "date" key at all, and
    // synthesising one would have produced 30 spurious diffs on the first
    // sync -- burying any real change in noise. Same reasoning protects any
    // top-level field added later that this script does not know about.
    let envelope = {};
    if (fs.existsSync(p)) {
      const cur = JSON.parse(fs.readFileSync(p, 'utf8'));
      for (const k of Object.keys(cur)) if (k !== 'questions') envelope[k] = cur[k];
    } else {
      envelope = { date: dateKey };   // genuinely new day: give it a date
    }

    const out = {};
    for (const k of Object.keys(envelope)) out[k] = envelope[k];
    out.questions = questions;

    const next = JSON.stringify(out, null, 2) + '\n';
    if (fs.existsSync(p) && fs.readFileSync(p, 'utf8') === next) continue;
    fs.writeFileSync(p, next); wrote++;
  }
  console.log(`\n  wrote ${wrote} file${wrote === 1 ? '' : 's'}`);
  console.log('\nNow review before committing:');
  console.log('    git diff');
  console.log('    python tools/preflight.py');
}

main().catch(e => { console.error(e); process.exit(1); });
