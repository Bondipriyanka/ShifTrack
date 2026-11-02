const http = require('http');

http.get('http://localhost:2000/api/zinghr/employee-master?limit=5', res => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    const data = JSON.parse(body);
    console.log('Sample staff reporting managers:');
    data.employees.forEach(e => {
      console.log(`- ${e.employeeName} (${e.empCode}) [Plant: ${e.plantLocation}] => RepMgr: ${e.reportingManager}`);
    });
  });
});
