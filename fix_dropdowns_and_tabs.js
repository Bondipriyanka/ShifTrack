const fs = require('fs');
const path = require('path');

// Read PLANTS_REGISTRY from app-v3.js to ensure exact same 72 plants
const appJs = fs.readFileSync(path.join(__dirname, 'app-v3.js'), 'utf8');
const plantsMatch = appJs.match(/const PLANTS_REGISTRY = (\[[\s\S]*?\n\];)/);
let plantsRegistryCode = plantsMatch ? `const PLANTS_REGISTRY = ${plantsMatch[1]}\nconst MASTER_72_PLANTS = PLANTS_REGISTRY;\n` : '';

let portalJs = fs.readFileSync(path.join(__dirname, 'portal.js'), 'utf8');
portalJs = portalJs.replace(/\r\n/g, '\n');

// Prepend PLANTS_REGISTRY if not present
if (!portalJs.includes('const PLANTS_REGISTRY =')) {
  portalJs = plantsRegistryCode + '\n' + portalJs;
  console.log("Added PLANTS_REGISTRY & MASTER_72_PLANTS to portal.js");
}

// Add Dropdown population functions
const dropdownFunctions = `
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

  // 2. All 72 Plant Locations
  const curLoc = locSelect.value || 'all';
  let locOptions = ['<option value="all">All Plant Locations (72 Plants)</option>'];
  plants.sort((a,b) => (a.sno || 0) - (b.sno || 0)).forEach(p => {
    const label = \`[\${String(p.sno).padStart(2, '0')}] \${p.plantName} (\${p.location})\`;
    locOptions.push(\`<option value="\${p.plantName}">\${label}</option>\`);
  });
  locSelect.innerHTML = locOptions.join('');
  if (curLoc && locSelect.querySelector(\`option[value="\${curLoc}"]\`)) {
    locSelect.value = curLoc;
  }
}

function updateClientAndLocationDropdowns() {
  const entityVal = (document.getElementById("portal-entity-filter")?.value || 'all').toLowerCase();
  const clientSelect = document.getElementById("portal-client-filter");
  const locSelect = document.getElementById("portal-location-filter");
  const plants = (typeof PLANTS_REGISTRY !== 'undefined' && PLANTS_REGISTRY.length > 0) ? PLANTS_REGISTRY : [];

  if (clientSelect) {
    const clientsMap = new Map();
    plants.forEach(p => {
      if (entityVal === 'all' || (p.entity && p.entity.toLowerCase().includes(entityVal))) {
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
      const matchEntity = entityVal === 'all' || (p.entity && p.entity.toLowerCase().includes(entityVal));
      const matchClient = clientVal === 'all' || 
        (p.zingClient && p.zingClient.toLowerCase().includes(clientVal)) ||
        (p.clientName && p.clientName.toLowerCase().includes(clientVal));
      return matchEntity && matchClient;
    });

    let locOptions = [\`<option value="all">All Plant Locations (\${filteredPlants.length} Plants)</option>\`];
    filteredPlants.sort((a,b) => (a.sno || 0) - (b.sno || 0)).forEach(p => {
      const label = \`[\${String(p.sno).padStart(2, '0')}] \${p.plantName} (\${p.location})\`;
      locOptions.push(\`<option value="\${p.plantName}">\${label}</option>\`);
    });
    locSelect.innerHTML = locOptions.join('');
  }
}
`;

// Insert dropdownFunctions before refreshData
if (!portalJs.includes('function populateTopFilterDropdowns()')) {
  portalJs = portalJs.replace('async function refreshData() {', dropdownFunctions + '\nasync function refreshData() {');
  console.log("Added populateTopFilterDropdowns functions to portal.js");
}

// Update refreshData to not filter out inactive records
const oldRawDataFilter = `      const rawData = await reportRes.json();
      zinghrReportData = Array.isArray(rawData) 
        ? rawData.filter(emp => !emp.dateOfLeaving || emp.dateOfLeaving.trim() === '' || emp.dateOfLeaving.toLowerCase() === 'null')
        : (rawData.data || []);`;

const newRawDataFilter = `      const rawData = await reportRes.json();
      zinghrReportData = Array.isArray(rawData) ? rawData : (rawData.data || []);`;

if (portalJs.includes(oldRawDataFilter)) {
  portalJs = portalJs.replace(oldRawDataFilter, newRawDataFilter);
  console.log("Updated rawData assignment in refreshData to preserve inactive records");
}

// Call populateTopFilterDropdowns inside DOMContentLoaded and refreshData
if (!portalJs.includes('populateTopFilterDropdowns();')) {
  portalJs = portalJs.replace('populateDossierEmployeeDropdown();', 'populateTopFilterDropdowns();\n    populateDossierEmployeeDropdown();');
  console.log("Added populateTopFilterDropdowns call in refreshData");
}

// Add event listeners for entity and client dropdowns
const oldFilterListeners = `  document.getElementById("portal-manual-refresh").addEventListener("click", refreshData);
  document.getElementById("portal-location-filter").addEventListener("change", renderDashboard);`;

const newFilterListeners = `  document.getElementById("portal-manual-refresh").addEventListener("click", refreshData);
  
  const entityFilterEl = document.getElementById("portal-entity-filter");
  if (entityFilterEl) {
    entityFilterEl.addEventListener("change", () => {
      updateClientAndLocationDropdowns();
      renderDashboard();
    });
  }

  const clientFilterEl = document.getElementById("portal-client-filter");
  if (clientFilterEl) {
    clientFilterEl.addEventListener("change", () => {
      updateLocationDropdown();
      renderDashboard();
    });
  }

  const locFilterEl = document.getElementById("portal-location-filter");
  if (locFilterEl) {
    locFilterEl.addEventListener("change", renderDashboard);
  }`;

if (portalJs.includes(oldFilterListeners)) {
  portalJs = portalJs.replace(oldFilterListeners, newFilterListeners);
  console.log("Updated filter event listeners in portal.js");
}

// Update renderEmployeeAuditList filter to respect entity, client, location and tab
const oldAuditFilterSection = `  // Filter list
  let filtered = zinghrReportData.filter(emp => {
    // 1. Search Query filter
    const matchesSearch = 
      (emp.name && emp.name.toLowerCase().includes(currentSearchQuery)) ||
      (emp.id && emp.id.toLowerCase().includes(currentSearchQuery)) ||
      (emp.role && emp.role.toLowerCase().includes(currentSearchQuery));
    
    if (!matchesSearch) return false;

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

const newAuditFilterSection = `  const entityFilter = (document.getElementById("portal-entity-filter")?.value || 'all').toLowerCase();
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
  });`;

if (portalJs.includes(oldAuditFilterSection)) {
  portalJs = portalJs.replace(oldAuditFilterSection, newAuditFilterSection);
  console.log("Updated audit filter with Entity/Client/Location scope in portal.js");
}

fs.writeFileSync(path.join(__dirname, 'portal.js'), portalJs, 'utf8');
fs.writeFileSync(path.join(__dirname, 'www', 'portal.js'), portalJs, 'utf8');

console.log("Dropdown and tab fixes written to portal.js and mirrored to www/portal.js successfully!");
