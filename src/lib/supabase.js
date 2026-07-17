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

// Retrieve keys from LocalStorage (configurable in Settings page) or env
const supabaseUrl = localStorage.getItem('supabase_url') || import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = localStorage.getItem('supabase_anon_key') || import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Force local mode unless 'use_supabase' is explicitly set to 'true' in settings
export const isSupabaseConfigured = (localStorage.getItem('use_supabase') === 'true') && supabaseUrl && supabaseAnonKey;

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Local DB simulation if Supabase is not configured
const LOCAL_STORAGE_KEY = 'baskettrack_local_db_v4';

const defaultDb = {
  profiles: [],
  teams: [
    { id: 1, name: 'Kocaeli Atletik U9/U10', category: 'U9/U10', season: '2025-26', color: '#FF6B35' },
    { id: 2, name: 'Kocaeli Atletik U12', category: 'U12', season: '2025-26', color: '#4ECDC4' },
    { id: 3, name: 'Kocaeli Atletik U14', category: 'U14', season: '2025-26', color: '#A78BFA' }
  ],
  genetics: [],
  antropometri: [],
  skills: [],
  coach_reports: [],
  goals: [],
  physicalMeasurements: [],
  matches: [],
  matchStats: [],
  trainingSessions: [],
  attendance: []
};

// Initialize local DB if empty
if (!localStorage.getItem(LOCAL_STORAGE_KEY)) {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(defaultDb));
}

export const localDb = {
  get: () => JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '{}'),
  set: (data) => localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data)),
  clear: () => localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(defaultDb)),
};

