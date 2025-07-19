import React, { useState, useEffect } from 'react';
import { BookOpen, Workflow, FileText, HelpCircle, CheckCircle, Clock, Star, MessageSquare } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useContentAssignment } from '../hooks/useContentAssignment';
import { useWebStorage } from '../hooks/useWebStorage';

const PersonelDashboard = () => {
  const { currentUser } = useAuth();
  const { getUserAssignedContent, getUserProgressForContent, updateUserProgress } = useContentAssignment();
  const storage = useWebStorage();
  
  const [assignedContent, setAssignedContent] = useState<any[]>([]);
  const [contentData, setContentData] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [selectedContent, setSelectedContent] = useState<any>(null);
  const [feedback, setFeedback] = useState('');
  const [rating, setRating] = useState(0);

  // Atanmış içerikleri yükle
  useEffect(() => {
    const loadAssignedContent = async () => {
      if (!currentUser) return;

      try {
        setLoading(true);
        const assignments = getUserAssignedContent(currentUser.id);
        
        // Her içerik türü için verileri yükle
        const contentPromises = assignments.map(async (assignment) => {
          let content = null;
          let fileName = '';
          
          switch (assignment.contentType) {
            case 'training':
              const trainingData = await storage.readJsonFile('training_materials.json');
              content = trainingData?.find((item: any) => item.id === assignment.contentId);
              fileName = 'training_materials.json';
              break;
            case 'process':
              const processData = await storage.readJsonFile('process_flows.json');
              content = processData?.find((item: any) => item.id === assignment.contentId);
              fileName = 'process_flows.json';
              break;
            case 'procedure':
              const procedureData = await storage.readJsonFile('procedures_instructions.json');
              content = procedureData?.find((item: any) => item.id === assignment.contentId);
              fileName = 'procedures_instructions.json';
              break;
            case 'faq':
              const faqData = await storage.readJsonFile('faq_data.json');
              content = faqData?.find((item: any) => item.id === assignment.contentId);
              fileName = 'faq_data.json';
              break;
          }

          if (content) {
            const progress = getUserProgressForContent(
              currentUser.id, 
              assignment.contentId, 
              assignment.contentType
            );

            return {
              ...assignment,
              content,
              progress,
              fileName
            };
          }
          return null;
        });

        const resolvedContent = (await Promise.all(contentPromises)).filter(Boolean);
        setAssignedContent(resolvedContent);
      } catch (error) {
        console.error('❌ Atanmış içerikler yüklenirken hata:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAssignedContent();
  }, [currentUser, getUserAssignedContent, getUserProgressForContent, storage]);

  // İçerik durumunu güncelle
  const handleStatusUpdate = async (
    contentId: string, 
    contentType: 'training' | 'process' | 'procedure' | 'faq', 
    status: 'in_progress' | 'completed'
  ) => {
    const result = await updateUserProgress(
      contentId, 
      contentType, 
      status, 
      status === 'completed' ? feedback : undefined,
      status === 'completed' ? rating : undefined
    );

    if (result.success) {
      // Listeyi yenile
      window.location.reload();
    } else {
      alert(result.message);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'assigned': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'in_progress': return <Clock className="w-4 h-4" />;
      case 'assigned': return <Clock className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getContentTypeIcon = (type: string) => {
    switch (type) {
      case 'training': return <BookOpen className="w-5 h-5" />;
      case 'process': return <Workflow className="w-5 h-5" />;
      case 'procedure': return <FileText className="w-5 h-5" />;
      case 'faq': return <HelpCircle className="w-5 h-5" />;
      default: return <FileText className="w-5 h-5" />;
    }
  };

  const getContentTypeName = (type: string) => {
    switch (type) {
      case 'training': return 'Eğitim Materyali';
      case 'process': return 'Süreç Akışı';
      case 'procedure': return 'Prosedür/Talimat';
      case 'faq': return 'SSS';
      default: return 'İçerik';
    }
  };

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-gray-600">İçerikler yükleniyor...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <span className="text-white font-medium">
                {currentUser?.name.split(' ').map(n => n[0]).join('').toUpperCase()}
              </span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Hoş geldiniz, {currentUser?.name}
              </h1>
              <p className="text-gray-600">Size atanmış eğitim ve içerikleri görüntüleyin</p>
            </div>
          </div>

          {/* İstatistikler */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">Toplam İçerik</span>
              </div>
              <div className="text-2xl font-bold text-blue-600 mt-1">
                {assignedContent.length}
              </div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-green-900">Tamamlanan</span>
              </div>
              <div className="text-2xl font-bold text-green-600 mt-1">
                {assignedContent.filter(c => c.progress?.status === 'completed').length}
              </div>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-yellow-600" />
                <span className="text-sm font-medium text-yellow-900">Devam Eden</span>
              </div>
              <div className="text-2xl font-bold text-yellow-600 mt-1">
                {assignedContent.filter(c => c.progress?.status === 'in_progress').length}
              </div>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-orange-600" />
                <span className="text-sm font-medium text-orange-900">Bekleyen</span>
              </div>
              <div className="text-2xl font-bold text-orange-600 mt-1">
                {assignedContent.filter(c => c.progress?.status === 'assigned').length}
              </div>
            </div>
          </div>
        </div>

        {/* İçerik Listesi */}
        {assignedContent.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12">
            <div className="text-center text-gray-500">
              <div className="text-6xl mb-4">📚</div>
              <div className="text-xl font-medium mb-2">Henüz atanmış içerik yok</div>
              <div className="text-gray-600">
                Yöneticiniz size içerik atadığında burada görünecektir
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {assignedContent.map((item) => (
              <div key={`${item.contentType}-${item.contentId}`} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-blue-100 p-2 rounded-lg">
                        {getContentTypeIcon(item.contentType)}
                      </div>
                      <div>
                        <div className="text-sm text-blue-600 font-medium">
                          {getContentTypeName(item.contentType)}
                        </div>
                        <h3 className="font-semibold text-gray-900 line-clamp-2">
                          {item.content?.title || item.content?.Soru || 'Başlıksız İçerik'}
                        </h3>
                      </div>
                    </div>
                  </div>

                  {item.content?.description && (
                    <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                      {item.content.description}
                    </p>
                  )}

                  {/* Durum */}
                  <div className="flex items-center justify-between mb-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(item.progress?.status || 'assigned')}`}>
                      {getStatusIcon(item.progress?.status || 'assigned')}
                      <span className="ml-1">
                        {item.progress?.status === 'completed' ? 'Tamamlandı' :
                         item.progress?.status === 'in_progress' ? 'Devam Ediyor' : 'Atandı'}
                      </span>
                    </span>
                    {item.progress?.rating && (
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-yellow-500 fill-current" />
                        <span className="text-sm text-gray-600">{item.progress.rating}/5</span>
                      </div>
                    )}
                  </div>

                  {/* Tarihler */}
                  <div className="text-xs text-gray-500 mb-4 space-y-1">
                    <div>Atanma: {new Date(item.assignedAt).toLocaleDateString('tr-TR')}</div>
                    {item.progress?.startedAt && (
                      <div>Başlangıç: {new Date(item.progress.startedAt).toLocaleDateString('tr-TR')}</div>
                    )}
                    {item.progress?.completedAt && (
                      <div>Tamamlanma: {new Date(item.progress.completedAt).toLocaleDateString('tr-TR')}</div>
                    )}
                  </div>

                  {/* Aksiyon Butonları */}
                  <div className="space-y-2">
                    <button
                      onClick={() => setSelectedContent(item)}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                      İçeriği Görüntüle
                    </button>
                    
                    {item.progress?.status !== 'completed' && (
                      <div className="flex gap-2">
                        {item.progress?.status === 'assigned' && (
                          <button
                            onClick={() => handleStatusUpdate(item.contentId, item.contentType, 'in_progress')}
                            className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm"
                          >
                            Başla
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setSelectedContent(item);
                            // Modal açılacak ve tamamlama işlemi yapılacak
                          }}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm"
                        >
                          Tamamla
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Geri Bildirim */}
                  {item.progress?.feedback && (
                    <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <MessageSquare className="w-4 h-4 text-gray-600" />
                        <span className="text-sm font-medium text-gray-700">Geri Bildirim</span>
                      </div>
                      <p className="text-sm text-gray-600">{item.progress.feedback}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* İçerik Detay Modal */}
        {selectedContent && (
          <ContentDetailModal
            content={selectedContent}
            onClose={() => setSelectedContent(null)}
            onComplete={(feedback, rating) => {
              handleStatusUpdate(selectedContent.contentId, selectedContent.contentType, 'completed');
              setSelectedContent(null);
            }}
          />
        )}
      </div>
    </div>
  );
};

// İçerik Detay Modal Bileşeni
const ContentDetailModal = ({ 
  content, 
  onClose, 
  onComplete 
}: { 
  content: any; 
  onClose: () => void; 
  onComplete: (feedback: string, rating: number) => void; 
}) => {
  const [feedback, setFeedback] = useState('');
  const [rating, setRating] = useState(0);
  const [showCompleteForm, setShowCompleteForm] = useState(false);

  const handleComplete = () => {
    onComplete(feedback, rating);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">
                {content.content?.title || content.content?.Soru || 'İçerik Detayı'}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {content.contentType === 'training' ? 'Eğitim Materyali' :
                 content.contentType === 'process' ? 'Süreç Akışı' :
                 content.contentType === 'procedure' ? 'Prosedür/Talimat' : 'SSS'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-2"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {content.content?.description && (
            <div className="mb-6">
              <h4 className="font-medium text-gray-900 mb-2">Açıklama</h4>
              <p className="text-gray-700">{content.content.description}</p>
            </div>
          )}

          {content.contentType === 'faq' && content.content?.Cevap && (
            <div className="mb-6">
              <h4 className="font-medium text-gray-900 mb-2">Cevap</h4>
              <p className="text-gray-700 whitespace-pre-wrap">{content.content.Cevap}</p>
            </div>
          )}

          {content.content?.content && (
            <div className="mb-6">
              <h4 className="font-medium text-gray-900 mb-2">İçerik</h4>
              <p className="text-gray-700 whitespace-pre-wrap">{content.content.content}</p>
            </div>
          )}

          {/* Tamamlama Formu */}
          {showCompleteForm && (
            <div className="bg-gray-50 rounded-lg p-6 mt-6">
              <h4 className="font-medium text-gray-900 mb-4">İçeriği Tamamla</h4>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Değerlendirme (1-5 yıldız)
                  </label>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setRating(star)}
                        className={`w-8 h-8 ${
                          star <= rating ? 'text-yellow-500' : 'text-gray-300'
                        }`}
                      >
                        <Star className="w-full h-full fill-current" />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Geri Bildirim (İsteğe bağlı)
                  </label>
                  <textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Bu içerik hakkında düşüncelerinizi paylaşın..."
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Kapat
            </button>
            {content.progress?.status !== 'completed' && (
              <>
                {!showCompleteForm ? (
                  <button
                    onClick={() => setShowCompleteForm(true)}
                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                  >
                    Tamamla
                  </button>
                ) : (
                  <button
                    onClick={handleComplete}
                    disabled={rating === 0}
                    className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                  >
                    Tamamlandı Olarak İşaretle
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PersonelDashboard;