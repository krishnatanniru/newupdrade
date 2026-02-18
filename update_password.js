import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://fdgsqxagqnabvuzcikob.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkZ3NxeGFncW5hYnZ1emNpa29iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzExNjc2MjgsImV4cCI6MjA4Njc0MzYyOH0.B9eDF6w8Ffm_ywJvLeceoVxFusJF_FSq8B4ji-XZR8A'
);

async function updateAdminPassword() {
  // SHA-256 hash of "admin123"
  const hashedPassword = '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9';
  
  console.log('Updating super admin password...');
  try {
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
  } catch (err) {
    console.error('Update failed:', err);
  }
}

updateAdminPassword();