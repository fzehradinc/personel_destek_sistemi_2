import { useState, useEffect, useCallback } from 'react';
import { ContentAssignment, UserProgress } from '../types/user';
import { useWebStorage } from './useWebStorage';
import { useAuth } from './useAuth';

export const useContentAssignment = () => {
  const [assignments, setAssignments] = useState<ContentAssignment[]>([]);
  const [userProgress, setUserProgress] = useState<UserProgress[]>([]);
  const storage = useWebStorage();
  const { currentUser } = useAuth();

  // Atamaları yükle
  const loadAssignments = useCallback(async () => {
    try {
      const data = await storage.readJsonFile('content_assignments.json');
      if (data && Array.isArray(data)) {
        setAssignments(data);
      }
    } catch (error) {
      console.error('❌ Atamalar yüklenirken hata:', error);
    }
  }, [storage]);

  // Kullanıcı ilerlemelerini yükle
  const loadUserProgress = useCallback(async () => {
    try {
      const data = await storage.readJsonFile('user_progress.json');
      if (data && Array.isArray(data)) {
        setUserProgress(data);
      }
    } catch (error) {
      console.error('❌ Kullanıcı ilerlemeleri yüklenirken hata:', error);
    }
  }, [storage]);

  // İçerik atama (sadece admin)
  const assignContent = useCallback(async (
    contentId: string,
    contentType: 'training' | 'process' | 'procedure' | 'faq',
    userIds: string[]
  ): Promise<{ success: boolean; message: string }> => {
    if (currentUser?.role !== 'admin') {
      return { success: false, message: 'Yetkiniz yok' };
    }

    try {
      const newAssignment: ContentAssignment = {
        contentId,
        contentType,
        assignedUsers: userIds,
        assignedAt: new Date().toISOString(),
        assignedBy: currentUser.id
      };

      // Mevcut atamayı kontrol et
      const existingIndex = assignments.findIndex(
        a => a.contentId === contentId && a.contentType === contentType
      );

      let updatedAssignments;
      if (existingIndex >= 0) {
        // Mevcut atamayı güncelle
        updatedAssignments = [...assignments];
        updatedAssignments[existingIndex] = newAssignment;
      } else {
        // Yeni atama ekle
        updatedAssignments = [...assignments, newAssignment];
      }

      await storage.writeJsonFile('content_assignments.json', updatedAssignments);
      setAssignments(updatedAssignments);

      // Yeni atanan kullanıcılar için ilerleme kayıtları oluştur
      const newProgressRecords: UserProgress[] = userIds.map(userId => ({
        userId,
        contentId,
        contentType,
        status: 'assigned'
      }));

      // Mevcut ilerleme kayıtlarını filtrele ve yenilerini ekle
      const filteredProgress = userProgress.filter(
        p => !(p.contentId === contentId && p.contentType === contentType)
      );
      const updatedProgress = [...filteredProgress, ...newProgressRecords];

      await storage.writeJsonFile('user_progress.json', updatedProgress);
      setUserProgress(updatedProgress);

      return { success: true, message: 'İçerik başarıyla atandı' };
    } catch (error) {
      console.error('❌ İçerik atama hatası:', error);
      return { success: false, message: 'İçerik atanırken hata oluştu' };
    }
  }, [currentUser, assignments, userProgress, storage]);

  // Kullanıcının atanmış içeriklerini getir
  const getUserAssignedContent = useCallback((userId: string) => {
    return assignments.filter(assignment => 
      assignment.assignedUsers.includes(userId)
    );
  }, [assignments]);

  // Kullanıcının ilerleme durumunu güncelle
  const updateUserProgress = useCallback(async (
    contentId: string,
    contentType: 'training' | 'process' | 'procedure' | 'faq',
    status: 'in_progress' | 'completed',
    feedback?: string,
    rating?: number
  ): Promise<{ success: boolean; message: string }> => {
    if (!currentUser) {
      return { success: false, message: 'Giriş yapmanız gerekiyor' };
    }

    try {
      const progressIndex = userProgress.findIndex(
        p => p.userId === currentUser.id && p.contentId === contentId && p.contentType === contentType
      );

      if (progressIndex === -1) {
        return { success: false, message: 'İlerleme kaydı bulunamadı' };
      }

      const updatedProgress = [...userProgress];
      updatedProgress[progressIndex] = {
        ...updatedProgress[progressIndex],
        status,
        ...(status === 'in_progress' && !updatedProgress[progressIndex].startedAt && {
          startedAt: new Date().toISOString()
        }),
        ...(status === 'completed' && {
          completedAt: new Date().toISOString()
        }),
        ...(feedback && { feedback }),
        ...(rating && { rating })
      };

      await storage.writeJsonFile('user_progress.json', updatedProgress);
      setUserProgress(updatedProgress);

      return { success: true, message: 'İlerleme durumu güncellendi' };
    } catch (error) {
      console.error('❌ İlerleme güncelleme hatası:', error);
      return { success: false, message: 'İlerleme güncellenirken hata oluştu' };
    }
  }, [currentUser, userProgress, storage]);

  // Kullanıcının belirli içerik için ilerlemesini getir
  const getUserProgressForContent = useCallback((
    userId: string,
    contentId: string,
    contentType: 'training' | 'process' | 'procedure' | 'faq'
  ) => {
    return userProgress.find(
      p => p.userId === userId && p.contentId === contentId && p.contentType === contentType
    );
  }, [userProgress]);

  // İçeriğin hangi kullanıcılara atandığını kontrol et
  const isContentAssignedToUser = useCallback((
    contentId: string,
    contentType: 'training' | 'process' | 'procedure' | 'faq',
    userId: string
  ) => {
    const assignment = assignments.find(
      a => a.contentId === contentId && a.contentType === contentType
    );
    return assignment ? assignment.assignedUsers.includes(userId) : false;
  }, [assignments]);

  // İlk yükleme
  useEffect(() => {
    if (storage.isReady) {
      loadAssignments();
      loadUserProgress();
    }
  }, [storage.isReady, loadAssignments, loadUserProgress]);

  return {
    assignments,
    userProgress,
    assignContent,
    getUserAssignedContent,
    updateUserProgress,
    getUserProgressForContent,
    isContentAssignedToUser
  };
};