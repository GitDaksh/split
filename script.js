/* ═══════════════════════════════════════════════════════
   SplitOrDie — script.js
   Groups · Notes · Images · WhatsApp · Undo · Shortcuts
   Dark/Light mode · Polished micro-interactions
   ═══════════════════════════════════════════════════════ */

/* ── CONSTANTS ──────────────────────────────────── */
const GROUP_EMOJIS = ['🏖️','🍕','✈️','🏠','🎉','🍺','🎮','🏕️','🛍️','🎬','🚗','💼','🎵','⚽','🌴'];
const STORAGE_KEY  = 'splitOrDie_v3';

const FX = {
  addExpense:   [{i:'😈',m:'Expense added. Chaos begins.'},{i:'💀',m:"Logged. Friendship won't survive."},{i:'💸',m:"Someone's crying inside."},{i:'🫠',m:'Who does this to their friends?'}],
  addFriend:    [{i:'👋',m:'New freeloader detected.'},{i:'🕵️',m:'Trustworthy? No.'},{i:'😐',m:'Another suspect joins the squad.'}],
  removeFriend: [{i:'✂️',m:'Friendship deleted. Dramatic.'},{i:'🫡',m:'Erased from history.'}],
  deleteExp:    [{i:'🧹',m:"What expense? Never heard of it."},{i:'🤫',m:"We don't talk about this."}],
  copied:       [{i:'📋',m:'Copied! Go shame them.'},{i:'✅',m:'Name and shame time.'}],
  reset:        [{i:'🔥',m:'Everything burned. Fresh slate.'}],
  undo:         [{i:'↩',m:'Last action undone. Revisionist.'},{i:'🕰️',m:'Time reversed. Suspicious.'}],
  newGroup:     [{i:'🎉',m:'New group created. Fresh drama.'},{i:'📁',m:'New group, same chaos.'}],
};

const QUIP  = a => a<100?'Small money, big awkwardness.':a<300?'Stop freeloading 😭':a<700?'Pay up or we fight 👊':a<1500?"Bro you're broke 💀":'We need to talk. 🚨';
const EMOJI = a => a<100?'😌':a<500?'😬':a<1000?'😰':a<3000?'💀':'☠️';
const OWES  = a => a<100?'😌':a<500?'😅':a<1000?'😭':a<2000?'💀':'☠️';

/* ── STATE ──────────────────────────────────────── */
/*
  state = {
    theme: 'dark'|'light',
    activeGroup: <id>,
    groups: [{ id, name, emoji, friends:[], expenses:[] }]
  }
  expense = { id, desc, amount, payer, participants, date, notes, imageData }
*/
let state = { theme: 'dark', activeGroup: null, groups: [] };

// Undo stack — stores { snapshot, description } snapshots of state
let undoStack = [];
const MAX_UNDO = 20;

// Currently active detail expense id
let detailExpenseId = null;
// Image data URI for current add-expense form
let pendingImageData = null;
// Currently editing group id (null = creating new)
let editingGroupId   = null;
// Selected group emoji for picker
let selectedGroupEmoji = GROUP_EMOJIS[0];

/* ── PERSISTENCE ────────────────────────────────── */
function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch(_) {}
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Migration: if old format detected
      if (!parsed.groups) {
        const oldState = parsed;
        state.theme = 'dark';
        state.groups = [{
          id: 1, name: 'Default', emoji: '💸',
          friends: oldState.friends || [],
          expenses: (oldState.expenses || []).map(e => ({...e, notes:'', imageData:null}))
        }];
        state.activeGroup = 1;
      } else {
        state = parsed;
      }
    }
  } catch(_) {}
}

/* ── UNDO ───────────────────────────────────────── */
function pushUndo(description) {
  undoStack.push({ snapshot: JSON.stringify(state), description });
  if (undoStack.length > MAX_UNDO) undoStack.shift();
  updateUndoBtn();
}

function performUndo() {
  if (!undoStack.length) return;
  const { snapshot, description } = undoStack.pop();
  state = JSON.parse(snapshot);
  save();
  renderAll();
  updateUndoBtn();
  const t = rand(FX.undo);
  toast(t.i, `${t.m} (${description})`);
}

function updateUndoBtn() {
  const btn = id('undo-btn');
  if (!btn) return;
  btn.disabled = undoStack.length === 0;
  if (undoStack.length > 0) btn.classList.add('undo-pulse');
  else btn.classList.remove('undo-pulse');
}

/* ── GROUP HELPERS ──────────────────────────────── */
function activeGroup() {
  return state.groups.find(g => g.id === state.activeGroup) || state.groups[0] || null;
}

function createDefaultGroup() {
  const g = { id: Date.now(), name: 'My Group', emoji: '💸', friends: [], expenses: [] };
  state.groups.push(g);
  state.activeGroup = g.id;
}

function newGroup(name, emoji) {
  pushUndo('new group');
  const g = { id: Date.now(), name: name.trim() || 'New Group', emoji: emoji || '🎉', friends: [], expenses: [] };
  state.groups.push(g);
  state.activeGroup = g.id;
  save();
  renderAll();
  const t = rand(FX.newGroup);
  toast(t.i, t.m);
}

function deleteGroup(gid) {
  if (state.groups.length <= 1) { toast('🛑', "Can't delete the last group."); return; }
  pushUndo('delete group');
  state.groups = state.groups.filter(g => g.id !== gid);
  state.activeGroup = state.groups[0].id;
  save();
  renderAll();
  toast('🗑️', 'Group deleted. Moving on.');
}

function switchGroup(gid) {
  state.activeGroup = gid;
  save();
  renderGroupTabs();
  renderAll();
}

/* ── THEME ──────────────────────────────────────── */
function applyTheme(theme) {
  state.theme = theme;
  document.documentElement.setAttribute('data-theme', theme);
  id('theme-btn').textContent = theme === 'dark' ? '🌙' : '☀️';
}

function toggleTheme() {
  applyTheme(state.theme === 'dark' ? 'light' : 'dark');
  save();
}

/* ── TOAST ──────────────────────────────────────── */
function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function toast(icon, msg) {
  const c = id('toast-container');
  const t = document.createElement('div');
  t.className = 'toast';
  t.innerHTML = `<span class="toast-icon">${icon}</span><span>${esc(msg)}</span>`;
  c.appendChild(t);
  setTimeout(() => {
    t.classList.add('removing');
    t.addEventListener('animationend', () => t.remove(), { once: true });
  }, 3200);
}

/* ── FRIENDS ────────────────────────────────────── */
function addFriend() {
  const inp = id('friend-input');
  const name = inp.value.trim();
  if (!name) return;
  const g = activeGroup();
  if (!g) return;
  if (g.friends.includes(name)) { toast('🤦', `${name} already in the squad.`); return; }
  pushUndo('add friend');
  g.friends.push(name);
  save();
  renderFriends();
  const t = rand(FX.addFriend);
  toast(t.i, t.m);
  inp.value = '';
  inp.focus();
}

function removeFriend(name) {
  const g = activeGroup();
  if (!g) return;
  pushUndo('remove friend');
  g.friends = g.friends.filter(f => f !== name);
  g.expenses = g.expenses.filter(e => {
    if (e.payer === name) return false;
    e.participants = e.participants.filter(p => p !== name);
    return e.participants.length > 0;
  });
  save();
  renderFriends();
  renderExpenses();
  renderBalances();
  const t = rand(FX.removeFriend);
  toast(t.i, t.m);
}

function renderFriends() {
  const g = activeGroup();
  const list  = id('friends-list');
  const empty = id('friends-empty');
  const count = id('friends-count');
  const payer = id('exp-payer');
  if (!g) return;

  const n = g.friends.length;
  count.textContent = n === 0 ? '0 freeloaders' : n === 1 ? '1 freeloader' : `${n} freeloaders`;

  list.querySelectorAll('.friend-chip').forEach(c => c.remove());
  empty.style.display = n === 0 ? 'flex' : 'none';

  if (n > 0) {
    g.friends.forEach(name => {
      const chip = document.createElement('div');
      chip.className = 'friend-chip';
      chip.innerHTML = `<span>${esc(name)}</span>
        <button class="friend-chip-remove" data-name="${esc(name)}" title="Remove">✕</button>`;
      list.appendChild(chip);
    });
  }

  const cur = payer.value;
  payer.innerHTML = '<option value="">— select the victim —</option>';
  g.friends.forEach(name => {
    const o = document.createElement('option');
    o.value = name; o.textContent = name;
    if (name === cur) o.selected = true;
    payer.appendChild(o);
  });

  renderParticipants();
}

/* ── PARTICIPANTS ───────────────────────────────── */
let selectedParticipants = new Set();

function renderParticipants() {
  const g   = activeGroup();
  const con = id('participants-list');
  con.innerHTML = '';
  if (!g || g.friends.length === 0) {
    con.innerHTML = '<p class="select-hint">Add friends first, bestie.</p>';
    return;
  }
  selectedParticipants = new Set([...selectedParticipants].filter(p => g.friends.includes(p)));
  g.friends.forEach(name => {
    const chip = document.createElement('div');
    chip.className = 'participant-chip' + (selectedParticipants.has(name) ? ' selected' : '');
    chip.textContent = name;
    chip.addEventListener('click', () => {
      selectedParticipants.has(name) ? selectedParticipants.delete(name) : selectedParticipants.add(name);
      chip.classList.toggle('selected', selectedParticipants.has(name));
    });
    con.appendChild(chip);
  });
}

/* ── IMAGE HANDLING ─────────────────────────────── */
function initImageUpload() {
  const dropZone = id('file-drop-zone');
  const fileInp  = id('exp-image');
  const preview  = id('image-preview');
  const prevWrap = id('image-preview-wrap');
  const dropText = id('file-drop-text');
  const removeBtn= id('image-remove-btn');

  dropZone.addEventListener('click', () => fileInp.click());

  fileInp.addEventListener('change', () => {
    const file = fileInp.files[0];
    if (file) loadImageFile(file);
  });

  dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
  dropZone.addEventListener('drop', e => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) loadImageFile(file);
  });

  removeBtn.addEventListener('click', () => {
    pendingImageData = null;
    prevWrap.style.display = 'none';
    dropZone.style.display = 'flex';
    dropText.textContent = 'Click to attach image';
    fileInp.value = '';
  });

  function loadImageFile(file) {
    const reader = new FileReader();
    reader.onload = e => {
      pendingImageData = e.target.result;
      preview.src = pendingImageData;
      prevWrap.style.display = 'block';
      dropZone.style.display = 'none';
      dropText.textContent = file.name;
    };
    reader.readAsDataURL(file);
  }
}

function resetImageUpload() {
  pendingImageData = null;
  const prevWrap  = id('image-preview-wrap');
  const dropZone  = id('file-drop-zone');
  const dropText  = id('file-drop-text');
  const fileInp   = id('exp-image');
  const preview   = id('image-preview');
  prevWrap.style.display = 'none';
  dropZone.style.display = 'flex';
  dropText.textContent = 'Click to attach image';
  fileInp.value = '';
  preview.src = '';
}

/* ── EXPENSES ───────────────────────────────────── */
function addExpense() {
  const g = activeGroup();
  if (!g) return;

  const desc  = id('exp-desc').value.trim();
  const amount= parseFloat(id('exp-amount').value);
  const payer = id('exp-payer').value;
  const notes = id('exp-notes').value.trim();
  const dateVal = id('exp-date').value || new Date().toISOString().split('T')[0];
  const participants = [...selectedParticipants];

  if (!desc)                { toast('🤨', 'Give this disaster a name.'); return; }
  if (!amount || amount<=0) { toast('💰', 'Enter a real amount, genius.'); return; }
  if (!payer)               { toast('👉', 'Who paid? Someone has to take the L.'); return; }
  if (!participants.length) { toast('🙃', "Select who's splitting."); return; }

  pushUndo('add expense');

  g.expenses.unshift({
    id: Date.now(), desc, amount, payer, participants,
    date: dateVal, notes, imageData: pendingImageData
  });

  save();
  renderExpenses();
  renderBalances();

  // Reset form
  id('exp-desc').value = '';
  id('exp-amount').value = '';
  id('exp-payer').value = '';
  id('exp-notes').value = '';
  id('exp-date').value = '';
  selectedParticipants.clear();
  renderParticipants();
  resetImageUpload();

  const t = rand(FX.addExpense);
  toast(t.i, t.m);
}

function deleteExpense(eid) {
  const g = activeGroup();
  if (!g) return;
  pushUndo('delete expense');
  const el = document.querySelector(`[data-expense-id="${eid}"]`);
  if (el) {
    el.classList.add('removing-item');
    el.addEventListener('animationend', () => {
      g.expenses = g.expenses.filter(e => e.id !== eid);
      save();
      renderExpenses();
      renderBalances();
    }, { once: true });
  }
  const t = rand(FX.deleteExp);
  toast(t.i, t.m);
}

function renderExpenses() {
  const g    = activeGroup();
  const list  = id('expense-list');
  const empty = id('expenses-empty');
  const count = id('expenses-count');
  const expenses = g ? g.expenses : [];

  const n = expenses.length;
  count.textContent = n === 0 ? '0 regrets' : n === 1 ? '1 regret' : `${n} regrets`;

  list.querySelectorAll('.expense-item').forEach(i => i.remove());
  empty.style.display = n === 0 ? 'flex' : 'none';

  let total = 0;
  expenses.forEach(exp => {
    total += exp.amount;
    const item = document.createElement('div');
    item.className = 'expense-item';
    item.dataset.expenseId = exp.id;
    const perHead = (exp.amount / exp.participants.length).toFixed(2);
    const dateStr = exp.date ? new Date(exp.date).toLocaleDateString('en-IN', { day:'2-digit', month:'short' }) : '';
    item.innerHTML = `
      <span class="expense-emoji">${EMOJI(exp.amount)}</span>
      <div class="expense-info">
        <div class="expense-desc">${esc(exp.desc)}</div>
        <div class="expense-meta">
          ${esc(exp.payer)} paid · ₹${perHead}/head · ${exp.participants.length} ppl
          ${dateStr ? `· ${dateStr}` : ''}
          ${exp.notes ? '<span class="expense-has-note" title="Has notes">📝</span>' : ''}
          ${exp.imageData ? '<span class="expense-has-image" title="Has receipt">📎</span>' : ''}
        </div>
      </div>
      <span class="expense-amount">₹${fmt(exp.amount)}</span>
      <button class="expense-delete" data-id="${exp.id}" title="Delete (or click row for details)">✕</button>
    `;
    // Click row → open detail modal
    item.addEventListener('click', e => {
      if (!e.target.closest('.expense-delete')) openDetailModal(exp.id);
    });
    list.appendChild(item);
  });

  updateTotalBar(total);
}

/* ── DETAIL MODAL ───────────────────────────────── */
function openDetailModal(eid) {
  const g   = activeGroup();
  const exp = g && g.expenses.find(e => e.id === eid);
  if (!exp) return;
  detailExpenseId = eid;

  id('detail-modal-title').textContent = exp.desc;

  const body = id('detail-modal-body');
  body.innerHTML = '';

  const dateStr = exp.date ? new Date(exp.date).toLocaleDateString('en-IN', { dateStyle: 'medium' }) : '—';

  // Fields
  const fields = [
    ['Amount', `₹${fmt(exp.amount)}`],
    ['Paid by', exp.payer],
    ['Split between', exp.participants.join(', ')],
    ['Per head', `₹${(exp.amount / exp.participants.length).toFixed(2)}`],
    ['Date', dateStr],
  ];
  fields.forEach(([label, val]) => {
    const s = document.createElement('div');
    s.className = 'detail-section';
    s.innerHTML = `<span class="detail-label">${label}</span><span class="detail-value">${esc(val)}</span>`;
    body.appendChild(s);
  });

  // Notes editor
  const notesSec = document.createElement('div');
  notesSec.className = 'detail-section';
  notesSec.innerHTML = `<span class="detail-label">Notes</span>
    <textarea class="input textarea" id="detail-notes" placeholder="Add context…" rows="3" maxlength="300">${esc(exp.notes || '')}</textarea>`;
  body.appendChild(notesSec);

  // Image
  if (exp.imageData) {
    const imgSec = document.createElement('div');
    imgSec.className = 'detail-section';
    imgSec.innerHTML = `<span class="detail-label">Receipt</span>
      <img src="${exp.imageData}" class="detail-image" alt="Receipt" title="Click to open full size"/>`;
    imgSec.querySelector('img').addEventListener('click', () => window.open(exp.imageData));
    body.appendChild(imgSec);
  }

  openModal('expense-detail-modal');
}

function saveDetailNotes() {
  const g = activeGroup();
  if (!g || !detailExpenseId) return;
  const exp = g.expenses.find(e => e.id === detailExpenseId);
  if (!exp) return;
  exp.notes = id('detail-notes')?.value?.trim() || '';
  save();
  renderExpenses();
  closeModal('expense-detail-modal');
  toast('💾', 'Notes saved.');
}

/* ── BALANCES ───────────────────────────────────── */
function calcBalances() {
  const g = activeGroup();
  if (!g) return [];
  const net = {};
  g.friends.forEach(f => net[f] = 0);
  g.expenses.forEach(exp => {
    const share = exp.amount / exp.participants.length;
    exp.participants.forEach(p => { net[p] = roundCur((net[p]||0) - share); });
    net[exp.payer] = roundCur((net[exp.payer]||0) + exp.amount);
  });

  const cred = [], debt = [];
  Object.entries(net).forEach(([name, bal]) => {
    if (bal > 0.01)  cred.push({ name, amount: bal });
    if (bal < -0.01) debt.push({ name, amount: -bal });
  });
  cred.sort((a,b) => b.amount - a.amount);
  debt.sort((a,b) => b.amount - a.amount);

  const txns = [];
  while (cred.length && debt.length) {
    const c = cred[0], d = debt[0];
    const amt = roundCur(Math.min(c.amount, d.amount));
    txns.push({ from: d.name, to: c.name, amount: amt });
    c.amount = roundCur(c.amount - amt);
    d.amount = roundCur(d.amount - amt);
    if (c.amount <= 0.01) cred.shift();
    if (d.amount <= 0.01) debt.shift();
  }
  return txns;
}

function renderBalances() {
  const g    = activeGroup();
  const list  = id('balance-list');
  const empty = id('balances-empty');
  const expenses = g ? g.expenses : [];

  list.querySelectorAll('.balance-item, .balance-settled').forEach(i => i.remove());

  if (!expenses.length || !g?.friends.length) {
    empty.style.display = 'flex'; return;
  }
  empty.style.display = 'none';

  const txns = calcBalances();
  if (!txns.length) {
    const s = document.createElement('div');
    s.className = 'balance-settled';
    s.textContent = "✓ Everyone's even. Legendary.";
    list.appendChild(s);
    return;
  }

  txns.forEach(txn => {
    const item = document.createElement('div');
    item.className = 'balance-item';
    item.innerHTML = `
      <span class="balance-emoji">${OWES(txn.amount)}</span>
      <div class="balance-text">
        <strong>${esc(txn.from)}</strong> owes <strong>${esc(txn.to)}</strong>
        <span class="balance-quip">${QUIP(txn.amount)}</span>
      </div>
      <span class="balance-amount">₹${fmt(txn.amount)}</span>
    `;
    list.appendChild(item);
  });
}

/* ── TOTAL BAR ──────────────────────────────────── */
let _totalBarEl = null;
function ensureTotalBar() {
  if (_totalBarEl && _totalBarEl.isConnected) return _totalBarEl;
  const section = id('expenses-section');
  if (!section) return null;
  _totalBarEl = section.querySelector('.total-bar');
  if (!_totalBarEl) {
    _totalBarEl = document.createElement('div');
    _totalBarEl.className = 'total-bar';
    _totalBarEl.innerHTML = `<span class="total-label">total damage</span><span class="total-amount">₹0</span>`;
    section.appendChild(_totalBarEl);
  }
  return _totalBarEl;
}

function updateTotalBar(total = 0) {
  const bar = ensureTotalBar();
  if (!bar) return;
  bar.style.display = total > 0 ? 'flex' : 'none';
  const el = bar.querySelector('.total-amount');
  if (el) el.textContent = `₹${fmt(total)}`;
}

/* ── SETTLE MODAL ───────────────────────────────── */
function renderSettleModal() {
  const txns = calcBalances();
  const body = id('modal-body');
  body.innerHTML = '';

  if (!txns.length) {
    body.innerHTML = '<div class="modal-all-settled">🎉 Everyone\'s even. Go celebrate.</div>';
  } else {
    txns.forEach(txn => {
      const item = document.createElement('div');
      item.className = 'modal-settle-item';
      item.innerHTML = `
        <span class="modal-settle-emoji">${OWES(txn.amount)}</span>
        <div class="modal-settle-text"><strong>${esc(txn.from)}</strong> → <strong>${esc(txn.to)}</strong></div>
        <span class="modal-settle-amount">₹${fmt(txn.amount)}</span>
      `;
      body.appendChild(item);
    });
  }
  openModal('settle-modal');
}

/* ── WHATSAPP SHARE ─────────────────────────────── */
function buildSummaryText() {
  const g = activeGroup();
  if (!g) return '';
  const txns  = calcBalances();
  const total = g.expenses.reduce((s,e) => s + e.amount, 0);
  const lines = [
    `💸 *SplitOrDie — ${g.emoji} ${g.name}*`,
    `_Generated ${new Date().toLocaleDateString('en-IN', { dateStyle:'medium' })}_`,
    '',
    `*Squad:* ${g.friends.join(', ') || 'None'}`,
    `*Total damage:* ₹${fmt(total)}`,
    '',
    '*Expenses:*',
    ...g.expenses.slice().reverse().map(e =>
      `• ${e.desc} — ₹${fmt(e.amount)} (${e.payer} paid, ${e.participants.length} ppl)`
    ),
    '',
    '*Who owes what:*',
    ...(txns.length
      ? txns.map(t => `• ${t.from} → ${t.to}: ₹${fmt(t.amount)}`)
      : ['Everyone is even! 🎉']
    ),
    '',
    '_— SplitOrDie™_'
  ];
  return lines.join('\n');
}

function shareWhatsApp() {
  const text = buildSummaryText();
  const url  = `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank');
}

/* ── COPY ───────────────────────────────────────── */
function copyToClipboard(text) {
  const ok = () => { const t = rand(FX.copied); toast(t.i, t.m); };
  const fail = () => toast('⚠️', 'Could not copy. Screenshot it.');
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(ok).catch(fail);
  } else {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); ok(); } catch(_) { fail(); }
    ta.remove();
  }
}

/* ── GROUP TABS UI ──────────────────────────────── */
function renderGroupTabs() {
  const container = id('group-tabs');
  container.innerHTML = '';
  state.groups.forEach(g => {
    const btn = document.createElement('button');
    btn.className = 'group-tab' + (g.id === state.activeGroup ? ' active' : '');
    btn.dataset.gid = g.id;
    btn.innerHTML = `
      <span class="group-tab-icon">${g.emoji}</span>
      <span>${esc(g.name)}</span>
      ${state.groups.length > 1 ? `<button class="group-tab-close" data-gid="${g.id}" title="Delete group">✕</button>` : ''}
    `;
    btn.addEventListener('click', e => {
      if (e.target.closest('.group-tab-close')) return;
      switchGroup(g.id);
    });
    container.appendChild(btn);
  });
}

/* ── GROUP EMOJI PICKER ─────────────────────────── */
function buildGroupEmojiPicker(containerId) {
  const con = id(containerId);
  if (!con) return;
  con.innerHTML = '';
  GROUP_EMOJIS.forEach(em => {
    const d = document.createElement('div');
    d.className = 'emoji-opt' + (em === selectedGroupEmoji ? ' selected' : '');
    d.textContent = em;
    d.addEventListener('click', () => {
      selectedGroupEmoji = em;
      con.querySelectorAll('.emoji-opt').forEach(x => x.classList.remove('selected'));
      d.classList.add('selected');
    });
    con.appendChild(d);
  });
}

/* ── MODALS ─────────────────────────────────────── */
function openModal(mid) {
  const el = id(mid);
  if (el) el.style.display = 'flex';
}

function closeModal(mid) {
  const el = id(mid);
  if (el) el.style.display = 'none';
}

function closeAllModals() {
  document.querySelectorAll('.modal-overlay').forEach(m => m.style.display = 'none');
}

/* ── RENDER ALL ─────────────────────────────────── */
function renderAll() {
  applyTheme(state.theme);
  renderGroupTabs();
  renderFriends();
  renderExpenses();
  renderBalances();
}

/* ── KEYBOARD SHORTCUTS ─────────────────────────── */
function handleKey(e) {
  // Don't fire when typing in inputs
  const tag = document.activeElement.tagName;
  if (['INPUT','TEXTAREA','SELECT'].includes(tag)) {
    if (e.key === 'Escape') { document.activeElement.blur(); closeAllModals(); }
    return;
  }

  // Check no modal is open
  const anyOpen = [...document.querySelectorAll('.modal-overlay')].some(m => m.style.display === 'flex');

  switch (e.key) {
    case 'Escape': closeAllModals(); break;
    case '?':      if (!anyOpen) openModal('shortcuts-modal'); break;
    case 'z': case 'Z': if (!anyOpen && (e.ctrlKey||e.metaKey||true)) performUndo(); break;
    case 'n': case 'N': if (!anyOpen) { id('exp-desc').focus(); } break;
    case 'f': case 'F': if (!anyOpen) { id('friend-input').focus(); } break;
    case 'g': case 'G': if (!anyOpen) { openGroupModal(); } break;
    case 's': case 'S': if (!anyOpen) { renderSettleModal(); } break;
    case 't': case 'T': if (!anyOpen) { toggleTheme(); } break;
  }
}

/* ── GROUP MODAL ────────────────────────────────── */
function openGroupModal(gid = null) {
  editingGroupId = gid;
  selectedGroupEmoji = GROUP_EMOJIS[0];
  id('group-modal-title').textContent = gid ? 'Edit Group' : 'New Group';
  id('group-modal-confirm').textContent = gid ? 'Save Changes' : 'Create Group';
  id('group-name-input').value = gid ? (state.groups.find(g=>g.id===gid)?.name||'') : '';
  buildGroupEmojiPicker('group-emoji-picker');
  if (gid) {
    const g = state.groups.find(x=>x.id===gid);
    if (g) selectedGroupEmoji = g.emoji;
  }
  openModal('group-modal');
  setTimeout(() => id('group-name-input').focus(), 80);
}

function confirmGroupModal() {
  const name  = id('group-name-input').value.trim();
  const emoji = selectedGroupEmoji;
  if (!name) { toast('🤨', 'Give the group a name.'); return; }

  if (editingGroupId) {
    const g = state.groups.find(x=>x.id===editingGroupId);
    if (g) { g.name = name; g.emoji = emoji; }
    save(); renderAll();
    toast('✏️', 'Group updated.');
  } else {
    newGroup(name, emoji);
  }
  closeModal('group-modal');
}

/* ── RESET ──────────────────────────────────────── */
function performReset() {
  const g = activeGroup();
  if (!g) return;
  pushUndo('reset group');
  g.friends  = [];
  g.expenses = [];
  selectedParticipants.clear();
  save();
  renderAll();
  closeModal('reset-modal');
  const t = rand(FX.reset);
  toast(t.i, t.m);
}

/* ── UTILS ──────────────────────────────────────── */
function id(s) { return document.getElementById(s); }
function esc(s) {
  return String(s||'')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function fmt(n = 0) {
  return (Math.round((+n||0)*100)/100).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2});
}
function roundCur(n = 0) { return Math.round((+n||0)*100)/100; }

/* ── BIND EVENTS ────────────────────────────────── */
function bindEvents() {
  // Friends
  id('add-friend-btn').addEventListener('click', addFriend);
  id('friend-input').addEventListener('keydown', e => { if (e.key==='Enter') { e.preventDefault(); addFriend(); } });
  id('friends-list').addEventListener('click', e => {
    const btn = e.target.closest('.friend-chip-remove');
    if (btn) removeFriend(btn.dataset.name);
  });

  // Expense
  id('add-expense-btn').addEventListener('click', addExpense);
  ['exp-desc','exp-amount'].forEach(sid => {
    id(sid)?.addEventListener('keydown', e => { if (e.key==='Enter') { e.preventDefault(); addExpense(); } });
  });
  id('expense-list').addEventListener('click', e => {
    const btn = e.target.closest('.expense-delete');
    if (btn) deleteExpense(Number(btn.dataset.id));
  });

  // Settle & export
  id('settle-btn').addEventListener('click', renderSettleModal);
  id('export-btn').addEventListener('click', () => {
    if (!activeGroup()?.expenses.length) { toast('🫥','Add expenses first.'); return; }
    copyToClipboard(buildSummaryText());
  });
  id('modal-copy-btn').addEventListener('click', () => copyToClipboard(buildSummaryText()));
  id('whatsapp-btn').addEventListener('click', shareWhatsApp);
  id('whatsapp-inline-btn').addEventListener('click', shareWhatsApp);

  // Detail modal
  id('detail-save-btn').addEventListener('click', saveDetailNotes);
  id('detail-delete-btn').addEventListener('click', () => {
    if (detailExpenseId) {
      closeModal('expense-detail-modal');
      deleteExpense(detailExpenseId);
    }
  });

  // Theme & undo
  id('theme-btn').addEventListener('click', toggleTheme);
  id('undo-btn').addEventListener('click', performUndo);
  id('shortcuts-btn').addEventListener('click', () => openModal('shortcuts-modal'));

  // Reset
  id('reset-btn').addEventListener('click', () => openModal('reset-modal'));
  id('reset-cancel').addEventListener('click', () => closeModal('reset-modal'));
  id('reset-confirm').addEventListener('click', performReset);

  // Groups
  id('new-group-btn').addEventListener('click', () => openGroupModal());
  id('group-modal-confirm').addEventListener('click', confirmGroupModal);
  id('group-name-input').addEventListener('keydown', e => { if(e.key==='Enter') confirmGroupModal(); });
  id('group-tabs').addEventListener('click', e => {
    const closeBtn = e.target.closest('.group-tab-close');
    if (closeBtn) deleteGroup(Number(closeBtn.dataset.gid));
  });

  // Modal close buttons (data-close attr)
  document.querySelectorAll('.modal-close[data-close]').forEach(btn => {
    btn.addEventListener('click', () => closeModal(btn.dataset.close));
  });

  // Click overlay to close
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(overlay.id); });
  });

  // Keyboard shortcuts
  window.addEventListener('keydown', handleKey);

  // Cross-tab sync
  window.addEventListener('storage', e => {
    if (e.key === STORAGE_KEY) { load(); renderAll(); }
  });

  // Set today's date default
  id('exp-date').value = new Date().toISOString().split('T')[0];
}

/* ── INIT ───────────────────────────────────────── */
function init() {
  load();
  if (!state.groups || state.groups.length === 0) createDefaultGroup();
  if (!state.activeGroup) state.activeGroup = state.groups[0].id;
  applyTheme(state.theme || 'dark');
  initImageUpload();
  bindEvents();
  renderAll();
  updateUndoBtn();
}

document.addEventListener('DOMContentLoaded', init);