const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  onUpdateStatus: (callback) => ipcRenderer.on('update-status', (_, data) => callback(data)),
});
