const fs = require('fs');
const serverCode = fs.readFileSync('d:/ShifTrack/server.js', 'utf8');

// We can run server's resolveSupervisorScope and filterEmployeesForScope
const script = `
${serverCode}

const db = readDB();
const allEmps = getEmployeeMasterList();

console.log("Total master list:", allEmps.length);

// Test Plant 22: AL Ennore (Layam) - Ennore
const scopeEnnore = resolveSupervisorScope('AL Ennore (Layam) - Ennore', 'Layam Flexi Solutions Pvt. Ltd.', 'Ashok Leyland Ltd Ennore', 'Ennore');
console.log("Ennore Scope:", scopeEnnore);
const ennoreEmps = filterEmployeesForScope(scopeEnnore, allEmps);
const activeEnnore = ennoreEmps.filter(e => {
  const status = (e.status || e.employeeStatus || '').trim().toLowerCase();
  const isDol = e.DateOfLeaving || e.dateOfLeaving;
  const isLeaving = isDol && String(isDol).trim() !== '' && String(isDol).toLowerCase() !== 'null';
  return status === 'active' || (!isLeaving && status !== 'inactive' && status !== 'resigned' && status !== 'fnf locked');
});
console.log(\`Ennore Total: \${ennoreEmps.length}, Active: \${activeEnnore.length}, Inactive: \${ennoreEmps.length - activeEnnore.length}\`);

// Test Plant 2: Mahindra (MSPT) - MSPT
const scopeMspt = resolveSupervisorScope('Mahindra (MSPT) - MSPT', 'Layam Flexi Solutions Pvt. Ltd.', 'Mahindra and Mahindra Ltd.', 'MSPT');
const msptEmps = filterEmployeesForScope(scopeMspt, allEmps);
const activeMspt = msptEmps.filter(e => {
  const status = (e.status || e.employeeStatus || '').trim().toLowerCase();
  const isDol = e.DateOfLeaving || e.dateOfLeaving;
  const isLeaving = isDol && String(isDol).trim() !== '' && String(isDol).toLowerCase() !== 'null';
  return status === 'active' || (!isLeaving && status !== 'inactive' && status !== 'resigned' && status !== 'fnf locked');
});
console.log(\`MSPT Total: \${msptEmps.length}, Active: \${activeMspt.length}, Inactive: \${msptEmps.length - activeMspt.length}\`);
`;

eval(script);
