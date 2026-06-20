import type { DifficultyId, LeaderboardEntry, PlayerProfile } from './types';

const PROFILE_STORAGE_KEY = 'petcare-player-profile';
const LEADERBOARD_STORAGE_KEY = 'petcare-leaderboard';
const MAX_LEADERBOARD_ENTRIES = 8;

const DEFAULT_PLAYER_NAME = 'Guest Vet';

export function loadPlayerProfile(): PlayerProfile {
  const stored = readJson<Partial<PlayerProfile>>(PROFILE_STORAGE_KEY);
  return normalizeProfile(stored);
}

export function savePlayerProfile(profile: PlayerProfile): void {
  writeJson(PROFILE_STORAGE_KEY, normalizeProfile(profile));
}

export function updatePlayerName(profile: PlayerProfile, name: string): PlayerProfile {
  const nextProfile = {
    ...profile,
    name: normalizePlayerName(name),
  };
  savePlayerProfile(nextProfile);
  return nextProfile;
}

export function loadLeaderboard(): LeaderboardEntry[] {
  const stored = readJson<LeaderboardEntry[]>(LEADERBOARD_STORAGE_KEY);
  if (!Array.isArray(stored)) {
    return [];
  }

  return stored
    .filter(isLeaderboardEntry)
    .sort((left, right) => right.score - left.score || right.createdAt - left.createdAt)
    .slice(0, MAX_LEADERBOARD_ENTRIES);
}

export function recordLeaderboardEntry(entry: Omit<LeaderboardEntry, 'id' | 'createdAt'>): LeaderboardEntry[] {
  const leaderboard = loadLeaderboard();
  const nextEntry: LeaderboardEntry = {
    ...entry,
    id: `score-${Date.now()}-${Math.round(Math.random() * 100000)}`,
    createdAt: Date.now(),
  };
  const nextLeaderboard = [nextEntry, ...leaderboard]
    .sort((left, right) => right.score - left.score || right.createdAt - left.createdAt)
    .slice(0, MAX_LEADERBOARD_ENTRIES);
  writeJson(LEADERBOARD_STORAGE_KEY, nextLeaderboard);
  return nextLeaderboard;
}

export function clearLeaderboard(): LeaderboardEntry[] {
  writeJson(LEADERBOARD_STORAGE_KEY, []);
  return [];
}

export function normalizePlayerName(name: string): string {
  const normalized = name.trim().replace(/\s+/g, ' ').slice(0, 18);
  return normalized || DEFAULT_PLAYER_NAME;
}

function normalizeProfile(stored?: Partial<PlayerProfile> | null): PlayerProfile {
  const id = typeof stored?.id === 'string' && stored.id ? stored.id : `player-${Date.now()}-${Math.round(Math.random() * 100000)}`;
  return {
    id,
    name: normalizePlayerName(typeof stored?.name === 'string' ? stored.name : DEFAULT_PLAYER_NAME),
    totalRuns: Math.max(0, Math.round(Number(stored?.totalRuns ?? 0))),
    bestScore: Math.max(0, Math.round(Number(stored?.bestScore ?? 0))),
  };
}

function isLeaderboardEntry(value: unknown): value is LeaderboardEntry {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const entry = value as LeaderboardEntry;
  return typeof entry.id === 'string'
    && typeof entry.playerName === 'string'
    && Number.isFinite(entry.score)
    && Number.isFinite(entry.day)
    && Number.isFinite(entry.treated)
    && Number.isFinite(entry.reputation)
    && isDifficulty(entry.difficulty)
    && Number.isFinite(entry.createdAt);
}

function isDifficulty(value: unknown): value is DifficultyId {
  return value === 'cozy' || value === 'classic' || value === 'expert';
}

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : null;
  } catch {
    return null;
  }
}

function writeJson<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Local persistence is optional; the in-memory game still works.
  }
}
