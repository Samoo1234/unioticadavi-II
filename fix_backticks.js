const fs = require('fs');
const file = 'f:/system teste/otica-vision/src/components/cmv/FluxoEntradasGrid.tsx';
let data = fs.readFileSync(file, 'utf8');
data = data.replace(/\\`/g, '`');
fs.writeFileSync(file, data);
console.log('Done');
