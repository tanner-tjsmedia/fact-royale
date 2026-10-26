/* ============================================================
   FACT ROYALE — THE APPS SCRIPT ENDPOINT

   One Google Apps Script web app receives everything that is NOT
   Firestore: signup notifications, the notify-me form, and contact
   messages. Each post carries a `source` field and the script branches on
   it. See docs/CONTACT-ENDPOINT.md.

   WHY THIS IS ITS OWN FILE

   The URL first lived in two places — SHEET_URL in auth.js and
   SIGNUP_URL in quiz.js, the same string typed twice. Consolidating it
   was right; the first attempt put it in firebase-config.js for the bad
   reason that "every page loads that one", and privacy.html proved why
   that was wrong within the hour: it loads firebase-config.js without the
   Firebase SDK, so line 18 threw `firebase is not defined` and every
   declaration BELOW it — including this one — never ran. The contact form
   on the legal pages was dead on arrival.

   A posted form has nothing to do with Firebase. It gets its own file
   with no dependencies, so any page can load it alone.
   ============================================================ */

var FR_SHEET_URL = 'https://script.google.com/macros/s/AKfycbzCboRQs6V2YbKuUTSnGIdMXZIPlmYl2jLZVMnbvapVNlDIOKlQgLmsW1Qqjsc1BkoK/exec';

/* Fire-and-forget post.
 *
 * mode:'no-cors' makes the response opaque: there is no status to read, so
 * this cannot tell a caller whether anything landed. Callers must not
 * claim delivery they cannot verify. */
function frPostToSheet(fields) {
  return fetch(FR_SHEET_URL, {
    method: 'POST',
    mode:   'no-cors',
    body:   new URLSearchParams(fields)
  });
}
