const fs = require('fs');
const appJs = fs.readFileSync('d:/ShifTrack/app-v3.js', 'utf8');
const m = appJs.match(/const PLANTS_REGISTRY = (\[[\s\S]*?\n\];)/);
const PLANTS_REGISTRY = eval(m[1]);

const db = JSON.parse(fs.readFileSync('d:/ShifTrack/db.json', 'utf8'));
const zList = Object.values(db.zinghr || {});

console.log('Entities in PLANTS_REGISTRY:', Array.from(new Set(PLANTS_REGISTRY.map(p => p.entity))));

// Map entities to clients and locations
const entityMap = {};
PLANTS_REGISTRY.forEach(p => {
  const ent = p.entity || 'Layam Flexi Solutions Pvt. Ltd.';
  if (!entityMap[ent]) entityMap[ent] = { clients: new Set(), locations: new Set(), plants: [] };
  entityMap[ent].clients.add(p.zingClient || p.clientName);
  entityMap[ent].locations.add(p.location);
  entityMap[ent].plants.push(p.plantName);
});

for (const ent in entityMap) {
  console.log(`\n=== Entity: ${ent} ===`);
  console.log(`Clients (${entityMap[ent].clients.size}):`, Array.from(entityMap[ent].clients));
  console.log(`Locations (${entityMap[ent].locations.size}):`, Array.from(entityMap[ent].locations));
  console.log(`Plants (${entityMap[ent].plants.length})`);
}
