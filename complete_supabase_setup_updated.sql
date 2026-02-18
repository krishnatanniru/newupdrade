-- Complete Database Setup for Multi-Branch Gym Software
-- This file combines all necessary SQL scripts for a complete setup

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables to ensure clean slate with new schema
DROP TABLE IF EXISTS sales CASCADE;
DROP TABLE IF EXISTS subscriptions CASCADE;
DROP TABLE IF EXISTS attendance CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS feedback CASCADE;
DROP TABLE IF EXISTS inventory CASCADE;
DROP TABLE IF EXISTS metrics CASCADE;
DROP TABLE IF EXISTS offers CASCADE;
DROP TABLE IF EXISTS communications CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS plans CASCADE;
DROP TABLE IF EXISTS branches CASCADE;
DROP TABLE IF EXISTS class_schedules CASCADE;
DROP TABLE IF EXISTS class_templates CASCADE;
DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS transaction_codes CASCADE;
DROP TABLE IF EXISTS walk_ins CASCADE;
DROP TABLE IF EXISTS holidays CASCADE;
DROP TABLE IF EXISTS class_completion_codes CASCADE;

-- BRANCHES
CREATE TABLE branches (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  gstin TEXT,
  "gstPercentage" NUMERIC DEFAULT 18,
  "gateWebhookUrl" TEXT,
  "paymentProvider" TEXT,
  "paymentApiKey" TEXT,
  "paymentMerchantId" TEXT,
  "emailProvider" TEXT,
  "emailApiKey" TEXT,
  "emailFromAddress" TEXT,
  "smsProvider" TEXT,
  "smsApiKey" TEXT,
  "smsSenderId" TEXT,
  equipment TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  "geofenceRadius" INTEGER DEFAULT 100, -- Meters
  "isVisibleForRegistration" BOOLEAN DEFAULT true
);

-- USERS
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password TEXT, 
  role TEXT NOT NULL,
  "branchId" TEXT REFERENCES branches(id),
  avatar TEXT,
  "memberId" TEXT,
  phone TEXT,
  address TEXT,
  "emergencyContact" TEXT,
  "hasAcceptedTerms" BOOLEAN DEFAULT FALSE,
  "hourlyRate" NUMERIC,
  "commissionPercentage" NUMERIC,
  shifts JSONB,
  "weekOffDay" INTEGER DEFAULT 0 
);

-- PLANS
CREATE TABLE plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  price NUMERIC NOT NULL,
  "durationDays" INTEGER NOT NULL,
  "branchId" TEXT REFERENCES branches(id),
  "isActive" BOOLEAN DEFAULT TRUE,
  "isMultiBranch" BOOLEAN DEFAULT FALSE,
  "maxSessions" INTEGER,
  "sessionDurationMinutes" INTEGER,
  "groupCapacity" INTEGER
);

-- SUBSCRIPTIONS
CREATE TABLE subscriptions (
  id TEXT PRIMARY KEY,
  "memberId" TEXT REFERENCES users(id),
  "planId" TEXT REFERENCES plans(id),
  "startDate" DATE NOT NULL,
  "endDate" DATE NOT NULL,
  status TEXT NOT NULL,
  "branchId" TEXT REFERENCES branches(id),
  "trainerId" TEXT REFERENCES users(id)
);

-- SALES
CREATE TABLE sales (
  id TEXT PRIMARY KEY,
  "invoiceNo" TEXT NOT NULL,
  date DATE NOT NULL,
  amount NUMERIC NOT NULL,
  discount NUMERIC DEFAULT 0, -- Added discount column
  "memberId" TEXT REFERENCES users(id),
  "planId" TEXT REFERENCES plans(id),
  "itemId" TEXT, 
  "staffId" TEXT REFERENCES users(id),
  "branchId" TEXT REFERENCES branches(id),
  "paymentMethod" TEXT NOT NULL,
  "trainerId" TEXT REFERENCES users(id)
);

-- ATTENDANCE
CREATE TABLE attendance (
  id TEXT PRIMARY KEY,
  "userId" TEXT REFERENCES users(id),
  date DATE NOT NULL,
  "timeIn" TIME NOT NULL,
  "timeOut" TIME,
  "branchId" TEXT REFERENCES branches(id),
  type TEXT NOT NULL
);

-- BOOKINGS
CREATE TABLE bookings (
  id TEXT PRIMARY KEY,
  "memberId" TEXT REFERENCES users(id),
  "trainerId" TEXT REFERENCES users(id),
  type TEXT NOT NULL,
  date DATE NOT NULL,
  "timeSlot" TEXT NOT NULL,
  "branchId" TEXT REFERENCES branches(id),
  status TEXT NOT NULL
);

-- FEEDBACK
CREATE TABLE feedback (
  id TEXT PRIMARY KEY,
  "memberId" TEXT REFERENCES users(id),
  "branchId" TEXT REFERENCES branches(id),
  type TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT NOT NULL,
  date DATE NOT NULL
);

-- INVENTORY
CREATE TABLE inventory (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price NUMERIC NOT NULL,
  stock INTEGER NOT NULL,
  "branchId" TEXT REFERENCES branches(id)
);

-- METRICS
CREATE TABLE metrics (
  id TEXT PRIMARY KEY,
  "memberId" TEXT REFERENCES users(id),
  date DATE NOT NULL,
  weight NUMERIC,
  bmi NUMERIC
);

-- OFFERS
CREATE TABLE offers (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  "imageUrl" TEXT,
  "expiryDate" DATE,
  "branchId" TEXT, 
  "isActive" BOOLEAN DEFAULT TRUE,
  "ctaText" TEXT
);

-- COMMUNICATIONS
CREATE TABLE communications (
  id TEXT PRIMARY KEY,
  "userId" TEXT REFERENCES users(id),
  type TEXT NOT NULL,
  recipient TEXT NOT NULL,
  subject TEXT,
  body TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  status TEXT NOT NULL,
  category TEXT NOT NULL,
  "branchId" TEXT REFERENCES branches(id)
);

-- CLASS TEMPLATES
CREATE TABLE class_templates (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  "trainerId" TEXT REFERENCES users(id),
  "dayOfWeek" TEXT NOT NULL, -- MONDAY, TUESDAY, etc.
  "timeSlot" TEXT NOT NULL,
  capacity INTEGER DEFAULT 20,
  "branchId" TEXT REFERENCES branches(id)
);

-- CLASS SCHEDULES
CREATE TABLE class_schedules (
  id TEXT PRIMARY KEY,
  "templateId" TEXT REFERENCES class_templates(id),
  "trainerId" TEXT REFERENCES users(id),
  date DATE NOT NULL,
  "timeSlot" TEXT NOT NULL,
  title TEXT NOT NULL,
  capacity INTEGER DEFAULT 20,
  "branchId" TEXT REFERENCES branches(id)
);

-- EXPENSES
CREATE TABLE expenses (
  id TEXT PRIMARY KEY,
  "branchId" TEXT REFERENCES branches(id),
  category TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  date DATE NOT NULL,
  description TEXT,
  "recordedBy" TEXT REFERENCES users(id)
);

-- TRANSACTION CODES
CREATE TABLE transaction_codes (
  code TEXT PRIMARY KEY,
  "branchId" TEXT REFERENCES branches(id),
  status TEXT NOT NULL, -- VALID or USED
  "generatedBy" TEXT REFERENCES users(id),
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- WALK_INS
CREATE TABLE walk_ins (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  purpose TEXT NOT NULL,
  source TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'NEW',
  notes TEXT,
  "assignedTo" TEXT REFERENCES users(id),
  "followUpDate" DATE,
  "convertedToMemberId" TEXT REFERENCES users(id),
  "branchId" TEXT REFERENCES branches(id),
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- CLASS_COMPLETION_CODES (For QR-based class completion)
CREATE TABLE class_completion_codes (
  id TEXT PRIMARY KEY,
  "bookingId" TEXT REFERENCES bookings(id),
  "trainerId" TEXT REFERENCES users(id),
  "memberId" TEXT REFERENCES users(id),
  code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'VALID',
  "classDate" DATE NOT NULL,
  "classType" TEXT NOT NULL,
  "branchId" TEXT REFERENCES branches(id),
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "usedAt" TIMESTAMPTZ
);

-- Holidays Table (supabase_holidays.sql)
-- Create holidays table for branch holiday management
CREATE TABLE IF NOT EXISTS holidays (
  id TEXT PRIMARY KEY,
  date DATE NOT NULL,
  name TEXT NOT NULL,
  branch_id TEXT NOT NULL DEFAULT 'ALL',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notifications Enhancement (supabase_notifications.sql)
-- Migration: Add notification support to communications table
-- Add isRead column to communications table for tracking read status
ALTER TABLE communications 
ADD COLUMN IF NOT EXISTS "isRead" BOOLEAN DEFAULT FALSE;

-- Create index for faster notification queries
CREATE INDEX IF NOT EXISTS idx_communications_userId ON communications("userId");
CREATE INDEX IF NOT EXISTS idx_communications_branchId ON communications("branchId");
CREATE INDEX IF NOT EXISTS idx_communications_category ON communications(category);
CREATE INDEX IF NOT EXISTS idx_communications_isRead ON communications("isRead");

-- Update existing communications to have isRead = true (mark all existing as read)
UPDATE communications SET "isRead" = TRUE WHERE "isRead" IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN communications."isRead" IS 'Tracks if the user has read this notification';

-- Terms and Conditions Migration (supabase_terms_migration.sql)
-- Add termsAndConditions column to branches table
ALTER TABLE branches 
ADD COLUMN IF NOT EXISTS terms_and_conditions TEXT;

-- Add a default terms and conditions for existing branches
UPDATE branches 
SET terms_and_conditions = '# Speed Fitness Gym Terms and Conditions

## 1. Health and Safety Disclaimer
By using Speed Fitness facilities, you acknowledge that physical exercise carries inherent risks. You represent that you are in good physical condition and have no medical reason that would prevent you from using the equipment. Always consult a physician before starting a new program.

## 2. AI Coaching and Personal Data
The "Smart AI Coach" utilizes Google Gemini. AI-generated workouts are for informational purposes only. You are responsible for executing exercises with proper form. Speed Fitness logs metrics (weight, goals) to provide a personalized experience.

## 3. Membership Rules
Your unique QR Gate Key (IF-ID) is non-transferable. Sharing credentials results in immediate suspension. Members must follow gym etiquette and re-rack weights after use.

## 4. Liability Waiver
Speed Fitness Gym shall not be liable for any injury, loss, or damage to person or property arising out of the use of gym facilities or participation in training sessions.

## 5. Branch-Specific Terms
Additional terms may apply based on your specific branch location and local regulations.'
WHERE terms_and_conditions IS NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_branches_terms ON branches(terms_and_conditions);

-- RLS (Row Level Security)
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE walk_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_completion_codes ENABLE ROW LEVEL SECURITY;

-- Policies for development (more restrictive policies for production)
CREATE POLICY "Public All Branches" ON branches FOR ALL USING (true);
CREATE POLICY "Public All Users" ON users FOR ALL USING (true);
CREATE POLICY "Public All Plans" ON plans FOR ALL USING (true);
CREATE POLICY "Public All Subscriptions" ON subscriptions FOR ALL USING (true);
CREATE POLICY "Public All Sales" ON sales FOR ALL USING (true);
CREATE POLICY "Public All Attendance" ON attendance FOR ALL USING (true);
CREATE POLICY "Public All Bookings" ON bookings FOR ALL USING (true);
CREATE POLICY "Public All Feedback" ON feedback FOR ALL USING (true);
CREATE POLICY "Public All Inventory" ON inventory FOR ALL USING (true);
CREATE POLICY "Public All Metrics" ON metrics FOR ALL USING (true);
CREATE POLICY "Public All Offers" ON offers FOR ALL USING (true);
CREATE POLICY "Public All Communications" ON communications FOR ALL USING (true);
CREATE POLICY "Public All Class Templates" ON class_templates FOR ALL USING (true);
CREATE POLICY "Public All Class Schedules" ON class_schedules FOR ALL USING (true);
CREATE POLICY "Public All Expenses" ON expenses FOR ALL USING (true);
CREATE POLICY "Public All Transaction Codes" ON transaction_codes FOR ALL USING (true);
CREATE POLICY "Public All Walk Ins" ON walk_ins FOR ALL USING (true);
CREATE POLICY "Public All Holidays" ON holidays FOR ALL USING (true);
CREATE POLICY "Public All Class Completion Codes" ON class_completion_codes FOR ALL USING (true);

-- Enable real-time for all tables
ALTER TABLE branches REPLICA IDENTITY FULL;
ALTER TABLE users REPLICA IDENTITY FULL;
ALTER TABLE plans REPLICA IDENTITY FULL;
ALTER TABLE subscriptions REPLICA IDENTITY FULL;
ALTER TABLE sales REPLICA IDENTITY FULL;
ALTER TABLE attendance REPLICA IDENTITY FULL;
ALTER TABLE bookings REPLICA IDENTITY FULL;
ALTER TABLE feedback REPLICA IDENTITY FULL;
ALTER TABLE inventory REPLICA IDENTITY FULL;
ALTER TABLE metrics REPLICA IDENTITY FULL;
ALTER TABLE offers REPLICA IDENTITY FULL;
ALTER TABLE communications REPLICA IDENTITY FULL;
ALTER TABLE class_templates REPLICA IDENTITY FULL;
ALTER TABLE class_schedules REPLICA IDENTITY FULL;
ALTER TABLE expenses REPLICA IDENTITY FULL;
ALTER TABLE transaction_codes REPLICA IDENTITY FULL;
ALTER TABLE walk_ins REPLICA IDENTITY FULL;
ALTER TABLE holidays REPLICA IDENTITY FULL;
ALTER TABLE class_completion_codes REPLICA IDENTITY FULL;

-- INDEXES FOR BETTER PERFORMANCE
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_branch ON users("branchId");
CREATE INDEX idx_sales_member ON sales("memberId");
CREATE INDEX idx_sales_date ON sales(date);
CREATE INDEX idx_subscriptions_member ON subscriptions("memberId");
CREATE INDEX idx_attendance_user_date ON attendance("userId", date);
CREATE INDEX idx_bookings_member ON bookings("memberId");

-- Insert default data for initial setup
-- Default branches
INSERT INTO branches (id, name, address, phone, email) VALUES
('br-1', 'Main Branch', '123 Main St, City Center', '+1-234-567-8900', 'main@gym.in'),
('br-2', 'Downtown Branch', '456 Downtown Ave, Business District', '+1-234-567-8901', 'downtown@gym.in'),
('br-3', 'Northside Branch', '789 North Blvd, Residential Area', '+1-234-567-8902', 'northside@gym.in');

-- Default plans
INSERT INTO plans (id, name, type, price, "durationDays", "branchId") VALUES
('p-1', 'Basic Monthly', 'MEMBERSHIP', 5000, 30, 'br-1'),
('p-2', 'Premium Monthly', 'MEMBERSHIP', 8000, 30, 'br-1'),
('p-3', 'VIP Monthly', 'MEMBERSHIP', 12000, 30, 'br-1'),
('p-4', 'Basic Annual', 'MEMBERSHIP', 50000, 365, 'br-1'),
('p-5', 'Premium Annual', 'MEMBERSHIP', 80000, 365, 'br-1'),
('p-6', 'VIP Annual', 'MEMBERSHIP', 120000, 365, 'br-1');

-- Default super admin user
INSERT INTO users (id, name, email, role, "branchId", "hasAcceptedTerms") VALUES
('u-owner', 'Gym Owner', 'owner@gym.in', 'OWNER', 'br-1', true);

-- Insert default class templates
INSERT INTO class_templates (id, title, "trainerId", "dayOfWeek", "timeSlot", "branchId") VALUES
('ct-1', 'Morning Yoga', 'u-owner', 'MONDAY', '07:00-08:00', 'br-1'),
('ct-2', 'Evening HIIT', 'u-owner', 'TUESDAY', '18:00-19:00', 'br-1'),
('ct-3', 'Cardio Blast', 'u-owner', 'WEDNESDAY', '07:30-08:30', 'br-1'),
('ct-4', 'Strength Training', 'u-owner', 'FRIDAY', '18:30-19:30', 'br-1');

COMMIT;