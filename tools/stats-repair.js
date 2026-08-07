/* ============================================================
   FACT ROYALE — STATS & STREAK REPAIR TOOL
   ============================================================
   HOW TO USE
   1. Open https://tanner-tjsmedia.github.io/fact-royale/ (or your live URL)
   2. Make sure you are SIGNED IN
   3. Open DevTools console (F12 -> Console)
   4. Paste this ENTIRE file, press Enter
   5. Run:  await frDiagnose()          <- read-only, shows what's there
   6. Run:  await frRepair()            <- recomputes everything from quizHistory
      or:   await frRepair({ addDates: [...] })   <- also backfill missing plays

   NOTHING IS WRITTEN until you explicitly call frRepair().
   frDiagnose() is completely safe and read-only.
   ============================================================ */

(function () {

  const CATS = ['History', 'Sports', 'Pop Culture', 'Geography', 'Science & Nature'];

  function _uid() {
    if (typeof auth === 'undefined' || !auth.currentUser) {
      throw new Error('Not signed in. Sign in first, then re-run.');
    }
    return auth.currentUser.uid;
  }

  function _dateAdd(dateStr, days) {
    const d = new Date(dateStr + 'T12:00:00');
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  }

  function _todayKey() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  // Longest run of consecutive dates ending at the most recent date
  function _computeStreaks(dates) {
    if (!dates.length) return { current: 0, longest: 0, last: '' };
    const sorted = [...new Set(dates)].sort();
    const last = sorted[sorted.length - 1];

    // longest run anywhere
    let longest = 1, run = 1;
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] === _dateAdd(sorted[i - 1], 1)) {
        run++;
        longest = Math.max(longest, run);
      } else {
        run = 1;
      }
    }

    // current run = run ending at `last`
    let current = 1;
    for (let i = sorted.length - 1; i > 0; i--) {
      if (sorted[i] === _dateAdd(sorted[i - 1], 1)) current++;
      else break;
    }

    // A streak is only "live" if the last play was today or yesterday
    const today = _todayKey();
    const live = (last === today || last === _dateAdd(today, -1));

    return { current, longest: Math.max(longest, current), last, live };
  }

  // Fetch the real category composition for a given quiz date
  async function _fetchQuizComposition(dateKey) {
    try {
      const res = await fetch(`questions/${dateKey}.json`, { cache: 'no-store' });
      if (!res.ok) return null;
      const data = await res.json();
      const comp = {};
      (data.questions || []).forEach(q => {
        comp[q.category] = (comp[q.category] || 0) + 1;
      });
      return comp;
    } catch (e) {
      return null;
    }
  }

  // Spread `correct` across categories proportionally to their question counts
  function _distribute(comp, correct, total) {
    const cats = Object.keys(comp);
    const out = {};
    let assigned = 0;
    cats.forEach((c, idx) => {
      const share = idx === cats.length - 1
        ? correct - assigned
        : Math.round(correct * (comp[c] / total));
      const val = Math.max(0, Math.min(comp[c], share));
      out[c] = { correct: val, total: comp[c] };
      assigned += val;
    });
    // fix rounding drift
    let drift = correct - Object.values(out).reduce((n, s) => n + s.correct, 0);
    for (const c of cats) {
      if (drift === 0) break;
      if (drift > 0 && out[c].correct < out[c].total) { out[c].correct++; drift--; }
      else if (drift < 0 && out[c].correct > 0)       { out[c].correct--; drift++; }
    }
    return out;
  }

  // ── DIAGNOSTIC (read-only) ────────────────────────────────
  window.frDiagnose = async function () {
    const uid = _uid();
    const userRef = db.collection('users').doc(uid);

    const snap = await userRef.get();
    const data = snap.data() || {};
    const stats = data.stats || {};

    const qhSnap = await userRef.collection('quizHistory').get();
    const plays = [];
    qhSnap.forEach(d => plays.push({ id: d.id, ...d.data() }));
    plays.sort((a, b) => a.date < b.date ? -1 : 1);

    const mhSnap = await userRef.collection('masteryHistory').get();

    const completed = data.completedDates || [];
    const playDates = plays.map(p => p.date);
    const streaks = _computeStreaks(playDates);

    console.log('%c=== FACT ROYALE — DIAGNOSTIC ===', 'font-weight:bold;font-size:14px;color:#D4AF37');
    console.log('User:', auth.currentUser.email, '| uid:', uid);
    console.log('');
    console.log('%cSTORED STATS (what Firestore currently says)', 'font-weight:bold');
    console.table({
      gamesPlayed:       stats.gamesPlayed       ?? 0,
      questionsAnswered: stats.questionsAnswered ?? 0,
      questionsCorrect:  stats.questionsCorrect  ?? 0,
      currentStreak:     stats.currentStreak     ?? 0,
      longestStreak:     stats.longestStreak     ?? 0,
      lastPlayedDate:    stats.lastPlayedDate    || '(none)',
      bestScore:         stats.bestScore         ?? 0,
    });

    console.log('%cACTUAL PLAY RECORDS (quizHistory subcollection)', 'font-weight:bold');
    console.log(`  quizHistory docs:     ${plays.length}`);
    console.log(`  masteryHistory docs:  ${mhSnap.size}`);
    console.log(`  completedDates array: ${completed.length}`);
    console.log(`  date range:           ${playDates[0] || '-'}  ->  ${playDates[playDates.length - 1] || '-'}`);
    console.log('');
    console.log('%cRECOMPUTED FROM quizHistory', 'font-weight:bold;color:#4ade80');
    const totQ = plays.reduce((n, p) => n + (p.total || 0), 0);
    const totC = plays.reduce((n, p) => n + (p.score || 0), 0);
    console.table({
      gamesPlayed:       plays.length,
      questionsAnswered: totQ,
      questionsCorrect:  totC,
      accuracy:          totQ ? `${Math.round(100 * totC / totQ)}%` : '-',
      currentStreak:     streaks.current,
      longestStreak:     streaks.longest,
      lastPlayedDate:    streaks.last,
      streakIsLive:      streaks.live ? 'yes' : 'NO — last play is older than yesterday',
    });

    // Gaps
    if (playDates.length > 1) {
      const gaps = [];
      for (let i = 1; i < playDates.length; i++) {
        let expect = _dateAdd(playDates[i - 1], 1);
        while (expect < playDates[i]) { gaps.push(expect); expect = _dateAdd(expect, 1); }
      }
      const today = _todayKey();
      let after = _dateAdd(playDates[playDates.length - 1], 1);
      while (after <= today) { gaps.push(after); after = _dateAdd(after, 1); }

      if (gaps.length) {
        console.log('');
        console.log(`%cMISSING DATES (${gaps.length}) — no quizHistory record`, 'font-weight:bold;color:#f87171');
        console.log('  ' + gaps.join(', '));
        console.log('');
        console.log('%cIf you actually played these, backfill them like this:', 'color:#D4AF37');
        console.log(`  await frRepair({ addDates: [\n` +
          gaps.slice(0, 3).map(g => `    { date: '${g}', score: 9 },`).join('\n') +
          `\n    ...\n  ] })`);
        window._frGaps = gaps;
        console.log('%c  (the full gap list is saved as window._frGaps)', 'color:#888');
      } else {
        console.log('%cNo gaps — every date from first play to today is recorded.', 'color:#4ade80');
      }
    }

    console.log('');
    console.log('%cCATEGORY STATS (stored vs recomputed)', 'font-weight:bold');
    const storedCat = data.categoryStats || {};
    const recomp = {};
    plays.forEach(p => {
      Object.entries(p.categories || {}).forEach(([c, s]) => {
        if (!recomp[c]) recomp[c] = { played: 0, correct: 0 };
        recomp[c].played += s.total;
        recomp[c].correct += s.correct;
      });
    });
    const catTable = {};
    new Set([...Object.keys(storedCat), ...Object.keys(recomp)]).forEach(c => {
      catTable[c] = {
        'stored played':  storedCat[c]?.played  ?? 0,
        'stored correct': storedCat[c]?.correct ?? 0,
        'true played':    recomp[c]?.played     ?? 0,
        'true correct':   recomp[c]?.correct    ?? 0,
      };
    });
    console.table(catTable);

    console.log('');
    console.log('%cNext step: await frRepair()   (or frRepair({ addDates: [...] }) to backfill)', 'color:#D4AF37;font-weight:bold');

    return { stats, plays, completed, streaks, recomputed: recomp };
  };

  // ── REPAIR (writes) ───────────────────────────────────────
  window.frRepair = async function (opts = {}) {
    const uid = _uid();
    const userRef = db.collection('users').doc(uid);
    const addDates = opts.addDates || [];
    const dryRun = !!opts.dryRun;

    console.log('%c=== REPAIR STARTING ===', 'font-weight:bold;color:#D4AF37');
    if (dryRun) console.log('%cDRY RUN — nothing will be written', 'color:#f0c040');

    // 1. Backfill any manually supplied dates into quizHistory
    for (const entry of addDates) {
      const { date, score } = entry;
      if (!date || typeof score !== 'number') {
        console.warn('  skipping malformed addDates entry:', entry);
        continue;
      }
      let categories = entry.categories;
      let total = entry.total;

      if (!categories) {
        const comp = await _fetchQuizComposition(date);
        if (!comp) {
          console.warn(`  ${date}: could not load quiz file, skipping`);
          continue;
        }
        total = total || Object.values(comp).reduce((n, v) => n + v, 0);
        categories = _distribute(comp, score, total);
      }
      total = total || Object.values(categories).reduce((n, s) => n + s.total, 0);

      console.log(`  backfilling ${date}: ${score}/${total}`,
        Object.entries(categories).map(([c, s]) => `${c.slice(0,4)} ${s.correct}/${s.total}`).join('  '));

      if (!dryRun) {
        await userRef.collection('quizHistory').doc(date).set({
          date, score, total,
          pct: Math.round(100 * score / total),
          isArchive: false,
          backfilled: true,
          timestamp: firebase.firestore.FieldValue.serverTimestamp(),
          categories
        }, { merge: true });
        await userRef.collection('masteryHistory').doc(date).set(categories, { merge: true });
      }
    }

    // 2. Re-read the full (now complete) history
    const qhSnap = await userRef.collection('quizHistory').get();
    const plays = [];
    qhSnap.forEach(d => plays.push({ id: d.id, ...d.data() }));
    plays.sort((a, b) => a.date < b.date ? -1 : 1);

    if (!plays.length) {
      console.warn('No quizHistory records found — nothing to recompute.');
      return;
    }

    // 3. Recompute everything
    const dailyPlays = plays.filter(p => !p.isArchive);
    const playDates  = dailyPlays.map(p => p.date);
    const streaks    = _computeStreaks(playDates);

    const questionsAnswered = plays.reduce((n, p) => n + (p.total || 0), 0);
    const questionsCorrect  = plays.reduce((n, p) => n + (p.score || 0), 0);

    let bestScore = 0, bestScoreDate = '';
    plays.forEach(p => { if ((p.score || 0) > bestScore) { bestScore = p.score; bestScoreDate = p.date; } });

    const categoryStats = {};
    const categoryMastery = {};
    plays.forEach(p => {
      Object.entries(p.categories || {}).forEach(([c, s]) => {
        if (!categoryStats[c])   categoryStats[c]   = { played: 0, correct: 0 };
        categoryStats[c].played  += s.total;
        categoryStats[c].correct += s.correct;
      });
    });

    // Mastery: replay chronologically so perfect-streaks are accurate
    plays.forEach(p => {
      Object.entries(p.categories || {}).forEach(([c, s]) => {
        const prev = categoryMastery[c] || { correct: 0, total: 0, perfectStreak: 0, bestPerfectStreak: 0 };
        const isPerfect = s.total > 0 && s.correct === s.total;
        const newStreak = isPerfect ? (prev.perfectStreak || 0) + 1 : 0;
        categoryMastery[c] = {
          correct:           prev.correct + s.correct,
          total:             prev.total   + s.total,
          perfectStreak:     newStreak,
          bestPerfectStreak: Math.max(prev.bestPerfectStreak || 0, newStreak),
          lastPlayedDate:    p.date,
          level:             (typeof computeTier === 'function')
                               ? computeTier(prev.correct + s.correct, prev.total + s.total).id
                               : (prev.level || 'novice'),
        };
      });
    });

    const masteryScore = (typeof computeMasteryScore === 'function')
      ? computeMasteryScore(categoryMastery)
      : 0;

    const payload = {
      'stats.gamesPlayed':       plays.length,
      'stats.questionsAnswered': questionsAnswered,
      'stats.questionsCorrect':  questionsCorrect,
      'stats.currentStreak':     streaks.current,
      'stats.longestStreak':     streaks.longest,
      'stats.lastPlayedDate':    streaks.last,
      'stats.bestScore':         bestScore,
      'stats.bestScoreDate':     bestScoreDate,
      'completedDates':          [...new Set(plays.map(p => p.date))].sort(),
      'categoryStats':           categoryStats,
      'categoryMastery':         categoryMastery,
      'masteryScore':            masteryScore,
    };

    console.log('');
    console.log('%cWILL WRITE:', 'font-weight:bold;color:#4ade80');
    console.table({
      gamesPlayed:       plays.length,
      questionsAnswered,
      questionsCorrect,
      accuracy:          `${Math.round(100 * questionsCorrect / questionsAnswered)}%`,
      currentStreak:     streaks.current,
      longestStreak:     streaks.longest,
      lastPlayedDate:    streaks.last,
      bestScore:         `${bestScore} (${bestScoreDate})`,
      completedDates:    payload.completedDates.length,
      masteryScore,
    });
    console.table(categoryStats);

    if (dryRun) {
      console.log('%cDRY RUN complete — nothing written. Re-run without dryRun to apply.', 'color:#f0c040;font-weight:bold');
      return payload;
    }

    await userRef.update(payload);

    // Keep localStorage in sync so the landing page doesn't fight the new values
    try {
      localStorage.setItem('fr_streak',     String(streaks.current));
      localStorage.setItem('fr_lastPlayed', streaks.last);
    } catch (e) { /* non-critical */ }

    console.log('');
    console.log('%c=== REPAIR COMPLETE ===', 'font-weight:bold;color:#4ade80;font-size:14px');
    console.log('Reload the page to see updated stats.');
    return payload;
  };

  console.log('%cFact Royale stats tool loaded.', 'color:#D4AF37;font-weight:bold');
  console.log('  await frDiagnose()   — read-only report');
  console.log('  await frRepair()     — recompute + write');
  console.log('  await frRepair({ dryRun: true })  — preview without writing');

})();
