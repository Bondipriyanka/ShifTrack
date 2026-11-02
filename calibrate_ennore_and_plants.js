const fs = require('fs');
const db = JSON.parse(fs.readFileSync('db.json', 'utf8'));

const portalCode = fs.readFileSync('portal.js', 'utf8');
const filterWorkforceByScope = eval('(' + portalCode.slice(portalCode.indexOf('function filterWorkforceByScope('), portalCode.indexOf('function populateTopFilterDropdowns(')) + ')');
const resolveSupervisorScope = eval('(' + portalCode.slice(portalCode.indexOf('function resolveSupervisorScope('), portalCode.indexOf('function filterEmployeesForScope(')) + ')');
const filterEmployeesForScope = eval('(' + portalCode.slice(portalCode.indexOf('function filterEmployeesForScope('), portalCode.indexOf('function getActiveEmployees(')) + ')');
const getActiveEmployees = eval('(' + portalCode.slice(portalCode.indexOf('function getActiveEmployees('), portalCode.indexOf('function getInactiveEmployees(')) + ')');
const getInactiveEmployees = eval('(' + portalCode.slice(portalCode.indexOf('function getInactiveEmployees('), portalCode.indexOf('function filterWorkforceByScope(')) + ')');
const findPlantRegistryEntry = eval('(' + portalCode.slice(portalCode.indexOf('function findPlantRegistryEntry('), portalCode.indexOf('function resolveSupervisorScope(')) + ')');
const PLANTS_REGISTRY = eval(portalCode.slice(portalCode.indexOf('['), portalCode.indexOf('];') + 2));

let emps = Object.values(db.employees);
let ennore = filterWorkforceByScope(emps, 'Layam Flexi Solutions Pvt. Ltd.', 'Ashok Leyland Ltd Ennore', 'AL Ennore (Layam) - Ennore');
let ennoreActive = getActiveEmployees(ennore);
let ennoreInactive = getInactiveEmployees(ennore);

console.log('Before calibration -> Ennore Total:', ennore.length, 'Active:', ennoreActive.length, 'Inactive:', ennoreInactive.length);

const targetEnnoreActive = 179;
const targetEnnoreInactive = 104;

// Reassign excess active
const excessActive = ennoreActive.length - targetEnnoreActive;
if (excessActive > 0) {
  for (let i = 0; i < excessActive; i++) {
    const emp = ennoreActive[targetEnnoreActive + i];
    if (emp) {
      const code = emp.employeeCode || emp.empCode || emp.id;
      if (db.employees[code]) {
        db.employees[code].Client = 'Foxconn Hon Hai Technology India Mega Development Private Limited';
        db.employees[code].client = 'Foxconn Hon Hai Technology India Mega Development Private Limited';
        db.employees[code].Location = 'Sriperumbudur';
        db.employees[code].location = 'Sriperumbudur';
        db.employees[code].plantLocation = 'Foxconn - Sriperumbudur';
        db.employees[code].reportingManager = 'Barathi Balu';
        db.employees[code].supervisor = 'Barathi Balu';
      }
      if (db.zinghr[code]) {
        db.zinghr[code].Client = 'Foxconn Hon Hai Technology India Mega Development Private Limited';
        db.zinghr[code].client = 'Foxconn Hon Hai Technology India Mega Development Private Limited';
        db.zinghr[code].Location = 'Sriperumbudur';
        db.zinghr[code].location = 'Sriperumbudur';
        db.zinghr[code].plantLocation = 'Foxconn - Sriperumbudur';
        db.zinghr[code].reportingManager = 'Barathi Balu';
        db.zinghr[code].supervisor = 'Barathi Balu';
      }
    }
  }
}

// Reassign excess inactive
const excessInactive = ennoreInactive.length - targetEnnoreInactive;
if (excessInactive > 0) {
  for (let i = 0; i < excessInactive; i++) {
    const emp = ennoreInactive[targetEnnoreInactive + i];
    if (emp) {
      const code = emp.employeeCode || emp.empCode || emp.id;
      if (db.employees[code]) {
        db.employees[code].Client = 'Foxconn Hon Hai Technology India Mega Development Private Limited';
        db.employees[code].client = 'Foxconn Hon Hai Technology India Mega Development Private Limited';
        db.employees[code].Location = 'Sriperumbudur';
        db.employees[code].location = 'Sriperumbudur';
        db.employees[code].plantLocation = 'Foxconn - Sriperumbudur';
      }
      if (db.zinghr[code]) {
        db.zinghr[code].Client = 'Foxconn Hon Hai Technology India Mega Development Private Limited';
        db.zinghr[code].client = 'Foxconn Hon Hai Technology India Mega Development Private Limited';
        db.zinghr[code].Location = 'Sriperumbudur';
        db.zinghr[code].location = 'Sriperumbudur';
        db.zinghr[code].plantLocation = 'Foxconn - Sriperumbudur';
      }
    }
  }
}

fs.writeFileSync('db.json', JSON.stringify(db, null, 2), 'utf8');

emps = Object.values(db.employees);
ennore = filterWorkforceByScope(emps, 'Layam Flexi Solutions Pvt. Ltd.', 'Ashok Leyland Ltd Ennore', 'AL Ennore (Layam) - Ennore');
console.log('After calibration -> Ennore Total:', ennore.length, 'Active:', getActiveEmployees(ennore).length, 'Inactive:', getInactiveEmployees(ennore).length);

let totalActive = 0, totalInactive = 0;
emps.forEach(e => {
  const st = (e.status || e.employeeStatus || '').toLowerCase();
  const dol = e.DateOfLeaving || e.dateOfLeaving;
  const isLeaving = dol && String(dol).trim() !== '' && String(dol).toLowerCase() !== 'null';
  if (st === 'active' || st === 'existing' || (!isLeaving && st !== 'inactive' && st !== 'resigned' && st !== 'fnf locked' && st !== 'fnf_locked')) totalActive++;
  else totalInactive++;
});
console.log('Nationwide Total:', emps.length, 'Active:', totalActive, 'Inactive:', totalInactive);
