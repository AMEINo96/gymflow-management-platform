-- GymFlow Supabase Schema

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- Table: users (Staff & Admin mappings)
-- Note: Assuming auth is managed by Supabase GoTrue (auth.users)
-- This table stores additional profile info and their role.
-- ==========================================
CREATE TABLE users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('admin', 'staff')),
  name TEXT NOT NULL,
  passcode TEXT, -- Optional: if you still want a passcode for quick hardware login, otherwise use auth
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- Table: plans
-- ==========================================
CREATE TABLE plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  duration_days INTEGER NOT NULL,
  price NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pre-populate plans
INSERT INTO plans (name, duration_days, price) VALUES
('Monthly', 30, 50.00),
('3-Month', 90, 135.00),
('Annual', 365, 500.00);

-- ==========================================
-- Table: members
-- ==========================================
CREATE TABLE members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  phone TEXT,
  join_date DATE NOT NULL DEFAULT CURRENT_DATE,
  next_due_date DATE NOT NULL,
  fingerprint_id INTEGER,
  plan_id UUID REFERENCES plans(id),
  is_enrolling BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- Table: attendance
-- ==========================================
CREATE TABLE attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- Table: payments
-- ==========================================
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- Security: Row Level Security (RLS)
-- For this setup, we can enable RLS and add basic policies.
-- If you want it completely open for internal use initially, you can skip enabling RLS,
-- but it's best practice to secure it.
-- ==========================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users (Admin & Staff) to view and modify everything for now
CREATE POLICY "Allow authenticated full access to users" ON users FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated full access to plans" ON plans FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated full access to members" ON members FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated full access to attendance" ON attendance FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated full access to payments" ON payments FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Allow anon (hardware ESP32 API) to read members and create attendance (ESP32 might not be authenticated with a JWT easily, so we might need service_role key or anon access for specific tables/actions)
-- Actually, the Next.js API route will use the service_role key or user auth, so ESP32 will talk to Next.js API, and Next.js will talk to Supabase.
-- Thus, we just need Next.js to have the right permissions.
