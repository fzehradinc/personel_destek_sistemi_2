import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import Tree from 'react-d3-tree';
import { Upload, Users, CheckCircle, RotateCcw, Eye, ArrowLeft, Building2, FileSpreadsheet, Rocket, ZoomIn, ZoomOut, Maximize2, RotateCcw as Reset, Move, MousePointer } from 'lucide-react';
import { useElectronStorage } from '../hooks/useElectronStorage';

interface PersonNode {
  name: string;
  attributes: {
    Pozisyon: string;
    Grup?: string;
    Takım?: string;
    Ekip?: string;
  };
  children: PersonNode[];
}

interface ExcelRow {
  'GRUP ADI': string;
  'GRUP LİDERİ': string;
  'TAKIM ADI': string;
  'TAKIM LİDERİ': string;
  'EKİP ADI': string;
  'EKİP LİDERİ': string;
  'PERSONEL': string;
  'ROL': string;
}

interface OrganizationModule {
  id: string;
  name: string;
  color: string;
  isLoaded: boolean;
  isPublished: boolean;
  treeData?: PersonNode;
  stats?: {
    totalPersonel: number;
    totalEkipLideri: number;
    totalTakimLideri: number;
    totalGrupLideri: number;
    totalBirimLideri: number;
  };
  fileName?: string;
  uploadDate?: string;
}

const OrgTree = () => {
  const [modules, setModules] = useState<OrganizationModule[]>([
    { id: 'tb2_tb3', name: 'TB2 ve TB3 Entegrasyon Grubu', color: 'from-red-500 to-red-600', isLoaded: false, isPublished: false },
    { id: 'akinci', name: 'Akıncı Entegrasyon Grubu', color: 'from-blue-500 to-blue-600', isLoaded: false, isPublished: false },
    { id: 'kizilelma', name: 'Kızılelma Entegrasyon Grubu', color: 'from-green-500 to-green-600', isLoaded: false, isPublished: false },
    { id: 'on_montaj', name: 'Ön Montaj Grubu', color: 'from-purple-500 to-purple-600', isLoaded: false, isPublished: false },
    { id: 'kalite_kontrol', name: 'Operasyonel Kalite ve Kontrol Takımı', color: 'from-orange-500 to-orange-600', isLoaded: false, isPublished: false },
    { id: 'hafif_platformlar', name: 'Hafif Platformlar Entegrasyon ve Test Takımı', color: 'from-teal-500 to-teal-600', isLoaded: false, isPublished: false },
    { id: 'surec_yonetimi', name: 'Süreç Yönetimi Takımı', color: 'from-indigo-500 to-indigo-600', isLoaded: false, isPublished: false },
    { id: 'gelistirme', name: 'Entegrasyon Geliştirme Grubu', color: 'from-pink-500 to-pink-600', isLoaded: false, isPublished: false },
    { id: 'surdurulebilir_uretim', name: 'Sürdürülebilir Üretim Takımı', color: 'from-yellow-500 to-yellow-600', isLoaded: false, isPublished: false },
    { id: 'saha_operasyonlari', name: 'Saha Operasyonları Ekibi', color: 'from-cyan-500 to-cyan-600', isLoaded: false, isPublished: false },
    { id: 'idari_isler', name: 'Entegrasyon İdari İşler Ekibi', color: 'from-gray-500 to-gray-600', isLoaded: false, isPublished: false }
  ]);

  const [selectedModule, setSelectedModule] = useState<OrganizationModule | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadingModuleId, setUploadingModuleId] = useState<string | null>(null);
  
  // Enhanced interactive diagram state
  const [isInteractiveMode, setIsInteractiveMode] = useState(true); // Varsayılan olarak aktif
  const [zoomLevel, setZoomLevel] = useState(0.8); // Başlangıçta biraz uzaklaştırılmış
  const [translate, setTranslate] = useState({ x: 600, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 });

  // Electron Storage Hook
  const storage = useElectronStorage();

  // Yayınlanmamış modül sayısını hesapla
  const unpublishedModulesCount = modules.filter(module => !module.isPublished).length;
  const shouldShowInfoBlock = unpublishedModulesCount > 0;
  
  // Tüm modüller yayında mı?
  const allModulesPublished = modules.every(module => module.isPublished);
  const hasAnyLoadedModule = modules.some(module => module.isLoaded);

  // Modül durumlarını yükle - SENKRON HALE GETİRİLDİ
  useEffect(() => {
    const loadModuleStates = async () => {
      if (!storage.isReady) return;

      try {
        console.log('📊 [ORGTREE] Modül durumları yükleniyor...');
        
        // Yayın durumlarını yükle - SENKRON OKUMA
        const yayinData = await storage.readJsonFile('yayinda.json');
        console.log('📊 [ORGTREE] Yayın durumu verisi:', yayinData);
        
        // Modül verilerini yükle
        const organizationData = await storage.readJsonFile('organization_modules.json');
        console.log('📊 [ORGTREE] Organizasyon verisi:', organizationData);

        const updatedModules = modules.map(module => {
          // Yayın durumunu kontrol et
          const moduleKey = getModuleKey(module.id);
          const isPublished = yayinData && yayinData[moduleKey] === true;
          
          // Modül verisini kontrol et
          const moduleData = organizationData && organizationData[module.id];
          const isLoaded = moduleData ? true : false;

          console.log(`📊 [ORGTREE] ${module.name}: yayın=${isPublished}, yüklü=${isLoaded}`);

          return {
            ...module,
            isLoaded,
            isPublished,
            treeData: moduleData?.treeData,
            stats: moduleData?.stats,
            fileName: moduleData?.fileName,
            uploadDate: moduleData?.uploadDate
          };
        });

        setModules(updatedModules);
        console.log('📊 [ORGTREE] Organizasyon modülleri yüklendi');
      } catch (error) {
        console.error('❌ [ORGTREE] Modül durumları yüklenirken hata:', error);
      }
    };

    loadModuleStates();
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

  // Modül verilerini kaydet
  const saveModuleData = async (moduleId: string, data: any) => {
    try {
      // Mevcut organizasyon verilerini yükle
      const organizationData = await storage.readJsonFile('organization_modules.json') || {};
      
      // Bu modülün verisini güncelle
      organizationData[moduleId] = data;
      
      // Kaydet
      const success = await storage.writeJsonFile('organization_modules.json', organizationData);
      if (success) {
        console.log(`✅ [ORGTREE] Modül ${moduleId} kaydedildi`);
      }
    } catch (error) {
      console.error(`❌ [ORGTREE] Modül ${moduleId} kaydedilirken hata:`, error);
    }
  };

  // Modül yayına alma fonksiyonu - SENKRON HALE GETİRİLDİ
  const publishModule = async (moduleId: string) => {
    const module = modules.find(m => m.id === moduleId);
    if (!module || !module.isLoaded) {
      alert('Modül yayına alınabilmesi için önce Excel dosyası yüklenmelidir.');
      return;
    }

    if (confirm('Bu modülü yayına almak istediğinizden emin misiniz? Bu işlem sonrası sadece şema görüntülenebilir, yükleme ve sıfırlama işlemleri devre dışı kalacaktır.')) {
      try {
        console.log(`🚀 [ORGTREE] ${moduleId} modülü yayına alınıyor...`);
        
        const moduleKey = getModuleKey(moduleId);
        
        // SENKRON GÜNCELLEME
        const success = await storage.updateYayinDurumu(moduleKey, true);
        
        if (success) {
          setModules(prevModules => 
            prevModules.map(module => 
              module.id === moduleId 
                ? { ...module, isPublished: true }
                : module
            )
          );

          alert('📦 Bu modül yayına alındı. Artık yalnızca şema görüntülenebilir.\nYükleme ve sıfırlama işlemleri devre dışı bırakıldı.');
          console.log(`🚀 [ORGTREE] ${moduleId} modülü yayına alındı`);
        } else {
          alert('❌ Yayına alma işlemi başarısız oldu.');
          console.error(`❌ [ORGTREE] ${moduleId} yayına alma başarısız`);
        }
      } catch (error) {
        console.error(`❌ [ORGTREE] ${moduleId} yayına alma hatası:`, error);
        alert('❌ Yayına alma işlemi sırasında hata oluştu.');
      }
    }
  };

  // Excel dosyasını parse eden fonksiyon
  const parseRoleBasedExcel = (jsonData: ExcelRow[]) => {
    console.log('🔍 Excel dosyası analiz ediliyor (Birim Lideri desteği ile)...');
    console.log('📊 Ham veri:', jsonData);

    const hiyerarsiMap = new Map<string, any>();
    let birimLideri: any = null;
    
    const rolSayilari = {
      totalPersonel: 0,
      totalEkipLideri: 0,
      totalTakimLideri: 0,
      totalGrupLideri: 0,
      totalBirimLideri: 0
    };

    jsonData.forEach((row, index) => {
      const kisiAdi = row.PERSONEL?.toString().trim();
      const rol = row.ROL?.toString().trim();

      if (!kisiAdi || !rol) {
        console.log(`⚠️ Satır ${index + 1}: Eksik kişi adı veya rol`);
        return;
      }

      console.log(`👤 Satır ${index + 1}: ${kisiAdi} - ${rol}`);

      switch (rol) {
        case 'PERSONEL': rolSayilari.totalPersonel++; break;
        case 'EKİP LİDERİ': rolSayilari.totalEkipLideri++; break;
        case 'TAKIM LİDERİ': rolSayilari.totalTakimLideri++; break;
        case 'GRUP LİDERİ': rolSayilari.totalGrupLideri++; break;
        case 'BİRİM LİDERİ': 
          rolSayilari.totalBirimLideri++; 
          console.log(`👑 BİRİM LİDERİ bulundu: ${kisiAdi}`);
          break;
      }

      const kisiNode = {
        name: kisiAdi,
        attributes: {
          Pozisyon: rol,
          Grup: row['GRUP ADI'] || '',
          Takım: row['TAKIM ADI'] || '',
          Ekip: row['EKİP ADI'] || ''
        },
        children: [],
        grupAdi: row['GRUP ADI'] || '',
        grupLideri: row['GRUP LİDERİ'] || '',
        takimAdi: row['TAKIM ADI'] || '',
        takimLideri: row['TAKIM LİDERİ'] || '',
        ekipAdi: row['EKİP ADI'] || '',
        ekipLideri: row['EKİP LİDERİ'] || '',
        rol: rol
      };

      if (rol === 'BİRİM LİDERİ') {
        birimLideri = kisiNode;
        console.log(`🏛️ Birim lideri en üst seviyeye yerleştirildi: ${kisiAdi}`);
      } else {
        hiyerarsiMap.set(kisiAdi, kisiNode);
      }
    });

    console.log('📈 İstatistikler (Birim Lideri dahil):', rolSayilari);

    console.log('🔗 Hiyerarşik bağlantılar kuruluyor...');
    
    hiyerarsiMap.forEach((kisiNode, kisiAdi) => {
      let parentAdi = null;

      switch (kisiNode.rol) {
        case 'GRUP LİDERİ':
          parentAdi = birimLideri ? birimLideri.name : null;
          break;
        case 'TAKIM LİDERİ':
          parentAdi = kisiNode.grupLideri;
          break;
        case 'EKİP LİDERİ':
          parentAdi = kisiNode.takimLideri;
          break;
        case 'PERSONEL':
          parentAdi = kisiNode.ekipLideri;
          break;
      }

      console.log(`🔗 ${kisiAdi} (${kisiNode.rol}) -> Parent: ${parentAdi || 'YOK'}`);

      if (parentAdi && hiyerarsiMap.has(parentAdi)) {
        const parentNode = hiyerarsiMap.get(parentAdi);
        parentNode.children.push(kisiNode);
        console.log(`✅ ${kisiAdi} -> ${parentAdi} bağlantısı kuruldu`);
      } else if (parentAdi === birimLideri?.name && birimLideri) {
        birimLideri.children.push(kisiNode);
        console.log(`✅ ${kisiAdi} -> ${parentAdi} (Birim Lideri) bağlantısı kuruldu`);
      } else if (parentAdi) {
        console.log(`❌ ${kisiAdi} için parent ${parentAdi} bulunamadı`);
      }
    });

    let rootNodes = Array.from(hiyerarsiMap.values()).filter(node => 
      node.rol === 'GRUP LİDERİ'
    );

    console.log('🌳 Root node sayısı:', rootNodes.length);
    console.log('👑 Birim lideri var mı:', birimLideri ? 'Evet' : 'Hayır');

    let treeData;
    
    if (birimLideri) {
      treeData = birimLideri;
      console.log(`🏛️ Birim lideri "${birimLideri.name}" en üst seviyeye yerleştirildi`);
    } else if (rootNodes.length === 1) {
      treeData = rootNodes[0];
    } else if (rootNodes.length > 1) {
      treeData = {
        name: 'Organizasyon',
        attributes: { Pozisyon: 'Ana Organizasyon' },
        children: rootNodes
      };
    } else {
      console.log('❌ Root node bulunamadı!');
      treeData = null;
    }

    return { treeData, stats: rolSayilari };
  };

  // Dosya yükleme fonksiyonu
  const handleFileUpload = (moduleId: string, file: File) => {
    setLoading(true);
    setUploadingModuleId(moduleId);
    
    const reader = new FileReader();

    reader.onload = async (evt) => {
      try {
        console.log(`📊 ${moduleId} modülü için Excel dosyası işleniyor...`);
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        
        const jsonData = XLSX.utils.sheet_to_json(sheet, {
          raw: false,
          defval: ''
        }) as ExcelRow[];
        
        console.log('📋 Excel verisi:', jsonData);

        const filteredData = jsonData.filter(row => 
          row.PERSONEL && row.ROL && 
          row.PERSONEL.toString().trim() !== '' && 
          row.ROL.toString().trim() !== ''
        );

        console.log('🧹 Filtrelenmiş veri:', filteredData);

        if (filteredData.length === 0) {
          alert('Excel dosyasında geçerli veri bulunamadı. Lütfen format kontrolü yapın.');
          return;
        }

        const result = parseRoleBasedExcel(filteredData);
        
        if (result.treeData) {
          const moduleData = {
            treeData: result.treeData,
            stats: result.stats,
            fileName: file.name,
            uploadDate: new Date().toISOString().split('T')[0]
          };

          await saveModuleData(moduleId, moduleData);

          setModules(prevModules => 
            prevModules.map(module => 
              module.id === moduleId 
                ? { ...module, isLoaded: true, ...moduleData }
                : module
            )
          );

          const toplamKisi = (result.stats?.totalPersonel || 0) + 
                           (result.stats?.totalEkipLideri || 0) + 
                           (result.stats?.totalTakimLideri || 0) + 
                           (result.stats?.totalGrupLideri || 0);

          console.log(`✅ ${moduleId} modülü başarıyla yüklendi:`, result.treeData);
          alert(`${moduleId} modülü başarıyla yüklendi! ${toplamKisi} kişi işlendi${result.stats?.totalBirimLideri ? ` (+ ${result.stats.totalBirimLideri} Birim Lideri)` : ''}.`);
        } else {
          alert('Organizasyon şeması oluşturulamadı. Veri formatını kontrol edin.');
        }

      } catch (error) {
        console.error(`${moduleId} modülü Excel dosyası işleme hatası:`, error);
        alert(`Excel dosyası işlenirken hata oluştu: ${(error as Error).message}`);
      } finally {
        setLoading(false);
        setUploadingModuleId(null);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  // Modül sıfırlama fonksiyonu - SENKRON HALE GETİRİLDİ
  const resetModule = async (moduleId: string) => {
    if (confirm('Bu modülü sıfırlamak istediğinizden emin misiniz? Tüm veriler silinecektir.')) {
      try {
        console.log(`🔄 [ORGTREE] ${moduleId} modülü sıfırlanıyor...`);
        
        // Organizasyon verilerinden bu modülü kaldır
        const organizationData = await storage.readJsonFile('organization_modules.json') || {};
        delete organizationData[moduleId];
        await storage.writeJsonFile('organization_modules.json', organizationData);

        // Yayın durumunu sıfırla - SENKRON
        const moduleKey = getModuleKey(moduleId);
        const resetSuccess = await storage.updateYayinDurumu(moduleKey, false);
        
        if (resetSuccess) {
          setModules(prevModules => 
            prevModules.map(module => 
              module.id === moduleId 
                ? { ...module, isLoaded: false, isPublished: false, treeData: undefined, stats: undefined, fileName: undefined, uploadDate: undefined }
                : module
            )
          );

          if (selectedModule?.id === moduleId) {
            setSelectedModule(null);
          }

          console.log(`🔄 [ORGTREE] ${moduleId} modülü sıfırlandı`);
        } else {
          console.error(`❌ [ORGTREE] ${moduleId} yayın durumu sıfırlanamadı`);
          alert('❌ Yayın durumu sıfırlanırken hata oluştu.');
        }
      } catch (error) {
        console.error(`❌ [ORGTREE] ${moduleId} sıfırlama hatası:`, error);
        alert('❌ Modül sıfırlanırken hata oluştu.');
      }
    }
  };

  // Enhanced zoom and pan functions
  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev * 1.3, 5)); // Daha hızlı zoom, max 5x
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev / 1.3, 0.1)); // Daha hızlı zoom, min 0.1x
  };

  const handleResetView = () => {
    setZoomLevel(0.8);
    setTranslate({ x: 600, y: 100 });
  };

  const handleFitToView = () => {
    setZoomLevel(0.6);
    setTranslate({ x: 400, y: 50 });
  };

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoomLevel(prev => Math.min(Math.max(prev * delta, 0.1), 5));
  };

  // Enhanced mouse drag for panning
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) { // Sol tık
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
      setLastPanPoint({ x: translate.x, y: translate.y });
      e.preventDefault();
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;
      
      setTranslate({
        x: lastPanPoint.x + deltaX,
        y: lastPanPoint.y + deltaY
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch support for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      setIsDragging(true);
      setDragStart({ x: touch.clientX, y: touch.clientY });
      setLastPanPoint({ x: translate.x, y: translate.y });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDragging && e.touches.length === 1) {
      const touch = e.touches[0];
      const deltaX = touch.clientX - dragStart.x;
      const deltaY = touch.clientY - dragStart.y;
      
      setTranslate({
        x: lastPanPoint.x + deltaX,
        y: lastPanPoint.y + deltaY
      });
      e.preventDefault();
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Rol bazında hiyerarşi bilgilerini oluşturan fonksiyon
  const getHierarchyInfo = (nodeDatum: any) => {
    const rol = nodeDatum.attributes?.Pozisyon;
    const grup = nodeDatum.attributes?.Grup;
    const takim = nodeDatum.attributes?.Takım;
    const ekip = nodeDatum.attributes?.Ekip;

    const hierarchyItems = [];

    switch (rol) {
      case 'BİRİM LİDERİ':
        hierarchyItems.push('Birim Yönetimi');
        break;
        
      case 'GRUP LİDERİ':
        if (grup) hierarchyItems.push(grup);
        break;
        
      case 'TAKIM LİDERİ':
        if (grup) hierarchyItems.push(grup);
        if (takim) hierarchyItems.push(`${takim} Takımı`);
        break;
        
      case 'EKİP LİDERİ':
        if (grup) hierarchyItems.push(grup);
        if (takim) hierarchyItems.push(`${takim} Takımı`);
        break;
        
      case 'PERSONEL':
        if (takim) hierarchyItems.push(`${takim} Takımı`);
        if (ekip) hierarchyItems.push(`${ekip} Ekibi`);
        break;
    }

    return hierarchyItems;
  };

  const renderCustomNode = ({ nodeDatum }: { nodeDatum: PersonNode }) => {
    const getNodeColor = (pozisyon: string) => {
      switch (pozisyon) {
        case 'BİRİM LİDERİ': return '#7C3AED'; // Mor - En üst seviye
        case 'GRUP LİDERİ': return '#DC2626';
        case 'TAKIM LİDERİ': return '#EA580C';
        case 'EKİP LİDERİ': return '#2563EB';
        case 'PERSONEL': return '#059669';
        default: return '#6B7280';
      }
    };

    const nodeColor = getNodeColor(nodeDatum.attributes?.Pozisyon || '');
    const hierarchyInfo = getHierarchyInfo(nodeDatum);

    return (
      <g>
        {/* Ana node circle */}
        <circle 
          r={20} 
          fill={nodeColor} 
          stroke="#1E3A8A" 
          strokeWidth={2}
          style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}
        />
        
        {/* Detaylı bilgi kartı */}
        <foreignObject width={300} height={160} x={30} y={-80}>
          <div
            xmlns="http://www.w3.org/1999/xhtml"
            style={{
              fontSize: '12px',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              backgroundColor: 'white',
              padding: '16px',
              borderRadius: '12px',
              border: '1px solid #e5e7eb',
              boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
              maxWidth: '290px',
              minHeight: '140px'
            }}
          >
            {/* Kişi adı - büyük ve kalın */}
            <div 
              style={{ 
                fontSize: '18px', 
                fontWeight: '700',
                color: '#111827',
                marginBottom: '8px',
                lineHeight: '1.2',
                borderBottom: '2px solid #f3f4f6',
                paddingBottom: '6px'
              }}
            >
              {nodeDatum.name}
            </div>
            
            {/* Pozisyon bilgisi */}
            <div style={{ marginBottom: '12px' }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '6px',
                marginBottom: '4px'
              }}>
                <span style={{ 
                  color: nodeColor,
                  fontSize: '13px',
                  fontWeight: '600'
                }}>
                  {nodeDatum.attributes?.Pozisyon}
                </span>
              </div>
            </div>

            {/* Hiyerarşi bilgileri - ROL'den sonra */}
            {hierarchyInfo.length > 0 && (
              <div style={{ marginBottom: '8px' }}>
                {hierarchyInfo.map((info, index) => (
                  <div key={index} style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '6px',
                    marginBottom: '4px'
                  }}>
                    <span style={{ fontSize: '12px' }}>
                      {index === 0 ? '🏢' : '📋'}
                    </span>
                    <span style={{ 
                      color: index === 0 ? '#DC2626' : '#EA580C',
                      fontSize: '11px',
                      fontWeight: '500',
                      lineHeight: '1.3'
                    }}>
                      {info.length > 35 ? 
                       info.substring(0, 35) + '...' : 
                       info}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </foreignObject>
      </g>
    );
  };

  // Modül grid görünümü
  if (!selectedModule) {
    return (
      <div className="w-full min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-blue-100 p-3 rounded-lg">
                <Building2 className="w-8 h-8 text-blue-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Organizasyon Modülleri</h1>
                <p className="text-gray-600">11 ayrı organizasyon biriminin hiyerarşik yapısını yönetin</p>
              </div>
            </div>

            {/* İstatistikler */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">Toplam Modül</span>
                </div>
                <div className="text-2xl font-bold text-blue-600 mt-1">
                  {modules.length}
                </div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-medium text-green-900">Yüklenen Modül</span>
                </div>
                <div className="text-2xl font-bold text-green-600 mt-1">
                  {modules.filter(m => m.isLoaded).length}
                </div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="flex items-center gap-2">
                  <Rocket className="w-5 h-5 text-purple-600" />
                  <span className="text-sm font-medium text-purple-900">Yayınlanan Modül</span>
                </div>
                <div className="text-2xl font-bold text-purple-600 mt-1">
                  {modules.filter(m => m.isPublished).length}
                </div>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-orange-600" />
                  <span className="text-sm font-medium text-orange-900">Toplam Kişi</span>
                </div>
                <div className="text-2xl font-bold text-orange-600 mt-1">
                  {modules.filter(m => m.isLoaded).reduce((sum, m) => {
                    return sum + (m.stats?.totalPersonel || 0) + 
                           (m.stats?.totalEkipLideri || 0) + 
                           (m.stats?.totalTakimLideri || 0) + 
                           (m.stats?.totalGrupLideri || 0);
                  }, 0)}
                </div>
              </div>
            </div>

            {/* KOŞULLU BİLGİ BLOĞU - Sadece yayınlanmamış modül varsa göster */}
            {shouldShowInfoBlock && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="font-medium text-blue-900 mb-2">
                  📋 Modül Yönetimi ve Birim Lideri Hiyerarşisi:
                  <span className="ml-2 text-sm bg-blue-200 text-blue-800 px-2 py-1 rounded-full">
                    {unpublishedModulesCount} modül henüz yayında değil
                  </span>
                </div>
                <div className="text-sm text-blue-800 space-y-1">
                  <div>• <strong>Birim Lideri Desteği:</strong> ROL sütununda "BİRİM LİDERİ" olan kişi en üst seviyeye yerleştirilir</div>
                  <div>• <strong>Hiyerarşi Sırası:</strong> Birim Lideri → Grup Lideri → Takım Lideri → Ekip Lideri → Personel</div>
                  <div>• <strong>Sayım Sistemi:</strong> İstatistiklerde Birim Lideri ayrı sayılır, toplam kişi sayısına dahil edilmez</div>
                  <div>• <strong>Yayına Alma:</strong> Yüklenen modüller "Modül Yayına Hazır" butonu ile yayına alınabilir</div>
                  <div>• <strong>Excel Formatı:</strong> GRUP ADI, GRUP LİDERİ, TAKIM ADI, TAKIM LİDERİ, EKİP ADI, EKİP LİDERİ, PERSONEL, ROL</div>
                </div>
              </div>
            )}

            {/* SON KULLANICI MODU: Hiçbir açıklama gösterme */}
            {/* Tüm modüller yayında ve en az bir modül yüklenmişse hiçbir açıklama gösterme */}
            {allModulesPublished && hasAnyLoadedModule && (
              <></>
            )}
          </div>

          {/* Modül Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {modules.map((module) => (
              <div 
                key={module.id}
                className={`
                  bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-all duration-200
                  ${module.isLoaded ? 'ring-2 ring-green-200' : ''}
                  ${module.isPublished ? 'ring-2 ring-purple-200' : ''}
                `}
              >
                {/* Modül Header - UPDATED: Centered icon, removed text label */}
                <div className={`bg-gradient-to-r ${module.color} p-4 text-white`}>
                  <div className="flex items-center justify-between">
                    {/* Left side - Centered icon only (no text) */}
                    <div className="flex items-center justify-center">
                      {module.isPublished ? (
                        // Published: Show only enlarged centered icon
                        <Building2 className="w-8 h-8" />
                      ) : (
                        // Not published: Show icon with status text
                        <div className="flex items-center gap-2">
                          <Building2 className="w-5 h-5" />
                          <span className="text-sm font-medium">
                            {module.isLoaded ? '✅ Yüklendi' : '📤 Yükle'}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {/* Right side - Stats (unchanged) */}
                    {module.isLoaded && module.stats && (
                      <div className="text-right">
                        <div className="text-2xl font-bold">
                          {module.stats.totalPersonel + module.stats.totalEkipLideri + module.stats.totalTakimLideri + module.stats.totalGrupLideri}
                        </div>
                        <div className="text-xs opacity-80">
                          {module.stats.totalBirimLideri > 0 ? `+${module.stats.totalBirimLideri} Birim Lideri` : 'Toplam Kişi'}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Modül Content */}
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-3 line-clamp-2 min-h-[3rem]">
                    {module.name}
                  </h3>

                  {/* Modül İstatistikleri */}
                  {module.isLoaded && module.stats && (
                    <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
                      {/* Birim Lideri varsa göster */}
                      {module.stats.totalBirimLideri > 0 && (
                        <div className="bg-purple-50 p-2 rounded text-center col-span-2">
                          <div className="font-bold text-purple-600">{module.stats.totalBirimLideri}</div>
                          <div className="text-purple-800">Birim Lideri</div>
                        </div>
                      )}
                      <div className="bg-red-50 p-2 rounded text-center">
                        <div className="font-bold text-red-600">{module.stats.totalGrupLideri}</div>
                        <div className="text-red-800">Grup Lideri</div>
                      </div>
                      <div className="bg-orange-50 p-2 rounded text-center">
                        <div className="font-bold text-orange-600">{module.stats.totalTakimLideri}</div>
                        <div className="text-orange-800">Takım Lideri</div>
                      </div>
                      <div className="bg-blue-50 p-2 rounded text-center">
                        <div className="font-bold text-blue-600">{module.stats.totalEkipLideri}</div>
                        <div className="text-blue-800">Ekip Lideri</div>
                      </div>
                      <div className="bg-green-50 p-2 rounded text-center">
                        <div className="font-bold text-green-600">{module.stats.totalPersonel}</div>
                        <div className="text-green-800">Personel</div>
                      </div>
                    </div>
                  )}

                  {/* Dosya Bilgisi - Sadece yayınlanmamış modüllerde göster */}
                  {module.isLoaded && module.fileName && !module.isPublished && (
                    <div className="text-xs text-gray-500 mb-4 space-y-1">
                      <div className="flex items-center gap-1">
                        <FileSpreadsheet className="w-3 h-3" />
                        <span className="truncate">{module.fileName}</span>
                      </div>
                      <div>📅 {module.uploadDate}</div>
                    </div>
                  )}

                  {/* Aksiyon Butonları */}
                  <div className="space-y-2">
                    {module.isPublished ? (
                      // Yayınlanmış modül - sadece görüntüleme
                      <button
                        onClick={() => setSelectedModule(module)}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        Şemayı Görüntüle
                      </button>
                    ) : module.isLoaded ? (
                      // Yüklenmiş ama yayınlanmamış modül
                      <>
                        <button
                          onClick={() => setSelectedModule(module)}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                        >
                          <Eye className="w-4 h-4" />
                          Şemayı Görüntüle
                        </button>
                        <button
                          onClick={() => publishModule(module.id)}
                          className="w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                        >
                          <Rocket className="w-4 h-4" />
                          Modül Yayına Hazır
                        </button>
                        <button
                          onClick={() => resetModule(module.id)}
                          className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                        >
                          <RotateCcw className="w-4 h-4" />
                          Modülü Sıfırla
                        </button>
                      </>
                    ) : (
                      // Yüklenmemiş modül
                      <label className="block">
                        <input
                          type="file"
                          accept=".xlsx,.xls"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleFileUpload(module.id, file);
                            }
                          }}
                          className="hidden"
                          disabled={loading}
                        />
                        <div className={`
                          w-full px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer flex items-center justify-center gap-2
                          ${loading && uploadingModuleId === module.id
                            ? 'bg-gray-400 text-white cursor-not-allowed'
                            : 'bg-green-600 hover:bg-green-700 text-white'
                          }
                        `}>
                          {loading && uploadingModuleId === module.id ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                              Yükleniyor...
                            </>
                          ) : (
                            <>
                              <Upload className="w-4 h-4" />
                              Excel Dosyası Yükle
                            </>
                          )}
                        </div>
                      </label>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Seçili modül organizasyon şeması görünümü
  return (
    <div className="w-full h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b border-gray-200 p-6">
        {/* Geri Dön Butonu */}
        <div className="mb-4">
          <button
            onClick={() => {
              setSelectedModule(null);
              setIsInteractiveMode(true);
              setZoomLevel(0.8);
              setTranslate({ x: 600, y: 100 });
            }}
            className="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Modül Listesine Dön
          </button>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <div className={`bg-gradient-to-r ${selectedModule.color} p-3 rounded-lg`}>
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <div>
            {/* REMOVED: 🚀 Yayında badge from header */}
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-gray-900">{selectedModule.name}</h2>
            </div>
            <p className="text-gray-600">
              Organizasyon Şeması
              {selectedModule.stats && (
                <span> - {selectedModule.stats.totalPersonel + selectedModule.stats.totalEkipLideri + selectedModule.stats.totalTakimLideri + selectedModule.stats.totalGrupLideri} Kişi
                  {selectedModule.stats.totalBirimLideri > 0 && ` (+ ${selectedModule.stats.totalBirimLideri} Birim Lideri)`}
                </span>
              )}
            </p>
          </div>
        </div>
        
        {/* İstatistikler */}
        {selectedModule.stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
            {/* Birim Lideri - Sadece varsa göster */}
            {selectedModule.stats.totalBirimLideri > 0 && (
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-purple-900">Birim Lideri</span>
                </div>
                <div className="text-2xl font-bold text-purple-600 mt-1">
                  {selectedModule.stats.totalBirimLideri}
                </div>
              </div>
            )}
            <div className="bg-red-50 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-red-900">Grup Lideri</span>
              </div>
              <div className="text-2xl font-bold text-red-600 mt-1">
                {selectedModule.stats.totalGrupLideri}
              </div>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-orange-900">Takım Lideri</span>
              </div>
              <div className="text-2xl font-bold text-orange-600 mt-1">
                {selectedModule.stats.totalTakimLideri}
              </div>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-blue-900">Ekip Lideri</span>
              </div>
              <div className="text-2xl font-bold text-blue-600 mt-1">
                {selectedModule.stats.totalEkipLideri}
              </div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-green-900">Personel</span>
              </div>
              <div className="text-2xl font-bold text-green-600 mt-1">
                {selectedModule.stats.totalPersonel}
              </div>
            </div>
          </div>
        )}

        {/* Dosya Bilgisi - Sadece yayınlanmamış modüllerde göster */}
        {selectedModule.fileName && !selectedModule.isPublished && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-2 text-green-800">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">Yüklenen Dosya:</span>
              <span>{selectedModule.fileName}</span>
              <span>•</span>
              <span>{selectedModule.uploadDate}</span>
            </div>
          </div>
        )}

        {/* REMOVED: Yayın Durumu Bilgisi - Bu bölüm tamamen kaldırıldı */}

        {/* Enhanced Zoom Kontrolleri */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-2">
              <span className="text-sm font-medium text-gray-700">
                Zoom: {Math.round(zoomLevel * 100)}%
              </span>
            </div>
            <div className="flex items-center gap-2 bg-blue-50 rounded-lg p-2">
              <Move className="w-4 h-4 text-blue-600" />
              <span className="text-sm text-blue-700">
                {isDragging ? 'Sürükleniyor...' : 'Sürükle & Bırak'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleZoomOut}
              className="p-3 bg-white hover:bg-gray-50 rounded-lg border border-gray-300 text-gray-700 shadow-sm transition-all"
              title="Uzaklaştır (Ctrl + Scroll)"
            >
              <ZoomOut className="w-5 h-5" />
            </button>
            <button
              onClick={handleZoomIn}
              className="p-3 bg-white hover:bg-gray-50 rounded-lg border border-gray-300 text-gray-700 shadow-sm transition-all"
              title="Yakınlaştır (Ctrl + Scroll)"
            >
              <ZoomIn className="w-5 h-5" />
            </button>
            <button
              onClick={handleFitToView}
              className="p-3 bg-white hover:bg-gray-50 rounded-lg border border-gray-300 text-gray-700 shadow-sm transition-all"
              title="Ekrana Sığdır"
            >
              <Maximize2 className="w-5 h-5" />
            </button>
            <button
              onClick={handleResetView}
              className="p-3 bg-white hover:bg-gray-50 rounded-lg border border-gray-300 text-gray-700 shadow-sm transition-all"
              title="Görünümü Sıfırla"
            >
              <Reset className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Enhanced Diagram Container */}
      <div 
        className={`relative w-full ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`} 
        style={{ height: 'calc(100vh - 320px)' }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {selectedModule.treeData ? (
          <Tree
            data={selectedModule.treeData}
            orientation="vertical"
            translate={translate}
            nodeSize={{ x: 350, y: 220 }}
            pathFunc="elbow"
            zoomable={false} // Manuel zoom kontrolü kullanıyoruz
            zoom={zoomLevel}
            scaleExtent={{ min: 0.1, max: 5 }}
            initialDepth={undefined}
            renderCustomNodeElement={renderCustomNode}
            styles={{
              links: {
                stroke: '#6b7280',
                strokeWidth: 2,
              },
            }}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-500">
              <div className="text-8xl mb-6">📊</div>
              <div className="text-2xl font-bold mb-3 text-gray-700">Modül Verisi Bulunamadı</div>
              <div className="text-lg text-gray-600 mb-4">Bu modül için henüz Excel dosyası yüklenmemiş</div>
              <button
                onClick={() => setSelectedModule(null)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Modül Listesine Dön
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Enhanced Navigation Help */}
      
      <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-lg border border-gray-200 p-4 max-w-2xl">
        <div className="text-sm text-gray-700">
          <div className="font-medium mb-2 text-center">🔍 Gelişmiş Navigasyon Kontrolleri</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div className="bg-blue-50 text-blue-800 px-3 py-2 rounded-lg text-center">
              <MousePointer className="w-4 h-4 mx-auto mb-1" />
              <div className="font-medium">Sürükle</div>
              <div>Sol tık + hareket</div>
            </div>
            <div className="bg-green-50 text-green-800 px-3 py-2 rounded-lg text-center">
              <ZoomIn className="w-4 h-4 mx-auto mb-1" />
              <div className="font-medium">Zoom</div>
              <div>Fare tekerleği</div>
            </div>
            <div className="bg-purple-50 text-purple-800 px-3 py-2 rounded-lg text-center">
              <Maximize2 className="w-4 h-4 mx-auto mb-1" />
              <div className="font-medium">Sığdır</div>
              <div>Ekrana sığdır butonu</div>
            </div>
            <div className="bg-orange-50 text-orange-800 px-3 py-2 rounded-lg text-center">
              <Reset className="w-4 h-4 mx-auto mb-1" />
              <div className="font-medium">Sıfırla</div>
              <div>Varsayılan görünüm</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrgTree;