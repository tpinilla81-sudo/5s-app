import http from 'http';
import { spawn } from 'child_process';
import fs from 'fs';

console.log('Starting cloudflared tunnel...');

const tunnel = spawn('/home/z/my-project/cloudflared', [
  'tunnel', '--url', 'http://127.0.0.1:3000', '--retries', '5'
], {
  stdio: ['ignore', 'pipe', 'pipe']
});

let tunnelUrl = '';

tunnel.stdout.on('data', (data) => {
  const output = data.toString();
  process.stdout.write(output);
  
  const match = output.match(/https:\/\/[a-z0-9\-]+\.trycloudflare\.com/);
  if (match) {
    tunnelUrl = match[0];
    console.log('\n=============================================');
    console.log('  PUBLIC URL:', tunnelUrl);
    console.log('=============================================\n');
    fs.writeFileSync('/home/z/my-project/PUBLIC_URL.txt', tunnelUrl);
  }
});

tunnel.stderr.on('data', (data) => {
  const output = data.toString();
  const match = output.match(/https:\/\/[a-z0-9\-]+\.trycloudflare\.com/);
  if (match && !tunnelUrl) {
    tunnelUrl = match[0];
    console.log('\n=============================================');
    console.log('  PUBLIC URL:', tunnelUrl);
    console.log('=============================================\n');
    fs.writeFileSync('/home/z/my-project/PUBLIC_URL.txt', tunnelUrl);
  }
});

tunnel.on('close', (code) => {
  console.log('Tunnel process exited with code', code);
  process.exit(1);
});

setInterval(() => {
  if (tunnelUrl) {
    console.log('Tunnel active:', tunnelUrl, new Date().toISOString());
  }
}, 60000);
