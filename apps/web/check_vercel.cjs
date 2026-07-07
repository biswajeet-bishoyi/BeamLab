const https = require('https');

https.get('https://beamstudio.vercel.app/workspace', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('--- HTML ---');
    console.log(data);
    
    // Extract JS URL
    const match = data.match(/src="(\/assets\/index-[^"]+\.js)"/);
    if (match) {
      const jsUrl = 'https://beamstudio.vercel.app' + match[1];
      console.log('\nFetching JS:', jsUrl);
      https.get(jsUrl, (jsRes) => {
        console.log('JS Content-Type:', jsRes.headers['content-type']);
        let jsData = '';
        jsRes.on('data', chunk => jsData += chunk);
        jsRes.on('end', () => {
          console.log('JS Length:', jsData.length);
          console.log('JS starts with:', jsData.substring(0, 50));
        });
      });
    }
  });
});
