import React from 'react';
import { Download, Upload, EyeOff, Loader2, Package, FileArchive } from 'lucide-react';
import { useTransferButtons } from '../hooks/useTransferButtons';

const TransferButtons = () => {
  const { 
    showTransferButtons, 
    loading, 
    handleExport, 
    handleImport, 
    hideTransferButtons 
  } = useTransferButtons();

  // Butonlar gizliyse hiçbir şey render etme
  if (!showTransferButtons) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div className="bg-white rounded-lg shadow-xl border border-gray-200 p-4 space-y-3 min-w-[200px]">
        {/* Header */}
        <div className="text-center border-b border-gray-200 pb-3">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Package className="w-5 h-5 text-blue-600" />
            <span className="font-semibold text-gray-800">Veri Yönetimi</span>
          </div>
          <div className="text-xs text-gray-500">
            Tüm modül verileri
          </div>
        </div>
        
        {/* Dışa Aktar Butonu */}
        <button
          onClick={handleExport}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-4 py-3 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 text-sm shadow-sm hover:shadow-md"
          title="Tüm verileri .zip dosyası olarak masaüstüne dışa aktar"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          <span>Dışa Aktar</span>
          <FileArchive className="w-3 h-3 opacity-70" />
        </button>

        {/* İçe Aktar Butonu */}
        <button
          onClick={handleImport}
          disabled={loading}
          className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-4 py-3 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 text-sm shadow-sm hover:shadow-md"
          title="Yedek .zip dosyasından verileri geri yükle"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Upload className="w-4 h-4" />
          )}
          <span>İçe Aktar</span>
          <FileArchive className="w-3 h-3 opacity-70" />
        </button>

        {/* Ayırıcı */}
        <div className="border-t border-gray-200 pt-2">
          {/* Gizle Butonu */}
          <button
            onClick={hideTransferButtons}
            disabled={loading}
            className="w-full bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 text-xs shadow-sm hover:shadow-md"
            title="Bu butonları kalıcı olarak gizle (canlı sistem modu)"
          >
            <EyeOff className="w-3 h-3" />
            <span>Butonları Gizle</span>
          </button>
        </div>

        {/* Loading State Info */}
        {loading && (
          <div className="text-center pt-2 border-t border-gray-200">
            <div className="text-xs text-gray-600 animate-pulse">
              İşlem devam ediyor...
            </div>
          </div>
        )}

        {/* Footer Info */}
        <div className="text-center pt-2 border-t border-gray-200">
          <div className="text-xs text-gray-500">
            📦 Organizasyon • 📚 Eğitim<br />
            🔄 Süreçler • 📋 Prosedürler • ❓ SSS
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransferButtons;