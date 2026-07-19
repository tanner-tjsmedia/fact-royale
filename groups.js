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
      listEl.innerHTML =
        '<div class="groups-empty-state">' +
          '<div class="ges-icon"><svg style="height:2.5rem;width:auto;filter:drop-shadow(0 0 8px rgba(212,175,55,0.5))" viewBox="0 0 100 74" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M4,54 L4,40 L18,16 L36,44 L50,4 L64,44 L82,16 L96,40 L96,54 Z" fill="#D4AF37"/><path d="M4,47 L96,47 L96,54 L4,54 Z" fill="rgba(70,44,0,0.28)"/><rect x="4" y="54" width="92" height="17" rx="3" fill="#9A7010"/><rect x="4" y="54" width="92" height="2.5" rx="1.25" fill="rgba(255,220,60,0.55)"/><circle cx="18" cy="16" r="5.5" fill="#FFE47A"/><circle cx="50" cy="4" r="7" fill="#FFE47A"/><circle cx="82" cy="16" r="5.5" fill="#FFE47A"/><circle cx="4" cy="54" r="3" fill="#C4900A"/><circle cx="96" cy="54" r="3" fill="#C4900A"/></svg></div>' +
          '<div class="ges-title">No groups yet</div>' +
          '<p class="ges-desc">Create a group below and share the code with friends. Everyone who joins shows up on your weekly leaderboard.</p>' +
        '</div>';
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

  const memberCount = (group.memberUids || []).length;
  const medals = ['🥇', '🥈', '🥉'];
  const rankClasses = ['gc-lb-rank--1', 'gc-lb-rank--2', 'gc-lb-rank--3'];

  card.innerHTML =
    '<div class="gc-header">' +
      '<div class="gc-meta">' +
        '<h2 class="gc-name">' + group.name + '</h2>' +
        '<span class="gc-member-count">' + memberCount + ' member' + (memberCount !== 1 ? 's' : '') + '</span>' +
      '</div>' +
      '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:0.4rem">' +
        '<button class="gc-invite-btn" onclick="copyInviteLink(\'' + inviteUrl + '\', this)">Copy Invite Link</button>' +
        '<span class="gc-code">Code: <strong>' + group.code + '</strong></span>' +
      '</div>' +
    '</div>' +
    '<div class="gc-week-label">This week — ' + mondayKey + ' to ' + todayKey + '</div>' +
    '<div class="gc-leaderboard">' +
      '<div class="gc-lb-header">' +
        '<span>Player</span><span>Correct</span><span>Days Played</span>' +
      '</div>' +
      ranked.map(function(m, i) {
        var rankDisplay = i < 3 ? medals[i] : (i + 1);
        var rankClass   = i < 3 ? rankClasses[i] : '';
        return '<div class="gc-lb-row' + (m.isMe ? ' gc-lb-row--me' : '') + '">' +
          '<span class="gc-lb-rank ' + rankClass + '">' + rankDisplay + '</span>' +
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
