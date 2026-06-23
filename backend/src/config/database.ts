import { createClient } from '@supabase/supabase-js';
import WebSocket from 'ws';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// 1. Admin client setup with object type casting
export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
    db: {
        schema: 'public',
    },
    realtime: {
        globalRESTWS: true,
        transport: WebSocket
    }
} as any);

// 2. Public client setup with object type casting
export const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        persistSession: false
    },
    realtime: {
        globalRESTWS: true,
        transport: WebSocket
    }
} as any);

export default supabaseAdmin;