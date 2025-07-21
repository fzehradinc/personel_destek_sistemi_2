import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if we have real Supabase credentials (not placeholders)
const hasValidSupabaseConfig = supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl !== 'your-project-url.supabase.co' &&
  supabaseAnonKey !== 'your-anon-key';

export const supabase = hasValidSupabaseConfig 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export const isSupabaseAvailable = !!supabase;

// Database types
export interface DatabaseUser {
  id: string;
  username: string;
  password: string;
  name: string;
  email?: string;
  department?: string;
  role: 'admin' | 'personel';
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_login?: string;
  import_source: 'manuel' | 'excel' | 'system';
  import_batch_id?: string;
}

// User service functions
export const userService = {
  // Tüm kullanıcıları getir (sadece admin)
  async getAllUsers(): Promise<DatabaseUser[]> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Kullanıcılar getirilemedi:', error);
      throw error;
    }

    return data || [];
  },

  // Kullanıcı ekle
  async addUser(userData: Omit<DatabaseUser, 'id' | 'created_at' | 'updated_at'>): Promise<DatabaseUser> {
    const { data, error } = await supabase
      .from('users')
      .insert([userData])
      .select()
      .single();

    if (error) {
      console.error('❌ Kullanıcı eklenemedi:', error);
      throw error;
    }

    return data;
  },

  // Toplu kullanıcı ekleme (Excel import için)
  async addMultipleUsers(users: Omit<DatabaseUser, 'id' | 'created_at' | 'updated_at'>[]): Promise<DatabaseUser[]> {
    const { data, error } = await supabase
      .from('users')
      .insert(users)
      .select();

    if (error) {
      console.error('❌ Toplu kullanıcı eklenemedi:', error);
      throw error;
    }

    return data || [];
  },

  // Kullanıcı güncelle
  async updateUser(id: string, updates: Partial<DatabaseUser>): Promise<DatabaseUser> {
    const { data, error } = await supabase
      .from('users')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('❌ Kullanıcı güncellenemedi:', error);
      throw error;
    }

    return data;
  },

  // Kullanıcı sil
  async deleteUser(id: string): Promise<void> {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('❌ Kullanıcı silinemedi:', error);
      throw error;
    }
  },

  // Username ile kullanıcı ara (login için)
  async getUserByUsername(username: string): Promise<DatabaseUser | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .eq('is_active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        return null;
      }
      console.error('❌ Kullanıcı bulunamadı:', error);
      throw error;
    }

    return data;
  },

  // Son giriş tarihini güncelle
  async updateLastLogin(id: string): Promise<void> {
    const { error } = await supabase
      .from('users')
      .update({ 
        last_login: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) {
      console.error('❌ Son giriş tarihi güncellenemedi:', error);
      throw error;
    }
  },

  // Import batch ile kullanıcıları getir
  async getUsersByImportBatch(batchId: string): Promise<DatabaseUser[]> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('import_batch_id', batchId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Import batch kullanıcıları getirilemedi:', error);
      throw error;
    }

    return data || [];
  },

  // Departman bazlı istatistikler
  async getDepartmentStats(): Promise<{ department: string; count: number; active_count: number }[]> {
    const { data, error } = await supabase
      .from('users')
      .select('department, is_active')
      .not('department', 'is', null);

    if (error) {
      console.error('❌ Departman istatistikleri getirilemedi:', error);
      throw error;
    }

    // Group by department
    const stats = data.reduce((acc: any, user) => {
      const dept = user.department || 'Belirtilmemiş';
      if (!acc[dept]) {
        acc[dept] = { department: dept, count: 0, active_count: 0 };
      }
      acc[dept].count++;
      if (user.is_active) {
        acc[dept].active_count++;
      }
      return acc;
    }, {});

    return Object.values(stats);
  }
};