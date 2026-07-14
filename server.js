const http = require('http');
const fs = require('fs');
const path = require('path');

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

const DEFAULT_DB = {
  roster: DEFAULT_ROSTER,
  logs: []
};

// Ensure db.json exists
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify(DEFAULT_DB, null, 2));
}

function readDB() {
  try {
    const data = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(data);
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

const server = http.createServer((req, res) => {
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
        writeDB(db);
        
        // Notify AI server to precompute embedding in background
        if (employee && employee.avatar) {
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
        db.logs.unshift(log);
        writeDB(db);
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, log }));
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
        logs.forEach(log => {
          // Avoid duplicates by timestamp & ID
          const exists = db.logs.some(l => l.empId === log.empId && l.timestamp === log.timestamp);
          if (!exists) {
            db.logs.unshift(log);
          }
        });
        writeDB(db);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, count: logs.length }));
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
    case '.json': contentType = 'application/json'; break;
    case '.png': contentType = 'image/png'; break;
    case '.jpg': contentType = 'image/jpg'; break;
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
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`LYAM Attendance API Server running on port ${PORT}`);
  console.log(`Open http://localhost:${PORT}/ in your browser to view the web app.`);
});
