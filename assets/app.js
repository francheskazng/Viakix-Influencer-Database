// VIAKIX Influencer Database - Client-Side Application
// Supabase configuration (using existing anon key from repo)
const SUPABASE_URL = 'https://qrpfvpabycejszblghan.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFycGZ2cGFieWNlanN6YmxnaGFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwMjgxMTEsImV4cCI6MjA3ODYwNDExMX0.zzByoK0opa6uwNVlZnaKqHil69X1pE4Y_5V0lWI5txk';

// Product list for toggle buttons
const PRODUCTS = ['Cortona', 'Samara', 'Siena', 'Acadia', 'Monterra', 'Rebel'];

// Global state
let supabase = null;
let allInfluencers = [];
let filteredInfluencers = [];
let currentUser = null;
let currentPage = 1;
let pageSize = 10;
let searchQuery = '';
let stateFilter = 'All';

// Initialize Supabase client
async function initSupabase() {
  const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm');
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
  // Check auth session
  const { data } = await supabase.auth.getSession();
  currentUser = data.session?.user ?? null;
  updateAuthUI();
  
  // Listen for auth changes
  supabase.auth.onAuthStateChange((event, session) => {
    currentUser = session?.user ?? null;
    updateAuthUI();
  });
  
  // Listen for realtime changes
  supabase.channel('public:influencers')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'influencers' }, () => {
      loadInfluencers();
    })
    .subscribe();
}

// Auth UI
function updateAuthUI() {
  const signinBtn = document.getElementById('signin');
  const signoutBtn = document.getElementById('signout');
  const emailInput = document.getElementById('email');
  
  if (currentUser) {
    signinBtn.style.display = 'none';
    emailInput.style.display = 'none';
    signoutBtn.style.display = 'inline-flex';
    signoutBtn.textContent = `Sign out (${currentUser.email || currentUser.id})`;
  } else {
    signinBtn.style.display = 'inline-flex';
    emailInput.style.display = 'inline-block';
    signoutBtn.style.display = 'none';
  }
}

// Load influencers from Supabase
async function loadInfluencers() {
  const appElement = document.getElementById('app');
  const currentHash = window.location.hash;
  
  // Show loading only for list view
  if (!currentHash || currentHash.startsWith('#/list') || currentHash === '#') {
    appElement.innerHTML = '<div class="loading">Loading influencers...</div>';
  }
  
  try {
    const { data, error } = await supabase
      .from('influencers')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1000);
    
    if (error) throw error;
    
    allInfluencers = data || [];
    
    // Parse outreach_log if it's a string
    allInfluencers.forEach(inf => {
      if (typeof inf.outreach_log === 'string') {
        try {
          inf.outreach_log = JSON.parse(inf.outreach_log);
        } catch {
          inf.outreach_log = {};
        }
      }
      if (!inf.outreach_log) inf.outreach_log = {};
      if (!inf.outreach_log.offers) inf.outreach_log.offers = [];
      if (inf.outreach_log.selected_for_outreach === undefined) {
        inf.outreach_log.selected_for_outreach = false;
      }
    });
    
    applyFilters();
    routeHandler();
  } catch (error) {
    appElement.innerHTML = `<div class="error-message">Error loading data: ${error.message}</div>`;
  }
}

// Apply filters and search
function applyFilters() {
  filteredInfluencers = allInfluencers.filter(inf => {
    // State filter
    if (stateFilter !== 'All' && inf.state !== stateFilter) {
      return false;
    }
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const name = (inf.name || '').toLowerCase();
      const handle = (inf.social_handle || '').toLowerCase();
      if (!name.includes(query) && !handle.includes(query)) {
        return false;
      }
    }
    
    return true;
  });
  
  // Reset to page 1 when filters change
  currentPage = 1;
}

// Get unique states for filter dropdown
function getUniqueStates() {
  const states = new Set();
  allInfluencers.forEach(inf => {
    if (inf.state) states.add(inf.state);
  });
  return ['All', ...Array.from(states).sort()];
}

// Pagination helpers
function getPaginatedData() {
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  return filteredInfluencers.slice(startIndex, endIndex);
}

function getTotalPages() {
  return Math.ceil(filteredInfluencers.length / pageSize);
}

// Router
function routeHandler() {
  const hash = window.location.hash || '#/list';
  
  if (hash.startsWith('#/influencer/')) {
    const id = hash.split('/')[2];
    renderDetailView(id);
  } else {
    renderListView();
  }
}

// Render List View
function renderListView() {
  const appElement = document.getElementById('app');
  const states = getUniqueStates();
  const paginatedData = getPaginatedData();
  const totalPages = getTotalPages();
  
  let html = `
    <div class="controls-bar">
      <div class="controls-group">
        <select id="state-filter" class="input filter-dropdown">
          ${states.map(state => `<option value="${state}" ${state === stateFilter ? 'selected' : ''}>${state}</option>`).join('')}
        </select>
        <input type="text" id="search-box" class="input search-box" placeholder="Search by name or handle..." value="${escapeHtml(searchQuery)}" />
      </div>
      <div class="controls-group">
        <button id="refresh-btn" class="btn btn-secondary">Refresh</button>
        <div class="export-dropdown">
          <button id="export-btn" class="btn btn-primary">Export CSV ▼</button>
          <div id="export-menu" class="export-menu">
            <button class="export-option" data-mode="selected">
              <div class="export-option-title">Export Selected for Outreach</div>
              <div class="export-option-desc">Only rows marked for outreach</div>
            </button>
            <button class="export-option" data-mode="filtered">
              <div class="export-option-title">Export Filtered</div>
              <div class="export-option-desc">Current filter results</div>
            </button>
            <button class="export-option" data-mode="all">
              <div class="export-option-title">Export All</div>
              <div class="export-option-desc">Entire database</div>
            </button>
            <div class="export-checkbox-option">
              <input type="checkbox" id="mark-contacted" />
              <label for="mark-contacted">Mark exported as contacted</label>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  if (paginatedData.length === 0) {
    html += '<div class="empty-state">No influencers found. Try adjusting your filters.</div>';
  } else {
    html += `
      <div class="table-container">
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Select</th>
                <th>Name</th>
                <th>Email</th>
                <th>Social Platform</th>
                <th>Handle</th>
                <th class="hide-mobile">Category</th>
                <th class="hide-mobile">State</th>
                <th class="hide-mobile">Followers</th>
                <th class="hide-mobile">Engagement</th>
                <th>Product Offers</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${paginatedData.map(inf => renderTableRow(inf)).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
    
    // Pagination
    if (totalPages > 1) {
      html += `
        <div class="pagination">
          <button class="btn btn-secondary btn-small" id="prev-page" ${currentPage === 1 ? 'disabled' : ''}>Prev</button>
          <span class="pagination-info">Page ${currentPage} of ${totalPages}</span>
          ${renderPageNumbers(totalPages)}
          <button class="btn btn-secondary btn-small" id="next-page" ${currentPage === totalPages ? 'disabled' : ''}>Next</button>
        </div>
      `;
    }
  }
  
  appElement.innerHTML = html;
  attachListViewListeners();
}

function renderTableRow(inf) {
  const selected = inf.outreach_log?.selected_for_outreach || false;
  const offers = inf.outreach_log?.offers || [];
  
  return `
    <tr data-id="${inf.id}">
      <td>
        <div class="checkbox-container">
          <input type="checkbox" class="outreach-select" data-id="${inf.id}" ${selected ? 'checked' : ''} />
        </div>
      </td>
      <td contenteditable="true" data-col="name" data-id="${inf.id}">${escapeHtml(inf.name || '')}</td>
      <td contenteditable="true" data-col="email" data-id="${inf.id}">${escapeHtml(inf.email || '')}</td>
      <td contenteditable="true" data-col="social_platform" data-id="${inf.id}">${escapeHtml(inf.social_platform || '')}</td>
      <td contenteditable="true" data-col="social_handle" data-id="${inf.id}">${escapeHtml(inf.social_handle || '')}</td>
      <td class="hide-mobile" contenteditable="true" data-col="category" data-id="${inf.id}">${escapeHtml(inf.category || '')}</td>
      <td class="hide-mobile" contenteditable="true" data-col="state" data-id="${inf.id}">${escapeHtml(inf.state || '')}</td>
      <td class="hide-mobile" contenteditable="true" data-col="followers" data-id="${inf.id}">${escapeHtml(String(inf.followers || ''))}</td>
      <td class="hide-mobile" contenteditable="true" data-col="engagement_rate" data-id="${inf.id}">${escapeHtml(String(inf.engagement_rate || ''))}</td>
      <td>
        <div class="product-toggles">
          ${PRODUCTS.map(product => `
            <button class="product-toggle ${offers.includes(product) ? 'active' : ''}" 
                    data-id="${inf.id}" 
                    data-product="${product}">
              ${product}
            </button>
          `).join('')}
        </div>
      </td>
      <td>
        <button class="btn btn-secondary btn-small save-row" data-id="${inf.id}">Save</button>
        <a href="#/influencer/${inf.id}" class="btn btn-secondary btn-small">View/Edit</a>
      </td>
    </tr>
  `;
}

function renderPageNumbers(totalPages) {
  let pages = [];
  const maxVisible = 5;
  
  if (totalPages <= maxVisible) {
    pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  } else {
    if (currentPage <= 3) {
      pages = [1, 2, 3, 4, '...', totalPages];
    } else if (currentPage >= totalPages - 2) {
      pages = [1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    } else {
      pages = [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
    }
  }
  
  return pages.map(page => {
    if (page === '...') {
      return '<span class="pagination-info">...</span>';
    }
    return `<button class="page-number ${page === currentPage ? 'active' : ''}" data-page="${page}">${page}</button>`;
  }).join('');
}

// Attach List View Event Listeners
function attachListViewListeners() {
  // Filter and search
  const stateFilterEl = document.getElementById('state-filter');
  const searchBoxEl = document.getElementById('search-box');
  
  if (stateFilterEl) {
    stateFilterEl.addEventListener('change', (e) => {
      stateFilter = e.target.value;
      applyFilters();
      renderListView();
    });
  }
  
  if (searchBoxEl) {
    searchBoxEl.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      applyFilters();
      renderListView();
    });
  }
  
  // Pagination
  const prevBtn = document.getElementById('prev-page');
  const nextBtn = document.getElementById('next-page');
  
  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage--;
        renderListView();
      }
    });
  }
  
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      if (currentPage < getTotalPages()) {
        currentPage++;
        renderListView();
      }
    });
  }
  
  document.querySelectorAll('.page-number').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const page = parseInt(e.target.dataset.page);
      if (page) {
        currentPage = page;
        renderListView();
      }
    });
  });
  
  // Refresh
  const refreshBtn = document.getElementById('refresh-btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => loadInfluencers());
  }
  
  // Export dropdown
  const exportBtn = document.getElementById('export-btn');
  const exportMenu = document.getElementById('export-menu');
  
  if (exportBtn && exportMenu) {
    exportBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      exportMenu.classList.toggle('show');
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.export-dropdown')) {
        exportMenu.classList.remove('show');
      }
    });
    
    // Export options
    document.querySelectorAll('.export-option').forEach(option => {
      option.addEventListener('click', async (e) => {
        const mode = e.currentTarget.dataset.mode;
        const markContacted = document.getElementById('mark-contacted').checked;
        await exportCSV(mode, markContacted);
        exportMenu.classList.remove('show');
      });
    });
  }
  
  // Outreach selection
  document.querySelectorAll('.outreach-select').forEach(checkbox => {
    checkbox.addEventListener('change', async (e) => {
      const id = e.target.dataset.id;
      const checked = e.target.checked;
      await updateOutreachSelection(id, checked);
    });
  });
  
  // Product toggles
  document.querySelectorAll('.product-toggle').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.target.dataset.id;
      const product = e.target.dataset.product;
      await toggleProduct(id, product);
    });
  });
  
  // Save row
  document.querySelectorAll('.save-row').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.target.dataset.id;
      await saveRow(id);
    });
  });
}

// Save row edits
async function saveRow(id) {
  const rowEl = document.querySelector(`tr[data-id="${id}"]`);
  if (!rowEl) return;
  
  const payload = {};
  rowEl.querySelectorAll('td[contenteditable="true"]').forEach(td => {
    const col = td.getAttribute('data-col');
    let value = td.innerText.trim();
    
    // Type conversion
    if (col === 'followers') {
      value = value ? parseInt(value, 10) : null;
    } else if (col === 'engagement_rate' || col === 'view_rate') {
      value = value ? parseFloat(value) : null;
    }
    
    payload[col] = value;
  });
  
  try {
    const { error } = await supabase
      .from('influencers')
      .update(payload)
      .eq('id', id);
    
    if (error) throw error;
    
    // Update local data
    const inf = allInfluencers.find(i => i.id === id);
    if (inf) {
      Object.assign(inf, payload);
    }
    
    // Visual feedback
    const btn = rowEl.querySelector('.save-row');
    const originalText = btn.textContent;
    btn.textContent = 'Saved!';
    setTimeout(() => {
      btn.textContent = originalText;
    }, 1500);
  } catch (error) {
    alert('Save failed: ' + error.message);
  }
}

// Toggle product offer
async function toggleProduct(id, product) {
  const inf = allInfluencers.find(i => i.id === id);
  if (!inf) return;
  
  if (!inf.outreach_log) inf.outreach_log = {};
  if (!inf.outreach_log.offers) inf.outreach_log.offers = [];
  
  const offers = inf.outreach_log.offers;
  const index = offers.indexOf(product);
  
  if (index > -1) {
    offers.splice(index, 1);
  } else {
    offers.push(product);
  }
  
  try {
    const { error } = await supabase
      .from('influencers')
      .update({ outreach_log: inf.outreach_log })
      .eq('id', id);
    
    if (error) throw error;
    
    // Update UI
    const btn = document.querySelector(`.product-toggle[data-id="${id}"][data-product="${product}"]`);
    if (btn) {
      btn.classList.toggle('active');
    }
  } catch (error) {
    console.error('Failed to toggle product:', error);
    alert('Failed to update product offer: ' + error.message);
  }
}

// Update outreach selection
async function updateOutreachSelection(id, selected) {
  const inf = allInfluencers.find(i => i.id === id);
  if (!inf) return;
  
  if (!inf.outreach_log) inf.outreach_log = {};
  inf.outreach_log.selected_for_outreach = selected;
  
  try {
    const { error } = await supabase
      .from('influencers')
      .update({ outreach_log: inf.outreach_log })
      .eq('id', id);
    
    if (error) throw error;
  } catch (error) {
    console.error('Failed to update outreach selection:', error);
    alert('Failed to update outreach selection: ' + error.message);
  }
}

// Render Detail View
function renderDetailView(id) {
  const inf = allInfluencers.find(i => i.id === id);
  if (!inf) {
    document.getElementById('app').innerHTML = '<div class="error-message">Influencer not found</div>';
    return;
  }
  
  const selected = inf.outreach_log?.selected_for_outreach || false;
  const offers = inf.outreach_log?.offers || [];
  const campaignName = inf.outreach_log?.campaign_name || '';
  const customMessage = inf.outreach_log?.custom_message || '';
  
  const html = `
    <div class="detail-view">
      <div class="detail-header">
        <h2>Edit Influencer</h2>
        <a href="#/list" class="btn btn-secondary">← Back to List</a>
      </div>
      
      <div class="form-grid">
        <div class="form-field">
          <label>Name</label>
          <input type="text" id="detail-name" class="input" value="${escapeHtml(inf.name || '')}" />
        </div>
        <div class="form-field">
          <label>Email</label>
          <input type="email" id="detail-email" class="input" value="${escapeHtml(inf.email || '')}" />
        </div>
        <div class="form-field">
          <label>Social Platform</label>
          <input type="text" id="detail-platform" class="input" value="${escapeHtml(inf.social_platform || '')}" />
        </div>
        <div class="form-field">
          <label>Social Handle</label>
          <input type="text" id="detail-handle" class="input" value="${escapeHtml(inf.social_handle || '')}" />
        </div>
        <div class="form-field">
          <label>Category</label>
          <input type="text" id="detail-category" class="input" value="${escapeHtml(inf.category || '')}" />
        </div>
        <div class="form-field">
          <label>State</label>
          <input type="text" id="detail-state" class="input" value="${escapeHtml(inf.state || '')}" />
        </div>
        <div class="form-field">
          <label>Followers</label>
          <input type="number" id="detail-followers" class="input" value="${inf.followers || ''}" />
        </div>
        <div class="form-field">
          <label>Engagement Rate (%)</label>
          <input type="number" step="0.01" id="detail-engagement" class="input" value="${inf.engagement_rate || ''}" />
        </div>
        <div class="form-field">
          <label>View Rate (%)</label>
          <input type="number" step="0.01" id="detail-viewrate" class="input" value="${inf.view_rate || ''}" />
        </div>
        <div class="form-field">
          <label>Campaign Name</label>
          <input type="text" id="detail-campaign" class="input" value="${escapeHtml(campaignName)}" />
        </div>
      </div>
      
      <div class="form-field" style="margin-bottom: 24px;">
        <label>Custom Message</label>
        <textarea id="detail-message" class="input">${escapeHtml(customMessage)}</textarea>
      </div>
      
      <div class="form-field" style="margin-bottom: 24px;">
        <label>Product Offers</label>
        <div class="product-toggles">
          ${PRODUCTS.map(product => `
            <button class="product-toggle ${offers.includes(product) ? 'active' : ''}" 
                    data-product="${product}">
              ${product}
            </button>
          `).join('')}
        </div>
      </div>
      
      <div class="form-field" style="margin-bottom: 24px;">
        <div class="checkbox-container">
          <input type="checkbox" id="detail-outreach-select" ${selected ? 'checked' : ''} />
          <label for="detail-outreach-select">Select for outreach</label>
        </div>
      </div>
      
      <div class="form-actions">
        <a href="#/list" class="btn btn-secondary">Cancel</a>
        <button id="save-detail" class="btn btn-primary">Save Changes</button>
      </div>
    </div>
  `;
  
  document.getElementById('app').innerHTML = html;
  attachDetailViewListeners(id);
}

// Attach Detail View Event Listeners
function attachDetailViewListeners(id) {
  const inf = allInfluencers.find(i => i.id === id);
  if (!inf) return;
  
  // Product toggles in detail view
  document.querySelectorAll('.product-toggle').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const product = e.target.dataset.product;
      
      if (!inf.outreach_log) inf.outreach_log = {};
      if (!inf.outreach_log.offers) inf.outreach_log.offers = [];
      
      const offers = inf.outreach_log.offers;
      const index = offers.indexOf(product);
      
      if (index > -1) {
        offers.splice(index, 1);
        btn.classList.remove('active');
      } else {
        offers.push(product);
        btn.classList.add('active');
      }
    });
  });
  
  // Save button
  document.getElementById('save-detail').addEventListener('click', async () => {
    const payload = {
      name: document.getElementById('detail-name').value.trim(),
      email: document.getElementById('detail-email').value.trim(),
      social_platform: document.getElementById('detail-platform').value.trim(),
      social_handle: document.getElementById('detail-handle').value.trim(),
      category: document.getElementById('detail-category').value.trim(),
      state: document.getElementById('detail-state').value.trim(),
      followers: document.getElementById('detail-followers').value ? parseInt(document.getElementById('detail-followers').value, 10) : null,
      engagement_rate: document.getElementById('detail-engagement').value ? parseFloat(document.getElementById('detail-engagement').value) : null,
      view_rate: document.getElementById('detail-viewrate').value ? parseFloat(document.getElementById('detail-viewrate').value) : null,
    };
    
    // Update outreach_log
    if (!inf.outreach_log) inf.outreach_log = {};
    inf.outreach_log.campaign_name = document.getElementById('detail-campaign').value.trim();
    inf.outreach_log.custom_message = document.getElementById('detail-message').value.trim();
    inf.outreach_log.selected_for_outreach = document.getElementById('detail-outreach-select').checked;
    
    payload.outreach_log = inf.outreach_log;
    
    try {
      const { error } = await supabase
        .from('influencers')
        .update(payload)
        .eq('id', id);
      
      if (error) throw error;
      
      // Update local data
      Object.assign(inf, payload);
      
      alert('Saved successfully!');
      window.location.hash = '#/list';
    } catch (error) {
      alert('Save failed: ' + error.message);
    }
  });
}

// CSV Export
async function exportCSV(mode, markContacted) {
  let dataToExport = [];
  
  switch (mode) {
    case 'selected':
      dataToExport = allInfluencers.filter(inf => inf.outreach_log?.selected_for_outreach);
      break;
    case 'filtered':
      dataToExport = filteredInfluencers;
      break;
    case 'all':
      dataToExport = allInfluencers;
      break;
  }
  
  if (dataToExport.length === 0) {
    alert('No data to export for this selection.');
    return;
  }
  
  // Build CSV
  const columns = [
    'name',
    'email',
    'offered_products',
    'social_platform',
    'social_handle',
    'followers',
    'notes',
    'influencer_id',
    'campaign_name',
    'custom_message'
  ];
  
  const csvRows = [columns.join(',')];
  
  dataToExport.forEach(inf => {
    const offers = (inf.outreach_log?.offers || []).join(', ');
    const campaignName = inf.outreach_log?.campaign_name || '';
    const customMessage = inf.outreach_log?.custom_message || '';
    const notes = inf.notes || '';
    
    const row = [
      csvEscape(inf.name || ''),
      csvEscape(inf.email || ''),
      csvEscape(offers),
      csvEscape(inf.social_platform || ''),
      csvEscape(inf.social_handle || ''),
      inf.followers || '',
      csvEscape(notes),
      inf.id || '',
      csvEscape(campaignName),
      csvEscape(customMessage)
    ];
    
    csvRows.push(row.join(','));
  });
  
  const csv = csvRows.join('\n');
  
  // Download
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `influencers-${mode}-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  
  // Mark as contacted if requested
  if (markContacted) {
    try {
      const ids = dataToExport.map(inf => inf.id);
      const { error } = await supabase
        .from('influencers')
        .update({ contacted: true })
        .in('id', ids);
      
      if (error) throw error;
      
      // Update local data
      dataToExport.forEach(inf => {
        inf.contacted = true;
      });
      
      alert(`Exported ${dataToExport.length} rows and marked as contacted.`);
      loadInfluencers(); // Refresh
    } catch (error) {
      alert('Export succeeded but failed to mark as contacted: ' + error.message);
    }
  }
}

function csvEscape(str) {
  const s = String(str);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

// Utility
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Auth handlers
async function handleSignIn() {
  const email = document.getElementById('email').value.trim();
  if (!email) {
    alert('Please enter an email address');
    return;
  }
  
  try {
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) throw error;
    alert('Magic link sent! Check your email and click the link in the same browser.');
  } catch (error) {
    alert('Sign-in error: ' + error.message);
  }
}

async function handleSignOut() {
  try {
    await supabase.auth.signOut();
    currentUser = null;
    updateAuthUI();
  } catch (error) {
    alert('Sign-out error: ' + error.message);
  }
}

// Initialize app
async function init() {
  await initSupabase();
  await loadInfluencers();
  
  // Setup auth handlers
  document.getElementById('signin').addEventListener('click', handleSignIn);
  document.getElementById('signout').addEventListener('click', handleSignOut);
  
  // Setup routing
  window.addEventListener('hashchange', routeHandler);
  
  // Handle initial route
  routeHandler();
}

// Start app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
