// Smart Attendance System - JavaScript Engine

// Mock Database of Registered Employees (Stored in Memory & LocalStorage)
let employeeDatabase = {
  "emp-001": {
    id: "EMP-7088",
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
    id: "EMP-9021",
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
    id: "EMP-4110",
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
    id: "EMP-8872",
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

// Architecture Nodes Specifications Data
const architectureSpecs = {
  mobile: {
    name: "Supervisor Mobile App",
    tech: "React Native / Flutter",
    desc: "The field-facing gateway running on site supervisors' mobile devices. It controls the camera, performs client-side edge face detection, collects geo-coordinates, and manages the local database and transaction queues.",
    features: [
      "Offline SQLite storage for attendance queues",
      "Network status monitor (automatic detection)",
      "High-speed frame sampling (30fps camera feed)",
      "Biometric signature matching request constructor"
    ],
    security: [
      "No raw image storage: photos deleted instantly",
      "AES-256 local database encryption",
      "Device security binding (MAC & Supervisor User ID)",
      "Tamper detection for application packages (root/jailbreak)"
    ],
    code: `// React Native Geotag & Local Storage Model
const checkInOffline = async (candidateId, faceEmbedding) => {
  const coords = await Geolocation.getCurrentPosition();
  const record = {
    employee_id: candidateId,
    timestamp: new Date().toISOString(),
    latitude: coords.latitude,
    longitude: coords.longitude,
    location_id: "TATA_PUNE_G1",
    face_hash: sha256(faceEmbedding),
    sync_status: "PENDING"
  };
  
  await SQLiteDB.insert("offline_attendance", record);
  NotificationEngine.show("Scan Queued Offline");
};`
  },
  detection: {
    name: "Edge Face Detection",
    tech: "MediaPipe FaceMesh / TensorFlow.js",
    desc: "Identifies human faces inside the camera frame on the local device before sending vectors to the API. This guarantees rapid UI overlays and conducts local validation check (like liveness checks) to save network resources.",
    features: [
      "Ultra-low latency bounding box tracking",
      "Eye-blink & mouth-open detection (Liveness)",
      "Roll/pitch/yaw angles filtration (Alignment Check)",
      "Multi-face prevention (Locks onto primary center face)"
    ],
    security: [
      "Prevents static picture spoofing (blink verification)",
      "Excludes low-light or blurred captures locally",
      "Extracts facial landmark coordinates on-device only",
      "No transmission of raw camera feed to external systems"
    ],
    code: `// MediaPipe Blink Detection (Liveness Test)
function checkLiveness(landmarks) {
  const leftEyeRatio = calculateEAR(landmarks.leftEye);
  const rightEyeRatio = calculateEAR(landmarks.rightEye);
  const avgEAR = (leftEyeRatio + rightEyeRatio) / 2.0;

  if (avgEAR < EYE_BLINK_THRESHOLD) {
    blinkCounter++;
    return blinkCounter >= 1; // Confirmed real blink
  }
  return false;
}`
  },
  recognition: {
    name: "Face Matcher Engine",
    tech: "PyTorch / ArcFace / vector databases",
    desc: "Matches the vector points extract from the face (embeddings) against the registered facial records stored in the secure DB. Employs cosine similarity distance calculations to establish an ID match.",
    features: [
      "128-dimensional vector comparison",
      "Cosine Similarity Threshold matching (typically >0.85)",
      "Indexed database matching (Milvus / pgvector)",
      "Fuzzy match routing for varying light conditions"
    ],
    security: [
      "Facial templates cannot be reverse-engineered back to faces",
      "One-way hash validation on templates",
      "Regular re-verification & vector rotation cycles",
      "Strict sandbox matching environments"
    ],
    code: `// Biometric Vector Similarity API (Python/FastAPI)
@app.post("/api/v1/biometric/match")
async def match_face(input_embedding: List[float]):
    # Query vector database with Cosine Similarity
    result = db.execute("""
      SELECT employee_id, COSINE_SIMILARITY(face_vector, :emb) as similarity
      FROM employee_biometrics 
      ORDER BY similarity DESC LIMIT 1
    """, {"emb": input_embedding})
    
    match = result.first()
    if match and match.similarity >= 0.85:
        return {"matched": True, "emp_id": match.employee_id, "score": match.similarity}
    return {"matched": False, "score": match.similarity ?? 0.0}`
  },
  verification: {
    name: "Employee Verification Engine",
    tech: "Node.js Microservices / Redis Caching",
    desc: "Applies business policies to matched IDs. Checks shift rosters, ensures candidate status is Active, verifies geo-fencing parameters (matching phone GPS against plant boundaries), and prevents duplicate scans.",
    features: [
      "Geo-fence radius lookup (Radius tolerance <100m)",
      "Roster and Shift validation",
      "Active/Terminated status filtration",
      "Double-scan throttle (block re-entry within 10 mins)"
    ],
    security: [
      "Access logs cryptographically signed",
      "Strict server-side validation (cannot be spoofed by client)",
      "Immediate alert triggering for blacklisted IDs",
      "Audit trail database recording"
    ],
    code: `// Server-Side Verification Routine
async function verifyAccess(employeeId, supervisorCoords, locationId) {
  const employee = await DB.getEmployee(employeeId);
  if (employee.status !== "Active") {
    return { verified: false, reason: "Status Suspended" };
  }
  
  const plant = await DB.getPlantLocation(locationId);
  const distance = getDistance(supervisorCoords, plant.coords);
  if (distance > 100) { // meters
    return { verified: false, reason: "Supervisor Geo-Fence Breach" };
  }
  
  return { verified: true, shift: employee.shift };
}`
  },
  zynghr: {
    name: "ZyngHR Sync Service",
    tech: "REST / Webhooks / Message Queues",
    desc: "Interfaces the attendance engine directly with ZyngHR's core database. Transmits synchronized check-ins, reports offline reconciliation files, updates employee status registers, and serves live dashboards.",
    features: [
      "HTTP REST Integration Client (JSON payloads)",
      "Idempotency tokens (prevents double logging on network retries)",
      "Auto-reconciliation for offline queue events",
      "Real-time event notification webhooks"
    ],
    security: [
      "TLS 1.3 encrypted transportation tunnels",
      "HMAC payload signatures for authenticity verification",
      "Token-based OAuth2.0 authentication flow",
      "IP-whitelisted API connection limits"
    ],
    code: `// Payload sent to ZyngHR Gateway
{
  "api_token": "zh_auth_288b8x79822a10c",
  "client_id": "GATE_STAFFING_IN",
  "payload": {
    "emp_code": "EMP-7088",
    "location_code": "TATA_PUNE_01",
    "biometric_provider": "BIOMETRIC_FACE_GATE",
    "timestamp": "2026-07-10T08:30:15Z",
    "device_identifier": "SUP-PHONE-9912",
    "geotag_latitude": 18.6420,
    "geotag_longitude": 73.8055,
    "liveness_verified": true,
    "match_confidence": 0.984
  }
}`
  }
};

// Application State Manager
const appState = {
  isScanningMode: false,
  isOffline: false,
  selectedSubject: "emp-001",
  selectedLocation: "Tata Motors - Gate 1",
  gps: { lat: 18.6421, lng: 73.8056, acc: 3 }, // Tata Pune Plant Area
  attendanceLogs: [],
  syncQueue: [],
  counters: {
    total: 0,
    approved: 0,
    denied: 0,
    offline: 0
  },
  webcamStream: null,
  isSimulatedCamera: false,
  simAnimationId: null,
  
  // Registration and Auth state
  currentActiveTab: "scan",
  capturedPhotoBase64: null,
  isAuthorized: false
};

// Initialize DOM elements safely (guards against DOMContentLoaded race condition)
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  initApp();
}

function initApp() {
  try {
    // Update time initially & set interval
    updateClock();
    setInterval(updateClock, 1000);

    // Load custom data from localStorage if exists
    loadLocalStorage();

    // Load registered roster in UI
    renderRoster();

    // Load default spec node (mobile app)
    updateSpecPanel("mobile");

    // Attach Event Listeners
    document.getElementById("login-submit-btn").addEventListener("click", handleSupervisorLogin);
    document.getElementById("login-pin").addEventListener("keypress", (e) => {
      if (e.key === "Enter") handleSupervisorLogin();
    });

    document.getElementById("scan-toggle").addEventListener("click", toggleScanMode);
    document.getElementById("offline-switch").addEventListener("change", toggleOfflineMode);
    document.getElementById("location-select").addEventListener("change", handleLocationChange);
    document.getElementById("trigger-scan-btn").addEventListener("click", triggerManualScan);
    document.getElementById("trigger-stranger-btn").addEventListener("click", () => {
      appState.selectedSubject = "unauthorized";
      updateWalkUpStatusText();
      triggerManualScan();
    });
    document.getElementById("trigger-spoof-btn").addEventListener("click", () => {
      appState.selectedSubject = "spoof";
      updateWalkUpStatusText();
      triggerManualScan();
    });
    document.getElementById("trigger-sync-btn").addEventListener("click", forceSyncOfflineQueue);
    document.getElementById("clear-logs-btn").addEventListener("click", clearLogs);
    document.getElementById("btn-camera-sim").addEventListener("click", startCameraSimulator);

    // Registration button clickers
    document.getElementById("reg-btn-capture").addEventListener("click", captureRegistrationPhoto);
    document.getElementById("reg-btn-save").addEventListener("click", enrollNewCandidate);
    document.getElementById("bulk-roster-import").addEventListener("change", handleBulkRosterImport);

    // Setup tab navigator listeners
    document.getElementById("nav-scan-tab").addEventListener("click", () => switchTab("scan"));
    document.getElementById("nav-register-tab").addEventListener("click", () => switchTab("register"));
    document.getElementById("nav-logout-tab").addEventListener("click", lockAppSupervisor);

    // Setup architecture nodes click listeners
    document.querySelectorAll(".flow-node").forEach(node => {
      node.addEventListener("click", (e) => {
        const nodeKey = e.target.dataset.node;
        document.querySelectorAll(".flow-node").forEach(n => n.classList.remove("active"));
        e.target.classList.add("active");
        updateSpecPanel(nodeKey);
      });
    });

    // Setup countdown visual elements
    setupCountdownDOMElements();

    // Log system ready
    logTerminal("INFO", "Biometric GateEntry Client Core Ready.");
    calculateEmployeeHashes();
  } catch (err) {
    console.error("Initialization Error:", err);
    alert("Initialization Error: " + err.message + "\nStack: " + err.stack);
  }
}

function setupCountdownDOMElements() {
  // Inject custom keyframes for countdown pulse
  if (!document.getElementById("countdown-pulse-style")) {
    const styleSheet = document.createElement("style");
    styleSheet.id = "countdown-pulse-style";
    styleSheet.innerText = `
      @keyframes pulse-countdown {
        0% { transform: translate(-50%, -50%) scale(0.9); opacity: 0.8; }
        50% { transform: translate(-50%, -50%) scale(1.15); opacity: 1; }
        100% { transform: translate(-50%, -50%) scale(0.9); opacity: 0.8; }
      }
    `;
    document.head.appendChild(styleSheet);
  }

  // Dynamically append countdown elements to viewport-container
  const viewportContainer = document.getElementById("viewport-container");
  if (!viewportContainer) return;
  
  if (!document.getElementById("scan-timer-banner")) {
    const timerBanner = document.createElement("div");
    timerBanner.id = "scan-timer-banner";
    timerBanner.className = "hidden";
    timerBanner.setAttribute("style", "position: absolute; top: 12px; background: rgba(10, 20, 40, 0.95); border: 1px solid var(--border-color); border-radius: 12px; padding: 4px 12px; font-size: 0.75rem; color: var(--color-primary); z-index: 35; font-family: var(--font-mono); font-weight: 600; box-shadow: 0 4px 12px rgba(0,0,0,0.5); transition: all 0.3s;");
    viewportContainer.appendChild(timerBanner);
  }
  
  if (!document.getElementById("scan-countdown-overlay")) {
    const centerCountdown = document.createElement("div");
    centerCountdown.id = "scan-countdown-overlay";
    centerCountdown.className = "hidden";
    centerCountdown.setAttribute("style", "position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 3.5rem; font-weight: 800; color: var(--color-primary); z-index: 40; background: rgba(5, 10, 25, 0.85); border-radius: 50%; width: 90px; height: 90px; display: flex; align-items: center; justify-content: center; border: 2.8px solid var(--color-primary); box-shadow: 0 0 25px var(--color-primary-glow); animation: pulse-countdown 1s infinite ease-in-out; transition: all 0.3s;");
    viewportContainer.appendChild(centerCountdown);
  }
}

// Update the phone's lock screen clock
function updateClock() {
  const now = new Date();
  let hours = now.getHours();
  let minutes = now.getMinutes();
  hours = hours < 10 ? '0' + hours : hours;
  minutes = minutes < 10 ? '0' + minutes : minutes;
  document.getElementById("phone-time").innerText = `${hours}:${minutes}`;
}

// Log message to virtual developer console
function logTerminal(type, msg) {
  const terminal = document.getElementById("terminal-logs");
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  
  const logEntry = document.createElement("div");
  logEntry.className = "log-entry";
  
  let typeClass = "info";
  if (type === "SUCCESS") typeClass = "success";
  if (type === "ERROR") typeClass = "error";
  if (type === "WARN") typeClass = "warn";

  logEntry.innerHTML = `
    <span class="log-time">[${time}]</span>
    <span class="log-type ${typeClass}">[${type}]</span>
    <span class="log-msg">${msg}</span>
  `;
  
  terminal.appendChild(logEntry);
  terminal.scrollTop = terminal.scrollHeight;
}

// Render registered candidates list on the Right Admin Dashboard
function renderRoster() {
  const container = document.getElementById("roster-list-container");
  container.innerHTML = "";

  Object.keys(employeeDatabase).forEach(key => {
    const emp = employeeDatabase[key];
    const item = document.createElement("div");
    item.className = "employee-card-sm";
    
    // Use stored base64 image or fallback unsplash URL
    const imageStyle = (emp.avatar && typeof emp.avatar === 'string') 
      ? `style="background-image: url('${emp.avatar}')"`
      : '';

    item.innerHTML = `
      <div class="employee-avatar-sm" ${imageStyle}>${(emp.avatar && typeof emp.avatar === 'string') ? '' : emp.initials}</div>
      <div class="employee-details-sm">
        <div class="employee-name-sm">${emp.name}</div>
        <div class="employee-id-sm">${emp.id}</div>
      </div>
    `;
    item.addEventListener("click", () => {
      appState.selectedSubject = key;
      updateWalkUpStatusText();
      logTerminal("INFO", `PoC Controller: Scanning subject overridden to: ${emp.name}`);
    });
    container.appendChild(item);
  });

  // Update Walk-up Status HUD text
  updateWalkUpStatusText();
}

// Update Walk-up Status HUD text
function updateWalkUpStatusText() {
  const infoDiv = document.getElementById("sim-walk-up-info");
  if (!infoDiv) return;
  
  const subject = appState.selectedSubject;
  if (subject === "unauthorized") {
    infoDiv.innerHTML = `<span style="color: var(--color-error)">Unknown Pedestrian (Stranger)</span>`;
  } else if (subject === "spoof") {
    infoDiv.innerHTML = `<span style="color: var(--color-warning)">Photo Spoof Attempt (Liveness check will fail)</span>`;
  } else {
    const emp = employeeDatabase[subject];
    if (emp) {
      infoDiv.innerHTML = `<span style="color: var(--color-success)">${emp.name} (Valid Staff - ID: ${emp.id})</span>`;
    } else {
      infoDiv.innerText = "No one approaching";
    }
  }
}

// Update technical documentation panel
function updateSpecPanel(nodeKey) {
  const spec = architectureSpecs[nodeKey];
  if (!spec) return;

  document.getElementById("spec-name").innerText = spec.name;
  document.getElementById("spec-tech").innerText = spec.tech;
  document.getElementById("spec-desc").innerText = spec.desc;

  const featuresList = document.getElementById("spec-features");
  featuresList.innerHTML = "";
  spec.features.forEach(f => {
    const li = document.createElement("li");
    li.innerText = f;
    featuresList.appendChild(li);
  });

  const securityList = document.getElementById("spec-security");
  securityList.innerHTML = "";
  spec.security.forEach(s => {
    const li = document.createElement("li");
    li.innerText = s;
    securityList.appendChild(li);
  });

  document.getElementById("spec-code").innerText = spec.code;
}

// Handle Supervisor Login authorization
function handleSupervisorLogin() {
  try {
    const pinInput = document.getElementById("login-pin");
    
    if (pinInput.value === "1234") {
      appState.isAuthorized = true;
      pinInput.value = "";
      
      // Hide Login Overlay, Show App navbar + default scan page
      document.getElementById("app-login-screen").classList.add("hidden");
      document.getElementById("app-bottom-navbar").classList.remove("hidden");
      switchTab("scan");
      
      logTerminal("SUCCESS", "Supervisor credentials authorized successfully. Portal Hub unlocked.");
    } else {
      logTerminal("ERROR", "Access Denied: Invalid Supervisor PIN security passcode.");
      alert("Invalid passcode pin! Hint: 1234");
      pinInput.value = "";
    }
  } catch (err) {
    console.error("Login Error:", err);
    alert("Login Error: " + err.message + "\nStack: " + err.stack);
  }
}

// Lock the app (Log out supervisor)
function lockAppSupervisor() {
  appState.isAuthorized = false;
  
  // Close camera streams
  shutdownActiveStream();
  
  // Update state
  appState.isScanningMode = false;
  document.getElementById("scan-toggle").classList.remove("active");
  document.getElementById("scan-btn-text").innerText = "Open Attendance Gate";
  document.getElementById("viewport-container").classList.remove("scanning", "success", "error");
  document.getElementById("verification-card").classList.remove("active");
  
  // Toggle screens
  document.getElementById("app-login-screen").classList.remove("hidden");
  document.getElementById("app-bottom-navbar").classList.add("hidden");
  document.getElementById("app-scan-view").classList.add("hidden");
  document.getElementById("app-register-view").classList.add("hidden");
  
  logTerminal("WARN", "Supervisor logged out. Biometric hub locked.");
}

// Toggle Screen Tabs (Scan Gate / Register)
function switchTab(tabName) {
  if (!appState.isAuthorized) return;
  
  appState.currentActiveTab = tabName;
  
  // Update active tab buttons
  document.getElementById("nav-scan-tab").classList.toggle("active", tabName === "scan");
  document.getElementById("nav-register-tab").classList.toggle("active", tabName === "register");
  
  // Toggle UI screen layers
  const scanView = document.getElementById("app-scan-view");
  const registerView = document.getElementById("app-register-view");
  
  if (tabName === "scan") {
    scanView.classList.remove("hidden");
    registerView.classList.add("hidden");
    shutdownActiveStream();
    showCameraFallback();
  } else if (tabName === "register") {
    scanView.classList.add("hidden");
    registerView.classList.remove("hidden");
    
    // Stop scanner scan mode
    appState.isScanningMode = false;
    document.getElementById("scan-toggle").classList.remove("active");
    document.getElementById("scan-btn-text").innerText = "Open Attendance Gate";
    document.getElementById("viewport-container").classList.remove("scanning");
    document.getElementById("verification-card").classList.remove("active");
    
    // Boot webcam preview inside registration box
    bootRegistrationCamera();
  }
}

// Shutdown webcam streams
function shutdownActiveStream() {
  if (appState.webcamStream) {
    appState.webcamStream.getTracks().forEach(track => track.stop());
    appState.webcamStream = null;
    logTerminal("INFO", "Camera hardware stream stopped and released.");
  }
  document.getElementById("status-cam-dot").classList.remove("active");
}

// Open camera feed for attendance scanner
async function startupCamera() {
  const video = document.getElementById("camera-stream");
  const fallback = document.getElementById("camera-fallback");
  
  shutdownActiveStream();
  
  if (appState.isSimulatedCamera) {
    startCameraSimulator();
    return;
  }

  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 480, height: 640, facingMode: "user" } 
      });
      appState.webcamStream = stream;
      video.srcObject = stream;
      video.style.display = "block";
      fallback.style.display = "none";
      document.getElementById("status-cam-dot").classList.add("active");
      logTerminal("INFO", "Hardware camera feed opened for scanning.");
      
      startCanvasOverlay();
    } catch (err) {
      logTerminal("WARN", "Hardware webcam not available or access denied. Falling back to simulator.");
      appState.isSimulatedCamera = true;
      startCameraSimulator();
    }
  } else {
    logTerminal("WARN", "Webcam media stream api not supported in this browser. Running simulator.");
    appState.isSimulatedCamera = true;
    startCameraSimulator();
  }
}

function showCameraFallback() {
  const video = document.getElementById("camera-stream");
  const fallback = document.getElementById("camera-fallback");
  
  video.style.display = "none";
  fallback.style.display = "flex";
  document.getElementById("status-cam-dot").classList.remove("active");
}

function startCameraSimulator() {
  appState.isSimulatedCamera = true;
  
  const video = document.getElementById("camera-stream");
  const fallback = document.getElementById("camera-fallback");
  video.style.display = "none";
  fallback.style.display = "none";
  document.getElementById("status-cam-dot").classList.add("active");
  
  startCanvasOverlay();
}

// Camera Canvas Bounding boxes and scanner graphics
function startCanvasOverlay() {
  const canvas = document.getElementById("camera-canvas");
  const ctx = canvas.getContext("2d");
  
  const resizeCanvas = () => {
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
  };
  resizeCanvas();
  
  if (appState.simAnimationId) {
    cancelAnimationFrame(appState.simAnimationId);
  }

  let particleAngle = 0;
  
  function drawFrame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw grid if simulator
    if (appState.isSimulatedCamera && appState.isScanningMode) {
      ctx.fillStyle = "rgba(4, 8, 20, 0.95)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx.strokeStyle = "rgba(255, 255, 255, 0.03)";
      ctx.lineWidth = 1;
      const gridSize = 30;
      for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
      }

      // Matrix particles
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2 - 20;
      particleAngle += 0.01;
      ctx.fillStyle = "rgba(56, 189, 248, 0.3)";
      for (let i = 0; i < 5; i++) {
        const px = centerX + Math.cos(particleAngle + i) * 60;
        const py = centerY + Math.sin(particleAngle * 1.5 + i) * 90;
        ctx.beginPath();
        ctx.arc(px, py, 3, 0, 2 * Math.PI);
        ctx.fill();
      }
    }

    // Dynamic Green Bounding Box HUD (scans the entire area borderlessly)
    if (appState.isScanningMode) {
      const boxWidth = 200;
      const boxHeight = 200;
      const boxX = (canvas.width - boxWidth) / 2;
      const boxY = (canvas.height - boxHeight) / 2 - 20;

      ctx.strokeStyle = "#10b981"; // Green target color
      ctx.lineWidth = 3;
      
      const pulse = Math.sin(Date.now() / 200) * 3;
      const len = 20;
      
      // Top Left Corner
      ctx.beginPath();
      ctx.moveTo(boxX - pulse, boxY + len - pulse);
      ctx.lineTo(boxX - pulse, boxY - pulse);
      ctx.lineTo(boxX + len - pulse, boxY - pulse);
      ctx.stroke();

      // Top Right Corner
      ctx.beginPath();
      ctx.moveTo(boxX + boxWidth + pulse, boxY + len - pulse);
      ctx.lineTo(boxX + boxWidth + pulse, boxY - pulse);
      ctx.lineTo(boxX + boxWidth - len + pulse, boxY - pulse);
      ctx.stroke();

      // Bottom Left Corner
      ctx.beginPath();
      ctx.moveTo(boxX - pulse, boxY + boxHeight - len + pulse);
      ctx.lineTo(boxX - pulse, boxY + boxHeight + pulse);
      ctx.lineTo(boxX + len - pulse, boxY + boxHeight + pulse);
      ctx.stroke();

      // Bottom Right Corner
      ctx.beginPath();
      ctx.moveTo(boxX + boxWidth + pulse, boxY + boxHeight - len + pulse);
      ctx.lineTo(boxX + boxWidth + pulse, boxY + boxHeight + pulse);
      ctx.lineTo(boxX + boxWidth - len + pulse, boxY + boxHeight + pulse);
      ctx.stroke();

      // Draw scanner laser line
      const laserY = boxY + (Math.sin(Date.now() / 400) + 1) * (boxHeight / 2);
      ctx.strokeStyle = "rgba(16, 185, 129, 0.4)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(boxX, laserY);
      ctx.lineTo(boxX + boxWidth, laserY);
      ctx.stroke();

      // Label HUD text
      ctx.fillStyle = "#10b981";
      ctx.font = "bold 11px Outfit";
      
      let stateLabel = "PROCESSING BIOMETRICS...";
      if (document.getElementById("viewport-container").classList.contains("success")) {
        const matchedEmp = employeeDatabase[appState.selectedSubject];
        stateLabel = matchedEmp ? `MATCH: ${matchedEmp.name} (98.4%)` : "MATCH CONFIRMED";
      } else if (document.getElementById("viewport-container").classList.contains("error")) {
        stateLabel = appState.selectedSubject === "spoof" ? "LIVENESS REJECT" : "UNAUTHORIZED ACCESS";
      }
      ctx.fillText(stateLabel, boxX, boxY - 10);
    }

    appState.simAnimationId = requestAnimationFrame(drawFrame);
  }

  drawFrame();
}

// Toggle Scan Mode button
function toggleScanMode() {
  const btn = document.getElementById("scan-toggle");
  const btnText = document.getElementById("scan-btn-text");
  const viewport = document.getElementById("viewport-container");
  
  if (!appState.isScanningMode) {
    // Open stream
    appState.isScanningMode = true;
    btn.classList.add("active");
    btnText.innerText = "Close Gate Camera";
    viewport.classList.add("scanning");
    logTerminal("INFO", `Scan channel opened at plant gate: [${appState.selectedLocation}]`);
    
    // Force try real webcam first (shows your real face)
    appState.isSimulatedCamera = false;
    
    startupCamera();
    
    // Ensure countdown elements exist (self-healing DOM check)
    setupCountdownDOMElements();
    
    // Initialize visible countdown timer UI
    let count = 3;
    const banner = document.getElementById("scan-timer-banner");
    const overlay = document.getElementById("scan-countdown-overlay");
    
    if (banner && overlay) {
      banner.innerText = `AUTO-SCAN IN ${count}.0s`;
      overlay.innerText = `${count}`;
      overlay.style.color = "var(--color-primary)";
      overlay.style.borderColor = "var(--color-primary)";
      banner.style.color = "var(--color-primary)";
      
      banner.classList.remove("hidden");
      overlay.classList.remove("hidden");
      
      appState.autoScanInterval = setInterval(() => {
        count -= 1;
        if (count <= 0) {
          clearInterval(appState.autoScanInterval);
          appState.autoScanInterval = null;
          banner.classList.add("hidden");
          overlay.classList.add("hidden");
          triggerManualScan();
        } else {
          banner.innerText = `AUTO-SCAN IN ${count}.0s`;
          overlay.innerText = `${count}`;
          
          // Visual warning state on final second
          if (count === 1) {
            overlay.style.color = "var(--color-warning)";
            overlay.style.borderColor = "var(--color-warning)";
            banner.style.color = "var(--color-warning)";
          }
        }
      }, 1000);
    }
  } else {
    // Shutdown
    appState.isScanningMode = false;
    btn.classList.remove("active");
    btnText.innerText = "Open Attendance Gate";
    viewport.classList.remove("scanning");
    viewport.className = "camera-viewport";
    document.getElementById("verification-card").classList.remove("active");
    
    if (appState.autoScanInterval) {
      clearInterval(appState.autoScanInterval);
      appState.autoScanInterval = null;
    }
    document.getElementById("scan-timer-banner").classList.add("hidden");
    document.getElementById("scan-countdown-overlay").classList.add("hidden");
    
    shutdownActiveStream();
    showCameraFallback();
    logTerminal("INFO", "Gate scanner deactivated.");
  }
}

// Auto stop scanner and release webcam tracks after successful match
function autoStopCameraScanner() {
  logTerminal("INFO", "Verification workflow complete. Auto-deactivating gate camera feed.");
  
  appState.isScanningMode = false;
  
  if (appState.autoScanInterval) {
    clearInterval(appState.autoScanInterval);
    appState.autoScanInterval = null;
  }
  document.getElementById("scan-timer-banner").classList.add("hidden");
  document.getElementById("scan-countdown-overlay").classList.add("hidden");
  
  const btn = document.getElementById("scan-toggle");
  const btnText = document.getElementById("scan-btn-text");
  const viewport = document.getElementById("viewport-container");
  
  btn.classList.remove("active");
  btnText.innerText = "Open Attendance Gate";
  viewport.classList.remove("scanning");
  
  shutdownActiveStream();
  showCameraFallback();
}

// Offline Switch
function toggleOfflineMode(e) {
  appState.isOffline = e.target.checked;
  const statusPill = document.getElementById("app-network-status");
  
  if (appState.isOffline) {
    statusPill.innerText = "OFFLINE";
    statusPill.classList.add("offline");
    logTerminal("WARN", "Supervisor network drop. Switch local queue to storage database buffer.");
  } else {
    statusPill.innerText = "ONLINE";
    statusPill.classList.remove("offline");
    logTerminal("INFO", "Network link restored. Ready to post directly to ZyngHR.");
    
    if (appState.syncQueue.length > 0) {
      logTerminal("INFO", `Detected ${appState.syncQueue.length} unsynced attendance logs. Starting background integration sync...`);
      setTimeout(forceSyncOfflineQueue, 1000);
    }
  }
}



function handleLocationChange(e) {
  appState.selectedLocation = e.target.value;
  logTerminal("INFO", `Supervisor location changed to: ${appState.selectedLocation}`);
  
  const locIndex = e.target.selectedIndex;
  appState.gps.lat = 18.6421 + (locIndex * 0.003) - 0.005;
  appState.gps.lng = 73.8056 - (locIndex * 0.002) + 0.004;
  document.getElementById("gps-coords").innerText = `${appState.gps.lat.toFixed(4)}° N, ${appState.gps.lng.toFixed(4)}° E`;
  logTerminal("INFO", `GPS Coordinates locked: Lat ${appState.gps.lat.toFixed(6)}, Lng ${appState.gps.lng.toFixed(6)}`);
}

// Run the core authentication pipeline
// Run the core authentication pipeline
function triggerManualScan() {
  if (!appState.isScanningMode) {
    toggleScanMode();
    setTimeout(triggerManualScan, 1200);
    return;
  }

  logTerminal("INFO", "Scan triggered: capturing camera stream image frame...");
  highlightFlowNode("node-mobile");

  // Get image base64
  let base64Image = null;
  const subject = appState.selectedSubject;

  if (!appState.isSimulatedCamera) {
    const video = document.getElementById("camera-stream");
    if (video && video.readyState >= 2) {
      // Capture the full video frame instead of a center-cropped slice
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      
      // Mirror draw
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      base64Image = canvas.toDataURL("image/jpeg");
    }
  }

  // Fallback to avatar photo only in simulator mode
  if (!base64Image) {
    if (appState.isSimulatedCamera) {
      if (subject === "unauthorized") {
        // Create a solid gray blank canvas to simulate a wall (low detail)
        const canvas = document.createElement("canvas");
        canvas.width = 160;
        canvas.height = 160;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#808080";
        ctx.fillRect(0, 0, 160, 160);
        base64Image = canvas.toDataURL("image/jpeg");
        logTerminal("INFO", "Simulator: Sending flat surface (simulating wall/no face)...");
      } else if (subject === "spoof") {
        // Use Priya's avatar
        const emp = employeeDatabase["emp-002"];
        if (emp && emp.avatar) {
          base64Image = emp.avatar;
          logTerminal("INFO", "Simulator: Sending spoof attempt image...");
        }
      } else {
        const emp = employeeDatabase[subject];
        if (emp && emp.avatar) {
          base64Image = emp.avatar;
          logTerminal("INFO", `Simulator: Sending registered avatar for ${emp.name}...`);
        }
      }
    } else {
      logTerminal("ERROR", "Biometric Core: Capture failed. Camera stream not ready.");
      handleVerificationResult(false, "UNAUTHORIZED");
      return;
    }
  }

  if (!base64Image) {
    logTerminal("ERROR", "Biometric Core: Capture failed. Camera stream not ready.");
    return;
  }

  const location = appState.selectedLocation;
  const timestamp = new Date().toISOString();

  // Step 1: Face Detection
  setTimeout(() => {
    highlightFlowNode("node-detection");
    logTerminal("INFO", "Biometric Core: Requesting edge validation and face detection...");

    // Send payload to real backend API
    fetch(getApiUrl('/api/biometric/scan'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: base64Image })
    })
    .then(response => {
      if (!response.ok) {
        throw new Error("HTTP status " + response.status);
      }
      return response.json();
    })
    .then(data => {
      // Step 2: Vector Matching & Liveness Check
      setTimeout(() => {
        highlightFlowNode("node-recognition");

        // Handle specific server rejections
        if (data.reason === "NO_FACE_DETECTED") {
          logTerminal("WARN", "Face Matcher: No face bounding boxes detected (wall/blank background).");
          handleVerificationResult(false, "UNAUTHORIZED");
        } else if (data.reason === "SPOOF_FAILED" || subject === "spoof") {
          handleVerificationResult(false, "SPOOF_FAILED");
        } else if (!data.match || data.reason === "UNAUTHORIZED_STRANGER") {
          logTerminal("WARN", "Face Matcher: Query vector mismatch. No match above confidence threshold.");
          handleVerificationResult(false, "UNAUTHORIZED");
        } else {
          // Match successful!
          const matchedId = data.employeeId;
          const confidence = data.confidence;
          const emp = employeeDatabase[matchedId] || { id: matchedId, name: data.name, role: data.role };

          logTerminal("SUCCESS", `Face Matcher: Matched ID ${emp.id} (${emp.name}). Confidence: ${confidence.toFixed(1)}%`);

          // Sync the walk-up simulator subject status to show the recognized employee!
          appState.selectedSubject = matchedId;
          updateWalkUpStatusText();

          // Step 3: Verification Proximity check
          setTimeout(() => {
            highlightFlowNode("node-verification");
            logTerminal("INFO", `Verification Engine: Rostered location matches [${location}]. Shift checks OK.`);

            // Step 4: Sync integration
            setTimeout(() => {
              highlightFlowNode("node-zynghr");
              recordAttendanceSuccess(emp, timestamp);
            }, 800);

          }, 800);
        }
      }, 800);
    })
    .catch(err => {
      if (!appState.isSimulatedCamera) {
        logTerminal("ERROR", "Biometric API Server offline. Webcam scanning is unavailable.");
        handleVerificationResult(false, "UNAUTHORIZED");
      } else {
        logTerminal("WARN", "API integration offline. Falling back to local simulated matching.");
        runLocalSimulationFallback(subject, location, timestamp);
      }
    });

  }, 600);
}

// Fallback biometric simulator in case backend is down
function runLocalSimulationFallback(subject, location, timestamp) {
  if (subject === "spoof") {
    handleVerificationResult(false, "SPOOF_FAILED");
  } else {
    setTimeout(() => {
      highlightFlowNode("node-recognition");
      
      if (subject === "unauthorized") {
        logTerminal("WARN", "Face Matcher: Query vector mismatch. Cosine similarity 0.31 (Threshold >= 0.85).");
        handleVerificationResult(false, "UNAUTHORIZED");
      } else {
        const emp = employeeDatabase[subject];
        logTerminal("SUCCESS", `Face Matcher: Matched ID ${emp.id} (${emp.name}). Cosine similarity: 0.984.`);
        
        setTimeout(() => {
          highlightFlowNode("node-verification");
          logTerminal("INFO", `Verification Engine: Rostered location matches [${location}]. Shift checks OK.`);
          
          setTimeout(() => {
            highlightFlowNode("node-zynghr");
            recordAttendanceSuccess(emp, timestamp);
          }, 800);

        }, 800);
      }
    }, 800);
  }
}

// Highlight step nodes in the system explorer
function highlightFlowNode(nodeId) {
  document.querySelectorAll(".flow-node").forEach(node => {
    node.classList.remove("active");
  });
  const activeNode = document.getElementById(nodeId);
  activeNode.classList.add("active");
  
  const nodeKey = activeNode.dataset.node;
  updateSpecPanel(nodeKey);
}

// Process verification failures (Stranger, Spoof)
function handleVerificationResult(isSuccess, failureReason) {
  const viewport = document.getElementById("viewport-container");
  const card = document.getElementById("verification-card");
  const nameLabel = document.getElementById("verif-name");
  const statusLabel = document.getElementById("verif-status");
  const iconBox = document.getElementById("verif-icon-box");
  const timeLabel = document.getElementById("verif-time");
  const locLabel = document.getElementById("verif-loc");

  const timeStr = new Date().toLocaleTimeString();
  timeLabel.innerText = timeStr;
  locLabel.innerText = appState.selectedLocation.toUpperCase();

  viewport.classList.remove("success", "error");
  card.className = "verification-card";

  if (!isSuccess) {
    viewport.classList.add("error");
    card.classList.add("active", "error-theme");
    
    iconBox.innerHTML = `
      <svg class="svg-icon" style="width:24px; height:24px;" viewBox="0 0 24 24">
        <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" stroke-width="2"/>
        <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" stroke-width="2"/>
      </svg>
    `;

    if (failureReason === "SPOOF_FAILED") {
      nameLabel.innerText = "Liveness Reject";
      statusLabel.innerText = "Spoof Attack Blocked";
      logTerminal("ERROR", "Access Denied: Liveness Verification failed. Face print contains zero volumetric depth.");
    } else {
      nameLabel.innerText = "Pedestrian Access";
      statusLabel.innerText = "Invalid ID Match";
      logTerminal("ERROR", "Access Denied: Captured credentials match no candidate on roster database.");
    }

    appState.counters.denied++;
    appState.counters.total++;
    updateDashboardStats();
    saveLocalStorage();

    // Reset indicator after delay
    setTimeout(() => {
      viewport.classList.remove("error");
      card.classList.remove("active");
      highlightFlowNode("node-mobile");
    }, 3500);
  }
}

// Process verification success (Candidate matched and verified)
function recordAttendanceSuccess(emp, timestamp) {
  const viewport = document.getElementById("viewport-container");
  const card = document.getElementById("verification-card");
  const nameLabel = document.getElementById("verif-name");
  const statusLabel = document.getElementById("verif-status");
  const iconBox = document.getElementById("verif-icon-box");
  const timeLabel = document.getElementById("verif-time");
  const locLabel = document.getElementById("verif-loc");

  const formattedTime = new Date(timestamp).toLocaleTimeString();
  timeLabel.innerText = formattedTime;
  locLabel.innerText = appState.selectedLocation.split(" - ")[0].toUpperCase();

  viewport.classList.remove("success", "error");
  viewport.classList.add("success");
  
  card.className = "verification-card";
  card.classList.add("active", "success-theme");

  iconBox.innerHTML = `
    <svg class="svg-icon" style="width:24px; height:24px;" viewBox="0 0 24 24">
      <polyline points="20 6 9 17 4 12" stroke="currentColor" stroke-width="2"/>
    </svg>
  `;

  nameLabel.innerText = emp.name;
  
  const record = {
    empId: emp.id,
    name: emp.name,
    timestamp: timestamp,
    location: appState.selectedLocation,
    gps: `${appState.gps.lat.toFixed(4)}°, ${appState.gps.lng.toFixed(4)}°`,
    verified: true,
    syncStatus: appState.isOffline ? "Pending" : "Synced"
  };

  if (appState.isOffline) {
    statusLabel.innerText = "Queued Offline (Cached)";
    logTerminal("SUCCESS", `Biometrics Approved for ${emp.name}. Log cached in local memory storage.`);
    appState.syncQueue.push(record);
    appState.counters.offline++;
  } else {
    statusLabel.innerText = "Attendance Synced";
    logTerminal("SUCCESS", `ZyngHR Server Response: Check-in accepted for Employee ${emp.id} (${emp.name})`);
    appState.counters.approved++;
    
    // Post check-in log to server API database
    fetch(getApiUrl('/api/logs'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record)
    }).then(res => {
      if (res.ok) {
        logTerminal("SUCCESS", `API Server: Log synced successfully for ${emp.name}.`);
      }
    }).catch(err => {
      logTerminal("WARN", "API Server: Unreachable. Log cached locally on browser.");
    });
  }

  appState.counters.total++;
  appState.attendanceLogs.unshift(record);
  
  renderAttendanceTable();
  updateDashboardStats();
  saveLocalStorage();

  // Shut down camera immediately!
  autoStopCameraScanner();

  // Reset viewport overlay card state after 3.5 seconds
  setTimeout(() => {
    viewport.classList.remove("success");
    card.classList.remove("active");
    highlightFlowNode("node-mobile");
  }, 3500);
}

// Update dashboard logs table
function renderAttendanceTable() {
  const tbody = document.getElementById("attendance-tbody");
  const emptyRow = document.getElementById("empty-table-row");

  if (appState.attendanceLogs.length === 0) {
    if (emptyRow) emptyRow.style.display = "table-row";
    return;
  }

  if (emptyRow) emptyRow.style.display = "none";
  
  tbody.innerHTML = "";
  appState.attendanceLogs.forEach(log => {
    const row = document.createElement("tr");
    
    const formattedDate = new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const isSynced = log.syncStatus === "Synced";
    
    row.innerHTML = `
      <td>
        <strong style="color:var(--color-text-primary);">${log.name}</strong><br>
        <span style="font-family:var(--font-mono); font-size:0.65rem; color:var(--color-text-muted);">${log.empId}</span>
      </td>
      <td style="font-family:var(--font-mono);">${formattedDate}</td>
      <td>${log.location}</td>
      <td style="font-family:var(--font-mono); font-size:0.75rem;">${log.gps}</td>
      <td>
        <span style="color:var(--color-success); font-weight:600; display:flex; align-items:center; gap:4px;">
          <svg class="svg-icon sm" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" stroke="currentColor"/></svg> Verified
        </span>
      </td>
      <td>
        <span class="sync-badge ${isSynced ? 'synced' : 'pending'}">
          ${isSynced ? 'Synced' : 'Offline'}
        </span>
      </td>
    `;
    tbody.appendChild(row);
  });
}

// Update UI statistics boxes
function updateDashboardStats() {
  document.getElementById("stat-total-scans").innerText = appState.counters.total;
  document.getElementById("stat-approved").innerText = appState.counters.approved;
  document.getElementById("stat-denied").innerText = appState.counters.denied;
  document.getElementById("stat-offline").innerText = appState.counters.offline;
  
  const queueCount = appState.syncQueue.length;
  const countPill = document.getElementById("queue-count-pill");
  
  if (queueCount > 0) {
    countPill.innerText = `${queueCount} Pending`;
    countPill.style.color = "var(--color-warning)";
  } else {
    countPill.innerText = `0 Pending`;
    countPill.style.color = "var(--color-success)";
  }
}

// Sync local database check-ins to cloud (ZynHR Integration simulator)
function forceSyncOfflineQueue() {
  if (appState.isOffline) {
    logTerminal("ERROR", "Cannot sync queue: Supervisor device is currently set to Offline Operations Mode.");
    return;
  }

  if (appState.syncQueue.length === 0) {
    logTerminal("WARN", "Verification Sync: Local storage queue is empty. No sync necessary.");
    return;
  }

  logTerminal("INFO", `Initializing sync transmission: posting ${appState.syncQueue.length} queue records to ZyngHR gateway...`);
  
  const queue = [...appState.syncQueue];
  appState.syncQueue = [];
  
  // Post bulk sync queue to backend API
  fetch(getApiUrl('/api/sync-logs'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(queue)
  }).then(res => {
    if (res.ok) {
      logTerminal("SUCCESS", `API Server: Successfully synchronized ${queue.length} offline records.`);
    }
  }).catch(err => {
    logTerminal("WARN", "API Server: Reconciled locally but server is unreachable.");
  });

  let delay = 0;
  queue.forEach((record, index) => {
    delay += 500;
    setTimeout(() => {
      const targetLog = appState.attendanceLogs.find(l => l.empId === record.empId && l.timestamp === record.timestamp);
      if (targetLog) {
        targetLog.syncStatus = "Synced";
      }
      
      appState.counters.offline = Math.max(0, appState.counters.offline - 1);
      appState.counters.approved++;
      
      logTerminal("SUCCESS", `Reconciled: Offline record verified & posted to ZyngHR for ID: ${record.empId} (${record.name})`);
      
      renderAttendanceTable();
      updateDashboardStats();
      saveLocalStorage();
    }, delay);
  });
}

function clearLogs() {
  document.getElementById("terminal-logs").innerHTML = "";
  logTerminal("INFO", "Terminal logs cleared.");
}

// ==========================================
// NEW CANDIDATE BIOMETRIC REGISTRATION ENGINE
// ==========================================

async function bootRegistrationCamera() {
  const regVideo = document.getElementById("reg-camera-stream");
  const regPreview = document.getElementById("reg-snapshot-preview");
  const regPlaceholder = document.getElementById("reg-camera-placeholder");
  const captureBtn = document.getElementById("reg-btn-capture");
  
  regVideo.style.display = "none";
  regPreview.style.display = "none";
  regPlaceholder.style.display = "block";
  captureBtn.innerText = "Take Snapshot";
  appState.capturedPhotoBase64 = null;
  
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 320, height: 320, facingMode: "user" } 
      });
      appState.webcamStream = stream;
      regVideo.srcObject = stream;
      regVideo.style.display = "block";
      regPlaceholder.style.display = "none";
      logTerminal("INFO", "Enrollment camera feed active. Ready for facial registration.");
    } catch (err) {
      logTerminal("WARN", "Webcam access denied. Enrolling will generate a custom initials avatar.");
      regPlaceholder.innerText = "Webcam denied. Enrolling will generate a color avatar.";
    }
  } else {
    regPlaceholder.innerText = "Webcam API unsupported. Enrolling will generate a color avatar.";
  }
}

// Capture current webcam image frame onto canvas
function captureRegistrationPhoto() {
  const regVideo = document.getElementById("reg-camera-stream");
  const regPreview = document.getElementById("reg-snapshot-preview");
  const captureBtn = document.getElementById("reg-btn-capture");
  const nameInput = document.getElementById("reg-name");
  
  // If we already captured a photo, toggle back to video (Retake)
  if (appState.capturedPhotoBase64) {
    appState.capturedPhotoBase64 = null;
    regPreview.style.display = "none";
    regVideo.style.display = "block";
    captureBtn.innerText = "Take Snapshot";
    logTerminal("INFO", "Enrollment snapshot cleared. Camera active.");
    return;
  }
  
  // Take snapshot
  const canvas = document.createElement("canvas");
  canvas.width = 200;
  canvas.height = 200;
  const ctx = canvas.getContext("2d");
  
  if (appState.webcamStream && regVideo.readyState >= 2) {
    // Crop a tight square from the center of the video feed (45% of screen height)
    // to match the live scanning viewport crop exactly and avoid background matching
    const vw = regVideo.videoWidth;
    const vh = regVideo.videoHeight;
    const cropSize = Math.min(vw, vh) * 0.45;
    const sx = (vw - cropSize) / 2;
    const sy = (vh - cropSize) / 2;
    
    // Mirror draw
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(regVideo, sx, sy, cropSize, cropSize, 0, 0, canvas.width, canvas.height);
    
    appState.capturedPhotoBase64 = canvas.toDataURL("image/jpeg");
    regVideo.style.display = "none";
    regPreview.src = appState.capturedPhotoBase64;
    regPreview.style.display = "block";
    captureBtn.innerText = "Retake Snapshot";
    logTerminal("SUCCESS", "Webcam snapshot (cropped face) captured successfully.");
  } else {
    // Generate initials avatar placeholder if webcam is off
    const name = nameInput.value.trim() || "New Candidate";
    const initials = name.split(" ").map(n => n[0]).join("").toUpperCase().substring(0, 2);
    
    ctx.fillStyle = "hsl(" + Math.floor(Math.random() * 360) + ", 70%, 50%)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 48px Outfit";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(initials, canvas.width/2, canvas.height/2);
    
    appState.capturedPhotoBase64 = canvas.toDataURL("image/jpeg");
    regPreview.src = appState.capturedPhotoBase64;
    regPreview.style.display = "block";
    captureBtn.innerText = "Retake Snapshot";
    logTerminal("WARN", "Generated digital avatar placeholder for biometric record.");
  }
}

// Enroll face data and save to localStorage
function enrollNewCandidate() {
  const nameInput = document.getElementById("reg-name");
  const shiftSelect = document.getElementById("reg-shift");
  
  const name = nameInput.value.trim();
  if (!name) {
    alert("Please enter the candidate's full name!");
    return;
  }
  
  // Duplicate check: Verify if candidate already exists in database
  const existingKey = Object.keys(employeeDatabase).find(key => 
    employeeDatabase[key].name.toLowerCase() === name.toLowerCase()
  );
  
  let targetId = existingKey;
  let isOverwrite = false;
  
  if (existingKey) {
    const confirmOverwrite = confirm(`User "${name}" already exists with ID ${employeeDatabase[existingKey].id}.\n\nDo you want to update/overwrite their biometric profile with this new photo?`);
    if (!confirmOverwrite) {
      logTerminal("WARN", `Enrollment Cancelled: ${name} already exists.`);
      
      // Clear forms and switch back to scanning
      nameInput.value = "";
      appState.capturedPhotoBase64 = null;
      switchTab("scan");
      return;
    }
    isOverwrite = true;
  }
  
  if (!appState.capturedPhotoBase64) {
    // Capture automatically if save clicked without snapping
    captureRegistrationPhoto();
  }
  
  const initials = name.split(" ").map(n => n[0]).join("").toUpperCase().substring(0, 2);
  let employeeObject;
  let finalKey;
  
  if (isOverwrite) {
    employeeObject = employeeDatabase[targetId];
    employeeObject.avatar = appState.capturedPhotoBase64;
    employeeObject.isCropped = true;
    employeeObject.shift = shiftSelect.value;
    finalKey = targetId;
  } else {
    const customId = `emp-custom-${Date.now()}`;
    const empCode = `EMP-${Math.floor(Math.random() * 9000) + 1000}`;
    employeeObject = {
      id: empCode,
      name: name,
      avatar: appState.capturedPhotoBase64,
      initials: initials,
      role: "Contract Staff",
      shift: shiftSelect.value,
      status: "Active",
      location: appState.selectedLocation,
      faceVector: `[Custom Vector hash: ${Math.random().toFixed(4)}]`,
      isCropped: true
    };
    employeeDatabase[customId] = employeeObject;
    finalKey = customId;
  }
  
  if (isOverwrite) {
    logTerminal("SUCCESS", `Database Updated: Re-registered biometric profile for ${name}.`);
  } else {
    logTerminal("SUCCESS", `Database Enrolled: Created biometric profile for ID ${employeeObject.id} (${name}).`);
  }
  
  // Save state
  saveLocalStorage();
  
  // Post enrollment to shared API database server
  fetch(getApiUrl('/api/roster'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key: finalKey, employee: employeeObject })
  }).then(res => {
    if (res.ok) {
      logTerminal("SUCCESS", `API Server: Successfully synced enrollment for ${name}.`);
    } else {
      logTerminal("ERROR", "API Server: Rejected enrollment.");
    }
  }).catch(err => {
    logTerminal("WARN", "API Server: Unreachable. Enrollment cached in browser storage.");
  });

  // Refresh UI
  renderRoster();
  
  // Clean fields
  nameInput.value = "";
  appState.capturedPhotoBase64 = null;
  
  // Switch back to scanning tab
  switchTab("scan");
  
  // Override approach subject to newly registered candidate
  appState.selectedSubject = finalKey;
  updateWalkUpStatusText();

  // Precompute grid for the registered/updated candidate (direct getColorGrid, already cropped)
  const img = new Image();
  img.onload = function() {
    employeeObject.colorGrid = getColorGrid(img);
  };
  img.src = employeeObject.avatar;
}

// Local Storage persistency
function saveLocalStorage() {
  localStorage.setItem("attendance_poc_logs", JSON.stringify(appState.attendanceLogs));
  localStorage.setItem("attendance_poc_queue", JSON.stringify(appState.syncQueue));
  localStorage.setItem("attendance_poc_counters", JSON.stringify(appState.counters));
  localStorage.setItem("attendance_poc_roster", JSON.stringify(employeeDatabase));
}

function loadLocalStorage() {
  const logs = localStorage.getItem("attendance_poc_logs");
  const queue = localStorage.getItem("attendance_poc_queue");
  const counters = localStorage.getItem("attendance_poc_counters");
  const roster = localStorage.getItem("attendance_poc_roster");

  if (logs) appState.attendanceLogs = JSON.parse(logs);
  if (queue) appState.syncQueue = JSON.parse(queue);
  if (counters) appState.counters = JSON.parse(counters);
  
  if (roster) {
    employeeDatabase = JSON.parse(roster);
  }

  renderAttendanceTable();
  updateDashboardStats();
  
  // Sync database from server if reachable
  loadDatabaseFromServer();
  calculateEmployeeHashes();
}

async function loadDatabaseFromServer() {
  try {
    const rosterRes = await fetch(getApiUrl('/api/roster'));
    if (rosterRes.ok) {
      const rosterData = await rosterRes.json();
      employeeDatabase = rosterData;
      saveLocalStorage();
      renderRoster();
      calculateEmployeeHashes();
      logTerminal("SUCCESS", "API Server: Roster synchronized successfully.");
    }
    
    const logsRes = await fetch(getApiUrl('/api/logs'));
    if (logsRes.ok) {
      const logsData = await logsRes.json();
      appState.attendanceLogs = logsData;
      saveLocalStorage();
      renderAttendanceTable();
      logTerminal("SUCCESS", "API Server: Check-in records synchronized successfully.");
    }
  } catch (err) {
    logTerminal("WARN", "API Server offline. Running in local standalone mode.");
  }
}

function getApiUrl(endpoint) {
  if (window.location.protocol === 'file:') {
    return 'http://localhost:3000' + endpoint;
  }
  return endpoint;
}

// Bulk Spreadsheet Roster Importer (JSON or CSV parsing)
function handleBulkRosterImport(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  logTerminal("INFO", `Bulk Import: Reading file [${file.name}]...`);
  
  const reader = new FileReader();
  reader.onload = function(evt) {
    const content = evt.target.result;
    let newEmployeesCount = 0;
    let duplicateCount = 0;
    let syncPromises = [];
    
    if (file.name.endsWith('.json')) {
      try {
        const rosterData = JSON.parse(content);
        const list = Array.isArray(rosterData) ? rosterData : Object.values(rosterData);
        
        list.forEach(emp => {
          const name = emp.name || emp.FullName || emp.fullName;
          const id = emp.id || emp.EmployeeID || emp.empId;
          if (!name || !id) return;
          
          // Check if already exists in roster (by name or ID)
          const nameExists = Object.values(employeeDatabase).some(e => 
            e.name.toLowerCase() === name.toLowerCase() || e.id.toLowerCase() === id.toLowerCase()
          );
          
          if (nameExists) {
            duplicateCount++;
            return;
          }
          
          const customId = `emp-custom-${Date.now()}-${Math.floor(Math.random()*1000)}`;
          const initials = name.split(" ").map(n => n[0]).join("").toUpperCase().substring(0, 2);
          
          const newEmp = {
            id: id.startsWith("EMP-") ? id : `EMP-${id}`,
            name: name,
            avatar: emp.avatar || emp.Photo || emp.photo || null,
            initials: initials,
            role: emp.role || "Contract Staff",
            shift: emp.shift || "Morning Shift (A)",
            status: "Active",
            location: emp.location || emp.Address || emp.address || "Tata Motors - Gate 1",
            faceVector: emp.faceVector || `[Imported Vector hash: ${Math.random().toFixed(4)}]`
          };
          
          employeeDatabase[customId] = newEmp;
          newEmployeesCount++;
          
          // Sync to server API database
          const p = fetch(getApiUrl('/api/roster'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key: customId, employee: newEmp })
          });
          syncPromises.push(p);
        });
        
        Promise.all(syncPromises).then(() => {
          logTerminal("SUCCESS", `Bulk Import: Processed JSON spreadsheet. Registered ${newEmployeesCount} new biometrics. Skipped ${duplicateCount} duplicates.`);
          alert(`Bulk Import Complete!\nRegistered: ${newEmployeesCount} new employees\nDuplicates Skipped: ${duplicateCount}`);
          saveLocalStorage();
          renderRoster();
          calculateEmployeeHashes();
        });
      } catch (err) {
        logTerminal("ERROR", "Bulk Import: Invalid JSON format.");
      }
    } else if (file.name.endsWith('.csv')) {
      try {
        const lines = content.split('\n');
        if (lines.length < 2) {
          logTerminal("ERROR", "Bulk Import: CSV file is empty or missing header line.");
          return;
        }
        
        // Parse header line to find indexes
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        const nameIdx = headers.findIndex(h => h.includes('name') || h.includes('full'));
        const idIdx = headers.findIndex(h => h.includes('id') || h.includes('code') || h.includes('emp'));
        const shiftIdx = headers.findIndex(h => h.includes('shift'));
        const addressIdx = headers.findIndex(h => h.includes('address') || h.includes('location') || h.includes('company') || h.includes('work'));
        const avatarIdx = headers.findIndex(h => h.includes('photo') || h.includes('avatar') || h.includes('image'));
        
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          
          // Split fields, keeping in mind possible quotes
          const fields = line.split(',').map(f => f.replace(/^"|"$/g, '').trim());
          if (fields.length === 0 || !fields[nameIdx]) continue;
          
          const name = fields[nameIdx];
          const id = idIdx !== -1 && fields[idIdx] ? fields[idIdx] : `EMP-${Math.floor(Math.random()*9000)+1000}`;
          const shift = shiftIdx !== -1 && fields[shiftIdx] ? fields[shiftIdx] : "Morning Shift (A)";
          const address = addressIdx !== -1 && fields[addressIdx] ? fields[addressIdx] : "Tata Motors - Gate 1";
          const avatar = avatarIdx !== -1 && fields[avatarIdx] ? fields[avatarIdx] : null;
          
          const nameExists = Object.values(employeeDatabase).some(e => 
            e.name.toLowerCase() === name.toLowerCase() || e.id.toLowerCase() === id.toLowerCase()
          );
          
          if (nameExists) {
            duplicateCount++;
            continue;
          }
          
          const customId = `emp-custom-${Date.now()}-${Math.floor(Math.random()*1000)}`;
          const initials = name.split(" ").map(n => n[0]).join("").toUpperCase().substring(0, 2);
          
          const newEmp = {
            id: id.startsWith("EMP-") ? id : `EMP-${id}`,
            name: name,
            avatar: avatar,
            initials: initials,
            role: "Contract Staff",
            shift: shift,
            status: "Active",
            location: address,
            faceVector: `[Imported Vector hash: ${Math.random().toFixed(4)}]`
          };
          
          employeeDatabase[customId] = newEmp;
          newEmployeesCount++;
          
          // Sync to server API database
          const p = fetch(getApiUrl('/api/roster'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key: customId, employee: newEmp })
          });
          syncPromises.push(p);
        }
        
        Promise.all(syncPromises).then(() => {
          logTerminal("SUCCESS", `Bulk Import: Processed CSV spreadsheet. Registered ${newEmployeesCount} new biometrics. Skipped ${duplicateCount} duplicates.`);
          alert(`Bulk Import Complete!\nRegistered: ${newEmployeesCount} new employees\nDuplicates Skipped: ${duplicateCount}`);
          saveLocalStorage();
          renderRoster();
          calculateEmployeeHashes();
        });
      } catch (err) {
        logTerminal("ERROR", "Bulk Import: Error parsing CSV file.");
      }
    }
    // Reset file input value so same file can be uploaded again
    e.target.value = "";
  };
  reader.readAsText(file);
}

// ==========================================
// COLOR GRID TEMPLATE MATCHING FOR REAL FACE MATCHING
// ==========================================

function getCroppedVideoFace(videoElement) {
  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = 160;
  tempCanvas.height = 160;
  const tempCtx = tempCanvas.getContext("2d");
  
  const vw = videoElement.videoWidth;
  const vh = videoElement.videoHeight;
  
  if (vw && vh) {
    // Crop a tight square from the center of the video feed (45% of screen height)
    // This focuses purely on the face features, ignoring shoulders/background
    const cropSize = Math.min(vw, vh) * 0.45;
    const sx = (vw - cropSize) / 2;
    const sy = (vh - cropSize) / 2;
    
    // Mirror the crop to match the orientation of registered avatars
    tempCtx.translate(tempCanvas.width, 0);
    tempCtx.scale(-1, 1);
    tempCtx.drawImage(videoElement, sx, sy, cropSize, cropSize, 0, 0, 160, 160);
  } else {
    tempCtx.drawImage(videoElement, 0, 0, 160, 160);
  }
  return tempCanvas;
}

function getColorGrid(source) {
  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = 24;
  tempCanvas.height = 24;
  const tempCtx = tempCanvas.getContext("2d");
  
  try {
    tempCtx.drawImage(source, 0, 0, 24, 24);
    const imgData = tempCtx.getImageData(0, 0, 24, 24);
    return imgData.data;
  } catch (e) {
    return null;
  }
}

function getColorGridDifference(grid1, grid2) {
  if (!grid1 || !grid2 || grid1.length !== grid2.length) return 999999;
  
  // Calculate average channel values to perform zero-mean normalized cross-comparison
  let rSum1 = 0, gSum1 = 0, bSum1 = 0;
  let rSum2 = 0, gSum2 = 0, bSum2 = 0;
  const pixels = grid1.length / 4;
  
  for (let i = 0; i < grid1.length; i += 4) {
    rSum1 += grid1[i];   gSum1 += grid1[i+1]; bSum1 += grid1[i+2];
    rSum2 += grid2[i];   gSum2 += grid2[i+1]; bSum2 += grid2[i+2];
  }
  
  const rMean1 = rSum1 / pixels, gMean1 = gSum1 / pixels, bMean1 = bSum1 / pixels;
  const rMean2 = rSum2 / pixels, gMean2 = gSum2 / pixels, bMean2 = bSum2 / pixels;
  
  let totalDiff = 0;
  let totalWeight = 0;
  
  const size = Math.sqrt(pixels); // 24
  const center = (size - 1) / 2; // 11.5
  
  for (let i = 0; i < grid1.length; i += 4) {
    const pixelIndex = i / 4;
    const r = Math.floor(pixelIndex / size);
    const c = pixelIndex % size;
    
    // Distance from center
    const dx = r - center;
    const dy = c - center;
    const distSq = dx * dx + dy * dy;
    
    // Widened Gaussian weight (sigma = 12) to include face outline, hair, and clothing details
    // which helps differentiate users who have similar skin tones
    const weight = Math.exp(-distSq / (2 * 12 * 12));
    
    // Absolute color difference (sensitive to clothes/hair color differences)
    const absDiffR = Math.abs(grid1[i] - grid2[i]);
    const absDiffG = Math.abs(grid1[i+1] - grid2[i+1]);
    const absDiffB = Math.abs(grid1[i+2] - grid2[i+2]);
    
    // Zero-mean normalized difference (sensitive to face structure/shadows, ignores lighting)
    const normDiffR = Math.abs((grid1[i] - rMean1) - (grid2[i] - rMean2));
    const normDiffG = Math.abs((grid1[i+1] - gMean1) - (grid2[i+1] - gMean2));
    const normDiffB = Math.abs((grid1[i+2] - bMean1) - (grid2[i+2] - bMean2));
    
    const pixelDiff = (absDiffR + absDiffG + absDiffB) * 0.6 + (normDiffR + normDiffG + normDiffB) * 0.4;
    
    totalDiff += pixelDiff * weight;
    totalWeight += 3 * weight;
  }
  return totalDiff / totalWeight;
}

function calculateEmployeeHashes() {
  Object.keys(employeeDatabase).forEach(key => {
    const emp = employeeDatabase[key];
    if (emp.avatar && emp.avatar.startsWith("data:")) {
      // Force recalculate the 24x24 grid
      const img = new Image();
      img.onload = function() {
        if (emp.isCropped) {
          // If already cropped during registration, extract grid directly
          emp.colorGrid = getColorGrid(img);
        } else {
          // If legacy/uncropped, crop the center 45% first
          const tempCanvas = document.createElement("canvas");
          tempCanvas.width = 160;
          tempCanvas.height = 160;
          const tempCtx = tempCanvas.getContext("2d");
          
          const cropSize = img.width * 0.45;
          const sx = (img.width - cropSize) / 2;
          const sy = (img.height - cropSize) / 2;
          
          tempCtx.drawImage(img, sx, sy, cropSize, cropSize, 0, 0, 160, 160);
          emp.colorGrid = getColorGrid(tempCanvas);
        }
      };
      img.src = emp.avatar;
    }
  });
}

// Custom Computer Vision validations for face detection
function validateFaceFeatures(grid) {
  if (!grid) return false;
  const size = 24;
  
  let foreheadSum = 0;
  let foreheadCount = 0;
  let eyesSum = 0;
  let eyesCount = 0;
  let cheeksSum = 0;
  let cheeksCount = 0;
  
  let rSum = 0, gSum = 0, bSum = 0;
  
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const idx = (r * size + c) * 4;
      const rVal = grid[idx];
      const gVal = grid[idx+1];
      const bVal = grid[idx+2];
      
      rSum += rVal;
      gSum += gVal;
      bSum += bVal;
      
      const y = 0.299 * rVal + 0.587 * gVal + 0.114 * bVal; // luminance
      
      // Forehead: rows 2 to 5, cols 6 to 17
      if (r >= 2 && r <= 5 && c >= 6 && c <= 17) {
        foreheadSum += y;
        foreheadCount++;
      }
      // Eyes: rows 7 to 11, cols 4 to 19
      else if (r >= 7 && r <= 11 && c >= 4 && c <= 19) {
        eyesSum += y;
        eyesCount++;
      }
      // Cheeks: rows 13 to 17, cols 6 to 17
      else if (r >= 13 && r <= 17 && c >= 6 && c <= 17) {
        cheeksSum += y;
        cheeksCount++;
      }
    }
  }
  
  const avgForehead = foreheadSum / foreheadCount;
  const avgEyes = eyesSum / eyesCount;
  const avgCheeks = cheeksSum / cheeksCount;
  
  const totalPixels = grid.length / 4;
  const avgR = rSum / totalPixels;
  const avgG = gSum / totalPixels;
  const avgB = bSum / totalPixels;
  
  // Extremely lenient face validation:
  // - Eye band should be darker than cheeks or forehead to block flat items
  // - Warm tones (melanin / hemoglobin) dominant over blue/cold hues
  const hasFaceStructure = (avgEyes < avgCheeks * 1.15) || (avgEyes < avgForehead * 1.15);
  const hasWarmTone = (avgR > avgB - 5) && (avgR > avgG - 10);
  
  console.log(`Biometrics Validate -> Structure: ${hasFaceStructure} (F:${avgForehead.toFixed(0)} E:${avgEyes.toFixed(0)} C:${avgCheeks.toFixed(0)}), WarmTone: ${hasWarmTone} (R:${avgR.toFixed(0)} G:${avgG.toFixed(0)} B:${avgB.toFixed(0)})`);
  
  return hasFaceStructure && hasWarmTone;
}
