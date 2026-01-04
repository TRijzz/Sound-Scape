const fs = require('fs');
const path = require('path');

const imagePath = path.resolve(__dirname, 'public', 'god_did_cover.png');
const svgPath = path.resolve(__dirname, 'src/assets/GOD_DID_VINYL.svg');

try {
  const imageBuffer = fs.readFileSync(imagePath);
  const base64Image = imageBuffer.toString('base64');
  const mimeType = 'image/jpeg'; // The file from iTunes is .jpg

  let svgContent = fs.readFileSync(svgPath, 'utf8');

  // Replace the href
  // Previous: href="/god_did_cover.png"
  // New: href="data:image/jpeg;base64,..."
  
  const newHref = `data:${mimeType};base64,${base64Image}`;
  
  // Regex to replace href attribute
  const updatedSvgContent = svgContent.replace(/href="[^"]*"/, `href="${newHref}"`);

  fs.writeFileSync(svgPath, updatedSvgContent);
  console.log('SVG updated successfully.');
} catch (err) {
  console.error('Error updating SVG:', err);
}