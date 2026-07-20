import { createClient } from '@supabase/supabase-js';

import { 
  teams as mockTeams, 
  players as mockPlayers, 
  matches as mockMatches, 
  matchStats as mockMatchStats, 
  physicalMeasurements as mockPhysicalMeasurements, 
  goals as mockGoals, 
  trainingSessions as mockTrainingSessions, 
  attendance as mockAttendance 
} from '../data/mockData';
import seedData from '../data/seed_cinar_caner.json';

// Retrieve keys from LocalStorage (configurable in Settings page) or env
const supabaseUrl = localStorage.getItem('supabase_url') || import.meta.env.VITE_SUPABASE_URL || 'https://yheubohbighgobsulfhj.supabase.co';
const supabaseAnonKey = localStorage.getItem('supabase_anon_key') || import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_jnIsUnP1fQqtRuVk6C1ImQ_ELwJc-0c';

// Use Supabase by default if keys exist, unless explicitly turned off in settings
export const isSupabaseConfigured = (localStorage.getItem('use_supabase') !== 'false') && !!(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Local DB simulation if Supabase is not configured
const LOCAL_STORAGE_KEY = 'baskettrack_local_db_v4';

const defaultDb = {
  profiles: [...(seedData.profiles || [])],
  teams: [
    { id: 1, name: 'Kocaeli Atletik U9/U10', category: 'U9/U10', season: '2025-26', color: '#FF6B35' },
    { id: 2, name: 'Kocaeli Atletik U12', category: 'U12', season: '2025-26', color: '#4ECDC4' },
    { id: 3, name: 'Kocaeli Atletik U14', category: 'U14', season: '2025-26', color: '#A78BFA' }
  ],
  genetics: [...(seedData.genetics || [])],
  antropometri: [...(seedData.antropometri || [])],
  skills: [...(seedData.skills || [])],
  coach_reports: [...(seedData.coach_reports || [])],
  goals: [...(seedData.goals || [])],
  physicalMeasurements: [...(seedData.physicalMeasurements || [])],
  matches: [],
  matchStats: [],
  trainingSessions: [],
  attendance: []
};

// Initialize local DB if empty
if (!localStorage.getItem(LOCAL_STORAGE_KEY)) {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(defaultDb));
}

// Merge seed players into existing DB (add if not already present)
try {
  const existing = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '{}');
  let changed = false;
  const tables = ['profiles','genetics','antropometri','skills','coach_reports','goals','physicalMeasurements'];
  tables.forEach(table => {
    if (!existing[table]) { existing[table] = []; }
    (seedData[table] || []).forEach(seedItem => {
      const idField = table === 'profiles' ? 'id' : 'playerId';
      const alreadyExists = existing[table].some(r => r[idField] === seedItem[idField] && (table === 'profiles' || r.metric === seedItem.metric || r.name === seedItem.name || table === 'genetics' || table === 'coach_reports' || table === 'goals' || table === 'physicalMeasurements'));
      if (table === 'profiles') {
        if (!existing[table].some(r => r.id === seedItem.id)) { existing[table].push(seedItem); changed = true; }
      } else if (!alreadyExists) {
        existing[table].push(seedItem); changed = true;
      }
    });
  });
  if (changed) localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(existing));
} catch(e) { console.warn('Seed merge failed:', e); }

// Clean up duplicate profiles for Çınar Caner and force map to 'cinar_caner_001' to sync all measurements
try {
  const existing = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '{}');
  if (existing.profiles && existing.profiles.length > 0) {
    const matchesCinar = (name) => {
      if (!name) return false;
      const normalized = name.toLowerCase().replace(/\s+/g, '').replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ğ/g, 'g').replace(/ç/g, 'c').replace(/ö/g, 'o').replace(/ü/g, 'u');
      return normalized === 'cinarcaner';
    };
    
    const cinarProfiles = existing.profiles.filter(p => matchesCinar(p.fullName));
    if (cinarProfiles.length > 0) {
      const targetId = 'cinar_caner_001';
      
      // Force change id of all matching profiles to targetId
      existing.profiles = existing.profiles.map(p => {
        if (matchesCinar(p.fullName)) {
          return { ...p, id: targetId };
        }
        return p;
      });
      
      // Deduplicate profiles
      const seenIds = new Set();
      existing.profiles = existing.profiles.filter(p => {
        if (p.id === targetId) {
          if (seenIds.has(targetId)) return false;
          seenIds.add(targetId);
          return true;
        }
        return true;
      });

      // Update foreign keys in child tables for any old IDs to targetId
      const oldIds = cinarProfiles.map(p => p.id).filter(id => id !== targetId);
      if (oldIds.length > 0) {
        const childTables = ['genetics', 'antropometri', 'skills', 'coach_reports', 'goals', 'physicalMeasurements'];
        childTables.forEach(table => {
          if (existing[table]) {
            existing[table] = existing[table].map(r => {
              const idField = table === 'profiles' ? 'id' : 'playerId';
              if (oldIds.includes(r[idField])) {
                return { ...r, [idField]: targetId };
              }
              return r;
            });
          }
        });
      }
      
      // Force refresh/overwrite data for Cinar Caner (cinar_caner_001) with latest seed values
      existing.profiles = existing.profiles.filter(p => p.id !== targetId);
      existing.genetics = (existing.genetics || []).filter(g => g.playerId !== targetId);
      existing.antropometri = (existing.antropometri || []).filter(m => m.playerId !== targetId);
      existing.skills = (existing.skills || []).filter(s => s.playerId !== targetId);
      existing.coach_reports = (existing.coach_reports || []).filter(r => r.playerId !== targetId);
      existing.goals = (existing.goals || []).filter(g => g.playerId !== targetId);
      existing.physicalMeasurements = (existing.physicalMeasurements || []).filter(m => m.playerId !== targetId);
      
      // Re-insert fresh seed values
      if (seedData.profiles) { existing.profiles.push(...seedData.profiles.filter(p => p.id === targetId)); }
      if (seedData.genetics) { existing.genetics.push(...seedData.genetics.filter(g => g.playerId === targetId)); }
      if (seedData.antropometri) { existing.antropometri.push(...seedData.antropometri.filter(m => m.playerId === targetId)); }
      if (seedData.skills) { existing.skills.push(...seedData.skills.filter(s => s.playerId === targetId)); }
      if (seedData.coach_reports) { existing.coach_reports.push(...seedData.coach_reports.filter(r => r.playerId === targetId)); }
      if (seedData.goals) { existing.goals.push(...seedData.goals.filter(g => g.playerId === targetId)); }
      if (seedData.physicalMeasurements) { existing.physicalMeasurements.push(...seedData.physicalMeasurements.filter(m => m.playerId === targetId)); }
      
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(existing));
      console.log('Cinar Caner seed data synchronized successfully.');
    }
  }
} catch(e) { console.warn('Deduplication/seed sync failed:', e); }

export async function syncFromSupabase() {
  if (!isSupabaseConfigured) return;
  console.log('Syncing database from Supabase cloud...');
  try {
    const db = localDb.get();
    
    // 1. Fetch profiles
    const { data: profiles, error: pError } = await supabase.from('profiles').select('*');
    if (!pError && profiles) {
      if (profiles.length === 0) {
        if (!db.profiles || db.profiles.length === 0) {
          console.log('Both local and cloud database are empty. Re-loading default seed data...');
          db.profiles = [...(seedData.profiles || [])];
          db.genetics = [...(seedData.genetics || [])];
          db.antropometri = [...(seedData.antropometri || [])];
          db.skills = [...(seedData.skills || [])];
          db.coach_reports = [...(seedData.coach_reports || [])];
          db.goals = [...(seedData.goals || [])];
          db.physicalMeasurements = [...(seedData.physicalMeasurements || [])];
          db.teams = [
            { id: 1, name: 'Kocaeli Atletik U9/U10', category: 'U9/U10', season: '2025-26', color: '#FF6B35' },
            { id: 2, name: 'Kocaeli Atletik U12', category: 'U12', season: '2025-26', color: '#4ECDC4' },
            { id: 3, name: 'Kocaeli Atletik U14', category: 'U14', season: '2025-26', color: '#A78BFA' }
          ];
        }
        console.log('Supabase database is empty. Seeding Supabase with local/seed data...');
        await syncToSupabase(db);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(db));
        window.dispatchEvent(new Event('auth-changed'));
        return;
      }
      db.profiles = profiles.map(p => ({
        id: p.id,
        fullName: p.full_name,
        role: p.role,
        birthDate: p.birth_date,
        position: p.position,
        jerseyNumber: p.jersey_number,
        status: p.status,
        avatarUrl: p.avatar_url,
        email: p.email,
        password: p.password
      }));
    }

    // 2. Fetch genetics
    const { data: genetics, error: gError } = await supabase.from('genetics').select('*');
    if (!gError && genetics) {
      db.genetics = genetics.map(g => ({
        playerId: g.player_id,
        fatherHeight: g.father_height,
        mother_height: g.mother_height,
        targetHeight: g.target_height,
        note: g.genetics_note,
        allergy: g.allergy
      }));
    }

    // 3. Fetch antropometri
    const { data: antropometri, error: aError } = await supabase.from('antropometri').select('*');
    if (!aError && antropometri) {
      db.antropometri = antropometri.map(a => ({
        playerId: a.player_id,
        date: a.date,
        metric: a.metric,
        val2025: a.val_2025,
        val2026: a.val_2026,
        change: a.change_val,
        comment: a.comment
      }));
    }

    // 4. Fetch skills
    const { data: skills, error: sError } = await supabase.from('skills').select('*');
    if (!sError && skills) {
      db.skills = skills.map(s => ({
        playerId: s.player_id,
        name: s.name,
        type: s.type,
        status: s.rating,
        analysis: s.analysis
      }));
    }

    // 5. Fetch coach reports
    const { data: coachReports, error: cError } = await supabase.from('coach_reports').select('*');
    if (!cError && coachReports) {
      db.coach_reports = coachReports.map(r => ({
        playerId: r.player_id,
        report: r.report_data
      }));
    }

    // 6. Fetch goals
    const { data: goals, error: goError } = await supabase.from('goals').select('*');
    if (!goError && goals) {
      db.goals = goals.map(g => ({
        playerId: g.player_id,
        category: g.category,
        title: g.title,
        status: g.status
      }));
    }

    // 7. Fetch physical measurements (tracking)
    const { data: physicalMeasurements, error: pmError } = await supabase.from('physical_measurements').select('*');
    if (!pmError && physicalMeasurements) {
      db.physicalMeasurements = physicalMeasurements.map(pm => ({
        playerId: pm.player_id,
        date: pm.date,
        heightCm: pm.height_cm,
        weightKg: pm.weight_kg,
        kulac: pm.kulac,
        bel: pm.bel,
        omuz: pm.omuz,
        bacak: pm.bacak,
        note: pm.note
      }));
    }

    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(db));
    window.dispatchEvent(new Event('auth-changed'));
    console.log('Database synced from Supabase successfully.');
  } catch (err) {
    console.error('Failed to sync database from Supabase:', err);
  }
}

export async function syncToSupabase(db) {
  if (!isSupabaseConfigured) return;
  if (localStorage.getItem('user_id') === 'admin') return; // Do not sync demo account edits to live DB
  
  console.log('Syncing database updates to Supabase cloud...');
  try {
    // 1. Sync profiles
    if (db.profiles && db.profiles.length > 0) {
      const mappedProfiles = db.profiles.map(p => ({
        id: p.id,
        full_name: p.fullName || 'Bilinmeyen',
        role: p.role || 'student',
        birth_date: p.birthDate,
        position: p.position,
        jersey_number: p.jerseyNumber || 0,
        status: p.status || 'active',
        avatar_url: p.avatarUrl,
        email: p.email,
        password: p.password
      }));
      await supabase.from('profiles').upsert(mappedProfiles);
    }

    // 2. Sync genetics
    if (db.genetics && db.genetics.length > 0) {
      const mappedGenetics = db.genetics.map(g => ({
        player_id: g.playerId,
        father_height: g.fatherHeight,
        mother_height: g.motherHeight,
        target_height: g.targetHeight,
        genetics_note: g.note,
        allergy: g.allergy
      }));
      await supabase.from('genetics').upsert(mappedGenetics);
    }

    // 3. Sync antropometri
    if (db.antropometri && db.antropometri.length > 0) {
      const mappedAntro = db.antropometri.map(a => ({
        player_id: a.playerId,
        date: a.date,
        metric: a.metric,
        val_2025: a.val2025?.toString(),
        val_2026: a.val2026?.toString(),
        change_val: a.change?.toString(),
        comment: a.comment
      }));
      await supabase.from('antropometri').upsert(mappedAntro);
    }

    // 4. Sync skills
    if (db.skills && db.skills.length > 0) {
      const mappedSkills = db.skills.map(s => ({
        player_id: s.playerId,
        name: s.name,
        type: s.type,
        rating: s.status,
        analysis: s.analysis
      }));
      await supabase.from('skills').upsert(mappedSkills);
    }

    // 5. Sync coach reports
    if (db.coach_reports && db.coach_reports.length > 0) {
      const mappedReports = db.coach_reports.map(r => ({
        player_id: r.playerId,
        report_data: r.report
      }));
      await supabase.from('coach_reports').upsert(mappedReports);
    }

    // 6. Sync goals
    if (db.goals && db.goals.length > 0) {
      const mappedGoals = db.goals.map(g => ({
        player_id: g.playerId,
        category: g.category,
        title: g.title,
        status: g.status || 'active'
      }));
      await supabase.from('goals').upsert(mappedGoals);
    }

    // 7. Sync physical measurements (tracking)
    if (db.physicalMeasurements && db.physicalMeasurements.length > 0) {
      const mappedPM = db.physicalMeasurements.map(pm => ({
        player_id: pm.playerId,
        date: pm.date,
        height_cm: pm.heightCm?.toString(),
        weight_kg: pm.weightKg?.toString(),
        kulac: pm.kulac?.toString(),
        bel: pm.bel?.toString(),
        omuz: pm.omuz?.toString(),
        bacak: pm.bacak?.toString(),
        note: pm.note
      }));
      await supabase.from('physical_measurements').upsert(mappedPM);
    }
    
    console.log('Database synced to Supabase successfully.');
  } catch (err) {
    console.error('Failed to sync updates to Supabase:', err);
  }
}

export const localDb = {
  get: () => JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '{}'),
  set: (data) => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
    if (isSupabaseConfigured) {
      syncToSupabase(data);
    }
  },
  clear: () => localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(defaultDb)),
};

