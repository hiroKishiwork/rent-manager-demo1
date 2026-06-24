// maintenance.js — メンテナンス記録CRUD
function openAddMaintModal(pid, uid) {
  const propOpts = DB.properties.map(p => `<option value="${p.id}"${pid===p.id?' selected':''}>${p.name}</option>`).join('');
  const unitOpts = pid ? getProp(pid).units.map(u => `<option value="${u.id}"${uid===u.id?' selected':''}>${u.name}</option>`).join('') : '';
  showModal(`<div class="modal">
    <div class="modal-header"><div class="modal-title">メンテナンス記録を追加</div><button class="btn-icon" onclick="closeModal()">✕</button></div>
    <div class="modal-body">
      <div class="form-grid">
        <div class="form-row">
          <div class="form-group"><label class="form-label req">物件</label><select class="form-select" id="m-mprop" onchange="updateMaintUnitOpts(this.value)">${propOpts}</select></div>
          <div class="form-group"><label class="form-label">部屋</label><select class="form-select" id="m-munit">${unitOpts}</select></div>
        </div>
        <div class="form-group"><label class="form-label req">内容</label><input class="form-input" id="m-mtitle" placeholder="エアコン修理"></div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">カテゴリ</label><select class="form-select" id="m-mcat">
            ${['設備修理','設備点検','水回り','内装','外装','電気','清掃','その他','駐車場収入','更新料','違約金','その他収入'].map(c=>`<option>${c}</option>`).join('')}
          </select></div>
          <div class="form-group"><label class="form-label">優先度</label><select class="form-select" id="m-mprio">
            <option value="high">高</option><option value="medium" selected>中</option><option value="low">低</option>
          </select></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label req">日付</label><input class="form-input" id="m-mdate" type="date" value="${new Date().toISOString().slice(0,10)}"></div>
          <div class="form-group"><label class="form-label req">費用(円)</label><input class="form-input" id="m-mcost" type="number" placeholder="0"></div>
        </div>
        <div class="form-group"><label class="form-label">業者名</label><input class="form-input" id="m-mvendor" placeholder="修理業者名"></div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">状態</label><select class="form-select" id="m-mstatus">
            <option value="pending">未対応</option><option value="done">完了</option>
          </select></div>
        </div>
        <div class="form-group"><label class="form-label">備考</label><textarea class="form-textarea" id="m-mnote"></textarea></div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">キャンセル</button>
      <button class="btn btn-primary" onclick="saveMaint()">保存</button>
    </div>
  </div>`);
}

function openEditMaintModal(mid) {
  const m = DB.maintenance.find(x => x.id === mid);
  if (!m) return;
  const propOpts = DB.properties.map(p => `<option value="${p.id}"${m.prop_id===p.id?' selected':''}>${p.name}</option>`).join('');
  const p = getProp(m.prop_id);
  const unitOpts = p ? p.units.map(u => `<option value="${u.id}"${m.unit_id===u.id?' selected':''}>${u.name}</option>`).join('') : '';
  const cats = ['設備修理','設備点検','水回り','内装','外装','電気','清掃','その他','駐車場収入','更新料','違約金','その他収入'];
  showModal(`<div class="modal">
    <div class="modal-header"><div class="modal-title">メンテナンス記録を編集</div><button class="btn-icon" onclick="closeModal()">✕</button></div>
    <div class="modal-body">
      <div class="form-grid">
        <div class="form-row">
          <div class="form-group"><label class="form-label">物件</label><select class="form-select" id="m-mprop" onchange="updateMaintUnitOpts(this.value)">${propOpts}</select></div>
          <div class="form-group"><label class="form-label">部屋</label><select class="form-select" id="m-munit">${unitOpts}</select></div>
        </div>
        <div class="form-group"><label class="form-label req">内容</label><input class="form-input" id="m-mtitle" value="${m.title}"></div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">カテゴリ</label><select class="form-select" id="m-mcat">${cats.map(c=>`<option${c===m.category?' selected':''}>${c}</option>`).join('')}</select></div>
          <div class="form-group"><label class="form-label">優先度</label><select class="form-select" id="m-mprio">
            <option value="high"${m.priority==='high'?' selected':''}>高</option>
            <option value="medium"${m.priority==='medium'?' selected':''}>中</option>
            <option value="low"${m.priority==='low'?' selected':''}>低</option>
          </select></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">日付</label><input class="form-input" id="m-mdate" type="date" value="${m.date}"></div>
          <div class="form-group"><label class="form-label">費用(円)</label><input class="form-input" id="m-mcost" type="number" value="${m.cost}"></div>
        </div>
        <div class="form-group"><label class="form-label">業者名</label><input class="form-input" id="m-mvendor" value="${m.vendor}"></div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">状態</label><select class="form-select" id="m-mstatus">
            <option value="pending"${m.status==='pending'?' selected':''}>未対応</option>
            <option value="done"${m.status==='done'?' selected':''}>完了</option>
          </select></div>
        </div>
        <div class="form-group"><label class="form-label">備考</label><textarea class="form-textarea" id="m-mnote">${m.note||''}</textarea></div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">キャンセル</button>
      <button class="btn btn-primary" onclick="saveMaint('${mid}')">保存</button>
    </div>
  </div>`);
}

function updateMaintUnitOpts(pid) {
  const p = getProp(pid);
  const sel = document.getElementById('m-munit');
  if (!sel || !p) return;
  sel.innerHTML = p.units.map(u => `<option value="${u.id}">${u.name}</option>`).join('');
}

function saveMaint(mid) {
  const prop_id = document.getElementById('m-mprop').value;
  const unit_id = document.getElementById('m-munit').value;
  const title = document.getElementById('m-mtitle').value.trim();
  const cost = parseInt(document.getElementById('m-mcost').value) || 0;
  if (!title) return;
  if (mid) {
    const m = DB.maintenance.find(x => x.id === mid);
    m.prop_id = prop_id; m.unit_id = unit_id; m.title = title;
    m.category = document.getElementById('m-mcat').value;
    m.priority = document.getElementById('m-mprio').value;
    m.date = document.getElementById('m-mdate').value;
    m.cost = cost;
    m.vendor = document.getElementById('m-mvendor').value.trim();
    m.status = document.getElementById('m-mstatus').value;
    m.note = document.getElementById('m-mnote').value.trim();
    toast('記録を更新しました', 'success');
  } else {
    DB.maintenance.push({
      id: nextId('m'), prop_id, unit_id, title,
      category: document.getElementById('m-mcat').value,
      priority: document.getElementById('m-mprio').value,
      date: document.getElementById('m-mdate').value,
      cost,
      vendor: document.getElementById('m-mvendor').value.trim(),
      status: document.getElementById('m-mstatus').value,
      note: document.getElementById('m-mnote').value.trim(),
    });
    toast('記録を追加しました', 'success');
  }
  saveData();
  closeModal();
  render();
}

function deleteMaint(mid) {
  if (!confirm('この記録を削除しますか？')) return;
  DB.maintenance = DB.maintenance.filter(m => m.id !== mid);
  saveData();
  toast('削除しました');
  render();
}

function toggleMaintStatus(mid) {
  const m = DB.maintenance.find(x => x.id === mid);
  m.status = m.status === 'done' ? 'pending' : 'done';
  saveData();
  toast(`${m.status === 'done' ? '完了' : '未対応'}に変更しました`);
  render();
}
