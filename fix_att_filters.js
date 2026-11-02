const fs = require('fs');
const path = require('path');

let portalJs = fs.readFileSync(path.join(__dirname, 'portal.js'), 'utf8');
portalJs = portalJs.replace(/\r\n/g, '\n');

const oldAttFilter = `  // Filter list based on location selection and search queries
  let filtered = rosterStatus.filter(item => {
    const emp = item.employee;
    
    // 1. Tab Selection Filter
    if (currentAttTab === "present" && !item.isPresent) return false;
    if (currentAttTab === "absent" && item.isPresent) return false;

    // 2. Location Filter
    if (locationFilter !== "all") {
      if (item.isPresent) {
        if (!item.log || item.log.location !== locationFilter) return false;
      } else {
        const cleanAddr = (emp.address || "").toLowerCase();
        const cleanLoc = locationFilter.split(" - ")[0].toLowerCase();
        if (!cleanAddr.includes(cleanLoc)) return false;
      }
    }`;

const newAttFilter = `  const entityFilter = (document.getElementById("portal-entity-filter")?.value || 'all').toLowerCase();
  const clientFilter = (document.getElementById("portal-client-filter")?.value || 'all').toLowerCase();

  // Filter list based on entity, client, location selection and search queries
  let filtered = rosterStatus.filter(item => {
    const emp = item.employee;
    
    // 0. Top Entity & Client Filter
    if (entityFilter !== 'all') {
      const ent = getEmployeeEntity(emp).toLowerCase();
      if (!ent.includes(entityFilter)) return false;
    }
    if (clientFilter !== 'all') {
      const cli = getEmployeeClient(emp).toLowerCase();
      const cleanCli = clientFilter.split(' ')[0].toLowerCase();
      if (!cli.includes(cleanCli)) return false;
    }

    // 1. Tab Selection Filter
    if (currentAttTab === "present" && !item.isPresent) return false;
    if (currentAttTab === "absent" && item.isPresent) return false;

    // 2. Location Filter
    if (locationFilter !== "all") {
      const loc = getEmployeeLocation(emp, item.log).toLowerCase();
      const cleanLoc = locationFilter.split(' - ')[0].toLowerCase();
      if (!loc.includes(cleanLoc) && !cleanLoc.includes(loc)) return false;
    }`;

if (portalJs.includes(oldAttFilter)) {
  portalJs = portalJs.replace(oldAttFilter, newAttFilter);
  console.log("Updated renderAttendanceBoard filter with Entity & Client support");
}

fs.writeFileSync(path.join(__dirname, 'portal.js'), portalJs, 'utf8');
fs.writeFileSync(path.join(__dirname, 'www', 'portal.js'), portalJs, 'utf8');

console.log("Synced to www/ successfully!");
