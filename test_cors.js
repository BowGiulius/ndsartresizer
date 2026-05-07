const https = require('https');
https.request('https://archive.org/metadata/nds_apfix/files', { method: 'OPTIONS' }, (res) => {
  console.log(res.headers);
}).end();
