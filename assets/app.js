// Client app implementing list/detail, filters, product offers, outreach selection, CSV export, pagination
// Updated: export button label change -> Export Outreach CSV; removed mark-exported logic
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

// States & Categories
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

// DOM refs (note: markContactedCheckbox removed)
const stateFilter = document.getElementById('state-filter');
const categoryFilter = document.getElementById('category-filter');
const searchInput = document.getElementById('search-input');
const tableWrapper = document.getElementById('table-wrapper');
const pagination = document.getElementById('pagination');
const exportBtn = document.getElementById('export-btn');
const exportMode = document.getElementById('export-mode');
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

function formatNumber2(v){
  if(v == null || v === '') return '';
  const n = parseFloat(v);
  if(isNaN(n)) return '';
  return n.toFixed(2);
}

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
  populateStateAndCategoryOptions();
  applyFilters();
}

function applyFilters(){
  const state = stateFilter.value;
  const category = categoryFilter.value;
  const q = searchInput.value.trim().toLowerCase();
  filtered = influencers.filter(i=>{
    if(state && state!=="__all"){
      const rowState = i.state ? i.state : 'N/A';
      if(rowState !== state) return false;
    }
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

function sanitizeStatusClass(s){
  if(!s) return 'Not\\ Contacted';
  return String(s).replace(/\s+/g,'\\ ');
}

function renderTable(){
  listView.classList.remove('hidden');
  detailView.classList.add('hidden');

  const start = (currentPage-1)*PAGE_SIZE;
  const pageItems = filtered.slice(start, start+PAGE_SIZE);

  const table = document.createElement('table');
  const thead = document.createElement('thead');
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
    <th>Outreach</th>
    <th>Status</th>
    <th>Offer</th>
    <th>Actions</th>
  </tr>`;
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  pageItems.forEach(row=>{
    const offers = (row.outreach_log && row.outreach_log.offers) ? row.outreach_log.offers : [];
    const outreachVal = (typeof row.outreach !== 'undefined') ? row.outreach : (typeof row.contact !== 'undefined' ? row.contact : (typeof row.contacted !== 'undefined' ? row.contacted : false));
    const statusText = row.status || 'Not Contacted';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escapeHtml(row.account_name||'')}</td>
      <td>${escapeHtml(row.email||'')}</td>
      <td>${escapeHtml(row.platform||'')}</td>
      <td>${escapeHtml(row.social_url||'')}</td>
      <td>${escapeHtml(row.category || row.niche || '')}</td>
      <td>${escapeHtml(row.state||'')}</td>
      <td>${escapeHtml(row.followers==null ? '' : row.followers)}</td>
      <td>${escapeHtml(formatNumber2(row.engagement_rate))}</td>
      <td>${escapeHtml(formatNumber2(row.view_rate))}</td>
      <td class="outreach-cell"></td>
      <td class="status-cell"></td>
      <td class="offer-cell"></td>
      <td class="row-actions"></td>
    `;

    // outreach checkbox (primary outreach flag)
    const outreachCell = tr.querySelector('.outreach-cell');
    const outreachCb = document.createElement('input');
    outreachCb.type = 'checkbox';
    outreachCb.checked = !!outreachVal;
    outreachCb.onchange = async ()=>{
      const fieldName = ('outreach' in row) ? 'outreach' : (('contact' in row) ? 'contact' : (('contacted' in row) ? 'contacted' : 'outreach'));
      const updateObj = {}; updateObj[fieldName] = outreachCb.checked;
      const { error } = await supabase.from('influencers').update(updateObj).eq('id', row.id);
      if(error){ console.error('Update outreach error', error); alert('Failed to save outreach'); }
      row[fieldName] = outreachCb.checked;
      applyFilters();
    };
    outreachCell.appendChild(outreachCb);

    // status badge cell
    const statusCell = tr.querySelector('.status-cell');
    const span = document.createElement('span');
    span.className = 'status-badge status-' + sanitizeStatusClass(statusText);
    span.textContent = statusText;
    statusCell.appendChild(span);

    // offer dropdown (single selection to keep row small)
    const offerCell = tr.querySelector('.offer-cell');
    const sel = document.createElement('select');
    const noneOpt = document.createElement('option'); noneOpt.value = ''; noneOpt.textContent = '—';
    sel.appendChild(noneOpt);
    SANDALS.forEach(s=>{
      const o = document.createElement('option');
      o.value = s;
      o.textContent = s;
      sel.appendChild(o);
    });
    sel.value = offers && offers.length ? offers[0] : '';
    sel.onchange = async ()=>{
      const chosen = sel.value ? [sel.value] : [];
      const item = influencers.find(i=>i.id===row.id);
      if(!item) return;
      item.outreach_log = {...item.outreach_log, offers: chosen};
      const { error } = await supabase.from('influencers').update({ outreach_log: item.outreach_log }).eq('id', row.id);
      if(error){ console.error('Update outreach_log error', error); alert('Failed to save offer'); }
      applyFilters();
    };
    offerCell.appendChild(sel);

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

function escapeHtml(s){ if(!s) return ''; return String(s).replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[c])); }

/* CSV export logic */
function buildCsvRows(rows){
  const headers = ['account_name','email','platform','social_url','category','state','followers','engagement_rate','view_rate','outreach','status','offered_products','notes','influencer_id','campaign_name','custom_message'];
  const csv = [headers.join(',')];
  rows.forEach(r=>{
    const offers = (r.outreach_log && r.outreach_log.offers) ? r.outreach_log.offers.join(';') : '';
    const campaign = (r.outreach_log && r.outreach_log.campaign_name) ? r.outreach_log.campaign_name : '';
    const message = (r.outreach_log && r.outreach_log.custom_message) ? r.outreach_log.custom_message : '';
    const outreachVal = (typeof r.outreach !== 'undefined') ? r.outreach : (typeof r.contact !== 'undefined' ? r.contact : (typeof r.contacted !== 'undefined' ? r.contacted : false));
    const line = [
      csvEscape(r.account_name),
      csvEscape(r.email),
      csvEscape(r.platform),
      csvEscape(r.social_url),
      csvEscape(r.category || r.niche || ''),
      csvEscape(r.state),
      csvEscape(r.followers),
      csvEscape(formatNumber2(r.engagement_rate)),
      csvEscape(formatNumber2(r.view_rate)),
      csvEscape(outreachVal),
      csvEscape(r.status || 'Not Contacted'),
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
    rows = influencers.filter(i => {
      const selectedFlag = !!(i.outreach_log && i.outreach_log.selected_for_outreach);
      const outreachFlag = (typeof i.outreach !== 'undefined') ? !!i.outreach : (!!i.contact || !!i.contacted);
      return selectedFlag || outreachFlag;
    });
  }else if(mode === 'filtered'){
    rows = filtered.slice();
  }else{
    rows = influencers.slice();
  }
  if(rows.length === 0){ alert('No influencers to export for this selection'); return; }
  // Build CSV and immediately download. We no longer alter DB on export.
  const csv = buildCsvRows(rows);
  downloadCSV(csv, `viakix_outreach_export_${Date.now()}.csv`);
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
