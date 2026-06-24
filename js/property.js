// property.js — 物件・部屋CRUD（追加・編集・削除モーダル）
// ==================== MODALS ====================
function openAddPropModal() {
  showModal(`<div class="modal">
    <div class="modal-header"><div class="modal-title">物件を追加</div><button class="btn-icon" onclick="closeModal()">✕</button></div>
    <div class="modal-body">
      <div class="form-grid">
        <div class="form-row">
          <div class="form-group"><label class="form-label req">物件名</label><input class="form-input" id="m-pname" placeholder="グリーンハイツ"></div>
          <div class="form-group"><label class="form-label req">種別</label><select class="form-select" id="m-ptype"><option>マンション</option><option>アパート</option><option>一戸建て</option><option>駐車場</option><option>土地</option><option>その他</option></select></div>
        </div>
        <div class="form-group"><label class="form-label req">住所</label><input class="form-input" id="m-paddr" placeholder="東京都世田谷区..."></div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">築年</label><input class="form-input" id="m-pbuilt" type="number" placeholder="2005"></div>
          <div class="form-group"><label class="form-label">階数</label><input class="form-input" id="m-pfloors" type="number" placeholder="3"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">駐車場台数</label><input class="form-input" id="m-pparking" type="number" placeholder="0"></div>
        </div>
        <div class="form-group"><label class="form-label">備考</label><textarea class="form-textarea" id="m-pnote" placeholder="メモ..."></textarea></div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">キャンセル</button>
      <button class="btn btn-primary" onclick="saveProp()">追加</button>
    </div>
  </div>`);
}

function openEditPropModal(pid) {
  const p = getProp(pid);
  if (!p) return;
  showModal(`<div class="modal">
    <div class="modal-header"><div class="modal-title">${p.name} を編集</div><button class="btn-icon" onclick="closeModal()">✕</button></div>
    <div class="modal-body">
      <div class="form-grid">
        <div class="form-row">
          <div class="form-group"><label class="form-label req">物件名</label><input class="form-input" id="m-pname" value="${p.name}"></div>
          <div class="form-group"><label class="form-label">種別</label><select class="form-select" id="m-ptype">
            ${['マンション','アパート','一戸建て','駐車場','土地','その他'].map(t=>`<option${t===p.type?' selected':''}>${t}</option>`).join('')}
          </select></div>
        </div>
        <div class="form-group"><label class="form-label">住所</label><input class="form-input" id="m-paddr" value="${p.addr}"></div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">築年</label><input class="form-input" id="m-pbuilt" type="number" value="${p.built}"></div>
          <div class="form-group"><label class="form-label">階数</label><input class="form-input" id="m-pfloors" type="number" value="${p.floors}"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">駐車場台数</label><input class="form-input" id="m-pparking" type="number" value="${p.parking}"></div>
        </div>
        <div class="form-group"><label class="form-label">備考</label><textarea class="form-textarea" id="m-pnote">${p.note||''}</textarea></div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">キャンセル</button>
      <button class="btn btn-primary" onclick="saveProp('${pid}')">保存</button>
    </div>
  </div>`);
}

function saveProp(pid) {
  const name = document.getElementById('m-pname').value.trim();
  if (!name) { document.getElementById('m-pname').classList.add('error'); return; }
  if (pid) {
    const p = getProp(pid);
    p.name = name;
    p.type = document.getElementById('m-ptype').value;
    p.addr = document.getElementById('m-paddr').value.trim();
    p.built = parseInt(document.getElementById('m-pbuilt').value) || p.built;
    p.floors = parseInt(document.getElementById('m-pfloors').value) || p.floors;
    p.parking = parseInt(document.getElementById('m-pparking').value) || 0;
    p.note = document.getElementById('m-pnote').value.trim();
    toast('物件情報を更新しました', 'success');
  } else {
    const id = nextId('p');
    DB.properties.push({
      id, name,
      type: document.getElementById('m-ptype').value,
      addr: document.getElementById('m-paddr').value.trim(),
      built: parseInt(document.getElementById('m-pbuilt').value) || 2000,
      floors: parseInt(document.getElementById('m-pfloors').value) || 1,
      parking: parseInt(document.getElementById('m-pparking').value) || 0,
      note: document.getElementById('m-pnote').value.trim(),
      units: [],
    });
    S.treeOpen[id] = true;
    S.selPropId = id;
    S.selUnitId = null;
    S.page = 'prop';
    S.tab = 'overview';
    toast('物件を追加しました', 'success');
  }
  saveData();
  closeModal();
  render();
}

function deleteProp(pid) {
  if (!confirm('この物件と全部屋データを削除しますか？')) return;
  DB.properties = DB.properties.filter(p => p.id !== pid);
  DB.maintenance = DB.maintenance.filter(m => m.prop_id !== pid);
  S.page = 'dashboard';
  S.selPropId = null;
  saveData();
  toast('物件を削除しました');
  render();
}

