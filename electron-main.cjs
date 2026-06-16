const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'AlphaPath',
    backgroundColor: '#0F1419',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });

  const indexPath = path.join(__dirname, 'dist', 'index.html');
  mainWindow.loadFile(indexPath);

  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
}

// Auto updater configuration
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

// Use GitHub proxy for China users
const PROXY_URLS = [
  'https://ghfast.top/',
  'https://mirror.ghproxy.com/',
];

function setProxyFeedURL() {
  try {
    const feedURL = autoUpdater.getFeedURL();
    console.log('Original feed URL:', feedURL);
    // Try proxy URLs
    for (const proxy of PROXY_URLS) {
      const proxiedURL = proxy + feedURL;
      autoUpdater.setFeedURL({ provider: 'generic', url: proxiedURL });
      console.log('Set proxy feed URL:', proxiedURL);
      return;
    }
  } catch (e) {
    console.log('Using default feed URL');
  }
}

function checkForUpdates() {
  setProxyFeedURL();
  autoUpdater.checkForUpdates().catch(err => {
    console.log('Update check failed:', err.message);
    // If proxy fails, try direct
    autoUpdater.setFeedURL({
      provider: 'github',
      owner: 'chriszhaoqk',
      repo: 'AlphaPath',
    });
    autoUpdater.checkForUpdates().catch(err2 => {
      console.log('Direct update check also failed:', err2.message);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('update-status', { type: 'error', message: '无法连接更新服务器，请检查网络' });
      }
    });
  });
}

// IPC handler for manual update check
ipcMain.handle('check-for-updates', () => {
  checkForUpdates();
  return { status: 'checking' };
});

autoUpdater.on('update-available', (info) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update-status', { type: 'available', version: info.version });
  }
  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: '发现新版本',
    message: `AlphaPath v${info.version} 已发布，是否立即下载更新？`,
    detail: '更新将在后台下载，下载完成后将提示您安装。',
    buttons: ['立即更新', '稍后提醒'],
    defaultId: 0,
    cancelId: 1,
  }).then(({ response }) => {
    if (response === 0) {
      autoUpdater.downloadUpdate();
    }
  });
});

autoUpdater.on('update-not-available', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update-status', { type: 'not-available' });
  }
  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: '已是最新版本',
    message: '当前已是最新版本，无需更新。',
    buttons: ['确定'],
  });
});

autoUpdater.on('download-progress', (progress) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.setProgressBar(progress.percent / 100);
    mainWindow.webContents.send('update-status', { type: 'progress', percent: Math.round(progress.percent) });
  }
});

autoUpdater.on('update-downloaded', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.setProgressBar(-1);
    mainWindow.webContents.send('update-status', { type: 'downloaded' });
  }
  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: '更新已就绪',
    message: '新版本已下载完成，重启应用即可完成更新。',
    detail: '点击"立即重启"将关闭应用并安装更新。',
    buttons: ['立即重启', '稍后安装'],
    defaultId: 0,
    cancelId: 1,
  }).then(({ response }) => {
    if (response === 0) {
      autoUpdater.quitAndInstall();
    }
  });
});

autoUpdater.on('error', (err) => {
  console.error('Auto-updater error:', err.message);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update-status', { type: 'error', message: err.message });
  }
});

app.whenReady().then(() => {
  createWindow();
  // Check for updates after 3 seconds
  setTimeout(() => { checkForUpdates(); }, 3000);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
