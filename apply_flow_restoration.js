const fs = require('fs');
const path = require('path');

let portalJs = fs.readFileSync(path.join(__dirname, 'portal.js'), 'utf8');
portalJs = portalJs.replace(/\r\n/g, '\n');

// Clean implementation of filter dropdown population, cascading, and scope filtering
const newFilterEngine = `
// Populate Dynamic Top Filter Dropdowns (Legal Entity, Client Name, Plant Location)
function populateTopFilterDropdowns() {
  const entitySelect = document.getElementById("portal-entity-filter");
  const clientSelect = document.getElementById("portal-client-filter");
  const locSelect = document.getElementById("portal-location-filter");

  if (!clientSelect || !locSelect) return;

  const plants = (typeof PLANTS_REGISTRY !== 'undefined' && PLANTS_REGISTRY.length > 0) ? PLANTS_REGISTRY : [];

  // 1. Unique Clients
  const clientsMap = new Map();
  plants.forEach(p => {
    const cName = p.zingClient || p.clientName || '';
    if (cName && !clientsMap.has(cName)) {
      clientsMap.set(cName, { name: cName, entity: p.entity });
    }
  });

  const curClient = clientSelect.value || 'all';
  let clientOptions = ['<option value="all">All Clients (All Plants)</option>'];
  Array.from(clientsMap.keys()).sort().forEach(c => {
    clientOptions.push(\`<option value="\${c}">\${c}</option>\`);
  });
  clientSelect.innerHTML = clientOptions.join('');
  if (curClient && clientSelect.querySelector(\`option[value="\${curClient}"]\`)) {
    clientSelect.value = curClient;
  }

  // 2. All 72 Plant Locations (Clean plant names only)
  const curLoc = locSelect.value || 'all';
  let locOptions = ['<option value="all">All Plant Locations</option>'];
  plants.sort((a,b) => (a.sno || 0) - (b.sno || 0)).forEach(p => {
    locOptions.push(\`<option value="\${p.plantName}">\${p.plantName}</option>\`);
  });
  locSelect.innerHTML = locOptions.join('');
  if (curLoc && locSelect.querySelector(\`option[value="\${curLoc}"]\`)) {
    locSelect.value = curLoc;
  }
}

function updateClientAndLocationDropdowns() {
  const entityVal = (document.getElementById("portal-entity-filter")?.value || 'all').toLowerCase();
  const clientSelect = document.getElementById("portal-client-filter");
  const plants = (typeof PLANTS_REGISTRY !== 'undefined' && PLANTS_REGISTRY.length > 0) ? PLANTS_REGISTRY : [];

  if (clientSelect) {
    const clientsMap = new Map();
    plants.forEach(p => {
      if (entityVal === 'all' || (p.entity && p.entity.toLowerCase().includes(entityVal.split(' ')[0]))) {
        const cName = p.zingClient || p.clientName || '';
        if (cName && !clientsMap.has(cName)) {
          clientsMap.set(cName, true);
        }
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
  const entityVal = (document.getElementById("portal-entity-filter")?.value || 'all').toLowerCase();
  const clientVal = (document.getElementById("portal-client-filter")?.value || 'all').toLowerCase();
  const locSelect = document.getElementById("portal-location-filter");
  const plants = (typeof PLANTS_REGISTRY !== 'undefined' && PLANTS_REGISTRY.length > 0) ? PLANTS_REGISTRY : [];

  if (locSelect) {
    const filteredPlants = plants.filter(p => {
      const matchEntity = entityVal === 'all' || (p.entity && p.entity.toLowerCase().includes(entityVal.split(' ')[0]));
      const matchClient = clientVal === 'all' || 
        (p.zingClient && p.zingClient.toLowerCase().includes(clientVal)) ||
        (p.clientName && p.clientName.toLowerCase().includes(clientVal)) ||
        (clientVal.includes((p.clientName || '').toLowerCase()));
      return matchEntity && matchClient;
    });

    let locOptions = ['<option value="all">All Plant Locations</option>'];
    filteredPlants.sort((a,b) => (a.sno || 0) - (b.sno || 0)).forEach(p => {
      locOptions.push(\`<option value="\${p.plantName}">\${p.plantName}</option>\`);
    });
    locSelect.innerHTML = locOptions.join('');
  }
}

function filterWorkforceByScope(employees, entityFilter = 'all', clientFilter = 'all', locationFilter = 'all') {
  if (!employees || !Array.isArray(employees)) return [];
  
  const entVal = (entityFilter || 'all').toLowerCase().trim();
  const cliVal = (clientFilter || 'all').toLowerCase().trim();
  const locVal = (locationFilter || 'all').toLowerCase().trim();

  if (entVal === 'all' && cliVal === 'all' && locVal === 'all') {
    return employees;
  }

  const plants = (typeof PLANTS_REGISTRY !== 'undefined' && PLANTS_REGISTRY.length > 0) ? PLANTS_REGISTRY : [];
  const targetPlant = locVal !== 'all' ? plants.find(p => p.plantName.toLowerCase() === locVal || p.plantName.toLowerCase().includes(locVal)) : null;

  return employees.filter(emp => {
    // 1. Legal Entity Filter
    if (entVal !== 'all') {
      const empEnt = getEmployeeEntity(emp).toLowerCase();
      if (entVal.includes('radram') && !empEnt.includes('radram')) return false;
      if (entVal.includes('flexi') && empEnt.includes('radram')) return false;
      if (!empEnt.includes(entVal.split(' ')[0])) return false;
    }

    // 2. Specific Plant Location Selection
    if (targetPlant) {
      const targetZingClient = (targetPlant.zingClient || targetPlant.clientName || '').toLowerCase();
      const empCli = getEmployeeClient(emp).toLowerCase();
      const empLoc = getEmployeeLocation(emp).toLowerCase();

      // For MSPT vs MWC
      if (targetPlant.sno === 2) {
        if (!empLoc.includes('mspt')) return false;
      } else if (targetPlant.sno === 3) {
        if (empLoc.includes('mspt')) return false;
      } else {
        const clientMatch = empCli.includes(targetPlant.clientName.toLowerCase()) || targetZingClient.includes(empCli) || empCli.includes(targetZingClient.split(' ')[0]);
        const locMatch = empLoc.includes(targetPlant.location.toLowerCase()) || targetPlant.location.toLowerCase().includes(empLoc);
        if (!clientMatch && !locMatch) return false;
      }
      return true;
    }

    // 3. Client Filter (when location is 'all')
    if (cliVal !== 'all') {
      const empCli = getEmployeeClient(emp).toLowerCase();
      const cleanCli = cliVal.replace(/[^a-z0-9]/g, ' ');
      const cleanEmpCli = empCli.replace(/[^a-z0-9]/g, ' ');
      const words = cleanCli.split(/\\s+/).filter(w => w.length > 2 && w !== 'ltd' && w !== 'pvt' && w !== 'limited' && w !== 'private' && w !== 'india');
      const matchesAnyWord = words.some(w => cleanEmpCli.includes(w));
      if (!matchesAnyWord && !empCli.includes(cliVal) && !cliVal.includes(empCli)) return false;
    }

    // 4. General Location Filter
    if (locVal !== 'all') {
      const empLoc = getEmployeeLocation(emp).toLowerCase();
      const cleanLoc = locVal.split(' - ')[0].toLowerCase();
      if (!empLoc.includes(cleanLoc) && !cleanLoc.includes(empLoc)) return false;
    }

    return true;
  });
}
`;

// Replace existing dropdown functions with newFilterEngine
const startMarker = '// Populate Dynamic Top Filter Dropdowns';
const endMarker = 'async function refreshData() {';

if (portalJs.includes(startMarker) && portalJs.includes(endMarker)) {
  const before = portalJs.substring(0, portalJs.indexOf(startMarker));
  const after = portalJs.substring(portalJs.indexOf(endMarker));
  portalJs = before + newFilterEngine.trim() + '\n\n' + after;
  console.log("Replaced filter engine functions in portal.js");
}

// Update renderKpiCards to dynamically compute based on selected filter scope
const oldRenderKpi = `// Calculate and render KPI metrics
function renderKpiCards() {
  const totalWorkforce = zinghrReportData.length;
  
  // Biometric registered rate
  const registeredCount = zinghrReportData.filter(emp => emp.isGateRegistered).length;
  const regPercentage = totalWorkforce > 0 ? Math.round((registeredCount / totalWorkforce) * 100) : 0;
  
  // Daily Attendance (Present today on selected date picker)
  const selectedDate = document.getElementById("portal-date-picker").value;
  const locationFilter = document.getElementById("portal-location-filter").value;
  
  // Filter employees present on selectedDate at filtered location
  const presentEmployees = zinghrReportData.filter(emp => {
    // Match date
    const hasAttended = emp.attendanceDates && emp.attendanceDates.includes(selectedDate);
    if (!hasAttended) return false;
    
    // Match location
    if (locationFilter !== "all") {
      const matchLog = findEmpCheckinLog(emp.id, selectedDate);
      return matchLog && matchLog.location === locationFilter;
    }
    return true;
  });

  const presentCount = presentEmployees.length;
  
  // Enrolled employees count at the location (or total enrolled if 'all' filtered)
  let baseRegisteredCount = registeredCount;
  if (locationFilter !== "all") {
    // Count how many registered employees are rostered for this location
    baseRegisteredCount = zinghrReportData.filter(emp => emp.isGateRegistered && emp.address && emp.address.includes(locationFilter.split(" - ")[0])).length;
    // Fallback if zero mapping exists
    if (baseRegisteredCount === 0) baseRegisteredCount = registeredCount;
  }
  const attPercentage = baseRegisteredCount > 0 ? Math.round((presentCount / baseRegisteredCount) * 100) : 0;

  // Unregistered workers
  const unregisteredCount = totalWorkforce - registeredCount;

  const totalMasterCount = 27762;
  const activeMasterCount = 11287;
  const pendingMasterCount = activeMasterCount - registeredCount;

  // Update DOM metrics elements: Total Workforce Strength in ZingHR Database
  const kpiTotalEl = document.getElementById("kpi-total-workforce");
  if (kpiTotalEl) kpiTotalEl.textContent = totalMasterCount.toLocaleString();
  
  // Biometric Registration Rate (Calculated on Active Workforce)
  const activeRegPct = Math.round((registeredCount / activeMasterCount) * 100);
  const regCountEl = document.getElementById("kpi-reg-count");
  if (regCountEl) regCountEl.textContent = \`\${registeredCount} / \${activeMasterCount.toLocaleString()} Enrolled\`;
  const regPctEl = document.getElementById("kpi-reg-pct");
  if (regPctEl) regPctEl.textContent = \`\${activeRegPct}%\`;
  const regCircleEl = document.getElementById("kpi-reg-circle");
  if (regCircleEl) regCircleEl.setAttribute("stroke-dasharray", \`\${activeRegPct}, 100\`);

  // Daily Attendance Rate
  const attCountEl = document.getElementById("kpi-att-count");
  if (attCountEl) attCountEl.textContent = \`\${presentCount} / \${baseRegisteredCount} Present\`;
  const attPctEl = document.getElementById("kpi-att-pct");
  if (attPctEl) attPctEl.textContent = \`\${attPercentage}%\`;
  const attCircleEl = document.getElementById("kpi-att-circle");
  if (attCircleEl) attCircleEl.setAttribute("stroke-dasharray", \`\${attPercentage}, 100\`);

  // Pending Biometrics (Active Workforce awaiting biometric face vector capture)
  const unregEl = document.getElementById("kpi-unregistered-count");
  if (unregEl) {
    unregEl.textContent = pendingMasterCount.toLocaleString();
    unregEl.className = "kpi-value color-error";
  }`;

const newRenderKpi = `// Calculate and render KPI metrics (Dynamically updating when Entity, Client or Location is filtered)
function renderKpiCards() {
  const entityFilter = document.getElementById("portal-entity-filter")?.value || 'all';
  const clientFilter = document.getElementById("portal-client-filter")?.value || 'all';
  const locationFilter = document.getElementById("portal-location-filter")?.value || 'all';
  const selectedDate = document.getElementById("portal-date-picker")?.value || new Date().toISOString().split("T")[0];

  const isUnfiltered = (entityFilter === 'all' && clientFilter === 'all' && locationFilter === 'all');
  const scopedEmployees = filterWorkforceByScope(zinghrReportData, entityFilter, clientFilter, locationFilter);

  // Dynamic counts for current scope
  let totalWorkforce = isUnfiltered ? 27762 : scopedEmployees.length;
  let activeWorkforce = isUnfiltered 
    ? 11287 
    : scopedEmployees.filter(e => !e.dateOfLeaving && e.status !== 'Inactive' && e.status !== 'Resigned' && (e.status === 'Active' || e.status === 'Existing' || e.isInZingHR !== false)).length;
  let inactiveWorkforce = isUnfiltered ? 16472 : (totalWorkforce - activeWorkforce);

  // Biometric registration counts in current scope
  const registeredCount = scopedEmployees.filter(emp => emp.isGateRegistered).length;
  const pendingBiometricsCount = Math.max(0, activeWorkforce - registeredCount);
  const regPercentage = activeWorkforce > 0 ? Math.round((registeredCount / activeWorkforce) * 100) : 0;

  // Daily attendance for selected date in current scope
  const presentEmployees = scopedEmployees.filter(emp => {
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

if (portalJs.includes(oldRenderKpi)) {
  portalJs = portalJs.replace(oldRenderKpi, newRenderKpi);
  console.log("Updated renderKpiCards with dynamic scope support");
}

// Update renderEmployeeAuditList to use scoped employees and dynamic tab counters
const oldAuditList = `function renderEmployeeAuditList() {
  const container = document.getElementById("audit-employee-list");
  if (!container) return;

  const entityFilter = (document.getElementById("portal-entity-filter")?.value || 'all').toLowerCase();
  const clientFilter = (document.getElementById("portal-client-filter")?.value || 'all').toLowerCase();
  const locationFilter = (document.getElementById("portal-location-filter")?.value || 'all').toLowerCase();

  // Filter list
  let filtered = zinghrReportData.filter(emp => {
    // 0. Top Level Entity / Client / Location Filters
    if (entityFilter !== 'all') {
      const ent = getEmployeeEntity(emp).toLowerCase();
      if (!ent.includes(entityFilter)) return false;
    }
    if (clientFilter !== 'all') {
      const cli = getEmployeeClient(emp).toLowerCase();
      const cleanCli = clientFilter.split(' ')[0].toLowerCase();
      if (!cli.includes(cleanCli)) return false;
    }
    if (locationFilter !== 'all') {
      const loc = getEmployeeLocation(emp).toLowerCase();
      const cleanLoc = locationFilter.split(' - ')[0].toLowerCase();
      if (!loc.includes(cleanLoc) && !cleanLoc.includes(loc)) return false;
    }

    // 1. Search Query filter
    if (currentSearchQuery) {
      const matchesSearch = 
        (emp.name && emp.name.toLowerCase().includes(currentSearchQuery)) ||
        (emp.id && emp.id.toLowerCase().includes(currentSearchQuery)) ||
        (emp.role && emp.role.toLowerCase().includes(currentSearchQuery));
      if (!matchesSearch) return false;
    }

    // 2. Tab selection filter
    const statusLower = (emp.status || emp.employeeStatus || '').toLowerCase();
    const isSeparated = Boolean(emp.dateOfLeaving && emp.dateOfLeaving.trim() !== '' && emp.dateOfLeaving.toLowerCase() !== 'null') ||
      statusLower === 'resigned' || statusLower === 'fnf locked' || statusLower === 'inactive' || emp.isInZingHR === false;

    if (currentSelectedTab === "active") return !isSeparated;
    if (currentSelectedTab === "inactive") return isSeparated;
    if (currentSelectedTab === "registered") return emp.isGateRegistered;
    if (currentSelectedTab === "unregistered") return !emp.isGateRegistered;
    
    return true;
  });

  // Render counter headers
  const totalCount = 27762;
  const activeCount = 11287;
  const inactiveCount = 16472;
  const registeredCount = zinghrReportData.filter(emp => emp.isGateRegistered).length || 4;
  const unregisteredCount = activeCount - registeredCount;`;

const newAuditList = `function renderEmployeeAuditList() {
  const container = document.getElementById("audit-employee-list");
  if (!container) return;

  const entityFilter = document.getElementById("portal-entity-filter")?.value || 'all';
  const clientFilter = document.getElementById("portal-client-filter")?.value || 'all';
  const locationFilter = document.getElementById("portal-location-filter")?.value || 'all';
  const isUnfiltered = (entityFilter === 'all' && clientFilter === 'all' && locationFilter === 'all');

  const scoped = filterWorkforceByScope(zinghrReportData, entityFilter, clientFilter, locationFilter);

  // Dynamic tab counts for current scope
  const totalCount = isUnfiltered ? 27762 : scoped.length;
  const activeCount = isUnfiltered ? 11287 : scoped.filter(e => !e.dateOfLeaving && e.status !== 'Inactive' && e.status !== 'Resigned').length;
  const inactiveCount = isUnfiltered ? 16472 : (totalCount - activeCount);
  const registeredCount = scoped.filter(e => e.isGateRegistered).length;
  const unregisteredCount = Math.max(0, activeCount - registeredCount);

  // Filter list
  let filtered = scoped.filter(emp => {
    // 1. Search Query filter
    if (currentSearchQuery) {
      const matchesSearch = 
        (emp.name && emp.name.toLowerCase().includes(currentSearchQuery)) ||
        (emp.id && emp.id.toLowerCase().includes(currentSearchQuery)) ||
        (emp.role && emp.role.toLowerCase().includes(currentSearchQuery));
      if (!matchesSearch) return false;
    }

    // 2. Tab selection filter
    const statusLower = (emp.status || emp.employeeStatus || '').toLowerCase();
    const isSeparated = Boolean(emp.dateOfLeaving && emp.dateOfLeaving.trim() !== '' && emp.dateOfLeaving.toLowerCase() !== 'null') ||
      statusLower === 'resigned' || statusLower === 'fnf locked' || statusLower === 'inactive' || emp.isInZingHR === false;

    if (currentSelectedTab === "active") return !isSeparated;
    if (currentSelectedTab === "inactive") return isSeparated;
    if (currentSelectedTab === "registered") return emp.isGateRegistered;
    if (currentSelectedTab === "unregistered") return !emp.isGateRegistered;
    
    return true;
  });`;

if (portalJs.includes(oldAuditList)) {
  portalJs = portalJs.replace(oldAuditList, newAuditList);
  console.log("Updated renderEmployeeAuditList with dynamic scoped tab counters");
}

// Update renderAttendanceBoard to use filterWorkforceByScope
const oldAttBoard = `function renderAttendanceBoard() {
  const tbody = document.getElementById("attendance-board-body");
  if (!tbody) return;

  const selectedDate = document.getElementById("portal-date-picker").value;
  const locationFilter = document.getElementById("portal-location-filter").value;
  const searchQuery = (document.getElementById("attendance-search-input").value || "").toLowerCase().trim();

  // Categorize entire workforce into Present vs Absent for selected date
  const rosterStatus = zinghrReportData.map(emp => {`;

const newAttBoard = `function renderAttendanceBoard() {
  const tbody = document.getElementById("attendance-board-body");
  if (!tbody) return;

  const entityFilter = document.getElementById("portal-entity-filter")?.value || 'all';
  const clientFilter = document.getElementById("portal-client-filter")?.value || 'all';
  const locationFilter = document.getElementById("portal-location-filter")?.value || 'all';
  const selectedDate = document.getElementById("portal-date-picker")?.value || new Date().toISOString().split("T")[0];
  const searchQuery = (document.getElementById("attendance-search-input")?.value || "").toLowerCase().trim();

  const scoped = filterWorkforceByScope(zinghrReportData, entityFilter, clientFilter, locationFilter);

  // Categorize scoped workforce into Present vs Absent for selected date
  const rosterStatus = scoped.map(emp => {`;

if (portalJs.includes(oldAttBoard)) {
  portalJs = portalJs.replace(oldAttBoard, newAttBoard);
  console.log("Updated renderAttendanceBoard to use scoped workforce");
}

fs.writeFileSync(path.join(__dirname, 'portal.js'), portalJs, 'utf8');
fs.writeFileSync(path.join(__dirname, 'www', 'portal.js'), portalJs, 'utf8');

console.log("All flow restoration fixes applied and mirrored to www/ successfully!");
