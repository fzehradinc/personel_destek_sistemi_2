import { useState, useEffect, useCallback } from 'react';

// Web Storage API kullanarak dosya yönetimi
const webStorage = {
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

// Web Storage Hook (Electron bağımlılığı kaldırıldı)
export const useElectronStorage = () => {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setIsReady(true);
  }, []);

  // JSON dosyası oku - Web uyumlu
  const readJsonFile = useCallback(async (filename: string) => {
    if (!isReady) return null;
    
    try {
      const key = filename.replace('.json', '');
      const data = webStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error(`❌ JSON okuma hatası (${filename}):`, error);
      return null;
    }
  }, [isReady]);

  // JSON dosyası yaz - Web uyumlu
  const writeJsonFile = useCallback(async (filename: string, data: any) => {
    if (!isReady) return false;
    
    try {
      const key = filename.replace('.json', '');
      return webStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error(`❌ JSON yazma hatası (${filename}):`, error);
      return false;
    }
  }, [isReady]);

  // Yayın durumunu güncelle - Web uyumlu
  const updateYayinDurumu = useCallback(async (moduleName: string, isPublished: boolean) => {
    if (!isReady) return false;
    
    try {
      const key = 'yayinda';
      const currentData = webStorage.getItem(key);
      const yayinData = currentData ? JSON.parse(currentData) : {};
      yayinData[moduleName] = isPublished;
      return webStorage.setItem(key, JSON.stringify(yayinData));
    } catch (error) {
      console.error(`❌ Yayın durumu güncelleme hatası:`, error);
      return false;
    }
  }, [isReady]);

  // Dosya kaydet - Web uyumlu (Base64 desteği ile)
  const saveFile = useCallback(async (filename: string, data: string, encoding: string = 'utf8') => {
    if (!isReady) return false;
    
    try {
      // Dosya boyutu kontrolü
      const dataSize = new Blob([data]).size;
      const maxSize = 5 * 1024 * 1024; // 5MB limit
      
      if (dataSize > maxSize) {
        throw new Error(`Dosya boyutu çok büyük: ${(dataSize / 1024 / 1024).toFixed(1)} MB (max: 5 MB)`);
      }
      
      // Base64 verisini localStorage'a kaydet
      let dataToStore = data;
      if (encoding === 'base64' && data.startsWith('data:')) {
        const base64Index = data.indexOf('base64,');
        if (base64Index !== -1) {
          dataToStore = data.substring(base64Index + 7);
        }
      }
      
      webStorage.setItem(`file_${filename}`, dataToStore);
      console.log(`✅ Dosya kaydedildi: ${filename}`);
      return true;
    } catch (error) {
      console.error(`❌ Dosya kaydetme hatası (${filename}):`, error);
      throw error;
    }
  }, [isReady]);

  // Dosya oku - Web uyumlu
  const readFile = useCallback(async (filename: string, encoding: string = 'utf8') => {
    if (!isReady) return null;
    
    try {
      const data = webStorage.getItem(`file_${filename}`);
      if (data && encoding === 'base64') {
        // Base64 verisi için data URI formatında döndür
        return data.startsWith('data:') ? data : `data:application/octet-stream;base64,${data}`;
      }
      return data;
    } catch (error) {
      console.error(`❌ Dosya okuma hatası (${filename}):`, error);
      return null;
    }
  }, [isReady]);

  // Dosya var mı kontrol et - Web uyumlu
  const fileExists = useCallback(async (filename: string) => {
    if (!isReady) return false;
    
    try {
      return webStorage.getItem(`file_${filename}`) !== null;
    } catch (error) {
      console.error(`❌ Dosya varlık kontrol hatası (${filename}):`, error);
      return false;
    }
  }, [isReady]);

  // Uygulama bilgilerini al - Web uyumlu
  const getAppInfo = useCallback(async () => {
    if (!isReady) return null;
    
    return {
      version: '1.0.0-web',
      name: 'Personel Destek Sistemi (Web)',
      dataPath: 'localStorage',
      isDev: import.meta.env.DEV
    };
  }, [isReady]);

  return {
    isReady,
    isElectron: false, // Web sürümü için false
    readJsonFile,
    writeJsonFile,
    updateYayinDurumu,
    saveFile,
    readFile,
    fileExists,
    getAppInfo
  };
};