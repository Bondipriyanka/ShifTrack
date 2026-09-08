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
      sync_status VARCHAR(50) DEFAULT 'Synced',
      direction VARCHAR(50) DEFAULT 'Check-In'
    );
    CREATE INDEX IF NOT EXISTS idx_attendance_emp_date ON attendance_logs (emp_id, timestamp);
  `;
  try {
    await pool.query(createTableQuery);
    // Migration: ensure 'direction' column exists
    const migrateQuery = `
      ALTER TABLE attendance_logs ADD COLUMN IF NOT EXISTS direction VARCHAR(50) DEFAULT 'Check-In';
    `;
    await pool.query(migrateQuery);
    isPgConnected = true;
    console.log("PostgreSQL Enterprise Engine: Table 'attendance_logs', column migrations and high-speed indexes initialized successfully.");
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
    INSERT INTO attendance_logs (emp_id, name, timestamp, location, gps, verified, sync_status, direction)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
  `;
  try {
    await pool.query(insertQuery, [
      log.empId || 'UNKNOWN',
      log.name || 'Anonymous Worker',
      new Date(log.timestamp || Date.now()),
      log.location || 'Tata Motors - Gate 1',
      log.gps || '18.6421°, 73.8056°',
      log.verified !== undefined ? log.verified : true,
      log.syncStatus || 'Synced',
      log.direction || 'Check-In'
    ]);
    console.log(`[PostgreSQL Enterprise DB] Successfully inserted SQL attendance log for ${log.empId} (${log.name}) [${log.direction || 'Check-In'}]`);
  } catch (err) {
    console.error("[PostgreSQL Persistence Warning]:", err.message);
  }
}

const PORT = 2000;
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
    if (parsed.zinghr && !parsed.zinghr) {
      parsed.zinghr = parsed.zinghr;
      delete parsed.zinghr;
      modified = true;
    } else if (!parsed.zinghr) {
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

let cachedJwtTokens = {};
let cachedJwtExpiry = {};

// Helper to fetch live JWT token from ZingHR mservices with in-memory caching per permission
async function getZingHRToken(config, permission = 'GEMD') {
  let username = '';
  let password = '';

  if (permission === 'SSWP') {
    username = (config.swipeClientId || config.clientId || '').trim();
    password = (config.swipeClientSecret || config.clientSecret || '').trim();
  } else {
    username = (config.clientId || '').trim();
    password = (config.clientSecret || '').trim();
  }
  
  if (!username || !password) return null;

  const now = Date.now();
  if (cachedJwtTokens[permission] && cachedJwtExpiry[permission] > now) {
    return cachedJwtTokens[permission];
  }

  const tokenUrl = `https://mservices.zinghr.com/etl/api/v2/Auth/GenerateJWTToken?apiPermission=${encodeURIComponent(permission)}`;
  const basicAuth = Buffer.from(`${username}:${password}`).toString('base64');

  try {
    const res = await fetch(tokenUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${basicAuth}`,
        'Accept': 'application/json'
      },
      signal: AbortSignal.timeout(15000)
    });

    if (res.ok) {
      const data = await res.json();
      if (data && (data.code === 1 || data.Code === 1) && (data.data || data.Data)) {
        const token = data.data || data.Data;
        cachedJwtTokens[permission] = token;
        cachedJwtExpiry[permission] = Date.now() + (90 * 1000); // 90 seconds
        return token;
      }
    }
  } catch (err) {
    console.log(`[ZingHR Auth Error - ${permission}]: ${err.message}`);
  }
  return null;
}

// Background function to sync biometric punches to ZingHR Live SynSwipes API
async function syncPunchToZingHR(log) {
  try {
    const db = readDB();
    const config = db.zinghr_config;
    if (!config) {
      console.log(`[ZingHR Swipe Sync] Config not initialized on server. Skipping real-time outbound push.`);
      return;
    }

    const token = await getZingHRToken(config, 'SSWP');
    if (!token) {
      console.log(`[ZingHR Swipe Sync] Failed to generate SSWP JWT token. Skipping live push.`);
      return;
    }

    // Format local date YYYY-MM-DD HH:mm:ss
    const logDate = log.timestamp ? new Date(log.timestamp) : new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const formattedDate = `${logDate.getFullYear()}-${pad(logDate.getMonth() + 1)}-${pad(logDate.getDate())} ${pad(logDate.getHours())}:${pad(logDate.getMinutes())}:${pad(logDate.getSeconds())}`;

    const direction = (log.direction || 'Check-In').toLowerCase();
    const inOutFlag = direction.includes('out') ? '2' : '1'; // '1' = In, '2' = Out
    const uniqueId = String(Date.now());

    const swipeUrl = 'https://mservices.zinghr.com/etl/api/v2/TNA/SynSwipes';
    const payload = {
      "swipes": [
        {
          "empIdentification": log.empId,
          "swipeDateTime": formattedDate,
          "terminalId": log.location || "Gate1",
          "swipeReceiveDateTime": formattedDate,
          "uniqueId": uniqueId,
          "swipeLocation": log.location || "Pune Plant Gate 1",
          "inOutFlag": inOutFlag,
          "source": "ShifTrack"
        }
      ]
    };

    console.log(`[ZingHR Live Swipe Sync] Forwarding punch for employee ${log.empId} [${log.direction}] to ${swipeUrl}...`);
    const swipeRes = await fetch(swipeUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000)
    });

    if (swipeRes.ok) {
      const resJson = await swipeRes.json();
      console.log(`[ZingHR Live Swipe Sync] Successfully synchronized swipe to ZingHR! Code: ${resJson.code}, Message: ${resJson.message}`);
    } else {
      const errText = await swipeRes.text();
      console.log(`[ZingHR Live Swipe Sync] Push rejected with status ${swipeRes.status}: ${errText}`);
    }
  } catch (err) {
    console.log(`[ZingHR Live Swipe Sync Error]: ${err.message}`);
  }
}

const requestHandler = async (req, res) => {
  console.log(`[HTTP Server] Request: ${req.method} ${req.url}`);
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

  if (url === '/api/biometric/detect-person' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        postToAIServer('/api/biometric/detect-person', payload, (err, aiResponse) => {
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

  if (url.startsWith('/api/tts') && req.method === 'GET') {
    const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
    const text = parsedUrl.searchParams.get('text');
    const lang = parsedUrl.searchParams.get('lang') || 'en';
    
    if (!text) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Text parameter required' }));
      return;
    }
    
    const googleTtsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${lang}&client=tw-ob&q=${encodeURIComponent(text)}`;
    
    const request = https.get(googleTtsUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.0.0 Safari/537.36'
      }
    }, (googleRes) => {
      if (googleRes.statusCode === 200) {
        res.writeHead(200, {
          'Content-Type': 'audio/mpeg',
          'Cache-Control': 'public, max-age=86400'
        });
        googleRes.pipe(res);
      } else {
        console.error(`Google TTS responded with status: ${googleRes.statusCode}`);
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: `Google TTS responded with status ${googleRes.statusCode}` }));
      }
    });
    
    request.on('error', (err) => {
      console.error('TTS request error:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal Server Error' }));
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
        const direction = log.direction || 'Check-In';
        
        // Match clean ID (strip non-alphanumeric, case-insensitive)
        const cleanEmpId = empId.toUpperCase().replace(/[^A-Z0-9]/g, '');

        // Resolve the employee assignment from the server-side master data.
        const zingEmployee = Object.values(db.zinghr || {}).find(employee =>
          employee.id && employee.id.toUpperCase().replace(/[^A-Z0-9]/g, '') === cleanEmpId
        );
        const rosterEmployee = Object.values(db.roster || {}).find(employee =>
          employee.id && employee.id.toUpperCase().replace(/[^A-Z0-9]/g, '') === cleanEmpId
        );
        const masterEmployee = zingEmployee || rosterEmployee;
        const assignedLocation = (zingEmployee && zingEmployee.location) || (rosterEmployee && rosterEmployee.location);
        if (!masterEmployee || !assignedLocation || assignedLocation.trim().toLowerCase() !== (log.location || '').trim().toLowerCase()) {
          console.log(`Plant validation blocked attendance for ${empId}. Assigned: ${assignedLocation || 'unknown'}, requested: ${log.location || 'unknown'}`);
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: false,
            error: 'PLANT_MISMATCH',
            message: `Attendance not recorded. ${masterEmployee ? masterEmployee.name : 'Employee'} is not assigned to this plant.`
          }));
          return;
        }
        
        // Find most recent log for this employee on dateStr to check state transition
        const employeeLogs = db.logs.filter(l => {
          const logDate = new Date(l.timestamp).toISOString().split('T')[0];
          const logCleanId = l.empId.toUpperCase().replace(/[^A-Z0-9]/g, '');
          return logCleanId === cleanEmpId && logDate === dateStr;
        });
        
        let lastDirection = null;
        if (employeeLogs.length > 0) {
          lastDirection = employeeLogs[0].direction || 'Check-In';
        }
        
        let isBlocked = false;
        if (lastDirection === null) {
          if (direction === 'Check-Out') {
            isBlocked = true;
          }
        } else if (lastDirection === 'Check-In') {
          if (direction === 'Check-In') {
            isBlocked = true;
          }
        } else if (lastDirection === 'Check-Out') {
          if (direction === 'Check-Out') {
            isBlocked = true;
          }
        }
        
        if (isBlocked) {
          console.log(`State transition check blocked for employee ${empId} [${direction}] on date ${dateStr} (Last was ${lastDirection})`);
          const errCode = direction === 'Check-In' ? 'ALREADY_MARKED_CHECKIN' : 'ALREADY_MARKED_CHECKOUT';
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: errCode, message: 'Attendance already marked for today' }));
          return;
        }

        // Find in Zing HR dynamically
        let zingEmpKey = null;
        for (const key in db.zinghr) {
          if (key.toUpperCase().replace(/[^A-Z0-9]/g, '') === cleanEmpId || 
              db.zinghr[key].id.toUpperCase().replace(/[^A-Z0-9]/g, '') === cleanEmpId) {
            zingEmpKey = key;
            break;
          }
        }
        
        // Save log to db.logs and postgres
        db.logs.unshift(log);
        
        // Update Zing HR attendance if record exists
        if (zingEmpKey) {
          if (!db.zinghr[zingEmpKey].attendance) db.zinghr[zingEmpKey].attendance = [];
          if (!db.zinghr[zingEmpKey].attendance.includes(dateStr)) {
            db.zinghr[zingEmpKey].attendance.push(dateStr);
          }
        }
        
        writeDB(db);
        saveLogToPostgres(log);

        // Sync punch to ZingHR in the background
        syncPunchToZingHR(log);
        
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
          const direction = log.direction || 'Check-In';
          
          // Avoid duplicate entries during sync
          const isDuplicate = db.logs.some(l => {
            const logDate = new Date(l.timestamp).toISOString().split('T')[0];
            const logCleanId = l.empId.toUpperCase().replace(/[^A-Z0-9]/g, '');
            const logDirection = l.direction || 'Check-In';
            return logCleanId === cleanEmpId && logDate === dateStr && logDirection === direction;
          });
          
          if (isDuplicate) return;
          
          db.logs.unshift(log);
          
          // Check if employee exists in db.zinghr
          let zingEmpKey = null;
          for (const key in db.zinghr) {
            if (key.toUpperCase().replace(/[^A-Z0-9]/g, '') === cleanEmpId || 
                db.zinghr[key].id.toUpperCase().replace(/[^A-Z0-9]/g, '') === cleanEmpId) {
              zingEmpKey = key;
              break;
            }
          }
          
          if (zingEmpKey) {
            if (!db.zinghr[zingEmpKey].attendance) db.zinghr[zingEmpKey].attendance = [];
            if (!db.zinghr[zingEmpKey].attendance.includes(dateStr)) {
              db.zinghr[zingEmpKey].attendance.push(dateStr);
            }
          }
          saveLogToPostgres(log);
          addedCount++;
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

  // ZING HR API: Get Saved Configuration
  if (url === '/api/zinghr/config' && req.method === 'GET') {
    const db = readDB();
    const cfg = db.zinghr_config || {};
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      endpoint: cfg.endpoint || 'https://mservices.zinghr.com',
      tenant: cfg.tenant || 'LAYAMGROUP',
      clientId: cfg.clientId || 'qlkb0n1za4bna3g7rj8m5tye',
      clientSecret: cfg.clientSecret ? '••••••••' : '',
      swipeClientId: cfg.swipeClientId || '4mb1mye6h7f0ar46eea203zf',
      apiPermission: cfg.apiPermission || 'GEMD',
      swipePermission: cfg.swipePermission || 'SSWP'
    }));
    return;
  }

  // ZING HR API: Save Credentials Configuration
  if (url === '/api/zinghr/config' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const config = JSON.parse(body);
        const db = readDB();
        db.zinghr_config = {
          endpoint: config.endpoint || 'https://mservices.zinghr.com',
          tenant: config.tenant || 'LAYAMGROUP',
          clientId: config.clientId || '',
          clientSecret: config.clientSecret || '',
          apiPermission: config.apiPermission || 'SSWP'
        };
        writeDB(db);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON body' }));
      }
    });
    return;
  }

  // ZING HR API: Real-time Handshake & Live Employee Sync
  if (url === '/api/zinghr/handshake' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', async () => {
      try {
        const config = JSON.parse(body);
        let endpoint = (config.endpoint || 'https://mservices.zinghr.com').trim();
        const tenant = (config.tenant || 'LAYAMGROUP').trim();
        const clientId = (config.clientId || 'qlkb0n1za4bna3g7rj8m5tye').trim();
        let clientSecret = (config.clientSecret || '').trim();
        // If clientSecret was omitted or the old SSWP swipe secret was sent by mistake with GEMD client ID:
        if (!clientSecret || (clientId === 'qlkb0n1za4bna3g7rj8m5tye' && clientSecret === '3p12xij3mromu5d0bqa7s3hduc5ahv2xe7zw60b75zhgj08qbho53rtaq308hz7v')) {
          clientSecret = '21fqq370n70lx9y1igkieyhria9wfhigxleclt7rvbwt6rt2ofkz02eyuiewxpg1';
        }
        const swipeClientId = (config.swipeClientId || '4mb1mye6h7f0ar46eea203zf').trim();
        const swipeClientSecret = (config.swipeClientSecret || '3p12xij3mromu5d0bqa7s3hduc5ahv2xe7zw60b75zhgj08qbho53rtaq308hz7v').trim();

        if (!clientId || !clientSecret) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, message: 'Client ID and Client Secret are required for handshake.' }));
          return;
        }

        console.log(`[ZingHR Live Handshake] Fetching live employee master for Tenant: ${tenant}...`);

        const token = await getZingHRToken({ clientId, clientSecret }, 'GEMD');

        const db = readDB();
        db.zinghr_config = {
          endpoint,
          tenant,
          clientId,
          clientSecret,
          apiPermission: 'GEMD',
          swipeClientId,
          swipeClientSecret,
          swipePermission: 'SSWP'
        };

        if (!token) {
          console.log(`[ZingHR Live Handshake] Token generation failed with provided credentials.`);
          writeDB(db);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: false,
            count: Object.keys(db.zinghr || {}).length,
            message: `Authentication failed: Unable to generate JWT token from ZingHR. Please verify your Client Key and Secret.`
          }));
          return;
        }

        // Fetch live employee list from ZingHR GetEmployeeDetails API
        const empUrl = 'https://mservices.zinghr.com/etl/api/v2/Employee/GetEmployeeDetails';
        console.log(`[ZingHR Live Handshake] Querying ${empUrl} with PageSize 100...`);
        
        let syncCount = 0;
        let totalZingCount = 0;

        try {
          const empRes = await fetch(empUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ "PageSize": 100, "PageNumber": 1 }),
            signal: AbortSignal.timeout(30000)
          });

          if (empRes.ok) {
            const resData = await empRes.json();
            const rawEmployees = resData.data?.employees || [];
            totalZingCount = resData.data?.totalEmployeeCount || rawEmployees.length;

            if (Array.isArray(rawEmployees) && rawEmployees.length > 0) {
              rawEmployees.forEach(emp => {
                const empCode = (emp.employeeCode || '').trim();
                const empName = (emp.employeeName || '').trim();
                if (!empCode || !empName) return;

                const cleanId = empCode.toUpperCase();
                
                // Parse attributes
                const attrs = {};
                (emp.attributes || []).forEach(a => {
                  attrs[a.attributeTypeCode] = a.attributeTypeUnitDescription;
                });

                const dept = attrs['Department'] || 'Operations';
                const desig = attrs['Designation'] || 'Staff Member';
                const city = attrs['City'] || attrs['Plant'] || 'Pantnagar';
                const attendanceGroup = attrs['Attendance Rule Group'] || 'General Shift (G)';
                const status = emp.employeeStatus || 'Active';

                // Map to db.zinghr
                db.zinghr[cleanId] = {
                  id: cleanId,
                  name: empName,
                  avatar: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&h=100&q=80`,
                  role: `${desig} (${dept})`,
                  shift: attendanceGroup,
                  address: city,
                  email: `${empName.toLowerCase().replace(/[^a-z0-9]/g, '.')}@layam.com`,
                  contact: '+91 98765 43210',
                  status: status,
                  dateOfLeaving: emp.dateOfLeaving || '',
                  attendance: db.zinghr[cleanId]?.attendance || [],
                  gatePhotos: db.zinghr[cleanId]?.gatePhotos || []
                };

                // Also map to db.roster so they appear in mobile scan & attendance immediately!
                const rosterKey = `emp-${cleanId.toLowerCase()}`;
                db.roster[rosterKey] = {
                  id: cleanId,
                  name: empName,
                  avatar: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&h=100&q=80`,
                  initials: empName.split(' ').map(p => p[0]).filter(Boolean).join('').substring(0, 2).toUpperCase() || 'EM',
                  role: `${desig} (${dept})`,
                  shift: attendanceGroup,
                  status: (status === 'Resigned' || status.includes('Locked')) ? 'Inactive' : 'Active',
                  location: city
                };
                syncCount++;
              });
            }
          }
        } catch (empErr) {
          console.error(`[ZingHR Handshake] Error fetching employee details: ${empErr.message}`);
        }

        writeDB(db);

        console.log(`[ZingHR Live Handshake] Successfully synchronized ${syncCount} real employees from Layam ZingHR! Total in database: ${totalZingCount}`);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          count: syncCount,
          totalInZing: totalZingCount,
          message: `Connected to ZingHR Live Database successfully!\n\nSynchronized ${syncCount} real-time employees directly from Layam ZingHR (Total workforce: ${totalZingCount}).\nAttendance swipes are connected and live.`
        }));
      } catch (err) {
        console.error(`[ZingHR Handshake Error]: ${err.message}`);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: `Server error during handshake: ${err.message}` }));
      }
    });
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
