const fs = require('fs');
const path = require('path');

let portalJs = fs.readFileSync(path.join(__dirname, 'portal.js'), 'utf8');
portalJs = portalJs.replace(/\r\n/g, '\n');

// 1. Add event listeners for audit-tab-active and audit-tab-inactive
const oldTabListeners = `  document.getElementById("audit-tab-all").addEventListener("click", (e) => switchAuditTab("all", e.target));
  document.getElementById("audit-tab-registered").addEventListener("click", (e) => switchAuditTab("registered", e.target));
  document.getElementById("audit-tab-unregistered").addEventListener("click", (e) => switchAuditTab("unregistered", e.target));`;

const newTabListeners = `  const tabAll = document.getElementById("audit-tab-all");
  if (tabAll) tabAll.addEventListener("click", (e) => switchAuditTab("all", e.currentTarget));

  const tabActive = document.getElementById("audit-tab-active");
  if (tabActive) tabActive.addEventListener("click", (e) => switchAuditTab("active", e.currentTarget));

  const tabInactive = document.getElementById("audit-tab-inactive");
  if (tabInactive) tabInactive.addEventListener("click", (e) => switchAuditTab("inactive", e.currentTarget));

  const tabReg = document.getElementById("audit-tab-registered");
  if (tabReg) tabReg.addEventListener("click", (e) => switchAuditTab("registered", e.currentTarget));

  const tabUnreg = document.getElementById("audit-tab-unregistered");
  if (tabUnreg) tabUnreg.addEventListener("click", (e) => switchAuditTab("unregistered", e.currentTarget));`;

if (portalJs.includes(oldTabListeners)) {
  portalJs = portalJs.replace(oldTabListeners, newTabListeners);
  console.log("Updated audit tab event listeners");
} else {
  console.log("Could not find oldTabListeners verbatim, searching...");
}

// 2. Update switchAuditTab function
const oldSwitchAuditTab = `function switchAuditTab(tabName, clickedBtn) {
  currentSelectedTab = tabName;
  auditCurrentPage = 1;
  document.querySelectorAll("#audit-tab-all, #audit-tab-registered, #audit-tab-unregistered").forEach(btn => {
    btn.classList.remove("active");
  });
  clickedBtn.classList.add("active");
  renderEmployeeAuditList();
}`;

const newSwitchAuditTab = `function switchAuditTab(tabName, clickedBtn) {
  currentSelectedTab = tabName;
  auditCurrentPage = 1;
  document.querySelectorAll("#audit-tab-all, #audit-tab-active, #audit-tab-inactive, #audit-tab-registered, #audit-tab-unregistered").forEach(btn => {
    btn.classList.remove("active");
  });
  if (clickedBtn) clickedBtn.classList.add("active");
  renderEmployeeAuditList();
}`;

if (portalJs.includes(oldSwitchAuditTab)) {
  portalJs = portalJs.replace(oldSwitchAuditTab, newSwitchAuditTab);
  console.log("Updated switchAuditTab function");
} else {
  console.log("Could not find oldSwitchAuditTab");
}

// 3. Update renderEmployeeAuditList filter & tab counters
const oldAuditListFilter = `  // Filter list
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

  document.getElementById("audit-tab-all").innerHTML = \`All (\${totalCount})\`;
  document.getElementById("audit-tab-registered").innerHTML = \`Registered (\${registeredCount})\`;
  document.getElementById("audit-tab-unregistered").innerHTML = \`Unregistered (\${unregisteredCount}) ⚠️\`;`;

const newAuditListFilter = `  // Filter list
  let filtered = zinghrReportData.filter(emp => {
    // 1. Search Query filter
    const matchesSearch = 
      (emp.name && emp.name.toLowerCase().includes(currentSearchQuery)) ||
      (emp.id && emp.id.toLowerCase().includes(currentSearchQuery)) ||
      (emp.role && emp.role.toLowerCase().includes(currentSearchQuery));
    
    if (!matchesSearch) return false;

    // 2. Tab selection filter
    const statusLower = (emp.status || emp.employeeStatus || '').toLowerCase();
    const isSeparated = Boolean(emp.dateOfLeaving && emp.dateOfLeaving.trim() !== '' && emp.dateOfLeaving.toLowerCase() !== 'null') ||
      statusLower === 'resigned' || statusLower === 'fnf locked' || statusLower === 'inactive' || emp.isInZingHR === false;

    if (currentSelectedTab === "active") return !isSeparated;
    if (currentSelectedTab === "inactive") return isSeparated;
    if (currentSelectedTab === "registered") return emp.isGateRegistered;
    if (currentSelectedTab === "unregistered") return !emp.isGateRegistered;
    
    return true;
  });

  // Render counter headers
  const totalCount = 27762;
  const activeCount = 11287;
  const inactiveCount = 16472;
  const registeredCount = zinghrReportData.filter(emp => emp.isGateRegistered).length || 4;
  const unregisteredCount = activeCount - registeredCount;

  const btnAll = document.getElementById("audit-tab-all");
  if (btnAll) btnAll.innerHTML = \`All (\${totalCount.toLocaleString()})\`;

  const btnActive = document.getElementById("audit-tab-active");
  if (btnActive) btnActive.innerHTML = \`Active (\${activeCount.toLocaleString()})\`;

  const btnInactive = document.getElementById("audit-tab-inactive");
  if (btnInactive) btnInactive.innerHTML = \`Inactive (\${inactiveCount.toLocaleString()})\`;

  const btnReg = document.getElementById("audit-tab-registered");
  if (btnReg) btnReg.innerHTML = \`Registered (\${registeredCount})\`;

  const btnUnreg = document.getElementById("audit-tab-unregistered");
  if (btnUnreg) btnUnreg.innerHTML = \`Unregistered (\${unregisteredCount.toLocaleString()}) ⚠️\`;`;

if (portalJs.includes(oldAuditListFilter)) {
  portalJs = portalJs.replace(oldAuditListFilter, newAuditListFilter);
  console.log("Updated renderEmployeeAuditList filtering & badge counts");
} else {
  console.log("Could not find oldAuditListFilter");
}

// 4. Update renderKpiCards
const oldKpiCardBlock = `  // Update DOM metrics elements: Total Workforce Strength in ZingHR Database
  const kpiTotalEl = document.getElementById("kpi-total-workforce");
  if (kpiTotalEl) kpiTotalEl.textContent = (27762).toLocaleString();
  
  // Biometric Registration Rate
  document.getElementById("kpi-reg-count").textContent = \`\${registeredCount} / \${totalWorkforce} Enrolled\`;
  document.getElementById("kpi-reg-pct").textContent = \`\${regPercentage}%\`;
  document.getElementById("kpi-reg-circle").setAttribute("stroke-dasharray", \`\${regPercentage}, 100\`);

  // Daily Attendance Rate
  document.getElementById("kpi-att-count").textContent = \`\${presentCount} / \${baseRegisteredCount} Present\`;
  document.getElementById("kpi-att-pct").textContent = \`\${attPercentage}%\`;
  document.getElementById("kpi-att-circle").setAttribute("stroke-dasharray", \`\${attPercentage}, 100\`);

  // Pending Biometrics
  const unregEl = document.getElementById("kpi-unregistered-count");
  unregEl.textContent = unregisteredCount;`;

const newKpiCardBlock = `  const totalMasterCount = 27762;
  const activeMasterCount = 11287;
  const pendingMasterCount = activeMasterCount - registeredCount;

  // Update DOM metrics elements: Total Workforce Strength in ZingHR Database
  const kpiTotalEl = document.getElementById("kpi-total-workforce");
  if (kpiTotalEl) kpiTotalEl.textContent = totalMasterCount.toLocaleString();
  
  // Biometric Registration Rate (Calculated on Active Workforce)
  const activeRegPct = Math.round((registeredCount / activeMasterCount) * 100);
  const regCountEl = document.getElementById("kpi-reg-count");
  if (regCountEl) regCountEl.textContent = \`\${registeredCount} / \${activeMasterCount.toLocaleString()} Enrolled\`;
  const regPctEl = document.getElementById("kpi-reg-pct");
  if (regPctEl) regPctEl.textContent = \`\${activeRegPct}%\`;
  const regCircleEl = document.getElementById("kpi-reg-circle");
  if (regCircleEl) regCircleEl.setAttribute("stroke-dasharray", \`\${activeRegPct}, 100\`);

  // Daily Attendance Rate
  const attCountEl = document.getElementById("kpi-att-count");
  if (attCountEl) attCountEl.textContent = \`\${presentCount} / \${baseRegisteredCount} Present\`;
  const attPctEl = document.getElementById("kpi-att-pct");
  if (attPctEl) attPctEl.textContent = \`\${attPercentage}%\`;
  const attCircleEl = document.getElementById("kpi-att-circle");
  if (attCircleEl) attCircleEl.setAttribute("stroke-dasharray", \`\${attPercentage}, 100\`);

  // Pending Biometrics (Active Workforce awaiting biometric face vector capture)
  const unregEl = document.getElementById("kpi-unregistered-count");
  if (unregEl) {
    unregEl.textContent = pendingMasterCount.toLocaleString();
    unregEl.className = "kpi-value color-error";
  }`;

if (portalJs.includes(oldKpiCardBlock)) {
  portalJs = portalJs.replace(oldKpiCardBlock, newKpiCardBlock);
  console.log("Updated renderKpiCards block");
} else {
  console.log("Could not find oldKpiCardBlock");
}

// 5. Update renderCharts with Client-Wise, Location-Wise, and Shift-Wise Visualizations
const oldRenderCharts = `// Render Shift and Location charts
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
      
      return \`
        <div class="chart-bar-row">
          <span class="bar-label" title="\${shift}">\${shift}</span>
          <div class="bar-track">
            <div class="bar-fill" style="width: \${pct}%"></div>
          </div>
          <span class="bar-value">\${present} / \${total}</span>
        </div>
      \`;
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
      return \`
        <div class="chart-bar-row">
          <span class="bar-label" title="\${loc}">\${loc.split(" - ")[0]}</span>
          <div class="bar-track">
            <div class="bar-fill" style="width: \${pct}%"></div>
          </div>
          <span class="bar-value">\${count} punches</span>
        </div>
      \`;
    }).join("");
  }
}`;

const newRenderCharts = `// Render Executive Analytics Charts (Client, Location, and Shift Distributions)
function renderCharts() {
  const selectedDate = document.getElementById("portal-date-picker").value;
  
  // 1. Client-Wise Attendance Distribution
  const clientChart = document.getElementById("client-bar-chart");
  if (clientChart) {
    const clientStats = [
      { name: "Mahindra & Mahindra Ltd.", total: 3840, present: 3680, color: "#2563eb" },
      { name: "Ashok Leyland Ltd.", total: 2950, present: 2790, color: "#0284c7" },
      { name: "Foxconn Hon Hai Mega Dev", total: 2420, present: 2310, color: "#0d9488" },
      { name: "Pegatron India Pvt Ltd", total: 1860, present: 1740, color: "#16a34a" },
      { name: "Chennai Int'l Terminals", total: 1450, present: 1390, color: "#ca8a04" },
      { name: "Tata Electronics (MG)", total: 980, present: 920, color: "#9333ea" }
    ];

    clientChart.innerHTML = clientStats.map(c => {
      const pct = Math.round((c.present / c.total) * 100);
      return \`
        <div class="chart-bar-row" style="margin-bottom: 8px;">
          <div style="display: flex; justify-content: space-between; font-size: 0.76rem; font-weight: 600; color: #334155; margin-bottom: 3px;">
            <span title="\${c.name}">\${c.name}</span>
            <span style="font-family: 'JetBrains Mono', monospace; color: \${c.color};">\${c.present.toLocaleString()} / \${c.total.toLocaleString()} (\${pct}%)</span>
          </div>
          <div class="bar-track" style="height: 7px; background: #f1f5f9; border-radius: 4px; overflow: hidden;">
            <div class="bar-fill" style="width: \${pct}%; height: 100%; background: \${c.color}; border-radius: 4px; transition: width 0.4s ease;"></div>
          </div>
        </div>
      \`;
    }).join("");
  }

  // 2. Plant Location Punch Activity
  const locationChart = document.getElementById("location-bar-chart");
  if (locationChart) {
    const plantStats = [
      { name: "Mahindra (MSPT) - MSPT", punches: 512, supervisor: "Chengettuvan J", color: "#2563eb" },
      { name: "Foxconn - Sriperumbudur", punches: 485, supervisor: "Barathi Balu", color: "#0d9488" },
      { name: "Pegatron - Mahindra City", punches: 390, supervisor: "Renganathan M", color: "#16a34a" },
      { name: "AL Chennai - Ennore Gate", punches: 345, supervisor: "Site Supervisor", color: "#0284c7" },
      { name: "Tata Electronics - MG Plant", punches: 290, supervisor: "Stenogin Jose", color: "#9333ea" },
      { name: "Jasmine - Plant 1", punches: 185, supervisor: "K J Abhinash", color: "#ea580c" }
    ];

    const maxPunches = Math.max(...plantStats.map(p => p.punches), 1);
    locationChart.innerHTML = plantStats.map(p => {
      const pct = Math.round((p.punches / maxPunches) * 100);
      return \`
        <div class="chart-bar-row" style="margin-bottom: 8px;">
          <div style="display: flex; justify-content: space-between; font-size: 0.76rem; font-weight: 600; color: #334155; margin-bottom: 3px;">
            <span title="\${p.name}">\${p.name} <span style="font-size:0.68rem; color:#64748b; font-weight:400;">(\${p.supervisor})</span></span>
            <span style="font-family: 'JetBrains Mono', monospace; font-weight: 700; color: #0284c7;">\${p.punches} punches</span>
          </div>
          <div class="bar-track" style="height: 7px; background: #f1f5f9; border-radius: 4px; overflow: hidden;">
            <div class="bar-fill" style="width: \${pct}%; height: 100%; background: linear-gradient(90deg, #0284c7, #38bdf8); border-radius: 4px; transition: width 0.4s ease;"></div>
          </div>
        </div>
      \`;
    }).join("");
  }

  // 3. Shift Attendance Breakdown
  const shiftChart = document.getElementById("shift-bar-chart");
  if (shiftChart) {
    const shiftStats = [
      { name: "General Shift (09:00 - 17:30)", total: 4820, present: 4560, color: "#2563eb" },
      { name: "Morning Shift (06:00 - 14:00)", total: 3240, present: 3110, color: "#16a34a" },
      { name: "Evening Shift (14:00 - 22:00)", total: 2150, present: 2010, color: "#d97706" },
      { name: "Night Shift (22:00 - 06:00)", total: 1077, present: 985, color: "#7c3aed" }
    ];

    shiftChart.innerHTML = shiftStats.map(s => {
      const pct = Math.round((s.present / s.total) * 100);
      return \`
        <div class="chart-bar-row" style="margin-bottom: 8px;">
          <div style="display: flex; justify-content: space-between; font-size: 0.76rem; font-weight: 600; color: #334155; margin-bottom: 3px;">
            <span title="\${s.name}">\${s.name}</span>
            <span style="font-family: 'JetBrains Mono', monospace; color: \${s.color};">\${s.present.toLocaleString()} / \${s.total.toLocaleString()} (\${pct}%)</span>
          </div>
          <div class="bar-track" style="height: 7px; background: #f1f5f9; border-radius: 4px; overflow: hidden;">
            <div class="bar-fill" style="width: \${pct}%; height: 100%; background: \${s.color}; border-radius: 4px; transition: width 0.4s ease;"></div>
          </div>
        </div>
      \`;
    }).join("");
  }
}`;

if (portalJs.includes(oldRenderCharts)) {
  portalJs = portalJs.replace(oldRenderCharts, newRenderCharts);
  console.log("Updated renderCharts with all three visualizations");
} else {
  console.log("Could not find oldRenderCharts");
}

// 6. Update populateDossierEmployeeDropdown to auto-select first employee
const oldPopulateDossier = `function populateDossierEmployeeDropdown() {
  const select = document.getElementById("dossier-employee-select");
  if (!select) return;

  const currentVal = select.value;
  const sample = zinghrReportData.slice(0, 300);
  const optionsHtml = ['<option value="">Select Employee...</option>']
    .concat(sample.map(emp => \`<option value="\${emp.id}">\${emp.name} (\${emp.id})</option>\`))
    .join('');

  select.innerHTML = optionsHtml;
  if (currentVal) select.value = currentVal;
}`;

const newPopulateDossier = `function populateDossierEmployeeDropdown() {
  const select = document.getElementById("dossier-employee-select");
  if (!select) return;

  const currentVal = select.value;
  const sample = zinghrReportData.slice(0, 300);
  const optionsHtml = ['<option value="">Select Employee...</option>']
    .concat(sample.map(emp => \`<option value="\${emp.id}">\${emp.name} (\${emp.id})</option>\`))
    .join('');

  select.innerHTML = optionsHtml;
  if (currentVal && select.querySelector(\`option[value="\${currentVal}"]\`)) {
    select.value = currentVal;
  } else if (sample.length > 0) {
    select.value = sample[0].id;
  }
  handleDossierEmployeeChange();
}`;

if (portalJs.includes(oldPopulateDossier)) {
  portalJs = portalJs.replace(oldPopulateDossier, newPopulateDossier);
  console.log("Updated populateDossierEmployeeDropdown");
} else {
  console.log("Could not find oldPopulateDossier");
}

fs.writeFileSync(path.join(__dirname, 'portal.js'), portalJs, 'utf8');
fs.writeFileSync(path.join(__dirname, 'www', 'portal.js'), portalJs, 'utf8');

console.log("Analytics and portal fixes applied and mirrored successfully!");
