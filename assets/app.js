// Client app implementing list/detail, filters, product offers, outreach selection, CSV export, pagination
// Updated to use the new table columns layout: account_name, email, platform, social_url, category, state,
// followers, engagement_rate, view_rate, contact, status
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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

// States & Categories (kept from earlier)
const STATES = [
  "Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut","Delaware",
  "Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa","Kansas","Kentucky",
  "Louisiana","Maine","Maryland","Massachusetts","Michigan","Minnesota","Mississippi",
  "Missouri","Montana","Nebraska","Nevada","New Hampshire","New Jersey","New Mexico",
  "New York","North Carolina","North Dakota","Ohio","Oklahoma","Oregon","Pennsylvania",
  "Rhode Island","South Carolina","South Dakota","Tennessee","Texas","Utah","Vermont",
  "Virginia","Washington","West Virginia","Wisconsin","Wyoming","N/A"
];

const CATEGORIES = [
  "Hiking/Backpacking",
  "Running",
  "Outdoors",
  "Travel",
  "Pets",
  "Van Life",
  "Camping",
  "Fishing/Hunting",
  "Other"
];

let influencers = []; // full dataset from DB
let filtered = [];    // computed after search+filter
let currentPage = 1;

// DOM refs
const stateFilter = document.getElementById('state-filter');
const categoryFilter = document.getElementById('category-filter');
const searchInput = document.getElementById('search-input');
const tableWrapper = document.getElementById('table-wrapper');
const pagination = document.getElementById('pagination');
const exportBtn = document.getElementById('export-btn');
const exportMode = document.getElementById('export-mode');
const markContactedCheckbox = document.getElementById('mark-contacted');
const refreshBtn = document.getElementById('refresh-btn');
const detailView = document.getElementById('detail-view');
const listView = document.getElementById('list-view');

function populateStateAndCategoryOptions(){
  stateFilter.innerHTML = '<option value="__all">All states</option>';
  STATES.forEach(s => {
    const opt = document.createElement('option'); opt.value = s; opt.textContent = s; stateFilter.appendChild(opt);
  });
  categoryFilter.innerHTML = '<option value="__all">All categories</option>';
  CATEGORIES.forEach(c => {
    const opt = document.createElement('option'); opt.value = c; opt.textContent = c; categoryFilter.appendChild(opt);
  });
}

async function fetchInfluencers(){
  // select all columns; adjust if you want to limit fields
  const { data, error } = await supabase.from('influencers').select('*');
  if(error){ console.error(error); alert('Error loading data (see console)'); return; }
  influencers = data.map(i => {
    try{
      // keep outreach_log normalized as object
      if (!i.outreach_log) i.outreach_log = {};
      else if (typeof i.outreach_log === 'string') i.outreach_log = JSON.parse(i.outreach_log);
    }catch(e){ i.outreach_log = {}; }
    return i;
  });
  populateStateAndCategoryOptions();
  applyFilters();
}

function applyFilters(){
  const state = stateFilter.value;
  const category = categoryFilter.value;
  const q = searchInput.value.trim().toLowerCase();
  filtered = influencers.filter(i=>{
    // state match (treat missing as N/A)
    if(state && state!=="__all"){
      const rowState = i.state ? i.state : 'N/A';
      if(rowState !== state) return false;
    }
    // category match (support category or niche if older rows)
    if(category && category!=="__all"){
      const rowCat = i.category ? i.category : (i.niche ? i.niche : '');
      if(rowCat !== category) return false;
    }
    if(q){
      const name = (i.account_name||'').toLowerCase();
      const url = (i.social_url||'').toLowerCase();
      if(!name.includes(q) && !url.includes(q)) return false;
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
  // Columns in the exact order you provided
  thead.innerHTML = `<tr>
    <th>Account Name</th>
    <th>Email</th>
    <th>Platform</th>
    <th>Social URL</th>
    <th>Category</th>
    <th>State</th>
    <th>Followers</th>
    <th>Engagement Rate</th>
    <th>View Rate</th>
    <th>Contact</th>
    <th>Status</th>
    <th>Offers</th>
    <th>Selected</th>
    <th>Actions</th>
  </tr>`;
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  pageItems.forEach(row=>{
    const offers = (row.outreach_log && row.outreach_log.offers) ? row.outreach_log.offers : [];
    const contactVal = (typeof row.contact !== 'undefined') ? row.contact : (typeof row.contacted !== 'undefined' ? row.contacted : false);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escapeHtml(row.account_name||'')}</td>
      <td>${escapeHtml(row.email||'')}</td>
      <td>${escapeHtml(row.platform||'')}</td>
      <td>${escapeHtml(row.social_url||'')}</td>
      <td>${escapeHtml(row.category || row.niche || '')}</td>
      <td>${escapeHtml(row.state||'')}</td>
      <td>${escapeHtml(row.followers==null ? '' : row.followers)}</td>
      <td>${escapeHtml(row.engagement_rate==null ? '' : row.engagement_rate)}</td>
      <td>${escapeHtml(row.view_rate==null ? '' : row.view_rate)}</td>
      <td class="contact-cell"></td>
      <td>${escapeHtml(row.status||'')}</td>
      <td class="offers-cell"></td>
      <td class="selected-cell"></td>
      <td class="row-actions"></td>
    `;

    // contact checkbox/display
    const contactCell = tr.querySelector('.contact-cell');
    const contactCb = document.createElement('input');
    contactCb.type = 'checkbox';
    contactCb.checked = !!contactVal;
    contactCb.onchange = async ()=>{
      // attempt to persist to 'contact' column, fall back to 'contacted'
      const fieldName = ('contact' in row) ? 'contact' : (('contacted' in row) ? 'contacted' : 'contact');
      const updateObj = {}; updateObj[fieldName] = contactCb.checked;
      const { error } = await supabase.from('influencers').update(updateObj).eq('id', row.id);
      if(error){ console.error('Update contact error', error); alert('Failed to save contact'); }
      row[fieldName] = contactCb.checked;
    };
    contactCell.appendChild(contactCb);

    // offer buttons
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

    // selected for outreach checkbox
    const selectedCell = tr.querySelector('.selected-cell');
    const selCb = document.createElement('input');
    selCb.type = 'checkbox';
    selCb.checked = !!(row.outreach_log && row.outreach_log.selected_for_outreach);
    selCb.onchange = async ()=>{
      await setSelectedForOutreach(row.id, selCb.checked);
    };
    selectedCell.appendChild(selCb);

    // actions
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
    <h2>Edit: ${escapeHtml(item.account_name || '')}</h2>
    <div class="detail-row"><label>Account Name</label><input class="input" name="account_name" value="${escapeHtml(item.account_name||'')}" /></div>
    <div class="detail-row"><label>Email</label><input class="input" name="email" value="${escapeHtml(item.email||'')}" /></div>
    <div class="detail-row"><label>Platform</label><input class="input" name="platform" value="${escapeHtml(item.platform||'')}" /></div>
    <div class="detail-row"><label>Social URL</label><input class="input" name="social_url" value="${escapeHtml(item.social_url||'')}" /></div>
    <div class="detail-row"><label>State</label><input class="input" name="state" value="${escapeHtml(item.state||'')}" /></div>
    <div class="detail-row"><label>Category</label><input class="input" name="category" value="${escapeHtml(item.category || item.niche || '')}" /></div>
    <div class="detail-row"><label>Followers</label><input class="input" name="followers" value="${escapeHtml(item.followers||'')}" /></div>
    <div class="detail-row"><label>Engagement Rate</label><input class="input" name="engagement_rate" value="${escapeHtml(item.engagement_rate||'')}" /></div>
    <div class="detail-row"><label>View Rate</label><input class="input" name="view_rate" value="${escapeHtml(item.view_rate||'')}" /></div>
    <div class="detail-row"><label>Contact</label><label class="checkbox-inline"><input name="contact" type="checkbox" ${item.contact || item.contacted ? 'checked' : ''} /> Contact</label></div>
    <div class="detail-row"><label>Status</label><input class="input" name="status" value="${escapeHtml(item.status||'')}" /></div>
    <div class="detail-row"><label>Notes</label><textarea name="notes" rows="3">${escapeHtml(item.notes||'')}</textarea></div>
    <div class="detail-row"><label>Campaign name</label><input class="input" name="campaign_name" value="${escapeHtml((item.outreach_log && item.outreach_log.campaign_name) || '')}" /></div>
    <div class="detail-row"><label>Custom message</label><textarea name="custom_message" rows="3">${escapeHtml((item.outreach_log && item.outreach_log.custom_message) || '')}</textarea></div>
    <div class="detail-row offers-area"></div>
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
      account_name: fd.get('account_name'),
      email: fd.get('email'),
      platform: fd.get('platform'),
      social_url: fd.get('social_url'),
      state: fd.get('state'),
      category: fd.get('category') || null,
      followers: fd.get('followers') ? parseInt(fd.get('followers')) : null,
      engagement_rate: fd.get('engagement_rate') || null,
      view_rate: fd.get('view_rate') || null,
      status: fd.get('status') || null,
      notes: fd.get('notes'),
    };
    // contact boolean: try to write to contact column, fall back to contacted if exists
    const contactField = ('contact' in item) ? 'contact' : (('contacted' in item) ? 'contacted' : 'contact');
    updateObj[contactField] = !!fd.get('contact');

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
  const headers = ['account_name','email','platform','social_url','category','state','followers','engagement_rate','view_rate','contact','status','offered_products','notes','influencer_id','campaign_name','custom_message'];
  const csv = [headers.join(',')];
  rows.forEach(r=>{
    const offers = (r.outreach_log && r.outreach_log.offers) ? r.outreach_log.offers.join(';') : '';
    const campaign = (r.outreach_log && r.outreach_log.campaign_name) ? r.outreach_log.campaign_name : '';
    const message = (r.outreach_log && r.outreach_log.custom_message) ? r.outreach_log.custom_message : '';
    const contactVal = (typeof r.contact !== 'undefined') ? r.contact : (typeof r.contacted !== 'undefined' ? r.contacted : false);
    const line = [
      csvEscape(r.account_name),
      csvEscape(r.email),
      csvEscape(r.platform),
      csvEscape(r.social_url),
      csvEscape(r.category || r.niche || ''),
      csvEscape(r.state),
      csvEscape(r.followers),
      csvEscape(r.engagement_rate),
      csvEscape(r.view_rate),
      csvEscape(contactVal),
      csvEscape(r.status),
      csvEscape(offers),
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
    // write to contact or contacted depending on schema
    const { error } = await supabase.from('influencers').update({ contact: true }).in('id', ids);
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
categoryFilter.onchange = () => applyFilters();
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
