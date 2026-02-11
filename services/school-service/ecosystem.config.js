module.exports = {
  apps: [{
    name: 'school-service',
    script: './dist/index.js',
    cwd: '/Users/naingseiha/Documents/Stunity-Enterprise/services/school-service',
    env_file: '.env',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'development'
    }
  }]
};
