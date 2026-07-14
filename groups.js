/* ===========================
   FACT ROYALE | Groups Logic
   =========================== */

// auth and db are already declared in firebase-config.js
let currentUser = null;

// ── Helpers ────────────────────────────────────────────
function getMondayOfCurrentWeek() {
  const now = new Date();
  const day = now.getDay(); // 0 = Sun, 1 = Mon ...
  const diff = (day === 0) ? -6 : 1 - day; // adjust so Monday = start
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  return monday.toISOString().split('T')[0]; // "2026-07-13"
}

function getTodayKey() {
  return new Date().toISOString().split('T')[0];
}

function generateGroupCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function showError(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.style.display = 'block';
  setTimeout(() => { el.style.display = 'none'; }, 4000);
}

// ── Auth ───────────────────────────────────────────────
auth.onAuthStateChanged(async user => {
  const loading    = document.getElementById('groups-loading');
  const main       = document.getElementById('groups-main');
  const authGate   = document.getElementById('groups-auth-gate');
  const navMenu    = document.getElementById('nav-user-menu');
  const navName    = document.getElementById('nav-user-name');
  const navSignin  = document.getElementById('nav-signin-btn');
  const btnSignout = document.getElementById('btn-signout');

  if (loading) loading.style.display = 'none';

  if (!user) {
    if (authGate)  authGate.style.display  = 'block';
    if (navSignin) navSignin.style.display = 'inline-flex';
    return;
  }

  currentUser = user;
  if (navMenu) navMenu.style.display = 'flex';
  if (navName) navName.textContent = user.displayName || user.email || 'Player';
  if (navSignin) navSignin.style.display = 'none';
  if (btnSignout) btnSignout.onclick = () => auth.signOut().then(() => window.location.href = '/');

  if (main) main.style.display = 'block';
  await loadMyGroups();
});

// ── Load user's groups ─────────────────────────────────
async function loadMyGroups() {
  const listEl = document.getElementById('my-groups-list');
  if (!listEl) return;

  try {
    const snap = await db.collection('groups')
      .where('memberUids', 'array-contains', currentUser.uid)
      .get();

    if (snap.empty) {
      listEl.innerHTML = '<p class="no-groups-msg">You\'re not in any groups yet. Create one or join one below.</p>';
      return;
    }

    listEl.innerHTML = '';
    for (const doc of snap.docs) {
      const group = { id: doc.id, ...doc.data() };
      const card = await buildGroupCard(group);
      listEl.appendChild(card);
    }
  } catch (err) {
    console.error('loadMyGroups error:', err);
  }
}

// ── Build a group card with weekly leaderboard ─────────
async function buildGroupCard(group) {
  const card = document.createElement('div');
  card.className = 'group-card';

  const mondayKey = getMondayOfCurrentWeek();
  const todayKey  = getTodayKey();

  // Fetch this week's scores for group members
  let weeklyTotals = {}; // uid -> { correct, played }
  try {
    const scoresSnap = await db.collection('scores')
      .where('date', '>=', mondayKey)
      .where('date', '<=', todayKey)
      .get();

    scoresSnap.forEach(doc => {
      const d = doc.data();
      if (!(group.memberUids || []).includes(d.uid)) return;
      if (!weeklyTotals[d.uid]) weeklyTotals[d.uid] = { correct: 0, played: 0 };
      weeklyTotals[d.uid].correct += (d.score || 0);
      weeklyTotals[d.uid].played  += 1;
    });
  } catch (err) {
    console.error('scores fetch error:', err);
  }

  // Build ranked list
  const memberNames = group.memberNames || {};
  const ranked = (group.memberUids || []).map(uid => ({
    uid,
    name:    memberNames[uid] || 'Player',
    correct: weeklyTotals[uid] ? weeklyTotals[uid].correct : 0,
    played:  weeklyTotals[uid] ? weeklyTotals[uid].played  : 0,
    isMe:    uid === currentUser.uid
  })).sort((a, b) => b.correct - a.correct);

  const inviteUrl = window.location.origin + '/groups.html?join=' + group.code;

  card.innerHTML =
    '<div class="gc-header">' +
      '<div>' +
        '<h2 class="gc-name">' + group.name + '</h2>' +
        '<span class="gc-code">Code: <strong>' + group.code + '</strong></span>' +
      '</div>' +
      '<button class="gc-invite-btn" onclick="copyInviteLink(\'' + inviteUrl + '\', this)">Copy Invite Link</button>' +
    '</div>' +
    '<div class="gc-week-label">This week — ' + mondayKey + ' to ' + todayKey + '</div>' +
    '<div class="gc-leaderboard">' +
      '<div class="gc-lb-header">' +
        '<span>Player</span><span>Correct</span><span>Played</span>' +
      '</div>' +
      ranked.map(function(m, i) {
        return '<div class="gc-lb-row' + (m.isMe ? ' gc-lb-row--me' : '') + '">' +
          '<span class="gc-lb-rank">' + (i + 1) + '</span>' +
          '<span class="gc-lb-name">' + m.name + (m.isMe ? ' (you)' : '') + '</span>' +
          '<span class="gc-lb-correct">' + m.correct + '</span>' +
          '<span class="gc-lb-played">' + m.played + '</span>' +
        '</div>';
      }).join('') +
    '</div>';

  return card;
}

function copyInviteLink(url, btn) {
  navigator.clipboard.writeText(url).then(function() {
    const orig = btn.textContent;
    btn.textContent = 'Copied!';
    setTimeout(function() { btn.textContent = orig; }, 2000);
  });
}

// ── Create Group ───────────────────────────────────────
async function createGroup() {
  const nameInput = document.getElementById('new-group-name');
  const name = nameInput ? nameInput.value.trim() : '';
  if (!name) { showError('create-error', 'Enter a group name.'); return; }
  if (!currentUser) return;

  try {
    const code = generateGroupCode();
    const displayName = currentUser.displayName || currentUser.email || 'Player';
    const memberNames = {};
    memberNames[currentUser.uid] = displayName;
    await db.collection('groups').add({
      name,
      code,
      createdBy:   currentUser.uid,
      createdAt:   firebase.firestore.FieldValue.serverTimestamp(),
      memberUids:  [currentUser.uid],
      memberNames: memberNames
    });
    if (nameInput) nameInput.value = '';
    await loadMyGroups();
  } catch (err) {
    showError('create-error', 'Could not create group. Try again.');
    console.error(err);
  }
}

// ── Join Group ─────────────────────────────────────────
async function joinGroup() {
  const input = document.getElementById('join-code-input');
  const code  = input ? input.value.trim().toUpperCase() : '';
  if (!code) { showError('join-error', 'Enter a group code.'); return; }
  if (!currentUser) return;

  try {
    const snap = await db.collection('groups').where('code', '==', code).limit(1).get();
    if (snap.empty) { showError('join-error', 'Group not found. Check the code.'); return; }

    const doc   = snap.docs[0];
    const group = doc.data();

    if ((group.memberUids || []).includes(currentUser.uid)) {
      showError('join-error', "You're already in this group.");
      return;
    }

    const displayName = currentUser.displayName || currentUser.email || 'Player';
    const updateData = {
      memberUids: firebase.firestore.FieldValue.arrayUnion(currentUser.uid)
    };
    updateData['memberNames.' + currentUser.uid] = displayName;
    await doc.ref.update(updateData);

    if (input) input.value = '';
    await loadMyGroups();
  } catch (err) {
    showError('join-error', 'Could not join group. Try again.');
    console.error(err);
  }
}

// ── Handle ?join=CODE in URL (from invite link) ────────
window.addEventListener('DOMContentLoaded', function() {
  const params = new URLSearchParams(window.location.search);
  const joinCode = params.get('join');
  if (joinCode) {
    const input = document.getElementById('join-code-input');
    if (input) {
      input.value = joinCode.toUpperCase();
      // Auto-scroll to join card after auth resolves
      setTimeout(function() {
        const card = document.getElementById('join-group-card');
        if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 1200);
    }
  }
});
