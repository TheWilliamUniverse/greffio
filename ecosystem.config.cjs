module.exports = {
  apps: [
    {
      name: 'greffio-api',
      script: 'server/index.js',
      cwd: '/opt/greffio',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      autorestart: true,
      max_restarts: 20,
      restart_delay: 3000,
      time: true,
      env: {
        NODE_ENV: 'production',
        PORT: 8787,
        // Aligné avec .env prod (S3) — lu avant dotenv par objectStorage au boot
        DOCUMENT_STORAGE_DRIVER: 's3',
      },
      error_file: '/var/log/greffio/greffio-api-error.log',
      out_file: '/var/log/greffio/greffio-api-out.log',
      merge_logs: true,
    },
  ],
};
