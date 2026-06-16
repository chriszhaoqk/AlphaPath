const { app, BrowserWindow, dialog, ipcMain, shell } = require('electron');
const path = require('path');
const https = require('https');

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

// ============ Custom Update Checker (China-friendly) ============
const CURRENT_VERSION = app.getVersion();
const GITHUB_OWNER = 'chriszhaoqk';
const GITHUB_REPO = 'AlphaPath';

// Proxy URLs for China (tried in order)
const API_PROXIES = [
  'https://ghfast.top/',
  'https://mirror.ghproxy.com/',
  '',
];

function httpGet(url) {
  return new Promise((resolve, reject) => {
    const timeout = 15000;
    const timer = setTimeout(() => {
      reject(new Error(`Request timeout: ${url}`));
    }, timeout);

    https.get(url, { headers: { 'User-Agent': 'AlphaPath-Updater' } }, (res) => {
      clearTimeout(timer);
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return httpGet(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve(data));
    }).on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

async function fetchLatestRelease() {
  const apiUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`;
  const errors = [];

  for (const proxy of API_PROXIES) {
    const url = proxy + apiUrl;
    try {
      console.log('Trying update URL:', url);
      const data = await httpGet(url);
      const release = JSON.parse(data);
      return release;
    } catch (err) {
      console.log(`Proxy ${proxy || 'direct'} failed:`, err.message);
      errors.push(err.message);
    }
  }
  throw new Error('All update sources failed: ' + errors.join('; '));
}

function compareVersions(v1, v2) {
  const parts1 = v1.replace(/^v/, '').split('.').map(Number);
  const parts2 = v2.replace(/^v/, '').split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const a = parts1[i] || 0;
    const b = parts2[i] || 0;
    if (a > b) return 1;
    if (a < b) return -1;
  }
  return 0;
}

function getPlatformAssetName() {
  const platform = process.platform;
  const arch = process.arch;
  if (platform === 'darwin') {
    return arch === 'arm64' ? '.dmg' : '.dmg';
  } else if (platform === 'win32') {
    return '.exe';
  } else {
    return '.AppImage';
  }
}

function getDownloadUrl(release) {
  const ext = getPlatformAssetName();
  const asset = release.assets.find(a => a.name.endsWith(ext) && !a.name.includes('.blockmap'));
  if (!asset) return null;

  // Try proxy download URLs
  const originalUrl = asset.browser_download_url;
  for (const proxy of API_PROXIES) {
    if (proxy) {
      return proxy + originalUrl;
    }
  }
  return originalUrl;
}

async function checkForUpdates() {
  try {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-status', { type: 'checking' });
    }

    const release = await fetchLatestRelease();
    const latestVersion = release.tag_name.replace(/^v/, '');

    console.log(`Current: ${CURRENT_VERSION}, Latest: ${latestVersion}`);

    if (compareVersions(latestVersion, CURRENT_VERSION) <= 0) {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('update-status', { type: 'not-available', version: CURRENT_VERSION });
      }
      dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: '已是最新版本',
        message: `当前版本 v${CURRENT_VERSION} 已是最新版本。`,
        buttons: ['确定'],
      });
      return;
    }

    // New version available
    const downloadUrl = getDownloadUrl(release);
    const releaseUrl = release.html_url;

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-status', { type: 'available', version: latestVersion, downloadUrl, releaseUrl });
    }

    const { response } = await dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: '发现新版本',
      message: `AlphaPath v${latestVersion} 已发布！`,
      detail: `当前版本: v${CURRENT_VERSION}\n最新版本: v${latestVersion}\n\n点击"前往下载"将打开下载页面。`,
      buttons: ['前往下载', '稍后提醒'],
      defaultId: 0,
      cancelId: 1,
    });

    if (response === 0) {
      // Open download page in browser (proxy link if available)
      const url = downloadUrl || releaseUrl;
      shell.openExternal(url);
    }
  } catch (err) {
    console.error('Update check error:', err.message);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-status', { type: 'error', message: '检查更新失败：' + err.message });
    }
  }
}

// IPC handler for manual update check
ipcMain.handle('check-for-updates', async () => {
  await checkForUpdates();
  return { status: 'checking' };
});

app.whenReady().then(() => {
  createWindow();
  // Auto check for updates after 5 seconds
  setTimeout(() => { checkForUpdates(); }, 5000);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
