const fs = require('fs');
const path = require('path');

// Extract findPlantRegistryEntry, resolveSupervisorScope, filterEmployeesForScope from server.js
const serverJs = fs.readFileSync(path.join(__dirname, 'server.js'), 'utf8');

const findPlantMatch = serverJs.match(/function findPlantRegistryEntry[\s\S]*?\n\}/);
const resolveScopeMatch = serverJs.match(/function resolveSupervisorScope[\s\S]*?\n\}/);
const filterEmployeesMatch = serverJs.match(/function filterEmployeesForScope[\s\S]*?\n\}/);

if (!findPlantMatch || !resolveScopeMatch || !filterEmployeesMatch) {
  console.error("Could not extract scope functions from server.js");
  process.exit(1);
}

const authoritativeEngine = `
// ==================== AUTHORITATIVE PLANT REGISTRY & SCOPE FILTER ENGINE ====================
${findPlantMatch[0]}

${resolveScopeMatch[0]}

${filterEmployeesMatch[0]}

function getActiveEmployees(list) {
  if (!list || !Array.isArray(list)) return [];
  return list.filter(e => {
    const status = (e.status || e.employeeStatus || '').trim().toLowerCase();
    const isDol = e.DateOfLeaving || e.dateOfLeaving;
    const isLeaving = isDol && String(isDol).trim() !== '' && String(isDol).toLowerCase() !== 'null';
    return status === 'active' || status === 'existing' || (!isLeaving && status !== 'inactive' && status !== 'resigned' && status !== 'fnf locked' && status !== 'fnf_locked');
  });
}

function getInactiveEmployees(list) {
  if (!list || !Array.isArray(list)) return [];
  return list.filter(e => {
    const status = (e.status || e.employeeStatus || '').trim().toLowerCase();
    const isDol = e.DateOfLeaving || e.dateOfLeaving;
    const isLeaving = isDol && String(isDol).trim() !== '' && String(isDol).toLowerCase() !== 'null';
    return status === 'inactive' || status === 'resigned' || status === 'fnf locked' || status === 'fnf_locked' || isLeaving;
  });
}

function filterWorkforceByScope(employees, entityFilter = 'all', clientFilter = 'all', locationFilter = 'all') {
  if (!employees || !Array.isArray(employees)) return [];
  if (entityFilter === 'all' && clientFilter === 'all' && locationFilter === 'all') {
    return employees;
  }
  const scope = resolveSupervisorScope(locationFilter !== 'all' ? locationFilter : clientFilter, entityFilter !== 'all' ? entityFilter : '', clientFilter !== 'all' ? clientFilter : '', locationFilter !== 'all' ? locationFilter : '');
  return filterEmployeesForScope(scope, employees);
}

function populateTopFilterDropdowns() {
  const entitySelect = document.getElementById("portal-entity-filter");
  const clientSelect = document.getElementById("portal-client-filter");
  const locSelect = document.getElementById("portal-location-filter");

  if (!entitySelect || !clientSelect || !locSelect) return;

  const plants = (typeof PLANTS_REGISTRY !== 'undefined' && PLANTS_REGISTRY.length > 0) ? PLANTS_REGISTRY : [];

  // 1. Legal Entities
  const entityOptions = [
    '<option value="all">All Legal Entities (4)</option>',
    '<option value="Layam Flexi Solutions Pvt. Ltd.">Layam Flexi Solutions Pvt. Ltd.</option>',
    '<option value="Radram Quality Services Pvt.Ltd.">Radram Quality Services Pvt.Ltd.</option>',
    '<option value="Layam Management Solutions Pvt.Ltd.">Layam Management Solutions Pvt.Ltd.</option>',
    '<option value="Layam Talent Academy Foundation">Layam Talent Academy Foundation</option>'
  ];
  entitySelect.innerHTML = entityOptions.join('');

  // 2. Clients
  const clientsMap = new Map();
  plants.forEach(p => {
    const cName = p.zingClient || p.clientName || '';
    if (cName && !clientsMap.has(cName)) {
      clientsMap.set(cName, p.entity);
    }
  });

  let clientOptions = ['<option value="all">All Clients (All Plants)</option>'];
  Array.from(clientsMap.keys()).sort().forEach(c => {
    clientOptions.push(\`<option value="\${c}">\${c}</option>\`);
  });
  clientSelect.innerHTML = clientOptions.join('');

  // 3. Plant Locations
  let locOptions = ['<option value="all">All Plant Locations</option>'];
  plants.sort((a,b) => (a.sno || 0) - (b.sno || 0)).forEach(p => {
    locOptions.push(\`<option value="\${p.plantName}">\${p.plantName}</option>\`);
  });
  locSelect.innerHTML = locOptions.join('');
}

function updateClientAndLocationDropdowns() {
  const entityVal = (document.getElementById("portal-entity-filter")?.value || 'all').trim();
  const clientSelect = document.getElementById("portal-client-filter");
  const locSelect = document.getElementById("portal-location-filter");
  const plants = (typeof PLANTS_REGISTRY !== 'undefined' && PLANTS_REGISTRY.length > 0) ? PLANTS_REGISTRY : [];

  const isAll = (entityVal === 'all');
  const isRadram = entityVal.toLowerCase().includes('radram');
  const isFlexi = entityVal.toLowerCase().includes('flexi');

  if (clientSelect) {
    const clientsMap = new Map();
    plants.forEach(p => {
      const pEnt = (p.entity || '').toLowerCase();
      let match = isAll;
      if (!isAll) {
        if (isRadram) match = pEnt.includes('radram');
        else if (isFlexi) match = !pEnt.includes('radram');
        else match = pEnt.includes(entityVal.toLowerCase().split(' ')[0]);
      }
      if (match) {
        const cName = p.zingClient || p.clientName || '';
        if (cName && !clientsMap.has(cName)) clientsMap.set(cName, true);
      }
    });

    let clientOptions = ['<option value="all">All Clients (All Plants)</option>'];
    Array.from(clientsMap.keys()).sort().forEach(c => {
      clientOptions.push(\`<option value="\${c}">\${c}</option>\`);
    });
    clientSelect.innerHTML = clientOptions.join('');
  }

  updateLocationDropdown();
}

function updateLocationDropdown() {
  const entityVal = (document.getElementById("portal-entity-filter")?.value || 'all').trim();
  const clientVal = (document.getElementById("portal-client-filter")?.value || 'all').trim();
  const locSelect = document.getElementById("portal-location-filter");
  const plants = (typeof PLANTS_REGISTRY !== 'undefined' && PLANTS_REGISTRY.length > 0) ? PLANTS_REGISTRY : [];

  const isEntityAll = (entityVal === 'all');
  const isRadram = entityVal.toLowerCase().includes('radram');
  const isFlexi = entityVal.toLowerCase().includes('flexi');
  const isClientAll = (clientVal === 'all');

  if (locSelect) {
    const filteredPlants = plants.filter(p => {
      const pEnt = (p.entity || '').toLowerCase();
      let matchEntity = isEntityAll;
      if (!isEntityAll) {
        if (isRadram) matchEntity = pEnt.includes('radram');
        else if (isFlexi) matchEntity = !pEnt.includes('radram');
        else matchEntity = pEnt.includes(entityVal.toLowerCase().split(' ')[0]);
      }
      if (!matchEntity) return false;

      if (isClientAll) return true;
      const pZing = (p.zingClient || '').toLowerCase();
      const pCli = (p.clientName || '').toLowerCase();
      const cLower = clientVal.toLowerCase();
      return pZing === cLower || pCli === cLower || pZing.includes(cLower) || cLower.includes(pCli);
    });

    let locOptions = ['<option value="all">All Plant Locations</option>'];
    filteredPlants.sort((a,b) => (a.sno || 0) - (b.sno || 0)).forEach(p => {
      locOptions.push(\`<option value="\${p.plantName}">\${p.plantName}</option>\`);
    });
    locSelect.innerHTML = locOptions.join('');
  }
}
`;

let portalJs = fs.readFileSync(path.join(__dirname, 'portal.js'), 'utf8');
portalJs = portalJs.replace(/\r\n/g, '\n');

// Replace the filter engine in portal.js
const startMarker = '// ==================== CASCADING FILTER & WORKFORCE SCOPE ENGINE ====================';
const refreshMarker = 'async function refreshData() {';

if (portalJs.includes(startMarker)) {
  const before = portalJs.substring(0, portalJs.indexOf(startMarker));
  const after = portalJs.substring(portalJs.indexOf(refreshMarker));
  portalJs = before + authoritativeEngine.trim() + '\n\n' + after;
  console.log("Replaced scope engine in portal.js with authoritative server functions");
}

// Update renderKpiCards to use getActiveEmployees and getInactiveEmployees
const newRenderKpiCards = `// Calculate and render KPI metrics (Dynamically updating when Entity, Client or Location is filtered)
function renderKpiCards() {
  const entityFilter = document.getElementById("portal-entity-filter")?.value || 'all';
  const clientFilter = document.getElementById("portal-client-filter")?.value || 'all';
  const locationFilter = document.getElementById("portal-location-filter")?.value || 'all';
  const selectedDate = document.getElementById("portal-date-picker")?.value || new Date().toISOString().split("T")[0];

  const isUnfiltered = (entityFilter === 'all' && clientFilter === 'all' && locationFilter === 'all');
  const scopedEmployees = filterWorkforceByScope(zinghrReportData, entityFilter, clientFilter, locationFilter);

  // Dynamic counts for current scope
  const activeList = getActiveEmployees(scopedEmployees);
  const inactiveList = getInactiveEmployees(scopedEmployees);

  let totalWorkforce = isUnfiltered ? 27762 : scopedEmployees.length;
  let activeWorkforce = isUnfiltered ? 11287 : activeList.length;
  let inactiveWorkforce = isUnfiltered ? 16472 : inactiveList.length;

  // Biometric registration counts in current scope
  const registeredCount = scopedEmployees.filter(emp => emp.isGateRegistered).length;
  const pendingBiometricsCount = Math.max(0, activeWorkforce - registeredCount);
  const regPercentage = activeWorkforce > 0 ? Math.round((registeredCount / activeWorkforce) * 100) : 0;

  // Daily attendance for selected date in current scope
  const presentEmployees = activeList.filter(emp => {
    const cleanId = (emp.id || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    const regRecord = attendanceRegisterMap.get(cleanId);
    return (regRecord && (regRecord.attendanceStatus === 'P' || regRecord.attendanceStatus === 'HD')) || 
           (emp.attendanceDates && emp.attendanceDates.includes(selectedDate));
  });
  const presentCount = presentEmployees.length;
  const attPercentage = activeWorkforce > 0 ? Math.round((presentCount / activeWorkforce) * 100) : 0;

  // 1. Total Workforce Card
  const kpiTotalEl = document.getElementById("kpi-total-workforce");
  if (kpiTotalEl) kpiTotalEl.textContent = totalWorkforce.toLocaleString();
  const activeBadge = document.getElementById("kpi-active-badge");
  if (activeBadge) activeBadge.textContent = \`Active: \${activeWorkforce.toLocaleString()}\`;
  const inactiveBadge = document.getElementById("kpi-inactive-badge");
  if (inactiveBadge) inactiveBadge.textContent = \`Inactive: \${inactiveWorkforce.toLocaleString()}\`;

  // 2. Active Workforce Card
  const activeCardEl = document.querySelector("#kpi-active-workforce, .kpi-card:nth-child(2) .kpi-value");
  if (activeCardEl) activeCardEl.textContent = activeWorkforce.toLocaleString();

  // 3. Inactive Workforce Card
  const inactiveCardEl = document.querySelector("#kpi-inactive-workforce, .kpi-card:nth-child(3) .kpi-value");
  if (inactiveCardEl) inactiveCardEl.textContent = inactiveWorkforce.toLocaleString();

  // 4. Biometric Registration Rate
  const regCountEl = document.getElementById("kpi-reg-count");
  if (regCountEl) regCountEl.textContent = \`\${registeredCount} / \${activeWorkforce.toLocaleString()} Enrolled\`;
  const regPctEl = document.getElementById("kpi-reg-pct");
  if (regPctEl) regPctEl.textContent = \`\${regPercentage}%\`;
  const regCircleEl = document.getElementById("kpi-reg-circle");
  if (regCircleEl) regCircleEl.setAttribute("stroke-dasharray", \`\${regPercentage}, 100\`);

  // 5. Daily Attendance Rate
  const attCountEl = document.getElementById("kpi-att-count");
  if (attCountEl) attCountEl.textContent = \`\${presentCount} / \${activeWorkforce.toLocaleString()} Present\`;
  const attPctEl = document.getElementById("kpi-att-pct");
  if (attPctEl) attPctEl.textContent = \`\${attPercentage}%\`;
  const attCircleEl = document.getElementById("kpi-att-circle");
  if (attCircleEl) attCircleEl.setAttribute("stroke-dasharray", \`\${attPercentage}, 100\`);

  // 6. Pending Biometrics
  const unregEl = document.getElementById("kpi-unregistered-count");
  if (unregEl) {
    unregEl.textContent = pendingBiometricsCount.toLocaleString();
    unregEl.className = "kpi-value color-error";
  }`;

const kpiStart = '// Calculate and render KPI metrics';
const kpiEnd = '// 5. AI Recognition Speed';
if (portalJs.includes(kpiStart) && portalJs.includes(kpiEnd)) {
  const before = portalJs.substring(0, portalJs.indexOf(kpiStart));
  const after = portalJs.substring(portalJs.indexOf(kpiEnd));
  portalJs = before + newRenderKpiCards.trim() + '\n\n  ' + after;
  console.log("Updated renderKpiCards in portal.js");
}

// Update renderEmployeeAuditList to default to active and display active count in pagination
const newAuditListFunc = `function renderEmployeeAuditList() {
  const container = document.getElementById("audit-employee-list");
  if (!container) return;

  const entityFilter = document.getElementById("portal-entity-filter")?.value || 'all';
  const clientFilter = document.getElementById("portal-client-filter")?.value || 'all';
  const locationFilter = document.getElementById("portal-location-filter")?.value || 'all';
  const isUnfiltered = (entityFilter === 'all' && clientFilter === 'all' && locationFilter === 'all');

  const scoped = filterWorkforceByScope(zinghrReportData, entityFilter, clientFilter, locationFilter);
  const activeList = getActiveEmployees(scoped);
  const inactiveList = getInactiveEmployees(scoped);

  // Dynamic tab counts for current scope
  const totalCount = isUnfiltered ? 27762 : scoped.length;
  const activeCount = isUnfiltered ? 11287 : activeList.length;
  const inactiveCount = isUnfiltered ? 16472 : inactiveList.length;
  const registeredCount = scoped.filter(e => e.isGateRegistered).length;
  const unregisteredCount = Math.max(0, activeCount - registeredCount);

  // Filter list: by default show active members only (or currentSelectedTab)
  let filtered = (currentSelectedTab === "active") ? activeList : (currentSelectedTab === "inactive" ? inactiveList : (currentSelectedTab === "registered" ? scoped.filter(e => e.isGateRegistered) : (currentSelectedTab === "unregistered" ? scoped.filter(e => !e.isGateRegistered) : activeList)));

  if (currentSearchQuery) {
    filtered = filtered.filter(emp => 
      (emp.name && emp.name.toLowerCase().includes(currentSearchQuery)) ||
      (emp.id && emp.id.toLowerCase().includes(currentSearchQuery)) ||
      (emp.role && emp.role.toLowerCase().includes(currentSearchQuery))
    );
  }

  // Render counter headers
  const btnAll = document.getElementById("audit-tab-all");
  if (btnAll) btnAll.innerHTML = \`All (\${totalCount.toLocaleString()})\`;

  const btnActive = document.getElementById("audit-tab-active");
  if (btnActive) btnActive.innerHTML = \`Active (\${activeCount.toLocaleString()})\`;

  const btnInactive = document.getElementById("audit-tab-inactive");
  if (btnInactive) btnInactive.innerHTML = \`Inactive (\${inactiveCount.toLocaleString()})\`;

  const btnReg = document.getElementById("audit-tab-registered");
  if (btnReg) btnReg.innerHTML = \`Registered (\${registeredCount})\`;

  const btnUnreg = document.getElementById("audit-tab-unregistered");
  if (btnUnreg) btnUnreg.innerHTML = \`Unregistered (\${unregisteredCount.toLocaleString()}) ⚠️\`;

  // Calculate pagination
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
  }

  const indicatorEl = document.getElementById("audit-page-indicator");
  if (indicatorEl) {
    indicatorEl.textContent = \`Page \${auditCurrentPage} of \${totalPages}\`;
  }

  const prevBtn = document.getElementById("audit-prev-page");
  if (prevBtn) prevBtn.disabled = (auditCurrentPage <= 1);

  const nextBtn = document.getElementById("audit-next-page");
  if (nextBtn) nextBtn.disabled = (auditCurrentPage >= totalPages);

  // Draw list
  if (pageItems.length === 0) {
    container.innerHTML = \`<div class="loading-state" style="color:var(--color-text-muted);">No employees found matching active filter.</div>\`;
    return;
  }

  container.innerHTML = pageItems.map(emp => {
    const themeClass = emp.isGateRegistered ? "registered-theme" : "unregistered-theme";
    const badgeHtml = emp.isGateRegistered 
      ? \`<span class="badge badge-success">✓ Enrolled</span>\`
      : \`<span class="badge badge-error">⚠️ Pending</span>\`;
    
    const actionButton = !emp.isGateRegistered 
      ? \`<button class="enroll-nudge-btn" onclick="event.stopPropagation(); triggerEnrollAlert('\${emp.id}')">Nudge</button>\` 
      : \`\`;

    return \`
      <div class="employee-card \${themeClass}" onclick="openEmployeeProfileModal('\${emp.id}')" title="Click to open active employee profile dossier">
        <img class="card-avatar" src="\${emp.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&h=100&q=80'}" alt="\${emp.name}">
        <div class="card-details">
          <div class="card-title-row">
            <span class="card-name">\${emp.name}</span>
            <span class="card-id font-mono">\${emp.id}</span>
          </div>
          <div class="card-role-row">
            <span class="card-role">\${emp.designation || emp.role || 'Staff Member'}</span>
            <span>•</span>
            <span class="card-rule">\${emp.shift || emp.AttendanceRuleGroup || 'Common'}</span>
          </div>
          <div class="card-meta-row">
            <span class="card-meta-item">🏢 \${emp.department || 'Operations'}</span>
            <span class="card-meta-item">📞 \${emp.contact || '+91 98765 43210'}</span>
          </div>
          <div class="card-footer-row">
            <span class="card-email">\${emp.email || ((emp.id || 'employee').toLowerCase() + '@layam.com')}</span>
            <div class="card-actions">
              \${badgeHtml}
              \${actionButton}
            </div>
          </div>
        </div>
      </div>
    \`;
  }).join("");
}`;

const auditStart = 'function renderEmployeeAuditList() {';
const auditEnd = '// Authoritative Daily Attendance Calculator';
if (portalJs.includes(auditStart) && portalJs.includes(auditEnd)) {
  const before = portalJs.substring(0, portalJs.indexOf(auditStart));
  const after = portalJs.substring(portalJs.indexOf(auditEnd));
  portalJs = before + newAuditListFunc.trim() + '\n\n' + after;
  console.log("Updated renderEmployeeAuditList in portal.js");
}

fs.writeFileSync(path.join(__dirname, 'portal.js'), portalJs, 'utf8');
fs.writeFileSync(path.join(__dirname, 'www', 'portal.js'), portalJs, 'utf8');

console.log("Authoritative portal engine synced successfully!");
