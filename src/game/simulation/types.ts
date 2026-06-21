export type RoomKind = 'exam' | 'grooming' | 'lab' | 'recovery';

export type PetKind = 'dog' | 'cat' | 'rabbit' | 'parrot';

export type PatientStatus = 'entering' | 'waiting' | 'toRoom' | 'treating' | 'leaving';

export type StaffRole = 'vet' | 'nurse' | 'tech';

export type StaffMode = 'working' | 'resting';

export type EventMood = 'good' | 'neutral' | 'warning';

export type SkillId = 'calmHands' | 'fastDiagnosis' | 'sparkleCare' | 'routingSense';

export type HospitalFxKind = 'build' | 'heal' | 'upgrade' | 'skill' | 'warning';

export type Locale = 'en' | 'zh';

export type ObjectiveKind = 'treatPets' | 'buildRoomKind' | 'upgradeRoom' | 'reachReputation' | 'reachCareStreak' | 'upgradeWaitingComfort' | 'earnRevenueToday' | 'hireStaff' | 'reachScore' | 'treatUrgentPets' | 'completeContracts' | 'unlockMap';

export type TreatmentGrade = 'excellent' | 'good' | 'rough';

export type PatientPriority = 'normal' | 'urgent' | 'vip';

export type CarePolicy = 'balanced' | 'express' | 'comfort';

export type DifficultyId = 'cozy' | 'classic' | 'expert';

export type MapId = 'gardenClinic' | 'downtownRescue' | 'beachsideSpa' | 'mountainEmergency';

export type PetTemperament = 'brave' | 'shy' | 'playful' | 'fussy';

export type HospitalIncidentKind = 'rescueRush' | 'vipInspection' | 'equipmentFault' | 'comfortVisit';

export type HudSectionId = 'map' | 'leaderboard' | 'contracts' | 'staff' | 'reports';

export interface RoomDefinition {
  kind: RoomKind;
  title: string;
  shortTitle: string;
  description: string;
  icon: string;
  cost: number;
  upkeep: number;
  width: number;
  height: number;
  treatmentSeconds: number;
  revenueBonus: number;
  color: number;
  accent: number;
}

export interface IllnessDefinition {
  id: string;
  title: string;
  requiredRoom: RoomKind;
  value: number;
  patienceSeconds: number;
}

export interface GridConfig {
  columns: number;
  rows: number;
  tileSize: number;
}

export interface RoomState {
  id: string;
  kind: RoomKind;
  gridX: number;
  gridY: number;
  width: number;
  height: number;
  level: number;
  assignedStaffId?: string;
  currentPatientId?: string;
  carePolicy: CarePolicy;
  patientsTreated: number;
  cleanliness: number;
  cleaningCooldown: number;
}

export interface StaffState {
  id: string;
  name: string;
  role: StaffRole;
  specialty: RoomKind | 'all';
  mode: StaffMode;
  assignedRoomId?: string;
  energy: number;
  level: number;
  xp: number;
  skillPoints: number;
  skills: Partial<Record<SkillId, number>>;
}

export interface PatientPathStep {
  x: number;
  y: number;
}

export interface PatientState {
  id: string;
  name: string;
  petKind: PetKind;
  temperament: PetTemperament;
  story: string;
  priority: PatientPriority;
  illnessId: string;
  requiredRoom: RoomKind;
  status: PatientStatus;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  path: PatientPathStep[];
  pathIndex: number;
  maxPatience: number;
  patience: number;
  treatmentRemaining: number;
  triageBoost: boolean;
  assignedRoomId?: string;
}

export interface HospitalIncidentState {
  id: number;
  kind: HospitalIncidentKind;
  title: string;
  description: string;
  remainingSeconds: number;
  progress: number;
  target: number;
  rewardMoney: number;
  rewardReputation: number;
  rewardScore: number;
  penaltyReputation: number;
  completed: boolean;
}

export interface HospitalEvent {
  id: number;
  mood: EventMood;
  message: string;
}

export interface HospitalMetrics {
  treatedToday: number;
  lostToday: number;
  totalTreated: number;
  urgentTreated: number;
  revenueToday: number;
  bestQualityToday: number;
  careStreak: number;
  bestCareStreak: number;
  score: number;
  bestScore: number;
}

export interface DifficultyDefinition {
  id: DifficultyId;
  startingMoney: number;
  startingReputation: number;
  spawnMultiplier: number;
  patienceMultiplier: number;
  upkeepMultiplier: number;
  scoreMultiplier: number;
  pressureMultiplier: number;
}

export interface MapDefinition {
  id: MapId;
  chapter: number;
  unlockWave: number;
  title: string;
  subtitle: string;
  description: string;
  palette: {
    background: number;
    border: number;
    header: number;
    footer: number;
    route: number;
    accent: number;
    waiting: number;
  };
  entrance: PatientPathStep;
  exit: PatientPathStep;
  waitingSpots: PatientPathStep[];
  corridorRows: number[];
  corridorColumns: number[];
  waitingArea: { x: number; y: number; width: number; height: number };
  startingRooms: Array<{ kind: RoomKind; gridX: number; gridY: number }>;
  decorations: PatientPathStep[];
  spawnDelayMultiplier: number;
  patienceMultiplier: number;
  revenueMultiplier: number;
  pressureMultiplier: number;
  upkeepMultiplier: number;
  urgentBias: number;
  scoreMultiplier: number;
}

export interface MapProgressState {
  activeMapId: MapId;
  highestUnlockedChapter: number;
  unlockedMapIds: MapId[];
}

export interface PlayerProfile {
  id: string;
  name: string;
  totalRuns: number;
  bestScore: number;
}

export interface LeaderboardEntry {
  id: string;
  playerName: string;
  score: number;
  day: number;
  treated: number;
  reputation: number;
  difficulty: DifficultyId;
  createdAt: number;
}

export interface FacilityState {
  waitingComfortLevel: number;
}

export interface DailyReport {
  id: number;
  day: number;
  treated: number;
  lost: number;
  revenue: number;
  bestQuality: number;
  reputation: number;
}

export type ContractKind = 'rushCare' | 'vipWellness' | 'cleanShift' | 'trainingDay';

export interface HospitalLevelState {
  level: number;
  title: string;
  xp: number;
  nextXp: number;
}

export interface HospitalContract {
  id: string;
  kind: ContractKind;
  target: number;
  progress: number;
  rewardMoney: number;
  rewardReputation: number;
  rewardScore: number;
  active: boolean;
  completed: boolean;
}

export interface HospitalFxEvent {
  id: number;
  kind: HospitalFxKind;
  x: number;
  y: number;
  label?: string;
}

export interface HospitalObjective {
  id: string;
  kind: ObjectiveKind;
  wave: number;
  target: number;
  progress: number;
  rewardMoney: number;
  rewardReputation: number;
  completed: boolean;
  roomKind?: RoomKind;
}

export interface TreatmentReport {
  id: number;
  patientName: string;
  petKind: PetKind;
  temperament: PetTemperament;
  story: string;
  roomKind: RoomKind;
  grade: TreatmentGrade;
  score: number;
  revenue: number;
  bonus: number;
  carePolicy: CarePolicy;
  streak: number;
  stars: number;
}

export interface GameState {
  grid: GridConfig;
  money: number;
  reputation: number;
  day: number;
  clock: number;
  paused: boolean;
  speed: number;
  locale: Locale;
  difficulty: DifficultyId;
  mapProgress: MapProgressState;
  player: PlayerProfile;
  leaderboard: LeaderboardEntry[];
  selectedRoomKind: RoomKind;
  inspectedRoomId?: string;
  inspectedPatientId?: string;
  rooms: RoomState[];
  staff: StaffState[];
  patients: PatientState[];
  events: HospitalEvent[];
  fxEvents: HospitalFxEvent[];
  objectives: HospitalObjective[];
  objectiveWave: number;
  hospitalLevel: HospitalLevelState;
  contracts: HospitalContract[];
  completedContracts: number;
  treatmentReports: TreatmentReport[];
  dailyReports: DailyReport[];
  facilities: FacilityState;
  metrics: HospitalMetrics;
  activeIncident?: HospitalIncidentState;
  incidentTimer: number;
  hudCollapsed: Partial<Record<HudSectionId, boolean>>;
  queuePressure: number;
  rushTimer: number;
  rushActiveSeconds: number;
  nextRoomId: number;
  nextPatientId: number;
  nextStaffId: number;
  nextEventId: number;
  nextFxId: number;
  spawnTimer: number;
}

export type HospitalAction =
  | { type: 'buildRoom'; gridX: number; gridY: number }
  | { type: 'selectRoomKind'; kind: RoomKind }
  | { type: 'inspectRoom'; roomId?: string }
  | { type: 'inspectPatient'; patientId?: string }
  | { type: 'soothePatient'; patientId: string }
  | { type: 'prioritizePatient'; patientId: string }
  | { type: 'upgradeWaitingComfort' }
  | { type: 'upgradeRoom'; roomId: string }
  | { type: 'cleanRoom'; roomId: string }
  | { type: 'setCarePolicy'; roomId: string; policy: CarePolicy }
  | { type: 'assignStaffToRoom'; staffId: string; roomId: string }
  | { type: 'restStaff'; staffId: string }
  | { type: 'resumeStaff'; staffId: string }
  | { type: 'trainStaff'; staffId: string; skillId: SkillId }
  | { type: 'hireStaff' }
  | { type: 'togglePause' }
  | { type: 'setPaused'; paused: boolean }
  | { type: 'setSpeed'; speed: number }
  | { type: 'setLocale'; locale: Locale }
  | { type: 'setDifficulty'; difficulty: DifficultyId }
  | { type: 'selectMap'; mapId: MapId }
  | { type: 'toggleHudSection'; section: HudSectionId }
  | { type: 'setPlayerName'; name: string }
  | { type: 'saveScore' }
  | { type: 'clearLeaderboard' }
  | { type: 'startContract'; contractId: string }
  | { type: 'restart' };

export interface BuildPreview {
  ok: boolean;
  reason?: string;
}
