const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://yheubohbighgobsulfhj.supabase.co';
const supabaseAnonKey = 'sb_publishable_jnIsUnP1fQqtRuVk6C1ImQ_ELwJc-0c';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkAllProfiles() {
  console.log('Fetching details of all profiles in Supabase...');
  const { data, error } = await supabase.from('profiles').select('id, full_name, email, password, role, jersey_number');
  if (error) {
    console.error(error);
  } else {
    console.log(JSON.stringify(data, null, 2));
  }
}
checkAllProfiles();
