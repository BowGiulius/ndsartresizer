const https = require('https');
https.get('https://archive.org/download/nds_apfix/apfix/', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    const matches = data.match(/href="([^"]+\.zip|[^"]+\.nds)"/g);
    console.log(matches.slice(0, 20));
    console.log(matches.find(m => m.includes('ADAE')));
  });
});
