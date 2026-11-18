import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isWindows = process.platform === 'win32';
const npmCmd = isWindows ? 'npm.cmd' : 'npm';
const npxCmd = isWindows ? 'npx.cmd' : 'npx';

console.log('----------------------------------------------------');
console.log(' 🚀 Starting FitManage Full-Stack Application...');
console.log('----------------------------------------------------');

// Start Express Backend
const serverCwd = path.join(__dirname, 'server');
const serverProcess = spawn('node', ['src/index.js'], {
  cwd: serverCwd,
  stdio: 'inherit',
  shell: true
});

// Start React + Vite Frontend
const clientCwd = path.join(__dirname, 'client');
const clientProcess = spawn(npxCmd, ['vite', '--host', '0.0.0.0', '--port', '3000'], {
  cwd: clientCwd,
  stdio: 'inherit',
  shell: true
});

function cleanup() {
  console.log('\nGracefully shutting down FitManage servers...');
  serverProcess.kill('SIGINT');
  clientProcess.kill('SIGINT');
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
