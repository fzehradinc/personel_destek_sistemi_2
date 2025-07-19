
import React, { useState, useEffect, useCallback } from 'react';
import { TrendingUp, Heart, Plus, X, Calendar, User, Building2, Rocket, Eye, Settings, CheckCircle, AlertCircle, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { useWebStorage } from '../hooks/useWebStorage';

interface CurrentDevelopment {
  id: string;
  baslik: string;
  kategori: string;
  icerik: string;
  tarih: string;
  isPublished: boolean;
  haberGorseli?: string; // Yeni alan: haber görseli
}

interface CorporateValue {
  id: string;
  baslik: string;
  aciklama: string;
  ornekDavranislar: string[];
  soz: string;
  tarih: string;
  isPublished: boolean;
}

interface ContentCreationForm {
  type: 'guncel-gelismeler' | 'kurumsal-degerler' | null;
  data: {
    // Güncel Gelişmeler
    baslik?: string;
    kategori?: string;
    icerik?: string;
    haberGorseli?: File | null; // Yeni alan: haber görseli dosyası
    // Kurumsal Değerler
    aciklama?: string;
    ornekDavranislar?: string;
    soz?: string;
  };
import { useWebStorage } from '../hooks/useWebStorage';

const Homepage = () => {
  const [currentDevelopments, setCurrentDevelopments] = useState<CurrentDevelopment[]>([]);
  const [corporateValues, setCorporateValues] = useState<CorporateValue[]>([]);
  const [showContentModal, setShowContentModal] = useState(false);
  const [showCreationForm, setShowCreationForm] = useState(false);
  const [contentForm, setContentForm] = useState<ContentCreationForm>({
    type: null,
    data: {}
  });
  const [loading, setLoading] = useState(false);
  const [showManagementPanel, setShowManagementPanel] = useState(false);
  const [showPublishConfirm, setShowPublishConfirm] = useState(false);
  const [showContentDeletionModal, setShowContentDeletionModal] = useState(false);

  // Carousel states for developments
  const [currentDevIndex, setCurrentDevIndex] = useState(0);
  
  // Carousel states for corporate values
  const [currentValueIndex, setCurrentValueIndex] = useState(0);

  const storage = useWebStorage();

  // Görsel yükleme fonksiyonu - DÜZELTME: Double encoding önleme
  const loadNewsImage = useCallback(async (development: any): Promise<string | null> => {
    try {
      console.log('🖼️ [LOAD] Görsel yükleniyor:', development.haberGorseli);
      
      if (!development.haberGorseli) {
        console.log('❌ [LOAD] haberGorseli bulunamadı');
        return null;
      }

      if (storage.isElectron) {
        // Electron: Dosya sisteminden oku
        const imageData = await storage.readFile(development.haberGorseli, 'base64');
        
        if (!imageData) {
          // Alternatif yolları dene
          const filesPath = `files/${development.haberGorseli}`;
          const altImageData = await storage.readFile(filesPath, 'base64');
          
          if (!altImageData) {
            console.log('❌ [LOAD] Electron: Dosya okunamadı');
            return null;
          }
          
          return altImageData.startsWith('data:') ? altImageData : `data:image/jpeg;base64,${altImageData}`;
        }
        
        // DÜZELTME: Eğer zaten data: ile başlıyorsa, olduğu gibi döndür
        if (imageData.startsWith('data:')) {
          console.log('✅ [LOAD] Electron: Data URI formatı tespit edildi');
          return imageData;
        }
        
        // Ham base64 ise, data URI formatına çevir
        const fileExtension = development.haberGorseli.split('.').pop()?.toLowerCase();
        const mimeType = fileExtension === 'png' ? 'image/png' : 
                        fileExtension === 'webp' ? 'image/webp' : 
                        fileExtension === 'gif' ? 'image/gif' : 'image/jpeg';
        
        console.log('✅ [LOAD] Electron: Base64 formatına çevriliyor, MIME:', mimeType);
        return `data:${mimeType};base64,${imageData}`;
        
      } else {
        // Web: localStorage'dan oku
        const imageData = await storage.readFile(development.haberGorseli, 'base64');
        
        if (!imageData) {
          console.log("❌ [LOAD] Web: localStorage'da bulunamadı");
          return null;
        }
        
        // DÜZELTME: Eğer zaten data: ile başlıyorsa, olduğu gibi döndür
        if (imageData.startsWith('data:')) {
          console.log('✅ [LOAD] Web: Data URI formatı tespit edildi');
          return imageData;
        }
        
        // Ham base64 ise, data URI formatına çevir
        const fileExtension = development.haberGorseli.split('.').pop()?.toLowerCase();
        const mimeType = fileExtension === 'png' ? 'image/png' : 
                        fileExtension === 'webp' ? 'image/webp' : 
                        fileExtension === 'gif' ? 'image/gif' : 'image/jpeg';
        
        console.log('✅ [LOAD] Web: Base64 formatına çevriliyor, MIME:', mimeType);
        return `data:${mimeType};base64,${imageData}`;
      }
      
    } catch (error) {
      console.error('❌ [LOAD] loadNewsImage hatası:', error);
      return null;
    }
  }, [storage]);

  // Verileri yükle
  useEffect(() => {
    const loadData = async () => {
      if (!storage.isReady) return;

      try {
        // Güncel gelişmeleri yükle
        const developments = await storage.readJsonFile('guncel_gelismeler.json');
        if (developments && Array.isArray(developments)) {
          setCurrentDevelopments(developments);
        }

        // Kurumsal değerleri yükle
        const values = await storage.readJsonFile('kurumsal_degerler.json');
        if (values && Array.isArray(values)) {
          setCorporateValues(values);
        }
      } catch (error) {
        console.error('❌ Veri yükleme hatası:', error);
      }
    };

    loadData();
  }, [storage.isReady]);

  // Yayınlanmış içerikleri al
  const publishedDevelopments = currentDevelopments.filter(d => d.isPublished);
  const publishedValues = corporateValues.filter(v => v.isPublished);

  // Toplam yayınlanmış içerik sayısı
  const totalPublishedContent = publishedDevelopments.length + publishedValues.length;

  // Yayınlanmamış içerik sayısı
  const unpublishedDevelopments = currentDevelopments.filter(d => !d.isPublished);
  const unpublishedValues = corporateValues.filter(v => !v.isPublished);
  const totalUnpublishedContent = unpublishedDevelopments.length + unpublishedValues.length;

  // Carousel navigation for developments
  const nextDevelopment = () => {
    setCurrentDevIndex((prev) => (prev + 1) % publishedDevelopments.length);
  };

  const prevDevelopment = () => {
    setCurrentDevIndex((prev) => (prev - 1 + publishedDevelopments.length) % publishedDevelopments.length);
  };

  // Carousel navigation for corporate values
  const nextValue = () => {
    setCurrentValueIndex((prev) => (prev + 1) % publishedValues.length);
  };

  const prevValue = () => {
    setCurrentValueIndex((prev) => (prev - 1 + publishedValues.length) % publishedValues.length);
  };

  // Auto-advance carousels
  useEffect(() => {
    if (publishedDevelopments.length > 1) {
      const interval = setInterval(nextDevelopment, 15000);
      return () => clearInterval(interval);
    }
  }, [publishedDevelopments.length]);

  useEffect(() => {
    if (publishedValues.length > 1) {
      const interval = setInterval(nextValue, 10000);
      return () => clearInterval(interval);
    }
  }, [publishedValues.length]);

  // İçerik oluşturma modalını aç
  const openContentCreationModal = () => {
    setShowContentModal(true);
  };

  // İçerik türü seç
  const selectContentType = (type: 'guncel-gelismeler' | 'kurumsal-degerler') => {
    setContentForm({
      type,
      data: {}
    });
    setShowContentModal(false);
    setShowCreationForm(true);
  };

  // Form verilerini güncelle
  const updateFormData = (field: string, value: string | File | null) => {
    setContentForm(prev => ({
      ...prev,
      data: {
        ...prev.data,
        [field]: value
      }
    }));
  };

  // Haber görseli yükleme fonksiyonu
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Dosya türü kontrolü
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        alert('Sadece JPG, JPEG, PNG ve WEBP formatları desteklenmektedir.');
        return;
      }
      
      // Dosya boyutu kontrolü (5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Görsel dosyası 5MB\'dan küçük olmalıdır.');
        return;
      }
      
      updateFormData('haberGorseli', file);
    }
  };

  // Haber görselini kaldırma fonksiyonu
  const removeImage = () => {
    updateFormData('haberGorseli', null);
  };

  // Dosyayı Base64'e çevirme fonksiyonu
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  // İçerik kaydet
  const saveContent = async () => {
    if (!contentForm.type) return;

    // Form validasyonu
    if (contentForm.type === 'guncel-gelismeler') {
      if (!contentForm.data.baslik || !contentForm.data.kategori || !contentForm.data.icerik || !contentForm.data.haberGorseli) {
        alert('⚠️ Lütfen tüm zorunlu alanları doldurun ve haber görseli seçin.');
        return;
      }
    } else if (contentForm.type === 'kurumsal-degerler') {
      if (!contentForm.data.baslik || !contentForm.data.aciklama) {
        alert('⚠️ Lütfen tüm zorunlu alanları doldurun.');
        return;
      }
    }

    setLoading(true);

    try {
      const currentDate = new Date().toISOString().split('T')[0];
      const id = Date.now().toString();

      if (contentForm.type === 'guncel-gelismeler') {
        // Haber görselini işle
        let haberGorseliUrl = '';
        if (contentForm.data.haberGorseli) {
          const imageData = await fileToBase64(contentForm.data.haberGorseli);
          const imageName = `news_${id}_${contentForm.data.haberGorseli.name}`;
          await storage.saveFile(imageName, imageData, 'base64');
          haberGorseliUrl = imageName;
        }

        const newDevelopment: CurrentDevelopment = {
          id,
          baslik: contentForm.data.baslik || '',
          kategori: contentForm.data.kategori || '',
          icerik: contentForm.data.icerik || '',
          tarih: currentDate,
          isPublished: false,
          haberGorseli: haberGorseliUrl
        };

        const updatedDevelopments = [...currentDevelopments, newDevelopment];
        setCurrentDevelopments(updatedDevelopments);
        await storage.writeJsonFile('guncel_gelismeler.json', updatedDevelopments);

      } else if (contentForm.type === 'kurumsal-degerler') {
        const ornekDavranislarArray = contentForm.data.ornekDavranislar 
          ? contentForm.data.ornekDavranislar.split('\n').filter(item => item.trim())
          : [];

        const newValue: CorporateValue = {
          id,
          baslik: contentForm.data.baslik || '',
          aciklama: contentForm.data.aciklama || '',
          ornekDavranislar: ornekDavranislarArray,
          soz: contentForm.data.soz || '',
          tarih: currentDate,
          isPublished: false
        };

        const updatedValues = [...corporateValues, newValue];
        setCorporateValues(updatedValues);
        await storage.writeJsonFile('kurumsal_degerler.json', updatedValues);
      }

      // Formu sıfırla
      setContentForm({ type: null, data: {} });
      setShowCreationForm(false);
      
      // Başarı mesajı ve yönetim panelini aç
      alert('✅ İçerik başarıyla oluşturuldu!');
      setShowManagementPanel(true);

    } catch (error) {
      console.error('❌ İçerik kaydetme hatası:', error);
      alert('❌ İçerik kaydedilirken hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  // Tümünü yayına al - onay modalı ile
  const showPublishAllConfirmation = () => {
    setShowPublishConfirm(true);
  };

  // Tümünü yayına al - gerçek işlem
  const publishAllContent = async () => {
    setShowPublishConfirm(false);
    setLoading(true);

    try {
      // Tüm gelişmeleri yayına al
      const updatedDevelopments = currentDevelopments.map(d => ({ ...d, isPublished: true }));
      setCurrentDevelopments(updatedDevelopments);
      await storage.writeJsonFile('guncel_gelismeler.json', updatedDevelopments);

      // Tüm değerleri yayına al
      const updatedValues = corporateValues.map(v => ({ ...v, isPublished: true }));
      setCorporateValues(updatedValues);
      await storage.writeJsonFile('kurumsal_degerler.json', updatedValues);

      // Yönetim panelini kapat
      setShowManagementPanel(false);
      
      // Başarı mesajı
      alert('🚀 Tüm içerikler başarıyla yayına alındı!\n\nAna sayfa artık ziyaretçiler için hazır.');

    } catch (error) {
      console.error('❌ Yayına alma hatası:', error);
      alert('❌ İçerikler yayına alınırken hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  // İçerik silme modalını aç
  const openContentDeletionModal = () => {
    setShowContentDeletionModal(true);
  };

  // İçerik silme fonksiyonu
  const deleteContent = async (type: 'development' | 'value', id: string) => {
    if (!confirm('Bu içeriği silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.')) {
      return;
    }

    try {
      if (type === 'development') {
        const updatedDevelopments = currentDevelopments.filter(d => d.id !== id);
        setCurrentDevelopments(updatedDevelopments);
        await storage.writeJsonFile('guncel_gelismeler.json', updatedDevelopments);
      } else {
        const updatedValues = corporateValues.filter(v => v.id !== id);
        setCorporateValues(updatedValues);
        await storage.writeJsonFile('kurumsal_degerler.json', updatedValues);
      }

      alert('✅ İçerik başarıyla silindi!');
    } catch (error) {
      console.error('❌ İçerik silme hatası:', error);
      alert('❌ İçerik silinirken hata oluştu.');
    }
  };

  // Haber görselini yükle ve görüntüle
  const loadNewsImageOld = async (development: CurrentDevelopment): Promise<string | null> => {
    if (!development.haberGorseli) return null;
    
    try {
      const imageData = await storage.readFile(development.haberGorseli, 'base64');
      return imageData;
    } catch (error) {
      console.error('❌ Haber görseli yükleme hatası:', error);
      return null;
    }
  };

  // Yönetim panelini aç/kapat - SADECE İÇERİK YAYINDA DEĞİLSE GÖSTER
  const toggleManagementPanel = () => {
    setShowManagementPanel(!showManagementPanel);
  };

  // İçerik var mı kontrol et
  const hasAnyContent = currentDevelopments.length > 0 || corporateValues.length > 0;
  const hasUnpublishedContent = totalUnpublishedContent > 0;

  // Yönetim butonunun görünürlük kontrolü - SADECE YAYINLANMAMIŞ İÇERİK VARSA GÖSTER
  const shouldShowManagementButton = hasAnyContent && totalPublishedContent === 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Personel Destek Sistemi</h1>
                <p className="text-sm text-gray-600">Entegrasyon Yönetim Platformu</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-sm font-medium text-gray-900">
                  {totalPublishedContent} İçerik Yayında
                </div>
                <div className="text-xs text-gray-500">
                  Son güncelleme: {new Date().toLocaleDateString('tr-TR')}
                </div>
              </div>
              
              {/* Yönetim butonu - SADECE YAYINLANMAMIŞ İÇERİK VARSA GÖSTER */}
              {shouldShowManagementButton && (
                <button
                  onClick={toggleManagementPanel}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  <Settings className="w-4 h-4" />
                  Yönetim
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Ana İçerik */}
        {totalPublishedContent > 0 ? (
          // Yayınlanmış içerikler varsa ana sayfa görünümü
          <div className="space-y-8">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                Hoş Geldiniz
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Güncel gelişmeler ve kurumsal değerlerimiz
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
              {/* Güncel Gelişmeler */}
              {publishedDevelopments.length > 0 && (
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-shadow">
                  <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 text-white">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <TrendingUp className="w-8 h-8" />
                        <h3 className="text-xl font-bold">Güncel Gelişmeler</h3>
                      </div>
                      {publishedDevelopments.length > 1 && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={prevDevelopment}
                            className="p-1 rounded-full bg-white bg-opacity-20 hover:bg-opacity-30 transition-colors"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          <span className="text-sm font-medium px-2">
                            {currentDevIndex + 1}/{publishedDevelopments.length}
                          </span>
                          <button
                            onClick={nextDevelopment}
                            className="p-1 rounded-full bg-white bg-opacity-20 hover:bg-opacity-30 transition-colors"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                    <p className="text-green-100">Son haberler ve gelişmeler</p>
                  </div>
                  
                  <div className="p-6">
                    {publishedDevelopments.length > 0 && (
                      <DevelopmentCard 
                        development={publishedDevelopments[currentDevIndex]} 
                        loadNewsImage={loadNewsImage}
                      />
                    )}
                  </div>
                </div>
              )}

              {/* Kurumsal Değerler */}
              {publishedValues.length > 0 && (
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-shadow">
                  <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-6 text-white">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <Heart className="w-8 h-8" />
                        <h3 className="text-xl font-bold">Kurumsal Değerler</h3>
                      </div>
                      {publishedValues.length > 1 && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={prevValue}
                            className="p-1 rounded-full bg-white bg-opacity-20 hover:bg-opacity-30 transition-colors"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          <span className="text-sm font-medium px-2">
                            {currentValueIndex + 1}/{publishedValues.length}
                          </span>
                          <button
                            onClick={nextValue}
                            className="p-1 rounded-full bg-white bg-opacity-20 hover:bg-opacity-30 transition-colors"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                    <p className="text-purple-100">Değerlerimiz ve ilkelerimiz</p>
                  </div>
                  
                  <div className="p-6">
                    {publishedValues.length > 0 && (
                      <ValueCard value={publishedValues[currentValueIndex]} />
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          // İçerik yoksa oluşturma ekranı
          <div className="text-center py-16">
            <div className="max-w-2xl mx-auto">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-8">
                <Building2 className="w-12 h-12 text-white" />
              </div>
              
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Ana Sayfa İçeriği Oluşturun
              </h2>
              <p className="text-xl text-gray-600 mb-8">
                Personel destek sisteminiz için içerik oluşturmaya başlayın
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 max-w-4xl mx-auto">
                <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                  <TrendingUp className="w-8 h-8 text-green-600 mx-auto mb-3" />
                  <h3 className="font-semibold text-green-900 mb-2">Güncel Gelişmeler</h3>
                  <p className="text-sm text-green-700">Son haberler ve gelişmeler</p>
                </div>
                
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
                  <Heart className="w-8 h-8 text-purple-600 mx-auto mb-3" />
                  <h3 className="font-semibold text-purple-900 mb-2">Kurumsal Değerler</h3>
                  <p className="text-sm text-purple-700">Değerlerimiz ve ilkelerimiz</p>
                </div>
              </div>
              
              <button
                onClick={openContentCreationModal}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 rounded-lg font-semibold text-lg transition-all duration-200 flex items-center gap-3 mx-auto shadow-lg hover:shadow-xl"
              >
                <Plus className="w-6 h-6" />
                İçerik Oluşturmaya Başla
              </button>
            </div>
          </div>
        )}

        {/* Yönetim Paneli - SADECE YAYINLANMAMIŞ İÇERİK VARSA GÖSTER */}
        {showManagementPanel && shouldShowManagementButton && (
          <div className="mt-8 bg-white rounded-lg shadow-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">İçerik Yönetimi</h3>
              <button
                onClick={toggleManagementPanel}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  <span className="font-medium text-green-900">Güncel Gelişmeler</span>
                </div>
                <div className="text-2xl font-bold text-green-600">{currentDevelopments.length}</div>
                <div className="text-sm text-green-700">
                  {publishedDevelopments.length} yayında • {unpublishedDevelopments.length} beklemede
                </div>
              </div>
              
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Heart className="w-5 h-5 text-purple-600" />
                  <span className="font-medium text-purple-900">Kurumsal Değerler</span>
                </div>
                <div className="text-2xl font-bold text-purple-600">{corporateValues.length}</div>
                <div className="text-sm text-purple-700">
                  {publishedValues.length} yayında • {unpublishedValues.length} beklemede
                </div>
              </div>
            </div>
            
            {/* Yayın Durumu Özeti */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900 mb-1">Yayın Durumu</h4>
                  <p className="text-sm text-gray-600">
                    {totalPublishedContent} içerik yayında • {totalUnpublishedContent} içerik beklemede
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {totalPublishedContent > 0 && (
                    <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                      ✅ Ana Sayfa Aktif
                    </span>
                  )}
                  {totalUnpublishedContent > 0 && (
                    <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-medium">
                      ⏳ {totalUnpublishedContent} Beklemede
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={openContentCreationModal}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Yeni İçerik
                </button>
                
                {/* İçerikleri Temizle Butonu - Sadece içerik varsa göster */}
                {hasAnyContent && (
                  <button
                    onClick={openContentDeletionModal}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    İçerikleri Temizle
                  </button>
                )}
                
                {hasUnpublishedContent && (
                  <button
                    onClick={showPublishAllConfirmation}
                    disabled={loading}
                    className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Yayınlanıyor...
                      </>
                    ) : (
                      <>
                        <Rocket className="w-4 h-4" />
                        Tümünü Yayına Al ({totalUnpublishedContent})
                      </>
                    )}
                  </button>
                )}
              </div>
              
              <div className="text-sm text-gray-500">
                Toplam {currentDevelopments.length + corporateValues.length} içerik
              </div>
            </div>
          </div>
        )}
      </div>

      {/* İçerik Silme Modalı */}
      {showContentDeletionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <Trash2 className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">İçerikleri Temizle</h3>
                  <p className="text-sm text-gray-600">Silmek istediğiniz içerikleri seçin</p>
                </div>
              </div>
              <button 
                onClick={() => setShowContentDeletionModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 max-h-[70vh] overflow-y-auto">
              {/* Uyarı Mesajı */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-2 text-red-800 mb-2">
                  <AlertCircle className="w-5 h-5" />
                  <span className="font-medium">Dikkat!</span>
                </div>
                <p className="text-sm text-red-700">
                  Silinen içerikler geri alınamaz. Bu işlem kalıcıdır.
                </p>
              </div>

              {/* İçerik Listesi */}
              <div className="space-y-6">
                {/* Güncel Gelişmeler */}
                {currentDevelopments.length > 0 && (
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-green-600" />
                      Güncel Gelişmeler ({currentDevelopments.length})
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {currentDevelopments.map((development) => (
                        <div key={development.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                          <div className="flex items-start justify-between mb-2">
                            <h5 className="font-medium text-gray-900 line-clamp-2 flex-1">
                              {development.baslik}
                            </h5>
                            <button
                              onClick={() => deleteContent('development', development.id)}
                              className="text-red-600 hover:text-red-800 p-1 ml-2"
                              title="Sil"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
                              {development.kategori}
                            </span>
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              development.isPublished 
                                ? 'bg-purple-100 text-purple-800' 
                                : 'bg-orange-100 text-orange-800'
                            }`}>
                              {development.isPublished ? 'Yayında' : 'Beklemede'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                            {development.icerik}
                          </p>
                          <div className="text-xs text-gray-500">
                            📅 {new Date(development.tarih).toLocaleDateString('tr-TR')}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Kurumsal Değerler */}
                {corporateValues.length > 0 && (
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Heart className="w-5 h-5 text-purple-600" />
                      Kurumsal Değerler ({corporateValues.length})
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {corporateValues.map((value) => (
                        <div key={value.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                          <div className="flex items-start justify-between mb-2">
                            <h5 className="font-medium text-gray-900 line-clamp-2 flex-1">
                              {value.baslik}
                            </h5>
                            <button
                              onClick={() => deleteContent('value', value.id)}
                              className="text-red-600 hover:text-red-800 p-1 ml-2"
                              title="Sil"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              value.isPublished 
                                ? 'bg-purple-100 text-purple-800' 
                                : 'bg-orange-100 text-orange-800'
                            }`}>
                              {value.isPublished ? 'Yayında' : 'Beklemede'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                            {value.aciklama}
                          </p>
                          <div className="text-xs text-gray-500">
                            📅 {new Date(value.tarih).toLocaleDateString('tr-TR')}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Boş Durum */}
                {currentDevelopments.length === 0 && corporateValues.length === 0 && (
                  <div className="text-center py-8">
                    <div className="text-6xl mb-4">📭</div>
                    <div className="text-xl font-medium text-gray-700 mb-2">Henüz içerik yok</div>
                    <div className="text-gray-500">Silinecek içerik bulunmuyor.</div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end p-6 border-t border-gray-200 bg-gray-50">
              <button 
                onClick={() => setShowContentDeletionModal(false)}
                className="px-6 py-2 text-gray-600 hover:text-gray-800 transition-colors font-medium"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Yayına Alma Onay Modalı */}
      {showPublishConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <Rocket className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Tümünü Yayına Al</h3>
                  <p className="text-sm text-gray-600">Tüm içerikler ana sayfada görünür olacak</p>
                </div>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <h4 className="font-medium text-blue-900 mb-2">Yayınlanacak İçerikler:</h4>
                <ul className="space-y-1 text-sm text-blue-800">
                  {unpublishedDevelopments.length > 0 && (
                    <li>• {unpublishedDevelopments.length} Güncel Gelişme</li>
                  )}
                  {unpublishedValues.length > 0 && (
                    <li>• {unpublishedValues.length} Kurumsal Değer</li>
                  )}
                </ul>
              </div>
              
              <p className="text-gray-600 text-sm mb-6">
                Bu işlem sonrası ana sayfa ziyaretçiler için hazır hale gelecektir. 
                Yayınlanan içerikler sırasıyla görüntülenecektir.
              </p>
              
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowPublishConfirm(false)}
                  className="flex-1 px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors font-medium"
                >
                  İptal
                </button>
                <button
                  onClick={publishAllContent}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Yayına Al
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* İçerik Türü Seçim Modalı */}
      {showContentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">İçerik Türü Seçin</h3>
                <p className="text-gray-600">Oluşturmak istediğiniz içerik türünü seçerek başlayın</p>
              </div>
              <button 
                onClick={() => setShowContentModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Güncel Gelişmeler */}
                <div className="border border-gray-200 rounded-lg p-6 hover:border-green-500 hover:shadow-md transition-all cursor-pointer"
                     onClick={() => selectContentType('guncel-gelismeler')}>
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                    <TrendingUp className="w-6 h-6 text-green-600" />
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">Güncel Gelişmeler</h4>
                  <p className="text-gray-600 text-sm mb-4">Son haberler ve gelişmeler</p>
                  <div className="space-y-1 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <CheckCircle className="w-3 h-3 text-green-500" />
                      <span>Kategori sistemi</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <CheckCircle className="w-3 h-3 text-green-500" />
                      <span>Haber görseli desteği</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <CheckCircle className="w-3 h-3 text-green-500" />
                      <span>Tarih takibi</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <CheckCircle className="w-3 h-3 text-green-500" />
                      <span>Çoklu içerik</span>
                    </div>
                  </div>
                  <button className="w-full mt-4 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2">
                    <Plus className="w-4 h-4" />
                    Oluşturmaya Başla
                  </button>
                </div>

                {/* Kurumsal Değerler */}
                <div className="border border-gray-200 rounded-lg p-6 hover:border-purple-500 hover:shadow-md transition-all cursor-pointer"
                     onClick={() => selectContentType('kurumsal-degerler')}>
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                    <Heart className="w-6 h-6 text-purple-600" />
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">Kurumsal Değerler</h4>
                  <p className="text-gray-600 text-sm mb-4">Değerlerimiz ve ilkelerimiz</p>
                  <div className="space-y-1 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <CheckCircle className="w-3 h-3 text-green-500" />
                      <span>Örnek davranışlar</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <CheckCircle className="w-3 h-3 text-green-500" />
                      <span>İlham verici sözler</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <CheckCircle className="w-3 h-3 text-green-500" />
                      <span>Değer açıklamaları</span>
                    </div>
                  </div>
                  <button className="w-full mt-4 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2">
                    <Plus className="w-4 h-4" />
                    Oluşturmaya Başla
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* İçerik Oluşturma Formu */}
      {showCreationForm && contentForm.type && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">İçerik Oluştur</h3>
                <p className="text-gray-600">Formu doldurun ve içeriğinizi oluşturun</p>
              </div>
              <button 
                onClick={() => setShowCreationForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              {contentForm.type === 'guncel-gelismeler' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Başlık <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={contentForm.data.baslik || ''}
                      onChange={(e) => updateFormData('baslik', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="Gelişme başlığı"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Kategori <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={contentForm.data.kategori || ''}
                      onChange={(e) => updateFormData('kategori', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      <option value="">Kategori seçin</option>
                      <option value="Duyuru">Duyuru</option>
                      <option value="Haber">Haber</option>
                      <option value="Güncelleme">Güncelleme</option>
                      <option value="Etkinlik">Etkinlik</option>
                      <option value="Başarı">Başarı</option>
                      <option value="Proje">Proje</option>
                    </select>
                  </div>

                  {/* Haber Görseli Alanı */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Haber Görseli <span className="text-red-500">*</span>
                    </label>
                    <div className="space-y-3">
                      <input
                        type="file"
                        onChange={handleImageUpload}
                        accept=".jpg,.jpeg,.png,.webp"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                      
                      {contentForm.data.haberGorseli && (
                        <div className="relative bg-gray-50 p-3 rounded-lg border border-gray-200">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-700">
                                {contentForm.data.haberGorseli.name} ({(contentForm.data.haberGorseli.size / 1024).toFixed(1)} KB)
                              </span>
                            </div>
                            <button
                              onClick={removeImage}
                              className="text-red-600 hover:text-red-800 p-1"
                              title="Görseli Kaldır"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="mt-2 text-xs text-gray-500">
                            ✅ Bu görsel haber kartında görüntülenecek
                          </div>
                        </div>
                      )}
                      
                      <div className="text-xs text-gray-500">
                        Desteklenen formatlar: JPG, JPEG, PNG, WEBP • Maksimum boyut: 5MB
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      İçerik <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={contentForm.data.icerik || ''}
                      onChange={(e) => updateFormData('icerik', e.target.value)}
                      rows={6}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="Gelişme detayları..."
                    />
                  </div>
                </div>
              )}

              {contentForm.type === 'kurumsal-degerler' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Başlık <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={contentForm.data.baslik || ''}
                      onChange={(e) => updateFormData('baslik', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="Değer başlığı (örn: Dürüstlük, Takım Çalışması)"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Açıklama <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={contentForm.data.aciklama || ''}
                      onChange={(e) => updateFormData('aciklama', e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="Bu değerin açıklaması..."
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Örnek Davranışlar
                    </label>
                    <textarea
                      value={contentForm.data.ornekDavranislar || ''}
                      onChange={(e) => updateFormData('ornekDavranislar', e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="Her satıra bir örnek davranış yazın..."
                    />
                    <p className="text-xs text-gray-500 mt-1">Her satıra bir örnek davranış yazın</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      İlham Verici Söz
                    </label>
                    <input
                      type="text"
                      value={contentForm.data.soz || ''}
                      onChange={(e) => updateFormData('soz', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="Bu değerle ilgili ilham verici bir söz..."
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setShowCreationForm(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors font-medium"
                >
                  İptal
                </button>
                <button
                  onClick={saveContent}
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Kaydediliyor...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      İçeriği Kaydet
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Development Card Component
const DevelopmentCard = ({ development, loadNewsImage }: { 
  development: CurrentDevelopment; 
  loadNewsImage: (dev: CurrentDevelopment) => Promise<string | null>;
}) => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);

  useEffect(() => {
    const loadImage = async () => {
      if (development.haberGorseli) {
        const src = await loadNewsImage(development);
        setImageSrc(src);
      }
    };
    loadImage();
  }, [development, loadNewsImage]);

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
          {development.kategori}
        </span>
        <span className="text-xs text-gray-500">
          {new Date(development.tarih).toLocaleDateString('tr-TR')}
        </span>
      </div>
      
      {/* Haber Görseli */}
      {imageSrc && (
        <div className="mb-4 rounded-lg overflow-hidden">
          <img
            src={imageSrc}
            alt={development.baslik}
            className="w-full h-48 object-cover"
          />
        </div>
      )}
      
      <h4 className="font-semibold text-gray-900 mb-2">{development.baslik}</h4>
      <p className="text-gray-600 text-sm">{development.icerik}</p>
    </div>
  );
};

// Value Card Component
const ValueCard = ({ value }: { value: CorporateValue }) => {
  return (
    <div>
      <h4 className="font-semibold text-gray-900 mb-3">{value.baslik}</h4>
      <p className="text-gray-600 mb-4">{value.aciklama}</p>
      
      {value.ornekDavranislar.length > 0 && (
        <div className="mb-4">
          <h5 className="font-medium text-gray-900 mb-2">Örnek Davranışlar:</h5>
          <ul className="space-y-1">
            {value.ornekDavranislar.slice(0, 3).map((davranis, index) => (
              <li key={index} className="text-sm text-gray-600 flex items-center gap-2">
                <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />
                {davranis}
              </li>
            ))}
            {value.ornekDavranislar.length > 3 && (
              <li className="text-xs text-gray-500">
                +{value.ornekDavranislar.length - 3} daha fazla davranış
              </li>
            )}
          </ul>
        </div>
      )}
      
      {value.soz && (
        <blockquote className="border-l-4 border-purple-500 pl-4 italic text-gray-700 text-sm">
          "{value.soz}"
        </blockquote>
      )}
    </div>
  );
};

export default Homepage;