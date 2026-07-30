const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://yheubohbighgobsulfhj.supabase.co';
const supabaseAnonKey = 'sb_publishable_jnIsUnP1fQqtRuVk6C1ImQ_ELwJc-0c';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkAntro() {
  try {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .ilike('full_name', '%çınar%');
    console.log('Profiles:', profiles);
    
    if (profiles && profiles.length > 0) {
      const { data: antro, error } = await supabase
        .from('antropometri')
        .select('*')
        .eq('player_id', profiles[0].id);
      if (error) throw error;
      console.log('Antropometri for Çınar Caner:', antro);
    }
  } catch(e) {
    console.error('Error:', e.message);
  }
}

checkAntro();
