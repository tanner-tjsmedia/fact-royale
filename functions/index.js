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
