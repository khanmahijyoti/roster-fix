require('dotenv').config();
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Found ✓' : 'Not found ✗');
console.log('Full URL:', process.env.DATABASE_URL);
