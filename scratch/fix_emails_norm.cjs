const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://yheubohbighgobsulfhj.supabase.co';
const supabaseAnonKey = 'sb_publishable_jnIsUnP1fQqtRuVk6C1ImQ_ELwJc-0c';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

function cleanEmail(email) {
  if (!email) return '';
  return email
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/ı/g, 'i')
    .replace(/ş/g, 's')
    .replace(/ğ/g, 'g')
    .replace(/ç/g, 'c')
    .replace(/ö/g, 'o')
    .replace(/ü/g, 'u')
    .replace(/\s+/g, '')
    .trim();
}

async function fixAllEmails() {
  console.log('Fetching all student profiles from Supabase to normalize emails...');
  try {
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'student');
      
    if (error) throw error;

    for (const profile of profiles) {
      const clean = cleanEmail(profile.full_name) + '@atletik.com';
      console.log(`Profile: ${profile.full_name} | Old Email: ${profile.email} | New Email: ${clean}`);

      if (profile.email !== clean) {
        const { error: updateErr } = await supabase
          .from('profiles')
          .update({ email: clean })
          .eq('id', profile.id);
        if (updateErr) {
          console.error(`Error updating ${profile.full_name}:`, updateErr.message);
        } else {
          console.log(`Successfully normalized email for ${profile.full_name}`);
        }
      }
    }
  } catch(e) {
    console.error('Error during cleanup:', e.message);
  }
}

fixAllEmails();
