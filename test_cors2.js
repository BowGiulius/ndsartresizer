const https = require('https');
https.request('https://archive.org/download/nds_apfix/apfix/', { method: 'OPTIONS' }, (res) => {
  console.log('Download headers:', res.headers);
}).end();
