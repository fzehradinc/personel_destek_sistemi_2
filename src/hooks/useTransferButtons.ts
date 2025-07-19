import { useState, useEffect } from 'react';
import { useWebStorage } from './useWebStorage';

export const useTransferButtons = () => {
  const [showTransferButtons, setShowTransferButtons] = useState(true);
  const [loading, setLoading] = useState(false);
  const storage = useWebStorage();

  // UI config'i yükle
  useEffect(() => {
    const loadUIConfig = async () => {
      if (!storage.isReady) return;

      try {
        const uiConfig = await storage.readJsonFile('ui_config.json');
        if (uiConfig && typeof uiConfig.showTransferButtons === 'boolean') {
          setShowTransferButtons(uiConfig.showTransferButtons);
          console.log('🎛️ UI Config yüklendi:', uiConfig);
        }
      } catch (error) {
        console.error('❌ UI Config yükleme hatası:', error);
      }
    };

    loadUIConfig();
  }, [storage.isReady]);

  // UI config'i kaydet
  const saveUIConfig = async (config: { showTransferButtons: boolean }) => {
    try {
      const success = await storage.writeJsonFile('ui_config.json', config);
      if (success) {
        console.log('💾 UI Config kaydedildi:', config);
      }
      return success;
    } catch (error) {
      console.error('❌ UI Config kaydetme hatası:', error);
      return false;
    }
  };

  // Web uyumlu dışa aktarım fonksiyonu
  const handleExport = async () => {
    setLoading(true);
    
    try {
      console.log('📦 Web dışa aktarım başlatılıyor...');
      
      // Tüm verileri topla
      const exportData: any = {};
      
      // JSON dosyalarını topla
      const jsonFiles = [
        'yayinda.json',
        'training_materials.json',
        'process_flows.json',
        'faq_data.json',
        'procedures_instructions.json',
        'organization_modules.json',
        'ui_config.json',
        'guncel_gelismeler.json',
        'kurumsal_degerler.json'
      ];
      
      for (const filename of jsonFiles) {
        const data = await storage.readJsonFile(filename);
        if (data) {
          exportData[filename] = data;
        }
      }
      
      // Dosyaları topla (localStorage'dan)
      const files: any = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('file_')) {
          const filename = key.replace('file_', '');
          const fileData = localStorage.getItem(key);
          if (fileData) {
            files[filename] = fileData;
          }
        }
      }
      
      if (Object.keys(files).length > 0) {
        exportData['files'] = files;
      }
      
      // JSON olarak dışa aktar
      const jsonString = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      
      // Dosya indirme
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const now = new Date();
      const timestamp = now.toISOString().slice(0, 19).replace(/[:-]/g, '').replace('T', '_');
      link.download = `personel_destek_yedek_${timestamp}.json`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      alert('✅ Veriler başarıyla dışa aktarıldı!\n\n📁 JSON dosyası indirildi.\n📦 Tüm modül verileri ve dosyalar dahil edildi.');
      console.log('📦 Web dışa aktarım tamamlandı');
    } catch (error) {
      console.error('❌ Dışa aktarım hatası:', error);
      alert('❌ Dışa aktarım sırasında hata oluştu.\n\nHata: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // Web uyumlu içe aktarım fonksiyonu
  const handleImport = async () => {
    const confirmMessage = `⚠️ İçe aktarım işlemi hakkında önemli bilgiler:

🔄 Bu işlem:
• Mevcut tüm verilerin üzerine yazacaktır
• Organizasyon şemaları, eğitim materyalleri, süreç akışları, prosedürler ve SSS verilerini değiştirecektir
• Yüklenen tüm dosyaları değiştirecektir
• Bu işlem geri alınamaz

📁 Dosya seçimi:
• Sadece .json uzantılı yedek dosyaları kabul edilir
• Dosya seçim penceresi açılacaktır

Devam etmek istediğinizden emin misiniz?`;

    if (!confirm(confirmMessage)) {
      return;
    }

    // Dosya seçici oluştur
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      setLoading(true);
      
      try {
        console.log('📥 Web içe aktarım başlatılıyor...');
        
        // Dosyayı oku
        const text = await file.text();
        const importData = JSON.parse(text);
        
        // JSON dosyalarını geri yükle
        for (const [filename, data] of Object.entries(importData)) {
          if (filename === 'files') continue; // Dosyalar ayrı işlenecek
          
          if (filename.endsWith('.json')) {
            await storage.writeJsonFile(filename, data);
            console.log(`✅ JSON geri yüklendi: ${filename}`);
          }
        }
        
        // Dosyaları geri yükle
        if (importData.files) {
          // Önce mevcut dosyaları temizle
          const keysToRemove = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('file_')) {
              keysToRemove.push(key);
            }
          }
          keysToRemove.forEach(key => localStorage.removeItem(key));
          
          // Yeni dosyaları yükle
          for (const [filename, fileData] of Object.entries(importData.files)) {
            localStorage.setItem(`file_${filename}`, fileData as string);
            console.log(`✅ Dosya geri yüklendi: ${filename}`);
          }
        }
        
        alert('✅ Veriler başarıyla içe aktarıldı!\n\n🔄 Değişikliklerin görünmesi için sayfa yeniden yüklenecek.\n\n⏱️ Lütfen bekleyin...');
        console.log('📥 Web içe aktarım tamamlandı - Sayfa yenileniyor...');
        
        // Sayfayı yenile
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } catch (error) {
        console.error('❌ İçe aktarım hatası:', error);
        alert('❌ İçe aktarım sırasında hata oluştu.\n\nHata: ' + (error as Error).message);
      } finally {
        setLoading(false);
      }
    };
    
    // Dosya seçiciyi tetikle
    input.click();
  };

  // Butonları gizleme fonksiyonu
  const hideTransferButtons = async () => {
    const confirmMessage = `🔒 İçe-Dışa Aktarım butonlarını gizlemek istediğinizden emin misiniz?

Bu işlem sonrası:
• ❌ Dışa Aktar butonu görünmez olacak
• ❌ İçe Aktar butonu görünmez olacak  
• ❌ Bu gizleme butonu da görünmez olacak

⚠️ Önemli:
• Bu işlem kalıcıdır
• Butonları tekrar göstermek için tarayıcı verilerini temizlemeniz gerekebilir
• Canlı sistem modu aktif olacaktır

🎯 Kullanım amacı:
• Son kullanıcılar için temiz arayüz
• Yayın sonrası sadeleştirme
• Kurumsal dağıtım için hazırlık

Devam etmek istiyor musunuz?`;

    if (confirm(confirmMessage)) {
      try {
        const success = await saveUIConfig({ showTransferButtons: false });
        if (success) {
          setShowTransferButtons(false);
          alert('🔒 İçe-Dışa Aktarım butonları başarıyla gizlendi!\n\n✨ Canlı sistem modu aktif edildi.\n🎯 Arayüz son kullanıcılar için optimize edildi.');
          console.log('🔒 Transfer butonları gizlendi');
        }
      } catch (error) {
        console.error('❌ Buton gizleme hatası:', error);
        alert('❌ Butonlar gizlenirken hata oluştu.\n\nHata: ' + (error as Error).message);
      }
    }
  };

  // Transfer butonlarını tekrar göster
  const showTransferButtonsAgain = async () => {
    try {
      console.log('🔧 Transfer butonları tekrar gösteriliyor...');
      
      const success = await saveUIConfig({ showTransferButtons: true });
      if (success) {
        setShowTransferButtons(true);
        console.log('✅ Transfer butonları tekrar görünür hale getirildi');
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Transfer butonlarını gösterme hatası:', error);
      return false;
    }
  };

  return {
    showTransferButtons,
    loading,
    handleExport,
    handleImport,
    hideTransferButtons,
    showTransferButtonsAgain
  };
};