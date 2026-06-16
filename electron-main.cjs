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

// Download proxies for China (only for file downloads)
const DOWNLOAD_PROXIES = [
  'https://ghfast.top/',
  'https://gh-proxy.com/',
  'https://ghproxy.cc/',
];

// API endpoints that work in China (tried in order)
const API_ENDPOINTS = [
  // GitHub API mirror that works in China
  `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`,
  // Fallback: parse the release page HTML
  `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`,
];

function httpGet(url, timeout = 15000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timeout: ${url}`));
    }, timeout);

    const lib = url.startsWith('https') ? require('https') : require('http');
    lib.get(url, { headers: { 'User-Agent': 'AlphaPath-Updater' } }, (res) => {
      clearTimeout(timer);
      // Follow redirects
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
  // Method 1: Try GitHub API directly (works if user has VPN)
  try {
    const data = await httpGet(API_ENDPOINTS[0], 10000);
    const release = JSON.parse(data);
    if (release.tag_name) {
      return {
        version: release.tag_name.replace(/^v/, ''),
        releaseUrl: release.html_url,
        assets: release.assets || [],
      };
    }
  } catch (err) {
    console.log('GitHub API failed:', err.message);
  }

  // Method 2: Parse release page HTML to extract version
  try {
    const html = await httpGet(API_ENDPOINTS[1], 10000);
    // Extract version from title or tag
    const tagMatch = html.match(/\/releases\/tag\/v?([\d.]+)/);
    if (tagMatch) {
      return {
        version: tagMatch[1],
        releaseUrl: `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`,
        assets: [],
      };
    }
  } catch (err) {
    console.log('GitHub HTML parse failed:', err.message);
  }

  // Method 3: Try through download proxy to access the API
  for (const proxy of DOWNLOAD_PROXIES) {
    try {
      const proxyUrl = proxy + API_ENDPOINTS[0];
      const data = await httpGet(proxyUrl, 10000);
      const release = JSON.parse(data);
      if (release.tag_name) {
        return {
          version: release.tag_name.replace(/^v/, ''),
          releaseUrl: release.html_url,
          assets: release.assets || [],
        };
      }
    } catch (err) {
      console.log(`Proxy ${proxy} failed:`, err.message);
    }
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

function getPlatformInfo() {
  const platform = process.platform;
  const arch = process.arch;
  if (platform === 'darwin') {
    return { ext: '.dmg', archSuffix: arch === 'arm64' ? '-arm64' : '' };
  } else if (platform === 'win32') {
    return { ext: '.exe', archSuffix: '' };
  } else {
    return { ext: '.AppImage', archSuffix: '' };
  }
}

function getDownloadUrl(release) {
  const { ext, archSuffix } = getPlatformInfo();

  // If we have assets from API, find the matching one
  if (release.assets && release.assets.length > 0) {
    const asset = release.assets.find(a =>
      a.name.endsWith(ext) && !a.name.includes('.blockmap') && a.name.includes(archSuffix)
    ) || release.assets.find(a =>
      a.name.endsWith(ext) && !a.name.includes('.blockmap')
    );

    if (asset) {
      const originalUrl = asset.browser_download_url;
      // Return first working proxy URL
      for (const proxy of DOWNLOAD_PROXIES) {
        return proxy + originalUrl;
      }
      return originalUrl;
    }
  }

  // Fallback: construct download URL from version
  const version = release.version;
  const { ext: fallbackExt, archSuffix: fallbackArch } = getPlatformInfo();
  const filename = `AlphaPath-${version}${fallbackArch}${fallbackExt}`;
  const originalUrl = `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases/download/v${version}/${filename}`;

  for (const proxy of DOWNLOAD_PROXIES) {
    return proxy + originalUrl;
  }
  return originalUrl;
}

async function checkForUpdates() {
  try {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-status', { type: 'checking' });
    }

    const release = await fetchLatestVersion();
    const latestVersion = release.version;

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

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-status', { type: 'available', version: latestVersion, downloadUrl });
    }

    const { response } = await dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: '发现新版本',
      message: `AlphaPath v${latestVersion} 已发布！`,
      detail: `当前版本: v${CURRENT_VERSION}\n最新版本: v${latestVersion}\n\n点击"前往下载"将在浏览器中打开加速下载链接。`,
      buttons: ['前往下载', '稍后提醒'],
      defaultId: 0,
      cancelId: 1,
    });

    if (response === 0) {
      shell.openExternal(downloadUrl || release.releaseUrl);
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
