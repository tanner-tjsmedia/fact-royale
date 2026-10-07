/* FACT ROYALE - FACT STORE
 *
 * The single owner of fact access: reading, approving, seeding and exporting.
 * review-queue.js renders what this hands it; studio.html owns question text;
 * add-source.py owns sourceRefs. Four capabilities, four owners.
 *
 * ---------------------------------------------------------------------------
 * WHY CLOUD IS PRIMARY
 *
 * Approving has to work from a laptop that is nowhere near the repo. The
 * Firestore rules already allow the admin's own browser to read and write
 * factBank, so no service-account key is involved. The key is only needed for
 * quizzes/ and quizKeys/ - the collections players actually read - and that
 * separation is deliberate: nothing a browser session can reach is what gets
 * served to players.
 *
 * ---------------------------------------------------------------------------
 * WHY LOCAL FILES STILL EXIST
 *
 * Firestore cannot diff, blame or revert. facts-src/*.json stays the
 * manuscript and check.py gates it. The cloud copy is the workbench. That is
 * the same split tools/sync-questions.js documents for questions, and the
 * reason has not changed.
 *
 * Consequence worth knowing: an approval made in the cloud is NOT gated by
 * check.py until it is exported back to disk. Export when you are at the
 * desktop, then commit.
 *
 * ---------------------------------------------------------------------------
 * MODES
 *
 *   cloud     factBank in Firestore. Read and write. Works anywhere.
 *   file-rw   facts-src/*.json via the File System Access API. Read and
 *             write. Chrome and Edge on desktop only.
 *   file-ro   the static file over fetch. Read only. The fallback that lets
 *             the library render before anything has been seeded, and on
 *             browsers with no File System Access API.
 */
(function (global) {
  'use strict';

  var FACT_FILE  = 'facts-0001-0499.json';
  var FACT_PATH  = 'facts-src/' + FACT_FILE;
  var COLLECTION = 'factBank';

  var S = { mode: null, facts: [], raw: null, dir: null, note: '' };

  /* ---- a one-key IndexedDB so a folder grant survives reload ------------ */
  function idb(op, key, val) {
    return new Promise(function (resolve) {
      var r = indexedDB.open('fr-store', 1);
      r.onupgradeneeded = function () { r.result.createObjectStore('kv'); };
      r.onerror = function () { resolve(null); };
      r.onsuccess = function () {
        var st = r.result.transaction('kv', op === 'get' ? 'readonly' : 'readwrite')
                         .objectStore('kv');
        var q = op === 'get' ? st.get(key) : st.put(val, key);
        q.onsuccess = function () { resolve(op === 'get' ? (q.result || null) : true); };
        q.onerror   = function () { resolve(null); };
      };
    });
  }

  /* firebase-config.js declares `const db` and `const auth` at the top level
   * of a classic script. Those land in the global LEXICAL environment, not on
   * window, so window.db is undefined while the bare identifier resolves
   * fine. Reading them by name is the only thing that works, and getting this
   * wrong reported "No Firestore on this page" on a page that plainly had it.
   */
  function fdb()  { try { return (typeof db   !== 'undefined') ? db   : null; } catch (e) { return null; } }
  function fauth(){ try { return (typeof auth !== 'undefined') ? auth : null; } catch (e) { return null; } }

  function hasCloud() { return !!fdb(); }
  function hasFS()    { return !!global.showDirectoryPicker; }

  /* ---- read paths ------------------------------------------------------- */

  async function readCloud() {
    var snap = await fdb().collection(COLLECTION).get();
    if (snap.empty) return null;                 // not seeded yet
    var out = [];
    snap.forEach(function (d) { out.push(d.data()); });
    out.sort(function (a, b) { return (a.id || '').localeCompare(b.id || ''); });
    return out;
  }

  async function readFileRO() {
    var r = await fetch(FACT_PATH, { cache: 'no-store' });
    if (!r.ok) throw new Error('Could not fetch ' + FACT_PATH);
    var j = await r.json();
    S.raw = j;
    return j.facts || [];
  }

  async function readFileRW() {
    var fdir = await S.dir.getDirectoryHandle('facts-src');
    var h = await fdir.getFileHandle(FACT_FILE);
    S.raw = JSON.parse(await (await h.getFile()).text());
    return S.raw.facts || [];
  }

  /* ---- init: cloud if seeded, otherwise the file ------------------------ */

  async function init() {
    if (hasCloud()) {
      try {
        var cloud = await readCloud();
        if (cloud) {
          S.mode = 'cloud'; S.facts = cloud;
          S.note = cloud.length + ' facts from Firestore';
          return S;
        }
        S.note = 'factBank is empty - reading the file. Seed it to work from anywhere.';
      } catch (e) {
        // A missing rule reads as permission-denied. Say which, rather than
        // leaving someone guessing at an empty screen.
        S.note = (e && e.code === 'permission-denied')
          ? 'Firestore denied factBank. The security rule for it has not been published yet.'
          : 'Firestore unavailable: ' + (e.message || e);
      }
    } else {
      S.note = 'No Firestore on this page - reading the file.';
    }
    S.mode = 'file-ro';
    S.facts = await readFileRO();
    return S;
  }

  /* ---- write paths ------------------------------------------------------ */

  async function connectLocalWrite() {
    if (!hasFS())
      throw new Error('This browser cannot write local files. Chrome or Edge ' +
                      'on desktop can; Safari and Firefox cannot.');
    var dir = S.dir;
    if (!dir) {
      var saved = await idb('get', 'repo');
      if (saved) {
        var p = await saved.queryPermission({ mode: 'readwrite' });
        if (p !== 'granted') p = await saved.requestPermission({ mode: 'readwrite' });
        if (p === 'granted') dir = saved;
      }
    }
    if (!dir) {
      dir = await global.showDirectoryPicker({ mode: 'readwrite' });
      await idb('put', 'repo', dir);
    }
    await dir.getDirectoryHandle('facts-src');   // fail loudly on the wrong folder
    S.dir = dir;
    return dir;
  }

  async function writeFile() {
    await connectLocalWrite();
    var fdir = await S.dir.getDirectoryHandle('facts-src');
    var h = await fdir.getFileHandle(FACT_FILE);
    if (!S.raw) S.raw = { facts: [] };
    S.raw.facts = S.facts.map(function (f) {
      var c = {}; Object.keys(f).forEach(function (k) { if (k[0] !== '_') c[k] = f[k]; });
      return c;
    });
    var w = await h.createWritable();
    await w.write(JSON.stringify(S.raw, null, 2) + '\n');
    await w.close();
    return FACT_FILE;
  }

  async function writeCloud(ids) {
    var batch = fdb().batch(), n = 0;
    S.facts.forEach(function (f) {
      if (ids && ids.indexOf(f.id) === -1) return;
      var c = {}; Object.keys(f).forEach(function (k) { if (k[0] !== '_') c[k] = f[k]; });
      batch.set(fdb().collection(COLLECTION).doc(f.id), c, { merge: true });
      n++;
      });
    if (n) await batch.commit();
    return n;
  }

  async function persist(ids) {
    if (S.mode === 'cloud') return (await writeCloud(ids)) + ' to Firestore';
    return (await writeFile()) + ' on disk';
  }

  /* ---- the actions ------------------------------------------------------ */

  function assertHuman(email) {
    if (!email || !/@/.test(email) || /^(claude|system|bot|agent)\b/i.test(email))
      throw new Error('approvedBy must be a person. Refusing to write "' + email + '".');
  }

  function stamp(f, email) {
    f.approvedBy = email;
    f.verifiedAt = new Date().toISOString().slice(0, 10);
  }

  async function approve(id, email) {
    assertHuman(email);
    var f = S.facts.find(function (x) { return x.id === id; });
    if (!f) throw new Error('No fact ' + id + ' loaded.');
    stamp(f, email);
    return persist([id]);
  }

  /* Bulk approve. The human guarantee is unchanged - you still read them
   * before pressing the button - this only stops the clicking being the
   * bottleneck. Refuses an empty set rather than silently doing nothing. */
  async function approveMany(ids, email) {
    assertHuman(email);
    if (!ids || !ids.length) throw new Error('Nothing selected to approve.');
    var hit = [];
    ids.forEach(function (id) {
      var f = S.facts.find(function (x) { return x.id === id; });
      if (f && !f.approvedBy) { stamp(f, email); hit.push(id); }
    });
    if (!hit.length) throw new Error('Those are all approved already.');
    await persist(hit);
    return hit.length;
  }

  async function unapprove(id) {
    var f = S.facts.find(function (x) { return x.id === id; });
    if (!f) throw new Error('No fact ' + id + ' loaded.');
    f.approvedBy = null; f.verifiedAt = null;
    return persist([id]);
  }

  /* One-time: push the file's facts into Firestore so the cloud becomes the
   * working copy. Must run from a machine that has the repo. */
  async function seedToCloud() {
    if (!hasCloud()) throw new Error('No Firestore on this page.');
    var existing = await readCloud();
    if (existing && existing.length)
      throw new Error('factBank already holds ' + existing.length + ' facts. ' +
                      'Seeding again would overwrite cloud edits. Export to disk first.');
    var fromFile = S.mode === 'file-ro' ? S.facts : await readFileRO();
    if (!fromFile.length) throw new Error('No facts in the file to seed.');
    S.facts = fromFile;
    var n = await writeCloud(null);
    S.mode = 'cloud';
    S.note = n + ' facts seeded to Firestore';
    return n;
  }

  /* Bring the cloud copy back to disk so git has the history and check.py
   * can gate it. This is the backup half of the arrangement. */
  async function exportToDisk() {
    if (S.mode !== 'cloud') throw new Error('Already working from files.');
    var name = await writeFile();
    return name;
  }

  global.FRStore = {
    init: init,
    facts: function () { return S.facts; },
    mode: function () { return S.mode; },
    note: function () { return S.note; },
    canWriteLocal: hasFS,
    approve: approve,
    approveMany: approveMany,
    unapprove: unapprove,
    seedToCloud: seedToCloud,
    exportToDisk: exportToDisk
  };
})(window);
