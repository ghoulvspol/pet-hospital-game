import { ILLNESSES, MAX_ROOM_LEVEL, PET_KINDS, PET_NAMES, ROOM_DEFINITIONS, SKILL_DEFINITIONS, STAFF_NAMES } from './content';
import { clearLeaderboard, loadLeaderboard, loadPlayerProfile, recordLeaderboardEntry, savePlayerProfile, updatePlayerName } from './playerProgress';
import { createPathToPoint, createPathToRoom } from './systems/pathfinding';
import { DEFAULT_LOCALE, getIllnessTitle, getObjectiveTitle, getRoomText, getSkillText, getTranslations } from '../../i18n/translations';
import type {
  BuildPreview,
  DifficultyDefinition,
  DifficultyId,
  GameState,
  HospitalAction,
  HospitalContract,
  HospitalEvent,
  HospitalFxKind,
  HospitalObjective,
  IllnessDefinition,
  Locale,
  CarePolicy,
  PatientState,
  RoomKind,
  RoomState,
  SkillId,
  StaffRole,
  StaffState,
  PatientPriority,
  TreatmentGrade,
  ContractKind,
} from './types';

const ENTRANCE = { x: 1, y: 7 };
const EXIT = { x: 1, y: 7 };
const WAITING_SPOTS = [
  { x: 4, y: 4 },
  { x: 4, y: 5 },
  { x: 4, y: 6 },
  { x: 4, y: 7 },
  { x: 4, y: 8 },
  { x: 4, y: 9 },
];

const INITIAL_STAFF: Array<Pick<StaffState, 'name' | 'role' | 'specialty'>> = [
  { name: 'Dr. Mira', role: 'vet', specialty: 'exam' },
  { name: 'Nurse Jun', role: 'nurse', specialty: 'all' },
];

const CLEANING_COST = 45;
const STAFF_REST_ENERGY_TARGET = 82;
const SOOTHE_COST = 32;
const MAX_WAITING_COMFORT_LEVEL = 3;
const MAX_ACTIVE_CONTRACTS = 2;

export const DIFFICULTY_DEFINITIONS: Record<DifficultyId, DifficultyDefinition> = {
  cozy: {
    id: 'cozy',
    startingMoney: 980,
    startingReputation: 62,
    spawnMultiplier: 1.2,
    patienceMultiplier: 1.16,
    upkeepMultiplier: 0.86,
    scoreMultiplier: 0.86,
    pressureMultiplier: 0.84,
  },
  classic: {
    id: 'classic',
    startingMoney: 820,
    startingReputation: 55,
    spawnMultiplier: 1,
    patienceMultiplier: 1,
    upkeepMultiplier: 1,
    scoreMultiplier: 1,
    pressureMultiplier: 1,
  },
  expert: {
    id: 'expert',
    startingMoney: 640,
    startingReputation: 47,
    spawnMultiplier: 0.76,
    patienceMultiplier: 0.78,
    upkeepMultiplier: 1.22,
    scoreMultiplier: 1.34,
    pressureMultiplier: 1.18,
  },
};

export class HospitalSimulation extends EventTarget {
  private state: GameState;

  public constructor(locale: Locale = DEFAULT_LOCALE) {
    super();
    this.state = createInitialState(locale);
  }

  public getState(): GameState {
    return this.state;
  }

  public dispatch(action: HospitalAction): void {
    if (action.type === 'restart') {
      const locale = this.state.locale;
      const difficulty = this.state.difficulty;
      const player = this.state.player;
      const leaderboard = this.state.leaderboard;
      this.state = createInitialState(locale, difficulty, player, leaderboard);
      this.state.player.totalRuns += 1;
      savePlayerProfile(this.state.player);
      this.emit();
      return;
    }

    if (action.type === 'togglePause') {
      this.state.paused = !this.state.paused;
      this.emit();
      return;
    }

    if (action.type === 'setPaused') {
      this.state.paused = action.paused;
      this.emit();
      return;
    }

    if (action.type === 'setSpeed') {
      this.state.speed = clamp(action.speed, 1, 3);
      this.emit();
      return;
    }

    if (action.type === 'setLocale') {
      this.setLocale(action.locale);
      this.emit();
      return;
    }

    if (action.type === 'setDifficulty') {
      this.setDifficulty(action.difficulty);
      this.emit();
      return;
    }

    if (action.type === 'setPlayerName') {
      this.state.player = updatePlayerName(this.state.player, action.name);
      this.pushEvent(getTranslations(this.state.locale).events.playerRenamed(this.state.player.name), 'good');
      this.emit();
      return;
    }

    if (action.type === 'saveScore') {
      this.saveScore();
      this.emit();
      return;
    }

    if (action.type === 'clearLeaderboard') {
      this.state.leaderboard = clearLeaderboard();
      this.pushEvent(getTranslations(this.state.locale).events.leaderboardCleared, 'neutral');
      this.emit();
      return;
    }

    if (action.type === 'startContract') {
      this.startContract(action.contractId);
      this.emit();
      return;
    }

    if (action.type === 'selectRoomKind') {
      this.state.selectedRoomKind = action.kind;
      this.emit();
      return;
    }

    if (action.type === 'inspectRoom') {
      this.state.inspectedRoomId = action.roomId;
      this.state.inspectedPatientId = undefined;
      this.emit();
      return;
    }

    if (action.type === 'inspectPatient') {
      this.state.inspectedPatientId = action.patientId;
      this.state.inspectedRoomId = undefined;
      this.emit();
      return;
    }

    if (action.type === 'soothePatient') {
      this.soothePatient(action.patientId);
      this.emit();
      return;
    }

    if (action.type === 'prioritizePatient') {
      this.prioritizePatient(action.patientId);
      this.emit();
      return;
    }

    if (action.type === 'upgradeWaitingComfort') {
      this.upgradeWaitingComfort();
      this.emit();
      return;
    }

    if (action.type === 'buildRoom') {
      this.buildSelectedRoom(action.gridX, action.gridY);
      this.emit();
      return;
    }

    if (action.type === 'upgradeRoom') {
      this.upgradeRoom(action.roomId);
      this.emit();
      return;
    }

    if (action.type === 'cleanRoom') {
      this.cleanRoom(action.roomId);
      this.emit();
      return;
    }

    if (action.type === 'setCarePolicy') {
      this.setCarePolicy(action.roomId, action.policy);
      this.emit();
      return;
    }

    if (action.type === 'assignStaffToRoom') {
      this.assignStaffManually(action.staffId, action.roomId);
      this.emit();
      return;
    }

    if (action.type === 'restStaff') {
      this.restStaff(action.staffId);
      this.emit();
      return;
    }

    if (action.type === 'resumeStaff') {
      this.resumeStaff(action.staffId);
      this.emit();
      return;
    }

    if (action.type === 'trainStaff') {
      this.trainStaff(action.staffId, action.skillId);
      this.emit();
      return;
    }

    if (action.type === 'hireStaff') {
      this.hireStaff();
      this.emit();
    }
  }

  private setLocale(locale: Locale): void {
    this.state.locale = locale;
    this.state.events = createInitialEvents(this.state);
  }

  private setDifficulty(difficulty: DifficultyId): void {
    if (this.state.difficulty === difficulty) {
      return;
    }

    const locale = this.state.locale;
    const player = this.state.player;
    const leaderboard = this.state.leaderboard;
    this.state = createInitialState(locale, difficulty, player, leaderboard);
    this.state.player.totalRuns += 1;
    savePlayerProfile(this.state.player);
    this.pushEvent(getTranslations(this.state.locale).events.difficultyChanged(getTranslations(this.state.locale).difficulties[difficulty].title), 'good');
  }

  private saveScore(): void {
    const score = Math.round(this.state.metrics.score);
    if (score <= 0) {
      this.pushEvent(getTranslations(this.state.locale).events.scoreTooLow, 'neutral');
      return;
    }

    this.state.player.bestScore = Math.max(this.state.player.bestScore, score);
    savePlayerProfile(this.state.player);
    this.state.leaderboard = recordLeaderboardEntry({
      playerName: this.state.player.name,
      score,
      day: this.state.day,
      treated: this.state.metrics.totalTreated,
      reputation: Math.round(this.state.reputation),
      difficulty: this.state.difficulty,
    });
    this.pushFx('skill', 2.2, 2.2, getTranslations(this.state.locale).fx.scoreSaved);
    this.pushEvent(getTranslations(this.state.locale).events.scoreSaved(score), 'good');
  }

  private startContract(contractId: string): void {
    const contract = this.state.contracts.find((candidate) => candidate.id === contractId);
    if (!contract || contract.completed || contract.active) {
      return;
    }

    const activeContracts = this.state.contracts.filter((candidate) => candidate.active && !candidate.completed).length;
    if (activeContracts >= MAX_ACTIVE_CONTRACTS) {
      this.pushEvent(getTranslations(this.state.locale).events.contractSlotsFull, 'warning');
      return;
    }

    contract.active = true;
    contract.progress = getContractProgress(this.state, contract);
    if (contract.progress >= contract.target) {
      this.completeContract(contract);
      this.updateObjectiveProgress();
      return;
    }
    this.pushFx('skill', 5, 2.6, getTranslations(this.state.locale).fx.contract);
    this.pushEvent(getTranslations(this.state.locale).events.contractStarted(getContractTitle(contract.kind, this.state.locale)), 'good');
  }

  public update(deltaSeconds: number): void {
    if (this.state.paused) {
      return;
    }

    const scaledDelta = deltaSeconds * this.state.speed;
    this.updatePressureAndRush(scaledDelta);
    this.state.clock += scaledDelta;
    if (this.state.clock >= 100) {
      this.recordDailyReport();
      this.state.clock = 0;
      this.state.day += 1;
      this.state.metrics.treatedToday = 0;
      this.state.metrics.lostToday = 0;
      this.state.metrics.revenueToday = 0;
      this.state.metrics.bestQualityToday = 0;
      this.chargeUpkeep();
    }

    this.state.spawnTimer -= scaledDelta;
    if (this.state.spawnTimer <= 0) {
      this.spawnPatient();
      this.state.spawnTimer = this.getNextSpawnDelay();
    }

    this.assignStaffToRooms();
    this.assignPatientsToRooms();
    this.updatePatients(scaledDelta);
    this.updateRooms(scaledDelta);
    this.emit();
  }

  public previewBuild(gridX: number, gridY: number, kind = this.state.selectedRoomKind): BuildPreview {
    const definition = ROOM_DEFINITIONS[kind];
    const text = getTranslations(this.state.locale).events;
    if (this.state.money < definition.cost) {
      return { ok: false, reason: text.needMoney(definition.cost) };
    }

    if (!isInsideGrid(this.state, gridX, gridY, definition.width, definition.height)) {
      return { ok: false, reason: text.outOfBounds };
    }

    if (gridX < 3 && gridY > 4) {
      return { ok: false, reason: text.keepEntryClear };
    }

    if (this.state.rooms.some((room) => rectanglesOverlap(gridX, gridY, definition.width, definition.height, room))) {
      return { ok: false, reason: text.spaceOccupied };
    }

    return { ok: true };
  }

  private buildSelectedRoom(gridX: number, gridY: number): void {
    const kind = this.state.selectedRoomKind;
    const preview = this.previewBuild(gridX, gridY, kind);
    if (!preview.ok) {
      this.pushEvent(preview.reason ?? getTranslations(this.state.locale).events.cannotBuild, 'warning');
      this.pushFx('warning', gridX + 1, gridY + 1, preview.reason);
      return;
    }

    const definition = ROOM_DEFINITIONS[kind];
    const room: RoomState = {
      id: `room-${this.state.nextRoomId++}`,
      kind,
      gridX,
      gridY,
      width: definition.width,
      height: definition.height,
      level: 1,
      carePolicy: 'balanced',
      patientsTreated: 0,
      cleanliness: 100,
      cleaningCooldown: 0,
    };

    this.state.rooms.push(room);
    this.state.money -= definition.cost;
    this.state.inspectedRoomId = room.id;
    this.updateObjectiveProgress();
    this.pushFx('build', room.gridX + room.width / 2, room.gridY + room.height / 2, getTranslations(this.state.locale).fx.roomBuilt);
    this.pushEvent(getTranslations(this.state.locale).events.roomOpened(getRoomText(definition, this.state.locale).title), 'good');
  }

  private soothePatient(patientId: string): void {
    const patient = this.state.patients.find((candidate) => candidate.id === patientId);
    if (!patient || patient.status === 'leaving' || patient.status === 'treating') {
      return;
    }

    if (patient.patience >= patient.maxPatience * 0.92) {
      this.pushEvent(getTranslations(this.state.locale).events.patientAlreadyCalm(patient.name), 'neutral');
      return;
    }

    if (this.state.money < SOOTHE_COST) {
      this.pushEvent(getTranslations(this.state.locale).events.needMoney(SOOTHE_COST), 'warning');
      this.pushFx('warning', patient.x, patient.y, getTranslations(this.state.locale).fx.needMoney);
      return;
    }

    this.state.money -= SOOTHE_COST;
    patient.patience = clamp(patient.patience + patient.maxPatience * 0.34, 0, patient.maxPatience);
    this.pushFx('skill', patient.x, patient.y, getTranslations(this.state.locale).fx.soothed);
    this.pushEvent(getTranslations(this.state.locale).events.patientSoothed(patient.name), 'good');
  }

  private prioritizePatient(patientId: string): void {
    const patient = this.state.patients.find((candidate) => candidate.id === patientId);
    if (!patient || patient.status !== 'waiting') {
      return;
    }

    if (patient.triageBoost) {
      this.pushEvent(getTranslations(this.state.locale).events.patientAlreadyPrioritized(patient.name), 'neutral');
      return;
    }

    patient.triageBoost = true;
    patient.patience = clamp(patient.patience + patient.maxPatience * 0.12, 0, patient.maxPatience);
    this.pushFx('skill', patient.x, patient.y, getTranslations(this.state.locale).fx.prioritized);
    this.pushEvent(getTranslations(this.state.locale).events.patientPrioritized(patient.name), 'good');
  }

  private upgradeWaitingComfort(): void {
    const currentLevel = this.state.facilities.waitingComfortLevel;
    if (currentLevel >= MAX_WAITING_COMFORT_LEVEL) {
      this.pushEvent(getTranslations(this.state.locale).events.waitingComfortMaxed, 'neutral');
      return;
    }

    const cost = getWaitingComfortUpgradeCost(currentLevel);
    if (this.state.money < cost) {
      this.pushEvent(getTranslations(this.state.locale).events.needMoney(cost), 'warning');
      this.pushFx('warning', 4.5, 5.5, getTranslations(this.state.locale).fx.needMoney);
      return;
    }

    this.state.money -= cost;
    this.state.facilities.waitingComfortLevel += 1;
    this.pushFx('upgrade', 4.5, 5.5, getTranslations(this.state.locale).fx.comfort);
    this.pushEvent(getTranslations(this.state.locale).events.waitingComfortUpgraded(this.state.facilities.waitingComfortLevel), 'good');
  }

  private upgradeRoom(roomId: string): void {
    const room = this.state.rooms.find((candidate) => candidate.id === roomId);
    if (!room) {
      return;
    }

    if (room.level >= MAX_ROOM_LEVEL) {
      this.pushEvent(getTranslations(this.state.locale).events.roomFullUpgrade, 'neutral');
      return;
    }

    const cost = getRoomUpgradeCost(room);
    if (this.state.money < cost) {
      this.pushEvent(getTranslations(this.state.locale).events.needMoney(cost), 'warning');
      this.pushFx('warning', room.gridX + room.width / 2, room.gridY + room.height / 2, getTranslations(this.state.locale).fx.needMoney);
      return;
    }

    room.level += 1;
    room.cleanliness = 100;
    this.state.money -= cost;
    this.updateObjectiveProgress();
    this.pushFx('upgrade', room.gridX + room.width / 2, room.gridY + room.height / 2, getTranslations(this.state.locale).fx.roomLevel(room.level));
    this.pushEvent(getTranslations(this.state.locale).events.roomUpgrade(getRoomText(room, this.state.locale).shortTitle, room.level), 'good');
  }

  private cleanRoom(roomId: string): void {
    const room = this.state.rooms.find((candidate) => candidate.id === roomId);
    if (!room) {
      return;
    }

    if (room.cleanliness >= 92) {
      this.pushEvent(getTranslations(this.state.locale).events.roomTooClean, 'neutral');
      return;
    }

    if (this.state.money < CLEANING_COST) {
      this.pushEvent(getTranslations(this.state.locale).events.needMoney(CLEANING_COST), 'warning');
      this.pushFx('warning', room.gridX + room.width / 2, room.gridY + room.height / 2, getTranslations(this.state.locale).fx.needMoney);
      return;
    }

    this.state.money -= CLEANING_COST;
    room.cleanliness = 100;
    room.cleaningCooldown = 10;
    this.updateContractProgress();
    this.pushFx('skill', room.gridX + room.width / 2, room.gridY + room.height / 2, getTranslations(this.state.locale).fx.cleaned);
    this.pushEvent(getTranslations(this.state.locale).events.roomCleaned(getRoomText(room, this.state.locale).shortTitle), 'good');
  }

  private setCarePolicy(roomId: string, policy: CarePolicy): void {
    const room = this.state.rooms.find((candidate) => candidate.id === roomId);
    if (!room || room.carePolicy === policy) {
      return;
    }

    room.carePolicy = policy;
    this.pushFx('skill', room.gridX + room.width / 2, room.gridY + room.height / 2, getTranslations(this.state.locale).carePolicies[policy].shortTitle);
    this.pushEvent(getTranslations(this.state.locale).events.carePolicyChanged(getRoomText(room, this.state.locale).shortTitle, getTranslations(this.state.locale).carePolicies[policy].title), 'neutral');
  }

  private assignStaffManually(staffId: string, roomId: string): void {
    const staff = this.state.staff.find((candidate) => candidate.id === staffId);
    const room = this.state.rooms.find((candidate) => candidate.id === roomId);
    if (!staff || !room) {
      return;
    }

    if (staff.specialty !== 'all' && staff.specialty !== room.kind) {
      this.pushEvent(getTranslations(this.state.locale).events.staffSpecialtyMismatch(staff.name, getRoomText(room, this.state.locale).shortTitle), 'warning');
      this.pushFx('warning', room.gridX + room.width / 2, room.gridY + room.height / 2, getTranslations(this.state.locale).fx.wrongSpecialty);
      return;
    }

    const previousRoom = staff.assignedRoomId ? this.state.rooms.find((candidate) => candidate.id === staff.assignedRoomId) : undefined;
    if (previousRoom?.assignedStaffId === staff.id) {
      previousRoom.assignedStaffId = undefined;
    }

    const displacedStaff = room.assignedStaffId ? this.state.staff.find((candidate) => candidate.id === room.assignedStaffId) : undefined;
    if (displacedStaff) {
      displacedStaff.assignedRoomId = undefined;
    }

    staff.mode = 'working';
    staff.assignedRoomId = room.id;
    room.assignedStaffId = staff.id;
    this.pushFx('skill', room.gridX + room.width / 2, room.gridY + room.height / 2, getTranslations(this.state.locale).fx.assigned);
    this.pushEvent(getTranslations(this.state.locale).events.staffAssigned(staff.name, getRoomText(room, this.state.locale).shortTitle), 'good');
  }

  private restStaff(staffId: string): void {
    const staff = this.state.staff.find((candidate) => candidate.id === staffId);
    if (!staff) {
      return;
    }

    const room = staff.assignedRoomId ? this.state.rooms.find((candidate) => candidate.id === staff.assignedRoomId) : undefined;
    if (room?.assignedStaffId === staff.id) {
      room.assignedStaffId = undefined;
    }
    staff.assignedRoomId = undefined;
    staff.mode = 'resting';
    this.pushFx('skill', 2 + this.state.staff.indexOf(staff), 2, getTranslations(this.state.locale).fx.resting);
    this.pushEvent(getTranslations(this.state.locale).events.staffResting(staff.name), 'neutral');
  }

  private resumeStaff(staffId: string): void {
    const staff = this.state.staff.find((candidate) => candidate.id === staffId);
    if (!staff) {
      return;
    }

    staff.mode = 'working';
    this.assignStaffToRooms();
    this.pushEvent(getTranslations(this.state.locale).events.staffResumed(staff.name), 'good');
  }

  private trainStaff(staffId: string, skillId: SkillId): void {
    const staff = this.state.staff.find((candidate) => candidate.id === staffId);
    const definition = SKILL_DEFINITIONS[skillId];
    if (!staff) {
      return;
    }

    const currentRank = staff.skills[skillId] ?? 0;
    if (currentRank >= definition.maxRank) {
      this.pushEvent(getTranslations(this.state.locale).events.skillMastered(staff.name, getSkillText(skillId, this.state.locale).title), 'neutral');
      return;
    }

    if (staff.skillPoints <= 0) {
      this.pushEvent(getTranslations(this.state.locale).events.needsSkillPoint(staff.name), 'warning');
      this.pushFx('warning', 3, 2, getTranslations(this.state.locale).fx.noSkillPoints);
      return;
    }

    staff.skills[skillId] = currentRank + 1;
    staff.skillPoints -= 1;
    this.updateContractProgress();
    this.pushFx('skill', 2 + this.state.staff.indexOf(staff), 2, definition.icon);
    this.pushEvent(getTranslations(this.state.locale).events.skillTrained(staff.name, getSkillText(skillId, this.state.locale).title, currentRank + 1), 'good');
  }

  private hireStaff(): void {
    const cost = 160 + this.state.staff.length * 45;
    if (this.state.money < cost) {
      this.pushEvent(getTranslations(this.state.locale).events.needMoney(cost), 'warning');
      this.pushFx('warning', 3, 2, getTranslations(this.state.locale).fx.needMoney);
      return;
    }

    const roleCycle: StaffRole[] = ['vet', 'nurse', 'tech'];
    const role = roleCycle[this.state.staff.length % roleCycle.length];
    const specialtyOptions: StaffState['specialty'][] = ['exam', 'grooming', 'lab', 'recovery', 'all'];
    const specialty = specialtyOptions[(this.state.staff.length + 1) % specialtyOptions.length];
    const name = STAFF_NAMES[this.state.nextStaffId % STAFF_NAMES.length];
    const staff: StaffState = createStaff(`staff-${this.state.nextStaffId++}`, name, role, specialty);

    this.state.staff.push(staff);
    this.state.money -= cost;
    this.pushFx('skill', 3, 2, getTranslations(this.state.locale).fx.staffHired);
    this.pushEvent(getTranslations(this.state.locale).events.staffJoined(name), 'good');
  }

  private spawnPatient(): void {
    const availableIllnesses = ILLNESSES.filter((illness) =>
      this.state.rooms.some((room) => room.kind === illness.requiredRoom),
    );
    const illnessPool = availableIllnesses.length > 0 ? availableIllnesses : ILLNESSES.filter((illness) => illness.requiredRoom === 'exam');
    const illness = pick(illnessPool);
    const waitingSpot = WAITING_SPOTS[this.state.patients.length % WAITING_SPOTS.length];
    const petKind = pick(PET_KINDS);
    const priority = rollPatientPriority(this.state.reputation, this.state.rushActiveSeconds > 0);
    const patienceSeconds = Math.max(11, illness.patienceSeconds * getPriorityPatienceMultiplier(priority) * getDifficulty(this.state).patienceMultiplier);
    const patient: PatientState = {
      id: `patient-${this.state.nextPatientId++}`,
      name: pick(PET_NAMES),
      petKind,
      priority,
      illnessId: illness.id,
      requiredRoom: illness.requiredRoom,
      status: 'entering',
      x: ENTRANCE.x,
      y: ENTRANCE.y,
      targetX: waitingSpot.x,
      targetY: waitingSpot.y,
      path: createPathToPoint(this.state, ENTRANCE.x, ENTRANCE.y, waitingSpot.x, waitingSpot.y),
      pathIndex: 0,
      maxPatience: patienceSeconds,
      patience: patienceSeconds,
      treatmentRemaining: getRoomDefinition(illness).treatmentSeconds * getPriorityTreatmentMultiplier(priority),
      triageBoost: false,
    };
    setPatientTargetFromPath(patient);

    this.state.patients.push(patient);
    this.pushEvent(getTranslations(this.state.locale).events.patientArrived(patient.name, getIllnessTitle(illness, this.state.locale)), 'neutral');
  }

  private assignStaffToRooms(): void {
    for (const staff of this.state.staff) {
      if (staff.mode === 'resting') {
        continue;
      }

      const assignedRoom = staff.assignedRoomId ? this.state.rooms.find((room) => room.id === staff.assignedRoomId) : undefined;
      if (assignedRoom) {
        continue;
      }

      const room = this.state.rooms.find((candidate) => {
        const specialtyMatches = staff.specialty === 'all' || staff.specialty === candidate.kind;
        return specialtyMatches && !candidate.assignedStaffId;
      });

      if (room) {
        room.assignedStaffId = staff.id;
        staff.assignedRoomId = room.id;
      }
    }
  }

  private assignPatientsToRooms(): void {
    const waitingPatients = [...this.state.patients]
      .filter((patient) => patient.status === 'waiting')
      .sort((left, right) => getPatientPriorityWeight(right) - getPatientPriorityWeight(left));

    for (const patient of waitingPatients) {
      if (patient.status !== 'waiting') {
        continue;
      }

      const room = this.state.rooms.find(
        (candidate) => candidate.kind === patient.requiredRoom && candidate.assignedStaffId && !candidate.currentPatientId,
      );

      if (!room) {
        continue;
      }
      patient.status = 'toRoom';
      patient.assignedRoomId = room.id;
      patient.path = createPathToRoom(this.state, patient.x, patient.y, room);
      patient.pathIndex = 0;
      setPatientTargetFromPath(patient);
      room.currentPatientId = patient.id;
    }
  }

  private updatePatients(deltaSeconds: number): void {
    for (const patient of this.state.patients) {
      if (patient.status === 'entering' || patient.status === 'waiting' || patient.status === 'toRoom') {
        patient.patience -= deltaSeconds * this.getPatienceDrain(patient);
      }

      if (patient.status !== 'treating') {
        movePatient(patient, deltaSeconds, this.getMovementBoost(patient));
      }

      if (patient.status === 'entering' && reachedTarget(patient) && patient.pathIndex >= patient.path.length - 1) {
        patient.status = 'waiting';
      }

      if (patient.status === 'toRoom' && reachedTarget(patient) && patient.pathIndex >= patient.path.length - 1) {
        patient.status = 'treating';
      }

      if (patient.patience <= 0 && patient.status !== 'leaving') {
        this.releaseRoom(patient);
        patient.status = 'leaving';
        patient.path = createPathToPoint(this.state, patient.x, patient.y, EXIT.x, EXIT.y);
        patient.pathIndex = 0;
        setPatientTargetFromPath(patient);
        this.state.reputation = clamp(this.state.reputation - 4, 0, 100);
        this.state.metrics.lostToday += 1;
        this.state.metrics.careStreak = 0;
        this.updateObjectiveProgress();
        this.pushFx('warning', patient.x, patient.y, getTranslations(this.state.locale).fx.waitedTooLong);
        this.pushEvent(getTranslations(this.state.locale).events.patientLeft(patient.name), 'warning');
      }
    }

    this.state.patients = this.state.patients.filter((patient) => !(patient.status === 'leaving' && reachedTarget(patient) && patient.pathIndex >= patient.path.length - 1));
  }

  private updateRooms(deltaSeconds: number): void {
    for (const room of this.state.rooms) {
      room.cleaningCooldown = clamp(room.cleaningCooldown - deltaSeconds, 0, 999);
      const patient = room.currentPatientId ? this.state.patients.find((candidate) => candidate.id === room.currentPatientId) : undefined;
      const staff = room.assignedStaffId ? this.state.staff.find((candidate) => candidate.id === room.assignedStaffId) : undefined;
      if (!patient || patient.status !== 'treating') {
        if (staff) {
          staff.energy = clamp(staff.energy + deltaSeconds * 2.5, 0, 100);
        }
        continue;
      }

      const definition = ROOM_DEFINITIONS[room.kind];
      const roomBoost = 1 + (room.level - 1) * 0.18;
      const cleanlinessPenalty = 0.72 + room.cleanliness * 0.0036;
      const policy = getCarePolicyEffect(room.carePolicy);
      const diagnosisBoost = staff ? 1 + getSkillRank(staff, 'fastDiagnosis') * 0.12 : 1;
      const staffBoost = staff ? (1 + staff.energy / 220) * diagnosisBoost : 0.75;
      const sparkleCare = staff ? getSkillRank(staff, 'sparkleCare') : 0;
      patient.patience = clamp(patient.patience + deltaSeconds * policy.patienceRecovery, 0, patient.maxPatience);
      patient.treatmentRemaining -= deltaSeconds * staffBoost * roomBoost * cleanlinessPenalty * policy.speedMultiplier;
      room.cleanliness = clamp(room.cleanliness - deltaSeconds * (0.9 - sparkleCare * 0.16) * policy.cleanlinessMultiplier, 0, 100);
      if (staff) {
        staff.energy = clamp(staff.energy - deltaSeconds * 1.8 * policy.energyMultiplier, 0, 100);
      }

      if (patient.treatmentRemaining <= 0) {
        const illness = ILLNESSES.find((candidate) => candidate.id === patient.illnessId);
        const quality = calculateTreatmentQuality(patient, room, staff, this.state.difficulty);
        const baseRevenue = Math.round(((illness?.value ?? 60) + definition.revenueBonus + this.state.reputation * 0.25 + (room.level - 1) * 24 + sparkleCare * 12) * getPriorityRevenueMultiplier(patient.priority));
        const stars = getTreatmentStars(quality.score);
        const streak = quality.grade === 'rough' ? 0 : this.state.metrics.careStreak + 1;
        const streakBonus = getCareStreakBonus(baseRevenue, streak);
        const bonus = Math.round(baseRevenue * quality.bonusRate) + streakBonus;
        const revenue = baseRevenue + bonus;
        const scoreGain = calculateScoreGain(revenue, quality.score, stars, patient.priority, streak, this.state.difficulty);
        this.state.money += revenue;
        this.state.metrics.revenueToday += revenue;
        this.state.metrics.bestQualityToday = Math.max(this.state.metrics.bestQualityToday, quality.score);
        this.state.metrics.careStreak = streak;
        this.state.metrics.bestCareStreak = Math.max(this.state.metrics.bestCareStreak, streak);
        this.state.metrics.score += scoreGain;
        this.state.metrics.bestScore = Math.max(this.state.metrics.bestScore, this.state.metrics.score, this.state.player.bestScore);
        if (this.state.metrics.score > this.state.player.bestScore) {
          this.state.player.bestScore = Math.round(this.state.metrics.score);
          savePlayerProfile(this.state.player);
        }
        this.state.reputation = clamp(this.state.reputation + quality.reputationDelta, 0, 100);
        this.state.metrics.treatedToday += 1;
        this.state.metrics.totalTreated += 1;
        if (patient.priority === 'urgent') {
          this.state.metrics.urgentTreated += 1;
        }
        room.patientsTreated += 1;
        room.currentPatientId = undefined;
        this.recordTreatmentReport(patient, room, quality.grade, quality.score, revenue, bonus, streak, stars);
        if (staff) {
          this.awardStaffXp(staff, 42 + room.level * 8);
        }
        patient.status = 'leaving';
        patient.path = createPathToPoint(this.state, patient.x, patient.y, EXIT.x, EXIT.y);
        patient.pathIndex = 0;
        setPatientTargetFromPath(patient);
        this.awardHospitalXp(quality.score + stars * 14 + Math.round(scoreGain / 12));
        this.updateContractProgress();
        this.updateObjectiveProgress();
        this.pushFx('heal', patient.x, patient.y, `${'★'.repeat(stars)}|+$${revenue}|+${scoreGain}`);
        if (streak >= 3) {
          this.pushEvent(getTranslations(this.state.locale).events.careStreak(streak, streakBonus), 'good');
        }
        this.pushEvent(getTranslations(this.state.locale).events.patientRecoveredWithGrade(patient.name, getTranslations(this.state.locale).grades[quality.grade], revenue), quality.grade === 'rough' ? 'neutral' : 'good');
      }
    }

    for (const staff of this.state.staff) {
      if (staff.mode !== 'resting') {
        continue;
      }

      staff.energy = clamp(staff.energy + deltaSeconds * 7.5, 0, 100);
      if (staff.energy >= STAFF_REST_ENERGY_TARGET) {
        staff.mode = 'working';
        this.pushEvent(getTranslations(this.state.locale).events.staffReadyAgain(staff.name), 'good');
      }
    }
  }

  private recordTreatmentReport(patient: PatientState, room: RoomState, grade: TreatmentGrade, score: number, revenue: number, bonus: number, streak: number, stars: number): void {
    this.state.treatmentReports.unshift({
      id: this.state.nextEventId++,
      patientName: patient.name,
      petKind: patient.petKind,
      roomKind: room.kind,
      grade,
      score,
      revenue,
      bonus,
      carePolicy: room.carePolicy,
      streak,
      stars,
    });
    this.state.treatmentReports = this.state.treatmentReports.slice(0, 4);
  }

  private recordDailyReport(): void {
    const report = {
      id: this.state.nextEventId++,
      day: this.state.day,
      treated: this.state.metrics.treatedToday,
      lost: this.state.metrics.lostToday,
      revenue: this.state.metrics.revenueToday,
      bestQuality: this.state.metrics.bestQualityToday,
      reputation: Math.round(this.state.reputation),
    };
    this.state.dailyReports.unshift(report);
    this.state.dailyReports = this.state.dailyReports.slice(0, 3);
    this.pushEvent(getTranslations(this.state.locale).events.dailyReport(report.day, report.treated, report.revenue, report.bestQuality), report.lost > 0 ? 'warning' : 'good');
  }

  private chargeUpkeep(): void {
    const difficulty = getDifficulty(this.state);
    const upkeep = this.state.rooms.reduce((sum, room) => sum + ROOM_DEFINITIONS[room.kind].upkeep + (room.level - 1) * 8, 0);
    const wages = this.state.staff.length * 32;
    const total = Math.round((upkeep + wages) * difficulty.upkeepMultiplier);
    this.state.money -= total;
    this.pushEvent(getTranslations(this.state.locale).events.dailyUpkeep(this.state.day, total), total > this.state.money ? 'warning' : 'neutral');

    if (this.state.money < 0) {
      this.state.reputation = clamp(this.state.reputation - 8, 0, 100);
      this.pushEvent(getTranslations(this.state.locale).events.debtWarning, 'warning');
    }
    this.updateObjectiveProgress();
  }

  private updatePressureAndRush(deltaSeconds: number): void {
    const waitingPatients = this.state.patients.filter((patient) => patient.status !== 'leaving').length;
    const openCapacity = Math.max(1, this.state.rooms.length * 2);
    this.state.queuePressure = clamp((waitingPatients / openCapacity) * 100 * getDifficulty(this.state).pressureMultiplier, 0, 100);

    if (this.state.rushActiveSeconds > 0) {
      this.state.rushActiveSeconds = Math.max(0, this.state.rushActiveSeconds - deltaSeconds);
      return;
    }

    this.state.rushTimer -= deltaSeconds;
    if (this.state.rushTimer <= 0) {
      this.state.rushActiveSeconds = 22;
      this.state.rushTimer = Math.max(46, 74 - this.state.day * 1.4);
      this.state.spawnTimer = Math.min(this.state.spawnTimer, 0.8);
      this.pushFx('warning', 4, 4, getTranslations(this.state.locale).fx.rush);
      this.pushEvent(getTranslations(this.state.locale).events.rushStarted, 'warning');
    }
  }

  private getNextSpawnDelay(): number {
    const difficulty = getDifficulty(this.state);
    const baseDelay = Math.max(5.2, 11.5 - this.state.day * 0.35 - this.state.reputation * 0.022);
    const rushMultiplier = this.state.rushActiveSeconds > 0 ? 0.52 : 1;
    const pressureMultiplier = this.state.queuePressure > 75 ? 1.18 : 1;
    if (this.state.queuePressure > 82 && this.state.events[0]?.message !== getTranslations(this.state.locale).events.pressureWarning) {
      this.pushEvent(getTranslations(this.state.locale).events.pressureWarning, 'warning');
    }
    return Math.max(2.1, baseDelay * rushMultiplier * pressureMultiplier * difficulty.spawnMultiplier);
  }

  private releaseRoom(patient: PatientState): void {
    if (!patient.assignedRoomId) {
      return;
    }

    const room = this.state.rooms.find((candidate) => candidate.id === patient.assignedRoomId);
    if (room?.currentPatientId === patient.id) {
      room.currentPatientId = undefined;
    }
  }

  private getPatienceDrain(patient: PatientState): number {
    const room = patient.assignedRoomId ? this.state.rooms.find((candidate) => candidate.id === patient.assignedRoomId) : undefined;
    const staff = room?.assignedStaffId ? this.state.staff.find((candidate) => candidate.id === room.assignedStaffId) : undefined;
    const calmHands = staff ? getSkillRank(staff, 'calmHands') : 0;
    const waitingComfort = patient.status === 'waiting' ? this.state.facilities.waitingComfortLevel * 0.09 : 0;
    return Math.max(0.3, 1 - calmHands * 0.13 - waitingComfort);
  }

  private getMovementBoost(patient: PatientState): number {
    const totalRoutingSense = this.state.staff.reduce((sum, staff) => sum + getSkillRank(staff, 'routingSense'), 0);
    const leavingBoost = patient.status === 'leaving' ? 0.25 : 0;
    return 1 + Math.min(0.34, totalRoutingSense * 0.05) + leavingBoost;
  }

  private awardStaffXp(staff: StaffState, amount: number): void {
    staff.xp += amount;
    let needed = getStaffXpForNextLevel(staff.level);
    while (staff.xp >= needed) {
      staff.xp -= needed;
      staff.level += 1;
      staff.skillPoints += 1;
      staff.energy = 100;
      this.pushFx('skill', 2 + this.state.staff.indexOf(staff), 2, getTranslations(this.state.locale).fx.levelUp);
      this.pushEvent(getTranslations(this.state.locale).events.staffLevelUp(staff.name, staff.level), 'good');
      needed = getStaffXpForNextLevel(staff.level);
    }
  }

  private awardHospitalXp(amount: number): void {
    const levelState = this.state.hospitalLevel;
    levelState.xp += Math.max(0, Math.round(amount));
    let leveled = false;
    while (levelState.xp >= levelState.nextXp) {
      levelState.xp -= levelState.nextXp;
      levelState.level += 1;
      levelState.nextXp = getHospitalXpForNextLevel(levelState.level);
      levelState.title = getHospitalLevelTitle(levelState.level);
      leveled = true;
    }

    if (leveled) {
      const reward = 140 + levelState.level * 35;
      const scoreReward = 220 + levelState.level * 70;
      this.state.money += reward;
      this.state.metrics.score += scoreReward;
      this.state.metrics.bestScore = Math.max(this.state.metrics.bestScore, this.state.metrics.score, this.state.player.bestScore);
      this.pushFx('upgrade', 7, 2, `${getTranslations(this.state.locale).fx.hospitalLevel} ${levelState.level}`);
      this.pushEvent(getTranslations(this.state.locale).events.hospitalLevelUp(levelState.level, reward, scoreReward), 'good');
      this.updateObjectiveProgress();
    }
  }

  private updateContractProgress(): void {
    let completedAny = false;
    for (const contract of this.state.contracts) {
      if (!contract.active || contract.completed) {
        continue;
      }

      contract.progress = getContractProgress(this.state, contract);
      if (contract.progress >= contract.target) {
        this.completeContract(contract);
        completedAny = true;
      }
    }

    if (completedAny) {
      this.updateObjectiveProgress();
    }
  }

  private completeContract(contract: HospitalContract): void {
    contract.completed = true;
    contract.active = false;
    contract.progress = contract.target;
    this.state.completedContracts += 1;
    this.state.money += contract.rewardMoney;
    this.state.reputation = clamp(this.state.reputation + contract.rewardReputation, 0, 100);
    this.state.metrics.score += contract.rewardScore;
    this.awardHospitalXp(70 + contract.rewardScore / 5);
    this.pushFx('skill', 5.5, 3, `+${contract.rewardScore}`);
    this.pushEvent(getTranslations(this.state.locale).events.contractComplete(getContractTitle(contract.kind, this.state.locale), contract.rewardScore), 'good');
  }

  private updateObjectiveProgress(): void {
    let completedAny = false;
    const objectivesToCheck = [...this.state.objectives];
    for (const objective of objectivesToCheck) {
      if (objective.completed) {
        continue;
      }

      objective.progress = getObjectiveProgress(this.state, objective);
      if (objective.progress >= objective.target) {
        this.completeObjective(objective);
        completedAny = true;
      }
    }

    if (completedAny) {
      for (const objective of this.state.objectives) {
        if (!objective.completed) {
          objective.progress = getObjectiveProgress(this.state, objective);
        }
      }
    }
  }

  private completeObjective(objective: HospitalObjective): void {
    objective.completed = true;
    objective.progress = objective.target;
    this.state.money += objective.rewardMoney;
    this.state.reputation = clamp(this.state.reputation + objective.rewardReputation, 0, 100);
    const objectiveScore = Math.round((objective.rewardMoney + objective.rewardReputation * 45) * getDifficulty(this.state).scoreMultiplier);
    this.state.metrics.score += objectiveScore;
    this.awardHospitalXp(90 + objective.wave * 28);
    const title = getObjectiveTitle(objective, this.state.locale);
    this.pushEvent(getTranslations(this.state.locale).events.objectiveComplete(title, objective.rewardMoney, objective.rewardReputation), 'good');
    this.pushFx('skill', 6, 3, getTranslations(this.state.locale).hud.complete);
    this.unlockNextObjectiveWave();
  }

  private unlockNextObjectiveWave(): void {
    if (this.state.objectives.some((objective) => !objective.completed)) {
      return;
    }

    this.state.objectiveWave += 1;
    const newObjectives = createObjectiveWave(this.state.objectiveWave).map((objective) => ({
      ...objective,
      progress: getObjectiveProgress(this.state, objective),
    }));

    this.state.objectives.push(...newObjectives);
    this.state.contracts.push(...createContracts(this.state.objectiveWave));
    this.pushEvent(getTranslations(this.state.locale).events.objectiveWaveUnlocked(this.state.objectiveWave), 'good');
    this.pushFx('upgrade', 8, 2.5, getTranslations(this.state.locale).fx.newGoals);
  }

  private pushEvent(message: string, mood: HospitalEvent['mood']): void {
    this.state.events.unshift({
      id: this.state.nextEventId++,
      mood,
      message,
    });
    this.state.events = this.state.events.slice(0, 6);
  }

  private pushFx(kind: HospitalFxKind, x: number, y: number, label?: string): void {
    this.state.fxEvents.push({
      id: this.state.nextFxId++,
      kind,
      x,
      y,
      label,
    });
    this.state.fxEvents = this.state.fxEvents.slice(-16);
  }

  private emit(): void {
    this.dispatchEvent(new CustomEvent<GameState>('statechange', { detail: this.state }));
  }
}

export function createInitialState(
  locale: Locale = DEFAULT_LOCALE,
  difficulty: DifficultyId = 'classic',
  player = loadPlayerProfile(),
  leaderboard = loadLeaderboard(),
): GameState {
  const difficultyDefinition = DIFFICULTY_DEFINITIONS[difficulty];
  const state: GameState = {
    grid: {
      columns: 18,
      rows: 12,
      tileSize: 48,
    },
    money: difficultyDefinition.startingMoney,
    reputation: difficultyDefinition.startingReputation,
    day: 1,
    clock: 8,
    paused: false,
    speed: 1,
    locale,
    difficulty,
    player,
    leaderboard,
    selectedRoomKind: 'exam',
    rooms: [],
    staff: [],
    patients: [],
    events: [],
    fxEvents: [],
    objectives: createInitialObjectives(),
    objectiveWave: 1,
    hospitalLevel: createHospitalLevelState(1),
    contracts: createContracts(1),
    completedContracts: 0,
    treatmentReports: [],
    dailyReports: [],
    facilities: {
      waitingComfortLevel: 0,
    },
    queuePressure: 0,
    rushTimer: 26,
    rushActiveSeconds: 0,
    metrics: {
      treatedToday: 0,
      lostToday: 0,
      totalTreated: 0,
      urgentTreated: 0,
      revenueToday: 0,
      bestQualityToday: 0,
      careStreak: 0,
      bestCareStreak: 0,
      score: 0,
      bestScore: player.bestScore,
    },
    nextRoomId: 1,
    nextPatientId: 1,
    nextStaffId: 1,
    nextEventId: 1,
    nextFxId: 1,
    spawnTimer: 2,
  };

  state.staff = INITIAL_STAFF.map((staff) => createStaff(`staff-${state.nextStaffId++}`, staff.name, staff.role, staff.specialty));

  state.rooms.push({
    id: `room-${state.nextRoomId++}`,
    kind: 'exam',
    gridX: 7,
    gridY: 4,
    width: ROOM_DEFINITIONS.exam.width,
    height: ROOM_DEFINITIONS.exam.height,
    level: 1,
    assignedStaffId: state.staff[0]?.id,
    carePolicy: 'balanced',
    patientsTreated: 0,
    cleanliness: 100,
    cleaningCooldown: 0,
  });

  state.rooms.push({
    id: `room-${state.nextRoomId++}`,
    kind: 'recovery',
    gridX: 11,
    gridY: 4,
    width: ROOM_DEFINITIONS.recovery.width,
    height: ROOM_DEFINITIONS.recovery.height,
    level: 1,
    assignedStaffId: state.staff[1]?.id,
    carePolicy: 'balanced',
    patientsTreated: 0,
    cleanliness: 100,
    cleaningCooldown: 0,
  });

  state.staff[0].assignedRoomId = state.rooms[0].id;
  state.staff[1].assignedRoomId = state.rooms[1].id;

  state.events = createInitialEvents(state);

  return state;
}

function createInitialObjectives(): HospitalObjective[] {
  return createObjectiveWave(1);
}

function createObjectiveWave(wave: number): HospitalObjective[] {
  if (wave === 1) {
    return [
    {
      id: 'treat-5-pets',
      kind: 'treatPets',
      wave,
      target: 5,
      progress: 0,
      rewardMoney: 180,
      rewardReputation: 4,
      completed: false,
    },
    {
      id: 'build-grooming-room',
      kind: 'buildRoomKind',
      wave,
      roomKind: 'grooming',
      target: 1,
      progress: 0,
      rewardMoney: 140,
      rewardReputation: 3,
      completed: false,
    },
    {
      id: 'upgrade-level-2-room',
      kind: 'upgradeRoom',
      wave,
      target: 2,
      progress: 1,
      rewardMoney: 220,
      rewardReputation: 5,
      completed: false,
    },
    {
      id: 'reach-70-reputation',
      kind: 'reachReputation',
      wave,
      target: 70,
      progress: 55,
      rewardMoney: 260,
      rewardReputation: 6,
      completed: false,
    },
    {
      id: 'reach-900-score',
      kind: 'reachScore',
      wave,
      target: 900,
      progress: 0,
      rewardMoney: 180,
      rewardReputation: 3,
      completed: false,
    },
    ];
  }

  if (wave === 2) {
    return [
      {
        id: 'treat-12-pets',
        kind: 'treatPets',
        wave,
        target: 12,
        progress: 0,
        rewardMoney: 320,
        rewardReputation: 5,
        completed: false,
      },
      {
        id: 'build-lab-room',
        kind: 'buildRoomKind',
        wave,
        roomKind: 'lab',
        target: 1,
        progress: 0,
        rewardMoney: 260,
        rewardReputation: 4,
        completed: false,
      },
      {
        id: 'waiting-comfort-1',
        kind: 'upgradeWaitingComfort',
        wave,
        target: 1,
        progress: 0,
        rewardMoney: 220,
        rewardReputation: 4,
        completed: false,
      },
      {
        id: 'care-streak-3',
        kind: 'reachCareStreak',
        wave,
        target: 3,
        progress: 0,
        rewardMoney: 280,
        rewardReputation: 5,
        completed: false,
      },
      {
        id: 'complete-1-contract',
        kind: 'completeContracts',
        wave,
        target: 1,
        progress: 0,
        rewardMoney: 300,
        rewardReputation: 5,
        completed: false,
      },
    ];
  }

  if (wave === 3) {
    return [
      {
        id: 'hire-4-staff',
        kind: 'hireStaff',
        wave,
        target: 4,
        progress: 0,
        rewardMoney: 280,
        rewardReputation: 4,
        completed: false,
      },
      {
        id: 'upgrade-level-3-room',
        kind: 'upgradeRoom',
        wave,
        target: 3,
        progress: 0,
        rewardMoney: 420,
        rewardReputation: 6,
        completed: false,
      },
      {
        id: 'earn-620-revenue-day',
        kind: 'earnRevenueToday',
        wave,
        target: 620,
        progress: 0,
        rewardMoney: 360,
        rewardReputation: 5,
        completed: false,
      },
      {
        id: 'reach-86-reputation',
        kind: 'reachReputation',
        wave,
        target: 86,
        progress: 0,
        rewardMoney: 460,
        rewardReputation: 6,
        completed: false,
      },
      {
        id: 'treat-3-urgent-pets',
        kind: 'treatUrgentPets',
        wave,
        target: 3,
        progress: 0,
        rewardMoney: 360,
        rewardReputation: 5,
        completed: false,
      },
    ];
  }

  const targetTreated = 18 + (wave - 4) * 8;
  const targetReputation = Math.min(98, 88 + (wave - 4) * 3);
  return [
    {
      id: `treat-${targetTreated}-pets`,
      kind: 'treatPets',
      wave,
      target: targetTreated,
      progress: 0,
      rewardMoney: 420 + wave * 75,
      rewardReputation: 4,
      completed: false,
    },
    {
      id: `care-streak-${Math.min(8, wave + 1)}`,
      kind: 'reachCareStreak',
      wave,
      target: Math.min(8, wave + 1),
      progress: 0,
      rewardMoney: 360 + wave * 65,
      rewardReputation: 5,
      completed: false,
    },
    {
      id: `earn-${560 + wave * 110}-revenue-day`,
      kind: 'earnRevenueToday',
      wave,
      target: 560 + wave * 110,
      progress: 0,
      rewardMoney: 400 + wave * 70,
      rewardReputation: 4,
      completed: false,
    },
    {
      id: `reach-${targetReputation}-reputation`,
      kind: 'reachReputation',
      wave,
      target: targetReputation,
      progress: 0,
      rewardMoney: 460 + wave * 80,
      rewardReputation: 4,
      completed: false,
    },
    {
      id: `complete-${Math.min(6, wave - 1)}-contracts`,
      kind: 'completeContracts',
      wave,
      target: Math.min(6, wave - 1),
      progress: 0,
      rewardMoney: 440 + wave * 90,
      rewardReputation: 5,
      completed: false,
    },
  ];
}

function getObjectiveProgress(state: GameState, objective: HospitalObjective): number {
  if (objective.kind === 'treatPets') {
    return state.metrics.totalTreated;
  }
  if (objective.kind === 'buildRoomKind') {
    return state.rooms.some((room) => room.kind === objective.roomKind) ? 1 : 0;
  }
  if (objective.kind === 'upgradeRoom') {
    return Math.max(...state.rooms.map((room) => room.level), 0);
  }
  if (objective.kind === 'reachReputation') {
    return Math.round(state.reputation);
  }
  if (objective.kind === 'reachCareStreak') {
    return state.metrics.careStreak;
  }
  if (objective.kind === 'upgradeWaitingComfort') {
    return state.facilities.waitingComfortLevel;
  }
  if (objective.kind === 'earnRevenueToday') {
    return state.metrics.revenueToday;
  }
  if (objective.kind === 'reachScore') {
    return Math.round(state.metrics.score);
  }
  if (objective.kind === 'treatUrgentPets') {
    return state.metrics.urgentTreated;
  }
  if (objective.kind === 'completeContracts') {
    return state.completedContracts;
  }
  return state.staff.length;
}

function createHospitalLevelState(level: number) {
  return {
    level,
    title: getHospitalLevelTitle(level),
    xp: 0,
    nextXp: getHospitalXpForNextLevel(level),
  };
}

function createContracts(wave: number): HospitalContract[] {
  const scale = Math.max(1, wave);
  const contracts: Array<Omit<HospitalContract, 'progress' | 'active' | 'completed'>> = [
    {
      id: `rush-care-${wave}`,
      kind: 'rushCare',
      target: 2 + Math.floor(scale / 2),
      rewardMoney: 160 + scale * 45,
      rewardReputation: 2 + Math.floor(scale / 3),
      rewardScore: 420 + scale * 90,
    },
    {
      id: `vip-wellness-${wave}`,
      kind: 'vipWellness',
      target: 1 + Math.floor(scale / 3),
      rewardMoney: 220 + scale * 55,
      rewardReputation: 3 + Math.floor(scale / 3),
      rewardScore: 520 + scale * 110,
    },
    {
      id: `clean-shift-${wave}`,
      kind: 'cleanShift',
      target: 1 + Math.floor(scale / 2),
      rewardMoney: 130 + scale * 40,
      rewardReputation: 2,
      rewardScore: 360 + scale * 80,
    },
    {
      id: `training-day-${wave}`,
      kind: 'trainingDay',
      target: 1 + Math.floor(scale / 3),
      rewardMoney: 150 + scale * 42,
      rewardReputation: 2,
      rewardScore: 380 + scale * 95,
    },
  ];

  return contracts.map((contract) => ({
    ...contract,
    progress: 0,
    active: false,
    completed: false,
  }));
}

function getContractProgress(state: GameState, contract: HospitalContract): number {
  if (contract.kind === 'rushCare') {
    return state.metrics.urgentTreated;
  }
  if (contract.kind === 'vipWellness') {
    return state.treatmentReports.filter((report) => report.grade === 'excellent' && report.stars >= 4).length;
  }
  if (contract.kind === 'cleanShift') {
    return state.rooms.filter((room) => room.cleanliness >= 92).length;
  }
  return state.staff.reduce((total, staff) => total + Object.values(staff.skills).reduce((sum, rank) => sum + (rank ?? 0), 0), 0);
}

function getHospitalXpForNextLevel(level: number): number {
  return 520 + level * 260;
}

function getHospitalLevelTitle(level: number): string {
  if (level >= 8) {
    return 'Regional Care Hub';
  }
  if (level >= 5) {
    return 'Specialist Hospital';
  }
  if (level >= 3) {
    return 'Growing Clinic';
  }
  return 'Starter Clinic';
}

export function getContractTitle(kind: ContractKind, locale: Locale): string {
  return getTranslations(locale).contracts[kind].title;
}

function calculateTreatmentQuality(patient: PatientState, room: RoomState, staff: StaffState | undefined, difficulty: DifficultyId): { grade: TreatmentGrade; score: number; bonusRate: number; reputationDelta: number } {
  const patienceRatio = clamp(patient.patience / patient.maxPatience, 0, 1);
  const staffEnergy = staff ? staff.energy / 100 : 0.42;
  const cleanliness = room.cleanliness / 100;
  const levelBoost = (room.level - 1) * 0.08;
  const policy = getCarePolicyEffect(room.carePolicy);
  const difficultyPenalty = difficulty === 'expert' ? -6 : difficulty === 'cozy' ? 4 : 0;
  const score = Math.round(clamp(42 + patienceRatio * 25 + cleanliness * 20 + staffEnergy * 16 + levelBoost * 100 + policy.qualityBonus + difficultyPenalty, 0, 100));

  if (score >= 82) {
    return { grade: 'excellent', score, bonusRate: 0.16, reputationDelta: 4.2 };
  }
  if (score >= 58) {
    return { grade: 'good', score, bonusRate: 0.06, reputationDelta: 2.4 };
  }
  return { grade: 'rough', score, bonusRate: -0.08, reputationDelta: 0.8 };
}

function calculateScoreGain(revenue: number, qualityScore: number, stars: number, priority: PatientPriority, streak: number, difficulty: DifficultyId): number {
  const priorityBonus = priority === 'vip' ? 44 : priority === 'urgent' ? 28 : 12;
  const streakBonus = Math.min(120, streak * 10);
  const rawScore = revenue * 0.75 + qualityScore * 3 + stars * 32 + priorityBonus + streakBonus;
  return Math.max(1, Math.round(rawScore * DIFFICULTY_DEFINITIONS[difficulty].scoreMultiplier));
}

function getTreatmentStars(score: number): number {
  if (score >= 90) {
    return 5;
  }
  if (score >= 78) {
    return 4;
  }
  if (score >= 64) {
    return 3;
  }
  if (score >= 48) {
    return 2;
  }
  return 1;
}

function getCareStreakBonus(baseRevenue: number, streak: number): number {
  if (streak < 3) {
    return 0;
  }

  return Math.round(baseRevenue * Math.min(0.18, 0.04 + streak * 0.012));
}

function getCarePolicyEffect(policy: CarePolicy): { speedMultiplier: number; cleanlinessMultiplier: number; energyMultiplier: number; patienceRecovery: number; qualityBonus: number } {
  if (policy === 'express') {
    return {
      speedMultiplier: 1.22,
      cleanlinessMultiplier: 1.24,
      energyMultiplier: 1.18,
      patienceRecovery: 0,
      qualityBonus: -5,
    };
  }

  if (policy === 'comfort') {
    return {
      speedMultiplier: 0.88,
      cleanlinessMultiplier: 0.82,
      energyMultiplier: 0.9,
      patienceRecovery: 0.26,
      qualityBonus: 8,
    };
  }

  return {
    speedMultiplier: 1,
    cleanlinessMultiplier: 1,
    energyMultiplier: 1,
    patienceRecovery: 0.08,
    qualityBonus: 0,
  };
}

function getDifficulty(state: Pick<GameState, 'difficulty'>): DifficultyDefinition {
  return DIFFICULTY_DEFINITIONS[state.difficulty];
}

function rollPatientPriority(reputation: number, isRushActive: boolean): PatientPriority {
  const roll = Math.random();
  const urgentChance = isRushActive ? 0.22 : 0.12;
  const vipChance = Math.min(0.18, 0.04 + reputation / 900);
  if (roll < vipChance) {
    return 'vip';
  }
  if (roll < vipChance + urgentChance) {
    return 'urgent';
  }
  return 'normal';
}

function getPatientPriorityWeight(patient: PatientState): number {
  const priorityWeight = patient.priority === 'urgent' ? 100 : patient.priority === 'vip' ? 70 : 0;
  const triageWeight = patient.triageBoost ? 140 : 0;
  const patienceUrgency = 1 - clamp(patient.patience / patient.maxPatience, 0, 1);
  return triageWeight + priorityWeight + patienceUrgency * 50;
}

function getPriorityPatienceMultiplier(priority: PatientPriority): number {
  if (priority === 'urgent') {
    return 0.58;
  }
  if (priority === 'vip') {
    return 0.82;
  }
  return 1;
}

function getPriorityTreatmentMultiplier(priority: PatientPriority): number {
  return priority === 'urgent' ? 0.82 : 1;
}

function getPriorityRevenueMultiplier(priority: PatientPriority): number {
  if (priority === 'vip') {
    return 1.36;
  }
  if (priority === 'urgent') {
    return 1.14;
  }
  return 1;
}

function createInitialEvents(state: GameState) {
  const text = getTranslations(state.locale).events;
  return [
    { id: state.nextEventId++, mood: 'good' as const, message: text.opened },
    { id: state.nextEventId++, mood: 'neutral' as const, message: text.buildTip },
  ];
}

export function getIllness(patient: PatientState): IllnessDefinition | undefined {
  return ILLNESSES.find((illness) => illness.id === patient.illnessId);
}

export function getRoomUpgradeCost(room: RoomState): number {
  const definition = ROOM_DEFINITIONS[room.kind];
  return Math.round(definition.cost * (0.72 + room.level * 0.46));
}

export function getStaffXpForNextLevel(level: number): number {
  return 90 + level * 45;
}

export function getWaitingComfortUpgradeCost(level: number): number {
  return 120 + level * 95;
}

export function getSkillRank(staff: StaffState, skillId: SkillId): number {
  return staff.skills[skillId] ?? 0;
}

function createStaff(id: string, name: string, role: StaffRole, specialty: StaffState['specialty']): StaffState {
  return {
    id,
    name,
    role,
    specialty,
    mode: 'working',
    energy: 100,
    level: 1,
    xp: 0,
    skillPoints: 0,
    skills: {},
  };
}

function getRoomDefinition(illness: IllnessDefinition) {
  return ROOM_DEFINITIONS[illness.requiredRoom];
}

function isInsideGrid(state: GameState, gridX: number, gridY: number, width: number, height: number): boolean {
  return gridX >= 0 && gridY >= 0 && gridX + width <= state.grid.columns && gridY + height <= state.grid.rows;
}

function rectanglesOverlap(gridX: number, gridY: number, width: number, height: number, room: RoomState): boolean {
  return gridX < room.gridX + room.width && gridX + width > room.gridX && gridY < room.gridY + room.height && gridY + height > room.gridY;
}

function movePatient(patient: PatientState, deltaSeconds: number, movementBoost: number): void {
  if (reachedTarget(patient) && patient.pathIndex < patient.path.length - 1) {
    patient.pathIndex += 1;
    setPatientTargetFromPath(patient);
  }

  const speed = (patient.status === 'leaving' ? 2.35 : 1.78) * movementBoost;
  const dx = patient.targetX - patient.x;
  const dy = patient.targetY - patient.y;
  const distance = Math.hypot(dx, dy);
  if (distance < 0.02) {
    patient.x = patient.targetX;
    patient.y = patient.targetY;
    return;
  }

  const step = Math.min(distance, speed * deltaSeconds);
  patient.x += (dx / distance) * step;
  patient.y += (dy / distance) * step;
}

function setPatientTargetFromPath(patient: PatientState): void {
  const nextStep = patient.path[patient.pathIndex] ?? patient.path[patient.path.length - 1];
  if (!nextStep) {
    return;
  }

  patient.targetX = nextStep.x;
  patient.targetY = nextStep.y;
}

function reachedTarget(patient: PatientState): boolean {
  return Math.hypot(patient.targetX - patient.x, patient.targetY - patient.y) < 0.05;
}

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
