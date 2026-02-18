import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://fdgsqxagqnabvuzcikob.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkZ3NxeGFncW5hYnZ1emNpa29iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzExNjc2MjgsImV4cCI6MjA4Njc0MzYyOH0.B9eDF6w8Ffm_ywJvLeceoVxFusJF_FSq8B4ji-XZR8A'
);

async function checkUser() {
  console.log('Checking for users in database...');
  try {
    // Check all users
    const { data: allUsers, error: allUsersError } = await supabase.from('users').select('*');
    if (allUsersError) {
      console.error('Error fetching users:', allUsersError);
    } else {
      console.log('Total users found:', allUsers.length);
      if (allUsers.length > 0) {
        console.log('Users:');
        allUsers.forEach(user => {
          console.log(`- ID: ${user.id}, Name: ${user.name}, Email: ${user.email}, Role: ${user.role}`);
        });
      } else {
        console.log('No users found in database.');
      }
    }

    // Specifically check for the owner user
    console.log('\nChecking for owner@gym.in user...');
    const { data: ownerUser, error: ownerError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'owner@gym.in')
      .single();

    if (ownerError) {
      console.log('Owner user not found:', ownerError.message);
    } else {
      console.log('Owner user found:', ownerUser);
    }

    // Check if branches exist
    console.log('\nChecking for branches...');
    const { data: branches, error: branchesError } = await supabase.from('branches').select('*');
    if (branchesError) {
      console.error('Error fetching branches:', branchesError);
    } else {
      console.log('Branches found:', branches.length);
    }
  } catch (err) {
    console.error('Connection failed:', err);
  }
}

checkUser();