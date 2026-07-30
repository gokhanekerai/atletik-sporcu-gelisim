const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://yheubohbighgobsulfhj.supabase.co';
const supabaseAnonKey = 'sb_publishable_jnIsUnP1fQqtRuVk6C1ImQ_ELwJc-0c';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function fixDb() {
  console.log('Fixing active student profiles in Supabase...');
  try {
    // Update Cinar Caner (ID: 178474965256487zp)
    const { error: err1 } = await supabase
      .from('profiles')
      .update({ 
        email: 'cinarcaner@atletik.com', 
        password: '1234',
        jersey_number: 13
      })
      .eq('id', '178474965256487zp');
    console.log('Updated Çınar Caner:', err1 ? err1.message : 'OK');

    // Update Mert Emir Keskin (ID: 1784750822800cygt)
    const { error: err2 } = await supabase
      .from('profiles')
      .update({ 
        email: 'mertemirkeskin@atletik.com', 
        password: '10',
        jersey_number: 10
      })
      .eq('id', '1784750822800cygt');
    console.log('Updated Mert Emir Keskin:', err2 ? err2.message : 'OK');

    // Fetch them back to confirm
    const { data } = await supabase.from('profiles').select('id, full_name, email, password');
    console.log('Confirmed profiles list:', data);
  } catch(e) {
    console.error('Exception:', e.message);
  }
}

fixDb();
