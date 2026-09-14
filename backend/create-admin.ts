import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function createAdmin() {
  const password_hash = await bcrypt.hash('admin123', 10);
  const wallet_password_hash = await bcrypt.hash('admin123', 10);

  // Check if admin already exists
  const { data: existing } = await supabase
    .from('users')
    .select('id, username')
    .eq('username', 'admin')
    .maybeSingle();

  if (existing) {
    console.log('Admin already exists:', existing);
    console.log('Resetting password to admin123...');
    await supabase.from('users').update({ password_hash }).eq('id', existing.id);
    console.log('✅ Password reset to: admin123');
    process.exit(0);
  }

  // Check membership level exists
  const { data: tier } = await supabase
    .from('membership_levels')
    .select('id')
    .eq('id', 1)
    .maybeSingle();

  if (!tier) {
    console.log('Creating default membership tier...');
    await supabase.from('membership_levels').insert({
      id: 1,
      name: 'Silver',
      order_limit: 27,
      commission_rate: 0.9,
    });
  }

  const { data: user, error } = await supabase
    .from('users')
    .insert({
      username: 'admin',
      full_name: 'Administrator',
      email: 'admin@brookfield.com',
      phone: '0000000000',
      password_hash,
      wallet_password_hash,
      reference_code: 'REFADMIN01',
      referrer_id: null,
      tier_id: 1,
      user_status: 'Active',
      wallet_status: 'Active',
      user_type: 'Admin',
    })
    .select()
    .single();

  if (error) {
    console.error('❌ Error creating admin:', error.message);
    process.exit(1);
  }

  // Create wallet
  await supabase.from('wallets').insert({
    user_id: user.id,
    balance: 0,
    total_recharged: 0,
    total_earned: 0,
    total_withdrawn: 0,
  });

  console.log('✅ Admin user created successfully!');
  console.log('   Username: admin');
  console.log('   Password: admin123');
  console.log('   Reference Code: REFADMIN01');
  process.exit(0);
}

createAdmin();
