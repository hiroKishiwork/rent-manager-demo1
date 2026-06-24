// rent.js — 家賃管理・DRAG&DROP・アプリ初期化

// ==================== RENT PAGE ====================
function renderRent() {
  const tab = S.rentTab || 'current';
  const tabs = [{k:'current',l:'当月'},{k:'calendar',l:'年間カレンダー'},{k:'history',l:'履歴一覧'}];
  return `<div class="tabs">${tabs.map(t=>`<div class="tab${tab===t.k?' active':''}" onclick="setRentTab('${t.k}')">${t.l}</div>`).join('')}</div>
  <div class="content">
    ${tab==='current'  ? renderRentCurrent()  : ''}
    ${tab==='calendar' ? renderRentCalendar() : ''}
    ${tab==='history'  ? renderRentHistory()  : ''}
  </div>`;
}

function setRentTab(t) { S.rentTab = t; render(); }

// ---------- 未入金アラート基準日 設定モーダル ----------
function openRentAlertDayModal() {
  const current = DB.rentAlertDay || 5;
  // 1〜28日のオプション生成（29・30・31は月によって存在しない日があるため除外）
  const opts = Array.from({length:28}, (_,i) => i+1)
    .map(d => `<option value="${d}"${d===current?' selected':''}>${d}日</option>`)
    .join('');
  showModal(`<div class="modal" style="width:420px">
    <div class="modal-header">
      <div class="modal-title">⚙ 未入金アラート基準日の設定</div>
      <button class="btn-icon" onclick="closeModal()">✕</button>
    </div>
    <div class="modal-body">
      <div class="info-box" style="margin-bottom:16px">
        <strong>アラートの判定ルール</strong><br>
        設定した日を過ぎても当月分の家賃が未入金の場合、当月タブの該当行を赤く表示します。<br>
        例：5日に設定 → 毎月5日を過ぎても未入金なら赤表示
      </div>
      <div class="form-group">
        <label class="form-label req">毎月　何日を過ぎたらアラートを表示するか</label>
        <select class="form-select" id="m-alert-day" style="width:140px">${opts}</select>
      </div>
      <div style="margin-top:12px;font-size:12px;color:var(--text3)">
        ※ 月末がない日（29〜31日）による誤作動を防ぐため、設定できるのは28日までです。<br>
        ※ 設定はこのブラウザのデータに保存されます。
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">キャンセル</button>
      <button class="btn btn-primary" onclick="saveRentAlertDay()">保存</button>
    </div>
  </div>`);
}

function saveRentAlertDay() {
  const val = parseInt(document.getElementById('m-alert-day').value);
  if (!val || val < 1 || val > 28) { toast('1〜28の数値を選択してください', 'error'); return; }
  DB.rentAlertDay = val;
  saveData();
  closeModal();
  toast(`未入金アラート基準日を「毎月${val}日経過後」に設定しました`, 'success');
  render();
}

// ---------- 当月タブ ----------
function renderRentCurrent() {
  const ym  = currentYM();
  const alertDay = DB.rentAlertDay || 5;
  const checkYM  = unpaidAlertYM();  // 基準日を過ぎていれば当月、まだなら前月
  const units = allUnits().filter(u => u.status === 'occupied');
  const rows  = units.map(u => {
    const pay = getPayment(u.id, ym);
    const overdue = !pay && ym === checkYM;
    return {u, pay, overdue};
  });
  const paidCount   = rows.filter(r => r.pay).length;
  const unpaidCount = rows.filter(r => !r.pay).length;
  const totalPaid   = rows.filter(r=>r.pay).reduce((s,r)=>s+r.pay.amount,0);
  const expectedTotal = units.reduce((s,u)=>s+u.rent,0);

  return `
    <div class="stat-grid" style="grid-template-columns:repeat(auto-fit,minmax(160px,1fr));margin-bottom:16px">
      <div class="stat-card"><div class="stat-label">対象月</div><div class="stat-value blue" style="font-size:18px">${ymLabel(ym)}</div></div>
      <div class="stat-card"><div class="stat-label">入金済</div><div class="stat-value green">${paidCount}室</div><div class="stat-sub">${fmtYen(totalPaid)}</div></div>
      <div class="stat-card"><div class="stat-label">未入金</div><div class="stat-value${unpaidCount>0?' red':' green'}">${unpaidCount}室</div><div class="stat-sub">予定 ${fmtYen(expectedTotal-totalPaid)}</div></div>
      <div class="stat-card" style="position:relative">
        <div class="stat-label">未入金アラート基準</div>
        <div class="stat-value" style="font-size:16px">毎月${alertDay}日経過後</div>
        <div class="stat-sub">${alertDay}日を過ぎても未入金の場合に赤表示</div>
        <button class="btn btn-sm" style="margin-top:8px;font-size:11px" onclick="openRentAlertDayModal()">⚙ 基準日を変更</button>
      </div>
    </div>
    <div class="card" style="padding:0;overflow:hidden">
      <div class="tbl-wrap"><table>
        <thead><tr><th>物件</th><th>部屋</th><th>賃料</th><th>入金日</th><th>入金額</th><th>方法</th><th>状態</th><th></th></tr></thead>
        <tbody>
        ${rows.map(({u,pay,overdue})=>`<tr style="${overdue?'background:var(--red-bg)':''}">
          <td>${u.prop.name}</td>
          <td>${u.name}</td>
          <td>${fmtYen(u.rent)}</td>
          <td>${pay ? fmtDate(pay.paid_date) : '<span style="color:var(--text3)">—</span>'}</td>
          <td>${pay ? fmtYen(pay.amount) : '<span style="color:var(--text3)">—</span>'}</td>
          <td>${pay ? (METHOD_LABEL[pay.method]||pay.method) : ''}</td>
          <td>${pay
            ? '<span class="badge occupied">入金済</span>'
            : overdue
              ? '<span class="badge maintenance">未入金</span>'
              : '<span class="badge vacant">未入金</span>'}</td>
          <td><div class="tbl-action">
            ${pay
              ? `<button class="btn-icon" onclick="openEditPayModal('${pay.id}')" title="編集">✎</button>
                 <button class="btn-icon btn-danger" onclick="deletePayment('${pay.id}')" title="削除">🗑</button>`
              : `<button class="btn btn-sm btn-primary" onclick="openAddPayModal('${u.prop.id}','${u.id}','${ym}')">入金登録</button>`}
          </div></td>
        </tr>`).join('')}
        </tbody>
      </table></div>
    </div>`;
}

// ---------- 年間カレンダータブ ----------
function renderRentCalendar() {
  const today = new Date();
  // 当月を中心に過去6ヶ月・未来5ヶ月の12ヶ月
  const months = Array.from({length:12},(_,i)=>currentYM(i-6));
  const units   = allUnits().filter(u=>u.status==='occupied');

  return `
    <div style="overflow-x:auto">
      <table style="border-collapse:collapse;font-size:12px;min-width:900px">
        <thead>
          <tr>
            <th style="padding:8px 12px;background:var(--surface3);border:1px solid var(--border);white-space:nowrap;min-width:120px">物件 / 部屋</th>
            ${months.map(ym=>{
              const isCur = ym===currentYM();
              return `<th style="padding:6px 8px;background:${isCur?'var(--blue-bg)':'var(--surface3)'};border:1px solid var(--border);white-space:nowrap;color:${isCur?'var(--blue-text)':'inherit'};font-weight:${isCur?'600':'500'}">${ymLabel(ym)}</th>`;
            }).join('')}
          </tr>
        </thead>
        <tbody>
        ${units.map(u=>`<tr>
          <td style="padding:6px 10px;border:1px solid var(--border);white-space:nowrap">
            <div style="font-size:11px;color:var(--text3)">${u.prop.name}</div>
            <div style="font-weight:500">${u.name}</div>
          </td>
          ${months.map(ym=>{
            const pay = getPayment(u.id, ym);
            const isFuture = ym > currentYM();
            if (isFuture && !pay) {
              return `<td style="padding:4px 6px;border:1px solid var(--border);text-align:center;color:var(--text3)">—</td>`;
            }
            return `<td style="padding:4px 6px;border:1px solid var(--border);text-align:center;cursor:${pay?'default':'pointer'}"
              ${!pay?`onclick="openAddPayModal('${u.prop.id}','${u.id}','${ym}')"`:''}
              title="${pay?fmtDate(pay.paid_date)+' '+fmtYen(pay.amount):'クリックして入金登録'}">
              ${pay
                ? `<span style="color:var(--green);font-size:14px">✅</span>`
                : `<span style="color:var(--red);font-size:14px">❌</span>`}
            </td>`;
          }).join('')}
        </tr>`).join('')}
        </tbody>
      </table>
    </div>
    <div style="margin-top:10px;font-size:11px;color:var(--text3)">✅ 入金済　❌ 未入金（クリックで登録）　— 将来月</div>`;
}

// ---------- 履歴一覧タブ ----------
function renderRentHistory() {
  const offset = S.rentHistOffset || 0;
  const ym     = currentYM(offset);
  const units  = allUnits().filter(u=>u.status==='occupied');
  const rows   = units.map(u=>({u, pay:getPayment(u.id,ym)}));
  const totalPaid = rows.filter(r=>r.pay).reduce((s,r)=>s+r.pay.amount,0);
  const expectedTotal = units.reduce((s,u)=>s+u.rent,0);

  return `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
      <button class="btn btn-sm" onclick="setRentHistOffset(${offset-1})">◀ 前月</button>
      <div style="font-size:16px;font-weight:600;min-width:100px;text-align:center">${ymLabel(ym)}</div>
      <button class="btn btn-sm" onclick="setRentHistOffset(${offset+1})" ${offset>=0?'disabled':''}>次月 ▶</button>
      <span style="flex:1"></span>
      <button class="btn btn-sm" onclick="exportRentHistory('${ym}')">📥 Excel出力</button>
      <button class="btn btn-primary btn-sm" onclick="openAddPayModal('','','${ym}')">＋ 入金登録</button>
    </div>
    <div style="display:flex;gap:12px;margin-bottom:14px;flex-wrap:wrap">
      <div class="stat-card" style="flex:1;min-width:120px"><div class="stat-label">入金済</div><div class="stat-value green" style="font-size:18px">${fmtYen(totalPaid)}</div></div>
      <div class="stat-card" style="flex:1;min-width:120px"><div class="stat-label">未入金</div><div class="stat-value${totalPaid<expectedTotal?' amber':' green'}" style="font-size:18px">${fmtYen(expectedTotal-totalPaid)}</div></div>
      <div class="stat-card" style="flex:1;min-width:120px"><div class="stat-label">予定合計</div><div class="stat-value" style="font-size:18px">${fmtYen(expectedTotal)}</div></div>
    </div>
    <div class="card" style="padding:0;overflow:hidden">
      <div class="tbl-wrap"><table>
        <thead><tr><th>物件</th><th>部屋</th><th>賃料</th><th>入金日</th><th>入金額</th><th>方法</th><th>備考</th><th>状態</th><th></th></tr></thead>
        <tbody>
        ${rows.map(({u,pay})=>`<tr>
          <td>${u.prop.name}</td>
          <td>${u.name}</td>
          <td>${fmtYen(u.rent)}</td>
          <td>${pay?fmtDate(pay.paid_date):'—'}</td>
          <td>${pay?fmtYen(pay.amount):'—'}</td>
          <td>${pay?(METHOD_LABEL[pay.method]||''):''}</td>
          <td style="font-size:12px;color:var(--text3)">${pay?pay.note:''}</td>
          <td>${pay?'<span class="badge occupied">入金済</span>':'<span class="badge vacant">未入金</span>'}</td>
          <td><div class="tbl-action">
            ${pay
              ? `<button class="btn-icon" onclick="openEditPayModal('${pay.id}')" title="編集">✎</button>
                 <button class="btn-icon btn-danger" onclick="deletePayment('${pay.id}')" title="削除">🗑</button>`
              : `<button class="btn btn-sm btn-primary" onclick="openAddPayModal('${u.prop.id}','${u.id}','${ym}')">登録</button>`}
          </div></td>
        </tr>`).join('')}
        </tbody>
      </table></div>
    </div>`;
}

function setRentHistOffset(n) { S.rentHistOffset = n; render(); }

// ---------- 入金登録/編集モーダル ----------
function openAddPayModal(pid, uid, ym) {
  const propOpts = DB.properties.map(p=>`<option value="${p.id}"${pid===p.id?' selected':''}>${p.name}</option>`).join('');
  const selProp  = pid ? getProp(pid) : DB.properties[0];
  const unitOpts = selProp ? selProp.units.filter(u=>u.status==='occupied')
    .map(u=>`<option value="${u.id}"${uid===u.id?' selected':''}>${u.name}（${fmtYen(u.rent)}）</option>`).join('') : '';
  const defAmount = uid ? (getUnit(pid,uid)||{}).rent || '' : '';
  showModal(`<div class="modal">
    <div class="modal-header"><div class="modal-title">入金登録</div><button class="btn-icon" onclick="closeModal()">✕</button></div>
    <div class="modal-body">
      <div class="form-grid">
        <div class="form-row">
          <div class="form-group"><label class="form-label req">物件</label>
            <select class="form-select" id="pay-prop" onchange="updatePayUnitOpts(this.value,'pay-unit')">${propOpts}</select></div>
          <div class="form-group"><label class="form-label req">部屋</label>
            <select class="form-select" id="pay-unit">${unitOpts}</select></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label req">対象年月</label>
            <input class="form-input" id="pay-ym" type="month" value="${ym}"></div>
          <div class="form-group"><label class="form-label req">入金日</label>
            <input class="form-input" id="pay-date" type="date" value="${new Date().toISOString().slice(0,10)}"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label req">入金額（円）</label>
            <input class="form-input" id="pay-amount" type="number" value="${defAmount}"></div>
          <div class="form-group"><label class="form-label">支払方法</label>
            <select class="form-select" id="pay-method">
              <option value="bank">銀行振込</option>
              <option value="auto">口座引落</option>
              <option value="cash">現金</option>
              <option value="other">その他</option>
            </select></div>
        </div>
        <div class="form-group"><label class="form-label">備考</label>
          <input class="form-input" id="pay-note" placeholder="メモ"></div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">キャンセル</button>
      <button class="btn btn-primary" onclick="savePayment()">登録</button>
    </div>
  </div>`);
}

function openEditPayModal(payId) {
  const pay = (DB.rentPayments||[]).find(p=>p.id===payId);
  if (!pay) return;
  const propOpts = DB.properties.map(p=>`<option value="${p.id}"${pay.prop_id===p.id?' selected':''}>${p.name}</option>`).join('');
  const selProp  = getProp(pay.prop_id);
  const unitOpts = selProp ? selProp.units.filter(u=>u.status==='occupied')
    .map(u=>`<option value="${u.id}"${pay.unit_id===u.id?' selected':''}>${u.name}（${fmtYen(u.rent)}）</option>`).join('') : '';
  showModal(`<div class="modal">
    <div class="modal-header"><div class="modal-title">入金情報を編集</div><button class="btn-icon" onclick="closeModal()">✕</button></div>
    <div class="modal-body">
      <div class="form-grid">
        <div class="form-row">
          <div class="form-group"><label class="form-label">物件</label>
            <select class="form-select" id="pay-prop" onchange="updatePayUnitOpts(this.value,'pay-unit')">${propOpts}</select></div>
          <div class="form-group"><label class="form-label">部屋</label>
            <select class="form-select" id="pay-unit">${unitOpts}</select></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">対象年月</label>
            <input class="form-input" id="pay-ym" type="month" value="${pay.year_month}"></div>
          <div class="form-group"><label class="form-label">入金日</label>
            <input class="form-input" id="pay-date" type="date" value="${pay.paid_date}"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">入金額（円）</label>
            <input class="form-input" id="pay-amount" type="number" value="${pay.amount}"></div>
          <div class="form-group"><label class="form-label">支払方法</label>
            <select class="form-select" id="pay-method">
              ${['bank','auto','cash','other'].map(m=>`<option value="${m}"${pay.method===m?' selected':''}>${METHOD_LABEL[m]}</option>`).join('')}
            </select></div>
        </div>
        <div class="form-group"><label class="form-label">備考</label>
          <input class="form-input" id="pay-note" value="${pay.note||''}"></div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">キャンセル</button>
      <button class="btn btn-primary" onclick="savePayment('${payId}')">保存</button>
    </div>
  </div>`);
}

function updatePayUnitOpts(pid, selId) {
  const p = getProp(pid);
  const sel = document.getElementById(selId);
  if (!p || !sel) return;
  sel.innerHTML = p.units.filter(u=>u.status==='occupied')
    .map(u=>`<option value="${u.id}">${u.name}（${fmtYen(u.rent)}）</option>`).join('');
}

function savePayment(payId) {
  if (!DB.rentPayments) DB.rentPayments = [];
  const prop_id  = document.getElementById('pay-prop').value;
  const unit_id  = document.getElementById('pay-unit').value;
  const year_month = document.getElementById('pay-ym').value;
  const paid_date  = document.getElementById('pay-date').value;
  const amount   = parseInt(document.getElementById('pay-amount').value) || 0;
  const method   = document.getElementById('pay-method').value;
  const note     = document.getElementById('pay-note').value.trim();
  if (!unit_id || !year_month || !paid_date) { toast('必須項目を入力してください','error'); return; }
  if (payId) {
    const pay = DB.rentPayments.find(p=>p.id===payId);
    Object.assign(pay, {prop_id,unit_id,year_month,paid_date,amount,method,note});
    toast('入金情報を更新しました','success');
  } else {
    // 同月の重複チェック
    if (DB.rentPayments.find(p=>p.unit_id===unit_id&&p.year_month===year_month)) {
      toast('この部屋・月の入金記録は既に存在します','error'); return;
    }
    DB.rentPayments.push({id:nextId('rp'),prop_id,unit_id,year_month,paid_date,amount,method,note});
    toast('入金を登録しました','success');
  }
  saveData(); closeModal(); render();
}

function deletePayment(payId) {
  if (!confirm('この入金記録を削除しますか？')) return;
  DB.rentPayments = (DB.rentPayments||[]).filter(p=>p.id!==payId);
  saveData(); toast('削除しました'); render();
}

// ---------- Excel出力（家賃入金） ----------
function exportRentHistory(ym) {
  if (typeof XLSX === 'undefined') { toast('XLSXライブラリ読み込み中...'); return; }
  const wb = XLSX.utils.book_new();
  addRentSheet(wb, ym);
  XLSX.writeFile(wb, '家賃入金_' + ym + '.xlsx');
  toast('Excelを出力しました','success');
}

function addRentSheet(wb, ym) {
  const targetYM = ym || currentYM();
  const units = allUnits().filter(u=>u.status==='occupied');
  const rows  = [['対象年月','物件名','部屋名','賃料','入金日','入金額','支払方法','備考','状態']];
  for (const u of units) {
    const pay = getPayment(u.id, targetYM);
    rows.push([
      targetYM, u.prop.name, u.name, u.rent,
      pay ? pay.paid_date : '',
      pay ? pay.amount : '',
      pay ? (METHOD_LABEL[pay.method]||pay.method) : '',
      pay ? pay.note : '',
      pay ? '入金済' : '未入金',
    ]);
  }
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), '家賃入金');
}

function confirmReset() {
  showModal(`<div class="modal" style="width:420px">
    <div class="modal-header">
      <div class="modal-title" style="color:var(--red)">⚠ データリセットの確認</div>
      <button class="btn-icon" onclick="closeModal()">✕</button>
    </div>
    <div class="modal-body">
      <div style="background:var(--red-bg);border:1px solid var(--red);border-radius:var(--radius);padding:12px 14px;margin-bottom:16px;font-size:13px;color:var(--red-text)">
        <strong>この操作は元に戻せません。</strong><br>
        全ての物件・部屋・入居者・家賃・メンテナンスデータが削除されます。
      </div>
      <div class="form-group">
        <label class="form-label">確認のため <strong>RESET</strong> と入力してください</label>
        <input class="form-input" id="m-reset-confirm" type="text" placeholder="RESET" autocomplete="off"
          oninput="document.getElementById('m-reset-btn').disabled = this.value !== 'RESET'">
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">キャンセル</button>
      <button class="btn btn-danger" id="m-reset-btn" disabled onclick="execReset()">リセット実行</button>
    </div>
  </div>`);
}

function execReset() {
  DB = defaultData();
  saveData();
  closeModal();
  S.page = 'dashboard';
  toast('データをリセットしました');
  render();
}

// ==================== DRAG & DROP ====================
function attachEvents() {
  const searchEl = document.getElementById('tree-search');
  if (searchEl) {
    let composing = false;
    searchEl.addEventListener('compositionstart', () => { composing = true; });
    searchEl.addEventListener('compositionend', () => {
      composing = false;
      onTreeSearch(searchEl.value);
    });
    searchEl.addEventListener('input', () => {
      if (!composing) onTreeSearch(searchEl.value);
    });
  }

  const dz = document.getElementById('drop-zone');
  if (!dz) return;
  dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('drag'); });
  dz.addEventListener('dragleave', () => dz.classList.remove('drag'));
  dz.addEventListener('drop', e => {
    e.preventDefault(); dz.classList.remove('drag');
    const file = e.dataTransfer.files[0];
    if (file) { document.getElementById('file-input').files = e.dataTransfer.files; handleFileImport({target:{files:[file]}}); }
  });
}

// ==================== INIT ====================
render();
