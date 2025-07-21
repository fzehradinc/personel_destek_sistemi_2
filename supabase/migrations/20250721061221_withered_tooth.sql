/*
  # Kullanıcı Yönetimi Tablosu

  1. Yeni Tablolar
    - `users`
      - `id` (uuid, primary key)
      - `username` (text, unique)
      - `password` (text, hashed)
      - `name` (text)
      - `email` (text)
      - `department` (text)
      - `role` (enum: admin, personel)
      - `is_active` (boolean)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
      - `last_login` (timestamp)
      - `import_source` (text) - Excel veya Manuel
      - `import_batch_id` (text) - Toplu import takibi

  2. Güvenlik
    - Enable RLS on `users` table
    - Add policies for admin access
    - Add policies for user self-access

  3. İndeksler
    - Username için unique index
    - Email için index
    - Department ve role için composite index
*/

-- Rol enum'u oluştur
CREATE TYPE user_role AS ENUM ('admin', 'personel');

-- Import source enum'u oluştur  
CREATE TYPE import_source AS ENUM ('manuel', 'excel', 'system');

-- Users tablosunu oluştur
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  password text NOT NULL,
  name text NOT NULL,
  email text,
  department text,
  role user_role NOT NULL DEFAULT 'personel',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_login timestamptz,
  import_source import_source DEFAULT 'manuel',
  import_batch_id text,
  
  -- Constraints
  CONSTRAINT username_length CHECK (char_length(username) >= 3),
  CONSTRAINT name_length CHECK (char_length(name) >= 2),
  CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' OR email IS NULL)
);

-- RLS'i etkinleştir
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Admin kullanıcıları tüm kullanıcıları görebilir
CREATE POLICY "Admins can view all users"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users admin_user 
      WHERE admin_user.id = auth.uid() 
      AND admin_user.role = 'admin'
    )
  );

-- Admin kullanıcıları yeni kullanıcı ekleyebilir
CREATE POLICY "Admins can insert users"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users admin_user 
      WHERE admin_user.id = auth.uid() 
      AND admin_user.role = 'admin'
    )
  );

-- Admin kullanıcıları kullanıcı bilgilerini güncelleyebilir
CREATE POLICY "Admins can update users"
  ON users
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users admin_user 
      WHERE admin_user.id = auth.uid() 
      AND admin_user.role = 'admin'
    )
  );

-- Kullanıcılar kendi bilgilerini görebilir
CREATE POLICY "Users can view own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Kullanıcılar kendi bilgilerini güncelleyebilir (sınırlı)
CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id AND
    -- Sadece belirli alanları güncelleyebilir
    (OLD.username = NEW.username) AND
    (OLD.role = NEW.role) AND
    (OLD.is_active = NEW.is_active)
  );

-- İndeksler
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_department_role ON users(department, role);
CREATE INDEX IF NOT EXISTS idx_users_import_batch ON users(import_batch_id);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at 
  BEFORE UPDATE ON users 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Varsayılan admin kullanıcısı ekle
INSERT INTO users (
  username, 
  password, 
  name, 
  email, 
  department, 
  role, 
  import_source
) VALUES (
  'admin',
  '$2b$10$rQZ9QmjqjKjIXBVJ8yOWLOuK5H5H5H5H5H5H5H5H5H5H5H5H5H5H5', -- admin123 hashed
  'Sistem Yöneticisi',
  'admin@company.com',
  'IT',
  'admin',
  'system'
) ON CONFLICT (username) DO NOTHING;