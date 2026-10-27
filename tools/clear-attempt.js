#!/usr/bin/env node
/**
 * FACT ROYALE — CLEAR A COMMITTED ATTEMPT
 *
 * attempts/{uid}_{date} is the record of which answer a player gave to
 * which question. It is deliberately write-once per question: commitAnswer
 * writes the choice in a transaction BEFORE returning a verdict, so a
 * second call replays rather than regrades. That is the whole anti-cheat
 * design and it is working.
 *
 * Which means there is no legitimate in-app route back. A wrong answer is
 * wrong for good — correct for players, and a problem exactly once: when
 * answers were committed by mistake and not by the person whose account
 * they are on.
 *
 * It happened on 2026-10-27. Testing that should have run against
 * localhost or a throwaway account was run against the live site under
 * the owner's signed-in session, committing two wrong answers to a real
 * account for a day it had not played. The results screen then reported
 * the day as 0/12.
 *
 * USAGE
 *   node tools/clear-attempt.js --show   <uid>_<date>
 *   node tools/clear-attempt.js --delete <uid>_<date>
 *
 * --show first. Read what it prints before deleting it.
 *
 * THIS IS NOT A CHEAT BUTTON. It needs admin credentials, it is not
 * reachable from the app, and every use should have a reason you would
 * write down. If a player asks for a reset because they misclicked, the
 * answer is no — that is the game.
 *
 * Deleting the attempt does NOT delete the leaderboard row. If a score
 * was recorded for that day, clear it with tools/delete-score.js too, or
 * the player cannot be re-graded: submitQuiz refuses to overwrite an
 * existing row.
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
const id   = argv[1];

if (!['--show', '--delete'].includes(mode) || !id) {
  console.error(`
  node tools/clear-attempt.js --show   <uid>_<date>
  node tools/clear-attempt.js --delete <uid>_<date>
`);
  process.exit(2);
}

if (!/^[A-Za-z0-9]+_\d{4}-\d{2}-\d{2}$/.test(id)) {
  console.error(`\n"${id}" is not an attempts document id.`);
  console.error('Expected <uid>_<YYYY-MM-DD>, e.g. AbC123_2026-10-26');
  process.exit(2);
}

async function main() {
  const pid = projectId();
  console.log(`project  ${pid}`);

  const { initializeApp, applicationDefault } = require('firebase-admin/app');
  const { getFirestore } = require('firebase-admin/firestore');
  initializeApp({ credential: applicationDefault(), projectId: pid });
  const db = getFirestore();

  const ref  = db.collection('attempts').doc(id);
  const snap = await ref.get();

  if (!snap.exists) {
    console.log(`\nNo such attempt: attempts/${id}`);
    console.log('Nothing to do. The player has not committed an answer that day.');
    return;
  }

  const d = snap.data();
  const answers = d.answers || {};
  const qids = Object.keys(answers).sort(
    (a, b) => (parseInt(a.slice(1), 10) || 0) - (parseInt(b.slice(1), 10) || 0)
  );

  console.log(`\nattempts/${id}`);
  console.log(`  uid       ${d.uid}`);
  console.log(`  date      ${d.date}`);
  console.log(`  committed ${qids.length} answer(s)`);
  qids.forEach(q => {
    const a = answers[q];
    const at = a.at && a.at.toDate ? a.at.toDate().toISOString().replace('T', ' ').slice(0, 19) : '';
    console.log(`    ${q.padEnd(4)} chose index ${a.choice}   ${at}`);
  });

  // A score row blocks re-grading, so say so here rather than letting it
  // be discovered after the fact.
  const scoreSnap = await db.collection('scores').doc(id).get();
  if (scoreSnap.exists) {
    const s = scoreSnap.data();
    console.log(`\n  NOTE: a leaderboard row also exists for this day (${s.score}/${s.total}).`);
    console.log(`  submitQuiz will not overwrite it, so clearing the attempt alone`);
    console.log(`  leaves the player unable to be re-graded. Remove it too:`);
    console.log(`      node tools/delete-score.js --delete ${id}`);
  } else {
    console.log(`\n  No leaderboard row for this day, so clearing the attempt is enough.`);
  }

  if (mode === '--show') {
    console.log(`\nShown only. To clear it:\n  node tools/clear-attempt.js --delete ${id}`);
    return;
  }

  await ref.delete();
  console.log(`\nCleared. ${d.uid} can play ${d.date} from the first question again.`);
  console.log('Their profile stats are untouched — those are written separately');
  console.log('by the client and are not derived from this document.');
}

main().catch(e => { console.error('\n' + explainCredentialError(e)); process.exit(1); });
