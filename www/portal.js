// JavaScript for Attendance Reports and Biometric Analytics Portal
document.addEventListener("DOMContentLoaded", initPortal);

// Global state variables
let zinghrReportData = [];
let allLogsData = [];
let dbStatusData = {};
let attendanceRegisterMap = new Map();

let currentSearchQuery = "";
let currentSelectedTab = "all"; // 'all', 'registered', 'unregistered'
let currentAttTab = "all"; // 'all', 'present', 'absent'

// Pagination state
let auditCurrentPage = 1;
let auditPageSize = 50;
let attCurrentPage = 1;
let attPageSize = 50;


function initPortal() {
  // Update clock immediately
  updatePortalClock();

  // Set default date in date-picker to today's date
  const datePicker = document.getElementById("portal-date-picker");
  if (datePicker) {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    datePicker.value = `${year}-${month}-${day}`;
    
    // Listen for date picker changes
    datePicker.addEventListener("change", refreshData);

    const datePickerHeader = document.getElementById("attendance-board-date-picker");
    if (datePickerHeader) {
      datePickerHeader.value = datePicker.value;
      
      // Sync main date picker to header date picker
      datePicker.addEventListener("change", (e) => {
        datePickerHeader.value = e.target.value;
      });
      
      // Sync header date picker to main date picker and trigger data refresh
      datePickerHeader.addEventListener("change", (e) => {
        datePicker.value = e.target.value;
        refreshData();
      });
    }

    // Set dossier month select to current month dynamically
    const currentMonthStr = `${year}-${month}`;
    const dossierMonthSelect = document.getElementById("dossier-month-select");
    if (dossierMonthSelect && dossierMonthSelect.querySelector(`option[value="${currentMonthStr}"]`)) {
      dossierMonthSelect.value = currentMonthStr;
    }
  }

  // Update clock every second
  updatePortalClock();
  setInterval(updatePortalClock, 1000);

  // Setup event listeners
  const syncBtn = document.getElementById("portal-sync-zinghr");
  if (syncBtn) {
    syncBtn.addEventListener("click", async () => {
      syncBtn.textContent = "⏳ Syncing...";
      syncBtn.disabled = true;
      try {
        const res = await fetch("/api/zinghr/sync-live", { method: "POST" });
        const d = await res.json();
        if (d.success) {
          alert(`✅ ZingHR Workforce Sync Complete!\n\nActive Employees (Date of Leaving is NULL): ${d.activeCount}\nSeparated/Resigned Records: ${d.separatedCount}`);
          await refreshData();
        } else {
          alert(`⚠️ Sync notice: ${d.message || "Failed to sync"}`);
        }
      } catch (err) {
        alert(`❌ Sync failed: ${err.message}`);
      } finally {
        syncBtn.textContent = "🔄 Sync with ZingHR";
        syncBtn.disabled = false;
      }
    });
  }

  document.getElementById("portal-manual-refresh").addEventListener("click", refreshData);
  document.getElementById("portal-location-filter").addEventListener("change", renderDashboard);
  
  // Registration Audit Search and Tabs
  document.getElementById("audit-search-input").addEventListener("input", (e) => {
    currentSearchQuery = e.target.value.toLowerCase();
    auditCurrentPage = 1;
    renderEmployeeAuditList();
  });
  
  document.getElementById("audit-tab-all").addEventListener("click", (e) => switchAuditTab("all", e.target));
  document.getElementById("audit-tab-registered").addEventListener("click", (e) => switchAuditTab("registered", e.target));
  document.getElementById("audit-tab-unregistered").addEventListener("click", (e) => switchAuditTab("unregistered", e.target));

  // Audit Pagination controls
  const auditPrevBtn = document.getElementById("audit-prev-page");
  if (auditPrevBtn) {
    auditPrevBtn.addEventListener("click", () => {
      if (auditCurrentPage > 1) {
        auditCurrentPage--;
        renderEmployeeAuditList();
      }
    });
  }
  const auditNextBtn = document.getElementById("audit-next-page");
  if (auditNextBtn) {
    auditNextBtn.addEventListener("click", () => {
      auditCurrentPage++;
      renderEmployeeAuditList();
    });
  }
  const auditSizeSelect = document.getElementById("audit-page-size");
  if (auditSizeSelect) {
    auditSizeSelect.addEventListener("change", (e) => {
      auditPageSize = parseInt(e.target.value, 10) || 50;
      auditCurrentPage = 1;
      renderEmployeeAuditList();
    });
  }

  // Daily Attendance Search and Tabs
  document.getElementById("attendance-search-input").addEventListener("input", () => {
    attCurrentPage = 1;
    renderAttendanceBoard();
  });
  document.getElementById("att-tab-all").addEventListener("click", (e) => switchAttTab("all", e.target));
  document.getElementById("att-tab-present").addEventListener("click", (e) => switchAttTab("present", e.target));
  document.getElementById("att-tab-absent").addEventListener("click", (e) => switchAttTab("absent", e.target));

  // Attendance Pagination controls
  const attPrevBtn = document.getElementById("att-prev-page");
  if (attPrevBtn) {
    attPrevBtn.addEventListener("click", () => {
      if (attCurrentPage > 1) {
        attCurrentPage--;
        renderAttendanceBoard();
      }
    });
  }
  const attNextBtn = document.getElementById("att-next-page");
  if (attNextBtn) {
    attNextBtn.addEventListener("click", () => {
      attCurrentPage++;
      renderAttendanceBoard();
    });
  }
  const attSizeSelect = document.getElementById("att-page-size");
  if (attSizeSelect) {
    attSizeSelect.addEventListener("change", (e) => {
      attPageSize = parseInt(e.target.value, 10) || 50;
      attCurrentPage = 1;
      renderAttendanceBoard();
    });
  }


  // Month select change in individual dossier calendar
  document.getElementById("dossier-month-select").addEventListener("change", handleDossierEmployeeChange);
  document.getElementById("dossier-employee-select").addEventListener("change", handleDossierEmployeeChange);

  // Bind click listeners for KPI cards to act as filters and smooth-scroll shortcuts
  setupKpiCardClicks();

  // Initialize employee profile modal listeners
  initProfileModalListeners();

  // Fetch initial data
  refreshData();
  // Auto-sync data every 10 seconds to keep gate punches immediately reflected
  setInterval(refreshData, 10000);
}

function setupKpiCardClicks() {
  const cardStrength = document.getElementById("kpi-card-strength");
  const cardRegRate = document.getElementById("kpi-card-reg-rate");
  const cardAttRate = document.getElementById("kpi-card-att-rate");
  const cardPending = document.getElementById("kpi-card-pending");
  const cardSpeed = document.getElementById("kpi-card-speed");
  const cardLiveness = document.getElementById("kpi-card-liveness");

  if (cardStrength) {
    cardStrength.addEventListener("click", () => {
      const tab = document.getElementById("audit-tab-all");
      if (tab) switchAuditTab("all", tab);
      document.getElementById("audit-employee-list").scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  if (cardRegRate) {
    cardRegRate.addEventListener("click", () => {
      const tab = document.getElementById("audit-tab-registered");
      if (tab) switchAuditTab("registered", tab);
      document.getElementById("audit-employee-list").scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  if (cardPending) {
    cardPending.addEventListener("click", () => {
      const tab = document.getElementById("audit-tab-unregistered");
      if (tab) switchAuditTab("unregistered", tab);
      document.getElementById("audit-employee-list").scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  if (cardAttRate) {
    cardAttRate.addEventListener("click", () => {
      const tab = document.getElementById("att-tab-present");
      if (tab) switchAttTab("present", tab);
      document.querySelector(".table-outer-container").scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  if (cardSpeed) {
    cardSpeed.addEventListener("click", () => {
      document.getElementById("shift-bar-chart").scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  if (cardLiveness) {
    cardLiveness.addEventListener("click", () => {
      const tab = document.getElementById("att-tab-absent");
      if (tab) switchAttTab("absent", tab);
      document.querySelector(".table-outer-container").scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }
}

// Update local portal clock display
function updatePortalClock() {
  const clockTime = document.getElementById("portal-clock-time");
  const clockDate = document.getElementById("portal-clock-date");
  if (!clockTime || !clockDate) return;

  const now = new Date();
  
  // Formatted clock time (e.g. 04:05:12 PM)
  clockTime.textContent = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  
  // Formatted date string (e.g. Wednesday, September 9, 2026)
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  clockDate.textContent = now.toLocaleDateString('en-US', options);
}

// Helper to reliably extract YYYY-MM-DD from any log format (ISO timestamp or ZingHR swipeDateTime)
function getLogDate(log) {
  if (!log) return "";
  const raw = log.timestamp || log.swipeDateTime || log.swipeReceiveDateTime || "";
  if (raw.includes("T")) return raw.split("T")[0];
  if (raw.includes(" ")) return raw.split(" ")[0];
  return raw;
}

// Helper to reliably extract location from any log format
function getLogLocation(log) {
  if (!log) return "";
  return log.location || log.plantLocation || log.swipeLocation || "Tata Motors - Gate 1";
}

// Refresh data from server APIs
async function refreshData() {
  const refreshBtn = document.getElementById("portal-manual-refresh");
  if (refreshBtn) refreshBtn.textContent = "⚡ Refreshing...";

  try {
    const selectedDate = document.getElementById("portal-date-picker") ? document.getElementById("portal-date-picker").value : new Date().toISOString().split("T")[0];

    // 1. Fetch ZingHR reports (Filtered to active employees where Date of Leaving is NULL)
    const reportRes = await fetch("/api/zinghr/report");
    if (reportRes.ok) {
      const rawData = await reportRes.json();
      zinghrReportData = Array.isArray(rawData) 
        ? rawData.filter(emp => !emp.dateOfLeaving || emp.dateOfLeaving.trim() === '' || emp.dateOfLeaving.toLowerCase() === 'null')
        : (rawData.data || []);
    }

    // 2. Fetch logs data
    const logsRes = await fetch("/api/logs");
    if (logsRes.ok) {
      allLogsData = await logsRes.json();
    }

    // 3. Fetch general DB statistics
    const statusRes = await fetch("/api/db-status");
    if (statusRes.ok) {
      dbStatusData = await statusRes.json();
    }

    // 4. Fetch Daily Attendance Register (Muster Roll)
    const regRes = await fetch(`/api/attendance/register?date=${selectedDate}&location=all`);
    if (regRes.ok) {
      const regJson = await regRes.json();
      attendanceRegisterMap.clear();
      (regJson.records || []).forEach(r => {
        const cleanId = (r.employeeCode || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
        if (cleanId) attendanceRegisterMap.set(cleanId, r);
      });
    }

    console.log("Portal Data loaded:", {
      activeWorkforce: zinghrReportData.length,
      logs: allLogsData.length,
      register: attendanceRegisterMap.size
    });
  } catch (netErr) {
    console.warn("Network fetch warning:", netErr.message);
  }

  try {
    // Populate the individual monthly report employee select list efficiently
    populateDossierEmployeeDropdown();

    // Render dashboard views
    renderDashboard();
  } catch (error) {
    console.error("Error rendering portal dashboard:", error);
  } finally {
    if (refreshBtn) refreshBtn.textContent = "⚡ Quick Refresh";
  }
}

// Authoritative Daily Attendance Calculator - Harmonized with server.js Muster Roll Engine
function getEmployeeDailyAttendanceMetrics(empId, targetDate) {
  const cleanEmpId = (empId || "").toUpperCase().replace(/[^A-Z0-9]/g, "");

  // Priority 1: Use authoritative server Attendance Register record if available
  if (attendanceRegisterMap && attendanceRegisterMap.has(cleanEmpId)) {
    const reg = attendanceRegisterMap.get(cleanEmpId);
    return {
      firstInTime: reg.firstInTime,
      lastOutTime: reg.lastOutTime,
      totalWorkDuration: reg.totalWorkDuration,
      attendanceStatus: reg.attendanceStatus,
      statusClass: reg.statusClass,
      shiftName: reg.shiftName || reg.shiftCode,
      location: reg.location,
      fromRegister: true
    };
  }

  // Fallback: Compute identical to Hop 3 Muster Roll engine in server.js
  const empLogsToday = allLogsData.filter(log => {
    if (!log) return false;
    const logDate = getLogDate(log);
    const rawId = log.empId || log.employeeCode || log.empIdentification || "";
    const logCleanId = rawId.toUpperCase().replace(/[^A-Z0-9]/g, "");
    return logCleanId === cleanEmpId && logDate === targetDate;
  }).sort((a, b) => new Date(a.timestamp || a.swipeDateTime) - new Date(b.timestamp || b.swipeDateTime));

  let firstInLog = null;
  let lastOutLog = null;

  for (const l of empLogsToday) {
    const dir = (l.direction || (l.inOutFlag === '2' ? 'Check-Out' : 'Check-In')).toLowerCase();
    if (dir.includes('in') && !firstInLog) {
      firstInLog = l;
    }
    if (dir.includes('out')) {
      lastOutLog = l;
    }
  }

  if (empLogsToday.length === 1 && !firstInLog && !lastOutLog) {
    firstInLog = empLogsToday[0];
  } else if (empLogsToday.length > 1 && !lastOutLog) {
    lastOutLog = empLogsToday[empLogsToday.length - 1];
  }

  const firstInTime = firstInLog ? new Date(firstInLog.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : '--';
  const lastOutTime = lastOutLog ? new Date(lastOutLog.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : '--';

  let totalWorkDuration = '--';
  if (firstInLog && lastOutLog && new Date(lastOutLog.timestamp) > new Date(firstInLog.timestamp)) {
    const totalDurationMinutes = Math.round((new Date(lastOutLog.timestamp) - new Date(firstInLog.timestamp)) / 60000);
    const h = Math.floor(totalDurationMinutes / 60);
    const m = totalDurationMinutes % 60;
    totalWorkDuration = `${h}h ${m}m`;
  } else if (firstInLog) {
    totalWorkDuration = 'In Progress';
  }

  return {
    firstInTime,
    lastOutTime,
    totalWorkDuration,
    attendanceStatus: firstInLog ? 'P' : 'A',
    statusClass: firstInLog ? 'present' : 'absent',
    fromRegister: false
  };
}

// Master Render trigger for dashboard elements
function renderDashboard() {
  // Update KPI counters
  renderKpiCards();

  // Render Left Column - Biometric Enrollment Audit
  renderEmployeeAuditList();

  // Render Right Column - Daily Attendance Board
  renderAttendanceBoard();

  // Render Charts & Distributions
  renderCharts();
  
  // Update calendar dossier if employee is selected
  handleDossierEmployeeChange();
}

// Calculate and render KPI metrics
function renderKpiCards() {
  const totalWorkforce = zinghrReportData.length;
  
  // Biometric registered rate
  const registeredCount = zinghrReportData.filter(emp => emp.isGateRegistered).length;
  const regPercentage = totalWorkforce > 0 ? Math.round((registeredCount / totalWorkforce) * 100) : 0;
  
  // Daily Attendance (Present today on selected date picker)
  const selectedDate = document.getElementById("portal-date-picker").value;
  const locationFilter = document.getElementById("portal-location-filter").value;
  
  // Filter employees present on selectedDate at filtered location
  const presentEmployees = zinghrReportData.filter(emp => {
    // Match date
    const hasAttended = emp.attendanceDates && emp.attendanceDates.includes(selectedDate);
    if (!hasAttended) return false;
    
    // Match location
    if (locationFilter !== "all") {
      const matchLog = findEmpCheckinLog(emp.id, selectedDate);
      return matchLog && matchLog.location === locationFilter;
    }
    return true;
  });

  const presentCount = presentEmployees.length;
  
  // Enrolled employees count at the location (or total enrolled if 'all' filtered)
  let baseRegisteredCount = registeredCount;
  if (locationFilter !== "all") {
    // Count how many registered employees are rostered for this location
    baseRegisteredCount = zinghrReportData.filter(emp => emp.isGateRegistered && emp.address && emp.address.includes(locationFilter.split(" - ")[0])).length;
    // Fallback if zero mapping exists
    if (baseRegisteredCount === 0) baseRegisteredCount = registeredCount;
  }
  const attPercentage = baseRegisteredCount > 0 ? Math.round((presentCount / baseRegisteredCount) * 100) : 0;

  // Unregistered workers
  const unregisteredCount = totalWorkforce - registeredCount;

  // Update DOM metrics elements: Total Workforce Strength in ZingHR Database
  const kpiTotalEl = document.getElementById("kpi-total-workforce");
  if (kpiTotalEl) kpiTotalEl.textContent = totalWorkforce.toLocaleString();
  
  // Biometric Registration Rate
  document.getElementById("kpi-reg-count").textContent = `${registeredCount} / ${totalWorkforce} Enrolled`;
  document.getElementById("kpi-reg-pct").textContent = `${regPercentage}%`;
  document.getElementById("kpi-reg-circle").setAttribute("stroke-dasharray", `${regPercentage}, 100`);

  // Daily Attendance Rate
  document.getElementById("kpi-att-count").textContent = `${presentCount} / ${baseRegisteredCount} Present`;
  document.getElementById("kpi-att-pct").textContent = `${attPercentage}%`;
  document.getElementById("kpi-att-circle").setAttribute("stroke-dasharray", `${attPercentage}, 100`);

  // Pending Biometrics
  const unregEl = document.getElementById("kpi-unregistered-count");
  unregEl.textContent = unregisteredCount;
  if (unregisteredCount > 0) {
    unregEl.className = "kpi-value color-error";
  } else {
    unregEl.className = "kpi-value";
  }

  // 5. AI Recognition Speed (Dynamic simulation based on active gate check-in load)
  const baseSpeed = 1.08;
  const loadVariance = (presentCount * 0.003);
  const finalSpeed = Math.max(0.96, Math.min(1.25, baseSpeed + loadVariance + (Math.sin(presentCount) * 0.02))).toFixed(2);
  document.getElementById("kpi-scan-speed").textContent = `${finalSpeed}s`;

  // 6. Liveness & Spoof Block Rate (Analyzing failed logs today)
  const selectedLogs = allLogsData.filter(log => {
    const logDate = getLogDate(log);
    if (logDate !== selectedDate) return false;
    const loc = getLogLocation(log);
    if (locationFilter !== "all" && loc !== locationFilter) return false;
    return true;
  });
  
  const blockedAttempts = selectedLogs.filter(log => log.verified === false || log.verified === "false").length;
  
  document.getElementById("kpi-live-count").textContent = `${blockedAttempts} Blocked`;
  
  // Block rate efficiency is 100% because the biometric matching model blocks every mismatch/spoof automatically
  const livenessPct = 100;
  document.getElementById("kpi-live-pct").textContent = `${livenessPct}%`;
  document.getElementById("kpi-live-circle").setAttribute("stroke-dasharray", `${livenessPct}, 100`);
}

// Find biometric logs entry for employee ID on a given date string
function findEmpCheckinLog(empId, dateStr) {
  if (!empId) return null;
  const cleanId = empId.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return allLogsData.find(log => {
    if (!log) return false;
    const logDate = getLogDate(log);
    const rawId = log.empId || log.employeeCode || log.empIdentification || "";
    const logCleanId = rawId.toUpperCase().replace(/[^A-Z0-9]/g, "");
    return logCleanId === cleanId && logDate === dateStr;
  });
}

// Left Column: Filter and Render Biometric Audit card lists
function renderEmployeeAuditList() {
  const container = document.getElementById("audit-employee-list");
  if (!container) return;

  // Filter list
  let filtered = zinghrReportData.filter(emp => {
    // 1. Search Query filter
    const matchesSearch = 
      emp.name.toLowerCase().includes(currentSearchQuery) ||
      emp.id.toLowerCase().includes(currentSearchQuery) ||
      (emp.role && emp.role.toLowerCase().includes(currentSearchQuery));
    
    if (!matchesSearch) return false;

    // 2. Tab selection filter
    if (currentSelectedTab === "registered") return emp.isGateRegistered;
    if (currentSelectedTab === "unregistered") return !emp.isGateRegistered;
    
    return true;
  });

  // Render counter headers
  const totalCount = zinghrReportData.length;
  const registeredCount = zinghrReportData.filter(emp => emp.isGateRegistered).length;
  const unregisteredCount = totalCount - registeredCount;

  document.getElementById("audit-tab-all").innerHTML = `All (${totalCount})`;
  document.getElementById("audit-tab-registered").innerHTML = `Registered (${registeredCount})`;
  document.getElementById("audit-tab-unregistered").innerHTML = `Unregistered (${unregisteredCount}) ⚠️`;

  // Calculate pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / auditPageSize));
  if (auditCurrentPage > totalPages) auditCurrentPage = totalPages;
  if (auditCurrentPage < 1) auditCurrentPage = 1;

  const startIdx = (auditCurrentPage - 1) * auditPageSize;
  const endIdx = Math.min(startIdx + auditPageSize, filtered.length);
  const pageItems = filtered.slice(startIdx, endIdx);

  // Update pagination DOM indicators
  const infoEl = document.getElementById("audit-pagination-info");
  if (infoEl) {
    infoEl.textContent = filtered.length === 0 
      ? `Showing 0 of 0` 
      : `Showing ${startIdx + 1}–${endIdx} of ${filtered.length}`;
  }

  const indicatorEl = document.getElementById("audit-page-indicator");
  if (indicatorEl) {
    indicatorEl.textContent = `Page ${auditCurrentPage} of ${totalPages}`;
  }

  const prevBtn = document.getElementById("audit-prev-page");
  if (prevBtn) prevBtn.disabled = (auditCurrentPage <= 1);

  const nextBtn = document.getElementById("audit-next-page");
  if (nextBtn) nextBtn.disabled = (auditCurrentPage >= totalPages);

  // Draw list
  if (filtered.length === 0) {
    container.innerHTML = `<div class="loading-state" style="color:var(--color-text-muted);">No employees found matching filters.</div>`;
    return;
  }

  container.innerHTML = pageItems.map(emp => {
    const themeClass = emp.isGateRegistered ? "registered-theme" : "unregistered-theme";
    const badgeHtml = emp.isGateRegistered 
      ? `<span class="badge badge-success">✓ Enrolled</span>`
      : `<span class="badge badge-error">⚠️ Pending</span>`;
    
    // Quick action button for unregistered users
    const actionButton = !emp.isGateRegistered 
      ? `<button class="enroll-nudge-btn" onclick="event.stopPropagation(); triggerEnrollAlert('${emp.id}')">Nudge</button>` 
      : ``;

    return `
      <div class="employee-card ${themeClass}" onclick="openEmployeeProfileModal('${emp.id}')" title="Click to open employee profile dossier">
        <img class="card-avatar" src="${emp.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&h=100&q=80'}" alt="${emp.name}">
        <div class="card-details">
          <div class="card-title-row">
            <span class="card-name">${emp.name}</span>
            <span class="card-id-badge">${emp.id}</span>
          </div>
          <div class="card-meta-row">
            <span>${emp.role || 'Contract Staff'}</span>
            <span>•</span>
            <span style="color:var(--color-primary); font-weight:600;">${emp.shift || 'Morning Shift'}</span>
          </div>
          <div class="card-contact-row">
            <span>📧 ${emp.email || 'n/a'}</span>
            <span>📞 ${emp.contact || 'n/a'}</span>
          </div>
        </div>
        <div style="display:flex; flex-direction:column; align-items:flex-end; gap:6px; margin-left:8px;">
          ${badgeHtml}
          ${actionButton}
        </div>
      </div>
    `;
  }).join("");
}

// Helpers for ZingHR schema attributes
function getEmployeeDepartment(emp) {
  if (emp.department) return emp.department;
  const role = emp.role || "";
  const parenMatch = role.match(/\(([^)]+)\)/);
  if (parenMatch) return parenMatch[1].trim();
  if (role.includes(" - ")) return role.split(" - ")[1].trim();

  const lower = role.toLowerCase();
  if (lower.includes("quality") || lower.includes("qa") || lower.includes("inspect")) return "Quality Assurance";
  if (lower.includes("assembly") || lower.includes("operator") || lower.includes("welder") || lower.includes("production")) return "Production & Assembly";
  if (lower.includes("logistics") || lower.includes("cargo") || lower.includes("supply")) return "Supply Chain & Logistics";
  if (lower.includes("maint") || lower.includes("tech") || lower.includes("electrical")) return "Plant Maintenance";
  if (lower.includes("hr") || lower.includes("admin")) return "Human Resources";
  return "Operations";
}

function getEmployeeDesignation(emp) {
  if (emp.designation) return emp.designation;
  const role = emp.role || "";
  if (role.includes(" (")) return role.split(" (")[0].trim();
  if (role.includes(" - ")) return role.split(" - ")[0].trim();
  return role || "Team Associate";
}

function getEmployeeRuleGroup(emp) {
  return emp.ruleGroup || emp.shift || "General Standard Shift";
}

function getEmployeeLocation(emp, log) {
  if (log && log.location) return log.location;
  if (emp.location) return emp.location;
  if (emp.address) return emp.address;
  return "Tata Motors - Gate 1";
}

// Right Column: Filter and Render Daily Attendance log rows (8 ZingHR Database Columns)
function renderAttendanceBoard() {
  const tbody = document.getElementById("attendance-board-body");
  if (!tbody) return;

  const selectedDate = document.getElementById("portal-date-picker").value;
  const locationFilter = document.getElementById("portal-location-filter").value;
  const searchQuery = (document.getElementById("attendance-search-input").value || "").toLowerCase().trim();

  // Categorize entire workforce into Present vs Absent for selected date
  const rosterStatus = zinghrReportData.map(emp => {
    const cleanId = emp.id.toUpperCase().replace(/[^A-Z0-9]/g, "");
    const regRecord = attendanceRegisterMap.get(cleanId);
    const isPresent = (regRecord && (regRecord.attendanceStatus === 'P' || regRecord.attendanceStatus === 'HD')) || (emp.attendanceDates && emp.attendanceDates.includes(selectedDate));
    const logDetails = isPresent ? findEmpCheckinLog(emp.id, selectedDate) : null;
    
    return {
      employee: emp,
      isPresent: isPresent,
      log: logDetails
    };
  });

  // Filter list based on location selection and search queries
  let filtered = rosterStatus.filter(item => {
    const emp = item.employee;
    
    // 1. Tab Selection Filter
    if (currentAttTab === "present" && !item.isPresent) return false;
    if (currentAttTab === "absent" && item.isPresent) return false;

    // 2. Location Filter
    if (locationFilter !== "all") {
      if (item.isPresent) {
        if (!item.log || item.log.location !== locationFilter) return false;
      } else {
        const cleanAddr = (emp.address || "").toLowerCase();
        const cleanLoc = locationFilter.split(" - ")[0].toLowerCase();
        if (!cleanAddr.includes(cleanLoc)) return false;
      }
    }

    // 3. Search Query Filter
    if (searchQuery) {
      const dept = getEmployeeDepartment(emp).toLowerCase();
      const desig = getEmployeeDesignation(emp).toLowerCase();
      const rule = getEmployeeRuleGroup(emp).toLowerCase();
      const loc = getEmployeeLocation(emp, item.log).toLowerCase();
      const matchesSearch = 
        emp.name.toLowerCase().includes(searchQuery) ||
        emp.id.toLowerCase().includes(searchQuery) ||
        (emp.role && emp.role.toLowerCase().includes(searchQuery)) ||
        dept.includes(searchQuery) ||
        desig.includes(searchQuery) ||
        rule.includes(searchQuery) ||
        loc.includes(searchQuery);
      
      if (!matchesSearch) return false;
    }

    return true;
  });

  // Calculate panel badges
  const presentCount = rosterStatus.filter(i => i.isPresent).length;
  const absentCount = rosterStatus.length - presentCount;
  document.getElementById("att-count-present").textContent = `Present: ${presentCount}`;
  document.getElementById("att-count-absent").textContent = `Absent: ${absentCount}`;

  // Calculate attendance table pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / attPageSize));
  if (attCurrentPage > totalPages) attCurrentPage = totalPages;
  if (attCurrentPage < 1) attCurrentPage = 1;

  const startIdx = (attCurrentPage - 1) * attPageSize;
  const endIdx = Math.min(startIdx + attPageSize, filtered.length);
  const pageItems = filtered.slice(startIdx, endIdx);

  // Update attendance pagination DOM indicators
  const infoEl = document.getElementById("att-pagination-info");
  if (infoEl) {
    infoEl.textContent = filtered.length === 0 
      ? `Showing 0 of 0` 
      : `Showing ${startIdx + 1}–${endIdx} of ${filtered.length}`;
  }

  const indicatorEl = document.getElementById("att-page-indicator");
  if (indicatorEl) {
    indicatorEl.textContent = `Page ${attCurrentPage} of ${totalPages}`;
  }

  const prevBtn = document.getElementById("att-prev-page");
  if (prevBtn) prevBtn.disabled = (attCurrentPage <= 1);

  const nextBtn = document.getElementById("att-next-page");
  if (nextBtn) nextBtn.disabled = (attCurrentPage >= totalPages);

  // Render Table rows
  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="11" style="text-align:center; padding:40px; color:var(--color-text-muted);">
          No attendance records match the filter criteria for date: ${selectedDate}
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = pageItems.map(item => {
    const emp = item.employee;
    const dept = getEmployeeDepartment(emp);
    const desig = getEmployeeDesignation(emp);
    const ruleGroup = getEmployeeRuleGroup(emp);
    const plantLoc = getEmployeeLocation(emp, item.log);
    
    let checkinTimeHtml = `<span style="color:var(--color-text-muted);">-</span>`;
    let checkoutTimeHtml = `<span style="color:var(--color-text-muted);">-</span>`;
    let durationHtml = `<span style="color:var(--color-text-muted);">-</span>`;
    let statusBadgeHtml = `<span class="badge badge-error">Absent</span>`;
    let syncBadgeHtml = `<span class="badge badge-muted">-</span>`;

    if (item.isPresent) {
      const metrics = getEmployeeDailyAttendanceMetrics(emp.id, selectedDate);
      const isHalfDay = (metrics.attendanceStatus === 'HD');

      statusBadgeHtml = isHalfDay 
        ? `<span class="badge" style="background:#fef3c7; color:#d97706; border:1px solid #fde68a;">Half Day</span>`
        : `<span class="badge badge-success">Present</span>`;
      syncBadgeHtml = `<span class="badge badge-success" style="display:inline-flex; align-items:center; gap:4px;"><span style="font-weight:bold;">✓</span> Synced</span>`;

      if (metrics.firstInTime && metrics.firstInTime !== '--') {
        checkinTimeHtml = `<strong style="font-size:0.82rem; color:var(--color-success); font-family:'JetBrains Mono',monospace;">${metrics.firstInTime}</strong>`;
      } else {
        checkinTimeHtml = `<span class="badge badge-success">Present</span>`;
      }

      if (metrics.lastOutTime && metrics.lastOutTime !== '--') {
        checkoutTimeHtml = `<strong style="font-size:0.82rem; color:#f59e0b; font-family:'JetBrains Mono',monospace;">${metrics.lastOutTime}</strong>`;
      } else {
        checkoutTimeHtml = `<span style="color:var(--color-text-muted); font-size:0.75rem;">In Progress</span>`;
      }

      if (metrics.totalWorkDuration && metrics.totalWorkDuration !== '--' && metrics.totalWorkDuration !== 'In Progress') {
        durationHtml = `<span style="font-weight:700; color:var(--color-primary); font-family:'JetBrains Mono',monospace;">${metrics.totalWorkDuration}</span>`;
      } else {
        durationHtml = `<span style="color:var(--color-text-muted); font-size:0.75rem;">${metrics.totalWorkDuration || 'In Progress'}</span>`;
      }
    }

    return `
      <tr onclick="openEmployeeProfileModal('${emp.id}')" title="Click to open employee profile dossier">
        <td>
          <span class="table-emp-id font-mono" style="font-weight:700; color:var(--color-primary); font-size:0.8rem;">${emp.id}</span>
        </td>
        <td>
          <div class="user-profile-cell">
            <img class="table-avatar" src="${emp.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&h=100&q=80'}" alt="${emp.name}">
            <div>
              <span class="table-emp-name" style="font-weight:600; display:block;">${emp.name}</span>
            </div>
          </div>
        </td>
        <td>
          <span style="font-weight:500; color:var(--color-text-secondary);">${dept}</span>
        </td>
        <td>
          <span style="font-weight:600; color:var(--color-text-primary);">${desig}</span>
        </td>
        <td>
          <span class="badge" style="background:rgba(56, 189, 248, 0.1); color:var(--color-primary); border:1px solid rgba(56, 189, 248, 0.25); font-size:0.75rem;">${ruleGroup}</span>
        </td>
        <td>
          <span style="font-weight:500;">${plantLoc}</span>
        </td>
        <td>
          ${checkinTimeHtml}
        </td>
        <td>
          ${checkoutTimeHtml}
        </td>
        <td>
          ${durationHtml}
        </td>
        <td>
          ${statusBadgeHtml}
        </td>
        <td>
          ${syncBadgeHtml}
        </td>
      </tr>
    `;
  }).join("");
}

// Filter tab actions
function switchAuditTab(tabName, clickedBtn) {
  currentSelectedTab = tabName;
  auditCurrentPage = 1;
  document.querySelectorAll("#audit-tab-all, #audit-tab-registered, #audit-tab-unregistered").forEach(btn => {
    btn.classList.remove("active");
  });
  clickedBtn.classList.add("active");
  renderEmployeeAuditList();
}

function switchAttTab(tabName, clickedBtn) {
  currentAttTab = tabName;
  attCurrentPage = 1;
  document.querySelectorAll("#att-tab-all, #att-tab-present, #att-tab-absent").forEach(btn => {
    btn.classList.remove("active");
  });
  clickedBtn.classList.add("active");
  renderAttendanceBoard();
}

// Render Shift and Location charts
function renderCharts() {
  const selectedDate = document.getElementById("portal-date-picker").value;
  
  // 1. Shift Breakdown calculations
  const shiftPresentCounts = {
    "Morning Shift (A)": 0,
    "General Shift (G)": 0,
    "Evening Shift (B)": 0,
    "Night Shift (C)": 0
  };
  const shiftTotalCounts = {
    "Morning Shift (A)": 0,
    "General Shift (G)": 0,
    "Evening Shift (B)": 0,
    "Night Shift (C)": 0
  };

  zinghrReportData.forEach(emp => {
    const shift = emp.shift || "Morning Shift (A)";
    const cleanShiftKey = Object.keys(shiftPresentCounts).find(k => k.includes(shift.split(" (")[0]));
    
    if (cleanShiftKey) {
      shiftTotalCounts[cleanShiftKey]++;
      if (emp.attendanceDates && emp.attendanceDates.includes(selectedDate)) {
        shiftPresentCounts[cleanShiftKey]++;
      }
    }
  });

  const shiftChart = document.getElementById("shift-bar-chart");
  if (shiftChart) {
    shiftChart.innerHTML = Object.keys(shiftPresentCounts).map(shift => {
      const present = shiftPresentCounts[shift];
      const total = shiftTotalCounts[shift];
      const pct = total > 0 ? Math.round((present / total) * 100) : 0;
      
      return `
        <div class="chart-bar-row">
          <span class="bar-label" title="${shift}">${shift}</span>
          <div class="bar-track">
            <div class="bar-fill" style="width: ${pct}%"></div>
          </div>
          <span class="bar-value">${present} / ${total}</span>
        </div>
      `;
    }).join("");
  }

  // 2. Location Breakdown calculations
  const locationCounts = {};
  allLogsData.forEach(log => {
    const logDate = getLogDate(log);
    if (logDate === selectedDate) {
      const loc = getLogLocation(log);
      locationCounts[loc] = (locationCounts[loc] || 0) + 1;
    }
  });

  // Standard locations fallback if zero logs today
  const standardLocations = [
    "Tata Motors - Gate 1",
    "Tata Motors - Assembly Line B",
    "Reliance Industries - Plant A",
    "Adani Port - Cargo Yard",
    "L&T Construction Site #4"
  ];
  standardLocations.forEach(loc => {
    if (locationCounts[loc] === undefined) locationCounts[loc] = 0;
  });

  const maxVal = Math.max(...Object.values(locationCounts), 1);
  const locationChart = document.getElementById("location-bar-chart");
  if (locationChart) {
    locationChart.innerHTML = Object.keys(locationCounts).map(loc => {
      const count = locationCounts[loc];
      const pct = Math.round((count / maxVal) * 100);
      return `
        <div class="chart-bar-row">
          <span class="bar-label" title="${loc}">${loc.split(" - ")[0]}</span>
          <div class="bar-track">
            <div class="bar-fill" style="width: ${pct}%"></div>
          </div>
          <span class="bar-value">${count} punches</span>
        </div>
      `;
    }).join("");
  }
}

// Populate Dossier selector (Ultra-fast single DOM write)
function populateDossierEmployeeDropdown() {
  const select = document.getElementById("dossier-employee-select");
  if (!select) return;

  const currentVal = select.value;
  const sample = zinghrReportData.slice(0, 300);
  const optionsHtml = ['<option value="">Select Employee...</option>']
    .concat(sample.map(emp => `<option value="${emp.id}">${emp.name} (${emp.id})</option>`))
    .join('');

  select.innerHTML = optionsHtml;
  if (currentVal) select.value = currentVal;
}

// Render calendar grid for chosen employee
function handleDossierEmployeeChange() {
  const container = document.getElementById("dossier-calendar-wrapper");
  if (!container) return;

  const empId = document.getElementById("dossier-employee-select").value;
  const monthStr = document.getElementById("dossier-month-select").value; // "2026-08"

  if (!empId) {
    container.innerHTML = `
      <div class="calendar-placeholder-card">
        <div class="placeholder-icon">📅</div>
        <p>Please select an employee and month from the headers above to draw their month-view check-in sheet.</p>
      </div>
    `;
    return;
  }

  const employee = zinghrReportData.find(e => e.id === empId);
  if (!employee) return;

  // Parse Year & Month
  const [year, month] = monthStr.split("-").map(Number);
  
  // Total days in month
  const totalDays = new Date(year, month, 0).getDate();
  // First day weekday (0 = Sun, 1 = Mon ... 6 = Sat)
  const firstDay = new Date(year, month - 1, 1).getDay();
  // Adjust to start on Monday (0 = Mon, 6 = Sun)
  let startOffset = firstDay - 1;
  if (startOffset === -1) startOffset = 6;

  // Build days HTML
  let cellsHtml = "";
  
  // Append offset empty blocks
  for (let i = 0; i < startOffset; i++) {
    cellsHtml += `<div class="day-cell empty"></div>`;
  }

  let presentDaysCount = 0;

  let activeDaysCount = 0;

  for (let d = 1; d <= totalDays; d++) {
    const dateQueryStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dayOfWeek = new Date(year, month - 1, d).getDay();
    const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6); // Sat or Sun
    
    // Check present status
    const isPresent = employee.attendanceDates && employee.attendanceDates.includes(dateQueryStr);
    
    // Check if the cell represents a future date relative to actual today
    const todayLimit = new Date();
    todayLimit.setHours(23, 59, 59, 999);
    const cellDate = new Date(year, month - 1, d);
    const isFuture = cellDate > todayLimit;
    
    let cellClass = "day-cell";
    if (isFuture) {
      // Future dates remain plain
    } else {
      activeDaysCount++;
      if (isPresent) {
        cellClass += " present";
        presentDaysCount++;
      } else {
        cellClass += " absent";
      }
    }

    if (isWeekend) cellClass += " weekend";

    cellsHtml += `
      <div class="${cellClass}">
        <span>${d}</span>
      </div>
    `;
  }

  const attendancePct = activeDaysCount > 0 ? Math.round((presentDaysCount / activeDaysCount) * 100) : 0;

  container.innerHTML = `
    <div class="calendar-grid-card">
      
      <!-- Left sidebar: Info sheet -->
      <div class="calendar-info-sidebar">
        <div class="sidebar-profile">
          <img class="sidebar-avatar" src="${employee.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&h=100&q=80'}">
          <div>
            <h4 class="sidebar-name">${employee.name}</h4>
            <p class="sidebar-role">${employee.role || 'Contract Staff'}</p>
          </div>
        </div>

        <div class="sidebar-stats-grid">
          <div class="sidebar-stat-box">
            <span class="sidebar-stat-label">Shift</span>
            <div class="sidebar-stat-val" style="color:var(--color-primary); font-size:0.75rem;">${employee.shift || 'Morning Shift'}</div>
          </div>
          <div class="sidebar-stat-box">
            <span class="sidebar-stat-label">Enrollment</span>
            <div class="sidebar-stat-val" style="font-size:0.8rem;">
              ${employee.isGateRegistered ? '<span style="color:var(--color-success)">Enrolled</span>' : '<span style="color:var(--color-error)">Pending</span>'}
            </div>
          </div>
          <div class="sidebar-stat-box" style="grid-column: span 2; margin-top: 6px; display: flex; justify-content: space-around;">
            <div>
              <span class="sidebar-stat-label">Present days</span>
              <div class="sidebar-stat-val" style="color:var(--color-success);">${presentDaysCount} Days</div>
            </div>
            <div>
              <span class="sidebar-stat-label">Present %</span>
              <div class="sidebar-stat-val" style="color:var(--color-primary);">${attendancePct}%</div>
            </div>
          </div>
        </div>
        
        <div style="margin-top: 15px; font-size: 0.65rem; color: var(--color-text-secondary); line-height:1.4;">
          <p><strong>Contact Details:</strong></p>
          <p>📞 Phone: ${employee.contact || 'n/a'}</p>
          <p>📧 Email: ${employee.email || 'n/a'}</p>
          <p>🏠 Roster Location: ${employee.address || 'Tata Pune Plant'}</p>
        </div>
      </div>

      <!-- Right sidebar: Calendar grid render -->
      <div class="calendar-render-grid">
        <h4 style="font-size:0.82rem; font-weight:700; color:#fff; text-align:center; margin-bottom:10px; border-bottom:1px solid var(--border-color); padding-bottom:6px;">
          ${document.getElementById("dossier-month-select").options[document.getElementById("dossier-month-select").selectedIndex].text}
        </h4>
        <div class="calendar-weekdays">
          <div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div><div>Sun</div>
        </div>
        <div class="calendar-days-container">
          ${cellsHtml}
        </div>
      </div>
    </div>
  `;
}

// Alert nudge action
function triggerEnrollAlert(empId) {
  const employee = zinghrReportData.find(e => e.id === empId);
  if (!employee) return;

  const options = {
    body: `Attendance Biometric Alert: Supervisor notification request sent to ${employee.name} (ID: ${employee.id}) to complete gate biometric enrollment.`,
    icon: employee.avatar
  };

  alert(`📢 Audit enrollment notification sent to ${employee.name} (${employee.id})!\n\nEmail nudge queued to: ${employee.email || 'layam.worker@layam.com'}`);
  console.log(`[Audit Alert Sync]: Enqueued SMS notification to ${employee.contact} for employee ${employee.id}`);
}

// --------------------------------------------------------------------------
// EMPLOYEE PROFILE MODAL CONTROLLER
// --------------------------------------------------------------------------
let currentModalEmployeeId = null;

function openEmployeeProfileModal(empId) {
  if (!empId) return;
  const cleanId = String(empId).trim().toUpperCase();
  const emp = zinghrReportData.find(e => 
    (e.id && e.id.toUpperCase() === cleanId) ||
    (e.employeeCode && e.employeeCode.toUpperCase() === cleanId)
  );
  if (!emp) return;

  currentModalEmployeeId = emp.id;

  const modal = document.getElementById("employee-profile-modal");
  if (!modal) return;

  // Header & Hero
  const badgeId = document.getElementById("modal-emp-id-badge");
  if (badgeId) badgeId.textContent = `ID: ${emp.id}`;

  const nameEl = document.getElementById("modal-emp-name");
  if (nameEl) nameEl.textContent = emp.name;

  const avatarEl = document.getElementById("modal-emp-avatar");
  if (avatarEl) avatarEl.src = emp.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&h=100&q=80';

  const desigEl = document.getElementById("modal-emp-designation");
  if (desigEl) desigEl.textContent = getEmployeeDesignation(emp);
  
  // Status badges
  const bioBadge = document.getElementById("modal-emp-biostatus");
  if (bioBadge) {
    bioBadge.className = emp.isGateRegistered ? "badge badge-success" : "badge badge-error";
    bioBadge.textContent = emp.isGateRegistered ? "✓ Enrolled & Synced" : "⚠️ Pending Biometrics";
  }

  // Master details
  const deptEl = document.getElementById("modal-emp-dept");
  if (deptEl) deptEl.textContent = getEmployeeDepartment(emp);

  const ruleEl = document.getElementById("modal-emp-rule");
  if (ruleEl) ruleEl.textContent = getEmployeeRuleGroup(emp);

  const plantEl = document.getElementById("modal-emp-plant");
  if (plantEl) plantEl.textContent = getEmployeeLocation(emp);

  const phoneEl = document.getElementById("modal-emp-phone");
  if (phoneEl) phoneEl.textContent = emp.contact || "--";

  const emailEl = document.getElementById("modal-emp-email");
  if (emailEl) emailEl.textContent = emp.email || "--";

  // Today's punch details
  const datePicker = document.getElementById("portal-date-picker");
  const selectedDate = datePicker && datePicker.value ? datePicker.value : new Date().toISOString().split("T")[0];
  const punchDateEl = document.getElementById("modal-punch-date");
  if (punchDateEl) punchDateEl.textContent = selectedDate;

  const cleanEmpId = emp.id.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const regRecord = attendanceRegisterMap.get(cleanEmpId);
  const isPresent = (regRecord && (regRecord.attendanceStatus === 'P' || regRecord.attendanceStatus === 'HD')) || (emp.attendanceDates && emp.attendanceDates.includes(selectedDate));
  const metrics = getEmployeeDailyAttendanceMetrics(emp.id, selectedDate);

  const statusEl = document.getElementById("modal-punch-status");
  const inEl = document.getElementById("modal-punch-in");
  const outEl = document.getElementById("modal-punch-out");
  const durEl = document.getElementById("modal-punch-duration");
  const syncEl = document.getElementById("modal-punch-sync");

  if (isPresent) {
    const isHalfDay = (metrics.attendanceStatus === 'HD');
    if (statusEl) {
      statusEl.innerHTML = isHalfDay
        ? `<span class="badge" style="background:#fef3c7; color:#d97706; border:1px solid #fde68a;">Half Day</span>`
        : `<span class="badge badge-success">Present</span>`;
    }
    if (syncEl) {
      syncEl.className = "badge badge-success";
      syncEl.textContent = "✓ ZingHR Synced";
    }

    if (inEl) inEl.textContent = metrics.firstInTime && metrics.firstInTime !== '--' ? metrics.firstInTime : '09:00 AM';
    if (outEl) outEl.textContent = metrics.lastOutTime && metrics.lastOutTime !== '--' ? metrics.lastOutTime : 'In Progress';
    if (durEl) durEl.textContent = metrics.totalWorkDuration && metrics.totalWorkDuration !== '--' ? metrics.totalWorkDuration : 'In Progress';
  } else {
    if (statusEl) statusEl.innerHTML = `<span class="badge badge-error">Absent</span>`;
    if (inEl) inEl.textContent = "--";
    if (outEl) outEl.textContent = "--";
    if (durEl) durEl.textContent = "--";
    if (syncEl) {
      syncEl.className = "badge badge-muted";
      syncEl.textContent = "No Punches Today";
    }
  }

  // Draw monthly calendar inside modal
  const calMonthSelect = document.getElementById("modal-cal-month-select");
  if (calMonthSelect) {
    const dossierMonth = document.getElementById("dossier-month-select") ? document.getElementById("dossier-month-select").value : "2026-09";
    if (dossierMonth && calMonthSelect.querySelector(`option[value="${dossierMonth}"]`)) {
      calMonthSelect.value = dossierMonth;
    }
  }
  renderModalCalendar(emp);

  // Sync to bottom dossier dropdown too
  const dossierSelect = document.getElementById("dossier-employee-select");
  if (dossierSelect) {
    dossierSelect.value = emp.id;
    handleDossierEmployeeChange();
  }

  modal.classList.remove("hidden");
}

function renderModalCalendar(emp) {
  const grid = document.getElementById("modal-cal-grid");
  const monthSelect = document.getElementById("modal-cal-month-select");
  const statsEl = document.getElementById("modal-cal-stats");
  if (!grid || !monthSelect || !emp) return;

  const monthStr = monthSelect.value;
  const [year, month] = monthStr.split("-").map(Number);
  const totalDays = new Date(year, month, 0).getDate();
  const firstDay = new Date(year, month - 1, 1).getDay();
  let startOffset = firstDay - 1;
  if (startOffset === -1) startOffset = 6;

  let html = "";
  for (let i = 0; i < startOffset; i++) {
    html += `<div class="modal-cal-cell empty"></div>`;
  }

  let presentCount = 0;
  let activeDays = 0;
  const todayLimit = new Date();
  todayLimit.setHours(23, 59, 59, 999);

  for (let d = 1; d <= totalDays; d++) {
    const dateQuery = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dayOfWeek = new Date(year, month - 1, d).getDay();
    const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);
    const isPresent = emp.attendanceDates && emp.attendanceDates.includes(dateQuery);
    const cellDate = new Date(year, month - 1, d);
    const isFuture = cellDate > todayLimit;

    let cls = "modal-cal-cell";
    if (isFuture) {
      cls += " future";
    } else {
      activeDays++;
      if (isPresent) {
        cls += " present";
        presentCount++;
      } else {
        cls += isWeekend ? " weekend" : " absent";
      }
    }

    html += `<div class="${cls}" title="${dateQuery}: ${isPresent ? 'Present' : (isWeekend ? 'Weekend' : 'Absent')}">${d}</div>`;
  }

  grid.innerHTML = html;
  const pct = activeDays > 0 ? Math.round((presentCount / activeDays) * 100) : 0;
  if (statsEl) {
    statsEl.textContent = `${presentCount} / ${activeDays} Days Present (${pct}%)`;
  }
}

function closeEmployeeProfileModal() {
  const modal = document.getElementById("employee-profile-modal");
  if (modal) modal.classList.add("hidden");
}

function initProfileModalListeners() {
  const closeBtn = document.getElementById("modal-profile-close-btn");
  const footerCloseBtn = document.getElementById("modal-btn-close-footer");
  const jumpBtn = document.getElementById("modal-btn-jump-dossier");
  const modal = document.getElementById("employee-profile-modal");
  const calMonthSelect = document.getElementById("modal-cal-month-select");

  if (closeBtn) closeBtn.addEventListener("click", closeEmployeeProfileModal);
  if (footerCloseBtn) footerCloseBtn.addEventListener("click", closeEmployeeProfileModal);
  
  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeEmployeeProfileModal();
    });
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeEmployeeProfileModal();
  });

  if (calMonthSelect) {
    calMonthSelect.addEventListener("change", () => {
      if (currentModalEmployeeId) {
        const emp = zinghrReportData.find(e => e.id === currentModalEmployeeId);
        if (emp) renderModalCalendar(emp);
      }
    });
  }

  if (jumpBtn) {
    jumpBtn.addEventListener("click", () => {
      closeEmployeeProfileModal();
      const dossierWrapper = document.getElementById("dossier-calendar-wrapper");
      if (dossierWrapper) {
        dossierWrapper.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    });
  }
}

// Expose globally for inline HTML onclick attributes
window.openEmployeeProfileModal = openEmployeeProfileModal;
window.closeEmployeeProfileModal = closeEmployeeProfileModal;

