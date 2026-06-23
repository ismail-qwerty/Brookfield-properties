import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function resetPassword(username: string, newPassword: string) {
  try {
    console.log('Looking up user:', username);
    
    // Find user
    const { data: user, error: findError } = await supabase
      .from('users')
      .select('id, username, email')
      .eq('username', username)
      .single();

    if (findError || !user) {
      console.error('User not found:', findError);
      return;
    }

    console.log('Found user:', user);

    // Hash new password
    const password_hash = await bcrypt.hash(newPassword, 10);
    console.log('New password hash:', password_hash);

    // Update password
    const { error: updateError } = await supabase
      .from('users')
      .update({ password_hash })
      .eq('id', user.id);

    if (updateError) {
      console.error('Failed to update password:', updateError);
      return;
    }

    console.log('✅ Password updated successfully for user:', username);
    console.log('New password:', newPassword);
  } catch (error) {
    console.error('Error:', error);
  }
}

// Get command line arguments
const username = process.argv[2];
const password = process.argv[3];

if (!username || !password) {
  console.log('Usage: tsx reset-password.ts <username> <password>');
  console.log('Example: tsx reset-password.ts admin 12345678');
  process.exit(1);
}

resetPassword(username, password).then(() => {
  console.log('Done!');
  process.exit(0);
});
