// dashboard.js — ダッシュボード描画（v1.6.0・優先度優先レイアウト）

function renderDashboard() {
  const gs = globalStats();
  const ym = currentYM();
  const rateClass = gs.rate >= 80 ? 'green' : gs.rate >= 60 ? 'amber' : 'red';
  
  // ===== 1. 未入金エリア データ取得 =====
  const units = allUnits().filter(u => u.status === 'occupied');
  const unpaidUnits = units.filter(u => !getPayment(u.id, ym));
  const unpaidTotal = unpaidUnits.reduce((s, u) => s + u.rent, 0);
  
  // ===== 2. 契約終了エリア データ取得 =====
  const today = new Date();
  const contractEndList = [];
  units.forEach(u => {
    if (u.tenant && u.tenant.contract_end) {
      const endDate = new Date(u.tenant.contract_end);
      const daysUntilEnd = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
      if (daysUntilEnd <= 120 && daysUntilEnd > 0) {  // 120日以内
        contractEndList.push({u, daysUntilEnd, endDate});
      }
    }
  });
  contractEndList.sort((a, b) => a.daysUntilEnd - b.daysUntilEnd);
  
  // ===== 3. メンテナンス未対応 =====
  const maintPending = DB.maintenance.filter(m => m.status === 'pending');
  
  // ===== 4. 空室 =====
  const vacantUnits = allUnits().filter(u => u.status === 'vacant');
  
  // ===== HTML 生成 =====
  return `<div class="content">
    <!-- 1. 未入金エリア（最優先） -->
    <div class="card" style="border-left:4px solid var(--red);margin-bottom:16px">
      <div class="sec-hdr" style="margin-bottom:12px">
        <h3>🔴 今月未入金</h3>
        <span style="font-size:14px;color:var(--red);font-weight:600">${unpaidUnits.length}室</span>
      </div>
      
      <div class="stat-grid" style="grid-template-columns:repeat(2,1fr);margin-bottom:16px;gap:12px">
        <div style="padding:12px;background:var(--red-bg);border-radius:var(--radius-md);border:1px solid var(--red)">
          <div style="font-size:11px;color:var(--text3);margin-bottom:4px">未入金件数</div>
          <div style="font-size:20px;font-weight:700;color:var(--red)">${unpaidUnits.length}室</div>
        </div>
        <div style="padding:12px;background:var(--red-bg);border-radius:var(--radius-md);border:1px solid var(--red)">
          <div style="font-size:11px;color:var(--text3);margin-bottom:4px">未入金合計</div>
          <div style="font-size:18px;font-weight:700;color:var(--red)">${fmtYen(unpaidTotal)}</div>
        </div>
      </div>
      
      ${unpaidUnits.length === 0 ? '<div class="empty"><p>未入金なし 🎉</p></div>' : `
        <div class="tbl-wrap" style="margin-bottom:12px">
          <table style="font-size:13px">
            <thead>
              <tr style="background:var(--red-bg)">
                <th>物件</th><th>部屋</th><th>賃料</th><th></th>
              </tr>
            </thead>
            <tbody>
              ${unpaidUnits.map(u => `
                <tr style="cursor:pointer" onclick="goPage('rent')">
                  <td>${u.prop.name}</td>
                  <td>${u.name}</td>
                  <td style="text-align:right;font-weight:600;color:var(--red)">${fmtYen(u.rent)}</td>
                  <td style="text-align:right;font-size:12px;color:var(--text3)">→</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        <button class="btn btn-primary" style="width:100%" onclick="goPage('rent')">📋 家賃管理に移動</button>
      `}
    </div>
    
    <!-- 2. 契約終了・メンテナンス統合エリア -->
    <div class="grid2" style="margin-bottom:16px">
      <!-- 契約終了 -->
      <div class="card" style="border-left:4px solid var(--amber);padding:0;overflow:hidden">
        <div class="sec-hdr" style="background:var(--amber-bg);border-bottom:1px solid var(--border);padding:12px 16px;margin:0">
          <h3 style="margin:0">⚠️ 契約終了予定</h3>
          <span style="font-size:12px;color:var(--text3)">${contractEndList.length}件</span>
        </div>
        ${contractEndList.length === 0 ? '<div class="empty" style="padding:20px"><p>契約終了予定なし</p></div>' : `
          <div class="tbl-wrap" style="margin:0">
            <table style="font-size:12px">
              <thead>
                <tr>
                  <th>物件・部屋</th><th>入居者</th><th style="text-align:center">残日数</th>
                </tr>
              </thead>
              <tbody>
                ${contractEndList.map(({u, daysUntilEnd, endDate}) => {
                  const bgClass = daysUntilEnd <= 60 ? 'red' : 'amber';
                  return `
                    <tr style="background:var(--${bgClass}-bg)">
                      <td><strong>${u.prop.name} ${u.name}</strong></td>
                      <td>${u.tenant ? u.tenant.name : '—'}</td>
                      <td style="text-align:center;font-weight:600;color:var(--${bgClass})">${daysUntilEnd}日</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>
      
      <!-- メンテナンス未対応 -->
      <div class="card" style="border-left:4px solid var(--amber)">
        <div class="sec-hdr" style="margin-bottom:12px">
          <h3>🔧 未対応メンテナンス</h3>
          <span style="font-size:12px;color:var(--text3)">${maintPending.length}件</span>
        </div>
        ${maintPending.length === 0 ? '<div class="empty"><p>未対応なし ✅</p></div>' : `
          <div style="max-height:180px;overflow-y:auto">
            ${maintPending.slice(0, 5).map(m => {
              const p = getProp(m.prop_id);
              return `
                <div style="padding:8px;border-bottom:1px solid var(--border);cursor:pointer" onclick="goPage('maintenance')">
                  <div style="font-size:12px;font-weight:500">${m.title}</div>
                  <div style="font-size:11px;color:var(--text3)">${p ? p.name : ''} · ${fmtDate(m.date)}</div>
                  <div style="font-size:11px;color:var(--amber);font-weight:600">${fmtYen(m.cost)}</div>
                </div>
              `;
            }).join('')}
          </div>
        `}
      </div>
    </div>
    
    <!-- 3. KPI エリア -->
    <div class="stat-grid" style="grid-template-columns:repeat(auto-fit,minmax(140px,1fr));margin-bottom:16px">
      <div class="stat-card">
        <div class="stat-label">月額収入</div>
        <div class="stat-value green">${fmtYen(gs.income)}</div>
        <div class="stat-sub">${gs.occ}室稼働中</div>
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
    </div>
    
    <!-- 4. 空室一覧 -->
    <div class="card">
      <div class="sec-hdr">
        <h3>空室一覧</h3>
        <span style="font-size:12px;color:var(--text3)">${vacantUnits.length}室</span>
      </div>
      ${vacantUnits.length === 0 ? '<div class="empty"><p>空室なし 🎉</p></div>' :
        vacantUnits.map(u => `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border);cursor:pointer" onclick="goTreeUnit('${u.prop.id}','${u.id}')">
          <span class="badge vacant">空室</span>
          <div style="flex:1">
            <div style="font-size:13px;font-weight:500">${u.prop.name} ${u.name}</div>
            <div style="font-size:11px;color:var(--text3)">${u.layout} / ${u.sqm}㎡</div>
          </div>
          <div style="font-size:13px;font-weight:600">${fmtYen(u.rent)}</div>
        </div>`).join('')}
    </div>
  </div>`;
}