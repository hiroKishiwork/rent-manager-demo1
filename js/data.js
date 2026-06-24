// data.js — データ初期化・localStorage読み書き・マイグレーション・ヘルパー・アプリ状態
// ==================== DATA STORE ====================
const STORAGE_KEY = 'rental_mgr_v1';

function loadData() {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s) {
      const data = JSON.parse(s);
      // 旧バージョンデータの互換マイグレーション
      if (!data.rentPayments)  data.rentPayments  = [];
      if (data.rentAlertDay == null) data.rentAlertDay = 5;
      // 入居者フィールドの互換マイグレーション（v1.3.5〜）
      for (const p of data.properties || []) {
        for (const u of p.units || []) {
          if (u.tenant) {
            if (!u.tenant.guarantor)   u.tenant.guarantor   = {name:'',relation:'',tel:'',addr:''};
            if (!u.tenant.coResidents) u.tenant.coResidents = [];
            // 緊急連絡先の互換マイグレーション（v1.4.0〜：emergency単一文字列 → emergencyContacts配列）
            if (!u.tenant.emergencyContacts) {
              if (u.tenant.emergency) {
                const parts = String(u.tenant.emergency).split('/').map(s => s.trim()).filter(Boolean);
                u.tenant.emergencyContacts = [{
                  name: parts[0] || u.tenant.emergency,
                  tel:  parts[1] || '',
                  relation: '', email: '', addr: '', note: ''
                }];
              } else {
                u.tenant.emergencyContacts = [];
              }
              delete u.tenant.emergency;
            }
            // 論理削除フラグの互換マイグレーション（v1.5.0〜：isMovedOut フラグを補完）
            if (u.tenant.isMovedOut == null) u.tenant.isMovedOut = false;
          }
        }
      }
      return data;
    }
  } catch(e){}
  return defaultData();
}

function saveData() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(DB)); } catch(e){}
}

function defaultData() {
  return {
    properties: [
      {
        id:'p1', name:'グリーンハイツ世田谷', addr:'東京都世田谷区代沢1-2-3', type:'マンション',
        built:2005, floors:3, note:'エレベーターあり・オートロック', parking:2,
        units:[
          {id:'u1', name:'101号室', floor:1, sqm:25.5, layout:'1K', rent:68000, deposit:136000, key_money:68000, status:'occupied',
           tenant:{name:'田中 健太', kana:'タナカ ケンタ', tel:'090-1234-5678', email:'ktanaka@example.com', since:'2022-04-01', contract_end:'2024-03-31', isMovedOut:false, emergencyContacts:[{name:'田中 一郎', tel:'090-9999-0001', relation:'', email:'', addr:'', note:''}]}},
          {id:'u2', name:'102号室', floor:1, sqm:25.5, layout:'1K', rent:68000, deposit:136000, key_money:68000, status:'vacant', tenant:null},
          {id:'u3', name:'201号室', floor:2, sqm:30.2, layout:'1LDK', rent:85000, deposit:170000, key_money:85000, status:'occupied',
           tenant:{name:'鈴木 花子', kana:'スズキ ハナコ', tel:'080-2345-6789', email:'hanako.s@example.com', since:'2021-09-15', contract_end:'2023-09-14', isMovedOut:false, emergencyContacts:[{name:'鈴木 雄二', tel:'080-8888-0002', relation:'', email:'', addr:'', note:''}]}},
          {id:'u4', name:'202号室', floor:2, sqm:30.2, layout:'1LDK', rent:85000, deposit:170000, key_money:85000, status:'maintenance', tenant:null},
          {id:'u5', name:'301号室', floor:3, sqm:35.8, layout:'2LDK', rent:98000, deposit:196000, key_money:98000, status:'occupied',
           tenant:{name:'山田 太郎', kana:'ヤマダ タロウ', tel:'070-3456-7890', email:'taro.yamada@example.com', since:'2023-01-01', contract_end:'2025-12-31', isMovedOut:false, emergencyContacts:[{name:'山田 花', tel:'070-7777-0003', relation:'', email:'', addr:'', note:''}]}},
        ]
      },
      {
        id:'p2', name:'サンライズ荘', addr:'東京都杉並区高円寺南4-5-6', type:'アパート',
        built:1998, floors:2, note:'木造2階建て・駐輪場無料', parking:0,
        units:[
          {id:'v1', name:'1号室', floor:1, sqm:20.0, layout:'1K', rent:55000, deposit:110000, key_money:55000, status:'occupied',
           tenant:{name:'佐藤 美咲', kana:'サトウ ミサキ', tel:'090-4567-8901', email:'misaki.s@example.com', since:'2023-06-01', contract_end:'2025-05-31', isMovedOut:false, emergencyContacts:[{name:'佐藤 清', tel:'090-6666-0004', relation:'', email:'', addr:'', note:''}]}},
          {id:'v2', name:'2号室', floor:1, sqm:20.0, layout:'1K', rent:55000, deposit:110000, key_money:55000, status:'vacant', tenant:null},
          {id:'v3', name:'3号室', floor:2, sqm:22.5, layout:'1K', rent:58000, deposit:116000, key_money:58000, status:'occupied',
           tenant:{name:'中村 龍', kana:'ナカムラ リュウ', tel:'080-5678-9012', email:'ryu.n@example.com', since:'2022-11-01', contract_end:'2024-10-31', isMovedOut:false, emergencyContacts:[{name:'中村 美子', tel:'080-5555-0005', relation:'', email:'', addr:'', note:''}]}},
          {id:'v4', name:'4号室', floor:2, sqm:22.5, layout:'1K', rent:58000, deposit:116000, key_money:58000, status:'vacant', tenant:null},
        ]
      },
      {
        id:'p3', name:'パークサイド西荻', addr:'東京都杉並区西荻北7-8-9', type:'一戸建て',
        built:2012, floors:2, note:'庭付き・駐車場2台', parking:2,
        units:[
          {id:'w1', name:'全室', floor:1, sqm:85.0, layout:'4LDK', rent:148000, deposit:296000, key_money:148000, status:'occupied',
           tenant:{name:'木村 誠', kana:'キムラ マコト', tel:'080-6789-0123', email:'makoto.k@example.com', since:'2023-03-01', contract_end:'2025-02-28', isMovedOut:false, emergencyContacts:[{name:'木村 幸', tel:'080-4444-0006', relation:'', email:'', addr:'', note:''}]}},
        ]
      }
    ],
    maintenance: [
      {id:'m1', prop_id:'p1', unit_id:'u4', title:'エアコン修理', category:'設備修理', date:'2024-05-10', cost:25000, vendor:'快適エアコンサービス', status:'done', note:'室外機コンプレッサー交換', priority:'high'},
      {id:'m2', prop_id:'p1', unit_id:'u1', title:'水道パッキン交換', category:'水回り', date:'2024-04-22', cost:8000, vendor:'水道工事さくら', status:'done', note:'洗面台蛇口パッキン劣化', priority:'low'},
      {id:'m3', prop_id:'p1', unit_id:'u4', title:'壁紙張り替え', category:'内装', date:'2024-06-01', cost:45000, vendor:'リフォームプロ', status:'pending', note:'全室クロス張り替え', priority:'medium'},
      {id:'m4', prop_id:'p2', unit_id:'v2', title:'クロス補修', category:'内装', date:'2024-05-20', cost:12000, vendor:'内装工事タナカ', status:'done', note:'退去時補修', priority:'low'},
      {id:'m5', prop_id:'p1', unit_id:'u5', title:'給湯器点検', category:'設備点検', date:'2024-07-15', cost:5000, vendor:'ガス設備サービス', status:'pending', note:'定期点検（10年目）', priority:'medium'},
      {id:'m6', prop_id:'p3', unit_id:'w1', title:'屋根補修', category:'外装', date:'2024-06-20', cost:80000, vendor:'建築工事ナカジマ', status:'done', note:'雨漏り修理', priority:'high'},
      {id:'m7', prop_id:'p2', unit_id:'v2', title:'クリーニング', category:'清掃', date:'2024-06-05', cost:18000, vendor:'ハウスクリーンSS', status:'done', note:'退去後清掃', priority:'low'},
    ],
    rentPayments: [
      {id:'rp1', prop_id:'p1', unit_id:'u1', year_month:'2025-03', paid_date:'2025-03-27', amount:68000, method:'bank', note:''},
      {id:'rp2', prop_id:'p1', unit_id:'u1', year_month:'2025-04', paid_date:'2025-04-28', amount:68000, method:'bank', note:''},
      {id:'rp3', prop_id:'p1', unit_id:'u1', year_month:'2025-05', paid_date:'2025-05-27', amount:68000, method:'bank', note:''},
      {id:'rp4', prop_id:'p1', unit_id:'u3', year_month:'2025-03', paid_date:'2025-03-25', amount:85000, method:'auto', note:'口座引落'},
      {id:'rp5', prop_id:'p1', unit_id:'u3', year_month:'2025-04', paid_date:'2025-04-25', amount:85000, method:'auto', note:'口座引落'},
      {id:'rp6', prop_id:'p1', unit_id:'u3', year_month:'2025-05', paid_date:'2025-05-25', amount:85000, method:'auto', note:'口座引落'},
      {id:'rp7', prop_id:'p1', unit_id:'u5', year_month:'2025-03', paid_date:'2025-03-28', amount:98000, method:'bank', note:''},
      {id:'rp8', prop_id:'p1', unit_id:'u5', year_month:'2025-04', paid_date:'2025-04-30', amount:98000, method:'bank', note:'遅延'},
      {id:'rp9', prop_id:'p2', unit_id:'v1', year_month:'2025-03', paid_date:'2025-03-27', amount:55000, method:'bank', note:''},
      {id:'rp10', prop_id:'p2', unit_id:'v1', year_month:'2025-04', paid_date:'2025-04-26', amount:55000, method:'bank', note:''},
      {id:'rp11', prop_id:'p2', unit_id:'v1', year_month:'2025-05', paid_date:'2025-05-27', amount:55000, method:'bank', note:''},
      {id:'rp12', prop_id:'p2', unit_id:'v3', year_month:'2025-03', paid_date:'2025-03-27', amount:58000, method:'bank', note:''},
      {id:'rp13', prop_id:'p2', unit_id:'v3', year_month:'2025-04', paid_date:'2025-04-28', amount:58000, method:'bank', note:''},
      {id:'rp14', prop_id:'p3', unit_id:'w1', year_month:'2025-03', paid_date:'2025-03-25', amount:148000, method:'auto', note:'口座引落'},
      {id:'rp15', prop_id:'p3', unit_id:'w1', year_month:'2025-04', paid_date:'2025-04-25', amount:148000, method:'auto', note:'口座引落'},
      {id:'rp16', prop_id:'p3', unit_id:'w1', year_month:'2025-05', paid_date:'2025-05-25', amount:148000, method:'auto', note:'口座引落'},
    ],
    rentAlertDay: 5,
    idSeq: 1000,
  };
}

let DB = loadData();

function nextId(prefix) {
  DB.idSeq = (DB.idSeq || 1000) + 1;
  saveData();
  return prefix + DB.idSeq;
}

// ==================== HELPERS ====================
function getProp(pid) { return DB.properties.find(p => p.id === pid); }
function getUnit(pid, uid) { const p = getProp(pid); return p && p.units.find(u => u.id === uid); }
function allUnits() { return DB.properties.flatMap(p => p.units.map(u => ({...u, prop: p}))); }

function propStats(p) {
  const occ = p.units.filter(u => u.status === 'occupied').length;
  const maint = p.units.filter(u => u.status === 'maintenance').length;
  const vacant = p.units.filter(u => u.status === 'vacant').length;
  const income = p.units.filter(u => u.status === 'occupied').reduce((s,u) => s + u.rent, 0);
  const rate = p.units.length ? Math.round(occ / p.units.length * 100) : 0;
  const pendMaint = DB.maintenance.filter(m => m.prop_id === p.id && m.status === 'pending').length;
  return {occ, maint, vacant, income, rate, pendMaint, total: p.units.length};
}

function globalStats() {
  const units = allUnits();
  const occ = units.filter(u => u.status === 'occupied');
  const vacant = units.filter(u => u.status === 'vacant');
  const income = occ.reduce((s,u) => s + u.rent, 0);
  const rate = units.length ? Math.round(occ.length / units.length * 100) : 0;
  const pendMaint = DB.maintenance.filter(m => m.status === 'pending').length;
  const unpaidCount = countUnpaidThisMonth();
  return {income, rate, occ: occ.length, vacant: vacant.length, total: units.length, props: DB.properties.length, pendMaint, unpaidCount};
}

// 未入金アラート対象月を返す（基準日を過ぎていれば当月、まだなら前月）
function unpaidAlertYM() {
  const alertDay = DB.rentAlertDay || 5;
  const today = new Date();
  return (today.getDate() > alertDay) ? currentYM() : currentYM(-1);
}

// アラート基準日を考慮した未入金室数を返す（ダッシュボード用）
function countUnpaidThisMonth() {
  const ym = unpaidAlertYM();
  const pays = DB.rentPayments || [];
  const occupiedUnits = allUnits().filter(u => u.status === 'occupied');
  return occupiedUnits.filter(u => !pays.find(p => p.unit_id === u.id && p.year_month === ym)).length;
}

function currentYM(offset=0) {
  const d = new Date();
  d.setMonth(d.getMonth() + offset);
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0');
}

function ymLabel(ym) {
  const [y,m] = ym.split('-');
  return y + '年' + parseInt(m) + '月';
}

function getPayment(unitId, ym) {
  return (DB.rentPayments || []).find(p => p.unit_id === unitId && p.year_month === ym);
}

const METHOD_LABEL = {bank:'銀行振込', auto:'口座引落', cash:'現金', other:'その他'};

const PROP_TYPE_ICON = {
  'マンション':'🏢', 'アパート':'🏢', '一戸建て':'🏡',
  '駐車場':'🅿️', '土地':'🌳', 'その他':'🏗️'
};
function propIcon(type) { return PROP_TYPE_ICON[type] || '🏡'; }

const STATUS_LABEL = {occupied:'入居中', vacant:'空室', maintenance:'工事中'};
const STATUS_CLASS = {occupied:'occupied', vacant:'vacant', maintenance:'maintenance'};
const STATUS_ICON = {occupied:'🏠', vacant:'□', maintenance:'🔧'};

function fmtYen(n) { return '¥' + Math.round(n).toLocaleString(); }
function fmtDate(s) { return s ? s.replace(/-/g, '/') : '—'; }

function toast(msg, type='') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'toast show' + (type ? ' ' + type : '');
  setTimeout(() => { el.className = 'toast'; }, 2500);
}

// ==================== APP STATE ====================
let S = {
  page: 'dashboard',
  selPropId: null,
  selUnitId: null,
  tab: 'overview',
  treeOpen: {p1:true, p2:false, p3:false},
  treeFilter: '',
};
