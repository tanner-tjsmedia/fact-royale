/* =====================================================
   FACT ROYALE — Cloud Functions
   Scheduled daily push notifications via FCM.

   Deploy: firebase deploy --only functions
   ===================================================== */

const { onSchedule } = require('firebase-functions/v2/scheduler');
const { initializeApp }  = require('firebase-admin/app');
const { getFirestore }   = require('firebase-admin/firestore');
const { getMessaging }   = require('firebase-admin/messaging');

initializeApp();
const db        = getFirestore();
const messaging = getMessaging();

// ── Message variants ───────────────────────────────────
// Rotates daily. Each is a function(name, streak) → {title, body}.
const VARIANTS = [
  (name, streak) => ({
    title: '♛ Fact Royale is live',
    body: streak > 1
      ? `${name}, your ${streak}-day streak is on the line. Don't miss today.`
      : `${name}, today's quiz just dropped. 10 questions — can you ace it?`
  }),
  (name, streak) => ({
    title: '♛ Daily quiz ready',
    body: streak > 6
      ? `${streak} days strong, ${name}. Keep the chain going.`
      : streak > 1
        ? `${streak}-day streak, ${name}. Today's your chance to extend it.`
        : `New day, new quiz. History, Sports, Music — ${name}, let's go.`
  }),
  (name, streak) => ({
    title: '♛ Know more today',
    body: streak > 13
      ? `Two weeks and counting, ${name}. You're in rare company.`
      : streak > 1
        ? `${name} — ${streak} days in. The streak clock is ticking.`
        : `${name}, today's Fact Royale is ready. Real explanations after every answer.`
  }),
  (name, streak) => ({
    title: '♛ Trivia time',
    body: streak > 29
      ? `30+ day streak, ${name}? You're a Fact Royale legend. Don't stop now.`
      : streak > 1
        ? `${name}, ${streak} days of knowing more. One more to add.`
        : `${name}, the daily quiz is live. It takes five minutes and teaches you something.`
  }),
  (name, streak) => ({
    title: '♛ Your quiz awaits',
    body: streak > 1
      ? `${name}, your ${streak}-day run lives one answer at a time. Go play.`
      : `${name}, today's categories: History, Sports & Pop Culture. Ready?`
  }),
  (name, streak) => ({
    title: '♛ Fact Royale',
    body: streak > 1
      ? `Morning, ${name}. ${streak}-day streak. Today's quiz is ready when you are.`
      : `Morning, ${name}. Today's quiz is live — learn something new in five minutes.`
  }),
  (name, streak) => ({
    title: '♛ Daily knowledge drop',
    body: streak > 1
      ? `${name}, don't let a ${streak}-day streak end today. The quiz is live.`
      : `${name}, every answer comes with an explanation. That's what makes it different.`
  }),
];

// ── Scheduled notification sender ─────────────────────
// Runs at noon ET. Sends personalized FCM to every opted-in user.
// Time is tunable — adjust the schedule cron below.
exports.sendDailyNotifications = onSchedule(
  {
    schedule:  'every day 13:00',
    timeZone:  'America/New_York',
    region:    'us-central1',
    memory:    '256MiB',
  },
  async () => {
    try {
      // Pick today's variant (cycles through the 7 above by day of year)
      const dayOfYear = Math.floor(
        (Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000
      );
      const variantFn = VARIANTS[dayOfYear % VARIANTS.length];

      // Fetch all opted-in users
      const snap = await db.collection('users')
        .where('notificationsEnabled', '==', true)
        .get();

      if (snap.empty) {
        console.log('No opted-in users — nothing to send.');
        return;
      }

      let sent = 0, failed = 0;
      const invalidUids = [];

      for (const doc of snap.docs) {
        const data  = doc.data();
        const token = data.fcmToken;
        if (!token) continue;

        // Build personalized message
        const name   = data.displayName || data.firstName || 'Trivia fan';
        const streak = data.currentStreak || 0;
        const { title, body } = variantFn(name, streak);

        const message = {
          token,
          notification: { title, body },
          webpush: {
            notification: {
              title,
              body,
              icon:  'https://fact-royale.com/icons/icon-192.png',
              badge: 'https://fact-royale.com/icons/icon-192.png',
              tag:   'fact-royale-daily',
              requireInteraction: false,
            },
            fcmOptions: { link: 'https://fact-royale.com' }
          }
        };

        try {
          await messaging.send(message);
          sent++;
        } catch (err) {
          failed++;
          // Stale/invalid token — clean up so we stop trying
          if (
            err.code === 'messaging/registration-token-not-registered' ||
            err.code === 'messaging/invalid-registration-token'
          ) {
            invalidUids.push(doc.id);
          }
        }
      }

      // Remove stale tokens in batch
      if (invalidUids.length > 0) {
        const batch = db.batch();
        for (const uid of invalidUids) {
          batch.update(db.collection('users').doc(uid), {
            fcmToken:             null,
            notificationsEnabled: false
          });
        }
        await batch.commit();
      }

      console.log(`Done — sent: ${sent}, failed: ${failed}, cleaned: ${invalidUids.length}`);
    } catch (err) {
      console.error('sendDailyNotifications error:', err);
    }
  }
);

// ── Play-time analyzer ────────────────────────────────
// Runs at 6am ET, reads last 14 days of plays, finds the peak
// hour, and writes it to config/notifications for future tuning.
// The notification sender above doesn't yet use this — it's data
// collection for when you want to make the timing fully dynamic.
exports.analyzePeakPlayTime = onSchedule(
  {
    schedule:  'every day 06:00',
    timeZone:  'America/New_York',
    region:    'us-central1',
    memory:    '256MiB',
  },
  async () => {
    try {
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

      const playsSnap = await db.collection('plays')
        .where('ts', '>=', twoWeeksAgo)
        .get();

      if (playsSnap.empty) {
        console.log('No play data yet.');
        return;
      }

      // Count plays by hour (ET)
      const hourCounts = new Array(24).fill(0);
      playsSnap.forEach(doc => {
        const ts = doc.data().ts?.toDate();
        if (!ts) return;
        const etDate = new Date(ts.toLocaleString('en-US', { timeZone: 'America/New_York' }));
        hourCounts[etDate.getHours()]++;
      });

      // Find peak within a sensible notification window (10am–4pm)
      let peakHour = 12, peakCount = 0;
      for (let h = 10; h <= 16; h++) {
        if (hourCounts[h] > peakCount) {
          peakCount = hourCounts[h];
          peakHour  = h;
        }
      }

      await db.collection('config').doc('notifications').set(
        { peakHour, analyzedAt: new Date().toISOString(), totalPlays: playsSnap.size },
        { merge: true }
      );

      console.log(`Peak play hour: ${peakHour}:00 ET (${peakCount} plays in 14 days, ${playsSnap.size} total)`);
    } catch (err) {
      console.error('analyzePeakPlayTime error:', err);
    }
  }
);



/* =====================================================
   SERVER-SIDE GRADING  —  COMMIT, THEN REVEAL

   The client no longer marks its own quiz, and no longer holds an answer it
   has not already answered against. quizzes/ carries prompts and options;
   the answers live in quizKeys/, which no client can read under any rule.
   These two functions are the only things that see both.

   Two calls, and the split matters:

     commitAnswer   one question. Records the player's choice FIRST, inside a
                    transaction, then returns the verdict for that one
                    question. Because the choice is written before the answer
                    is revealed, and because a second call for the same
                    question replays the first verdict instead of regrading,
                    a caller cannot walk the four options to find the right
                    one. That loop was the whole reason answers used to have
                    to ride along in the public document.

     submitQuiz     the finalizer. Takes a date and NOTHING else. It grades
                    the answers already on record in attempts/ and writes the
                    leaderboard row. It does not accept answers from the
                    client, which is the point: there is exactly one place a
                    player's choice can enter the system, and it is the
                    function above.

   Both refuse a quiz whose publishAt has not passed, checked against the
   server's clock, so a device clock buys nothing.

   Write-once is enforced here as well as in the rules: the score document is
   created inside a transaction that refuses if one already exists, so two
   submissions racing each other cannot both land.

   ---------------------------------------------------------------------------
   WHY ANONYMOUS PLAYERS NEED AN ANONYMOUS UID

   An earlier draft of this file gated grading behind a real account, with a
   flag (ALLOW_ANONYMOUS_GRADING) and a note explaining that an ungraded,
   unpinned caller could call repeatedly with different guesses and learn the
   answers, since every reply says which questions were right. That note was
   correct about the hole and wrong about the only fix: it concluded the
   answer was "App Check plus a per-install attempt record".

   attempts/{uid}_{date} IS that per-install record, and Firebase Anonymous
   Auth is what supplies the install identity. An anonymous player gets a uid,
   their choices get pinned, and commitAnswer replays rather than regrades -
   so the enumeration loop closes for them on exactly the same mechanism it
   closes for a signed-in player. What they still do not get is a leaderboard
   row, because that requires a name and a profile.

   This matters commercially, not just technically: anonymous play is the
   signup funnel. Requiring an account to be told whether you got question
   one right would have put a wall in front of the first thing a new visitor
   does. The flag is therefore gone rather than flipped - there is no setting
   here, because there is no longer a trade to make.

   DEPLOY STEP: Firebase console -> Authentication -> Sign-in method ->
   enable "Anonymous". Without it, signInAnonymously() fails and nobody who
   is not signed in can be graded at all.
   ===================================================== */

const { onCall, HttpsError } = require('firebase-functions/v2/https');

const MAX_QUESTIONS = 50;

/** Shared preamble: validate the date, prove the quiz is live, load the key. */
async function openQuizOrThrow(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
    throw new HttpsError('invalid-argument', 'Bad date.');

  const quizSnap = await db.collection('quizzes').doc(date).get();
  if (!quizSnap.exists) throw new HttpsError('not-found', 'No quiz for that date.');

  const quiz = quizSnap.data();
  const publishAt = quiz.publishAt && quiz.publishAt.toDate
    ? quiz.publishAt.toDate() : new Date(quiz.publishAt);
  if (publishAt.getTime() > Date.now())
    throw new HttpsError('failed-precondition', 'That quiz has not opened yet.');

  const keySnap = await db.collection('quizKeys').doc(date).get();
  if (!keySnap.exists) throw new HttpsError('not-found', 'No answer key for that date.');

  const key = keySnap.data();
  return {
    quiz,
    solutions:    key.answers      || {},
    explanations: key.explanations || {}
  };
}

/* ── commitAnswer ──────────────────────────────────────
   { date, qid, choice } -> { correct, correctIndex, explanation, replay }

   choice is an option INDEX into the options array as the server stored it.
   The client shuffles options for display, so it must map its own shuffle
   back to the stored index before calling. Sending text instead of an index
   would mean the server string-matching against the key, which is the join
   the two-collection split exists to prevent.
*/
exports.commitAnswer = onCall({ region: 'us-central1', cors: true }, async (req) => {
  const uid = req.auth && req.auth.uid;
  if (!uid)
    throw new HttpsError('unauthenticated', 'No session. Reload the page.');

  const date   = String((req.data && req.data.date) || '');
  const qid    = String((req.data && req.data.qid)  || '');
  const choice = (req.data && req.data.choice);

  if (!/^q\d{1,2}$/.test(qid))
    throw new HttpsError('invalid-argument', 'Bad question id.');
  if (typeof choice !== 'number' || !Number.isInteger(choice) || choice < 0 || choice > 9)
    throw new HttpsError('invalid-argument', 'choice must be an option index.');

  const { solutions, explanations } = await openQuizOrThrow(date);
  if (!(qid in solutions))
    throw new HttpsError('not-found', 'No such question in that quiz.');

  const ref = db.collection('attempts').doc(`${uid}_${date}`);

  // The transaction is what makes this safe. Two calls racing for the same
  // qid cannot both write, so the first choice to land is the one on record
  // and the second gets told it is a replay.
  const outcome = await db.runTransaction(async (tx) => {
    const snap     = await tx.get(ref);
    const existing = snap.exists ? (snap.data().answers || {}) : {};

    if (qid in existing) {
      return { choice: existing[qid].choice, replay: true };
    }

    const entry = { choice, at: new Date() };
    if (snap.exists) {
      tx.update(ref, { [`answers.${qid}`]: entry, lastAt: new Date() });
    } else {
      tx.set(ref, { uid, date, answers: { [qid]: entry }, startedAt: new Date(), lastAt: new Date() });
    }
    return { choice, replay: false };
  });

  // Revealed only after the write above has committed.
  return {
    correct:      outcome.choice === solutions[qid],
    correctIndex: solutions[qid],
    explanation:  explanations[qid] || '',
    replay:       outcome.replay
  };
});

/* ── submitQuiz ────────────────────────────────────────
   { date } -> { score, total, perQuestion, recorded }

   Grades what is on record. A question the player never committed counts as
   wrong, which is the correct reading of an abandoned quiz: it cannot be
   worth more than the questions actually answered.
*/
exports.submitQuiz = onCall({ region: 'us-central1', cors: true }, async (req) => {
  const uid = req.auth && req.auth.uid;
  if (!uid)
    throw new HttpsError('unauthenticated', 'No session. Reload the page.');

  const date = String((req.data && req.data.date) || '');
  const { solutions, explanations } = await openQuizOrThrow(date);

  const total = Object.keys(solutions).length;
  if (total > MAX_QUESTIONS)
    throw new HttpsError('internal', 'Answer key is implausibly large.');

  const attemptSnap = await db.collection('attempts').doc(`${uid}_${date}`).get();
  const committed   = attemptSnap.exists ? (attemptSnap.data().answers || {}) : {};

  const perQuestion = {};
  let score = 0;
  Object.keys(solutions).forEach((qid) => {
    const given   = committed[qid] ? committed[qid].choice : null;
    const correct = (typeof given === 'number') && given === solutions[qid];
    if (correct) score++;
    perQuestion[qid] = {
      correct,
      answered:     given !== null,
      correctIndex: solutions[qid],
      explanation:  explanations[qid] || ''
    };
  });

  // Anonymous players are graded but not ranked. A leaderboard row needs a
  // profile name, and an anonymous uid has none; the signup nudge on the
  // results screen is the path from here to a row.
  const isAnonymous = !!(req.auth.token && req.auth.token.firebase
                        && req.auth.token.firebase.sign_in_provider === 'anonymous');
  if (isAnonymous)
    return { score, total, perQuestion, recorded: false, reason: 'anonymous' };

  // displayName comes from the profile on the server, never from the client:
  // the leaderboard renders it, so a client-supplied value is a content
  // injection vector as well as an impersonation one.
  let displayName = (req.auth.token && req.auth.token.name) || 'Player';
  try {
    const prof = await db.collection('users').doc(uid).get();
    if (prof.exists && prof.data().displayName) displayName = prof.data().displayName;
  } catch (e) { /* fall back to the token name */ }
  displayName = String(displayName).slice(0, 40);

  const ref = db.collection('scores').doc(`${uid}_${date}`);
  let recorded = true;
  await db.runTransaction(async (tx) => {
    const existing = await tx.get(ref);
    if (existing.exists) { recorded = false; return; }   // already played
    tx.set(ref, {
      uid, date, score, total, displayName,
      gradedAt: new Date(),
      source: 'submitQuiz'
    });
  });

  return { score, total, perQuestion, recorded };
});
