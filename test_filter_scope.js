const fs = require('fs');
const db = JSON.parse(fs.readFileSync('d:/ShifTrack/db.json', 'utf8'));
const appJs = fs.readFileSync('d:/ShifTrack/app-v3.js', 'utf8');
const plantsMatch = appJs.match(/const PLANTS_REGISTRY = (\[[\s\S]*?\n\];)/);
const PLANTS_REGISTRY = eval(plantsMatch[1]);

const allEmployees = Object.values(db.zinghr || {});
console.log('Total zinghr in db:', allEmployees.length);

// Test plant 7: Tata Electronics MG
const p7 = PLANTS_REGISTRY.find(p => p.sno === 7);
console.log('Plant 7:', p7);

const p7Employees = allEmployees.filter(e => {
  const client = (e.Client || e.client || e.clientName || '').toLowerCase();
  const loc = (e.Location || e.location || e.plantLocation || e.City || '').toLowerCase();
  const ent = (e.LegalEntity || e.legalEntity || e.Company || '').toLowerCase();
  
  const matchClient = client.includes('tata electronics') || client.includes(p7.zingClient.toLowerCase()) || client.includes(p7.clientName.toLowerCase());
  const matchLoc = loc.includes('krishnagiri') || loc.includes('mg');
  return matchClient;
});

const activeCount = p7Employees.filter(e => !e.dateOfLeaving && e.status !== 'Inactive' && e.status !== 'Resigned').length;
const inactiveCount = p7Employees.length - activeCount;

console.log(`Matched Plant 7: Total = ${p7Employees.length}, Active = ${activeCount}, Inactive = ${inactiveCount}`);
