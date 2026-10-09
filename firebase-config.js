/* =====================================================
   FACT ROYALE — Firebase Configuration
   =====================================================
   1. Go to https://console.firebase.google.com
   2. Create a project called "fact-royale"
   3. Project Settings → Your Apps → Add Web App
   4. Copy the config object and paste the values below
   ===================================================== */

const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyBIsusWIMcFpGKeZeP3CemHiKOizby2Zro",
  authDomain:        "fact-royale.firebaseapp.com",
  projectId:         "fact-royale",
  storageBucket:     "fact-royale.firebasestorage.app",
  messagingSenderId: "79646023605",
  appId:             "1:79646023605:web:7693871d043af940fd03fc"
};

firebase.initializeApp(FIREBASE_CONFIG);

const auth = firebase.auth();
const db   = firebase.firestore();


/* ── Who is an admin ───────────────────────────────────
   One list, imported everywhere. The address used to be written out as a
   literal in five places - firestore.rules plus admin.html, live.html,
   review.html and studio.html - which is five places to miss when it
   changes. It just changed.

   A LIST, not a string, because an email migration has an overlap period.
   tanner@tjs16media.com became tanner@takt16.com in October 2026, and which
   identity a given Firebase Auth session carries depends on how that sign-in
   was created: a Google sign-in follows the Workspace account, an
   email/password record keeps whatever address it was registered with. Both
   are allowed until it is confirmed which one the live session actually
   presents, because the failure mode of guessing wrong is being locked out
   of the admin console, the question bank and the fact bank at once.

   Drop the old address once admin.html has been opened successfully on the
   new one. Leaving a dead address here is a standing liability: if that
   domain is ever released, whoever registers it next inherits admin.

   firestore.rules keeps its own copy of this list because rules cannot
   import from JavaScript. That one is the copy that actually enforces
   anything; these are UI gates. They must be changed together. */
const FR_ADMIN_EMAILS = [
  'tanner@takt16.com',      // current
  'tanner@tjs16media.com'   // legacy, remove once the new one is confirmed
];

/** The address to prefill on sign-in and attribute new work to. */
const FR_ADMIN_PRIMARY = FR_ADMIN_EMAILS[0];

function isAdminEmail(email) {
  return !!email && FR_ADMIN_EMAILS.indexOf(String(email).toLowerCase()) !== -1;
}


/* ── Account session vs. grading session ───────────────
   Two kinds of signed-in exist as of server-side grading, and conflating
   them is the easiest way to break this app.

     ACCOUNT session   the player registered. Has an email, a profile, a
                       streak, a leaderboard row, mastery, push tokens.
     GRADING session   an anonymous uid, minted automatically so the server
                       can pin a player's answer to something before it tells
                       them whether it was right. No email, no profile, no
                       row. See the grading section of _app/quiz.js.

   firebase.auth().currentUser is truthy for BOTH. Almost every feature in
   this codebase means the first one when it asks "is someone signed in", so
   it must not read currentUser directly. Use realUser().

   This lives in firebase-config.js because it is the one file every page
   loads before anything else, and because the alternative - defining the
   same predicate in auth.js, quiz.js, mastery.js, notifications.js and
   groups.js - is the duplicated-rule bug that has cost this project more
   time than any other single mistake. One owner.

   Declared as functions, not const, so they land on window and are reachable
   from any script regardless of load order. A top-level const goes into the
   global lexical environment and is NOT a window property, which has already
   bitten this project once (window.db on the admin page).
*/
function isRealUser(u) {
  return !!(u && u.isAnonymous !== true);
}

/** The signed-in ACCOUNT, or null. Anonymous grading sessions return null. */
function realUser() {
  try {
    const u = firebase.auth().currentUser;
    return isRealUser(u) ? u : null;
  } catch (e) { return null; }
}


/* =====================================================
   FIRESTORE SECURITY RULES

   The live rules are firestore.rules in this repo. They are deployed with
   `firebase deploy --only firestore:rules`.

   This file used to carry a copy of them in a comment, from the week the
   project was set up. That copy had gone badly stale: it described scores/
   as client-writable by the owning uid, which was the exact hole that
   server-side grading was built to close. A stale copy of a security rule is
   worse than no copy, because it reads as authoritative.

   Do not reproduce rules here. Read firestore.rules.
   ===================================================== */
