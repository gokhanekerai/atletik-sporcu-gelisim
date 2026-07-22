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

export const normalizeName = (name) => {
  if (!name) return '';
  return name
    .toString()
    .toLowerCase()
    .replace(/ı/g, 'i')
    .replace(/ş/g, 's')
    .replace(/ğ/g, 'g')
    .replace(/ç/g, 'c')
    .replace(/ö/g, 'o')
    .replace(/ü/g, 'u')
    .replace(/\s+/g, '')
    .trim();
};

export const generateEmailFromName = (name) => {
  if (!name) return '';
  return `${normalizeName(name)}@atletik.com`;
};

export async function syncFromSupabase() {
  if (!isSupabaseConfigured) return;
  console.log('Syncing database from Supabase cloud...');
  try {
    const db = localDb.get();
    const deletedIds = localDb.getDeletedIds();
    const deletedNames = localDb.getDeletedNames();
    
    // 1. Fetch profiles
    const { data: profiles, error: pError } = await supabase.from('profiles').select('*');
    if (!pError && profiles) {
      const existingProfiles = db.profiles || [];
      db.profiles = profiles
        .filter(p => {
          const pId = p.id?.toString();
          const isIdDeleted = deletedIds.includes(pId);
          return !isIdDeleted && p.status !== 'deleted';
        })
        .map(p => {
          const local = existingProfiles.find(lp => lp.id?.toString() === p.id?.toString()) || {};
          const fullName = p.full_name || local.fullName;
          const jersey = p.jersey_number ?? local.jerseyNumber ?? 10;
          return {
            id: p.id,
            fullName: fullName,
            role: p.role || local.role,
            birthDate: p.birth_date ?? local.birthDate,
            position: p.position ?? local.position,
            category: p.category ?? local.category,
            dominantHand: p.dominant_hand ?? local.dominantHand,
            bio: p.bio ?? local.bio,
            jerseyNumber: jersey,
            status: p.status || local.status || 'active',
            avatarUrl: p.avatar_url ?? local.avatarUrl,
            email: p.email || local.email || generateEmailFromName(fullName),
            password: p.password || local.password || jersey.toString(),
          };
        });
    }

    // 2. Fetch genetics
    const { data: genetics, error: gError } = await supabase.from('genetics').select('*');
    if (!gError && genetics) {
      db.genetics = genetics
        .filter(g => !deletedIds.includes(g.player_id?.toString()))
        .map(g => ({
          _id: g.id,
          playerId: g.player_id,
          fatherHeight: g.father_height,
          motherHeight: g.mother_height,
          targetHeight: g.target_height,
          note: g.genetics_note,
          allergy: g.allergy
        }));
    }

    // 3. Fetch antropometri
    const { data: antropometri, error: aError } = await supabase.from('antropometri').select('*');
    if (!aError && antropometri) {
      db.antropometri = antropometri
        .filter(a => !deletedIds.includes(a.player_id?.toString()))
        .map(a => ({
          _id: a.id,
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
      db.skills = skills
        .filter(s => !deletedIds.includes(s.player_id?.toString()))
        .map(s => ({
          _id: s.id,
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
      db.coach_reports = coachReports
        .filter(r => !deletedIds.includes(r.player_id?.toString()))
        .map(r => ({
          _id: r.id,
          playerId: r.player_id,
          report: r.report_data
        }));
    }

    // 6. Fetch goals
    const { data: goals, error: goError } = await supabase.from('goals').select('*');
    if (!goError && goals) {
      db.goals = goals
        .filter(g => !deletedIds.includes(g.player_id?.toString()))
        .map(g => ({
          _id: g.id,
          playerId: g.player_id,
          category: g.category,
          title: g.title,
          status: g.status
        }));
    }

    // 7. Fetch physical measurements (tracking)
    const { data: physicalMeasurements, error: pmError } = await supabase.from('physical_measurements').select('*');
    if (!pmError && physicalMeasurements) {
      db.physicalMeasurements = physicalMeasurements
        .filter(pm => !deletedIds.includes(pm.player_id?.toString()))
        .map(pm => ({
          _id: pm.id,
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
        category: p.category,
        dominant_hand: p.dominantHand,
        bio: p.bio,
        jersey_number: p.jerseyNumber || 0,
        status: p.status || 'active',
        avatar_url: p.avatarUrl,
        email: p.email || generateEmailFromName(p.fullName),
        password: p.password || (p.jerseyNumber || 10).toString()
      }));
      await supabase.from('profiles').upsert(mappedProfiles);
    }

    // 2. Sync genetics
    if (db.genetics && db.genetics.length > 0) {
      const mappedGenetics = db.genetics.map(g => ({
        ...(g._id ? { id: g._id } : {}),
        player_id: g.playerId,
        father_height: g.fatherHeight,
        mother_height: g.motherHeight,
        target_height: g.targetHeight,
        genetics_note: g.note,
        allergy: g.allergy
      }));
      await supabase.from('genetics').upsert(mappedGenetics, { onConflict: 'player_id' });
    }

    // 3. Sync antropometri
    if (db.antropometri && db.antropometri.length > 0) {
      const mappedAntro = db.antropometri.map(a => ({
        ...(a._id ? { id: a._id } : {}),
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
        ...(s._id ? { id: s._id } : {}),
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
        ...(r._id ? { id: r._id } : {}),
        player_id: r.playerId,
        report_data: r.report
      }));
      await supabase.from('coach_reports').upsert(mappedReports, { onConflict: 'player_id' });
    }

    // 6. Sync goals
    if (db.goals && db.goals.length > 0) {
      const mappedGoals = db.goals.map(g => ({
        ...(g._id ? { id: g._id } : {}),
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
        ...(pm._id ? { id: pm._id } : {}),
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
  getDeletedIds: () => JSON.parse(localStorage.getItem('baskettrack_deleted_ids') || '[]'),
  getDeletedNames: () => JSON.parse(localStorage.getItem('baskettrack_deleted_names') || '[]'),
  markDeleted: (id) => {
    if (id) {
      const strId = id.toString();
      const ids = JSON.parse(localStorage.getItem('baskettrack_deleted_ids') || '[]');
      if (!ids.includes(strId)) {
        ids.push(strId);
        localStorage.setItem('baskettrack_deleted_ids', JSON.stringify(ids));
      }
    }
  },
  unmarkDeleted: (fullName) => {
    if (fullName) {
      const normName = normalizeName(fullName);
      if (normName) {
        let names = JSON.parse(localStorage.getItem('baskettrack_deleted_names') || '[]');
        names = names.filter(n => n !== normName);
        localStorage.setItem('baskettrack_deleted_names', JSON.stringify(names));
      }
    }
  },
  set: (data) => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
    if (isSupabaseConfigured) {
      syncToSupabase(data);
    }
  },
  clear: () => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(defaultDb));
    localStorage.removeItem('baskettrack_deleted_ids');
    localStorage.removeItem('baskettrack_deleted_names');
  },
};

