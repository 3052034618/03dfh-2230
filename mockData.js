// 模拟数据 - 低温箱周转看板
(function(){

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}
function hoursAgo(n) {
  const d = new Date();
  d.setHours(d.getHours() - n);
  return d;
}
function formatDT(d) {
  const pad = x => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function formatD(d) {
  const pad = x => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}
function diffDays(d1, d2 = new Date()) {
  return Math.floor((d2 - d1) / 86400000);
}
function diffHours(d1, d2 = new Date()) {
  return Math.floor((d2 - d1) / 3600000);
}
function isSameDay(d1, d2 = new Date()) {
  return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
}
// 确定性伪随机数（基于种子，保证同一个箱每次生成相同时间点）
function seededRand(seed) {
  let x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}
function seededInt(seed, min, max) {
  return Math.floor(seededRand(seed) * (max - min + 1)) + min;
}

const CARRIERS = ['顺冷物流', '冰链运输', '寒通快运', '极鲜冷链', '瑞雪物流'];
const OWNERS = ['盒马鲜生', '永辉超市', '叮咚买菜', '每日优鲜', '大润发', '家乐福', '物美'];
const DESTS = ['上海浦东仓', '上海松江仓', '杭州余杭仓', '苏州工业园仓', '南京江宁仓', '宁波北仑仓', '无锡新吴仓'];
const PLATES = ['沪A·8G32K', '沪B·5F19M', '沪A·2H78P', '浙A·3K65L', '苏E·9N41T', '沪A·7J23Q', '苏B·1M88X', '浙B·6P33Y'];
const RESPONSIBLES = [
  {name: '王建国', phone: '13801234567'},
  {name: '李桂芳', phone: '13902345678'},
  {name: '陈志明', phone: '13703456789'},
  {name: '刘海燕', phone: '13604567890'},
  {name: '赵德胜', phone: '13505678901'},
  {name: '孙丽华', phone: '13406789012'},
  {name: '周伟强', phone: '13307890123'},
  {name: '吴秀兰', phone: '13208901234'},
];

// 跟进状态定义
const FOLLOW_STATUS = {
  pending:   { label: '待联系', color: 'slate',  order: 1 },
  contacted: { label: '已联系', color: 'blue',   order: 2 },
  returning: { label: '待返程', color: 'emerald',order: 3 },
  lost:      { label: '丢失',   color: 'red',    order: 4 },
};

// 箱体状态类型
function genBox(id, status, extra = {}) {
  return {
    id: `COLD-${String(id).padStart(4, '0')}`,
    _id: id,
    status,
    spec: extra.spec || '标准600L',
    plate: extra.plate || PLATES[id % PLATES.length],
    carrier: extra.carrier || CARRIERS[id % CARRIERS.length],
    owner: extra.owner || OWNERS[id % OWNERS.length],
    dest: extra.dest || DESTS[id % DESTS.length],
    outTime: extra.outTime || null,
    expectBack: extra.expectBack || null,
    responsible: extra.responsible || RESPONSIBLES[id % RESPONSIBLES.length],
    handoverProof: extra.handoverProof || null,
    turnoverDays: extra.turnoverDays || 3,
    remarks: extra.remarks || [],
    risk: extra.risk || false,
    overdueDays: extra.overdueDays || 0,
    followStatus: extra.followStatus || 'pending',
    timeline: null, // 固化时间线，首次生成后不变，新增记录追加
    statusHistory: extra.statusHistory || [], // 状态变更责任链
  };
}

// ========== 生成箱体固化时间线（确定性，不再每次动态生成） ==========
function buildTimeline(box) {
  const events = [];
  const seed = box._id * 37 + 1; // 每个箱独立种子

  // 出库（确定性时间点，与 outTime 一致）
  if (box.outTime) {
    events.push({
      type: 'out',
      label: '出库',
      time: new Date(box.outTime),
      desc: `${box.plate} 承运发往 ${box.dest}`,
      op: RESPONSIBLES[seededInt(seed, 0, RESPONSIBLES.length - 1)].name,
    });
  }
  // 签收（确定性偏移）
  if ((box.status === 'in_transit' || box.status === 'occupied') && box.outTime) {
    const signOffset = seededInt(seed + 2, 3, 12); // 3-12 小时
    const signTime = new Date(box.outTime.getTime() + signOffset * 3600000);
    events.push({
      type: 'sign',
      label: '客户签收',
      time: signTime,
      desc: `${box.owner} 已签收，交接凭证 ${box.handoverProof || '—'}`,
      op: box.responsible.name,
    });
  }
  // 首次催还（逾期箱）
  if (box.overdueDays && box.overdueDays > 0 && box.expectBack) {
    const callOffset = seededInt(seed + 5, 1, 12); // 预期回收后 1-12 小时
    const firstCall = new Date(box.expectBack.getTime() + callOffset * 3600000);
    events.push({
      type: 'call',
      label: '首次催还',
      time: firstCall,
      desc: `电话联系 ${box.responsible.name}，提醒回收`,
      op: '张磊',
    });
  }
  // remarks 里的催还记录并入时间线（真实保存的记录）
  if (box.remarks && box.remarks.length) {
    box.remarks.forEach(r => {
      const labelMap = {
        '客户仍在使用': '催还·客户仍在使用',
        '已安排返程':   '催还·已安排返程',
        '疑似丢失':     '催还·疑似丢失',
        '未填写':       '催还记录',
      };
      events.push({
        type: 'remark',
        label: labelMap[r.conclusion] || '催还记录',
        time: new Date(r.time),
        desc: r.text || `处置结论：${r.conclusion}`,
        op: r.op,
        conclusion: r.conclusion,
      });
    });
  }
  // 在途箱的返程安排（确定性时间点）
  if (box.status === 'in_transit' && box.expectBack) {
    const planOffset = seededInt(seed + 7, 6, 24);
    events.push({
      type: 'return_plan',
      label: '返程待安排',
      time: new Date(box.outTime.getTime() + planOffset * 3600000),
      desc: `预计 ${formatD(box.expectBack)} 前由 ${box.carrier} 带回`,
      op: '系统',
    });
  }
  // 待返程标记（确定性时间点）
  if (box.followStatus === 'returning' && box.expectBack) {
    const retOffset = seededInt(seed + 11, 2, 8);
    events.push({
      type: 'return_plan',
      label: '已安排返程',
      time: new Date(box.expectBack.getTime() + retOffset * 3600000),
      desc: `${box.carrier} ${box.plate} 已确认次日返程带回`,
      op: '张磊',
    });
  }
  events.sort((a,b) => new Date(a.time) - new Date(b.time));
  return events;
}

// 生成箱体数据
const BOXES = [];

for (let i = 1; i <= 58; i++) {
  BOXES.push(genBox(i, 'in_stock', { risk: i >= 56 }));
}
for (let i = 59; i <= 90; i++) {
  const h = 2 + (i % 48);
  const outT = hoursAgo(h);
  const expBack = new Date(outT.getTime() + 3 * 86400000);
  BOXES.push(genBox(i, 'in_transit', {
    outTime: outT, expectBack: expBack,
    handoverProof: `交接单-${String(1000+i)}`,
    risk: (i - 58) <= 5 && h > 36,
  }));
}
// 客户占用 45 只（其中 12 只逾期）
let overdueIdx = 0;
const defaultStatusCycle = ['pending', 'pending', 'contacted', 'contacted', 'returning', 'lost'];
for (let i = 91; i <= 135; i++) {
  const d = 1 + (i % 15);
  const outT = daysAgo(d);
  const turnover = 2 + (i % 3);
  const expBack = new Date(outT.getTime() + turnover * 86400000);
  const isOverdue = d > turnover;
  const extras = {
    outTime: outT, expectBack: expBack, turnoverDays: turnover,
    handoverProof: `交接单-${String(2000+i)}`,
    risk: isOverdue,
    overdueDays: isOverdue ? (d - turnover) : 0,
  };
  if (isOverdue) {
    extras.followStatus = defaultStatusCycle[overdueIdx % defaultStatusCycle.length];
    // 已联系/待返程/丢失的箱预填 1 条旧催还记录（注意：存 ISO 字符串供持久化用）
    if (extras.followStatus !== 'pending') {
      const seed = i * 37 + 1;
      const histHours = 6 + overdueIdx * 2;
      extras.remarks = [{
        conclusion: extras.followStatus === 'contacted' ? '客户仍在使用' :
                    extras.followStatus === 'returning' ? '已安排返程' : '疑似丢失',
        text: extras.followStatus === 'contacted' ? `客户表示再用 2 天，承诺 ${formatD(daysAgo(-2))} 前归还` :
              extras.followStatus === 'returning' ? `${CARRIERS[i%5]} 已确认 ${formatD(daysAgo(-1))} 返程带回` :
              `多次联系 ${RESPONSIBLES[i%8].name} 未接通，货主反馈未见箱体`,
        time: hoursAgo(histHours).toISOString(),
        op: i % 2 === 0 ? '张磊' : '李桂芳',
        _historical: true, // 标记为历史模拟数据，不计入今日统计
      }];
    }
    overdueIdx++;
  }
  BOXES.push(genBox(i, 'occupied', extras));
}
for (let i = 136; i <= 153; i++) {
  BOXES.push(genBox(i, 'cleaning', { risk: i >= 150 }));
}
for (let i = 154; i <= 160; i++) {
  BOXES.push(genBox(i, 'repair', { risk: true }));
}

// ====== 关键：为所有箱体预生成并固化时间线 ======
BOXES.forEach(b => { b.timeline = buildTimeline(b); });

// 流转记录（仪表盘用）
const FLOW_LOGS = [
  {boxId:'COLD-0018', action:'入库', plate:'—', owner:'—', time:hoursAgo(0.5), op:'张磊'},
  {boxId:'COLD-0102', action:'签收', plate:'沪A·8G32K', owner:'盒马鲜生', time:hoursAgo(1.2), op:'王建国'},
  {boxId:'COLD-0087', action:'出库', plate:'浙A·3K65L', owner:'永辉超市', time:hoursAgo(2.1), op:'李桂芳'},
  {boxId:'COLD-0045', action:'送洗', plate:'—', owner:'—', time:hoursAgo(3.5), op:'陈志明'},
  {boxId:'COLD-0133', action:'催还', plate:'—', owner:'叮咚买菜', time:hoursAgo(4.8), op:'张磊'},
  {boxId:'COLD-0023', action:'入库', plate:'—', owner:'—', time:hoursAgo(5.6), op:'刘海燕'},
  {boxId:'COLD-0076', action:'出库', plate:'沪B·5F19M', owner:'每日优鲜', time:hoursAgo(7.2), op:'赵德胜'},
  {boxId:'COLD-0119', action:'签收', plate:'苏E·9N41T', owner:'大润发', time:hoursAgo(8.9), op:'孙丽华'},
  {boxId:'COLD-0148', action:'维修完成', plate:'—', owner:'—', time:hoursAgo(10.3), op:'周伟强'},
  {boxId:'COLD-0033', action:'送修', plate:'—', owner:'—', time:hoursAgo(12.7), op:'吴秀兰'},
  {boxId:'COLD-0091', action:'出库', plate:'沪A·7J23Q', owner:'家乐福', time:hoursAgo(14.2), op:'张磊'},
  {boxId:'COLD-0127', action:'签收', plate:'苏B·1M88X', owner:'物美', time:hoursAgo(16.5), op:'王建国'},
];

const STATUS_DEF = {
  in_stock:  { label: '在库',     color: 'emerald', icon: 'warehouse' },
  in_transit:{ label: '在途',     color: 'blue',    icon: 'truck' },
  occupied:  { label: '客户占用', color: 'amber',   icon: 'store' },
  cleaning:  { label: '待清洗',   color: 'cyan',    icon: 'sparkles' },
  repair:    { label: '待维修',   color: 'rose',    icon: 'wrench' },
};

function getStatusCount(key) { return BOXES.filter(b => b.status === key).length; }
function getRiskCount(key) { return BOXES.filter(b => b.status === key && b.risk).length; }
function getRouteBoxes() { return BOXES.filter(b => b.status === 'in_transit' || b.status === 'occupied'); }
function getOverdueBoxes() { return BOXES.filter(b => b.status === 'occupied' && b.overdueDays && b.overdueDays > 0); }

// ====== 本地持久化 ======
const LS_KEY = 'cold_box_persist_v1';
const LS_SHIFT_KEY = 'cold_box_shift_logs_v1';
const LS_TODO_KEY = 'cold_box_todo_v1';

function loadPersist() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) || {}) : {};
  } catch(e) { return {}; }
}
function savePersist(data) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(data)); } catch(e) {}
}
function getPersistMap() {
  const persist = loadPersist();
  BOXES.forEach(b => {
    if (persist[b.id]) {
      if (persist[b.id].remarks) b.remarks = persist[b.id].remarks.map(r => ({...r, time: new Date(r.time)}));
      if (persist[b.id].followStatus) b.followStatus = persist[b.id].followStatus;
      if (persist[b.id].statusHistory) b.statusHistory = persist[b.id].statusHistory.map(h => ({...h, time: new Date(h.time)}));
      // 重新构建时间线（合并新 remarks）
      b.timeline = buildTimeline(b);
    }
  });
}
function setBoxPersist(boxId, patch) {
  const persist = loadPersist();
  const cur = persist[boxId] || {};
  if (patch.remarks !== undefined) cur.remarks = patch.remarks.map(r => ({...r, time: r.time instanceof Date ? r.time.toISOString() : r.time}));
  if (patch.followStatus !== undefined) cur.followStatus = patch.followStatus;
  if (patch.statusHistory !== undefined) cur.statusHistory = patch.statusHistory.map(h => ({...h, time: h.time instanceof Date ? h.time.toISOString() : h.time}));
  persist[boxId] = cur;
  savePersist(persist);
  // 同步内存 + 重建时间线
  const b = BOXES.find(x => x.id === boxId);
  if (b) {
    if (patch.remarks !== undefined) b.remarks = patch.remarks;
    if (patch.followStatus !== undefined) b.followStatus = patch.followStatus;
    if (patch.statusHistory !== undefined) b.statusHistory = patch.statusHistory;
    b.timeline = buildTimeline(b);
  }
}
function setBoxFollowStatusOnly(boxId, status, operator = '张磊') {
  const b = BOXES.find(x => x.id === boxId);
  if (!b) return;
  const prevStatus = b.followStatus;
  if (prevStatus === status) return;
  const history = b.statusHistory || [];
  history.push({
    from: prevStatus,
    to: status,
    time: new Date(),
    op: operator,
  });
  setBoxPersist(boxId, { followStatus: status, statusHistory: history });
}
// ====== 交接待办清单 ======
function loadTodoList() {
  try {
    const raw = localStorage.getItem(LS_TODO_KEY);
    const list = raw ? (JSON.parse(raw) || []) : [];
    return list.map(t => ({...t, createdAt: new Date(t.createdAt)}));
  } catch(e) { return []; }
}
function saveTodoList(list) {
  try { localStorage.setItem(LS_TODO_KEY, JSON.stringify(list)); } catch(e) {}
}
function toggleTodo(boxId, operator = '张磊', note = '') {
  const list = loadTodoList();
  const idx = list.findIndex(t => t.boxId === boxId);
  if (idx >= 0) {
    list.splice(idx, 1);
  } else {
    list.push({ boxId, operator, note, createdAt: new Date(), done: false });
  }
  saveTodoList(list);
  return list;
}
function getTodoList() {
  return loadTodoList().filter(t => !t.done);
}
function markTodoDone(boxId) {
  const list = loadTodoList();
  list.forEach(t => { if (t.boxId === boxId) t.done = true; });
  saveTodoList(list);
  return list;
}
function clearAllPersist() {
  localStorage.removeItem(LS_KEY);
  localStorage.removeItem(LS_SHIFT_KEY);
  localStorage.removeItem(LS_TODO_KEY);
}

// ====== 交接记录簿 ======
// type: 'copy' | 'confirm'  区分复制留痕和正式确认
function saveShiftLog(operator = '张磊', type = 'confirm', shiftNote = '') {
  const logs = getShiftLogs();
  const now = new Date();
  const pad = x => String(x).padStart(2, '0');
  const shift = now.getHours() >= 8 && now.getHours() < 20 ? '早班' : '晚班';
  const confirmed = type === 'confirm';

  // 交接快照：保存当时完整的高风险箱体、逾期分组、升级话术
  const riskBoxes = BOXES.filter(b => b.risk).map(b => ({
    id: b.id, status: b.status, overdueDays: b.overdueDays || 0,
    followStatus: b.followStatus, owner: b.owner, responsible: b.responsible.name,
  }));
  const overdue = getOverdueBoxes();
  const overdueByStatus = {};
  Object.keys(FOLLOW_STATUS).forEach(k => {
    overdueByStatus[k] = overdue.filter(b => b.followStatus === k).map(b => ({
      id: b.id, overdueDays: b.overdueDays, owner: b.owner, responsible: b.responsible.name,
    }));
  });
  const todoSnapshot = getTodoList().map(t => ({...t, createdAt: t.createdAt.toISOString()}));

  const entry = {
    id: now.getTime(),
    date: formatD(now),
    shift,
    time: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
    operator,
    type,        // 'copy' or 'confirm'
    confirmed,
    shiftNote,   // 当班备注
    summary: getShiftSummary(),
    text: buildShiftText(),
    escalationSpeech: generateEscalationSpeech(),
    snapshot: {
      riskBoxes,
      overdueByStatus,
      todoList: todoSnapshot,
    },
  };
  logs.unshift(entry);
  try { localStorage.setItem(LS_SHIFT_KEY, JSON.stringify(logs.slice(0, 100))); } catch(e) {}
  return entry;
}
function getShiftLogs() {
  try {
    const raw = localStorage.getItem(LS_SHIFT_KEY);
    return raw ? (JSON.parse(raw) || []) : [];
  } catch(e) { return []; }
}
function getShiftLogDates() {
  const logs = getShiftLogs();
  const dates = [...new Set(logs.map(l => l.date))];
  return dates.sort((a,b) => b.localeCompare(a));
}
function getShiftLogsByDate(date) {
  return getShiftLogs().filter(l => l.date === date);
}

// ====== 升级提醒（超7天或丢失） ======
function getEscalatedBoxes() {
  return getOverdueBoxes().filter(b => b.overdueDays >= 7 || b.followStatus === 'lost');
}
function generateEscalationSpeech() {
  const list = getEscalatedBoxes();
  if (!list.length) return '暂无需要升级的逾期箱体。';
  const now = new Date();
  const pad = x => String(x).padStart(2, '0');
  const lines = [
    `【低温箱周转升级跟进】${formatD(now)} ${pad(now.getHours())}:${pad(now.getMinutes())}`,
    ``,
    `主管您好，当前共有 ${list.length} 只低温箱需升级跟进：`,
    ``,
  ];
  const byType = { lost: [], over7: [] };
  list.forEach(b => {
    if (b.followStatus === 'lost') byType.lost.push(b);
    else byType.over7.push(b);
  });
  if (byType.lost.length) {
    lines.push(`▸ 疑似丢失 ${byType.lost.length} 只（需立案排查）：`);
    byType.lost.forEach(b => lines.push(`   • ${b.id}：${b.owner} ${b.dest}，责任人 ${b.responsible.name}（${b.responsible.phone}），逾期 ${b.overdueDays} 天`));
    lines.push('');
  }
  if (byType.over7.length) {
    lines.push(`▸ 逾期超 7 天 ${byType.over7.length} 只（需施压回收）：`);
    byType.over7.forEach(b => lines.push(`   • ${b.id}：${b.owner} ${b.dest}，责任人 ${b.responsible.name}，逾期 ${b.overdueDays} 天，当前【${FOLLOW_STATUS[b.followStatus].label}】`));
    lines.push('');
  }
  lines.push('请协调资源，今日内反馈进展。');
  return lines.join('\n');
}

// 启动时注入本地存储数据
getPersistMap();

// ====== 交接班摘要：真实统计，无模拟填充 ======
function getShiftSummary() {
  const overdue = getOverdueBoxes();
  const newlyOverdue = overdue.filter(b => {
    if (!b.expectBack) return false;
    return isSameDay(b.expectBack);
  });
  const totalRemarks = [];
  BOXES.forEach(b => {
    (b.remarks || []).forEach(r => {
      if (r._historical) return; // 跳过历史模拟数据
      totalRemarks.push({boxId: b.id, ...r});
    });
  });
  const todayRemarks = totalRemarks.filter(r => r.time && isSameDay(new Date(r.time)));
  const calledToday = new Set(todayRemarks.map(r => r.boxId)).size;
  const returningToday = todayRemarks.filter(r => r.conclusion === '已安排返程').length;
  const lostToday = todayRemarks.filter(r => r.conclusion === '疑似丢失').length;
  const lostTotal = BOXES.filter(b => b.followStatus === 'lost').length;
  const returningTotal = BOXES.filter(b => b.followStatus === 'returning').length;
  return {
    newlyOverdue: newlyOverdue.length,
    calledToday,           // 不再模拟填充，无记录就是 0
    returningToday,        // 不再模拟填充
    returningTotal,
    lostToday,             // 不再模拟填充
    lostTotal,
    overdueTotal: overdue.length,
    pendingTotal: BOXES.filter(b => b.followStatus === 'pending' && b.overdueDays > 0).length,
    contactedTotal: BOXES.filter(b => b.followStatus === 'contacted' && b.overdueDays > 0).length,
  };
}

// 生成交接班文字（与摘要保持一致）
function buildShiftText() {
  const s = getShiftSummary();
  const now = new Date();
  const pad = x => String(x).padStart(2, '0');
  const shift = now.getHours() >= 8 && now.getHours() < 20 ? '早班' : '晚班';
  const returnBoxes = BOXES.filter(b => b.followStatus === 'returning' && b.overdueDays > 0).slice(0, 2);
  return [
    `【低温箱周转 · ${shift}交接班】${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`,
    ``,
    `▸ 当前在库 ${getStatusCount('in_stock')} / 在途 ${getStatusCount('in_transit')} / 客户占用 ${getStatusCount('occupied')} / 待清洗 ${getStatusCount('cleaning')} / 待维修 ${getStatusCount('repair')}`,
    `▸ 逾期箱体合计 ${s.overdueTotal} 只（待联系 ${s.pendingTotal}，已联系 ${s.contactedTotal}，待返程 ${s.returningTotal}，丢失 ${s.lostTotal}）`,
    ``,
    `【今日推进】`,
    `• 新增逾期：${s.newlyOverdue} 只`,
    `• 已催还：${s.calledToday} 只`,
    `• 已安排返程：${s.returningToday} 只（累计待返程 ${s.returningTotal} 只）`,
    `• 疑似丢失：${s.lostToday} 只（累计丢失 ${s.lostTotal} 只）`,
    ``,
    `【接班注意事项】`,
    s.pendingTotal > 0 ? `1. 优先处理待联系的 ${s.pendingTotal} 只逾期箱，逐个电话确认` : '1. 待联系逾期箱已处理完毕，继续保持',
    s.returningTotal > 0 && returnBoxes.length ? `2. 待返程 ${s.returningTotal} 只箱，请跟踪 ${returnBoxes.map(b => b.plate).filter((v,i,a)=>a.indexOf(v)===i).join('、')} 次日卸车` : '2. 暂无待返程箱体',
    s.lostTotal > 0 ? `3. 丢失 ${s.lostTotal} 只需升级至主管跟进处理` : '3. 无丢失箱体，周转正常',
    ``,
  ].join('\n');
}

// ====== 班组交接包导出 ======
function buildHandoverPackage() {
  const s = getShiftSummary();
  const now = new Date();
  const pad = x => String(x).padStart(2, '0');
  const shift = now.getHours() >= 8 && now.getHours() < 20 ? '早班' : '晚班';

  const lines = [];
  lines.push(`╔══════════════════════════════════════════════════════════════╗`);
  lines.push(`║         低温箱周转 · 班组交接包    ${formatD(now)} ${shift}          ║`);
  lines.push(`╚══════════════════════════════════════════════════════════════╝`);
  lines.push('');
  lines.push(`【一、交接班摘要】`);
  lines.push(`  箱体状态：在库 ${getStatusCount('in_stock')} / 在途 ${getStatusCount('in_transit')} / 客户占用 ${getStatusCount('occupied')} / 待清洗 ${getStatusCount('cleaning')} / 待维修 ${getStatusCount('repair')}`);
  lines.push(`  逾期合计：${s.overdueTotal} 只（待联系 ${s.pendingTotal}，已联系 ${s.contactedTotal}，待返程 ${s.returningTotal}，丢失 ${s.lostTotal}）`);
  lines.push(`  今日推进：新增逾期 ${s.newlyOverdue} / 已催还 ${s.calledToday} / 已安排返程 ${s.returningToday} / 疑似丢失 ${s.lostToday}`);
  lines.push('');
  lines.push(`【二、逾期升级提醒】`);
  const escalated = getEscalatedBoxes();
  if (escalated.length) {
    escalated.forEach(b => {
      const tag = b.followStatus === 'lost' ? '⚠️ 疑似丢失' : `逾期${b.overdueDays}天`;
      lines.push(`  • ${b.id} [${tag}] ${b.owner} ${b.dest}，责任人 ${b.responsible.name}（${b.responsible.phone}）`);
    });
  } else {
    lines.push('  （暂无需升级跟进的箱体）');
  }
  lines.push('');
  lines.push(`【三、下一班待办清单】`);
  const todos = getTodoList();
  if (todos.length) {
    todos.forEach(t => {
      const b = BOXES.find(x => x.id === t.boxId);
      if (b) lines.push(`  • ${t.boxId} ${b.owner} · ${b.responsible.name}（${t.note || '重点跟进'}，标记人：${t.operator}）`);
    });
  } else {
    lines.push('  （暂无待办）');
  }
  lines.push('');
  lines.push(`【四、逾期箱体明细】`);
  const overdue = getOverdueBoxes();
  overdue.sort((a,b) => b.overdueDays - a.overdueDays);
  overdue.forEach(b => {
    const fs = FOLLOW_STATUS[b.followStatus] || FOLLOW_STATUS.pending;
    lines.push(`  • ${b.id} 逾期${b.overdueDays}天 [${fs.label}] ${b.owner} ${b.dest} · ${b.responsible.name} ${b.responsible.phone}`);
  });
  lines.push('');
  lines.push(`—— 交接包生成时间：${formatDT(now)} ——`);
  return lines.join('\n');
}

window.MOCK = {
  BOXES, FLOW_LOGS, STATUS_DEF, CARRIERS, OWNERS, DESTS, PLATES, RESPONSIBLES,
  FOLLOW_STATUS,
  getStatusCount, getRiskCount, getRouteBoxes, getOverdueBoxes,
  formatDT, formatD, diffDays, diffHours, isSameDay,
  buildTimeline, setBoxPersist, setBoxFollowStatusOnly, clearAllPersist,
  getShiftSummary, buildShiftText,
  saveShiftLog, getShiftLogs, getShiftLogDates, getShiftLogsByDate,
  getEscalatedBoxes, generateEscalationSpeech,
  loadTodoList, saveTodoList, toggleTodo, getTodoList, markTodoDone,
  buildHandoverPackage,
};
})();
