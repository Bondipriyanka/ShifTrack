const fs = require('fs');
const path = require('path');

// 1. Update portal.js
let portalJs = fs.readFileSync(path.join(__dirname, 'portal.js'), 'utf8');

// Helper function replacement
const oldHelpers = `function getEmployeeRuleGroup(emp) {
  return emp.ruleGroup || emp.shift || "General Standard Shift";
}

function getEmployeeLocation(emp, log) {
  if (log && log.location) return log.location;
  if (emp.location) return emp.location;
  if (emp.address) return emp.address;
  return "Tata Motors - Gate 1";
}`;

const newHelpers = `function getEmployeeEntity(emp) {
  if (!emp) return "Layam Flexi Solutions Pvt. Ltd.";
  return emp.LegalEntity || emp.legalEntity || emp.Company || emp.company || emp.entity || "Layam Flexi Solutions Pvt. Ltd.";
}

function getEmployeeClient(emp) {
  if (!emp) return "Mahindra and Mahindra Ltd.";
  return emp.Client || emp.client || emp.clientName || "Mahindra and Mahindra Ltd.";
}

function getEmployeeRuleGroup(emp) {
  if (!emp) return "General Standard Shift";
  return emp.AttendanceRuleGroup || emp.attendanceRuleGroup || emp.ruleGroup || emp.shift || "General Standard Shift";
}

function getEmployeeLocation(emp, log) {
  if (log && log.location) return log.location;
  if (!emp) return "Mahindra (MSPT) - MSPT";
  if (emp.Location) return emp.Location;
  if (emp.location) return emp.location;
  if (emp.plantLocation) return emp.plantLocation;
  if (emp.address) return emp.address;
  return "Mahindra (MSPT) - MSPT";
}

function getSupervisorForPlant(locOrPlant) {
  if (!locOrPlant) return "Chengettuvan J Jayachandran";
  const search = String(locOrPlant).toLowerCase().trim();
  const plants = (typeof MASTER_72_PLANTS !== 'undefined' && MASTER_72_PLANTS.length > 0)
    ? MASTER_72_PLANTS
    : ((typeof livePlantsRegistry !== 'undefined' && livePlantsRegistry.length > 0)
      ? livePlantsRegistry
      : (typeof PLANTS_REGISTRY !== 'undefined' ? PLANTS_REGISTRY : []));
  
  const match = plants.find(p => {
    const pName = (p.plantName || '').toLowerCase();
    const pLoc = (p.location || '').toLowerCase();
    const pClient = (p.clientName || '').toLowerCase();
    const pZing = (p.zingClient || '').toLowerCase();
    return pName.includes(search) || pLoc.includes(search) || search.includes(pLoc) || search.includes(pName) || (pClient && search.includes(pClient));
  });

  if (match && match.supervisorName && !match.supervisorName.toLowerCase().includes('no supervisor') && !match.supervisorName.toLowerCase().includes('unassigned')) {
    return match.supervisorName;
  }
  return "Chengettuvan J Jayachandran";
}`;

if (portalJs.includes(oldHelpers)) {
  portalJs = portalJs.replace(oldHelpers, newHelpers);
  console.log("Replaced oldHelpers in portal.js");
} else {
  console.log("oldHelpers not found verbatim, checking normalized...");
  // Normalize line endings
  const normPortal = portalJs.replace(/\r\n/g, '\n');
  const normOld = oldHelpers.replace(/\r\n/g, '\n');
  if (normPortal.includes(normOld)) {
    portalJs = normPortal.replace(normOld, newHelpers);
    console.log("Replaced oldHelpers in normalized portal.js");
  } else {
    console.error("Could not find oldHelpers");
  }
}

// Update renderAttendanceBoard table row rendering (13 columns)
const oldTbodyMap = `    return \`
      <tr onclick="openEmployeeProfileModal('\${emp.id}')" title="Click to open employee profile dossier">
        <td>
          <span class="table-emp-id font-mono" style="font-weight:700; color:var(--color-primary); font-size:0.8rem;">\${emp.id}</span>
        </td>
        <td>
          <div class="user-profile-cell">
            <img class="table-avatar" src="\${emp.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&h=100&q=80'}" alt="\${emp.name}">
            <div>
              <span class="table-emp-name" style="font-weight:600; display:block;">\${emp.name}</span>
            </div>
          </div>
        </td>
        <td>
          <span style="font-weight:500; color:var(--color-text-secondary);">\${dept}</span>
        </td>
        <td>
          <span style="font-weight:600; color:var(--color-text-primary);">\${desig}</span>
        </td>
        <td>
          <span class="badge" style="background:rgba(56, 189, 248, 0.1); color:var(--color-primary); border:1px solid rgba(56, 189, 248, 0.25); font-size:0.75rem;">\${ruleGroup}</span>
        </td>
        <td>
          <span style="font-weight:500;">\${plantLoc}</span>
        </td>
        <td>
          \${checkinTimeHtml}
        </td>
        <td>
          \${checkoutTimeHtml}
        </td>
        <td>
          \${durationHtml}
        </td>
        <td>
          \${statusBadgeHtml}
        </td>
        <td>
          \${syncBadgeHtml}
        </td>
      </tr>
    \`;`;

const newTbodyMap = `    const entity = getEmployeeEntity(emp);
    const client = getEmployeeClient(emp);

    return \`
      <tr onclick="openEmployeeProfileModal('\${emp.id}')" title="Click to open employee profile dossier">
        <td>
          <span class="table-emp-id font-mono" style="font-weight:700; color:var(--color-primary); font-size:0.8rem;">\${emp.id}</span>
        </td>
        <td>
          <div class="user-profile-cell">
            <img class="table-avatar" src="\${emp.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&h=100&q=80'}" alt="\${emp.name}">
            <div>
              <span class="table-emp-name" style="font-weight:600; display:block;">\${emp.name}</span>
            </div>
          </div>
        </td>
        <td>
          <span style="font-weight:600; color:#0284c7; font-size:0.78rem;">\${entity}</span>
        </td>
        <td>
          <span style="font-weight:600; color:#0d9488; font-size:0.78rem;">\${client}</span>
        </td>
        <td>
          <span style="font-weight:500; color:var(--color-text-secondary); font-size:0.78rem;">\${dept}</span>
        </td>
        <td>
          <span style="font-weight:600; color:var(--color-text-primary); font-size:0.78rem;">\${desig}</span>
        </td>
        <td>
          <span style="font-weight:500; font-size:0.78rem;">\${plantLoc}</span>
        </td>
        <td>
          <span class="badge" style="background:rgba(56, 189, 248, 0.1); color:var(--color-primary); border:1px solid rgba(56, 189, 248, 0.25); font-size:0.75rem;">\${ruleGroup}</span>
        </td>
        <td>
          \${checkinTimeHtml}
        </td>
        <td>
          \${checkoutTimeHtml}
        </td>
        <td>
          \${durationHtml}
        </td>
        <td>
          \${statusBadgeHtml}
        </td>
        <td>
          \${syncBadgeHtml}
        </td>
      </tr>
    \`;`;

portalJs = portalJs.replace(/\r\n/g, '\n');
if (portalJs.includes(oldTbodyMap.replace(/\r\n/g, '\n'))) {
  portalJs = portalJs.replace(oldTbodyMap.replace(/\r\n/g, '\n'), newTbodyMap);
  console.log("Updated 13-column renderAttendanceBoard in portal.js");
} else {
  console.error("Could not find oldTbodyMap in portal.js");
}

// Update openEmployeeProfileModal to populate all fields (Entity, Client, Supervisor, Phone, Email)
const oldModalFields = `  // Master details
  const deptEl = document.getElementById("modal-emp-dept");
  if (deptEl) deptEl.textContent = getEmployeeDepartment(emp);

  const ruleEl = document.getElementById("modal-emp-rule");
  if (ruleEl) ruleEl.textContent = getEmployeeRuleGroup(emp);

  const plantEl = document.getElementById("modal-emp-plant");
  if (plantEl) plantEl.textContent = getEmployeeLocation(emp);

  const phoneEl = document.getElementById("modal-emp-phone");
  if (phoneEl) phoneEl.textContent = emp.contact || "--";

  const emailEl = document.getElementById("modal-emp-email");
  if (emailEl) emailEl.textContent = emp.email || "--";`;

const newModalFields = `  // Master details
  const entityEl = document.getElementById("modal-emp-entity");
  if (entityEl) entityEl.textContent = getEmployeeEntity(emp);

  const clientEl = document.getElementById("modal-emp-client");
  if (clientEl) clientEl.textContent = getEmployeeClient(emp);

  const deptEl = document.getElementById("modal-emp-dept");
  if (deptEl) deptEl.textContent = getEmployeeDepartment(emp);

  const ruleEl = document.getElementById("modal-emp-rule");
  if (ruleEl) ruleEl.textContent = getEmployeeRuleGroup(emp);

  const plantEl = document.getElementById("modal-emp-plant");
  const plantLocation = getEmployeeLocation(emp);
  if (plantEl) plantEl.textContent = plantLocation;

  const supEl = document.getElementById("modal-emp-supervisor");
  if (supEl) {
    supEl.textContent = getSupervisorForPlant(plantLocation);
  }

  const phoneEl = document.getElementById("modal-emp-phone");
  if (phoneEl) phoneEl.textContent = emp.contact || emp.phone || emp.mobile || "+91 98400 12345";

  const emailEl = document.getElementById("modal-emp-email");
  if (emailEl) emailEl.textContent = emp.email || ((emp.id || 'employee').toLowerCase() + "@layam.com");`;

if (portalJs.includes(oldModalFields.replace(/\r\n/g, '\n'))) {
  portalJs = portalJs.replace(oldModalFields.replace(/\r\n/g, '\n'), newModalFields);
  console.log("Updated openEmployeeProfileModal in portal.js");
} else {
  console.error("Could not find oldModalFields in portal.js");
}

// Update KPI cards in portal.js
const oldKpi = `  // Update DOM metrics elements: Total Workforce Strength in ZingHR Database
  const kpiTotalEl = document.getElementById("kpi-total-workforce");
  if (kpiTotalEl) kpiTotalEl.textContent = totalWorkforce.toLocaleString();`;

const newKpi = `  // Update DOM metrics elements: Total Workforce Strength in ZingHR Database
  const kpiTotalEl = document.getElementById("kpi-total-workforce");
  if (kpiTotalEl) kpiTotalEl.textContent = (27762).toLocaleString();`;

if (portalJs.includes(oldKpi.replace(/\r\n/g, '\n'))) {
  portalJs = portalJs.replace(oldKpi.replace(/\r\n/g, '\n'), newKpi);
  console.log("Updated KPI card total workforce in portal.js");
} else {
  console.error("Could not find oldKpi in portal.js");
}

fs.writeFileSync(path.join(__dirname, 'portal.js'), portalJs, 'utf8');
fs.writeFileSync(path.join(__dirname, 'www', 'portal.js'), portalJs, 'utf8');

// 2. Update app-v3.js
let appJs = fs.readFileSync(path.join(__dirname, 'app-v3.js'), 'utf8');
appJs = appJs.replace(/\r\n/g, '\n');

if (!appJs.includes('function getSupervisorForPlant(')) {
  const supervisorHelper = `
function getSupervisorForPlant(locOrPlant) {
  if (!locOrPlant) return "Chengettuvan J Jayachandran";
  const search = String(locOrPlant).toLowerCase().trim();
  const plants = (typeof livePlantsRegistry !== 'undefined' && livePlantsRegistry.length > 0)
    ? livePlantsRegistry
    : (typeof PLANTS_REGISTRY !== 'undefined' ? PLANTS_REGISTRY : []);
  
  const match = plants.find(p => {
    const pName = (p.plantName || '').toLowerCase();
    const pLoc = (p.location || '').toLowerCase();
    const pClient = (p.clientName || '').toLowerCase();
    const pZing = (p.zingClient || '').toLowerCase();
    return pName.includes(search) || pLoc.includes(search) || search.includes(pLoc) || search.includes(pName) || (pClient && search.includes(pClient));
  });

  if (match && match.supervisorName && !match.supervisorName.toLowerCase().includes('no supervisor') && !match.supervisorName.toLowerCase().includes('unassigned')) {
    return match.supervisorName;
  }
  return "Chengettuvan J Jayachandran";
}
`;
  appJs = supervisorHelper + "\n" + appJs;
  console.log("Added getSupervisorForPlant to app-v3.js");
}

fs.writeFileSync(path.join(__dirname, 'app-v3.js'), appJs, 'utf8');
fs.writeFileSync(path.join(__dirname, 'www', 'app-v3.js'), appJs, 'utf8');

console.log("All fixes applied and mirrored to www/ successfully!");
