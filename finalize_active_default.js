const fs = require('fs');
const path = require('path');

// 1. Update portal.js
let portalJs = fs.readFileSync(path.join(__dirname, 'portal.js'), 'utf8');
portalJs = portalJs.replace(/\r\n/g, '\n');

portalJs = portalJs.replace(/let currentSelectedTab = "[^"]*";/, 'let currentSelectedTab = "active";');
portalJs = portalJs.replace(/let currentAttTab = "[^"]*";/, 'let currentAttTab = "active";');

fs.writeFileSync(path.join(__dirname, 'portal.js'), portalJs, 'utf8');
fs.writeFileSync(path.join(__dirname, 'www', 'portal.js'), portalJs, 'utf8');

// 2. Update portal.html
let portalHtml = fs.readFileSync(path.join(__dirname, 'portal.html'), 'utf8');
portalHtml = portalHtml.replace(/\r\n/g, '\n');

// Set active tab on Employee Details Table
portalHtml = portalHtml.replace(
  '<button class="tab-btn active" id="audit-tab-all">All</button>',
  '<button class="tab-btn" id="audit-tab-all">All</button>'
);
portalHtml = portalHtml.replace(
  '<button class="tab-btn" id="audit-tab-active"',
  '<button class="tab-btn active" id="audit-tab-active"'
);

// Set active tab on Daily Attendance Table
portalHtml = portalHtml.replace(
  '<button class="tab-btn active" id="att-tab-all">All Roster (27,762)</button>',
  '<button class="tab-btn" id="att-tab-all">All Roster (27,762)</button>'
);
portalHtml = portalHtml.replace(
  '<button class="tab-btn" id="att-tab-active">Active (11,287)</button>',
  '<button class="tab-btn active" id="att-tab-active">Active (11,287)</button>'
);

fs.writeFileSync(path.join(__dirname, 'portal.html'), portalHtml, 'utf8');
fs.writeFileSync(path.join(__dirname, 'www', 'portal.html'), portalHtml, 'utf8');

console.log("Updated active tabs as primary default in portal.js and portal.html");
