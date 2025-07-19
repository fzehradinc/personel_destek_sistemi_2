import fs from 'fs';
import path from 'path';

const sourceDir = path.resolve('public/data');
const targetDir = path.resolve('dist/data');

// Hedef klasörü oluştur
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

// Veri dosyalarını kopyala
function copyDataFiles() {
  try {
    if (fs.existsSync(sourceDir)) {
      const files = fs.readdirSync(sourceDir);
      
      files.forEach(file => {
        const sourcePath = path.join(sourceDir, file);
        const targetPath = path.join(targetDir, file);
        
        if (fs.lstatSync(sourcePath).isFile()) {
          fs.copyFileSync(sourcePath, targetPath);
          console.log(`✅ Kopyalandı: ${file}`);
        }
      });
      
      console.log('🎯 Tüm veri dosyaları dist/data klasörüne kopyalandı');
    } else {
      console.warn('⚠️ public/data klasörü bulunamadı');
    }
  } catch (error) {
    console.error('❌ Veri kopyalama hatası:', error);
  }
}

copyDataFiles();