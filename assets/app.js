// VIAKIX Influencer Database - Application Logic

// Supabase configuration (using existing anon key from repo)
const SUPABASE_URL = 'https://qrpfvpabycejszblghan.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFycGZ2cGFieWNlanN6YmxnaGFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwMjgxMTEsImV4cCI6MjA3ODYwNDExMX0.zzByoK0opa6uwNVlZnaKqHil69X1pE4Y_5V0lWI5txk';

// Product offerings
const PRODUCTS = ['Cortona', 'Samara', 'Siena', 'Acadia', 'Monterra', 'Rebel'];

// Application state
let supabase = null;
let currentUser = null;
let allInfluencers = [];
let filteredInfluencers = [];
let currentPage = 1;
let pageSize = 10;
let filters = {
  state: 'All',
  search: ''
};

// Initialize application
async function initApp() {
  // Import and initialize Supabase
  const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm');
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
  // Check authentication
  await checkSession();
  
  // Setup event listeners
  setupEventListeners();
  
  // Setup routing
  setupRouting();
  
  // Load initial data
  await loadInfluencers();
  
  // Subscribe to realtime changes
  supabase
    .channel('public:influencers')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'influencers' }, () => {
      loadInfluencers();
    })
    .subscribe();
}

// Authentication
async function checkSession() {
  const { data } = await supabase.auth.getSession();
  currentUser = data.session?.user ?? null;
  updateAuthUI();
}

function updateAuthUI() {
  const signinBtn = document.getElementById('signin');
  const signoutBtn = document.getElementById('signout');
  const emailInput = document.getElementById('email');
  
  if (currentUser) {
    signinBtn.style.display = 'none';
    emailInput.style.display = 'none';
    signoutBtn.style.display = 'inline-block';
    signoutBtn.textContent = `Sign out (${currentUser.email || currentUser.id})`;
  } else {
    signinBtn.style.display = 'inline-block';
    emailInput.style.display = 'inline-block';
    signoutBtn.style.display = 'none';
  }
}

async function handleSignIn() {
  const emailInput = document.getElementById('email');
  const email = emailInput.value.trim();
  if (!email) {
    alert('Please enter an email address');
    return;
  }
  const { error } = await supabase.auth.signInWithOtp({ email });
  if (error) {
    alert('Sign-in error: ' + error.message);
  } else {
    alert('Magic link sent — open email and click the link in the same browser');
  }
}

async function handleSignOut() {
  await supabase.auth.signOut();
  currentUser = null;
  updateAuthUI();
}

// Data loading
async function loadInfluencers() {
  const listView = document.getElementById('list-view');
  if (listView) {
    listView.innerHTML = '<div class="loading">Loading influencers...</div>';
  }
  
  const { data, error } = await supabase
    .from('influencers')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1000);
  
  if (error) {
    console.error('Error loading influencers:', error);
    if (listView) {
      listView.innerHTML = `<div class="error-message">Error loading data: ${error.message}</div>`;
    }
    return;
  }
  
  allInfluencers = data || [];
  applyFilters();
  
  // Update state filter dropdown
  updateStateFilter();
  
  // Render current view
  const hash = window.location.hash || '#/list';
  handleRoute(hash);
}

// Filters and search
function updateStateFilter() {
  const stateFilter = document.getElementById('state-filter');
  if (!stateFilter) return;
  
  // Get unique states
  const states = [...new Set(allInfluencers.map(i => i.state).filter(s => s))].sort();
  
  const currentValue = stateFilter.value;
  stateFilter.innerHTML = '<option value="All">All States</option>' +
    states.map(state => `<option value="${escapeHtml(state)}">${escapeHtml(state)}</option>`).join('');
  
  // Restore selection if it still exists
  if (states.includes(currentValue)) {
    stateFilter.value = currentValue;
  }
}

function applyFilters() {
  filteredInfluencers = allInfluencers.filter(influencer => {
    // State filter
    if (filters.state !== 'All' && influencer.state !== filters.state) {
      return false;
    }
    
    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const nameMatch = (influencer.name || '').toLowerCase().includes(searchLower);
      const handleMatch = (influencer.social_handle || '').toLowerCase().includes(searchLower);
      if (!nameMatch && !handleMatch) {
        return false;
      }
    }
    
    return true;
  });
  
  // Reset to first page when filters change
  currentPage = 1;
}

// Pagination
function getPaginatedData() {
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  return filteredInfluencers.slice(startIndex, endIndex);
}

function getTotalPages() {
  return Math.ceil(filteredInfluencers.length / pageSize);
}

function renderPagination() {
  const paginationEl = document.getElementById('pagination');
  if (!paginationEl) return;
  
  const totalPages = getTotalPages();
  
  if (totalPages <= 1) {
    paginationEl.innerHTML = '';
    return;
  }
  
  let html = '<div class="pagination">';
  
  // Previous button
  html += `<button class="btn btn-secondary btn-small" onclick="changePage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>← Prev</button>`;
  
  // Page numbers
  const maxVisiblePages = 7;
  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
  
  if (endPage - startPage < maxVisiblePages - 1) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }
  
  if (startPage > 1) {
    html += `<button class="page-number" onclick="changePage(1)">1</button>`;
    if (startPage > 2) {
      html += '<span style="padding: 0 8px; color: var(--gray-400);">...</span>';
    }
  }
  
  for (let i = startPage; i <= endPage; i++) {
    html += `<button class="page-number ${i === currentPage ? 'active' : ''}" onclick="changePage(${i})">${i}</button>`;
  }
  
  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      html += '<span style="padding: 0 8px; color: var(--gray-400);">...</span>';
    }
    html += `<button class="page-number" onclick="changePage(${totalPages})">${totalPages}</button>`;
  }
  
  // Next button
  html += `<button class="btn btn-secondary btn-small" onclick="changePage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>Next →</button>`;
  
  html += '</div>';
  paginationEl.innerHTML = html;
}

window.changePage = function(page) {
  const totalPages = getTotalPages();
  if (page < 1 || page > totalPages) return;
  currentPage = page;
  renderListView();
};

// Routing
function setupRouting() {
  window.addEventListener('hashchange', () => {
    handleRoute(window.location.hash);
  });
  
  // Handle initial route
  const hash = window.location.hash || '#/list';
  handleRoute(hash);
}

function handleRoute(hash) {
  const listView = document.getElementById('list-view');
  const detailView = document.getElementById('detail-view');
  
  if (hash.startsWith('#/influencer/')) {
    const id = hash.split('/')[2];
    listView.classList.add('hidden');
    detailView.classList.remove('hidden');
    renderDetailView(id);
  } else {
    // Default to list view
    detailView.classList.add('hidden');
    listView.classList.remove('hidden');
    renderListView();
  }
}

// List View
function renderListView() {
  const tableContainer = document.getElementById('table-container');
  const paginatedData = getPaginatedData();
  
  if (paginatedData.length === 0) {
    tableContainer.innerHTML = '<div class="empty-state">No influencers found. Try adjusting your filters.</div>';
    renderPagination();
    return;
  }
  
  const columns = [
    { key: 'name', label: 'Name', editable: true },
    { key: 'email', label: 'Email', editable: true },
    { key: 'social_platform', label: 'Platform', editable: true },
    { key: 'social_handle', label: 'Handle', editable: true },
    { key: 'state', label: 'State', editable: true },
    { key: 'followers', label: 'Followers', editable: true },
    { key: 'products', label: 'Product Offers', editable: false },
    { key: 'outreach', label: 'Outreach', editable: false },
    { key: 'actions', label: 'Actions', editable: false }
  ];
  
  let html = '<div class="table-container"><table>';
  html += '<thead><tr>';
  columns.forEach(col => {
    html += `<th>${col.label}</th>`;
  });
  html += '</tr></thead><tbody>';
  
  paginatedData.forEach(influencer => {
    const outreachLog = influencer.outreach_log || {};
    const selectedProducts = outreachLog.offers || [];
    const selectedForOutreach = outreachLog.selected_for_outreach || false;
    
    html += `<tr data-id="${influencer.id}">`;
    
    columns.forEach(col => {
      if (col.key === 'products') {
        // Product toggle buttons
        html += '<td><div class="product-toggles">';
        PRODUCTS.forEach(product => {
          const active = selectedProducts.includes(product);
          html += `<button class="product-toggle ${active ? 'active' : ''}" onclick="toggleProduct('${influencer.id}', '${product}')">${product}</button>`;
        });
        html += '</div></td>';
      } else if (col.key === 'outreach') {
        // Outreach selection checkbox
        html += `<td><div class="checkbox-container">
          <input type="checkbox" ${selectedForOutreach ? 'checked' : ''} onchange="toggleOutreach('${influencer.id}', this.checked)" />
          <label style="font-size: 12px; color: var(--gray-600);">Select</label>
        </div></td>`;
      } else if (col.key === 'actions') {
        html += `<td>
          <button class="btn btn-secondary btn-small save-btn" onclick="saveRow('${influencer.id}')">Save</button>
          <button class="btn btn-primary btn-small" onclick="viewDetail('${influencer.id}')">View/Edit</button>
        </td>`;
      } else {
        const value = influencer[col.key] !== null && influencer[col.key] !== undefined ? influencer[col.key] : '';
        html += `<td contenteditable="${col.editable}" data-col="${col.key}" data-id="${influencer.id}">${escapeHtml(String(value))}</td>`;
      }
    });
    
    html += '</tr>';
  });
  
  html += '</tbody></table></div>';
  tableContainer.innerHTML = html;
  
  renderPagination();
}

window.viewDetail = function(id) {
  window.location.hash = `#/influencer/${id}`;
};

window.saveRow = async function(id) {
  const rowEl = document.querySelector(`tr[data-id="${id}"]`);
  const payload = {};
  
  rowEl.querySelectorAll('td[data-col]').forEach(td => {
    const col = td.getAttribute('data-col');
    let value = td.innerText.trim();
    
    if (col === 'followers') {
      value = value ? parseInt(value, 10) : null;
    } else if (col === 'engagement_rate' || col === 'view_rate') {
      value = value ? parseFloat(value) : null;
    }
    
    payload[col] = value;
  });
  
  try {
    const btn = rowEl.querySelector('.save-btn');
    const originalText = btn.textContent;
    btn.textContent = 'Saving...';
    btn.disabled = true;
    
    const { error } = await supabase.from('influencers').update(payload).eq('id', id);
    
    if (error) {
      alert('Save failed: ' + error.message);
      btn.textContent = originalText;
      btn.disabled = false;
    } else {
      btn.textContent = 'Saved ✓';
      setTimeout(() => {
        btn.textContent = originalText;
        btn.disabled = false;
      }, 1500);
    }
  } catch (err) {
    alert('Save error: ' + err.message);
  }
};

// Product toggle
window.toggleProduct = async function(id, product) {
  const influencer = allInfluencers.find(i => i.id === id);
  if (!influencer) return;
  
  const outreachLog = influencer.outreach_log || {};
  const offers = outreachLog.offers || [];
  
  const index = offers.indexOf(product);
  if (index > -1) {
    offers.splice(index, 1);
  } else {
    offers.push(product);
  }
  
  outreachLog.offers = offers;
  
  try {
    const { error } = await supabase
      .from('influencers')
      .update({ outreach_log: outreachLog })
      .eq('id', id);
    
    if (error) {
      alert('Failed to update product selection: ' + error.message);
    } else {
      // Update local data
      influencer.outreach_log = outreachLog;
      renderListView();
    }
  } catch (err) {
    alert('Error: ' + err.message);
  }
};

// Outreach toggle
window.toggleOutreach = async function(id, selected) {
  const influencer = allInfluencers.find(i => i.id === id);
  if (!influencer) return;
  
  const outreachLog = influencer.outreach_log || {};
  outreachLog.selected_for_outreach = selected;
  
  try {
    const { error } = await supabase
      .from('influencers')
      .update({ outreach_log: outreachLog })
      .eq('id', id);
    
    if (error) {
      alert('Failed to update outreach selection: ' + error.message);
    } else {
      // Update local data
      influencer.outreach_log = outreachLog;
    }
  } catch (err) {
    alert('Error: ' + err.message);
  }
};

// Detail View
function renderDetailView(id) {
  const influencer = allInfluencers.find(i => i.id === id);
  if (!influencer) {
    document.getElementById('detail-content').innerHTML = '<div class="error-message">Influencer not found</div>';
    return;
  }
  
  const outreachLog = influencer.outreach_log || {};
  const selectedProducts = outreachLog.offers || [];
  const selectedForOutreach = outreachLog.selected_for_outreach || false;
  const campaignName = outreachLog.campaign_name || '';
  const customMessage = outreachLog.custom_message || '';
  
  let html = `
    <h2>Edit Influencer: ${escapeHtml(influencer.name || 'Unknown')}</h2>
    
    <div class="form-grid">
      <div class="form-group">
        <label>Name</label>
        <input type="text" class="input" id="detail-name" value="${escapeHtml(influencer.name || '')}" />
      </div>
      <div class="form-group">
        <label>Email</label>
        <input type="email" class="input" id="detail-email" value="${escapeHtml(influencer.email || '')}" />
      </div>
      <div class="form-group">
        <label>Social Platform</label>
        <input type="text" class="input" id="detail-platform" value="${escapeHtml(influencer.social_platform || '')}" />
      </div>
      <div class="form-group">
        <label>Social Handle</label>
        <input type="text" class="input" id="detail-handle" value="${escapeHtml(influencer.social_handle || '')}" />
      </div>
      <div class="form-group">
        <label>Category</label>
        <input type="text" class="input" id="detail-category" value="${escapeHtml(influencer.category || '')}" />
      </div>
      <div class="form-group">
        <label>State</label>
        <input type="text" class="input" id="detail-state" value="${escapeHtml(influencer.state || '')}" />
      </div>
      <div class="form-group">
        <label>Followers</label>
        <input type="number" class="input" id="detail-followers" value="${influencer.followers || ''}" />
      </div>
      <div class="form-group">
        <label>Engagement Rate (%)</label>
        <input type="number" step="0.01" class="input" id="detail-engagement" value="${influencer.engagement_rate || ''}" />
      </div>
      <div class="form-group">
        <label>View Rate (%)</label>
        <input type="number" step="0.01" class="input" id="detail-viewrate" value="${influencer.view_rate || ''}" />
      </div>
      <div class="form-group">
        <label>Campaign Name</label>
        <input type="text" class="input" id="detail-campaign" value="${escapeHtml(campaignName)}" placeholder="Optional campaign identifier" />
      </div>
    </div>
    
    <div class="form-group" style="margin-bottom: var(--spacing-xl);">
      <label>Custom Message (for CSV export)</label>
      <textarea class="input" id="detail-custom-message" placeholder="Optional personalized message for outreach">${escapeHtml(customMessage)}</textarea>
    </div>
    
    <div class="form-group" style="margin-bottom: var(--spacing-xl);">
      <label>Notes</label>
      <textarea class="input" id="detail-notes">${escapeHtml(influencer.notes || '')}</textarea>
    </div>
    
    <div class="form-group" style="margin-bottom: var(--spacing-lg);">
      <label style="font-size: 16px; margin-bottom: var(--spacing-sm);">Product Offers</label>
      <div class="product-toggles">
        ${PRODUCTS.map(product => {
          const active = selectedProducts.includes(product);
          return `<button class="product-toggle ${active ? 'active' : ''}" onclick="toggleProductDetail('${product}')">${product}</button>`;
        }).join('')}
      </div>
    </div>
    
    <div class="form-group" style="margin-bottom: var(--spacing-xl);">
      <div class="checkbox-container">
        <input type="checkbox" id="detail-outreach" ${selectedForOutreach ? 'checked' : ''} />
        <label for="detail-outreach" style="font-weight: 600;">Select for outreach campaign</label>
      </div>
    </div>
    
    <div class="form-actions">
      <button class="btn btn-primary" onclick="saveDetail('${id}')">Save Changes</button>
      <button class="btn btn-secondary" onclick="goBackToList()">← Back to List</button>
    </div>
  `;
  
  document.getElementById('detail-content').innerHTML = html;
  
  // Store current selection in memory for toggles
  window.currentDetailProducts = [...selectedProducts];
}

window.toggleProductDetail = function(product) {
  if (!window.currentDetailProducts) {
    window.currentDetailProducts = [];
  }
  
  const index = window.currentDetailProducts.indexOf(product);
  if (index > -1) {
    window.currentDetailProducts.splice(index, 1);
  } else {
    window.currentDetailProducts.push(product);
  }
  
  // Update button appearance
  const buttons = document.querySelectorAll('.product-toggle');
  buttons.forEach(btn => {
    if (btn.textContent === product) {
      btn.classList.toggle('active');
    }
  });
};

window.saveDetail = async function(id) {
  const influencer = allInfluencers.find(i => i.id === id);
  if (!influencer) return;
  
  // Gather form data
  const payload = {
    name: document.getElementById('detail-name').value.trim(),
    email: document.getElementById('detail-email').value.trim(),
    social_platform: document.getElementById('detail-platform').value.trim(),
    social_handle: document.getElementById('detail-handle').value.trim(),
    category: document.getElementById('detail-category').value.trim(),
    state: document.getElementById('detail-state').value.trim(),
    followers: parseInt(document.getElementById('detail-followers').value) || null,
    engagement_rate: parseFloat(document.getElementById('detail-engagement').value) || null,
    view_rate: parseFloat(document.getElementById('detail-viewrate').value) || null,
    notes: document.getElementById('detail-notes').value.trim(),
    outreach_log: {
      offers: window.currentDetailProducts || [],
      selected_for_outreach: document.getElementById('detail-outreach').checked,
      campaign_name: document.getElementById('detail-campaign').value.trim(),
      custom_message: document.getElementById('detail-custom-message').value.trim()
    }
  };
  
  try {
    const saveBtn = document.querySelector('.btn-primary');
    saveBtn.textContent = 'Saving...';
    saveBtn.disabled = true;
    
    const { error } = await supabase
      .from('influencers')
      .update(payload)
      .eq('id', id);
    
    if (error) {
      alert('Save failed: ' + error.message);
      saveBtn.textContent = 'Save Changes';
      saveBtn.disabled = false;
    } else {
      // Update local data
      Object.assign(influencer, payload);
      
      saveBtn.textContent = 'Saved ✓';
      setTimeout(() => {
        window.location.hash = '#/list';
      }, 800);
    }
  } catch (err) {
    alert('Save error: ' + err.message);
  }
};

window.goBackToList = function() {
  window.location.hash = '#/list';
};

// CSV Export
async function exportCSV(mode = 'selected') {
  let dataToExport = [];
  
  if (mode === 'selected') {
    dataToExport = allInfluencers.filter(i => (i.outreach_log || {}).selected_for_outreach === true);
    if (dataToExport.length === 0) {
      alert('No influencers selected for outreach. Please select at least one influencer.');
      return;
    }
  } else if (mode === 'filtered') {
    dataToExport = filteredInfluencers;
    if (dataToExport.length === 0) {
      alert('No influencers match current filters.');
      return;
    }
  } else {
    // Export all
    dataToExport = allInfluencers;
  }
  
  // Check if user wants to mark as contacted
  const markContacted = document.getElementById('mark-contacted')?.checked || false;
  
  // Convert to CSV
  const csvData = dataToExport.map(influencer => {
    const outreachLog = influencer.outreach_log || {};
    const offeredProducts = (outreachLog.offers || []).join(', ');
    const campaignName = outreachLog.campaign_name || '';
    const customMessage = outreachLog.custom_message || '';
    
    return {
      name: influencer.name || '',
      email: influencer.email || '',
      offered_products: offeredProducts,
      social_platform: influencer.social_platform || '',
      social_handle: influencer.social_handle || '',
      followers: influencer.followers || '',
      notes: influencer.notes || '',
      influencer_id: influencer.id,
      campaign_name: campaignName,
      custom_message: customMessage
    };
  });
  
  const csv = convertToCSV(csvData);
  
  // Download CSV
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `viakix_influencers_${mode}_${Date.now()}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Mark as contacted if requested
  if (markContacted && mode === 'selected') {
    const ids = dataToExport.map(i => i.id);
    try {
      const { error } = await supabase
        .from('influencers')
        .update({ contacted: true })
        .in('id', ids);
      
      if (error) {
        alert('Export completed, but failed to mark as contacted: ' + error.message);
      } else {
        alert(`Exported ${dataToExport.length} influencer(s) and marked as contacted.`);
        // Reload data
        await loadInfluencers();
      }
    } catch (err) {
      alert('Export completed, but error marking as contacted: ' + err.message);
    }
  } else {
    alert(`Exported ${dataToExport.length} influencer(s) successfully.`);
  }
  
  // Close dropdown
  closeAllDropdowns();
}

function convertToCSV(data) {
  if (!data || data.length === 0) return '';
  
  const headers = Object.keys(data[0]);
  const csvRows = [];
  
  // Add header row
  csvRows.push(headers.join(','));
  
  // Add data rows
  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header] === null || row[header] === undefined ? '' : String(row[header]);
      // Escape quotes and wrap in quotes if contains comma, quote, or newline
      const escaped = value.replace(/"/g, '""');
      return escaped.includes(',') || escaped.includes('"') || escaped.includes('\n') ? `"${escaped}"` : escaped;
    });
    csvRows.push(values.join(','));
  }
  
  return csvRows.join('\n');
}

// Event Listeners
function setupEventListeners() {
  // Auth
  document.getElementById('signin').addEventListener('click', handleSignIn);
  document.getElementById('signout').addEventListener('click', handleSignOut);
  
  // Refresh
  document.getElementById('refresh').addEventListener('click', () => {
    loadInfluencers();
  });
  
  // Filters
  document.getElementById('state-filter').addEventListener('change', (e) => {
    filters.state = e.target.value;
    applyFilters();
    renderListView();
  });
  
  document.getElementById('search-input').addEventListener('input', (e) => {
    filters.search = e.target.value;
    applyFilters();
    renderListView();
  });
  
  // Export dropdown
  document.getElementById('export-toggle').addEventListener('click', (e) => {
    e.stopPropagation();
    const dropdown = document.getElementById('export-dropdown');
    dropdown.classList.toggle('active');
  });
  
  // Export options
  document.getElementById('export-selected').addEventListener('click', () => {
    exportCSV('selected');
  });
  
  document.getElementById('export-filtered').addEventListener('click', () => {
    exportCSV('filtered');
  });
  
  document.getElementById('export-all').addEventListener('click', () => {
    exportCSV('all');
  });
  
  // Close dropdowns when clicking outside
  document.addEventListener('click', () => {
    closeAllDropdowns();
  });
}

function closeAllDropdowns() {
  document.querySelectorAll('.dropdown').forEach(dropdown => {
    dropdown.classList.remove('active');
  });
}

// Utility functions
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
