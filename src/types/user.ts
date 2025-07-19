export interface User {
  id: string;
  username: string;
  password: string;
  role: 'admin' | 'personel';
  name: string;
  email?: string;
  department?: string;
  createdAt: string;
  lastLogin?: string;
  isActive: boolean;
}

export interface UserSession {
  user: User;
  loginTime: string;
  expiresAt: string;
}

export interface ContentAssignment {
  contentId: string;
  contentType: 'training' | 'process' | 'procedure' | 'faq';
  assignedUsers: string[]; // user IDs
  assignedAt: string;
  assignedBy: string; // admin user ID
}

export interface UserProgress {
  userId: string;
  contentId: string;
  contentType: 'training' | 'process' | 'procedure' | 'faq';
  status: 'assigned' | 'in_progress' | 'completed';
  startedAt?: string;
  completedAt?: string;
  feedback?: string;
  rating?: number; // 1-5
}