@@ .. @@
           {/* Kalıcı Depolama Bilgisi - Sadece yayınlanmamışsa göster */}
           {!isPublished && (
             <div className="bg-green-50 border border-green-200 rounded-lg p-4">
               <div className="font-medium text-green-900 mb-2">
-                {storage.isElectron ? '🖥️ Electron Modu - Kalıcı Depolama Aktif' : '🌐 Web Modu - Geçici Depolama'}
+                🌐 Web Uygulaması - Tarayıcı Depolama
               </div>
               <div className="text-sm text-green-800 space-y-1">
-                {storage.isElectron ? (
-                  <>
-                    <div>• <strong>Kalıcı Dosya Sistemi:</strong> Tüm dosyalar uygulama klasöründe saklanır</div>
-                    <div>• <strong>Yayın Durumu Korunur:</strong> Modül durumları JSON dosyasında kalıcı tutulur</div>
-                    <div>• <strong>Dağıtılabilir:</strong> .exe halinde başka bilgisayarlara verilebilir</div>
-                    <div>• <strong>Offline Çalışma:</strong> İnternet bağlantısı gerektirmez</div>
-                  </>
-                ) : (
-                  <>
-                    <div>• <strong>Tarayıcı Depolama:</strong> Veriler localStorage'da saklanır</div>
-                    <div>• <strong>Kalıcılık:</strong> Tarayıcı verileri temizlenene kadar korunur</div>
-                    <div>• <strong>İçe/Dışa Aktarım:</strong> JSON formatında yedekleme desteklenir</div>
-                  </>
-                )}
+                <div>• <strong>Tarayıcı Depolama:</strong> Veriler localStorage'da saklanır</div>
+                <div>• <strong>Kalıcılık:</strong> Tarayıcı verileri temizlenene kadar korunur</div>
+                <div>• <strong>İçe/Dışa Aktarım:</strong> JSON formatında yedekleme desteklenir</div>
+                <div>• <strong>Dosya Boyutu:</strong> Maksimum 5MB dosya yükleme desteği</div>
               </div>
             </div>
           )}