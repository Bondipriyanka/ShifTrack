const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const sIdx = html.indexOf('<div class="phone-inner">');
const eIdx = html.indexOf('<!-- RIGHT COLUMN');
const phoneHtml = html.substring(sIdx, eIdx);

const opens = (phoneHtml.match(/<div/g) || []).length;
const closes = (phoneHtml.match(/<\/div>/g) || []).length;
console.log('Inside phone-frame: div opens:', opens, 'div closes:', closes);
