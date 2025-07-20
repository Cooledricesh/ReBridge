module.exports = {
  apps: [
    {
      name: 'rebridge-web',
      script: 'pnpm',
      args: 'start',
      cwd: './apps/web',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        PATH: process.env.PATH + ':/root/.local/share/pnpm'
      },
      error_file: './logs/web-error.log',
      out_file: './logs/web-out.log',
      log_file: './logs/web-combined.log',
      time: true
    },
    {
      name: 'rebridge-crawler', 
      script: 'pnpm',
      args: 'start',
      cwd: './apps/crawler',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PATH: process.env.PATH + ':/root/.local/share/pnpm'
      },
      error_file: './logs/crawler-error.log',
      out_file: './logs/crawler-out.log',
      log_file: './logs/crawler-combined.log',
      time: true,
      cron_restart: '0 */6 * * *'  // Restart every 6 hours
    }
  ]
};