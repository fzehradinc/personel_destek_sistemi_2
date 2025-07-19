const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const archiver = require('archiver');
const AdmZip = require('adm-zip');
const os = require('os');

const isDev = process.env.NODE_ENV === 'development';
let mainWindow;

// Veri yolları - DÜZELTİLMİŞ MANTIK
const getDataPath = () => {
  if (isDev) {
    // Geliştirme modu: public/data
    const devPath = path.join(__dirname, '../data');
    if (!fs.existsSync(devPath)) {
      console.warn('⚠️ [GELİŞTİRME MODU] ../data dizini bulunamadı!');
    }
    return devPath;
  } else {
    // Üretim modu: process.resourcesPath/data (gömülü veriler)
    const prodPath = path.join(process.resourcesPath, 'data');
    if (!fs.existsSync(prodPath)) {
      console.warn('⚠️ [ÜRETİM MODU] process.resourcesPath/data bulunamadı!');
      console.warn('💡 Build öncesi npm run prepare-data çalıştırıldı mı?');
    }
    return prodPath;
  }
};

const getAppDataPath = () => {
  return path.join(app.getPath('userData'), 'data');
};

// GÜVENLE JSON OKUMA FONKSİYONU - FALLBACK DESTEĞİ
const safeReadJSON = (filePath, defaultValue = null) => {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️ Dosya bulunamadı: ${filePath}`);
      return defaultValue;
    }
    
    const data = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(data);
    console.log(`✅ JSON başarıyla okundu: ${path.basename(filePath)}`);
    return parsed;
  } catch (error) {
    console.error(`❌ JSON okuma hatası (${path.basename(filePath)}):`, error.message);
    console.log(`🔄 Varsayılan değer kullanılıyor...`);
    return defaultValue;
  }
};

// GÜVENLE JSON YAZMA FONKSİYONU - BACKUP DESTEĞİ
const safeWriteJSON = (filePath, data) => {
  try {
    // Backup oluştur (eğer dosya varsa)
    if (fs.existsSync(filePath)) {
      const backupPath = filePath + '.backup';
      fs.copyFileSync(filePath, backupPath);
    }
    
    // JSON'u yaz
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    console.log(`✅ JSON başarıyla yazıldı: ${path.basename(filePath)}`);
    return true;
  } catch (error) {
    console.error(`❌ JSON yazma hatası (${path.basename(filePath)}):`, error.message);
    
    // Backup'tan geri yükle
    const backupPath = filePath + '.backup';
    if (fs.existsSync(backupPath)) {
      try {
        fs.copyFileSync(backupPath, filePath);
        console.log(`🔄 Backup'tan geri yüklendi: ${path.basename(filePath)}`);
      } catch (backupError) {
        console.error(`❌ Backup geri yükleme hatası:`, backupError.message);
      }
    }
    
    return false;
  }
};

// ATOMIC WRITE JSON fonksiyonu - safeWriteJSON'un alias'ı
const atomicWriteJSON = (filePath, data) => {
  return safeWriteJSON(filePath, data);
};

// Klasör kopyalama yardımcı fonksiyonu
const copyFolderRecursive = (source, target) => {
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }

  const files = fs.readdirSync(source);
  files.forEach(file => {
    const sourcePath = path.join(source, file);
    const targetPath = path.join(target, file);

    if (fs.lstatSync(sourcePath).isDirectory()) {
      copyFolderRecursive(sourcePath, targetPath);
    } else {
      fs.copyFileSync(sourcePath, targetPath);
    }
  });
};

// YENİ FONKSİYON: Dışa Aktarım - YAYIN DURUMU DAHİL
const exportData = async () => {
  try {
    console.log('📦 Dışa aktarım başlatılıyor...');
    
    const appDataPath = getAppDataPath();
    const desktopPath = path.join(os.homedir(), 'Desktop');
    
    // Veri klasörü var mı kontrol et
    if (!fs.existsSync(appDataPath)) {
      console.warn('⚠️ Veri klasörü bulunamadı:', appDataPath);
      return false;
    }
    
    // Dosya adı oluştur
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    const zipFileName = `personel_destek_yedek_${year}${month}${day}_${hours}${minutes}${seconds}.zip`;
    const zipFilePath = path.join(desktopPath, zipFileName);
    
    console.log(`📁 Zip dosyası oluşturuluyor: ${zipFilePath}`);
    
    // Zip dosyası oluştur
    const output = fs.createWriteStream(zipFilePath);
    const archive = archiver('zip', { 
      zlib: { level: 9 } // En yüksek sıkıştırma
    });
    
    return new Promise((resolve, reject) => {
      output.on('close', () => {
        const sizeInMB = (archive.pointer() / 1024 / 1024).toFixed(2);
        console.log(`✅ Dışa aktarım tamamlandı: ${zipFileName} (${sizeInMB} MB)`);
        resolve(true);
      });
      
      output.on('error', (err) => {
        console.error('❌ Dosya yazma hatası:', err);
        reject(err);
      });
      
      archive.on('error', (err) => {
        console.error('❌ Arşivleme hatası:', err);
        reject(err);
      });
      
      archive.on('warning', (err) => {
        if (err.code === 'ENOENT') {
          console.warn('⚠️ Arşivleme uyarısı:', err);
        } else {
          reject(err);
        }
      });
      
      archive.pipe(output);
      
      // Tüm veri klasörünü arşive ekle
      console.log(`📂 Veri klasörü taranıyor: ${appDataPath}`);
      
      // JSON dosyalarını ekle - YAYIN DURUMU DAHİL
      const jsonFiles = fs.readdirSync(appDataPath).filter(file => file.endsWith('.json'));
      jsonFiles.forEach(file => {
        const filePath = path.join(appDataPath, file);
        if (fs.existsSync(filePath)) {
          archive.file(filePath, { name: file });
          console.log(`📄 JSON eklendi: ${file}`);
        }
      });
      
      // Files klasörünü ekle (varsa)
      const filesPath = path.join(appDataPath, 'files');
      if (fs.existsSync(filesPath)) {
        archive.directory(filesPath, 'files');
        console.log(`📁 Files klasörü eklendi`);
      }
      
      // Arşivi sonlandır
      archive.finalize();
    });
    
  } catch (error) {
    console.error('❌ Dışa aktarım hatası:', error);
    return false;
  }
};

// YENİ FONKSİYON: İçe Aktarım - YAYIN DURUMU DAHİL
const importData = async () => {
  try {
    console.log('📥 İçe aktarım başlatılıyor...');
    
    // Dosya seçim dialogu
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Yedek Dosyasını Seçin',
      defaultPath: path.join(os.homedir(), 'Desktop'),
      filters: [
        { name: 'Yedek Dosyaları', extensions: ['zip'] },
        { name: 'Tüm Dosyalar', extensions: ['*'] }
      ],
      properties: ['openFile']
    });
    
    if (result.canceled || !result.filePaths.length) {
      console.log('📥 İçe aktarım iptal edildi');
      return false;
    }
    
    const zipFilePath = result.filePaths[0];
    const appDataPath = getAppDataPath();
    
    console.log(`📥 Zip dosyası seçildi: ${zipFilePath}`);
    console.log(`📁 Hedef klasör: ${appDataPath}`);
    
    // Zip dosyasının geçerli olup olmadığını kontrol et
    if (!fs.existsSync(zipFilePath)) {
      console.error('❌ Seçilen dosya bulunamadı');
      return false;
    }
    
    // Mevcut verileri yedekle
    const backupPath = path.join(os.tmpdir(), `backup_${Date.now()}`);
    if (fs.existsSync(appDataPath)) {
      try {
        copyFolderRecursive(appDataPath, backupPath);
        console.log(`💾 Mevcut veriler yedeklendi: ${backupPath}`);
      } catch (backupError) {
        console.error('❌ Yedekleme hatası:', backupError);
        // Yedekleme başarısız olsa bile devam et
      }
    }
    
    try {
      // Zip dosyasını aç
      console.log('📦 Zip dosyası açılıyor...');
      const zip = new AdmZip(zipFilePath);
      const zipEntries = zip.getEntries();
      
      console.log(`📋 Zip içeriği: ${zipEntries.length} dosya bulundu`);
      
      // Mevcut veri klasörünü temizle
      if (fs.existsSync(appDataPath)) {
        console.log('🗑️ Mevcut veri klasörü temizleniyor...');
        fs.rmSync(appDataPath, { recursive: true, force: true });
      }
      
      // Veri klasörünü yeniden oluştur
      fs.mkdirSync(appDataPath, { recursive: true });
      
      // Zip içeriğini çıkar
      console.log('📤 Zip içeriği çıkarılıyor...');
      zip.extractAllTo(appDataPath, true);
      
      // Çıkarılan dosyaları kontrol et ve yayın durumunu özel olarak logla
      const extractedFiles = fs.readdirSync(appDataPath);
      console.log(`✅ Çıkarılan dosyalar: ${extractedFiles.join(', ')}`);
      
      // Yayın durumu dosyasını kontrol et
      const yayinFilePath = path.join(appDataPath, 'yayinda.json');
      if (fs.existsSync(yayinFilePath)) {
        const yayinData = safeReadJSON(yayinFilePath, {});
        console.log(`🚀 Yayın durumları içe aktarıldı:`, yayinData);
        
        // Yayın durumlarını say
        const publishedModules = Object.entries(yayinData).filter(([key, value]) => value === true);
        console.log(`📊 ${publishedModules.length} modül yayın durumunda: ${publishedModules.map(([key]) => key).join(', ')}`);
      } else {
        console.warn('⚠️ Yayın durumu dosyası bulunamadı, varsayılan oluşturuluyor...');
        
        // Varsayılan yayın durumu dosyası oluştur
        const defaultYayinData = {
          "TB2_TB3_Entegrasyon_Grubu": false,
          "Akinci_Entegrasyon_Grubu": false,
          "Kizilelma_Entegrasyon_Grubu": false,
          "On_Montaj_Grubu": false,
          "Kalite_Kontrol_Takimi": false,
          "Hafif_Platformlar_Takimi": false,
          "Surec_Yonetimi_Takimi": false,
          "Gelistirme_Grubu": false,
          "Surdurulebilir_Uretim_Takimi": false,
          "Saha_Operasyonlari_Ekibi": false,
          "Idari_Isler_Ekibi": false,
          "EgitimModulu": false,
          "SSSModulu": false,
          "SurecAkislari": false,
          "ProsedurTalimatlar": false
        };
        
        atomicWriteJSON(yayinFilePath, defaultYayinData);
        console.log('📄 Varsayılan yayın durumu dosyası oluşturuldu');
      }
      
      console.log('✅ İçe aktarım tamamlandı');
      return true;
      
    } catch (extractError) {
      console.error('❌ Zip çıkarma hatası:', extractError);
      
      // Hata durumunda yedekten geri yükle
      if (fs.existsSync(backupPath)) {
        try {
          console.log('🔄 Yedekten geri yükleniyor...');
          if (fs.existsSync(appDataPath)) {
            fs.rmSync(appDataPath, { recursive: true, force: true });
          }
          copyFolderRecursive(backupPath, appDataPath);
          console.log('🔄 Yedekten geri yüklendi');
        } catch (restoreError) {
          console.error('❌ Yedekten geri yükleme hatası:', restoreError);
        }
      }
      
      return false;
    } finally {
      // Geçici yedek klasörünü temizle
      if (fs.existsSync(backupPath)) {
        try {
          fs.rmSync(backupPath, { recursive: true, force: true });
          console.log('🗑️ Geçici yedek temizlendi');
        } catch (cleanupError) {
          console.warn('⚠️ Geçici yedek temizlenemedi:', cleanupError);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ İçe aktarım hatası:', error);
    return false;
  }
};

// Veri dosyalarını başlatma - YENİ MANTIK + FALLBACK - DÜZELTİLDİ
const initializeDataFiles = () => {
  try {
    const appDataPath = getAppDataPath();
    const sourcePath = getDataPath();

    console.log(`📁 App Data Path: ${appDataPath}`);
    console.log(`📁 Source Path: ${sourcePath}`);

    // Kullanıcı veri klasörünü oluştur
    if (!fs.existsSync(appDataPath)) {
      fs.mkdirSync(appDataPath, { recursive: true });
      console.log('📁 Kullanıcı veri klasörü oluşturuldu');
    }

    // ÜRETİM MODUNDA: Gömülü verilerden kopyala
    if (!isDev && fs.existsSync(sourcePath)) {
      console.log('📦 [ÜRETİM MODU] Gömülü veriler bulundu, kopyalanıyor...');
      
      try {
        const sourceFiles = fs.readdirSync(sourcePath);
        sourceFiles.forEach(file => {
          const sourceFile = path.join(sourcePath, file);
          const targetFile = path.join(appDataPath, file);
          
          // ÖNEMLİ: Sadece yayın durumu dosyasını her zaman kopyala
          if (file === 'yayinda.json') {
            // yayinda.json'u her zaman gömülü halinden kopyala
            if (fs.lstatSync(sourceFile).isDirectory()) {
              copyFolderRecursive(sourceFile, targetFile);
            } else {
              fs.copyFileSync(sourceFile, targetFile);
              console.log(`🚀 YAYIN DURUMU kopyalandı: ${file}`);
            }
          } else if (!fs.existsSync(targetFile)) {
            // Diğer dosyalar sadece yoksa kopyalanır
            if (fs.lstatSync(sourceFile).isDirectory()) {
              copyFolderRecursive(sourceFile, targetFile);
              console.log(`📁 Klasör kopyalandı: ${file}`);
            } else {
              fs.copyFileSync(sourceFile, targetFile);
              console.log(`📄 Dosya kopyalandı: ${file}`);
            }
          } else {
            console.log(`⏭️ Zaten mevcut: ${file}`);
          }
        });
        
        console.log('✅ Gömülü veriler kullanıcı klasörüne kopyalandı');
      } catch (copyError) {
        console.error('❌ Veri kopyalama hatası:', copyError);
      }
    }

    // Varsayılan dosyaları kontrol et ve eksikleri oluştur - ATOMIC WRITE İLE
    const defaultFiles = {
      'yayinda.json': {
        "TB2_TB3_Entegrasyon_Grubu": false,
        "Akinci_Entegrasyon_Grubu": false,
        "Kizilelma_Entegrasyon_Grubu": false,
        "On_Montaj_Grubu": false,
        "Kalite_Kontrol_Takimi": false,
        "Hafif_Platformlar_Takimi": false,
        "Surec_Yonetimi_Takimi": false,
        "Gelistirme_Grubu": false,
        "Surdurulebilir_Uretim_Takimi": false,
        "Saha_Operasyonlari_Ekibi": false,
        "Idari_Isler_Ekibi": false,
        "EgitimModulu": false,
        "SSSModulu": false,
        "SurecAkislari": false,
        "ProsedurTalimatlar": false
      },
      'training_materials.json': [],
      'process_flows.json': [],
      'faq_data.json': [],
      'procedures_instructions.json': [],
      'organization_modules.json': {},
      'ui_config.json': { // YENİ DOSYA
        "showTransferButtons": true
      },
      'guncel_gelismeler.json': [], // Ana sayfa için
      'kurumsal_degerler.json': []   // Ana sayfa için
    };

    Object.entries(defaultFiles).forEach(([filename, defaultContent]) => {
      const filePath = path.join(appDataPath, filename);
      if (!fs.existsSync(filePath)) {
        const success = atomicWriteJSON(filePath, defaultContent);
        if (success) {
          console.log(`✅ ${filename} oluşturuldu`);
        } else {
          console.error(`❌ ${filename} oluşturulamadı`);
        }
      } else {
        console.log(`📄 ${filename} zaten mevcut`);
      }
    });

    // files klasörünü oluştur
    const filesPath = path.join(appDataPath, 'files');
    if (!fs.existsSync(filesPath)) {
      fs.mkdirSync(filesPath, { recursive: true });
      console.log('📁 files klasörü oluşturuldu');
    }

  } catch (err) {
    console.error('❌ [initializeDataFiles] Veri dosyaları başlatılamadı:', err);
  }
};

const createWindow = () => {
  try {
    console.log('🪟 Kiosk modu penceresi oluşturuluyor...');
    
    mainWindow = new BrowserWindow({
      width: 1400,
      height: 900,
      minWidth: 1200,
      minHeight: 800,
      
      // 🎯 KIOSK MODU AYARLARI
      fullscreen: true,          // Tam ekran başlat
      kiosk: true,              // Kiosk modu aktif
      frame: false,             // Başlık çubuğu ve pencere kontrolleri gizle
      titleBarStyle: 'hidden',  // Başlık çubuğu tamamen gizle
      resizable: false,         // Boyutlandırma engelle
      maximizable: false,       // Büyütme engelle
      minimizable: false,       // Küçültme engelle
      closable: false,          // Kapatma butonunu gizle (Alt+F4 hala çalışır)
      
      // 🔒 GÜVENLİK AYARLARI
      alwaysOnTop: true,        // Her zaman en üstte
      skipTaskbar: true,        // Görev çubuğunda gösterme
      
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        enableRemoteModule: false,
        preload: path.join(__dirname, 'preload.js'),
        
        // 🔒 EK GÜVENLİK (Kiosk için)
        webSecurity: true,
        allowRunningInsecureContent: false,
        experimentalFeatures: false
      },
      
      show: false,
      
      // 🎨 GÖRÜNÜM İYİLEŞTİRMELERİ
      backgroundColor: '#ffffff',  // Yükleme sırasında beyaz arka plan
      visualEffectState: 'active'
    });

    // 🚫 MENÜ ÇUBUĞUNU TAMAMEN GİZLE
    mainWindow.setMenuBarVisibility(false);
    mainWindow.setAutoHideMenuBar(true);
    
    // 🔒 KIOSK MOD KONTROLÜ - ESC tuşunu devre dışı bırak
    mainWindow.webContents.on('before-input-event', (event, input) => {
      // ESC tuşu ile tam ekrandan çıkışı engelle
      if (input.key === 'Escape') {
        event.preventDefault();
        console.log('🚫 ESC tuşu engellendi (Kiosk modu)');
      }
      
      // F11 tuşu ile tam ekran toggle'ı engelle
      if (input.key === 'F11') {
        event.preventDefault();
        console.log('🚫 F11 tuşu engellendi (Kiosk modu)');
      }
      
      // Ctrl+W (pencere kapatma) engelle
      if (input.control && input.key === 'w') {
        event.preventDefault();
        console.log('🚫 Ctrl+W engellendi (Kiosk modu)');
      }
      
      // Ctrl+Q (uygulama çıkış) engelle
      if (input.control && input.key === 'q') {
        event.preventDefault();
        console.log('🚫 Ctrl+Q engellendi (Kiosk modu)');
      }
    });

    mainWindow.once('ready-to-show', () => {
      console.log('✅ Kiosk modu penceresi hazır, gösteriliyor...');
      mainWindow.show();
      
      // 🔒 KIOSK MODU DOĞRULAMA
      console.log('🔒 Kiosk modu durumu:', mainWindow.isKiosk());
      console.log('🔒 Tam ekran durumu:', mainWindow.isFullScreen());
      
      // Geliştirme modunda DevTools'u gizle (kiosk için)
      if (isDev) {
        console.log('⚠️ Geliştirme modu - DevTools kiosk modunda gizlendi');
        // mainWindow.webContents.openDevTools(); // Kiosk modunda kapatıldı
      }
    });

    // 🚫 PENCERE DURUMU DEĞİŞİKLİKLERİNİ ENGELLE
    mainWindow.on('leave-full-screen', () => {
      console.log('🔒 Tam ekrandan çıkış engellendi, geri yükleniyor...');
      mainWindow.setFullScreen(true);
    });

    mainWindow.on('minimize', () => {
      console.log('🔒 Küçültme engellendi, geri yükleniyor...');
      mainWindow.restore();
    });

    // Hata yakalama ekle
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
      console.error(`❌ Sayfa yükleme hatası: ${errorCode} - ${errorDescription}`);
      console.error(`🔗 URL: ${validatedURL}`);
      
      // Hata durumunda kullanıcıya bilgi ver
      mainWindow.webContents.executeJavaScript(`
        document.body.innerHTML = '<div style="padding: 20px; text-align: center; font-family: Arial, sans-serif; height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center; background: #f5f5f5;">
          <h2 style="color: #d32f2f; margin-bottom: 20px;">🚫 Uygulama Yüklenemedi</h2>
          <p style="color: #555; font-size: 18px; margin-bottom: 10px;">Hata: ${errorDescription}</p>
          <p style="color: #777; font-size: 16px;">Lütfen sistem yöneticisine başvurun.</p>
          <div style="margin-top: 30px; padding: 20px; background: #fff; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <p style="color: #666; font-size: 14px; margin: 0;">Alt + F4 tuşları ile uygulamayı kapatabilirsiniz.</p>
          </div>
        </div>';
      `);
    });

    if (isDev) {
      console.log('🔧 Geliştirme modu: http://localhost:5173 yükleniyor...');
      mainWindow.loadURL('http://localhost:5173');
    } else {
      // Üretim modu: dist klasörü doğru yolda
      const htmlPath = path.resolve(__dirname, '../../dist/index.html');
      console.log(`📁 Üretim modu: ${htmlPath} yükleniyor...`);
      
      if (!fs.existsSync(htmlPath)) {
        console.error(`❌ ÜRETİM MODU: ${htmlPath} bulunamadı! Build alınmış mı kontrol edin.`);
        throw new Error(`HTML dosyası bulunamadı: ${htmlPath}`);
      }
      
      mainWindow.loadFile(htmlPath);
    }

    mainWindow.on('closed', () => {
      console.log('🪟 Kiosk modu penceresi kapatıldı');
      mainWindow = null;
    });
    
    // 🎯 KIOSK MODU BAŞARILI MESAJI
    console.log('✅ Kiosk modu penceresi başarıyla oluşturuldu');
    console.log('🔒 Kullanıcı sadece Alt+F4 ile çıkabilir');
    console.log('📱 Tam ekran, menü çubuğu gizli, başlık çubuğu yok');
    
  } catch (error) {
    console.error('❌ Kiosk modu pencere oluşturma hatası:', error);
    
    // Hata durumunda basit bir hata penceresi göster
    if (mainWindow) {
      mainWindow.webContents.executeJavaScript(`
        document.body.innerHTML = '<div style="padding: 20px; text-align: center; font-family: Arial, sans-serif; height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center; background: #f5f5f5;">
          <h2 style="color: #d32f2f; margin-bottom: 20px;">🚫 Kiosk Modu Başlatılamadı</h2>
          <p style="color: #555; font-size: 18px; margin-bottom: 10px;">Hata: ${error.message}</p>
          <p style="color: #777; font-size: 16px;">Lütfen sistem yöneticisine başvurun.</p>
          <div style="margin-top: 30px; padding: 20px; background: #fff; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <p style="color: #666; font-size: 14px; margin: 0;">Alt + F4 tuşları ile uygulamayı kapatabilirsiniz.</p>
          </div>
        </div>';
      `);
    }
  }
};

app.whenReady().then(() => {
  // Güvenlik kontrolü ekle
  validateDataPaths();
  
  // Veri dosyalarını başlat
  initializeDataFiles();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC – Dosya işlemleri ve sistem bilgileri - ATOMIC WRITE İLE

ipcMain.handle('read-json-file', async (event, filename) => {
  try {
    const filePath = path.join(getAppDataPath(), filename);
    
    // Varsayılan değerleri belirle
    const defaults = {
      'yayinda.json': {
        "TB2_TB3_Entegrasyon_Grubu": false,
        "Akinci_Entegrasyon_Grubu": false,
        "Kizilelma_Entegrasyon_Grubu": false,
        "On_Montaj_Grubu": false,
        "Kalite_Kontrol_Takimi": false,
        "Hafif_Platformlar_Takimi": false,
        "Surec_Yonetimi_Takimi": false,
        "Gelistirme_Grubu": false,
        "Surdurulebilir_Uretim_Takimi": false,
        "Saha_Operasyonlari_Ekibi": false,
        "Idari_Isler_Ekibi": false,
        "EgitimModulu": false,
        "SSSModulu": false,
        "SurecAkislari": false,
        "ProsedurTalimatlar": false
      },
      'training_materials.json': [],
      'process_flows.json': [],
      'faq_data.json': [],
      'procedures_instructions.json': [],
      'organization_modules.json': {},
      'ui_config.json': { // YENİ VARSAYILAN
        "showTransferButtons": true
      },
      'guncel_gelismeler.json': [],
      'kurumsal_degerler.json': []
    };
    
    const defaultValue = defaults[filename] || null;
    const data = safeReadJSON(filePath, defaultValue);
    
    console.log(`📖 JSON dosyası okundu: ${filename}`, data);
    return data;
  } catch (error) {
    console.error(`❌ [read-json-file] ${filename} okuma hatası:`, error);
    return null;
  }
});

ipcMain.handle('write-json-file', async (event, filename, data) => {
  try {
    const filePath = path.join(getAppDataPath(), filename);
    const success = safeWriteJSON(filePath, data);
    
    if (success) {
      console.log(`✅ JSON dosyası kaydedildi: ${filename}`, data);
    }
    
    return success;
  } catch (error) {
    console.error(`❌ [write-json-file] ${filename} yazma hatası:`, error);
    return false;
  }
});

ipcMain.handle('update-yayin-durumu', async (event, moduleName, isPublished) => {
  try {
    const filePath = path.join(getAppDataPath(), 'yayinda.json');
    
    // Mevcut veriyi güvenle oku
    const defaultYayinData = {
      "TB2_TB3_Entegrasyon_Grubu": false,
      "Akinci_Entegrasyon_Grubu": false,
      "Kizilelma_Entegrasyon_Grubu": false,
      "On_Montaj_Grubu": false,
      "Kalite_Kontrol_Takimi": false,
      "Hafif_Platformlar_Takimi": false,
      "Surec_Yonetimi_Takimi": false,
      "Gelistirme_Grubu": false,
      "Surdurulebilir_Uretim_Takimi": false,
      "Saha_Operasyonlari_Ekibi": false,
      "Idari_Isler_Ekibi": false,
      "EgitimModulu": false,
      "SSSModulu": false,
      "SurecAkislari": false,
      "ProsedurTalimatlar": false
    };
    
    let yayinData = safeReadJSON(filePath, defaultYayinData);
    
    // Eğer okuma başarısızsa varsayılanı kullan
    if (!yayinData || typeof yayinData !== 'object') {
      yayinData = defaultYayinData;
    }
    
    console.log(`📊 [MAIN] Mevcut yayın durumu:`, yayinData);
    
    // Güncelleme yap
    yayinData[moduleName] = isPublished;
    
    console.log(`📊 [MAIN] Güncellenmiş yayın durumu:`, yayinData);
    
    // ATOMIC WRITE İLE KAYDET
    const success = safeWriteJSON(filePath, yayinData);
    
    if (success) {
      console.log(`🚀 ${moduleName} yayın durumu güncellendi: ${isPublished}`);
      console.log(`📊 Güncel yayın durumları:`, yayinData);
    }
    
    return success;
  } catch (error) {
    console.error('❌ [update-yayin-durumu] Yayın durumu güncellenemedi:', error);
    return false;
  }
});

ipcMain.handle('save-file', async (event, filename, data, encoding = 'utf8') => {
  try {
    const filePath = path.join(getAppDataPath(), 'files', filename);
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (encoding === 'base64') {
      const base64Data = data.replace(/^data:.*,/, '');
      fs.writeFileSync(filePath, base64Data, 'base64');
    } else {
      fs.writeFileSync(filePath, data, encoding);
    }

    console.log(`💾 Dosya kaydedildi: ${filename}`);
    return true;
  } catch (error) {
    console.error(`❌ [save-file] ${filename} kaydetme hatası:`, error);
    return false;
  }
});

ipcMain.handle('read-file', async (event, filename, encoding = 'utf8') => {
  try {
    const filePath = path.join(getAppDataPath(), 'files', filename);
    if (fs.existsSync(filePath)) {
      if (encoding === 'base64') {
        const data = fs.readFileSync(filePath);
        return `data:application/octet-stream;base64,${data.toString('base64')}`;
      } else {
        return fs.readFileSync(filePath, encoding);
      }
    }
    return null;
  } catch (error) {
    console.error(`❌ [read-file] ${filename} okuma hatası:`, error);
    return null;
  }
});

ipcMain.handle('file-exists', async (event, filename) => {
  try {
    const filePath = path.join(getAppDataPath(), 'files', filename);
    return fs.existsSync(filePath);
  } catch (error) {
    console.error(`❌ [file-exists] ${filename} kontrol hatası:`, error);
    return false;
  }
});

ipcMain.handle('get-app-info', async () => {
  return {
    version: app.getVersion(),
    name: app.getName(),
    dataPath: getAppDataPath(),
    isDev: isDev
  };
});

// YENİ IPC HANDLER'LAR: İçe/Dışa Aktarım - YAYIN DURUMU DAHİL
ipcMain.handle('export-data', async () => {
  try {
    console.log('📦 [IPC] Dışa aktarım isteği alındı');
    const result = await exportData();
    console.log(`📦 [IPC] Dışa aktarım sonucu: ${result}`);
    return result;
  } catch (error) {
    console.error('❌ [export-data] Dışa aktarım IPC hatası:', error);
    return false;
  }
});

ipcMain.handle('import-data', async () => {
  try {
    console.log('📥 [IPC] İçe aktarım isteği alındı');
    const result = await importData();
    console.log(`📥 [IPC] İçe aktarım sonucu: ${result}`);
    return result;
  } catch (error) {
    console.error('❌ [import-data] İçe aktarım IPC hatası:', error);
    return false;
  }
});

// GÜVENLİK KONTROLÜ: Uygulama başlatma öncesi veri yollarını doğrula
const validateDataPaths = () => {
  console.log('🔍 Veri yolları doğrulanıyor...');
  console.log(`📁 __dirname: ${__dirname}`);
  console.log(`📁 process.resourcesPath: ${process.resourcesPath}`);
  
  const dataPath = getDataPath();
  const appDataPath = getAppDataPath();
  
  console.log(`📁 Data Path: ${dataPath}`);
  console.log(`📁 App Data Path: ${appDataPath}`);
  
  // Data path kontrolü
  if (!fs.existsSync(dataPath)) {
    console.warn(`⚠️ Data path bulunamadı: ${dataPath}`);
    console.warn('💡 Build öncesi npm run prepare-data çalıştırıldı mı?');
  } else {
    console.log(`✅ Data path mevcut: ${dataPath}`);
    const files = fs.readdirSync(dataPath);
    console.log(`📄 Bulunan dosyalar: ${files.join(', ')}`);
  }
  
  // App data path kontrolü
  if (!fs.existsSync(appDataPath)) {
    console.log(`📁 App data path oluşturuluyor: ${appDataPath}`);
    fs.mkdirSync(appDataPath, { recursive: true });
  } else {
    console.log(`✅ App data path mevcut: ${appDataPath}`);
  }
};

console.log('🚀 Electron Ana Süreç Başlatıldı - ATOMIC WRITE MODU');
console.log('📁 Veri Klasörü:', getAppDataPath());
console.log('📁 Kaynak Klasörü:', getDataPath());