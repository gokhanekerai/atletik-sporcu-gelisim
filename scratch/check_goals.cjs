const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://yheubohbighgobsulfhj.supabase.co';
const supabaseAnonKey = 'sb_publishable_jnIsUnP1fQqtRuVk6C1ImQ_ELwJc-0c';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkGoals() {
  try {
    const { data: goals, error } = await supabase.from('goals').select('*');
    if (error) throw error;
    console.log('All goals in database:', goals);
  } catch(e) {
    console.error('Error checking goals:', e.message);
  }
}

checkGoals();
