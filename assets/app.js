// Client app implementing list/detail, filters, product offers, outreach selection, CSV export, pagination
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Config
const PAGE_SIZE = 10;
const SANDALS = [
  "Cortona Sandal",
  "Samara Sandal",
  "Siena Sandal",
  "Acadia Sandal",
  "Monterra Sandal",
  "Rebel Sandal"
];

let influencers = []; // full dataset from DB
let filtered = [];    // computed after search+filter
let currentPage = 1;

// DOM refs
const stateFilter = document.getElementById('state-filter');
const searchInput = document.getElementById('search-input');
const tableWrapper = document.getElementById('table-wrapper');
const pagination = document.getElementById('pagination');
const exportBtn = document.getElementById('export-btn');
const exportMode = document.getElementById('export-mode');
const markContactedCheckbox = document.getElementById('mark-contacted');
const refreshBtn = document.getElementById('refresh-btn');
const detailView = document.getElementById('detail-view');
const listView = document.getElementById('list-view');

async function fetchInfluencers(){
  const { data, error } = await supabase.from('influencers').select('*');
  if(error){ console.error(error); alert('Error loading data (see console)'); return; }
  influencers = data.map(i => {
    try{
      if (!i.outreach_log) i.outreach_log = {};
      else if (typeof i.outreach_log === 'string') i.outreach_log = JSON.parse(i.outreach_log);
    }catch(e){ i.outreach_log = {}; }
    return i;
  });
  computeFilters();
  renderTable();
}

function computeFilters(){
  const states = new Set(influencers.map(i=>i.state).filter(Boolean));
  stateFilter.innerHTML = '<option value="__all">All states</option>';
  states.forEach(s=>{
    const opt = document.createElement('option'); opt.value = s; opt.textContent = s; stateFilter.appendChild(opt);
  });
  applyFilters();
}

function applyFilters(){
  const state = stateFilter.value;
  const q = searchInput.value.trim().toLowerCase();
  filtered = influencers.filter(i=>{
    if(state && state!=="__all" && i.state !== state) return false;
    if(q){
      const name = (i.name||'').toLowerCase();
      const handle = (i.social_handle||'').toLowerCase();
      if(!name.includes(q) && !handle.includes(q)) return false;
    }
    return true;
  });
  currentPage = 1;
  renderTable();
}

function renderTable(){
  listView.classList.remove('hidden');
  detailView.classList.add('hidden');

  const start = (currentPage-1)*PAGE_SIZE;
  const pageItems = filtered.slice(start, start+PAGE_SIZE);

  const table = document.createElement('table');
  const thead = document.createElement('thead');
  thead.innerHTML = `<tr>
    <th>Name</th><th>Email</th><th>Platform</th><th>Handle</th><th>State</th><th>Followers</th><th>Offers</th><th>Selected</th><th>Actions</th>
  </tr>`;
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  pageItems.forEach(row=>{
    const tr = document.createElement('tr');
    const offers = (row.outreach_log && row.outreach_log.offers) ? row.outreach_log.offers : [];
    tr.innerHTML = `
      <td>${escapeHtml(row.name||'')}</td>
      <td>${escapeHtml(row.email||'')}</td>
      <td>${escapeHtml(row.social_platform||'')}</td>
      <td>${escapeHtml(row.social_handle||'')}</td>
      <td>${escapeHtml(row.state||'')}</td>
      <td>${escapeHtml(row.followers==null ? '' : row.followers)}</td>
      <td class="offers-cell"></td>
      <td class="selected-cell"></td>
      <td class="row-actions"></td>
    `;
    const offersCell = tr.querySelector('.offers-cell');
    SANDALS.forEach(s=>{
      const btn = document.createElement('button');
      btn.className = 'product-btn' + (offers.includes(s) ? ' active' : '');
      btn.textContent = s.split(' ')[0];
      btn.title = s;
      btn.onclick = async (e)=>{
        e.preventDefault();
        toggleOffer(row.id, s);
      };
      offersCell.appendChild(btn);
    });

    const selectedCell = tr.querySelector('.selected-cell');
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = !!(row.outreach_log && row.outreach_log.selected_for_outreach);
    cb.onchange = async ()=>{
      await setSelectedForOutreach(row.id, cb.checked);
    };
    selectedCell.appendChild(cb);

    const actionsCell = tr.querySelector('.row-actions');
    const viewBtn = document.createElement('button');
    viewBtn.className = 'btn';
    viewBtn.textContent = 'View / Edit';
    viewBtn.onclick = ()=> openDetail(row.id);
    actionsCell.appendChild(viewBtn);

    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  tableWrapper.innerHTML = '';
  tableWrapper.appendChild(table);
  renderPagination();
}

function renderPagination(){
  const total = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  pagination.innerHTML = '';
  const prev = document.createElement('button'); prev.className='page-btn'; prev.textContent='Prev';
  prev.onclick = ()=>{ if(currentPage>1){ currentPage--; renderTable(); } };
  pagination.appendChild(prev);
  for(let p=1;p<=total;p++){
    const b = document.createElement('button'); b.className='page-btn'+(p===currentPage ? ' active' : '');
    b.textContent = String(p);
    b.onclick = ()=>{ currentPage=p; renderTable(); };
    pagination.appendChild(b);
  }
  const next = document.createElement('button'); next.className='page-btn'; next.textContent='Next';
  next.onclick = ()=>{ if(currentPage<total){ currentPage++; renderTable(); } };
  pagination.appendChild(next);
}

async function toggleOffer(id, offer){
  const item = influencers.find(i=>i.id===id);
  if(!item) return;
  const offers = (item.outreach_log && item.outreach_log.offers) ? [...item.outreach_log.offers] : [];
  const idx = offers.indexOf(offer);
  if(idx === -1) offers.push(offer); else offers.splice(idx,1);
  item.outreach_log = {...item.outreach_log, offers};
  const { error } = await supabase.from('influencers').update({ outreach_log: item.outreach_log }).eq('id', id);
  if(error){ console.error('Update outreach_log error', error); alert('Failed to save selection'); }
  applyFilters();
}

async function setSelectedForOutreach(id, value){
  const item = influencers.find(i=>i.id===id);
  if(!item) return;
  item.outreach_log = {...item.outreach_log, selected_for_outreach: !!value, last_outreach_selection_at: new Date().toISOString()};
  const { error } = await supabase.from('influencers').update({ outreach_log: item.outreach_log }).eq('id', id);
  if(error){ console.error('Update selected error', error); alert('Failed to save selection'); }
  applyFilters();
}

function openDetail(id){
  const item = influencers.find(i=>i.id===id);
  if(!item) return;
  listView.classList.add('hidden');
  detailView.classList.remove('hidden');
  renderDetail(item);
}

function renderDetail(item){
  detailView.innerHTML = '';
  const form = document.createElement('form');
  form.innerHTML = `
    <h2>Edit: ${escapeHtml(item.name || '')}</h2>
    <div class="detail-row"><label>Name</label><input class="input" name="name" value="${escapeHtml(item.name||'')}" /></div>
    <div class="detail-row"><label>Email</label><input class="input" name="email" value="${escapeHtml(item.email||'')}" /></div>
    <div class="detail-row"><label>Platform</label><input class="input" name="social_platform" value="${escapeHtml(item.social_platform||'')}" /></div>
    <div class="detail-row"><label>Handle</label><input class="input" name="social_handle" value="${escapeHtml(item.social_handle||'')}" /></div>
    <div class="detail-row"><label>State</label><input class="input" name="state" value="${escapeHtml(item.state||'')}" /></div>
    <div class="detail-row"><label>Followers</label><input class="input" name="followers" value="${escapeHtml(item.followers||'')}" /></div>
    <div class="detail-row"><label>Notes</label><textarea name="notes" rows="3">${escapeHtml(item.notes||'')}</textarea></div>
    <div class="detail-row"><label>Campaign name</label><input class="input" name="campaign_name" value="${escapeHtml((item.outreach_log && item.outreach_log.campaign_name) || '')}" /></div>
    <div class="detail-row"><label>Custom message</label><textarea name="custom_message" rows="3">${escapeHtml((item.outreach_log && item.outreach_log.custom_message) || '')}</textarea></div>
    <div class="detail-row offers-area"></div>
    <div class="detail-row">
      <label class="checkbox-inline"><input name="selected_for_outreach" type="checkbox" ${item.outreach_log && item.outreach_log.selected_for_outreach ? 'checked' : ''} /> Selected for outreach</label>
    </div>
    <div style="display:flex;gap:8px;margin-top:12px">
      <button class="btn primary" type="submit">Save</button>
      <button class="btn" id="back-btn" type="button">Back</button>
    </div>
  `;
  const offersArea = form.querySelector('.offers-area');
  const offers = (item.outreach_log && item.outreach_log.offers) ? item.outreach_log.offers : [];
  SANDALS.forEach(s=>{
    const b = document.createElement('button');
    b.className = 'product-btn' + (offers.includes(s) ? ' active' : '');
    b.textContent = s;
    b.onclick = (e)=>{ e.preventDefault(); toggleOffer(item.id, s); b.classList.toggle('active'); };
    offersArea.appendChild(b);
  });

  form.onsubmit = async (e)=>{
    e.preventDefault();
    const fd = new FormData(form);
    const updateObj = {
      name: fd.get('name'),
      email: fd.get('email'),
      social_platform: fd.get('social_platform'),
      social_handle: fd.get('social_handle'),
      state: fd.get('state'),
      followers: fd.get('followers') ? parseInt(fd.get('followers')) : null,
      notes: fd.get('notes'),
    };
    const outreach_log = item.outreach_log || {};
    outreach_log.selected_for_outreach = !!fd.get('selected_for_outreach');
    outreach_log.campaign_name = fd.get('campaign_name') || '';
    outreach_log.custom_message = fd.get('custom_message') || '';
    updateObj.outreach_log = outreach_log;

    const { error } = await supabase.from('influencers').update(updateObj).eq('id', item.id);
    if(error){ alert('Save failed'); console.error(error); return; }
    Object.assign(item, updateObj);
    fetchInfluencers();
    listView.classList.remove('hidden'); detailView.classList.add('hidden');
  };

  form.querySelector('#back-btn').onclick = ()=>{
    listView.classList.remove('hidden'); detailView.classList.add('hidden');
  };

  detailView.appendChild(form);
}

function escapeHtml(s){ if(!s) return ''; return String(s).replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[c])); }

/* CSV export logic */
function buildCsvRows(rows){
  const headers = ['name','email','offered_products','social_platform','social_handle','followers','notes','influencer_id','campaign_name','custom_message'];
  const csv = [headers.join(',')];
  rows.forEach(r=>{
    const offers = (r.outreach_log && r.outreach_log.offers) ? r.outreach_log.offers.join(';') : '';
    const campaign = (r.outreach_log && r.outreach_log.campaign_name) ? r.outreach_log.campaign_name : '';
    const message = (r.outreach_log && r.outreach_log.custom_message) ? r.outreach_log.custom_message : '';
    const line = [
      csvEscape(r.name),
      csvEscape(r.email),
      csvEscape(offers),
      csvEscape(r.social_platform),
      csvEscape(r.social_handle),
      csvEscape(r.followers),
      csvEscape(r.notes),
      csvEscape(r.id),
      csvEscape(campaign),
      csvEscape(message)
    ];
    csv.push(line.join(','));
  });
  return csv.join('\n');
}
function csvEscape(v){
  if(v==null) return '';
  const s = String(v).replace(/"/g,'""');
  if(s.includes(',')||s.includes('\n')||s.includes('"')) return '"' + s + '"';
  return s;
}

async function doExport(){
  const mode = exportMode.value;
  let rows = [];
  if(mode === 'selected'){
    rows = influencers.filter(i => i.outreach_log && i.outreach_log.selected_for_outreach);
  }else if(mode === 'filtered'){
    rows = filtered.slice();
  }else{
    rows = influencers.slice();
  }
  if(rows.length === 0){ alert('No influencers to export for this selection'); return; }
  const csv = buildCsvRows(rows);
  if(markContactedCheckbox.checked){
    const ids = rows.map(r=>r.id);
    const { error } = await supabase.from('influencers').update({ contacted: true }).in('id', ids);
    if(error) console.error('mark contacted error', error);
    fetchInfluencers();
  }
  downloadCSV(csv, `viakix_export_${Date.now()}.csv`);
}

function downloadCSV(text, filename){
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.style.display = 'none';
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

// Wire events
searchInput.oninput = () => applyFilters();
stateFilter.onchange = () => applyFilters();
refreshBtn.onclick = () => fetchInfluencers();
exportBtn.onclick = () => doExport();

document.getElementById('send-magic').onclick = async ()=>{
  const email = document.getElementById('auth-email').value;
  if(!email){ alert('Enter email'); return; }
  const { error } = await supabase.auth.signInWithOtp({ email });
  if(error) alert('Failed to send magic link');
  else alert('Magic link sent — check your email');
};

// initial load
fetchInfluencers();
