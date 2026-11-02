const fs = require('fs');
const db = JSON.parse(fs.readFileSync('d:/ShifTrack/db.json', 'utf8'));

console.log({
  zinghrCount: Object.keys(db.zinghr || {}).length,
  employeesCount: Array.isArray(db.employees) ? db.employees.length : Object.keys(db.employees || {}).length,
  rosterCount: Object.keys(db.roster || {}).length,
  zinghr_stats: db.zinghr_stats
});
