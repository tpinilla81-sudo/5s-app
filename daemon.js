const { spawn } = require('child_process');
const fs = require('fs');

const log = (msg) => {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  fs.appendFileSync('/home/z/my-project/daemon.log', line);
  console.log(line.trim());
};

function startServer() {
  log('Starting 5S server...');
  const child = spawn('node', ['server.js'], {
    cwd: '/home/z/my-project/.next/standalone',
    env: {
      ...process.env,
      DATABASE_URL: 'file:/home/z/my-project/db/custom.db',
      PORT: '3000',
      HOSTNAME: '0.0.0.0',
      NODE_ENV: 'production',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true,
  });

  child.stdout.on('data', (data) => {
    fs.appendFileSync('/home/z/my-project/prod.log', data);
  });

  child.stderr.on('data', (data) => {
    fs.appendFileSync('/home/z/my-project/prod.log', data);
  });

  child.on('exit', (code) => {
    log(`Server exited with code ${code}, restarting in 3s...`);
    setTimeout(startServer, 3000);
  });

  child.unref();
  log(`Server process PID: ${child.pid}`);
}

startServer();
