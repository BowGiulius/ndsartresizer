import fs from 'fs';

async function testDownload() {
  // Use absolute URL since Next server is running on localhost:3000
  const url = 'http://localhost:3000/api/download?file=apfix/Pokemon%20-%20White%20Version%20%28USA%2C%20Europe%29%20%28NDSi%20Enhanced%29_apfix.zip';
  console.log("Fetching from:", url);
  try {
    const res = await fetch(url);
    console.log("Status:", res.status);
    console.log("Headers:", Object.fromEntries(res.headers.entries()));
    if (!res.ok) {
        const txt = await res.text();
        console.log("Error body:", txt);
        return;
    }
    
    // just read 100 bytes to see if it works
    const reader = res.body.getReader();
    const { value, done } = await reader.read();
    console.log("Received bytes:", value.length);
  } catch(e) {
    console.error("fetch failed", e);
  }
}

testDownload();
