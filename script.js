/* ═══════════════════════════════════════════════════════
   SplitOrDie — script.js v4
   8 pages · Sidebar router · All features
   ═══════════════════════════════════════════════════════ */

/* ── CONSTANTS ─────────────────────────────── */
const SK = 'splitOrDie_v4';
const SESSION_KEY = 'splitOrDie_session';
const GROUP_EMOJIS = ['🏖️','🍕','✈️','🏠','🎉','🍺','🎮','🏕️','🛍️','🎬','🚗','💼','🎵','⚽','🌴','🎪','🍜','🏔️','🎭','🌊'];
const FRIEND_AVATARS = ['😎','🤠','👻','🤖','🦊','🐼','🐸','🦁','🐯','🐺','🦄','🐙','🎩','🥷','👽','🤑','🦋','🐉'];
const CURRENCIES = [
  {code:'INR',sym:'₹',name:'Indian Rupee',rate:1},
  {code:'USD',sym:'$',name:'US Dollar',rate:0.012},
  {code:'EUR',sym:'€',name:'Euro',rate:0.011},
  {code:'GBP',sym:'£',name:'British Pound',rate:0.0094},
  {code:'JPY',sym:'¥',name:'Japanese Yen',rate:1.80},
  {code:'AED',sym:'د.إ',name:'UAE Dirham',rate:0.044},
  {code:'SGD',sym:'S$',name:'Singapore Dollar',rate:0.016},
  {code:'AUD',sym:'A$',name:'Australian Dollar',rate:0.018},
];
const DEFAULT_CATS = [
  {id:'food',emoji:'🍕',name:'Food'},
  {id:'drinks',emoji:'🍺',name:'Drinks'},
  {id:'travel',emoji:'✈️',name:'Travel'},
  {id:'stay',emoji:'🏠',name:'Stay'},
  {id:'shopping',emoji:'🛍️',name:'Shopping'},
  {id:'movies',emoji:'🎬',name:'Movies'},
  {id:'bills',emoji:'📱',name:'Bills'},
  {id:'fuel',emoji:'⛽',name:'Fuel'},
  {id:'other',emoji:'🌀',name:'Other'},
];
const FX = {
  exp:   [{i:'😈',m:'Expense logged. Chaos begins.'},{i:'💀',m:"Logged. Friendship won't survive."},{i:'💸',m:"Someone's crying inside."}],
  friend:[{i:'👋',m:'New freeloader detected.'},{i:'😐',m:'Another suspect joins.'}],
  del:   [{i:'🧹',m:'Gone. What expense?'},{i:'🤫',m:"We don't talk about this."}],
  copied:[{i:'📋',m:'Copied! Go shame them.'},{i:'✅',m:'Name and shame time.'}],
  undo:  [{i:'↩',m:'Undone. Revisionist.'},{i:'🕰️',m:'Time reversed.'}],
  settle:[{i:'✅',m:'Payment recorded!'},{i:'💰',m:'Settled! One less enemy.'}],
  group: [{i:'🎉',m:'New group!'},{i:'📁',m:'Fresh group, same chaos.'}],
};
const QUIP  = a=>a<100?'Small money, big drama.':a<300?'Stop freeloading 😭':a<700?'Pay up or we fight 👊':a<1500?"Bro you're broke 💀":'We need to talk. 🚨';
const EEMOJI= a=>a<100?'😌':a<500?'😬':a<1000?'😰':a<3000?'💀':'☠️';
const OWESE = a=>a<100?'😌':a<500?'😅':a<1000?'😭':a<2000?'💀':'☠️';

/* ── STATE ─────────────────────────────────── */
let S = {
  theme:'dark', defaultCurrency:'INR',
  activeGroup:null, groups:[], settlements:[],
  customCats:[], activity:[], archivedGroups:[]
};
let undoStack=[], pendingImg=null, detailExpId=null, editExpId=null;
let selectedGroupEmoji=GROUP_EMOJIS[0], selectedFriendAvatar=FRIEND_AVATARS[0];
let currentSplitType='equal', selectedParticipants=new Set();
let bulkMode=false, bulkSelected=new Set();
let confirmCallback=null;
let currentPage='dashboard';

/* ── PERSISTENCE ────────────────────────────── */
const save=()=>{try{localStorage.setItem(SK,JSON.stringify(S))}catch(_){}};
function load(){
  try{
    const r=localStorage.getItem(SK);
    if(r){
      const p=JSON.parse(r);
      // migration
      if(p.groups&&!p.settlements){p.settlements=[];}
      if(!p.archivedGroups) p.archivedGroups=[];
      if(!p.customCats) p.customCats=[];
      if(!p.activity) p.activity=[];
      if(!p.defaultCurrency) p.defaultCurrency='INR';
      // ensure group fields
      (p.groups||[]).forEach(g=>{
        if(!g.currency) g.currency=p.defaultCurrency||'INR';
        if(!g.budget) g.budget=0;
        if(!g.archived) g.archived=false;
        (g.expenses||[]).forEach(e=>{
          if(!e.category) e.category='other';
          if(!e.notes) e.notes='';
          if(!e.splitType) e.splitType='equal';
          if(!e.splits) e.splits={};
          if(!e.pinned) e.pinned=false;
          if(!e.comments) e.comments=[];
          if(!e.reactions) e.reactions={};
        });
      });
      S=p;
    }
  }catch(_){}
}

function getSession(){try{return JSON.parse(localStorage.getItem(SESSION_KEY)||'null')}catch(_){return null}}

/* ── UNDO ───────────────────────────────────── */
function pushUndo(desc){
  undoStack.push({snap:JSON.stringify(S),desc});
  if(undoStack.length>25)undoStack.shift();
  updateUndoBtn();
}
function performUndo(){
  if(!undoStack.length)return;
  const{snap,desc}=undoStack.pop();
  S=JSON.parse(snap); save(); renderCurrentPage(); updateUndoBtn();
  const t=rand(FX.undo); toast(t.i,`${t.m} (${desc})`);
}
function updateUndoBtn(){
  const b=$$('undo-btn'); if(!b)return;
  b.disabled=!undoStack.length;
  b.classList.toggle('undo-pulse',!!undoStack.length);
}

/* ── ROUTER ─────────────────────────────────── */
function navigate(page){
  currentPage=page;
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-item[data-page],.bnav-item[data-page]').forEach(b=>b.classList.toggle('active',b.dataset.page===page));
  const el=$$(`page-${page}`); if(el)el.classList.add('active');
  renderPage(page);
  // close sidebar on mobile
  closeSidebar();
}
function renderPage(page){
  switch(page){
    case 'dashboard':   renderDashboard(); break;
    case 'groups':      renderGroups(); break;
    case 'analytics':   renderAnalytics(); break;
    case 'settlements': renderSettlements(); break;
    case 'friends':     renderFriends(); break;
    case 'history':     renderHistory(); break;
    case 'settings':    renderSettings(); break;
  }
}
function renderCurrentPage(){renderPage(currentPage);}

/* ── GROUPS ─────────────────────────────────── */
const activeG=()=>S.groups.find(g=>g.id===S.activeGroup)||S.groups[0]||null;
const getCur=g=>{const c=CURRENCIES.find(x=>x.code===(g?.currency||S.defaultCurrency));return c||CURRENCIES[0];}
const fmtAmt=(n,g)=>{const c=getCur(g);const v=(+n||0)*c.rate;return c.sym+v.toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2});};
const allCats=()=>[...DEFAULT_CATS,...(S.customCats||[])];
const getCat=id=>allCats().find(c=>c.id===id)||DEFAULT_CATS[DEFAULT_CATS.length-1];

function createGroup(name,emoji,currency,budget){
  pushUndo('create group');
  const g={id:Date.now(),name:name.trim()||'New Group',emoji,currency:currency||S.defaultCurrency,budget:+budget||0,friends:[],expenses:[],archived:false};
  S.groups.push(g); S.activeGroup=g.id; save();
  logAct('🎉',`Group <strong>${esc(g.name)}</strong> created`);
  const t=rand(FX.group); toast(t.i,t.m);
  return g;
}

function archiveGroup(gid){
  pushUndo('archive group');
  const g=S.groups.find(x=>x.id===gid); if(!g)return;
  g.archived=true; g.archivedAt=new Date().toISOString();
  if(S.activeGroup===gid) S.activeGroup=S.groups.find(x=>!x.archived)?.id||null;
  save(); renderCurrentPage(); toast('🗂️','Group archived.');
}

/* ── ACTIVITY ───────────────────────────────── */
function logAct(icon,html){
  if(!S.activity)S.activity=[];
  S.activity.unshift({icon,html,time:Date.now()});
  if(S.activity.length>60)S.activity.pop();
  save();
}
function timeAgo(ts){
  const d=Date.now()-ts;
  if(d<60000)return'just now';
  if(d<3600000)return`${Math.floor(d/60000)}m ago`;
  if(d<86400000)return`${Math.floor(d/3600000)}h ago`;
  return new Date(ts).toLocaleDateString('en-IN',{day:'2-digit',month:'short'});
}

/* ── BALANCES ───────────────────────────────── */
function calcBalances(g){
  if(!g)return [];
  const net={}; (g.friends||[]).forEach(f=>net[f.name]=0);
  (g.expenses||[]).forEach(exp=>{
    const share=exp.amount/exp.participants.length;
    exp.participants.forEach(p=>{net[p]=rc((net[p]||0)-share);});
    net[exp.payer]=rc((net[exp.payer]||0)+exp.amount);
  });
  // Factor in settlements
  (S.settlements||[]).filter(s=>s.groupId===g.id).forEach(s=>{
    if(net[s.from]!==undefined) net[s.from]=rc(net[s.from]+s.amount);
    if(net[s.to]!==undefined)   net[s.to]=rc(net[s.to]-s.amount);
  });
  const cred=[],debt=[];
  Object.entries(net).forEach(([name,bal])=>{
    if(bal>0.01)cred.push({name,amount:bal});
    if(bal<-0.01)debt.push({name,amount:-bal});
  });
  cred.sort((a,b)=>b.amount-a.amount); debt.sort((a,b)=>b.amount-a.amount);
  const txns=[];
  while(cred.length&&debt.length){
    const c=cred[0],d=debt[0]; const amt=rc(Math.min(c.amount,d.amount));
    txns.push({from:d.name,to:c.name,amount:amt,g});
    c.amount=rc(c.amount-amt); d.amount=rc(d.amount-amt);
    if(c.amount<=0.01)cred.shift(); if(d.amount<=0.01)debt.shift();
  }
  return txns;
}

/* ── EXPENSE HELPERS ────────────────────────── */
function amountOwed(exp,person){
  if(exp.splitType==='equal') return exp.amount/exp.participants.length;
  if(exp.splitType==='percent') return exp.amount*(exp.splits[person]||0)/100;
  if(exp.splitType==='exact')   return exp.splits[person]||0;
  return exp.amount/exp.participants.length;
}

/* ── RECURRING ──────────────────────────────── */
function processRecurring(){
  const now=new Date(); const today=now.toISOString().split('T')[0];
  S.groups.forEach(g=>{
    (g.expenses||[]).filter(e=>e.recurring&&e.recurFreq).forEach(e=>{
      const last=e.recurLastDate||e.date;
      const lastD=new Date(last);
      let due=false;
      if(e.recurFreq==='daily') due=now-lastD>=86400000;
      if(e.recurFreq==='weekly') due=now-lastD>=604800000;
      if(e.recurFreq==='monthly'){const n=new Date(lastD);n.setMonth(n.getMonth()+1);due=now>=n;}
      if(e.recurFreq==='yearly'){const n=new Date(lastD);n.setFullYear(n.getFullYear()+1);due=now>=n;}
      if(due){
        const newExp={...e,id:Date.now()+Math.random(),date:today,recurLastDate:today,pinned:false};
        delete newExp.recurring; // prevent cascade
        g.expenses.unshift(newExp);
        e.recurLastDate=today;
        logAct('🔁',`Recurring: <strong>${esc(e.desc)}</strong> in ${esc(g.name)}`);
      }
    });
  });
  save();
}

/* ── DASHBOARD ──────────────────────────────── */
function renderDashboard(){
  // Greeting
  const h=new Date().getHours();
  const gr=h<12?'Good morning':'h<17?Good afternoon':'Good evening';
  const session=getSession();
  $$('dash-greeting').textContent=`${h<12?'Good morning':h<17?'Good afternoon':'Good evening'} ${session?.name||''}  👋`;

  // Global stats
  const allExp=S.groups.flatMap(g=>g.expenses||[]);
  const totalSpent=allExp.reduce((s,e)=>s+e.amount,0);
  const allTxns=S.groups.flatMap(g=>calcBalances(g));
  const totalOwed=allTxns.reduce((s,t)=>s+t.amount,0);
  $$('dash-stats').innerHTML=`
    <div class="stat-card"><span class="stat-icon">💸</span><div><span class="stat-val">${fmtAmt(totalSpent,null)}</span><span class="stat-lbl">Total Spent</span></div></div>
    <div class="stat-card"><span class="stat-icon">🧾</span><div><span class="stat-val">${allExp.length}</span><span class="stat-lbl">Expenses</span></div></div>
    <div class="stat-card"><span class="stat-icon">👥</span><div><span class="stat-val">${S.groups.filter(g=>!g.archived).length}</span><span class="stat-lbl">Groups</span></div></div>
    <div class="stat-card"><span class="stat-icon">🔥</span><div><span class="stat-val">${fmtAmt(totalOwed,null)}</span><span class="stat-lbl">Unsettled</span></div></div>
  `;

  // Group selector
  const gsel=$$('dash-group-select'); gsel.innerHTML='';
  S.groups.filter(g=>!g.archived).forEach(g=>{
    const o=document.createElement('option'); o.value=g.id; o.textContent=`${g.emoji} ${g.name}`;
    if(g.id===S.activeGroup)o.selected=true; gsel.appendChild(o);
  });

  renderDashGroup();
}

function renderDashGroup(){
  const g=activeG();
  if(!g){
    $$('dash-friends').innerHTML='<div class="empty-sm">No group selected.</div>';
    $$('dash-balances').innerHTML='<div class="empty-sm">No group selected.</div>';
    $$('dash-recent-expenses').innerHTML='<div class="empty-sm">No expenses.</div>';
    $$('dash-budget-wrap').style.display='none';
    renderActivity();
    return;
  }

  // Budget
  const spent=g.expenses.reduce((s,e)=>s+e.amount,0);
  if(g.budget){
    const pct=Math.min(spent/g.budget,1);
    const cls=pct>=1?'crit':pct>=0.8?'warn':'ok';
    $$('dash-budget-wrap').style.display='block';
    $$('dash-budget-card').className=`budget-bar-card budget-${cls}`;
    $$('dash-budget-label').textContent=`${g.emoji} ${g.name} Budget`;
    $$('dash-budget-pct').textContent=`${Math.round(pct*100)}%`;
    $$('dash-budget-fill').style.width=`${pct*100}%`;
    $$('dash-budget-sub').textContent=`${fmtAmt(spent,g)} of ${fmtAmt(g.budget,g)} · ${fmtAmt(g.budget-spent,g)} remaining`;
  } else $$('dash-budget-wrap').style.display='none';

  // Friends
  renderFriendChips('dash-friends', g, true);

  // Balances
  renderBalanceList('dash-balances', g);

  // Recent
  renderExpList('dash-recent-expenses', g, {limit:5, noSearch:true});

  // Activity
  renderActivity();
}

/* ── GROUPS PAGE ────────────────────────────── */
function renderGroups(){
  const bar=$$('groups-tab-bar'); bar.innerHTML='';
  const active=S.groups.filter(g=>!g.archived);
  active.forEach(g=>{
    const btn=document.createElement('button');
    btn.className='gtab'+(g.id===S.activeGroup?' active':'');
    btn.innerHTML=`<span>${g.emoji}</span><span>${esc(g.name)}</span>${active.length>1?`<button class="gtab-close" data-gid="${g.id}">✕</button>`:''}`;
    btn.addEventListener('click',e=>{if(!e.target.closest('.gtab-close')){S.activeGroup=g.id;save();renderGroups();}});
    bar.appendChild(btn);
  });
  // Add tab
  const addBtn=document.createElement('button');
  addBtn.className='gtab'; addBtn.textContent='+ New';
  addBtn.addEventListener('click',()=>openGroupModal());
  bar.appendChild(addBtn);

  renderGroupDetail();
}

function renderGroupDetail(){
  const g=activeG(); const panel=$$('group-detail-panel');
  if(!g){panel.innerHTML='<div class="empty"><span class="empty-icon">📁</span><p>No groups yet. Create one!</p></div>';return;}

  panel.innerHTML=`
    <div class="gd-toolbar">
      <button class="btn btn-primary btn-sm" id="gd-add-exp-btn">+ Add Expense</button>
      <button class="btn btn-ghost btn-sm" id="gd-add-friend-btn">+ Add Friend</button>
      <button class="btn btn-ghost btn-sm" id="gd-edit-btn">⚙️ Edit Group</button>
      <button class="btn btn-ghost btn-sm" id="gd-export-btn">📤 Export</button>
      <button class="btn btn-ghost btn-sm" id="gd-archive-btn">🗂️ Archive</button>
      <div class="search-wrap" style="flex:1;max-width:260px">
        <span class="search-ico">🔍</span>
        <input class="search-inp" id="gd-search" placeholder="Search expenses…"/>
      </div>
      <select class="inp sel inp-sm" id="gd-sort" style="width:auto">
        <option value="newest">Newest</option><option value="oldest">Oldest</option>
        <option value="highest">Highest</option><option value="lowest">Lowest</option>
        <option value="az">A→Z</option>
      </select>
      <select class="inp sel inp-sm" id="gd-cat-filter" style="width:auto">
        <option value="">All categories</option>
        ${allCats().map(c=>`<option value="${c.id}">${c.emoji} ${c.name}</option>`).join('')}
      </select>
      <label class="btn btn-ghost btn-sm" style="cursor:pointer"><input type="checkbox" id="gd-bulk-mode" style="display:none"/> ☑️ Bulk</label>
    </div>
    <div class="group-detail">
      <div>
        <div class="card mb12">
          <div class="card-header"><span class="card-title">Squad (${g.friends.length})</span></div>
          <div id="gd-friends"></div>
        </div>
        <div class="card">
          <div class="card-header"><span class="card-title">Balances</span>
            <div class="row-gap6">
              <button class="btn btn-ghost btn-xs" id="gd-whatsapp">🟢</button>
              <button class="btn btn-ghost btn-xs" id="gd-copy">📋</button>
              <button class="btn btn-primary btn-xs" id="gd-settle">Settle Up</button>
            </div>
          </div>
          <div id="gd-balances"></div>
        </div>
      </div>
      <div>
        <div id="gd-bulk-bar" style="display:none" class="bulk-bar">
          <span class="bulk-count" id="gd-bulk-count">0 selected</span>
          <button class="btn btn-ghost btn-xs" id="gd-bulk-pin">📌 Pin</button>
          <button class="btn btn-danger btn-xs" id="gd-bulk-delete">🗑️ Delete</button>
          <button class="btn btn-ghost btn-xs" id="gd-bulk-cancel">Cancel</button>
        </div>
        <div class="card">
          <div class="card-header">
            <span class="card-title">Expenses</span>
            <span class="card-badge" id="gd-exp-count"></span>
          </div>
          <div id="gd-expenses"></div>
        </div>
      </div>
    </div>
  `;

  // bind group detail events
  $$('gd-add-exp-btn').onclick=()=>openExpenseModal();
  $$('gd-add-friend-btn').onclick=()=>openFriendModal();
  $$('gd-edit-btn').onclick=()=>openGroupModal(g.id);
  $$('gd-export-btn').onclick=()=>openModal('m-export');
  $$('gd-archive-btn').onclick=()=>confirm2('Archive this group?','It will move to History. Data is preserved.',()=>archiveGroup(g.id));
  $$('gd-settle').onclick=()=>openSettleModal();
  $$('gd-whatsapp').onclick=shareWhatsApp;
  $$('gd-copy').onclick=()=>copyText(buildSummary());
  $$('gd-search').oninput=renderGroupDetail;
  $$('gd-sort').onchange=renderGroupDetail;
  $$('gd-cat-filter').onchange=renderGroupDetail;
  $$('gd-bulk-mode').onchange=e=>{bulkMode=e.target.checked;bulkSelected.clear();renderGroupDetail();};
  $$('gd-bulk-cancel').onclick=()=>{bulkMode=false;bulkSelected.clear();$$('gd-bulk-mode').checked=false;renderGroupDetail();};
  $$('gd-bulk-delete').onclick=bulkDelete;
  $$('gd-bulk-pin').onclick=bulkPin;

  renderFriendChips('gd-friends', g, true);
  renderBalanceList('gd-balances', g);
  renderExpList('gd-expenses', g, {search:$$('gd-search')?.value,sort:$$('gd-sort')?.value,catFilter:$$('gd-cat-filter')?.value,bulk:bulkMode});
  $$('gd-exp-count').textContent=`${g.expenses.length} expense${g.expenses.length!==1?'s':''}`;
  if(bulkMode) $$('gd-bulk-bar').style.display='flex';
}

/* ── RENDER EXPENSE LIST ────────────────────── */
function renderExpList(containerId, g, opts={}){
  const el=$$(containerId); if(!el)return;
  const {limit, noSearch, search, sort, catFilter, bulk}=opts;
  let exps=[...(g?.expenses||[])];
  // pinned first
  exps.sort((a,b)=>(b.pinned?1:0)-(a.pinned?1:0));
  if(search){const q=search.toLowerCase();exps=exps.filter(e=>e.desc.toLowerCase().includes(q)||(e.notes||'').toLowerCase().includes(q)||e.payer.toLowerCase().includes(q));}
  if(catFilter) exps=exps.filter(e=>e.category===catFilter);
  switch(sort){
    case 'oldest': exps.sort((a,b)=>new Date(a.date)-new Date(b.date)); break;
    case 'highest':exps.sort((a,b)=>b.amount-a.amount); break;
    case 'lowest': exps.sort((a,b)=>a.amount-b.amount); break;
    case 'az':     exps.sort((a,b)=>a.desc.localeCompare(b.desc)); break;
    default:       exps.sort((a,b)=>b.id-a.id);
  }
  if(limit) exps=exps.slice(0,limit);
  el.innerHTML='';
  if(!exps.length){el.innerHTML='<div class="empty"><span class="empty-icon">🕊️</span><p>No expenses. Suspiciously peaceful…</p></div>';return;}
  exps.forEach((exp,i)=>{
    const cat=getCat(exp.category);
    const div=document.createElement('div');
    div.className='exp-item'; div.dataset.eid=exp.id;
    div.style.animationDelay=`${i*0.03}s`;
    const dateStr=exp.date?new Date(exp.date).toLocaleDateString('en-IN',{day:'2-digit',month:'short'}):'';
    const tags=[
      exp.pinned?`<span class="exp-tag pin">📌</span>`:'',
      exp.recurring?`<span class="exp-tag recur">🔁${exp.recurFreq||''}</span>`:'',
      `<span class="exp-tag">${cat.name}</span>`,
      exp.notes?'📝':'', exp.imageData?'📎':'',
      Object.keys(exp.reactions||{}).length?'💬':'',
    ].filter(Boolean).join('');
    div.innerHTML=`
      ${bulk?`<input type="checkbox" class="exp-checkbox" ${bulkSelected.has(exp.id)?'checked':''}>`:''}
      <span class="drag-handle" draggable="true">⠿</span>
      <span class="exp-emoji">${cat.emoji}</span>
      <div class="exp-info">
        <div class="exp-desc">${esc(exp.desc)}</div>
        <div class="exp-meta">${esc(exp.payer)} · ${fmtAmt(exp.amount/exp.participants.length,g)}/head · ${exp.participants.length}ppl ${dateStr?`· ${dateStr}`:''} ${tags}</div>
      </div>
      <span class="exp-amount">${fmtAmt(exp.amount,g)}</span>
      <div class="exp-actions">
        <button class="exp-action" data-pin="${exp.id}" title="Pin">${exp.pinned?'📌':'📍'}</button>
        <button class="exp-action" data-del="${exp.id}" title="Delete">✕</button>
      </div>
    `;
    // click to detail
    div.addEventListener('click',e=>{
      if(e.target.dataset.del){deleteExp(g,+e.target.dataset.del);return;}
      if(e.target.dataset.pin){togglePin(g,+e.target.dataset.pin);return;}
      if(e.target.classList.contains('exp-checkbox')){
        if(bulkSelected.has(exp.id))bulkSelected.delete(exp.id);else bulkSelected.add(exp.id);
        $$('gd-bulk-count').textContent=`${bulkSelected.size} selected`;
        return;
      }
      if(!e.target.closest('.exp-actions')&&!e.target.classList.contains('exp-checkbox')) openDetailModal(g,exp.id);
    });
    el.appendChild(div);
  });
  // total bar
  if(!limit){
    const total=g.expenses.reduce((s,e)=>s+e.amount,0);
    const tb=document.createElement('div'); tb.className='total-bar';
    tb.innerHTML=`<span class="total-lbl">Total Damage</span><span class="total-val">${fmtAmt(total,g)}</span>`;
    el.appendChild(tb);
  }
}

function deleteExp(g,eid){
  const exp=g.expenses.find(e=>e.id===eid); if(!exp)return;
  pushUndo('delete expense');
  const el=document.querySelector(`[data-eid="${eid}"]`);
  if(el){el.classList.add('removing');el.addEventListener('animationend',()=>{g.expenses=g.expenses.filter(e=>e.id!==eid);save();renderCurrentPage();},{once:true});}
  else{g.expenses=g.expenses.filter(e=>e.id!==eid);save();renderCurrentPage();}
  logAct('🗑️',`Deleted <strong>${esc(exp.desc)}</strong>`);
  const t=rand(FX.del);toast(t.i,t.m);
}
function togglePin(g,eid){const e=g.expenses.find(x=>x.id===eid);if(e){e.pinned=!e.pinned;save();renderCurrentPage();toast(e.pinned?'📌':'📍',e.pinned?'Pinned!':'Unpinned');}}
function bulkDelete(){
  if(!bulkSelected.size)return;
  const g=activeG(); if(!g)return;
  pushUndo('bulk delete');
  g.expenses=g.expenses.filter(e=>!bulkSelected.has(e.id));
  bulkSelected.clear(); bulkMode=false;
  save(); renderCurrentPage(); toast('🗑️',`Deleted expenses.`);
}
function bulkPin(){
  const g=activeG(); if(!g)return;
  g.expenses.forEach(e=>{if(bulkSelected.has(e.id))e.pinned=true;});
  bulkSelected.clear(); save(); renderCurrentPage(); toast('📌','Pinned!');
}

/* ── RENDER FRIENDS ─────────────────────────── */
function renderFriendChips(containerId, g, showRemove=false){
  const el=$$(containerId); if(!el)return;
  el.innerHTML='';
  if(!g?.friends?.length){el.innerHTML='<div class="empty-sm">No friends yet.</div>';return;}
  g.friends.forEach(f=>{
    const chip=document.createElement('div'); chip.className='friend-chip';
    chip.innerHTML=`<span>${f.avatar||''}</span><span>${esc(f.name)}</span>${showRemove?`<button class="chip-remove" data-name="${esc(f.name)}">✕</button>`:''}`;
    el.appendChild(chip);
  });
  if(showRemove) el.addEventListener('click',e=>{const b=e.target.closest('.chip-remove');if(b){removeFriend(g,b.dataset.name);}});
}
function removeFriend(g,name){
  pushUndo('remove friend');
  g.friends=g.friends.filter(f=>f.name!==name);
  g.expenses=g.expenses.filter(e=>{if(e.payer===name)return false;e.participants=e.participants.filter(p=>p!==name);return e.participants.length>0;});
  save(); renderCurrentPage(); toast('✂️','Removed.');
}

/* ── RENDER BALANCES ────────────────────────── */
function renderBalanceList(containerId, g){
  const el=$$(containerId); if(!el)return;
  el.innerHTML='';
  if(!g?.expenses?.length||!g?.friends?.length){el.innerHTML='<div class="empty-sm">Add friends and expenses first.</div>';return;}
  const txns=calcBalances(g);
  if(!txns.length){el.innerHTML='<div class="bal-settled">✓ Everyone\'s even. Legendary.</div>';return;}
  txns.forEach(txn=>{
    const d=document.createElement('div'); d.className='bal-item';
    d.innerHTML=`<span class="bal-emoji">${OWESE(txn.amount)}</span><div class="bal-text"><strong>${esc(txn.from)}</strong> owes <strong>${esc(txn.to)}</strong><span class="bal-quip">${QUIP(txn.amount)}</span></div><span class="bal-amount">${fmtAmt(txn.amount,g)}</span>`;
    el.appendChild(d);
  });
}

/* ── FRIENDS PAGE ───────────────────────────── */
function renderFriends(){
  const q=($$('friends-search')?.value||'').toLowerCase();
  const grid=$$('friends-grid'); grid.innerHTML='';
  const all=[];
  S.groups.forEach(g=>{
    (g.friends||[]).forEach(f=>{
      if(!all.find(x=>x.name===f.name)) all.push({...f,group:g});
    });
  });
  const filtered=q?all.filter(f=>f.name.toLowerCase().includes(q)):all;
  if(!filtered.length){grid.innerHTML='<div class="empty" style="grid-column:1/-1"><span class="empty-icon">👥</span><p>No friends yet. Invite some freeloaders.</p></div>';return;}
  filtered.forEach(f=>{
    // compute stats
    const paid=S.groups.flatMap(g=>g.expenses||[]).filter(e=>e.payer===f.name).reduce((s,e)=>s+e.amount,0);
    const owes=S.groups.flatMap(g=>g.expenses||[]).filter(e=>e.participants?.includes(f.name)&&e.payer!==f.name).reduce((s,e)=>s+amountOwed(e,f.name),0);
    const card=document.createElement('div'); card.className='friend-card';
    card.innerHTML=`
      <div class="friend-card-av">${f.avatar||'👤'}</div>
      <div class="friend-card-name">${esc(f.name)}</div>
      <div class="friend-card-stats">Paid: ${fmtAmt(paid,null)}<br/>Owes: ${fmtAmt(owes,null)}<br/><span style="font-size:.68rem;color:var(--text3)">${esc(f.group?.name||'')}</span></div>
    `;
    grid.appendChild(card);
  });
}

/* ── ANALYTICS PAGE ─────────────────────────── */
function renderAnalytics(){
  // Populate group selector
  const sel=$$('analytics-group-sel'); sel.innerHTML='<option value="">All groups</option>';
  S.groups.filter(g=>!g.archived).forEach(g=>{const o=document.createElement('option');o.value=g.id;o.textContent=`${g.emoji} ${g.name}`;sel.appendChild(o);});

  const gid=sel.value?+sel.value:null;
  const groups=gid?S.groups.filter(g=>g.id===gid):S.groups;
  const allExp=groups.flatMap(g=>g.expenses||[]);
  const content=$$('analytics-content'); content.innerHTML='';

  if(!allExp.length){content.innerHTML='<div class="empty analytics-full"><span class="empty-icon">📈</span><p>Add expenses to see analytics.</p></div>';return;}

  // By category
  const catCard=makeCard('By Category','📊');
  const catTotals={};
  allExp.forEach(e=>{catTotals[e.category]=(catTotals[e.category]||0)+e.amount;});
  const maxCat=Math.max(...Object.values(catTotals),1);
  Object.entries(catTotals).sort((a,b)=>b[1]-a[1]).forEach(([cid,total])=>{
    const cat=getCat(cid); const pct=(total/maxCat*100).toFixed(1);
    catCard.body.innerHTML+=`<div class="bar-row"><span class="bar-lbl">${cat.emoji} ${cat.name}</span><div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div><span class="bar-val">₹${fmt(total)}</span></div>`;
  });
  content.appendChild(catCard.el);

  // By person
  const personCard=makeCard('Per Person','👤');
  const personTotals={};
  allExp.forEach(e=>{personTotals[e.payer]=(personTotals[e.payer]||0)+e.amount;});
  const maxPer=Math.max(...Object.values(personTotals),1);
  Object.entries(personTotals).sort((a,b)=>b[1]-a[1]).forEach(([name,total])=>{
    const pct=(total/maxPer*100).toFixed(1);
    personCard.body.innerHTML+=`<div class="bar-row"><span class="bar-lbl">${esc(name)}</span><div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div><span class="bar-val">₹${fmt(total)}</span></div>`;
  });
  content.appendChild(personCard.el);

  // Timeline
  const timeCard=makeCard('Spending Over Time','📅'); timeCard.el.className+=' analytics-full';
  const months={};
  allExp.forEach(e=>{const d=new Date(e.date);const k=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;months[k]=(months[k]||0)+e.amount;});
  const keys=Object.keys(months).sort().slice(-8);
  if(keys.length){
    const maxM=Math.max(...keys.map(k=>months[k]),1);
    const wrap=document.createElement('div'); wrap.className='timeline-wrap';
    keys.forEach(k=>{
      const pct=(months[k]/maxM*100);
      const col=document.createElement('div'); col.className='t-col';
      col.innerHTML=`<div class="t-val">₹${fmtK(months[k])}</div><div class="t-bar-wrap"><div class="t-bar" style="height:${pct}%"></div></div><div class="t-lbl">${k.slice(5)}/${k.slice(2,4)}</div>`;
      wrap.appendChild(col);
    });
    timeCard.body.appendChild(wrap);
  }
  content.appendChild(timeCard.el);

  // Top expenses
  const topCard=makeCard('Top Expenses 🏆','');
  const top=[...allExp].sort((a,b)=>b.amount-a.amount).slice(0,6);
  const maxTop=top[0]?.amount||1;
  top.forEach(e=>{const pct=(e.amount/maxTop*100).toFixed(1);const cat=getCat(e.category);topCard.body.innerHTML+=`<div class="bar-row"><span class="bar-lbl">${cat.emoji} ${esc(e.desc)}</span><div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div><span class="bar-val">₹${fmt(e.amount)}</span></div>`;});
  content.appendChild(topCard.el);

  // Recurring
  const recurCard=makeCard('Recurring Costs 🔁','');
  const recur=allExp.filter(e=>e.recurring);
  if(!recur.length){recurCard.body.innerHTML='<div class="empty-sm">No recurring expenses.</div>';}
  else{
    const monthly=recur.reduce((s,e)=>{const f=e.recurFreq==='weekly'?4.33:e.recurFreq==='yearly'?1/12:1;return s+e.amount*f;},0);
    recurCard.body.innerHTML=`<div class="total-bar mb12"><span class="total-lbl">Est. Monthly</span><span class="total-val">₹${fmt(monthly)}</span></div>`;
    const maxR=Math.max(...recur.map(e=>e.amount),1);
    recur.forEach(e=>{const cat=getCat(e.category);const pct=(e.amount/maxR*100).toFixed(1);recurCard.body.innerHTML+=`<div class="bar-row"><span class="bar-lbl">${cat.emoji} ${esc(e.desc)}</span><div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div><span class="bar-val">₹${fmt(e.amount)}</span></div>`;});
  }
  content.appendChild(recurCard.el);
}

function makeCard(title,icon){
  const el=document.createElement('div'); el.className='card';
  el.innerHTML=`<div class="card-header"><span class="card-title">${icon} ${title}</span></div><div></div>`;
  const body=el.querySelector('div:last-child');
  return{el,body};
}

/* ── SETTLEMENTS PAGE ───────────────────────── */
function renderSettlements(){
  const sel=$$('settle-group-sel'); sel.innerHTML='';
  S.groups.filter(g=>!g.archived).forEach(g=>{const o=document.createElement('option');o.value=g.id;o.textContent=`${g.emoji} ${g.name}`;if(g.id===S.activeGroup)o.selected=true;sel.appendChild(o);});
  const gid=+sel.value||S.activeGroup;
  const g=S.groups.find(x=>x.id===gid);

  // outstanding
  const debts=$$('settle-debts'); debts.innerHTML='';
  const txns=calcBalances(g);
  if(!txns.length){debts.innerHTML='<div class="empty-sm">No outstanding debts. 🎉</div>';}
  else txns.forEach(txn=>{
    const d=document.createElement('div'); d.className='settle-debt-item';
    d.innerHTML=`<span class="settle-debt-emoji">${OWESE(txn.amount)}</span><div class="settle-debt-text"><strong>${esc(txn.from)}</strong> owes <strong>${esc(txn.to)}</strong><div style="font-size:.7rem;color:var(--text3);margin-top:2px">${QUIP(txn.amount)}</div></div><span class="settle-debt-amt">${fmtAmt(txn.amount,g)}</span><button class="btn btn-green btn-xs" data-from="${esc(txn.from)}" data-to="${esc(txn.to)}" data-amt="${txn.amount}">✓ Mark Paid</button>`;
    d.querySelector('.btn-green').onclick=e=>{
      const b=e.target;
      $$('s-from').innerHTML=`<option>${b.dataset.from}</option>`;
      $$('s-to').innerHTML=`<option>${b.dataset.to}</option>`;
      $$('s-amount').value=b.dataset.amt;
      openModal('m-settle');
    };
    debts.appendChild(d);
  });

  // history
  const hist=$$('settle-history'); hist.innerHTML='';
  const groupSettles=(S.settlements||[]).filter(s=>s.groupId===gid).sort((a,b)=>b.id-a.id);
  if(!groupSettles.length){hist.innerHTML='<div class="empty-sm">No payments recorded yet.</div>';}
  else groupSettles.forEach(s=>{
    const d=document.createElement('div'); d.className='settle-hist-item';
    const dateStr=new Date(s.date||s.id).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'2-digit'});
    d.innerHTML=`<span class="settle-hist-emoji">✅</span><div class="settle-hist-text"><strong>${esc(s.from)}</strong> → <strong>${esc(s.to)}</strong>${s.note?`<div style="font-size:.69rem;color:var(--text3)">${esc(s.note)}</div>`:''}</div><span class="settle-hist-date">${dateStr}</span><span class="settle-hist-amt">${fmtAmt(s.amount,g)}</span>`;
    hist.appendChild(d);
  });
}

/* ── HISTORY PAGE ───────────────────────────── */
function renderHistory(){
  const active=document.querySelector('.htab.active')?.dataset.htab||'activity';
  const content=$$('history-content'); content.innerHTML='';

  if(active==='activity'){
    if(!S.activity?.length){content.innerHTML='<div class="empty"><span class="empty-icon">📋</span><p>No activity yet.</p></div>';return;}
    S.activity.slice(0,40).forEach(a=>{
      const d=document.createElement('div'); d.className='act-item';
      d.innerHTML=`<span class="act-icon">${a.icon}</span><div class="act-body"><div class="act-text">${a.html}</div><div class="act-time">${timeAgo(a.time)}</div></div>`;
      content.appendChild(d);
    });
  } else if(active==='archived'){
    const arch=S.groups.filter(g=>g.archived);
    if(!arch.length){content.innerHTML='<div class="empty"><span class="empty-icon">🗂️</span><p>No archived groups.</p></div>';return;}
    arch.forEach(g=>{
      const total=g.expenses.reduce((s,e)=>s+e.amount,0);
      const d=document.createElement('div'); d.className='card mb12';
      d.innerHTML=`<div class="card-header"><span class="card-title">${g.emoji} ${esc(g.name)}</span><div class="row-gap6"><button class="btn btn-ghost btn-xs" data-unarchive="${g.id}">Restore</button><button class="btn btn-danger btn-xs" data-permdelete="${g.id}">Delete</button></div></div><div style="font-size:.82rem;color:var(--text2)">${g.expenses.length} expenses · Total: ${fmtAmt(total,g)} · Archived ${g.archivedAt?new Date(g.archivedAt).toLocaleDateString('en-IN',{dateStyle:'medium'}):''}</div>`;
      d.querySelector('[data-unarchive]').onclick=()=>{g.archived=false;save();renderHistory();toast('📂','Group restored!');};
      d.querySelector('[data-permdelete]').onclick=()=>confirm2('Delete permanently?','This cannot be undone.',()=>{S.groups=S.groups.filter(x=>x.id!==g.id);save();renderHistory();toast('🔥','Deleted.');});
      content.appendChild(d);
    });
  } else if(active==='recurring'){
    const recur=S.groups.flatMap(g=>(g.expenses||[]).filter(e=>e.recurring).map(e=>({...e,gName:g.name,gEmoji:g.emoji})));
    if(!recur.length){content.innerHTML='<div class="empty"><span class="empty-icon">🔁</span><p>No recurring expenses.</p></div>';return;}
    recur.forEach(e=>{
      const cat=getCat(e.category);
      const d=document.createElement('div'); d.className='exp-item mb12';
      d.innerHTML=`<span class="exp-emoji">${cat.emoji}</span><div class="exp-info"><div class="exp-desc">${esc(e.desc)}</div><div class="exp-meta">${esc(e.gEmoji)} ${esc(e.gName)} · ${esc(e.payer)} pays · 🔁 ${e.recurFreq}</div></div><span class="exp-amount">₹${fmt(e.amount)}</span>`;
      content.appendChild(d);
    });
  }
}

/* ── SETTINGS PAGE ──────────────────────────── */
function renderSettings(){
  // theme toggle
  document.querySelectorAll('.theme-opt').forEach(b=>{
    b.classList.toggle('active', b.dataset.th===S.theme);
    b.onclick=()=>{applyTheme(b.dataset.th);save();renderSettings();};
  });
  // default currency
  const setcur=$$('set-currency'); if(setcur){
    setcur.innerHTML=''; CURRENCIES.forEach(c=>{const o=document.createElement('option');o.value=c.code;o.textContent=`${c.sym} ${c.code} — ${c.name}`;if(c.code===S.defaultCurrency)o.selected=true;setcur.appendChild(o);});
    setcur.onchange=()=>{S.defaultCurrency=setcur.value;save();};
  }
  // custom cats
  renderCatList();
  // notif
  const nb=$$('set-notif-btn');
  if(nb){
    if('Notification' in window){nb.textContent=Notification.permission==='granted'?'✓ Enabled':'Enable';nb.onclick=()=>Notification.requestPermission().then(p=>{if(p==='granted'){toast('🔔','Enabled!');renderSettings();}});}
    else nb.textContent='Not supported';
  }
}
function renderCatList(){
  const el=$$('set-cat-list'); if(!el)return; el.innerHTML='';
  (S.customCats||[]).forEach(c=>{
    const r=document.createElement('div'); r.className='cat-row';
    r.innerHTML=`<span class="cat-row-icon">${c.emoji}</span><span class="cat-row-name">${esc(c.name)}</span><button class="cat-row-del" data-id="${c.id}">✕</button>`;
    r.querySelector('.cat-row-del').onclick=()=>{S.customCats=S.customCats.filter(x=>x.id!==c.id);save();renderCatList();initCatSelects();};
    el.appendChild(r);
  });
  if(!S.customCats?.length) el.innerHTML='<div class="empty-sm">No custom categories yet.</div>';
}
function addCustomCat(){
  const emoji=$$('set-cat-emoji')?.value?.trim()||'🏷️';
  const name=$$('set-cat-name')?.value?.trim(); if(!name){toast('🤨','Name required.');return;}
  if(!S.customCats)S.customCats=[];
  S.customCats.push({id:'cc_'+Date.now(),emoji,name});
  $$('set-cat-emoji').value=''; $$('set-cat-name').value='';
  save(); renderCatList(); initCatSelects(); toast('✅','Category added!');
}

/* ── ACTIVITY RENDER ────────────────────────── */
function renderActivity(){
  const el=$$('dash-activity'); if(!el)return;
  el.innerHTML='';
  if(!S.activity?.length){el.innerHTML='<div class="empty-sm">No activity yet.</div>';return;}
  S.activity.slice(0,10).forEach(a=>{
    const d=document.createElement('div'); d.className='act-item';
    d.innerHTML=`<span class="act-icon">${a.icon}</span><div class="act-body"><div class="act-text">${a.html}</div><div class="act-time">${timeAgo(a.time)}</div></div>`;
    el.appendChild(d);
  });
}

/* ── MODALS — GROUP ─────────────────────────── */
let editGid=null;
function openGroupModal(gid=null){
  editGid=gid; selectedGroupEmoji=GROUP_EMOJIS[0];
  const g=gid&&S.groups.find(x=>x.id===gid);
  $$('m-group-title').textContent=gid?'Edit Group':'New Group';
  $$('m-group-save').textContent=gid?'Save Changes':'Create Group';
  $$('g-name').value=g?.name||'';
  $$('g-budget').value=g?.budget||'';
  if(g) selectedGroupEmoji=g.emoji;
  buildEmojiGrid('g-emoji-grid',GROUP_EMOJIS,v=>selectedGroupEmoji=v,selectedGroupEmoji);
  initCurrencySelect('g-currency', g?.currency||S.defaultCurrency);
  openModal('m-group'); setTimeout(()=>$$('g-name').focus(),80);
}

function saveGroup(){
  const name=$$('g-name').value.trim(); if(!name){toast('🤨','Name required.');return;}
  const budget=parseFloat($$('g-budget').value)||0;
  const currency=$$('g-currency').value;
  if(editGid){
    pushUndo('edit group');
    const g=S.groups.find(x=>x.id===editGid);
    if(g){g.name=name;g.emoji=selectedGroupEmoji;g.budget=budget;g.currency=currency;}
    save(); closeModal('m-group'); renderCurrentPage(); toast('✏️','Group updated.');
  } else {
    createGroup(name,selectedGroupEmoji,currency,budget);
    closeModal('m-group'); renderCurrentPage();
  }
}

/* ── MODALS — EXPENSE ───────────────────────── */
function openExpenseModal(eid=null){
  editExpId=eid; pendingImg=null;
  const g=activeG(); if(!g){toast('🤨','Select a group first.');return;}
  const exp=eid&&g.expenses.find(e=>e.id===eid);
  $$('m-exp-title').textContent=eid?'Edit Expense':'Add Expense';
  $$('m-exp-save').textContent=eid?'Save Changes':'Log Expense';
  $$('e-desc').value=exp?.desc||'';
  $$('e-amount').value=exp?.amount||'';
  $$('e-date').value=exp?.date||new Date().toISOString().split('T')[0];
  $$('e-notes').value=exp?.notes||'';
  $$('e-currency-sym').textContent=getCur(g).sym;
  $$('e-recurring').checked=exp?.recurring||false;
  $$('e-recur-freq').style.display=exp?.recurring?'block':'none';
  $$('e-recur-freq').value=exp?.recurFreq||'monthly';
  initCatSelect('e-category', exp?.category||'other');
  initPayerSelect('e-payer', g, exp?.payer||'');
  // split type
  currentSplitType=exp?.splitType||'equal';
  document.querySelectorAll('.split-tab').forEach(b=>b.classList.toggle('active',b.dataset.split===currentSplitType));
  // participants
  selectedParticipants=new Set(exp?.participants||[]);
  renderParticipantChips(g, exp?.splits||{});
  updateSplitInputs(g, exp?.splits||{});
  // image
  $$('e-img-preview-wrap').style.display='none';
  $$('e-drop-zone').style.display='flex';
  $$('e-drop-text').textContent='Click or drag image';
  if(exp?.imageData){pendingImg=exp.imageData;$$('e-img-preview').src=pendingImg;$$('e-img-preview-wrap').style.display='block';$$('e-drop-zone').style.display='none';}
  openModal('m-expense'); setTimeout(()=>$$('e-desc').focus(),80);
}

function saveExpense(){
  const g=activeG(); if(!g)return;
  const desc=$$('e-desc').value.trim();
  const amount=parseFloat($$('e-amount').value);
  const payer=$$('e-payer').value;
  const category=$$('e-category').value||'other';
  const date=$$('e-date').value||new Date().toISOString().split('T')[0];
  const notes=$$('e-notes').value.trim();
  const recurring=$$('e-recurring').checked;
  const recurFreq=$$('e-recur-freq').value;
  const participants=[...selectedParticipants];

  if(!desc){toast('🤨','Give this expense a name.');return;}
  if(!amount||amount<=0){toast('💰','Enter a valid amount.');return;}
  if(!payer){toast('👉','Who paid?');return;}
  if(!participants.length){toast('🙃','Select participants.');return;}

  // validate custom split
  const splits=getSplitValues();
  if(currentSplitType==='percent'){const t=Object.values(splits).reduce((a,b)=>a+b,0);if(Math.abs(t-100)>0.5){toast('🧮','Percentages must total 100%.');return;}}
  if(currentSplitType==='exact'){const t=Object.values(splits).reduce((a,b)=>a+b,0);if(Math.abs(t-amount)>0.5){toast('🧮','Amounts must match total.');return;}}

  pushUndo(editExpId?'edit expense':'add expense');

  const expData={id:editExpId||Date.now(),desc,amount,payer,participants,category,date,notes,splitType:currentSplitType,splits,recurring,recurFreq,imageData:pendingImg,pinned:false,comments:[],reactions:{}};

  if(editExpId){
    const idx=g.expenses.findIndex(e=>e.id===editExpId);
    if(idx!==-1){expData.pinned=g.expenses[idx].pinned;expData.comments=g.expenses[idx].comments||[];expData.reactions=g.expenses[idx].reactions||{};g.expenses[idx]=expData;}
  } else {
    g.expenses.unshift(expData);
    const cat=getCat(category);
    logAct(cat.emoji,`<strong>${esc(payer)}</strong> paid <strong>${fmtAmt(amount,g)}</strong> for ${esc(desc)}`);
    // budget check
    const spent=g.expenses.reduce((s,e)=>s+e.amount,0);
    if(g.budget&&spent/g.budget>=0.8) sendNotif('SplitOrDie 💸',`Budget alert in ${g.name}: ${Math.round(spent/g.budget*100)}% used`);
  }

  save(); closeModal('m-expense'); renderCurrentPage();
  const t=rand(FX.exp); toast(t.i,t.m);
}

function getSplitValues(){
  const res={};
  document.querySelectorAll('.split-val-inp').forEach(inp=>{res[inp.dataset.name]=parseFloat(inp.value)||0;});
  return res;
}

function renderParticipantChips(g, existingSplits={}){
  const con=$$('e-participants'); con.innerHTML='';
  if(!g?.friends?.length){con.innerHTML='<span style="font-size:.78rem;color:var(--text3);font-style:italic">Add friends first.</span>';return;}
  g.friends.forEach(f=>{
    const chip=document.createElement('div');
    chip.className='sel-chip'+(selectedParticipants.has(f.name)?' selected':'');
    chip.innerHTML=`${f.avatar||''} ${esc(f.name)}`;
    chip.onclick=()=>{
      selectedParticipants.has(f.name)?selectedParticipants.delete(f.name):selectedParticipants.add(f.name);
      chip.classList.toggle('selected',selectedParticipants.has(f.name));
      updateSplitInputs(g, getSplitValues());
    };
    con.appendChild(chip);
  });
}

function updateSplitInputs(g, existing={}){
  const wrap=$$('e-split-inputs-wrap');
  const participants=[...selectedParticipants];
  const amt=parseFloat($$('e-amount')?.value)||0;
  const hint=$$('e-split-hint');

  if(currentSplitType==='equal'||!participants.length){wrap.style.display='none';if(hint)hint.textContent='(tap to select)';return;}
  wrap.style.display='block';
  $$('e-split-inputs-label').textContent=currentSplitType==='percent'?'Percentage per person':'Amount per person';
  if(hint)hint.textContent=currentSplitType==='percent'?'(must total 100%)':'(must match total)';
  const inp=$$('e-split-inputs'); inp.innerHTML='';
  participants.forEach(name=>{
    const f=g.friends.find(x=>x.name===name);
    const row=document.createElement('div'); row.style.cssText='display:grid;grid-template-columns:1fr 1fr;gap:8px;align-items:center;margin-bottom:8px';
    row.innerHTML=`<span style="font-size:.83rem;color:var(--text2)">${f?.avatar||''} ${esc(name)}</span><input class="inp split-val-inp" type="number" data-name="${esc(name)}" value="${existing[name]||''}" placeholder="${currentSplitType==='percent'?'%':'amount'}" min="0" step="${currentSplitType==='percent'?'1':'0.01'}"/>`;
    inp.appendChild(row);
  });
  inp.querySelectorAll('.split-val-inp').forEach(i=>i.oninput=()=>updateSplitRemaining(amt));
  updateSplitRemaining(amt);
}

function updateSplitRemaining(amt){
  const rem=$$('e-split-remaining'); if(!rem)return;
  const vals=[...document.querySelectorAll('.split-val-inp')].map(i=>parseFloat(i.value)||0);
  const total=vals.reduce((a,b)=>a+b,0);
  if(currentSplitType==='percent'){
    const left=100-total;
    rem.textContent=`${total.toFixed(1)}% allocated — ${Math.abs(left).toFixed(1)}% ${left<0?'over':'remaining'}`;
    rem.className='split-remaining'+(Math.abs(left)<0.1?' ok':left<0?' warn':'');
  } else {
    const left=amt-total;
    rem.textContent=`₹${fmt(total)} allocated — ₹${fmt(Math.abs(left))} ${left<0?'over':'remaining'}`;
    rem.className='split-remaining'+(Math.abs(left)<0.1?' ok':left<0?' warn':'');
  }
}

/* ── MODALS — FRIEND ────────────────────────── */
function openFriendModal(){
  selectedFriendAvatar=FRIEND_AVATARS[0];
  $$('f-name').value='';
  buildEmojiGrid('f-avatar-grid',FRIEND_AVATARS,v=>selectedFriendAvatar=v,selectedFriendAvatar);
  openModal('m-friend'); setTimeout(()=>$$('f-name').focus(),80);
}

function saveFriend(){
  const g=activeG(); if(!g)return;
  const name=$$('f-name').value.trim(); if(!name){toast('🤨','Name required.');return;}
  if(g.friends.find(f=>f.name===name)){toast('🤦',`${name} already in squad.`);return;}
  pushUndo('add friend');
  g.friends.push({name,avatar:selectedFriendAvatar});
  save(); closeModal('m-friend'); renderCurrentPage();
  logAct('👋',`<strong>${esc(name)}</strong> joined the squad`);
  const t=rand(FX.friend); toast(t.i,t.m);
}

/* ── MODALS — SETTLE ────────────────────────── */
function openSettleModal(prefillFrom='',prefillTo='',prefillAmt=''){
  const g=activeG(); if(!g){toast('🤨','Select a group.');return;}
  const opts=g.friends.map(f=>`<option>${esc(f.name)}</option>`).join('');
  $$('s-from').innerHTML=opts; $$('s-to').innerHTML=opts;
  if(prefillFrom) $$('s-from').value=prefillFrom;
  if(prefillTo)   $$('s-to').value=prefillTo;
  $$('s-amount').value=prefillAmt;
  $$('s-note').value='';
  openModal('m-settle');
}

function saveSettlement(){
  const g=activeG(); if(!g)return;
  const from=$$('s-from').value, to=$$('s-to').value;
  const amount=parseFloat($$('s-amount').value);
  const note=$$('s-note').value.trim();
  if(!from||!to){toast('🤨','Select both parties.');return;}
  if(from===to){toast('🤨','Can\'t pay yourself.');return;}
  if(!amount||amount<=0){toast('💰','Enter an amount.');return;}
  if(!S.settlements)S.settlements=[];
  S.settlements.push({id:Date.now(),groupId:g.id,from,to,amount,note,date:new Date().toISOString()});
  save(); closeModal('m-settle'); renderCurrentPage();
  logAct('✅',`<strong>${esc(from)}</strong> paid <strong>${esc(to)}</strong> — ${fmtAmt(amount,g)}`);
  const t=rand(FX.settle); toast(t.i,t.m);
}

/* ── DETAIL MODAL ───────────────────────────── */
function openDetailModal(g,eid){
  const exp=g.expenses.find(e=>e.id===eid); if(!exp)return;
  detailExpId=eid;
  $$('m-detail-title').textContent=exp.desc;
  const body=$$('m-detail-body'); body.innerHTML='';
  const cat=getCat(exp.category);
  const fields=[['Amount',fmtAmt(exp.amount,g)],['Category',`${cat.emoji} ${cat.name}`],['Paid by',exp.payer],['Split',exp.splitType+' · '+exp.participants.join(', ')],['Per head',fmtAmt(amountOwed(exp,exp.participants[0]),g)],['Date',exp.date?new Date(exp.date).toLocaleDateString('en-IN',{dateStyle:'medium'}):'—']];
  fields.forEach(([l,v])=>{const d=document.createElement('div');d.style.cssText='margin-bottom:10px';d.innerHTML=`<div style="font-size:.68rem;color:var(--text3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px">${l}</div><div style="font-size:.88rem;color:var(--text)">${v}</div>`;body.appendChild(d);});
  // comments & reactions
  const reacRow=document.createElement('div'); reacRow.style.cssText='display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px';
  ['👍','😂','😬','💀','🥹'].forEach(em=>{
    const b=document.createElement('button'); b.className='btn btn-ghost btn-xs';
    const cnt=(exp.reactions||{})[em]||0;
    b.textContent=`${em}${cnt?` ${cnt}`:''}`;
    b.onclick=()=>{if(!exp.reactions)exp.reactions={};exp.reactions[em]=(exp.reactions[em]||0)+1;save();openDetailModal(g,eid);};
    reacRow.appendChild(b);
  });
  body.appendChild(reacRow);
  // notes
  const ns=document.createElement('div'); ns.style.marginBottom='8px';
  ns.innerHTML=`<div style="font-size:.68rem;color:var(--text3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px">Notes</div><textarea class="inp textarea" id="detail-notes" rows="3" maxlength="300" placeholder="Add context…">${esc(exp.notes||'')}</textarea>`;
  body.appendChild(ns);
  // image
  if(exp.imageData){const imgS=document.createElement('div');imgS.innerHTML=`<img src="${exp.imageData}" style="width:100%;border-radius:8px;border:1px solid var(--border);cursor:pointer" onclick="window.open(this.src)"/>`;body.appendChild(imgS);}
  // Comments
  const comments=exp.comments||[];
  if(comments.length){const ch=document.createElement('div');ch.innerHTML=`<div style="font-size:.68rem;color:var(--text3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px">Comments</div>`+comments.map(c=>`<div style="padding:7px 10px;background:var(--surface2);border:1px solid var(--border);border-radius:8px;margin-bottom:5px;font-size:.8rem;color:var(--text2)">${esc(c.text)}<span style="float:right;font-size:.65rem;color:var(--text3)">${timeAgo(c.time)}</span></div>`).join('');body.appendChild(ch);}
  const addCommentRow=document.createElement('div');addCommentRow.style.cssText='display:flex;gap:6px';
  addCommentRow.innerHTML=`<input class="inp" id="detail-comment" placeholder="Add comment…" style="flex:1"/><button class="btn btn-ghost btn-sm" id="detail-comment-btn">Send</button>`;
  body.appendChild(addCommentRow);
  openModal('m-detail');
  $$('detail-comment-btn').onclick=()=>{
    const txt=$$('detail-comment').value.trim(); if(!txt)return;
    if(!exp.comments)exp.comments=[];
    exp.comments.push({text:txt,time:Date.now()});
    save(); openDetailModal(g,eid);
  };
}

/* ── EXPORT ─────────────────────────────────── */
function exportCSV(){
  const g=activeG(); if(!g)return;
  const rows=[['Date','Description','Amount','Payer','Participants','Category','Notes']];
  g.expenses.forEach(e=>{rows.push([e.date,e.desc,e.amount,e.payer,e.participants.join(';'),getCat(e.category).name,e.notes||'']);});
  const csv=rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
  downloadText(csv,`${g.name}_expenses.csv`,'text/csv');
  toast('📊','CSV exported!');
}
function exportJSON(){
  const data=JSON.stringify(S,null,2);
  downloadText(data,'splitOrDie_backup.json','application/json');
  toast('📦','Full backup exported!');
}
function exportAllCSV(){
  const rows=[['Group','Date','Description','Amount','Payer','Participants','Category']];
  S.groups.forEach(g=>{g.expenses.forEach(e=>{rows.push([g.name,e.date,e.desc,e.amount,e.payer,e.participants.join(';'),getCat(e.category).name]);});});
  downloadText(rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n'),'splitOrDie_all.csv','text/csv');
  toast('📊','All groups exported!');
}
function exportPDF(){
  const g=activeG(); if(!g)return;
  const txns=calcBalances(g);
  const total=g.expenses.reduce((s,e)=>s+e.amount,0);
  const win=window.open('','_blank');
  win.document.write(`<!DOCTYPE html><html><head><title>${g.name} — SplitOrDie</title><style>body{font-family:sans-serif;padding:32px;color:#111}h1{font-size:1.5rem;margin-bottom:4px}table{width:100%;border-collapse:collapse;margin-top:16px}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f5f5f5}h2{margin-top:24px;font-size:1.1rem}</style></head><body>`);
  win.document.write(`<h1>${g.emoji} ${g.name}</h1><div>Generated ${new Date().toLocaleDateString()}</div>`);
  win.document.write(`<h2>Expenses — Total: ₹${fmt(total)}</h2><table><tr><th>Date</th><th>Description</th><th>Amount</th><th>Paid by</th></tr>`);
  g.expenses.forEach(e=>win.document.write(`<tr><td>${e.date}</td><td>${e.desc}</td><td>₹${fmt(e.amount)}</td><td>${e.payer}</td></tr>`));
  win.document.write(`</table><h2>Settlements</h2>`);
  txns.forEach(t=>win.document.write(`<div style="margin:8px 0">• ${t.from} → ${t.to}: ₹${fmt(t.amount)}</div>`));
  win.document.write(`</body></html>`); win.document.close(); win.print();
  toast('📄','PDF ready!');
}

function importJSON(file){
  const r=new FileReader();
  r.onload=e=>{
    try{const p=JSON.parse(e.target.result);if(p.groups){pushUndo('import data');Object.assign(S,p);save();renderCurrentPage();toast('📥','Data imported!');}}
    catch(_){toast('❌','Invalid JSON file.');}
  };
  r.readAsText(file);
}

function downloadText(content,filename,type){
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([content],{type}));
  a.download=filename; a.click();
}

/* ── WHATSAPP & COPY ────────────────────────── */
function buildSummary(){
  const g=activeG(); if(!g)return '';
  const txns=calcBalances(g); const total=g.expenses.reduce((s,e)=>s+e.amount,0);
  return [`💸 *SplitOrDie — ${g.emoji} ${g.name}*`,`_${new Date().toLocaleDateString('en-IN',{dateStyle:'medium'})}_`,'',`*Squad:* ${g.friends.map(f=>f.name).join(', ')}`,`*Total:* ${fmtAmt(total,g)}`,'','*Expenses:*',...g.expenses.slice().reverse().map(e=>`• ${e.desc} — ${fmtAmt(e.amount,g)} (${e.payer})`),'','*Who owes:*',...(txns.length?txns.map(t=>`• ${t.from} → ${t.to}: ${fmtAmt(t.amount,g)}`):['All settled! 🎉']),'','_— SplitOrDie™_'].join('\n');
}
function shareWhatsApp(){window.open(`https://wa.me/?text=${encodeURIComponent(buildSummary())}`);}
function copyText(text){
  const ok=()=>{const t=rand(FX.copied);toast(t.i,t.m);};
  if(navigator.clipboard&&window.isSecureContext)navigator.clipboard.writeText(text).then(ok).catch(()=>{});
  else{const ta=document.createElement('textarea');ta.value=text;ta.style.cssText='position:fixed;opacity:0';document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();ok();}
}

/* ── THEME ──────────────────────────────────── */
function applyTheme(t){S.theme=t;document.documentElement.setAttribute('data-theme',t);$$('theme-btn').textContent=t==='dark'?'🌙':'☀️';}
function toggleTheme(){applyTheme(S.theme==='dark'?'light':'dark');save();}

/* ── NOTIFICATIONS ──────────────────────────── */
function sendNotif(title,body){if('Notification' in window&&Notification.permission==='granted'){try{new Notification(title,{body});}catch(_){}}}

/* ── MODAL HELPERS ──────────────────────────── */
const openModal=id=>{const e=$$(id);if(e)e.style.display='flex';};
const closeModal=id=>{const e=$$(id);if(e)e.style.display='none';};
function closeAllModals(){document.querySelectorAll('.modal-overlay').forEach(m=>m.style.display='none');}
function confirm2(title,msg,cb){
  confirmCallback=cb;
  $$('m-confirm-title').textContent=title;
  $$('m-confirm-msg').textContent=msg;
  openModal('m-confirm');
}

/* ── SIDEBAR ────────────────────────────────── */
function openSidebar(){$$('sidebar').classList.add('open');const o=document.createElement('div');o.className='sidebar-overlay visible';o.id='sidebar-overlay';o.onclick=closeSidebar;document.body.appendChild(o);}
function closeSidebar(){$$('sidebar')?.classList.remove('open');document.getElementById('sidebar-overlay')?.remove();}

/* ── SELECT HELPERS ─────────────────────────── */
function buildEmojiGrid(id,emojis,onSelect,selected){
  const grid=$$(id); if(!grid)return; grid.innerHTML='';
  emojis.forEach(em=>{
    const d=document.createElement('div'); d.className='emoji-opt'+(em===selected?' selected':''); d.textContent=em;
    d.onclick=()=>{onSelect(em);grid.querySelectorAll('.emoji-opt').forEach(x=>x.classList.remove('selected'));d.classList.add('selected');};
    grid.appendChild(d);
  });
}
function initCurrencySelect(id,selected){
  const sel=$$(id); if(!sel)return; sel.innerHTML='';
  CURRENCIES.forEach(c=>{const o=document.createElement('option');o.value=c.code;o.textContent=`${c.sym} ${c.code}`;if(c.code===selected)o.selected=true;sel.appendChild(o);});
}
function initCatSelect(id,selected){
  const sel=$$(id); if(!sel)return; sel.innerHTML='';
  allCats().forEach(c=>{const o=document.createElement('option');o.value=c.id;o.textContent=`${c.emoji} ${c.name}`;if(c.id===selected)o.selected=true;sel.appendChild(o);});
}
function initPayerSelect(id,g,selected){
  const sel=$$(id); if(!sel)return; sel.innerHTML='<option value="">— who paid? —</option>';
  (g?.friends||[]).forEach(f=>{const o=document.createElement('option');o.value=f.name;o.textContent=`${f.avatar||''} ${f.name}`;if(f.name===selected)o.selected=true;sel.appendChild(o);});
}
function initCatSelects(){initCatSelect('e-category', $$('e-category')?.value);}

/* ── GLOBAL SEARCH ──────────────────────────── */
function globalSearch(q){
  if(!q){renderCurrentPage();return;}
  const results=[];
  S.groups.forEach(g=>{
    (g.expenses||[]).forEach(e=>{
      if(e.desc.toLowerCase().includes(q)||e.payer.toLowerCase().includes(q)||(e.notes||'').toLowerCase().includes(q))
        results.push({type:'expense',g,e});
    });
  });
  // show results in dashboard
  navigate('dashboard');
  const el=$$('dash-recent-expenses'); if(!el)return;
  el.innerHTML='';
  if(!results.length){el.innerHTML='<div class="empty-sm">No results found.</div>';return;}
  results.slice(0,10).forEach(({g,e})=>{
    const cat=getCat(e.category);
    const d=document.createElement('div'); d.className='exp-item';
    d.innerHTML=`<span class="exp-emoji">${cat.emoji}</span><div class="exp-info"><div class="exp-desc">${esc(e.desc)}</div><div class="exp-meta">${esc(g.emoji)} ${esc(g.name)} · ${esc(e.payer)}</div></div><span class="exp-amount">${fmtAmt(e.amount,g)}</span>`;
    d.onclick=()=>openDetailModal(g,e.id);
    el.appendChild(d);
  });
}

/* ── KEYBOARD SHORTCUTS ─────────────────────── */
function handleKey(e){
  const tag=document.activeElement.tagName;
  if(['INPUT','TEXTAREA','SELECT'].includes(tag)){if(e.key==='Escape'){document.activeElement.blur();closeAllModals();}return;}
  const anyOpen=[...document.querySelectorAll('.modal-overlay')].some(m=>m.style.display==='flex');
  if(anyOpen){if(e.key==='Escape')closeAllModals();return;}
  switch(e.key){
    case 'e':case 'E': openExpenseModal(); break;
    case 'g':case 'G': openGroupModal(); break;
    case 'f':case 'F': openFriendModal(); break;
    case 's':case 'S': openSettleModal(); break;
    case 'z':case 'Z': performUndo(); break;
    case 't':case 'T': toggleTheme(); break;
    case '?':          openModal('m-shortcuts'); break;
    case '/':          e.preventDefault(); $$('global-search')?.focus(); break;
    case 'Escape':     closeAllModals(); break;
  }
}

/* ── PROFILE & SESSION ──────────────────────── */
function initProfile(){
  const session=getSession(); if(!session)return;
  $$('sidebar-avatar').textContent=session.avatar||'😎';
  $$('sidebar-name').textContent=session.name||'Profile';
  $$('header-avatar')&&($$('header-avatar').textContent=session.avatar||'😎');
}

/* ── IMAGE UPLOAD ───────────────────────────── */
function initImageUpload(){
  const dz=$$('e-drop-zone'),fi=$$('e-image'),prev=$$('e-img-preview'),pw=$$('e-img-preview-wrap'),dt=$$('e-drop-text'),rb=$$('e-img-remove');
  if(!dz)return;
  dz.addEventListener('click',()=>fi.click());
  fi.addEventListener('change',()=>{if(fi.files[0])loadImg(fi.files[0]);});
  dz.addEventListener('dragover',ev=>{ev.preventDefault();dz.classList.add('drag-over');});
  dz.addEventListener('dragleave',()=>dz.classList.remove('drag-over'));
  dz.addEventListener('drop',ev=>{ev.preventDefault();dz.classList.remove('drag-over');const f=ev.dataTransfer.files[0];if(f?.type.startsWith('image/'))loadImg(f);});
  rb?.addEventListener('click',()=>{pendingImg=null;pw.style.display='none';dz.style.display='flex';dt.textContent='Click or drag image';fi.value='';});
  function loadImg(f){const r=new FileReader();r.onload=ev=>{pendingImg=ev.target.result;prev.src=pendingImg;pw.style.display='block';dz.style.display='none';dt.textContent=f.name;};r.readAsDataURL(f);}
}

/* ── PWA ────────────────────────────────────── */
function initPWA(){
  if('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(()=>{});
}

/* ── UTILS ──────────────────────────────────── */
const $$=id=>document.getElementById(id);
function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function fmt(n=0){return(Math.round((+n||0)*100)/100).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2});}
function fmtK(n){return n>=1000?`${(n/1000).toFixed(1)}k`:`${Math.round(n)}`;}
function rc(n){return Math.round((+n||0)*100)/100;}
const rand=a=>a[Math.floor(Math.random()*a.length)];

function toast(icon,msg){
  const c=$$('toast-container');
  const t=document.createElement('div'); t.className='toast';
  t.innerHTML=`<span>${icon}</span><span>${esc(msg)}</span>`;
  c.appendChild(t);
  setTimeout(()=>{t.classList.add('removing');t.addEventListener('animationend',()=>t.remove(),{once:true});},3200);
}

/* ── BIND ALL EVENTS ────────────────────────── */
function bindEvents(){
  // nav
  document.querySelectorAll('[data-page]').forEach(b=>{
    b.addEventListener('click',()=>navigate(b.dataset.page));
  });
  // sidebar toggle
  $$('sidebar-toggle')?.addEventListener('click',openSidebar);
  // theme
  $$('theme-btn')?.addEventListener('click',toggleTheme);
  // undo
  $$('undo-btn')?.addEventListener('click',performUndo);
  // shortcuts
  $$('shortcuts-btn')?.addEventListener('click',()=>openModal('m-shortcuts'));
  // quick add
  $$('quick-add-btn')?.addEventListener('click',openExpenseModal);
  $$('bnav-add-btn')?.addEventListener('click',openExpenseModal);
  // dashboard
  $$('dash-new-group-btn')?.addEventListener('click',openGroupModal);
  $$('dash-group-select')?.addEventListener('change',e=>{S.activeGroup=+e.target.value;save();renderDashGroup();});
  $$('dash-add-friend-btn')?.addEventListener('click',openFriendModal);
  $$('dash-settle-btn')?.addEventListener('click',openSettleModal);
  $$('dash-whatsapp-btn')?.addEventListener('click',shareWhatsApp);
  $$('dash-copy-btn')?.addEventListener('click',()=>copyText(buildSummary()));
  $$('dash-clear-activity')?.addEventListener('click',()=>{S.activity=[];save();renderActivity();toast('🧹','Cleared.');});
  // groups page
  $$('groups-new-btn')?.addEventListener('click',openGroupModal);
  // group modal
  $$('m-group-save')?.addEventListener('click',saveGroup);
  $$('g-name')?.addEventListener('keydown',e=>{if(e.key==='Enter')saveGroup();});
  // expense modal
  $$('m-exp-save')?.addEventListener('click',saveExpense);
  document.querySelectorAll('.split-tab').forEach(b=>b.addEventListener('click',()=>{
    document.querySelectorAll('.split-tab').forEach(x=>x.classList.remove('active'));
    b.classList.add('active'); currentSplitType=b.dataset.split;
    const g=activeG(); updateSplitInputs(g,getSplitValues());
  }));
  $$('e-recurring')?.addEventListener('change',e=>{$$('e-recur-freq').style.display=e.target.checked?'inline-block':'none';});
  $$('e-amount')?.addEventListener('input',()=>{updateSplitRemaining(parseFloat($$('e-amount').value)||0);});
  // friend modal
  $$('m-friend-save')?.addEventListener('click',saveFriend);
  $$('f-name')?.addEventListener('keydown',e=>{if(e.key==='Enter')saveFriend();});
  // settle modal
  $$('m-settle-save')?.addEventListener('click',saveSettlement);
  $$('settle-record-btn')?.addEventListener('click',openSettleModal);
  $$('settle-group-sel')?.addEventListener('change',renderSettlements);
  // analytics
  $$('analytics-group-sel')?.addEventListener('change',renderAnalytics);
  // detail modal
  $$('m-detail-save')?.addEventListener('click',()=>{
    const g=activeG(); if(!g||!detailExpId)return;
    const exp=g.expenses.find(e=>e.id===detailExpId); if(!exp)return;
    exp.notes=$$('detail-notes')?.value?.trim()||''; save(); renderCurrentPage(); closeModal('m-detail'); toast('💾','Notes saved.');
  });
  $$('m-detail-delete')?.addEventListener('click',()=>{if(detailExpId){closeModal('m-detail');deleteExp(activeG(),detailExpId);}});
  // confirm modal
  $$('m-confirm-ok')?.addEventListener('click',()=>{closeModal('m-confirm');if(confirmCallback){confirmCallback();confirmCallback=null;}});
  // friends page
  $$('friends-add-btn')?.addEventListener('click',openFriendModal);
  $$('friends-search')?.addEventListener('input',renderFriends);
  // history tabs
  document.querySelectorAll('.htab').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('.htab').forEach(x=>x.classList.remove('active'));b.classList.add('active');renderHistory();}));
  // settings
  $$('set-cat-add')?.addEventListener('click',addCustomCat);
  $$('set-cat-name')?.addEventListener('keydown',e=>{if(e.key==='Enter')addCustomCat();});
  $$('set-export-btn')?.addEventListener('click',()=>openModal('m-export'));
  $$('set-import-btn')?.addEventListener('click',()=>$$('set-import-file').click());
  $$('set-import-file')?.addEventListener('change',e=>{if(e.target.files[0])importJSON(e.target.files[0]);});
  $$('set-export-all-csv')?.addEventListener('click',exportAllCSV);
  $$('set-reset-all')?.addEventListener('click',()=>confirm2('Reset Everything?','ALL data will be deleted permanently.',()=>{S={theme:S.theme,defaultCurrency:S.defaultCurrency,activeGroup:null,groups:[],settlements:[],customCats:[],activity:[],archivedGroups:[]};save();renderCurrentPage();toast('🔥','All data cleared.');}));
  // export modal
  $$('exp-csv')?.addEventListener('click',()=>{closeModal('m-export');exportCSV();});
  $$('exp-json')?.addEventListener('click',()=>{closeModal('m-export');exportJSON();});
  $$('exp-txt')?.addEventListener('click',()=>{closeModal('m-export');copyText(buildSummary());});
  $$('exp-pdf')?.addEventListener('click',()=>{closeModal('m-export');exportPDF();});
  // modal close
  document.querySelectorAll('.modal-close[data-close]').forEach(b=>b.addEventListener('click',()=>closeModal(b.dataset.close)));
  document.querySelectorAll('.modal-overlay').forEach(o=>o.addEventListener('click',e=>{if(e.target===o)closeModal(o.id);}));
  // global search
  $$('global-search')?.addEventListener('input',e=>globalSearch(e.target.value.trim().toLowerCase()));
  // keyboard
  window.addEventListener('keydown',handleKey);
  // cross-tab
  window.addEventListener('storage',e=>{if(e.key===SK){load();renderCurrentPage();}});
  // tab links
  document.querySelectorAll('[data-tab-link]').forEach(b=>b.addEventListener('click',()=>navigate(b.dataset.tabLink)));
}

/* ── INIT ───────────────────────────────────── */
function init(){
  load();
  if(!S.groups||S.groups.length===0){
    const g={id:Date.now(),name:'My Group',emoji:'💸',currency:S.defaultCurrency||'INR',budget:0,friends:[],expenses:[],archived:false};
    S.groups.push(g); S.activeGroup=g.id;
  }
  if(!S.activeGroup) S.activeGroup=S.groups.find(g=>!g.archived)?.id||S.groups[0]?.id;
  applyTheme(S.theme||'dark');
  processRecurring();
  initPWA();
  initImageUpload();
  initProfile();
  bindEvents();
  navigate('dashboard');
  updateUndoBtn();
  // request notif permission on first interaction
  document.addEventListener('click',()=>{if('Notification' in window&&Notification.permission==='default')Notification.requestPermission();},{once:true});
}

document.addEventListener('DOMContentLoaded',init);