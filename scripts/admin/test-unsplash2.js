const https = require('https');

const urls = [
  'https://images.unsplash.com/photo-1516483638261-f40af5eba323?q=80&w=1000&auto=format&fit=crop', // Italy/Pisa?
  'https://images.unsplash.com/photo-1503177119275-0aa32b3a9368?q=80&w=1000&auto=format&fit=crop', // Pyramids?
  'https://images.unsplash.com/photo-1509228627152-72ae9ae6848d?q=80&w=1000&auto=format&fit=crop', // Math?
  'https://images.unsplash.com/photo-1518133910546-b6c2fb7d79e3?q=80&w=1000&auto=format&fit=crop'  // Math?
];

urls.forEach(url => {
  https.get(url, (res) => {
    console.log(`${res.statusCode} - ${url}`);
  }).on('error', (e) => {
    console.error(e);
  });
});
