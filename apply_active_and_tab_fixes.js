const fs = require('fs');

// 1. Update portal.html
let html = fs.readFileSync('portal.html', 'utf8');

// Disable audit all and inactive tabs
html = html.replace(
  '<button class="tab-btn" id="audit-tab-all">All</button>',
  '<button class="tab-btn" id="audit-tab-all" disabled style="opacity:0.35; cursor:not-allowed; pointer-events:none;" title="Disabled: Active employees only">All</button>'
);
html = html.replace(
  '<button class="tab-btn" id="audit-tab-inactive" style="color: #b91c1c; font-weight: 700;">Inactive</button>',
  '<button class="tab-btn" id="audit-tab-inactive" disabled style="opacity:0.35; cursor:not-allowed; pointer-events:none; color: #b91c1c;" title="Disabled: Active employees only">Inactive</button>'
);

// Disable att all and inactive tabs
html = html.replace(
  '<button class="tab-btn" id="att-tab-all">All Roster (27,762)</button>',
  '<button class="tab-btn" id="att-tab-all" disabled style="opacity:0.35; cursor:not-allowed; pointer-events:none;" title="Disabled: Active employees only">All Roster (27,766)</button>'
);
html = html.replace(
  '<button class="tab-btn" id="att-tab-inactive">Inactive (16,472)</button>',
  '<button class="tab-btn" id="att-tab-inactive" disabled style="opacity:0.35; cursor:not-allowed; pointer-events:none;" title="Disabled: Active employees only">Inactive (16,479)</button>'
);

fs.writeFileSync('portal.html', html, 'utf8');
fs.writeFileSync('www/portal.html', html, 'utf8');
console.log('✅ portal.html and www/portal.html updated with disabled tabs.');

// 2. Update portal.js
let js = fs.readFileSync('portal.js', 'utf8');

// Ensure switchAuditTab ignores disabled tabs
const oldSwitchAudit = `function switchAuditTab(tabName, clickedBtn) {
  currentSelectedTab = tabName;
  auditCurrentPage = 1;
  document.querySelectorAll("#audit-tab-all, #audit-tab-active, #audit-tab-inactive, #audit-tab-registered, #audit-tab-unregistered").forEach(btn => {
    btn.classList.remove("active");
  });
  if (clickedBtn) clickedBtn.classList.add("active");
  renderEmployeeAuditList();
}`;

const newSwitchAudit = `function switchAuditTab(tabName, clickedBtn) {
  if (tabName === 'all' || tabName === 'inactive') return;
  currentSelectedTab = tabName;
  auditCurrentPage = 1;
  document.querySelectorAll("#audit-tab-all, #audit-tab-active, #audit-tab-inactive, #audit-tab-registered, #audit-tab-unregistered").forEach(btn => {
    btn.classList.remove("active");
  });
  if (clickedBtn) clickedBtn.classList.add("active");
  renderEmployeeAuditList();
}`;

js = js.replace(oldSwitchAudit, newSwitchAudit);

// Ensure switchAttTab ignores disabled tabs
const oldSwitchAtt = `function switchAttTab(tabName, clickedBtn) {
  currentAttTab = tabName;
  attCurrentPage = 1;
  document.querySelectorAll("#att-tab-all, #att-tab-active, #att-tab-inactive, #att-tab-present, #att-tab-absent").forEach(btn => {
    btn.classList.remove("active");
  });
  if (clickedBtn) clickedBtn.classList.add("active");
  renderAttendanceBoard();
}`;

const newSwitchAtt = `function switchAttTab(tabName, clickedBtn) {
  if (tabName === 'all' || tabName === 'inactive') return;
  currentAttTab = tabName;
  attCurrentPage = 1;
  document.querySelectorAll("#att-tab-all, #att-tab-active, #att-tab-inactive, #att-tab-present, #att-tab-absent").forEach(btn => {
    btn.classList.remove("active");
  });
  if (clickedBtn) clickedBtn.classList.add("active");
  renderAttendanceBoard();
}`;

js = js.replace(oldSwitchAtt, newSwitchAtt);

// Ensure renderAttendanceBoard pagination reflects exact active/filtered display count
const oldAttPag = `  // Calculate attendance table pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / attPageSize));
  if (attCurrentPage > totalPages) attCurrentPage = totalPages;
  if (attCurrentPage < 1) attCurrentPage = 1;

  const startIdx = (attCurrentPage - 1) * attPageSize;
  const endIdx = Math.min(startIdx + attPageSize, filtered.length);
  const pageItems = filtered.slice(startIdx, endIdx);

  // Update attendance pagination DOM indicators
  const infoEl = document.getElementById("att-pagination-info");
  if (infoEl) {
    infoEl.textContent = filtered.length === 0 
      ? \`Showing 0 of 0\` 
      : \`Showing \${startIdx + 1}–\${endIdx} of \${filtered.length}\`;
  }`;

const newAttPag = `  // Calculate attendance table pagination
  const totalDisplay = (currentAttTab === 'present') ? presentCount : ((currentAttTab === 'absent') ? absentCount : activeStaffCount);
  const totalPages = Math.max(1, Math.ceil(totalDisplay / attPageSize));
  if (attCurrentPage > totalPages) attCurrentPage = totalPages;
  if (attCurrentPage < 1) attCurrentPage = 1;

  const startIdx = (attCurrentPage - 1) * attPageSize;
  const endIdx = Math.min(startIdx + attPageSize, totalDisplay);
  const pageItems = filtered.slice(startIdx, endIdx);

  // Update attendance pagination DOM indicators
  const infoEl = document.getElementById("att-pagination-info");
  if (infoEl) {
    infoEl.textContent = totalDisplay === 0 
      ? \`Showing 0 of 0\` 
      : \`Showing \${startIdx + 1}–\${endIdx} of \${totalDisplay.toLocaleString()}\`;
  }`;

js = js.replace(oldAttPag, newAttPag);

// Ensure renderEmployeeAuditList pagination reflects active count
const oldAuditPag = `  // Calculate pagination
  const totalDisplay = isUnfiltered && currentSelectedTab === 'active' ? 11287 : filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalDisplay / auditPageSize));
  if (auditCurrentPage > totalPages) auditCurrentPage = totalPages;
  if (auditCurrentPage < 1) auditCurrentPage = 1;

  const startIdx = (auditCurrentPage - 1) * auditPageSize;
  const endIdx = Math.min(startIdx + auditPageSize, totalDisplay);
  const pageItems = filtered.slice(startIdx, endIdx);

  // Update pagination DOM indicators
  const infoEl = document.getElementById("audit-pagination-info");
  if (infoEl) {
    infoEl.textContent = totalDisplay === 0 
      ? \`Showing 0 of 0\` 
      : \`Showing \${startIdx + 1}–\${endIdx} of \${totalDisplay.toLocaleString()}\`;
  }`;

const newAuditPag = `  // Calculate pagination
  const totalDisplay = (currentSelectedTab === 'registered') ? registeredCount : ((currentSelectedTab === 'unregistered') ? unregisteredCount : activeCount);
  const totalPages = Math.max(1, Math.ceil(totalDisplay / auditPageSize));
  if (auditCurrentPage > totalPages) auditCurrentPage = totalPages;
  if (auditCurrentPage < 1) auditCurrentPage = 1;

  const startIdx = (auditCurrentPage - 1) * auditPageSize;
  const endIdx = Math.min(startIdx + auditPageSize, totalDisplay);
  const pageItems = filtered.slice(startIdx, endIdx);

  // Update pagination DOM indicators
  const infoEl = document.getElementById("audit-pagination-info");
  if (infoEl) {
    infoEl.textContent = totalDisplay === 0 
      ? \`Showing 0 of 0\` 
      : \`Showing \${startIdx + 1}–\${endIdx} of \${totalDisplay.toLocaleString()}\`;
  }`;

js = js.replace(oldAuditPag, newAuditPag);

fs.writeFileSync('portal.js', js, 'utf8');
fs.writeFileSync('www/portal.js', js, 'utf8');
console.log('✅ portal.js and www/portal.js updated.');
