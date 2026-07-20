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
const supabaseUrl = localStorage.getItem('supabase_url') || import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = localStorage.getItem('supabase_anon_key') || import.meta.env.VITE_SUPABASE_ANON_KEY;

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

export const localDb = {
  get: () => JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '{}'),
  set: (data) => localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data)),
  clear: () => localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(defaultDb)),
};

