#!/usr/bin/env node
/**
 * FACT ROYALE — DELETE A LEADERBOARD ROW
 *
 * scores/{uid}_{date} is write-once by design: submitQuiz refuses to
 * overwrite an existing row, because being able to rewrite your own score
 * is the hole server-side grading was built to close. That is correct for
 * players and inconvenient for testing, which is what this is for.
 *
 * It is the ONLY sanctioned way to remove a row. Deleting one by hand in
 * the console leaves no trace of why; this at least prints what it
 * removed before it goes.
 *
 * USAGE
 *   node tools/delete-score.js --show   <uid>_<date>
 *   node tools/delete-score.js --delete <uid>_<date>
 *
 * --show first, always. The id contains a uid and a date and it is very
 * easy to paste the wrong one.
 *
 * Credentials: gcloud application-default, same as the other tools.
 */

const fs   = require('fs');
const path = require('path');

function explainCredentialError(e) {
  const m = String((e && e.message) || e);
  if (/invalid_rapt|reauth related error|invalid_grant/.test(m)) {
    return 'Your application-default credential needs reauthentication.\n\n' +
           '  gcloud auth application-default login\n\n' +
           'This is NOT the same as `gcloud auth login`.';
  }
  return m;
}

const argv = process.argv.slice(2);
const mode = argv[0];
const id   = argv[1];

if (!['--show', '--delete'].includes(mode) || !id) {
  console.error(`
  node tools/delete-score.js --show   <uid>_<date>
  node tools/delete-score.js --delete <uid>_<date>
`);
  process.exit(2);
}

if (!/^[A-Za-z0-9]+_\d{4}-\d{2}-\d{2}$/.test(id)) {
  console.error(`\n"${id}" is not a scores document id.`);
  console.error('Expected <uid>_<YYYY-MM-DD>, e.g. AbC123_2026-10-25');
  process.exit(2);
}

function projectId() {
  const rc = path.join(__dirname, '..', '.firebaserc');
  if (process.env.GOOGLE_CLOUD_PROJECT) return process.env.GOOGLE_CLOUD_PROJECT;
  if (fs.existsSync(rc)) {
    try { return (JSON.parse(fs.readFileSync(rc, 'utf8')).projects || {}).default; } catch (e) {}
  }
  console.error('\nCould not determine the project id (.firebaserc projects.default).');
  process.exit(1);
}

async function main() {
  const pid = projectId();
  console.log(`project  ${pid}`);

  const { initializeApp, applicationDefault } = require('firebase-admin/app');
  const { getFirestore } = require('firebase-admin/firestore');
  initializeApp({ credential: applicationDefault(), projectId: pid });
  const db = getFirestore();

  const ref  = db.collection('scores').doc(id);
  const snap = await ref.get();

  if (!snap.exists) {
    console.log(`\nNo such row: scores/${id}`);
    console.log('Nothing to do.');
    return;
  }

  const d = snap.data();
  console.log(`\nscores/${id}`);
  console.log(`  player   ${d.displayName || '(no name)'}`);
  console.log(`  date     ${d.date}`);
  console.log(`  score    ${d.score} / ${d.total}`);
  console.log(`  source   ${d.source || '(unknown)'}`);
  console.log(`  graded   ${d.gradedAt && d.gradedAt.toDate ? d.gradedAt.toDate().toISOString() : d.gradedAt}`);

  if (mode === '--show') {
    console.log(`\nShown only. To remove it:\n  node tools/delete-score.js --delete ${id}`);
    return;
  }

  await ref.delete();
  console.log(`\nDeleted. The player can now be re-graded for ${d.date}.`);
  console.log('Their attempts/ record is untouched, so the answers they already');
  console.log('committed still stand and cannot be re-answered — which is the point.');
}

main().catch(e => { console.error('\n' + explainCredentialError(e)); process.exit(1); });
