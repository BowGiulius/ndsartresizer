const fs = require('fs');
const fflate = require('fflate');

const data = fs.readFileSync('test.zip');
const unzipped = fflate.unzipSync(data);
console.log(Object.keys(unzipped));
