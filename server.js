const http = require('http');
const https = require('https');
const selfsigned = require('selfsigned');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

let isPgConnected = false;

// PostgreSQL Connection Pool Setup
const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || 'system',
  database: process.env.PGDATABASE || 'attendance_db',
  port: parseInt(process.env.PGPORT || '5432'),
  connectionTimeoutMillis: 3000,
});

// Automatically create logs table and indexes if PostgreSQL is active
async function initDatabase() {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS attendance_logs (
      id SERIAL PRIMARY KEY,
      emp_id VARCHAR(50) NOT NULL,
      name VARCHAR(100) NOT NULL,
      timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
      location VARCHAR(150) NOT NULL,
      gps VARCHAR(100) NOT NULL,
      verified BOOLEAN DEFAULT TRUE,
      sync_status VARCHAR(50) DEFAULT 'Synced'
    );
    CREATE INDEX IF NOT EXISTS idx_attendance_emp_date ON attendance_logs (emp_id, timestamp);
  `;
  try {
    await pool.query(createTableQuery);
    isPgConnected = true;
    console.log("PostgreSQL Enterprise Engine: Table 'attendance_logs' and high-speed indexes initialized successfully.");
  } catch (err) {
    isPgConnected = false;
    console.log("PostgreSQL Engine Notice: Operating in Standalone Mode (db.json / Zing HR sync active). PostgreSQL Error:", err.message);
  }
}
initDatabase();

// Persist check-in record to PostgreSQL DB asynchronously
async function saveLogToPostgres(log) {
  if (!isPgConnected) return;
  const insertQuery = `
    INSERT INTO attendance_logs (emp_id, name, timestamp, location, gps, verified, sync_status)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
  `;
  try {
    await pool.query(insertQuery, [
      log.empId || 'UNKNOWN',
      log.name || 'Anonymous Worker',
      new Date(log.timestamp || Date.now()),
      log.location || 'Tata Motors - Gate 1',
      log.gps || '18.6421°, 73.8056°',
      log.verified !== undefined ? log.verified : true,
      log.syncStatus || 'Synced'
    ]);
    console.log(`[PostgreSQL Enterprise DB] Successfully inserted SQL attendance log for ${log.empId} (${log.name})`);
  } catch (err) {
    console.error("[PostgreSQL Persistence Warning]:", err.message);
  }
}

const PORT = 3000;
const DB_FILE = path.join(__dirname, 'db.json');

// Initial default roster
const DEFAULT_ROSTER = {
  "emp-001": {
    id: "LYAM-7088",
    name: "Vikram Sharma",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&h=100&q=80",
    initials: "VS",
    role: "Plant Operator",
    shift: "Morning Shift (A)",
    status: "Active",
    location: "Tata Motors - Gate 1",
    faceVector: "[0.142, -0.098, 0.441, ..., -0.211]"
  },
  "emp-002": {
    id: "LYAM-9021",
    name: "Priya Patel",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&h=100&q=80",
    initials: "PP",
    role: "Assembly Engineer",
    shift: "Morning Shift (A)",
    status: "Active",
    location: "Tata Motors - Assembly Line B",
    faceVector: "[-0.034, 0.128, 0.389, ..., 0.082]"
  },
  "emp-003": {
    id: "LYAM-4110",
    name: "Amit Mishra",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=100&h=100&q=80",
    initials: "AM",
    role: "Quality Inspector",
    shift: "General Shift (G)",
    status: "Active",
    location: "Reliance Industries - Plant A",
    faceVector: "[0.277, -0.198, 0.021, ..., -0.045]"
  },
  "emp-004": {
    id: "LYAM-8872",
    name: "Anjali Sen",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&h=100&q=80",
    initials: "AS",
    role: "Logistics Officer",
    shift: "Evening Shift (B)",
    status: "Active",
    location: "Adani Port - Cargo Yard",
    faceVector: "[0.012, 0.312, -0.188, ..., 0.119]"
  }
};

const DEFAULT_ZINGHR = {
  "EMP001": {
    id: "EMP001",
    name: "Priyanka M",
    avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=100&h=100&q=80",
    role: "Contract Staff",
    shift: "Morning Shift (A)",
    address: "Layam Plant gate, Sector 4, Pune, Maharashtra",
    email: "priyanka.m@layam.com",
    contact: "+91 98765 43210",
    attendance: [],
    gatePhotos: []
  },
  "EMP002": {
    id: "EMP002",
    name: "Vikram Sharma",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&h=100&q=80",
    role: "Plant Operator",
    shift: "Morning Shift (A)",
    address: "Tata Motors Area, Pune, Maharashtra",
    email: "vikram.s@layam.com",
    contact: "+91 87654 32109",
    attendance: [],
    gatePhotos: []
  },
  "EMP003": {
    id: "EMP003",
    name: "Priya Patel",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&h=100&q=80",
    role: "Assembly Engineer",
    shift: "Morning Shift (A)",
    address: "Assembly Line B quarters, Pune",
    email: "priya.p@layam.com",
    contact: "+91 76543 21098",
    attendance: [],
    gatePhotos: []
  },
  "EMP004": {
    id: "EMP004",
    name: "Amit Mishra",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=100&h=100&q=80",
    role: "Quality Inspector",
    shift: "General Shift (G)",
    address: "Reliance Plant quarters, Pune",
    email: "amit.m@layam.com",
    contact: "+91 65432 10987",
    attendance: [],
    gatePhotos: []
  },
  "EMP005": {
    id: "EMP005",
    name: "Anjali Sen",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&h=100&q=80",
    role: "Logistics Officer",
    shift: "Evening Shift (B)",
    address: "Adani Cargo Yard, Pune",
    email: "anjali.s@layam.com",
    contact: "+91 54321 09876",
    attendance: [],
    gatePhotos: []
  }
};

const DEFAULT_DB = {
  roster: DEFAULT_ROSTER,
  logs: [],
  zinghr: DEFAULT_ZINGHR
};

// Ensure db.json exists
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify(DEFAULT_DB, null, 2));
}

function readDB() {
  try {
    const data = fs.readFileSync(DB_FILE, 'utf8');
    const parsed = JSON.parse(data);
    
    // Ensure zinghr schema exists
    let modified = false;
    if (!parsed.zinghr) {
      parsed.zinghr = DEFAULT_ZINGHR;
      modified = true;
    }
    
    // Automatically rebuild/sync zinghr attendance arrays from logs!
    if (parsed.zinghr && parsed.logs) {
      // Clear attendance arrays to rebuild them cleanly from logs
      for (const key in parsed.zinghr) {
        parsed.zinghr[key].attendance = [];
      }
      
      // Seed the mock history for Vikram, Priya Patel, Amit again so they have data
      if (parsed.zinghr["EMP002"]) parsed.zinghr["EMP002"].attendance = ["2026-07-01", "2026-07-02", "2026-07-03", "2026-07-06", "2026-07-07", "2026-07-08", "2026-07-09", "2026-07-10", "2026-07-13", "2026-07-14", "2026-07-15", "2026-07-16", "2026-07-17", "2026-07-20", "2026-07-21"];
      if (parsed.zinghr["EMP003"]) parsed.zinghr["EMP003"].attendance = ["2026-07-01", "2026-07-02", "2026-07-03", "2026-07-06", "2026-07-07", "2026-07-10", "2026-07-13", "2026-07-14", "2026-07-15", "2026-07-16", "2026-07-17", "2026-07-20", "2026-07-21"];
      if (parsed.zinghr["EMP004"]) parsed.zinghr["EMP004"].attendance = ["2026-07-01", "2026-07-02", "2026-07-07", "2026-07-08", "2026-07-09", "2026-07-10", "2026-07-14", "2026-07-15", "2026-07-16", "2026-07-21"];
      
      // Parse logs and append dates
      parsed.logs.forEach(log => {
        if (!log.empId) return;
        const logCleanId = log.empId.toUpperCase().replace(/[^A-Z0-9]/g, '');
        const dateStr = new Date(log.timestamp).toISOString().split('T')[0];
        
        for (const key in parsed.zinghr) {
          const cleanZingId = parsed.zinghr[key].id.toUpperCase().replace(/[^A-Z0-9]/g, '');
          if (cleanZingId === logCleanId) {
            if (!parsed.zinghr[key].attendance.includes(dateStr)) {
              parsed.zinghr[key].attendance.push(dateStr);
            }
            break;
          }
        }
      });
      modified = true;
    }
    
    // Automatically self-heal roster & zinghr profile avatars from captured gate photos
    if (parsed.roster) {
      for (const rKey in parsed.roster) {
        const emp = parsed.roster[rKey];
        if (emp.gatePhotos && emp.gatePhotos.length > 0 && emp.avatar !== emp.gatePhotos[0]) {
          emp.avatar = emp.gatePhotos[0];
          modified = true;
        }
        
        if (parsed.zinghr) {
          const cleanId = (emp.id || rKey).toUpperCase().replace(/[^A-Z0-9]/g, '');
          for (const zKey in parsed.zinghr) {
            const cleanZKey = zKey.toUpperCase().replace(/[^A-Z0-9]/g, '');
            const cleanZId = (parsed.zinghr[zKey].id || zKey).toUpperCase().replace(/[^A-Z0-9]/g, '');
            if (cleanZKey === cleanId || cleanZId === cleanId) {
              if (emp.gatePhotos && emp.gatePhotos.length > 0 && parsed.zinghr[zKey].avatar !== emp.gatePhotos[0]) {
                parsed.zinghr[zKey].avatar = emp.gatePhotos[0];
                parsed.zinghr[zKey].gatePhotos = emp.gatePhotos;
                modified = true;
              }
            }
          }
        }
      }
    }
    
    if (modified) {
      fs.writeFileSync(DB_FILE, JSON.stringify(parsed, null, 2));
    }
    
    return parsed;
  } catch (err) {
    return DEFAULT_DB;
  }
}

function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

function postToAIServer(path, payload, callback) {
  const data = JSON.stringify(payload);
  const options = {
    hostname: '127.0.0.1',
    port: 8000,
    path: path,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data)
    }
  };

  const req = http.request(options, (res) => {
    let body = '';
    res.on('data', (chunk) => { body += chunk; });
    res.on('end', () => {
      try {
        const responseData = JSON.parse(body);
        callback(null, responseData);
      } catch (e) {
        callback(new Error('Invalid JSON from AI server'), null);
      }
    });
  });

  req.on('error', (e) => {
    callback(e, null);
  });

  req.write(data);
  req.end();
}

const requestHandler = async (req, res) => {
  // Add CORS headers so mobile app can connect
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = req.url;

  // API Endpoints
  if (url === '/api/roster' && req.method === 'GET') {
    const db = readDB();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(db.roster));
    return;
  }

  if (url === '/api/roster' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        const db = readDB();
        
        let key = payload.key;
        let employee = payload.employee;
        
        // Fallback for direct employee payloads
        if (!employee) {
          employee = payload;
          key = `emp-custom-${Date.now()}`;
        }
        
        db.roster[key] = employee;
        
        // Link with Zing HR record if matches Zing HR ID (robust lookup)
        const cleanEmpId = key.toUpperCase().replace(/[^A-Z0-9]/g, '');
        let zingEmpKey = null;
        for (const zKey in db.zinghr) {
          if (zKey.toUpperCase().replace(/[^A-Z0-9]/g, '') === cleanEmpId || 
              db.zinghr[zKey].id.toUpperCase().replace(/[^A-Z0-9]/g, '') === cleanEmpId) {
            zingEmpKey = zKey;
            break;
          }
        }
        
        if (zingEmpKey) {
          db.zinghr[zingEmpKey].gatePhotos = employee.gatePhotos || [];
          // Also set the main Zing HR profile picture (avatar) to the first gate photo taken,
          // so the reports tab immediately displays the newly captured gate registration photo!
          if (employee.gatePhotos && employee.gatePhotos.length > 0) {
            db.zinghr[zingEmpKey].avatar = employee.gatePhotos[0];
          }
        }
        
        writeDB(db);
        
        // Notify AI server to precompute embedding for all gate photographs in background
        if (employee && employee.gatePhotos && employee.gatePhotos.length > 0) {
          employee.gatePhotos.forEach((photo, idx) => {
            postToAIServer('/api/biometric/register', { key: `${key}_${idx + 1}`, avatar: photo }, (err, aiRes) => {
              if (err) console.error(`AI Server Sync warning (gate photo ${idx + 1}):`, err.message);
              else console.log(`AI Server Sync: Successfully registered gate photo ${idx + 1} for ${key}`);
            });
          });
        } else if (employee && employee.avatar) {
          postToAIServer('/api/biometric/register', { key: key, avatar: employee.avatar }, (err, aiRes) => {
            if (err) console.error("AI Server Sync warning:", err.message);
            else console.log("AI Server Sync: Successfully registered embedding.");
          });
        }
        
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, employeeId: key, employee }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON body' }));
      }
    });
    return;
  }

  if (url === '/api/biometric/check-duplicate' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        postToAIServer('/api/biometric/check-duplicate', payload, (err, aiResponse) => {
          if (err) {
            console.error("AI Server connection error:", err.message);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ duplicate: false }));
          } else {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(aiResponse));
          }
        });
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON body' }));
      }
    });
    return;
  }

  if (url === '/api/biometric/scan' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        postToAIServer('/api/biometric/scan', payload, (err, aiResponse) => {
          if (err) {
            console.error("AI Server connection error:", err.message);
            res.writeHead(502, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'AI biometric server offline' }));
          } else {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(aiResponse));
          }
        });
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON body' }));
      }
    });
    return;
  }

  if (url === '/api/logs' && req.method === 'GET') {
    const db = readDB();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(db.logs));
    return;
  }

  if (url === '/api/logs' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const log = JSON.parse(body);
        const db = readDB();
        
        // Enforce duplicate prevention in logs & Zing HR!
        const empId = log.empId;
        const dateStr = new Date(log.timestamp).toISOString().split('T')[0];
        
        // Match clean ID (strip non-alphanumeric, case-insensitive)
        const cleanEmpId = empId.toUpperCase().replace(/[^A-Z0-9]/g, '');
        
        // Find existing record in logs for today (robust check)
        const isDuplicateInLogs = db.logs.some(l => {
          const logDate = new Date(l.timestamp).toISOString().split('T')[0];
          const logCleanId = l.empId.toUpperCase().replace(/[^A-Z0-9]/g, '');
          return logCleanId === cleanEmpId && logDate === dateStr;
        });
        
        // Find in Zing HR dynamically
        let zingEmpKey = null;
        for (const key in db.zinghr) {
          if (key.toUpperCase().replace(/[^A-Z0-9]/g, '') === cleanEmpId || 
              db.zinghr[key].id.toUpperCase().replace(/[^A-Z0-9]/g, '') === cleanEmpId) {
            zingEmpKey = key;
            break;
          }
        }
        
        let alreadyMarked = isDuplicateInLogs;
        if (zingEmpKey && db.zinghr[zingEmpKey].attendance) {
          if (db.zinghr[zingEmpKey].attendance.includes(dateStr)) {
            alreadyMarked = true;
          }
        }
        
        if (alreadyMarked) {
          console.log(`Duplicate check-in blocked for employee ${empId} on date ${dateStr}`);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'ALREADY_MARKED', message: 'Attendance already marked for today' }));
          return;
        }
        
        // Update Zing HR attendance if record exists
        if (zingEmpKey) {
          if (!db.zinghr[zingEmpKey].attendance) db.zinghr[zingEmpKey].attendance = [];
          db.zinghr[zingEmpKey].attendance.push(dateStr);
        }

        db.logs.unshift(log);
        writeDB(db);
        saveLogToPostgres(log);
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, log, pgSynced: isPgConnected }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON body' }));
      }
    });
    return;
  }

  if (url === '/api/sync-logs' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const logs = JSON.parse(body); // Array of logs
        const db = readDB();
        let addedCount = 0;
        logs.forEach(log => {
          const empId = log.empId;
          const dateStr = new Date(log.timestamp).toISOString().split('T')[0];
          const cleanEmpId = empId.toUpperCase().replace(/[^A-Z0-9]/g, '');
          
          // Check if employee already has a log in db.logs for this day
          let isDuplicateForDay = db.logs.some(l => {
            const logDate = new Date(l.timestamp).toISOString().split('T')[0];
            const logCleanId = l.empId.toUpperCase().replace(/[^A-Z0-9]/g, '');
            return logCleanId === cleanEmpId && logDate === dateStr;
          });
          
          // Check if employee already has attendance marked in db.zinghr
          let zingEmpKey = null;
          for (const key in db.zinghr) {
            if (key.toUpperCase().replace(/[^A-Z0-9]/g, '') === cleanEmpId || 
                db.zinghr[key].id.toUpperCase().replace(/[^A-Z0-9]/g, '') === cleanEmpId) {
              zingEmpKey = key;
              break;
            }
          }
          
          if (zingEmpKey && db.zinghr[zingEmpKey].attendance) {
            if (db.zinghr[zingEmpKey].attendance.includes(dateStr)) {
              isDuplicateForDay = true;
            }
          }
          
          if (!isDuplicateForDay) {
            db.logs.unshift(log);
            if (zingEmpKey) {
              if (!db.zinghr[zingEmpKey].attendance) db.zinghr[zingEmpKey].attendance = [];
              if (!db.zinghr[zingEmpKey].attendance.includes(dateStr)) {
                db.zinghr[zingEmpKey].attendance.push(dateStr);
              }
            }
            saveLogToPostgres(log);
            addedCount++;
          }
        });
        writeDB(db);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, count: addedCount, pgSynced: isPgConnected }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON body' }));
      }
    });
    return;
  }

  // Database System Status & Health Metrics
  if (url === '/api/db-status' && req.method === 'GET') {
    const db = readDB();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      pgConnected: isPgConnected,
      mode: isPgConnected ? "Enterprise Hybrid (PostgreSQL SQL + Zing HR DB)" : "Standalone (Zing HR db.json)",
      rosterCount: Object.keys(db.roster || {}).length,
      zinghrEmployeeCount: Object.keys(db.zinghr || {}).length,
      totalLogsCount: (db.logs || []).length
    }));
    return;
  }

  // ZING HR API: Fetch Employee by ID
  if (url.startsWith('/api/zinghr/employee/') && req.method === 'GET') {
    const rawEmpId = url.split('/').pop().split('?')[0].toUpperCase();
    const cleanId = rawEmpId.replace(/[^A-Z0-9]/g, '');
    const db = readDB();
    
    // Try matching in zinghr
    let employee = null;
    for (const key in db.zinghr) {
      if (key.toUpperCase().replace(/[^A-Z0-9]/g, '') === cleanId || 
          db.zinghr[key].id.toUpperCase().replace(/[^A-Z0-9]/g, '') === cleanId) {
        employee = db.zinghr[key];
        break;
      }
    }
    
    // Fallback: Check if it exists in local roster, if so create mock Zing HR record!
    if (!employee) {
      for (const key in db.roster) {
        const emp = db.roster[key];
        if (emp.id.toUpperCase().replace(/[^A-Z0-9]/g, '') === cleanId) {
          employee = {
            id: emp.id,
            name: emp.name,
            avatar: emp.avatar,
            role: emp.role || "Contract Staff",
            shift: emp.shift || "Morning Shift (A)",
            address: emp.location || "Tata Motors - Gate 1",
            email: `${emp.name.toLowerCase().replace(/\s+/g, '.')}@layam.com`,
            contact: "+91 98765 43210",
            attendance: [],
            gatePhotos: []
          };
          db.zinghr[emp.id] = employee;
          writeDB(db);
          break;
        }
      }
    }
    
    if (employee) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(employee));
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: `Employee ID ${rawEmpId} not found in Zing HR database` }));
    }
    return;
  }

  // ZING HR API: Create new Employee profile
  if (url === '/api/zinghr/employee' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const emp = JSON.parse(body);
        if (!emp.id || !emp.name) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Employee ID and Name are required' }));
          return;
        }
        
        const db = readDB();
        const cleanId = emp.id.toUpperCase().replace(/[^A-Z0-9]/g, '');
        
        // Check if employee already exists in Zing HR database
        let exists = false;
        for (const key in db.zinghr) {
          if (key.toUpperCase().replace(/[^A-Z0-9]/g, '') === cleanId || 
              db.zinghr[key].id.toUpperCase().replace(/[^A-Z0-9]/g, '') === cleanId) {
            exists = true;
            break;
          }
        }
        
        if (exists) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: `Employee ID ${emp.id} already exists in Zing HR database` }));
          return;
        }
        
        // Create full profile
        const newEmployee = {
          id: emp.id.toUpperCase(),
          name: emp.name,
          avatar: emp.avatar || `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&h=100&q=80`, // default avatar
          role: emp.role || 'Contract Staff',
          shift: emp.shift || 'Morning Shift (A)',
          address: emp.address || 'Pune Plant',
          email: `${emp.name.toLowerCase().replace(/\s+/g, '.')}@layam.com`,
          contact: emp.contact || '+91 99999 88888',
          attendance: [],
          gatePhotos: []
        };
        
        db.zinghr[newEmployee.id] = newEmployee;
        writeDB(db);
        
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, employee: newEmployee }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON body' }));
      }
    });
    return;
  }

  // ZING HR API: Get report for all employees
  if (url.startsWith('/api/zinghr/report') && req.method === 'GET') {
    const db = readDB();
    const reportData = Object.values(db.zinghr).map(emp => {
      return {
        id: emp.id,
        name: emp.name,
        role: emp.role,
        shift: emp.shift,
        avatar: emp.avatar,
        address: emp.address,
        email: emp.email,
        contact: emp.contact,
        attendanceCount: emp.attendance ? emp.attendance.length : 0,
        attendanceDates: emp.attendance || [],
        isGateRegistered: Object.values(db.roster).some(r => {
          const rClean = r.id.toUpperCase().replace(/[^A-Z0-9]/g, '');
          const empClean = emp.id.toUpperCase().replace(/[^A-Z0-9]/g, '');
          return rClean === empClean;
        })
      };
    });
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(reportData));
    return;
  }

  // ZING HR API: Direct check-in sync (alternative POST endpoint)
  if (url === '/api/zinghr/attendance' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        const { empId, timestamp } = payload;
        const dateStr = new Date(timestamp).toISOString().split('T')[0];
        const db = readDB();
        
        if (!db.zinghr[empId]) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: `Employee ID ${empId} not found in Zing HR` }));
          return;
        }

        if (!db.zinghr[empId].attendance) {
          db.zinghr[empId].attendance = [];
        }

        if (db.zinghr[empId].attendance.includes(dateStr)) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'ALREADY_MARKED', message: 'Attendance already marked for today' }));
          return;
        }

        db.zinghr[empId].attendance.push(dateStr);
        writeDB(db);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: 'Attendance synced with Zing HR' }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON body' }));
      }
    });
    return;
  }

  // Static File Server
  let filePath = path.join(__dirname, url === '/' ? 'index.html' : url.split('?')[0]);
  
  // Basic extension mapping
  const extname = path.extname(filePath);
  let contentType = 'text/html';
  switch (extname) {
    case '.js': contentType = 'text/javascript'; break;
    case '.css': contentType = 'text/css'; break;
    case '.json':
    case '.webmanifest': contentType = 'application/manifest+json'; break;
    case '.png': contentType = 'image/png'; break;
    case '.jpg': contentType = 'image/jpg'; break;
    case '.svg': contentType = 'image/svg+xml'; break;
  }

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end('<h1>404 Not Found</h1>');
      } else {
        res.writeHead(500);
        res.end(`Server Error: ${err.code}`);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
};

// Start HTTP Server
const httpServer = http.createServer(requestHandler);
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`LYAM Attendance HTTP API Server running on port ${PORT}`);
  console.log(`Open http://localhost:${PORT}/ in your browser.`);
});

// Start HTTPS Server for mobile camera support (bypasses browser HTTP camera restrictions)
(async () => {
  try {
    let sslOptions;
    const certFile = path.join(__dirname, 'cert.pem');
    const keyFile = path.join(__dirname, 'key.pem');

    if (fs.existsSync(certFile) && fs.existsSync(keyFile)) {
      sslOptions = {
        key: fs.readFileSync(keyFile),
        cert: fs.readFileSync(certFile)
      };
    } else {
      const pems = await selfsigned.generate([{ name: 'commonName', value: 'biometric-gate.local' }], { days: 365 });
      fs.writeFileSync(keyFile, pems.private);
      fs.writeFileSync(certFile, pems.cert);
      sslOptions = {
        key: pems.private,
        cert: pems.cert
      };
      console.log("HTTPS Setup: Generated self-signed SSL certificates for mobile camera support.");
    }

    const HTTPS_PORT = 3443;
    const httpsServer = https.createServer(sslOptions, requestHandler);
    httpsServer.listen(HTTPS_PORT, '0.0.0.0', () => {
      console.log(`LYAM Attendance HTTPS Server running on port ${HTTPS_PORT}`);
      console.log(`Open https://<YOUR-IP>:${HTTPS_PORT}/ on Android Chrome for live mobile camera access!`);
    });
  } catch (sslErr) {
    console.warn("HTTPS Setup warning:", sslErr.message);
  }
})();
