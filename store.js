/* FACT ROYALE - WRITE STORE
 *
 * The only thing that writes an approval. Everything that *reads* facts and
 * questions for display is review-queue.js; everything that edits question
 * text is studio.html. Three capabilities, three owners, no overlap - which
 * is the rule this project keeps relearning the hard way.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS EXISTS
 *
 * approvedBy must be a human and nothing publishes without it. Until now the
 * only way to set it was hand-editing facts-src/*.json, which is why 0 of 93
 * facts were approved. The queue had no action attached to it.
 *
 * ---------------------------------------------------------------------------
 * TWO BACKENDS, ONE INTERFACE
 *
 *   LocalStore  facts-src/*.json on this machine, via the File System Access
 *               API. Git-native: an approval is a diff, revertable, and
 *               check.py gates it. Works today.
 *
 *   CloudStore  a factBank collection in Firestore. Works from any device.
 *               NOT AVAILABLE YET - the collection does not exist, there is
 *               no security rule for it, and the service-account key needed
 *               to push has never been generated. connect() says so plainly
 *               rather than failing with a stack trace.
 *
 * The local path is not a stopgap. Firestore has no history of its own, so
 * the repo stays the manuscript either way - see the header of
 * tools/sync-questions.js.
 */
(function (global) {
  'use strict';

  var FACT_FILE = 'facts-0001-0499.json';
  var state = { dirHandle: null, backend: null, facts: null, raw: null };

  /* --- a one-key IndexedDB, so the folder grant survives a reload --------- */
  function idbGet(key) {
    return new Promise(function (resolve) {
      var r = indexedDB.open('fr-store', 1);
      r.onupgradeneeded = function () { r.result.createObjectStore('kv'); };
      r.onsuccess = function () {
        var tx = r.result.transaction('kv', 'readonly').objectStore('kv').get(key);
        tx.onsuccess = function () { resolve(tx.result || null); };
        tx.onerror = function () { resolve(null); };
      };
      r.onerror = function () { resolve(null); };
    });
  }
  function idbSet(key, val) {
    return new Promise(function (resolve) {
      var r = indexedDB.open('fr-store', 1);
      r.onupgradeneeded = function () { r.result.createObjectStore('kv'); };
      r.onsuccess = function () {
        var tx = r.result.transaction('kv', 'readwrite').objectStore('kv').put(val, key);
        tx.onsuccess = function () { resolve(true); };
        tx.onerror = function () { resolve(false); };
      };
      r.onerror = function () { resolve(false); };
    });
  }

  /* --- local files ------------------------------------------------------- */
  var LocalStore = {
    label: 'local files',
    available: function () { return !!global.showDirectoryPicker; },

    connect: async function (opts) {
      if (!this.available())
        throw new Error('This browser has no File System Access API. ' +
                        'Chrome or Edge on desktop can write approvals; ' +
                        'Safari and Firefox cannot.');
      var dir = state.dirHandle;
      if (!dir && !(opts && opts.forcePicker)) {
        var saved = await idbGet('repo');
        if (saved) {
          var perm = await saved.queryPermission({ mode: 'readwrite' });
          if (perm !== 'granted') perm = await saved.requestPermission({ mode: 'readwrite' });
          if (perm === 'granted') dir = saved;
        }
      }
      if (!dir) {
        dir = await global.showDirectoryPicker({ mode: 'readwrite' });
        await idbSet('repo', dir);
      }
      // Fail loudly if this is the wrong folder, rather than writing a
      // facts file into some unrelated directory.
      await dir.getDirectoryHandle('facts-src');
      state.dirHandle = dir;
      state.backend = 'local';
      return this.label;
    },

    loadFacts: async function () {
      var fdir = await state.dirHandle.getDirectoryHandle('facts-src');
      var h = await fdir.getFileHandle(FACT_FILE);
      var raw = JSON.parse(await (await h.getFile()).text());
      state.raw = raw;
      state.facts = raw.facts || [];
      return state.facts;
    },

    saveFacts: async function () {
      var fdir = await state.dirHandle.getDirectoryHandle('facts-src');
      var h = await fdir.getFileHandle(FACT_FILE);
      var w = await h.createWritable();
      await w.write(JSON.stringify(state.raw, null, 2) + '\n');
      await w.close();
      return FACT_FILE;
    }
  };

  /* --- firestore --------------------------------------------------------- */
  var CloudStore = {
    label: 'fact bank (Firestore)',
    available: function () { return typeof global.db !== 'undefined'; },

    connect: async function () {
      if (!this.available())
        throw new Error('Firestore is not initialised on this page.');
      var snap = await global.db.collection('factBank').limit(1).get();
      if (snap.empty)
        throw new Error(
          'factBank is empty, so there is nothing to approve in the cloud yet. ' +
          'It needs: a service-account key, a factBank collection, a security ' +
          'rule for it, and a push. Until then use local files - an approval ' +
          'written there is a git diff, which the cloud cannot give you anyway.');
      state.backend = 'cloud';
      return this.label;
    },

    loadFacts: async function () {
      var snap = await global.db.collection('factBank').get();
      state.facts = [];
      snap.forEach(function (d) { state.facts.push(d.data()); });
      state.raw = null;
      return state.facts;
    },

    saveFacts: async function () {
      var batch = global.db.batch(), n = 0;
      state.facts.forEach(function (f) {
        if (!f._dirty) return;
        var copy = {};
        Object.keys(f).forEach(function (k) { if (k !== '_dirty') copy[k] = f[k]; });
        batch.set(global.db.collection('factBank').doc(f.id), copy, { merge: true });
        n++;
      });
      if (n) await batch.commit();
      state.facts.forEach(function (f) { delete f._dirty; });
      return n + ' fact' + (n === 1 ? '' : 's');
    }
  };

  function backend() {
    if (state.backend === 'cloud') return CloudStore;
    if (state.backend === 'local') return LocalStore;
    throw new Error('Not connected to a store yet.');
  }

  /* --- the action the whole module exists for ---------------------------- */

  /* approve(id, email)
   * Sets approvedBy and verifiedAt. Refuses a non-human value, because the
   * guarantee this field carries is precisely that a person looked at it -
   * writing 'claude' or 'system' here would quietly void the whole rule.
   */
  async function approve(id, email) {
    if (!email || !/@/.test(email) || /^(claude|system|bot)\b/i.test(email))
      throw new Error('approvedBy must be a person. Refusing to write "' + email + '".');
    var f = (state.facts || []).find(function (x) { return x.id === id; });
    if (!f) throw new Error('No fact ' + id + ' in the loaded set.');
    f.approvedBy = email;
    f.verifiedAt = new Date().toISOString().slice(0, 10);
    f._dirty = true;
    return backend().saveFacts();
  }

  /* Withdraw an approval. Sets it back to null rather than deleting the key,
   * so the shape of a fact never changes based on its history. */
  async function unapprove(id) {
    var f = (state.facts || []).find(function (x) { return x.id === id; });
    if (!f) throw new Error('No fact ' + id + ' in the loaded set.');
    f.approvedBy = null;
    f.verifiedAt = null;
    f._dirty = true;
    return backend().saveFacts();
  }

  async function connect(which, opts) {
    var s = which === 'cloud' ? CloudStore : LocalStore;
    var label = await s.connect(opts);
    await s.loadFacts();
    return label;
  }

  global.FRStore = {
    connect: connect,
    approve: approve,
    unapprove: unapprove,
    facts: function () { return state.facts || []; },
    backendName: function () { return state.backend; },
    isConnected: function () { return !!state.backend; },
    localAvailable: function () { return LocalStore.available(); }
  };
})(window);
