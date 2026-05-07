const https = require('https');
const fs = require('fs');

const fileUrl = 'https://archive.org/download/nds_apfix/apfix/Atsumete%21%20Kirby%20%28Japan%29_apfix.zip';
https.get(fileUrl, (res) => {
  if (res.statusCode === 302) {
    https.get(res.headers.location, (res2) => {
        res2.pipe(fs.createWriteStream('test.zip'));
    });
  } else {
    res.pipe(fs.createWriteStream('test.zip'));
  }
});
