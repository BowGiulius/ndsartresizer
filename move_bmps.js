const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'app');
const destDir = path.join(__dirname, 'public', 'CoverDS');

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

const files = fs.readdirSync(srcDir);
let moved = 0;
for (const file of files) {
  if (file.toLowerCase().endsWith('.bmp')) {
    fs.renameSync(path.join(srcDir, file), path.join(destDir, file));
    moved++;
  }
}
console.log(`Moved ${moved} BMP files.`);
