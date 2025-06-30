import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Supabase credentials - updated with current values
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://lhncpcsniuxnrmabbkmr.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxobmNwY3NuaXV4bnJtYWJia21yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDEwMDY5MTUsImV4cCI6MjA1NjU4MjkxNX0.zWr2gDn3bxVzGeCOFzXxgGYtusw6aoboyWBtB1cDo0U';

// Validate configuration
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Supabase configuration error!');
  console.error('Please ensure Supabase credentials are properly configured');
  throw new Error('Invalid Supabase configuration. Please check your credentials.');
}

console.log('🔧 Supabase URL:', supabaseUrl);
console.log('🔧 API Key configured:', supabaseAnonKey.substring(0, 20) + '...');

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Test connection on initialization with better error handling
supabase.auth.getSession()
  .then(() => {
    console.log('✅ Supabase client initialized successfully');
  })
  .catch((error) => {
    console.error('❌ Supabase connection failed:', error.message);
    
    if (error.message.includes('Invalid API key')) {
      console.error('🔑 API Key Issue:');
      console.error('1. Go to https://app.supabase.com/project/lhncpcsniuxnrmabbkmr/settings/api');
      console.error('2. Copy the "anon public" key');
      console.error('3. Update the key in lib/supabase/client.ts');
      console.error('4. Or set EXPO_PUBLIC_SUPABASE_ANON_KEY environment variable');
    }
    
    if (error.message.includes('project not found')) {
      console.error('🏗️ Project Issue:');
      console.error('1. Check if project is paused or deleted');
      console.error('2. Verify project URL is correct');
      console.error('3. Check https://app.supabase.com for project status');
    }
  });

export default supabase; 