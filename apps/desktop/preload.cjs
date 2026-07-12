const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('flatsix', {
  isElectron: true,
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
  onUpdateStatus: (callback) => {
    const listener = (_event, status) => callback(status);
    ipcRenderer.on('update:status', listener);
    return () => ipcRenderer.removeListener('update:status', listener);
  },
  updateInstall: () => ipcRenderer.invoke('update:install'),
  updateCheck: () => ipcRenderer.invoke('update:check'),
  updateLastStatus: () => ipcRenderer.invoke('update:lastStatus'),
});
