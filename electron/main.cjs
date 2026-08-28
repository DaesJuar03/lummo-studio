/**
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
