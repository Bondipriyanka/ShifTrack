const http = require('http');

http.get('http://localhost:2000/api/zinghr/report', res => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    const data = JSON.parse(body);
    console.log('Report data length:', Array.isArray(data) ? data.length : data);
  });
});
