import { useState, useEffect, useCallback } from 'react';

// Electron API'nin mevcut olup olmadığını kontrol et
const isElectron = () => {
  return typeof window !== 'undefined' && window.electronAPI;
};

// Fallback localStorage fonksiyonları
const fallbackStorage = {
  getItem: (key: string) => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: (key: string, value: string) => {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  },
  removeItem: (key: string) => {
    try {
      localStorage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  }
};

// Electron Storage Hook
export const useElectronStorage = () => {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setIsReady(true);
  }, []);

  // JSON dosyası oku - SENKRON HALE GETİRİLDİ
  const readJsonFile = useCallback(async (filename: string) => {
    if (!isReady) return null;
    
    if (isElectron()) {
      try {
        console.log(`📖 [HOOK] JSON dosyası okunuyor: ${filename}`);
        const data = await window.electronAPI.readJsonFile(filename);
        console.log(`📖 [HOOK] Electron'dan okundu: ${filename}`, data);
        return data;
      } catch (error) {
        console.error(`❌ [HOOK] Electron okuma hatası (${filename}):`, error);
        return null;
      }
    } else {
      // Fallback: localStorage
      const key = filename.replace('.json', '');
      const data = fallbackStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    }
  }, [isReady]);

  // JSON dosyası yaz - SENKRON HALE GETİRİLDİ
  const writeJsonFile = useCallback(async (filename: string, data: any) => {
    if (!isReady) return false;
    
    if (isElectron()) {
      try {
        console.log(`💾 [HOOK] JSON dosyası yazılıyor: ${filename}`, data);
        const success = await window.electronAPI.writeJsonFile(filename, data);
        console.log(`💾 [HOOK] Electron'a yazıldı: ${filename}, sonuç: ${success}`);
        return success;
      } catch (error) {
        console.error(`❌ [HOOK] Electron yazma hatası (${filename}):`, error);
        return false;
      }
    } else {
      // Fallback: localStorage
      const key = filename.replace('.json', '');
      return fallbackStorage.setItem(key, JSON.stringify(data));
    }
  }, [isReady]);

  // Yayın durumunu güncelle - SENKRON HALE GETİRİLDİ VE DOĞRULAMA EKLENDİ
  const updateYayinDurumu = useCallback(async (moduleName: string, isPublished: boolean) => {
    if (!isReady) return false;
    
    if (isElectron()) {
      try {
        console.log(`🚀 [HOOK] Yayın durumu güncelleniyor: ${moduleName} = ${isPublished}`);
        
        // SENKRON GÜNCELLEME
        const success = await window.electronAPI.updateYayinDurumu(moduleName, isPublished);
        console.log(`🚀 [HOOK] Yayın durumu güncellendi: ${moduleName} = ${isPublished}, sonuç: ${success}`);
        
        if (success) {
          // SENKRON DOĞRULAMA - Hemen tekrar oku
          console.log(`🔍 [HOOK] Doğrulama için yeniden okunuyor...`);
          const verification = await window.electronAPI.readJsonFile('yayinda.json');
          console.log(`🔍 [HOOK] Doğrulama okuması:`, verification);
          
          if (verification && verification[moduleName] === isPublished) {
            console.log(`✅ [HOOK] Yayın durumu doğrulandı: ${moduleName} = ${isPublished}`);
            return true;
          } else {
            console.error(`❌ [HOOK] Yayın durumu doğrulanamadı! Beklenen: ${isPublished}, Okunan: ${verification ? verification[moduleName] : 'null'}`);
            return false;
          }
        }
        
        return success;
      } catch (error) {
        console.error(`❌ [HOOK] Yayın durumu güncelleme hatası:`, error);
        return false;
      }
    } else {
      // Fallback: localStorage
      const key = 'yayinda';
      const currentData = fallbackStorage.getItem(key);
      const yayinData = currentData ? JSON.parse(currentData) : {};
      yayinData[moduleName] = isPublished;
      return fallbackStorage.setItem(key, JSON.stringify(yayinData));
    }
  }, [isReady]);

  // Dosya kaydet
  const saveFile = useCallback(async (filename: string, data: string, encoding: string = 'utf8') => {
    if (!isReady) return false;
    
    if (isElectron()) {
      try {
        const success = await window.electronAPI.saveFile(filename, data, encoding);
        console.log(`💾 Dosya kaydedildi: ${filename}`);
        return success;
      } catch (error) {
        console.error(`❌ Dosya kaydetme hatası (${filename}):`, error);
        return false;
      }
    } else {
      // Fallback: localStorage (kalıcı)
      try {
        // Estimate storage usage
        const dataSize = new Blob([data]).size;
        console.log(`📊 [STORAGE] Dosya boyutu: ${(dataSize / 1024).toFixed(1)} KB`);
        
        // Check if data is too large (sessionStorage typically has ~5MB limit)
        const maxSize = 2.5 * 1024 * 1024; // 2.5MB limit for web browser compatibility
        if (dataSize > maxSize) {
          console.warn(`⚠️ [STORAGE] Dosya boyutu sınırı aşıldı: ${(dataSize / 1024 / 1024).toFixed(1)} MB (max: ${(maxSize / 1024 / 1024).toFixed(1)} MB)`);
          throw new Error(`FILE_TOO_LARGE:${(dataSize / 1024 / 1024).toFixed(1)}`);
        }
        
        // Try to clear space proactively if we're approaching limits
        const currentUsage = JSON.stringify(localStorage).length;
        const availableSpace = 2.5 * 1024 * 1024 - currentUsage; // Assume 2.5MB total limit for web
        
        if (dataSize > availableSpace * 0.8) { // If file takes more than 80% of available space
          console.log(`🧹 [STORAGE] Proactive cleanup - Current usage: ${(currentUsage / 1024).toFixed(1)} KB, File size: ${(dataSize / 1024).toFixed(1)} KB`);
          
          // Clear old files
          const keys = Object.keys(localStorage);
          const fileKeys = keys.filter(key => key.startsWith('file_')).sort();
          
          // Remove oldest files until we have enough space
          let clearedSpace = 0;
          for (const key of fileKeys) {
            if (clearedSpace >= dataSize) break;
            const itemSize = localStorage.getItem(key)?.length || 0;
            localStorage.removeItem(key);
            clearedSpace += itemSize;
            console.log(`🗑️ [STORAGE] Removed: ${key} (${(itemSize / 1024).toFixed(1)} KB)`);
          }
        }
        
        localStorage.setItem(`file_${filename}`, data);
        
        // Extract raw Base64 string if data is a full data: URI
        let dataToStore = data;
        if (typeof data === 'string' && data.startsWith('data:')) {
          const base64Index = data.indexOf('base64,');
          if (base64Index !== -1) {
            dataToStore = data.substring(base64Index + 7); // Extract only the Base64 part
            console.log(`🔧 [STORAGE] Extracted Base64 from data URI for: ${filename}`);
          }
        }
        
        localStorage.setItem(`file_${filename}`, dataToStore);
        console.log(`✅ [STORAGE] Dosya localStorage'a kaydedildi: ${filename}`);
        return true;
      } catch (storageError) {
        console.error(`❌ [STORAGE] localStorage kaydetme hatası:`, {
          error: storageError.name,
          message: storageError.message,
          filename: filename,
          dataSize: `${(new Blob([data]).size / 1024).toFixed(1)} KB`
        });
        
        // Handle specific error types
        if (storageError.name === 'QuotaExceededError') {
          throw new Error(`QUOTA_EXCEEDED:${(new Blob([data]).size / 1024 / 1024).toFixed(1)}`);
        }
        
        if (storageError.message?.startsWith('FILE_TOO_LARGE:')) {
          throw storageError;
        }
        
        // Try emergency cleanup and retry once for other errors
        try {
          console.log(`🚨 [STORAGE] Emergency cleanup attempt...`);
          const keys = Object.keys(localStorage);
          const fileKeys = keys.filter(key => key.startsWith('file_'));
          
          if (fileKeys.length > 0) {
            // Remove all old files for emergency cleanup
            fileKeys.forEach(key => {
              localStorage.removeItem(key);
              console.log(`🗑️ [STORAGE] Emergency removed: ${key}`);
            });
            
            // Retry save
            // Extract raw Base64 string if data is a full data: URI (for retry)
            let retryDataToStore = data;
            if (typeof data === 'string' && data.startsWith('data:')) {
              const base64Index = data.indexOf('base64,');
              if (base64Index !== -1) {
                retryDataToStore = data.substring(base64Index + 7);
                console.log(`🔧 [STORAGE] Extracted Base64 from data URI for retry: ${filename}`);
              }
            }
            
            localStorage.setItem(`file_${filename}`, retryDataToStore);
            console.log(`✅ [STORAGE] Dosya emergency cleanup sonrası kaydedildi: ${filename}`);
            return true;
          } else {
            throw new Error(`STORAGE_FULL:${(new Blob([data]).size / 1024 / 1024).toFixed(1)}`);
          }
        } catch (retryError) {
          console.error(`❌ [STORAGE] Emergency cleanup başarısız:`, retryError);
          throw new Error(`STORAGE_FAILED:${(new Blob([data]).size / 1024 / 1024).toFixed(1)}`);
        }
      }
    }
  }, [isReady]);

  // Dosya oku
  const readFile = useCallback(async (filename: string, encoding: string = 'utf8') => {
    if (!isReady) return null;
    
    if (isElectron()) {
      try {
        console.log(`📖 [HOOK] Electron dosya okuma başlatılıyor: ${filename}`);
        const data = await window.electronAPI.readFile(filename, encoding);
        console.log(`📖 [HOOK] Electron dosya okuma tamamlandı: ${filename}`, data ? `${data.length} karakter` : 'null');
        
        // ELECTRON: Dosya okuma başarısızlığında detaylı log
        if (!data) {
          console.log(`⚠️ [HOOK] Electron dosya okuma başarısız: ${filename}`);
          console.log(`🔍 [HOOK] Dosya varlık kontrolü yapılıyor...`);
          
          try {
            const exists = await window.electronAPI.fileExists(filename);
            console.log(`📁 [HOOK] Dosya varlık durumu: ${exists}`);
            
            if (!exists) {
              console.log(`❌ [HOOK] Dosya gerçekten mevcut değil: ${filename}`);
            } else {
              console.log(`⚠️ [HOOK] Dosya mevcut ama okunamıyor: ${filename}`);
            }
          } catch (existsError) {
            console.log(`❌ [HOOK] Dosya varlık kontrolü hatası:`, existsError);
          }
        }
        
        return data;
      } catch (error) {
        console.error(`❌ [HOOK] Electron dosya okuma hatası (${filename}):`, error);
        return null;
      }
    } else {
      // Fallback: localStorage
      console.log(`📖 [HOOK] Web localStorage okuma: ${filename}`);
      const data = localStorage.getItem(`file_${filename}`);
      console.log(`📖 [HOOK] Web localStorage okuma sonucu: ${filename}`, data ? `${data.length} karakter` : 'null');
      return data;
    }
  }, [isReady]);

  // Dosya var mı kontrol et
  const fileExists = useCallback(async (filename: string) => {
    if (!isReady) return false;
    
    if (isElectron()) {
      try {
        console.log(`🔍 [HOOK] Electron dosya varlık kontrolü: ${filename}`);
        const exists = await window.electronAPI.fileExists(filename);
        console.log(`📁 [HOOK] Electron dosya varlık sonucu: ${filename} = ${exists}`);
        return exists;
      } catch (error) {
        console.error(`❌ [HOOK] Electron dosya varlık kontrol hatası (${filename}):`, error);
        return false;
      }
    } else {
      // Fallback: localStorage
      console.log(`🔍 [HOOK] Web localStorage varlık kontrolü: ${filename}`);
      return localStorage.getItem(`file_${filename}`) !== null;
    }
  }, [isReady]);

  // Uygulama bilgilerini al
  const getAppInfo = useCallback(async () => {
    if (!isReady) return null;
    
    if (isElectron()) {
      try {
        const info = await window.electronAPI.getAppInfo();
        console.log('📱 Uygulama Bilgileri:', info);
        return info;
      } catch (error) {
        console.error('❌ Uygulama bilgileri alma hatası:', error);
        return null;
      }
    } else {
      return {
        version: '1.0.0-web',
        name: 'Personel Destek Sistemi (Web)',
        dataPath: 'localStorage',
        isDev: true
      };
    }
  }, [isReady]);

  return {
    isReady,
    isElectron: isElectron(),
    readJsonFile,
    writeJsonFile,
    updateYayinDurumu,
    saveFile,
    readFile,
    fileExists,
    getAppInfo
  };
};

// Global tip tanımları
declare global {
  interface Window {
    electronAPI: {
      readJsonFile: (filename: string) => Promise<any>;
      writeJsonFile: (filename: string, data: any) => Promise<boolean>;
      updateYayinDurumu: (moduleName: string, isPublished: boolean) => Promise<boolean>;
      saveFile: (filename: string, data: string, encoding?: string) => Promise<boolean>;
      readFile: (filename: string, encoding?: string) => Promise<string | null>;
      fileExists: (filename: string) => Promise<boolean>;
      getAppInfo: () => Promise<{
        version: string;
        name: string;
        dataPath: string;
        isDev: boolean;
      }>;
      exportData: () => Promise<boolean>;
      importData: () => Promise<boolean>;
      log: (message: string) => void;
    };
  }
}