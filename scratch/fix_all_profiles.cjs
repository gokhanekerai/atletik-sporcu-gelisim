const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://yheubohbighgobsulfhj.supabase.co';
const supabaseAnonKey = 'sb_publishable_jnIsUnP1fQqtRuVk6C1ImQ_ELwJc-0c';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

function generateEmailFromName(fullName) {
  if (!fullName) return '';
  const trMap = {
    'ç': 'c', 'Ç': 'c',
    'ğ': 'g', 'Ğ': 'g',
    'ı': 'i', 'İ': 'i',
    'ö': 'o', 'Ö': 'o',
    'ş': 's', 'Ş': 's',
    'ü': 'u', 'Ü': 'u'
  };
  let cleanName = fullName.replace(/[çÇğĞıİöÖşŞüÜ]/g, match => trMap[match]);
  cleanName = cleanName.toLowerCase().replace(/[^a-z0-9]/g, '');
  return `${cleanName}@atletik.com`;
}

async function fixAllProfiles() {
  console.log('Fetching all student profiles from Supabase...');
  try {
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'student');
      
    if (error) throw error;
    console.log(`Found ${profiles.length} student profiles.`);

    for (const profile of profiles) {
      const targetEmail = profile.email || generateEmailFromName(profile.full_name);
      const targetPassword = profile.password || (profile.jersey_number || 10).toString();

      if (profile.email !== targetEmail || profile.password !== targetPassword) {
        console.log(`Updating ${profile.full_name}: email=${targetEmail}, password=${targetPassword}`);
        const { error: updateErr } = await supabase
          .from('profiles')
          .update({
            email: targetEmail,
            password: targetPassword
          })
          .eq('id', profile.id);
        if (updateErr) {
          console.error(`Error updating ${profile.full_name}:`, updateErr.message);
        }
      }
    }
    console.log('All student profiles are now synced and updated!');
  } catch(e) {
    console.error('Error during check:', e.message);
  }
}

fixAllProfiles();
