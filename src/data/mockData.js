// ============================================================
// MOCK DATA - Basketbol Kulübü Sporcu Gelişim Takip Uygulaması
// ============================================================

export const teams = [
  { id: 1, name: 'Yıldızlar Erkek', category: 'Erkek A', season: '2025-26', color: '#FF6B35' },
  { id: 2, name: 'Yıldızlar Kadın', category: 'Kadın A', season: '2025-26', color: '#4ECDC4' },
  { id: 3, name: 'U18 Erkek', category: 'U18', season: '2025-26', color: '#A78BFA' },
  { id: 4, name: 'U16 Kız', category: 'U16', season: '2025-26', color: '#F59E0B' },
];

export const players = [
  {
    id: 1, teamId: 1, jerseyNumber: 7, fullName: 'Ahmet Yılmaz',
    position: 'PG', birthDate: '2000-03-15', heightCm: 188, weightKg: 82,
    dominantHand: 'right', avatar: null, status: 'active',
    bio: 'Takım kaptanı, hızlı pas oyunu ile öne çıkıyor.',
  },
  {
    id: 2, teamId: 1, jerseyNumber: 14, fullName: 'Mehmet Kaya',
    position: 'SG', birthDate: '1999-07-22', heightCm: 192, weightKg: 88,
    dominantHand: 'right', avatar: null, status: 'active',
    bio: 'Uzak mesafe atışlarda yüksek başarı oranı.',
  },
  {
    id: 3, teamId: 1, jerseyNumber: 23, fullName: 'Can Demir',
    position: 'SF', birthDate: '2001-11-08', heightCm: 198, weightKg: 95,
    dominantHand: 'left', avatar: null, status: 'active',
    bio: 'Savunma ve ribaund konusunda takımın lokomotifi.',
  },
  {
    id: 4, teamId: 1, jerseyNumber: 5, fullName: 'Burak Şahin',
    position: 'PF', birthDate: '1998-05-30', heightCm: 204, weightKg: 105,
    dominantHand: 'right', avatar: null, status: 'injured',
    bio: 'Post oyunu ve pivot hareketi güçlü.',
  },
  {
    id: 5, teamId: 1, jerseyNumber: 11, fullName: 'Emre Arslan',
    position: 'C', birthDate: '2002-01-14', heightCm: 210, weightKg: 112,
    dominantHand: 'right', avatar: null, status: 'active',
    bio: 'Blok ve ribaund istatistiklerinde ligin önde gelenleri arasında.',
  },
  {
    id: 6, teamId: 2, jerseyNumber: 10, fullName: 'Zeynep Çelik',
    position: 'PG', birthDate: '2001-09-12', heightCm: 172, weightKg: 65,
    dominantHand: 'right', avatar: null, status: 'active',
    bio: 'Hızlı ve yaratıcı pas oyuncusu.',
  },
  {
    id: 7, teamId: 2, jerseyNumber: 8, fullName: 'Elif Yıldız',
    position: 'SG', birthDate: '2000-04-18', heightCm: 178, weightKg: 70,
    dominantHand: 'right', avatar: null, status: 'active',
    bio: '3 sayılık atış oranında takımın en iyisi.',
  },
  {
    id: 8, teamId: 3, jerseyNumber: 3, fullName: 'Kaan Polat',
    position: 'SG', birthDate: '2007-08-25', heightCm: 183, weightKg: 75,
    dominantHand: 'right', avatar: null, status: 'active',
    bio: 'Genç yetenek, gelişim potansiyeli yüksek.',
  },
  {
    id: 9, teamId: 3, jerseyNumber: 21, fullName: 'Furkan Aydın',
    position: 'PF', birthDate: '2008-02-07', heightCm: 195, weightKg: 87,
    dominantHand: 'right', avatar: null, status: 'active',
    bio: 'Güçlü fiziksel yapısıyla dikkat çekiyor.',
  },
  {
    id: 10, teamId: 4, jerseyNumber: 9, fullName: 'Selin Koç',
    position: 'SF', birthDate: '2009-06-19', heightCm: 176, weightKg: 63,
    dominantHand: 'left', avatar: null, status: 'active',
    bio: 'Çok yönlü oyuncusu, takım için kritik.',
  },
];

export const matches = [
  { id: 1, teamId: 1, opponent: 'Galatasaray SK', date: '2026-07-10', location: 'Ülker Arena', homeAway: 'home', score: '88-75', result: 'W' },
  { id: 2, teamId: 1, opponent: 'Fenerbahçe Beko', date: '2026-07-05', location: 'Fenerbahçe Spor Kulübü', homeAway: 'away', score: '71-84', result: 'L' },
  { id: 3, teamId: 1, opponent: 'Anadolu Efes', date: '2026-06-28', location: 'Ülker Arena', homeAway: 'home', score: '95-82', result: 'W' },
  { id: 4, teamId: 1, opponent: 'Beşiktaş JK', date: '2026-06-20', location: 'Vodafone Park', homeAway: 'away', score: '78-78', result: 'D' },
  { id: 5, teamId: 2, opponent: 'Çankaya FK', date: '2026-07-08', location: 'Ülker Arena', homeAway: 'home', score: '72-65', result: 'W' },
  { id: 6, teamId: 2, opponent: 'Mersin BŞB', date: '2026-07-01', location: 'Mersin Arena', homeAway: 'away', score: '60-68', result: 'L' },
  { id: 7, teamId: 3, opponent: 'BJK Genç', date: '2026-07-12', location: 'Ülker Arena', homeAway: 'home', score: '55-48', result: 'W' },
  { id: 8, teamId: 1, opponent: 'Tofaş SK', date: '2026-07-20', location: 'Ülker Arena', homeAway: 'home', score: null, result: null }, // Upcoming
];

export const matchStats = [
  // Ahmet - Match 1
  { id: 1, playerId: 1, matchId: 1, points: 22, rebounds: 4, assists: 8, steals: 3, blocks: 0, turnovers: 2, minutesPlayed: 34, fgMade: 8, fgAttempted: 16, threeMade: 2, threeAttempted: 5, ftMade: 4, ftAttempted: 5 },
  { id: 2, playerId: 2, matchId: 1, points: 18, rebounds: 3, assists: 2, steals: 2, blocks: 0, turnovers: 1, minutesPlayed: 28, fgMade: 6, fgAttempted: 12, threeMade: 3, threeAttempted: 7, ftMade: 3, ftAttempted: 4 },
  { id: 3, playerId: 3, matchId: 1, points: 15, rebounds: 10, assists: 2, steals: 1, blocks: 2, turnovers: 1, minutesPlayed: 32, fgMade: 6, fgAttempted: 11, threeMade: 1, threeAttempted: 3, ftMade: 2, ftAttempted: 2 },
  { id: 4, playerId: 5, matchId: 1, points: 12, rebounds: 14, assists: 1, steals: 0, blocks: 4, turnovers: 2, minutesPlayed: 30, fgMade: 5, fgAttempted: 8, threeMade: 0, threeAttempted: 0, ftMade: 2, ftAttempted: 3 },
  // Ahmet - Match 2
  { id: 5, playerId: 1, matchId: 2, points: 14, rebounds: 3, assists: 7, steals: 2, blocks: 0, turnovers: 4, minutesPlayed: 36, fgMade: 5, fgAttempted: 14, threeMade: 1, threeAttempted: 4, ftMade: 3, ftAttempted: 4 },
  { id: 6, playerId: 2, matchId: 2, points: 20, rebounds: 2, assists: 1, steals: 1, blocks: 0, turnovers: 2, minutesPlayed: 30, fgMade: 7, fgAttempted: 15, threeMade: 4, threeAttempted: 9, ftMade: 2, ftAttempted: 2 },
  // Ahmet - Match 3
  { id: 7, playerId: 1, matchId: 3, points: 28, rebounds: 5, assists: 10, steals: 4, blocks: 1, turnovers: 2, minutesPlayed: 38, fgMade: 10, fgAttempted: 18, threeMade: 3, threeAttempted: 6, ftMade: 5, ftAttempted: 6 },
  { id: 8, playerId: 3, matchId: 3, points: 20, rebounds: 12, assists: 4, steals: 2, blocks: 3, turnovers: 1, minutesPlayed: 35, fgMade: 8, fgAttempted: 13, threeMade: 2, threeAttempted: 4, ftMade: 2, ftAttempted: 2 },
  // Match 4
  { id: 9, playerId: 1, matchId: 4, points: 16, rebounds: 4, assists: 6, steals: 2, blocks: 0, turnovers: 3, minutesPlayed: 37, fgMade: 6, fgAttempted: 13, threeMade: 2, threeAttempted: 5, ftMade: 2, ftAttempted: 2 },
  { id: 10, playerId: 2, matchId: 4, points: 12, rebounds: 2, assists: 3, steals: 0, blocks: 0, turnovers: 2, minutesPlayed: 25, fgMade: 4, fgAttempted: 10, threeMade: 2, threeAttempted: 6, ftMade: 2, ftAttempted: 2 },
];

export const physicalMeasurements = [
  { id: 1, playerId: 1, date: '2026-01-15', heightCm: 188, weightKg: 84, bodyFatPct: 12, verticalJumpCm: 72, sprint30mSec: 4.2, agilityTestSec: 11.8, vo2max: 58 },
  { id: 2, playerId: 1, date: '2026-04-10', heightCm: 188, weightKg: 82, bodyFatPct: 11, verticalJumpCm: 75, sprint30mSec: 4.1, agilityTestSec: 11.5, vo2max: 60 },
  { id: 3, playerId: 1, date: '2026-07-01', heightCm: 188, weightKg: 82, bodyFatPct: 10.5, verticalJumpCm: 77, sprint30mSec: 4.0, agilityTestSec: 11.3, vo2max: 62 },
  { id: 4, playerId: 2, date: '2026-01-15', heightCm: 192, weightKg: 90, bodyFatPct: 14, verticalJumpCm: 68, sprint30mSec: 4.4, agilityTestSec: 12.1, vo2max: 54 },
  { id: 5, playerId: 2, date: '2026-04-10', heightCm: 192, weightKg: 88, bodyFatPct: 13, verticalJumpCm: 70, sprint30mSec: 4.3, agilityTestSec: 11.9, vo2max: 56 },
  { id: 6, playerId: 2, date: '2026-07-01', heightCm: 192, weightKg: 88, bodyFatPct: 12.5, verticalJumpCm: 72, sprint30mSec: 4.2, agilityTestSec: 11.7, vo2max: 57 },
  { id: 7, playerId: 3, date: '2026-01-15', heightCm: 198, weightKg: 97, bodyFatPct: 15, verticalJumpCm: 70, sprint30mSec: 4.5, agilityTestSec: 12.3, vo2max: 52 },
  { id: 8, playerId: 3, date: '2026-07-01', heightCm: 198, weightKg: 95, bodyFatPct: 13.5, verticalJumpCm: 74, sprint30mSec: 4.3, agilityTestSec: 12.0, vo2max: 55 },
  { id: 9, playerId: 5, date: '2026-01-15', heightCm: 210, weightKg: 115, bodyFatPct: 18, verticalJumpCm: 62, sprint30mSec: 4.8, agilityTestSec: 13.0, vo2max: 48 },
  { id: 10, playerId: 5, date: '2026-07-01', heightCm: 210, weightKg: 112, bodyFatPct: 16, verticalJumpCm: 65, sprint30mSec: 4.6, agilityTestSec: 12.7, vo2max: 50 },
];

export const goals = [
  { id: 1, playerId: 1, title: 'Serbest Atış Oranı', description: '%80 serbest atış başarısı hedefi', targetValue: 80, currentValue: 72, unit: '%', category: 'shooting', deadline: '2026-09-30', status: 'active' },
  { id: 2, playerId: 1, title: '3 Sayı Oranı', description: 'Maç başı 3 sayılık atış oranını artır', targetValue: 40, currentValue: 38, unit: '%', category: 'shooting', deadline: '2026-09-30', status: 'active' },
  { id: 3, playerId: 1, title: 'Dikey Sıçrama', description: '80cm dikey sıçrama hedefi', targetValue: 80, currentValue: 77, unit: 'cm', category: 'physical', deadline: '2026-12-31', status: 'active' },
  { id: 4, playerId: 2, title: 'Maç Başı Sayı', description: '20 sayı ortalaması', targetValue: 20, currentValue: 17, unit: 'pts', category: 'offense', deadline: '2026-09-30', status: 'active' },
  { id: 5, playerId: 3, title: 'Ribaund Ortalaması', description: '12 ribaund ortalaması', targetValue: 12, currentValue: 10.5, unit: 'reb', category: 'defense', deadline: '2026-09-30', status: 'active' },
  { id: 6, playerId: 5, title: 'Blok Ortalaması', description: 'Maç başı 4 blok', targetValue: 4, currentValue: 4, unit: 'blk', category: 'defense', deadline: '2026-06-30', status: 'achieved' },
];

export const trainingSessions = [
  { id: 1, teamId: 1, date: '2026-07-15', durationMinutes: 90, type: 'Teknik Antrenman', notes: 'Pas ve yerleşme çalışması' },
  { id: 2, teamId: 1, date: '2026-07-13', durationMinutes: 75, type: 'Kondisyon', notes: 'Sprint ve dayanıklılık' },
  { id: 3, teamId: 1, date: '2026-07-11', durationMinutes: 90, type: 'Taktik', notes: 'Rakip analizi ve savunma düzeni' },
  { id: 4, teamId: 1, date: '2026-07-09', durationMinutes: 60, type: 'Atış Antrenmanı', notes: 'Serbest atış ve 3 sayı çalışması' },
  { id: 5, teamId: 1, date: '2026-07-17', durationMinutes: 90, type: 'Takım Antrenmanı', notes: 'Maç öncesi hazırlık' },
  { id: 6, teamId: 2, date: '2026-07-16', durationMinutes: 80, type: 'Teknik Antrenman', notes: 'Bireysel beceri geliştirme' },
];

export const attendance = [
  { id: 1, playerId: 1, sessionId: 1, present: true, reasonAbsent: null },
  { id: 2, playerId: 2, sessionId: 1, present: true, reasonAbsent: null },
  { id: 3, playerId: 3, sessionId: 1, present: false, reasonAbsent: 'Hastalık' },
  { id: 4, playerId: 5, sessionId: 1, present: true, reasonAbsent: null },
  { id: 5, playerId: 1, sessionId: 2, present: true, reasonAbsent: null },
  { id: 6, playerId: 2, sessionId: 2, present: true, reasonAbsent: null },
  { id: 7, playerId: 3, sessionId: 2, present: true, reasonAbsent: null },
  { id: 8, playerId: 5, sessionId: 2, present: false, reasonAbsent: 'Sakatlık' },
  { id: 9, playerId: 1, sessionId: 3, present: true, reasonAbsent: null },
  { id: 10, playerId: 2, sessionId: 3, present: false, reasonAbsent: 'Kişisel' },
  { id: 11, playerId: 3, sessionId: 3, present: true, reasonAbsent: null },
  { id: 12, playerId: 5, sessionId: 3, present: true, reasonAbsent: null },
];

// Helper: compute player stats averages
export function getPlayerStats(playerId) {
  const stats = matchStats.filter(s => s.playerId === playerId);
  if (!stats.length) return null;
  const n = stats.length;
  return {
    gamesPlayed: n,
    ppg: (stats.reduce((a, s) => a + s.points, 0) / n).toFixed(1),
    rpg: (stats.reduce((a, s) => a + s.rebounds, 0) / n).toFixed(1),
    apg: (stats.reduce((a, s) => a + s.assists, 0) / n).toFixed(1),
    spg: (stats.reduce((a, s) => a + s.steals, 0) / n).toFixed(1),
    bpg: (stats.reduce((a, s) => a + s.blocks, 0) / n).toFixed(1),
    tpg: (stats.reduce((a, s) => a + s.turnovers, 0) / n).toFixed(1),
    fgPct: stats.reduce((a, s) => a + s.fgAttempted, 0) > 0
      ? ((stats.reduce((a, s) => a + s.fgMade, 0) / stats.reduce((a, s) => a + s.fgAttempted, 0)) * 100).toFixed(1)
      : '0.0',
    threePct: stats.reduce((a, s) => a + s.threeAttempted, 0) > 0
      ? ((stats.reduce((a, s) => a + s.threeMade, 0) / stats.reduce((a, s) => a + s.threeAttempted, 0)) * 100).toFixed(1)
      : '0.0',
    ftPct: stats.reduce((a, s) => a + s.ftAttempted, 0) > 0
      ? ((stats.reduce((a, s) => a + s.ftMade, 0) / stats.reduce((a, s) => a + s.ftAttempted, 0)) * 100).toFixed(1)
      : '0.0',
    mpg: (stats.reduce((a, s) => a + s.minutesPlayed, 0) / n).toFixed(1),
  };
}
