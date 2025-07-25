import { useEffect, useCallback, useState } from 'react';
import { useWebStorage } from './useWebStorage';

export const useDeveloperTools = () => {
  const storage = useWebStorage();
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Tüm yayın durumlarını temizle - Web uyumlu
  const clearAllPublishStatus = useCallback(async () => {
    try {
      console.log('🔧 Geliştirici araçları: Tüm yayın durumları temizleniyor...');
      
      // Yayın durumları dosyasını sıfırla
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

      await storage.writeJsonFile('yayinda.json', defaultYayinData);

      // Ana sayfa içeriklerini yayından kaldır
      const developments = await storage.readJsonFile('guncel_gelismeler.json');
      if (developments && Array.isArray(developments)) {
        const updatedDevelopments = developments.map((d: any) => ({ ...d, isPublished: false }));
        await storage.writeJsonFile('guncel_gelismeler.json', updatedDevelopments);
      }

      const values = await storage.readJsonFile('kurumsal_degerler.json');
      if (values && Array.isArray(values)) {
        const updatedValues = values.map((v: any) => ({ ...v, isPublished: false }));
        await storage.writeJsonFile('kurumsal_degerler.json', updatedValues);
      }

      // Transfer butonlarını da geri getir
      const uiConfig = await storage.readJsonFile('ui_config.json') || {};
      uiConfig.showTransferButtons = true;
      await storage.writeJsonFile('ui_config.json', uiConfig);

      console.log('✅ Tüm yayın durumları temizlendi');
      console.log('✅ Transfer butonları geri getirildi');
      
      // Başarı mesajı
      alert('🔧 Geliştirici Araçları\n\n✅ Tüm yayın durumları başarıyla temizlendi!\n✅ Transfer butonları geri getirildi!\n\n🔄 Sayfa yeniden yükleniyor...');
      
      // Sayfayı yenile
      setTimeout(() => {
        window.location.reload();
      }, 1000);

      return true;
    } catch (error) {
      console.error('❌ Yayın durumları temizleme hatası:', error);
      alert('❌ Geliştirici Araçları\n\nYayın durumları temizlenirken hata oluştu:\n' + (error as Error).message);
      return false;
    }
  }, [storage]);

  // Şifre doğrulama fonksiyonu
  const validatePassword = useCallback((password: string) => {
    return password === 'admin123' || password === 'dev2024';
  }, []);

  // Şifre modalını göster
  const showPasswordDialog = useCallback(() => {
    setShowPasswordModal(true);
  }, []);

  // Onay modalını göster
  const showConfirmDialog = useCallback(() => {
    setShowConfirmModal(true);
  }, []);

  // Şifre onaylandığında
  const handlePasswordConfirm = useCallback((password: string) => {
    setShowPasswordModal(false);
    
    if (!password) {
      return; // İptal edildi
    }

    // Şifre doğrulama
    if (!validatePassword(password)) {
      alert('❌ Hatalı şifre!\n\nGeliştirici araçlarına erişim reddedildi.');
      return;
    }

    // Onay modalını göster
    showConfirmDialog();
  }, [validatePassword, showConfirmDialog]);

  // İşlem onaylandığında
  const handleConfirm = useCallback(() => {
    setShowConfirmModal(false);
    clearAllPublishStatus();
  }, [clearAllPublishStatus]);

  // Modal iptal
  const handleCancel = useCallback(() => {
    setShowPasswordModal(false);
    setShowConfirmModal(false);
  }, []);

  // Ana erişim fonksiyonu
  const handleDeveloperToolsAccess = useCallback(() => {
    console.log('🔧 Geliştirici araçları erişimi başlatılıyor...');
    showPasswordDialog();
  }, [showPasswordDialog]);

  // Klavye kısayolu dinleyicisi
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl + Shift + L kombinasyonu
      if (event.ctrlKey && event.shiftKey && (event.key === 'L' || event.key === 'l' || event.code === 'KeyL')) {
        event.preventDefault();
        event.stopPropagation();
        console.log('🔧 Geliştirici araçları kısayolu tetiklendi: Ctrl + Shift + L');
        handleDeveloperToolsAccess();
      }
    };

    document.addEventListener('keydown', handleKeyDown, { capture: true });
    window.addEventListener('keydown', handleKeyDown, { capture: true });

    // Console komutları
    (window as any).devTools = handleDeveloperToolsAccess;
    (window as any).clearPublishStatus = clearAllPublishStatus;
    
    console.log('🔧 Geliştirici Araçları Yüklendi:');
    console.log('📋 Klavye Kısayolu: Ctrl + Shift + L');
    console.log('💻 Console Komutu: devTools()');
    console.log('🧹 Direkt Temizleme: clearPublishStatus()');

    return () => {
      document.removeEventListener('keydown', handleKeyDown, { capture: true });
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
      delete (window as any).devTools;
      delete (window as any).clearPublishStatus;
    };
  }, [handleDeveloperToolsAccess, clearAllPublishStatus]);

  return {
    clearAllPublishStatus,
    handleDeveloperToolsAccess,
    showPasswordModal,
    showConfirmModal,
    handlePasswordConfirm,
    handleConfirm,
    handleCancel
  };
};