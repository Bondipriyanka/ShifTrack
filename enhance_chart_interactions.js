const fs = require('fs');

// 1. Update portal.html
let html = fs.readFileSync('portal.html', 'utf8');

html = html.replace(
  '<span id="location-chart-scope" style="font-size: 0.72rem; color: var(--color-primary); font-weight: 700;">All Locations</span>',
  '<span id="location-chart-scope" onclick="openSupervisorMappingModal()" style="font-size: 0.72rem; color: var(--color-primary); font-weight: 700; cursor: pointer; text-decoration: underline;" title="Click to view all 72 Plant Locations & Assigned Supervisors">View All 72 Plants ↗</span>'
);

html = html.replace(
  '<span style="font-size: 0.72rem; color: var(--color-primary); font-weight: 700;">Roster Shifts</span>',
  '<span onclick="openShiftRulesModal()" style="font-size: 0.72rem; color: var(--color-primary); font-weight: 700; cursor: pointer; text-decoration: underline;" title="Click to view shift rules & timings">Roster Shift Rules ↗</span>'
);

fs.writeFileSync('portal.html', html, 'utf8');
fs.writeFileSync('www/portal.html', html, 'utf8');
console.log('✅ portal.html and www/portal.html links enhanced.');

// 2. Update portal.js to ensure shift chart sums to exactly 11,284 active employees
let js = fs.readFileSync('portal.js', 'utf8');

const oldShiftStats = `    const shiftStats = [
      { name: "General Shift (09:00 - 17:30)", total: 4820, present: 4560, color: "#2563eb" },
      { name: "Morning Shift (06:00 - 14:00)", total: 3240, present: 3110, color: "#16a34a" },
      { name: "Evening Shift (14:00 - 22:00)", total: 2150, present: 2010, color: "#d97706" },
      { name: "Night Shift (22:00 - 06:00)", total: 1077, present: 985, color: "#7c3aed" }
    ];`;

const newShiftStats = `    const shiftStats = [
      { name: "General Shift (09:00 - 17:30)", total: 4820, present: 4560, color: "#2563eb" },
      { name: "Morning Shift (06:00 - 14:00)", total: 3240, present: 3110, color: "#16a34a" },
      { name: "Evening Shift (14:00 - 22:00)", total: 2150, present: 2010, color: "#d97706" },
      { name: "Night Shift (22:00 - 06:00)", total: 1074, present: 985, color: "#7c3aed" }
    ];`;

js = js.replace(oldShiftStats, newShiftStats);

fs.writeFileSync('portal.js', js, 'utf8');
fs.writeFileSync('www/portal.js', js, 'utf8');
console.log('✅ portal.js updated.');
