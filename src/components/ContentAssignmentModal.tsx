import React, { useState, useEffect } from 'react';
import { X, Users, Check } from 'lucide-react';
import { User } from '../types/user';
import { useAuth } from '../contexts/AuthContext';
import { useContentAssignment } from '../hooks/useContentAssignment';

interface ContentAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  contentId: string;
  contentType: 'training' | 'process' | 'procedure' | 'faq';
  contentTitle: string;
}

const ContentAssignmentModal: React.FC<ContentAssignmentModalProps> = ({
  isOpen,
  onClose,
  contentId,
  contentType,
  contentTitle
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const { getAllUsers } = useAuth();
  const { assignContent, assignments } = useContentAssignment();

  // Kullanıcıları yükle
  useEffect(() => {
    const loadUsers = async () => {
      if (isOpen) {
        const userList = await getAllUsers();
        const personnelUsers = userList.filter(u => u.role === 'personel' && u.isActive);
        setUsers(personnelUsers);

        // Mevcut atamaları kontrol et
        const existingAssignment = assignments.find(
          a => a.contentId === contentId && a.contentType === contentType
        );
        if (existingAssignment) {
          setSelectedUsers(existingAssignment.assignedUsers);
        } else {
          setSelectedUsers([]);
        }
      }
    };

    loadUsers();
  }, [isOpen, getAllUsers, assignments, contentId, contentType]);

  const handleUserToggle = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const result = await assignContent(contentId, contentType, selectedUsers);
      if (result.success) {
        onClose();
      } else {
        alert(result.message);
      }
    } catch (error) {
      console.error('❌ Atama hatası:', error);
      alert('Atama sırasında hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">İçerik Atama</h3>
              <p className="text-sm text-gray-600 mt-1">
                <strong>{contentTitle}</strong> içeriğini personele atayın
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[50vh]">
          <div className="mb-4">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Users className="w-4 h-4" />
              <span>{selectedUsers.length} personel seçildi</span>
            </div>
          </div>

          {users.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>Atanabilecek aktif personel bulunamadı</p>
            </div>
          ) : (
            <div className="space-y-2">
              {users.map((user) => (
                <div
                  key={user.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-all ${
                    selectedUsers.includes(user.id)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handleUserToggle(user.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                        <span className="text-white font-medium text-sm">
                          {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{user.name}</div>
                        <div className="text-sm text-gray-500">
                          @{user.username}
                          {user.department && ` • ${user.department}`}
                        </div>
                      </div>
                    </div>
                    {selectedUsers.includes(user.id) && (
                      <Check className="w-5 h-5 text-blue-600" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {selectedUsers.length > 0 ? (
                `${selectedUsers.length} personele atanacak`
              ) : (
                'Hiçbir personel seçilmedi'
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                İptal
              </button>
              <button
                onClick={handleSave}
                disabled={loading || selectedUsers.length === 0}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Atanıyor...
                  </>
                ) : (
                  'Ata'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContentAssignmentModal;