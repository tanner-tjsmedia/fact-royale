#!/usr/bin/env node
/**
 * FACT ROYALE — READ LEADERBOARD ROWS
 *
 * Read-only. Answers "did that quiz actually record?" without needing the
 * local server, a browser, or a signed-in session — which is exactly the
 * situation this was written in: the test server had been stopped and
 * there was no way left to look.
 *
 * USAGE
 *   node tools/scores.js --date 2026-10-20     every row for one day
 *   node tools/scores.js --recent              the last 15 rows written
 *   node tools/scores.js --player <uid>        one player's rows + profile
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

function projectId() {
  const rc = path.join(__dirname, '..', '.firebaserc');
  if (process.env.GOOGLE_CLOUD_PROJECT) return process.env.GOOGLE_CLOUD_PROJECT;
  if (fs.existsSync(rc)) {
    try { return (JSON.parse(fs.readFileSync(rc, 'utf8')).projects || {}).default; } catch (e) {}
  }
  console.error('\nCould not determine the project id (.firebaserc projects.default).');
  process.exit(1);
}

const argv = process.argv.slice(2);
const mode = argv[0];
const arg  = argv[1];

if (!['--date', '--recent', '--player'].includes(mode)) {
  console.error(`
  node tools/scores.js --date 2026-10-20
  node tools/scores.js --recent
  node tools/scores.js --player <uid>
`);
  process.exit(2);
}

function when(v) {
  if (!v) return '(none)';
  return v.toDate ? v.toDate().toISOString().replace('T', ' ').slice(0, 19) : String(v);
}

function row(d) {
  const pct = d.total ? Math.round((d.score / d.total) * 100) : 0;
  return `  ${String(d.score + '/' + d.total).padEnd(7)} ${String(pct + '%').padEnd(5)} ` +
         `${(d.displayName || '(no name)').padEnd(18)} ${d.date}  ${when(d.gradedAt)}  ${d.source || ''}`;
}

async function main() {
  const pid = projectId();
  console.log(`project  ${pid}\n`);

  const { initializeApp, applicationDefault } = require('firebase-admin/app');
  const { getFirestore } = require('firebase-admin/firestore');
  initializeApp({ credential: applicationDefault(), projectId: pid });
  const db = getFirestore();

  if (mode === '--date') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(arg || '')) {
      console.error('--date needs YYYY-MM-DD'); process.exit(2);
    }
    const snap = await db.collection('scores').where('date', '==', arg).get();
    if (snap.empty) {
      console.log(`No leaderboard rows for ${arg}.`);
      console.log('\nIf a quiz was just completed for this date, that is the bug:');
      console.log('a finished quiz must write exactly one row.');
      return;
    }
    console.log(`${snap.size} row(s) for ${arg}:\n`);
    snap.docs
      .map(d => d.data())
      .sort((a, b) => b.score - a.score)
      .forEach(d => console.log(row(d)));
    return;
  }

  if (mode === '--recent') {
    const snap = await db.collection('scores').orderBy('gradedAt', 'desc').limit(15).get();
    if (snap.empty) { console.log('No leaderboard rows at all.'); return; }
    console.log(`last ${snap.size} rows written:\n`);
    snap.docs.forEach(d => console.log(row(d.data())));
    return;
  }

  // --player
  if (!arg) { console.error('--player needs a uid'); process.exit(2); }
  const snap = await db.collection('scores').where('uid', '==', arg).get();
  console.log(`${snap.size} row(s) for ${arg}:\n`);
  snap.docs
    .map(d => d.data())
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .forEach(d => console.log(row(d)));

  const prof = await db.collection('users').doc(arg).get();
  if (!prof.exists) { console.log('\nNo profile document.'); return; }
  const s = prof.data().stats || {};
  console.log(`\nprofile (users/${arg})`);
  console.log(`  name        ${prof.data().displayName || '(none)'}`);
  console.log(`  games       ${s.gamesPlayed}`);
  console.log(`  answered    ${s.questionsAnswered}   correct ${s.questionsCorrect}`);
  console.log(`  best        ${s.bestScore} on ${s.bestScoreDate}`);
  console.log(`  streak      ${s.currentStreak}  (longest ${s.longestStreak})`);
  console.log(`  last played ${s.lastPlayedDate}`);

  const cats = prof.data().categoryStats || {};
  console.log('\n  category stats');
  Object.keys(cats).sort().forEach(k => {
    console.log(`    ${k.padEnd(18)} ${cats[k].correct}/${cats[k].played}`);
  });

  console.log(`
  The profile is written by the CLIENT (auth.js). The rows above are
  written by the SERVER (submitQuiz). If they disagree, the server is the
  one that matters: it is what the leaderboard renders.`);
}

main().catch(e => { console.error('\n' + explainCredentialError(e)); process.exit(1); });
