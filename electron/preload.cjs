const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('lanaDesktop', {
  isDesktop: true,
  notifyMessage: (title, body) => ipcRenderer.send('notify-message', { title, body }),
  statusChanged: (label) => ipcRenderer.send('status-changed', label),
  getPlatform: () => ipcRenderer.invoke('get-platform'),
  openExternal: (url) => ipcRenderer.send('open-external', url),
})
