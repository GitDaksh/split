/* ─── STATE ─────────────────────────────────────────────── */
let state = {
  friends: [],
  expenses: []
};

/* ─── PERSISTENCE ────────────────────────────────────────── */
function saveState() {
  try { localStorage.setItem('splitOrDie', JSON.stringify(state)); } catch(_) {}
}

function loadState() {
  try {
    const raw = localStorage.getItem('splitOrDie');
    if (raw) state = JSON.parse(raw);
  } catch(_) { state = { friends: [], expenses: [] }; }
}

/* ─── FUNNY TEXT BANKS ───────────────────────────────────── */
const TOAST_ADD_EXPENSE = [
  { icon: '😈', msg: 'Expense added. Chaos begins.' },
  { icon: '💀', msg: "Logged it. Your friendship won't survive this." },
  { icon: '🤑', msg: 'Money talk. Awkward. Noted.' },
  { icon: '📝', msg: 'Expense recorded. The beef is real now.' },
  { icon: '💸', msg: "Added! Someone's crying inside." },
  { icon: '🫠', msg: 'Noted. Who does this to their friends?' },
];

const TOAST_ADD_FRIEND = [
  { icon: '👋', msg: 'New freeloader detected.' },
  { icon: '🕵️', msg: 'Friend added. Are they trustworthy? No.' },
  { icon: '😐', msg: 'Another suspect joins the squad.' },
  { icon: '🤔', msg: 'Interesting choice of friend, bestie.' },
];

const TOAST_REMOVE_FRIEND = [
  { icon: '✂️', msg: 'Friendship deleted. Dramatic.' },
  { icon: '👀', msg: 'Gone. No refunds on those memories.' },
  { icon: '🫡', msg: 'They have been erased from history.' },
];

const TOAST_DELETE_EXPENSE = [
  { icon: '🧹', msg: 'Expense vanished. What expense?' },
  { icon: '🤫', msg: "We don't talk about this anymore." },
  { icon: '💨', msg: 'Gone with the wind. Sus.' },
];

const TOAST_COPIED = [
  { icon: '📋', msg: 'Copied! Go shame them in the group chat.' },
  { icon: '✅', msg: 'Summary copied. Name and shame time.' },
];

const TOAST_RESET = [
  { icon: '🔥', msg: 'Everything burned. Fresh slate. New lies.' },
];

function randomFrom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

/* ─── EMOJI BY AMOUNT ────────────────────────────────────── */
function amountEmoji(amount) {
  if (amount < 100) return '😌';
  if (amount < 500) return '😬';
  if (amount < 1000) return '😰';
  if (amount < 3000) return '💀';
  return '☠️';
}

function owesEmoji(amount) {
  if (amount < 100) return '😌';
  if (amount < 500) return '😅';
  if (amount < 1000) return '😭';
  if (amount < 2000) return '💀';
  return '☠️';
}

function owesQuip(amount) {
  if (amount < 100) return 'Small money, big awkwardness.';
  if (amount < 300) return 'Stop freeloading 😭';
  if (amount < 700) return 'Pay up or we fight 👊';
  if (amount < 1500) return "Bro you're broke 💀";
  return 'We need to talk. Seriously. 🚨';
}

/* ─── TOAST ──────────────────────────────────────────────── */
function showToast(icon, msg) {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<span class="toast-icon">${icon}</span><span class="toast-msg">${msg}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('removing');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  }, 3200);
}

/* ─── FRIENDS ────────────────────────────────────────────── */
function renderFriends() {
  const list = document.getElementById('friends-list');
  const empty = document.getElementById('friends-empty');
  const count = document.getElementById('friends-count');
  const payer = document.getElementById('exp-payer');

  const n = state.friends.length;
  count.textContent = n === 0 ? '0 freeloaders'
    : n === 1 ? '1 freeloader'
    : `${n} freeloaders`;

  Array.from(list.querySelectorAll('.friend-chip')).forEach(c => c.remove());

  if (n === 0) {
    empty.style.display = 'flex';
  } else {
    empty.style.display = 'none';
    state.friends.forEach(name => {
      const chip = document.createElement('div');
      chip.className = 'friend-chip';
      chip.dataset.name = name;
      chip.innerHTML = `
        <span>${name}</span>
        <button class="friend-chip-remove" data-name="${name}" title="Remove ${name}">✕</button>
      `;
      list.appendChild(chip);
    });
  }

  const currentPayer = payer.value;
  payer.innerHTML = '<option value="">— select the victim —</option>';
  state.friends.forEach(name => {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    if (name === currentPayer) opt.selected = true;
    payer.appendChild(opt);
  });

  renderParticipants();
}

function addFriend() {
  const input = document.getElementById('friend-input');
  const name = input.value.trim();
  if (!name) return;
  if (state.friends.includes(name)) {
    showToast('🤦', `${name} is already in the squad, bro.`);
    return;
  }
  state.friends.push(name);
  saveState();
  renderFriends();
  const t = randomFrom(TOAST_ADD_FRIEND);
  showToast(t.icon, t.msg);
  input.value = '';
  input.focus();
}

function removeFriend(name) {
  state.friends = state.friends.filter(f => f !== name);
  state.expenses = state.expenses.filter(e => {
    if (e.payer === name) return false;
    e.participants = e.participants.filter(p => p !== name);
    return e.participants.length > 0;
  });
  saveState();
  renderFriends();
  renderExpenses();
  renderBalances();
  const t = randomFrom(TOAST_REMOVE_FRIEND);
  showToast(t.icon, t.msg);
}

/* ─── PARTICIPANTS ───────────────────────────────────────── */
let selectedParticipants = new Set();

function renderParticipants() {
  const container = document.getElementById('participants-list');
  container.innerHTML = '';

  if (state.friends.length === 0) {
    container.innerHTML = '<p class="select-hint">Add friends first, bestie.</p>';
    return;
  }

  selectedParticipants = new Set([...selectedParticipants].filter(p => state.friends.includes(p)));

  state.friends.forEach(name => {
    const chip = document.createElement('div');
    chip.className = 'participant-chip' + (selectedParticipants.has(name) ? ' selected' : '');
    chip.textContent = name;
    chip.addEventListener('click', () => {
      if (selectedParticipants.has(name)) {
        selectedParticipants.delete(name);
        chip.classList.remove('selected');
      } else {
        selectedParticipants.add(name);
        chip.classList.add('selected');
      }
    });
    container.appendChild(chip);
  });
}

/* ─── EXPENSES ───────────────────────────────────────────── */
function addExpense() {
  const desc = document.getElementById('exp-desc').value.trim();
  const amount = parseFloat(document.getElementById('exp-amount').value);
  const payer = document.getElementById('exp-payer').value;
  const participants = [...selectedParticipants];

  if (!desc) { showToast('🤨', 'Give this disaster a name first.'); return; }
  if (!amount || amount <= 0) { showToast('💰', 'Enter a real amount, genius.'); return; }
  if (!payer) { showToast('👉', 'Who paid? Someone has to take the L.'); return; }
  if (participants.length === 0) { showToast('🙃', 'Select who\'s splitting. Can\'t split with ghosts.'); return; }

  const expense = {
    id: Date.now(),
    desc,
    amount,
    payer,
    participants,
    perHead: amount / participants.length
  };

  state.expenses.unshift(expense);
  saveState();
  renderExpenses();
  renderBalances();

  document.getElementById('exp-desc').value = '';
  document.getElementById('exp-amount').value = '';
  document.getElementById('exp-payer').value = '';
  selectedParticipants.clear();
  renderParticipants();

  const t = randomFrom(TOAST_ADD_EXPENSE);
  showToast(t.icon, t.msg);
}

function deleteExpense(id) {
  const item = document.querySelector(`[data-expense-id="${id}"]`);
  if (item) {
    item.classList.add('removing-item');
    item.addEventListener('animationend', () => {
      state.expenses = state.expenses.filter(e => e.id !== id);
      saveState();
      renderExpenses();
      renderBalances();
    }, { once: true });
  }
  const t = randomFrom(TOAST_DELETE_EXPENSE);
  showToast(t.icon, t.msg);
}

function renderExpenses() {
  const list = document.getElementById('expense-list');
  const empty = document.getElementById('expenses-empty');
  const count = document.getElementById('expenses-count');

  const n = state.expenses.length;
  count.textContent = n === 0 ? '0 regrets' : n === 1 ? '1 regret' : `${n} regrets`;

  Array.from(list.querySelectorAll('.expense-item')).forEach(i => i.remove());

  if (n === 0) {
    empty.style.display = 'flex';
    updateTotalBar(0);
    return;
  }
  empty.style.display = 'none';

  let total = 0;
  state.expenses.forEach(exp => {
    total += exp.amount;
    const item = document.createElement('div');
    item.className = 'expense-item';
    item.dataset.expenseId = exp.id;
    const perHead = (exp.amount / exp.participants.length).toFixed(2);
    item.innerHTML = `
      <span class="expense-emoji">${amountEmoji(exp.amount)}</span>
      <div class="expense-info">
        <div class="expense-desc">${escHtml(exp.desc)}</div>
        <div class="expense-meta">${escHtml(exp.payer)} paid · ₹${perHead}/head · ${exp.participants.length} ppl</div>
      </div>
      <span class="expense-amount">₹${formatNum(exp.amount)}</span>
      <button class="expense-delete" data-id="${exp.id}" title="Delete">✕</button>
    `;
    list.appendChild(item);
  });

  updateTotalBar(total);
}

/* ─── BALANCE RENDER FIX ─────────────────────────────────── */
function renderBalances() {
  const list = document.getElementById('balance-list');
  const empty = document.getElementById('balances-empty');

  Array.from(list.querySelectorAll('.balance-item, .balance-settled')).forEach(i => i.remove());

  if (state.expenses.length === 0 || state.friends.length === 0) {
    empty.style.display = 'flex';
    return;
  }
  empty.style.display = 'none';

  const txns = calculateBalances();

  if (txns.length === 0) {
    const settled = document.createElement('div');
    settled.className = 'balance-settled';
    settled.textContent = "✓ Everyone's even. Wild.";
    list.appendChild(settled);
    return;
  }

  txns.forEach(txn => {
    const item = document.createElement('div');
    item.className = 'balance-item';
    const emoji = owesEmoji(txn.amount);
    const quip = owesQuip(txn.amount);
    item.innerHTML = `
      <span class="balance-emoji">${emoji}</span>
      <div class="balance-text">
        <strong>${escHtml(txn.from)}</strong> owes <strong>${escHtml(txn.to)}</strong>
        <br/><span style="font-size:0.78rem;color:var(--text-3)">${quip}</span>
      </div>
      <span class="balance-amount">₹${formatNum(txn.amount)}</span>
    `;
    list.appendChild(item);
  });
}

/* ─── INIT ───────────────────────────────────────────────── */
function init() {
  loadState();
  bindEvents();
  renderFriends();
  renderExpenses();
  renderBalances();
}

document.addEventListener('DOMContentLoaded', init);