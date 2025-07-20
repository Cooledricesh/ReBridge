module.exports = {
  apps: [
    {
      name: 'rebridge-web',
      cwd: './apps/web',
      script: 'npm',
      args: 'run dev',
      env: {
        NODE_ENV: 'development',
        DATABASE_URL: 'postgresql://rebridge:rebridge_dev_password@localhost:5432/rebridge_dev?schema=public',
        REDIS_URL: 'redis://localhost:6379',
        NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
        NEXTAUTH_URL: 'http://localhost:3000',
        NEXTAUTH_SECRET: 'development-secret-key-32-bytes-long',
        PATH: process.env.PATH + ':/root/.local/share/pnpm'
      },
      watch: false,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000
    },
    {
      name: 'rebridge-crawler',
      cwd: './apps/crawler',
      script: 'npm',
      args: 'run dev',
      env: {
        NODE_ENV: 'development',
        DATABASE_URL: 'postgresql://rebridge:rebridge_dev_password@localhost:5432/rebridge_dev?schema=public',
        REDIS_URL: 'redis://localhost:6379',
        PATH: process.env.PATH + ':/root/.local/share/pnpm'
      },
      watch: false,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000
    }
  ]
};