const { ipcMain } = require('electron');

/**
 * Registers an IPC handler safely by removing any previous handler on the same channel
 * to avoid "Attempted to register a second handler" exceptions during hot-reloads.
 * @param {string} channel
 * @param {function} listener
 */
function safeHandle(channel, listener) {
  ipcMain.removeHandler(channel);
  ipcMain.handle(channel, listener);
}

module.exports = {
  safeHandle
};
