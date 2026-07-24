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
};

export const generateEmailFromName = (name) => {
  if (!name) return '';
  return `${normalizeName(name)}@atletik.com`;
};

export const cleanDuplicates = (db) => {
  if (!db) return db;

  if (Array.isArray(db.coach_reports)) {
    const map = new Map();
    db.coach_reports.forEach(r => {
      if (r && (r.playerId || r.player_id)) {
        map.set((r.playerId || r.player_id).toString(), r);
      }
    });
    db.coach_reports = Array.from(map.values());
  }

  if (Array.isArray(db.goals)) {
    const seen = new Set();
    db.goals = db.goals.filter(g => {
      if (!g || !g.playerId) return false;
      const key = `${g.playerId}_${g.category}_${g.title}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  if (Array.isArray(db.physicalMeasurements)) {
    const seen = new Set();
    db.physicalMeasurements = db.physicalMeasurements.filter(pm => {
      if (!pm || !pm.playerId) return false;
      const key = `${pm.playerId}_${pm.date}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  if (Array.isArray(db.antropometri)) {
    const seen = new Set();
    db.antropometri = db.antropometri.filter(a => {
      if (!a || !a.playerId) return false;
      const key = `${a.playerId}_${a.metric}_${a.date}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  if (Array.isArray(db.skills)) {
    const seen = new Set();
    db.skills = db.skills.filter(s => {
      if (!s || !s.playerId) return false;
      const key = `${s.playerId}_${s.type}_${s.name}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  return db;
};

export async function syncFromSupabase() {
  if (!isSupabaseConfigured) return;
  console.log('Syncing database from Supabase cloud...');
  try {
    const db = cleanDuplicates(localDb.get());
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

    // 3. Fetch antropometri (Deduplicate by playerId, metric, date)
    const { data: antropometri, error: aError } = await supabase.from('antropometri').select('*');
    if (!aError && antropometri) {
      const seenAntroKeys = new Set();
      const cleanAntro = [];
      antropometri
        .filter(a => !deletedIds.includes(a.player_id?.toString()))
        .forEach(a => {
          const key = `${a.player_id}_${a.metric}_${a.date}`;
          if (!seenAntroKeys.has(key)) {
            seenAntroKeys.add(key);
            cleanAntro.push({
              _id: a.id,
              playerId: a.player_id,
              date: a.date,
              metric: a.metric,
              val2025: a.val_2025,
              val2026: a.val_2026,
              change: a.change_val,
              comment: a.comment
            });
          }
        });
      db.antropometri = cleanAntro;
    }

    // 4. Fetch skills (Deduplicate by playerId, type, name)
    const { data: skills, error: sError } = await supabase.from('skills').select('*');
    if (!sError && skills) {
      const seenSkillKeys = new Set();
      const cleanSkills = [];
      skills
        .filter(s => !deletedIds.includes(s.player_id?.toString()))
        .forEach(s => {
          const key = `${s.player_id}_${s.type}_${s.name}`;
          if (!seenSkillKeys.has(key)) {
            seenSkillKeys.add(key);
            cleanSkills.push({
              _id: s.id,
              playerId: s.player_id,
              name: s.name,
              type: s.type,
              status: s.rating,
              analysis: s.analysis
            });
          }
        });
      db.skills = cleanSkills;
    }

    // 5. Fetch coach reports (Deduplicate by playerId - keep latest)
    const { data: coachReports, error: cError } = await supabase.from('coach_reports').select('*');
    if (!cError && coachReports) {
      const latestReportsMap = new Map();
      coachReports
        .filter(r => !deletedIds.includes(r.player_id?.toString()))
        .forEach(r => {
          latestReportsMap.set(r.player_id?.toString(), {
            _id: r.id,
            playerId: r.player_id,
            report: r.report_data
          });
        });
      db.coach_reports = Array.from(latestReportsMap.values());
    }

    // 6. Fetch goals (Deduplicate by playerId, category, title)
    const { data: goals, error: goError } = await supabase.from('goals').select('*');
    if (!goError && goals) {
      const seenGoalKeys = new Set();
      const cleanGoals = [];
      goals
        .filter(g => !deletedIds.includes(g.player_id?.toString()))
        .forEach(g => {
          const key = `${g.player_id}_${g.category}_${g.title}`;
          if (!seenGoalKeys.has(key)) {
            seenGoalKeys.add(key);
            cleanGoals.push({
              _id: g.id,
              playerId: g.player_id,
              category: g.category,
              title: g.title,
              status: g.status
            });
          }
        });
      db.goals = cleanGoals;
    }

    // 7. Fetch physical measurements (Deduplicate by playerId, date)
    const { data: physicalMeasurements, error: pmError } = await supabase.from('physical_measurements').select('*');
    if (!pmError && physicalMeasurements) {
      const seenPMKeys = new Set();
      const cleanPM = [];
      physicalMeasurements
        .filter(pm => !deletedIds.includes(pm.player_id?.toString()))
        .forEach(pm => {
          const key = `${pm.player_id}_${pm.date}`;
          if (!seenPMKeys.has(key)) {
            seenPMKeys.add(key);
            cleanPM.push({
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
            });
          }
        });
      db.physicalMeasurements = cleanPM;
    }

    const deduplicatedDb = cleanDuplicates(db);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(deduplicatedDb));
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
    const cleanDb = cleanDuplicates(db);

    // 1. Sync profiles
    if (cleanDb.profiles && cleanDb.profiles.length > 0) {
      const mappedProfiles = cleanDb.profiles.map(p => ({
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

    // 2. Sync genetics per player
    if (cleanDb.genetics && cleanDb.genetics.length > 0) {
      const latestGeneticsMap = new Map();
      cleanDb.genetics.forEach(g => {
        if (g.playerId) latestGeneticsMap.set(g.playerId.toString(), g);
      });
      for (const [pid, g] of latestGeneticsMap.entries()) {
        await supabase.from('genetics').delete().eq('player_id', pid);
        await supabase.from('genetics').insert({
          player_id: g.playerId,
          father_height: g.fatherHeight,
          mother_height: g.motherHeight,
          target_height: g.targetHeight,
          genetics_note: g.note,
          allergy: g.allergy
        });
      }
    }

    // 3. Sync antropometri per player
    if (cleanDb.antropometri && cleanDb.antropometri.length > 0) {
      const playerIds = [...new Set(cleanDb.antropometri.map(a => a.playerId?.toString()).filter(Boolean))];
      for (const pid of playerIds) {
        await supabase.from('antropometri').delete().eq('player_id', pid);
        const playerAntro = cleanDb.antropometri.filter(a => a.playerId?.toString() === pid);
        if (playerAntro.length > 0) {
          const mappedAntro = playerAntro.map(a => ({
            player_id: a.playerId,
            date: a.date,
            metric: a.metric,
            val_2025: a.val2025?.toString(),
            val_2026: a.val2026?.toString(),
            change_val: a.change?.toString(),
            comment: a.comment
          }));
          await supabase.from('antropometri').insert(mappedAntro);
        }
      }
    }

    // 4. Sync skills per player
    if (cleanDb.skills && cleanDb.skills.length > 0) {
      const playerIds = [...new Set(cleanDb.skills.map(s => s.playerId?.toString()).filter(Boolean))];
      for (const pid of playerIds) {
        await supabase.from('skills').delete().eq('player_id', pid);
        const playerSkills = cleanDb.skills.filter(s => s.playerId?.toString() === pid);
        if (playerSkills.length > 0) {
          const mappedSkills = playerSkills.map(s => ({
            player_id: s.playerId,
            name: s.name,
            type: s.type,
            rating: s.status,
            analysis: s.analysis
          }));
          await supabase.from('skills').insert(mappedSkills);
        }
      }
    }

    // 5. Sync coach reports per player
    if (cleanDb.coach_reports && cleanDb.coach_reports.length > 0) {
      const latestReportsMap = new Map();
      cleanDb.coach_reports.forEach(r => {
        if (r.playerId) latestReportsMap.set(r.playerId.toString(), r);
      });
      for (const [pid, r] of latestReportsMap.entries()) {
        await supabase.from('coach_reports').delete().eq('player_id', pid);
        await supabase.from('coach_reports').insert({
          player_id: r.playerId,
          report_data: r.report
        });
      }
    }

    // 6. Sync goals per player
    if (cleanDb.goals && cleanDb.goals.length > 0) {
      const playerIds = [...new Set(cleanDb.goals.map(g => g.playerId?.toString()).filter(Boolean))];
      for (const pid of playerIds) {
        await supabase.from('goals').delete().eq('player_id', pid);
        const playerGoals = cleanDb.goals.filter(g => g.playerId?.toString() === pid);
        if (playerGoals.length > 0) {
          const mappedGoals = playerGoals.map(g => ({
            player_id: g.playerId,
            category: g.category,
            title: g.title,
            status: g.status || 'active'
          }));
          await supabase.from('goals').insert(mappedGoals);
        }
      }
    }

    // 7. Sync physical measurements (tracking) per player
    if (cleanDb.physicalMeasurements && cleanDb.physicalMeasurements.length > 0) {
      const playerIds = [...new Set(cleanDb.physicalMeasurements.map(pm => pm.playerId?.toString()).filter(Boolean))];
      for (const pid of playerIds) {
        await supabase.from('physical_measurements').delete().eq('player_id', pid);
        const playerPM = cleanDb.physicalMeasurements.filter(pm => pm.playerId?.toString() === pid);
        if (playerPM.length > 0) {
          const mappedPM = playerPM.map(pm => ({
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
          await supabase.from('physical_measurements').insert(mappedPM);
        }
      }
    }
    
    console.log('Database synced to Supabase successfully.');
  } catch (err) {
    console.error('Failed to sync updates to Supabase:', err);
  }
}

export const localDb = {
  get: () => {
    const raw = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '{}');
    return cleanDuplicates(raw);
  },
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
    const cleanData = cleanDuplicates(data);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cleanData));
    if (isSupabaseConfigured) {
      syncToSupabase(cleanData);
    }
  },
  clear: () => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(defaultDb));
    localStorage.removeItem('baskettrack_deleted_ids');
    localStorage.removeItem('baskettrack_deleted_names');
  },
};

