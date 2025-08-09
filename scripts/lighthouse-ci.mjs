#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32', ...opts });
    p.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} ${args.join(' ')} exited with code ${code}`));
    });
  });
}

async function waitForServer(url, tries = 50, intervalMs = 200) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch {}
    await delay(intervalMs);
  }
  throw new Error(`Preview server not reachable at ${url}`);
}

async function main() {
  const port = process.env.LH_PORT || '4173';
  const url = `http://localhost:${port}`;

  console.log('Building production bundle...');
  await run('npx', ['vite', 'build']);

  console.log(`Starting preview server on ${url}...`);
  const preview = spawn('npx', ['vite', 'preview', '--port', port, '--strictPort'], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  try {
    await waitForServer(url);
    console.log('Running Lighthouse (desktop preset)...');
    await run('npx', ['lighthouse', url, '--preset=desktop', '--output=html', '--output-path=./lh-report.html', '--quiet']);
    console.log('Lighthouse report saved to ./lh-report.html');
  } finally {
    preview.kill('SIGTERM');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
