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

// 箱体状态类型
// in_stock 在库 / in_transit 在途 / occupied 客户占用 / cleaning 待清洗 / repair 待维修
function genBox(id, status, extra = {}) {
  const base = {
    id: `COLD-${String(id).padStart(4, '0')}`,
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
  };
  return base;
}

// 生成箱体数据
const BOXES = [];

// 在库 58 只（其中 3 只有风险：需校准）
for (let i = 1; i <= 58; i++) {
  BOXES.push(genBox(i, 'in_stock', { risk: i >= 56 }));
}
// 在途 32 只（其中 5 只有风险：超时未签收）
for (let i = 59; i <= 90; i++) {
  const h = 2 + (i % 48);
  const outT = hoursAgo(h);
  const expBack = new Date(outT.getTime() + 3 * 86400000);
  BOXES.push(genBox(i, 'in_transit', {
    outTime: outT,
    expectBack: expBack,
    handoverProof: `交接单-${String(1000+i)}`,
    risk: (i - 58) <= 5 && h > 36,
  }));
}
// 客户占用 45 只（其中 12 只逾期）
for (let i = 91; i <= 135; i++) {
  const d = 1 + (i % 15);
  const outT = daysAgo(d);
  const turnover = 2 + (i % 3);
  const expBack = new Date(outT.getTime() + turnover * 86400000);
  const isOverdue = d > turnover;
  BOXES.push(genBox(i, 'occupied', {
    outTime: outT,
    expectBack: expBack,
    turnoverDays: turnover,
    handoverProof: `交接单-${String(2000+i)}`,
    risk: isOverdue,
    overdueDays: isOverdue ? (d - turnover) : 0,
  }));
}
// 待清洗 18 只
for (let i = 136; i <= 153; i++) {
  BOXES.push(genBox(i, 'cleaning', { risk: i >= 150 }));
}
// 待维修 7 只
for (let i = 154; i <= 160; i++) {
  BOXES.push(genBox(i, 'repair', { risk: true }));
}

// 流转记录
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

// 状态定义
const STATUS_DEF = {
  in_stock:  { label: '在库',     color: 'emerald', icon: 'warehouse' },
  in_transit:{ label: '在途',     color: 'blue',    icon: 'truck' },
  occupied:  { label: '客户占用', color: 'amber',   icon: 'store' },
  cleaning:  { label: '待清洗',   color: 'cyan',    icon: 'sparkles' },
  repair:    { label: '待维修',   color: 'rose',    icon: 'wrench' },
};

function getStatusCount(key) {
  return BOXES.filter(b => b.status === key).length;
}
function getRiskCount(key) {
  return BOXES.filter(b => b.status === key && b.risk).length;
}

// 线路分组（按车牌聚合在途和占用箱体）
function getRouteBoxes() {
  return BOXES.filter(b => b.status === 'in_transit' || b.status === 'occupied');
}

// 逾期箱体
function getOverdueBoxes() {
  return BOXES.filter(b => b.status === 'occupied' && b.overdueDays && b.overdueDays > 0);
}

window.MOCK = {
  BOXES, FLOW_LOGS, STATUS_DEF, CARRIERS, OWNERS, DESTS, PLATES, RESPONSIBLES,
  getStatusCount, getRiskCount, getRouteBoxes, getOverdueBoxes,
  formatDT, formatD, diffDays, diffHours,
};
})();
