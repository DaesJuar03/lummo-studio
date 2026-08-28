/**
 * Lummo Studio - Electron Bytecode Compiler
 * Compila el código fuente de Electron a Bytecode V8 binario (.jsc)
 * utilizando el runtime exacto de Electron para evitar descompilación e ingeniería inversa.
 */
const fs = require('fs');
const path = require('path');
const bytenode = require('bytenode');
const esbuild = require('esbuild');

const rootDir = path.join(__dirname, '..');
const electronDir = path.join(rootDir, 'electron');
const entryDev = path.join(electronDir, 'main.dev.cjs');
const tempBundle = path.join(electronDir, 'main.core.tmp.cjs');
const targetJsc = path.join(electronDir, 'main.core.jsc');
const bootstrapLoader = path.join(electronDir, 'main.cjs');

console.log('[1/3] Bundling Electron main process with esbuild...');

// 1. Bundle all internal electron modules into a single intermediate JS file
esbuild.buildSync({
  entryPoints: [entryDev],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  outfile: tempBundle,
  external: [
    'electron',
    'electron-updater',
    'bytenode',
    'mysql2',
    'pg',
    'ioredis',
    'express',
    'pidusage',
    'sql.js',
    'clsx',
    'framer-motion',
    'lucide-react',
    'tailwind-merge'
  ]
});

console.log('[2/3] Compiling bundle to V8 Bytecode (.jsc)...');

// 2. Compile to Bytecode using Electron V8
bytenode.compileFile({
  filename: tempBundle,
  output: targetJsc
});

// 3. Remove plaintext intermediate bundle
if (fs.existsSync(tempBundle)) {
  fs.unlinkSync(tempBundle);
}

// 4. Ensure bootstrap loader exists in electron/main.cjs
const loaderContent = `/**
 * Lummo Studio - Secure Electron Bootstrap Entry Point
 * En modo empaquetado: Carga el bytecode V8 (.jsc)
 * En modo desarrollo: Carga el código fuente (main.dev.cjs)
 */
const { app } = require('electron');
const bytenode = require('bytenode');
const path = require('path');
const fs = require('fs');

const bytecodePath = path.join(__dirname, 'main.core.jsc');

if (app && app.isPackaged && fs.existsSync(bytecodePath)) {
  require(bytecodePath);
} else {
  require('./main.dev.cjs');
}
`;

fs.writeFileSync(bootstrapLoader, loaderContent, 'utf8');

console.log('[3/3] Bytecode compiled successfully!');
console.log(` -> Generated: ${targetJsc} (${(fs.statSync(targetJsc).size / 1024).toFixed(2)} KB)`);
console.log(` -> Entry Point: ${bootstrapLoader}`);
