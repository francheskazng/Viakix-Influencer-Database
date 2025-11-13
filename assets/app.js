// Viakix Influencer Database - Application Logic

// Supabase configuration (from environment or embedded)
const SUPABASE_URL = window.SUPABASE_URL || 'https://qrpfvpabycejszblghan.supabase.co';
const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFycGZ2cGFieWNlanN6YmxnaGFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwMjgxMTEsImV4cCI6MjA3ODYwNDExMX0.zzByoK0opa6uwNVlZnaKqHil69X1pE4Y_5V0lWI5txk';

// Global state
let supabase;
let allData = [];
let filteredData = [];
let currentPage = 1;
let pageSize = 10;
let currentUser = null;
let currentView = 'list'; // 'list' or 'detail'
let currentDetailId = null;

// Initialize the application
async function init() {
  // Dynamically import Supabase
  const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm');
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
  // Set up event listeners
  setupEventListeners();
  
  // Check session
  await checkSession();
  
  // Parse URL hash for routing
  parseRoute();
  
  // Load data
  await loadData();
  
  // Subscribe to realtime changes
  subscribeToChanges();
}

// Parse URL hash for client-side routing
function parseRoute() {
  const hash = window.location.hash;
  if (hash.startsWith('#detail/')) {
    const id = hash.replace('#detail/', '');
    showDetailView(id);
  } else {
    showListView();
  }
}

// Set up all event listeners
function setupEventListeners() {
  // Navigation
  window.addEventListener('hashchange', parseRoute);
  
  // Filters and search
  document.getElementById('state-filter')?.addEventListener('change', applyFilters);
  document.getElementById('search-box')?.addEventListener('input', applyFilters);
  
  // Pagination
  document.getElementById('prev-page')?.addEventListener('click', () => changePage(-1));
  document.getElementById('next-page')?.addEventListener('click', () => changePage(1));
  
  // Actions
  document.getElementById('refresh')?.addEventListener('click', loadData);
  document.getElementById('export')?.addEventListener('click', exportCSV);
  
  // Auth
  document.getElementById('signin')?.addEventListener('click', signIn);
  document.getElementById('signout')?.addEventListener('click', signOut);
  
  // Detail view
  document.getElementById('save-detail')?.addEventListener('click', saveDetail);
  document.getElementById('back-to-list')?.addEventListener('click', () => {
    window.location.hash = '';
  });
}

// Load data from Supabase
async function loadData() {
  const tableWrap = document.getElementById('table-wrap');
  if (tableWrap) {
    tableWrap.innerHTML = '<div class="loading">Loading...</div>';
  }
  
  try {
    const { data, error } = await supabase
      .from('influencers')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);
    
    if (error) {
      throw error;
    }
    
    allData = data || [];
    
    // Populate state filter
    populateStateFilter();
    
    // Apply filters and render
    applyFilters();
  } catch (error) {
    if (tableWrap) {
      tableWrap.innerHTML = `<div class="empty-state" style="color: #dc2626;">Error loading data: ${error.message}</div>`;
    }
  }
}

// Populate state filter dropdown with unique states
function populateStateFilter() {
  const stateFilter = document.getElementById('state-filter');
  if (!stateFilter) return;
  
  const states = [...new Set(allData.map(row => row.state).filter(s => s))].sort();
  
  // Keep "All states" option and add unique states
  const currentValue = stateFilter.value;
  stateFilter.innerHTML = '<option value="">All states</option>';
  
  states.forEach(state => {
    const option = document.createElement('option');
    option.value = state;
    option.textContent = state;
    stateFilter.appendChild(option);
  });
  
  // Restore selection if it still exists
  if (currentValue && states.includes(currentValue)) {
    stateFilter.value = currentValue;
  }
}

// Apply filters and search
function applyFilters() {
  const stateFilter = document.getElementById('state-filter')?.value || '';
  const searchBox = document.getElementById('search-box')?.value.toLowerCase() || '';
  
  filteredData = allData.filter(row => {
    // State filter
    if (stateFilter && row.state !== stateFilter) {
      return false;
    }
    
    // Search filter (name or handle)
    if (searchBox) {
      const name = (row.name || '').toLowerCase();
      const handle = (row.social_handle || '').toLowerCase();
      if (!name.includes(searchBox) && !handle.includes(searchBox)) {
        return false;
      }
    }
    
    return true;
  });
  
  // Reset to first page
  currentPage = 1;
  
  // Render based on current view
  if (currentView === 'list') {
    renderTable();
  }
}

// Render the table with pagination
function renderTable() {
  const tableWrap = document.getElementById('table-wrap');
  if (!tableWrap) return;
  
  if (!filteredData.length) {
    tableWrap.innerHTML = '<div class="empty-state">No influencers found. Try adjusting your filters.</div>';
    updatePaginationInfo(0, 0, 0);
    return;
  }
  
  // Calculate pagination
  const startIdx = (currentPage - 1) * pageSize;
  const endIdx = Math.min(startIdx + pageSize, filteredData.length);
  const pageData = filteredData.slice(startIdx, endIdx);
  
  // Table columns
  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'social_platform', label: 'Platform' },
    { key: 'social_handle', label: 'Handle' },
    { key: 'category', label: 'Category' },
    { key: 'state', label: 'State' },
    { key: 'followers', label: 'Followers' },
    { key: 'engagement_rate', label: 'Engagement %' },
    { key: 'view_rate', label: 'View %' }
  ];
  
  // Build table HTML
  const ths = columns.map(col => `<th>${col.label}</th>`).join('') + '<th>Actions</th>';
  
  const trs = pageData.map(row => {
    const cells = columns.map(col => {
      const val = row[col.key] === null || row[col.key] === undefined ? '' : row[col.key];
      const editable = col.key !== 'contacted';
      return `<td contenteditable="${editable}" data-col="${col.key}" data-id="${row.id}">${escapeHtml(String(val))}</td>`;
    }).join('');
    
    return `<tr data-id="${row.id}">
      ${cells}
      <td>
        <button class="btn small save-btn" data-id="${row.id}">Save</button>
        <button class="btn small secondary view-btn" data-id="${row.id}">View/Edit</button>
      </td>
    </tr>`;
  }).join('');
  
  tableWrap.innerHTML = `
    <div class="table-container">
      <div class="table-wrapper">
        <table>
          <thead><tr>${ths}</tr></thead>
          <tbody>${trs}</tbody>
        </table>
      </div>
      <div class="pagination">
        <div class="pagination-info" id="pagination-info"></div>
        <div class="pagination-controls">
          <button class="btn secondary small" id="prev-page" ${currentPage === 1 ? 'disabled' : ''}>Prev</button>
          <div id="page-numbers"></div>
          <button class="btn secondary small" id="next-page" ${endIdx >= filteredData.length ? 'disabled' : ''}>Next</button>
        </div>
      </div>
    </div>
  `;
  
  // Update pagination info
  updatePaginationInfo(startIdx + 1, endIdx, filteredData.length);
  
  // Attach event listeners
  attachTableListeners();
  
  // Re-attach pagination listeners
  document.getElementById('prev-page')?.addEventListener('click', () => changePage(-1));
  document.getElementById('next-page')?.addEventListener('click', () => changePage(1));
}

// Attach event listeners to table buttons
function attachTableListeners() {
  // Save buttons
  document.querySelectorAll('.save-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = btn.dataset.id;
      await saveRow(id, btn);
    });
  });
  
  // View/Edit buttons
  document.querySelectorAll('.view-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      window.location.hash = `detail/${id}`;
    });
  });
}

// Save a row from inline editing
async function saveRow(id, btnElement) {
  const rowEl = document.querySelector(`tr[data-id="${id}"]`);
  if (!rowEl) return;
  
  const payload = {};
  rowEl.querySelectorAll('td[data-id]').forEach(td => {
    const col = td.getAttribute('data-col');
    let v = td.innerText.trim();
    
    // Type conversion
    if (col === 'followers') {
      v = v ? parseInt(v, 10) : null;
    } else if (col === 'engagement_rate' || col === 'view_rate') {
      v = v ? parseFloat(v) : null;
    }
    
    payload[col] = v;
  });
  
  try {
    const { error } = await supabase
      .from('influencers')
      .update(payload)
      .eq('id', id);
    
    if (error) {
      alert('Save failed: ' + error.message);
    } else {
      btnElement.textContent = 'Saved!';
      setTimeout(() => {
        btnElement.textContent = 'Save';
      }, 1200);
    }
  } catch (err) {
    alert('Save error: ' + err.message);
  }
}

// Show detail view for a specific influencer
function showDetailView(id) {
  currentView = 'detail';
  currentDetailId = id;
  
  const listView = document.getElementById('list-view');
  const detailView = document.getElementById('detail-view');
  
  if (listView) listView.classList.add('hidden');
  if (detailView) detailView.classList.remove('hidden');
  
  // Find the record
  const record = allData.find(r => r.id === id);
  if (!record) {
    detailView.innerHTML = '<div class="empty-state">Record not found</div>';
    return;
  }
  
  // Render detail form
  renderDetailForm(record);
}

// Render detail/edit form
function renderDetailForm(record) {
  const detailView = document.getElementById('detail-view');
  if (!detailView) return;
  
  const fields = [
    { key: 'name', label: 'Name', type: 'text' },
    { key: 'email', label: 'Email', type: 'email' },
    { key: 'social_platform', label: 'Social Platform', type: 'text' },
    { key: 'social_handle', label: 'Social Handle', type: 'text' },
    { key: 'category', label: 'Category', type: 'text' },
    { key: 'state', label: 'State', type: 'text' },
    { key: 'followers', label: 'Followers', type: 'number' },
    { key: 'engagement_rate', label: 'Engagement Rate (%)', type: 'number', step: '0.01' },
    { key: 'view_rate', label: 'View Rate (%)', type: 'number', step: '0.01' }
  ];
  
  const formFields = fields.map(field => {
    const value = record[field.key] ?? '';
    return `
      <div class="form-field">
        <label for="detail-${field.key}">${field.label}</label>
        <input 
          type="${field.type}" 
          id="detail-${field.key}" 
          class="input" 
          value="${escapeHtml(String(value))}"
          ${field.step ? `step="${field.step}"` : ''}
        />
      </div>
    `;
  }).join('');
  
  detailView.innerHTML = `
    <div class="detail-header">
      <h2>Edit Influencer</h2>
      <button class="btn secondary" id="back-to-list">← Back to List</button>
    </div>
    <div class="form-grid">
      ${formFields}
    </div>
    <div class="form-actions">
      <button class="btn" id="save-detail">Save Changes</button>
      <button class="btn secondary" id="cancel-detail">Cancel</button>
    </div>
  `;
  
  // Attach listeners
  document.getElementById('back-to-list')?.addEventListener('click', () => {
    window.location.hash = '';
  });
  document.getElementById('cancel-detail')?.addEventListener('click', () => {
    window.location.hash = '';
  });
  document.getElementById('save-detail')?.addEventListener('click', saveDetail);
}

// Save detail form
async function saveDetail() {
  if (!currentDetailId) return;
  
  const payload = {};
  const fields = ['name', 'email', 'social_platform', 'social_handle', 'category', 'state', 'followers', 'engagement_rate', 'view_rate'];
  
  fields.forEach(field => {
    const input = document.getElementById(`detail-${field}`);
    if (!input) return;
    
    let value = input.value.trim();
    
    // Type conversion
    if (field === 'followers') {
      value = value ? parseInt(value, 10) : null;
    } else if (field === 'engagement_rate' || field === 'view_rate') {
      value = value ? parseFloat(value) : null;
    }
    
    payload[field] = value;
  });
  
  try {
    const { error } = await supabase
      .from('influencers')
      .update(payload)
      .eq('id', currentDetailId);
    
    if (error) {
      alert('Save failed: ' + error.message);
    } else {
      // Update local data
      const idx = allData.findIndex(r => r.id === currentDetailId);
      if (idx !== -1) {
        allData[idx] = { ...allData[idx], ...payload };
      }
      
      // Show success and go back
      alert('Changes saved successfully!');
      window.location.hash = '';
    }
  } catch (err) {
    alert('Save error: ' + err.message);
  }
}

// Show list view
function showListView() {
  currentView = 'list';
  currentDetailId = null;
  
  const listView = document.getElementById('list-view');
  const detailView = document.getElementById('detail-view');
  
  if (listView) listView.classList.remove('hidden');
  if (detailView) detailView.classList.add('hidden');
  
  renderTable();
}

// Change page
function changePage(delta) {
  const totalPages = Math.ceil(filteredData.length / pageSize);
  const newPage = currentPage + delta;
  
  if (newPage < 1 || newPage > totalPages) return;
  
  currentPage = newPage;
  renderTable();
}

// Update pagination info
function updatePaginationInfo(start, end, total) {
  const paginationInfo = document.getElementById('pagination-info');
  if (paginationInfo) {
    paginationInfo.textContent = `Showing ${start}-${end} of ${total}`;
  }
  
  // Update page numbers
  const pageNumbers = document.getElementById('page-numbers');
  if (pageNumbers) {
    const totalPages = Math.ceil(total / pageSize);
    const pages = [];
    
    // Show up to 5 page numbers
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + 4);
    
    if (endPage - startPage < 4) {
      startPage = Math.max(1, endPage - 4);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(`
        <span class="page-number ${i === currentPage ? 'active' : ''}" data-page="${i}">
          ${i}
        </span>
      `);
    }
    
    pageNumbers.innerHTML = pages.join('');
    
    // Attach click handlers
    pageNumbers.querySelectorAll('.page-number').forEach(el => {
      el.addEventListener('click', () => {
        currentPage = parseInt(el.dataset.page, 10);
        renderTable();
      });
    });
  }
}

// Export filtered data to CSV
async function exportCSV() {
  if (!filteredData.length) {
    alert('No data to export');
    return;
  }
  
  const csv = convertToCSV(filteredData);
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `influencers_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// Convert array to CSV
function convertToCSV(arr) {
  if (!arr || !arr.length) return '';
  
  const keys = Object.keys(arr[0]);
  const header = keys.join(',') + '\n';
  const rows = arr.map(r => 
    keys.map(k => `"${String(r[k] ?? '').replace(/"/g, '""')}"`).join(',')
  ).join('\n');
  
  return header + rows;
}

// Authentication
async function checkSession() {
  try {
    const { data } = await supabase.auth.getSession();
    currentUser = data.session?.user ?? null;
    updateAuthUI();
  } catch (err) {
    console.error('Session check error:', err);
  }
}

function updateAuthUI() {
  const signinBtn = document.getElementById('signin');
  const signoutBtn = document.getElementById('signout');
  const emailInput = document.getElementById('email');
  
  if (currentUser) {
    if (signinBtn) signinBtn.style.display = 'none';
    if (emailInput) emailInput.style.display = 'none';
    if (signoutBtn) {
      signoutBtn.style.display = 'inline-block';
      signoutBtn.textContent = `Sign out (${currentUser.email || currentUser.id})`;
    }
  } else {
    if (signinBtn) signinBtn.style.display = 'inline-block';
    if (emailInput) emailInput.style.display = 'inline-block';
    if (signoutBtn) signoutBtn.style.display = 'none';
  }
}

async function signIn() {
  const emailInput = document.getElementById('email');
  const email = emailInput?.value.trim();
  
  if (!email) {
    alert('Please enter an email address');
    return;
  }
  
  try {
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) {
      alert('Sign-in error: ' + error.message);
    } else {
      alert('Magic link sent! Check your email and click the link in the same browser.');
    }
  } catch (err) {
    alert('Sign-in error: ' + err.message);
  }
}

async function signOut() {
  try {
    await supabase.auth.signOut();
    currentUser = null;
    updateAuthUI();
  } catch (err) {
    console.error('Sign out error:', err);
  }
}

// Subscribe to realtime changes
function subscribeToChanges() {
  supabase
    .channel('public:influencers')
    .on('postgres_changes', { 
      event: '*', 
      schema: 'public', 
      table: 'influencers' 
    }, () => {
      loadData();
    })
    .subscribe();
}

// Utility function
function escapeHtml(s) {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

// Initialize on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
