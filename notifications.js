/* =====================================================
   FACT ROYALE — Push Notification Opt-In
   Requires firebase-messaging-compat.js loaded first.

   SETUP REQUIRED:
   1. Firebase Console → Project Settings → Cloud Messaging
   2. Scroll to "Web Push certificates"
   3. Click "Generate key pair" (if none exists)
   4. Copy the key and paste it below as VAPID_KEY
   ===================================================== */

const VAPID_KEY = 'BOXh_eCLNkhWCL5wEFZvZ4UUo3w0aq8duqfrSIVu7rxxRI3_0ji98rt8g3lGLVbzX8Bb3LvCJ1gK3ynufYT3iuQ';

let fr_messaging = null;

// ── Entry point — called from auth.js after sign-in ───
async function initNotifications(user) {
  if (!user) return;

  // Check browser support
  if (!('Notification' in window) || !('serviceWorker' in navigator)) return;

  // If already granted, silently refresh token (handles reinstalls / token rotation)
  if (Notification.permission === 'granted') {
    await registerAndSaveToken(user);
    return;
  }

  // Browser blocked it — nothing we can do
  if (Notification.permission === 'denied') return;

  // Don't re-prompt if user explicitly dismissed
  const pref = localStorage.getItem('fr_notif_pref');
  if (pref === 'dismissed') return;

  // Show our soft prompt (not the browser dialog — that comes when they click Enable)
  showNotifPrompt();
}

// ── Soft prompt UI ─────────────────────────────────────
function showNotifPrompt() {
  const el = document.getElementById('notif-prompt');
  if (el) el.style.display = 'flex';
}

function hideNotifPrompt() {
  const el = document.getElementById('notif-prompt');
  if (el) el.style.display = 'none';
}

// ── Called when user clicks "Enable" in the soft prompt ─
async function enableNotifications() {
  hideNotifPrompt();

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    localStorage.setItem('fr_notif_pref', 'dismissed');
    return;
  }

  const user = firebase.auth().currentUser;
  if (!user) return;

  await registerAndSaveToken(user);

  // Brief confirmation in the streak banner area
  const confirm = document.getElementById('notif-enabled-confirm');
  if (confirm) {
    confirm.style.display = 'block';
    setTimeout(() => { confirm.style.display = 'none'; }, 3500);
  }
}

// ── Called when user clicks "Not now" ─────────────────
function dismissNotifPrompt() {
  localStorage.setItem('fr_notif_pref', 'dismissed');
  hideNotifPrompt();
}

// ── Get FCM token and save to Firestore ───────────────
async function registerAndSaveToken(user) {
  try {
    const reg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');

    if (!fr_messaging) {
      fr_messaging = firebase.messaging();
    }

    const token = await fr_messaging.getToken({
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: reg
    });

    if (!token) return;

    // Store token on the user doc — existing Firestore rules cover this
    await db.collection('users').doc(user.uid).update({
      fcmToken:             token,
      notificationsEnabled: true,
      fcmUpdatedAt:         firebase.firestore.FieldValue.serverTimestamp()
    });

    localStorage.setItem('fr_notif_pref', 'enabled');
  } catch (err) {
    // Silently fail — notifications are a nice-to-have, not core
    console.warn('FCM registration error:', err.message);
  }
}

// ── Disable notifications ─────────────────────────────
// Call this if you add a settings toggle later
async function disableNotifications() {
  const user = firebase.auth().currentUser;
  if (!user) return;
  try {
    await db.collection('users').doc(user.uid).update({
      fcmToken:             null,
      notificationsEnabled: false
    });
    localStorage.setItem('fr_notif_pref', 'dismissed');
  } catch (err) {
    console.warn('FCM disable error:', err.message);
  }
}
