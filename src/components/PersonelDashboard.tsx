import React, { useState, useEffect } from 'react';
import { BookOpen, Workflow, FileText, HelpCircle, Building2, Users, TrendingUp, Heart, Eye, Calendar, Star, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useWebStorage } from '../hooks/useWebStorage';

const PersonelDashboard = () => {
  const { currentUser, logout } = useAuth();
  const storage = useWebStorage();
  
  const [publishedContent, setPublishedContent] = useState({
    homepage: { developments: [], values: [] },
    training: [],
    processes: [],
    procedures: [],
    faq: [],
    orgModules: []
  });
  
  const [loading, setLoading] = useState(true);
  const [activeModule, setActiveModule] = useState('home');

  // Yayınlanmış içerikleri yükle
  useEffect(() => {
    const loadPublishedContent = async () => {
      if (!storage.isReady) return;

      try {
        console.log('📊 [PERSONEL] Yayınlanmış içerikler yükleniyor...');
        
        // Yayın durumlarını kontrol et
        const yayinData = await storage.readJsonFile('yayinda.json') || {};
        
        // Ana sayfa içerikleri
        if (yayinData.AnaSayfa) {
          const developments = await storage.readJsonFile('guncel_gelismeler.json') || [];
          const values = await storage.readJsonFile('kurumsal_degerler.json') || [];
          
          setPublishedContent(prev => ({
            ...prev,
            homepage: {
              developments: developments.filter((d: any) => d.isPublished),
              values: values.filter((v: any) => v.isPublished)
            }
          }));
        }

        // Eğitim materyalleri
        if (yayinData.EgitimModulu) {
          const training = await storage.readJsonFile('training_materials.json') || [];
          setPublishedContent(prev => ({
            ...prev,
            training: training.filter((t: any) => t.isPublished)
          }));
        }

        // Süreç akışları
        if (yayinData.SurecAkislari) {
          const processes = await storage.readJsonFile('process_flows.json') || [];
          setPublishedContent(prev => ({
            ...prev,
            processes: processes.filter((p: any) => p.isPublished)
          }));
        }

        // Prosedürler
        if (yayinData.ProsedurTalimatlar) {
          const procedures = await storage.readJsonFile('procedures_instructions.json') || [];
          setPublishedContent(prev => ({
            ...prev,
            procedures: procedures.filter((p: any) => p.isPublished)
          }));
        }

        // SSS
        if (yayinData.SSSModulu) {
          const faq = await storage.readJsonFile('faq_data.json') || [];
          setPublishedContent(prev => ({
            ...prev,
            faq: faq.filter((f: any) => f.isPublished)
          }));
        }

        // Organizasyon modülleri
        const orgData = await storage.readJsonFile('organization_modules.json') || {};
        const publishedOrgModules = Object.entries(orgData)
          .filter(([moduleId, data]: [string, any]) => {
            const moduleKey = getModuleKey(moduleId);
            return yayinData[moduleKey] === true;
          })
          .map(([moduleId, data]) => ({ id: moduleId, ...data }));
        
        setPublishedContent(prev => ({
          ...prev,
          orgModules: publishedOrgModules
        }));

        console.log('✅ [PERSONEL] Yayınlanmış içerikler yüklendi');
      } catch (error) {
        console.error('❌ [PERSONEL] İçerik yükleme hatası:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPublishedContent();
  }, [storage.isReady]);

  // Modül ID'sini yayın durumu anahtarına çevir
  const getModuleKey = (moduleId: string): string => {
    const keyMap: { [key: string]: string } = {
      'tb2_tb3': 'TB2_TB3_Entegrasyon_Grubu',
      'akinci': 'Akinci_Entegrasyon_Grubu',
      'kizilelma': 'Kizilelma_Entegrasyon_Grubu',
      'on_montaj': 'On_Montaj_Grubu',
      'kalite_kontrol': 'Kalite_Kontrol_Takimi',
      'hafif_platformlar': 'Hafif_Platformlar_Takimi',
      'surec_yonetimi': 'Surec_Yonetimi_Takimi',
      'gelistirme': 'Gelistirme_Grubu',
      'surdurulebilir_uretim': 'Surdurulebilir_Uretim_Takimi',
      'saha_operasyonlari': 'Saha_Operasyonlari_Ekibi',
      'idari_isler': 'Idari_Isler_Ekibi'
    };
    return keyMap[moduleId] || moduleId;
  };

  const modules = [
    { 
      id: 'home', 
      name: 'Ana Sayfa', 
      icon: Building2,
      color: 'from-indigo-500 to-indigo-600',
      count: publishedContent.homepage.developments.length + publishedContent.homepage.values.length
    },
    { 
      id: 'org', 
      name: 'Organizasyon Şeması', 
      icon: Users,
      color: 'from-blue-500 to-blue-600',
      count: publishedContent.orgModules.length
    },
    { 
      id: 'training', 
      name: 'Eğitim Materyalleri', 
      icon: BookOpen,
      color: 'from-green-500 to-green-600',
      count: publishedContent.training.length
    },
    { 
      id: 'process', 
      name: 'Süreç Akışları', 
      icon: Workflow,
      color: 'from-purple-500 to-purple-600',
      count: publishedContent.processes.length
    },
    { 
      id: 'procedures', 
      name: 'Prosedür ve Talimatlar', 
      icon: FileText,
      color: 'from-orange-500 to-orange-600',
      count: publishedContent.procedures.length
    },
    { 
      id: 'faq', 
      name: 'Sıkça Sorulan Sorular', 
      icon: HelpCircle,
      color: 'from-red-500 to-red-600',
      count: publishedContent.faq.length
    }
  ];

  const renderModuleContent = () => {
    switch (activeModule) {
      case 'home':
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Hoş Geldiniz, {currentUser?.name}
              </h2>
              <p className="text-gray-600">
                Personel Destek Sistemi'ne hoş geldiniz. Size sunulan içerikleri aşağıdan inceleyebilirsiniz.
              </p>
            </div>

            {/* Güncel Gelişmeler */}
            {publishedContent.homepage.developments.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                  <h3 className="text-xl font-bold text-gray-900">Güncel Gelişmeler</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {publishedContent.homepage.developments.map((item: any, index: number) => (
                    <div key={index} className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <h4 className="font-semibold text-green-900 mb-2">{item.title}</h4>
                      <p className="text-green-800 text-sm">{item.content}</p>
                      <div className="text-xs text-green-600 mt-2">
                        {new Date(item.date).toLocaleDateString('tr-TR')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Kurumsal Değerler */}
            {publishedContent.homepage.values.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Heart className="w-6 h-6 text-purple-600" />
                  <h3 className="text-xl font-bold text-gray-900">Kurumsal Değerler</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {publishedContent.homepage.values.map((item: any, index: number) => (
                    <div key={index} className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                      <h4 className="font-semibold text-purple-900 mb-2">{item.title}</h4>
                      <p className="text-purple-800 text-sm">{item.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Boş durum */}
            {publishedContent.homepage.developments.length === 0 && publishedContent.homepage.values.length === 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-gray-900 mb-2">Ana Sayfa İçeriği Henüz Yayınlanmamış</h3>
                <p className="text-gray-600">Yöneticiniz ana sayfa içeriklerini yayınladığında burada görünecektir.</p>
              </div>
            )}
          </div>
        );

      case 'org':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Organizasyon Şemaları</h2>
            {publishedContent.orgModules.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {publishedContent.orgModules.map((module: any) => (
                  <div key={module.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="font-semibold text-gray-900 mb-2">{module.name || module.id}</h3>
                    {module.stats && (
                      <div className="text-sm text-gray-600">
                        Toplam: {module.stats.totalPersonel + module.stats.totalEkipLideri + module.stats.totalTakimLideri + module.stats.totalGrupLideri} kişi
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-gray-900 mb-2">Organizasyon Şeması Henüz Yayınlanmamış</h3>
                <p className="text-gray-600">Yöneticiniz organizasyon şemalarını yayınladığında burada görünecektir.</p>
              </div>
            )}
          </div>
        );

      case 'training':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Eğitim Materyalleri</h2>
            {publishedContent.training.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {publishedContent.training.map((item: any) => (
                  <div key={item.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
                    <p className="text-gray-600 text-sm mb-4">{item.description}</p>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{item.category}</span>
                      <span>{new Date(item.uploadDate).toLocaleDateString('tr-TR')}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-gray-900 mb-2">Eğitim Materyali Henüz Yayınlanmamış</h3>
                <p className="text-gray-600">Yöneticiniz eğitim materyallerini yayınladığında burada görünecektir.</p>
              </div>
            )}
          </div>
        );

      case 'process':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Süreç Akışları</h2>
            {publishedContent.processes.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {publishedContent.processes.map((item: any) => (
                  <div key={item.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
                    <p className="text-gray-600 text-sm mb-4">{item.description}</p>
                    <div className="text-xs text-gray-500">
                      {new Date(item.uploadDate).toLocaleDateString('tr-TR')}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                <Workflow className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-gray-900 mb-2">Süreç Akışı Henüz Yayınlanmamış</h3>
                <p className="text-gray-600">Yöneticiniz süreç akışlarını yayınladığında burada görünecektir.</p>
              </div>
            )}
          </div>
        );

      case 'procedures':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Prosedür ve Talimatlar</h2>
            {publishedContent.procedures.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {publishedContent.procedures.map((item: any) => (
                  <div key={item.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
                    <p className="text-gray-600 text-sm mb-4">{item.description}</p>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{item.type}</span>
                      <span>{new Date(item.uploadDate).toLocaleDateString('tr-TR')}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-gray-900 mb-2">Prosedür/Talimat Henüz Yayınlanmamış</h3>
                <p className="text-gray-600">Yöneticiniz prosedür ve talimatları yayınladığında burada görünecektir.</p>
              </div>
            )}
          </div>
        );

      case 'faq':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Sıkça Sorulan Sorular</h2>
            {publishedContent.faq.length > 0 ? (
              <div className="space-y-4">
                {publishedContent.faq.map((item: any, index: number) => (
                  <div key={item.id || index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="font-semibold text-gray-900 mb-3">❓ {item.Soru}</h3>
                    <p className="text-gray-700 whitespace-pre-wrap">💡 {item.Cevap}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                <HelpCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-gray-900 mb-2">SSS Henüz Yayınlanmamış</h3>
                <p className="text-gray-600">Yöneticiniz SSS içeriklerini yayınladığında burada görünecektir.</p>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-gray-600">İçerikler yükleniyor...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <div className="bg-gradient-to-br from-blue-600 to-indigo-600 w-10 h-10 rounded-lg flex items-center justify-center mr-3">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Personel Destek Sistemi</h1>
                <p className="text-sm text-gray-600">Personel Paneli</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-600">
                <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium mr-2">
                  Personel
                </span>
                {currentUser?.name}
              </div>
              <button
                onClick={logout}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Çıkış Yap
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Module Navigation */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {modules.map((module) => {
            const IconComponent = module.icon;
            return (
              <button
                key={module.id}
                onClick={() => setActiveModule(module.id)}
                className={`p-4 rounded-xl text-center transition-all ${
                  activeModule === module.id
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-white hover:bg-blue-50 text-gray-700 shadow-sm hover:shadow-md'
                }`}
              >
                <IconComponent className="w-8 h-8 mx-auto mb-2" />
                <div className="text-sm font-medium mb-1">{module.name}</div>
                <div className="text-xs opacity-75">
                  {module.count > 0 ? `${module.count} içerik` : 'İçerik yok'}
                </div>
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          {renderModuleContent()}
        </div>
      </div>
    </div>
  );
};

export default PersonelDashboard;