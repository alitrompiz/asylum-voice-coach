#!/usr/bin/env node
import { readFileSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import zlib from 'node:zlib';

const require = createRequire(import.meta.url);

function fail(msg) {
  console.error(`\n\u274C ${msg}`);
  process.exit(1);
}

function ok(msg) {
  console.log(`\n\u2705 ${msg}`);
}

const budgetKb = Number(process.argv[2] || process.env.BUNDLE_BUDGET_KB || 350);
const distDir = path.resolve('dist');
const indexHtmlPath = path.join(distDir, 'index.html');

try {
  statSync(indexHtmlPath);
} catch {
  fail('dist/index.html not found. Run "npm run build" first.');
}

const html = readFileSync(indexHtmlPath, 'utf8');

// Extract first-load JS: module script + modulepreload links
const scriptSrcs = new Set();
const scriptRegex = /<script[^>]*type="module"[^>]*src="([^"]+\.js)"[^>]*><\/script>/g;
const preloadRegex = /<link[^>]*rel="modulepreload"[^>]*href="([^"]+\.js)"[^>]*>/g;

let m;
while ((m = scriptRegex.exec(html))) scriptSrcs.add(m[1]);
while ((m = preloadRegex.exec(html))) scriptSrcs.add(m[1]);

if (scriptSrcs.size === 0) {
  fail('No first-load JS detected in index.html');
}

function normalize(p) {
  if (p.startsWith('/')) return p.slice(1);
  return p;
}

let totalBytes = 0;
let totalGzip = 0;

for (const src of scriptSrcs) {
  const rel = normalize(src);
  const fp = path.join(distDir, rel);
  const buf = readFileSync(fp);
  const gz = zlib.gzipSync(buf, { level: 9 });
  totalBytes += buf.length;
  totalGzip += gz.length;
}

const toKb = (n) => Math.round((n / 1024) * 10) / 10;

console.log('First-load JS assets considered:');
for (const src of scriptSrcs) console.log(` - ${src}`);
console.log(`Uncompressed total: ${toKb(totalBytes)} KB`);
console.log(`Gzip total:        ${toKb(totalGzip)} KB`);

if (toKb(totalGzip) > budgetKb) {
  fail(`First-load JS (gzip) ${toKb(totalGzip)} KB exceeds budget ${budgetKb} KB`);
} else {
  ok(`First-load JS (gzip) ${toKb(totalGzip)} KB within budget ${budgetKb} KB`);
}
