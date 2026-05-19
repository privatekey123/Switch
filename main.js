const { app, BrowserWindow, desktopCapturer, ipcMain, screen } = require('electron');
const path = require('path');

let mainWindow;
let programWindow;

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile('index.html');
}

function createProgramWindow() {
  if (programWindow && !programWindow.isDestroyed()) {
    programWindow.focus();
    return;
  }

  const displays = screen.getAllDisplays();
  const external = displays.find((d) => d.id !== screen.getPrimaryDisplay().id);

  programWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    x: external ? external.bounds.x + 60 : undefined,
    y: external ? external.bounds.y + 60 : undefined,
    backgroundColor: '#000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  programWindow.loadFile('program.html');
}

ipcMain.handle('sources:list', async () => {
  const sources = await desktopCapturer.getSources({
    types: ['window', 'screen'],
    fetchWindowIcons: true,
    thumbnailSize: { width: 320, height: 180 }
  });

  return sources.map((s) => ({
    id: s.id,
    name: s.name,
    display_id: s.display_id || null,
    appIcon: s.appIcon ? s.appIcon.toDataURL() : null,
    thumb: s.thumbnail ? s.thumbnail.toDataURL() : null
  }));
});

ipcMain.handle('program:open', () => {
  createProgramWindow();
  return true;
});

ipcMain.on('program:stream-updated', (_event, streamId) => {
  if (programWindow && !programWindow.isDestroyed()) {
    programWindow.webContents.send('program:apply-stream', streamId);
  }
});

app.whenReady().then(() => {
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
