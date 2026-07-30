const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://yheubohbighgobsulfhj.supabase.co';
const supabaseAnonKey = 'sb_publishable_jnIsUnP1fQqtRuVk6C1ImQ_ELwJc-0c';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function findCinar() {
  try {
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('*')
      .ilike('full_name', '%çınar%');
    if (error) throw error;
    console.log('Matches for Çınar:', profiles);

    const { data: allProfiles, error: allErr } = await supabase
      .from('profiles')
      .select('*');
    if (allErr) throw allErr;
    console.log('All student names in DB:', allProfiles.map(p => ({ id: p.id, name: p.full_name, email: p.email, password: p.password, jersey: p.jersey_number, role: p.role })));
  } catch(e) {
    console.error('Error:', e.message);
  }
}

findCinar();
