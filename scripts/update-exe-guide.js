import fs from 'fs';
import path from 'path';

const guideContent = `
# 🚀 Personel Destek Sistemi - Kullanım Kılavuzu

## 📦 Kurulum
1. .exe dosyasını çalıştırın
2. Kurulum tamamlandıktan sonra uygulamayı başlatın

## 🎯 Modül Yönetimi
- Her modül için Excel dosyaları yükleyebilirsiniz
- Yayına aldığınız modüller kalıcı olarak korunur
- Veriler uygulama içerisinde güvenle saklanır

## 💾 Veri Güvenliği
- Tüm veriler yerel olarak saklanır
- İnternet bağlantısı gerektirmez
- Yayınlanan içerikler değiştirilemez

Sürüm: ${new Date().toLocaleDateString('tr-TR')}
`;

const guidePath = path.resolve('dist/KULLANIM_KILAVUZU.txt');

try {
  fs.writeFileSync(guidePath, guideContent, 'utf8');
  console.log('✅ Kullanım kılavuzu oluşturuldu: dist/KULLANIM_KILAVUZU.txt');
} catch (error) {
  console.error('❌ Kılavuz oluşturma hatası:', error);
}