// 低温箱周转看板 - 核心逻辑
const { BOXES, FLOW_LOGS, STATUS_DEF, CARRIERS, OWNERS, DESTS, PLATES, RESPONSIBLES,
  FOLLOW_STATUS,
  getStatusCount, getRiskCount, getRouteBoxes, getOverdueBoxes,
  formatDT, formatD, diffDays, diffHours, isSameDay,
  buildTimeline, setBoxPersist, setBoxFollowStatusOnly, clearAllPersist,
  getShiftSummary, buildShiftText,
  saveShiftLog, getShiftLogs, getShiftLogDates, getShiftLogsByDate,
  getEscalatedBoxes, generateEscalationSpeech } = window.MOCK;

const COLOR_MAP = {
  emerald: { bg: 'bg-emerald-50',  border: 'border-emerald-200',   text: 'text-emerald-700',  num: 'text-emerald-600', ring: 'ring-emerald-500', fill: 'bg-emerald-500', light: 'bg-emerald-100' },
  blue:    { bg: 'bg-blue-50',     border: 'border-blue-200',      text: 'text-blue-700',     num: 'text-blue-600',    ring: 'ring-blue-500',    fill: 'bg-blue-500',    light: 'bg-blue-100' },
  amber:   { bg: 'bg-amber-50',    border: 'border-amber-200',     text: 'text-amber-700',    num: 'text-amber-600',   ring: 'ring-amber-500',   fill: 'bg-amber-500',   light: 'bg-amber-100' },
  cyan:    { bg: 'bg-cyan-50',     border: 'border-cyan-200',      text: 'text-cyan-700',     num: 'text-cyan-600',    ring: 'ring-cyan-500',    fill: 'bg-cyan-500',    light: 'bg-cyan-100' },
  rose:    { bg: 'bg-rose-50',     border: 'border-rose-200',      text: 'text-rose-700',     num: 'text-rose-600',    ring: 'ring-rose-500',    fill: 'bg-rose-500',    light: 'bg-rose-100' },
  red:     { bg: 'bg-red-50',      border: 'border-red-300',       text: 'text-red-700',      num: 'text-red-600',     ring: 'ring-red-500',     fill: 'bg-red-500',     light: 'bg-red-100' },
  slate:   { bg: 'bg-slate-50',    border: 'border-slate-200',     text: 'text-slate-700',    num: 'text-slate-600',   ring: 'ring-slate-500',   fill: 'bg-slate-500',   light: 'bg-slate-200' },
  cold:    { bg: 'bg-cold-50',     border: 'border-cold-200',      text: 'text-cold-700',     num: 'text-cold-600',    ring: 'ring-cold-500',    fill: 'bg-cold-500',    light: 'bg-cold-100' },
};

const FOLLOW_COLOR = {
  pending:   COLOR_MAP.slate,
  contacted: COLOR_MAP.blue,
  returning: COLOR_MAP.emerald,
  lost:      COLOR_MAP.red,
};

const ICONS = {
  warehouse: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 21h18M5 21V9l7-5 7 5v12M9 21v-6h6v6"/></svg>`,
  truck:     `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0h-3V8h-7V5h-3l-3 5v7m13 0a2 2 0 11-4 0"/></svg>`,
  store:     `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9l2-5h14l2 5M5 9v11h14V9M9 13h6"/></svg>`,
  sparkles:  `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"/></svg>`,
  wrench:    `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>`,
  phone:     `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>`,
  note:      `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>`,
  chevron:   `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>`,
  clock:     `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`,
  user:      `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>`,
  file:      `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>`,
  out:       `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>`,
  sign:      `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>`,
  call:      `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>`,
  return_plan: `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/></svg>`,
  remark:    `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"/></svg>`,
};

const TIMELINE_STYLE = {
  out:         { c: COLOR_MAP.blue,    label: '出库' },
  sign:        { c: COLOR_MAP.emerald, label: '客户签收' },
  call:        { c: COLOR_MAP.amber,   label: '催还' },
  remark:      { c: COLOR_MAP.cold,    label: '催还记录' },
  return_plan: { c: COLOR_MAP.cyan,    label: '返程安排' },
};

// ==================== 路由切换 ====================
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => switchPage(btn.dataset.page));
});

function switchPage(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(`page-${page}`).classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(b => {
    const active = b.dataset.page === page;
    b.classList.toggle('bg-white', active);
    b.classList.toggle('text-cold-700', active);
    b.classList.toggle('shadow-sm', active);
    b.classList.toggle('text-slate-600', !active);
    b.classList.toggle('hover:text-slate-800', !active);
  });
  if (page === 'overview') renderOverview();
  if (page === 'route') renderRoute();
  if (page === 'overdue') renderOverdue();
}

// ==================== Toast ====================
function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `fixed top-20 left-1/2 -translate-x-1/2 z-[60] px-5 py-3 rounded-lg shadow-lg text-sm text-white ${type === 'success' ? 'bg-emerald-600' : type === 'error' ? 'bg-red-600' : 'bg-slate-700'}`;
  setTimeout(() => t.classList.add('hidden'), 2500);
  t.classList.remove('hidden');
}

// ==================== 实时时间 ====================
function updateClock() {
  const now = new Date();
  const pad = x => String(x).padStart(2, '0');
  document.getElementById('currentTime').textContent =
    `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  const h = now.getHours();
  const shiftInfo = document.getElementById('shiftInfo');
  let shift, countdown;
  if (h >= 8 && h < 20) {
    shift = '早班';
    const left = (20 - h) * 60 - now.getMinutes();
    countdown = `距离交接班 ${Math.floor(left/60)}小时${left%60}分`;
  } else {
    shift = '晚班';
    const left = (h >= 20 ? (24 - h + 8) : (8 - h)) * 60 - now.getMinutes();
    countdown = `距离交接班 ${Math.floor(left/60)}小时${left%60}分`;
  }
  shiftInfo.textContent = `${shift} · ${countdown}`;
  const sc = document.getElementById('shiftClock');
  if (sc) sc.textContent = `${shift} · ${pad(now.getHours())}:${pad(now.getMinutes())}`;
}
setInterval(updateClock, 1000);
updateClock();

// ==================== 复制剪贴板 ====================
function copyToClipboard(text, successMsg = '已复制到剪贴板') {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => showToast(successMsg)).catch(() => fallbackCopy(text, successMsg));
  } else {
    fallbackCopy(text, successMsg);
  }
}
function fallbackCopy(text, successMsg) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand('copy'); showToast(successMsg); }
  catch(e) { showToast('复制失败，请手动复制', 'error'); }
  document.body.removeChild(ta);
}

// ==================== 升级提醒渲染 ====================
function renderEscalation() {
  const list = getEscalatedBoxes();
  const countEl = document.getElementById('escalationCount');
  const countOverdueEl = document.getElementById('escalationCountOverdue');
  const listEl = document.getElementById('escalationList');
  const listOverdueEl = document.getElementById('escalationListOverdue');

  if (countEl) countEl.textContent = list.length;
  if (countOverdueEl) countOverdueEl.textContent = list.length;

  const html = list.length ? list.map(b => {
    const isLost = b.followStatus === 'lost';
    const c = isLost ? COLOR_MAP.red : COLOR_MAP.rose;
    return `
      <div class="p-3 rounded-lg border ${c.border} ${c.bg} flex items-start gap-2.5 cursor-pointer hover:shadow-sm" onclick="openDrawer('${b.id}')">
        <div class="w-7 h-7 rounded-md ${c.light} ${c.text} flex items-center justify-center shrink-0">
          ${isLost ? `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>` :
          `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`}
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="font-semibold text-slate-800 text-sm">${b.id}</span>
            <span class="px-1.5 py-0.5 rounded text-xs font-medium ${c.bg} ${c.text}">${isLost ? '疑似丢失' : `逾期${b.overdueDays}天`}</span>
          </div>
          <div class="text-xs text-slate-600 mt-0.5 truncate">${b.owner} · ${b.responsible.name}</div>
          <div class="text-xs text-slate-400 mt-0.5">${b.responsible.phone}</div>
        </div>
        <div class="text-slate-300">${ICONS.chevron}</div>
      </div>
    `;
  }).join('') : `<div class="col-span-full p-6 text-center text-sm text-slate-400">暂无需升级的箱体 🎉</div>`;

  if (listEl) listEl.innerHTML = html;
  if (listOverdueEl) listOverdueEl.innerHTML = html;
}

function copyEscalationSpeech() {
  copyToClipboard(generateEscalationSpeech(), '主管话术已复制');
}

// ==================== 交接班确认 & 记录簿 ====================
function confirmShift() {
  const entry = saveShiftLog('张磊', true);
  showToast(`${entry.shift}已确认交接，记录已保存`);
  renderOverview();
}

let currentShiftLogDate = null;

function openShiftLogModal() {
  document.getElementById('shiftLogModal').classList.remove('hidden');
  document.getElementById('shiftLogModal').classList.add('flex');
  const dates = getShiftLogDates();
  if (!dates.length) {
    document.getElementById('shiftLogDates').innerHTML = '<span class="text-sm text-slate-400">暂无交接记录</span>';
    document.getElementById('shiftLogContent').innerHTML = `
      <div class="text-center py-16 text-slate-400">
        <div class="text-5xl mb-3">📋</div>
        <div class="font-medium">暂无交接记录</div>
        <div class="text-sm mt-1">点击"确认交接"后，记录会保存在这里</div>
      </div>
    `;
    return;
  }
  // 默认选最新日期
  if (!currentShiftLogDate || !dates.includes(currentShiftLogDate)) {
    currentShiftLogDate = dates[0];
  }
  // 日期 Tab
  document.getElementById('shiftLogDates').innerHTML = dates.map(d => {
    const active = d === currentShiftLogDate;
    return `
      <button onclick="setShiftLogDate('${d}')"
        class="px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors
          ${active ? 'bg-cold-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}">
        ${d}
      </button>
    `;
  }).join('');
  renderShiftLogContent();
}
function closeShiftLogModal() {
  document.getElementById('shiftLogModal').classList.add('hidden');
  document.getElementById('shiftLogModal').classList.remove('flex');
}
function setShiftLogDate(d) {
  currentShiftLogDate = d;
  openShiftLogModal();
}
function renderShiftLogContent() {
  const logs = getShiftLogsByDate(currentShiftLogDate);
  const html = logs.length ? `
    <div class="space-y-4">
      ${logs.map(log => {
        const s = log.summary || {};
        return `
          <div class="p-4 rounded-xl border ${log.confirmed ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-white'}">
            <div class="flex items-center justify-between mb-3">
              <div class="flex items-center gap-2">
                <span class="px-2.5 py-1 rounded-full text-xs font-bold ${log.shift === '早班' ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'}">${log.shift}</span>
                <span class="text-sm text-slate-700 font-medium">${log.time}</span>
                <span class="text-xs text-slate-500">· 操作人 ${log.operator}</span>
                ${log.confirmed ? '<span class="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500 text-white">✓ 已确认</span>' : ''}
              </div>
              <button onclick='copyToClipboard(\`${log.text.replace(/`/g, '\\`')}\`, "交接文案已复制")' class="text-xs text-cold-600 hover:underline">复制文案</button>
            </div>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-3">
              <div class="p-2 rounded-lg bg-white border border-slate-100"><span class="text-slate-400 text-xs">新增逾期</span><div class="font-bold text-red-600">${s.newlyOverdue || 0} 只</div></div>
              <div class="p-2 rounded-lg bg-white border border-slate-100"><span class="text-slate-400 text-xs">已催还</span><div class="font-bold text-blue-600">${s.calledToday || 0} 只</div></div>
              <div class="p-2 rounded-lg bg-white border border-slate-100"><span class="text-slate-400 text-xs">已安排返程</span><div class="font-bold text-emerald-600">${s.returningToday || 0} 只</div></div>
              <div class="p-2 rounded-lg bg-white border border-slate-100"><span class="text-slate-400 text-xs">疑似丢失</span><div class="font-bold text-rose-600">${s.lostToday || 0} 只</div></div>
            </div>
            <details class="text-xs text-slate-600">
              <summary class="cursor-pointer text-cold-600 hover:underline select-none">查看完整交接文案</summary>
              <pre class="mt-2 p-3 bg-white rounded-lg border border-slate-100 text-slate-700 whitespace-pre-wrap font-sans leading-relaxed">${log.text}</pre>
            </details>
          </div>
        `;
      }).join('')}
    </div>
  ` : `<div class="text-center py-12 text-slate-400">该日期暂无交接记录</div>`;
  document.getElementById('shiftLogContent').innerHTML = html;
}

// ==================== 页面1：箱体总览 ====================
function renderOverview() {
  // 交接班提示条
  const overdue = getOverdueBoxes().length;
  const repairRisk = getRiskCount('repair');
  const alertBar = document.getElementById('alertBar');
  if (overdue >= 10 || repairRisk >= 5) {
    alertBar.className = 'mb-5 p-4 rounded-xl border flex items-center gap-3 bg-red-50 border-red-200';
    alertBar.innerHTML = `
      <div class="w-10 h-10 rounded-lg bg-red-500 text-white flex items-center justify-center shrink-0">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
      </div>
      <div class="flex-1">
        <div class="font-semibold text-red-800">交接班重点提醒</div>
        <div class="text-sm text-red-700">当前有 <b>${overdue}</b> 只箱体逾期、<b>${repairRisk}</b> 只待维修存在积压，请优先处理，避免影响次日发车。</div>
      </div>
    `;
  } else {
    alertBar.className = 'mb-5 p-4 rounded-xl border flex items-center gap-3 bg-emerald-50 border-emerald-200';
    alertBar.innerHTML = `
      <div class="w-10 h-10 rounded-lg bg-emerald-500 text-white flex items-center justify-center shrink-0">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
      </div>
      <div class="flex-1">
        <div class="font-semibold text-emerald-800">当前周转正常</div>
        <div class="text-sm text-emerald-700">在库箱体充足，流转顺畅，可正常调度。</div>
      </div>
    `;
  }

  // 统计卡片
  const grid = document.getElementById('statsGrid');
  const total = BOXES.length;
  const keys = Object.keys(STATUS_DEF);
  grid.innerHTML = keys.map(key => {
    const def = STATUS_DEF[key];
    const count = getStatusCount(key);
    const risk = getRiskCount(key);
    const c = COLOR_MAP[def.color];
    const pct = (count / total) * 100;
    return `
      <div class="stat-card cursor-pointer ${c.bg} ${c.border} border rounded-xl p-4 relative overflow-hidden" onclick="filterByStatus('${key}')">
        <div class="flex items-center justify-between mb-3">
          <div class="w-9 h-9 rounded-lg ${c.light} ${c.text} flex items-center justify-center">${ICONS[def.icon]}</div>
          ${risk > 0 ? `<span class="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 risk-pulse">${risk} 风险</span>` : ''}
        </div>
        <div class="text-2xl font-bold ${c.text}">${count}</div>
        <div class="text-xs ${c.text} opacity-80 mt-0.5">${def.label}</div>
        <div class="mt-3 h-1.5 rounded-full ${c.light}"><div class="h-full rounded-full ${c.fill}" style="width:${pct.toFixed(0)}%"></div></div>
        <div class="text-xs text-slate-500 mt-1">占比 ${pct.toFixed(1)}%</div>
      </div>
    `;
  }).join('');

  // 交接班摘要（真实统计）
  const s = getShiftSummary();
  const metrics = [
    { label: '今日新增逾期', value: s.newlyOverdue, color: COLOR_MAP.red,     hint: '只' },
    { label: '今日已催还',   value: s.calledToday,   color: COLOR_MAP.blue,    hint: '只' },
    { label: '已安排返程',   value: s.returningToday,color: COLOR_MAP.emerald, hint: `只 / 累计${s.returningTotal}` },
    { label: '疑似丢失',     value: s.lostToday,     color: COLOR_MAP.rose,    hint: `只 / 累计${s.lostTotal}` },
  ];
  document.getElementById('shiftMetrics').innerHTML = metrics.map(m => `
    <div class="p-3 rounded-xl border ${m.color.border} ${m.color.bg}">
      <div class="flex items-center justify-between">
        <span class="text-xs ${m.color.text}">${m.label}</span>
      </div>
      <div class="mt-1 flex items-baseline gap-1.5">
        <span class="text-2xl font-bold ${m.color.text}">${m.value}</span>
        <span class="text-xs text-slate-500">${m.hint}</span>
      </div>
    </div>
  `).join('');
  document.getElementById('shiftText').textContent = buildShiftText();

  // 逾期升级提醒
  renderEscalation();

  // 状态分布条
  const bars = document.getElementById('statusBars');
  bars.innerHTML = keys.map(key => {
    const def = STATUS_DEF[key];
    const count = getStatusCount(key);
    const risk = getRiskCount(key);
    const normal = count - risk;
    const c = COLOR_MAP[def.color];
    const normalPct = (normal / total) * 100;
    const riskPct = (risk / total) * 100;
    return `
      <div>
        <div class="flex items-center justify-between text-sm mb-1.5">
          <div class="flex items-center gap-2">
            <span class="w-3 h-3 rounded-sm ${c.fill}"></span>
            <span class="font-medium text-slate-700">${def.label}</span>
            <span class="text-slate-400 text-xs">正常 ${normal}</span>
            ${risk > 0 ? `<span class="text-red-500 text-xs">风险 ${risk}</span>` : ''}
          </div>
          <span class="font-semibold text-slate-800">${count}</span>
        </div>
        <div class="h-2.5 bg-slate-100 rounded-full overflow-hidden flex">
          <div class="${c.fill}" style="width:${normalPct}%"></div>
          ${risk > 0 ? `<div class="bg-red-400" style="width:${riskPct}%"></div>` : ''}
        </div>
      </div>
    `;
  }).join('');
  document.getElementById('updateTime').textContent = `更新于 ${new Date().toLocaleTimeString('zh-CN')}`;

  // 风险预警
  const riskBoxes = [...BOXES.filter(b => b.risk)].slice(0, 6);
  const rl = document.getElementById('riskList');
  rl.innerHTML = riskBoxes.length ? riskBoxes.map(b => {
    const def = STATUS_DEF[b.status];
    const c = COLOR_MAP[def.color];
    let desc = '';
    if (b.status === 'occupied' && b.overdueDays) desc = `逾期 ${b.overdueDays} 天未回收`;
    else if (b.status === 'in_transit') desc = '在途超时未签收';
    else if (b.status === 'repair') desc = '维修积压';
    else if (b.status === 'in_stock') desc = '温度待校准';
    else if (b.status === 'cleaning') desc = '清洗队列积压';
    return `
      <div class="flex items-start gap-3 p-2.5 rounded-lg bg-red-50 border border-red-100 hover:bg-red-100/60 cursor-pointer" onclick="openDrawer('${b.id}')">
        <div class="w-8 h-8 rounded-md ${c.bg} ${c.text} flex items-center justify-center shrink-0">${ICONS[def.icon]}</div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <span class="font-medium text-slate-800 text-sm">${b.id}</span>
            <span class="text-xs px-1.5 py-0.5 rounded ${c.bg} ${c.text}">${def.label}</span>
          </div>
          <div class="text-xs text-red-600 mt-0.5">${desc}</div>
        </div>
        <div class="text-slate-300">${ICONS.chevron}</div>
      </div>
    `;
  }).join('') : '<div class="text-sm text-slate-400 text-center py-8">暂无风险预警</div>';

  // 最近流转
  const rf = document.getElementById('recentFlow');
  rf.innerHTML = FLOW_LOGS.map(log => {
    const actColor = {
      '入库': 'bg-emerald-100 text-emerald-700',
      '出库': 'bg-blue-100 text-blue-700',
      '签收': 'bg-amber-100 text-amber-700',
      '送洗': 'bg-cyan-100 text-cyan-700',
      '送修': 'bg-rose-100 text-rose-700',
      '维修完成': 'bg-emerald-100 text-emerald-700',
      '催还': 'bg-red-100 text-red-700',
    }[log.action] || 'bg-slate-100 text-slate-700';
    return `
      <tr class="hover:bg-slate-50 cursor-pointer" onclick="openDrawer('${log.boxId}')">
        <td class="px-4 py-3 font-medium text-slate-800">${log.boxId}</td>
        <td class="px-4 py-3"><span class="px-2 py-0.5 rounded-full text-xs font-medium ${actColor}">${log.action}</span></td>
        <td class="px-4 py-3 text-slate-600">${log.plate}</td>
        <td class="px-4 py-3 text-slate-600">${log.owner}</td>
        <td class="px-4 py-3 text-slate-500 text-xs">${formatDT(log.time)}</td>
        <td class="px-4 py-3 text-slate-600">${log.op}</td>
      </tr>
    `;
  }).join('');
}

function copyShiftText() {
  copyToClipboard(buildShiftText(), '交接文字已复制');
}

function filterByStatus(status) {
  switchPage('route');
}

// ==================== 页面2：线路明细 ====================
function initFilterOptions() {
  const carrierSel = document.getElementById('f-carrier');
  const ownerSel = document.getElementById('f-owner');
  const destSel = document.getElementById('f-dest');
  if (carrierSel.options.length <= 1) {
    CARRIERS.forEach(c => carrierSel.insertAdjacentHTML('beforeend', `<option value="${c}">${c}</option>`));
    OWNERS.forEach(o => ownerSel.insertAdjacentHTML('beforeend', `<option value="${o}">${o}</option>`));
    DESTS.forEach(d => destSel.insertAdjacentHTML('beforeend', `<option value="${d}">${d}</option>`));
  }
}
initFilterOptions();

let currentFiltered = [];

function applyFilters() {
  const plate = document.getElementById('f-plate').value.trim();
  const carrier = document.getElementById('f-carrier').value;
  const owner = document.getElementById('f-owner').value;
  const dest = document.getElementById('f-dest').value;
  currentFiltered = getRouteBoxes().filter(b => {
    if (plate && !b.plate.includes(plate)) return false;
    if (carrier && b.carrier !== carrier) return false;
    if (owner && b.owner !== owner) return false;
    if (dest && b.dest !== dest) return false;
    return true;
  });
  renderRouteGroups();
}
function resetFilters() {
  ['f-plate', 'f-carrier', 'f-owner', 'f-dest'].forEach(id => document.getElementById(id).value = '');
  currentFiltered = getRouteBoxes();
  renderRouteGroups();
}
function renderRoute() {
  if (!currentFiltered.length) currentFiltered = getRouteBoxes();
  renderRouteGroups();
}
function renderRouteGroups() {
  const groups = {};
  currentFiltered.forEach(b => {
    if (!groups[b.plate]) groups[b.plate] = [];
    groups[b.plate].push(b);
  });
  const sorted = Object.entries(groups).sort((a,b) => b[1].length - a[1].length);
  const container = document.getElementById('routeGroups');
  if (!sorted.length) {
    container.innerHTML = `<div class="bg-white rounded-xl p-12 text-center text-slate-400">
      <div class="text-5xl mb-3">🔍</div>
      <div class="font-medium">未找到匹配的箱体</div>
      <div class="text-sm mt-1">请尝试调整筛选条件</div>
    </div>`;
    return;
  }
  container.innerHTML = sorted.map(([plate, boxes]) => {
    const sample = boxes[0];
    const inTransit = boxes.filter(b => b.status === 'in_transit').length;
    const occupied = boxes.filter(b => b.status === 'occupied').length;
    const risk = boxes.filter(b => b.risk).length;
    return `
      <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div class="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div class="flex items-center gap-4">
            <div class="flex items-center gap-2.5">
              <div class="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">${ICONS.truck}</div>
              <div>
                <div class="font-bold text-slate-800">${plate}</div>
                <div class="text-xs text-slate-500">${sample.carrier}</div>
              </div>
            </div>
            <div class="h-8 w-px bg-slate-200"></div>
            <div class="flex items-center gap-4 text-sm">
              <div><span class="text-slate-500">承运:</span> <span class="font-medium text-slate-700">${boxes.length} 箱</span></div>
              <div><span class="text-slate-500">在途:</span> <span class="text-blue-600 font-medium">${inTransit}</span></div>
              <div><span class="text-slate-500">占用:</span> <span class="text-amber-600 font-medium">${occupied}</span></div>
              ${risk > 0 ? `<div class="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">${risk} 风险</div>` : ''}
            </div>
          </div>
        </div>
        <div class="p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          ${boxes.map(b => {
            const def = STATUS_DEF[b.status];
            const c = COLOR_MAP[def.color];
            let extraTag = '';
            if (b.overdueDays) extraTag = `<span class="px-1.5 py-0.5 text-xs rounded bg-red-100 text-red-700 ml-1.5">逾期${b.overdueDays}天</span>`;
            if (b.followStatus && b.overdueDays) {
              const fc = FOLLOW_COLOR[b.followStatus];
              extraTag += `<span class="px-1.5 py-0.5 text-xs rounded ${fc.bg} ${fc.text} ml-1">${FOLLOW_STATUS[b.followStatus].label}</span>`;
            }
            const isRisk = b.risk ? 'ring-1 ring-red-300' : '';
            return `
              <div class="group cursor-pointer rounded-lg border border-slate-200 ${isRisk} hover:border-cold-400 hover:shadow-md transition-all p-3 bg-white" onclick="openDrawer('${b.id}')">
                <div class="flex items-center justify-between mb-2">
                  <div class="font-semibold text-slate-800 text-sm">${b.id}</div>
                  <div class="w-6 h-6 rounded ${c.bg} ${c.text} flex items-center justify-center">${ICONS[def.icon]}</div>
                </div>
                <div class="flex items-center gap-1 flex-wrap mb-1.5">
                  <span class="px-1.5 py-0.5 rounded text-xs font-medium ${c.bg} ${c.text}">${def.label}</span>
                  ${extraTag}
                </div>
                <div class="text-xs text-slate-500 truncate">${b.owner}</div>
                <div class="text-xs text-slate-400 truncate mt-0.5">→ ${b.dest}</div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }).join('');
}

// ==================== 页面3：逾期处理 ====================
let currentSort = 'days-desc';
let currentViewGroup = 'group';
let currentStatusFilter = 'all';
let currentOverdueBoxId = null;

document.getElementById('overdueSort').addEventListener('change', e => {
  currentSort = e.target.value;
  renderOverdue();
});
document.getElementById('overdueViewGroup').addEventListener('change', e => {
  currentViewGroup = e.target.value;
  renderOverdue();
});

function renderOverdueStatusTabs() {
  const all = getOverdueBoxes();
  const counts = { all: all.length };
  Object.keys(FOLLOW_STATUS).forEach(k => counts[k] = all.filter(b => b.followStatus === k).length);
  const tabs = [
    { key: 'all',       label: '全部',       color: COLOR_MAP.slate },
    { key: 'pending',   label: '待联系',     color: FOLLOW_COLOR.pending },
    { key: 'contacted', label: '已联系',     color: FOLLOW_COLOR.contacted },
    { key: 'returning', label: '待返程',     color: FOLLOW_COLOR.returning },
    { key: 'lost',      label: '丢失',       color: FOLLOW_COLOR.lost },
  ];
  document.getElementById('overdueStatusTabs').innerHTML = tabs.map(t => {
    const active = currentStatusFilter === t.key;
    return `
      <button onclick="setStatusFilter('${t.key}')"
        class="px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5
          ${active ? `${t.color.fill} text-white shadow-sm` : `${t.color.bg} ${t.color.text} hover:opacity-80`}">
        ${t.label}
        <span class="text-xs px-1.5 py-0.5 rounded-full ${active ? 'bg-white/20 text-white' : `${t.color.light} ${t.color.text}`}">${counts[t.key]}</span>
      </button>
    `;
  }).join('');
}
function setStatusFilter(k) {
  currentStatusFilter = k;
  renderOverdue();
}

// 跟进状态快速切换（单独保存，不强制备注）
function setFollowStatusDirect(boxId, status) {
  setBoxFollowStatusOnly(boxId, status);
  showToast(`状态已更新为【${FOLLOW_STATUS[status].label}】`);
  renderOverdue();
  renderOverview();
  renderEscalation();
}

function renderOverdueCard(b) {
  const severity = b.overdueDays >= 7 ? 'red' : b.overdueDays >= 3 ? 'amber' : 'blue';
  const sevColor = COLOR_MAP[severity];
  const fs = FOLLOW_STATUS[b.followStatus] || FOLLOW_STATUS.pending;
  const fc = FOLLOW_COLOR[b.followStatus] || FOLLOW_COLOR.pending;
  const lastRemark = b.remarks && b.remarks.length ? b.remarks[b.remarks.length - 1] : null;
  const isEscalated = b.overdueDays >= 7 || b.followStatus === 'lost';

  // 快速状态切换按钮
  const statusBtns = Object.entries(FOLLOW_STATUS).map(([k, v]) => {
    const active = b.followStatus === k;
    const c = FOLLOW_COLOR[k];
    return `
      <button onclick="setFollowStatusDirect('${b.id}', '${k}')"
        class="px-2 py-1 rounded-md text-xs font-medium transition-colors
          ${active ? `${c.fill} text-white shadow-sm` : `${c.bg} ${c.text} border ${c.border} hover:opacity-80`}"
        title="设置为${v.label}">
        ${v.label}
      </button>
    `;
  }).join('');

  return `
    <div class="bg-white rounded-xl shadow-sm border ${isEscalated ? 'border-red-200' : 'border-slate-200'} p-5 hover:shadow-md transition-shadow">
      <div class="flex items-start gap-4">
        <div class="w-14 h-14 rounded-xl ${sevColor.bg} ${sevColor.text} border ${sevColor.border} flex flex-col items-center justify-center shrink-0">
          <div class="text-2xl font-bold">${b.overdueDays}</div>
          <div class="text-[10px] opacity-80 mt-0.5">天</div>
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 flex-wrap mb-1">
            <span class="font-bold text-slate-800">${b.id}</span>
            <span class="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">客户占用</span>
            <span class="px-2 py-0.5 rounded-full text-xs font-medium ${fc.bg} ${fc.text} border ${fc.border}">
              <span class="inline-block status-dot ${fc.fill} mr-1"></span>${fs.label}
            </span>
            ${isEscalated ? '<span class="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">高风险</span>' : ''}
          </div>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1 text-sm">
            <div><span class="text-slate-400">货主：</span><span class="text-slate-700 font-medium">${b.owner}</span></div>
            <div><span class="text-slate-400">目的地：</span><span class="text-slate-700">${b.dest}</span></div>
            <div><span class="text-slate-400">出库：</span><span class="text-slate-700">${formatD(b.outTime)}</span></div>
            <div><span class="text-slate-400">应回收：</span><span class="text-red-600 font-medium">${formatD(b.expectBack)}</span></div>
            <div><span class="text-slate-400">责任人：</span><span class="text-slate-700">${b.responsible.name}</span></div>
            <div><span class="text-slate-400">联系电话：</span><span class="text-slate-700 font-mono">${b.responsible.phone}</span></div>
            <div><span class="text-slate-400">承运商：</span><span class="text-slate-700">${b.carrier}</span></div>
            <div><span class="text-slate-400">车牌：</span><span class="text-slate-700">${b.plate}</span></div>
          </div>
          <!-- 快速状态切换 -->
          <div class="mt-3 flex items-center gap-1.5 flex-wrap">
            <span class="text-xs text-slate-500 mr-1">更新状态：</span>
            ${statusBtns}
          </div>
          ${lastRemark ? `
            <div class="mt-3 p-2.5 rounded-lg bg-slate-50 border border-slate-100">
              <div class="flex items-center gap-2 text-xs flex-wrap">
                <span class="px-1.5 py-0.5 rounded font-medium ${
                  lastRemark.conclusion === '客户仍在使用' ? 'bg-cold-100 text-cold-700' :
                  lastRemark.conclusion === '已安排返程' ? 'bg-emerald-100 text-emerald-700' :
                  'bg-red-100 text-red-700'
                }">${lastRemark.conclusion}</span>
                <span class="text-slate-400">${formatDT(lastRemark.time)}</span>
                <span class="text-slate-500">· ${lastRemark.op}</span>
              </div>
              ${lastRemark.text ? `<div class="text-xs text-slate-600 mt-1.5">${lastRemark.text}</div>` : ''}
            </div>
          ` : ''}
        </div>
        <div class="flex flex-col gap-2 shrink-0">
          <a href="tel:${b.responsible.phone}" class="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors">
            ${ICONS.phone}一键拨号
          </a>
          <button onclick="openRemarkModal('${b.id}')" class="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors">
            ${ICONS.note}记录结果
          </button>
          <button onclick="openDrawer('${b.id}')" class="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 text-slate-700 text-sm hover:bg-slate-50 transition-colors">
            ${ICONS.chevron}详情
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderOverdue() {
  document.getElementById('overdueCount').textContent = getOverdueBoxes().length;
  renderOverdueStatusTabs();
  renderEscalation();

  let list = [...getOverdueBoxes()];
  if (currentStatusFilter !== 'all') {
    list = list.filter(b => b.followStatus === currentStatusFilter);
  }
  list.sort((a, b) => currentSort === 'days-desc' ? b.overdueDays - a.overdueDays : a.overdueDays - b.overdueDays);

  const container = document.getElementById('overdueList');
  if (!list.length) {
    container.innerHTML = `<div class="bg-white rounded-xl p-12 text-center text-slate-400">
      <div class="text-5xl mb-3">✅</div>
      <div class="font-medium">该状态下暂无逾期箱体</div>
      <div class="text-sm mt-1">请切换其他跟进状态查看</div>
    </div>`;
    return;
  }

  if (currentViewGroup === 'group') {
    const groups = {};
    list.forEach(b => {
      const k = b.followStatus || 'pending';
      if (!groups[k]) groups[k] = [];
      groups[k].push(b);
    });
    const ordered = Object.keys(FOLLOW_STATUS)
      .filter(k => groups[k] && groups[k].length)
      .sort((a, b) => FOLLOW_STATUS[a].order - FOLLOW_STATUS[b].order);

    container.innerHTML = ordered.map(k => {
      const fs = FOLLOW_STATUS[k];
      const fc = FOLLOW_COLOR[k];
      return `
        <div class="space-y-3">
          <div class="flex items-center gap-2 sticky top-0 bg-slate-50/90 backdrop-blur -mx-2 px-2 py-2 rounded-lg">
            <span class="w-2.5 h-2.5 rounded-full ${fc.fill}"></span>
            <span class="font-semibold text-slate-700 text-sm">${fs.label}</span>
            <span class="text-xs text-slate-400">${groups[k].length} 只</span>
          </div>
          <div class="space-y-3">${groups[k].map(b => renderOverdueCard(b)).join('')}</div>
        </div>
      `;
    }).join('');
  } else {
    container.innerHTML = list.map(b => renderOverdueCard(b)).join('');
  }
}

function exportOverdue() {
  showToast('逾期清单已导出（模拟）');
}

// ==================== 抽屉 ====================
function openDrawer(boxId) {
  const b = BOXES.find(x => x.id === boxId);
  if (!b) return;
  const def = STATUS_DEF[b.status];
  const c = COLOR_MAP[def.color];
  document.getElementById('drawerTitle').textContent = `${b.id} · 详情`;

  // 使用 box.timeline 固化时间线
  const timeline = b.timeline || [];
  const timelineHTML = timeline.length ? `
    <div class="relative pl-6">
      <div class="absolute left-[7px] top-1 bottom-1 w-0.5 bg-slate-200"></div>
      ${timeline.map((e, i) => {
        const style = TIMELINE_STYLE[e.type] || TIMELINE_STYLE.remark;
        return `
          <div class="relative pb-4">
            <div class="absolute -left-6 w-4 h-4 rounded-full ${style.c.fill} border-2 border-white shadow flex items-center justify-center text-white">
              ${ICONS[e.type] || ICONS.remark}
            </div>
            <div class="bg-slate-50 rounded-lg border border-slate-100 p-3">
              <div class="flex items-center gap-2 flex-wrap mb-1">
                <span class="text-xs font-semibold ${style.c.text}">${e.label || style.label}</span>
                <span class="text-xs text-slate-400">${formatDT(e.time)}</span>
                <span class="text-xs text-slate-500">· ${e.op}</span>
              </div>
              <div class="text-sm text-slate-700">${e.desc}</div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  ` : '<div class="text-sm text-slate-400 text-center py-6 bg-slate-50 rounded-lg">暂无流转记录</div>';

  const fs = b.followStatus ? `
    <div class="mt-2 flex items-center gap-2">
      <span class="text-slate-400 text-xs">跟进状态</span>
      <span class="px-2 py-0.5 rounded-full text-xs font-medium ${FOLLOW_COLOR[b.followStatus].bg} ${FOLLOW_COLOR[b.followStatus].text} border ${FOLLOW_COLOR[b.followStatus].border}">${FOLLOW_STATUS[b.followStatus].label}</span>
    </div>
  ` : '';

  const body = document.getElementById('drawerBody');
  body.innerHTML = `
    <div class="space-y-5">
      <div class="flex items-center gap-3 p-4 rounded-xl ${c.bg} ${c.border} border">
        <div class="w-12 h-12 rounded-xl ${c.light} ${c.text} flex items-center justify-center">${ICONS[def.icon]}</div>
        <div class="flex-1">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="px-2 py-0.5 rounded ${c.bg} ${c.text} font-medium text-sm border ${c.border}">${def.label}</span>
            ${b.risk ? '<span class="status-dot bg-red-500"></span><span class="text-xs text-red-600 font-medium">风险</span>' : ''}
          </div>
          <div class="text-xs text-slate-500 mt-1">${b.spec}</div>
          ${fs}
        </div>
      </div>

      <div>
        <h4 class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">流转信息</h4>
        <div class="space-y-3 text-sm">
          <div class="flex items-start gap-3 p-3 rounded-lg bg-slate-50">
            <div class="w-8 h-8 rounded-md bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">${ICONS.clock}</div>
            <div class="flex-1">
              <div class="text-slate-400 text-xs">最近一次出库时间</div>
              <div class="font-medium text-slate-800 mt-0.5">${b.outTime ? formatDT(b.outTime) : '—'}</div>
            </div>
          </div>
          <div class="flex items-start gap-3 p-3 rounded-lg ${b.overdueDays ? 'bg-red-50' : 'bg-slate-50'}">
            <div class="w-8 h-8 rounded-md ${b.overdueDays ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'} flex items-center justify-center shrink-0">${ICONS.clock}</div>
            <div class="flex-1">
              <div class="text-slate-400 text-xs">预计回收时间</div>
              <div class="font-medium ${b.overdueDays ? 'text-red-700' : 'text-slate-800'} mt-0.5">${b.expectBack ? formatDT(b.expectBack) : '—'}</div>
              ${b.overdueDays ? `<div class="text-xs text-red-600 mt-0.5">已逾期 ${b.overdueDays} 天</div>` : ''}
            </div>
          </div>
          <div class="flex items-start gap-3 p-3 rounded-lg bg-slate-50">
            <div class="w-8 h-8 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">${ICONS.user}</div>
            <div class="flex-1">
              <div class="text-slate-400 text-xs">当前责任人</div>
              <div class="font-medium text-slate-800 mt-0.5">${b.responsible.name}</div>
              <a href="tel:${b.responsible.phone}" class="text-sm text-cold-600 hover:underline">${b.responsible.phone}</a>
            </div>
          </div>
          <div class="flex items-start gap-3 p-3 rounded-lg bg-slate-50">
            <div class="w-8 h-8 rounded-md bg-cyan-100 text-cyan-700 flex items-center justify-center shrink-0">${ICONS.file}</div>
            <div class="flex-1">
              <div class="text-slate-400 text-xs">交接凭证</div>
              <div class="font-medium text-slate-800 mt-0.5">${b.handoverProof || '无'}</div>
              ${b.handoverProof ? '<div class="text-xs text-cold-600 mt-0.5 cursor-pointer hover:underline" onclick="showToast(\'凭证预览（模拟）\')">查看附件 →</div>' : ''}
            </div>
          </div>
        </div>
      </div>

      <div>
        <h4 class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">运输信息</h4>
        <div class="grid grid-cols-2 gap-3 text-sm">
          <div class="p-3 rounded-lg border border-slate-100 bg-slate-50">
            <div class="text-slate-400 text-xs">承运商</div>
            <div class="font-medium text-slate-800 mt-1">${b.carrier}</div>
          </div>
          <div class="p-3 rounded-lg border border-slate-100 bg-slate-50">
            <div class="text-slate-400 text-xs">车牌号</div>
            <div class="font-medium text-slate-800 mt-1 font-mono">${b.plate}</div>
          </div>
          <div class="p-3 rounded-lg border border-slate-100 bg-slate-50">
            <div class="text-slate-400 text-xs">货主</div>
            <div class="font-medium text-slate-800 mt-1">${b.owner}</div>
          </div>
          <div class="p-3 rounded-lg border border-slate-100 bg-slate-50">
            <div class="text-slate-400 text-xs">目的地</div>
            <div class="font-medium text-slate-800 mt-1">${b.dest}</div>
          </div>
        </div>
      </div>

      <div>
        <h4 class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">完整流转时间线</h4>
        ${timelineHTML}
      </div>

    </div>
  `;
  document.getElementById('drawer').classList.remove('hidden');
}
function closeDrawer() {
  document.getElementById('drawer').classList.add('hidden');
}

// ==================== 备注弹窗 ====================
function openRemarkModal(boxId) {
  currentOverdueBoxId = boxId;
  const b = BOXES.find(x => x.id === boxId);
  document.querySelectorAll('input[name="conclusion"]').forEach(r => r.checked = false);
  document.getElementById('remarkText').value = '';
  document.getElementById('remarkStatus').value = b ? (b.followStatus || 'pending') : 'pending';
  document.getElementById('remarkModal').classList.remove('hidden');
  document.getElementById('remarkModal').classList.add('flex');
}
function closeRemarkModal() {
  document.getElementById('remarkModal').classList.add('hidden');
  document.getElementById('remarkModal').classList.remove('flex');
  currentOverdueBoxId = null;
}
function saveRemark() {
  const conclusion = document.querySelector('input[name="conclusion"]:checked');
  const text = document.getElementById('remarkText').value.trim();
  const followStatus = document.getElementById('remarkStatus').value;

  // 规则：可以只改状态，也可以只写备注；状态永远以用户手动选的为准
  // 但如果用户选了处置结论，会建议更新到对应状态（但不强制，手动选择优先）
  const b = BOXES.find(x => x.id === currentOverdueBoxId);
  if (!b) return;

  // 构造新 remarks（只有当用户选了结论或写了备注时才追加）
  let remarks = b.remarks || [];
  if (conclusion || text) {
    remarks = [...remarks, {
      conclusion: conclusion ? conclusion.value : '未填写',
      text,
      time: new Date(),
      op: '张磊',
    }];
  }

  // 持久化
  setBoxPersist(b.id, { remarks, followStatus });

  const msg = [];
  if (conclusion || text) msg.push('催还记录已保存');
  msg.push(`状态更新为【${FOLLOW_STATUS[followStatus].label}】`);
  showToast(msg.join('，'));

  closeRemarkModal();
  renderOverdue();
  renderOverview();
  renderEscalation();
}

// ==================== 初始化 ====================
renderOverview();
