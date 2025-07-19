import { useState, useEffect, useCallback, useRef } from 'react';

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

// Performans: Singleton cache sistemi - Component re-render'ları arasında korunur
class WebStorageCache {
  private static instance: WebStorageCache;
  private cache = new Map<string, any>();
  private cacheExpiry = new Map<string, number>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 dakika
  private readonly MAX_CACHE_SIZE = 50;
  private cleanupTimer: NodeJS.Timeout | null = null;

  static getInstance(): WebStorageCache {
    if (!WebStorageCache.instance) {
      WebStorageCache.instance = new WebStorageCache();
    }
    return WebStorageCache.instance;
  }

  private constructor() {
    // Periyodik temizlik - her 5 dakikada bir
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.CACHE_DURATION);
  }

  get(key: string): any | null {
    const now = Date.now();
    const expiry = this.cacheExpiry.get(key);
    
    if (!expiry || now > expiry) {
      this.cache.delete(key);
      this.cacheExpiry.delete(key);
      return null;
    }
    
    return this.cache.get(key);
  }

  set(key: string, value: any): void {
    const now = Date.now();
    
    // Cache boyutu kontrolü
    if (this.cache.size >= this.MAX_CACHE_SIZE && !this.cache.has(key)) {
      this.evictOldest();
    }
    
    this.cache.set(key, value);
    this.cacheExpiry.set(key, now + this.CACHE_DURATION);
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string): void {
    this.cache.delete(key);
    this.cacheExpiry.delete(key);
  }

  clear(): void {
    this.cache.clear();
    this.cacheExpiry.clear();
  }

  private cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];
    
    this.cacheExpiry.forEach((expiry, key) => {
      if (now > expiry) {
        expiredKeys.push(key);
      }
    });
    
    expiredKeys.forEach(key => {
      this.cache.delete(key);
      this.cacheExpiry.delete(key);
    });
    
    if (expiredKeys.length > 0) {
      console.log(`🧹 [WEB-CACHE] ${expiredKeys.length} süresi dolmuş öğe temizlendi`);
    }
  }

  private evictOldest(): void {
    const oldestEntry = Array.from(this.cacheExpiry.entries())
      .sort(([,a], [,b]) => a - b)[0];
    
    if (oldestEntry) {
      const [key] = oldestEntry;
      this.cache.delete(key);
      this.cacheExpiry.delete(key);
    }
  }

  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.MAX_CACHE_SIZE,
      keys: Array.from(this.cache.keys())
    };
  }

  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.clear();
  }
}

// Singleton cache instance
const cacheInstance = WebStorageCache.getInstance();

// Web Storage API wrapper - Hata yönetimi ile
const webStorage = {
  getItem: (key: string): string | null => {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.error('❌ [WEB-STORAGE] localStorage okuma hatası:', error);
      return null;
    }
  },
  
  setItem: (key: string, value: string): boolean => {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      if (error instanceof DOMException && error.code === 22) {
        console.error('❌ [WEB-STORAGE] localStorage dolu - cache temizleniyor');
        cacheInstance.clear();
        try {
          localStorage.setItem(key, value);
          return true;
        } catch (retryError) {
          console.error('❌ [WEB-STORAGE] localStorage yazma başarısız:', retryError);
          return false;
        }
      }
      console.error('❌ [WEB-STORAGE] localStorage yazma hatası:', error);
      return false;
    }
  },
  
  removeItem: (key: string): boolean => {
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
  const initRef = useRef(false);
  const forceReadyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Tek sefer initialization - Hızlandırılmış
  useEffect(() => {
    if (initRef.current) {
      console.log('🔄 [WEB-STORAGE] Already initialized, skipping');
      return;
    }
      console.log('🔄 [WEB-STORAGE] Zaten başlatılmış, atlanıyor');
      return;
    }
    
    const initializeStorage = async () => {
      console.time('⏱️ [WEB-STORAGE] Initialization');
      console.log('🚀 [WEB-STORAGE] Starting initialization...');
        if (typeof Storage === 'undefined') {
          console.error('❌ [WEB-STORAGE] localStorage desteklenmiyor');
          throw new Error('localStorage desteklenmiyor');
        }
        
        // Test yazma/okuma
        const testKey = '__storage_test__';
        const testWriteSuccess = webStorage.setItem(testKey, 'test');
        if (!testWriteSuccess) {
          console.error('❌ [WEB-STORAGE] Test yazma başarısız');
          throw new Error('localStorage yazma başarısız');
        }
        
        const testValue = webStorage.getItem(testKey);
        webStorage.removeItem(testKey);
        
        if (testValue !== 'test') {
          console.error('❌ [WEB-STORAGE] Test okuma başarısız:', testValue);
          throw new Error('localStorage çalışmıyor');
        }
        
        console.log('✅ [WEB-STORAGE] localStorage test başarılı');
        initRef.current = true;
        setIsReady(true);
        console.log('✅ [WEB-STORAGE] Web depolama sistemi tamamen hazır');
      } catch (error) {
        console.error('❌ [WEB-STORAGE] Başlatma hatası:', error);
        setIsReady(false);
        // Hata durumunda bile ready olarak işaretle - fallback mode
        setTimeout(() => {
          console.warn('⚠️ [WEB-STORAGE] Fallback mode - zorla hazır işaretleniyor');
          initRef.current = true;
          setIsReady(true);
        }, 1000);
      try {
        // Test localStorage availability
        if (typeof Storage === 'undefined') {
          throw new Error('localStorage not supported');
        }
        
        // Quick test write/read
        const testKey = '__storage_test__';
        localStorage.setItem(testKey, 'test');
        const testValue = localStorage.getItem(testKey);
        localStorage.removeItem(testKey);
        
        if (testValue !== 'test') {
          throw new Error('localStorage test failed');
        }
        
        console.log('✅ [WEB-STORAGE] localStorage test successful');
        initRef.current = true;
        setIsReady(true);
        console.log('✅ [WEB-STORAGE] Storage system ready');
        console.timeEnd('⏱️ [WEB-STORAGE] Initialization');
      } catch (error) {
        console.error('❌ [WEB-STORAGE] Initialization error:', error);
        console.log('🔄 [WEB-STORAGE] Activating fallback mode in 1 second...');
        
        // Force ready after 1 second - critical for preventing infinite loops
        forceReadyTimeoutRef.current = setTimeout(() => {
          console.warn('⚠️ [WEB-STORAGE] Force ready - fallback mode activated');
          initRef.current = true;
          setIsReady(true);
          console.timeEnd('⏱️ [WEB-STORAGE] Initialization');
        }, 1000);
      }
    };

    // Hemen başlat - gecikme yok
    // Start immediately
    initializeStorage();
  }, []);

  // JSON dosyası oku - Optimize edilmiş cache sistemi ile
  const readJsonFile = useCallback(async (filename: string) => {
    if (!isReady) {
      console.warn('⚠️ [WEB-STORAGE] Sistem henüz hazır değil, fallback dönüyor:', filename);
      // Fallback: Direkt localStorage'dan okumaya çalış
      try {
        const key = filename.replace('.json', '');
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
      } catch (error) {
        console.error('❌ [WEB-STORAGE] Fallback okuma hatası:', error);
        return null;
      }
    }
    
    const cacheKey = filename;
    
    // Cache kontrolü
    if (cacheInstance.has(cacheKey)) {
      console.log(`📋 [WEB-CACHE] Cache hit: ${filename}`);
      return cacheInstance.get(cacheKey);
    }
    
    console.time(`⏱️ [WEB-STORAGE] Reading ${filename}`);
    
    try {
      const data = webStorage.getItem(key);
      const result = data ? JSON.parse(data) : null;
      
      // Cache'e kaydet
      if (result !== null) {
        cacheInstance.set(cacheKey, result);
        console.log(`💾 [WEB-CACHE] Cached: ${filename}`);
      }
      
      console.timeEnd(`⏱️ [WEB-STORAGE] Reading ${filename}`);
      return result;
    } catch (error) {
      console.error(`❌ [WEB-STORAGE] JSON read error (${filename}):`, error);
      console.timeEnd(`⏱️ [WEB-STORAGE] Reading ${filename}`);
      return null;
    }
  }, [isReady]); // Keep isReady dependency for cache optimization

  // JSON dosyası yaz - Cache güncelleme ile
  const writeJsonFile = useCallback(async (filename: string, data: any) => {
    const key = filename.replace('.json', '');
    
    if (!isReady) {
      console.log(`⚠️ [WEB-STORAGE] Not ready, using fallback write for: ${filename}`);
    }
    
    console.time(`⏱️ [WEB-STORAGE] Writing ${filename}`);
    
    try {
      const success = webStorage.setItem(key, JSON.stringify(data));
      
      // Cache'i güncelle
      if (success) {
        const cacheKey = filename;
        cacheInstance.set(cacheKey, data);
        console.log(`💾 [WEB-CACHE] Cache updated: ${filename}`);
      }
      
      console.timeEnd(`⏱️ [WEB-STORAGE] Writing ${filename}`);
      return success;
    } catch (error) {
      console.error(`❌ [WEB-STORAGE] JSON write error (${filename}):`, error);
      console.timeEnd(`⏱️ [WEB-STORAGE] Writing ${filename}`);
      return false;
    }
  }, [isReady]); // Keep dependency for optimization

  // Yayın durumunu güncelle - Optimized
  const updateYayinDurumu = useCallback(async (moduleName: string, isPublished: boolean) => {
    if (!isReady) {
      console.log('⚠️ [WEB-STORAGE] Not ready, using fallback for yayinda update');
    }
    
    try {
      const key = 'yayinda';
      let yayinData = cacheInstance.get('yayinda.json');
      
      if (!yayinData) {
        const currentData = webStorage.getItem(key);
        yayinData = currentData ? JSON.parse(currentData) : {};
      }
      
      yayinData[moduleName] = isPublished;
      
      const success = webStorage.setItem(key, JSON.stringify(yayinData));
      
      // Cache'i güncelle
      if (success) {
        cacheInstance.set('yayinda.json', yayinData);
      }
      
      return success;
    } catch (error) {
      console.error(`❌ [WEB-STORAGE] Yayın durumu güncelleme hatası:`, error);
      return false;
    }
  }, [isReady]);

  // Dosya kaydet - Web uyumlu (Boyut kontrolü ile)
  const saveFile = useCallback(async (filename: string, data: string, encoding: string = 'utf8') => {
    if (!isReady) {
      console.warn('⚠️ [WEB-STORAGE] Sistem henüz hazır değil');
      return false;
    }
    
    try {
      // Dosya boyutu kontrolü - 5MB limit
      const dataSize = new Blob([data]).size;
      const maxSize = 5 * 1024 * 1024;
      
      if (dataSize > maxSize) {
        throw new Error(`Dosya boyutu çok büyük: ${(dataSize / 1024 / 1024).toFixed(1)} MB (max: 5 MB)`);
      }
      
      // Base64 işleme
      let dataToStore = data;
      if (encoding === 'base64' && data.startsWith('data:')) {
        const base64Index = data.indexOf('base64,');
        if (base64Index !== -1) {
          dataToStore = data.substring(base64Index + 7);
        }
      }
      
      const success = webStorage.setItem(`file_${filename}`, dataToStore);
      
      if (success) {
        console.log(`✅ [WEB-STORAGE] Dosya kaydedildi: ${filename} (${(dataSize / 1024).toFixed(1)} KB)`);
      }
      
      return success;
    } catch (error) {
      console.error(`❌ [WEB-STORAGE] Dosya kaydetme hatası (${filename}):`, error);
      throw error;
    }
  }, [isReady]);

  // Dosya oku - Web uyumlu
  const readFile = useCallback(async (filename: string, encoding: string = 'utf8') => {
    if (!isReady) {
      console.warn('⚠️ [WEB-STORAGE] Sistem henüz hazır değil');
      return null;
    }
    
    try {
      const data = webStorage.getItem(`file_${filename}`);
      
      if (data && encoding === 'base64') {
        return data.startsWith('data:') ? data : `data:application/octet-stream;base64,${data}`;
      }
      return data;
    } catch (error) {
      console.error(`❌ [WEB-STORAGE] Dosya okuma hatası (${filename}):`, error);
      return null;
    }
  }, [isReady]);

  // Dosya var mı kontrol et
  const fileExists = useCallback(async (filename: string) => {
    if (!isReady) return false;
    
    try {
      return webStorage.getItem(`file_${filename}`) !== null;
    } catch (error) {
      console.error(`❌ [WEB-STORAGE] Dosya varlık kontrol hatası (${filename}):`, error);
      return false;
    }
  }, [isReady]);

  // Uygulama bilgilerini al
  const getAppInfo = useCallback(async () => {
    if (!isReady) return null;
    
    return {
      version: '1.0.0-web',
      name: 'Personel Destek Sistemi (Web)',
      dataPath: 'localStorage',
      isDev: import.meta.env.DEV,
      cacheStats: cacheInstance.getStats()
    };
  }, [isReady]);

  // Cache temizleme
  const clearCache = useCallback(() => {
    cacheInstance.clear();
    console.log('🧹 [WEB-CACHE] Manuel cache temizliği yapıldı');
  }, []);

  // Cache bilgisi
  const getCacheInfo = useCallback(() => cacheInstance.getStats(), []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (forceReadyTimeoutRef.current) {
        clearTimeout(forceReadyTimeoutRef.current);
        forceReadyTimeoutRef.current = null;
      }
      console.log('🧹 [WEB-CACHE] Component unmount');
    };
  }, []); // No dependencies - run once only

  return {
    isReady,
    // Always try to read, even if not ready - fallback mode
    const key = filename.replace('.json', '');
    
    if (!isReady) {
      console.log(`⚠️ [WEB-STORAGE] Not ready, using fallback for: ${filename}`);