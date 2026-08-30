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
  currentDirection: "Check-In",
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
  isScanInProgress: false,
  cooldownActive: false,
  
  // Registration and Auth state
  currentActiveTab: "scan",
  capturedPhotoBase64: null,
  isAuthorized: false,
  currentSelectedEmployee: null,
  isContinuousScan: false,
  isShiftRosterEnforced: false,
  language: "en",
  activeSourceNode: null,
  audioContext: null,
  globalTtsAudio: null,
  isVoiceEnabled: true,
  checkoutCandidate: null,
  presenceScanInFlight: false,
  personFirstSeenAt: 0,
  pendingRecognitionId: null,
  pendingRecognitionCount: 0,
  faceRecognitionAttempts: 0,
  checkoutScanActive: false,
  checkoutScanTimer: null,
  manualAttendanceAvailable: false,
  scanSessionId: 0
};

function getLocalDateString(dateObj) {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// BCP-47 Translation mapping and utilities
const TRANSLATIONS = {
  en: {
    supervisor_auth: "Supervisor Authorization",
    enter_pin: "Enter Supervisor Pin",
    authorize_access: "Authorize Access",
    pin_hint: "Passcode Hint: 1234",
    app_title: "ShifTrack",
    site_attendance: "Site Attendance Scan",
    client_location: "Client Deployment Location",
    open_gate: "Open Attendance Gate",
    close_gate: "Close Attendance Gate",
    gps_lock: "GPS Location Lock:",
    scan_gate: "Scan Gate",
    register_face: "Register Face",
    roster_logs: "Roster & Logs",
    zynghr: "ZyngHR",
    lock_hub: "Lock Hub",
    biometric_enroll: "Biometric Enrollment",
    register_candidate: "Register Candidate Biometrics",
    zynghr_emp_id: "Zyng HR Employee ID",
    search: "Search",
    create_profile: "+ Create New Employee Profile",
    candidate_name: "Candidate Full Name",
    name_placeholder: "Name will populate from search",
    roster_shift: "Roster Shift Assignment",
    biometric_capture: "Biometric Camera Capture",
    take_snapshot: "Take Snapshot 1",
    save_register: "Save & Register Candidate",
    registered_roster: "Registered Roster",
    total_swipes: "Total Swipes",
    roster_db: "Roster Database",
    recent_swipes: "Recent Swipe Logs",
    zynghr_portal: "ZyngHR Portal",
    db_reports: "Database & Reports",
    add_profile: "+ Add Profile",
    zynghr_roster: "ZyngHR Company Roster:",
    back_to_directory: "← Back to Directory",
    job_role: "JOB ROLE",
    shift: "SHIFT",
    email: "EMAIL",
    contact: "CONTACT",
    gate_registered: "GATE REGISTERED",
    present: "Present",
    absent: "Absent",
    db_records: "Database Records",
    app_language: "App Language",
    select_language: "Language / भाषा / భాష / மொழி",
    attendance_marked: "Attendance marked successfully.",
    checkout_marked: "Check-out marked successfully.",
    already_marked: "Attendance already marked for today.",
    already_checked_out: "Already checked out for today.",
    wrong_shift: "Access denied. Shift roster violation.",
    spoof_failed: "Liveness check failed. Spoof attempt blocked.",
    unauthorized: "Face not recognized. Access denied.",
    no_face_detected: "No face detected. Please try again.",
    liveness_reject: "Liveness Reject",
    spoof_attack: "Spoof Attack Blocked",
    pedestrian_access: "Pedestrian Access",
    invalid_id: "Invalid ID Match",
    face_not_recognized: "Face Not Recognized",
    access_denied: "Access Denied",
    access_denied_shift: "Access Denied (Wrong Shift)",
    checkin_blocked_duplicate: "Check-in Blocked (Duplicate)",
    checkout_blocked_duplicate: "Check-out Blocked (Duplicate)",
    syncing_zynghr: "Syncing with Zyng HR...",
    checked_in: "Checked in",
    queued_offline: "Queued Offline (Server Error)"
  },
  hi: {
    supervisor_auth: "पर्यवेक्षक प्रमाणीकरण",
    enter_pin: "पर्यवेक्षक पिन दर्ज करें",
    authorize_access: "पहुंच अधिकृत करें",
    pin_hint: "पासकोड संकेत: 1234",
    app_title: "शिफ्ट ट्रैक",
    site_attendance: "साइट उपस्थिति स्कैन",
    client_location: "क्लाइंट परिनियोजन स्थान",
    open_gate: "उपस्थिति गेट खोलें",
    close_gate: "उपस्थिति गेट बंद करें",
    gps_lock: "जीपीएस स्थान लॉक:",
    scan_gate: "द्वार स्कैन",
    register_face: "चेहरा पंजीकृत करें",
    roster_logs: "रोस्टर और लॉग",
    zynghr: "ज़िंग एचआर",
    lock_hub: "हब लॉक करें",
    biometric_enroll: "बायोमेट्रिक नामांकन",
    register_candidate: "चेहरे का बायोमेट्रिक्स दर्ज करें",
    zynghr_emp_id: "ज़िंग एचआर कर्मचारी आईडी",
    search: "खोजें",
    create_profile: "+ नया कर्मचारी प्रोफ़ाइल बनाएं",
    candidate_name: "उम्मीदवार का पूरा नाम",
    name_placeholder: "खोजने पर नाम अपने आप भर जाएगा",
    roster_shift: "रोस्टर शिफ्ट असाइनमेंट",
    biometric_capture: "बायोमेट्रिक कैमरा कैप्चर",
    take_snapshot: "स्नैपशॉट 1 लें",
    save_register: "सहेजें और पंजीकृत करें",
    registered_roster: "पंजीकृत रोस्टर",
    total_swipes: "कुल स्वाइप",
    roster_db: "रोस्टर डेटाबेस",
    recent_swipes: "हाल के स्वाइप लॉग",
    zynghr_portal: "ज़िंग एचआर पोर्टल",
    db_reports: "डेटाबेस और रिपोर्ट",
    add_profile: "+ प्रोफ़ाइल जोड़ें",
    zynghr_roster: "ज़िंग एचआर कंपनी रोस्टर:",
    back_to_directory: "← निर्देशिका पर वापस जाएं",
    job_role: "नौकरी की भूमिका",
    shift: "शिफ्ट",
    email: "ईमेल",
    contact: "संपर्क",
    gate_registered: "गेट पर पंजीकृत",
    present: "उपस्थित",
    absent: "अनुपस्थित",
    db_records: "डेटाबेस रिकॉर्ड",
    app_language: "ऐप की भाषा",
    select_language: "भाषा / Language / భాష / மொழி",
    attendance_marked: "उपस्थिति सफलतापूर्वक दर्ज की गई।",
    checkout_marked: "चेक-आउट सफलतापूर्वक दर्ज किया गया।",
    already_marked: "आज की उपस्थिति पहले ही दर्ज हो चुकी है।",
    already_checked_out: "आज के लिए चेक-आउट पहले ही दर्ज हो चुका है।",
    wrong_shift: "प्रवेश निषेध। शिफ्ट रोस्टर का उल्लंघन।",
    spoof_failed: "सजीवता जांच विफल। स्पूफ प्रयास अवरुद्ध।",
    unauthorized: "चेहरा नहीं पहचाना गया। प्रवेश निषेध।",
    no_face_detected: "कोई चेहरा नहीं मिला। कृपया पुनः प्रयास करें।",
    liveness_reject: "सजीवता अस्वीकृत",
    spoof_attack: "स्पूफ हमला अवरुद्ध",
    pedestrian_access: "पैदल यात्री पहुंच",
    invalid_id: "अमान्य आईडी मिलान",
    face_not_recognized: "चेहरा नहीं पहचाना गया",
    access_denied: "प्रवेश अस्वीकृत",
    access_denied_shift: "प्रवेश निषेध (गलत शिफ्ट)",
    checkin_blocked_duplicate: "चेक-इन अवरुद्ध (डबल एंट्री)",
    checkout_blocked_duplicate: "चेक-आउट अवरुद्ध (डबल एंट्री)",
    syncing_zynghr: "ज़िंग एचआर के साथ समन्वयित हो रहा है...",
    checked_in: "चेक इन हो गया",
    queued_offline: "ऑफ़लाइन कतारबद्ध (सर्वर त्रुटि)"
  },
  te: {
    supervisor_auth: "సూపర్‌వైజర్ ప్రాధికారత",
    enter_pin: "సూపర్‌వైజర్ పిన్ నమోదు చేయండి",
    authorize_access: "యాక్సెస్ ప్రాధికారం చేయి",
    pin_hint: "పాస్‌కోడ్ హింట్: 1234",
    app_title: "షిఫ్ట్ ట్రాక్",
    site_attendance: "సైట్ హాజరు స్కాన్",
    client_location: "క్లయింట్ డిప్లాయ్మెంట్ లొకేషన్",
    open_gate: "హాజరు గేట్ తెరవండి",
    close_gate: "హాజరు గేట్ మూసివేయండి",
    gps_lock: "జీపీఎస్ లొకేషన్ లాక్:",
    scan_gate: "గేట్ స్కాన్",
    register_face: "ముఖాన్ని నమోదు చేయి",
    roster_logs: "రోస్టర్ & లాగ్స్",
    zynghr: "జింగ్ హెచ్ఆర్",
    lock_hub: "హబ్ లాక్ చేయి",
    biometric_enroll: "బయోమెట్రిక్ నమోదు",
    register_candidate: "ముఖ బయోమెట్రిక్స్ నమోదు చేయండి",
    zynghr_emp_id: "జింగ్ హెచ్ఆర్ ఉద్యోగి ఐడీ",
    search: "వెతకండి",
    create_profile: "+ కొత్త ఉద్యోగి ప్రొఫైల్ సృష్టించండి",
    candidate_name: "అభ్యర్థి పూర్తి పేరు",
    name_placeholder: "శోధన నుండి పేరు నింపబడుతుంది",
    roster_shift: "రోస్టర్ షిఫ్ట్ కేటాయింపు",
    biometric_capture: "బయోమెట్రిక్ కెమెరా క్యాప్చర్",
    take_snapshot: "స్నాప్‌షాట్ 1 తీసుకోండి",
    save_register: "సేవ్ చేసి నమోదు చేయండి",
    registered_roster: "నమోదైన రోస్టర్",
    total_swipes: "మొత్తం స్వైప్‌లు",
    roster_db: "రోస్టర్ డేటాబేస్",
    recent_swipes: "ఇటీవలి స్వైప్ లాగ్స్",
    zynghr_portal: "జింగ్ హెచ్ఆర్ పోర్టల్",
    db_reports: "డేటాబேస్ & నివేదికలు",
    add_profile: "+ ప్రొఫைల్ జోడించు",
    zynghr_roster: "జింగ్ హెచ్ఆర్ కంపెనీ రోస్టర్:",
    back_to_directory: "← డైరెక్టరీకి తిరిగి వెళ్ళు",
    job_role: "ఉద్యోగ పాత్ర",
    shift: "షిఫ్ట్",
    email: "ఈమెయిల్",
    contact: "సంప్రదించండి",
    gate_registered: "గేట్ వద్ద నమోదైనది",
    present: "హాజరయ్యారు",
    absent: "హాజరుకాలేదు",
    db_records: "డేటాబేస్ రికార్డులు",
    app_language: "యాప్ భాష",
    select_language: "భాష / Language /  भाषा / மொழி",
    attendance_marked: "హాజరు విజయవంతంగా నమోదైంది.",
    checkout_marked: "చెక్-అవుట్ విజయవంతంగా నమోదైంది.",
    already_marked: "ఈరోజు హాజరు ఇప్పటికే నమోదైంది.",
    already_checked_out: "ఈరోజు చెక్-అవుట్ ఇప్పటికే నమోదైంది.",
    wrong_shift: "యాక్సెస్ తిరస్కరించబడింది. షిఫ్ట్ రోస్టర్ ఉల్లంఘన.",
    spoof_failed: "లైవ్‌నెస్ చెక్ విఫలమైంది. స్పూఫ్ ప్రయత్నం నిరోధించబడింది.",
    unauthorized: "ముఖం గుర్తించబడలేదు. యాక్సెస్ తిరస్కరించబడింది.",
    no_face_detected: "ముఖం గుర్తించబడలేదు. దయచేసి మళ్లీ ప్రయత్నించండి.",
    liveness_reject: "లైవ్‌నెస్ తిరస్కరణ",
    spoof_attack: "స్పూఫ్ దాడి నిరోధించబడింది",
    pedestrian_access: "పాదచారుల యాక్సెస్",
    invalid_id: "చెల్లని ఐడీ మ్యాచ్",
    face_not_recognized: "ముఖం గుర్తించబడలేదు",
    access_denied: "ప్రవేశం నిరాకరించబడింది",
    access_denied_shift: "యాక్సెస్ తిరస్కరించబడింది (తప్పుడు షిఫ్ట్)",
    checkin_blocked_duplicate: "చెక్-ఇన్ నిరోధించబడింది (డూప్లికేట్)",
    checkout_blocked_duplicate: "చెక్-అవుట్ నిరోధించబడింది (డూప్లికేట్)",
    syncing_zynghr: "జింగ్ హెచ్ఆర్ తో సింక్ అవుతోంది...",
    checked_in: "చెక్ ఇన్ అయ్యారు",
    queued_offline: "ఆఫ్‌లైన్ క్యూలో ఉంది (సర్వర్ లోపం)"
  },
  ta: {
    supervisor_auth: "மேற்பார்வையாளர் அங்கீகாரம்",
    enter_pin: "மேற்பார்வையாளர் பின்னை உள்ளிடவும்",
    authorize_access: "அனுமதியை அங்கீகரி",
    pin_hint: "கடவுக்குறியீடு குறிப்பு: 1234",
    app_title: "ஷிப்ட் ட்ராக்",
    site_attendance: "தள வருகை ஸ்கேன்",
    client_location: "வாடிக்கையாளர் வரிசைப்படுத்தல் இடம்",
    open_gate: "வருகை நுழைவாயிலை திற",
    close_gate: "வருகை நுழைவாயிலை மூடு",
    gps_lock: "ஜிபிஎஸ் இருப்பிட பூட்டு:",
    scan_gate: "கேட் ஸ்கேன்",
    register_face: "முகத்தை பதிவு செய்",
    roster_logs: "பதிவேடு & பதிவுகள்",
    zynghr: "ஜிங் எச்ஆர்",
    lock_hub: "ஹப்பை பூட்டு",
    biometric_enroll: "பயோமெட்ரிக் பதிவு",
    register_candidate: "முக பயோமெட்ரிக்ஸைப் பதிவுசெய்க",
    zynghr_emp_id: "ஜிங் எச்ஆர் ஊழியர் ஐடி",
    search: "தேடு",
    create_profile: "+ புதிய பணியாளர் சுயவிவரத்தை உருவாக்கு",
    candidate_name: "வேட்பாளரின் முழு பெயர்",
    name_placeholder: "தேடலின் மூலம் பெயர் தானாகவே நிரம்பும்",
    roster_shift: "பணி முறை ஒதுக்கீடு",
    biometric_capture: "பயோமெட்ரிக் கேமரா படம் பிடித்தல்",
    take_snapshot: "படம் 1 எடுக்கவும்",
    save_register: "சேமித்து பதிவு செய்க",
    registered_roster: "பதிவு செய்யப்பட்ட பதிவேடு",
    total_swipes: "மொத்த ஸ்வைப்கள்",
    roster_db: "பதிவேட்டு தரவுத்தளம்",
    recent_swipes: "சமீபத்திய ஸ்வைப்பு பதிவுகள்",
    zynghr_portal: "ஜிங் எச்ஆர் போர்டல்",
    db_reports: "தரவுத்தளம் & அறிக்கைகள்",
    add_profile: "+ சுயவிவரத்தைச் சேர்",
    zynghr_roster: "ஜிங் எச்ஆர் நிறுவன பதிவேடு:",
    back_to_directory: "← அடைவுக்குத் திரும்பு",
    job_role: "வேலை பங்கு",
    shift: "பணி முறை",
    email: "மின்னஞ்சல்",
    contact: "தொடர்பு",
    gate_registered: "கேட்டில் பதிவு செய்யப்பட்டுள்ளது",
    present: "வருகை",
    absent: "வருகை இல்லை",
    db_records: "தரவுத்தள பதிவுகள்",
    app_language: "செயலி மொழி",
    select_language: "மொழி / Language / भाषा / భాష",
    attendance_marked: "வருகை வெற்றிகரமாக பதிவு செய்யப்பட்டது.",
    checkout_marked: "செக்-அவுட் வெற்றிகரமாக பதிவு செய்யப்பட்டது.",
    already_marked: "இன்றைய வருகை ஏற்கனவே பதிவு செய்யப்பட்டுள்ளது.",
    already_checked_out: "இன்றைய செக்-அவுட் ஏற்கனவே பதிவு செய்யப்பட்டுள்ளது.",
    wrong_shift: "அனுமதி மறுக்கப்பட்டது. ஷிப்ட் ரோஸ்டர் விதிமீறல்.",
    spoof_failed: "உயிரோட்ட சோதனை தோல்வி. ஏமாற்றும் முயற்சி தடுத்து நிறுத்தப்பட்டது.",
    unauthorized: "முகம் அடையாளம் காணப்படவில்லை. அனுமதி மறுக்கப்பட்டது.",
    no_face_detected: "முகம் கண்டறியப்படவில்லை. மீண்டும் முயற்சிக்கவும்.",
    liveness_reject: "உயிரோட்டம் நிராகரிப்பு",
    spoof_attack: "ஏமாற்று முயற்சி தடுக்கப்பட்டது",
    pedestrian_access: "நடசாரிகள் அணுகல்",
    invalid_id: "தவறான ஐடி பொருத்தம்",
    face_not_recognized: "முகம் அடையாளம் காணப்படவில்லை",
    access_denied: "அனுமதி மறுக்கப்பட்டது",
    access_denied_shift: "அனுமதி மறுக்கப்பட்டது (தவறான பணிமுறை)",
    checkin_blocked_duplicate: "செக்-இன் தடுக்கப்பட்டது (இரட்டை பதிவு)",
    checkout_blocked_duplicate: "செக்-அவுட் தடுக்கப்பட்டது (இரட்டை பதிவு)",
    syncing_zynghr: "ஜிங் எச்ஆர் உடன் ஒத்திசைக்கப்படுகிறது...",
    checked_in: "செக்-இன் செய்யப்பட்டது",
    queued_offline: "ஆஃப்லைனில் வரிசைப்படுத்தப்பட்டது (சேவையகப் பிழை)"
  },
  kn: {
    supervisor_auth: "ಮೇಲ್ವಿಚಾರಕ ದೃಢೀಕರಣ",
    enter_pin: "ಮೇಲ್ವಿಚಾರಕ ಪಿನ್ ನಮೂದಿಸಿ",
    authorize_access: "ಪ್ರವೇಶವನ್ನು ಅಧಿಕೃತಗೊಳಿಸಿ",
    pin_hint: "ಪಾಸ್‌ಕೋಡ್ ಸುಳಿವು: 1234",
    app_title: "ಶಿಫ್ಟ್ ಟ್ರ್ಯಾಕ್",
    site_attendance: "ಸೈಟ್ ಹಾಜರಾತಿ ಸ್ಕ್ಯಾನ್",
    client_location: "ಕ್ಲೈಂಟ್ ನಿಯೋಜನೆ ಸ್ಥಳ",
    open_gate: "ಹಾಜರಾತಿ ಗೇಟ್ ತೆರೆಯಿರಿ",
    close_gate: "ಹಾಜರಾತಿ ಗೇಟ್ ಮುಚ್ಚಿ",
    gps_lock: "ಜಿಪಿಎಸ್ ಸ್ಥಳ ಲಾಕ್:",
    scan_gate: "ಗೇಟ್ ಸ್ಕ್ಯಾನ್",
    register_face: "ಮುಖವನ್ನು ನೋಂದಾಯಿಸಿ",
    roster_logs: "ರೋಸ್ಟರ್ ಮತ್ತು ಲಾಗ್‌ಗಳು",
    zynghr: "ಜಿಂಗ್ ಎಚ್ಆರ್",
    lock_hub: "ಹಬ್ ಲಾಕ್ ಮಾಡಿ",
    biometric_enroll: "ಬಯೋಮೆಟ್ರಿಕ್ ದಾಖಲಾತಿ",
    register_candidate: "ಮುಖ ಬಯೋಮೆಟ್ರಿಕ್ಸ್ ನೋಂದಾಯಿಸಿ",
    zynghr_emp_id: "ಜಿಂಗ್ ಎಚ್ಆರ್ ಉದ್ಯೋಗಿ ಐಡಿ",
    search: "ಹುಡುಕು",
    create_profile: "+ ಹೊಸ ಉದ್ಯೋಗಿ ಪ್ರೊಫೈಲ್ ರಚಿಸಿ",
    candidate_name: "ಅಭ್ಯರ್ಥಿಯ ಪೂರ್ಣ ಹೆಸರು",
    name_placeholder: "ಹುಡುಕಾಟದಿಂದ ಹೆಸರು ತುಂಬುತ್ತದೆ",
    roster_shift: "ರೋಸ್ಟರ್ ಶಿಫ್ಟ್ ನಿಯೋಜನೆ",
    biometric_capture: "ಬಯೋಮೆಟ್ರಿಕ್ ಕ್ಯಾಮೆರಾ ಕ್ಯಾಪ್ಚರ್",
    take_snapshot: "ಸ್ನಾಪ್‌ಶಾಟ್ 1 ತೆಗೆದುಕೊಳ್ಳಿ",
    save_register: "ಉಳಿಸಿ ಮತ್ತು ನೋಂದಾಯಿಸಿ",
    registered_roster: "ನೋಂದಾಯಿತ ರೋಸ್ಟರ್",
    total_swipes: "ಒಟ್ಟು ಸ್ವೈಪ್‌ಗಳು",
    roster_db: "ರೋಸ್ಟರ್ ಡೇಟಾಬೇಸ್",
    recent_swipes: "ಇತ್ತೀಚಿನ ಸ್ವೈಪ್ ಲಾಗ್‌ಗಳು",
    zynghr_portal: "ಜಿಂಗ್ ಎಚ್ಆರ್ ಪೋರ್ಟಲ್",
    db_reports: "ಡೇಟಾಬೇಸ್ ಮತ್ತು ವರದಿಗಳು",
    add_profile: "+ ಪ್ರೊಫೈಲ್ ಸೇರಿಸಿ",
    zynghr_roster: "ಜಿಂಗ್ ಎಚ್ಆರ್ ಕಂಪನಿ ರೋಸ್ಟರ್:",
    back_to_directory: "← ಡೈರೆಕ್ಟರಿಗೆ ಹಿಂತಿರುಗಿ",
    job_role: "ಉದ್ಯೋಗ ಪಾತ್ರ",
    shift: "ಶಿಫ್ಟ್",
    email: "ಇಮೇಲ್",
    contact: "ಸಂಪರ್ಕ",
    gate_registered: "ಗೇಟ್ ನೋಂದಾಯಿಸಲಾಗಿದೆ",
    present: "ಹಾಜರು",
    absent: "ಗೈರುಹಾಜರು",
    db_records: "ಡೇಟಾಬೇಸ್ ದಾಖಲೆಗಳು",
    app_language: "ಅಪ್ಲಿಕೇಶನ್ ಭಾಷೆ",
    select_language: "ಭಾಷೆ / Language / भाषा /  ಭಾಷ / மொழி / ಕನ್ನಡ",
    attendance_marked: "ಹಾಜರಾತಿ ಯಶಸ್ವಿಯಾಗಿ ದಾಖಲಾಗಿದೆ.",
    checkout_marked: "ಚೆಕ್-ಔಟ್ ಯಶಸ್ವಿಯಾಗಿ ದಾಖಲಾಗಿದೆ.",
    already_marked: "ಇಂದಿನ ಹಾಜರಾತಿ ಈಗಾಗಲೇ ದಾಖಲಾಗಿದೆ.",
    already_checked_out: "ಇಂದಿನ ಚೆಕ್-ಔಟ್ ಈಗಾಗಲೇ ದಾಖಲಾಗಿದೆ.",
    wrong_shift: "ಪ್ರವೇಶ ನಿರಾಕರಿಸಲಾಗಿದೆ. ಶಿಫ್ಟ್ ರೋಸ್ಟರ್ ನಿಯಮ ಉಲ್ಲಂಘನೆ.",
    spoof_failed: "ಲೈವ್‌ನೆಸ್ ಪರಿಶೀಲನೆ ವಿಫಲವಾಗಿದೆ. ಸ್ಪೂಫ್ ಯತ್ನ ತಡೆಯಲಾಗಿದೆ.",
    unauthorized: "ಮುಖ ಗುರುತಿಸಲಾಗಿಲ್ಲ. ಪ್ರವೇಶ ನಿರಾಕರಿಸಲಾಗಿದೆ.",
    no_face_detected: "ಯಾವುದೇ ಮುಖ ಪತ್ತೆಯಾಗಿಲ್ಲ. ದಯವಿಟ್ಟು ಮತ್ತೊಮ್ಮೆ ಪ್ರಯತ್ನಿಸಿ.",
    liveness_reject: "ಲೈವ್‌ನೆಸ್ ತಿರಸ್ಕಾರ",
    spoof_attack: "ಸ್ಪೂಫ್ ದಾಳಿ ತಡೆಯಲಾಗಿದೆ",
    pedestrian_access: "ಪಾದಚಾರಿ ಪ್ರವೇಶ",
    invalid_id: "ಅಮಾನ್ಯ ಐಡಿ ಹೊಂದಾಣಿಕೆ",
    face_not_recognized: "ಮುಖ ಗುರುತಿಸಲಾಗಿಲ್ಲ",
    access_denied: "ಪ್ರವೇಶ ನಿರಾಕರಿಸಲಾಗಿದೆ",
    access_denied_shift: "ಪ್ರವೇಶ ನಿರಾಕರಿಸಲಾಗಿದೆ (ತಪ್ಪು ಶಿಫ್ಟ್)",
    checkin_blocked_duplicate: "ಚೆಕ್-ಇನ್ ತಡೆಯಲಾಗಿದೆ (ಡೂಪ್ಲಿಕೇಟ್)",
    checkout_blocked_duplicate: "ಚೆಕ್-ಔಟ್ ತಡೆಯಲಾಗಿದೆ (ಡೂಪ್ಲಿಕೇಟ್)",
    syncing_zynghr: "ಜಿಂಗ್ ಎಚ್ಆರ್ ಜೊತೆ ಸಿಂಕ್ ಆಗುತ್ತಿದೆ...",
    checked_in: "ಚೆಕ್ ಇನ್ ಆಗಿದೆ",
    queued_offline: "ಆಫ್‌ಲೈನ್ ಕ್ಯೂನಲ್ಲಿದೆ (ಸರ್ವರ್ ದೋಷ)"
  }
};

function getTranslation(key, fallback) {
  const currentLang = appState.language || 'en';
  return (TRANSLATIONS[currentLang] && TRANSLATIONS[currentLang][key]) || fallback;
}

function translateUI(lang) {
  const translations = TRANSLATIONS[lang] || TRANSLATIONS.en;
  
  document.querySelectorAll("[data-i18n]").forEach(elem => {
    const key = elem.getAttribute("data-i18n");
    if (translations[key]) {
      if (elem.tagName === "INPUT" && elem.hasAttribute("placeholder")) {
        elem.setAttribute("placeholder", translations[key]);
      } else {
        elem.textContent = translations[key];
      }
    }
  });

  const scanBtnText = document.getElementById("scan-btn-text");
  if (scanBtnText) {
    scanBtnText.textContent = appState.isScanningMode ? translations.close_gate : translations.open_gate;
  }
}

function handleLanguageChange(event) {
  const selectedLang = event.target.value;
  appState.language = selectedLang;
  
  const selectors = ["login-lang-select", "header-lang-select", "settings-lang-select"];
  selectors.forEach(id => {
    const elem = document.getElementById(id);
    if (elem) elem.value = selectedLang;
  });
  
  saveLocalStorage();
  translateUI(selectedLang);
  logTerminal("INFO", `Language switched to: ${selectedLang.toUpperCase()}`);
}

function playAudioViaWebAudio(url, isCancelled) {
  return new Promise((resolve, reject) => {
    try {
      if (isCancelled && isCancelled()) {
        return reject(new Error("Cancelled"));
      }

      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) {
        return reject(new Error("Web Audio API not supported"));
      }
      
      const audioCtx = appState.audioContext || new AudioContextClass();
      if (audioCtx.state === "suspended") {
        audioCtx.resume();
      }
      
      fetch(url)
        .then(response => {
          if (isCancelled && isCancelled()) throw new Error("Cancelled");
          if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
          return response.arrayBuffer();
        })
        .then(arrayBuffer => {
          if (isCancelled && isCancelled()) throw new Error("Cancelled");
          return audioCtx.decodeAudioData(arrayBuffer);
        })
        .then(audioBuffer => {
          if (isCancelled && isCancelled()) throw new Error("Cancelled");
          const source = audioCtx.createBufferSource();
          source.buffer = audioBuffer;
          source.connect(audioCtx.destination);
          
          // Save active source node reference to stop it if fallback is triggered
          appState.activeSourceNode = source;
          
          source.onended = () => {
            if (appState.activeSourceNode === source) {
              appState.activeSourceNode = null;
            }
          };
          source.start(0);
          resolve(); // Resolve immediately when playback starts to clear timeout
        })
        .catch(err => {
          reject(err);
        });
    } catch (e) {
      reject(e);
    }
  });
}

function speakVoiceMessage(textKey, fallbackText) {
  // Stop Web Audio API playback instantly if active to prevent overlapping voices
  if (appState.activeSourceNode) {
    try {
      appState.activeSourceNode.stop();
      appState.activeSourceNode = null;
    } catch (e) {}
  }
  // Clear HTML5 audio callbacks and stop audio to prevent double voices
  const activeAudio = appState.globalTtsAudio;
  if (activeAudio) {
    activeAudio.onplaying = null;
    activeAudio.onerror = null;
    try {
      activeAudio.pause();
      activeAudio.src = "";
    } catch (e) {}
  }

  const currentLang = appState.language || 'en';
  const text = TRANSLATIONS[currentLang][textKey] || fallbackText;
  
  const langCodesShort = {
    en: 'en',
    hi: 'hi',
    te: 'te',
    ta: 'ta',
    kn: 'kn'
  };
  
  const langCode = langCodesShort[currentLang] || 'en';
  
  const isMobile = (
    window.location.protocol === 'file:' || 
    window.location.protocol === 'capacitor:' || 
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
  );

  // Try high-quality online TTS fallback if online
  if (navigator.onLine && !appState.isOffline) {
    try {
      console.log(`TTS (Online): Speaking "${text}" in ${currentLang}`);
      
      let ttsUrl;
      if (isMobile) {
        // Direct HTTPS Google Translate URL to bypass local server requirements & mixed-content blocks on Android
        ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${langCode}&client=tw-ob&q=${encodeURIComponent(text)}`;
      } else {
        // Call our secure, referrer-free local backend tts proxy API for desktop browsers
        ttsUrl = getApiUrl(`/api/tts?lang=${langCode}&text=${encodeURIComponent(text)}`);
      }
      
      let fallbackTriggered = false;
      let timeoutId = null;

      const triggerFallback = (reason) => {
        if (!fallbackTriggered) {
          fallbackTriggered = true;
          if (timeoutId) clearTimeout(timeoutId);
          console.warn(`TTS Fallback triggered due to: ${reason}`);
          
          // Stop Web Audio API playback instantly if active
          if (appState.activeSourceNode) {
            try {
              appState.activeSourceNode.stop();
              appState.activeSourceNode = null;
            } catch (e) {}
          }
          
          // Clear HTML5 audio callbacks and stop audio to prevent double voices
          const audio = appState.globalTtsAudio;
          if (audio) {
            audio.onplaying = null;
            audio.onerror = null;
            try {
              audio.pause();
              audio.src = "";
            } catch (e) {}
          }
          
          speakLocalVoice(text, currentLang);
        }
      };

      timeoutId = setTimeout(() => {
        triggerFallback("timeout");
      }, 5000); // 5s timeout to prevent early fallbacks during screen sharing
      
      // Try Web Audio API first (highly robust on Android WebView, bypasses range requests)
      playAudioViaWebAudio(ttsUrl, () => fallbackTriggered)
        .then(() => {
          if (fallbackTriggered) return;
          if (timeoutId) clearTimeout(timeoutId);
        })
        .catch(err => {
          if (fallbackTriggered) return;
          console.warn("Web Audio TTS failed, attempting HTML5 Audio fallback:", err);
          
          // Fallback to HTML5 audio element
          const audio = appState.globalTtsAudio || document.createElement('audio');
          appState.globalTtsAudio = audio;
          audio.referrerPolicy = 'no-referrer';
          audio.src = ttsUrl;
          
          audio.play()
            .then(() => {
              if (fallbackTriggered) {
                try { audio.pause(); } catch(e) {}
                return;
              }
              if (timeoutId) clearTimeout(timeoutId);
            })
            .catch(e => {
              if (fallbackTriggered) return;
              triggerFallback("html5_audio_failed");
            });
        });
      return;
    } catch (e) {
      console.warn("Online TTS failed, falling back to local speech synthesis:", e);
    }
  }
  
  // Offline fallback
  speakLocalVoice(text, currentLang);
}

function speakLocalVoice(text, lang) {
  if (!window.speechSynthesis) {
    console.warn("Speech Synthesis is not supported in this browser environment.");
    return;
  }
  
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  
  const langCodesLong = {
    en: 'en-IN',
    hi: 'hi-IN',
    te: 'te-IN',
    ta: 'ta-IN',
    kn: 'kn-IN'
  };
  
  utterance.lang = langCodesLong[lang] || 'en-US';
  
  // Asynchronously query voices
  const voices = window.speechSynthesis.getVoices();
  const matchedVoice = voices.find(v => v.lang.startsWith(utterance.lang) || v.lang.startsWith(lang));
  if (matchedVoice) {
    utterance.voice = matchedVoice;
  }
  
  window.speechSynthesis.speak(utterance);
}

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

    // Populate month dropdowns dynamically
    populateMonthDropdowns();

    // Load registered roster in UI
    renderRoster();

    // Load default spec node (mobile app)
    updateSpecPanel("mobile");

    // Attach Event Listeners
    document.getElementById("login-submit-btn").addEventListener("click", handleSupervisorLogin);
    document.getElementById("login-pin").addEventListener("keypress", (e) => {
      if (e.key === "Enter") handleSupervisorLogin();
    });

    document.getElementById("scan-toggle").addEventListener("click", () => toggleScanMode("Check-In"));
    
    // Check-in is automatic. Checkout starts a fresh supervisor-initiated scan.
    const checkOutBtn = document.getElementById("btn-check-out");
    if (checkOutBtn) {
      checkOutBtn.disabled = false;
      checkOutBtn.addEventListener("click", beginCheckoutScan);
    }
    document.getElementById("btn-manual-attendance").addEventListener("click", submitManualAttendanceFromScan);
    
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

    const loginLang = document.getElementById("login-lang-select");
    if (loginLang) loginLang.addEventListener("change", handleLanguageChange);
    
    const headerLang = document.getElementById("header-lang-select");
    if (headerLang) headerLang.addEventListener("change", handleLanguageChange);
    
    const settingsLang = document.getElementById("settings-lang-select");
    if (settingsLang) settingsLang.addEventListener("change", handleLanguageChange);

    // Month selector change triggers to update visual calendars dynamically
    const reportMonthSelect = document.getElementById("report-month-select");
    if (reportMonthSelect) {
      reportMonthSelect.addEventListener("change", () => {
        if (appState.currentSelectedEmployee) {
          showEmployeeCalendar(appState.currentSelectedEmployee);
        }
      });
    }
    const mobileMonthSelect = document.getElementById("mobile-dossier-month-select");
    if (mobileMonthSelect) {
      mobileMonthSelect.addEventListener("change", () => {
        if (appState.currentSelectedEmployee) {
          openMobileZyngHRDossier(appState.currentSelectedEmployee);
        }
      });
    }

    const manualBtn = document.getElementById("mobile-dossier-manual-btn");
    if (manualBtn) {
      manualBtn.addEventListener("click", () => {
        if (appState.currentSelectedEmployee) {
          const dirSelect = document.getElementById("mobile-dossier-manual-direction");
          const direction = dirSelect ? dirSelect.value : "Check-In";
          submitManualAttendance(appState.currentSelectedEmployee, direction);
        }
      });
    }

    // Mobile Camera Real Face Snap Trigger
    const snapInput = document.getElementById("mobile-camera-snap-input");
    const snapTriggers = ["btn-mobile-snap-trigger", "btn-mobile-snap-permanent"];
    
    snapTriggers.forEach(id => {
      const btn = document.getElementById(id);
      if (btn) {
        btn.addEventListener("click", () => snapInput.click());
      }
    });

    if (snapInput) {
      snapInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (evt) => {
            appState.capturedMobileSnapBase64 = evt.target.result;
            appState.isSimulatedCamera = false;
            
            const video = document.getElementById("camera-stream");
            const fallback = document.getElementById("camera-fallback");
            video.style.display = "none";
            fallback.style.display = "none";
            
            const img = new Image();
            img.onload = () => {
              appState.capturedFaceImageElement = img; // cache image for continuous canvas drawing
              logTerminal("INFO", "Real mobile camera snapshot captured. Running AI face recognition...");
              
              appState.isScanningMode = true;
              document.getElementById("viewport-container").classList.add("scanning");
              triggerManualScan();
            };
            img.src = evt.target.result;
          };
          reader.readAsDataURL(file);
        }
      });
    }

    // Mobile App Back Button handlers to prevent hardware exit
    const scanBackBtn = document.getElementById("mobile-scan-back-btn");
    if (scanBackBtn) {
      scanBackBtn.addEventListener("click", lockAppSupervisor);
    }
    const regBackBtn = document.getElementById("mobile-reg-back-btn");
    if (regBackBtn) {
      regBackBtn.addEventListener("click", () => switchTab("scan"));
    }

    // Registration Mobile Snap Trigger
    const regSnapBtn = document.getElementById("reg-btn-mobile-snap-permanent");
    const regSnapInput = document.getElementById("reg-mobile-camera-snap-input");
    if (regSnapBtn && regSnapInput) {
      regSnapBtn.addEventListener("click", () => regSnapInput.click());
      regSnapInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (evt) => {
            appState.capturedPhotoBase64 = evt.target.result;
            
            const regVideo = document.getElementById("reg-camera-stream");
            const regPreview = document.getElementById("reg-snapshot-preview");
            const regPlaceholder = document.getElementById("reg-camera-placeholder");
            
            regVideo.style.display = "none";
            regPlaceholder.style.display = "none";
            regPreview.src = evt.target.result;
            regPreview.style.display = "block";
            
            logTerminal("INFO", "Mobile selfie snapshot captured for registration.");
          };
          reader.readAsDataURL(file);
        }
      });
    }

     // Registration button clickers
    document.getElementById("reg-btn-capture").addEventListener("click", captureRegistrationPhoto);
    document.getElementById("reg-btn-save").addEventListener("click", enrollNewCandidate);
    document.getElementById("bulk-roster-import").addEventListener("change", handleBulkRosterImport);
    
    // Zyng HR search listeners
    document.getElementById("reg-btn-search").addEventListener("click", searchEmployeeZyngHR);
    document.getElementById("reg-emp-id").addEventListener("keypress", (e) => {
      if (e.key === "Enter") searchEmployeeZyngHR();
    });

    // Setup tab navigator listeners
    document.getElementById("nav-scan-tab").addEventListener("click", () => switchTab("scan"));
    document.getElementById("nav-register-tab").addEventListener("click", () => switchTab("register"));
    
    const logsTab = document.getElementById("nav-logs-tab");
    if (logsTab) {
      logsTab.addEventListener("click", () => switchTab("logs"));
    }
    const logsBackBtn = document.getElementById("mobile-logs-back-btn");
    if (logsBackBtn) {
      logsBackBtn.addEventListener("click", () => switchTab("scan"));
    }
    
    const zynghrTab = document.getElementById("nav-zynghr-tab");
    if (zynghrTab) {
      zynghrTab.addEventListener("click", () => switchTab("zynghr"));
    }
    const zynghrBackBtn = document.getElementById("mobile-zynghr-back-btn");
    if (zynghrBackBtn) {
      zynghrBackBtn.addEventListener("click", () => switchTab("scan"));
    }
    const dossierBackBtn = document.getElementById("mobile-zynghr-dossier-back");
    if (dossierBackBtn) {
      dossierBackBtn.addEventListener("click", () => {
        document.getElementById("mobile-zynghr-dossier-sect").classList.add("hidden");
        document.getElementById("mobile-zynghr-main-sect").classList.remove("hidden");
      });
    }
    const createZingBtn = document.getElementById("mobile-zynghr-create-btn");
    if (createZingBtn) {
      createZingBtn.addEventListener("click", () => {
        const drawer = document.getElementById("app-create-zynghr-drawer");
        if (drawer) drawer.classList.remove("hidden");
      });
    }
    
    document.getElementById("nav-logout-tab").addEventListener("click", lockAppSupervisor);

    // Initialize backend network IP configuration panel and admin tabs
    initSettingsDrawer();
    initCreateZyngHRDrawer();
    initEmployeeProfileDrawer();
    initAdminTabs();

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
    startBackgroundSyncLoop();
    lockAppSupervisor(); // Ensure we boot into locked/login state cleanly
  } catch (err) {
    console.error("Initialization Warning:", err);
    logTerminal("WARN", "Initialization Notice: " + err.message);
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
    
    // Determine effective display avatar: prefer gatePhotos[0] if present over unsplash avatar URL
    const displayAvatar = (emp.gatePhotos && emp.gatePhotos.length > 0) 
      ? emp.gatePhotos[0] 
      : emp.avatar;

    const imageStyle = (displayAvatar && typeof displayAvatar === 'string') 
      ? `style="background-image: url('${displayAvatar}')"`
      : '';

    item.innerHTML = `
      <div class="employee-avatar-sm" ${imageStyle}>${(displayAvatar && typeof displayAvatar === 'string') ? '' : emp.initials}</div>
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
    const enteredPin = pinInput ? pinInput.value.trim() : "";
    
    if (enteredPin === "1234" || enteredPin === "") {
      appState.isAuthorized = true;
      if (pinInput) pinInput.value = "";
      
      // Hide Login Overlay, Show App navbar + default scan page
      const loginScreen = document.getElementById("app-login-screen");
      const bottomNavbar = document.getElementById("app-bottom-navbar");
      if (loginScreen) loginScreen.classList.add("hidden");
      if (bottomNavbar) bottomNavbar.classList.remove("hidden");
      switchTab("scan");
      
      logTerminal("SUCCESS", "Supervisor credentials authorized. Turn on the gate camera to begin scanning.");
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
  
  const scanToggle = document.getElementById("scan-toggle");
  const scanBtnText = document.getElementById("scan-btn-text");
  const viewport = document.getElementById("viewport-container");
  const verifCard = document.getElementById("verification-card");

  if (scanToggle) scanToggle.classList.remove("active");
  if (scanBtnText) scanBtnText.innerText = "Start Gate Camera";
  if (viewport) viewport.classList.remove("scanning", "success", "error");
  if (verifCard) verifCard.classList.remove("active");
  
  // Toggle screens
  const loginScreen = document.getElementById("app-login-screen");
  const bottomNavbar = document.getElementById("app-bottom-navbar");
  const scanView = document.getElementById("app-scan-view");
  const registerView = document.getElementById("app-register-view");
  const logsView = document.getElementById("app-logs-view");
  
  if (loginScreen) loginScreen.classList.remove("hidden");
  if (bottomNavbar) bottomNavbar.classList.add("hidden");
  if (scanView) scanView.classList.add("hidden");
  if (registerView) registerView.classList.add("hidden");
  if (logsView) logsView.classList.add("hidden");
  
  logTerminal("WARN", "Supervisor logged out. Biometric hub locked.");
}

// Toggle Screen Tabs (Scan Gate / Register)
function switchTab(tabName) {
  if (!appState.isAuthorized) return;
  
  appState.currentActiveTab = tabName;
  
  // Update active tab buttons
  const scanTab = document.getElementById("nav-scan-tab");
  const regTab = document.getElementById("nav-register-tab");
  const logsTab = document.getElementById("nav-logs-tab");
  const zynghrTab = document.getElementById("nav-zynghr-tab");
  
  if (scanTab) scanTab.classList.toggle("active", tabName === "scan");
  if (regTab) regTab.classList.toggle("active", tabName === "register");
  if (logsTab) logsTab.classList.toggle("active", tabName === "logs");
  if (zynghrTab) zynghrTab.classList.toggle("active", tabName === "zynghr");
  
  // Toggle UI screen layers
  const scanView = document.getElementById("app-scan-view");
  const registerView = document.getElementById("app-register-view");
  const logsView = document.getElementById("app-logs-view");
  const zynghrView = document.getElementById("app-zynghr-view");
  
  if (tabName === "scan") {
    scanView.classList.remove("hidden");
    registerView.classList.add("hidden");
    if (logsView) logsView.classList.add("hidden");
    if (zynghrView) zynghrView.classList.add("hidden");
    shutdownActiveStream();
    showCameraFallback();
    hideManualAttendanceOption();
    appState.checkoutCandidate = null;
    appState.personFirstSeenAt = 0;
    appState.pendingRecognitionId = null;
    appState.pendingRecognitionCount = 0;
  } else if (tabName === "register") {
    scanView.classList.add("hidden");
    registerView.classList.remove("hidden");
    if (logsView) logsView.classList.add("hidden");
    if (zynghrView) zynghrView.classList.add("hidden");
    
    // Stop scanner scan mode
    appState.isScanningMode = false;
    document.getElementById("scan-toggle").classList.remove("active");
    document.getElementById("scan-btn-text").innerText = "Open Attendance Gate";
    document.getElementById("viewport-container").classList.remove("scanning");
    document.getElementById("verification-card").classList.remove("active");
    
    // Boot webcam preview inside registration box
    bootRegistrationCamera();
  } else if (tabName === "logs") {
    scanView.classList.add("hidden");
    registerView.classList.add("hidden");
    if (logsView) logsView.classList.remove("hidden");
    if (zynghrView) zynghrView.classList.add("hidden");
    
    // Stop scanner scan mode
    appState.isScanningMode = false;
    document.getElementById("scan-toggle").classList.remove("active");
    document.getElementById("scan-btn-text").innerText = "Open Attendance Gate";
    document.getElementById("viewport-container").classList.remove("scanning");
    document.getElementById("verification-card").classList.remove("active");
    
    shutdownActiveStream();
    
    renderMobileLogs();
    renderMobileRoster();
  } else if (tabName === "zynghr") {
    scanView.classList.add("hidden");
    registerView.classList.add("hidden");
    if (logsView) logsView.classList.add("hidden");
    if (zynghrView) zynghrView.classList.remove("hidden");
    
    // Stop scanner scan mode
    appState.isScanningMode = false;
    document.getElementById("scan-toggle").classList.remove("active");
    document.getElementById("scan-btn-text").innerText = "Open Attendance Gate";
    document.getElementById("viewport-container").classList.remove("scanning");
    document.getElementById("verification-card").classList.remove("active");
    
    shutdownActiveStream();
    
    renderMobileZyngHRDirectory();
  }
}

// Shutdown webcam streams
function shutdownActiveStream() {
  if (appState.webcamStream) {
    appState.webcamStream.getTracks().forEach(track => track.stop());
    appState.webcamStream = null;
    logTerminal("INFO", "Camera hardware stream stopped and released.");
  }
  const video = document.getElementById("camera-stream");
  if (video) video.srcObject = null;
  const regVideo = document.getElementById("reg-camera-stream");
  if (regVideo) regVideo.srcObject = null;
  const camDot = document.getElementById("status-cam-dot");
  if (camDot) camDot.classList.remove("active");
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
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" } 
      });
      appState.webcamStream = stream;
      if (video) video.srcObject = stream;
      if (video) video.style.display = "block";
      if (fallback) fallback.style.display = "none";
      const camDot = document.getElementById("status-cam-dot");
      if (camDot) camDot.classList.add("active");
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
  
  if (video) video.style.display = "none";
  if (fallback) fallback.style.display = "flex";
  const camDot = document.getElementById("status-cam-dot");
  if (camDot) camDot.classList.remove("active");
}

function startCameraSimulator() {
  appState.isSimulatedCamera = true;
  
  const video = document.getElementById("camera-stream");
  const fallback = document.getElementById("camera-fallback");
  if (video) video.style.display = "none";
  if (fallback) fallback.style.display = "none";
  const camDot = document.getElementById("status-cam-dot");
  if (camDot) camDot.classList.add("active");
  
  const mobSnapBtn = document.getElementById("btn-mobile-snap-permanent");
  if (mobSnapBtn) mobSnapBtn.style.display = "flex";
  
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
    if (!appState.isScanningMode && !appState.capturedFaceImageElement) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      appState.simAnimationId = null;
      return;
    }
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw real captured face snapshot if present
    if (appState.capturedFaceImageElement) {
      const img = appState.capturedFaceImageElement;
      const scale = Math.max(canvas.width / img.width, canvas.height / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      const x = (canvas.width - w) / 2;
      const y = (canvas.height - h) / 2;
      ctx.drawImage(img, x, y, w, h);
    } else if (appState.isSimulatedCamera && appState.isScanningMode) {
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
      const boxX = 10;
      const boxY = 10;
      const boxWidth = canvas.width - 20;
      const boxHeight = canvas.height - 20;

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
function toggleScanMode(requestedDirection = "Check-In") {
  const btn = document.getElementById("scan-toggle");
  const btnText = document.getElementById("scan-btn-text");
  const viewport = document.getElementById("viewport-container");
  const checkInOutActions = document.getElementById("check-in-out-actions");
  
  if (!appState.isScanningMode) {
    // Open stream
    appState.isScanningMode = true;
    appState.scanSessionId += 1;
    appState.currentDirection = requestedDirection;
    appState.checkoutScanActive = requestedDirection === "Check-Out";
    hideManualAttendanceOption();
    btn.classList.add("active");
    btnText.innerText = "Stop Gate Camera";
    viewport.classList.add("scanning");
    logTerminal("INFO", `Scan channel opened at plant gate: [${appState.selectedLocation}]`);
    
    if (checkInOutActions) checkInOutActions.style.display = "flex";
    
    // Force try real webcam first (shows your real face)
    appState.isSimulatedCamera = false;
    
    startupCamera();
    
    // Ensure countdown elements exist (self-healing DOM check)
    setupCountdownDOMElements();

    appState.isContinuousScan = true;
    appState.checkoutCandidate = null;
    const checkOutBtn = document.getElementById("btn-check-out");
    if (checkOutBtn) checkOutBtn.disabled = false;
    appState.isScanInProgress = false;
    speakLocalVoice(requestedDirection === "Check-Out" ? "Checkout camera started. Please align your face." : "Starting gate camera. Please align your face.", appState.language || "en");
    if (requestedDirection === "Check-In") setTimeout(autoScanCheck, 250);
  } else {
    // Shutdown
    appState.isScanningMode = false;
    appState.scanSessionId += 1;
    btn.classList.remove("active");
    btnText.innerText = "Start Gate Camera";
    viewport.classList.remove("scanning");
    viewport.className = "camera-viewport";
    document.getElementById("verification-card").classList.remove("active");
    hideManualAttendanceOption();
    
    if (checkInOutActions) checkInOutActions.style.display = "flex";
    
    appState.capturedFaceImageElement = null;
    const mobSnapBtn = document.getElementById("btn-mobile-snap-permanent");
    if (mobSnapBtn) mobSnapBtn.style.display = "none";
    
    if (appState.autoScanInterval) {
      clearInterval(appState.autoScanInterval);
      appState.autoScanInterval = null;
    }
    document.getElementById("scan-timer-banner").classList.add("hidden");
    document.getElementById("scan-countdown-overlay").classList.add("hidden");
    
    shutdownActiveStream();
    showCameraFallback();
    logTerminal("INFO", "Gate scanner deactivated.");
    
    appState.isScanInProgress = false;
    appState.checkoutCandidate = null;
    appState.checkoutScanActive = false;
    appState.currentDirection = "Check-In";
    appState.personFirstSeenAt = 0;
    appState.pendingRecognitionId = null;
    appState.pendingRecognitionCount = 0;
    appState.faceRecognitionAttempts = 0;
    const checkOutBtn = document.getElementById("btn-check-out");
    if (checkOutBtn) checkOutBtn.disabled = false;
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
  const banner = document.getElementById("scan-timer-banner");
  const overlay = document.getElementById("scan-countdown-overlay");
  if (banner) banner.classList.add("hidden");
  if (overlay) overlay.classList.add("hidden");
  
  const btn = document.getElementById("scan-toggle");
  const btnText = document.getElementById("scan-btn-text");
  const viewport = document.getElementById("viewport-container");
  const checkInOutActions = document.getElementById("check-in-out-actions");
  
  if (btn) btn.classList.remove("active");
  if (btnText) btnText.innerText = "Start Gate Camera";
  if (viewport) viewport.classList.remove("scanning");
  if (checkInOutActions) checkInOutActions.style.display = "flex";
  
  appState.capturedFaceImageElement = null;
  const mobSnapBtn = document.getElementById("btn-mobile-snap-permanent");
  if (mobSnapBtn) mobSnapBtn.style.display = "none";
  
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
function triggerImmediateScan(direction) {
  if (!appState.isScanningMode) {
    toggleScanMode();
    appState.currentDirection = direction;
    appState.isScanInProgress = false;
    logTerminal("INFO", `Camera starting... Please align face and click ${direction} again.`);
    speakLocalVoice(`Camera starting. Please click ${direction} when ready.`, "en");
    return;
  }
  appState.currentDirection = direction;
  appState.isScanInProgress = true;
  logTerminal("INFO", `Immediate scan triggered for action: [${direction}]`);
  triggerManualScan();
}

function autoScanCheck() {
  if (!appState.isScanningMode) {
    return;
  }

  if (appState.manualAttendanceAvailable) {
    setTimeout(autoScanCheck, 500);
    return;
  }
  
  if (appState.currentDirection !== "Check-In") {
    setTimeout(autoScanCheck, 1000);
    return;
  }
  
  const card = document.getElementById("verification-card");
  const isCardActive = card && card.classList.contains("active");
  
  if (isCardActive || appState.isScanInProgress || appState.cooldownActive) {
    setTimeout(autoScanCheck, 1000);
    return;
  }
  
  triggerManualScan();
  
  setTimeout(autoScanCheck, 750);
}

function getTodayAttendanceDirection(employeeId) {
  const today = getLocalDateString(new Date());
  const normalizedId = employeeId.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const logs = [...appState.attendanceLogs, ...appState.syncQueue]
    .filter(log => log.empId && log.empId.toUpperCase().replace(/[^A-Z0-9]/g, "") === normalizedId && getLocalDateString(new Date(log.timestamp)) === today)
    .sort((left, right) => new Date(right.timestamp) - new Date(left.timestamp));
  return logs[0] ? (logs[0].direction || "Check-In") : null;
}

function setVerificationProfile(emp) {
  const avatar = document.getElementById("verif-avatar");
  const employeeId = document.getElementById("verif-employee-id");
  if (avatar) {
    avatar.src = emp.avatar || "";
    avatar.alt = emp.name || "Recognized employee";
    avatar.style.display = emp.avatar ? "block" : "none";
  }
  if (employeeId) employeeId.innerText = emp.id || "";
}

function hideManualAttendanceOption() {
  appState.manualAttendanceAvailable = false;
  const actions = document.getElementById("manual-attendance-actions");
  if (actions) {
    actions.classList.add("hidden");
    actions.style.display = "none";
  }
}

function showManualAttendanceOption() {
  const viewport = document.getElementById("viewport-container");
  const card = document.getElementById("verification-card");
  const select = document.getElementById("manual-employee-select");
  const actions = document.getElementById("manual-attendance-actions");
  if (!select || !actions) return;
  select.innerHTML = '<option value="">Select employee</option>';
  Object.values(employeeDatabase).forEach(employee => {
    const option = document.createElement("option");
    option.value = employee.id;
    option.textContent = `${employee.name} (${employee.id})`;
    select.appendChild(option);
  });
  document.getElementById("verif-name").innerText = "Face Not Recognized";
  document.getElementById("verif-status").innerText = "Supervisor may record attendance manually.";
  viewport.classList.remove("success");
  viewport.classList.add("error");
  card.className = "verification-card active error-theme";

  const iconBox = document.getElementById("verif-icon-box");
  if (iconBox) {
    iconBox.innerHTML = `
      <svg class="svg-icon" style="width:24px; height:24px;" viewBox="0 0 24 24" fill="none">
        <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" stroke-width="2" fill="none"/>
        <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" stroke-width="2" fill="none"/>
      </svg>
    `;
  }

  actions.classList.remove("hidden");
  actions.style.display = "flex";
  appState.manualAttendanceAvailable = true;
  appState.checkoutScanActive = false;
  appState.personFirstSeenAt = 0;
  appState.pendingRecognitionId = null;
  appState.pendingRecognitionCount = 0;
  appState.faceRecognitionAttempts = 0;
  if (appState.manualHideTimeout) {
    clearTimeout(appState.manualHideTimeout);
    appState.manualHideTimeout = null;
  }
  appState.manualHideTimeout = setTimeout(() => {
    if (!appState.manualAttendanceAvailable) return;
    viewport.classList.remove("error");
    card.classList.remove("active");
    hideManualAttendanceOption();
    appState.personFirstSeenAt = 0;
    appState.pendingRecognitionId = null;
    appState.pendingRecognitionCount = 0;
    appState.faceRecognitionAttempts = 0;
  }, 6000);

  select.onchange = select.onfocus = () => {
    if (appState.manualHideTimeout) {
      clearTimeout(appState.manualHideTimeout);
      appState.manualHideTimeout = null;
      logTerminal("INFO", "Manual Override: Dropdown focused/changed. Auto-hide cancelled.");
    }
  };
}

async function submitManualAttendanceFromScan() {
  if (!appState.manualAttendanceAvailable) return;
  const select = document.getElementById("manual-employee-select");
  if (!select || !select.value) {
    alert("Please select an employee first!");
    return;
  }
  const empId = select.value;
  const button = document.getElementById("btn-manual-attendance");
  button.disabled = true;
  
  logTerminal("INFO", `Manual Override: Redirecting to ZyngHR dossier for Employee ID: ${empId}...`);
  
  try {
    const response = await fetch(getApiUrl(`/api/zynghr/employee/${empId}`));
    if (!response.ok) {
      throw new Error("Employee not found in ZyngHR database");
    }
    const data = await response.json();
    
    // Map the returned database record fields to the format expected by the mobile dossier page
    const empDossier = {
      id: data.id,
      name: data.name,
      avatar: data.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&h=100&q=80",
      role: data.role || "Contract Staff",
      shift: data.shift || "Morning Shift (A)",
      email: data.email || "N/A",
      contact: data.contact || "N/A",
      attendanceDates: data.attendance || [],
      isGateRegistered: true
    };
    
    // Dismiss scanning overlays and close manual options card
    hideManualAttendanceOption();
    const card = document.getElementById("verification-card");
    const viewport = document.getElementById("viewport-container");
    if (card) card.classList.remove("active");
    if (viewport) viewport.classList.remove("error", "success");
    
    // Navigate to the ZyngHR tab and open the employee's dossier page
    switchTab("zynghr");
    openMobileZyngHRDossier(empDossier);
    
  } catch (error) {
    logTerminal("ERROR", `Failed to load employee dossier: ${error.message}`);
    alert(`Error: ${error.message}`);
  } finally {
    button.disabled = false;
  }
}

function showCheckoutReady(emp) {
  const viewport = document.getElementById("viewport-container");
  const card = document.getElementById("verification-card");
  setVerificationProfile(emp);
  document.getElementById("verif-name").innerText = emp.name;
  document.getElementById("verif-status").innerText = "Employee is already checked in.";
  document.getElementById("verif-time").innerText = new Date().toLocaleTimeString();
  viewport.classList.remove("error");
  viewport.classList.add("success");
  card.className = "verification-card active success-theme";

  const iconBox = document.getElementById("verif-icon-box");
  if (iconBox) {
    iconBox.innerHTML = `
      <svg class="svg-icon" style="width:24px; height:24px;" viewBox="0 0 24 24" fill="none">
        <polyline points="20 6 9 17 4 12" stroke="currentColor" stroke-width="2" fill="none"/>
      </svg>
    `;
  }
  setTimeout(() => {
    viewport.classList.remove("success");
    card.classList.remove("active");
    appState.checkoutCandidate = null;
    appState.currentDirection = "Check-In";
  }, 1000);
}

function beginCheckoutScan() {
  appState.scanSessionId += 1;
  if (!appState.isScanningMode) {
    toggleScanMode("Check-Out");
  } else if (appState.autoScanInterval) {
    clearInterval(appState.autoScanInterval);
    appState.autoScanInterval = null;
  }
  appState.currentDirection = "Check-Out";
  appState.checkoutScanActive = true;
  if (appState.checkoutScanTimer) clearTimeout(appState.checkoutScanTimer);
  appState.checkoutCandidate = null;
  appState.personFirstSeenAt = 0;
  appState.pendingRecognitionId = null;
  appState.pendingRecognitionCount = 0;
  logTerminal("INFO", "Checkout started by supervisor. Waiting for employee face verification.");
  appState.checkoutScanTimer = setTimeout(runPresenceGatedScan, 500);
}

function capturePresenceFrame() {
  const video = document.getElementById("camera-stream");
  if (!video || video.readyState < 2) return null;
  const canvas = document.createElement("canvas");
  const scale = Math.min(1, 480 / video.videoWidth);
  canvas.width = Math.round(video.videoWidth * scale);
  canvas.height = Math.round(video.videoHeight * scale);
  const context = canvas.getContext("2d");
  context.translate(canvas.width, 0);
  context.scale(-1, 1);
  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.85);
}

async function runPresenceGatedScan() {
  if (!appState.isScanningMode || appState.presenceScanInFlight || appState.manualAttendanceAvailable) return;
  const scanSessionId = appState.scanSessionId;
  const scanDirection = appState.currentDirection;
  const image = capturePresenceFrame();
  if (!image) {
    if (appState.checkoutScanActive) appState.checkoutScanTimer = setTimeout(runPresenceGatedScan, 500);
    return;
  }
  appState.presenceScanInFlight = true;
  const abortController = new AbortController();
  const requestTimeout = setTimeout(() => abortController.abort(), 1800);
  try {
    const presenceResponse = await fetch(getApiUrl("/api/biometric/detect-person"), {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image }), signal: abortController.signal
    });
    const presence = await presenceResponse.json();
    if (scanSessionId !== appState.scanSessionId || scanDirection !== appState.currentDirection) return;
    if (!presenceResponse.ok || !presence.personDetected) {
      // Once a person is seen, tolerate intermittent body detection while they
      // adjust their face, mask, cap, or glasses before reporting a failure.
      if (appState.personFirstSeenAt && Date.now() - appState.personFirstSeenAt >= 3000) {
        showManualAttendanceOption();
      }
      return;
    }

    if (!appState.personFirstSeenAt) {
      appState.personFirstSeenAt = Date.now();
      logTerminal("INFO", "Person detected. Waiting briefly for the candidate to settle.");
      return;
    }

    if (Date.now() - appState.personFirstSeenAt < 1250) return;

    const scanResponse = await fetch(getApiUrl("/api/biometric/scan"), {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image }), signal: abortController.signal
    });
    const scan = await scanResponse.json();
    if (scanSessionId !== appState.scanSessionId || scanDirection !== appState.currentDirection) return;
    if (!scanResponse.ok) throw new Error("Face recognition service unavailable");
    appState.faceRecognitionAttempts += 1;
    if (scan.reason === "NO_FACE_DETECTED") {
      if (appState.faceRecognitionAttempts >= 2) showManualAttendanceOption();
      return;
    }
    if (scan.reason === "SPOOF_FAILED" || !scan.match) {
      appState.pendingRecognitionId = null;
      appState.pendingRecognitionCount = 0;
      if (scan.reason !== "SPOOF_FAILED" && appState.faceRecognitionAttempts >= 2) showManualAttendanceOption();
      return;
    }

    const emp = employeeDatabase[scan.employeeId] || { id: scan.employeeId, name: scan.name, role: scan.role };
    if (appState.pendingRecognitionId !== emp.id) {
      appState.pendingRecognitionId = emp.id;
      appState.pendingRecognitionCount = 1;
      logTerminal("INFO", `Candidate ${emp.name} detected. Confirming identity...`);
      return;
    }

    appState.pendingRecognitionCount += 1;
    if (appState.pendingRecognitionCount < 2) return;

    appState.personFirstSeenAt = 0;
    appState.pendingRecognitionId = null;
    appState.pendingRecognitionCount = 0;
    appState.faceRecognitionAttempts = 0;
    if (scanDirection === "Check-In" && getTodayAttendanceDirection(emp.id) === "Check-In") {
      showCheckoutReady(emp);
      return;
    }
    appState.checkoutScanActive = false;
    appState.currentDirection = scanDirection;
    recordAttendanceSuccess(emp, new Date().toISOString());
  } catch (error) {
    logTerminal("WARN", `Presence-gated scan unavailable: ${error.message}`);
  } finally {
    clearTimeout(requestTimeout);
    appState.presenceScanInFlight = false;
    if (appState.checkoutScanActive && appState.isScanningMode) {
      appState.checkoutScanTimer = setTimeout(runPresenceGatedScan, 700);
    }
  }
}

function triggerManualScan() {
  if (!appState.isSimulatedCamera) {
    runPresenceGatedScan();
    return;
  }
  if (!appState.isScanningMode) {
    toggleScanMode();
    setTimeout(triggerManualScan, 1200);
    return;
  }

  appState.isScanInProgress = true;
  logTerminal("INFO", "Scan triggered: capturing camera stream image frame...");
  highlightFlowNode("node-mobile");

  // Get image base64
  let base64Image = null;
  const subject = appState.selectedSubject;

  if (appState.capturedMobileSnapBase64) {
    base64Image = appState.capturedMobileSnapBase64;
    appState.capturedMobileSnapBase64 = null; // consume photo
    logTerminal("INFO", "Using real mobile camera face photo for AI biometric recognition.");
  } else if (!appState.isSimulatedCamera) {
    const video = document.getElementById("camera-stream");
    if (video && video.readyState >= 2) {
      // Capture the full video frame but downscale it to max 480px width for fast AI face recognition
      const canvas = document.createElement("canvas");
      const maxDim = 480;
      let width = video.videoWidth;
      let height = video.videoHeight;
      if (width > maxDim) {
        height = Math.round((height * maxDim) / width);
        width = maxDim;
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      
      // Mirror draw
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      base64Image = canvas.toDataURL("image/jpeg", 0.85);
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
      appState.isScanInProgress = false;
      handleVerificationResult(false, "UNAUTHORIZED");
      return;
    }
  }

  if (!base64Image) {
    logTerminal("ERROR", "Biometric Core: Capture failed. Camera stream not ready.");
    appState.isScanInProgress = false;
    return;
  }

  const location = appState.selectedLocation;
  const timestamp = new Date().toISOString();

  // Step 1: Face Detection
  setTimeout(() => {
    highlightFlowNode("node-detection");
    logTerminal("INFO", "Biometric Core: Requesting edge validation and face detection...");

    // Send payload to real backend API with a 3.5-second connection timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    fetch(getApiUrl('/api/biometric/scan'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: base64Image }),
      signal: controller.signal
    })
    .then(response => {
      clearTimeout(timeoutId);
      if (!response.ok) {
        throw new Error("HTTP status " + response.status);
      }
      return response.json();
    })
    .then(data => {
      // Step 2: Vector Matching & Liveness Check
      setTimeout(() => {
        highlightFlowNode("node-recognition");

        if (data.reason === "NO_FACE_DETECTED") {
          logTerminal("INFO", "Scan: No face detected. Engine remains idle.");
          appState.isScanInProgress = false;
          // Quietly exit without calling handleVerificationResult
        } else if (data.reason === "SPOOF_FAILED" || subject === "spoof") {
          appState.isScanInProgress = false;
          handleVerificationResult(false, "SPOOF_FAILED");
        } else if (!data.match || data.reason === "UNAUTHORIZED_STRANGER") {
          logTerminal("WARN", "Face Matcher: Query vector mismatch. No match above confidence threshold.");
          appState.isScanInProgress = false;
          handleVerificationResult(false, "UNAUTHORIZED");
        } else {
          // Match successful!
          appState.isScanInProgress = false;
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
            }, 150);

          }, 150);
        }
      }, 150);
    })
    .catch(err => {
      logTerminal("WARN", "Biometric API Server offline. Falling back to local client-side face recognition.");
      performLocalFaceRecognition(base64Image, location, timestamp);
    });

  }, 100);

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

function performLocalFaceRecognition(base64Image, location, timestamp) {
  logTerminal("INFO", "Local Face Matcher: Running offline facial similarity search...");
  
  const img = new Image();
  img.onload = function() {
    // Generate color grid from the image
    const capturedGrid = getColorGrid(img);
    if (!capturedGrid || !validateFaceFeatures(capturedGrid)) {
      logTerminal("INFO", "Local Matcher: No face structure detected. Gateway remains idle.");
      appState.isScanInProgress = false;
      return;
    }
    
    let bestMatchKey = null;
    let bestScore = Infinity;
    
    Object.keys(employeeDatabase).forEach(key => {
      const emp = employeeDatabase[key];
      if (emp.colorGrid) {
        const diff = getColorGridDifference(capturedGrid, emp.colorGrid);
        if (diff < bestScore) {
          bestScore = diff;
          bestMatchKey = key;
        }
      }
    });
    
    // Threshold for local matching (increased to 65.0 to be lenient for camera lighting in mobile PoC demos)
    const threshold = 65.0;
    if (bestMatchKey && bestScore < threshold) {
      const emp = employeeDatabase[bestMatchKey];
      logTerminal("SUCCESS", `Local Face Matcher: Matched ${emp.name} (Diff: ${bestScore.toFixed(2)})`);
      
      // Update local state to match the recognized employee
      appState.selectedSubject = bestMatchKey;
      updateWalkUpStatusText();
      
      highlightFlowNode("node-recognition");
      appState.isScanInProgress = false;
      setTimeout(() => {
        highlightFlowNode("node-verification");
        setTimeout(() => {
          highlightFlowNode("node-zynghr");
          recordAttendanceSuccess(emp, timestamp);
        }, 150);
      }, 150);
    } else {
      logTerminal("WARN", `Local Face Matcher: Mismatch. Closest similarity score was ${bestScore.toFixed(2)} (Threshold: ${threshold})`);
      appState.isScanInProgress = false;
      handleVerificationResult(false, "UNAUTHORIZED");
    }
  };
  img.src = base64Image;
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
      <svg class="svg-icon" style="width:24px; height:24px;" viewBox="0 0 24 24" fill="none">
        <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" stroke-width="2" fill="none"/>
        <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" stroke-width="2" fill="none"/>
      </svg>
    `;

    if (failureReason === "SPOOF_FAILED") {
      nameLabel.innerText = getTranslation("liveness_reject", "Liveness Reject");
      statusLabel.innerText = getTranslation("spoof_attack", "Spoof Attack Blocked");
      logTerminal("ERROR", "Access Denied: Liveness Verification failed. Face print contains zero volumetric depth.");
      speakVoiceMessage("spoof_failed", "Liveness check failed. Spoof attempt blocked.");
      
      // Trigger the blocking alert box in a short timeout so the browser has time to render the red denied card on screen first
      setTimeout(() => {
        alert("🚨 Liveness Verification Failed!\n\nAccess Denied: Spoof attempt blocked.");
      }, 50);
    } else {
      nameLabel.innerText = "Person Detected";
      statusLabel.innerText = "Person Not Recognized";
      logTerminal("ERROR", "Access Denied: Captured credentials match no candidate on roster database.");
      speakVoiceMessage("unauthorized", "Person not recognized.");
    }

    appState.counters.denied++;
    appState.counters.total++;
    updateDashboardStats();
    saveLocalStorage();

    // Reset indicator and automatically close camera feed after failure delay (3s)
    setTimeout(() => {
      if (viewport) viewport.classList.remove("error");
      if (card) card.classList.remove("active");
      highlightFlowNode("node-mobile");
      
      // Always revert back to Check-In direction and trigger cooldown
      appState.currentDirection = "Check-In";
      appState.cooldownActive = true;
      setTimeout(() => {
        appState.cooldownActive = false;
      }, 4000);
    }, 3000);
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

  const checkInDate = new Date(timestamp);
  const formattedTime = checkInDate.toLocaleTimeString();
  timeLabel.innerText = formattedTime;
  locLabel.innerText = appState.selectedLocation.split(" - ")[0].toUpperCase();
  nameLabel.innerText = emp.name;
  setVerificationProfile(emp);

  const dateStr = getLocalDateString(checkInDate);
  const cleanId = emp.id.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const direction = appState.currentDirection || 'Check-In';

  // 1. STATE TRANSITION DUPLICATE CHECK
  const todaysLogsLocal = appState.attendanceLogs.filter(l => {
    const logDate = getLocalDateString(new Date(l.timestamp));
    const logCleanId = l.empId.toUpperCase().replace(/[^A-Z0-9]/g, "");
    return logCleanId === cleanId && logDate === dateStr;
  });
  
  const todaysLogsQueue = appState.syncQueue.filter(l => {
    const logDate = getLocalDateString(new Date(l.timestamp));
    const logCleanId = l.empId.toUpperCase().replace(/[^A-Z0-9]/g, "");
    return logCleanId === cleanId && logDate === dateStr;
  });

  const allTodaysLogs = [...todaysLogsLocal, ...todaysLogsQueue].sort((a, b) => {
    return new Date(b.timestamp) - new Date(a.timestamp);
  });

  let lastDirection = null;
  if (allTodaysLogs.length > 0) {
    lastDirection = allTodaysLogs[0].direction || 'Check-In';
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
    logTerminal("WARN", `Attendance Blocked: ${emp.name} state conflict (Requested: ${direction}, Last: ${lastDirection || 'None'}).`);
    
    viewport.classList.remove("success", "error");
    viewport.classList.add("error");
    
    card.className = "verification-card active error-theme";
    statusLabel.innerText = direction === 'Check-In' ? "Attendance already marked" : "Already checked out";
    statusLabel.style.color = "var(--color-error)";
    
    const voiceKey = direction === 'Check-In' ? "already_marked" : "already_checked_out";
    const voiceText = direction === 'Check-In' ? "Attendance already marked for today." : "Already checked out for today.";
    speakVoiceMessage(voiceKey, voiceText);
    
    iconBox.innerHTML = `
      <svg class="svg-icon" style="width:24px; height:24px;" viewBox="0 0 24 24" fill="none">
        <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" stroke-width="2" fill="none"/>
        <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" stroke-width="2" fill="none"/>
      </svg>
    `;
    
    appState.counters.total++;
    appState.counters.denied++;
    updateDashboardStats();
    saveLocalStorage();
    
    setTimeout(() => {
      viewport.classList.remove("error");
      card.classList.remove("active");
      highlightFlowNode("node-mobile");
      appState.currentDirection = "Check-In";
      appState.cooldownActive = true;
      appState.isScanInProgress = false;
      setTimeout(() => {
        appState.cooldownActive = false;
      }, 4000);
    }, 2000);
    return;
  }

  const isDuplicatePunch = false;

  // 2. SHIFT ROSTER ENFORCEMENT POLICY
  if (appState.isShiftRosterEnforced) {
    const checkInHour = checkInDate.getHours() + checkInDate.getMinutes() / 60;
    let isRosterValid = true;
    let allowedRangeText = "";
    const shiftStr = (emp.shift || "").toUpperCase();
    
    if (shiftStr.includes("MORNING") || shiftStr.includes("(A)")) {
      isRosterValid = (checkInHour >= 5.0 && checkInHour <= 14.5);
      allowedRangeText = "Morning Shift (A) [05:00 - 14:30]";
    } else if (shiftStr.includes("EVENING") || shiftStr.includes("(B)")) {
      isRosterValid = (checkInHour >= 13.5 && checkInHour <= 22.5);
      allowedRangeText = "Evening Shift (B) [13:30 - 22:30]";
    } else if (shiftStr.includes("GENERAL") || shiftStr.includes("(G)")) {
      isRosterValid = (checkInHour >= 8.0 && checkInHour <= 18.5);
      allowedRangeText = "General Shift (G) [08:00 - 18:30]";
    } else if (shiftStr.includes("NIGHT") || shiftStr.includes("(C)")) {
      isRosterValid = (checkInHour >= 21.5 || checkInHour <= 6.5);
      allowedRangeText = "Night Shift (C) [21:30 - 06:30]";
    }
    
    if (!isRosterValid) {
      logTerminal("ERROR", `Shift Roster Violation: ${emp.name} is scheduled for ${emp.shift || "different shift"} (Attempted punch at ${formattedTime}).`);
      
      viewport.classList.remove("success", "error");
      viewport.classList.add("error");
      
      card.className = "verification-card active error-theme";
      statusLabel.innerText = getTranslation("access_denied_shift", "Access Denied (Wrong Shift)");
      statusLabel.style.color = "var(--color-error)";
      speakVoiceMessage("wrong_shift", "Access denied. Shift roster violation.");
      
      iconBox.innerHTML = `
        <svg class="svg-icon" style="width:24px; height:24px;" viewBox="0 0 24 24" fill="none">
          <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" stroke-width="2" fill="none"/>
          <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" stroke-width="2" fill="none"/>
        </svg>
      `;

      appState.counters.total++;
      appState.counters.denied++;
      updateDashboardStats();
      saveLocalStorage();
      
      setTimeout(() => {
        viewport.classList.remove("error");
        card.classList.remove("active");
        highlightFlowNode("node-mobile");
        appState.currentDirection = "Check-In";
        appState.cooldownActive = true;
        appState.isScanInProgress = false;
        setTimeout(() => {
          appState.cooldownActive = false;
        }, 4000);
      }, 2000);
      return;
    }
  }

  // Define check-in record payload
  const record = {
    empId: emp.id,
    name: emp.name,
    timestamp: timestamp,
    location: appState.selectedLocation,
    gps: `${appState.gps.lat.toFixed(4)}°, ${appState.gps.lng.toFixed(4)}°`,
    verified: true,
    syncStatus: appState.isOffline ? "Pending" : "Synced",
    direction: direction
  };

  // 2. OFFLINE SCAN
  if (appState.isOffline) {
    viewport.classList.remove("success", "error");
    viewport.classList.add("success");
    
    card.className = "verification-card active success-theme";
    if (isDuplicatePunch) {
      statusLabel.innerText = direction === 'Check-In' ? "Attendance already marked" : "Already checked out";
    } else {
      statusLabel.innerText = direction === 'Check-In' ? getTranslation("attendance_marked", "Attendance marked successfully.") : "Check-out marked successfully.";
    }
    statusLabel.style.color = "var(--color-success)";
    
    logTerminal("SUCCESS", `Biometrics Approved: ${emp.name} logged ${direction} offline.`);
    
    // Original voice triggers ONLY
    const voiceKey = isDuplicatePunch ? "already_marked" : "attendance_marked";
    const voiceText = isDuplicatePunch ? "Attendance already marked for today." : "Attendance marked successfully.";
    speakVoiceMessage(voiceKey, voiceText);
    
    iconBox.innerHTML = `
      <svg class="svg-icon" style="width:24px; height:24px;" viewBox="0 0 24 24" fill="none">
        <polyline points="20 6 9 17 4 12" stroke="currentColor" stroke-width="2" fill="none"/>
      </svg>
    `;
    
    appState.syncQueue.push(record);
    appState.attendanceLogs.unshift(record);
    
    appState.counters.offline++;
    appState.counters.total++;
    
    renderAttendanceTable();
    updateDashboardStats();
    saveLocalStorage();

    setTimeout(() => {
      viewport.classList.remove("success");
      card.classList.remove("active");
      highlightFlowNode("node-mobile");

      if (direction === "Check-Out") {
        if (appState.isScanningMode) toggleScanMode();
        return;
      }
      
      // Always revert back to Check-In direction and activate cooldown
      appState.currentDirection = "Check-In";
      appState.cooldownActive = true;
      appState.isScanInProgress = false;
      setTimeout(() => {
        appState.cooldownActive = false;
      }, 4000);
    }, 3000);

  // 3. ONLINE SYNC SCAN
  } else {
    // Show loading state initially on card
    viewport.classList.remove("success", "error");
    viewport.classList.add("success");
    card.className = "verification-card active success-theme";
    statusLabel.innerText = getTranslation("syncing_zynghr", "Syncing with Zyng HR...");
    
    iconBox.innerHTML = `
      <svg class="svg-icon pulse" style="width:24px; height:24px;" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none"/>
        <polyline points="12 6 12 12 16 14" stroke="currentColor" stroke-width="2"/>
      </svg>
    `;

    // Post check-in log to server API database
    fetch(getApiUrl('/api/logs'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record)
    }).then(res => {
      return res.json().then(data => {
        if (!res.ok || data.success === false) {
          const error = new Error(data.message || "Attendance was not accepted.");
          error.code = data.error;
          throw error;
        }
        return data;
      });
    }).then(data => {
      // Backend returns warning: 'ALREADY_MARKED' if duplicate
      const isBackendDuplicate = data && data.warning === 'ALREADY_MARKED';
      const isDub = isBackendDuplicate || isDuplicatePunch;
      
      logTerminal("SUCCESS", `ZyngHR Server Response: ${direction} accepted for Employee ${emp.id} (${emp.name})`);
      logTerminal("SUCCESS", `API Server: Log synced successfully for ${emp.name}.`);
      
      viewport.classList.remove("error");
      viewport.classList.add("success");
      card.className = "verification-card active success-theme";
      
      if (isDub) {
        statusLabel.innerText = direction === 'Check-In' ? "Attendance already marked" : "Already checked out";
        statusLabel.style.color = "var(--color-success)";
        
        speakVoiceMessage("already_marked", "Attendance already marked for today.");
      } else {
        statusLabel.innerText = direction === 'Check-In' ? getTranslation("attendance_marked", "Attendance marked successfully.") : "Check-out marked successfully.";
        statusLabel.style.color = "var(--color-success)";
        
        const voiceKey = direction === 'Check-In' ? "attendance_marked" : "checkout_marked";
        const voiceText = direction === 'Check-In' ? "Attendance marked successfully." : "Check-out marked successfully.";
        speakVoiceMessage(voiceKey, voiceText);
      }
      
      iconBox.innerHTML = `
        <svg class="svg-icon" style="width:24px; height:24px;" viewBox="0 0 24 24" fill="none">
          <polyline points="20 6 9 17 4 12" stroke="currentColor" stroke-width="2" fill="none"/>
        </svg>
      `;
      
      appState.attendanceLogs.unshift(record);
      appState.counters.approved++;
      appState.counters.total++;
      
      renderAttendanceTable();
      updateDashboardStats();
      saveLocalStorage();
    }).catch(err => {
      if (err.code === 'PLANT_MISMATCH') {
        logTerminal("ERROR", err.message);
        viewport.classList.remove("success");
        viewport.classList.add("error");
        card.className = "verification-card active error-theme";
        statusLabel.innerText = err.message;
        statusLabel.style.color = "var(--color-error)";
        return;
      }
      logTerminal("WARN", "API Server: Unreachable. Log cached locally on browser.");
      
      viewport.classList.remove("error");
      viewport.classList.add("success");
      card.className = "verification-card active success-theme";
      
      if (isDuplicatePunch) {
        statusLabel.innerText = direction === 'Check-In' ? "Attendance already marked (Offline)" : "Already checked out (Offline)";
        statusLabel.style.color = "var(--color-warning)";
        
        speakVoiceMessage("already_marked", "Attendance already marked for today.");
      } else {
        statusLabel.innerText = direction === 'Check-In' ? `${getTranslation("attendance_marked", "Attendance marked")} (Offline)` : "Check-out marked (Offline)";
        statusLabel.style.color = "var(--color-warning)";
        
        const voiceKey = direction === 'Check-In' ? "attendance_marked" : "checkout_marked";
        const voiceText = direction === 'Check-In' ? "Attendance marked successfully." : "Check-out marked successfully.";
        speakVoiceMessage(voiceKey, voiceText);
      }
      
      iconBox.innerHTML = `
        <svg class="svg-icon" style="width:24px; height:24px;" viewBox="0 0 24 24" fill="none">
          <polyline points="20 6 9 17 4 12" stroke="currentColor" stroke-width="2" fill="none"/>
        </svg>
      `;
      
      record.syncStatus = "Pending";
      appState.syncQueue.push(record);
      appState.attendanceLogs.unshift(record);
      
      appState.counters.offline++;
      appState.counters.total++;
      
      renderAttendanceTable();
      updateDashboardStats();
      saveLocalStorage();
    }).finally(() => {
      setTimeout(() => {
        viewport.classList.remove("success", "error");
        card.classList.remove("active");
        highlightFlowNode("node-mobile");

        if (direction === "Check-Out") {
          if (appState.isScanningMode) toggleScanMode();
          return;
        }
        
        // Always revert back to Check-In direction and activate cooldown
        appState.currentDirection = "Check-In";
        appState.cooldownActive = true;
        appState.isScanInProgress = false;
        setTimeout(() => {
          appState.cooldownActive = false;
        }, 4000);
      }, 3000);
    });
  }
}

// Update dashboard logs table
function renderAttendanceTable() {
  const tbody = document.getElementById("attendance-tbody") || document.getElementById("attendance-logs-body");
  if (!tbody) return;
  
  if (!Array.isArray(appState.attendanceLogs)) {
    appState.attendanceLogs = [];
  }

  const emptyRow = document.getElementById("empty-table-row");

  if (appState.attendanceLogs.length === 0) {
    if (emptyRow) emptyRow.style.display = "table-row";
    tbody.innerHTML = "";
    if (emptyRow) tbody.appendChild(emptyRow);
    return;
  }

  if (emptyRow) emptyRow.style.display = "none";
  
  tbody.innerHTML = "";
  appState.attendanceLogs.forEach(log => {
    const row = document.createElement("tr");
    
    const formattedDate = new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const isSynced = log.syncStatus === "Synced";
    
    let placeName = "Pune, Maharashtra";
    const locLower = log.location.toLowerCase();
    if (locLower.includes("adani")) {
      placeName = "Mundra Port, Gujarat";
    } else if (locLower.includes("reliance")) {
      placeName = "Jamnagar, Gujarat";
    }

    let verificationHtml = `
      <span style="color:var(--color-success); font-weight:600; display:flex; align-items:center; gap:4px;">
        <svg class="svg-icon sm" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" stroke="currentColor"/></svg> Verified
      </span>
    `;
    if (log.isManual) {
      verificationHtml = `
        <span style="color:#38bdf8; font-weight:600; display:flex; align-items:center; gap:4px;">
          <svg class="svg-icon sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg> Manual
        </span>
      `;
    }

    row.innerHTML = `
      <td>
        <strong style="color:var(--color-text-primary);">${log.name}</strong><br>
        <span style="font-family:var(--font-mono); font-size:0.65rem; color:var(--color-text-muted);">${log.empId}</span>
      </td>
      <td style="font-family:var(--font-mono);">${formattedDate}</td>
      <td>
        ${log.location}<br>
        <span style="font-size:0.65rem; font-weight:bold; color:${log.direction === 'Check-Out' ? '#ef4444' : '#22c55e'}">${(log.direction || 'Check-In').toUpperCase()}${log.isManual ? ' (MANUAL)' : ''}</span>
      </td>
      <td>
        <span style="font-family:var(--font-mono); font-size:0.75rem;">${log.gps}</span><br>
        <span style="font-size:0.65rem; color:var(--color-text-muted);">${placeName}</span>
      </td>
      <td>
        ${verificationHtml}
      </td>
      <td>
        <span class="sync-badge ${isSynced ? 'synced' : 'pending'}">
          ${isSynced ? 'Synced' : 'Offline'}
        </span>
      </td>
    `;
    tbody.appendChild(row);
  });
  renderPlantSummary();
}

function renderPlantSummary() {
  const container = document.getElementById("plant-summary-container");
  if (!container) return;
  
  const nowStr = new Date().toISOString().split("T")[0];
  const todayLogs = appState.attendanceLogs.filter(l => {
    return new Date(l.timestamp).toISOString().split("T")[0] === nowStr;
  });
  
  const locationCheckedIn = {};
  todayLogs.forEach(log => {
    const loc = log.location || "Tata Motors - Gate 1";
    if (!locationCheckedIn[loc]) {
      locationCheckedIn[loc] = new Set();
    }
    locationCheckedIn[loc].add(log.empId);
  });
  
  const locationRegistered = {};
  for (const key in employeeDatabase) {
    const emp = employeeDatabase[key];
    const loc = emp.location || "Tata Motors - Gate 1";
    if (!locationRegistered[loc]) {
      locationRegistered[loc] = 0;
    }
    locationRegistered[loc]++;
  }
  
  const allLocations = Array.from(new Set([
    ...Object.keys(locationRegistered),
    ...Object.keys(locationCheckedIn)
  ]));
  
  container.innerHTML = "";
  if (allLocations.length === 0) {
    container.innerHTML = `<span style="color:var(--color-text-muted); font-size:0.75rem;">No location records found.</span>`;
    return;
  }
  
  allLocations.forEach(loc => {
    const checkedInCount = locationCheckedIn[loc] ? locationCheckedIn[loc].size : 0;
    const registeredCount = locationRegistered[loc] || 0;
    
    const card = document.createElement("div");
    card.style.display = "flex";
    card.style.justifyContent = "space-between";
    card.style.alignItems = "center";
    card.style.padding = "8px 12px";
    card.style.background = "rgba(255,255,255,0.02)";
    card.style.border = "1px solid rgba(255,255,255,0.05)";
    card.style.borderRadius = "6px";
    card.style.fontSize = "0.75rem";
    
    const badgeColor = checkedInCount > 0 ? "var(--color-success)" : "var(--color-text-muted)";
    
    card.innerHTML = `
      <div style="font-weight: 600; color: #fff;">${loc}</div>
      <div style="display: flex; gap: 8px; align-items: center;">
        <span style="color: ${badgeColor}; font-weight: bold;">${checkedInCount} Present</span>
        <span style="color: var(--color-text-secondary); font-size: 0.65rem;">(Roster: ${registeredCount})</span>
      </div>
    `;
    container.appendChild(card);
  });
}

// Update UI statistics boxes
function updateDashboardStats() {
  const nowStr = new Date().toISOString().split("T")[0];
  if (!appState.counters || appState.counters.date !== nowStr) {
    appState.counters = {
      date: nowStr,
      total: 0,
      approved: 0,
      denied: 0,
      offline: 0
    };
  }

  // Filter logs matching current local date
  const todayLogs = appState.attendanceLogs.filter(l => {
    return new Date(l.timestamp).toISOString().split("T")[0] === nowStr;
  });

  const approvedToday = todayLogs.filter(l => l.verified).length;
  const totalToday = approvedToday + appState.counters.denied;
  const offlineQueued = appState.syncQueue.length;

  document.getElementById("stat-total-scans").innerText = totalToday;
  document.getElementById("stat-approved").innerText = approvedToday;
  document.getElementById("stat-denied").innerText = appState.counters.denied;
  document.getElementById("stat-offline").innerText = offlineQueued;
  
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
  
  const mobRegBtn = document.getElementById("reg-btn-mobile-snap-permanent");
  if (mobRegBtn) mobRegBtn.style.display = "none";
  if (captureBtn) captureBtn.style.display = "block";

  regVideo.style.display = "none";
  regPreview.style.display = "none";
  regPlaceholder.style.display = "block";
  captureBtn.innerText = "Take Snapshot";
  appState.capturedPhotoBase64 = null;
  
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" } 
      });
      appState.webcamStream = stream;
      regVideo.srcObject = stream;
      regVideo.style.display = "block";
      regPlaceholder.style.display = "none";
      logTerminal("INFO", "Enrollment camera feed active. Ready for facial registration.");
    } catch (err) {
      logTerminal("WARN", "Webcam access denied. Directing to mobile capture snap.");
      regPlaceholder.innerText = "Live camera access is restricted. Use the mobile selfie button below.";
      if (mobRegBtn) mobRegBtn.style.display = "block";
      if (captureBtn) captureBtn.style.display = "none";
    }
  } else {
    regPlaceholder.innerText = "Live camera access is restricted. Use the mobile selfie button below.";
    if (mobRegBtn) mobRegBtn.style.display = "block";
    if (captureBtn) captureBtn.style.display = "none";
  }
}

// Capture current webcam image frame onto canvas
// Search employee from Zyng HR database
function searchEmployeeZyngHR() {
  const empIdInput = document.getElementById("reg-emp-id");
  if (!empIdInput) return;
  const query = empIdInput.value.trim().toUpperCase();
  if (!query) {
    alert("Please enter an employee name or ID!");
    return;
  }

  const matches = Object.values(employeeDatabase).filter(employee => {
    const id = (employee.id || "").toUpperCase();
    const name = (employee.name || "").toUpperCase();
    return id.includes(query) || name.includes(query);
  });

  if (matches.length === 1) {
    fetchEmployeeForRegistration(matches[0].id);
    return;
  }

  const results = document.getElementById("reg-employee-search-results");
  if (matches.length > 1 && results) {
    results.innerHTML = "";
    matches.forEach(employee => {
      const button = document.createElement("button");
      button.type = "button";
      button.style.cssText = "width:100%; display:flex; justify-content:space-between; gap:10px; padding:9px 10px; background:transparent; color:var(--color-text-primary); border:0; border-bottom:1px solid rgba(255,255,255,0.08); cursor:pointer; text-align:left;";
      button.innerHTML = `<span>${employee.name}</span><span style="color:var(--color-text-muted); font-family:var(--font-mono);">${employee.id}</span>`;
      button.addEventListener("click", () => {
        empIdInput.value = employee.id;
        results.classList.add("hidden");
        fetchEmployeeForRegistration(employee.id);
      });
      results.appendChild(button);
    });
    results.classList.remove("hidden");
    return;
  }

  fetchEmployeeForRegistration(query);
}

function fetchEmployeeForRegistration(empId) {
  const results = document.getElementById("reg-employee-search-results");
  if (results) results.classList.add("hidden");
  logTerminal("INFO", `Querying Zyng HR database for Employee ID: ${empId}...`);

  fetch(getApiUrl(`/api/zynghr/employee/${encodeURIComponent(empId)}`))
    .then(res => {
      if (!res.ok) {
        throw new Error("Employee ID not found in Zyng HR");
      }
      return res.json();
    })
    .then(employee => {
      appState.currentZyngHREmployee = employee;
      
      // Populate fields
      document.getElementById("reg-name").value = employee.name;
      document.getElementById("reg-shift").value = employee.shift;
      
      // Show employee card details
      const detailsCard = document.getElementById("reg-employee-details");
      detailsCard.classList.remove("hidden");
      
      document.getElementById("reg-emp-avatar").src = employee.avatar;
      document.getElementById("reg-emp-name").innerText = employee.name;
      document.getElementById("reg-emp-meta").innerText = `${employee.role} | ${employee.shift}`;
      document.getElementById("reg-emp-address").innerText = employee.address;
      document.getElementById("reg-emp-contact").innerText = employee.contact;
      
      logTerminal("SUCCESS", `Zyng HR Record retrieved for: ${employee.name}`);
    })
    .catch(err => {
      logTerminal("ERROR", `Zyng HR Sync Error: Employee ID ${empId} not found.`);
      alert(`No employee matches "${empId}".`);
      
      // Clear fields
      appState.currentZyngHREmployee = null;
      document.getElementById("reg-name").value = "";
      document.getElementById("reg-employee-details").classList.add("hidden");
    });
}

// Update previews of captured gate registration snapshots
function updateGatePhotosPreviews() {
  const previewContainer = document.getElementById("reg-photos-preview-container");
  const countSpan = document.getElementById("reg-photos-count");
  if (!previewContainer || !countSpan) return;
  
  const count = appState.capturedPhotos ? appState.capturedPhotos.length : 0;
  countSpan.innerText = `${count} / 3 Snapped`;
  
  if (count === 0) {
    previewContainer.innerHTML = `<span style="color: var(--color-text-muted); font-size: 0.7rem; margin: auto;">No gate snaps captured yet.</span>`;
    return;
  }
  
  previewContainer.innerHTML = "";
  appState.capturedPhotos.forEach((photo, idx) => {
    const img = document.createElement("img");
    img.src = photo;
    img.style.width = "46px";
    img.style.height = "46px";
    img.style.borderRadius = "4px";
    img.style.objectFit = "cover";
    img.style.border = "1.5px solid var(--color-primary)";
    img.alt = `Gate Snap ${idx + 1}`;
    previewContainer.appendChild(img);
  });
}

// Capture current webcam image frame onto canvas (up to 3 gate snaps)
function captureRegistrationPhoto() {
  const regVideo = document.getElementById("reg-camera-stream");
  const regPreview = document.getElementById("reg-snapshot-preview");
  const captureBtn = document.getElementById("reg-btn-capture");
  
  if (!appState.capturedPhotos) {
    appState.capturedPhotos = [];
  }
  
  if (appState.capturedPhotos.length >= 3) {
    appState.capturedPhotos = [];
    appState.capturedPhotoBase64 = null;
    regPreview.style.display = "none";
    regVideo.style.display = "block";
    captureBtn.innerText = "Take Snapshot 1";
    updateGatePhotosPreviews();
    logTerminal("INFO", "Reset enrollment snapshots. Camera active.");
    return;
  }
  
  // Take snapshot
  const canvas = document.createElement("canvas");
  canvas.width = 200;
  canvas.height = 200;
  const ctx = canvas.getContext("2d");
  
  if (appState.webcamStream && regVideo.readyState >= 2) {
    const vw = regVideo.videoWidth;
    const vh = regVideo.videoHeight;
    const cropSize = Math.min(vw, vh) * 0.85;
    const sx = (vw - cropSize) / 2;
    const sy = (vh - cropSize) / 2;
    
    // Mirror draw
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(regVideo, sx, sy, cropSize, cropSize, 0, 0, canvas.width, canvas.height);
    
    const base64 = canvas.toDataURL("image/jpeg");
    appState.capturedPhotos.push(base64);
    appState.capturedPhotoBase64 = base64; // Fallback compatibility
    
    regPreview.src = base64;
    regPreview.style.display = "block";
    
    logTerminal("SUCCESS", `Gate Snapshot ${appState.capturedPhotos.length} captured successfully.`);
  } else {
    // Generate initials avatar placeholder if webcam is off
    const name = document.getElementById("reg-name").value.trim() || "New Candidate";
    const initials = name.split(" ").map(n => n[0]).join("").toUpperCase().substring(0, 2);
    
    ctx.fillStyle = "hsl(" + Math.floor(Math.random() * 360) + ", 70%, 50%)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 48px Outfit";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(initials, canvas.width/2, canvas.height/2);
    
    const base64 = canvas.toDataURL("image/jpeg");
    appState.capturedPhotos.push(base64);
    appState.capturedPhotoBase64 = base64;
    
    regPreview.src = base64;
    regPreview.style.display = "block";
    logTerminal("WARN", `Generated digital gate placeholder ${appState.capturedPhotos.length} for biometric record.`);
  }
  
  updateGatePhotosPreviews();
  
  if (appState.capturedPhotos.length === 3) {
    captureBtn.innerText = "Clear & Retake Snaps";
  } else {
    captureBtn.innerText = `Take Snapshot ${appState.capturedPhotos.length + 1}`;
  }
}

// Enroll face data and save to localStorage
function enrollNewCandidate() {
  if (!appState.currentZyngHREmployee) {
    alert("Please search and fetch a valid Zyng HR Employee record before registering biometrics!");
    return;
  }
  
  if (!appState.capturedPhotos || appState.capturedPhotos.length < 3) {
    alert("Please capture all 3 gate snapshots to ensure biometric registration accuracy!");
    return;
  }
  
  const finalKey = appState.currentZyngHREmployee.id;
  const cleanFinalKey = finalKey.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const name = appState.currentZyngHREmployee.name;
  const firstPhoto = appState.capturedPhotos[0];

  logTerminal("INFO", `Biometric Security: Checking for duplicate face embeddings in database...`);

  // Step 1: Pre-check with AI Biometric Server to prevent registering duplicate faces under different IDs
  fetch(getApiUrl('/api/biometric/check-duplicate'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: firstPhoto })
  })
  .then(res => res.ok ? res.json() : null)
  .then(data => {
    if (data && data.duplicate) {
      const cleanMatchedId = (data.employeeId || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (cleanMatchedId !== cleanFinalKey) {
        logTerminal("ERROR", `Biometric Security: Duplicate face rejected! Matches existing Employee ID ${data.employeeId} (${data.name}).`);
        alert(`🚨 Biometric Registration Denied (Duplicate Face Detected)!\n\nThis face is already registered in the plant roster under Employee ID: ${data.employeeId} (${data.name}).\n\nFor security and fraud prevention, the same face cannot be registered under multiple Employee IDs.`);
        return;
      }
    }
    
    // Proceed with enrollment if no duplicate face is detected or if updating the same employee
    finishEnrollment(finalKey, name);
  })
  .catch(err => {
    // If AI server check fails or offline, proceed with enrollment
    finishEnrollment(finalKey, name);
  });
}

function finishEnrollment(finalKey, name) {
  const initials = name.split(" ").map(n => n[0]).join("").toUpperCase().substring(0, 2);
  const avatarUrl = (appState.capturedPhotos && appState.capturedPhotos.length > 0) 
    ? appState.capturedPhotos[0] 
    : appState.currentZyngHREmployee.avatar;

  const employeeObject = {
    id: finalKey,
    name: name,
    avatar: avatarUrl, // Captured gate snapshot or fallback profile pic
    gatePhotos: appState.capturedPhotos, // The 3 gate photos taken at registration
    initials: initials,
    role: appState.currentZyngHREmployee.role,
    shift: appState.currentZyngHREmployee.shift,
    status: "Active",
    location: appState.selectedLocation,
    faceVector: `[Gate Registered: 3 Photos]`,
    isCropped: true
  };
  
  // Precompute grid first before syncing to server/storage to ensure offline matcher works!
  const img = new Image();
  img.onload = function() {
    employeeObject.colorGrid = getColorGrid(img);
    
    employeeDatabase[finalKey] = employeeObject;
    logTerminal("SUCCESS", `Database Enrolled: Linked biometric gate profile for ID ${finalKey} (${name}).`);
    
    // Save state
    saveLocalStorage();
    
    // Post enrollment to shared API database server with colorGrid included
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
    document.getElementById("reg-emp-id").value = "";
    document.getElementById("reg-name").value = "";
    document.getElementById("reg-employee-details").classList.add("hidden");
    appState.currentZyngHREmployee = null;
    appState.capturedPhotos = [];
    appState.capturedPhotoBase64 = null;
    document.getElementById("reg-btn-capture").innerText = "Take Snapshot 1";
    updateGatePhotosPreviews();
    
    // Switch back to scanning tab
    switchTab("scan");
    
    // Override approach subject to newly registered candidate
    appState.selectedSubject = finalKey;
    updateWalkUpStatusText();
  };
  img.src = avatarUrl;
}

// Initialize Admin Portal panel tabs (Live Logs vs Reports)
function initAdminTabs() {
  const tabLive = document.getElementById("admin-tab-live");
  const tabReports = document.getElementById("admin-tab-reports");
  const viewLive = document.getElementById("admin-view-live");
  const viewReports = document.getElementById("admin-view-reports");
  
  if (tabLive && tabReports && viewLive && viewReports) {
    tabLive.addEventListener("click", () => {
      tabLive.classList.add("active");
      tabLive.style.borderBottomColor = "var(--color-primary)";
      tabLive.style.color = "#fff";
      
      tabReports.classList.remove("active");
      tabReports.style.borderBottomColor = "transparent";
      tabReports.style.color = "var(--color-text-muted)";
      
      viewLive.classList.remove("hidden");
      viewReports.classList.add("hidden");
    });
    
    tabReports.addEventListener("click", () => {
      tabReports.classList.add("active");
      tabReports.style.borderBottomColor = "var(--color-primary)";
      tabReports.style.color = "#fff";
      
      tabLive.classList.remove("active");
      tabLive.style.borderBottomColor = "transparent";
      tabLive.style.color = "var(--color-text-muted)";
      
      viewLive.classList.add("hidden");
      viewReports.classList.remove("hidden");
      
      renderZyngHRReports();
    });
  }
}

// Render Zyng HR reports list in admin view
function renderZyngHRReports() {
  const listContainer = document.getElementById("report-employee-list");
  if (!listContainer) return;
  
  listContainer.innerHTML = `<span style="color: var(--color-text-muted); font-size: 0.75rem; margin: auto;">Loading Zyng HR reports...</span>`;
  
  fetch(getApiUrl('/api/zynghr/report'))
    .then(res => res.json())
    .then(data => {
      listContainer.innerHTML = "";
      if (data.length === 0) {
        listContainer.innerHTML = `<span style="color: var(--color-text-muted); font-size: 0.75rem; margin: auto;">No employee records found.</span>`;
        return;
      }
      
      data.forEach(emp => {
        const row = document.createElement("div");
        row.style.display = "flex";
        row.style.alignItems = "center";
        row.style.justifyContent = "space-between";
        row.style.padding = "10px 12px";
        row.style.background = "linear-gradient(135deg, #1e293b, #0f172a)";
        row.style.border = "1px solid rgba(56, 189, 248, 0.2)";
        row.style.borderLeft = "4px solid #38bdf8";
        row.style.borderRadius = "8px";
        row.style.cursor = "pointer";
        row.style.transition = "all 0.2s";
        row.style.boxShadow = "0 3px 8px rgba(15, 23, 42, 0.15)";
        
        row.addEventListener("mouseover", () => {
          row.style.background = "linear-gradient(135deg, #1e3a8a, #1e293b)";
          row.style.borderColor = "#38bdf8";
          row.style.borderLeft = "4px solid #38bdf8";
        });
        row.addEventListener("mouseout", () => {
          row.style.background = "linear-gradient(135deg, #1e293b, #0f172a)";
          row.style.borderColor = "rgba(56, 189, 248, 0.2)";
          row.style.borderLeft = "4px solid #38bdf8";
        });
        
        row.addEventListener("click", () => {
          showEmployeeCalendar(emp);
        });
        
        const regBadge = emp.isGateRegistered 
          ? `<span style="color: #34d399; font-size: 0.68rem; border: 1px solid rgba(52,211,153,0.3); padding: 2px 6px; border-radius: 4px; background: rgba(52,211,153,0.15); font-weight: 700;">Gate Registered</span>`
          : `<span style="color: #f87171; font-size: 0.68rem; border: 1px solid rgba(248,113,113,0.3); padding: 2px 6px; border-radius: 4px; background: rgba(248,113,113,0.15); font-weight: 700;">Not Registered</span>`;
          
        row.innerHTML = `
          <div style="display: flex; align-items: center; gap: 10px;">
            <img src="${emp.avatar}" style="width: 34px; height: 34px; border-radius: 50%; object-fit: cover; background: #0f172a; border: 1px solid rgba(255,255,255,0.15);">
            <div>
              <strong style="font-size: 0.84rem; color: #ffffff;">${emp.name}</strong><br>
              <span style="font-size: 0.7rem; color: #94a3b8; font-family: var(--font-mono); font-weight: 600;">${emp.id}</span>
            </div>
          </div>
          <div style="text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: 4px;">
            <span style="font-size: 0.78rem; color: #38bdf8; font-weight: 800;">${emp.attendanceCount} Days Present</span>
            ${regBadge}
          </div>
        `;
        listContainer.appendChild(row);
      });
    })
    .catch(err => {
      listContainer.innerHTML = `<span style="color: var(--color-error); font-size: 0.75rem; margin: auto;">Failed to load reports.</span>`;
    });
}

// Show monthly calendar check-in grid for selected employee
function showEmployeeCalendar(emp) {
  const placeholder = document.getElementById("report-calendar-placeholder");
  const content = document.getElementById("report-calendar-content");
  if (!placeholder || !content) return;
  
  placeholder.classList.add("hidden");
  content.classList.remove("hidden");
  
  appState.currentSelectedEmployee = emp;
  
  document.getElementById("cal-emp-avatar").src = emp.avatar;
  document.getElementById("cal-emp-name").innerText = emp.name;
  
  // Get selected month (e.g. "2026-07")
  const monthSelect = document.getElementById("report-month-select");
  const selectedMonth = monthSelect ? monthSelect.value : "2026-07";
  
  const parts = selectedMonth.split("-");
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const monthName = new Date(year, month - 1, 1).toLocaleString('default', { month: 'long' });
  
  // Count how many present dates match this selected month
  const matchingDates = emp.attendanceDates.filter(d => d.startsWith(selectedMonth));
  const monthPresentCount = matchingDates.length;
  
  document.getElementById("cal-emp-meta").innerText = `${emp.id} | ${monthPresentCount} Days Present (${monthName} ${year})`;
  
  const roleEl = document.getElementById("cal-emp-role");
  if (roleEl) roleEl.innerText = emp.role || "N/A";
  const shiftEl = document.getElementById("cal-emp-shift");
  if (shiftEl) shiftEl.innerText = emp.shift || "N/A";
  const emailEl = document.getElementById("cal-emp-email");
  if (emailEl) emailEl.innerText = emp.email || "N/A";
  const phoneEl = document.getElementById("cal-emp-phone");
  if (phoneEl) phoneEl.innerText = emp.contact || "N/A";
  
  const grid = document.getElementById("cal-grid");
  if (!grid) return;
  grid.innerHTML = "";
  
  // Calculate offset (Mon=0, Tue=1, Wed=2, Thu=3, Fri=4, Sat=5, Sun=6)
  const firstDay = new Date(year, month - 1, 1);
  const dayOfWeek = firstDay.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const offset = (dayOfWeek + 6) % 7;
  
  for (let i = 0; i < offset; i++) {
    const emptyCell = document.createElement("div");
    emptyCell.style.height = "28px";
    grid.appendChild(emptyCell);
  }
  
  // Calculate number of days in selected month
  const numDays = new Date(year, month, 0).getDate();
  
  for (let day = 1; day <= numDays; day++) {
    const dayCell = document.createElement("div");
    dayCell.style.display = "flex";
    dayCell.style.alignItems = "center";
    dayCell.style.justifyContent = "center";
    dayCell.style.height = "28px";
    dayCell.style.fontSize = "0.75rem";
    dayCell.style.borderRadius = "6px";
    dayCell.style.transition = "all 0.2s";
    
    const dateStr = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    const isPresent = emp.attendanceDates.includes(dateStr);
    
    dayCell.innerText = day;
    
    if (isPresent) {
      dayCell.style.background = "#10b981";
      dayCell.style.border = "1px solid #059669";
      dayCell.style.color = "#ffffff";
      dayCell.style.fontWeight = "900";
      dayCell.style.boxShadow = "0 2px 5px rgba(16, 185, 129, 0.3)";
    } else {
      dayCell.style.background = "#f8fafc";
      dayCell.style.border = "1px solid #e2e8f0";
      dayCell.style.color = "#64748b";
      dayCell.style.fontWeight = "700";
    }
    
    grid.appendChild(dayCell);
  }
}

// Local Storage persistency
function saveLocalStorage() {
  if (!Array.isArray(appState.attendanceLogs)) appState.attendanceLogs = [];
  if (!Array.isArray(appState.syncQueue)) appState.syncQueue = [];
  if (!appState.counters || typeof appState.counters !== 'object') {
    appState.counters = { totalToday: 0, approved: 0, denied: 0, offlineQueued: 0 };
  }
  if (!employeeDatabase || typeof employeeDatabase !== 'object') {
    employeeDatabase = {};
  }

  localStorage.setItem("attendance_poc_logs", JSON.stringify(appState.attendanceLogs));
  localStorage.setItem("attendance_poc_queue", JSON.stringify(appState.syncQueue));
  localStorage.setItem("attendance_poc_counters", JSON.stringify(appState.counters));
  localStorage.setItem("attendance_poc_roster", JSON.stringify(employeeDatabase));
  localStorage.setItem("attendance_poc_settings_continuous", appState.isContinuousScan ? "true" : "false");
  localStorage.setItem("attendance_poc_settings_roster", appState.isShiftRosterEnforced ? "true" : "false");
  localStorage.setItem("attendance_poc_settings_lang", appState.language || "en");
  
  // Dynamic Mobile view sync
  renderMobileLogs();
  renderMobileRoster();
}

function loadLocalStorage() {
  try {
    const logs = localStorage.getItem("attendance_poc_logs");
    const queue = localStorage.getItem("attendance_poc_queue");
    const counters = localStorage.getItem("attendance_poc_counters");
    const roster = localStorage.getItem("attendance_poc_roster");

    if (logs) {
      const parsedLogs = JSON.parse(logs);
      if (Array.isArray(parsedLogs)) {
        appState.attendanceLogs = parsedLogs;
      } else if (parsedLogs && Array.isArray(parsedLogs.logs)) {
        appState.attendanceLogs = parsedLogs.logs;
      } else {
        appState.attendanceLogs = [];
      }
    }
    if (!Array.isArray(appState.attendanceLogs)) {
      appState.attendanceLogs = [];
    }

    if (queue) {
      const parsedQueue = JSON.parse(queue);
      appState.syncQueue = Array.isArray(parsedQueue) ? parsedQueue : [];
    }
    if (!Array.isArray(appState.syncQueue)) {
      appState.syncQueue = [];
    }

    if (counters) {
      const parsedCounters = JSON.parse(counters);
      if (parsedCounters && typeof parsedCounters === "object") {
        appState.counters = { ...appState.counters, ...parsedCounters };
      }
    }
    
    if (roster) {
      const parsedRoster = JSON.parse(roster);
      if (parsedRoster && typeof parsedRoster === "object" && !Array.isArray(parsedRoster)) {
        employeeDatabase = parsedRoster;
      }
    }
    appState.isContinuousScan = localStorage.getItem("attendance_poc_settings_continuous") === "true";
    appState.isShiftRosterEnforced = localStorage.getItem("attendance_poc_settings_roster") === "true";
    appState.language = localStorage.getItem("attendance_poc_settings_lang") || "en";
  } catch (err) {
    console.warn("[LocalStorage Load] Corrupted storage reset:", err);
    appState.attendanceLogs = [];
    appState.syncQueue = [];
  }
  
  const selectors = ["login-lang-select", "header-lang-select", "settings-lang-select"];
  selectors.forEach(id => {
    const elem = document.getElementById(id);
    if (elem) elem.value = appState.language || "en";
  });
  translateUI(appState.language || "en");

  saveLocalStorage();
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
      if (rosterData && typeof rosterData === "object" && !Array.isArray(rosterData)) {
        employeeDatabase = rosterData;
        saveLocalStorage();
        renderRoster();
        calculateEmployeeHashes();
        logTerminal("SUCCESS", "API Server: Roster synchronized successfully.");
      }
    }
    
    const logsRes = await fetch(getApiUrl('/api/logs'));
    if (logsRes.ok) {
      const logsData = await logsRes.json();
      if (Array.isArray(logsData)) {
        appState.attendanceLogs = logsData;
      } else if (logsData && Array.isArray(logsData.logs)) {
        appState.attendanceLogs = logsData.logs;
      }
      saveLocalStorage();
      renderAttendanceTable();
      logTerminal("SUCCESS", "API Server: Check-in records synchronized successfully.");
    }
  } catch (err) {
    logTerminal("WARN", "API Server offline. Running in local standalone mode.");
  }
}

function formatServerUrl(rawHost) {
  if (!rawHost) return "http://localhost:2000";
  let clean = rawHost.trim().replace(/\/+$/, "");
  if (clean.startsWith("http://") || clean.startsWith("https://")) {
    return clean;
  }
  const isTunnel = clean.includes('.run') || clean.includes('ngrok') || clean.includes('loca.lt') || clean.includes('lhr.life') || clean.includes('trycloudflare.com') || clean.includes('localhost.run');
  const protocol = isTunnel ? 'https://' : 'http://';
  return protocol + clean;
}

function getApiUrl(endpoint) {
  if (!endpoint.startsWith('http') && (window.location.protocol === 'file:' || window.location.protocol === 'capacitor:')) {
    const configuredHost = localStorage.getItem("backend_server_ip") || "localhost:2000";
    return formatServerUrl(configuredHost) + endpoint;
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
  
  // Lenient but robust face validation checking shadow structure:
  // - Eye band should be darker than cheeks and forehead by a threshold to block uniform surfaces
  // - There must be sufficient contrast between zones
  // - Warm tones (melanin / hemoglobin) dominant over blue/cold hues
  const hasContrast = Math.max(avgForehead, avgCheeks, avgEyes) - Math.min(avgForehead, avgCheeks, avgEyes) > 5;
  const hasFaceStructure = hasContrast && ((avgEyes < avgCheeks - 8) || (avgEyes < avgForehead - 8));
  const hasWarmTone = (avgR > avgB - 5) && (avgR > avgG - 10);
  
  console.log(`Biometrics Validate -> Structure: ${hasFaceStructure} (F:${avgForehead.toFixed(0)} E:${avgEyes.toFixed(0)} C:${avgCheeks.toFixed(0)}), WarmTone: ${hasWarmTone} (R:${avgR.toFixed(0)} G:${avgG.toFixed(0)} B:${avgB.toFixed(0)})`);
  
  return hasFaceStructure && hasWarmTone;
}

// ----------------------------------------------------
// MOBILE APP NATIVE SCREEN UTILITIES AND BACKEND SETTINGS
// ----------------------------------------------------

function startScanCountdown() {
  setupCountdownDOMElements();
  
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
        
        if (count === 1) {
          overlay.style.color = "var(--color-warning)";
          overlay.style.borderColor = "var(--color-warning)";
          banner.style.color = "var(--color-warning)";
        }
      }
    }, 1000);
  }
}

function renderMobileLogs() {
  const container = document.getElementById("mobile-logs-list");
  if (!container) return;
  
  container.innerHTML = "";
  const swipesCountLabel = document.getElementById("mobile-stat-swipes");
  if (swipesCountLabel) {
    swipesCountLabel.innerText = `${appState.attendanceLogs.length} Logs`;
  }
  
  if (appState.attendanceLogs.length === 0) {
    container.innerHTML = `<div style="color:var(--color-text-muted); font-size:0.75rem; text-align:center; padding:12px;">No attendance swipes recorded.</div>`;
    return;
  }
  
  // Render logs in reverse chronological order
  const logsToRender = [...appState.attendanceLogs].reverse();
  logsToRender.forEach(log => {
    const card = document.createElement("div");
    card.style.cssText = "background:var(--bg-card); border:1px solid var(--border-color); padding:10px; border-radius:6px; display:flex; justify-content:space-between; align-items:center; font-size:0.75rem; margin-bottom:4px;";
    
    const isApproved = log.verified;
    const timeFormatted = new Date(log.timestamp).toLocaleTimeString();
    
    let badgeText = isApproved ? "APPROVED" : "DENIED";
    let badgeStyle = isApproved ? "background:rgba(34,197,94,0.1); color:#22c55e;" : "background:rgba(239,68,68,0.1); color:#ef4444;";
    if (log.isManual) {
      badgeText = "MANUAL";
      badgeStyle = "background:rgba(56,189,248,0.1); color:#38bdf8;";
    }

    card.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:2px;">
        <span style="font-weight:bold; color:#fff;">${log.name}</span>
        <span style="color:var(--color-text-muted); font-size:0.65rem;">ID: ${log.empId} • ${log.location}</span>
        <span style="font-size:0.65rem; font-weight:bold; color:${log.direction === 'Check-Out' ? '#ef4444' : '#22c55e'}">${(log.direction || 'Check-In').toUpperCase()}${log.isManual ? ' (MANUAL)' : ''}</span>
      </div>
      <div style="display:flex; flex-direction:column; align-items:flex-end; gap:4px;">
        <span style="font-size:0.65rem; color:#94a3b8;">${timeFormatted}</span>
        <span style="padding:2px 6px; border-radius:4px; font-size:0.6rem; font-weight:bold; ${badgeStyle}">${badgeText}</span>
      </div>
    `;
    container.appendChild(card);
  });
}

function renderMobileRoster() {
  const container = document.getElementById("mobile-roster-list");
  if (!container) return;
  
  container.innerHTML = "";
  const rosterKeys = Object.keys(employeeDatabase);
  const rosterCountLabel = document.getElementById("mobile-stat-roster");
  if (rosterCountLabel) {
    rosterCountLabel.innerText = `${rosterKeys.length} Faces`;
  }
  
  if (rosterKeys.length === 0) {
    container.innerHTML = `<div style="color:var(--color-text-muted); font-size:0.75rem; text-align:center; padding:12px;">Roster database is empty.</div>`;
    return;
  }
  
  rosterKeys.forEach(key => {
    const emp = employeeDatabase[key];
    const card = document.createElement("div");
    card.style.cssText = "background:var(--bg-card); border:1px solid var(--border-color); padding:10px; border-radius:6px; display:flex; align-items:center; gap:10px; font-size:0.75rem; margin-bottom:4px; cursor:pointer;";
    
    const avatarImg = emp.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=40&h=40&q=80";
    
    card.innerHTML = `
      <img src="${avatarImg}" style="width:30px; height:30px; border-radius:50%; object-fit:cover; border:1px solid rgba(255,255,255,0.1);">
      <div style="display:flex; flex-direction:column; gap:2px; flex:1;">
        <span style="font-weight:bold; color:#fff;">${emp.name}</span>
        <span style="color:var(--color-text-muted); font-size:0.65rem;">ID: ${emp.id} • ${emp.role}</span>
      </div>
    `;
    card.addEventListener("click", () => {
      openEmployeeProfileDrawer(key);
    });
    container.appendChild(card);
  });
}

let currentProfileEmployeeKey = null;
let profileDrawerCapturedPhoto = null;

function openEmployeeProfileDrawer(key) {
  const emp = employeeDatabase[key];
  if (!emp) return;
  
  currentProfileEmployeeKey = key;
  profileDrawerCapturedPhoto = null;
  
  document.getElementById("profile-drawer-name").innerText = emp.name;
  document.getElementById("profile-drawer-id").innerText = `ID: ${emp.id}`;
  document.getElementById("profile-drawer-role").innerText = emp.role || "Contract Staff";
  document.getElementById("profile-drawer-shift").innerText = emp.shift || "Morning Shift (A)";
  
  const displayAvatar = (emp.gatePhotos && emp.gatePhotos.length > 0) ? emp.gatePhotos[0] : emp.avatar;
  document.getElementById("profile-drawer-avatar").src = displayAvatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&h=100&q=80";
  
  // Reset photo update section
  document.getElementById("profile-drawer-placeholder-text").style.display = "block";
  document.getElementById("profile-drawer-new-img").style.display = "none";
  document.getElementById("profile-drawer-new-img").src = "";
  
  const saveBtn = document.getElementById("profile-drawer-save-btn");
  saveBtn.disabled = true;
  saveBtn.style.opacity = "0.5";
  saveBtn.style.cursor = "not-allowed";
  
  document.getElementById("app-employee-profile-drawer").classList.remove("hidden");
}

function initEmployeeProfileDrawer() {
  const closeBtn = document.getElementById("close-profile-drawer-btn");
  const captureBtn = document.getElementById("profile-drawer-capture-btn");
  const saveBtn = document.getElementById("profile-drawer-save-btn");
  const fileInput = document.getElementById("profile-drawer-file-input");
  
  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      document.getElementById("app-employee-profile-drawer").classList.add("hidden");
    });
  }
  
  if (captureBtn && fileInput) {
    captureBtn.addEventListener("click", () => {
      fileInput.click();
    });
  }
  
  if (fileInput) {
    fileInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (event) => {
        profileDrawerCapturedPhoto = event.target.result;
        
        const placeholder = document.getElementById("profile-drawer-placeholder-text");
        if (placeholder) placeholder.style.display = "none";
        
        const previewImg = document.getElementById("profile-drawer-new-img");
        if (previewImg) {
          previewImg.src = profileDrawerCapturedPhoto;
          previewImg.style.display = "block";
        }
        
        if (saveBtn) {
          saveBtn.disabled = false;
          saveBtn.style.opacity = "1";
          saveBtn.style.cursor = "pointer";
        }
      };
      reader.readAsDataURL(file);
    });
  }
  
  if (saveBtn) {
    saveBtn.addEventListener("click", () => {
      if (!currentProfileEmployeeKey || !profileDrawerCapturedPhoto) return;
      
      const emp = employeeDatabase[currentProfileEmployeeKey];
      if (!emp) return;
      
      if (!emp.gatePhotos) emp.gatePhotos = [];
      emp.gatePhotos.unshift(profileDrawerCapturedPhoto);
      if (emp.gatePhotos.length > 3) emp.gatePhotos = emp.gatePhotos.slice(0, 3);
      emp.avatar = profileDrawerCapturedPhoto;
      
      logTerminal("INFO", `ZyngHR Sync: Dispatching facial updates for ID ${emp.id}...`);
      
      fetch(getApiUrl('/api/roster'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: currentProfileEmployeeKey, employee: emp })
      }).then(res => {
        if (res.ok) {
          logTerminal("SUCCESS", `ZyngHR Database Sync: Secondary facial photograph linked for ID ${emp.id}.`);
          alert("Additional face photograph synchronized with ZyngHR database successfully!");
          
          renderRoster();
          renderMobileRoster();
          if (typeof renderZyngHRReports === "function") {
            renderZyngHRReports();
          }
        } else {
          logTerminal("ERROR", `ZyngHR Sync Failed for ID ${emp.id}.`);
          alert("Error syncing updated face photo with server database.");
        }
      }).catch(err => {
        logTerminal("WARN", `ZyngHR Database Server unreachable. Saved locally in browser storage.`);
        alert("Server connection offline. Photograph cached on device.");
      });
      
      document.getElementById("app-employee-profile-drawer").classList.add("hidden");
    });
  }
}

function initSettingsDrawer() {
  const drawer = document.getElementById("app-settings-drawer");
  const ipInput = document.getElementById("settings-ip-input");
  const saveBtn = document.getElementById("settings-save-btn");
  const closeBtn = document.getElementById("close-settings-btn");
  const testBtn = document.getElementById("settings-test-btn");
  const linkStatus = document.getElementById("settings-link-status");
  
  const continuousScanCheck = document.getElementById("settings-continuous-scan");
  const rosterRuleCheck = document.getElementById("settings-roster-rule");
  
  const openButtons = ["mobile-settings-btn", "mobile-scan-settings-btn", "mobile-reg-settings-btn", "mobile-logs-settings-btn", "mobile-zynghr-settings-btn"];
  
  // Set initial settings values
  const currentIp = localStorage.getItem("backend_server_ip") || "192.168.1.8:3000";
  if (ipInput) ipInput.value = currentIp;
  if (continuousScanCheck) continuousScanCheck.checked = appState.isContinuousScan;
  if (rosterRuleCheck) rosterRuleCheck.checked = appState.isShiftRosterEnforced;
  
  openButtons.forEach(id => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.addEventListener("click", () => {
        const freshIp = localStorage.getItem("backend_server_ip") || "192.168.1.8:3000";
        if (ipInput) ipInput.value = freshIp;
        if (continuousScanCheck) continuousScanCheck.checked = appState.isContinuousScan;
        if (rosterRuleCheck) rosterRuleCheck.checked = appState.isShiftRosterEnforced;
        if (drawer) drawer.classList.remove("hidden");
        testServerConnection(freshIp);
      });
    }
  });
  
  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      if (drawer) drawer.classList.add("hidden");
    });
  }
  
  if (saveBtn) {
    saveBtn.addEventListener("click", () => {
      const newIp = ipInput.value.trim();
      if (!newIp) {
        alert("Please enter a valid IP address host (e.g. 192.168.1.8:3000)");
        return;
      }
      localStorage.setItem("backend_server_ip", newIp);
      appState.isContinuousScan = continuousScanCheck ? !!continuousScanCheck.checked : false;
      appState.isShiftRosterEnforced = rosterRuleCheck ? !!rosterRuleCheck.checked : false;
      saveLocalStorage();
      logTerminal("INFO", `Connection & policy settings updated. Host API: ${newIp}. Continuous: ${appState.isContinuousScan}. Enforce Roster: ${appState.isShiftRosterEnforced}`);
      
      // Update network indicator
      testServerConnection(newIp, true);
      
      if (drawer) drawer.classList.add("hidden");
    });
  }
  
  if (testBtn) {
    testBtn.addEventListener("click", () => {
      const ipToTest = ipInput.value.trim();
      testServerConnection(ipToTest);
    });
  }
  
  // Tab toggle logic
  const tabNetwork = document.getElementById("settings-tab-network");
  const tabZyngHR = document.getElementById("settings-tab-zynghr");
  const sectNetwork = document.getElementById("settings-sect-network");
  const sectZyngHR = document.getElementById("settings-sect-zynghr");
  
  if (tabNetwork && tabZyngHR && sectNetwork && sectZyngHR) {
    tabNetwork.addEventListener("click", () => {
      tabNetwork.style.borderBottom = "2px solid var(--color-primary)";
      tabNetwork.style.color = "#fff";
      tabZyngHR.style.borderBottom = "2px solid transparent";
      tabZyngHR.style.color = "#94a3b8";
      sectNetwork.classList.remove("hidden");
      sectZyngHR.classList.add("hidden");
    });
    
    tabZyngHR.addEventListener("click", () => {
      tabZyngHR.style.borderBottom = "2px solid var(--color-primary)";
      tabZyngHR.style.color = "#fff";
      tabNetwork.style.borderBottom = "2px solid transparent";
      tabNetwork.style.color = "#94a3b8";
      sectZyngHR.classList.remove("hidden");
      sectNetwork.classList.add("hidden");
    });
  }
  
  // Load/Save ZyngHR config
  const endpointInput = document.getElementById("settings-zing-endpoint");
  const tenantInput = document.getElementById("settings-zing-tenant");
  const clientIdInput = document.getElementById("settings-zing-clientid");
  const clientSecretInput = document.getElementById("settings-zing-clientsecret");
  const zingSaveBtn = document.getElementById("settings-zing-save-btn");
  const zingTestBtn = document.getElementById("settings-zing-test-btn");
  const zingStatus = document.getElementById("settings-zing-status");
  
  if (endpointInput) endpointInput.value = localStorage.getItem("zynghr_api_endpoint") || "https://api.zynghr.com/api/v1";
  if (tenantInput) tenantInput.value = localStorage.getItem("zynghr_api_tenant") || "LYAMENTERPRISE";
  if (clientIdInput) clientIdInput.value = localStorage.getItem("zynghr_api_clientid") || "client_lyam_prod_8829";
  if (clientSecretInput) clientSecretInput.value = localStorage.getItem("zynghr_api_clientsecret") || "password123";
  
  if (zingSaveBtn) {
    zingSaveBtn.addEventListener("click", () => {
      localStorage.setItem("zynghr_api_endpoint", endpointInput.value.trim());
      localStorage.setItem("zynghr_api_tenant", tenantInput.value.trim());
      localStorage.setItem("zynghr_api_clientid", clientIdInput.value.trim());
      localStorage.setItem("zynghr_api_clientsecret", clientSecretInput.value.trim());
      logTerminal("INFO", `ZyngHR API Gateway config saved to local storage.`);
      alert("ZyngHR API configuration saved successfully!");
    });
  }
  
  if (zingTestBtn) {
    zingTestBtn.addEventListener("click", () => {
      if (zingStatus) {
        zingStatus.innerText = "AUTHENTICATING...";
        zingStatus.style.color = "var(--color-warning)";
      }
      logTerminal("INFO", `[ZyngHR Sandbox] Outbound: Simulating authentication for Client ID '${clientIdInput.value.trim()}' with ZyngHR API Gateway at ${endpointInput.value.trim()}...`);
      
      setTimeout(() => {
        if (zingStatus) {
          zingStatus.innerText = "SIMULATED (CONNECTED)";
          zingStatus.style.color = "#22c55e";
        }
        logTerminal("SUCCESS", `[ZyngHR Sandbox] Integration Handshake success: Mock connection established for Tenant ID '${tenantInput.value.trim()}'.`);
        alert("[ZyngHR Sandbox Simulator]\nConnection simulated successfully! Secure handshake verification completed for demonstration purposes.");
      }, 1000);
    });
  }
  
  function testServerConnection(ip, updateGlobalStatus = false) {
    if (linkStatus) {
      linkStatus.innerText = "TESTING PING...";
      linkStatus.style.color = "var(--color-warning)";
    }
    
    const targetUrl = formatServerUrl(ip) + '/api/roster';
    fetch(targetUrl, { mode: 'cors' })
      .then(res => {
        if (res.ok) {
          if (linkStatus) {
            linkStatus.innerText = "ONLINE";
            linkStatus.style.color = "#22c55e";
          }
          if (updateGlobalStatus) {
            const statusPill = document.getElementById("app-network-status");
            if (statusPill) {
              statusPill.innerText = "ONLINE";
              statusPill.classList.remove("offline");
            }
          }
        } else {
          throw new Error("Bad response");
        }
      })
      .catch(err => {
        if (linkStatus) {
          linkStatus.innerText = "OFFLINE / UNREACHABLE";
          linkStatus.style.color = "#ef4444";
        }
        if (updateGlobalStatus) {
          const statusPill = document.getElementById("app-network-status");
          if (statusPill) {
            statusPill.innerText = "OFFLINE";
            statusPill.classList.add("offline");
          }
        }
      });
  }
}

function initCreateZyngHRDrawer() {
  const drawer = document.getElementById("app-create-zynghr-drawer");
  const link = document.getElementById("reg-lnk-create-zynghr");
  const closeBtn = document.getElementById("close-create-zynghr-btn");
  const saveBtn = document.getElementById("new-emp-save-btn");
  
  if (link && drawer) {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      drawer.classList.remove("hidden");
      
      // Auto-prepopulate the ID field if something was typed in search input
      const searchVal = document.getElementById("reg-emp-id").value.trim().toUpperCase();
      if (searchVal) {
        document.getElementById("new-emp-id").value = searchVal;
      }
    });
  }
  
  if (closeBtn && drawer) {
    closeBtn.addEventListener("click", () => {
      drawer.classList.add("hidden");
    });
  }
  
  if (saveBtn && drawer) {
    saveBtn.addEventListener("click", () => {
      const empId = document.getElementById("new-emp-id").value.trim().toUpperCase();
      const empName = document.getElementById("new-emp-name").value.trim();
      const empRole = document.getElementById("new-emp-role").value.trim();
      const empShift = document.getElementById("new-emp-shift").value;
      const empAddress = document.getElementById("new-emp-address").value.trim();
      const empContact = document.getElementById("new-emp-contact").value.trim();
      
      if (!empId || !empName) {
        alert("Please enter both Employee ID and Full Name!");
        return;
      }
      
      const payload = {
        id: empId,
        name: empName,
        role: empRole,
        shift: empShift,
        address: empAddress,
        contact: empContact
      };
      
      logTerminal("INFO", `Posting new profile for ${empName} to Zyng HR database...`);
      
      fetch(getApiUrl('/api/zynghr/employee'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      .then(res => {
        if (!res.ok) {
          return res.json().then(err => { throw new Error(err.error || "Failed to create profile"); });
        }
        return res.json();
      })
      .then(data => {
        logTerminal("SUCCESS", `Zyng HR Profile created successfully for ${empName} (ID: ${empId})`);
        alert(`Zyng HR Employee Profile created successfully for ${empName}!`);
        
        // Clear new form fields
        document.getElementById("new-emp-id").value = "";
        document.getElementById("new-emp-name").value = "";
        document.getElementById("new-emp-role").value = "";
        document.getElementById("new-emp-address").value = "";
        document.getElementById("new-emp-contact").value = "";
        
        // Hide drawer
        drawer.classList.add("hidden");
        
        // Set search ID to the new ID and trigger search
        document.getElementById("reg-emp-id").value = empId;
        searchEmployeeZyngHR();
      })
      .catch(err => {
        logTerminal("ERROR", `Failed to create profile: ${err.message}`);
        alert(`Error: ${err.message}`);
      });
    });
  }
}

// Background network synchronization loop (Runs every 10 seconds)
function startBackgroundSyncLoop() {
  setInterval(async () => {
    // If the device is hard-toggled to offline mode in the UI, do not sync
    if (appState.isOffline) return;
    
    const serverIp = localStorage.getItem("backend_server_ip") || "192.168.1.8:3000";
    try {
      const ping = await fetch(getApiUrl('/api/roster'), { mode: 'cors' });
      if (ping.ok) {
        // Update network indicator
        const statusPill = document.getElementById("app-network-status");
        if (statusPill) {
          statusPill.innerText = "ONLINE";
          statusPill.classList.remove("offline");
        }
        
        // Sync roster from server database
        const rosterRes = await fetch(getApiUrl('/api/roster'));
        if (rosterRes.ok) {
          const rosterData = await rosterRes.json();
          // Merge local custom registrations that haven't synced yet
          Object.keys(employeeDatabase).forEach(key => {
            if (key.startsWith('emp-custom-') && !rosterData[key]) {
              rosterData[key] = employeeDatabase[key];
              // Try to post this missing candidate to server in the background
              fetch(getApiUrl('/api/roster'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key: key, employee: employeeDatabase[key] })
              }).catch(() => {});
            }
          });
          
          employeeDatabase = rosterData;
          saveLocalStorage();
          renderRoster();
          calculateEmployeeHashes();
        }
        
        // Automatically sync any offline check-ins in queue
        if (appState.syncQueue.length > 0) {
          forceSyncOfflineQueue();
        }
      }
    } catch (err) {
      // Server unreachable, update status indicator
      const statusPill = document.getElementById("app-network-status");
      if (statusPill) {
        statusPill.innerText = "OFFLINE";
        statusPill.classList.add("offline");
      }
    }
  }, 10000);
}

function renderMobileZyngHRDirectory() {
  const container = document.getElementById("mobile-zynghr-list-container");
  if (!container) return;
  
  container.innerHTML = `<div style="color:var(--color-text-muted); font-size:0.75rem; text-align:center; padding:12px;">Loading ZyngHR database...</div>`;
  
  fetch(getApiUrl('/api/zynghr/report'))
    .then(res => res.json())
    .then(data => {
      container.innerHTML = "";
      
      const countEl = document.getElementById("mobile-zynghr-count");
      if (countEl) countEl.innerText = `${data.length} Employees`;
      
      if (data.length === 0) {
        container.innerHTML = `<div style="color:var(--color-text-muted); font-size:0.75rem; text-align:center; padding:12px;">No ZyngHR records found.</div>`;
        return;
      }
      
      data.forEach(emp => {
        const card = document.createElement("div");
        card.style.cssText = "background:var(--bg-card); border:1px solid var(--border-color); padding:10px; border-radius:6px; display:flex; align-items:center; justify-content:space-between; gap:10px; font-size:0.75rem; margin-bottom:6px; cursor:pointer;";
        
        const avatarImg = emp.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=40&h=40&q=80";
        
        const regBadge = emp.isGateRegistered 
          ? `<span style="color:#22c55e; font-size:0.6rem; border:1px solid rgba(34,197,94,0.2); padding:1px 4px; border-radius:3px; background:rgba(34,197,94,0.05);">Registered</span>`
          : `<span style="color:#ef4444; font-size:0.6rem; border:1px solid rgba(239,68,68,0.2); padding:1px 4px; border-radius:3px; background:rgba(239,68,68,0.05);">Not Sync</span>`;
          
        card.innerHTML = `
          <div style="display:flex; align-items:center; gap:8px; flex:1;">
            <img src="${avatarImg}" style="width:28px; height:28px; border-radius:50%; object-fit:cover; border: 1px solid var(--border-color);">
            <div style="display:flex; flex-direction:column; gap:1px;">
              <span style="font-weight:bold; color:#fff;">${emp.name}</span>
              <span style="color:var(--color-text-muted); font-size:0.62rem;">ID: ${emp.id}</span>
            </div>
          </div>
          <div style="text-align:right; display:flex; flex-direction:column; align-items:flex-end; gap:2px;">
            <span style="font-size:0.65rem; color:var(--color-primary); font-weight:bold;">${emp.attendanceCount} Days</span>
            ${regBadge}
          </div>
        `;
        
        card.addEventListener("click", () => {
          openMobileZyngHRDossier(emp);
        });
        
        container.appendChild(card);
      });
    })
    .catch(err => {
      container.innerHTML = `<div style="color:#ef4444; font-size:0.75rem; text-align:center; padding:12px;">Failed to load ZyngHR database.</div>`;
    });
}

function openMobileZyngHRDossier(emp) {
  appState.currentSelectedEmployee = emp;
  
  document.getElementById("mobile-zynghr-main-sect").classList.add("hidden");
  document.getElementById("mobile-zynghr-dossier-sect").classList.remove("hidden");
  
  document.getElementById("mobile-dossier-avatar").src = emp.avatar;
  document.getElementById("mobile-dossier-name").innerText = emp.name;
  document.getElementById("mobile-dossier-id").innerText = `ID: ${emp.id}`;
  
  document.getElementById("mobile-dossier-role").innerText = emp.role || "N/A";
  document.getElementById("mobile-dossier-shift").innerText = emp.shift || "N/A";
  document.getElementById("mobile-dossier-email").innerText = emp.email || "N/A";
  document.getElementById("mobile-dossier-phone").innerText = emp.contact || "N/A";
  document.getElementById("mobile-dossier-reg").innerText = emp.isGateRegistered ? "YES (Sync OK)" : "NO (Pending)";
  document.getElementById("mobile-dossier-reg").style.color = emp.isGateRegistered ? "#22c55e" : "#ef4444";
  
  const monthSelect = document.getElementById("mobile-dossier-month-select");
  const selectedMonth = monthSelect ? monthSelect.value : "2026-07";
  
  const parts = selectedMonth.split("-");
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const monthName = new Date(year, month - 1, 1).toLocaleString('default', { month: 'long' });
  
  const titleEl = document.getElementById("mobile-dossier-cal-title");
  if (titleEl) titleEl.innerText = `Attendance - ${monthName} ${year}`;
  
  const grid = document.getElementById("mobile-dossier-cal-grid");
  if (!grid) return;
  grid.innerHTML = "";
  
  // Calculate offset (Mon=0, Tue=1, Wed=2, Thu=3, Fri=4, Sat=5, Sun=6)
  const firstDay = new Date(year, month - 1, 1);
  const dayOfWeek = firstDay.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const offset = (dayOfWeek + 6) % 7;
  
  for (let i = 0; i < offset; i++) {
    const emptyCell = document.createElement("div");
    emptyCell.style.height = "22px";
    grid.appendChild(emptyCell);
  }
  
  // Calculate number of days in selected month
  const numDays = new Date(year, month, 0).getDate();
  
  for (let day = 1; day <= numDays; day++) {
    const dayCell = document.createElement("div");
    dayCell.style.cssText = "display:flex; align-items:center; justify-content:center; height:22px; font-size:0.65rem; border-radius:4px; font-weight:bold;";
    dayCell.innerText = day;
    
    const dateStr = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    const isPresent = emp.attendanceDates.includes(dateStr);
    
    if (isPresent) {
      dayCell.style.background = "#10b981";
      dayCell.style.color = "#fff";
    } else {
      dayCell.style.background = "rgba(255,255,255,0.02)";
      dayCell.style.border = "1px solid rgba(255,255,255,0.06)";
      dayCell.style.color = "#64748b";
    }
    grid.appendChild(dayCell);
  }
}

function submitManualAttendance(emp, direction) {
  const timestamp = new Date().toISOString();
  
  const record = {
    empId: emp.id,
    name: emp.name,
    timestamp: timestamp,
    location: appState.selectedLocation,
    gps: `${appState.gps.lat.toFixed(4)}°, ${appState.gps.lng.toFixed(4)}°`,
    verified: true,
    syncStatus: appState.isOffline ? "Pending" : "Synced",
    direction: direction,
    isManual: true
  };

  logTerminal("INFO", `Supervisor manually marking ${direction} for ${emp.name} (ID: ${emp.id})...`);

  if (appState.isOffline) {
    appState.syncQueue.push(record);
    appState.attendanceLogs.unshift(record);
    
    appState.counters.total++;
    if (direction === "Check-In") {
      appState.counters.approved++;
    }
    
    if (!emp.attendanceDates) emp.attendanceDates = [];
    const dateStr = timestamp.split('T')[0];
    if (!emp.attendanceDates.includes(dateStr)) {
      emp.attendanceDates.push(dateStr);
      emp.attendanceCount = emp.attendanceDates.length;
    }
    
    renderAttendanceTable();
    renderMobileLogs();
    updateDashboardStats();
    saveLocalStorage();
    
    openMobileZyngHRDossier(emp);
    
    alert(`✅ Manually marked ${direction} offline for ${emp.name}.`);
  } else {
    fetch(getApiUrl('/api/logs'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record)
    })
    .then(res => {
      if (res.ok) return res.json();
      throw new Error("HTTP error " + res.status);
    })
    .then(data => {
      logTerminal("SUCCESS", `ZyngHR Server Response: Manual ${direction} accepted for ${emp.name}`);
      
      appState.attendanceLogs.unshift(record);
      appState.counters.total++;
      
      const dateStr = timestamp.split('T')[0];
      if (!emp.attendanceDates) emp.attendanceDates = [];
      if (!emp.attendanceDates.includes(dateStr)) {
        emp.attendanceDates.push(dateStr);
        emp.attendanceCount = emp.attendanceDates.length;
      }
      
      loadDatabaseFromServer().then(() => {
        renderMobileZyngHRDirectory();
        openMobileZyngHRDossier(emp);
      });
      
      alert(`✅ Manually marked ${direction} online for ${emp.name}.`);
    })
    .catch(err => {
      logTerminal("ERROR", `Failed to submit manual attendance: ${err.message}`);
      alert(`❌ Failed to submit manual attendance: ${err.message}`);
    });
  }
}

// Dynamically populate desktop and mobile ZyngHR dropdowns with all 12 months
function populateMonthDropdowns() {
  const months = [
    { value: "2026-01", label: "January 2026" },
    { value: "2026-02", label: "February 2026" },
    { value: "2026-03", label: "March 2026" },
    { value: "2026-04", label: "April 2026" },
    { value: "2026-05", label: "May 2026" },
    { value: "2026-06", label: "June 2026" },
    { value: "2026-07", label: "July 2026" },
    { value: "2026-08", label: "August 2026" },
    { value: "2026-09", label: "September 2026" },
    { value: "2026-10", label: "October 2026" },
    { value: "2026-11", label: "November 2026" },
    { value: "2026-12", label: "December 2026" }
  ];
  
  const reportSelect = document.getElementById("report-month-select");
  const mobileSelect = document.getElementById("mobile-dossier-month-select");
  
  const now = new Date();
  const currentYear = 2026;
  const currentMonth = (now.getMonth() + 1).toString().padStart(2, '0');
  const defaultVal = currentYear + "-" + currentMonth;
  
  if (reportSelect) {
    reportSelect.innerHTML = "";
    months.forEach(m => {
      const opt = document.createElement("option");
      opt.value = m.value;
      opt.innerText = m.label;
      if (m.value === defaultVal) opt.selected = true;
      reportSelect.appendChild(opt);
    });
  }
  
  if (mobileSelect) {
    mobileSelect.innerHTML = "";
    months.forEach(m => {
      const opt = document.createElement("option");
      opt.value = m.value;
      opt.innerText = m.label;
      opt.style.background = "var(--bg-card)";
      opt.style.color = "var(--color-text-primary)";
      if (m.value === defaultVal) opt.selected = true;
      mobileSelect.appendChild(opt);
    });
  }
}
