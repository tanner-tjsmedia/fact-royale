# The Apps Script endpoint

One Google Apps Script web app receives everything that does not go to
Firestore. Three things post to it now:

| `source`      | Sent by                | Fields |
|---------------|------------------------|--------|
| `account`     | `auth.js` on signup    | email, name, firstName, lastName |
| `notify-form` | `quiz.js` notify form  | email, firstName, lastName |
| `contact`     | `contact.js` (new)     | email, topic, message, uid, name, page, sentAt |

The URL is declared **once**, in `firebase-config.js` as `FR_SHEET_URL`,
with `frPostToSheet()` wrapping the post. It used to be typed out in two
files (`SHEET_URL` in auth.js, `SIGNUP_URL` in quiz.js) and contact.js was
about to make three.

## What still needs doing, in Apps Script

The deployment has never seen `source='contact'` or a `message` field.
Until it does, contact messages will either land in the wrong columns or be
dropped silently — and because the post is `no-cors`, **the site cannot
tell the difference**. Nothing in the browser will report this failure.

Open the Apps Script project and branch on `source`:

```js
function doPost(e) {
  var p = e.parameter;
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  if (p.source === 'contact') {
    var sheet = ss.getSheetByName('Contact') || ss.insertSheet('Contact');
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['Received', 'Topic', 'Email', 'Message',
                       'Display name', 'uid', 'Page', 'Sent at']);
    }
    sheet.appendRow([new Date(), p.topic || '', p.email || '', p.message || '',
                     p.name || '', p.uid || '', p.page || '', p.sentAt || '']);
    return ContentService.createTextOutput('ok');
  }

  // existing signup / notify handling unchanged below
  // ...
}
```

Then **Deploy → Manage deployments → Edit → New version**. Editing the
script without redeploying changes nothing: the live web app keeps serving
the old version, which is a quiet way to lose every message sent in the
meantime.

## Testing it

Because the response is opaque, the only honest test is to send one and
look at the sheet:

1. Open any page, click **Contact** in the footer, send a test message.
2. Open the spreadsheet. A new row should be on a `Contact` tab.

If the row is not there, the script is the place to look — not the browser
console, which will show a successful-looking opaque response either way.

## The limitation, stated plainly

`mode: 'no-cors'` means the browser will not let us read the response. The
dialog says *"Your message is on its way"* rather than *"We got it"*
because the second claim would be one we cannot verify. If contact becomes
important enough that silent loss is unacceptable, replace this with a
Cloud Function — the deploy pipeline already exists — and the wording can
become a real confirmation.
