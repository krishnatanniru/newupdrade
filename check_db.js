import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://fdgsqxagqnabvuzcikob.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkZ3NxeGFncW5hYnZ1emNpa29iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzExNjc2MjgsImV4cCI6MjA4Njc0MzYyOH0.B9eDF6w8Ffm_ywJvLeceoVxFusJF_FSq8B4ji-XZR8A'
);

async function check() {
  console.log('Checking connection...');
  try {
    const { data, error } = await supabase.from('users').select('*').limit(5);
    if (error) {
      console.error('Error fetching users:', error);
    } else {
      console.log('Success! Users found:', data.length);
      console.log(data);
    }
  } catch (err) {
    console.error('Connection failed:', err);
  }
}

check();
