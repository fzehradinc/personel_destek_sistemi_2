import fs from 'fs';
import path from 'path';

const mode = process.argv[2]; // 'backup' veya 'restore'

const dataDir = path.resolve('public/data');
const backupDir = path.resolve('public/data-backup');

function ensureBackupFolderExists() {
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
}

function copyFiles(source, target) {
  fs.readdirSync(source).forEach(file => {
    const srcPath = path.join(source, file);
    const tgtPath = path.join(target, file);
    fs.copyFileSync(srcPath, tgtPath);
  });
}

if (mode === 'backup') {
  ensureBackupFolderExists();
  copyFiles(dataDir, backupDir);
  console.log('✅ Veri yedeği alındı: public/data → public/data-backup');
} else if (mode === 'restore') {
  if (!fs.existsSync(backupDir)) {
    console.error('❌ Yedek klasörü bulunamadı.');
    process.exit(1);
  }
  copyFiles(backupDir, dataDir);
  console.log('✅ Veri geri yüklendi: public/data-backup → public/data');
} else {
  console.error('❗ Lütfen "backup" veya "restore" parametresi girin.');
}
