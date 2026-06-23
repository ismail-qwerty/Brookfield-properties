import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function listUsers() {
  try {
    console.log('Fetching users from database...\n');
    
    const { data: users, error } = await supabase
      .from('users')
      .select('id, username, email, full_name, user_status, user_type, created_at')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Error fetching users:', error);
      return;
    }

    if (!users || users.length === 0) {
      console.log('No users found in database.');
      return;
    }

    console.log(`Found ${users.length} users:\n`);
    console.log('─'.repeat(100));
    console.log('ID'.padEnd(10), 'USERNAME'.padEnd(20), 'EMAIL'.padEnd(30), 'STATUS'.padEnd(10), 'TYPE');
    console.log('─'.repeat(100));

    users.forEach(user => {
      console.log(
        String(user.id).padEnd(10),
        user.username.padEnd(20),
        user.email.padEnd(30),
        user.user_status.padEnd(10),
        user.user_type
      );
    });

    console.log('─'.repeat(100));
    console.log(`\nTotal: ${users.length} users`);
  } catch (error) {
    console.error('Error:', error);
  }
}

listUsers().then(() => {
  console.log('\nDone!');
  process.exit(0);
});
