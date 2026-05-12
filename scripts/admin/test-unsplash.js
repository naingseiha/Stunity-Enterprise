const https = require('https');

const urls = [
  'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?q=80&w=1000&auto=format&fit=crop', // Paris/Eiffel
  'https://images.unsplash.com/photo-1539605530755-93df4df1918a?q=80&w=1000&auto=format&fit=crop', // Pisa
  'https://images.unsplash.com/photo-1539650116574-8efeb43e2b50?q=80&w=1000&auto=format&fit=crop', // Math/Science
  'https://images.unsplash.com/photo-1507413245164-6160d8298b31?q=80&w=1000&auto=format&fit=crop'  // Science/Astronomy
];

urls.forEach(url => {
  https.get(url, (res) => {
    console.log(`${res.statusCode} - ${url}`);
  }).on('error', (e) => {
    console.error(e);
  });
});
