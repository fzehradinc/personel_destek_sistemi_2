import React, { useState, useEffect, useCallback } from 'react';
import { Upload, FileText, Eye, Download, Search, Trash2, Edit, Calendar, Tag, Rocket, RotateCcw, CheckCircle, Play, Pause, Volume2, VolumeX, Maximize, SkipBack, SkipForward } from 'lucide-react';
import { useElectronStorage } from '../hooks/useElectronStorage';

interface TrainingMaterial {
  id: string;
  title: string;
  description: string;
  category: string;
  type: 'PDF' | 'Video' | 'Dokuman';
  difficulty: 'Başlangıç' | 'Orta' | 'İleri';
  content: string;
  uploadDate: string;
  fileName?: string;
  fileSize?: string;
  fileUrl?: string;
  previewData?: string; // Base64 preview data - PERSISTENT
}

const TrainingMaterials = () => {
  const [materials, setMaterials] = useState<TrainingMaterial[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('Tümü');
  const [selectedDifficulty, setSelectedDifficulty] = useState('Tümü');
  const [selectedMaterial, setSelectedMaterial] = useState<TrainingMaterial | null>(null);
  const [isPublished, setIsPublished] = useState(false);

  // Video player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);

  // Yükleme formu state'leri
  const [uploadForm, setUploadForm] = useState({
    title: '',
    description: '',
    type: 'PDF' as 'PDF' | 'Video' | 'Dokuman',
    difficulty: 'Başlangıç' as 'Başlangıç' | 'Orta' | 'İleri',
    category: 'Genel',
    file: null as File | null
  });

  // Electron Storage Hook
  const storage = useElectronStorage();

  // PERSISTENT PREVIEW CACHE - In-memory cache for session persistence
  const [previewCache, setPreviewCache] = useState<Map<string, string>>(new Map());

  // Verileri yükle - SENKRON HALE GETİRİLDİ
  useEffect(() => {
    const loadData = async () => {
      if (!storage.isReady) return;

      try {
        console.log('📊 [TRAINING] Veriler yükleniyor...');
        
        // Eğitim materyallerini yükle
        const data = await storage.readJsonFile('training_materials.json');
        if (data && Array.isArray(data)) {
          // PREVIEW DATA RESTORATION - Restore preview data from storage
          const materialsWithPreview = await Promise.all(
            data.map(async (material: TrainingMaterial) => {
              if (material.fileUrl && !material.previewData) {
                // Try to restore preview data from file system
                try {
                  console.log(`🔄 [TRAINING] Restoring preview for: ${material.fileName}`);
                  const fileData = await storage.readFile(material.fileUrl, 'base64');
                  if (fileData) {
                    material.previewData = fileData;
                    console.log(`✅ [TRAINING] Preview restored: ${material.fileName}`);
                  }
                } catch (error) {
                  console.log(`⚠️ [TRAINING] Could not restore preview for: ${material.fileName}`, error);
                }
              }
              return material;
            })
          );
          
          setMaterials(materialsWithPreview);
          console.log('💾 [TRAINING] Eğitim materyalleri yüklendi:', materialsWithPreview.length);
          
          // Populate preview cache
          const newCache = new Map();
          materialsWithPreview.forEach(material => {
            if (material.previewData) {
              newCache.set(material.id, material.previewData);
            }
          });
          setPreviewCache(newCache);
        }

        // Yayın durumunu kontrol et - SENKRON OKUMA
        const yayinData = await storage.readJsonFile('yayinda.json');
        console.log('📊 [TRAINING] Yayın durumu verisi:', yayinData);
        
        if (yayinData && yayinData.EgitimModulu === true) {
          setIsPublished(true);
          console.log('📊 [TRAINING] Eğitim Materyalleri modülü yayın durumu: Yayında');
        } else {
          setIsPublished(false);
          console.log('📊 [TRAINING] Eğitim Materyalleri modülü yayın durumu: Yayında değil');
        }
      } catch (error) {
        console.error('❌ [TRAINING] Veri yükleme hatası:', error);
      }
    };

    loadData();
  }, [storage.isReady]);

  // Materyalleri kaydet - WITH PREVIEW DATA PERSISTENCE
  const saveMaterials = async (data: TrainingMaterial[]) => {
    try {
      const success = await storage.writeJsonFile('training_materials.json', data);
      if (success) {
        console.log('💾 [TRAINING] Eğitim materyalleri kaydedildi');
      } else {
        console.error('❌ [TRAINING] Eğitim materyalleri kaydedilemedi');
      }
    } catch (error) {
      console.error('❌ [TRAINING] Eğitim materyalleri kaydetme hatası:', error);
    }
  };

  // Modülü yayına alma fonksiyonu - SENKRON HALE GETİRİLDİ
  const publishModule = async () => {
    if (materials.length === 0) {
      alert('Modül yayına alınabilmesi için en az bir eğitim materyali yüklenmelidir.');
      return;
    }

    const confirmMessage = `⚠️ Bu işlemi onayladığınızda Eğitim Materyalleri modülü yayına alınacaktır. Aşağıdaki işlemler kalıcı olarak devre dışı bırakılacaktır:

• Yeni eğitim materyali yüklenemez
• Yüklenen içerikler silinemez veya düzenlenemez
• "Modülü Sıfırla" butonu pasifleştirilir

Sistem yalnızca son kullanıcı görüntüleme modu olarak çalışacaktır.

Devam etmek istiyor musunuz?`;

    if (confirm(confirmMessage)) {
      try {
        console.log('🚀 [TRAINING] Modül yayına alınıyor...');
        
        // SENKRON GÜNCELLEME
        const success = await storage.updateYayinDurumu('EgitimModulu', true);
        
        if (success) {
          setIsPublished(true);
          alert('✅ Eğitim Materyalleri modülü artık yayında! Görsel sunum modu aktif edildi.');
          console.log('🚀 [TRAINING] Eğitim Materyalleri modülü yayına alındı');
        } else {
          alert('❌ Yayına alma işlemi başarısız oldu.');
          console.error('❌ [TRAINING] Yayına alma başarısız');
        }
      } catch (error) {
        console.error('❌ [TRAINING] Yayına alma hatası:', error);
        alert('❌ Yayına alma işlemi sırasında hata oluştu.');
      }
    }
  };

  // Modülü sıfırlama fonksiyonu - SENKRON HALE GETİRİLDİ
  const resetModule = async () => {
    if (confirm('Eğitim Materyalleri modülünü sıfırlamak istediğinizden emin misiniz? Tüm yüklenen içerikler ve yayın durumu silinecektir.')) {
      try {
        console.log('🔄 [TRAINING] Modül sıfırlanıyor...');
        
        // Verileri sıfırla
        await storage.writeJsonFile('training_materials.json', []);
        
        // SENKRON YAYIN DURUMU SIFIRLAMA
        const resetSuccess = await storage.updateYayinDurumu('EgitimModulu', false);
        
        if (resetSuccess) {
          // State'leri sıfırla
          setMaterials([]);
          setIsPublished(false);
          setSelectedMaterial(null);
          setPreviewCache(new Map()); // Clear preview cache
          setUploadForm({
            title: '',
            description: '',
            type: 'PDF',
            difficulty: 'Başlangıç',
            category: 'Genel',
            file: null
          });

          console.log('🔄 [TRAINING] Eğitim Materyalleri modülü sıfırlandı');
        } else {
          console.error('❌ [TRAINING] Yayın durumu sıfırlanamadı');
          alert('❌ Yayın durumu sıfırlanırken hata oluştu.');
        }
      } catch (error) {
        console.error('❌ [TRAINING] Sıfırlama hatası:', error);
        alert('❌ Sıfırlama işlemi sırasında hata oluştu.');
      }
    }
  };

  // Dosya yükleme fonksiyonu
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadForm(prev => ({ ...prev, file }));
    }
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

  // Eğitim materyali ekleme fonksiyonu - WITH PREVIEW DATA PERSISTENCE
  const addMaterial = async () => {
    if (!uploadForm.title || !uploadForm.file) {
      alert('Lütfen başlık ve dosya seçin.');
      return;
    }

    // Dosya boyutu kontrolü - boş dosya kontrolü
    if (uploadForm.file.size === 0) {
      alert('❌ Boş dosya yüklenemez. Lütfen geçerli bir dosya seçin.');
      return;
    }

    setLoading(true);

    try {
      console.log('📤 Dosya yükleme başlatılıyor:', uploadForm.file.name);

      const materialId = Date.now().toString();
      const originalFileName = uploadForm.file.name;
      const fileExtension = originalFileName.split('.').pop()?.toLowerCase();
      const safeFileName = `training_${materialId}.${fileExtension}`;

      console.log('📁 Güvenli dosya adı:', safeFileName);

      // Dosya boyutunu hesapla
      const fileSize = (uploadForm.file.size / 1024).toFixed(1) + ' KB';

      let fileData;
      let saveSuccess = false;

      if (storage.isElectron) {
        // Electron ortamında: Önce ArrayBuffer'a çevir, sonra base64
        console.log('🖥️ Electron modu: Dosya ArrayBuffer\'a çevriliyor...');

        const arrayBuffer = await uploadForm.file.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);

        // Uint8Array'i base64'e çevir
        let binary = '';
        for (let i = 0; i < uint8Array.byteLength; i++) {
          binary += String.fromCharCode(uint8Array[i]);
        }
        const base64String = btoa(binary);

        console.log(`📄 Base64 dönüşümü tamamlandı: ${base64String.length} karakter`);

        // Dosyayı Electron'a kaydet (sadece base64 string olarak)
        saveSuccess = await storage.saveFile(safeFileName, base64String, 'base64');
        console.log(`💾 Electron dosya kaydetme sonucu: ${saveSuccess}`);

        fileData = base64String;
      } else {
        // Web ortamında: Data URL kullan
        console.log('🌐 Web modu: Data URL oluşturuluyor...');
        fileData = await fileToBase64(uploadForm.file);

        try {
          saveSuccess = await storage.saveFile(safeFileName, fileData, 'base64');
        } catch (storageError) {
          console.error('❌ Web storage error:', storageError);
          // Handle storage errors with user-friendly messages
          if (storageError.message?.startsWith('FILE_TOO_LARGE:')) {
            const fileSizeMB = storageError.message.split(':')[1];
            throw new Error(`⚠️ Dosya web tarayıcısı için çok büyük (${fileSizeMB} MB).\n\n🖥️ Çözüm Önerileri:\n• Electron masaüstü sürümünü kullanın (sınırsız dosya boyutu)\n• Dosyayı sıkıştırın veya daha küçük bir dosya kullanın`);
          }
          throw storageError;
        }
      }

      if (!saveSuccess) {
        throw new Error('Dosya kaydedilemedi. Lütfen tekrar deneyin.');
      }

      // PREVIEW DATA PREPARATION - Store base64 data for immediate preview
      let previewData = fileData;
      if (fileData.startsWith('data:')) {
        const base64Index = fileData.indexOf('base64,');
        if (base64Index !== -1) {
          previewData = fileData.substring(base64Index + 7);
        }
      }

      const newMaterial: TrainingMaterial = {
        id: materialId,
        title: uploadForm.title,
        description: uploadForm.description,
        category: uploadForm.category,
        type: uploadForm.type,
        difficulty: uploadForm.difficulty,
        content: `${uploadForm.type} dosyası: ${originalFileName}`,
        uploadDate: new Date().toISOString().split('T')[0],
        fileName: originalFileName,
        fileSize: fileSize,
        fileUrl: safeFileName,
        previewData: previewData // STORE PREVIEW DATA IMMEDIATELY
      };

      console.log('📋 Yeni materyal objesi:', newMaterial);

      const updatedMaterials = [...materials, newMaterial];
      setMaterials(updatedMaterials);
      await saveMaterials(updatedMaterials);

      // UPDATE PREVIEW CACHE
      setPreviewCache(prev => new Map(prev.set(materialId, previewData)));

      // Formu sıfırla
      setUploadForm({
        title: '',
        description: '',
        type: 'PDF',
        difficulty: 'Başlangıç',
        category: 'Genel',
        file: null
      });

      alert(`✅ "${newMaterial.title}" başarıyla eklendi!`);
      console.log('✅ Yeni eğitim materyali eklendi:', newMaterial);
    } catch (error) {
      console.error('❌ Dosya işleme hatası:', error);
      alert('Dosya yüklenirken hata oluştu: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // Materyal silme
  const deleteMaterial = async (materialId: string) => {
    if (confirm('Bu eğitim materyalini silmek istediğinizden emin misiniz?')) {
      try {
        const updatedMaterials = materials.filter(m => m.id !== materialId);
        setMaterials(updatedMaterials);
        await saveMaterials(updatedMaterials);
        
        // CLEAR FROM PREVIEW CACHE
        setPreviewCache(prev => {
          const newCache = new Map(prev);
          newCache.delete(materialId);
          return newCache;
        });
      } catch (error) {
        console.error('❌ Materyal silme hatası:', error);
        alert('❌ Materyal silinirken hata oluştu.');
      }
    }
  };

  // Tüm materyalleri temizle
  const clearAllMaterials = async () => {
    if (confirm('Tüm eğitim materyallerini silmek istediğinizden emin misiniz?')) {
      try {
        setMaterials([]);
        setPreviewCache(new Map()); // Clear preview cache
        await storage.writeJsonFile('training_materials.json', []);
      } catch (error) {
        console.error('❌ Tüm materyalleri temizleme hatası:', error);
        alert('❌ Materyaller temizlenirken hata oluştu.');
      }
    }
  };

  // Dosya indirme fonksiyonu
  const downloadFile = async (material: TrainingMaterial) => {
    try {
      if (!material.fileUrl) {
        alert('⚠️ Dosya URL\'si bulunamadı.');
        return;
      }

      console.log('📥 Dosya indirme başlatılıyor:', material.fileUrl);

      // PRIORITY: Use cached preview data first, then try file system
      let fileData = previewCache.get(material.id) || material.previewData;
      
      if (!fileData) {
        fileData = await storage.readFile(material.fileUrl, 'base64');
        console.log('📄 İndirme için dosya verisi:', fileData ? `${fileData.length} karakter` : 'null');
      }

      if (!fileData) {
        alert('❌ Dosya içeriği okunamadı.');
        return;
      }

      // Normalize base64 data
      let base64Data = fileData;
      if (fileData.startsWith('data:')) {
        const base64Index = fileData.indexOf('base64,');
        if (base64Index !== -1) {
          base64Data = fileData.substring(base64Index + 7);
        }
      }

      // Create download link
      const link = document.createElement('a');
      let mimeType = 'application/octet-stream';
      
      if (material.fileName?.toLowerCase().endsWith('.pdf')) {
        mimeType = 'application/pdf';
      } else if (material.fileName?.toLowerCase().endsWith('.mp4')) {
        mimeType = 'video/mp4';
      } else if (material.fileName?.toLowerCase().endsWith('.avi')) {
        mimeType = 'video/avi';
      }

      link.href = `data:${mimeType};base64,${base64Data}`;
      link.download = material.fileName || 'dosya';
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();

      setTimeout(() => {
        document.body.removeChild(link);
      }, 100);

      console.log(`📥 Dosya indirme tamamlandı: ${material.fileName}`);

    } catch (error) {
      console.error('❌ Dosya indirme hatası:', error);
      alert('Dosya indirilemedi. Lütfen tekrar deneyin.');
    }
  };

  // ENHANCED PDF PREVIEW - With persistent cache support
  const getPDFPreviewUrl = useCallback(async (material: TrainingMaterial): Promise<string | null> => {
    try {
      console.log('📁 [PDF_PREVIEW] PDF önizleme başlatılıyor:', material.fileName);
      
      // PRIORITY 1: Check in-memory cache first
      const cachedData = previewCache.get(material.id);
      if (cachedData) {
        console.log('🚀 [PDF_PREVIEW] Using cached preview data:', material.fileName);
        return cachedData;
      }
      
      // PRIORITY 2: Check material's stored preview data
      if (material.previewData) {
        console.log('💾 [PDF_PREVIEW] Using stored preview data:', material.fileName);
        // Update cache for future use
        setPreviewCache(prev => new Map(prev.set(material.id, material.previewData!)));
        return material.previewData;
      }
      
      if (!material.fileUrl) {
        console.log('❌ [PDF_PREVIEW] Dosya URL\'si bulunamadı:', material.title);
        return null;
      }

      // PRIORITY 3: Read from file system
      console.log('📖 [PDF_PREVIEW] Reading from file system:', material.fileUrl);
      const rawFileData = await storage.readFile(material.fileUrl, 'base64');
      console.log('📄 [PDF_PREVIEW] File system read result:', rawFileData ? `${rawFileData.length} karakter` : 'null');

      if (!rawFileData) {
        console.log('❌ [PDF_PREVIEW] Dosya içeriği okunamadı');
        return null;
      }

      // Normalize base64 format
      let base64Data = rawFileData;
      if (rawFileData.startsWith('data:')) {
        const base64Index = rawFileData.indexOf('base64,');
        if (base64Index !== -1) {
          base64Data = rawFileData.substring(base64Index + 7);
        }
      }

      // Validate PDF format
      try {
        const binaryString = atob(base64Data);
        const first4Bytes = binaryString.substring(0, 4);
        
        if (first4Bytes === '%PDF') {
          console.log('✅ [PDF_PREVIEW] PDF formatı doğrulandı');
          
          // UPDATE CACHE AND MATERIAL DATA
          setPreviewCache(prev => new Map(prev.set(material.id, base64Data)));
          
          // Update material in state with preview data
          setMaterials(prev => prev.map(m => 
            m.id === material.id ? { ...m, previewData: base64Data } : m
          ));
          
          return base64Data;
        } else {
          console.log('❌ [PDF_PREVIEW] PDF formatı geçersiz');
          return null;
        }
      } catch (decodeError) {
        console.error('❌ [PDF_PREVIEW] Base64 decode hatası:', decodeError);
        return null;
      }

    } catch (error) {
      console.error('❌ [PDF_PREVIEW] PDF önizleme URL alma hatası:', error);
      return null;
    }
  }, [previewCache, storage.readFile]);

  // ENHANCED VIDEO PREVIEW - With persistent cache support
  const getVideoPreviewUrl = useCallback(async (material: TrainingMaterial): Promise<string | null> => {
    try {
      console.log('🎥 [VIDEO_PREVIEW] Video önizleme başlatılıyor:', material.fileName);
      
      // PRIORITY 1: Check in-memory cache first
      const cachedData = previewCache.get(material.id);
      if (cachedData) {
        console.log('🚀 [VIDEO_PREVIEW] Using cached preview data:', material.fileName);
        return cachedData;
      }
      
      // PRIORITY 2: Check material's stored preview data
      if (material.previewData) {
        console.log('💾 [VIDEO_PREVIEW] Using stored preview data:', material.fileName);
        // Update cache for future use
        setPreviewCache(prev => new Map(prev.set(material.id, material.previewData!)));
        return material.previewData;
      }
      
      if (!material.fileUrl) {
        console.log('❌ [VIDEO_PREVIEW] Dosya URL\'si bulunamadı:', material.title);
        return null;
      }

      // PRIORITY 3: Read from file system
      console.log('📖 [VIDEO_PREVIEW] Reading from file system:', material.fileUrl);
      const rawFileData = await storage.readFile(material.fileUrl, 'base64');
      console.log('📄 [VIDEO_PREVIEW] File system read result:', rawFileData ? `${rawFileData.length} karakter` : 'null');

      if (!rawFileData) {
        console.log('❌ [VIDEO_PREVIEW] Dosya içeriği okunamadı');
        return null;
      }

      // Normalize base64 format
      let base64Data = rawFileData;
      if (rawFileData.startsWith('data:')) {
        const base64Index = rawFileData.indexOf('base64,');
        if (base64Index !== -1) {
          base64Data = rawFileData.substring(base64Index + 7);
        }
      }

      // Basic video format validation (check for common video headers)
      try {
        const binaryString = atob(base64Data.substring(0, 100)); // Check first 100 chars
        const first8Bytes = Array.from(binaryString.substring(0, 8)).map(c => c.charCodeAt(0));
        
        // Check for MP4 signature (ftyp)
        const isMP4 = binaryString.includes('ftyp') || binaryString.includes('mp4');
        // Check for AVI signature (RIFF...AVI)
        const isAVI = binaryString.includes('RIFF') && binaryString.includes('AVI');
        
        if (isMP4 || isAVI || material.fileName?.toLowerCase().match(/\.(mp4|avi|mov|wmv|flv)$/)) {
          console.log('✅ [VIDEO_PREVIEW] Video formatı doğrulandı');
          
          // UPDATE CACHE AND MATERIAL DATA
          setPreviewCache(prev => new Map(prev.set(material.id, base64Data)));
          
          // Update material in state with preview data
          setMaterials(prev => prev.map(m => 
            m.id === material.id ? { ...m, previewData: base64Data } : m
          ));
          
          return base64Data;
        } else {
          console.log('❌ [VIDEO_PREVIEW] Video formatı doğrulanamadı');
          return null;
        }
      } catch (decodeError) {
        console.error('❌ [VIDEO_PREVIEW] Base64 decode hatası:', decodeError);
        return null;
      }

    } catch (error) {
      console.error('❌ [VIDEO_PREVIEW] Video önizleme URL alma hatası:', error);
      return null;
    }
  }, [previewCache, storage.readFile]);

  // Filtreleme
  const filteredMaterials = materials.filter(material => {
    const matchesSearch = material.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         material.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         material.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === 'Tümü' || material.type === selectedType;
    const matchesDifficulty = selectedDifficulty === 'Tümü' || material.difficulty === selectedDifficulty;
    return matchesSearch && matchesType && matchesDifficulty;
  });

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'PDF': return 'bg-red-100 text-red-800';
      case 'Video': return 'bg-blue-100 text-blue-800';
      case 'Dokuman': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Başlangıç': return 'bg-green-100 text-green-800';
      case 'Orta': return 'bg-yellow-100 text-yellow-800';
      case 'İleri': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="w-full min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-green-100 p-3 rounded-lg">
              <FileText className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-gray-900">Eğitim Materyalleri</h1>
              </div>
              <p className="text-gray-600">PDF dökümanlar, eğitim videoları ve diğer öğrenme kaynakları</p>
            </div>
          </div>

          {/* İstatistikler */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-red-50 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-red-600" />
                <span className="text-sm font-medium text-red-900">PDF Dökümanlar</span>
              </div>
              <div className="text-2xl font-bold text-red-600 mt-1">
                {materials.filter(m => m.type === 'PDF').length}
              </div>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <Play className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">Eğitim Videoları</span>
              </div>
              <div className="text-2xl font-bold text-blue-600 mt-1">
                {materials.filter(m => m.type === 'Video').length}
              </div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-green-900">Diğer Dökümanlar</span>
              </div>
              <div className="text-2xl font-bold text-green-600 mt-1">
                {materials.filter(m => m.type === 'Dokuman').length}
              </div>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-orange-600" />
                <span className="text-sm font-medium text-orange-900">Son Yükleme</span>
              </div>
              <div className="text-sm font-bold text-orange-600 mt-1">
                {materials.length > 0 
                  ? new Date(Math.max(...materials.map(m => new Date(m.uploadDate).getTime()))).toLocaleDateString('tr-TR')
                  : 'Henüz yok'
                }
              </div>
            </div>
          </div>

          {/* Kalıcı Depolama Bilgisi - Sadece yayınlanmamışsa göster */}
          {!isPublished && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="font-medium text-green-900 mb-2">
                {storage.isElectron ? '🖥️ Electron Modu - Kalıcı Depolama Aktif' : '🌐 Web Modu - Geçici Depolama'}
              </div>
              <div className="text-sm text-green-800 space-y-1">
                {storage.isElectron ? (
                  <>
                    <div>• <strong>Kalıcı Dosya Sistemi:</strong> Tüm dosyalar uygulama klasöründe saklanır</div>
                    <div>• <strong>Önizleme Kalıcılığı:</strong> PDF/Video önizlemeleri modüller arası geçişte korunur</div>
                    <div>• <strong>Yayın Durumu Korunur:</strong> Modül durumları JSON dosyasında kalıcı tutulur</div>
                    <div>• <strong>Offline Çalışma:</strong> İnternet bağlantısı gerektirmez</div>
                  </>
                ) : (
                  <>
                    <div>• <strong>Geçici Depolama:</strong> Veriler tarayıcı oturumunda saklanır</div>
                    <div>• <strong>Önizleme Sınırları:</strong> Büyük dosyalar için Electron sürümü önerilir</div>
                    <div>• <strong>Tavsiye:</strong> Kalıcı kullanım için Electron sürümünü tercih edin</div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Yükleme Alanı - Sadece yayınlanmamışsa göster */}
        {!isPublished && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Upload className="w-5 h-5" />
              📚 Yeni Eğitim Materyali Yükle
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Sol Kolon - Temel Bilgiler */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Başlık <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={uploadForm.title}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Eğitim materyali başlığı"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Açıklama
                  </label>
                  <textarea
                    value={uploadForm.description}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Kısa açıklama (opsiyonel)"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tür</label>
                    <select
                      value={uploadForm.type}
                      onChange={(e) => setUploadForm(prev => ({ ...prev, type: e.target.value as any }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      <option value="PDF">PDF Döküman</option>
                      <option value="Video">Eğitim Videosu</option>
                      <option value="Dokuman">Diğer Döküman</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Zorluk</label>
                    <select
                      value={uploadForm.difficulty}
                      onChange={(e) => setUploadForm(prev => ({ ...prev, difficulty: e.target.value as any }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      <option value="Başlangıç">Başlangıç</option>
                      <option value="Orta">Orta</option>
                      <option value="İleri">İleri</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Kategori</label>
                  <input
                    type="text"
                    value={uploadForm.category}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Kategori adı"
                  />
                </div>
              </div>

              {/* Sağ Kolon - Dosya Yükleme */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dosya Seç <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="file"
                    onChange={handleFileUpload}
                    accept=".pdf,.mp4,.avi,.doc,.docx"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                  {uploadForm.file && (
                    <div className="mt-2 text-sm text-gray-600 bg-gray-50 p-2 rounded">
                      📁 {uploadForm.file.name} ({(uploadForm.file.size / 1024).toFixed(1)} KB)
                    </div>
                  )}
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="font-medium text-blue-900 mb-2">
                    📋 Desteklenen Dosya Formatları:
                  </div>
                  <div className="text-sm text-blue-800 space-y-1">
                    <div>• <strong>PDF:</strong> .pdf dosyaları (önizleme destekli)</div>
                    <div>• <strong>Video:</strong> .mp4, .avi dosyaları (önizleme destekli)</div>
                    <div>• <strong>Döküman:</strong> .doc, .docx dosyaları</div>
                    <div>• <strong>Maksimum Boyut:</strong> {storage.isElectron ? '50 MB' : '2 MB'}</div>
                    <div>• <strong>Önizleme Kalıcılığı:</strong> {storage.isElectron ? 'Tam destek' : 'Sınırlı'}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
              <div className="text-sm text-gray-500">
                <span className="text-red-500">*</span> işaretli alanlar zorunludur
              </div>
              <button
                onClick={addMaterial}
                disabled={loading}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Yükleniyor...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Eğitim Materyali Ekle
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Yayınlama Kontrolü */}
        {!isPublished && materials.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Rocket className="w-5 h-5" />
              Modül Yayın Kontrolü
            </h2>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 mb-2">
                  {materials.length} eğitim materyali yüklendi. Modülü yayına almaya hazır mısınız?
                </p>
                <p className="text-sm text-gray-500">
                  Yayına aldıktan sonra sadece materyaller görüntülenebilir.
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
                  Modül Yayına Hazır
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Arama ve Filtreler */}
        {materials.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Eğitim materyallerinde ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="Tümü">Tüm Tipler</option>
                <option value="PDF">PDF</option>
                <option value="Video">Video</option>
                <option value="Dokuman">Döküman</option>
              </select>

              <select
                value={selectedDifficulty}
                onChange={(e) => setSelectedDifficulty(e.target.value)}
                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="Tümü">Tüm Zorluklar</option>
                <option value="Başlangıç">Başlangıç</option>
                <option value="Orta">Orta</option>
                <option value="İleri">İleri</option>
              </select>
            </div>

            {filteredMaterials.length > 0 && (
              <div className="mt-4 flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  <span className="font-medium">{filteredMaterials.length}</span> eğitim materyali bulundu
                </div>
                {!isPublished && (
                  <div className="flex items-center gap-4">
                    <div className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                      ✏️ Düzenleme modu aktif
                    </div>
                    <button
                      onClick={clearAllMaterials}
                      className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 text-sm"
                    >
                      <Trash2 className="w-4 h-4" />
                      Tümünü Temizle
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Materyal Listesi */}
        {filteredMaterials.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMaterials.map((material) => (
              <div key={material.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-lg font-semibold text-gray-900 line-clamp-2 flex-1">
                      {material.title}
                    </h3>
                    {!isPublished && (
                      <button
                        onClick={() => deleteMaterial(material.id)}
                        className="text-red-600 hover:text-red-800 p-1 ml-2"
                        title="Sil"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {material.description && (
                    <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                      {material.description}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(material.type)}`}>
                      {material.type}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(material.difficulty)}`}>
                      {material.difficulty}
                    </span>
                    <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded">
                      {material.category}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                    <span>{new Date(material.uploadDate).toLocaleDateString('tr-TR')}</span>
                    {material.fileSize && <span>{material.fileSize}</span>}
                  </div>

                  {material.fileName && (
                    <div className="text-xs text-gray-500 mb-4 flex items-center gap-1">
                      <span>📁</span>
                      <span className="truncate">{material.fileName}</span>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedMaterial(material)}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      Görüntüle
                    </button>
                    <button
                      onClick={() => downloadFile(material)}
                      className="px-4 py-2 rounded-lg transition-colors flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-700"
                      title="Dosyayı İndir"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12">
            <div className="text-center text-gray-500">
              <div className="text-6xl mb-4">📚</div>
              <div className="text-xl font-medium mb-2">
                {materials.length === 0
                  ? 'Henüz eğitim materyali yüklenmemiş'
                  : 'Eğitim materyali bulunamadı'
                }
              </div>
              <div className="text-gray-600">
                {materials.length === 0
                  ? isPublished
                    ? 'Bu modül yayında ancak henüz içerik bulunmuyor'
                    : 'Yukarıdaki formu kullanarak ilk eğitim materyalinizi yükleyin'
                  : 'Arama kriterlerinizi değiştirerek tekrar deneyin'
                }
              </div>
            </div>
          </div>
        )}

        {/* Detay Modal - ENHANCED WITH PERSISTENT PREVIEW */}
        {selectedMaterial && (
          <MaterialDetailModal
            material={selectedMaterial}
            onClose={() => setSelectedMaterial(null)}
            onDownload={downloadFile}
            getPDFPreviewUrl={getPDFPreviewUrl}
            getVideoPreviewUrl={getVideoPreviewUrl}
            getTypeColor={getTypeColor}
            getDifficultyColor={getDifficultyColor}
            storage={storage}
            previewCache={previewCache}
          />
        )}
      </div>
    </div>
  );
};

// ENHANCED Modal Component - WITH PERSISTENT PREVIEW SUPPORT
const MaterialDetailModal = ({
  material,
  onClose,
  onDownload,
  getPDFPreviewUrl,
  getVideoPreviewUrl,
  getTypeColor,
  getDifficultyColor,
  storage,
  previewCache
}: {
  material: TrainingMaterial;
  onClose: () => void;
  onDownload: (material: TrainingMaterial) => void;
  getPDFPreviewUrl: (material: TrainingMaterial) => Promise<string | null>;
  getVideoPreviewUrl: (material: TrainingMaterial) => Promise<string | null>;
  getTypeColor: (type: string) => string;
  getDifficultyColor: (difficulty: string) => string;
  storage: ReturnType<typeof useElectronStorage>;
  previewCache: Map<string, string>;
}) => {
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [loadingPDF, setLoadingPDF] = useState(false);
  const [loadingVideo, setLoadingVideo] = useState(false);

  // ENHANCED PREVIEW LOADING - Check cache first, then load
  useEffect(() => {
    const loadPreviews = async () => {
      // PRIORITY: Check cache first
      const cachedData = previewCache.get(material.id) || material.previewData;
      
      if (material.type === 'PDF' && material.fileName?.toLowerCase().endsWith('.pdf')) {
        if (cachedData) {
          console.log('🚀 [MODAL] Using cached PDF preview:', material.fileName);
          setPdfPreviewUrl(cachedData);
        } else {
          setLoadingPDF(true);
          try {
            const url = await getPDFPreviewUrl(material);
            setPdfPreviewUrl(url);
          } catch (error) {
            console.error('❌ PDF önizleme yükleme hatası:', error);
          } finally {
            setLoadingPDF(false);
          }
        }
      }
      
      if (material.type === 'Video' && material.fileName?.toLowerCase().match(/\.(mp4|avi|mov|wmv|flv)$/)) {
        if (cachedData) {
          console.log('🚀 [MODAL] Using cached video preview:', material.fileName);
          setVideoPreviewUrl(cachedData);
        } else {
          setLoadingVideo(true);
          try {
            const url = await getVideoPreviewUrl(material);
            setVideoPreviewUrl(url);
          } catch (error) {
            console.error('❌ Video önizleme yükleme hatası:', error);
          } finally {
            setLoadingVideo(false);
          }
        }
      }
    };

    loadPreviews();
  }, [material, getPDFPreviewUrl, getVideoPreviewUrl, previewCache]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-7xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                {material.title}
              </h3>
              {material.description && (
                <p className="text-gray-600 mb-4">
                  {material.description}
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getTypeColor(material.type)}`}>
                  {material.type}
                </span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getDifficultyColor(material.difficulty)}`}>
                  {material.difficulty}
                </span>
                <span className="px-3 py-1 bg-gray-100 text-gray-800 text-sm rounded-full">
                  {material.category}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-2"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {/* PDF ÖNİZLEME - ENHANCED WITH CACHE SUPPORT */}
          {material.type === 'PDF' && material.fileName?.toLowerCase().endsWith('.pdf') && (
            <div className="mb-6">
              <h5 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                <FileText className="w-5 h-5 text-red-600" />
                PDF Önizleme
                {previewCache.has(material.id) && (
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                    📦 Önbellek
                  </span>
                )}
              </h5>

              {loadingPDF ? (
                <div className="border border-gray-200 rounded-lg p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
                  <div className="text-gray-600">PDF yükleniyor...</div>
                </div>
              ) : pdfPreviewUrl ? (
                <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                  <iframe
                    src={`data:application/pdf;base64,${pdfPreviewUrl}`}
                    title="PDF Önizleme"
                    width="100%"
                    height="600px"
                    className="rounded"
                    style={{ border: 'none' }}
                    onLoad={() => {
                      console.log('✅ [MODAL] PDF iframe başarıyla yüklendi:', material.fileName);
                    }}
                    onError={(e) => {
                      console.error('❌ [MODAL] PDF iframe yükleme hatası:', material.fileName, e);
                    }}
                  />
                </div>
              ) : (
                <div className="border border-gray-200 rounded-lg p-8 text-center bg-gray-50">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <div className="text-gray-600 mb-2">PDF önizleme yüklenemedi</div>
                  <div className="text-sm text-gray-500">
                    Olası nedenler:
                    <br />
                    • Dosya PDF formatında değil (%PDF header yok)
                    <br />
                    • Base64 kodlama bozuk
                    <br />
                    • Dosya bulunamadı veya okunamadı
                    <br />
                    • Önbellek verisi kaybolmuş
                    <br />
                    <div>• <strong>Maksimum Boyut:</strong> {storage.isElectron ? '50 MB' : '2 MB'}</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* VIDEO ÖNİZLEME - ENHANCED WITH CACHE SUPPORT */}
          {material.type === 'Video' && material.fileName?.toLowerCase().match(/\.(mp4|avi|mov|wmv|flv)$/) && (
            <div className="mb-6">
              <h5 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                <Play className="w-5 h-5 text-blue-600" />
                Video Önizleme
                {previewCache.has(material.id) && (
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                    📦 Önbellek
                  </span>
                )}
              </h5>

              {loadingVideo ? (
                <div className="border border-gray-200 rounded-lg p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
                  <div className="text-gray-600">Video yükleniyor...</div>
                </div>
              ) : videoPreviewUrl ? (
                <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm bg-black">
                  <video
                    controls
                    width="100%"
                    height="400px"
                    className="rounded"
                    preload="metadata"
                    onLoadStart={() => {
                      console.log('🎥 [MODAL] Video yükleme başladı:', material.fileName);
                    }}
                    onLoadedData={() => {
                      console.log('✅ [MODAL] Video başarıyla yüklendi:', material.fileName);
                    }}
                    onError={(e) => {
                      console.error('❌ [MODAL] Video yükleme hatası:', material.fileName, e);
                    }}
                  >
                    <source 
                      src={`data:video/mp4;base64,${videoPreviewUrl}`} 
                      type="video/mp4" 
                    />
                    <source 
                      src={`data:video/avi;base64,${videoPreviewUrl}`} 
                      type="video/avi" 
                    />
                    Tarayıcınız video oynatmayı desteklemiyor.
                  </video>
                </div>
              ) : (
                <div className="border border-gray-200 rounded-lg p-8 text-center bg-gray-50">
                  <Play className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <div className="text-gray-600 mb-2">Video önizleme yüklenemedi</div>
                  <div className="text-sm text-gray-500">
                    Olası nedenler:
                    <br />
                    • Video formatı desteklenmiyor
                    <br />
                    • Base64 kodlama bozuk
                    <br />
                    • Dosya bulunamadı veya okunamadı
                    <br />
                    • Önbellek verisi kaybolmuş
                    <br />
                    <div>• <strong>Desteklenen Formatlar:</strong> MP4, AVI</div>
                    <div>• <strong>Maksimum Boyut:</strong> {storage.isElectron ? '50 MB' : '2 MB'}</div>
                    {!storage.isElectron && (
                      <div className="mt-2 pt-2 border-t border-blue-300">
                        <div className="text-xs text-blue-700">
                          ⚠️ <strong>Web Sürümü Sınırlaması:</strong> Büyük video dosyaları için Electron masaüstü sürümünü kullanın
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Varsayılan Dosya Gösterimi - PDF/Video olmayan dosyalar için */}
          {(material.type === 'Dokuman' || 
            (material.type === 'PDF' && !material.fileName?.toLowerCase().endsWith('.pdf')) ||
            (material.type === 'Video' && !material.fileName?.toLowerCase().match(/\.(mp4|avi|mov|wmv|flv)$/))) && (
            <div className="bg-gray-100 rounded-lg p-8 text-center">
              <div className="text-6xl mb-4">📄</div>
              <h4 className="text-lg font-medium text-gray-900 mb-2">
                {material.type} Dosyası
              </h4>
              <p className="text-gray-600 mb-4">
                Bu dosya {material.type.toLowerCase()} içeriği sunmaktadır.
              </p>
              <div className="flex items-center justify-center gap-4 text-sm text-gray-500">
                <span>📁 {material.fileName}</span>
                {material.fileSize && <span>📦 {material.fileSize}</span>}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-500">
            Yüklenme: {new Date(material.uploadDate).toLocaleDateString('tr-TR')}
            {material.fileName && ` • ${material.fileName}`}
            {material.fileSize && ` • ${material.fileSize}`}
            {previewCache.has(material.id) && (
              <span className="ml-2 text-green-600">• 📦 Önbellek aktif</span>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors font-medium"
            >
              Kapat
            </button>
            <button
              onClick={() => onDownload(material)}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              İndir
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrainingMaterials;