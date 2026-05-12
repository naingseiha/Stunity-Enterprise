const https = require('https');

const urls = [
  'https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?q=80&w=1000&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1498307833015-e7b400441eb8?q=80&w=1000&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1512450550085-f5fceb8dbdcb?q=80&w=1000&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1552832230-c0197dd311b5?q=80&w=1000&auto=format&fit=crop', // Rome
  'https://images.unsplash.com/photo-1503917988258-f87a78e3c995?q=80&w=1000&auto=format&fit=crop', // Eiffel
];

urls.forEach(url => {
  https.get(url, (res) => {
    console.log(`${res.statusCode} - ${url}`);
  }).on('error', (e) => {
    console.error(e);
  });
});
