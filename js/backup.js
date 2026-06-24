// backup.js — インポート/エクスポート・Excel出力・AES暗号化バックアップ・コンテキストメニュー・アクション
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



// ==================== CONTEXT MENUS ====================
function ctxProp(e, pid) {
  e.preventDefault();
  showCtx(e, [
    {label:'📝 編集', fn: () => openEditPropModal(pid)},
    {label:'➕ 部屋追加', fn: () => openAddUnitModal(pid)},
    {sep:true},
    {label:'🗑 削除', cls:'danger', fn: () => deleteProp(pid)},
  ]);
}
function ctxUnit(e, pid, uid) {
  e.preventDefault();
  const u = getUnit(pid, uid);
  showCtx(e, [
    {label:'✎ 編集', fn: () => openEditUnitModal(pid, uid)},
    {label:'👤 入居者', fn: () => openSetTenantModal(pid, uid)},
    {sep:true},
    {label:'🏠 入居中', fn: () => setUnitStatus(pid,uid,'occupied')},
    {label:'○ 空室', fn: () => setUnitStatus(pid,uid,'vacant')},
    {label:'🔧 工事中', fn: () => setUnitStatus(pid,uid,'maintenance')},
    {sep:true},
    {label:'🗑 削除', cls:'danger', fn: () => deleteUnit(pid, uid)},
  ]);
}
function showCtx(e, items) {
  const m = document.getElementById('ctx');
  m.innerHTML = items.map((it,i) => it.sep ?
    '<div class="ctx-sep"></div>' :
    `<div class="ctx-item${it.cls?' '+it.cls:''}" onclick="runCtx(${i})">${it.label}</div>`
  ).join('');
  m._fns = items.map(it => it.fn || null);
  m.style.display = 'block';
  const rx = document.documentElement.clientWidth;
  const ry = document.documentElement.clientHeight;
  const x = Math.min(e.clientX, rx - 160);
  const y = Math.min(e.clientY, ry - 200);
  m.style.left = x + 'px';
  m.style.top = y + 'px';
}
window.runCtx = function(i) {
  const fn = document.getElementById('ctx')._fns[i];
  if (fn) fn();
  document.getElementById('ctx').style.display = 'none';
};
document.addEventListener('click', () => {
  const m = document.getElementById('ctx');
  if (m) m.style.display = 'none';
});

// ==================== ACTIONS ====================
function goPage(page) { S.page = page; S.tab = 'overview'; render(); }
function goTreeProp(pid) {
  S.page = 'prop'; S.selPropId = pid; S.selUnitId = null;
  S.tab = 'overview'; S.treeOpen[pid] = true; render();
}
function goTreeUnit(pid, uid) {
  S.page = 'prop'; S.selPropId = pid; S.selUnitId = uid;
  S.tab = 'overview'; S.treeOpen[pid] = true; render();
}
function toggleTree(pid) { S.treeOpen[pid] = !S.treeOpen[pid]; render(); }
function onTreeSearch(v) {
  S.treeFilter = v;
  const treeEl = document.querySelector('.sb-tree');
  if (treeEl) { treeEl.innerHTML = renderTree(); }
}
function setTab(t) { S.tab = t; render(); }
function setMaintFilter(f) { S.maintFilter = f; render(); }
function setUnitStatus(pid, uid, st) {
  const u = getUnit(pid, uid);
  u.status = st;
  // v1.5.0: テナント情報は削除しない（論理削除フラグ方式を採用）
  saveData(); toast('ステータスを変更しました'); render();
}

// ==================== EXCEL EXPORT ====================
function exportAll() {
  if (typeof XLSX === 'undefined') { toast('XLSXライブラリ読み込み中...', ''); setTimeout(exportAll, 500); return; }
  const wb = XLSX.utils.book_new();
  addPropSheet(wb);
  addTenantSheet(wb);
  addMaintSheet(wb);
  addRentSheet(wb, currentYM());
  XLSX.writeFile(wb, '賃貸管理_' + new Date().toISOString().slice(0,10) + '.xlsx');
  toast('Excelファイルを出力しました', 'success');
}

function exportData(type) {
  if (typeof XLSX === 'undefined') { toast('XLSXライブラリ読み込み中...'); return; }
  const wb = XLSX.utils.book_new();
  if (type === 'properties') addPropSheet(wb);
  else if (type === 'tenants') addTenantSheet(wb);
  else if (type === 'maintenance') addMaintSheet(wb);
  const names = {properties:'物件部屋一覧', tenants:'入居者一覧', maintenance:'メンテナンス履歴'};
  XLSX.writeFile(wb, names[type] + '_' + new Date().toISOString().slice(0,10) + '.xlsx');
  toast('出力しました', 'success');
}

function addPropSheet(wb) {
  const rows = [['物件名','種別','住所','築年','階数','駐車場','部屋名','間取り','階','面積(㎡)','賃料','敷金','礼金','ステータス']];
  for (const p of DB.properties) {
    for (const u of p.units) {
      rows.push([p.name,p.type,p.addr,p.built,p.floors,p.parking,u.name,u.layout,u.floor,u.sqm,u.rent,u.deposit,u.key_money,STATUS_LABEL[u.status]]);
    }
  }
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), '物件・部屋');
}

function addTenantSheet(wb) {
  const rows = [['物件名','部屋名','氏名','ふりがな','電話','メール','入居開始','契約終了','緊急連絡先','賃料',
                 '保証人氏名','保証人続柄','保証人電話','保証人住所','同居人']];
  for (const p of DB.properties) {
    for (const u of p.units) {
      if (u.tenant) {
        const t = u.tenant;
        const g = t.guarantor || {};
        const coStr = (t.coResidents || [])
          .filter(c => c.name)
          .map(c => [c.name, c.relation, c.age ? c.age+'歳' : ''].filter(Boolean).join('/'))
          .join('、');
        const emStr = (t.emergencyContacts || [])
          .filter(c => c.name)
          .map(c => [c.name, c.tel].filter(Boolean).join('/'))
          .join('、');
        rows.push([p.name, u.name, t.name, t.kana, t.tel, t.email, t.since, t.contract_end,
                   emStr, u.rent, g.name||'', g.relation||'', g.tel||'', g.addr||'', coStr]);
      }
    }
  }
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), '入居者');
}

function addMaintSheet(wb) {
  const rows = [['日付','物件名','部屋名','内容','カテゴリ','優先度','費用','業者','状態','備考']];
  for (const m of DB.maintenance.sort((a,b) => b.date.localeCompare(a.date))) {
    const p = getProp(m.prop_id);
    const u = p && getUnit(m.prop_id, m.unit_id);
    rows.push([m.date, p?p.name:'', u?u.name:'', m.title, m.category, {high:'高',medium:'中',low:'低'}[m.priority], m.cost, m.vendor, m.status==='done'?'完了':'未対応', m.note]);
  }
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'メンテナンス');
}

function downloadTemplate(type) {
  if (typeof XLSX === 'undefined') { toast('XLSXライブラリ読み込み中...'); return; }
  const wb = XLSX.utils.book_new();
  let rows;
  if (type === 'property') {
    rows = [['物件名','種別','住所','築年','階数','駐車場台数','部屋名','間取り','階','面積(㎡)','賃料(円)','敷金(円)','礼金(円)'],
            ['（例）グリーンハイツ','マンション','東京都世田谷区1-2-3','2005','3','2','101号室','1K','1','25.5','68000','136000','68000']];
  } else if (type === 'tenant') {
    rows = [
      ['物件名','部屋名','氏名','ふりがな','電話','メール','入居開始(YYYY-MM-DD)','契約終了(YYYY-MM-DD)','緊急連絡先',
       '保証人氏名','保証人続柄','保証人電話','保証人住所','同居人（例：妻/配偶者/35歳、子/長男/8歳）'],
      ['グリーンハイツ','101号室','田中 健太','タナカ ケンタ','090-0000-0000','example@mail.com',
       '2024-01-01','2025-12-31','田中 花 / 090-9999-9999',
       '田中 一郎','父','090-1111-0000','東京都〇〇区…','妻/配偶者/35歳、子/長男/8歳'],
    ];
  } else {
    rows = [['物件名','部屋名','内容','カテゴリ','優先度(high/medium/low)','日付(YYYY-MM-DD)','費用(円)','業者名','状態(done/pending)','備考'],
            ['グリーンハイツ','101号室','エアコン修理','設備修理','high','2024-06-01','25000','快適エアコンサービス','done','室外機交換']];
  }
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'テンプレート');
  XLSX.writeFile(wb, `テンプレート_${type}.xlsx`);
  toast('テンプレートをダウンロードしました', 'success');
}

function handleFileImport(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(ev) {
    try {
      const wb = XLSX.read(ev.target.result, {type:'binary'});
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, {header:1});
      if (!rows.length) { toast('データがありません', 'error'); return; }
      // Show preview
      const headers = rows[0];
      const preview = rows.slice(1, 6);
      const previewHtml = `<div class="card" style="margin-top:16px">
        <div class="sec-hdr"><h3>📋 取込プレビュー（先頭5件）</h3><span style="font-size:12px;color:var(--text3)">${rows.length-1}件</span></div>
        <div class="tbl-wrap"><table>
          <thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead>
          <tbody>${preview.map(r=>`<tr>${headers.map((_,i)=>`<td>${r[i]||''}</td>`).join('')}</tr>`).join('')}</tbody>
        </table></div>
        <div style="margin-top:12px"><button class="btn btn-primary" onclick="toast('実際のシステムではここでDBに取込処理を行います','success')">取込実行</button></div>
      </div>`;
      document.getElementById('import-preview').innerHTML = previewHtml;
      toast(`${rows.length-1}件のデータを読み込みました`);
    } catch(err) {
      toast('ファイルの読み込みに失敗しました', 'error');
    }
  };
  reader.readAsBinaryString(file);
}

function exportJSON() {
  const blob = new Blob([JSON.stringify(DB, null, 2)], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'rental_backup_' + new Date().toISOString().slice(0,10) + '.json';
  a.click();
  toast('バックアップを保存しました', 'success');
}

function handleJSONImport(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(ev) {
    try {
      const data = JSON.parse(ev.target.result);
      if (!data.properties) throw new Error();
      DB = data;
      saveData();
      toast('データを復元しました', 'success');
      render();
    } catch(err) {
      toast('ファイルが無効です', 'error');
    }
  };
  reader.readAsText(file);
}

// ==================== パスワード表示/非表示トグル ====================
function togglePwVisibility(inputId, btnId) {
  const input = document.getElementById(inputId);
  const btn   = document.getElementById(btnId);
  if (!input || !btn) return;
  const isHidden = input.type === 'password';
  input.type     = isHidden ? 'text'     : 'password';
  // 非表示=🙈  表示中=👁
  btn.textContent = isHidden ? '👁'      : '🙈';
  btn.title       = isHidden ? '非表示にする' : '表示する';
}

// ==================== AES-256-GCM 暗号化バックアップ ====================
// 方式: AES-256-GCM + PBKDF2(SHA-256, 600,000回)
// ファイル形式(JSON): { v, salt, iv, data }
//   v    : フォーマットバージョン (1)
//   salt : PBKDF2用ソルト (Base64, 16bytes)
//   iv   : AES-GCM用IV  (Base64, 12bytes)
//   data : 暗号化済み本文 (Base64)

function b64encode(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}
function b64decode(str) {
  return Uint8Array.from(atob(str), c => c.charCodeAt(0));
}

async function deriveKey(password, salt) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, hash: 'SHA-256', iterations: 600000 },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function encryptJSON(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv   = crypto.getRandomValues(new Uint8Array(12));
  const key  = await deriveKey(password, salt);
  const plain = new TextEncoder().encode(JSON.stringify(DB));
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plain);
  return JSON.stringify({ v: 1, salt: b64encode(salt), iv: b64encode(iv), data: b64encode(cipher) });
}

async function decryptJSON(password, payload) {
  const { v, salt, iv, data } = JSON.parse(payload);
  if (v !== 1) throw new Error('未対応のバージョンです');
  const key    = await deriveKey(password, b64decode(salt));
  const plain  = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: b64decode(iv) },
    key,
    b64decode(data)
  );
  return JSON.parse(new TextDecoder().decode(plain));
}

// --- 暗号化バックアップ モーダル ---
function openEncryptModal() {
  showModal(`<div class="modal">
    <div class="modal-header">
      <div class="modal-title">🔐 暗号化バックアップ</div>
      <button class="btn-icon" onclick="closeModal()">✕</button>
    </div>
    <div class="modal-body">
      <div class="info-box" style="margin-bottom:14px">
        AES-256-GCM で暗号化して保存します。<br>
        <strong>パスワードを忘れると復元できません。</strong><br>
        <span style="margin-top:4px;display:block">💡 1Password 等のパスワードマネージャーで生成したパスワードの貼り付けを推奨します。</span>
      </div>
      <div class="form-grid">
        <div class="form-group">
          <label class="form-label req">パスワード</label>
          <div style="display:flex;gap:6px;align-items:center">
            <input class="form-input" id="enc-pw" type="password" placeholder="パスワードを入力または貼り付け"
              autocomplete="new-password" maxlength="64" style="flex:1">
            <button type="button" class="btn btn-sm" id="enc-pw-toggle"
              onclick="togglePwVisibility('enc-pw','enc-pw-toggle')"
              style="flex-shrink:0;min-width:36px;padding:6px 8px;font-size:15px;line-height:1" title="表示する">🙈</button>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label req">パスワード（確認）</label>
          <div style="display:flex;gap:6px;align-items:center">
            <input class="form-input" id="enc-pw2" type="password" placeholder="もう一度入力または貼り付け"
              autocomplete="new-password" maxlength="64" style="flex:1">
            <button type="button" class="btn btn-sm" id="enc-pw2-toggle"
              onclick="togglePwVisibility('enc-pw2','enc-pw2-toggle')"
              style="flex-shrink:0;min-width:36px;padding:6px 8px;font-size:15px;line-height:1" title="表示する">🙈</button>
          </div>
        </div>
        <div id="enc-err" style="font-size:12px;color:var(--red);display:none"></div>
      </div>
      <div style="margin-top:14px;padding:10px 12px;background:var(--surface3);border-radius:var(--radius);font-size:12px;color:var(--text2)">
        <div style="margin-bottom:4px;font-weight:500">保存されるファイル</div>
        <div style="color:var(--text3)">rental_backup_${new Date().toISOString().slice(0,10)}_enc.json</div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">キャンセル</button>
      <button class="btn btn-primary" id="enc-btn" onclick="doEncryptExport()">🔐 暗号化して保存</button>
    </div>
  </div>`);
}

async function doEncryptExport() {
  const pw  = document.getElementById('enc-pw').value;
  const pw2 = document.getElementById('enc-pw2').value;
  const err = document.getElementById('enc-err');
  const btn = document.getElementById('enc-btn');

  err.style.display = 'none';
  const ASCII_RE = /^[\x21-\x7E]+$/;
  if (pw.length < 8) {
    err.textContent = 'パスワードは8文字以上で入力してください'; err.style.display = ''; return;
  }
  if (!ASCII_RE.test(pw)) {
    err.textContent = 'パスワードは英数字・記号（ASCII）のみ使用できます。日本語は使用できません'; err.style.display = ''; return;
  }
  if (pw !== pw2) {
    err.textContent = 'パスワードが一致しません'; err.style.display = ''; return;
  }

  btn.disabled = true;
  btn.textContent = '⏳ 暗号化中...';
  try {
    const payload = await encryptJSON(pw);
    const blob = new Blob([payload], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'rental_backup_' + new Date().toISOString().slice(0,10) + '_enc.json';
    a.click();
    closeModal();
    toast('暗号化バックアップを保存しました', 'success');
  } catch(e) {
    btn.disabled = false;
    btn.textContent = '🔐 暗号化して保存';
    err.textContent = '暗号化に失敗しました: ' + e.message;
    err.style.display = '';
  }
}

// --- 復号モーダル ---
let _decryptFileContent = null;

function openDecryptModal(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(ev) {
    _decryptFileContent = ev.target.result;
    // 平文JSONか暗号化ファイルか判定
    try {
      const parsed = JSON.parse(_decryptFileContent);
      if (parsed.v === 1 && parsed.salt && parsed.iv && parsed.data) {
        // 暗号化ファイル → パスワード入力モーダル
        showModal(`<div class="modal">
          <div class="modal-header">
            <div class="modal-title">🔓 暗号化ファイルから復元</div>
            <button class="btn-icon" onclick="closeModal()">✕</button>
          </div>
          <div class="modal-body">
            <div style="font-size:13px;color:var(--text2);margin-bottom:14px">
              ファイル: <strong>${file.name}</strong>
            </div>
            <div class="form-group">
              <label class="form-label req">パスワード</label>
              <div style="display:flex;gap:6px;align-items:center">
                <input class="form-input" id="dec-pw" type="password" placeholder="バックアップ時のパスワードを入力または貼り付け"
                  autocomplete="current-password" maxlength="64" style="flex:1"
                  onkeydown="if(event.key==='Enter')doDecryptImport()">
                <button type="button" class="btn btn-sm" id="dec-pw-toggle"
                  onclick="togglePwVisibility('dec-pw','dec-pw-toggle')"
                  style="flex-shrink:0;min-width:36px;padding:6px 8px;font-size:15px;line-height:1" title="表示する">🙈</button>
              </div>
            </div>
            <div id="dec-err" style="font-size:12px;color:var(--red);margin-top:8px;display:none"></div>
            <div class="info-box" style="margin-top:14px">
              ⚠ 復元すると現在のデータは上書きされます。事前に平文バックアップを取ることを推奨します。<br>
              <span style="margin-top:4px;display:block">💡 1Password 等のパスワードマネージャーからの貼り付けが使えます。</span>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn" onclick="closeModal()">キャンセル</button>
            <button class="btn btn-primary" id="dec-btn" onclick="doDecryptImport()">🔓 復号して復元</button>
          </div>
        </div>`);
        setTimeout(() => document.getElementById('dec-pw')?.focus(), 50);
      } else if (parsed.properties) {
        // 平文JSONが誤って enc-json-input に渡された場合はそのまま復元
        DB = parsed; saveData(); toast('データを復元しました', 'success'); render();
      } else {
        toast('対応していないファイル形式です', 'error');
      }
    } catch(err) {
      toast('ファイルの読み込みに失敗しました', 'error');
    }
  };
  reader.readAsText(file);
  // input をリセット（同じファイルを再選択できるよう）
  e.target.value = '';
}

async function doDecryptImport() {
  const pw  = document.getElementById('dec-pw').value;
  const err = document.getElementById('dec-err');
  const btn = document.getElementById('dec-btn');

  err.style.display = 'none';
  const ASCII_RE2 = /^[\x21-\x7E]+$/;
  if (!pw) { err.textContent = 'パスワードを入力してください'; err.style.display = ''; return; }
  if (!ASCII_RE2.test(pw)) {
    err.textContent = 'パスワードは英数字・記号（ASCII）のみ使用できます'; err.style.display = ''; return;
  }

  btn.disabled = true;
  btn.textContent = '⏳ 復号中...';
  try {
    const data = await decryptJSON(pw, _decryptFileContent);
    if (!data.properties) throw new Error('データ構造が無効です');
    DB = data;
    saveData();
    closeModal();
    toast('暗号化バックアップから復元しました', 'success');
    render();
  } catch(e) {
    btn.disabled = false;
    btn.textContent = '🔓 復号して復元';
    // AES-GCM の認証失敗は OperationError として来る
    const msg = e.name === 'OperationError'
      ? 'パスワードが違うか、ファイルが破損しています'
      : e.message || '復号に失敗しました';
    err.textContent = '❌ ' + msg;
    err.style.display = '';
  }
}


// ==================== BACKUP PAGE ====================
function renderBackup() {
  return `<div class="content">
    <div class="grid2">
      <div class="card">
        <div class="sec-hdr"><h3>📤 バックアップを作成</h3></div>
        <div class="info-box" style="margin-bottom:14px">
          定期バックアップの推奨：<strong>毎月1日</strong>に平文＋暗号化の両形式で保存してください。<br>
          保存場所：PC内フォルダ ＋ USBまたはクラウドの2箇所を推奨します。
        </div>
        <div style="display:flex;flex-direction:column;gap:10px">
          <div>
            <div style="font-size:12px;font-weight:500;color:var(--text2);margin-bottom:6px">平文バックアップ</div>
            <button class="btn" style="width:100%" onclick="exportJSON()">📄 JSONでバックアップ（平文）</button>
            <div style="font-size:11px;color:var(--text3);margin-top:4px">暗号化なし。手軽に保存・確認できます。</div>
          </div>
          <div style="height:1px;background:var(--border)"></div>
          <div>
            <div style="font-size:12px;font-weight:500;color:var(--text2);margin-bottom:6px">暗号化バックアップ（推奨）</div>
            <button class="btn btn-primary" style="width:100%" onclick="openEncryptModal()">🔐 暗号化バックアップ（AES-256-GCM）</button>
            <div style="font-size:11px;color:var(--text3);margin-top:4px">
              パスワードで保護。USBやクラウドへの保存に適しています。<br>
              1Password 等で生成したパスワードの使用を推奨します。
            </div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="sec-hdr"><h3>📥 バックアップから復元</h3></div>
        <div class="info-box" style="background:var(--amber-bg);border-color:var(--amber);color:var(--amber-text);margin-bottom:14px">
          ⚠ 復元すると現在のデータはすべて上書きされます。<br>復元前に現在のデータをバックアップしてください。
        </div>
        <div style="display:flex;flex-direction:column;gap:10px">
          <div>
            <div style="font-size:12px;font-weight:500;color:var(--text2);margin-bottom:6px">平文ファイルから復元</div>
            <button class="btn" style="width:100%" onclick="document.getElementById('json-input').click()">📂 JSONから復元（平文）</button>
          </div>
          <div style="height:1px;background:var(--border)"></div>
          <div>
            <div style="font-size:12px;font-weight:500;color:var(--text2);margin-bottom:6px">暗号化ファイルから復元</div>
            <button class="btn" style="width:100%" onclick="document.getElementById('enc-json-input').click()">🔓 暗号化ファイルから復元</button>
          </div>
        </div>
        <input type="file" id="json-input" style="display:none" accept=".json" onchange="handleJSONImport(event)">
        <input type="file" id="enc-json-input" style="display:none" accept=".enc.json,.json" onchange="openDecryptModal(event)">
      </div>
    </div>

    <div class="card" style="margin-top:16px;border-color:var(--border2)">
      <div class="sec-hdr"><h3 style="color:var(--red)">⚠ データリセット</h3></div>
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px">
        <div style="font-size:13px;color:var(--text2)">
          全データを削除してサンプルデータに戻します。<br>
          <span style="color:var(--red);font-size:12px">この操作は元に戻せません。実行前に必ずバックアップを取ってください。</span>
        </div>
        <button class="btn btn-danger" onclick="confirmReset()">🗑 データをリセット</button>
      </div>
    </div>

    <div class="card" style="margin-top:16px">
      <div class="sec-hdr"><h3>📋 運用ルール（推奨）</h3></div>
      <table style="width:100%;font-size:13px;border-collapse:collapse">
        <thead><tr>
          <th style="text-align:left;padding:7px 12px;background:var(--surface3);border-bottom:1px solid var(--border)">項目</th>
          <th style="text-align:left;padding:7px 12px;background:var(--surface3);border-bottom:1px solid var(--border)">ルール</th>
          <th style="text-align:left;padding:7px 12px;background:var(--surface3);border-bottom:1px solid var(--border)">備考</th>
        </tr></thead>
        <tbody>
          <tr><td style="padding:7px 12px;border-bottom:1px solid var(--border)">バックアップ頻度</td><td style="padding:7px 12px;border-bottom:1px solid var(--border)">毎月1日（月初）</td><td style="padding:7px 12px;border-bottom:1px solid var(--border);color:var(--text3)">平文 + 暗号化の両形式</td></tr>
          <tr><td style="padding:7px 12px;border-bottom:1px solid var(--border)">保管場所</td><td style="padding:7px 12px;border-bottom:1px solid var(--border)">PC内 + USB またはクラウド</td><td style="padding:7px 12px;border-bottom:1px solid var(--border);color:var(--text3)">2箇所に必ず保存</td></tr>
          <tr><td style="padding:7px 12px;border-bottom:1px solid var(--border)">復旧手順</td><td style="padding:7px 12px;border-bottom:1px solid var(--border)">JSONファイルから「復元」ボタンで復旧</td><td style="padding:7px 12px;border-bottom:1px solid var(--border);color:var(--text3)">所要時間：約5分</td></tr>
          <tr><td style="padding:7px 12px">SQLite移行判断</td><td style="padding:7px 12px">部屋数100室超またはブラウザ動作が重くなった時点</td><td style="padding:7px 12px;color:var(--text3)">要件定義書を改訂して移行</td></tr>
        </tbody>
      </table>
    </div>
  </div>`;
}
