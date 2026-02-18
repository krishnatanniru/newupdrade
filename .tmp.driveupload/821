import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://niimekyoivuonfypigzf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5paW1la3lvaXZ1b25meXBpZ3pmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3NTU3ODYsImV4cCI6MjA4NjMzMTc4Nn0.c90K0qHlTEk4Tul8A7v6g6BGaJZjrVNc8WXAp8dqAXo'
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
