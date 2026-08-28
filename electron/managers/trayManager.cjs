const { app, Tray, Menu, shell } = require('electron');
const path = require('path');
const fs = require('fs');

let tray = null;

function createSystemTray({ appIconPath, getMainWindow, runningProcesses, stopProjectById, stopAllProjects, setQuittingAndQuit }) {
  if (tray) return tray;

  const iconPath = fs.existsSync(appIconPath) ? appIconPath : path.join(__dirname, '../../public/Lummo.png');
  tray = new Tray(iconPath);
  tray.setToolTip('Lummo Studio - Entornos de Desarrollo Locales');

  const updateTrayContextMenu = () => {
    if (!tray) return;

    const activeCount = runningProcesses.size;
    const activeItems = [];

    runningProcesses.forEach((item, projectId) => {
      const name = item.name || projectId;
      const port = item.port || 3000;
      activeItems.push({
        label: `  ⚡ ${name} (http://localhost:${port})`,
        submenu: [
          {
            label: `Abrir en navegador (http://localhost:${port})`,
            click: () => shell.openExternal(`http://localhost:${port}`)
          },
          {
            label: 'Detener Servidor',
            click: () => stopProjectById(projectId)
          }
        ]
      });
    });

    const menuTemplate = [
      { 
        label: `Lummo Studio v${app.getVersion ? app.getVersion() : '2.3.12'}`, 
        enabled: false 
      },
      {
        label: activeCount > 0 ? `🟢 ${activeCount} Servidor(es) en ejecución` : '⚪ Sin servidores activos',
        enabled: false
      },
      ...activeItems,
      { type: 'separator' },
      { 
        label: 'Abrir Lummo Studio', 
        click: () => {
          const mainWindow = getMainWindow();
          if (mainWindow) {
            mainWindow.show();
            mainWindow.focus();
          }
        } 
      },
      ...(activeCount > 0 ? [
        {
          label: 'Detener Todos los Servidores',
          click: () => stopAllProjects()
        }
      ] : []),
      { type: 'separator' },
      { 
        label: 'Salir de Lummo (Cerrar todos los procesos)', 
        click: () => {
          setQuittingAndQuit();
        } 
      }
    ];

    tray.setContextMenu(Menu.buildFromTemplate(menuTemplate));
  };

  updateTrayContextMenu();

  tray.on('click', () => {
    const mainWindow = getMainWindow();
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.focus();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    }
  });

  return {
    tray,
    updateTrayContextMenu
  };
}

module.exports = {
  createSystemTray
};
