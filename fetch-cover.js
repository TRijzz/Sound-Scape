const fs = require('fs');
const https = require('https');
const path = require('path');

const searchTerm = 'dj khaled god did';
const apiUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(searchTerm)}&entity=album&limit=1`;
const outputLocationPath = path.resolve(__dirname, 'public', 'god_did_cover.png');

https.get(apiUrl, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      if (json.results && json.results.length > 0) {
        // Get high res image (replace 100x100 with 600x600)
        const artworkUrl = json.results[0].artworkUrl100.replace('100x100bb', '600x600bb');
        console.log('Downloading image from:', artworkUrl);
        
        const file = fs.createWriteStream(outputLocationPath);
        https.get(artworkUrl, (imgRes) => {
          imgRes.pipe(file);
          file.on('finish', () => {
            file.close();
            console.log('Download Completed');
          });
        });
      } else {
        console.error('No results found');
      }
    } catch (e) {
      console.error('Error parsing JSON:', e.message);
    }
  });
}).on('error', (err) => {
  console.error('Error calling API:', err.message);
});