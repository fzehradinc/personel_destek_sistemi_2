import { useState, useEffect, useCallback } from 'react';

// Web tabanlı depolama sistemi - Electron bağımlılıklarını tamamen kaldırır
interface WebStorageHook {
  isReady: boolean;
  readJsonFile: (filename: string) => Promise<any>;
  writeJsonFile: (filename: string, data: any) => Promise<boolean>;
  updateYayinDurumu: (moduleName: string, isPublished: boolean) => Promise<boolean>;
  saveFile: (filename: string, data: string, encoding?: string) => Promise<boolean>;
  readFile: (filename: string, encoding?: string) => Promise<string | null>;
  fileExists: (filename: string) => Promise<boolean>;
  getAppInfo: () => Promise<any>;
  clearCache: () => void;
  getCacheInfo: () => any;
}

// Performans: Gelişmiş cache sistemi - 5 dakika TTL
const storageCache = new Map<string, any>();
const cacheExpiry = new Map<string, number>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 dakika
const MAX_CACHE_SIZE = 50; // Maksimum cache boyutu

// Performans: Cache temizleme fonksiyonu
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
  
  console.log(`🧹 [WEB-CACHE] Temizlik tamamlandı. Aktif cache: ${storageCache.size} öğe`);
};

// Web Storage API kullanarak dosya yönetimi
const webStorage = {
  getItem: (key: string) => {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.error('❌ [WEB-STORAGE] localStorage okuma hatası:', error);
      return null;
    }
  },
  setItem: (key: string, value: string) => {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.error('❌ [WEB-STORAGE] localStorage yazma hatası:', error);
      return false;
    }
  },
  removeItem: (key: string) => {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('❌ [WEB-STORAGE] localStorage silme hatası:', error);
      return false;
    }
  }
};

// Web Storage Hook - Tamamen web tabanlı, Electron bağımlılığı yok
export const useWebStorage = (): WebStorageHook => {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Performans: Anında hazır duruma geç - Electron bekleme yok
    console.time('⏱️ [WEB-STORAGE] Başlatma');
    setIsReady(true);
    console.timeEnd('⏱️ [WEB-STORAGE] Başlatma');
    console.log('✅ [WEB-STORAGE] Web depolama sistemi hazır');
  }, []);

  // JSON dosyası oku - Web uyumlu, hızlı cache sistemi ile
  const readJsonFile = useCallback(async (filename: string) => {
    if (!isReady) {
      console.warn('⚠️ [WEB-STORAGE] Sistem henüz hazır değil:', filename);
      return null;
    }
    
    console.time(`⏱️ [WEB-STORAGE] ${filename} okuma`);
    
    const cacheKey = filename;
    const now = Date.now();
    
    // Cache kontrolü - Performans optimizasyonu
    if (storageCache.has(cacheKey) && cacheExpiry.has(cacheKey)) {
      const expiry = cacheExpiry.get(cacheKey)!;
      if (now < expiry) {
        console.log(`📋 [WEB-CACHE] Cache'den okundu: ${filename}`);
        console.timeEnd(`⏱️ [WEB-STORAGE] ${filename} okuma`);
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
      
      console.timeEnd(`⏱️ [WEB-STORAGE] ${filename} okuma`);
      return result;
    } catch (error) {
      console.error(`❌ [WEB-STORAGE] JSON okuma hatası (${filename}):`, error);
      console.timeEnd(`⏱️ [WEB-STORAGE] ${filename} okuma`);
      return null;
    }
  }, [isReady]);

  // JSON dosyası yaz - Web uyumlu, cache güncelleme ile
  const writeJsonFile = useCallback(async (filename: string, data: any) => {
    if (!isReady) {
      console.warn('⚠️ [WEB-STORAGE] Sistem henüz hazır değil:', filename);
      return false;
    }
    
    console.time(`⏱️ [WEB-STORAGE] ${filename} yazma`);
    
    try {
      const key = filename.replace('.json', '');
      const success = webStorage.setItem(key, JSON.stringify(data));
      
      // Cache'i güncelle
      if (success) {
        const cacheKey = filename;
        storageCache.set(cacheKey, data);
        cacheExpiry.set(cacheKey, Date.now() + CACHE_DURATION);
        console.log(`💾 [WEB-CACHE] Cache güncellendi: ${filename}`);
      }
      
      console.timeEnd(`⏱️ [WEB-STORAGE] ${filename} yazma`);
      return success;
    } catch (error) {
      console.error(`❌ [WEB-STORAGE] JSON yazma hatası (${filename}):`, error);
      console.timeEnd(`⏱️ [WEB-STORAGE] ${filename} yazma`);
      return false;
    }
  }, [isReady]);

  // Yayın durumunu güncelle - Web uyumlu
  const updateYayinDurumu = useCallback(async (moduleName: string, isPublished: boolean) => {
    if (!isReady) {
      console.warn('⚠️ [WEB-STORAGE] Sistem henüz hazır değil');
      return false;
    }
    
    console.time(`⏱️ [WEB-STORAGE] ${moduleName} yayın durumu güncelleme`);
    
    try {
      const key = 'yayinda';
      const currentData = webStorage.getItem(key);
      const yayinData = currentData ? JSON.parse(currentData) : {};
      yayinData[moduleName] = isPublished;
      
      const success = webStorage.setItem(key, JSON.stringify(yayinData));
      
      // Cache'i güncelle
      if (success) {
        const cacheKey = 'yayinda.json';
        storageCache.set(cacheKey, yayinData);
        cacheExpiry.set(cacheKey, Date.now() + CACHE_DURATION);
      }
      
      console.timeEnd(`⏱️ [WEB-STORAGE] ${moduleName} yayın durumu güncelleme`);
      return success;
    } catch (error) {
      console.error(`❌ [WEB-STORAGE] Yayın durumu güncelleme hatası:`, error);
      console.timeEnd(`⏱️ [WEB-STORAGE] ${moduleName} yayın durumu güncelleme`);
      return false;
    }
  }, [isReady]);

  // Dosya kaydet - Web uyumlu (Base64 desteği ile)
  const saveFile = useCallback(async (filename: string, data: string, encoding: string = 'utf8') => {
    if (!isReady) {
      console.warn('⚠️ [WEB-STORAGE] Sistem henüz hazır değil');
      return false;
    }
    
    console.time(`⏱️ [WEB-STORAGE] ${filename} dosya kaydetme`);
    
    try {
      // Dosya boyutu kontrolü - Web tarayıcı sınırları
      const dataSize = new Blob([data]).size;
      const maxSize = 5 * 1024 * 1024; // 5MB limit
      
      if (dataSize > maxSize) {
        console.timeEnd(`⏱️ [WEB-STORAGE] ${filename} dosya kaydetme`);
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
      
      const success = webStorage.setItem(`file_${filename}`, dataToStore);
      console.log(`✅ [WEB-STORAGE] Dosya kaydedildi: ${filename} (${(dataSize / 1024).toFixed(1)} KB)`);
      console.timeEnd(`⏱️ [WEB-STORAGE] ${filename} dosya kaydetme`);
      return success;
    } catch (error) {
      console.error(`❌ [WEB-STORAGE] Dosya kaydetme hatası (${filename}):`, error);
      console.timeEnd(`⏱️ [WEB-STORAGE] ${filename} dosya kaydetme`);
      throw error;
    }
  }, [isReady]);

  // Dosya oku - Web uyumlu
  const readFile = useCallback(async (filename: string, encoding: string = 'utf8') => {
    if (!isReady) {
      console.warn('⚠️ [WEB-STORAGE] Sistem henüz hazır değil');
      return null;
    }
    
    console.time(`⏱️ [WEB-STORAGE] ${filename} dosya okuma`);
    
    try {
      const data = webStorage.getItem(`file_${filename}`);
      console.timeEnd(`⏱️ [WEB-STORAGE] ${filename} dosya okuma`);
      
      if (data && encoding === 'base64') {
        // Base64 verisi için data URI formatında döndür
        return data.startsWith('data:') ? data : `data:application/octet-stream;base64,${data}`;
      }
      return data;
    } catch (error) {
      console.error(`❌ [WEB-STORAGE] Dosya okuma hatası (${filename}):`, error);
      console.timeEnd(`⏱️ [WEB-STORAGE] ${filename} dosya okuma`);
      return null;
    }
  }, [isReady]);

  // Dosya var mı kontrol et - Web uyumlu
  const fileExists = useCallback(async (filename: string) => {
    if (!isReady) return false;
    
    try {
      return webStorage.getItem(`file_${filename}`) !== null;
    } catch (error) {
      console.error(`❌ [WEB-STORAGE] Dosya varlık kontrol hatası (${filename}):`, error);
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
      isDev: import.meta.env.DEV,
      cacheSize: storageCache.size,
      maxCacheSize: MAX_CACHE_SIZE
    };
  }, [isReady]);

  // Cache temizleme
  const clearCache = useCallback(() => {
    storageCache.clear();
    cacheExpiry.clear();
    console.log('🧹 [WEB-CACHE] Manuel cache temizliği yapıldı');
  }, []);

  // Cache bilgisi
  const getCacheInfo = useCallback(() => ({
    size: storageCache.size,
    maxSize: MAX_CACHE_SIZE,
    keys: Array.from(storageCache.keys())
  }), []);

  // Component unmount'ta cache temizliği
  useEffect(() => {
    return () => {
      if (storageCache.size > 0) {
        console.log(`🧹 [WEB-CACHE] Component unmount - cache temizleniyor: ${storageCache.size} öğe`);
        storageCache.clear();
        cacheExpiry.clear();
      }
    };
  }, []);

  return {
    isReady,
    readJsonFile,
    writeJsonFile,
    updateYayinDurumu,
    saveFile,
    readFile,
    fileExists,
    getAppInfo,
    clearCache,
    getCacheInfo
  };
};