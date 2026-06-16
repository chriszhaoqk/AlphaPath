const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'AlphaPath',
    backgroundColor: '#0F1419',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // In packaged app, resources are inside app.asar
  // __dirname points to the app's root where electron-main.js lives
  const indexPath = path.join(__dirname, 'dist', 'index.html');
  console.log('Loading file from:', indexPath);
  win.loadFile(indexPath);

  // Open DevTools in development
  if (process.env.NODE_ENV === 'development') {
    win.webContents.openDevTools();
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
