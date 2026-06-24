// ui.js — 共通UI描画（サイドバー・ツリー・ページルーティング）・モーダルヘルパー
// ==================== RENDER ====================
function render() {
  document.getElementById('app').innerHTML = `
    ${renderSidebar()}
    <div class="main">
      ${renderTopbar()}
      ${renderPage()}
    </div>`;
  attachEvents();
}

function renderSidebar() {
  const gs = globalStats();
  return `<div class="sidebar">
    <div class="sb-logo">
      <div class="sb-logo-icon">
        <svg viewBox="0 0 20 20"><path d="M10 2L2 8v10h6v-6h4v6h6V8L10 2z"/></svg>
      </div>
      <div>
        <div class="sb-logo-text">賃貸管理</div>
        <div class="sb-logo-sub">${gs.props}物件 / ${gs.total}室</div>
      </div>
    </div>
    <div class="sb-nav">
      ${navItem('dashboard','📊','ダッシュボード')}
      ${navItem('tenants','👥','入居者一覧')}
      ${navItem('maintenance','🔧','メンテナンス')}
      ${navItem('rent','💴','家賃管理')}
      ${navItem('import','📂','Excel取込・出力')}
      ${navItem('backup','💾','データバックアップ')}
    </div>
    <div class="sb-section">物件ツリー</div>
    <div class="tree-search"><input type="text" placeholder="検索..." id="tree-search" value="${S.treeFilter}" autocomplete="off"></div>
    <div class="sb-tree">${renderTree()}</div>
    <div class="sb-footer">
      <button class="sb-footer-btn" onclick="openAddPropModal()">＋ 物件を追加</button>
    </div>
  </div>`;
}

function navItem(page, icon, label) {
  return `<div class="nav-item${S.page===page?' active':''}" onclick="goPage('${page}')">${icon} ${label}</div>`;
}

function renderTree() {
  const q = S.treeFilter.toLowerCase();
  const props = DB.properties.filter(p => {
    if (!q) return true;
    if (p.name.toLowerCase().includes(q) || p.addr.toLowerCase().includes(q)) return true;
    return p.units.some(u => u.name.toLowerCase().includes(q) || (u.tenant && u.tenant.name.toLowerCase().includes(q)));
  });
  if (!props.length) return '<div style="padding:12px 16px;font-size:12px;color:var(--text3)">一致なし</div>';
  return props.map(p => renderTreeProp(p, q)).join('');
}

function renderTreeProp(p, q) {
  const st = propStats(p);
  const open = !!S.treeOpen[p.id];
  const sel = S.page === 'prop' && S.selPropId === p.id && !S.selUnitId;
  const units = q ? p.units.filter(u => u.name.toLowerCase().includes(q) || (u.tenant && u.tenant.name.toLowerCase().includes(q))) : p.units;
  return `<div class="tree-node">
    <div class="tree-row${sel?' sel':''}" onclick="goTreeProp('${p.id}')" oncontextmenu="ctxProp(event,'${p.id}')">
      <div class="tree-toggle${open?' open':''}" onclick="event.stopPropagation();toggleTree('${p.id}')">
        <svg viewBox="0 0 10 10"><path d="M3 2l4 3-4 3V2z"/></svg>
      </div>
      <span style="margin:0 5px;font-size:13px">${propIcon(p.type)}</span>
      <span class="tree-label">${p.name}</span>
      ${st.pendMaint > 0 ? `<span class="tree-badge" style="background:var(--red-bg);color:var(--red-text)">${st.pendMaint}</span>` : ''}
      <span class="tree-meta">${st.occ}/${st.total}</span>
    </div>
    ${open ? `<div class="tree-children">
      ${units.map(u => renderTreeUnit(p, u)).join('')}
      <div class="tree-row tree-add" onclick="openAddUnitModal('${p.id}')">
        <div class="tree-toggle"></div>
        <span style="margin:0 5px;font-size:11px">＋</span>
        <span class="tree-label">部屋を追加</span>
      </div>
    </div>` : ''}
  </div>`;
}

function renderTreeUnit(p, u) {
  const sel = S.page === 'prop' && S.selPropId === p.id && S.selUnitId === u.id;
  const icons = {occupied:'🏠', vacant:'○', maintenance:'🔨'};
  return `<div class="tree-row${sel?' sel':''}" onclick="goTreeUnit('${p.id}','${u.id}')" oncontextmenu="ctxUnit(event,'${p.id}','${u.id}')">
    <div class="tree-toggle"></div>
    <span style="margin:0 5px;font-size:12px">${icons[u.status]}</span>
    <span class="tree-label">${u.name}</span>
    <span class="tree-meta" style="font-size:10px">${u.tenant ? u.tenant.name.split(' ')[0] : '—'}</span>
  </div>`;
}

function renderTopbar() {
  const titles = {
    dashboard:'ダッシュボード',
    tenants:'入居者一覧',
    maintenance:'メンテナンス管理',
    rent:'家賃管理',
    import:'Excel取込・出力',
    backup:'データバックアップ',
    prop: S.selUnitId ? getPropUnitTitle() : (S.selPropId ? getPropTitle() : '物件'),
  };
  return `<div class="topbar">
    <div class="topbar-title">${titles[S.page] || ''}</div>
    ${S.page === 'prop' && S.selPropId && !S.selUnitId ? `<button class="btn btn-primary btn-sm" onclick="openAddUnitModal('${S.selPropId}')">＋ 部屋追加</button>` : ''}
    ${S.page === 'prop' && S.selUnitId ? `<button class="btn btn-sm" onclick="openEditUnitModal('${S.selPropId}','${S.selUnitId}')">✎ 編集</button>` : ''}
    ${S.page === 'maintenance' ? `<button class="btn btn-primary btn-sm" onclick="openAddMaintModal()">＋ 記録追加</button>` : ''}
  </div>`;
}

function getPropTitle() {
  const p = getProp(S.selPropId);
  return p ? p.name : '';
}
function getPropUnitTitle() {
  const p = getProp(S.selPropId);
  const u = getUnit(S.selPropId, S.selUnitId);
  return p && u ? `${p.name} / ${u.name}` : '';
}

function renderPage() {
  switch(S.page) {
    case 'dashboard': return renderDashboard();
    case 'tenants': return renderTenants();
    case 'maintenance': return renderMaintenance();
    case 'rent': return renderRent();
    case 'import': return renderImport();
    case 'backup': return renderBackup();
    case 'prop': return S.selUnitId ? renderUnitDetail() : renderPropDetail();
    default: return renderDashboard();
  }
}

// ==================== DASHBOARD ====================
function renderDashboard() {
  const gs = globalStats();
  const rateClass = gs.rate >= 80 ? 'green' : gs.rate >= 60 ? 'amber' : 'red';
  const totalMaintCost = DB.maintenance.reduce((s,m) => s + m.cost, 0);
  const recentMaint = [...DB.maintenance].sort((a,b) => b.date.localeCompare(a.date)).slice(0, 5);

  const monthlyData = DB.properties.map(p => ({
    name: p.name.length > 8 ? p.name.slice(0,6)+'…' : p.name,
    income: p.units.filter(u => u.status === 'occupied').reduce((s,u) => s + u.rent, 0),
  }));
  const maxIncome = Math.max(...monthlyData.map(d => d.income));

  const vacantUnits = allUnits().filter(u => u.status === 'vacant');
  const maintPending = DB.maintenance.filter(m => m.status === 'pending');

  return `<div class="content">
    <div class="stat-grid" style="grid-template-columns:repeat(auto-fit,minmax(160px,1fr))">
      <div class="stat-card">
        <div class="stat-label">月額家賃収入</div>
        <div class="stat-value green">${fmtYen(gs.income)}</div>
        <div class="stat-sub">稼働中 ${gs.occ}室</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">稼働率</div>
        <div class="stat-value ${rateClass}">${gs.rate}%</div>
        <div style="margin-top:6px"><div class="prog-bar"><div class="prog-fill ${rateClass}" style="width:${gs.rate}%"></div></div></div>
      </div>
      <div class="stat-card">
        <div class="stat-label">空室数</div>
        <div class="stat-value${gs.vacant>0?' amber':' green'}">${gs.vacant}室</div>
        <div class="stat-sub">全${gs.total}室中</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">未対応メンテ</div>
        <div class="stat-value${gs.pendMaint>0?' red':' green'}">${gs.pendMaint}件</div>
        <div class="stat-sub">累計費用 ${fmtYen(totalMaintCost)}</div>
      </div>
      <div class="stat-card" style="cursor:pointer" onclick="goPage('rent')">
        <div class="stat-label">今月未入金</div>
        <div class="stat-value${gs.unpaidCount>0?' red':' green'}">${gs.unpaidCount}室</div>
        <div class="stat-sub">${ymLabel(currentYM())}分</div>
      </div>
    </div>

    <div class="grid2">
      <div class="card">
        <div class="sec-hdr"><h3>物件別月収</h3></div>
        <div class="bar-chart">
          ${monthlyData.map(d => {
            const h = maxIncome > 0 ? Math.max(8, Math.round(d.income/maxIncome*100)) : 8;
            return `<div class="bar-col">
              <div class="bar-val" style="font-size:9px">${fmtYen(d.income).replace('¥','')}</div>
              <div class="bar" style="height:${h}px" title="${d.name}: ${fmtYen(d.income)}"></div>
              <div class="bar-label">${d.name}</div>
            </div>`;
          }).join('')}
        </div>
      </div>
      <div class="card">
        <div class="sec-hdr"><h3>物件サマリー</h3></div>
        ${DB.properties.map(p => {
          const st = propStats(p);
          return `<div style="display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid var(--border);cursor:pointer" onclick="goTreeProp('${p.id}')">
            <span>${propIcon(p.type)}</span>
            <div style="flex:1">
              <div style="font-size:13px;font-weight:500">${p.name}</div>
              <div style="font-size:11px;color:var(--text3)">${p.type} / ${p.units.length}戸</div>
            </div>
            <div style="text-align:right">
              <div style="font-size:13px;font-weight:600;color:var(--green)">${fmtYen(st.income)}</div>
              <div style="font-size:11px;color:var(--text3)">${st.rate}% 稼働</div>
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>

    <div class="grid2" style="margin-top:16px">
      <div class="card">
        <div class="sec-hdr"><h3>空室一覧</h3><span style="font-size:12px;color:var(--text3)">${vacantUnits.length}室</span></div>
        ${vacantUnits.length === 0 ? '<div class="empty"><p>空室なし 🎉</p></div>' :
          vacantUnits.map(u => `<div style="display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid var(--border);cursor:pointer" onclick="goTreeUnit('${u.prop.id}','${u.id}')">
            <span class="badge vacant">空室</span>
            <div style="flex:1">
              <div style="font-size:13px;font-weight:500">${u.prop.name} ${u.name}</div>
              <div style="font-size:11px;color:var(--text3)">${u.layout} / ${u.sqm}㎡</div>
            </div>
            <div style="font-size:13px;font-weight:600">${fmtYen(u.rent)}</div>
          </div>`).join('')}
      </div>
      <div class="card">
        <div class="sec-hdr"><h3>最近のメンテナンス</h3></div>
        <div class="timeline">
          ${recentMaint.map(m => {
            const p = getProp(m.prop_id);
            const u = p && getUnit(m.prop_id, m.unit_id);
            return `<div class="tl-item">
              <div class="tl-dot ${m.status}"></div>
              <div class="tl-body">
                <div class="tl-title">${m.title}</div>
                <div class="tl-meta">${p ? p.name : ''} ${u ? u.name : ''} · ${fmtDate(m.date)}</div>
              </div>
              <div class="tl-cost">${fmtYen(m.cost)}</div>
            </div>`;
          }).join('')}
        </div>
      </div>
    </div>
  </div>`;
}

// ==================== PROP DETAIL ====================
function renderPropDetail() {
  const p = getProp(S.selPropId);
  if (!p) return '<div class="content"><div class="empty"><p>物件を選択してください</p></div></div>';
  const st = propStats(p);
  const maints = DB.maintenance.filter(m => m.prop_id === p.id);

  const tabs = ['overview','units','maintenance'];
  const tabLabels = {overview:'概要', units:'部屋一覧', maintenance:'メンテナンス'};

  return `<div class="tabs">${tabs.map(t => `<div class="tab${S.tab===t?' active':''}" onclick="setTab('${t}')">${tabLabels[t]}</div>`).join('')}</div>
  <div class="content">
    ${S.tab === 'overview' ? renderPropOverview(p, st) : ''}
    ${S.tab === 'units' ? renderPropUnits(p) : ''}
    ${S.tab === 'maintenance' ? renderPropMaintenance(p, maints) : ''}
  </div>`;
}

function renderPropOverview(p, st) {
  const rateClass = st.rate >= 80 ? 'green' : st.rate >= 60 ? 'amber' : 'red';
  return `<div class="grid2" style="margin-bottom:16px">
    <div>
      <div class="stat-grid" style="grid-template-columns:1fr 1fr;gap:10px">
        <div class="stat-card"><div class="stat-label">月額収入</div><div class="stat-value green">${fmtYen(st.income)}</div></div>
        <div class="stat-card"><div class="stat-label">稼働率</div><div class="stat-value ${rateClass}">${st.rate}%</div></div>
        <div class="stat-card"><div class="stat-label">入居中</div><div class="stat-value blue">${st.occ}室</div></div>
        <div class="stat-card"><div class="stat-label">空室</div><div class="stat-value${st.vacant>0?' amber':''}">${st.vacant}室</div></div>
      </div>
    </div>
    <div class="card">
      <div class="sec-title">物件情報</div>
      <div class="detail-row"><span class="detail-key">住所</span><span class="detail-val">${p.addr}</span></div>
      <div class="detail-row"><span class="detail-key">種別</span><span class="detail-val">${p.type}</span></div>
      <div class="detail-row"><span class="detail-key">築年数</span><span class="detail-val">${2024-p.built}年（${p.built}年建）</span></div>
      <div class="detail-row"><span class="detail-key">階数</span><span class="detail-val">${p.floors}階建</span></div>
      <div class="detail-row"><span class="detail-key">駐車場</span><span class="detail-val">${p.parking > 0 ? p.parking+'台' : 'なし'}</span></div>
      ${p.note ? `<div class="detail-row"><span class="detail-key">備考</span><span class="detail-val" style="font-size:12px">${p.note}</span></div>` : ''}
      <div style="margin-top:10px;display:flex;gap:8px">
        <button class="btn btn-sm" onclick="openEditPropModal('${p.id}')">✎ 編集</button>
        <button class="btn btn-sm btn-danger" onclick="deleteProp('${p.id}')">🗑 削除</button>
      </div>
    </div>
  </div>`;
}

function renderPropUnits(p) {
  return `<div class="unit-grid">
    ${p.units.map(u => `
      <div class="unit-card ${u.status}" onclick="goTreeUnit('${p.id}','${u.id}')">
        <div style="display:flex;justify-content:space-between;align-items:flex-start">
          <div class="unit-card-name">${u.name}</div>
          <span class="badge ${STATUS_CLASS[u.status]}">${STATUS_LABEL[u.status]}</span>
        </div>
        <div class="unit-card-rent">${fmtYen(u.rent)}<span style="font-size:11px;color:var(--text3)">/月</span></div>
        <div class="unit-card-info">${u.layout} / ${u.sqm}㎡ / ${u.floor}F</div>
        ${u.tenant ? `<div style="font-size:12px;color:var(--text2);margin-top:4px">👤 ${u.tenant.name}</div>` : ''}
      </div>
    `).join('')}
    <div class="unit-card" style="border-style:dashed;display:flex;align-items:center;justify-content:center;min-height:100px;cursor:pointer;opacity:0.5" onclick="openAddUnitModal('${p.id}')">
      <span style="font-size:24px">＋</span>
    </div>
  </div>`;
}

function renderPropMaintenance(p, maints) {
  return `<div>
    <div class="sec-hdr">
      <h3>メンテナンス履歴</h3>
      <button class="btn btn-primary btn-sm" onclick="openAddMaintModal('${p.id}')">＋ 追加</button>
    </div>
    ${maints.length === 0 ? '<div class="empty"><p>記録なし</p></div>' :
    `<div class="card" style="padding:0;overflow:hidden">
      <div class="tbl-wrap"><table>
        <thead><tr><th>日付</th><th>内容</th><th>部屋</th><th>費用</th><th>業者</th><th>状態</th><th></th></tr></thead>
        <tbody>
        ${maints.sort((a,b) => b.date.localeCompare(a.date)).map(m => {
          const u = getUnit(m.prop_id, m.unit_id);
          return `<tr>
            <td style="white-space:nowrap">${fmtDate(m.date)}</td>
            <td><strong>${m.title}</strong>${m.note ? `<br><span style="font-size:11px;color:var(--text3)">${m.note}</span>` : ''}</td>
            <td>${u ? u.name : '—'}</td>
            <td style="white-space:nowrap">${fmtYen(m.cost)}</td>
            <td>${m.vendor}</td>
            <td><span class="badge ${m.status==='done'?'occupied':'vacant'}">${m.status==='done'?'完了':'未対応'}</span></td>
            <td><div class="tbl-action">
              <button class="btn-icon" onclick="openEditMaintModal('${m.id}')" title="編集">✎</button>
              <button class="btn-icon btn-danger" onclick="deleteMaint('${m.id}')" title="削除">🗑</button>
            </div></td>
          </tr>`;
        }).join('')}
        </tbody>
      </table></div>
    </div>`}
  </div>`;
}

// ==================== UNIT DETAIL ====================
function renderUnitDetail() {
  const p = getProp(S.selPropId);
  const u = getUnit(S.selPropId, S.selUnitId);
  if (!p || !u) return '<div class="content"><p>部屋が見つかりません</p></div>';
  const maints = DB.maintenance.filter(m => m.unit_id === u.id);
  const tabs = ['overview','tenant','maintenance'];
  const tabLabels = {overview:'概要', tenant:'入居者', maintenance:'メンテナンス'};

  return `<div class="tabs">${tabs.map(t => `<div class="tab${S.tab===t?' active':''}" onclick="setTab('${t}')">${tabLabels[t]}</div>`).join('')}</div>
  <div class="content">
    ${S.tab === 'overview' ? renderUnitOverview(p, u) : ''}
    ${S.tab === 'tenant' ? renderUnitTenant(p, u) : ''}
    ${S.tab === 'maintenance' ? renderUnitMaintenance(p, u, maints) : ''}
  </div>`;
}

function renderUnitOverview(p, u) {
  return `<div class="grid2">
    <div class="card">
      <div class="sec-title">部屋情報</div>
      <div class="detail-row"><span class="detail-key">ステータス</span><span class="detail-val"><span class="badge ${STATUS_CLASS[u.status]}">${STATUS_LABEL[u.status]}</span></span></div>
      <div class="detail-row"><span class="detail-key">賃料</span><span class="detail-val" style="color:var(--green);font-size:16px">${fmtYen(u.rent)}/月</span></div>
      <div class="detail-row"><span class="detail-key">間取り</span><span class="detail-val">${u.layout}</span></div>
      <div class="detail-row"><span class="detail-key">面積</span><span class="detail-val">${u.sqm}㎡</span></div>
      <div class="detail-row"><span class="detail-key">階数</span><span class="detail-val">${u.floor}階</span></div>
      <div class="detail-row"><span class="detail-key">敷金</span><span class="detail-val">${fmtYen(u.deposit)}</span></div>
      <div class="detail-row"><span class="detail-key">礼金</span><span class="detail-val">${fmtYen(u.key_money)}</span></div>
      <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-sm" onclick="openEditUnitModal('${p.id}','${u.id}')">✎ 編集</button>
        ${u.status !== 'occupied' ? `<button class="btn btn-sm" onclick="openSetTenantModal('${p.id}','${u.id}')">👤 入居登録</button>` : `<button class="btn btn-sm btn-danger" onclick="confirmMoveOut('${p.id}','${u.id}')">退去処理</button>`}
        <button class="btn btn-sm btn-danger" onclick="deleteUnit('${p.id}','${u.id}')">🗑 削除</button>
      </div>
    </div>
    <div class="card">
      <div class="sec-title">ステータス変更</div>
      <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:12px">
        ${['occupied','vacant','maintenance'].map(st =>
          `<button class="btn${u.status===st?' btn-primary':''}" onclick="setUnitStatus('${p.id}','${u.id}','${st}')">
            ${STATUS_ICON[st]} ${STATUS_LABEL[st]}${u.status===st?' ✓':''}
          </button>`
        ).join('')}
      </div>
    </div>
  </div>`;
}

function renderUnitTenant(p, u) {
  if (!u.tenant) {
    return `<div class="card" style="text-align:center;padding:40px">
      <div style="font-size:40px;margin-bottom:12px;opacity:0.3">👤</div>
      <p style="color:var(--text3);margin-bottom:16px">現在空室です</p>
      <button class="btn btn-primary" onclick="openSetTenantModal('${p.id}','${u.id}')">＋ 入居者を登録</button>
    </div>`;
  }
  const t = u.tenant;
  const g  = t.guarantor   || {};
  const cr = t.coResidents || [];
  const ec = t.emergencyContacts || [];
  const daysLeft = t.contract_end ? Math.floor((new Date(t.contract_end) - new Date()) / 86400000) : null;
  const hasGuarantor = g.name;

  return `
    <div style="display:flex;gap:2px;border-bottom:1px solid var(--border);margin-bottom:12px">
      <div class="tab tenant-subtab active" data-subtab="basic" onclick="switchTenantTab(this,'basic')" style="padding:8px 12px">基本情報</div>
      <div class="tab tenant-subtab" data-subtab="guarantor" onclick="switchTenantTab(this,'guarantor')" style="padding:8px 12px">🤝 保証人</div>
    </div>

    <div data-subtabpanel="basic">
      <div class="grid2" style="margin-bottom:12px">
        <div class="card">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px">
            <div class="avatar">${t.name[0]}</div>
            <div>
              <div style="font-size:16px;font-weight:600">${t.name}</div>
              <div style="font-size:12px;color:var(--text3)">${t.kana||''}</div>
            </div>
          </div>
          <div class="detail-row"><span class="detail-key">電話</span><span class="detail-val">${t.tel||'—'}</span></div>
          <div class="detail-row"><span class="detail-key">メール</span><span class="detail-val" style="font-size:12px">${t.email||'—'}</span></div>
          <div class="detail-row"><span class="detail-key">入居開始</span><span class="detail-val">${fmtDate(t.since)}</span></div>
          <div class="detail-row"><span class="detail-key">契約終了</span><span class="detail-val">${fmtDate(t.contract_end)}</span></div>
          ${daysLeft !== null ? `<div class="detail-row"><span class="detail-key">残日数</span><span class="detail-val" style="color:${daysLeft < 90 ? 'var(--red)' : daysLeft < 180 ? 'var(--amber)' : 'var(--green)'}">${daysLeft}日</span></div>` : ''}
          <div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--border)">
            <div style="font-size:12px;color:var(--text3);margin-bottom:4px">📞 緊急連絡先${ec.length > 1 ? `（${ec.length}件）` : ''}</div>
            ${ec.length === 0
              ? `<div style="font-size:12px;color:var(--text3)">未登録</div>`
              : ec.map(c => `
                <div class="detail-row">
                  <span class="detail-key">${c.name||'—'}</span>
                  <span class="detail-val" style="font-size:12px">${c.tel||'—'}</span>
                </div>`).join('')
            }
          </div>
          <div style="margin-top:10px;display:flex;gap:8px">
            <button class="btn btn-sm" onclick="openSetTenantModal('${p.id}','${u.id}')">✎ 編集</button>
            <button class="btn btn-sm btn-danger" onclick="confirmMoveOut('${p.id}','${u.id}')">退去処理</button>
          </div>
        </div>
        <div class="card">
          <div class="sec-title">契約情報</div>
          <div class="detail-row"><span class="detail-key">月額賃料</span><span class="detail-val" style="color:var(--green)">${fmtYen(u.rent)}</span></div>
          <div class="detail-row"><span class="detail-key">敷金</span><span class="detail-val">${fmtYen(u.deposit)}</span></div>
          <div class="detail-row"><span class="detail-key">礼金</span><span class="detail-val">${fmtYen(u.key_money)}</span></div>
          <div class="detail-row"><span class="detail-key">入居期間</span><span class="detail-val">${calcTenure(t.since)}</span></div>
          ${daysLeft !== null && daysLeft < 180 ? `<div class="info-box" style="margin-top:10px">⚠ 契約終了まで${daysLeft}日です。更新確認が必要かもしれません。</div>` : ''}
        </div>
      </div>

      <div class="card">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
          <div class="sec-title" style="margin:0">👨‍👩‍👧 同居人</div>
          <span style="font-size:11px;color:var(--text3)">${cr.length}名</span>
        </div>
        ${cr.length === 0
          ? `<div style="font-size:12px;color:var(--text3);padding:8px 0">同居人なし</div>`
          : cr.map(c => `
            <div class="detail-row">
              <span class="detail-key">${c.name}</span>
              <span class="detail-val" style="font-size:12px">${[c.relation, c.age ? c.age+'歳' : ''].filter(Boolean).join(' · ') || '—'}</span>
            </div>`).join('')
        }
      </div>
    </div>

    <div data-subtabpanel="guarantor" style="display:none">
      <div class="card">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
          <div class="sec-title" style="margin:0">🤝 連帯保証人</div>
          ${!hasGuarantor ? `<span style="font-size:11px;color:var(--text3)">未登録</span>` : ''}
        </div>
        ${hasGuarantor ? `
          <div class="detail-row"><span class="detail-key">氏名</span><span class="detail-val">${g.name}</span></div>
          <div class="detail-row"><span class="detail-key">続柄</span><span class="detail-val">${g.relation||'—'}</span></div>
          <div class="detail-row"><span class="detail-key">電話</span><span class="detail-val">${g.tel||'—'}</span></div>
          <div class="detail-row"><span class="detail-key">住所</span><span class="detail-val" style="font-size:12px">${g.addr||'—'}</span></div>
        ` : `<div style="font-size:12px;color:var(--text3);padding:8px 0">保証人情報は編集から登録できます</div>`}
      </div>
    </div>`;
}

function switchTenantTab(el, name) {
  const wrap = el.closest('.modal') || el.closest('.content') || el.parentElement.parentElement;
  wrap.querySelectorAll('.tenant-subtab, .tenant-edit-subtab').forEach(b => b.classList.toggle('active', b === el));
  wrap.querySelectorAll('[data-subtabpanel]').forEach(panel => {
    panel.style.display = panel.dataset.subtabpanel === name ? '' : 'none';
  });
}

function calcTenure(since) {
  if (!since) return '—';
  const d = Math.floor((new Date() - new Date(since)) / 86400000);
  const y = Math.floor(d/365), m = Math.floor((d%365)/30);
  return y > 0 ? `${y}年${m > 0 ? m+'ヶ月' : ''}` : `${m}ヶ月`;
}

function renderUnitMaintenance(p, u, maints) {
  return `<div>
    <div class="sec-hdr">
      <h3>メンテナンス履歴</h3>
      <button class="btn btn-primary btn-sm" onclick="openAddMaintModal('${p.id}','${u.id}')">＋ 追加</button>
    </div>
    ${maints.length === 0 ? '<div class="empty"><p>記録なし</p></div>' :
    `<div class="timeline">
      ${maints.sort((a,b) => b.date.localeCompare(a.date)).map(m =>
        `<div class="tl-item">
          <div class="tl-dot ${m.status}"></div>
          <div class="tl-body">
            <div class="tl-title">${m.title} <span class="badge ${m.priority==='high'?'maintenance':m.priority==='medium'?'vacant':'neutral'}" style="font-size:10px">${m.category}</span></div>
            <div class="tl-meta">${fmtDate(m.date)} · ${m.vendor}${m.note ? ' · '+m.note : ''}</div>
          </div>
          <div style="text-align:right">
            <div class="tl-cost">${fmtYen(m.cost)}</div>
            <span class="badge ${m.status==='done'?'occupied':'vacant'}">${m.status==='done'?'完了':'未対応'}</span>
          </div>
        </div>`
      ).join('')}
    </div>
    <div style="margin-top:12px;padding:10px 12px;background:var(--surface3);border-radius:var(--radius);font-size:13px">
      累計費用: <strong>${fmtYen(maints.reduce((s,m)=>s+m.cost,0))}</strong>
    </div>`}
  </div>`;
}

// ==================== TENANTS PAGE ====================
function renderTenants() {
  const tenants = allUnits().filter(u => u.tenant).map(u => ({...u.tenant, unit: u, prop: u.prop}));
  const expiring = tenants.filter(t => {
    if (!t.contract_end) return false;
    const d = Math.floor((new Date(t.contract_end) - new Date()) / 86400000);
    return d < 180;
  });

  return `<div class="content">
    ${expiring.length > 0 ? `<div class="info-box">⚠ 契約更新期限が近い入居者: ${expiring.length}名（180日以内）</div>` : ''}
    <div class="card" style="padding:0;overflow:hidden">
      <div class="tbl-wrap"><table>
        <thead><tr><th>氏名</th><th>物件 / 部屋</th><th>入居開始</th><th>契約終了</th><th>残日数</th><th>賃料</th><th>電話</th><th></th></tr></thead>
        <tbody>
        ${tenants.length === 0 ? '<tr><td colspan="8" style="text-align:center;padding:24px;color:var(--text3)">入居者なし</td></tr>' :
          tenants.map(t => {
            const d = t.contract_end ? Math.floor((new Date(t.contract_end) - new Date()) / 86400000) : null;
            const dClass = d !== null ? (d < 90 ? 'red' : d < 180 ? 'amber' : '') : '';
            return `<tr>
              <td><div style="display:flex;align-items:center;gap:8px">
                <div class="avatar" style="width:28px;height:28px;font-size:11px">${t.name[0]}</div>
                <div><div style="font-weight:500">${t.name}</div><div style="font-size:11px;color:var(--text3)">${t.kana}</div></div>
              </div></td>
              <td>${t.prop.name}<br><span style="font-size:11px;color:var(--text3)">${t.unit.name}</span></td>
              <td>${fmtDate(t.since)}</td>
              <td>${fmtDate(t.contract_end)}</td>
              <td><span style="font-weight:500;color:${d!==null&&d<180?'var(--'+dClass+')':'var(--text)'}">${d !== null ? d+'日' : '—'}</span></td>
              <td>${fmtYen(t.unit.rent)}</td>
              <td>${t.tel}</td>
              <td><button class="btn btn-sm" onclick="goTreeUnit('${t.prop.id}','${t.unit.id}')">詳細</button></td>
            </tr>`;
          }).join('')}
        </tbody>
      </table></div>
    </div>
  </div>`;
}

// ==================== MAINTENANCE PAGE ====================
function renderMaintenance() {
  const filter = {all: m => true, pending: m => m.status === 'pending', done: m => m.status === 'done'};
  const fKey = S.maintFilter || 'all';
  const maints = DB.maintenance.filter(filter[fKey]).sort((a,b) => b.date.localeCompare(a.date));
  const totalCost = maints.reduce((s,m) => s+m.cost, 0);

  return `<div class="content">
    <div class="stat-grid" style="grid-template-columns:repeat(3,1fr)">
      <div class="stat-card"><div class="stat-label">全件数</div><div class="stat-value blue">${DB.maintenance.length}</div></div>
      <div class="stat-card"><div class="stat-label">未対応</div><div class="stat-value${DB.maintenance.filter(m=>m.status==='pending').length>0?' red':' green'}">${DB.maintenance.filter(m=>m.status==='pending').length}</div></div>
      <div class="stat-card"><div class="stat-label">累計費用</div><div class="stat-value amber">${fmtYen(DB.maintenance.reduce((s,m)=>s+m.cost,0))}</div></div>
    </div>
    <div style="display:flex;gap:8px;margin-bottom:14px;align-items:center">
      <button class="btn btn-sm${!S.maintFilter||S.maintFilter==='all'?' btn-primary':''}" onclick="setMaintFilter('all')">すべて</button>
      <button class="btn btn-sm${S.maintFilter==='pending'?' btn-primary':''}" onclick="setMaintFilter('pending')">未対応</button>
      <button class="btn btn-sm${S.maintFilter==='done'?' btn-primary':''}" onclick="setMaintFilter('done')">完了</button>
      <span style="flex:1"></span>
      <span style="font-size:12px;color:var(--text3)">${maints.length}件 / 合計 ${fmtYen(totalCost)}</span>
    </div>
    <div class="card" style="padding:0;overflow:hidden">
      <div class="tbl-wrap"><table>
        <thead><tr><th>日付</th><th>内容</th><th>物件 / 部屋</th><th>カテゴリ</th><th>費用</th><th>業者</th><th>優先度</th><th>状態</th><th></th></tr></thead>
        <tbody>
        ${maints.length === 0 ? '<tr><td colspan="9" style="text-align:center;padding:24px;color:var(--text3)">記録なし</td></tr>' :
          maints.map(m => {
            const p = getProp(m.prop_id);
            const u = p && getUnit(m.prop_id, m.unit_id);
            const prioClass = {high:'maintenance', medium:'vacant', low:'neutral'};
            return `<tr>
              <td style="white-space:nowrap">${fmtDate(m.date)}</td>
              <td><strong>${m.title}</strong>${m.note ? `<br><span style="font-size:11px;color:var(--text3)">${m.note}</span>` : ''}</td>
              <td>${p ? p.name : '—'}<br><span style="font-size:11px;color:var(--text3)">${u ? u.name : ''}</span></td>
              <td><span class="badge neutral">${m.category}</span></td>
              <td style="white-space:nowrap">${fmtYen(m.cost)}</td>
              <td>${m.vendor}</td>
              <td><span class="badge ${prioClass[m.priority]||'neutral'}">${{high:'高',medium:'中',low:'低'}[m.priority]}</span></td>
              <td><span class="badge ${m.status==='done'?'occupied':'vacant'}">${m.status==='done'?'完了':'未対応'}</span></td>
              <td><div class="tbl-action">
                <button class="btn-icon" onclick="openEditMaintModal('${m.id}')" title="編集">✎</button>
                <button class="btn-icon" onclick="toggleMaintStatus('${m.id}')" title="状態切替">🔄</button>
                <button class="btn-icon btn-danger" onclick="deleteMaint('${m.id}')" title="削除">🗑</button>
              </div></td>
            </tr>`;
          }).join('')}
        </tbody>
      </table></div>
    </div>
  </div>`;
}

// ==================== IMPORT / EXPORT ====================
function renderImport() {
  return `<div class="content">
    <div class="grid2">
      <div>
        <div class="card" style="margin-bottom:16px">
          <div class="sec-hdr"><h3>📥 Excelインポート</h3></div>
          <div class="info-box">CSVまたはExcelファイル（.xlsx/.csv）をドロップして一括取込できます。<br>テンプレートをダウンロードしてから入力してください。</div>
          <div class="drop-zone" id="drop-zone" onclick="document.getElementById('file-input').click()">
            <div class="drop-zone-icon">📂</div>
            <p>ファイルをドロップまたはクリックして選択</p>
            <small>.xlsx / .csv 対応</small>
          </div>
          <input type="file" id="file-input" style="display:none" accept=".xlsx,.csv" onchange="handleFileImport(event)">
        </div>
        <div class="card">
          <div class="sec-hdr"><h3>📋 テンプレートダウンロード</h3></div>
          <div style="display:flex;flex-direction:column;gap:8px">
            <button class="btn" onclick="downloadTemplate('property')">🏡 物件・部屋テンプレート (.xlsx)</button>
            <button class="btn" onclick="downloadTemplate('tenant')">👥 入居者情報テンプレート (.xlsx)</button>
            <button class="btn" onclick="downloadTemplate('maintenance')">🔧 メンテナンス記録テンプレート (.xlsx)</button>
          </div>
        </div>
      </div>
      <div>
        <div class="card" style="margin-bottom:16px">
          <div class="sec-hdr"><h3>📤 Excelエクスポート</h3></div>
          <div style="display:flex;flex-direction:column;gap:8px">
            <button class="btn btn-primary" onclick="exportAll()">📊 全データ出力（全シート）</button>
            <button class="btn" onclick="exportData('properties')">🏡 物件・部屋一覧</button>
            <button class="btn" onclick="exportData('tenants')">👥 入居者一覧</button>
            <button class="btn" onclick="exportData('maintenance')">🔧 メンテナンス履歴</button>
          </div>
        </div>

      </div>
    </div>
    <div id="import-preview"></div>
  </div>`;
}

// ==================== MODAL HELPERS ====================
function showModal(html) {
  document.getElementById('modal-root').innerHTML = `<div class="modal-overlay" onclick="if(event.target===this)closeModal()">${html}</div>`;
}
function closeModal() { document.getElementById('modal-root').innerHTML = ''; }

// ==================== NAVIGATION ====================
function goPage(page) { S.page = page; S.tab = 'overview'; render(); }
function goTreeProp(pid) { S.page = 'prop'; S.selPropId = pid; S.selUnitId = null; S.tab = 'overview'; render(); }
function goTreeUnit(pid, uid) {
  const u = getUnit(pid, uid);
  if (u && u.status === 'maintenance') {
    // 工事中ステータス → メンテナンス画面に遷移
    S.page = 'maintenance';
    S.maintFilter = 'all';
    render();
  } else {
    S.page = 'prop';
    S.selPropId = pid;
    S.selUnitId = uid;
    S.tab = 'overview';
    render();
  }
}
function toggleTree(pid) { S.treeOpen[pid] = !S.treeOpen[pid]; render(); }
function setTab(tab) { S.tab = tab; render(); }
function setMaintFilter(f) { S.maintFilter = f; render(); }
function onTreeSearch(q) { S.treeFilter = q; render(); }
function setRentTab(tab) { S.rentTab = tab; render(); }
function setRentHistOffset(n) { S.rentHistOffset = n; render(); }

