const { spawn } = require('child_process');
const fs = require('fs');

const log = (msg) => {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  fs.appendFileSync('/home/z/my-project/daemon.log', line);
};

let child = null;
let restartCount = 0;

function startServer() {
  restartCount++;
  log(`Starting standalone server (attempt #${restartCount})...`);
  
  child = spawn(process.execPath, ['server.js'], {
    cwd: '/home/z/my-project/.next/standalone',
    env: {
      ...process.env,
      DATABASE_URL: 'file:/home/z/my-project/db/custom.db',
      PORT: '3000',
      HOSTNAME: '0.0.0.0',
      NODE_ENV: 'production',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  child.stdout.on('data', (data) => {
    fs.appendFileSync('/home/z/my-project/prod.log', data);
  });

  child.stderr.on('data', (data) => {
    fs.appendFileSync('/home/z/my-project/prod.log', data);
  });

  child.on('exit', (code, signal) => {
    log(`Server exited with code ${code}, signal ${signal}. Restarting in 1s...`);
    setTimeout(startServer, 1000);
  });

  log(`Server PID: ${child.pid}`);
}

// Keep the daemon alive
process.on('SIGTERM', () => log('Daemon SIGTERM - ignoring'));
process.on('SIGHUP', () => log('Daemon SIGHUP - ignoring'));
process.on('uncaughtException', (err) => log(`Daemon uncaught: ${err.message}`));

startServer();

// Health check - if no server on port 3000 after 10s, kill and restart
setInterval(() => {
  const http = require('http');
  const req = http.get('http://127.0.0.1:3000', (res) => {
    // Server is healthy
  });
  req.on('error', () => {
    log('Health check failed - server not responding');
    if (child && child.pid) {
      try {
        process.kill(child.pid, 'SIGKILL');
      } catch (e) {}
    }
  });
  req.setTimeout(3000, () => {
    req.destroy();
  });
}, 10000);
