/* ============================================================
   FACT ROYALE — THE TWO HOMES

   One route, two layouts. A stranger gets the public page; a signed-in
   player gets their board. The old landing was a single page with nine
   sections that showed and hid, which meant every section had to be
   written to work in both states and none of them did it well.

   Requires: categories.js, tokens.css, app.css.
   Called by auth.js on every auth state change, and once on load.
   ============================================================ */

/* Which home to show.
 *
 * realUser() rather than firebase.auth().currentUser: every player holds
 * an anonymous uid so the server can grade them, and an anonymous session
 * is NOT an account. See the note in firebase-config.js. */
function homeFor(user) {
  var pub = document.getElementById('home-public');
  var mem = document.getElementById('home-member');
  if (!pub || !mem) return;
  var signedIn = !!user;
  pub.hidden = signedIn;
  mem.hidden = !signedIn;
  if (signedIn) fillMemberHome(user);
}

/* ── public ───────────────────────────────────────────────── */

/* The five standards. Built from frCategoryList() rather than written out,
   so adding a category never means remembering this page exists. */
function fillStandards() {
  var el = document.getElementById('hp-standards');
  if (!el || !window.frCategoryList) return;
  var blurbs = {
    history:   'Empires to elections',
    sports:    'Records and who broke them',
    music:     'What made it matter',
    geography: 'Borders, rivers, cities',
    science:   'How the world works'
  };
  el.innerHTML = frCategoryList().map(function (c) {
    return '<div class="standard hue-' + c.slug + '">' +
      '<svg width="30" height="33" viewBox="0 0 20 22" aria-hidden="true">' +
      '<path class="shield-fill shield-line" d="M10 1l8 3v8c0 5-4 8-8 9-4-1-8-4-8-9V4l8-3z" ' +
      'stroke-width="1.2"/></svg>' +
      '<b style="color:var(--hue-ink)">' + c.label + '</b>' +
      '<i>' + (blurbs[c.slug] || '') + '</i></div>';
  }).join('');
}

/* ── member ───────────────────────────────────────────────── */

function fillMemberHome(user) {
  var name = document.getElementById('hm-name');
  if (name) name.textContent = (user.displayName || 'You').split(' ')[0];

  var d = document.getElementById('hm-date');
  if (d) {
    d.textContent = new Date().toLocaleDateString('en-GB',
      { weekday: 'long', day: 'numeric', month: 'long' });
  }

  var st = document.getElementById('hm-streak');
  if (st && typeof getStreak === 'function') st.textContent = getStreak();

  // Played today already? Then the hero says so instead of inviting them.
  var played = (typeof alreadyPlayedToday === 'function') && alreadyPlayedToday();
  var state = document.getElementById('hm-state');
  var play  = document.getElementById('hm-play');
  if (played) {
    if (state) state.textContent = 'are done.';
    if (play)  play.textContent  = 'See today’s results →';
  } else {
    if (state) state.textContent = 'are ready.';
    if (play)  play.textContent  = 'Play today →';
  }

  fillRecord(user);
  fillGrid(user);
}

/* Record by category, from the profile written by auth.js. Reads the
   canonical list so the order is the same everywhere and a category with
   no answers yet still appears, at zero, rather than silently missing. */
function renderRecord(stats) {
  var el = document.getElementById('hm-record');
  if (!el || !window.frCategoryList) return;
  el.innerHTML = frCategoryList().map(function (c) {
    var s   = stats[c.slug] || { correct: 0, played: 0 };
    var pct = s.played ? Math.round(s.correct / s.played * 100) : 0;
    return '<div class="rec hue-' + c.slug + '">' +
      '<span class="rec__n">' + c.label + '</span>' +
      '<span class="rec__bar"><i style="width:' + pct + '%"></i></span>' +
      '<span class="rec__pc">' + (s.played ? pct : '—') + '</span></div>';
  }).join('');
}

/* Read the real profile.
 *
 * This used to read window.FR_CATEGORY_STATS — a global that is read here
 * and written NOWHERE. Every category therefore rendered an em-dash, on a
 * panel whose entire job is to show the numbers, for an account that had
 * the numbers. It failed silently because an empty object is a perfectly
 * valid thing to render zeros from.
 *
 * users/{uid}.categoryStats is the real source, written by auth.js. It is
 * keyed by DISPLAY NAME ('Music/Movies'), and historic documents still
 * carry the retired 'Pop Culture', so every key goes through frCategory()
 * to reach a slug. Two old keys landing on one slug are summed rather
 * than one silently winning. */
function fillRecord(user) {
  var empty = {};
  if (!user || typeof db === 'undefined') { renderRecord(empty); return; }

  renderRecord(empty);   // paint zeros now; correct them when the read lands

  db.collection('users').doc(user.uid).get().then(function (snap) {
    var raw = (snap.exists && snap.data().categoryStats) || {};
    var bySlug = {};
    Object.keys(raw).forEach(function (name) {
      var slug = frCategory(name).slug;
      if (!bySlug[slug]) bySlug[slug] = { correct: 0, played: 0 };
      bySlug[slug].correct += (raw[name].correct || 0);
      bySlug[slug].played  += (raw[name].played  || 0);
    });
    renderRecord(bySlug);
  }).catch(function () { /* zeros already on screen */ });
}

/* Thirty days of history, and the missed ones as something to click.
 *
 * getCompletedDates is async and lives in auth.js. If it is unavailable or
 * fails, the grid renders empty rather than throwing — a home page that
 * will not load because a stats query failed is a worse outcome than a
 * home page with a blank strip on it. */
function fillGrid(user) {
  var grid = document.getElementById('hm-grid');
  if (!grid) return;

  var days = [];
  var today = (typeof getTodayKey === 'function') ? getTodayKey()
            : new Date().toISOString().slice(0, 10);
  var t = new Date(today + 'T00:00:00Z');
  for (var i = 29; i >= 0; i--) {
    var d = new Date(t); d.setUTCDate(d.getUTCDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }

  function paint(done) {
    // A missed day in the strip is playable, so it is a link. The played
    // ones and today are not — there is nothing to go to.
    grid.innerHTML = days.map(function (key) {
      var cls = 'day';
      var missedDay = false;
      if (key === today)                  cls += ' day--today';
      else if (done.indexOf(key) !== -1)  cls += ' day--played';
      else if (done.length)             { cls += ' day--missed'; missedDay = true; }
      return missedDay
        ? '<a class="' + cls + '" href="?date=' + key + '&autostart=1" title="Play ' + key + '"></a>'
        : '<i class="' + cls + '" title="' + key + '"></i>';
    }).join('');

    var missed = days.filter(function (k) {
      return k !== today && done.indexOf(k) === -1;
    });
    var box = document.getElementById('hm-missed');
    var cnt = document.getElementById('hm-missed-count');
    if (cnt) cnt.textContent = missed.length ? missed.length + ' missed' : 'all caught up';
    if (box) {
      box.innerHTML = missed.length
        // autostart=1 is NOT optional here.
        //
        // These linked to "?date=" alone, and ?date= on its own only sets
        // the archive date and then shows the landing screen — which, on a
        // signed-in player, is this very page. So every catch-up pill sent
        // you back to where you clicked it. The whole affordance was a
        // dead end, and it looked like a slow page rather than a bug.
        //
        // quiz.js reads autostart and starts the archive quiz once auth
        // resolves; see the dateParam block near the end of that file.
        ? missed.slice(-6).reverse().map(function (k) {
            var dd = new Date(k + 'T00:00:00Z');
            return '<a class="daypill" href="?date=' + k + '&autostart=1">' +
              '<span class="seal">&times;</span>' +
              dd.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) +
              '</a>';
          }).join('')
        : '<div class="card__note" style="margin-top:0">Nothing missed in the last thirty days.</div>';
    }
  }

  if (user && typeof getCompletedDates === 'function') {
    getCompletedDates(user.uid).then(paint).catch(function () { paint([]); });
  } else {
    paint([]);
  }
}

/* Wire the buttons once. The quiz entry points already exist; these just
   call them rather than reimplementing anything. */
function wireHome() {
  fillStandards();
  // The public buttons always start the quiz.
  ['hp-play', 'hp-play-2'].forEach(function (id) {
    var b = document.getElementById(id);
    if (b) b.onclick = function () { if (typeof startQuiz === 'function') startQuiz(); };
  });

  /* The member button is two buttons wearing one coat.
   *
   * fillMemberHome() relabels it to "See today's results" once the day is
   * played, but this wiring ran at DOMContentLoaded and bound startQuiz
   * unconditionally — so the button said results and delivered the quiz.
   * Decide at CLICK time, not at bind time: wireHome runs once, the
   * played/not-played state changes under it. */
  var mp = document.getElementById('hm-play');
  if (mp) mp.onclick = function () {
    var played = (typeof alreadyPlayedToday === 'function') && alreadyPlayedToday();
    if (played) {
      if (typeof showRecordedResults === 'function' && typeof getTodayKey === 'function') {
        showRecordedResults(getTodayKey());
      } else if (typeof showResultsFromStorage === 'function') {
        showResultsFromStorage();
      }
      return;
    }
    if (typeof startQuiz === 'function') startQuiz();
  };
  var si = document.getElementById('hp-signin');
  if (si) si.onclick = function (e) {
    e.preventDefault();
    var m = document.getElementById('auth-modal');
    if (m) m.style.display = 'flex';
  };
  var yd = document.getElementById('hm-yesterday');
  if (yd) yd.onclick = function () {
    var d = new Date(); d.setDate(d.getDate() - 1);
    location.search = '?date=' + d.toISOString().slice(0, 10);
  };
}

/* Do not guess which home to show before auth has answered.
 *
 * This used to call homeFor(realUser()) immediately. Firebase restores a
 * persisted session asynchronously, so currentUser is null for the first
 * moment of every page load — which meant every returning player was shown
 * the marketing page first and swapped to their own board once auth
 * resolved. On a slow connection that was measured at ten seconds of the
 * wrong page. auth.js carries a comment claiming a returning player "never
 * sees the marketing page flash first"; this is the line that made that
 * false.
 *
 * So: show neither until the answer arrives. auth.js's onAuthStateChanged
 * calls homeFor() the moment it does.
 *
 * The timeout is the safety net. If auth.js is absent, broken, or Firebase
 * never answers, the public home is the correct thing to fall back to — a
 * stranger is the safe assumption, and an empty page is not an option.
 * Two seconds is long enough that a normal resolution wins the race and
 * short enough that a failure is not a stall. */
document.addEventListener('DOMContentLoaded', function () {
  wireHome();

  var pub = document.getElementById('home-public');
  var mem = document.getElementById('home-member');
  var u   = (typeof realUser === 'function') ? realUser() : null;

  if (u) { homeFor(u); return; }          // already resolved — no wait

  if (pub && mem) { pub.hidden = true; mem.hidden = true; }

  setTimeout(function () {
    // Still undecided? Nothing is going to decide it. Show the stranger's
    // page. homeFor() will correct it if auth answers late.
    if (pub && pub.hidden && mem && mem.hidden) homeFor(null);
  }, 2000);
});
