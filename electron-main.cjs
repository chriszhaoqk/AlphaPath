const { app, BrowserWindow, dialog, ipcMain, shell } = require('electron');
const path = require('path');
const https = require('https');
const fs = require('fs');
const { exec } = require('child_process');

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

// ============ Custom Update System (China-friendly) ============
const CURRENT_VERSION = app.getVersion();
const GITHUB_OWNER = 'chriszhaoqk';
const GITHUB_REPO = 'AlphaPath';

const DOWNLOAD_PROXIES = [
  'https://ghfast.top/',
  'https://gh-proxy.com/',
  'https://ghproxy.cc/',
];

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
  // Method 1: jsDelivr CDN (works in China)
  try {
    const data = await httpGet(`https://cdn.jsdelivr.net/gh/${GITHUB_OWNER}/${GITHUB_REPO}@main/version.json`, 8000);
    const info = JSON.parse(data);
    if (info.version) {
      console.log('jsDelivr version:', info.version);
      return info.version;
    }
  } catch (err) {
    console.log('jsDelivr CDN failed:', err.message);
  }

  // Method 2: GitHub API
  try {
    const data = await httpGet(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`, 10000);
    const release = JSON.parse(data);
    if (release.tag_name) {
      return release.tag_name.replace(/^v/, '');
    }
  } catch (err) {
    console.log('GitHub API failed:', err.message);
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

function getDownloadUrl(version) {
  const platform = process.platform;
  const arch = process.arch;
  let filename;
  if (platform === 'darwin') {
    filename = arch === 'arm64' ? `AlphaPath-${version}-arm64.dmg` : `AlphaPath-${version}.dmg`;
  } else if (platform === 'win32') {
    filename = `AlphaPath-Setup-${version}.exe`;
  } else {
    filename = `AlphaPath-${version}.AppImage`;
  }

  const originalUrl = `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases/download/v${version}/${filename}`;

  // Return proxy URLs first, then original
  const urls = DOWNLOAD_PROXIES.map(p => p + originalUrl);
  urls.push(originalUrl);
  return urls;
}

function downloadFile(url, destPath, onProgress) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    const lib = url.startsWith('https') ? https : require('http');

    lib.get(url, { headers: { 'User-Agent': 'AlphaPath-Updater' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        file.close();
        fs.unlinkSync(destPath);
        return downloadFile(res.headers.location, destPath, onProgress).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        file.close();
        fs.unlinkSync(destPath);
        return reject(new Error(`HTTP ${res.statusCode}`));
      }

      const total = parseInt(res.headers['content-length'], 10);
      let downloaded = 0;

      res.on('data', (chunk) => {
        downloaded += chunk.length;
        if (total && onProgress) {
          onProgress(Math.round(downloaded / total * 100));
        }
      });

      res.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve(destPath);
      });
    }).on('error', (err) => {
      file.close();
      if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
      reject(err);
    });
  });
}

async function downloadUpdate(version) {
  const urls = getDownloadUrl(version);
  const tmpDir = app.getPath('temp');
  const platform = process.platform;
  const ext = platform === 'darwin' ? '.dmg' : platform === 'win32' ? '.exe' : '.AppImage';
  const destPath = path.join(tmpDir, `AlphaPath-${version}${ext}`);

  // Try each proxy URL
  for (const url of urls) {
    try {
      console.log('Trying download URL:', url);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('update-status', { type: 'progress', percent: 0 });
      }

      await downloadFile(url, destPath, (percent) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.setProgressBar(percent / 100);
          mainWindow.webContents.send('update-status', { type: 'progress', percent });
        }
      });

      console.log('Download complete:', destPath);
      return destPath;
    } catch (err) {
      console.log(`Download from ${url} failed:`, err.message);
      // Clean up partial file
      if (fs.existsSync(destPath)) {
        try { fs.unlinkSync(destPath); } catch (e) {}
      }
    }
  }

  throw new Error('所有下载源均失败，请检查网络连接');
}

async function installUpdate(filePath) {
  const platform = process.platform;

  if (platform === 'darwin') {
    // macOS: Open DMG, user drags to install
    // Mount DMG first
    exec(`hdiutil attach "${filePath}"`, (err) => {
      if (err) {
        // Fallback: just open the file
        shell.openPath(filePath);
      } else {
        // Open the mounted volume
        shell.openPath('/Volumes/AlphaPath');
      }
    });
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: '更新已下载',
      message: '新版本 DMG 已打开，请将 AlphaPath 拖入 Applications 文件夹替换旧版本。',
      detail: '替换完成后重新打开 AlphaPath 即可。',
      buttons: ['知道了'],
    });
  } else if (platform === 'win32') {
    // Windows: Run the installer
    shell.openPath(filePath);
  } else {
    // Linux: Make AppImage executable and run
    fs.chmodSync(filePath, 0o755);
    shell.openPath(filePath);
  }
}

async function checkForUpdates() {
  try {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-status', { type: 'checking' });
    }

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

    // New version found
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-status', { type: 'available', version: latestVersion });
    }

    const { response } = await dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: '发现新版本',
      message: `AlphaPath v${latestVersion} 已发布！`,
      detail: `当前版本: v${CURRENT_VERSION}\n最新版本: v${latestVersion}\n\n点击"立即更新"将自动下载并安装。`,
      buttons: ['立即更新', '稍后提醒'],
      defaultId: 0,
      cancelId: 1,
    });

    if (response === 0) {
      try {
        const filePath = await downloadUpdate(latestVersion);
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.setProgressBar(-1);
          mainWindow.webContents.send('update-status', { type: 'downloaded' });
        }
        await installUpdate(filePath);
      } catch (dlErr) {
        console.error('Download failed:', dlErr.message);
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.setProgressBar(-1);
          mainWindow.webContents.send('update-status', { type: 'error', message: '下载失败：' + dlErr.message });
        }
        dialog.showMessageBox(mainWindow, {
          type: 'error',
          title: '更新下载失败',
          message: '自动下载失败，请手动下载最新版本。',
          detail: `下载地址：https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`,
          buttons: ['打开下载页', '取消'],
        }).then(({ response: r }) => {
          if (r === 0) {
            shell.openExternal(`https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`);
          }
        });
      }
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
  setTimeout(() => { checkForUpdates(); }, 5000);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
