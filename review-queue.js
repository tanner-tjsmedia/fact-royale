/* FACT ROYALE - REVIEW QUEUE
 *
 * The shared "what changed and what needs me" panel. Loaded by BOTH
 * admin.html and review.html.
 *
 * It lives in one file on purpose. Four separate bugs in this project came
 * from the same shape of mistake - the same rule written out twice and then
 * allowed to drift:
 *
 *   - the admin email, copied into five Firestore rules
 *   - the category chart, keyed 'Pop Culture' in one table and
 *     'Music/Movies' in the other, which threw and killed two panels
 *   - the rig scale, once in the SVG attribute and once in the physics
 *   - the ratio rule, retired in preflight but still reported by review.html
 *
 * So: one renderer, two pages. Not two renderers.
 *
 * Reads static files directly and needs no scan to have been run, because the
 * first thing you want after a sourcing batch is to check that batch.
 */
(function (global) {
  'use strict';

  var FACT_SHARDS = ['facts-src/facts-0001-0499.json'];
  var _facts = null;
  var _questions = null;

  function escH(s) {
    return String(s === null || s === undefined ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function daysAgo(iso) {
    if (!iso) return Infinity;
    var t = Date.parse(iso + 'T00:00:00Z');
    if (isNaN(t)) return Infinity;
    return Math.floor((Date.now() - t) / 86400000);
  }

  function loadFacts() {
    if (_facts) return Promise.resolve(_facts);
    return Promise.all(FACT_SHARDS.map(function (f) {
      return fetch(f, { cache: 'no-store' })
        .then(function (r) { return r.ok ? r.json() : { facts: [] }; })
        .catch(function () { return { facts: [] }; });
    })).then(function (parts) {
      _facts = [];
      parts.forEach(function (p) { _facts = _facts.concat(p.facts || []); });
      return _facts;
    });
  }

  // Uses the index rather than probing every date, so a refresh does not fire
  // two hundred speculative 404s. The cost of that choice: this panel is only
  // as current as questions-src/index.json. Regenerate it with
  // tools/build-index.py after adding or removing a day.
  function loadQuestions() {
    if (_questions) return Promise.resolve(_questions);
    return fetch('questions-src/index.json', { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : { days: [] }; })
      .catch(function () { return { days: [] }; })
      .then(function (idx) {
        var days = (idx.days || []).map(function (d) {
          return typeof d === 'string' ? d : (d && d.date);
        }).filter(Boolean);
        return Promise.all(days.map(function (d) {
          return fetch('questions-src/' + d + '.json', { cache: 'no-store' })
            .then(function (r) { return r.ok ? r.json() : null; })
            .then(function (j) { return j ? { date: d, data: j } : null; })
            .catch(function () { return null; });
        }));
      })
      .then(function (files) {
        _questions = [];
        files.forEach(function (f) {
          if (!f) return;
          (f.data.questions || []).forEach(function (q) {
            _questions.push({ date: f.date, q: q });
          });
        });
        return _questions;
      });
  }

  function card(accent, head, body, answer, refs) {
    return '<div style="border-left:2px solid ' + accent + ';padding:.5rem .8rem;' +
           'margin-bottom:.5rem;background:rgba(255,255,255,.02);border-radius:0 4px 4px 0">' +
           '<div style="font-size:.72rem;opacity:.6">' + head + '</div>' +
           '<div style="margin:.25rem 0">' + escH(body) + '</div>' +
           '<div style="font-size:.8rem;color:#7c7">A: ' + escH(answer) + '</div>' +
           '<div style="font-size:.72rem;opacity:.55;margin-top:.3rem">' +
           (refs && refs.length
              ? refs.map(function (s) { return '<code>' + escH(s) + '</code>'; }).join(' &middot; ')
              : '<span style="color:#c86">no source</span>') +
           '</div></div>';
  }

  function stat(value, label, cls) {
    return '<div style="min-width:120px"><div style="font-size:1.6rem;font-weight:700' +
           (cls ? ';color:' + cls : '') + '">' + value + '</div>' +
           '<div style="font-size:.7rem;letter-spacing:.06em;text-transform:uppercase;' +
           'opacity:.55">' + label + '</div></div>';
  }

  /* render({ into, days, limit })
   * into  - element id to fill
   * days  - recency window, default 7
   * limit - max cards per list, default 40
   */
  function render(opts) {
    opts = opts || {};
    var el = document.getElementById(opts.into || 'review-queue');
    if (!el) return Promise.resolve();
    var win = opts.days || 7;
    var limit = opts.limit || 40;
    el.innerHTML = '<em style="opacity:.6">Loading review queue...</em>';

    return Promise.all([loadFacts(), loadQuestions()]).then(function (res) {
      var facts = res[0], qs = res[1];
      var recentQ = qs.filter(function (x) { return daysAgo(x.q.sourcedAt) <= win; });
      var recentF = facts.filter(function (f) { return daysAgo(f.addedAt) <= win; });
      var unappr  = facts.filter(function (f) { return !f.approvedBy; });
      var unsrc   = qs.filter(function (x) { return !x.q.sourceRefs || !x.q.sourceRefs.length; });

      var h = '<div style="display:flex;gap:1.4rem;flex-wrap:wrap;margin-bottom:1.1rem">' +
        stat(recentQ.length, 'sourced last ' + win + 'd') +
        stat(recentF.length, 'facts added last ' + win + 'd') +
        stat(unappr.length, 'facts awaiting approval', unappr.length ? '#d4af37' : '#6c6') +
        stat(unsrc.length, 'questions unsourced', unsrc.length ? '#d4af37' : '#6c6') +
        '</div>';

      if (recentQ.length) {
        recentQ.sort(function (a, b) {
          return (a.q.sourcedAt < b.q.sourcedAt) ? 1 : -1;
        });
        h += '<h3 style="font-size:.85rem;margin:1rem 0 .5rem">Questions sourced in the last ' +
             win + ' days</h3>';
        recentQ.slice(0, limit).forEach(function (x) {
          h += card('#d4af37',
            escH(x.q.id) + ' &middot; ' + escH(x.date) + ' &middot; ' +
            escH(x.q.category) + ' &middot; sourced ' + escH(x.q.sourcedAt),
            x.q.question, x.q.answer, x.q.sourceRefs);
        });
        if (recentQ.length > limit)
          h += '<div style="font-size:.78rem;opacity:.55">... and ' +
               (recentQ.length - limit) + ' more</div>';
      }

      // approvedBy must be a human and nothing publishes without it, so this
      // list is the actual work queue. It shows even when nothing is recent.
      var list = recentF.length ? recentF : unappr;
      var label = recentF.length
        ? 'Facts added in the last ' + win + ' days'
        : 'Facts awaiting approval (none added in the last ' + win + ' days)';
      if (list.length) {
        h += '<h3 style="font-size:.85rem;margin:1.4rem 0 .5rem">' + label + '</h3>';
        list.slice(0, limit).forEach(function (f) {
          h += card(f.approvedBy ? '#5a5' : '#a85',
            escH(f.id) + ' &middot; ' + escH(f.claimType) + ' &middot; ' +
            escH(f.riskTier) + ' &middot; added ' + escH(f.addedAt || 'unknown') +
            ' &middot; ' + (f.approvedBy
              ? 'approved by ' + escH(f.approvedBy)
              : '<strong style="color:#c86">NOT APPROVED</strong>'),
            f.claim, f.answer, f.sources);
        });
        if (list.length > limit)
          h += '<div style="font-size:.78rem;opacity:.55">... and ' +
               (list.length - limit) + ' more</div>';
      }

      if (!recentQ.length && !list.length)
        h += '<em style="opacity:.6">Nothing changed in that window.</em>';

      el.innerHTML = h;
    }).catch(function (err) {
      el.innerHTML = '<span style="color:#c66">Review queue failed to load. ' +
                     'See console.</span>';
      console.error('review-queue:', err);
    });
  }

  global.FRReviewQueue = { render: render, daysAgo: daysAgo, escH: escH };
})(window);
