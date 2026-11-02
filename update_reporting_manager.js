const fs = require('fs');
const path = require('path');

// 1. Update server.js
let serverJs = fs.readFileSync(path.join(__dirname, 'server.js'), 'utf8');
serverJs = serverJs.replace(/\r\n/g, '\n');

const oldHier = `function getEmployeeCorporateHierarchy(emp) {
  if (!emp) {
    return {
      legalEntity: 'Layam Flexi Solutions Pvt. Ltd.',
      client: 'Layam Group',
      location: 'Chennai',
      attendanceRuleGroup: 'Common'
    };
  }
  const legalEntity = emp.LegalEntity || emp.legalEntity || emp.Company || emp.company || 'Layam Flexi Solutions Pvt. Ltd.';
  const client = emp.Client || emp.client || emp.clientName || 'Layam Group';
  const location = emp.Location || emp.location || emp.plantLocation || emp.City || emp.city || 'Chennai';
  const attendanceRuleGroup = emp.AttendanceRuleGroup || emp.attendanceRuleGroup || emp.shift || emp.Attendance_Rule_Group || 'Common';

  return {
    legalEntity,
    client,
    location,
    attendanceRuleGroup
  };
}`;

const newHier = `function getSupervisorForPlantServer(locOrPlant) {
  if (!locOrPlant) return "Chengettuvan J Jayachandran";
  const search = String(locOrPlant).toLowerCase().trim();
  const plants = typeof PLANTS_REGISTRY !== 'undefined' ? PLANTS_REGISTRY : [];
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

function getEmployeeCorporateHierarchy(emp) {
  if (!emp) {
    return {
      legalEntity: 'Layam Flexi Solutions Pvt. Ltd.',
      client: 'Layam Group',
      location: 'Chennai',
      attendanceRuleGroup: 'Common',
      supervisor: 'Chengettuvan J Jayachandran'
    };
  }
  const legalEntity = emp.LegalEntity || emp.legalEntity || emp.Company || emp.company || 'Layam Flexi Solutions Pvt. Ltd.';
  const client = emp.Client || emp.client || emp.clientName || 'Layam Group';
  const location = emp.Location || emp.location || emp.plantLocation || emp.City || emp.city || 'Chennai';
  const attendanceRuleGroup = emp.AttendanceRuleGroup || emp.attendanceRuleGroup || emp.shift || emp.Attendance_Rule_Group || 'Common';
  const supervisor = (emp.reportingManager && emp.reportingManager !== 'Jenil Anto Alphonse') ? emp.reportingManager : (emp.supervisor || getSupervisorForPlantServer(location || client));

  return {
    legalEntity,
    client,
    location,
    attendanceRuleGroup,
    supervisor
  };
}`;

if (serverJs.includes(oldHier)) {
  serverJs = serverJs.replace(oldHier, newHier);
  console.log("Updated getEmployeeCorporateHierarchy in server.js");
} else {
  console.error("Could not find oldHier in server.js");
}

const oldRepMgr = `reportingManager: emp.reportingManager || emp.manager || emp.supervisor || (hier.supervisor || 'Jenil Anto Alphonse'),`;
const newRepMgr = `reportingManager: (emp.reportingManager && emp.reportingManager !== 'Jenil Anto Alphonse') ? emp.reportingManager : (emp.supervisor || hier.supervisor || getSupervisorForPlantServer(hier.location || hier.client)),`;

if (serverJs.includes(oldRepMgr)) {
  serverJs = serverJs.replace(oldRepMgr, newRepMgr);
  console.log("Updated reportingManager in server.js endpoint");
} else {
  console.error("Could not find oldRepMgr in server.js");
}

fs.writeFileSync(path.join(__dirname, 'server.js'), serverJs, 'utf8');

// 2. Update app-v3.js
let appJs = fs.readFileSync(path.join(__dirname, 'app-v3.js'), 'utf8');
appJs = appJs.replace(/\r\n/g, '\n');

const oldAppRep = `const repMgr = emp.reportingManager || emp.supervisor || (typeof getSupervisorForPlant === 'function' ? getSupervisorForPlant(emp.plantLocation || emp.location) : 'Jenil Anto Alphonse');`;
const newAppRep = `const plantLoc = emp.plantLocation || emp.location || (window.currentSupervisorScope && window.currentSupervisorScope.plantName) || (typeof appState !== 'undefined' && appState.currentSupervisor && appState.currentSupervisor.plantName) || '';
        const plantSup = (typeof getSupervisorForPlant === 'function') ? getSupervisorForPlant(plantLoc) : ((typeof appState !== 'undefined' && appState.currentSupervisor) ? appState.currentSupervisor.name : 'Chengettuvan J Jayachandran');
        const repMgr = (emp.reportingManager && emp.reportingManager !== 'Jenil Anto Alphonse' && !emp.reportingManager.includes('No Supervisor')) ? emp.reportingManager : plantSup;`;

if (appJs.includes(oldAppRep)) {
  appJs = appJs.replace(oldAppRep, newAppRep);
  console.log("Updated repMgr in app-v3.js");
} else {
  console.error("Could not find oldAppRep in app-v3.js");
}

fs.writeFileSync(path.join(__dirname, 'app-v3.js'), appJs, 'utf8');
fs.writeFileSync(path.join(__dirname, 'www', 'app-v3.js'), appJs, 'utf8');

console.log("Updated both server.js and app-v3.js successfully!");
