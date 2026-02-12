// Script to update super admin password in Supabase
// Run this with: node update_admin_password.js

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseKey = 'YOUR_SUPABASE_SERVICE_ROLE_KEY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateAdminPassword() {
  // SHA-256 hash of "admin123"
  const hashedPassword = '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9';
  
  const { data, error } = await supabase
    .from('users')
    .update({ password: hashedPassword })
    .eq('email', 'owner@gym.in');
  
  if (error) {
    console.error('Error updating password:', error);
  } else {
    console.log('Super admin password updated successfully!');
    console.log('Email: owner@gym.in');
    console.log('Password: admin123');
  }
}

updateAdminPassword();
