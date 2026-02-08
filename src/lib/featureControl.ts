import { supabase } from './supabase';

// Daftar ID User atau Email yang boleh bypass maintenance
const DEVELOPER_EMAILS = ['khorihryd@gmail.com', 'dev@perusahaan.com'];

export const checkIsDeveloper = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  
  // Bisa cek berdasarkan email atau ID unik user di Supabase
  return DEVELOPER_EMAILS.includes(user.email || '');
};

export const fetchFeatureFlags = async () => {
  const { data, error } = await supabase
    .from('feature_flags')
    .select('*');
  
  if (error) throw error;
  return data;
};