const https = require('https');
https.get('https://archive.org/metadata/nds_apfix/files', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    const list = JSON.parse(data).result.filter(f => f.name.includes('apfix'));
    console.log(`Total apfix files: ${list.length}`);
    console.log(list.slice(0, 5).map(f => f.name));
    
    // check if it has ID in the properties?
  });
});
