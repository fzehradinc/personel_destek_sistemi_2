import React, { useState, useEffect, useCallback } from 'react';
import { Upload, FileText, Eye, Download, Search, Trash2, Edit, Calendar, Tag, Rocket, RotateCcw, CheckCircle } from 'lucide-react';
import { useElectronStorage } from '../hooks/useElectronStorage';

interface ProcedureInstruction {
id: string;
title: string;
description: string;
category: string;
type: 'Prosedür' | 'Talimat' | 'Kılavuz';
content: string;
uploadDate: string;
fileName?: string;
fileSize?: string;
fileUrl?: string; // Dosya URL'si
}

const ProceduresInstructions = () => {
const [procedures, setProcedures] = useState<ProcedureInstruction[]>([]);
const [loading, setLoading] = useState(false);
const [searchTerm, setSearchTerm] = useState('');
const [selectedType, setSelectedType] = useState('Tümü');
const [selectedProcedure, setSelectedProcedure] = useState<ProcedureInstruction | null>(null);
const [isPublished, setIsPublished] = useState(false);

// Yükleme formu state'leri
const [uploadForm, setUploadForm] = useState({
title: '',
description: '',
type: 'Prosedür' as 'Prosedür' | 'Talimat' | 'Kılavuz',
category: 'Genel',
file: null as File | null
});

// Electron Storage Hook
const storage = useElectronStorage();

// Verileri yükle - SENKRON HALE GETİRİLDİ
useEffect(() => {
const loadData = async () => {
if (!storage.isReady) return;

      // Sadece bir kez yükle
      if (procedures.length > 0 || isPublished) return;
try {
console.log('📊 [PROCEDURES] Veriler yükleniyor...');

// Prosedür ve talimatları yükle
const data = await storage.readJsonFile('procedures_instructions.json');
if (data && Array.isArray(data)) {
setProcedures(data);
console.log('💾 [PROCEDURES] Prosedür ve talimatlar yüklendi:', data.length);
}

// Yayın durumunu kontrol et - SENKRON OKUMA
const yayinData = await storage.readJsonFile('yayinda.json');
console.log('📊 [PROCEDURES] Yayın durumu verisi:', yayinData);

if (yayinData && yayinData.ProsedurTalimatlar === true) {
setIsPublished(true);
console.log('📊 [PROCEDURES] Prosedür ve Talimatlar modülü yayın durumu: Yayında');
} else {
setIsPublished(false);
console.log('📊 [PROCEDURES] Prosedür ve Talimatlar modülü yayın durumu: Yayında değil');
}
} catch (error) {
console.error('❌ [PROCEDURES] Veri yükleme hatası:', error);
}
};

loadData();
}, [storage.isReady]);

// Prosedürleri kaydet
const saveProcedures = async (data: ProcedureInstruction[]) => {
try {
const success = await storage.writeJsonFile('procedures_instructions.json', data);
if (success) {
console.log('💾 [PROCEDURES] Prosedür ve talimatlar kaydedildi');
} else {
console.error('❌ [PROCEDURES] Prosedür ve talimatlar kaydedilemedi');
}
} catch (error) {
console.error('❌ [PROCEDURES] Prosedür ve talimatlar kaydetme hatası:', error);
}
};

// Modülü yayına alma fonksiyonu - SENKRON HALE GETİRİLDİ
const publishModule = async () => {
if (procedures.length === 0) {
alert('Modül yayına alınabilmesi için en az bir prosedür/talimat yüklenmelidir.');
return;
}

const confirmMessage = `⚠️ Bu işlemi onayladığınızda Prosedür ve Talimatlar modülü yayına alınacaktır. Aşağıdaki işlemler kalıcı olarak devre dışı bırakılacaktır:

• Yeni prosedür/talimat yüklenemez
• Yüklenen içerikler silinemez veya düzenlenemez
• "Modülü Sıfırla" butonu pasifleştirilir

Sistem yalnızca son kullanıcı görüntüleme modu olarak çalışacaktır.

Devam etmek istiyor musunuz?`;

if (confirm(confirmMessage)) {
try {
console.log('🚀 [PROCEDURES] Modül yayına alınıyor...');

// SENKRON GÜNCELLEME
const success = await storage.updateYayinDurumu('ProsedurTalimatlar', true);

if (success) {
setIsPublished(true);
alert('✅ Prosedür ve Talimatlar modülü artık yayında! Görsel sunum modu aktif edildi.');
console.log('🚀 [PROCEDURES] Prosedür ve Talimatlar modülü yayına alındı');
} else {
alert('❌ Yayına alma işlemi başarısız oldu.');
console.error('❌ [PROCEDURES] Yayına alma başarısız');
}
} catch (error) {
console.error('❌ [PROCEDURES] Yayına alma hatası:', error);
alert('❌ Yayına alma işlemi sırasında hata oluştu.');
}
}
};

// Modülü sıfırlama fonksiyonu - SENKRON HALE GETİRİLDİ
const resetModule = async () => {
if (confirm('Prosedür ve Talimatlar modülünü sıfırlamak istediğinizden emin misiniz? Tüm yüklenen içerikler ve yayın durumu silinecektir.')) {
try {
console.log('🔄 [PROCEDURES] Modül sıfırlanıyor...');

// Verileri sıfırla
await storage.writeJsonFile('procedures_instructions.json', []);

// SENKRON YAYIN DURUMU SIFIRLAMA
const resetSuccess = await storage.updateYayinDurumu('ProsedurTalimatlar', false);

if (resetSuccess) {
// State'leri sıfırla
setProcedures([]);
setIsPublished(false);
setSelectedProcedure(null);
setUploadForm({
title: '',
description: '',
type: 'Prosedür',
category: 'Genel',
file: null
});

console.log('🔄 [PROCEDURES] Prosedür ve Talimatlar modülü sıfırlandı');
} else {
console.error('❌ [PROCEDURES] Yayın durumu sıfırlanamadı');
alert('❌ Yayın durumu sıfırlanırken hata oluştu.');
}
} catch (error) {
console.error('❌ [PROCEDURES] Sıfırlama hatası:', error);
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

// Prosedür/Talimat ekleme fonksiyonu
const addProcedure = async () => {
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

const procedureId = Date.now().toString();
const originalFileName = uploadForm.file.name;
const fileExtension = originalFileName.split('.').pop()?.toLowerCase();
const safeFileName = `procedure_${procedureId}.${fileExtension}`;

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
console.log(`🔍 İlk 50 karakter: ${base64String.substring(0, 50)}...`);

// Dosyayı Electron'a kaydet (sadece base64 string olarak)
saveSuccess = await storage.saveFile(safeFileName, base64String, 'base64');
console.log(`💾 Electron dosya kaydetme sonucu: ${saveSuccess}`);

if (saveSuccess) {
// Kaydedilen dosyayı hemen kontrol et
const fileExists = await storage.fileExists(safeFileName);
console.log(`✅ Dosya varlık kontrolü: ${fileExists}`);

if (fileExists) {
// Test okuma yap
const testRead = await storage.readFile(safeFileName, 'base64');
console.log(`🔍 Test okuma sonucu: ${testRead ? `${testRead.length} karakter` : 'null'}`);
}
}

fileData = base64String;
} else {
// Web ortamında: Data URL kullan
console.log('🌐 Web modu: Data URL oluşturuluyor...');
fileData = await fileToBase64(uploadForm.file);

try {
saveSuccess = await storage.saveFile(safeFileName, fileData, 'base64');
} catch (storageError) {
console.error('❌ Web storage error:', storageError);

// Handle specific storage errors with user-friendly messages
if (storageError.message?.startsWith('FILE_TOO_LARGE:')) {
const fileSizeMB = storageError.message.split(':')[1];
throw new Error(`⚠️ Dosya web tarayıcısı için çok büyük (${fileSizeMB} MB).\n\n🖥️ Çözüm Önerileri:\n• Electron masaüstü sürümünü kullanın (sınırsız dosya boyutu)\n• Dosyayı sıkıştırın veya daha küçük bir dosya kullanın\n\n📱 Web Sürümü Sınırları:\n• Maksimum dosya boyutu: ~1.5 MB\n• Geçici depolama (sayfa yenilendiğinde kaybolur)\n• Demo amaçlı kullanım için uygundur`);
} else if (storageError.message?.startsWith('QUOTA_EXCEEDED:')) {
const fileSizeMB = storageError.message.split(':')[1];
throw new Error(`💾 Tarayıcı depolama alanı dolu (${fileSizeMB} MB dosya).\n\n🔧 Çözüm Önerileri:\n• Sayfayı yenileyerek geçici verileri temizleyin\n• Tarayıcı önbelleğini temizleyin\n• Daha küçük dosyalar kullanın\n• Electron masaüstü sürümünü tercih edin\n\n⚠️ Web sürümü yalnızca demo amaçlıdır.`);
} else if (storageError.message?.startsWith('STORAGE_FULL:')) {
const fileSizeMB = storageError.message.split(':')[1];
throw new Error(`🚫 Tarayıcı depolama alanı tamamen dolu (${fileSizeMB} MB dosya).\n\n🔄 Çözümler:\n• Sayfayı yenileyin (F5)\n• Tarayıcıyı yeniden başlatın\n• Farklı tarayıcı deneyin\n• Electron masaüstü sürümünü kullanın\n\n💡 Kalıcı çözüm için Electron sürümü önerilir.`);
} else if (storageError.message?.startsWith('STORAGE_FAILED:')) {
const fileSizeMB = storageError.message.split(':')[1];
throw new Error(`❌ Tarayıcı depolama sistemi hatası (${fileSizeMB} MB dosya).\n\n🛠️ Deneyebilecekleriniz:\n• Sayfayı yenileyin ve tekrar deneyin\n• Tarayıcı geliştirici araçlarını açıp Console'u temizleyin\n• Gizli/özel pencerede deneyin\n• Electron masaüstü sürümünü kullanın\n\n🎯 En güvenilir çözüm: Electron masaüstü uygulaması`);
} else {
throw storageError;
}
}
}

if (!saveSuccess) {
throw new Error('Dosya kaydedilemedi. Lütfen tekrar deneyin.');
}

const newProcedure: ProcedureInstruction = {
id: procedureId,
title: uploadForm.title,
description: uploadForm.description,
category: uploadForm.category,
type: uploadForm.type,
content: `${uploadForm.type} dosyası: ${originalFileName}`,
uploadDate: new Date().toISOString().split('T')[0],
fileName: originalFileName,
fileSize: fileSize,
fileUrl: safeFileName // Güvenli dosya adını kullan
};

console.log('📋 Yeni prosedür objesi:', newProcedure);

const updatedProcedures = [...procedures, newProcedure];
setProcedures(updatedProcedures);
await saveProcedures(updatedProcedures);

// Formu sıfırla
setUploadForm({
title: '',
description: '',
type: 'Prosedür',
category: 'Genel',
file: null
});

alert(`✅ "${newProcedure.title}" başarıyla eklendi!`);
console.log('✅ Yeni prosedür/talimat eklendi:', newProcedure);
} catch (error) {
console.error('❌ Dosya işleme hatası:', error);
alert('Dosya yüklenirken hata oluştu. Lütfen tekrar deneyin.');
} finally {
setLoading(false);
}
};

// Prosedür silme
const deleteProcedure = async (procedureId: string) => {
if (confirm('Bu prosedür/talimatı silmek istediğinizden emin misiniz?')) {
try {
const updatedProcedures = procedures.filter(p => p.id !== procedureId);
setProcedures(updatedProcedures);
await saveProcedures(updatedProcedures);
} catch (error) {
console.error('❌ Prosedür silme hatası:', error);
alert('❌ Prosedür silinirken hata oluştu.');
}
}
};

// Tüm prosedürleri temizle
const clearAllProcedures = async () => {
if (confirm('Tüm prosedür ve talimatları silmek istediğinizden emin misiniz?')) {
try {
setProcedures([]);
await storage.writeJsonFile('procedures_instructions.json', []);
} catch (error) {
console.error('❌ Tüm prosedürleri temizleme hatası:', error);
alert('❌ Prosedürler temizlenirken hata oluştu.');
}
}
};

// Dosya indirme fonksiyonu
const downloadFile = async (procedure: ProcedureInstruction) => {
try {
if (!procedure.fileUrl) {
alert('⚠️ Dosya URL\'si bulunamadı.');
return;
}

console.log('📥 Dosya indirme başlatılıyor:', procedure.fileUrl);

const fileData = await storage.readFile(procedure.fileUrl, 'base64');
console.log('📄 İndirme için dosya verisi:', fileData ? `${fileData.length} karakter` : 'null');

if (!fileData) {
alert('❌ Dosya içeriği okunamadı.');
return;
}

// DÜZELTME: Data URI formatını normalize et
let base64Data = fileData;

// Eğer data URI formatındaysa, sadece base64 kısmını al
if (fileData.startsWith('data:')) {
console.log('🔄 [DOWNLOAD] Data URI formatı tespit edildi, base64 kısmı çıkarılıyor...');
const base64Index = fileData.indexOf('base64,');
if (base64Index !== -1) {
base64Data = fileData.substring(base64Index + 7);
console.log('✅ [DOWNLOAD] Base64 kısmı çıkarıldı:', base64Data.length, 'karakter');
}
}

// Base64 verisini kullanarak dosyayı indir
const link = document.createElement('a');

// Dosya tipine göre MIME type belirle
let mimeType = 'application/octet-stream';
if (procedure.fileName?.toLowerCase().endsWith('.pdf')) {
mimeType = 'application/pdf';
} else if (procedure.fileName?.toLowerCase().endsWith('.doc')) {
mimeType = 'application/msword';
} else if (procedure.fileName?.toLowerCase().endsWith('.docx')) {
mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
}

link.href = `data:${mimeType};base64,${base64Data}`;
link.download = procedure.fileName || 'dosya';

link.style.display = 'none';
document.body.appendChild(link);
link.click();

setTimeout(() => {
document.body.removeChild(link);
}, 100);

console.log(`📥 Dosya indirme tamamlandı: ${procedure.fileName}`);

} catch (error) {
console.error('❌ Dosya indirme hatası:', error);
alert('Dosya indirilemedi. Lütfen tekrar deneyin.');
}
};

// PDF önizleme için dosya URL'si alma fonksiyonu
const getPDFPreviewUrl = useCallback(async (procedure: ProcedureInstruction): Promise<string | null> => {
try {
    console.log('📁 [PDF_PREVIEW] PDF önizleme başlatılıyor:', procedure.fileName);
    
if (!procedure.fileUrl) {
      console.log('❌ [PDF_PREVIEW] Dosya URL\'si bulunamadı:', procedure.title);
return null;
}

    // ELECTRON: Dosya varlık kontrolü ve yeniden okuma
    if (storage.isElectron) {
      console.log('🖥️ [PDF_PREVIEW] Electron modu: Dosya varlık kontrolü yapılıyor...');
      const fileExists = await storage.fileExists(procedure.fileUrl);
      console.log('📁 [PDF_PREVIEW] Electron dosya varlık kontrolü:', fileExists);
      
      if (!fileExists) {
        console.log('❌ [PDF_PREVIEW] Electron: Dosya bulunamadı');
        return null;
      }
    }
    
    // Dosya okuma ve format normalleştirme
    let rawFileData;
    
    if (storage.isElectron) {
      // ELECTRON: Her seferinde diskten yeniden oku
      console.log('🖥️ [PDF_PREVIEW] Electron: Diskten yeniden okunuyor:', procedure.fileUrl);
      rawFileData = await storage.readFile(procedure.fileUrl, 'base64');
      console.log('📄 [PDF_PREVIEW] Electron disk okuması:', rawFileData ? `${rawFileData.length} karakter` : 'null');
    } else {
      // Web: localStorage'dan oku
      rawFileData = await storage.readFile(procedure.fileUrl, 'base64');
      console.log('🌐 [PDF_PREVIEW] Web localStorage okuması:', rawFileData ? `${rawFileData.length} karakter` : 'null');
    }

    console.log('📄 [PDF_PREVIEW] Ham dosya verisi:', rawFileData ? `${rawFileData.length} karakter` : 'null');

    if (!rawFileData) {
      console.log('❌ [PDF_PREVIEW] Dosya içeriği okunamadı');
      
      // ELECTRON: Dosya okunamadıysa detaylı hata analizi
      if (storage.isElectron) {
        console.log('🔍 [PDF_PREVIEW] Electron hata analizi:');
        console.log('  - Dosya adı:', procedure.fileUrl);
        console.log('  - Beklenen konum: files/' + procedure.fileUrl);
        console.log('  - Procedure title:', procedure.title);
        
        try {
          const appInfo = await storage.getAppInfo();
          console.log('  - App data path:', appInfo?.dataPath);
        } catch (infoError) {
          console.log('  - App info alınamadı:', infoError);
        }
      } else {
        console.log('💡 [PDF_PREVIEW] Web modu: Dosya localStorage\'dan silinmiş, sayfa yenilenmiş, veya dosya hiç kaydedilmemiş');
      }
      
      return null;
    }

    // Base64 format normalleştirme
    let base64Data = rawFileData;
    
    if (rawFileData.startsWith('data:')) {
      console.log('🔄 [PDF_PREVIEW] Data URI formatı tespit edildi, base64 kısmı çıkarılıyor...');
      const base64Index = rawFileData.indexOf('base64,');
      if (base64Index !== -1) {
        base64Data = rawFileData.substring(base64Index + 7);
        console.log('✅ [PDF_PREVIEW] Base64 kısmı çıkarıldı:', base64Data.length, 'karakter');
      } else {
        console.error('❌ [PDF_PREVIEW] Data URI formatında base64 kısmı bulunamadı');
        return null;
      }
    }

    // Base64 minimum uzunluk kontrolü
    if (base64Data.length < 100) {
      console.log('❌ [PDF_PREVIEW] Base64 verisi çok kısa:', base64Data.length, 'karakter');
      return null;
    }

    // PDF format doğrulaması
    try {
      const binaryString = atob(base64Data);
      const first4Bytes = binaryString.substring(0, 4);
      
      console.log('🔍 [PDF_PREVIEW] İlk 4 byte:', first4Bytes, '(hex:', Array.from(first4Bytes).map(c => c.charCodeAt(0).toString(16)).join(' '), ')');
      
      if (first4Bytes === '%PDF') {
        console.log('✅ [PDF_PREVIEW] PDF formatı doğrulandı (%PDF header bulundu)');
        return base64Data; // Sadece base64 string döndür
      } else {
        console.log('❌ [PDF_PREVIEW] PDF formatı geçersiz - beklenen: %PDF, bulunan:', first4Bytes);
        return null;
      }
    } catch (decodeError) {
      console.error('❌ [PDF_PREVIEW] Base64 decode hatası:', decodeError);
      console.log('🔍 [PDF_PREVIEW] Hatalı base64 verisi (ilk 100 karakter):', base64Data.substring(0, 100));
      return null;
    }

} catch (error) {
console.error('❌ [PDF_PREVIEW] PDF önizleme URL alma hatası:', error);
return null;
}
}, [storage.isElectron, storage.readFile, storage.fileExists, storage.getAppInfo]);

// Filtreleme
const filteredProcedures = procedures.filter(procedure => {
const matchesSearch = procedure.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
procedure.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
procedure.content.toLowerCase().includes(searchTerm.toLowerCase());
const matchesType = selectedType === 'Tümü' || procedure.type === selectedType;
return matchesSearch && matchesType;
});

const getTypeColor = (type: string) => {
switch (type) {
case 'Prosedür': return 'bg-blue-100 text-blue-800';
case 'Talimat': return 'bg-green-100 text-green-800';
case 'Kılavuz': return 'bg-purple-100 text-purple-800';
default: return 'bg-gray-100 text-gray-800';
}
};

return (
<div className="w-full min-h-screen bg-gray-50 p-6">
<div className="max-w-7xl mx-auto">
{/* Header */}
<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
<div className="flex items-center gap-3 mb-4">
<div className="bg-orange-100 p-3 rounded-lg">
<FileText className="w-8 h-8 text-orange-600" />
</div>
<div>
{/* REMOVED: 🚀 Yayında badge from header */}
<div className="flex items-center gap-3">
<h1 className="text-3xl font-bold text-gray-900">Prosedür ve Talimatlar</h1>
</div>
<p className="text-gray-600">Operasyonel prosedürler ve çalışma talimatları</p>
</div>
</div>

{/* İstatistikler */}
<div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
<div className="bg-blue-50 p-4 rounded-lg">
<div className="flex items-center gap-2">
<FileText className="w-5 h-5 text-blue-600" />
<span className="text-sm font-medium text-blue-900">Prosedürler</span>
</div>
<div className="text-2xl font-bold text-blue-600 mt-1">
{procedures.filter(p => p.type === 'Prosedür').length}
</div>
</div>
<div className="bg-green-50 p-4 rounded-lg">
<div className="flex items-center gap-2">
<FileText className="w-5 h-5 text-green-600" />
<span className="text-sm font-medium text-green-900">Talimatlar</span>
</div>
<div className="text-2xl font-bold text-green-600 mt-1">
{procedures.filter(p => p.type === 'Talimat').length}
</div>
</div>
<div className="bg-purple-50 p-4 rounded-lg">
<div className="flex items-center gap-2">
<FileText className="w-5 h-5 text-purple-600" />
<span className="text-sm font-medium text-purple-900">Kılavuzlar</span>
</div>
<div className="text-2xl font-bold text-purple-600 mt-1">
{procedures.filter(p => p.type === 'Kılavuz').length}
</div>
</div>
<div className="bg-orange-50 p-4 rounded-lg">
<div className="flex items-center gap-2">
<Calendar className="w-5 h-5 text-orange-600" />
<span className="text-sm font-medium text-orange-900">Son Yükleme</span>
</div>
<div className="text-sm font-bold text-orange-600 mt-1">
{procedures.length > 0
? new Date(Math.max(...procedures.map(p => new Date(p.uploadDate).getTime()))).toLocaleDateString('tr-TR')
: 'Henüz yok'
}
</div>
</div>
</div>

{/* REMOVED: Yayın Durumu Bilgisi - Bu bölüm tamamen kaldırıldı */}

{/* Kalıcı Depolama Bilgisi - Sadece yayınlanmamışsa göster */}
{!isPublished && (
<div className="bg-green-50 border border-green-200 rounded-lg p-4">
<div className="font-medium text-green-900 mb-2">
🌐 Web Uygulaması - Tarayıcı Depolama
</div>
<div className="text-sm text-green-800 space-y-1">
<div>• <strong>Tarayıcı Depolama:</strong> Veriler localStorage'da saklanır</div>
<div>• <strong>Kalıcılık:</strong> Tarayıcı verileri temizlenene kadar korunur</div>
<div>• <strong>Dosya Desteği:</strong> PDF, DOC, DOCX formatları desteklenir</div>
<div>• <strong>Maksimum Boyut:</strong> 5MB dosya yükleme sınırı</div>
</div>
</div>
)}
</div>

{/* Yükleme Alanı - Sadece yayınlanmamışsa göster */}
{!isPublished && (
<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
<h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
<Upload className="w-5 h-5" />
📄 Yeni Prosedür/Talimat Yükle
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
className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
placeholder="Prosedür/talimat başlığı"
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
className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
placeholder="Kısa açıklama (opsiyonel)"
/>
</div>

<div className="grid grid-cols-2 gap-4">
<div>
<label className="block text-sm font-medium text-gray-700 mb-2">Tür</label>
<select
value={uploadForm.type}
onChange={(e) => setUploadForm(prev => ({ ...prev, type: e.target.value as any }))}
className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
>
<option value="Prosedür">Prosedür</option>
<option value="Talimat">Talimat</option>
<option value="Kılavuz">Kılavuz</option>
</select>
</div>

<div>
<label className="block text-sm font-medium text-gray-700 mb-2">Kategori</label>
<input
type="text"
value={uploadForm.category}
onChange={(e) => setUploadForm(prev => ({ ...prev, category: e.target.value }))}
className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
placeholder="Kategori adı"
/>
</div>
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
accept=".pdf,.doc,.docx"
className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
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
<div>• <strong>PDF:</strong> .pdf dosyaları</div>
<div>• <strong>Word:</strong> .doc, .docx dosyaları</div>
<div>• <strong>Maksimum Boyut:</strong> 5 MB</div>
</div>
</div>
</div>
</div>

<div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
<div className="text-sm text-gray-500">
<span className="text-red-500">*</span> işaretli alanlar zorunludur
</div>
<button
onClick={addProcedure}
disabled={loading}
className="bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
>
{loading ? (
<>
<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
Yükleniyor...
</>
) : (
<>
<Upload className="w-4 h-4" />
Prosedür/Talimat Ekle
</>
)}
</button>
</div>
</div>
)}

{/* Yayınlama Kontrolü */}
{!isPublished && procedures.length > 0 && (
<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
<h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
<Rocket className="w-5 h-5" />
Modül Yayın Kontrolü
</h2>

<div className="flex items-center justify-between">
<div>
<p className="text-gray-600 mb-2">
{procedures.length} prosedür/talimat yüklendi. Modülü yayına almaya hazır mısınız?
</p>
<p className="text-sm text-gray-500">
Yayına aldıktan sonra sadece içerikler görüntülenebilir.
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
{procedures.length > 0 && (
<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
<div className="flex flex-col lg:flex-row gap-4">
<div className="flex-1 relative">
<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
<input
type="text"
placeholder="Prosedür ve talimatlarda ara..."
value={searchTerm}
onChange={(e) => setSearchTerm(e.target.value)}
className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
/>
</div>

<select
value={selectedType}
onChange={(e) => setSelectedType(e.target.value)}
className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
>
<option value="Tümü">Tüm Tipler</option>
<option value="Prosedür">Prosedür</option>
<option value="Talimat">Talimat</option>
<option value="Kılavuz">Kılavuz</option>
</select>
</div>

{filteredProcedures.length > 0 && (
<div className="mt-4 flex items-center justify-between">
<div className="text-sm text-gray-600">
<span className="font-medium">{filteredProcedures.length}</span> prosedür/talimat bulundu
</div>
{!isPublished && (
<div className="flex items-center gap-4">
<div className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
✏️ Düzenleme modu aktif
</div>
<button
onClick={clearAllProcedures}
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

{/* Prosedür Listesi */}
{filteredProcedures.length > 0 ? (
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
{filteredProcedures.map((procedure) => (
<div key={procedure.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
<div className="p-6">
<div className="flex items-start justify-between mb-3">
<h3 className="text-lg font-semibold text-gray-900 line-clamp-2 flex-1">
{procedure.title}
</h3>
{!isPublished && (
<button
onClick={() => deleteProcedure(procedure.id)}
className="text-red-600 hover:text-red-800 p-1 ml-2"
title="Sil"
>
<Trash2 className="w-4 h-4" />
</button>
)}
</div>

{procedure.description && (
<p className="text-gray-600 text-sm mb-4 line-clamp-3">
{procedure.description}
</p>
)}

<div className="flex flex-wrap gap-2 mb-4">
<span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(procedure.type)}`}>
{procedure.type}
</span>
<span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded">
{procedure.category}
</span>
</div>

<div className="flex items-center justify-between text-xs text-gray-500 mb-4">
<span>{new Date(procedure.uploadDate).toLocaleDateString('tr-TR')}</span>
{procedure.fileSize && <span>{procedure.fileSize}</span>}
</div>

{procedure.fileName && (
<div className="text-xs text-gray-500 mb-4 flex items-center gap-1">
<span>📁</span>
<span className="truncate">{procedure.fileName}</span>
</div>
)}

<div className="flex gap-2">
<button
onClick={() => setSelectedProcedure(procedure)}
className="flex-1 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
>
<Eye className="w-4 h-4" />
Görüntüle
</button>
<button
onClick={() => downloadFile(procedure)}
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
<div className="text-6xl mb-4">📋</div>
<div className="text-xl font-medium mb-2">
{procedures.length === 0
? 'Henüz prosedür/talimat yüklenmemiş'
: 'Prosedür/talimat bulunamadı'
}
</div>
<div className="text-gray-600">
{procedures.length === 0
? isPublished
? 'Bu modül yayında ancak henüz içerik bulunmuyor'
: 'Yukarıdaki formu kullanarak ilk prosedür/talimatınızı yükleyin'
: 'Arama kriterlerinizi değiştirerek tekrar deneyin'
}
</div>
</div>
</div>
)}

{/* Detay Modal - PDF ÖNİZLEME ÖZELLİĞİ EKLENDİ */}
{selectedProcedure && (
<ProcedureDetailModal
procedure={selectedProcedure}
onClose={() => setSelectedProcedure(null)}
onDownload={downloadFile}
getPDFPreviewUrl={getPDFPreviewUrl}
getTypeColor={getTypeColor}
storage={storage}
/>
)}
</div>
</div>
);
};

// Ayrı Modal Bileşeni - PDF ÖNİZLEME ÖZELLİĞİ İLE
const ProcedureDetailModal = ({
procedure,
onClose,
onDownload,
getPDFPreviewUrl,
getTypeColor,
storage
}: {
procedure: ProcedureInstruction;
onClose: () => void;
onDownload: (procedure: ProcedureInstruction) => void;
getPDFPreviewUrl: (procedure: ProcedureInstruction) => Promise<string | null>;
getTypeColor: (type: string) => string;
storage: ReturnType<typeof useElectronStorage>;
}) => {
const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
const [loadingPDF, setLoadingPDF] = useState(false);

  // PDF önizleme URL'sini yükle
useEffect(() => {
const loadPDFPreview = async () => {
      if (procedure.fileName?.toLowerCase().endsWith('.pdf')) {
setLoadingPDF(true);
try {
          const url = await getPDFPreviewUrl(procedure);
setPdfPreviewUrl(url);
} catch (error) {
console.error('❌ PDF önizleme yükleme hatası:', error);
} finally {
setLoadingPDF(false);
}
}
};

loadPDFPreview();
  }, [procedure, getPDFPreviewUrl]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-7xl w-full max-h-[95vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                {procedure.title}
              </h3>
              {procedure.description && (
                <p className="text-gray-600 mb-4">
                  {procedure.description}
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getTypeColor(procedure.type)}`}>
                  {procedure.type}
                </span>
                <span className="px-3 py-1 bg-gray-100 text-gray-800 text-sm rounded-full">
                  {procedure.category}
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

        <div className="p-6 overflow-y-auto max-h-[75vh]">
          {/* PDF ÖNİZLEME ÖZELLİĞİ - MEVCUT */}
          {procedure.fileName?.toLowerCase().endsWith('.pdf') && (
            <div className="mb-6">
              <h5 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                <FileText className="w-5 h-5 text-red-600" />
                PDF Önizleme
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
                    height="700px"
                    className="rounded"
                    style={{ border: 'none' }}
                    onLoad={() => {
                      console.log('✅ [MODAL] PDF iframe başarıyla yüklendi:', procedure.fileName);
                    }}
                    onError={(e) => {
                      console.error('❌ [MODAL] PDF iframe yükleme hatası:', procedure.fileName, e);
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
                    <div>• <strong>Maksimum Boyut:</strong> 5 MB</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Varsayılan Dosya Gösterimi - PDF olmayan dosyalar için */}
          {!procedure.fileName?.toLowerCase().endsWith('.pdf') && (
            <div className="bg-gray-100 rounded-lg p-8 text-center">
              <div className="text-6xl mb-4">📄</div>
              <h4 className="text-lg font-medium text-gray-900 mb-2">
                {procedure.type} Dosyası
              </h4>
              <p className="text-gray-600 mb-4">
                Bu dosya {procedure.type.toLowerCase()} içeriği sunmaktadır.
              </p>
              <div className="flex items-center justify-center gap-4 text-sm text-gray-500">
                <span>📁 {procedure.fileName}</span>
                {procedure.fileSize && <span>📦 {procedure.fileSize}</span>}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-500">
            Yüklenme: {new Date(procedure.uploadDate).toLocaleDateString('tr-TR')}
            {procedure.fileName && ` • ${procedure.fileName}`}
            {procedure.fileSize && ` • ${procedure.fileSize}`}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors font-medium"
            >
              Kapat
            </button>
            <button
              onClick={() => onDownload(procedure)}
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

export default ProceduresInstructions;