import { useState, useEffect, useCallback } from 'react';

// Performance: Gelişmiş cache sistemi - 5 dakika TTL
const storageCache = new Map<string, any>();
const cacheExpiry = new Map<string, number>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 dakika
const MAX_CACHE_SIZE = 50; // Maksimum cache boyutu

// Performance: Cache temizleme fonksiyonu
const cleanupCache = () => {
  const now = Date.now();
  const expiredKeys: string[] = [];
  
  cacheExpiry.forEach((expiry, key) => {
    if (now > expiry) {
      expiredKeys.push(key);
    }
  });
  
  expiredKeys.forEach(key => {
    storageCache.delete(key);
    cacheExpiry.delete(key);
  });
  
  // Cache boyutu kontrolü
  if (storageCache.size > MAX_CACHE_SIZE) {
    const oldestKeys = Array.from(cacheExpiry.entries())
      .sort(([,a], [,b]) => a - b)
      .slice(0, storageCache.size - MAX_CACHE_SIZE)
      .map(([key]) => key);
    
    oldestKeys.forEach(key => {
      storageCache.delete(key);
      cacheExpiry.delete(key);
    });
  }
  
  console.log(`🧹 [CACHE] Temizlik tamamlandı. Aktif cache: ${storageCache.size} öğe`);
};
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
    
    console.time(`⏱️ [STORAGE] ${filename} okuma`);
    
    const cacheKey = filename;
    const now = Date.now();
    
    // Cache kontrolü
    if (storageCache.has(cacheKey) && cacheExpiry.has(cacheKey)) {
      const expiry = cacheExpiry.get(cacheKey)!;
      if (now < expiry) {
        console.log(`📋 [CACHE] Cache'den okundu: ${filename}`);
        console.timeEnd(`⏱️ [STORAGE] ${filename} okuma`);
        return storageCache.get(cacheKey);
      }
    }
    
    try {
      const key = filename.replace('.json', '');
      const data = webStorage.getItem(key);
      const result = data ? JSON.parse(data) : null;
      
      // Cache'e kaydet
      storageCache.set(cacheKey, result);
      cacheExpiry.set(cacheKey, now + CACHE_DURATION);
      
      // Periyodik cache temizliği
      if (Math.random() < 0.1) { // %10 ihtimalle temizlik yap
        setTimeout(cleanupCache, 0);
      }
      
      console.timeEnd(`⏱️ [STORAGE] ${filename} okuma`);
      return result;
    } catch (error) {
      console.error(`❌ JSON okuma hatası (${filename}):`, error);
      console.timeEnd(`⏱️ [STORAGE] ${filename} okuma`);
      return null;
    }
  }, [isReady]);

  // JSON dosyası yaz - Web uyumlu
  const writeJsonFile = useCallback(async (filename: string, data: any) => {
    if (!isReady) return false;
    
    console.time(`⏱️ [STORAGE] ${filename} yazma`);
    
    try {
      const key = filename.replace('.json', '');
      const success = webStorage.setItem(key, JSON.stringify(data));
      
      // Cache'i güncelle
      if (success) {
        const cacheKey = filename;
        storageCache.set(cacheKey, data);
        cacheExpiry.set(cacheKey, Date.now() + CACHE_DURATION);
        console.log(`💾 [CACHE] Cache güncellendi: ${filename}`);
      }
      
      console.timeEnd(`⏱️ [STORAGE] ${filename} yazma`);
      return success;
    } catch (error) {
      console.error(`❌ JSON yazma hatası (${filename}):`, error);
      console.timeEnd(`⏱️ [STORAGE] ${filename} yazma`);
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
    
    console.time(`⏱️ [FILE] ${filename} kaydetme`);
    
    try {
      // Performance: Dosya boyutu kontrolü - optimize edilmiş
      const dataSize = new Blob([data]).size;
      const maxSize = 5 * 1024 * 1024; // 5MB limit
      
      if (dataSize > maxSize) {
        console.timeEnd(`⏱️ [FILE] ${filename} kaydetme`);
        throw new Error(`Dosya boyutu çok büyük: ${(dataSize / 1024 / 1024).toFixed(1)} MB (max: 5 MB)`);
      }
      
      // Performance: Base64 verisini localStorage'a kaydet - optimize edilmiş
      let dataToStore = data;
      if (encoding === 'base64' && data.startsWith('data:')) {
        const base64Index = data.indexOf('base64,');
        if (base64Index !== -1) {
          dataToStore = data.substring(base64Index + 7);
        }
      }
      
      webStorage.setItem(`file_${filename}`, dataToStore);
      console.log(`✅ [FILE] Dosya kaydedildi: ${filename} (${(dataSize / 1024).toFixed(1)} KB)`);
      console.timeEnd(`⏱️ [FILE] ${filename} kaydetme`);
      return true;
    } catch (error) {
      console.error(`❌ Dosya kaydetme hatası (${filename}):`, error);
      console.timeEnd(`⏱️ [FILE] ${filename} kaydetme`);
      throw error;
    }
  }, [isReady]);

  // Dosya oku - Web uyumlu
  const readFile = useCallback(async (filename: string, encoding: string = 'utf8') => {
    if (!isReady) return null;
    
    console.time(`⏱️ [FILE] ${filename} okuma`);
    
    try {
      const data = webStorage.getItem(`file_${filename}`);
      console.timeEnd(`⏱️ [FILE] ${filename} okuma`);
      
      if (data && encoding === 'base64') {
        // Base64 verisi için data URI formatında döndür
        return data.startsWith('data:') ? data : `data:application/octet-stream;base64,${data}`;
      }
      return data;
    } catch (error) {
      console.error(`❌ Dosya okuma hatası (${filename}):`, error);
      console.timeEnd(`⏱️ [FILE] ${filename} okuma`);
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

  // Performance: Uygulama bilgilerini al - Web uyumlu
  const getAppInfo = useCallback(async () => {
    if (!isReady) return null;
    
    return {
      version: '1.0.0-web',
      name: 'Personel Destek Sistemi (Web)',
      dataPath: 'localStorage',
      isDev: import.meta.env.DEV,
      cacheSize: storageCache.size,
      maxCacheSize: MAX_CACHE_SIZE
    };
  }, [isReady]);

  // Performance: Component unmount'ta cache temizliği
  useEffect(() => {
    return () => {
      // Component unmount olduğunda cache'i temizle
      if (storageCache.size > 0) {
        console.log(`🧹 [CACHE] Component unmount - cache temizleniyor: ${storageCache.size} öğe`);
        storageCache.clear();
        cacheExpiry.clear();
      }
    };
  }, []);

  return {
    isReady,
    isElectron: false, // Web sürümü için false
    readJsonFile,
    writeJsonFile,
    updateYayinDurumu,
    saveFile,
    readFile,
    fileExists,
    getAppInfo,
    // Performance: Cache yönetimi için ek fonksiyonlar
    clearCache: () => {
      storageCache.clear();
      cacheExpiry.clear();
      console.log('🧹 [CACHE] Manuel cache temizliği yapıldı');
    },
    getCacheInfo: () => ({
      size: storageCache.size,
      maxSize: MAX_CACHE_SIZE,
      keys: Array.from(storageCache.keys())
    })
  };
};