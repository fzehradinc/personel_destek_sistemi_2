import React, { useState, useEffect, useCallback } from 'react';
import { TrendingUp, Heart, Plus, X, Building2, Rocket, Settings, CheckCircle, AlertCircle, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { useWebStorage } from '../hooks/useWebStorage';

const Homepage = () => {
  const [guncelGelismeler, setGuncelGelismeler] = useState<any[]>([]);
  const [kurumsalDegerler, setKurumsalDegerler] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isPublished, setIsPublished] = useState(false);

  // Form state'leri
  const [showAddForm, setShowAddForm] = useState<'gelisme' | 'deger' | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    date: new Date().toISOString().split('T')[0]
  });

  // Web Storage Hook
  const storage = useWebStorage();

  // Verileri yükle - SENKRON HALE GETİRİLDİ
  useEffect(() => {
    const loadData = async () => {
      if (!storage.isReady) return;

      // Performance: Sadece bir kez yükle - gereksiz yüklemeyi önle
      if (guncelGelismeler.length > 0 || kurumsalDegerler.length > 0 || isPublished) return;
      
      try {
        console.time('⏱️ [HOMEPAGE] Veri yükleme');
        console.log('📊 [HOMEPAGE] Veriler yükleniyor...');
        
        // Performance: Güncel gelişmeleri yükle - cache'den hızlı okuma
        const gelismeler = await storage.readJsonFile('guncel_gelismeler.json');
        if (gelismeler && Array.isArray(gelismeler)) {
          setGuncelGelismeler(gelismeler);
          console.log('💾 [HOMEPAGE] Güncel gelişmeler yüklendi:', gelismeler.length);
        }

        // Performance: Kurumsal değerleri yükle - cache'den hızlı okuma
        const degerler = await storage.readJsonFile('kurumsal_degerler.json');
        if (degerler && Array.isArray(degerler)) {
          setKurumsalDegerler(degerler);
          console.log('💾 [HOMEPAGE] Kurumsal değerler yüklendi:', degerler.length);
        }

        // Performance: Yayın durumunu kontrol et - cache'den hızlı okuma
        const yayinData = await storage.readJsonFile('yayinda.json');
        console.log('📊 [HOMEPAGE] Yayın durumu verisi:', yayinData);
        
        if (yayinData && yayinData.AnaSayfa === true) {
          setIsPublished(true);
          console.log('📊 [HOMEPAGE] Ana sayfa yayın durumu: Yayında');
        } else {
          setIsPublished(false);
          console.log('📊 [HOMEPAGE] Ana sayfa yayın durumu: Yayında değil');
        }
        
        console.timeEnd('⏱️ [HOMEPAGE] Veri yükleme');
      } catch (error) {
        console.error('❌ [HOMEPAGE] Veri yükleme hatası:', error);
        console.timeEnd('⏱️ [HOMEPAGE] Veri yükleme');
      }
    };

    loadData();
  }, [storage.isReady]); // Dependency array'i minimal tut

  // Verileri kaydet
  const saveData = async (type: 'gelisme' | 'deger', data: any[]) => {
    console.time(`⏱️ [HOMEPAGE] ${type} kaydetme`);
    
    try {
      const filename = type === 'gelisme' ? 'guncel_gelismeler.json' : 'kurumsal_degerler.json';
      const success = await storage.writeJsonFile(filename, data);
      if (success) {
        console.log(`💾 [HOMEPAGE] ${type} verileri kaydedildi`);
      } else {
        console.error(`❌ [HOMEPAGE] ${type} verileri kaydedilemedi`);
      }
      console.timeEnd(`⏱️ [HOMEPAGE] ${type} kaydetme`);
    } catch (error) {
      console.error(`❌ [HOMEPAGE] ${type} verileri kaydetme hatası:`, error);
      console.timeEnd(`⏱️ [HOMEPAGE] ${type} kaydetme`);
    }
  };

  // Ana sayfa modülünü yayına alma fonksiyonu - SENKRON HALE GETİRİLDİ
  const publishModule = async () => {
    if (guncelGelismeler.length === 0 && kurumsalDegerler.length === 0) {
      alert('Ana sayfa modülü yayına alınabilmesi için en az bir güncel gelişme veya kurumsal değer eklenmesi gereklidir.');
      return;
    }

    const confirmMessage = `⚠️ Bu işlemi onayladığınızda Ana Sayfa modülü yayına alınacaktır. Aşağıdaki işlemler kalıcı olarak devre dışı bırakılacaktır:

• Yeni güncel gelişme eklenemez
• Yeni kurumsal değer eklenemez
• Mevcut içerikler silinemez veya düzenlenemez
• "Modülü Sıfırla" butonu pasifleştirilir

Sistem yalnızca son kullanıcı görüntüleme modu olarak çalışacaktır.

Devam etmek istiyor musunuz?`;

    if (confirm(confirmMessage)) {
      try {
        console.log('🚀 [HOMEPAGE] Ana sayfa modülü yayına alınıyor...');
        
        // Tüm içerikleri yayınlanmış olarak işaretle
        const updatedGelismeler = guncelGelismeler.map(g => ({ ...g, isPublished: true }));
        const updatedDegerler = kurumsalDegerler.map(d => ({ ...d, isPublished: true }));
        
        await saveData('gelisme', updatedGelismeler);
        await saveData('deger', updatedDegerler);
        
        setGuncelGelismeler(updatedGelismeler);
        setKurumsalDegerler(updatedDegerler);
        
        // SENKRON GÜNCELLEME
        const success = await storage.updateYayinDurumu('AnaSayfa', true);
        
        if (success) {
          setIsPublished(true);
          alert('✅ Ana Sayfa modülü artık yayında! Görsel sunum modu aktif edildi.');
          console.log('🚀 [HOMEPAGE] Ana sayfa modülü yayına alındı');
        } else {
          alert('❌ Yayına alma işlemi başarısız oldu.');
          console.error('❌ [HOMEPAGE] Yayına alma başarısız');
        }
      } catch (error) {
        console.error('❌ [HOMEPAGE] Yayına alma hatası:', error);
        alert('❌ Yayına alma işlemi sırasında hata oluştu.');
      }
    }
  };

  // Ana sayfa modülünü sıfırlama fonksiyonu - SENKRON HALE GETİRİLDİ
  const resetModule = async () => {
    if (confirm('Ana Sayfa modülünü sıfırlamak istediğinizden emin misiniz? Tüm güncel gelişmeler, kurumsal değerler ve yayın durumu silinecektir.')) {
      try {
        console.log('🔄 [HOMEPAGE] Ana sayfa modülü sıfırlanıyor...');
        
        // Verileri sıfırla
        await storage.writeJsonFile('guncel_gelismeler.json', []);
        await storage.writeJsonFile('kurumsal_degerler.json', []);
        
        // SENKRON YAYIN DURUMU SIFIRLAMA
        const resetSuccess = await storage.updateYayinDurumu('AnaSayfa', false);
        
        if (resetSuccess) {
          // State'leri sıfırla
          setGuncelGelismeler([]);
          setKurumsalDegerler([]);
          setIsPublished(false);
          setShowAddForm(null);
          setFormData({ title: '', content: '', date: new Date().toISOString().split('T')[0] });
          
          console.log('🔄 [HOMEPAGE] Ana sayfa modülü sıfırlandı');
        } else {
          console.error('❌ [HOMEPAGE] Yayın durumu sıfırlanamadı');
          alert('❌ Yayın durumu sıfırlanırken hata oluştu.');
        }
      } catch (error) {
        console.error('❌ [HOMEPAGE] Sıfırlama hatası:', error);
        alert('❌ Sıfırlama işlemi sırasında hata oluştu.');
      }
    }
  };

  // Yeni içerik ekleme
  const addContent = async (type: 'gelisme' | 'deger') => {
    if (!formData.title || !formData.content) {
      alert('Lütfen başlık ve içerik alanlarını doldurun.');
      return;
    }

    setLoading(true);
    try {
      const newItem = {
        id: Date.now().toString(),
        title: formData.title,
        content: formData.content,
        date: formData.date,
        isPublished: false
      };

      if (type === 'gelisme') {
        const updated = [...guncelGelismeler, newItem];
        setGuncelGelismeler(updated);
        await saveData('gelisme', updated);
      } else {
        const updated = [...kurumsalDegerler, newItem];
        setKurumsalDegerler(updated);
        await saveData('deger', updated);
      }

      setFormData({ title: '', content: '', date: new Date().toISOString().split('T')[0] });
      setShowAddForm(null);
      
      alert(`✅ ${type === 'gelisme' ? 'Güncel gelişme' : 'Kurumsal değer'} başarıyla eklendi!`);
    } catch (error) {
      console.error('❌ İçerik ekleme hatası:', error);
      alert('❌ İçerik eklenirken hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  // İçerik silme
  const deleteContent = async (type: 'gelisme' | 'deger', id: string) => {
    if (confirm('Bu içeriği silmek istediğinizden emin misiniz?')) {
      try {
        if (type === 'gelisme') {
          const updated = guncelGelismeler.filter(item => item.id !== id);
          setGuncelGelismeler(updated);
          await saveData('gelisme', updated);
        } else {
          const updated = kurumsalDegerler.filter(item => item.id !== id);
          setKurumsalDegerler(updated);
          await saveData('deger', updated);
        }
      } catch (error) {
        console.error('❌ İçerik silme hatası:', error);
        alert('❌ İçerik silinirken hata oluştu.');
      }
    }
  };

  const totalContent = guncelGelismeler.length + kurumsalDegerler.length;

  return (
    <div className="w-full min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-indigo-100 p-3 rounded-lg">
              <Building2 className="w-8 h-8 text-indigo-600" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-gray-900">Ana Sayfa İçeriği</h1>
                {isPublished && (
                  <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                    🚀 Yayında
                  </span>
                )}
              </div>
              <p className="text-gray-600">Güncel gelişmeler ve kurumsal değerleri yönetin</p>
            </div>
          </div>

          {/* İstatistikler */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-green-900">Güncel Gelişmeler</span>
              </div>
              <div className="text-2xl font-bold text-green-600 mt-1">
                {guncelGelismeler.length}
              </div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-purple-600" />
                <span className="text-sm font-medium text-purple-900">Kurumsal Değerler</span>
              </div>
              <div className="text-2xl font-bold text-purple-600 mt-1">
                {kurumsalDegerler.length}
              </div>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">Toplam İçerik</span>
              </div>
              <div className="text-2xl font-bold text-blue-600 mt-1">
                {totalContent}
              </div>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <Rocket className="w-5 h-5 text-orange-600" />
                <span className="text-sm font-medium text-orange-900">Durum</span>
              </div>
              <div className="text-sm font-bold text-orange-600 mt-1">
                {isPublished ? 'Yayında' : 'Taslak'}
              </div>
            </div>
          </div>

          {/* Yayın Durumu Bilgisi */}
          {isPublished && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 text-green-800">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">Bu modül yayında!</span>
              </div>
              <div className="text-sm text-green-700 mt-1">
                Ana sayfa içerikleri personel panelinde görüntüleniyor. Düzenleme ve ekleme işlemleri devre dışı.
              </div>
            </div>
          )}

          {/* Kalıcı Depolama Bilgisi - Sadece yayınlanmamışsa göster */}
          {!isPublished && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="font-medium text-blue-900 mb-2">
                🌐 Web Uygulaması - Tarayıcı Depolama
              </div>
              <div className="text-sm text-blue-800 space-y-1">
                <div>• <strong>Tarayıcı Depolama:</strong> Veriler localStorage'da saklanır</div>
                <div>• <strong>Kalıcılık:</strong> Tarayıcı verileri temizlenene kadar korunur</div>
                <div>• <strong>Yayın Sistemi:</strong> İçerikler yayınlandığında personel panelinde görünür</div>
                <div>• <strong>Rol Ayrımı:</strong> Admin düzenler, personel görüntüler</div>
              </div>
            </div>
          )}
        </div>

        {/* Yayınlama Kontrolü */}
        {!isPublished && totalContent > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Rocket className="w-5 h-5" />
              Modül Yayın Kontrolü
            </h2>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 mb-2">
                  {totalContent} içerik hazırlandı. Ana sayfa modülünü yayına almaya hazır mısınız?
                </p>
                <p className="text-sm text-gray-500">
                  Yayına aldıktan sonra içerikler personel panelinde görünür olacak.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={resetModule}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  <Settings className="w-4 h-4" />
                  Modülü Sıfırla
                </button>
                <button
                  onClick={publishModule}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  <Rocket className="w-4 h-4" />
                  Modül Yayına Hazır
                </button>
              </div>
            </div>
          </div>
        )}

        {/* İçerik Ekleme Alanları - Sadece yayınlanmamışsa göster */}
        {!isPublished && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Güncel Gelişmeler Ekleme */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  Güncel Gelişmeler
                </h2>
                <button
                  onClick={() => setShowAddForm(showAddForm === 'gelisme' ? null : 'gelisme')}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Ekle
                </button>
              </div>

              {showAddForm === 'gelisme' && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="space-y-4">
                    <input
                      type="text"
                      placeholder="Gelişme başlığı"
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                    <textarea
                      placeholder="Gelişme içeriği"
                      value={formData.content}
                      onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => addContent('gelisme')}
                        disabled={loading}
                        className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                      >
                        {loading ? 'Ekleniyor...' : 'Kaydet'}
                      </button>
                      <button
                        onClick={() => setShowAddForm(null)}
                        className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors"
                      >
                        İptal
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {guncelGelismeler.map((item) => (
                  <div key={item.id} className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-green-900 mb-1">{item.title}</h3>
                        <p className="text-green-800 text-sm mb-2">{item.content}</p>
                        <div className="text-xs text-green-600">
                          {new Date(item.date).toLocaleDateString('tr-TR')}
                        </div>
                      </div>
                      <button
                        onClick={() => deleteContent('gelisme', item.id)}
                        className="text-red-600 hover:text-red-800 p-1 ml-2"
                        title="Sil"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
                {guncelGelismeler.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <TrendingUp className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>Henüz güncel gelişme eklenmemiş</p>
                  </div>
                )}
              </div>
            </div>

            {/* Kurumsal Değerler Ekleme */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Heart className="w-5 h-5 text-purple-600" />
                  Kurumsal Değerler
                </h2>
                <button
                  onClick={() => setShowAddForm(showAddForm === 'deger' ? null : 'deger')}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Ekle
                </button>
              </div>

              {showAddForm === 'deger' && (
                <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                  <div className="space-y-4">
                    <input
                      type="text"
                      placeholder="Değer başlığı"
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                    <textarea
                      placeholder="Değer açıklaması"
                      value={formData.content}
                      onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => addContent('deger')}
                        disabled={loading}
                        className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                      >
                        {loading ? 'Ekleniyor...' : 'Kaydet'}
                      </button>
                      <button
                        onClick={() => setShowAddForm(null)}
                        className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors"
                      >
                        İptal
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {kurumsalDegerler.map((item) => (
                  <div key={item.id} className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-purple-900 mb-1">{item.title}</h3>
                        <p className="text-purple-800 text-sm">{item.content}</p>
                      </div>
                      <button
                        onClick={() => deleteContent('deger', item.id)}
                        className="text-red-600 hover:text-red-800 p-1 ml-2"
                        title="Sil"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
                {kurumsalDegerler.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Heart className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>Henüz kurumsal değer eklenmemiş</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Boş Durum - Sadece yayınlanmamışsa göster */}
        {!isPublished && totalContent === 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12">
            <div className="text-center text-gray-500">
              <div className="text-8xl mb-6">🏠</div>
              <div className="text-2xl font-bold mb-3 text-gray-700">Ana Sayfa İçerik Yönetimi</div>
              <div className="text-lg text-gray-600 mb-4">
                Personel destek sisteminizin ana sayfası için içerik oluşturmaya başlayın
              </div>
              <div className="text-sm text-gray-500 max-w-2xl mx-auto space-y-2">
                <div><strong>📈 Güncel Gelişmeler:</strong> Şirket haberleri, duyurular ve güncellemeler</div>
                <div><strong>💜 Kurumsal Değerler:</strong> Şirket değerleri, misyon ve vizyon açıklamaları</div>
                <div><strong>🚀 Yayın Sistemi:</strong> İçerikleri hazırlayıp personel panelinde yayınlayın</div>
                <div><strong>👥 Rol Ayrımı:</strong> Admin düzenler, personel görüntüler</div>
              </div>
            </div>
          </div>
        )}

        {/* Yayınlanmış Durum Gösterimi */}
        {isPublished && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12">
            <div className="text-center">
              <div className="text-8xl mb-6">🚀</div>
              <div className="text-2xl font-bold mb-3 text-gray-700">Ana Sayfa Modülü Yayında</div>
              <div className="text-lg text-gray-600 mb-6">
                Bu modül personel panelinde görüntüleniyor
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                {/* Güncel Gelişmeler Önizleme */}
                {guncelGelismeler.length > 0 && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <TrendingUp className="w-6 h-6 text-green-600" />
                      <h3 className="text-lg font-bold text-green-900">Güncel Gelişmeler</h3>
                    </div>
                    <div className="space-y-3">
                      {guncelGelismeler.slice(0, 3).map((item) => (
                        <div key={item.id} className="bg-white rounded p-3">
                          <h4 className="font-medium text-gray-900 text-sm">{item.title}</h4>
                          <p className="text-gray-600 text-xs mt-1 line-clamp-2">{item.content}</p>
                        </div>
                      ))}
                      {guncelGelismeler.length > 3 && (
                        <div className="text-center text-green-700 text-sm">
                          +{guncelGelismeler.length - 3} daha...
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Kurumsal Değerler Önizleme */}
                {kurumsalDegerler.length > 0 && (
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Heart className="w-6 h-6 text-purple-600" />
                      <h3 className="text-lg font-bold text-purple-900">Kurumsal Değerler</h3>
                    </div>
                    <div className="space-y-3">
                      {kurumsalDegerler.slice(0, 3).map((item) => (
                        <div key={item.id} className="bg-white rounded p-3">
                          <h4 className="font-medium text-gray-900 text-sm">{item.title}</h4>
                          <p className="text-gray-600 text-xs mt-1 line-clamp-2">{item.content}</p>
                        </div>
                      ))}
                      {kurumsalDegerler.length > 3 && (
                        <div className="text-center text-purple-700 text-sm">
                          +{kurumsalDegerler.length - 3} daha...
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Homepage;