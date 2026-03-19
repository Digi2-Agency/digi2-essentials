#!/usr/bin/env node

/**
 * digi2 Build Script
 *
 * Minifies all source files from webflow-scripts/ into dist/
 * Mirrors the folder structure: dist/digi2-loader.min.js, dist/modules/popups.min.js, etc.
 *
 * Usage:
 *   npm run build           — one-time build
 *   npm run build:watch     — rebuild on file changes
 */

const { minify } = require('terser');
const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const SRC_DIR = path.join(__dirname, 'webflow-scripts');
const DIST_DIR = path.join(__dirname, 'dist');
const WATCH_FLAG = process.argv.includes('--watch');

const TERSER_OPTIONS = {
  compress: {
    drop_console: false,   // keep console.warn/error for debugging
    passes: 2,
    dead_code: true,
    collapse_vars: true,
    reduce_vars: true,
  },
  mangle: {
    reserved: ['digi2'],   // don't mangle the global namespace
  },
  format: {
    comments: false,       // strip all comments
    semicolons: true,
  },
  sourceMap: false,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getAllJsFiles(dir, base) {
  base = base || dir;
  let results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(getAllJsFiles(fullPath, base));
    } else if (entry.name.endsWith('.js')) {
      results.push({
        src: fullPath,
        relative: path.relative(base, fullPath),
      });
    }
  }

  return results;
}

function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  return (bytes / 1024).toFixed(1) + ' KB';
}

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------

async function buildFile(file) {
  const code = fs.readFileSync(file.src, 'utf8');
  const minName = file.relative.replace(/\.js$/, '.min.js');
  const outPath = path.join(DIST_DIR, minName);

  try {
    const result = await minify(code, TERSER_OPTIONS);

    ensureDir(outPath);
    fs.writeFileSync(outPath, result.code, 'utf8');

    const srcSize = Buffer.byteLength(code, 'utf8');
    const minSize = Buffer.byteLength(result.code, 'utf8');
    const savings = ((1 - minSize / srcSize) * 100).toFixed(0);

    console.log(
      `  ${file.relative.padEnd(30)} ${formatBytes(srcSize).padStart(10)} → ${formatBytes(minSize).padStart(10)}  (${savings}% smaller)`
    );
  } catch (err) {
    console.error(`  ERROR: ${file.relative} — ${err.message}`);
  }
}

async function buildAll() {
  const start = Date.now();
  const files = getAllJsFiles(SRC_DIR);

  console.log(`\n  digi2 build — ${files.length} files\n`);

  // Also copy raw (unminified) files to dist for source access
  for (const file of files) {
    const outPath = path.join(DIST_DIR, file.relative);
    ensureDir(outPath);
    fs.copyFileSync(file.src, outPath);
  }

  // Minify
  for (const file of files) {
    await buildFile(file);
  }

  const elapsed = Date.now() - start;
  console.log(`\n  Done in ${elapsed}ms`);

  // Summary
  let totalSrc = 0;
  let totalMin = 0;
  for (const file of files) {
    const minName = file.relative.replace(/\.js$/, '.min.js');
    totalSrc += fs.statSync(file.src).size;
    totalMin += fs.statSync(path.join(DIST_DIR, minName)).size;
  }
  console.log(`  Total: ${formatBytes(totalSrc)} → ${formatBytes(totalMin)} (${((1 - totalMin / totalSrc) * 100).toFixed(0)}% smaller)\n`);
}

// ---------------------------------------------------------------------------
// Watch mode
// ---------------------------------------------------------------------------

if (WATCH_FLAG) {
  console.log('  Watching webflow-scripts/ for changes...\n');
  buildAll();

  let debounce = null;
  fs.watch(SRC_DIR, { recursive: true }, (eventType, filename) => {
    if (!filename || !filename.endsWith('.js')) return;
    clearTimeout(debounce);
    debounce = setTimeout(() => {
      console.log(`\n  Changed: ${filename}`);
      buildAll();
    }, 200);
  });
} else {
  buildAll();
}
