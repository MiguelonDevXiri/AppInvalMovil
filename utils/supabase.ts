import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SUPABASE_URL = 'https://ywtqtdnqcytbtckkdien.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3dHF0ZG5xY3l0YnRja2tkaWVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyNjMzMDcsImV4cCI6MjA4OTgzOTMwN30.mHOkHbqFQX88hjISrU2zGTNiTZWH1Z-6Dk0aTZTnnLk';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export default supabase;
