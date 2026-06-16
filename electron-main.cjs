const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');
const https = require('https');
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

// ============ Hybrid Update: Custom check + electron-updater install ============
const CURRENT_VERSION = app.getVersion();
const GITHUB_OWNER = 'chriszhaoqk';
const GITHUB_REPO = 'AlphaPath';

const DOWNLOAD_PROXIES = [
  'https://ghfast.top/',
  'https://gh-proxy.com/',
  'https://ghproxy.cc/',
];

autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

function httpGet(url, timeout = 15000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timeout: ${url}`));
    }, timeout);

    const lib = url.startsWith('https') ? require('https') : require('http');
    lib.get(url, { headers: { 'User-Agent': 'AlphaPath-Updater' } }, (res) => {
      clearTimeout(timer);
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return httpGet(res.headers.location, timeout).then(resolve).catch(reject);
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

async function fetchLatestVersion() {
  // Method 1: jsDelivr CDN (works in China, fast and reliable)
  try {
    const data = await httpGet(`https://cdn.jsdelivr.net/gh/${GITHUB_OWNER}/${GITHUB_REPO}@main/version.json`, 8000);
    const info = JSON.parse(data);
    if (info.version) {
      return info.version;
    }
  } catch (err) {
    console.log('jsDelivr CDN failed:', err.message);
  }

  // Method 2: GitHub API directly (works with VPN)
  try {
    const data = await httpGet(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`, 10000);
    const release = JSON.parse(data);
    if (release.tag_name) {
      return release.tag_name.replace(/^v/, '');
    }
  } catch (err) {
    console.log('GitHub API failed:', err.message);
  }

  // Method 3: Parse release page HTML
  try {
    const html = await httpGet(`https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`, 10000);
    const tagMatch = html.match(/\/releases\/tag\/v?([\d.]+)/);
    if (tagMatch) {
      return tagMatch[1];
    }
  } catch (err) {
    console.log('GitHub HTML parse failed:', err.message);
  }

  throw new Error('无法连接更新服务器，请检查网络连接');
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

// Set electron-updater feed URL through proxy
function setProxiedFeedURL(version) {
  const baseUrl = `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases/download/v${version}/`;

  // Try each proxy
  for (const proxy of DOWNLOAD_PROXIES) {
    const proxyUrl = proxy + baseUrl;
    try {
      autoUpdater.setFeedURL({
        provider: 'generic',
        url: proxyUrl,
      });
      console.log('Set feed URL:', proxyUrl);
      return true;
    } catch (err) {
      console.log(`Proxy ${proxy} failed:`, err.message);
    }
  }

  // Fallback: direct GitHub
  try {
    autoUpdater.setFeedURL({
      provider: 'github',
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO,
    });
    console.log('Using direct GitHub feed');
    return true;
  } catch (err) {
    console.log('Direct GitHub also failed:', err.message);
    return false;
  }
}

// electron-updater events
autoUpdater.on('update-available', (info) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update-status', { type: 'available', version: info.version });
  }
  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: '发现新版本',
    message: `AlphaPath v${info.version} 已发布，是否立即下载更新？`,
    detail: '更新将在后台下载，下载完成后提示您重启安装。',
    buttons: ['立即更新', '稍后提醒'],
    defaultId: 0,
    cancelId: 1,
  }).then(({ response }) => {
    if (response === 0) {
      autoUpdater.downloadUpdate();
    }
  });
});

autoUpdater.on('download-progress', (progress) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.setProgressBar(progress.percent / 100);
    mainWindow.webContents.send('update-status', {
      type: 'progress',
      percent: Math.round(progress.percent),
    });
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

autoUpdater.on('update-not-available', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update-status', { type: 'not-available', version: CURRENT_VERSION });
  }
});

autoUpdater.on('error', (err) => {
  console.error('Auto-updater error:', err.message);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update-status', { type: 'error', message: err.message });
  }
});

async function checkForUpdates() {
  try {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-status', { type: 'checking' });
    }

    // Step 1: Custom check to get latest version (works in China)
    const latestVersion = await fetchLatestVersion();
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

    // Step 2: New version found - set proxy feed URL and let electron-updater handle it
    setProxiedFeedURL(latestVersion);

    // Step 3: Let electron-updater check and download
    await autoUpdater.checkForUpdates();
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
