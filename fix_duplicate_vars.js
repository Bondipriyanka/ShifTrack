const fs = require('fs');
const path = require('path');

let portalJs = fs.readFileSync(path.join(__dirname, 'portal.js'), 'utf8');
portalJs = portalJs.replace(/\r\n/g, '\n');

// Clean up renderAttendanceBoard duplicate declaration
const oldDuplicateSection = `  const entityFilter = (document.getElementById("portal-entity-filter")?.value || 'all').toLowerCase();
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
    if (currentAttTab === "absent" && item.isPresent) return false;`;

const newDuplicateSection = `  // Filter list based on search queries and attendance tabs
  let filtered = rosterStatus.filter(item => {
    const emp = item.employee;
    
    // 1. Tab Selection Filter
    if (currentAttTab === "present" && !item.isPresent) return false;
    if (currentAttTab === "absent" && item.isPresent) return false;`;

if (portalJs.includes(oldDuplicateSection)) {
  portalJs = portalJs.replace(oldDuplicateSection, newDuplicateSection);
  console.log("Removed duplicate entityFilter/clientFilter declarations in renderAttendanceBoard");
}

fs.writeFileSync(path.join(__dirname, 'portal.js'), portalJs, 'utf8');
fs.writeFileSync(path.join(__dirname, 'www', 'portal.js'), portalJs, 'utf8');

console.log("portal.js updated and synced to www/ successfully!");
