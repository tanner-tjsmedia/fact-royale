#!/usr/bin/env node
/**
 * FACT ROYALE — AUTH USER TOOL
 *
 * Inspect and repair Firebase Auth records from the command line.
 *
 * WHY THIS EXISTS
 *
 * The admin's Workspace domain moved from tjs16media.com to takt16.com in
 * October 2026, but the Firebase Auth record kept the old address. The
 * browser cannot help here: this project has Email Enumeration Protection
 * enabled, so the client gets the same invalid-credential error for a wrong
 * password, a missing account, and an account that exists with a different
 * sign-in method. Everything useful has to come from the Admin SDK.
 *
 * THE RULE THAT MATTERS
 *
 * Change the email on the EXISTING record. Do not make a new account.
 * Every score, streak, mastery tier and quiz history document is keyed by
 * uid, not by email — scores/{uid}_{date}, users/{uid}, attempts/{uid}_{date}.
 * A new account is a new uid and the history is simply orphaned. There is
 * no merge: Firebase cannot combine two uids, and neither can we.
 *
 * USAGE
 *   node tools/auth-user.js --list
 *   node tools/auth-user.js --find tanner@tjs16media.com
 *   node tools/auth-user.js --set-email <uid> tanner@takt16.com
 *   node tools/auth-user.js --add-password <uid>      (writes it to .local/)
 *
 * Credentials: gcloud application-default, same as the migration tool.
 * Nothing here prints a password to the terminal.
 */

const fs   = require('fs');
const path = require('path');

/* Firebase's own error for an expired ADC blames a "certificate key file"
 * that may not exist — this project authenticates with gcloud ADC, not a
 * key — and sends you to the service-accounts console, which is the wrong
 * place entirely. Translate it.
 *
 * The distinction that causes this: `gcloud auth login` refreshes the
 * gcloud CLI's own credential; `gcloud auth application-default login`
 * refreshes the one Node and firebase-admin read. They expire separately,
 * and a Workspace reauth policy expires both on a schedule. */
function explainCredentialError(e) {
  var m = String((e && e.message) || e);
  if (/invalid_rapt|reauth related error/.test(m)) {
    return 'Your application-default credential needs reauthentication.\n\n' +
           '  gcloud auth application-default login\n\n' +
           'Note this is NOT the same as `gcloud auth login`, which refreshes\n' +
           'the gcloud CLI only. Nothing is wrong with any key file.';
  }
  if (/invalid_grant/.test(m)) {
    return 'The application-default credential was rejected (invalid_grant).\n\n' +
           '  gcloud auth application-default login';
  }
  if (/PERMISSION_DENIED|insufficient permissions/i.test(m)) {
    return 'Authenticated, but this account lacks permission on the project.\n' +
           'Check: gcloud projects get-iam-policy fact-royale';
  }
  return m;
}

function usage(msg) {
  if (msg) console.error('\n' + msg);
  console.error(`
  node tools/auth-user.js --list
  node tools/auth-user.js --find <email>
  node tools/auth-user.js --set-email <uid> <newEmail>
  node tools/auth-user.js --add-password <uid>
`);
  process.exit(msg ? 2 : 0);
}

const argv = process.argv.slice(2);
if (!argv.length) usage();

/* Same credential preflight as tools/migrate-to-firestore.js: accept gcloud
   ADC or an explicit key, and say which one is in use before touching
   anything. See the long note in that file. */
function credentials() {
  const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (keyPath) {
    if (!fs.existsSync(keyPath)) {
      console.error(`\nGOOGLE_APPLICATION_CREDENTIALS points at a missing file:\n  ${keyPath}`);
      process.exit(1);
    }
    console.log(`credential  service account  ${keyPath}`);
    return;
  }
  const adc = process.platform === 'win32'
    ? path.join(process.env.APPDATA || '', 'gcloud', 'application_default_credentials.json')
    : path.join(process.env.HOME || '', '.config', 'gcloud', 'application_default_credentials.json');
  if (!fs.existsSync(adc)) {
    console.error('\nNo credential found. Run:  gcloud auth application-default login');
    process.exit(1);
  }
  console.log('credential  gcloud application-default');
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

function show(u) {
  const providers = u.providerData.map(p => p.providerId).join(', ') || '(none)';
  console.log(`
  uid         ${u.uid}
  email       ${u.email || '(none)'}  ${u.emailVerified ? '(verified)' : '(unverified)'}
  name        ${u.displayName || '(none)'}
  providers   ${providers}
  created     ${u.metadata.creationTime}
  last signin ${u.metadata.lastSignInTime || '(never)'}
  disabled    ${u.disabled}`);
  if (!providers.includes('password')) {
    console.log(`
  NOTE: no password on this account, so email/password sign-in will always
        fail for it regardless of what is typed. Either sign in with
        ${providers}, or run --add-password ${u.uid}.`);
  }
}

async function main() {
  credentials();
  const pid = projectId();
  console.log(`project     ${pid}\n`);

  const { initializeApp, applicationDefault } = require('firebase-admin/app');
  const { getAuth } = require('firebase-admin/auth');
  initializeApp({ credential: applicationDefault(), projectId: pid });
  const auth = getAuth();

  const cmd = argv[0];

  if (cmd === '--list') {
    const res = await auth.listUsers(1000);
    console.log(`${res.users.length} account(s):\n`);
    res.users.forEach(u => {
      const p = u.providerData.map(x => x.providerId.replace('.com', '')).join('+') || 'none';
      console.log(`  ${u.uid}  ${(u.email || '(no email)').padEnd(34)} ${p.padEnd(14)} ${u.metadata.creationTime}`);
    });
    return;
  }

  if (cmd === '--find') {
    const email = argv[1]; if (!email) usage('--find needs an email.');
    try { show(await auth.getUserByEmail(email)); }
    catch (e) {
      if (e.code === 'auth/user-not-found') {
        console.log(`No account with ${email}.\nRun --list to see every account on the project.`);
      } else throw e;
    }
    return;
  }

  if (cmd === '--set-email') {
    const [uid, email] = [argv[1], argv[2]];
    if (!uid || !email) usage('--set-email needs <uid> <newEmail>.');
    const before = await auth.getUser(uid);
    console.log('BEFORE'); show(before);
    await auth.updateUser(uid, { email, emailVerified: false });
    const after = await auth.getUser(uid);
    console.log('\nAFTER'); show(after);
    console.log(`
  The uid is unchanged, so every score, streak, mastery tier and quiz
  history document still belongs to this account. Nothing was migrated
  because nothing needed to be.`);
    if (before.providerData.some(p => p.providerId === 'google.com')) {
      console.log(`
  WARNING: this account signs in with Google. Changing the email here does
  NOT change which Google account is linked to it. If the old Google
  account no longer exists, add a password with --add-password ${uid} and
  sign in that way instead.`);
    }
    return;
  }

  if (cmd === '--add-password') {
    const uid = argv[1]; if (!uid) usage('--add-password needs <uid>.');
    const u = await auth.getUser(uid);
    if (!u.email) { console.error('That account has no email address; set one first.'); process.exit(1); }
    const pw = 'Fr-' + require('crypto').randomBytes(12).toString('base64url');
    await auth.updateUser(uid, { password: pw });
    const dir = path.join(__dirname, '..', '.local');
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, 'recovered-login.txt');
    fs.writeFileSync(file,
      `FACT ROYALE — password set for an existing account\n` +
      `Set ${new Date().toISOString().slice(0,10)} by tools/auth-user.js\n\n` +
      `  uid       ${uid}\n  email     ${u.email}\n  password  ${pw}\n\n` +
      `The uid is unchanged, so all history on this account is intact.\n` +
      `.local/ is gitignored; this repository is public. Change the password\n` +
      `from the app once you are back in, and delete this file.\n`);
    console.log(`\n  Password set. Written to .local/recovered-login.txt`);
    console.log(`  Not printed here on purpose. The uid is unchanged, so no history is lost.`);
    return;
  }

  usage('Unknown command: ' + cmd);
}

main().catch(e => { console.error('\n' + explainCredentialError(e)); process.exit(1); });
