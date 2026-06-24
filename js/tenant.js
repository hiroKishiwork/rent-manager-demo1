// tenant.js — 入居者CRUD（詳細表示・編集モーダル・退去処理）
function openAddUnitModal(pid, uid) {
  const p = getProp(pid);
  const u = uid ? getUnit(pid, uid) : null;
  showModal(`<div class="modal">
    <div class="modal-header"><div class="modal-title">${u ? u.name+' を編集' : p.name+' に部屋を追加'}</div><button class="btn-icon" onclick="closeModal()">✕</button></div>
    <div class="modal-body">
      <div class="form-grid">
        <div class="form-row">
          <div class="form-group"><label class="form-label req">部屋名</label><input class="form-input" id="m-uname" value="${u?u.name:''}" placeholder="101号室"></div>
          <div class="form-group"><label class="form-label">間取り</label><select class="form-select" id="m-ulayout">
            ${['1R','1K','1DK','1LDK','2K','2DK','2LDK','3LDK','4LDK','その他'].map(l=>`<option${u&&u.layout===l?' selected':''}>${l}</option>`).join('')}
          </select></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">階数</label><input class="form-input" id="m-ufloor" type="number" value="${u?u.floor:1}" min="1"></div>
          <div class="form-group"><label class="form-label">面積(㎡)</label><input class="form-input" id="m-usqm" type="number" value="${u?u.sqm:''}" step="0.1" placeholder="25.5"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label req">賃料(円)</label><input class="form-input" id="m-urent" type="number" value="${u?u.rent:''}" placeholder="70000"></div>
          <div class="form-group"><label class="form-label">ステータス</label><select class="form-select" id="m-ustatus">
            ${['occupied','vacant','maintenance'].map(st=>`<option value="${st}"${u&&u.status===st?' selected':''}>${STATUS_LABEL[st]}</option>`).join('')}
          </select></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">敷金(円)</label><input class="form-input" id="m-udeposit" type="number" value="${u?u.deposit:''}"></div>
          <div class="form-group"><label class="form-label">礼金(円)</label><input class="form-input" id="m-ukeymoney" type="number" value="${u?u.key_money:''}"></div>
        </div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">キャンセル</button>
      <button class="btn btn-primary" onclick="saveUnit('${pid}','${uid||''}')">保存</button>
    </div>
  </div>`);
}

function openEditUnitModal(pid, uid) { openAddUnitModal(pid, uid); }

function saveUnit(pid, uid) {
  const name = document.getElementById('m-uname').value.trim();
  const rent = parseInt(document.getElementById('m-urent').value);
  if (!name || !rent) return;
  const p = getProp(pid);
  if (uid) {
    const u = getUnit(pid, uid);
    u.name = name;
    u.layout = document.getElementById('m-ulayout').value;
    u.floor = parseInt(document.getElementById('m-ufloor').value) || 1;
    u.sqm = parseFloat(document.getElementById('m-usqm').value) || 0;
    u.rent = rent;
    u.status = document.getElementById('m-ustatus').value;
    u.deposit = parseInt(document.getElementById('m-udeposit').value) || 0;
    u.key_money = parseInt(document.getElementById('m-ukeymoney').value) || 0;
    toast('部屋情報を更新しました', 'success');
  } else {
    const id = nextId('u');
    p.units.push({
      id, name,
      layout: document.getElementById('m-ulayout').value,
      floor: parseInt(document.getElementById('m-ufloor').value) || 1,
      sqm: parseFloat(document.getElementById('m-usqm').value) || 0,
      rent,
      status: document.getElementById('m-ustatus').value,
      deposit: parseInt(document.getElementById('m-udeposit').value) || 0,
      key_money: parseInt(document.getElementById('m-ukeymoney').value) || 0,
      tenant: null,
    });
    S.selUnitId = id;
    S.page = 'prop';
    toast('部屋を追加しました', 'success');
  }
  saveData();
  closeModal();
  render();
}

function deleteUnit(pid, uid) {
  if (!confirm('この部屋を削除しますか？')) return;
  const p = getProp(pid);
  p.units = p.units.filter(u => u.id !== uid);
  DB.maintenance = DB.maintenance.filter(m => m.unit_id !== uid);
  S.selUnitId = null;
  S.page = 'prop';
  saveData();
  toast('部屋を削除しました');
  render();
}

function openSetTenantModal(pid, uid) {
  const u = getUnit(pid, uid);
  const t = u.tenant || {};
  const g = t.guarantor || {name:'', relation:'', tel:'', addr:''};
  const cr = t.coResidents || [];
  const ec = t.emergencyContacts || [];

  // 同居人行のHTML生成（既存データ）
  function crRow(c, i) {
    return `<div class="co-row" data-idx="${i}" style="display:flex;gap:6px;align-items:center;margin-bottom:6px">
      <input class="form-input co-name" style="flex:2" placeholder="氏名" value="${c.name||''}">
      <input class="form-input co-rel"  style="flex:1" placeholder="続柄" value="${c.relation||''}">
      <input class="form-input co-age"  style="width:64px" type="number" placeholder="年齢" value="${c.age||''}">
      <button class="btn-icon btn-danger" onclick="removeCo(this)" title="削除">🗑</button>
    </div>`;
  }

  // 緊急連絡先行のHTML生成（既存データ・氏名/電話/メールの3項目）
  function emRow(c, i) {
    return `<div class="em-row" data-idx="${i}" style="display:flex;gap:6px;align-items:center;margin-bottom:6px">
      <input class="form-input em-name" style="flex:1.2" placeholder="氏名" value="${c.name||''}">
      <input class="form-input em-tel"  style="flex:1" placeholder="電話番号" value="${c.tel||''}">
      <input class="form-input em-email" style="flex:1" type="email" placeholder="メール" value="${c.email||''}">
      <button class="btn-icon btn-danger" onclick="removeEmergencyContact(this)" title="削除">🗑</button>
    </div>`;
  }

  showModal(`<div class="modal" style="width:580px">
    <div class="modal-header"><div class="modal-title">入居者情報</div><button class="btn-icon" onclick="closeModal()">✕</button></div>

    <div style="display:flex;gap:2px;border-bottom:1px solid var(--border);padding:0 20px">
      <div class="tab tenant-edit-subtab active" data-subtab="basic" onclick="switchTenantTab(this,'basic')" style="padding:8px 12px">基本情報</div>
      <div class="tab tenant-edit-subtab" data-subtab="guarantor" onclick="switchTenantTab(this,'guarantor')" style="padding:8px 12px">🤝 保証人</div>
    </div>

    <div class="modal-body">

      <div data-subtabpanel="basic">
        <div class="sec-title" style="margin-bottom:10px">👤 入居者本人</div>
        <div class="form-grid">
          <div class="form-row">
            <div class="form-group"><label class="form-label req">氏名</label><input class="form-input" id="m-tname" value="${t.name||''}" placeholder="田中 健太"></div>
            <div class="form-group"><label class="form-label">ふりがな</label><input class="form-input" id="m-tkana" value="${t.kana||''}" placeholder="タナカ ケンタ"></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label class="form-label">電話番号</label><input class="form-input" id="m-ttel" value="${t.tel||''}" placeholder="090-0000-0000"></div>
            <div class="form-group"><label class="form-label">メール</label><input class="form-input" id="m-temail" type="email" value="${t.email||''}" placeholder="example@mail.com"></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label class="form-label req">入居開始日</label><input class="form-input" id="m-tsince" type="date" value="${t.since||''}"></div>
            <div class="form-group"><label class="form-label">契約終了日</label><input class="form-input" id="m-tend" type="date" value="${t.contract_end||''}"></div>
          </div>
        </div>

        <hr style="border:none;border-top:1px solid var(--border);margin:16px 0">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
          <div class="sec-title" style="margin:0">📞 緊急連絡先</div>
          <button class="btn btn-sm" onclick="addEmergencyRow()">＋ 追加</button>
        </div>
        <div id="em-list">
          ${ec.length === 0 ? '' : ec.map((c,i) => emRow(c,i)).join('')}
        </div>
        <div id="em-empty" style="font-size:12px;color:var(--text3);${ec.length > 0 ? 'display:none' : ''}">緊急連絡先なし（＋追加で登録できます）</div>

        <hr style="border:none;border-top:1px solid var(--border);margin:16px 0">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
          <div class="sec-title" style="margin:0">👨‍👩‍👧 同居人</div>
          <button class="btn btn-sm" onclick="addCoRow()">＋ 追加</button>
        </div>
        <div id="co-list">
          ${cr.length === 0 ? '' : cr.map((c,i) => crRow(c,i)).join('')}
        </div>
        <div id="co-empty" style="font-size:12px;color:var(--text3);${cr.length > 0 ? 'display:none' : ''}">同居人なし（＋追加で登録できます）</div>
      </div>

      <div data-subtabpanel="guarantor" style="display:none">
        <div class="sec-title" style="margin-bottom:10px">🤝 連帯保証人</div>
        <div class="form-grid">
          <div class="form-row">
            <div class="form-group"><label class="form-label">氏名</label><input class="form-input" id="m-gname" value="${g.name||''}" placeholder="田中 一郎"></div>
            <div class="form-group"><label class="form-label">続柄</label><input class="form-input" id="m-grelation" value="${g.relation||''}" placeholder="父・兄・友人 など"></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label class="form-label">電話番号</label><input class="form-input" id="m-gtel" value="${g.tel||''}" placeholder="090-0000-0000"></div>
            <div class="form-group"><label class="form-label">住所</label><input class="form-input" id="m-gaddr" value="${g.addr||''}" placeholder="東京都〇〇区…"></div>
          </div>
        </div>
      </div>

    </div>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">キャンセル</button>
      <button class="btn btn-primary" onclick="saveTenant('${pid}','${uid}')">保存</button>
    </div>
  </div>`);
}

function addEmergencyRow() {
  const list = document.getElementById('em-list');
  const empty = document.getElementById('em-empty');
  const idx = list.children.length;
  const div = document.createElement('div');
  div.className = 'em-row';
  div.dataset.idx = idx;
  div.style.cssText = 'display:flex;gap:6px;align-items:center;margin-bottom:6px';
  div.innerHTML = `<input class="form-input em-name" style="flex:1.2" placeholder="氏名" value="">
    <input class="form-input em-tel" style="flex:1" placeholder="電話番号" value="">
    <input class="form-input em-email" style="flex:1" type="email" placeholder="メール" value="">
    <button class="btn-icon btn-danger" onclick="removeEmergencyContact(this)" title="削除">🗑</button>`;
  list.appendChild(div);
  if (empty) empty.style.display = 'none';
}

function removeEmergencyContact(btn) {
  const row = btn.closest('.em-row');
  row.remove();
  const list = document.getElementById('em-list');
  const empty = document.getElementById('em-empty');
  if (empty) empty.style.display = list.children.length === 0 ? '' : 'none';
}

function addCoRow() {
  const list = document.getElementById('co-list');
  const empty = document.getElementById('co-empty');
  const idx = list.children.length;
  const div = document.createElement('div');
  div.className = 'co-row';
  div.dataset.idx = idx;
  div.style.cssText = 'display:flex;gap:6px;align-items:center;margin-bottom:6px';
  div.innerHTML = `<input class="form-input co-name" style="flex:2" placeholder="氏名" value="">
    <input class="form-input co-rel" style="flex:1" placeholder="続柄" value="">
    <input class="form-input co-age" style="width:64px" type="number" placeholder="年齢" value="">
    <button class="btn-icon btn-danger" onclick="removeCo(this)" title="削除">🗑</button>`;
  list.appendChild(div);
  if (empty) empty.style.display = 'none';
}

function removeCo(btn) {
  const row = btn.closest('.co-row');
  row.remove();
  const list = document.getElementById('co-list');
  const empty = document.getElementById('co-empty');
  if (empty) empty.style.display = list.children.length === 0 ? '' : 'none';
}

function saveTenant(pid, uid) {
  const name = document.getElementById('m-tname').value.trim();
  if (!name) { document.getElementById('m-tname').classList.add('error'); return; }
  const u = getUnit(pid, uid);

  // 同居人リストを収集
  const coRows = document.querySelectorAll('#co-list .co-row');
  const coResidents = Array.from(coRows).map(row => ({
    name:     row.querySelector('.co-name').value.trim(),
    relation: row.querySelector('.co-rel').value.trim(),
    age:      parseInt(row.querySelector('.co-age').value) || null,
  })).filter(c => c.name);  // 氏名が空の行は除外

  // 緊急連絡先リストを収集（UI非表示のrelation/addr/noteは空文字で保持）
  const emRows = document.querySelectorAll('#em-list .em-row');
  const emergencyContacts = Array.from(emRows).map(row => ({
    name:     row.querySelector('.em-name').value.trim(),
    tel:      row.querySelector('.em-tel').value.trim(),
    email:    row.querySelector('.em-email').value.trim(),
    relation: '', addr: '', note: '',
  })).filter(c => c.name);  // 氏名が空の行は除外

  u.tenant = {
    name,
    kana:         document.getElementById('m-tkana').value.trim(),
    tel:          document.getElementById('m-ttel').value.trim(),
    email:        document.getElementById('m-temail').value.trim(),
    since:        document.getElementById('m-tsince').value,
    contract_end: document.getElementById('m-tend').value,
    isMovedOut:   false,  // v1.5.0: 論理削除フラグ（新規入居時は false）
    emergencyContacts,
    guarantor: {
      name:     document.getElementById('m-gname').value.trim(),
      relation: document.getElementById('m-grelation').value.trim(),
      tel:      document.getElementById('m-gtel').value.trim(),
      addr:     document.getElementById('m-gaddr').value.trim(),
    },
    coResidents,
  };
  u.status = 'occupied';
  saveData();
  closeModal();
  toast('入居者情報を保存しました', 'success');
  render();
}

function confirmMoveOut(pid, uid) {
  if (!confirm('退去処理を行いますか？')) return;
  const u = getUnit(pid, uid);
  if (u.tenant) {
    u.tenant.isMovedOut = true;  // v1.5.0: 論理削除フラグを設定（物理削除しない）
  }
  u.status = 'vacant';  // ステータスを空室に変更
  saveData();
  toast('退去処理を完了しました');
  render();
}
