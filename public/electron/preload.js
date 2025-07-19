const { contextBridge, ipcRenderer } = require('electron');

// Electron API'sini güvenli şekilde expose et
contextBridge.exposeInMainWorld('electronAPI', {
  // JSON dosya işlemleri
  readJsonFile: (filename) => ipcRenderer.invoke('read-json-file', filename),
  writeJsonFile: (filename, data) => ipcRenderer.invoke('write-json-file', filename, data),
  
  // Yayın durumu yönetimi
  updateYayinDurumu: (moduleName, isPublished) => ipcRenderer.invoke('update-yayin-durumu', moduleName, isPublished),
  
  // Dosya işlemleri
  saveFile: (filename, data, encoding) => ipcRenderer.invoke('save-file', filename, data, encoding),
  readFile: (filename, encoding) => ipcRenderer.invoke('read-file', filename, encoding),
  fileExists: (filename) => ipcRenderer.invoke('file-exists', filename),
  
  // Sistem bilgileri
  getAppInfo: () => ipcRenderer.invoke('get-app-info'),
  
  // YENİ: İçe/Dışa Aktarım
  exportData: () => ipcRenderer.invoke('export-data'),
  importData: () => ipcRenderer.invoke('import-data'),
  
  // Log
  log: (message) => console.log('[Renderer]', message)
});

console.log('🔗 Preload script yüklendi - Electron API hazır');