const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');

const distIndex = path.resolve(__dirname, 'dist', 'index.js');

// 1. If dist/index.js is missing (e.g. build step omitted in cloud dashboard), compile it on the fly
if (!fs.existsSync(distIndex)) {
  console.log('[HealthFreak] dist/index.js not found. Compiling TypeScript on the fly...');
  try {
    execSync('npx tsc', { cwd: __dirname, stdio: 'inherit' });
    console.log('[HealthFreak] TypeScript compilation finished successfully.');
  } catch (err) {
    console.warn('[HealthFreak] tsc compilation warning:', err.message);
  }
}

// 2. If dist/index.js exists, require it directly
if (fs.existsSync(distIndex)) {
  require(distIndex);
} else {
  // 3. Fallback: execute src/index.ts directly with tsx
  console.log('[HealthFreak] Launching with tsx runner fallback...');
  const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const child = spawn(npxCmd, ['tsx', 'src/index.ts'], { cwd: __dirname, stdio: 'inherit' });
  child.on('exit', (code) => process.exit(code || 0));
}
