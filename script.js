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

/* ─── UTILITIES ─────────────────────────────────────────── */
function escHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatNum(num = 0) {
  const val = Number(num) || 0;
  return val.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function roundCurrency(num = 0) {
  return Math.round((Number(num) || 0) * 100) / 100;
}

let totalBarEl = null;
function ensureTotalBar() {
  if (totalBarEl && totalBarEl.isConnected) return totalBarEl;
  const section = document.getElementById('expenses-section');
  if (!section) return null;
  totalBarEl = section.querySelector('.total-bar');
  if (!totalBarEl) {
    totalBarEl = document.createElement('div');
    totalBarEl.className = 'total-bar';
    totalBarEl.innerHTML = `
      <span class="total-label">total damage</span>
      <span class="total-amount">₹0.00</span>
    `;
    section.appendChild(totalBarEl);
  }
  return totalBarEl;
}

function updateTotalBar(total = 0) {
  const bar = ensureTotalBar();
  if (!bar) return;
  if (!total || total <= 0) {
    bar.style.display = 'none';
    return;
  }
  bar.style.display = 'flex';
  const amountEl = bar.querySelector('.total-amount');
  if (amountEl) amountEl.textContent = `₹${formatNum(total)}`;
}

function summaryTimestamp() {
  try {
    return new Date().toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  } catch (_) {
    return new Date().toISOString();
  }
}

function copyToClipboard(text) {
  if (!text) return;
  const onSuccess = () => {
    const toast = randomFrom(TOAST_COPIED);
    showToast(toast.icon, toast.msg);
  };
  const onError = () => showToast('⚠️', 'Could not copy. Maybe just screenshot it.');

  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(onSuccess).catch(onError);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  try {
    document.execCommand('copy');
    onSuccess();
  } catch (_) {
    onError();
  } finally {
    textarea.remove();
  }
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

function calculateBalances() {
  const balances = {};
  state.friends.forEach(name => { balances[name] = 0; });

  state.expenses.forEach(exp => {
    const share = exp.amount / exp.participants.length;
    exp.participants.forEach(part => {
      balances[part] = roundCurrency((balances[part] || 0) - share);
    });
    balances[exp.payer] = roundCurrency((balances[exp.payer] || 0) + exp.amount);
  });

  const debtors = [];
  const creditors = [];
  Object.entries(balances).forEach(([name, amount]) => {
    if (amount < -0.01) debtors.push({ name, amount: -amount });
    else if (amount > 0.01) creditors.push({ name, amount });
  });

  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const settlements = [];
  while (debtors.length && creditors.length) {
    const debtor = debtors[debtors.length - 1];
    const creditor = creditors[creditors.length - 1];
    const amount = roundCurrency(Math.min(debtor.amount, creditor.amount));
    settlements.push({ from: debtor.name, to: creditor.name, amount });

    debtor.amount = roundCurrency(debtor.amount - amount);
    creditor.amount = roundCurrency(creditor.amount - amount);

    if (debtor.amount <= 0.01) debtors.pop();
    if (creditor.amount <= 0.01) creditors.pop();
  }

  return settlements;
}

function buildSummary(includeSettlements = true) {
  const lines = [];
  lines.push('SplitOrDie — Friends Edition');
  lines.push(`Updated ${summaryTimestamp()}`);
  lines.push('');

  if (state.friends.length) {
    lines.push(`Squad (${state.friends.length}): ${state.friends.join(', ')}`);
  } else {
    lines.push('No friends logged. Mysterious.');
  }

  const total = state.expenses.reduce((sum, e) => sum + e.amount, 0);
  lines.push(`Total damage: ₹${formatNum(total)}`);

  if (state.expenses.length === 0) {
    lines.push('No expenses recorded. Yet.');
  } else {
    lines.push('');
    lines.push('Expenses:');
    state.expenses.slice().reverse().forEach(exp => {
      const perHead = (exp.amount / exp.participants.length).toFixed(2);
      lines.push(`• ${exp.desc} — ₹${formatNum(exp.amount)} | ${exp.payer} paid | ${exp.participants.length} ppl | ₹${perHead}/head`);
    });
  }

  if (includeSettlements) {
    const txns = calculateBalances();
    lines.push('');
    if (txns.length === 0) {
      lines.push('Everyone is square. Miracles happen.');
    } else {
      lines.push('Who owes what:');
      txns.forEach(t => {
        lines.push(`• ${t.from} → ${t.to}: ₹${formatNum(t.amount)}`);
      });
    }
  }

  return lines.join('\n');
}

function buildSettlementsSummary() {
  const lines = [];
  lines.push('SplitOrDie — Settle Up');
  lines.push(`Updated ${summaryTimestamp()}`);
  lines.push('');

  const txns = calculateBalances();
  if (txns.length === 0) {
    lines.push('Everyone is square. Miracles happen.');
  } else {
    txns.forEach(t => {
      lines.push(`${t.from} → ${t.to}: ₹${formatNum(t.amount)}`);
    });
  }

  return lines.join('\n');
}

function renderSettleModal() {
  const overlay = document.getElementById('settle-modal');
  const body = document.getElementById('modal-body');
  if (!overlay || !body) return;

  const txns = calculateBalances();
  body.innerHTML = '';

  if (txns.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'modal-all-settled';
    empty.textContent = 'Everyone is even. Go celebrate?';
    body.appendChild(empty);
  } else {
    txns.forEach(txn => {
      const item = document.createElement('div');
      item.className = 'modal-settle-item';
      item.innerHTML = `
        <span class="modal-settle-emoji">${owesEmoji(txn.amount)}</span>
        <div class="modal-settle-text">
          <strong>${escHtml(txn.from)}</strong> should pay <strong>${escHtml(txn.to)}</strong>
        </div>
        <span class="modal-settle-amount">₹${formatNum(txn.amount)}</span>
      `;
      body.appendChild(item);
    });
  }

  overlay.style.display = 'flex';
}

function closeSettleModal() {
  const overlay = document.getElementById('settle-modal');
  if (overlay) overlay.style.display = 'none';
}

function openResetModal() {
  const overlay = document.getElementById('reset-modal');
  if (overlay) overlay.style.display = 'flex';
}

function closeResetModal() {
  const overlay = document.getElementById('reset-modal');
  if (overlay) overlay.style.display = 'none';
}

function performReset() {
  state = { friends: [], expenses: [] };
  selectedParticipants.clear();
  saveState();
  renderFriends();
  renderExpenses();
  renderBalances();
  const toast = randomFrom(TOAST_RESET);
  showToast(toast.icon, toast.msg);
  closeResetModal();
}

function handleSettleClick() {
  if (state.expenses.length === 0) {
    showToast('🫥', 'Log some chaos before settling anything.');
    return;
  }
  renderSettleModal();
}

function handleExportSummary() {
  const summary = buildSummary(true);
  copyToClipboard(summary);
}

function handleModalCopy() {
  const summary = buildSettlementsSummary();
  copyToClipboard(summary);
}

function handleEscClose(e) {
  if (e.key === 'Escape') {
    closeSettleModal();
    closeResetModal();
  }
}

function handleStorageSync(e) {
  if (e.key !== 'splitOrDie') return;
  loadState();
  renderFriends();
  renderExpenses();
  renderBalances();
}

function bindEvents() {
  const addFriendBtn = document.getElementById('add-friend-btn');
  if (addFriendBtn) addFriendBtn.addEventListener('click', addFriend);

  const friendInput = document.getElementById('friend-input');
  if (friendInput) {
    friendInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addFriend();
      }
    });
  }

  const friendsList = document.getElementById('friends-list');
  if (friendsList) {
    friendsList.addEventListener('click', e => {
      const btn = e.target.closest('.friend-chip-remove');
      if (btn && btn.dataset.name) {
        removeFriend(btn.dataset.name);
      }
    });
  }

  const addExpenseBtn = document.getElementById('add-expense-btn');
  if (addExpenseBtn) addExpenseBtn.addEventListener('click', addExpense);

  ['exp-desc', 'exp-amount'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addExpense();
      }
    });
  });

  const expenseList = document.getElementById('expense-list');
  if (expenseList) {
    expenseList.addEventListener('click', e => {
      const btn = e.target.closest('.expense-delete');
      if (btn && btn.dataset.id) {
        deleteExpense(Number(btn.dataset.id));
      }
    });
  }

  const settleBtn = document.getElementById('settle-btn');
  if (settleBtn) settleBtn.addEventListener('click', handleSettleClick);

  const modalClose = document.getElementById('modal-close');
  if (modalClose) modalClose.addEventListener('click', closeSettleModal);

  const settleOverlay = document.getElementById('settle-modal');
  if (settleOverlay) {
    settleOverlay.addEventListener('click', e => {
      if (e.target === settleOverlay) closeSettleModal();
    });
  }

  const modalCopyBtn = document.getElementById('modal-copy-btn');
  if (modalCopyBtn) modalCopyBtn.addEventListener('click', handleModalCopy);

  const exportBtn = document.getElementById('export-btn');
  if (exportBtn) exportBtn.addEventListener('click', handleExportSummary);

  const resetBtn = document.getElementById('reset-btn');
  if (resetBtn) resetBtn.addEventListener('click', openResetModal);

  const resetCancel = document.getElementById('reset-cancel');
  if (resetCancel) resetCancel.addEventListener('click', closeResetModal);

  const resetConfirm = document.getElementById('reset-confirm');
  if (resetConfirm) resetConfirm.addEventListener('click', performReset);

  const resetOverlay = document.getElementById('reset-modal');
  if (resetOverlay) {
    resetOverlay.addEventListener('click', e => {
      if (e.target === resetOverlay) closeResetModal();
    });
  }

  window.addEventListener('keydown', handleEscClose);
  window.addEventListener('storage', handleStorageSync);
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
