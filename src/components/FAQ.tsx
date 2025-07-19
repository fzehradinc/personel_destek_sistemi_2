import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Rocket, RotateCcw, CheckCircle, Upload, Search, Trash2 } from 'lucide-react';
import { useElectronStorage } from '../hooks/useElectronStorage';

interface FAQItem {
  id: string;
  Soru: string;
  Cevap: string;
  uploadDate: string;
  fileName?: string;
}

const FAQ = () => {
  const [faqData, setFaqData] = useState<FAQItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [isPublished, setIsPublished] = useState(false);

  // Electron Storage Hook
  const storage = useElectronStorage();

  // Verileri yükle (Electron veya localStorage'dan) - SENKRON HALE GETİRİLDİ
  useEffect(() => {
    const loadData = async () => {
      if (!storage.isReady) return;

      try {
        console.log('📊 [FAQ] Veriler yükleniyor...');
        
        // SSS verilerini yükle
        const faqs = await storage.readJsonFile('faq_data.json');
        if (faqs && Array.isArray(faqs)) {
          setFaqData(faqs);
          console.log('💾 [FAQ] SSS verileri yüklendi:', faqs.length);
        }

        // Yayın durumunu kontrol et - SENKRON OKUMA
        const yayinData = await storage.readJsonFile('yayinda.json');
        console.log('📊 [FAQ] Yayın durumu verisi:', yayinData);
        
        if (yayinData && yayinData.SSSModulu === true) {
          setIsPublished(true);
          console.log('📊 [FAQ] SSS modülü yayın durumu: Yayında');
        } else {
          setIsPublished(false);
          console.log('📊 [FAQ] SSS modülü yayın durumu: Yayında değil');
        }
      } catch (error) {
        console.error('❌ [FAQ] Veri yükleme hatası:', error);
      }
    };

    loadData();
  }, [storage.isReady]);

  // SSS verilerini kaydet
  const saveFAQData = async (data: FAQItem[]) => {
    try {
      const success = await storage.writeJsonFile('faq_data.json', data);
      if (success) {
        console.log('💾 [FAQ] SSS verileri kaydedildi');
      } else {
        console.error('❌ [FAQ] SSS verileri kaydedilemedi');
      }
    } catch (error) {
      console.error('❌ [FAQ] SSS verileri kaydetme hatası:', error);
    }
  };

  // Modülü yayına alma fonksiyonu - SENKRON HALE GETİRİLDİ
  const publishModule = async () => {
    if (faqData.length === 0) {
      alert('Modül yayına alınabilmesi için en az bir SSS içeriği yüklenmelidir.');
      return;
    }

    // Özel uyarı penceresi
    const confirmMessage = `⚠️ Bu işlemi onayladığınızda Sıkça Sorulan Sorular modülü yayına alınacaktır. Aşağıdaki işlemler kalıcı olarak devre dışı bırakılacaktır:

• Yeni SSS Excel dosyası yüklenemez
• Yüklenen soru-cevap içerikleri silinemez veya düzenlenemez
• "Modülü Sıfırla" butonu pasifleştirilir

Sistem yalnızca son kullanıcı bilgilendirme ekranı olarak çalışacaktır.

Devam etmek istiyor musunuz?`;

    if (confirm(confirmMessage)) {
      try {
        console.log('🚀 [FAQ] Modül yayına alınıyor...');
        
        // SENKRON GÜNCELLEME
        const success = await storage.updateYayinDurumu('SSSModulu', true);
        
        if (success) {
          setIsPublished(true);
          alert('✅ Sıkça Sorulan Sorular modülü artık yayında! Görsel sunum modu aktif edildi.');
          console.log('🚀 [FAQ] SSS modülü yayına alındı');
        } else {
          alert('❌ Yayına alma işlemi başarısız oldu.');
          console.error('❌ [FAQ] Yayına alma başarısız');
        }
      } catch (error) {
        console.error('❌ [FAQ] Yayına alma hatası:', error);
        alert('❌ Yayına alma işlemi sırasında hata oluştu.');
      }
    }
  };

  // Modülü sıfırlama fonksiyonu - SENKRON HALE GETİRİLDİ
  const resetModule = async () => {
    if (confirm('Sıkça Sorulan Sorular modülünü sıfırlamak istediğinizden emin misiniz? Tüm yüklenen SSS içerikleri ve yayın durumu silinecektir.')) {
      try {
        console.log('🔄 [FAQ] Modül sıfırlanıyor...');
        
        // Verileri sıfırla
        await storage.writeJsonFile('faq_data.json', []);
        
        // SENKRON YAYIN DURUMU SIFIRLAMA
        const resetSuccess = await storage.updateYayinDurumu('SSSModulu', false);
        
        if (resetSuccess) {
          // State'leri sıfırla
          setFaqData([]);
          setIsPublished(false);
          setSearchTerm('');
          setExpandedItems(new Set());
          
          console.log('🔄 [FAQ] SSS modülü sıfırlandı');
        } else {
          console.error('❌ [FAQ] Yayın durumu sıfırlanamadı');
          alert('❌ Yayın durumu sıfırlanırken hata oluştu.');
        }
      } catch (error) {
        console.error('❌ [FAQ] Sıfırlama hatası:', error);
        alert('❌ Sıfırlama işlemi sırasında hata oluştu.');
      }
    }
  };

  // Tüm SSS verilerini temizle
  const clearAllFAQ = async () => {
    if (confirm('Tüm SSS verilerini silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.')) {
      try {
        setFaqData([]);
        await storage.writeJsonFile('faq_data.json', []);
      } catch (error) {
        console.error('❌ Tüm SSS verilerini temizleme hatası:', error);
        alert('❌ SSS verileri temizlenirken hata oluştu.');
      }
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    const reader = new FileReader();

    reader.onload = async (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(sheet) as any[];
        
        console.log('FAQ verisi:', jsonData);
        
        // Verileri işle ve ID ekle
        const processedData: FAQItem[] = jsonData
          .filter(item => item.Soru && item.Cevap)
          .map((item, index) => ({
            id: `${Date.now()}_${index}`,
            Soru: item.Soru.toString().trim(),
            Cevap: item.Cevap.toString().trim(),
            uploadDate: new Date().toISOString().split('T')[0],
            fileName: file.name
          }));

        if (processedData.length > 0) {
          const newFaqData = [...faqData, ...processedData];
          setFaqData(newFaqData);
          await saveFAQData(newFaqData);
          alert(`✅ ${processedData.length} SSS içeriği başarıyla eklendi ve kalıcı olarak kaydedildi!`);
        } else {
          alert('Excel dosyasında geçerli SSS verileri bulunamadı. Lütfen format kontrolü yapın.');
        }
      } catch (error) {
        console.error('Excel dosyası işleme hatası:', error);
        alert('Excel dosyası işlenirken hata oluştu: ' + (error as Error).message);
      } finally {
        setLoading(false);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const filteredFAQ = faqData.filter(item =>
    item.Soru?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.Cevap?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleExpanded = (index: number) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedItems(newExpanded);
  };

  return (
    <div className="w-full min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-red-100 p-3 rounded-lg">
              <span className="text-2xl">❓</span>
            </div>
            <div>
              {/* REMOVED: 🚀 Yayında badge from header */}
              <div className="flex items-center gap-3">
                <h2 className="text-3xl font-bold text-gray-900">Sıkça Sorulan Sorular</h2>
              </div>
              <p className="text-gray-600">Excel dosyalarından SSS içeriklerini yükleyin ve kalıcı olarak saklayın</p>
            </div>
          </div>

          {/* İstatistikler */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-red-50 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-xl">❓</span>
                <span className="text-sm font-medium text-red-900">Toplam SSS</span>
              </div>
              <div className="text-2xl font-bold text-red-600 mt-1">
                {faqData.length}
              </div>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <Search className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">Filtrelenen</span>
              </div>
              <div className="text-2xl font-bold text-blue-600 mt-1">
                {filteredFAQ.length}
              </div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-green-900">Son Yükleme</span>
              </div>
              <div className="text-sm font-bold text-green-600 mt-1">
                {faqData.length > 0 
                  ? new Date(Math.max(...faqData.map(f => new Date(f.uploadDate).getTime()))).toLocaleDateString('tr-TR')
                  : 'Henüz yok'
                }
              </div>
            </div>
          </div>

          {/* REMOVED: Yayın Durumu Bilgisi - Bu bölüm tamamen kaldırıldı */}

          {/* Dosya Yükleme - Sadece yayınlanmamışsa göster */}
          {!isPublished && (
            <div className="flex flex-col sm:flex-row gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <div className="relative">
                  <input 
                    type="file" 
                    accept=".xlsx,.xls" 
                    onChange={handleFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={loading}
                  />
                  <div className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2">
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Yükleniyor...
                      </>
                    ) : (
                      <>
                        <Upload className="w-5 h-5" />
                        📄 FAQ Excel Dosyası Seç
                      </>
                    )}
                  </div>
                </div>
              </label>
              
              {faqData.length > 0 && (
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-green-600 bg-green-50 px-3 py-2 rounded-lg">
                    <CheckCircle className="w-5 h-5" />
                    <span className="text-sm font-medium">
                      {faqData.length} SSS kalıcı olarak kaydedildi
                    </span>
                  </div>
                  
                  <button
                    onClick={clearAllFAQ}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    🗑️ Tümünü Temizle
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Kalıcı Depolama Bilgisi - Sadece yayınlanmamışsa göster */}
          {!isPublished && (
            <div className="mt-4 text-sm text-gray-600">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                {storage.isElectron ? '🖥️ Electron Modu - Kalıcı Depolama Aktif' : '🌐 Web Modu - Geçici Depolama'}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-green-800">
                <div>
                  <strong>📊 Excel Format Gereksinimleri:</strong><br/>
                  • <strong>Soru:</strong> SSS sorusu<br/>
                  • <strong>Cevap:</strong> Sorunun detaylı cevabı<br/>
                  • Her satır bir soru-cevap çifti içermelidir
                </div>
                <div>
                  {storage.isElectron ? (
                    <>
                      <strong>🖥️ Electron Depolama:</strong><br/>
                      • Veriler kalıcı dosya sisteminde saklanır<br/>
                      • Uygulama kapatılsa bile veriler korunur<br/>
                      • Otomatik yedekleme ve geri yükleme<br/>
                      • Yüksek güvenlik ve performans
                    </>
                  ) : (
                    <>
                      <strong>🌐 Tarayıcı Depolama:</strong><br/>
                      • Veriler localStorage'da saklanır<br/>
                      • Tarayıcı verileri temizlenene kadar korunur<br/>
                      • İçe/Dışa aktarım ile yedekleme yapılabilir<br/>
                      • İnternet bağlantısı gerektirmez
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Yayınlama Kontrolü - Sadece yayınlanmamışsa ve SSS varsa göster */}
        {!isPublished && faqData.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Rocket className="w-5 h-5" />
              📦 Modül Yayın Kontrolü
            </h2>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 mb-2">
                  {faqData.length} SSS içeriği yüklendi. Modülü yayına almaya hazır mısınız?
                </p>
                <p className="text-sm text-gray-500">
                  Yayına aldıktan sonra sadece SSS içerikleri görüntülenebilir, yeni yükleme yapılamaz.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={resetModule}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Modülü Sıfırla
                </button>
                <button
                  onClick={publishModule}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  <Rocket className="w-4 h-4" />
                  📦 Modül Yayına Hazır
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Arama Kutusu - Her zaman görünür */}
        {faqData.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex-1">
              <input
                type="text"
                placeholder="🔍 Soru veya cevap içinde ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            
            {filteredFAQ.length > 0 && (
              <div className="mt-4 flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  <span className="font-medium">{filteredFAQ.length}</span> SSS içeriği bulundu
                  {searchTerm && ` • "${searchTerm}" için sonuçlar`}
                </div>
                {!isPublished && (
                  <div className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                    ✏️ Düzenleme modu aktif
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Yükleme Durumu */}
        {loading && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
              <div className="text-lg font-medium text-gray-700">Excel dosyası işleniyor...</div>
            </div>
          </div>
        )}

        {/* SSS İçerikleri */}
        {!loading && filteredFAQ.length > 0 && (
          <div className="space-y-4">
            {filteredFAQ.map((item, index) => (
              <div key={item.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <button
                  onClick={() => toggleExpanded(index)}
                  className="w-full px-6 py-4 text-left hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-inset"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-gray-900 pr-4">
                        ❓ {item.Soru}
                      </h3>
                    </div>
                    <div className="flex-shrink-0">
                      <span className={`transform transition-transform duration-200 text-gray-400 ${
                        expandedItems.has(index) ? 'rotate-180' : ''
                      }`}>
                        ▼
                      </span>
                    </div>
                  </div>
                </button>
                
                {expandedItems.has(index) && (
                  <div className="px-6 pb-4 border-t border-gray-100">
                    <div className="pt-4 text-gray-700 leading-relaxed whitespace-pre-wrap">
                      💡 {item.Cevap}
                    </div>
                    {/* Meta bilgiler - Sadece yayınlanmamışsa göster */}
                    {!isPublished && item.fileName && (
                      <div className="mt-4 pt-3 border-t border-gray-100 text-xs text-gray-500">
                        📁 {item.fileName} • 📅 {new Date(item.uploadDate).toLocaleDateString('tr-TR')}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Arama Sonucu Bulunamadı */}
        {!loading && faqData.length > 0 && filteredFAQ.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <div className="text-center text-gray-500">
              <div className="text-6xl mb-4">🔍</div>
              <div className="text-xl font-medium mb-2">Arama sonucu bulunamadı</div>
              <div className="text-gray-600">
                "<strong>{searchTerm}</strong>" için sonuç bulunamadı
              </div>
            </div>
          </div>
        )}

        {/* Boş Durum */}
        {!loading && faqData.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12">
            <div className="text-center text-gray-500">
              <div className="text-8xl mb-6">❓</div>
              <div className="text-2xl font-bold mb-3 text-gray-700">
                {isPublished ? 'SSS Modülü Yayında' : 'Kalıcı SSS Yönetimi'}
              </div>
              <div className="text-lg text-gray-600 mb-4">
                {isPublished 
                  ? 'Bu modül yayında ancak henüz SSS içeriği bulunmuyor'
                  : 'Excel dosyanızı yükleyerek başlayın - verileriniz tarayıcıda saklanacak!'
                }
              </div>
              {!isPublished && (
                <div className="text-sm text-gray-500 max-w-2xl mx-auto space-y-2">
                  <div><strong>💾 Tarayıcı Depolama:</strong> Yüklenen SSS verileri localStorage'da saklanır</div>
                  <div><strong>🔍 Arama Özelliği:</strong> Soru ve cevaplarda hızlı arama yapabilirsiniz</div>
                  <div><strong>📂 Genişletilebilir:</strong> Sorulara tıklayarak cevapları görüntüleyebilirsiniz</div>
                  <div><strong>🚀 Yayın Sistemi:</strong> Hazır içerikleri yayına alarak koruma altına alabilirsiniz</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FAQ;