const https = require('https');
https.request('https://archive.org/download/nds_apfix/apfix/Pokemon%20-%20White%20Version%20%28USA%2C%20Europe%29%20%28NDSi%20Enhanced%29_apfix.zip', {
  headers: { 'Origin': 'http://localhost:3000' }
}, (res) => {
  console.log("Status:", res.statusCode);
  console.log("Headers:", res.headers);
  if (res.statusCode === 302) {
     https.request(res.headers.location, { headers: { 'Origin': 'http://localhost:3000' }}, (res2) => {
         console.log("Redirect Status:", res2.statusCode);
         console.log("Redirect Headers:", res2.headers);
     }).end();
  }
}).end();
