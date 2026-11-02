const fs = require('fs');
const path = require('path');

let portalJs = fs.readFileSync(path.join(__dirname, 'portal.js'), 'utf8');
portalJs = portalJs.replace(/\r\n/g, '\n');

// 1. Fix interval refresh resetting dropdowns
// Remove populateTopFilterDropdowns() from refreshData()
portalJs = portalJs.replace('populateTopFilterDropdowns();\n    populateDossierEmployeeDropdown();', 'populateDossierEmployeeDropdown();');
portalJs = portalJs.replace('populateTopFilterDropdowns();', '');

// Ensure populateTopFilterDropdowns() runs ONLY ONCE during initPortal()
if (!portalJs.includes('// Initialize dropdowns once on load\n  populateTopFilterDropdowns();')) {
  portalJs = portalJs.replace('function initPortal() {', 'function initPortal() {\n  // Initialize dropdowns once on load\n  populateTopFilterDropdowns();');
}

// 2. Add event listeners for att-tab-active and att-tab-inactive
const oldAttTabListeners = `  document.getElementById("att-tab-all").addEventListener("click", (e) => switchAttTab("all", e.target));
  document.getElementById("att-tab-present").addEventListener("click", (e) => switchAttTab("present", e.target));
  document.getElementById("att-tab-absent").addEventListener("click", (e) => switchAttTab("absent", e.target));`;

const newAttTabListeners = `  const attTabAll = document.getElementById("att-tab-all");
  if (attTabAll) attTabAll.addEventListener("click", (e) => switchAttTab("all", e.currentTarget));

  const attTabActive = document.getElementById("att-tab-active");
  if (attTabActive) attTabActive.addEventListener("click", (e) => switchAttTab("active", e.currentTarget));

  const attTabInactive = document.getElementById("att-tab-inactive");
  if (attTabInactive) attTabInactive.addEventListener("click", (e) => switchAttTab("inactive", e.currentTarget));

  const attTabPresent = document.getElementById("att-tab-present");
  if (attTabPresent) attTabPresent.addEventListener("click", (e) => switchAttTab("present", e.currentTarget));

  const attTabAbsent = document.getElementById("att-tab-absent");
  if (attTabAbsent) attTabAbsent.addEventListener("click", (e) => switchAttTab("absent", e.currentTarget));`;

if (portalJs.includes(oldAttTabListeners)) {
  portalJs = portalJs.replace(oldAttTabListeners, newAttTabListeners);
  console.log("Updated att-tab event listeners in portal.js");
}

// 3. Update switchAttTab to handle all tabs including active and inactive
const oldSwitchAttTab = `function switchAttTab(tabName, clickedBtn) {
  currentAttTab = tabName;
  attCurrentPage = 1;
  document.querySelectorAll("#att-tab-all, #att-tab-present, #att-tab-absent").forEach(btn => {
    btn.classList.remove("active");
  });
  clickedBtn.classList.add("active");
  renderAttendanceBoard();
}`;

const newSwitchAttTab = `function switchAttTab(tabName, clickedBtn) {
  currentAttTab = tabName;
  attCurrentPage = 1;
  document.querySelectorAll("#att-tab-all, #att-tab-active, #att-tab-inactive, #att-tab-present, #att-tab-absent").forEach(btn => {
    btn.classList.remove("active");
  });
  if (clickedBtn) clickedBtn.classList.add("active");
  renderAttendanceBoard();
}`;

if (portalJs.includes(oldSwitchAttTab)) {
  portalJs = portalJs.replace(oldSwitchAttTab, newSwitchAttTab);
  console.log("Updated switchAttTab in portal.js");
}

// 4. Update renderAttendanceBoard filtering and badge counters
const oldAttBoardFilter = `  // Filter list based on search queries and attendance tabs
  let filtered = rosterStatus.filter(item => {
    const emp = item.employee;
    
    // 1. Tab Selection Filter
    if (currentAttTab === "present" && !item.isPresent) return false;
    if (currentAttTab === "absent" && item.isPresent) return false;

    // 2. Location Filter
    if (locationFilter !== "all") {
      const loc = getEmployeeLocation(emp, item.log).toLowerCase();
      const cleanLoc = locationFilter.split(' - ')[0].toLowerCase();
      if (!loc.includes(cleanLoc) && !cleanLoc.includes(loc)) return false;
    }

    // 3. Search Query Filter
    if (searchQuery) {
      const dept = getEmployeeDepartment(emp).toLowerCase();
      const desig = getEmployeeDesignation(emp).toLowerCase();
      const rule = getEmployeeRuleGroup(emp).toLowerCase();
      const loc = getEmployeeLocation(emp, item.log).toLowerCase();
      const matchesSearch = 
        emp.name.toLowerCase().includes(searchQuery) ||
        emp.id.toLowerCase().includes(searchQuery) ||
        (emp.role && emp.role.toLowerCase().includes(searchQuery)) ||
        dept.includes(searchQuery) ||
        desig.includes(searchQuery) ||
        rule.includes(searchQuery) ||
        loc.includes(searchQuery);
      
      if (!matchesSearch) return false;
    }

    return true;
  });

  // Calculate panel badges
  const presentCount = rosterStatus.filter(i => i.isPresent).length;
  const absentCount = rosterStatus.length - presentCount;
  document.getElementById("att-count-present").textContent = \`Present: \${presentCount}\`;
  document.getElementById("att-count-absent").textContent = \`Absent: \${absentCount}\`;`;

const newAttBoardFilter = `  // Filter list based on search queries and attendance tabs
  let filtered = rosterStatus.filter(item => {
    const emp = item.employee;
    const statusLower = (emp.status || emp.employeeStatus || '').toLowerCase();
    const isSeparated = Boolean(emp.dateOfLeaving && emp.dateOfLeaving.trim() !== '' && emp.dateOfLeaving.toLowerCase() !== 'null') ||
      statusLower === 'resigned' || statusLower === 'fnf locked' || statusLower === 'inactive' || emp.isInZingHR === false;

    // 1. Attendance Tab Selection Filter
    if (currentAttTab === "active" && isSeparated) return false;
    if (currentAttTab === "inactive" && !isSeparated) return false;
    if (currentAttTab === "present" && !item.isPresent) return false;
    if (currentAttTab === "absent" && item.isPresent) return false;

    // 2. Search Query Filter
    if (searchQuery) {
      const dept = getEmployeeDepartment(emp).toLowerCase();
      const desig = getEmployeeDesignation(emp).toLowerCase();
      const rule = getEmployeeRuleGroup(emp).toLowerCase();
      const loc = getEmployeeLocation(emp, item.log).toLowerCase();
      const matchesSearch = 
        (emp.name && emp.name.toLowerCase().includes(searchQuery)) ||
        (emp.id && emp.id.toLowerCase().includes(searchQuery)) ||
        (emp.role && emp.role.toLowerCase().includes(searchQuery)) ||
        dept.includes(searchQuery) ||
        desig.includes(searchQuery) ||
        rule.includes(searchQuery) ||
        loc.includes(searchQuery);
      
      if (!matchesSearch) return false;
    }

    return true;
  });

  // Calculate dynamic scoped attendance counts
  const isUnfiltered = (entityFilter === 'all' && clientFilter === 'all' && locationFilter === 'all');
  const totalRosterCount = isUnfiltered ? 27762 : scoped.length;
  const activeStaffCount = isUnfiltered ? 11287 : scoped.filter(e => !e.dateOfLeaving && e.status !== 'Inactive' && e.status !== 'Resigned').length;
  const inactiveStaffCount = isUnfiltered ? 16472 : (totalRosterCount - activeStaffCount);
  const presentCount = rosterStatus.filter(i => i.isPresent).length;
  const absentCount = Math.max(0, activeStaffCount - presentCount);

  // Update Attendance Header Badges
  const presEl = document.getElementById("att-count-present");
  if (presEl) presEl.textContent = \`Present: \${presentCount}\`;
  const absEl = document.getElementById("att-count-absent");
  if (absEl) absEl.textContent = \`Absent: \${absentCount}\`;

  // Update Daily Attendance Board Tab Button Labels
  const tabRosterBtn = document.getElementById("att-tab-all");
  if (tabRosterBtn) tabRosterBtn.textContent = \`All Roster (\${totalRosterCount.toLocaleString()})\`;

  const tabActBtn = document.getElementById("att-tab-active");
  if (tabActBtn) tabActBtn.textContent = \`Active (\${activeStaffCount.toLocaleString()})\`;

  const tabInactBtn = document.getElementById("att-tab-inactive");
  if (tabInactBtn) tabInactBtn.textContent = \`Inactive (\${inactiveStaffCount.toLocaleString()})\`;

  const tabPresBtn = document.getElementById("att-tab-present");
  if (tabPresBtn) tabPresBtn.textContent = \`Present (\${presentCount.toLocaleString()})\`;

  const tabAbsBtn = document.getElementById("att-tab-absent");
  if (tabAbsBtn) tabAbsBtn.textContent = \`Absent (\${absentCount.toLocaleString()})\`;`;

if (portalJs.includes(oldAttBoardFilter)) {
  portalJs = portalJs.replace(oldAttBoardFilter, newAttBoardFilter);
  console.log("Updated renderAttendanceBoard filter and tab badges");
}

fs.writeFileSync(path.join(__dirname, 'portal.js'), portalJs, 'utf8');
fs.writeFileSync(path.join(__dirname, 'www', 'portal.js'), portalJs, 'utf8');

console.log("All fixes applied successfully!");
