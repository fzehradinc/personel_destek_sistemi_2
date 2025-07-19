import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Performance: Uygulama başlatma zamanını ölç
console.time('⏱️ [MAIN] Uygulama başlatma');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// Performance: DOM yükleme tamamlandığında log
document.addEventListener('DOMContentLoaded', () => {
  console.timeEnd('⏱️ [MAIN] Uygulama başlatma');
  console.log('✅ [MAIN] DOM yükleme tamamlandı');
});

// Performance: Sayfa tamamen yüklendiğinde log
window.addEventListener('load', () => {
  console.log('✅ [MAIN] Sayfa tamamen yüklendi');
  
  // Performance bilgilerini göster
  if (performance && performance.timing) {
    const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
    console.log(`📊 [PERFORMANCE] Toplam yükleme süresi: ${loadTime}ms`);
  }
});
