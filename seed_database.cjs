/**
 * Database Seed Script
 * Run: node seed_database.cjs
 */

const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const SUPABASE_URL = 'https://fdgsqxagqnabvuzcikob.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkZ3NxeGFncW5hYnZ1emNpa29iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzExNjc2MjgsImV4cCI6MjA4Njc0MzYyOH0.B9eDF6w8Ffm_ywJvLeceoVxFusJF_FSq8B4ji-XZR8A';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

const BRANCHES = [
  { id: 'b1', name: 'Speed Fitness Mumbai Central', address: 'Plot 45, BKC, Mumbai, Maharashtra 400051', phone: '+91 98765 43210', email: 'mumbai@ironflow.in', gstin: '27AABCU1234F1Z1', gstPercentage: 18, equipment: 'Cardio: 5 Treadmills, 2 Spin Bikes. Strength: Full Smith Machine, Dumbbells up to 40kg.' },
  { id: 'b2', name: 'Speed Fitness Bangalore East', address: 'Indiranagar 100ft Rd, Bengaluru, Karnataka 560038', phone: '+91 98765 01234', email: 'bangalore@ironflow.in', gstin: '29AABCU5678F1Z2', gstPercentage: 18, equipment: 'Functional Training Zone: Kettlebells, Battle Ropes, TRX, Medicine Balls.' },
];

const MOCK_USERS = [
  { id: 'u1', name: 'Arjun Sharma',  email: 'owner@gym.in',       password: hashPassword('admin123'),   role: 'SUPER_ADMIN',  branchId: null, avatar: 'https://i.pravatar.cc/150?u=arjun'  },
  { id: 'u2', name: 'Priya Patel',   email: 'priya@gym.in',       password: hashPassword('admin123'),   role: 'BRANCH_ADMIN', branchId: 'b1', avatar: 'https://i.pravatar.cc/150?u=priya'  },
  { id: 'u3', name: 'Vikram Singh',  email: 'vikram@gym.in',      password: hashPassword('trainer123'), role: 'TRAINER',      branchId: 'b1', avatar: 'https://i.pravatar.cc/150?u=vikram', hourlyRate: 800,  commissionPercentage: 20 },
  { id: 'u4', name: 'Rahul Verma',   email: 'rahul@gmail.com',    password: hashPassword('member123'),  role: 'MEMBER',       branchId: 'b1', memberId: 'IF-IND-1001', avatar: 'https://i.pravatar.cc/150?u=rahul'  },
  { id: 'u5', name: 'Sanjay Dutt',   email: 'manager@gym.in',     password: hashPassword('manager123'), role: 'MANAGER',      branchId: 'b1', avatar: 'https://i.pravatar.cc/150?u=sanjay', hourlyRate: 1200, commissionPercentage: 5  },
  { id: 'u6', name: 'Neha Kapoor',   email: 'reception@gym.in',   password: hashPassword('staff123'),   role: 'RECEPTIONIST', branchId: 'b1', avatar: 'https://i.pravatar.cc/150?u=neha',   hourlyRate: 400  },
  { id: 'u7', name: 'Karan Mehra',   email: 'staff@gym.in',       password: hashPassword('staff123'),   role: 'STAFF',        branchId: 'b1', avatar: 'https://i.pravatar.cc/150?u=karan',  hourlyRate: 300  },
];

const MOCK_PLANS = [
  { id: 'p1', name: 'Standard Monthly Gym',              type: 'GYM',   price: 2500,  durationDays: 30,  branchId: 'b1', isActive: true, isMultiBranch: false },
  { id: 'p2', name: 'Personal Training (12 Sessions)',   type: 'PT',    price: 12000, durationDays: 30,  branchId: 'b1', isActive: true, isMultiBranch: false, maxSessions: 12, sessionDurationMinutes: 60 },
  { id: 'p3', name: 'Yoga Group Class',                  type: 'GROUP', price: 3500,  durationDays: 30,  branchId: 'b1', isActive: true, isMultiBranch: false, sessionDurationMinutes: 60, groupCapacity: 20 },
  { id: 'p4', name: 'Annual Beast Mode (All India)',     type: 'GYM',   price: 18000, durationDays: 365, branchId: 'b1', isActive: true, isMultiBranch: true  },
];

const MOCK_OFFERS = [
  { id: 'o1', title: 'SUMMER SHRED 2025', description: 'Get 20% flat discount on all PT modules this month!', imageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1200', expiryDate: '2026-06-30', branchId: 'GLOBAL', isActive: true, ctaText: 'RESERVE SPOT' },
  { id: 'o2', title: 'MUMBAI MONSOON SPECIAL', description: 'Renew Annual Membership and get 3 MONTHS free!', imageUrl: 'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?q=80&w=1200', expiryDate: '2026-08-15', branchId: 'b1', isActive: true, ctaText: 'UPGRADE NOW' },
];

async function seed() {
  console.log('\n🚀 Starting database seed...\n');

  console.log('📍 Seeding branches...');
  const { error: bErr } = await supabase.from('branches').upsert(BRANCHES, { onConflict: 'id' });
  if (bErr) {
    console.error('   ❌ Branches error:', bErr.message);
    if (bErr.message.includes('relation') || bErr.message.includes('does not exist')) {
      console.log('\n⚠️  Tables do not exist yet!');
      console.log('   Please go to your Supabase Dashboard → SQL Editor');
      console.log('   and run the SQL in: complete_supabase_setup_updated.sql');
      console.log('   Then re-run: node seed_database.cjs\n');
    }
    process.exit(1);
  }
  console.log('   ✅ Branches seeded');

  console.log('👤 Seeding users...');
  const { error: uErr } = await supabase.from('users').upsert(MOCK_USERS, { onConflict: 'id' });
  if (uErr) console.error('   ❌ Users error:', uErr.message);
  else console.log('   ✅ Users seeded');

  console.log('📋 Seeding plans...');
  const { error: pErr } = await supabase.from('plans').upsert(MOCK_PLANS, { onConflict: 'id' });
  if (pErr) console.error('   ❌ Plans error:', pErr.message);
  else console.log('   ✅ Plans seeded');

  console.log('🏷️  Seeding offers...');
  const { error: oErr } = await supabase.from('offers').upsert(MOCK_OFFERS, { onConflict: 'id' });
  if (oErr) console.error('   ❌ Offers error:', oErr.message);
  else console.log('   ✅ Offers seeded');

  console.log('\n✅ Database seed complete!\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔐 LOGIN CREDENTIALS:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Super Admin:  owner@gym.in       / admin123');
  console.log('  Branch Admin: priya@gym.in       / admin123');
  console.log('  Manager:      manager@gym.in     / manager123');
  console.log('  Trainer:      vikram@gym.in      / trainer123');
  console.log('  Receptionist: reception@gym.in   / staff123');
  console.log('  Staff:        staff@gym.in       / staff123');
  console.log('  Member:       rahul@gmail.com    / member123');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

seed().catch(console.error);
