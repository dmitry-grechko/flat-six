const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('flatsix', {
  isElectron: true,
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
});
