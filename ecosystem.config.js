module.exports = {
  apps: [
    {
      name: '5s-app',
      script: 'npx',
      args: 'next start -p 3000',
      cwd: '/home/z/my-project',
      env: {
        DATABASE_URL: 'file:/home/z/my-project/db/custom.db',
        PORT: 3000,
        HOSTNAME: '0.0.0.0',
        NODE_ENV: 'production'
      },
      // Auto-restart on crash
      autorestart: true,
      // Max restarts within 10min window before stopping
      max_restarts: 10,
      restart_delay: 5000,
      // Watch for file changes (disabled for production stability)
      watch: false,
      // Memory limit — restart if exceeded
      max_memory_restart: '512M',
      // Logging
      error_file: '/home/z/my-project/logs/error.log',
      out_file: '/home/z/my-project/logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      // Graceful shutdown
      kill_timeout: 10000,
      listen_timeout: 30000,
      // Wait for app to be ready
      wait_ready: false,
    }
  ]
};
