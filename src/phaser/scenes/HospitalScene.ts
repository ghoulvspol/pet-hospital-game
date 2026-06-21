import * as Phaser from 'phaser';
import { MAP_DEFINITIONS, ROOM_DEFINITIONS } from '../../game/simulation/content';
import type { HospitalSimulation } from '../../game/simulation/hospitalSimulation';
import type { CarePolicy, GameState, HospitalFxEvent, MapDefinition, PatientPathStep, PatientState, RoomState, StaffState } from '../../game/simulation/types';
import { getRoomText, getTranslations } from '../../i18n/translations';
import { FX_ASSET_KEYS, PET_ASSET_KEYS, PET_WALK_ASSET_KEYS, ROOM_EQUIPMENT_ASSET_KEYS, STAFF_ASSET_KEYS, TILE_ASSET_KEYS, preloadPixelAssets } from '../assets/manifest';
import { registerPixelArt } from '../assets/pixelArt';

interface HospitalSceneData {
  simulation: HospitalSimulation;
}

interface RoomViewParts {
  base: Phaser.GameObjects.Rectangle;
  glow: Phaser.GameObjects.Rectangle;
  activityGlow: Phaser.GameObjects.Ellipse;
  equipment: Phaser.GameObjects.Image;
  decor: Phaser.GameObjects.Text;
  grime: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
  status: Phaser.GameObjects.Text;
  level: Phaser.GameObjects.Text;
  policyBadge: Phaser.GameObjects.Text;
  dirtyBadge: Phaser.GameObjects.Text;
  progressBack: Phaser.GameObjects.Rectangle;
  progress: Phaser.GameObjects.Rectangle;
}

interface PatientViewParts {
  shadow: Phaser.GameObjects.Ellipse;
  aura: Phaser.GameObjects.Ellipse;
  moodRing: Phaser.GameObjects.Ellipse;
  careHalo: Phaser.GameObjects.Arc;
  sprite: Phaser.GameObjects.Image;
  bubble: Phaser.GameObjects.Container;
  bubbleBack: Phaser.GameObjects.Rectangle;
  mood: Phaser.GameObjects.Text;
  priorityBadge: Phaser.GameObjects.Text;
  statusBadge: Phaser.GameObjects.Text;
  bubbleText: Phaser.GameObjects.Text;
  patienceBack: Phaser.GameObjects.Rectangle;
  patience: Phaser.GameObjects.Rectangle;
}

interface StaffViewParts {
  shadow: Phaser.GameObjects.Ellipse;
  sprite: Phaser.GameObjects.Image;
  label: Phaser.GameObjects.Text;
  restBadge: Phaser.GameObjects.Text;
  tiredBadge: Phaser.GameObjects.Text;
  energyBack: Phaser.GameObjects.Rectangle;
  energy: Phaser.GameObjects.Rectangle;
}

interface TreatmentFxLabel {
  stars: string;
  revenue: string;
  score: string;
}

export class HospitalScene extends Phaser.Scene {
  private simulation!: HospitalSimulation;
  private gridGraphics!: Phaser.GameObjects.Graphics;
  private routeGraphics!: Phaser.GameObjects.Graphics;
  private previewGraphics!: Phaser.GameObjects.Graphics;
  private markerGraphics!: Phaser.GameObjects.Graphics;
  private roomViews = new Map<string, Phaser.GameObjects.Container>();
  private patientViews = new Map<string, Phaser.GameObjects.Container>();
  private staffViews = new Map<string, Phaser.GameObjects.Container>();
  private handledFxIds = new Set<number>();
  private waitingComfortDecor: Phaser.GameObjects.GameObject[] = [];
  private waitingSign?: Phaser.GameObjects.Text;
  private entranceSign?: Phaser.GameObjects.Text;
  private receptionSign?: Phaser.GameObjects.Text;
  private rushBanner?: Phaser.GameObjects.Text;
  private entrancePulse?: Phaser.GameObjects.Ellipse;
  private worldLayer?: Phaser.GameObjects.Container;
  private stateListener?: () => void;
  private state!: GameState;
  private hoverTile?: { gridX: number; gridY: number };
  private lastClockSecond = -1;
  private renderedMapId?: string;

  public constructor(simulation?: HospitalSimulation) {
    super('HospitalScene');
    if (simulation) {
      this.simulation = simulation;
      this.state = simulation.getState();
    }
  }

  public init(data?: HospitalSceneData): void {
    if (data?.simulation) {
      this.simulation = data.simulation;
      this.state = this.simulation.getState();
    }
  }

  public preload(): void {
    preloadPixelAssets(this);
  }

  public create(): void {
    registerPixelArt(this);
    this.cameras.main.setBackgroundColor('#dff8f0');
    this.gridGraphics = this.add.graphics().setDepth(2);
    this.routeGraphics = this.add.graphics().setDepth(6);
    this.previewGraphics = this.add.graphics().setDepth(11);
    this.markerGraphics = this.add.graphics().setDepth(12);

    this.drawWorldBase();
    this.drawGrid();
    this.setupInput();
    this.renderState();

    this.stateListener = () => {
      this.state = this.simulation.getState();
      this.renderState();
    };
    this.simulation.addEventListener('statechange', this.stateListener);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      if (this.stateListener) {
        this.simulation.removeEventListener('statechange', this.stateListener);
      }
      this.handledFxIds.clear();
    });
  }

  public update(_: number, delta: number): void {
    this.simulation.update(delta / 1000);
    this.animatePatients();
    this.animateStaff();

    const currentSecond = Math.floor(this.state.clock);
    if (currentSecond !== this.lastClockSecond) {
      this.lastClockSecond = currentSecond;
      this.pulseMarker();
    }
  }

  private drawWorldBase(): void {
    this.worldLayer?.destroy(true);
    this.worldLayer = this.add.container(0, 0).setDepth(0);
    const { columns, rows, tileSize } = this.state.grid;
    const map = this.state.mapProgress.activeMapId;
    const mapPalette = getActiveMapPalette(this.state);
    const worldWidth = columns * tileSize;
    const worldHeight = rows * tileSize;

    this.worldLayer.add(this.add.rectangle(worldWidth / 2, worldHeight / 2, worldWidth + 32, worldHeight + 32, mapPalette.background).setStrokeStyle(6, mapPalette.border, 0.85).setDepth(0));
    this.worldLayer.add(this.add.rectangle(worldWidth / 2, 20, worldWidth - 18, 30, mapPalette.header, 0.86).setDepth(0.2));
    this.worldLayer.add(this.add.rectangle(worldWidth / 2, worldHeight - 18, worldWidth - 18, 22, mapPalette.footer, 0.42).setDepth(0.2));

    for (let x = 0; x < columns; x += 1) {
      for (let y = 0; y < rows; y += 1) {
        const key = isMapCorridor(this.state, x, y) ? TILE_ASSET_KEYS.corridor : isMapWaitingArea(this.state, x, y) ? TILE_ASSET_KEYS.waiting : TILE_ASSET_KEYS.floor;
        const tile = this.add.image(x * tileSize, y * tileSize, key).setOrigin(0).setDisplaySize(tileSize, tileSize).setDepth(1);
        if (map !== 'gardenClinic') {
          tile.setTint(isMapCorridor(this.state, x, y) ? mapPalette.route : isMapWaitingArea(this.state, x, y) ? mapPalette.waiting : mapPalette.background);
          tile.setAlpha(isMapCorridor(this.state, x, y) ? 0.52 : isMapWaitingArea(this.state, x, y) ? 0.72 : 0.4);
        }
        this.worldLayer.add(tile);
      }
    }

    const waitingArea = getActiveMapWaitingArea(this.state);
    this.waitingSign = this.add.text((waitingArea.x + 0.05) * tileSize, Math.max(0.4, waitingArea.y - 0.72) * tileSize, '', {
      color: '#2f6157',
      fontFamily: 'Arial Rounded MT Bold, Arial, sans-serif',
      fontSize: '14px',
    }).setDepth(3);
    this.worldLayer.add(this.waitingSign);

    const entrance = getActiveMapEntrance(this.state);
    this.entranceSign = this.add.text(Math.max(0.35, entrance.x - 0.35) * tileSize, (entrance.y + 0.92) * tileSize, '', {
      color: '#3b7168',
      fontFamily: 'Arial Rounded MT Bold, Arial, sans-serif',
      fontSize: '14px',
    }).setDepth(3);
    this.worldLayer.add(this.entranceSign);

    this.entrancePulse = this.add.ellipse((entrance.x + 0.04) * tileSize, (entrance.y + 0.1) * tileSize, 58, 58, mapPalette.accent, 0).setDepth(2.8);
    this.worldLayer.add(this.entrancePulse);
    this.rushBanner = this.add.text(6.35 * tileSize, 1.18 * tileSize, '', {
      color: '#8a3b09',
      fontFamily: 'Arial Rounded MT Bold, Arial, sans-serif',
      fontSize: '14px',
      backgroundColor: 'rgba(255, 237, 213, 0.88)',
      padding: { x: 10, y: 6 },
    }).setDepth(13).setVisible(false);
    this.worldLayer.add(this.rushBanner);

    this.drawDecorations(tileSize);
  }

  private drawDecorations(tileSize: number): void {
    const receptionX = 1.7 * tileSize;
    const receptionY = 2.25 * tileSize;
    this.worldLayer?.add(this.add.rectangle(receptionX, receptionY, 112, 42, 0xfff2bf, 0.98).setStrokeStyle(3, 0xd9a441, 0.75).setDepth(2.5));
    this.worldLayer?.add(this.add.rectangle(receptionX - 26, receptionY - 9, 34, 13, 0xffffff, 0.84).setDepth(2.6));
    this.receptionSign = this.add.text(receptionX - 42, receptionY + 4, '', {
      color: '#8a6421',
      fontFamily: 'Arial Rounded MT Bold, Arial, sans-serif',
      fontSize: '10px',
    }).setDepth(2.7);
    this.worldLayer?.add(this.receptionSign);

    const plantPositions = getActiveMapDecorations(this.state);
    for (const position of plantPositions) {
      this.worldLayer?.add(this.add.ellipse(position.x * tileSize, position.y * tileSize + 11, 24, 14, 0x7a4c2b, 0.95).setDepth(2.4));
      this.worldLayer?.add(this.add.circle(position.x * tileSize - 6, position.y * tileSize, 12, 0x35c986, 0.94).setDepth(2.5));
      this.worldLayer?.add(this.add.circle(position.x * tileSize + 6, position.y * tileSize - 4, 12, 0x16a34a, 0.9).setDepth(2.5));
    }

    for (let index = 0; index < 9; index += 1) {
      const x = (6.4 + index * 0.92) * tileSize;
      const y = (7.12 + (index % 2) * 0.18) * tileSize;
      this.worldLayer?.add(this.add.ellipse(x, y, 9, 6, 0x7ecbb7, 0.22).setAngle(index % 2 === 0 ? -18 : 18).setDepth(2.2));
      this.worldLayer?.add(this.add.ellipse(x + 7, y + 7, 9, 6, 0x7ecbb7, 0.18).setAngle(index % 2 === 0 ? 18 : -18).setDepth(2.2));
    }

    const entrance = getActiveMapEntrance(this.state);
    const arrow = this.add.triangle((entrance.x + 0.15) * tileSize, Math.max(0.8, entrance.y - 0.8) * tileSize, 0, 0, 20, 14, 0, 28, getActiveMapPalette(this.state).accent, 0.55).setDepth(2.4);
    arrow.setAngle(90);
    this.worldLayer?.add(arrow);
  }

  private drawGrid(): void {
    const { columns, rows, tileSize } = this.state.grid;
    this.gridGraphics.clear();
    this.gridGraphics.lineStyle(1, 0x7ecbb7, 0.22);

    for (let x = 0; x <= columns; x += 1) {
      this.gridGraphics.lineBetween(x * tileSize, 0, x * tileSize, rows * tileSize);
    }

    for (let y = 0; y <= rows; y += 1) {
      this.gridGraphics.lineBetween(0, y * tileSize, columns * tileSize, y * tileSize);
    }
  }

  private setupInput(): void {
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      this.hoverTile = this.pointerToTile(pointer);
      this.drawBuildPreview();
    });

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const patient = this.findPatientNear(pointer.worldX, pointer.worldY);
      if (patient) {
        this.simulation.dispatch({ type: 'inspectPatient', patientId: patient.id });
        return;
      }

      const tile = this.pointerToTile(pointer);
      if (!tile) {
        return;
      }

      const room = this.findRoomAt(tile.gridX, tile.gridY);
      if (room) {
        this.simulation.dispatch({ type: 'inspectRoom', roomId: room.id });
        return;
      }

      this.simulation.dispatch({ type: 'buildRoom', gridX: tile.gridX, gridY: tile.gridY });
    });

    this.input.keyboard?.on('keydown-SPACE', () => this.simulation.dispatch({ type: 'togglePause' }));
    this.input.keyboard?.on('keydown-ONE', () => this.simulation.dispatch({ type: 'selectRoomKind', kind: 'exam' }));
    this.input.keyboard?.on('keydown-TWO', () => this.simulation.dispatch({ type: 'selectRoomKind', kind: 'grooming' }));
    this.input.keyboard?.on('keydown-THREE', () => this.simulation.dispatch({ type: 'selectRoomKind', kind: 'lab' }));
    this.input.keyboard?.on('keydown-FOUR', () => this.simulation.dispatch({ type: 'selectRoomKind', kind: 'recovery' }));
  }

  private renderState(): void {
    if (this.renderedMapId !== this.state.mapProgress.activeMapId) {
      this.renderedMapId = this.state.mapProgress.activeMapId;
      this.resetWorldViews();
      this.drawWorldBase();
      this.drawGrid();
    }

    this.renderWorldLabels();
    this.renderRooms();
    this.renderWaitingComfortDecor();
    this.renderStaff();
    this.renderPatients();
    this.drawRoutes();
    this.renderPressureSignals();
    this.drawBuildPreview();
    this.drawSelectionMarker();
    this.playFxEvents();
  }

  private resetWorldViews(): void {
    for (const view of this.roomViews.values()) {
      view.destroy(true);
    }
    this.roomViews.clear();
    for (const view of this.patientViews.values()) {
      view.destroy(true);
    }
    this.patientViews.clear();
    for (const view of this.staffViews.values()) {
      view.destroy(true);
    }
    this.staffViews.clear();
    for (const object of this.waitingComfortDecor) {
      object.destroy();
    }
    this.waitingComfortDecor = [];
  }

  private renderWorldLabels(): void {
    const text = getTranslations(this.state.locale);
    this.waitingSign?.setText(text.world.waitingGarden);
    this.entranceSign?.setText(text.world.petEntrance);
    this.receptionSign?.setText(text.world.checkIn);
  }

  private renderRooms(): void {
    const liveRoomIds = new Set(this.state.rooms.map((room) => room.id));
    for (const [roomId, view] of this.roomViews) {
      if (!liveRoomIds.has(roomId)) {
        view.destroy(true);
        this.roomViews.delete(roomId);
      }
    }

    for (const room of this.state.rooms) {
      let view = this.roomViews.get(room.id);
      if (!view) {
        view = this.createRoomView(room);
        this.roomViews.set(room.id, view);
      }

      this.updateRoomView(view, room);
    }
  }

  private renderWaitingComfortDecor(): void {
    const level = this.state.facilities.waitingComfortLevel;
    for (const object of this.waitingComfortDecor) {
      object.destroy();
    }
    this.waitingComfortDecor = [];

    const { tileSize } = this.state.grid;
    const area = getActiveMapWaitingArea(this.state);
    const centerX = (area.x + area.width / 2) * tileSize;
    const centerY = (area.y + area.height / 2) * tileSize;
    if (level >= 1) {
      this.waitingComfortDecor.push(this.add.ellipse(centerX - 12, centerY - 42, 52, 32, 0xede9fe, 0.86).setStrokeStyle(2, 0x8b5cf6, 0.32).setDepth(2.65));
      this.waitingComfortDecor.push(this.add.text(centerX - 28, centerY - 52, '♡', {
        color: '#7c3aed',
        fontFamily: 'Arial Rounded MT Bold, Arial, sans-serif',
        fontSize: '18px',
      }).setDepth(2.7));
    }
    if (level >= 2) {
      this.waitingComfortDecor.push(this.add.circle(centerX + 24, centerY - 4, 13, 0x80d8ff, 0.9).setStrokeStyle(2, 0x18a0fb, 0.35).setDepth(2.65));
      this.waitingComfortDecor.push(this.add.rectangle(centerX + 24, centerY - 4, 18, 5, 0xffffff, 0.66).setDepth(2.7));
    }
    if (level >= 3) {
      this.waitingComfortDecor.push(this.add.star(centerX - 36, centerY + 54, 5, 6, 16, 0xfde68a, 0.9).setStrokeStyle(2, 0xf59e0b, 0.4).setDepth(2.65));
      this.waitingComfortDecor.push(this.add.circle(centerX + 36, centerY - 70, 10, 0xfccde2, 0.88).setStrokeStyle(2, 0xf06292, 0.32).setDepth(2.65));
    }
  }

  private createRoomView(room: RoomState): Phaser.GameObjects.Container {
    const definition = ROOM_DEFINITIONS[room.kind];
    const roomText = getRoomText(room, this.state.locale);
    const { tileSize } = this.state.grid;
    const width = room.width * tileSize - 8;
    const height = room.height * tileSize - 8;
    const base = this.add.rectangle(0, 0, width, height, definition.color, 0.96).setName('base');
    base.setStrokeStyle(3, definition.accent, 0.86);
    const glow = this.add.rectangle(0, 4, width + 10, height + 10, 0xffffff, 0.22).setName('glow');
    const activityGlow = this.add.ellipse(8, 4, width * 0.76, height * 0.68, definition.accent, 0).setName('activityGlow');
    const grime = this.add.rectangle(width / 2 - 24, height / 2 - 24, 34, 24, 0x8b5e3c, 0).setName('grime');
    grime.setAngle(-8);
    const equipment = this.add.image(-width / 2 + 50, 6, ROOM_EQUIPMENT_ASSET_KEYS[room.kind]).setName('equipment').setDisplaySize(72, 66);
    equipment.setOrigin(0.5, 0.5);
    const decor = this.add.text(width / 2 - 34, 0, '', {
      color: '#ffffff',
      fontFamily: 'Arial Rounded MT Bold, Arial, sans-serif',
      fontSize: '18px',
      stroke: '#123832',
      strokeThickness: 3,
    }).setName('decor');
    const label = this.add.text(-width / 2 + 12, -height / 2 + 12, roomText.shortTitle, {
      color: '#16463f',
      fontFamily: 'Arial Rounded MT Bold, Arial, sans-serif',
      fontSize: '14px',
    }).setName('label');
    const status = this.add.text(-width / 2 + 14, height / 2 - 28, '', {
      color: '#31544e',
      fontFamily: 'Arial, sans-serif',
      fontSize: '12px',
    }).setName('status');
    const level = this.add.text(width / 2 - 36, -height / 2 + 12, '', {
      color: '#ffffff',
      fontFamily: 'Arial Rounded MT Bold, Arial, sans-serif',
      fontSize: '12px',
      backgroundColor: '#31544e',
      padding: { x: 5, y: 3 },
    }).setName('level');
    const policyBadge = this.add.text(width / 2 - 52, height / 2 - 58, '', {
      color: '#123832',
      fontFamily: 'Arial Rounded MT Bold, Arial, sans-serif',
      fontSize: '10px',
      backgroundColor: 'rgba(255,255,255,0.82)',
      padding: { x: 5, y: 3 },
    }).setName('policyBadge');
    const dirtyBadge = this.add.text(width / 2 - 32, height / 2 - 36, '!', {
      color: '#ffffff',
      fontFamily: 'Arial Rounded MT Bold, Arial, sans-serif',
      fontSize: '12px',
      backgroundColor: '#ef4444',
      padding: { x: 6, y: 3 },
    }).setName('dirtyBadge');
    const progressBack = this.add.rectangle(0, height / 2 - 12, width - 24, 6, 0xffffff, 0.78).setName('progressBack');
    progressBack.setStrokeStyle(1, 0x31544e, 0.16);
    const progress = this.add.rectangle(-(width - 24) / 2, height / 2 - 12, 0, 6, definition.accent, 1).setOrigin(0, 0.5).setName('progress');

    const container = this.add.container(0, 0, [glow, base, activityGlow, grime, equipment, decor, label, status, level, policyBadge, dirtyBadge, progressBack, progress]).setDepth(5);
    container.setData('parts', { base, glow, activityGlow, equipment, decor, grime, label, status, level, policyBadge, dirtyBadge, progressBack, progress } satisfies RoomViewParts);
    return container;
  }

  private updateRoomView(view: Phaser.GameObjects.Container, room: RoomState): void {
    const { tileSize } = this.state.grid;
    view.setPosition((room.gridX + room.width / 2) * tileSize, (room.gridY + room.height / 2) * tileSize);
    const parts = view.getData('parts') as RoomViewParts;
    const staff = room.assignedStaffId ? this.state.staff.find((candidate) => candidate.id === room.assignedStaffId) : undefined;
    const patient = room.currentPatientId ? this.state.patients.find((candidate) => candidate.id === room.currentPatientId) : undefined;
    const text = getTranslations(this.state.locale);
    parts.label.setText(getRoomText(room, this.state.locale).shortTitle);
    parts.status.setText(patient ? text.world.treatingNow : staff ? `${staff.name} ${text.world.staffReady}` : text.world.needsStaff);
    parts.level.setText(this.formatLevel(room.level));
    parts.policyBadge.setText(text.carePolicies[room.carePolicy].shortTitle);
    const policyColor = getPolicyColor(room.carePolicy);
    parts.policyBadge.setBackgroundColor(policyColor.background);
    parts.policyBadge.setColor(policyColor.text);
    parts.glow.setAlpha(this.state.inspectedRoomId === room.id ? 0.52 : 0.18);
    parts.glow.fillColor = policyColor.fill;
    parts.activityGlow.fillColor = policyColor.fill;
    parts.base.setAlpha(staff ? 0.96 : 0.78);
    parts.equipment.setTint(room.cleanliness < 35 ? 0xffd2a6 : 0xffffff);
    parts.status.setColor(staff ? '#31544e' : '#a34810');
    parts.grime.setAlpha(Phaser.Math.Clamp((65 - room.cleanliness) / 70, 0, 0.42));
    parts.dirtyBadge.setVisible(room.cleanliness < 45);
    parts.dirtyBadge.setText(`${Math.round(room.cleanliness)}%`);
    const progressWidth = room.width * tileSize - 32;
    if (patient) {
      const definition = ROOM_DEFINITIONS[room.kind];
      const treatmentTotal = Math.max(1, definition.treatmentSeconds * Math.max(0.66, 1 - (room.level - 1) * 0.15));
      const progressRatio = Phaser.Math.Clamp(1 - patient.treatmentRemaining / treatmentTotal, 0, 1);
      parts.progressBack.setVisible(true);
      parts.progress.setVisible(true);
      parts.progress.fillColor = policyColor.fill;
      parts.progress.width = progressWidth * progressRatio;
      parts.activityGlow.setAlpha(0.12 + Math.sin(this.time.now / 150) * 0.04);
      parts.activityGlow.setScale(1 + Math.sin(this.time.now / 210) * 0.025);
      parts.decor.setVisible(true);
      parts.decor.setText(getRoomActivityIcon(room.carePolicy, progressRatio));
      parts.decor.setAlpha(0.72 + Math.sin(this.time.now / 170) * 0.18);
    } else {
      parts.progressBack.setVisible(false);
      parts.progress.setVisible(false);
      parts.progress.width = 0;
      parts.activityGlow.setAlpha(0);
      parts.activityGlow.setScale(1);
      parts.decor.setVisible(false);
    }
  }

  private renderStaff(): void {
    const liveStaffIds = new Set(this.state.staff.map((staff) => staff.id));
    for (const [staffId, view] of this.staffViews) {
      if (!liveStaffIds.has(staffId)) {
        view.destroy(true);
        this.staffViews.delete(staffId);
      }
    }

    for (const staff of this.state.staff) {
      let view = this.staffViews.get(staff.id);
      if (!view) {
        view = this.createStaffView(staff);
        this.staffViews.set(staff.id, view);
      }
      this.updateStaffView(view, staff);
    }
  }

  private createStaffView(staff: StaffState): Phaser.GameObjects.Container {
    const shadow = this.add.ellipse(0, 18, 30, 10, 0x31544e, 0.16).setName('shadow');
    const sprite = this.add.image(0, 0, STAFF_ASSET_KEYS[staff.role]).setName('sprite').setDisplaySize(50, 60);
    const restBadge = this.add.text(7, -42, 'Z', {
      color: '#ffffff',
      fontFamily: 'Arial Rounded MT Bold, Arial, sans-serif',
      fontSize: '11px',
      backgroundColor: '#7c3aed',
      padding: { x: 5, y: 2 },
    }).setName('restBadge');
    const tiredBadge = this.add.text(-24, -42, '!', {
      color: '#ffffff',
      fontFamily: 'Arial Rounded MT Bold, Arial, sans-serif',
      fontSize: '11px',
      backgroundColor: '#ef4444',
      padding: { x: 5, y: 2 },
    }).setName('tiredBadge');
    const label = this.add.text(-28, 27, '', {
      color: '#31544e',
      fontFamily: 'Arial Rounded MT Bold, Arial, sans-serif',
      fontSize: '10px',
    }).setName('label');
    const energyBack = this.add.rectangle(0, 41, 34, 5, 0xffffff, 0.9).setName('energyBack');
    energyBack.setStrokeStyle(1, 0x31544e, 0.2);
    const energy = this.add.rectangle(-17, 41, 34, 5, 0x35c986, 1).setOrigin(0, 0.5).setName('energy');
    const container = this.add.container(0, 0, [shadow, sprite, restBadge, tiredBadge, label, energyBack, energy]).setDepth(7);
    container.setData('parts', { shadow, sprite, label, restBadge, tiredBadge, energyBack, energy } satisfies StaffViewParts);
    return container;
  }

  private updateStaffView(view: Phaser.GameObjects.Container, staff: StaffState): void {
    const { tileSize } = this.state.grid;
    const room = staff.assignedRoomId ? this.state.rooms.find((candidate) => candidate.id === staff.assignedRoomId) : undefined;
    const x = room ? (room.gridX + room.width - 0.45) * tileSize : (2.2 + this.state.staff.indexOf(staff) * 0.7) * tileSize;
    const y = room ? (room.gridY + 0.8) * tileSize : 2.2 * tileSize;
    view.setPosition(x, y);
    const parts = view.getData('parts') as StaffViewParts;
    parts.label.setText(this.formatLevel(staff.level));
    parts.sprite.setAlpha(staff.mode === 'resting' ? 0.58 : staff.energy < 20 ? 0.65 : 1);
    parts.sprite.setTint(staff.mode === 'resting' ? 0xe9d5ff : staff.energy < 25 ? 0xffedd5 : 0xffffff);
    parts.restBadge.setVisible(staff.mode === 'resting');
    parts.tiredBadge.setVisible(staff.mode !== 'resting' && staff.energy < 25);
    const energyRatio = Phaser.Math.Clamp(staff.energy / 100, 0, 1);
    parts.energy.width = 34 * energyRatio;
    parts.energy.fillColor = energyRatio < 0.25 ? 0xef4444 : energyRatio < 0.55 ? 0xf59e0b : 0x35c986;
  }

  private renderPatients(): void {
    const livePatientIds = new Set(this.state.patients.map((patient) => patient.id));
    for (const [patientId, view] of this.patientViews) {
      if (!livePatientIds.has(patientId)) {
        view.destroy(true);
        this.patientViews.delete(patientId);
      }
    }

    for (const patient of this.state.patients) {
      let view = this.patientViews.get(patient.id);
      if (!view) {
        view = this.createPatientView(patient);
        this.patientViews.set(patient.id, view);
      }

      this.updatePatientView(view, patient);
    }
  }

  private createPatientView(patient: PatientState): Phaser.GameObjects.Container {
    const shadow = this.add.ellipse(0, 22, 42, 14, 0x31544e, 0.18).setName('shadow');
    const aura = this.add.ellipse(0, 2, 70, 76, 0x35c986, 0.08).setName('aura');
    const moodRing = this.add.ellipse(0, 2, 58, 62, 0x35c986, 0.12).setName('moodRing');
    const careHalo = this.add.circle(0, 1, 38, 0xffffff, 0).setStrokeStyle(3, 0x35c986, 0.22).setName('careHalo');
    const sprite = this.add.image(0, 0, PET_ASSET_KEYS[patient.petKind]).setDisplaySize(66, 72).setName('sprite');
    const mood = this.add.text(-24, -62, '', {
      color: '#16463f',
      fontFamily: 'Arial Rounded MT Bold, Arial, sans-serif',
      fontSize: '18px',
      stroke: '#ffffff',
      strokeThickness: 3,
    }).setName('mood');
    const priorityBadge = this.add.text(10, -82, '', {
      color: '#ffffff',
      fontFamily: 'Arial Rounded MT Bold, Arial, sans-serif',
      fontSize: '11px',
      backgroundColor: '#31544e',
      padding: { x: 5, y: 2 },
    }).setName('priorityBadge');
    const statusBadge = this.add.text(-18, 31, '', {
      color: '#0f6b52',
      fontFamily: 'Arial Rounded MT Bold, Arial, sans-serif',
      fontSize: '13px',
      backgroundColor: 'rgba(255,255,255,0.88)',
      padding: { x: 5, y: 2 },
    }).setName('statusBadge');
    const bubbleBack = this.add.rectangle(24, -58, 52, 24, 0xffffff, 0.9).setName('bubbleBack');
    bubbleBack.setStrokeStyle(1, 0x31544e, 0.14);
    const bubbleText = this.add.text(6, -66, '', {
      color: '#16463f',
      fontFamily: 'Arial Rounded MT Bold, Arial, sans-serif',
      fontSize: '11px',
    }).setName('bubbleText');
    const bubble = this.add.container(0, 0, [bubbleBack, bubbleText]).setName('bubble');
    const patienceBack = this.add.rectangle(0, -39, 42, 6, 0xffffff, 0.92).setName('patienceBack');
    patienceBack.setStrokeStyle(1, 0x31544e, 0.25);
    const patience = this.add.rectangle(-21, -39, 42, 6, 0x35c986, 1).setOrigin(0, 0.5).setName('patience');
    const container = this.add.container(0, 0, [shadow, aura, moodRing, careHalo, sprite, mood, priorityBadge, statusBadge, bubble, patienceBack, patience]).setDepth(8);
    container.setData('parts', { shadow, aura, moodRing, careHalo, sprite, mood, priorityBadge, statusBadge, bubble, bubbleBack, bubbleText, patienceBack, patience } satisfies PatientViewParts);
    return container;
  }

  private updatePatientView(view: Phaser.GameObjects.Container, patient: PatientState): void {
    const { tileSize } = this.state.grid;
    view.setPosition(patient.x * tileSize, patient.y * tileSize);
    view.setAlpha(patient.status === 'leaving' ? 0.75 : 1);

    const parts = view.getData('parts') as PatientViewParts;
    const frame = Math.floor(this.time.now / 260) % 2 === 0 ? 0 : 1;
    parts.sprite.setTexture(frame === 0 ? PET_ASSET_KEYS[patient.petKind] : PET_WALK_ASSET_KEYS[patient.petKind]);
    const ratio = Phaser.Math.Clamp(patient.patience / patient.maxPatience, 0, 1);
    parts.patience.width = 42 * ratio;
    const moodColor = getPatientMoodColor(patient, ratio);
    parts.patience.fillColor = moodColor;
    parts.aura.fillColor = moodColor;
    parts.aura.setAlpha(patient.priority === 'vip' ? 0.16 : patient.priority === 'urgent' ? 0.18 : ratio < 0.55 ? 0.13 : 0.08);
    parts.moodRing.fillColor = moodColor;
    parts.moodRing.setAlpha(patient.status === 'treating' ? 0.2 : ratio < 0.55 ? 0.18 + Math.sin(this.time.now / 140) * 0.04 : 0.11);
    parts.careHalo.setStrokeStyle(patient.status === 'treating' ? 4 : 2, moodColor, patient.status === 'treating' ? 0.54 : patient.priority === 'urgent' ? 0.38 : 0.18);
    parts.bubbleBack.fillColor = ratio < 0.25 ? 0xffedd5 : ratio < 0.55 ? 0xfff7cd : 0xffffff;
    parts.bubbleBack.setStrokeStyle(1, moodColor, ratio < 0.55 ? 0.38 : 0.18);
    parts.bubble.setVisible(patient.status !== 'treating' && patient.status !== 'leaving');
    parts.bubbleText.setText(`${ROOM_DEFINITIONS[patient.requiredRoom].icon} ${getRoomText({ kind: patient.requiredRoom }, this.state.locale).shortTitle}`);
    parts.mood.setText(this.getPatientMood(patient, ratio));
    parts.priorityBadge.setVisible(patient.priority !== 'normal' || patient.triageBoost);
    parts.priorityBadge.setText(patient.triageBoost ? '★' : patient.priority === 'urgent' ? '!' : 'VIP');
    parts.priorityBadge.setBackgroundColor(patient.triageBoost ? '#8b5cf6' : patient.priority === 'urgent' ? '#ef4444' : '#f59e0b');
    parts.statusBadge.setText(patient.status === 'treating' ? '✚' : patient.status === 'waiting' ? '⌛' : patient.status === 'toRoom' ? '➜' : patient.status === 'leaving' ? '⌂' : '↧');
    parts.statusBadge.setBackgroundColor(patient.status === 'treating' ? 'rgba(213,255,236,0.9)' : patient.status === 'leaving' ? 'rgba(255,237,213,0.9)' : 'rgba(255,255,255,0.88)');
    parts.statusBadge.setColor(patient.status === 'leaving' ? '#8a3b09' : '#0f6b52');
    parts.sprite.setTint(patient.priority === 'urgent' ? 0xfff1f2 : patient.priority === 'vip' ? 0xfffbeb : 0xffffff);
  }

  private getPatientMood(patient: PatientState, patienceRatio: number): string {
    if (patient.status === 'leaving') {
      return patienceRatio <= 0 ? '💢' : '💚';
    }
    if (patient.status === 'treating') {
      return '✨';
    }
    if (patienceRatio < 0.25) {
      return '😿';
    }
    if (patienceRatio < 0.55) {
      return '…';
    }
    return '♡';
  }

  private animatePatients(): void {
    for (const [patientId, view] of this.patientViews) {
      const patient = this.state.patients.find((candidate) => candidate.id === patientId);
      if (!patient) {
        continue;
      }

      const bob = Math.sin(this.time.now / 180 + patient.id.length) * 2.5;
      const pulse = 1 + Math.sin(this.time.now / 220 + patient.id.length) * 0.035;
      const parts = view.getData('parts') as PatientViewParts;
      parts.sprite.setY(bob);
      parts.shadow.setScale(1 + Math.abs(bob) * 0.012, 1);
      parts.aura.setScale(patient.priority === 'vip' ? 1.08 + Math.sin(this.time.now / 260) * 0.04 : pulse);
      parts.moodRing.setY(2 + bob * 0.3);
      parts.moodRing.setScale(patient.status === 'waiting' && patient.patience / patient.maxPatience < 0.35 ? 1 + Math.sin(this.time.now / 120) * 0.05 : 1);
      parts.careHalo.setScale(patient.status === 'treating' ? 1 + Math.sin(this.time.now / 110) * 0.08 : patient.priority === 'urgent' ? 1.03 + Math.sin(this.time.now / 150) * 0.04 : 1);
      parts.careHalo.setAngle(this.time.now / 24);
      parts.bubble.setY(Math.sin(this.time.now / 230 + patient.id.length) * 1.2);
      parts.sprite.setFlipX(patient.targetX < patient.x);
    }
  }

  private animateStaff(): void {
    for (const [staffId, view] of this.staffViews) {
      const staff = this.state.staff.find((candidate) => candidate.id === staffId);
      if (!staff) {
        continue;
      }
      const parts = view.getData('parts') as StaffViewParts;
      parts.sprite.setY(Math.sin(this.time.now / 260 + staff.id.length) * 1.5);
    }
  }

  private drawRoutes(): void {
    const { tileSize } = this.state.grid;
    this.routeGraphics.clear();
    this.routeGraphics.lineStyle(3, 0x18a0fb, 0.24);
    for (const patient of this.state.patients) {
      if (patient.status === 'treating' || patient.path.length < 2) {
        continue;
      }
      this.routeGraphics.beginPath();
      this.routeGraphics.moveTo(patient.x * tileSize, patient.y * tileSize);
      for (let index = patient.pathIndex; index < patient.path.length; index += 1) {
        const step = patient.path[index];
        this.routeGraphics.lineTo(step.x * tileSize, step.y * tileSize);
      }
      this.routeGraphics.strokePath();
    }
  }

  private renderPressureSignals(): void {
    const text = getTranslations(this.state.locale);
    const isRush = this.state.rushActiveSeconds > 0;
    const arrivalSeconds = Math.max(0, Math.ceil(this.state.spawnTimer));
    const isArrivalSoon = arrivalSeconds <= 3;
    const pressure = Phaser.Math.Clamp(this.state.queuePressure / 100, 0, 1);
    this.entrancePulse?.setAlpha(isRush ? 0.22 + Math.sin(this.time.now / 160) * 0.08 : isArrivalSoon ? 0.2 + Math.sin(this.time.now / 135) * 0.08 : pressure > 0.68 ? 0.14 : 0);
    this.entrancePulse?.setScale(isRush ? 1 + Math.sin(this.time.now / 180) * 0.08 : isArrivalSoon ? 1.08 + Math.sin(this.time.now / 150) * 0.1 : 1);

    if (!this.rushBanner) {
      return;
    }

    this.rushBanner.setVisible(isRush || isArrivalSoon || this.state.queuePressure > 76);
    this.rushBanner.setText(isRush ? `${text.hud.rushHour} · ${Math.ceil(this.state.rushActiveSeconds)}s` : isArrivalSoon ? `${text.hud.incomingSoon} · ${arrivalSeconds}s` : `${text.hud.queuePressure} ${Math.round(this.state.queuePressure)}%`);
  }

  private drawBuildPreview(): void {
    this.previewGraphics.clear();
    if (!this.hoverTile) {
      return;
    }

    const definition = ROOM_DEFINITIONS[this.state.selectedRoomKind];
    const preview = this.simulation.previewBuild(this.hoverTile.gridX, this.hoverTile.gridY);
    const { tileSize } = this.state.grid;
    const x = this.hoverTile.gridX * tileSize + 4;
    const y = this.hoverTile.gridY * tileSize + 4;
    const width = definition.width * tileSize - 8;
    const height = definition.height * tileSize - 8;
    this.previewGraphics.fillStyle(preview.ok ? definition.accent : 0xef4444, preview.ok ? 0.24 : 0.18);
    this.previewGraphics.fillRoundedRect(x, y, width, height, 14);
    this.previewGraphics.lineStyle(3, preview.ok ? definition.accent : 0xef4444, 0.84);
    this.previewGraphics.strokeRoundedRect(x, y, width, height, 14);
  }

  private drawSelectionMarker(): void {
    this.markerGraphics.clear();
    if (!this.state.inspectedRoomId) {
      return;
    }

    const room = this.state.rooms.find((candidate) => candidate.id === this.state.inspectedRoomId);
    if (!room) {
      return;
    }

    const { tileSize } = this.state.grid;
    this.markerGraphics.lineStyle(4, 0xffffff, 0.95);
    this.markerGraphics.strokeRoundedRect(room.gridX * tileSize + 2, room.gridY * tileSize + 2, room.width * tileSize - 4, room.height * tileSize - 4, 17);
  }

  private pulseMarker(): void {
    if (!this.state.inspectedRoomId) {
      return;
    }

    this.tweens.add({
      targets: this.markerGraphics,
      alpha: 0.45,
      duration: 180,
      yoyo: true,
      ease: 'Sine.easeInOut',
    });
  }

  private playFxEvents(): void {
    for (const event of this.state.fxEvents) {
      if (this.handledFxIds.has(event.id)) {
        continue;
      }
      this.handledFxIds.add(event.id);
      this.playFxEvent(event);
    }
  }

  private playFxEvent(event: HospitalFxEvent): void {
    const { tileSize } = this.state.grid;
    const x = event.x * tileSize;
    const y = event.y * tileSize;
    const texture = event.kind === 'warning' ? FX_ASSET_KEYS.warning : event.kind === 'heal' ? FX_ASSET_KEYS.heart : FX_ASSET_KEYS.sparkle;
    const treatmentLabel = event.kind === 'heal' && event.label?.includes('|') ? parseTreatmentFxLabel(event.label) : undefined;
    const isStreak = event.kind === 'heal' && Boolean(treatmentLabel?.stars);
    const tint = event.kind === 'warning' ? 0xef4444 : isStreak ? 0xffd166 : event.kind === 'heal' ? 0xf06292 : event.kind === 'upgrade' ? 0xffd166 : 0xffffff;

    for (let index = 0; index < (isStreak ? 18 : 10); index += 1) {
      const particle = this.add.image(x, y, texture).setScale(isStreak ? 1.45 : 1.2).setTint(tint).setDepth(20);
      this.tweens.add({
        targets: particle,
        x: x + Phaser.Math.Between(isStreak ? -52 : -34, isStreak ? 52 : 34),
        y: y + Phaser.Math.Between(isStreak ? -62 : -44, -12),
        alpha: 0,
        scale: 0.2,
        duration: Phaser.Math.Between(isStreak ? 720 : 520, isStreak ? 980 : 780),
        ease: 'Cubic.easeOut',
        onComplete: () => particle.destroy(),
      });
    }

    if (treatmentLabel) {
      this.playTreatmentLabel(x, y, treatmentLabel);
      return;
    }

    if (event.label) {
      const label = this.add.text(x - 24, y - 40, event.label, {
        color: event.kind === 'warning' ? '#ef4444' : isStreak ? '#a16207' : '#0f6b52',
        fontFamily: 'Arial Rounded MT Bold, Arial, sans-serif',
        fontSize: isStreak ? '19px' : '16px',
        stroke: '#ffffff',
        strokeThickness: isStreak ? 5 : 4,
      }).setDepth(21);
      this.tweens.add({
        targets: label,
        y: y - 78,
        alpha: 0,
        duration: 900,
        ease: 'Sine.easeOut',
        onComplete: () => label.destroy(),
      });
    }
  }

  private playTreatmentLabel(x: number, y: number, label: TreatmentFxLabel): void {
    const stars = this.add.text(x - 34, y - 58, label.stars, {
      color: '#a16207',
      fontFamily: 'Arial Rounded MT Bold, Arial, sans-serif',
      fontSize: '18px',
      stroke: '#ffffff',
      strokeThickness: 5,
    }).setDepth(22);
    const revenue = this.add.text(x - 30, y - 36, label.revenue, {
      color: '#0f6b52',
      fontFamily: 'Arial Rounded MT Bold, Arial, sans-serif',
      fontSize: '20px',
      stroke: '#ffffff',
      strokeThickness: 5,
    }).setDepth(22);
    const score = this.add.text(x - 18, y - 16, label.score, {
      color: '#31544e',
      fontFamily: 'Arial Rounded MT Bold, Arial, sans-serif',
      fontSize: '13px',
      stroke: '#ffffff',
      strokeThickness: 4,
    }).setDepth(22);

    this.tweens.add({
      targets: [stars, revenue, score],
      y: '-=48',
      alpha: 0,
      duration: 1050,
      ease: 'Sine.easeOut',
      onComplete: () => {
        stars.destroy();
        revenue.destroy();
        score.destroy();
      },
    });
  }

  private pointerToTile(pointer: Phaser.Input.Pointer): { gridX: number; gridY: number } | undefined {
    const { columns, rows, tileSize } = this.state.grid;
    const gridX = Math.floor(pointer.worldX / tileSize);
    const gridY = Math.floor(pointer.worldY / tileSize);
    if (gridX < 0 || gridY < 0 || gridX >= columns || gridY >= rows) {
      return undefined;
    }

    return { gridX, gridY };
  }

  private findRoomAt(gridX: number, gridY: number): RoomState | undefined {
    return this.state.rooms.find(
      (room) => gridX >= room.gridX && gridX < room.gridX + room.width && gridY >= room.gridY && gridY < room.gridY + room.height,
    );
  }

  private findPatientNear(worldX: number, worldY: number): PatientState | undefined {
    const { tileSize } = this.state.grid;
    return this.state.patients.find((patient) => Math.hypot(patient.x * tileSize - worldX, patient.y * tileSize - worldY) < 28);
  }

  private formatLevel(level: number): string {
    const text = getTranslations(this.state.locale);
    return this.state.locale === 'zh' ? `${level}${text.hud.levelAbbr}` : `${text.hud.levelAbbr} ${level}`;
  }
}

function getPolicyColor(policy: CarePolicy): { fill: number; background: string; text: string } {
  if (policy === 'express') {
    return { fill: 0xf97316, background: '#ffedd5', text: '#8a3b09' };
  }

  if (policy === 'comfort') {
    return { fill: 0x8b5cf6, background: '#ede9fe', text: '#4c1d95' };
  }

  return { fill: 0x25b981, background: '#d5ffec', text: '#0f6b52' };
}

function getPatientMoodColor(patient: PatientState, patienceRatio: number): number {
  if (patient.status === 'treating') {
    return 0x80d8ff;
  }
  if (patient.priority === 'urgent' || patienceRatio < 0.25) {
    return 0xef4444;
  }
  if (patient.priority === 'vip') {
    return 0xf59e0b;
  }
  if (patienceRatio < 0.55) {
    return 0xf59e0b;
  }
  return 0x35c986;
}

function getRoomActivityIcon(policy: CarePolicy, progressRatio: number): string {
  if (progressRatio > 0.82) {
    return '★';
  }
  if (policy === 'express') {
    return '⚡';
  }
  if (policy === 'comfort') {
    return '♡';
  }
  return '✚';
}

function parseTreatmentFxLabel(label: string): TreatmentFxLabel {
  const [stars = '', revenue = '', score = ''] = label.split('|');
  return { stars, revenue, score };
}

function getActiveMap(state: GameState): MapDefinition {
  return MAP_DEFINITIONS[state.mapProgress.activeMapId];
}

function getActiveMapPalette(state: GameState): MapDefinition['palette'] {
  return getActiveMap(state).palette;
}

function getActiveMapEntrance(state: GameState): PatientPathStep {
  return getActiveMap(state).entrance;
}

function getActiveMapWaitingArea(state: GameState): MapDefinition['waitingArea'] {
  return getActiveMap(state).waitingArea;
}

function getActiveMapDecorations(state: GameState): PatientPathStep[] {
  return getActiveMap(state).decorations;
}

function isMapCorridor(state: GameState, x: number, y: number): boolean {
  const map = getActiveMap(state);
  return map.corridorRows.includes(y) || map.corridorColumns.includes(x);
}

function isMapWaitingArea(state: GameState, x: number, y: number): boolean {
  const area = getActiveMapWaitingArea(state);
  return x >= area.x && x < area.x + area.width && y >= area.y && y < area.y + area.height;
}
