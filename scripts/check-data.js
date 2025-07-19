import fs from 'fs';
import path from 'path';

const dataDir = path.resolve('dist/data');

console.log('🔍 Veri dosyaları kontrol ediliyor...');

if (fs.existsSync(dataDir)) {
  const files = fs.readdirSync(dataDir);
  
  console.log(`📁 ${files.length} dosya bulundu:`);
  files.forEach(file => {
    const filePath = path.join(dataDir, file);
    const stats = fs.statSync(filePath);
    console.log(`  ✅ ${file} (${stats.size} bytes)`);
  });
} else {
  console.error('❌ dist/data klasörü bulunamadı!');
}