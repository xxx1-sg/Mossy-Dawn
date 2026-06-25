/**
 * 晓山青 Viridiore - Preload 脚本
 *
 * 将 Electron API 安全地暴露给渲染进程（通过 contextBridge）。
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    showNotification: (title, body) =>
        ipcRenderer.invoke('show-notification', { title, body }),
    minimize: () => ipcRenderer.send('window-minimize'),
    maximize: () => ipcRenderer.send('window-maximize'),
    close: () => ipcRenderer.send('window-close'),
    getProxyUrl: () => ipcRenderer.invoke('get-proxy-url'),
    openExternal: (url) => ipcRenderer.invoke('open-external', url),
    onNavigate: (callback) => {
        ipcRenderer.on('navigate', (event, page) => callback(page));
    },
    platform: process.platform,
});
