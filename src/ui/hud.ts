import { ILLNESSES, MAP_DEFINITIONS, MAP_ORDER, MAX_ROOM_LEVEL, ROOM_DEFINITIONS, SKILL_DEFINITIONS, SKILL_ORDER } from '../game/simulation/content';
import { DIFFICULTY_DEFINITIONS, getContractTitle, getIllness, getMapText, getRoomUpgradeCost, getSkillRank, getStaffXpForNextLevel, getWaitingComfortUpgradeCost, type HospitalSimulation } from '../game/simulation/hospitalSimulation';
import type { CarePolicy, DailyReport, DifficultyId, GameState, HospitalObjective, HudSectionId, Locale, MapId, PatientState, RoomKind, RoomState, SkillId, StaffState, TreatmentReport } from '../game/simulation/types';
import { getIllnessTitle, getObjectiveTitle, getRoomText, getSkillText, getTranslations } from '../i18n/translations';

export class HospitalHud {
  private root: HTMLElement;
  private simulation: HospitalSimulation;
  private state: GameState;
  private unsubscribe?: () => void;
  private pendingPointerAction?: {
    action: HTMLElement;
    key: string;
    pointerId: number;
    startX: number;
    startY: number;
    scrollPanel?: HTMLElement;
    scrollTop: number;
    moved: boolean;
  };
  private pendingPanelDrag?: {
    panelClass: 'left-panel' | 'right-panel';
    pointerId: number;
    startX: number;
    startY: number;
    scrollTop: number;
    moved: boolean;
  };
  private lastPointerActionKey = '';
  private lastPointerActionAt = 0;
  private suppressClickUntil = 0;
  private panelInteractionUntil = 0;
  private restoreScrollUntil = 0;
  private panelInteractionTimer?: number;
  private deferredRender = false;

  public constructor(root: HTMLElement, simulation: HospitalSimulation) {
    this.root = root;
    this.simulation = simulation;
    this.state = simulation.getState();
  }

  public mount(): void {
    const listener = (event: Event) => {
      this.state = (event as CustomEvent<GameState>).detail;
      this.render();
    };
    this.simulation.addEventListener('statechange', listener);
    this.unsubscribe = () => this.simulation.removeEventListener('statechange', listener);
    this.root.addEventListener('pointerdown', this.handlePointerDown);
    this.root.addEventListener('pointermove', this.handlePointerMove);
    this.root.addEventListener('pointerup', this.handlePointerUp);
    this.root.addEventListener('pointercancel', this.handlePointerCancel);
    this.root.addEventListener('click', this.handleClick);
    this.root.addEventListener('scroll', this.handlePanelScroll, true);
    this.root.addEventListener('wheel', this.handlePanelWheel, { passive: false });
    this.render();
  }

  public destroy(): void {
    this.unsubscribe?.();
    this.root.removeEventListener('pointerdown', this.handlePointerDown);
    this.root.removeEventListener('pointermove', this.handlePointerMove);
    this.root.removeEventListener('pointerup', this.handlePointerUp);
    this.root.removeEventListener('pointercancel', this.handlePointerCancel);
    this.root.removeEventListener('click', this.handleClick);
    this.root.removeEventListener('scroll', this.handlePanelScroll, true);
    this.root.removeEventListener('wheel', this.handlePanelWheel);
    if (this.panelInteractionTimer) {
      window.clearTimeout(this.panelInteractionTimer);
    }
  }

  private handlePanelScroll = (event: Event): void => {
    if (performance.now() < this.restoreScrollUntil) {
      return;
    }

    const target = event.target as HTMLElement;
    if (!target.closest('.left-panel, .right-panel')) {
      return;
    }

    this.holdPanelRender();
  };

  private handlePanelWheel = (event: WheelEvent): void => {
    const target = event.target as HTMLElement;
    const panel = target.closest<HTMLElement>('.left-panel, .right-panel');
    if (!panel) {
      return;
    }

    this.holdPanelRender();
    const before = panel.scrollTop;
    panel.scrollTop += event.deltaY;
    if (panel.scrollTop !== before) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  private handlePointerDown = (event: PointerEvent): void => {
    if (event.button !== 0 || !event.isPrimary) {
      return;
    }

    const target = event.target as HTMLElement;
    const panel = target.closest<HTMLElement>('.left-panel, .right-panel');
    const action = target.closest<HTMLElement>('[data-action]');
    if (panel) {
      this.pendingPanelDrag = {
        panelClass: panel.classList.contains('left-panel') ? 'left-panel' : 'right-panel',
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        scrollTop: panel.scrollTop,
        moved: false,
      };
    }

    if (!action || this.isDisabledAction(action)) {
      this.pendingPointerAction = undefined;
      return;
    }

    this.pendingPointerAction = {
      action,
      key: this.getActionKey(action),
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      scrollPanel: panel ?? undefined,
      scrollTop: panel?.scrollTop ?? 0,
      moved: false,
    };
  };

  private handlePointerMove = (event: PointerEvent): void => {
    const drag = this.pendingPanelDrag;
    if (drag && drag.pointerId === event.pointerId) {
      const distanceX = Math.abs(event.clientX - drag.startX);
      const distanceY = event.clientY - drag.startY;
      if (Math.abs(distanceY) > 8 && Math.abs(distanceY) > distanceX) {
        drag.moved = true;
        this.root.querySelector<HTMLElement>(`.${drag.panelClass}`)?.scrollTo({ top: drag.scrollTop - distanceY });
        this.holdPanelRender();
        event.preventDefault();
      }
    }

    const pending = this.pendingPointerAction;
    if (!pending || pending.pointerId !== event.pointerId) {
      return;
    }

    const distanceX = Math.abs(event.clientX - pending.startX);
    const distanceY = Math.abs(event.clientY - pending.startY);
    if (distanceX > 8 || distanceY > 8 || (pending.scrollPanel && pending.scrollPanel.scrollTop !== pending.scrollTop)) {
      pending.moved = true;
    }
  };

  private handlePointerUp = (event: PointerEvent): void => {
    const drag = this.pendingPanelDrag;
    if (drag && drag.pointerId === event.pointerId) {
      if (drag.moved) {
        this.suppressClickUntil = performance.now() + 450;
        this.holdPanelRender(180);
      }
      this.pendingPanelDrag = undefined;
    }

    const pending = this.pendingPointerAction;
    this.pendingPointerAction = undefined;
    if (!pending || pending.pointerId !== event.pointerId) {
      return;
    }

    if (pending.moved || drag?.moved) {
      this.suppressClickUntil = performance.now() + 450;
      return;
    }

    this.lastPointerActionKey = pending.key;
    this.lastPointerActionAt = performance.now();
    event.preventDefault();
    this.runAction(pending.action);
  };

  private handlePointerCancel = (): void => {
    this.pendingPointerAction = undefined;
    this.pendingPanelDrag = undefined;
    this.suppressClickUntil = performance.now() + 450;
    this.holdPanelRender(180);
  };

  private handleClick = (event: MouseEvent): void => {
    if (performance.now() < this.suppressClickUntil) {
      event.preventDefault();
      return;
    }

    const target = event.target as HTMLElement;
    const action = target.closest<HTMLElement>('[data-action]');
    if (!action || this.isDisabledAction(action)) {
      return;
    }

    const actionKey = this.getActionKey(action);
    if (this.lastPointerActionKey === actionKey && performance.now() - this.lastPointerActionAt < 450) {
      return;
    }

    this.runAction(action);
  };

  private runAction(action: HTMLElement): void {
    const actionName = action.dataset.action;
    if (actionName === 'select-room') {
      const kind = action.dataset.kind as RoomKind | undefined;
      if (kind) {
        this.simulation.dispatch({ type: 'selectRoomKind', kind });
      }
      return;
    }

    if (actionName === 'set-locale') {
      const locale = action.dataset.locale as Locale | undefined;
      if (locale) {
        this.simulation.dispatch({ type: 'setLocale', locale });
      }
      return;
    }

    if (actionName === 'set-difficulty') {
      const difficulty = action.dataset.difficulty as DifficultyId | undefined;
      if (difficulty) {
        this.simulation.dispatch({ type: 'setDifficulty', difficulty });
      }
      return;
    }

    if (actionName === 'select-map') {
      const mapId = action.dataset.mapId as MapId | undefined;
      if (mapId) {
        this.simulation.dispatch({ type: 'selectMap', mapId });
      }
      return;
    }

    if (actionName === 'toggle-hud-section') {
      const section = action.dataset.section as HudSectionId | undefined;
      if (section) {
        this.simulation.dispatch({ type: 'toggleHudSection', section });
      }
      return;
    }

    if (actionName === 'rename-player') {
      const name = window.prompt(getTranslations(this.state.locale).hud.player, this.state.player.name);
      if (name !== null) {
        this.simulation.dispatch({ type: 'setPlayerName', name });
      }
      return;
    }

    if (actionName === 'save-score') {
      this.simulation.dispatch({ type: 'saveScore' });
      return;
    }

    if (actionName === 'clear-leaderboard') {
      this.simulation.dispatch({ type: 'clearLeaderboard' });
      return;
    }

    if (actionName === 'start-contract') {
      const contractId = action.dataset.contractId;
      if (contractId) {
        this.simulation.dispatch({ type: 'startContract', contractId });
      }
      return;
    }

    if (actionName === 'hire-staff') {
      this.simulation.dispatch({ type: 'hireStaff' });
      return;
    }

    if (actionName === 'upgrade-room') {
      const roomId = action.dataset.roomId;
      if (roomId) {
        this.simulation.dispatch({ type: 'upgradeRoom', roomId });
      }
      return;
    }

    if (actionName === 'clean-room') {
      const roomId = action.dataset.roomId;
      if (roomId) {
        this.simulation.dispatch({ type: 'cleanRoom', roomId });
      }
      return;
    }

    if (actionName === 'set-care-policy') {
      const roomId = action.dataset.roomId;
      const policy = action.dataset.policy as CarePolicy | undefined;
      if (roomId && policy) {
        this.simulation.dispatch({ type: 'setCarePolicy', roomId, policy });
      }
      return;
    }

    if (actionName === 'inspect-patient') {
      const patientId = action.dataset.patientId;
      if (patientId) {
        this.simulation.dispatch({ type: 'inspectPatient', patientId });
      }
      return;
    }

    if (actionName === 'soothe-patient') {
      const patientId = action.dataset.patientId;
      if (patientId) {
        this.simulation.dispatch({ type: 'soothePatient', patientId });
      }
      return;
    }

    if (actionName === 'prioritize-patient') {
      const patientId = action.dataset.patientId;
      if (patientId) {
        this.simulation.dispatch({ type: 'prioritizePatient', patientId });
      }
      return;
    }

    if (actionName === 'upgrade-waiting-comfort') {
      this.simulation.dispatch({ type: 'upgradeWaitingComfort' });
      return;
    }

    if (actionName === 'assign-staff') {
      const staffId = action.dataset.staffId;
      const roomId = action.dataset.roomId;
      if (staffId && roomId) {
        this.simulation.dispatch({ type: 'assignStaffToRoom', staffId, roomId });
      }
      return;
    }

    if (actionName === 'rest-staff') {
      const staffId = action.dataset.staffId;
      if (staffId) {
        this.simulation.dispatch({ type: 'restStaff', staffId });
      }
      return;
    }

    if (actionName === 'resume-staff') {
      const staffId = action.dataset.staffId;
      if (staffId) {
        this.simulation.dispatch({ type: 'resumeStaff', staffId });
      }
      return;
    }

    if (actionName === 'train-staff') {
      const staffId = action.dataset.staffId;
      const skillId = action.dataset.skillId as SkillId | undefined;
      if (staffId && skillId) {
        this.simulation.dispatch({ type: 'trainStaff', staffId, skillId });
      }
      return;
    }

    if (actionName === 'toggle-pause') {
      this.simulation.dispatch({ type: 'togglePause' });
      return;
    }

    if (actionName === 'set-speed') {
      const speed = Number(action.dataset.speed ?? '1');
      this.simulation.dispatch({ type: 'setSpeed', speed });
      return;
    }

    if (actionName === 'restart') {
      this.simulation.dispatch({ type: 'restart' });
      return;
    }

    if (actionName === 'clear-inspector') {
      this.simulation.dispatch({ type: 'inspectRoom', roomId: undefined });
    }
  }

  private isDisabledAction(action: HTMLElement): boolean {
    return action instanceof HTMLButtonElement && action.disabled;
  }

  private getActionKey(action: HTMLElement): string {
    return [
      action.dataset.action ?? '',
      action.dataset.roomId ?? '',
      action.dataset.contractId ?? '',
      action.dataset.staffId ?? '',
      action.dataset.patientId ?? '',
      action.dataset.kind ?? '',
      action.dataset.locale ?? '',
      action.dataset.difficulty ?? '',
      action.dataset.speed ?? '',
      action.dataset.policy ?? '',
      action.dataset.skillId ?? '',
      action.dataset.section ?? '',
    ].join('|');
  }

  private render(): void {
    if (this.shouldDeferRender()) {
      this.deferredRender = true;
      return;
    }

    this.deferredRender = false;
    const leftScrollTop = this.root.querySelector<HTMLElement>('.left-panel')?.scrollTop ?? 0;
    const rightScrollTop = this.root.querySelector<HTMLElement>('.right-panel')?.scrollTop ?? 0;
    const text = getTranslations(this.state.locale);
    const selectedRoom = ROOM_DEFINITIONS[this.state.selectedRoomKind];
    const selectedRoomText = getRoomText(selectedRoom, this.state.locale);
    const inspectedRoom = this.getInspectedRoom();
    const inspectedPatient = this.getInspectedPatient();
    const currentHour = 8 + Math.floor((this.state.clock / 100) * 12);
    const currentMinute = Math.floor((((this.state.clock / 100) * 12) % 1) * 60);

    this.root.innerHTML = `
      <div class="shell-overlay">
        <header class="top-bar glass-panel">
          <div class="brand-lockup">
            <div class="brand-mark">🐾</div>
            <div>
              <div class="eyebrow">${text.app.eyebrow}</div>
              <h1>${text.app.title}</h1>
            </div>
          </div>
          <div class="status-strip">
            ${this.metricCard(text.hud.money, `$${Math.round(this.state.money)}`, this.state.money < 0 ? 'bad' : 'good')}
            ${this.metricCard(text.hud.score, `${Math.round(this.state.metrics.score)}`, this.state.metrics.score >= this.state.player.bestScore && this.state.metrics.score > 0 ? 'good' : 'neutral')}
            ${this.metricCard(text.hud.reputation, `${Math.round(this.state.reputation)}%`, this.state.reputation < 35 ? 'bad' : 'good')}
            ${this.metricCard(text.hud.careStreak, `×${this.state.metrics.careStreak}`, this.state.metrics.careStreak >= 3 ? 'good' : 'neutral')}
            ${this.metricCard(text.hud.day, `${this.state.day}`, 'neutral')}
          </div>
          <div class="top-actions">
            <div class="locale-toggle" aria-label="${text.hud.language}">
              <button class="mini-button ${this.state.locale === 'zh' ? 'active' : ''}" data-action="set-locale" data-locale="zh" aria-label="${text.hud.chinese}">${text.hud.chinese}</button>
              <button class="mini-button ${this.state.locale === 'en' ? 'active' : ''}" data-action="set-locale" data-locale="en" aria-label="${text.hud.english}">${text.hud.english}</button>
            </div>
            <button class="pill-button ${this.state.paused ? 'active' : ''}" data-action="toggle-pause">
              ${this.state.paused ? text.actions.resume : text.actions.pause}
            </button>
            <button class="pill-button" data-action="restart">${text.actions.restart}</button>
          </div>
        </header>

        <aside class="left-panel glass-panel">
          <div class="panel-heading">
            <span>${text.hud.careQueue}</span>
            <strong>${this.state.patients.length}</strong>
          </div>
          ${this.renderPressureMeter()}
          ${this.renderPlayerProgress()}
          ${this.renderHospitalLevel()}
          ${this.renderIncident()}
          ${this.renderCollapsibleSection('map', text.hud.mapChapter, this.renderChapterMap())}
          ${this.renderDifficultyControls()}
          ${this.renderCollapsibleSection('leaderboard', text.hud.leaderboard, this.renderLeaderboard(), `${this.state.leaderboard.length}`)}
          ${this.renderOperationsWatch()}
          ${this.renderCoachTip()}
          ${this.renderArrivalMeter()}
          ${this.renderWaitingComfort()}
          <div class="queue-list">
            ${this.renderQueue()}
          </div>
          <div class="panel-heading compact">
            <span>${text.hud.objectives}</span>
            <strong>${text.hud.goalWave} ${this.state.objectiveWave}</strong>
          </div>
          <div class="objective-list">
            ${this.renderObjectives()}
          </div>
          ${this.renderCollapsibleSection('contracts', text.hud.contracts, this.renderContracts(), `${this.state.contracts.filter((contract) => contract.active && !contract.completed).length}/${this.state.contracts.length}`)}
          ${this.renderCollapsibleSection(
            'staff',
            text.hud.staff,
            `<div class="staff-list">${this.renderStaff()}</div>`,
            `<button class="mini-button" data-action="hire-staff">${text.actions.hire} $${this.hireCost()}</button>`,
          )}
          ${this.renderCollapsibleSection('reports', text.hud.dailySummary, this.renderDailySummary(), `${this.state.dailyReports.length}`)}
            </aside>

        <aside class="right-panel glass-panel">
          <div class="panel-heading">
            <span>${text.hud.inspector}</span>
            <button class="icon-button" data-action="clear-inspector">×</button>
          </div>
          ${this.renderInspector(inspectedRoom, inspectedPatient)}
          ${this.renderRecentCare()}
          <div class="event-feed">
            <div class="section-title">${text.hud.clinicLog}</div>
            ${this.state.events.map((item) => `<div class="event-item ${item.mood}">${item.message}</div>`).join('')}
          </div>
        </aside>

        <footer class="build-dock glass-panel">
          <div class="dock-copy">
            <span>${text.hud.buildMode}</span>
            <strong>${selectedRoom.icon} ${selectedRoomText.title}</strong>
            <small>${selectedRoomText.description}</small>
          </div>
          <div class="room-buttons">
            ${(() => {
              const roomDemand = this.getRoomDemand();
              const recommendedKind = this.getRecommendedRoomKind(roomDemand);
              return Object.values(ROOM_DEFINITIONS)
              .map((room, index) => {
                const roomText = getRoomText(room, this.state.locale);
                const demand = roomDemand[room.kind];
                const isRecommended = room.kind === recommendedKind;
                const recommendation = this.getRoomRecommendationLabel(room.kind, demand, isRecommended);
                return `
                  <button class="room-button ${room.kind === this.state.selectedRoomKind ? 'active' : ''} ${isRecommended ? 'recommended' : ''}" data-action="select-room" data-kind="${room.kind}">
                    <span class="shortcut">${index + 1}</span>
                    <span class="room-icon">${room.icon}</span>
                    <span>
                      <strong>${roomText.shortTitle}</strong>
                      <small>$${room.cost}${recommendation ? ` · ${recommendation}` : ''}</small>
                    </span>
                    ${isRecommended ? `<b>${demand > 0 ? demand : '★'}</b>` : ''}
                  </button>
                `;
              })
              .join('');
            })()}
          </div>
          <div class="speed-controls">
            ${[1, 2, 3]
              .map((speed) => `<button class="mini-button ${this.state.speed === speed ? 'active' : ''}" data-action="set-speed" data-speed="${speed}">${speed}×</button>`)
              .join('')}
          </div>
        </footer>
      </div>
    `;

    this.restoreScrollUntil = performance.now() + 80;
    this.root.querySelector<HTMLElement>('.left-panel')?.scrollTo({ top: leftScrollTop });
    this.root.querySelector<HTMLElement>('.right-panel')?.scrollTo({ top: rightScrollTop });
  }

  private holdPanelRender(durationMs = 260): void {
    this.panelInteractionUntil = Math.max(this.panelInteractionUntil, performance.now() + durationMs);
    this.scheduleDeferredRenderFlush();
  }

  private shouldDeferRender(): boolean {
    return Boolean(this.root.querySelector('.left-panel, .right-panel')) && performance.now() < this.panelInteractionUntil;
  }

  private scheduleDeferredRenderFlush(): void {
    if (this.panelInteractionTimer) {
      window.clearTimeout(this.panelInteractionTimer);
    }

    const delay = Math.max(32, this.panelInteractionUntil - performance.now() + 16);
    this.panelInteractionTimer = window.setTimeout(() => {
      this.panelInteractionTimer = undefined;
      if (this.shouldDeferRender()) {
        this.scheduleDeferredRenderFlush();
        return;
      }

      if (this.deferredRender) {
        this.render();
      }
    }, delay);
  }

  private metricCard(label: string, value: string, tone: 'good' | 'bad' | 'neutral'): string {
    return `
      <div class="metric-card ${tone}">
        <span>${label}</span>
        <strong>${value}</strong>
      </div>
    `;
  }

  private renderCollapsibleSection(section: HudSectionId, title: string, content: string, meta = ''): string {
    const text = getTranslations(this.state.locale);
    const collapsed = Boolean(this.state.hudCollapsed[section]);
    const actionLabel = collapsed ? text.hud.expand : text.hud.collapse;
    return `
      <section class="hud-section ${collapsed ? 'collapsed' : 'expanded'}" data-section-id="${section}">
        <div class="panel-heading compact collapsible-heading">
          <span>${title}</span>
          <button class="mini-button section-toggle" data-action="toggle-hud-section" data-section="${section}" aria-expanded="${collapsed ? 'false' : 'true'}">
            ${meta ? `<b>${meta}</b>` : ''}<em>${actionLabel}</em>
          </button>
        </div>
        ${collapsed ? '' : `<div class="hud-section-body">${content}</div>`}
      </section>
    `;
  }

  private renderIncident(): string {
    const text = getTranslations(this.state.locale);
    const incident = this.state.activeIncident;
    if (!incident) {
      return '';
    }

    const ratio = Math.min(1, incident.progress / incident.target);
    const progress = `${Math.min(incident.progress, incident.target)}/${incident.target}`;
    return `
      <div class="incident-card ${incident.kind}" data-incident-kind="${incident.kind}">
        <div>
          <em>${text.hud.incident} · ${Math.ceil(incident.remainingSeconds)}s</em>
          <strong>${incident.title}</strong>
          <small>${incident.description}</small>
        </div>
        <div class="incident-meter">
          <span>${text.hud.progress} ${progress}</span>
          <i style="--progress:${Math.round(ratio * 100)}%"></i>
        </div>
        <small>${text.hud.incidentReward}: $${incident.rewardMoney} · +${incident.rewardScore} ${text.hud.score} · ${text.hud.incidentPenalty}: -${incident.penaltyReputation}% ${text.hud.reputationShort}</small>
      </div>
    `;
  }

  private renderQueue(): string {
    const text = getTranslations(this.state.locale);
    if (this.state.patients.length === 0) {
      return `<div class="empty-state">${text.hud.noPets}</div>`;
    }

    return this.state.patients
      .slice(0, 6)
      .map((patient) => {
        const illness = getIllness(patient);
        const patience = Math.max(0, Math.round((patient.patience / patient.maxPatience) * 100));
        const canPrioritize = patient.status === 'waiting' && !patient.triageBoost;
        return `
          <button class="queue-card ${patient.priority} ${patient.triageBoost ? 'triaged' : ''}" data-action="inspect-patient" data-patient-id="${patient.id}">
            <span class="pet-avatar pet-token ${patient.petKind}">${this.petShortCode(patient)}</span>
            <span class="queue-copy">
              <strong>${patient.triageBoost ? '★ ' : ''}${patient.name} · ${text.priorities[patient.priority]}</strong>
              <small>${getIllnessTitle(illness, this.state.locale)} · ${text.temperaments[patient.temperament]} · ${this.statusLabel(patient.status)}</small>
              <span class="tiny-meter"><i style="width:${patience}%"></i></span>
            </span>
            ${canPrioritize ? `<span class="queue-triage" data-action="prioritize-patient" data-patient-id="${patient.id}">${text.actions.prioritizePatient}</span>` : ''}
          </button>
        `;
      })
      .join('');
  }

  private renderPressureMeter(): string {
    const text = getTranslations(this.state.locale);
    const pressure = Math.round(this.state.queuePressure);
    const pressureMood = pressure > 78 ? 'bad' : pressure > 52 || this.state.rushActiveSeconds > 0 ? 'warn' : 'good';
    return `
      <div class="pressure-card ${pressureMood}">
        <span>
          <strong>${this.state.rushActiveSeconds > 0 ? text.hud.rushHour : text.hud.queuePressure}</strong>
          <small>${pressure}%</small>
        </span>
        <i style="--pressure:${pressure}%"></i>
      </div>
    `;
  }

  private renderPlayerProgress(): string {
    const text = getTranslations(this.state.locale);
    return `
      <div class="progress-card player-card">
        <span>
          <strong>${text.hud.player}</strong>
          <button class="mini-button" data-action="rename-player">${text.actions.renamePlayer}</button>
        </span>
        <b>${this.escapeHtml(this.state.player.name)}</b>
        <small>${text.hud.score}: ${Math.round(this.state.metrics.score)} · ${text.hud.bestScore}: ${Math.round(this.state.player.bestScore)} · ${text.hud.runs}: ${this.state.player.totalRuns}</small>
        <button class="mini-button save-score-button" data-action="save-score">${text.actions.saveScore}</button>
      </div>
    `;
  }

  private renderHospitalLevel(): string {
    const text = getTranslations(this.state.locale);
    const level = this.state.hospitalLevel;
    const ratio = Math.min(100, Math.round((level.xp / level.nextXp) * 100));
    return `
      <div class="progress-card level-card">
        <span>
          <strong>${text.hud.hospitalLevel} ${level.level}</strong>
          <small>${level.title}</small>
        </span>
        <i class="level-meter" style="--level:${ratio}%"></i>
        <small>${level.xp}/${level.nextXp} XP · ${text.hud.contracts}: ${this.state.completedContracts}</small>
      </div>
    `;
  }

  private renderChapterMap(): string {
    const text = getTranslations(this.state.locale);
    const activeMapId = this.state.mapProgress.activeMapId;
    return `
      <div class="progress-card map-card">
        <span>
          <strong>${text.hud.mapChapter}</strong>
          <small>${text.hud.goalWave} ${this.state.objectiveWave} · ${text.hud.level} ${this.state.hospitalLevel.level}</small>
        </span>
        <div class="map-list">
          ${MAP_ORDER.map((mapId) => {
            const definition = MAP_DEFINITIONS[mapId];
            const mapText = getMapText(mapId, this.state.locale);
            const isUnlocked = this.state.mapProgress.unlockedMapIds.includes(mapId);
            const isActive = activeMapId === mapId;
            return `
              <div class="map-node ${isActive ? 'active' : ''} ${isUnlocked ? 'unlocked' : 'locked'}">
                <span>
                  <strong>${definition.chapter}. ${mapText.title}</strong>
                  <small>${mapText.subtitle}</small>
                </span>
                <small>${mapText.description}</small>
                <em>${text.hud.mapPressure} ×${definition.pressureMultiplier.toFixed(2)} · ${text.hud.mapRevenue} ×${definition.revenueMultiplier.toFixed(2)} · ${text.hud.mapUrgency} +${Math.round(definition.urgentBias * 100)}%</em>
                ${isActive ? `<b>${text.hud.mapActive}</b>` : isUnlocked ? `<button class="mini-button" data-action="select-map" data-map-id="${mapId}">${text.hud.mapSelect}</button>` : `<b>${text.hud.mapLocked}</b><small>${text.hud.mapUnlocksAt(definition.unlockWave)}</small>`}
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  private renderDifficultyControls(): string {
    const text = getTranslations(this.state.locale);
    const difficulties = Object.keys(DIFFICULTY_DEFINITIONS) as DifficultyId[];
    return `
      <div class="progress-card difficulty-card">
        <strong>${text.hud.difficulty}</strong>
        <div class="difficulty-buttons">
          ${difficulties.map((difficulty) => {
            const difficultyText = text.difficulties[difficulty];
            return `
              <button class="mini-button ${this.state.difficulty === difficulty ? 'active' : ''}" data-action="set-difficulty" data-difficulty="${difficulty}" title="${difficultyText.description}">
                ${difficultyText.shortTitle} ×${DIFFICULTY_DEFINITIONS[difficulty].scoreMultiplier.toFixed(2)}
              </button>
            `;
          }).join('')}
        </div>
        <small>${text.difficulties[this.state.difficulty].description}</small>
      </div>
    `;
  }

  private renderLeaderboard(): string {
    const text = getTranslations(this.state.locale);
    const rows = this.state.leaderboard.slice(0, 5);
    return `
      <div class="progress-card leaderboard-card">
        <span>
          <strong>${text.hud.leaderboard}</strong>
          <button class="mini-button" data-action="clear-leaderboard">${text.actions.clearLeaderboard}</button>
        </span>
        ${rows.length === 0 ? `<small>${text.hud.noScores}</small>` : rows.map((entry, index) => `
          <div class="leaderboard-row ${entry.playerName === this.state.player.name ? 'current' : ''}">
            <b>#${index + 1}</b>
            <span>${this.escapeHtml(entry.playerName)}<small>${text.difficulties[entry.difficulty].shortTitle} · ${text.hud.day} ${entry.day}</small></span>
            <strong>${Math.round(entry.score)}</strong>
          </div>
        `).join('')}
      </div>
    `;
  }

  private renderContracts(): string {
    const text = getTranslations(this.state.locale);
    const visibleContracts = this.state.contracts
      .filter((contract) => !contract.completed)
      .sort((left, right) => Number(right.active) - Number(left.active))
      .slice(0, 4);
    if (visibleContracts.length === 0) {
      return '';
    }

    return `
      <div class="panel-heading compact">
        <span>${text.hud.contracts}</span>
        <strong>${this.state.contracts.filter((contract) => contract.active && !contract.completed).length}/${2}</strong>
      </div>
      <div class="contract-list">
        ${visibleContracts.map((contract) => {
          const ratio = Math.min(100, Math.round((contract.progress / contract.target) * 100));
          const title = getContractTitle(contract.kind, this.state.locale);
          const description = text.contracts[contract.kind].description;
          return `
            <div class="contract-card ${contract.active ? 'active' : ''}">
              <div>
                <em>${contract.active ? text.hud.activeContracts : text.hud.availableContracts}</em>
                <strong>${title}</strong>
                <small>${description}</small>
                <small>${text.hud.contractReward}: $${contract.rewardMoney} · +${contract.rewardReputation}% · +${contract.rewardScore}</small>
              </div>
              <span>${Math.min(contract.progress, contract.target)}/${contract.target}</span>
              <i style="--contract:${ratio}%"></i>
              ${contract.active ? '' : `<button class="mini-button" data-action="start-contract" data-contract-id="${contract.id}">${text.actions.startContract}</button>`}
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  private renderArrivalMeter(): string {
    const text = getTranslations(this.state.locale);
    const seconds = Math.max(0, Math.ceil(this.state.spawnTimer));
    const isSoon = seconds <= 3 || this.state.rushActiveSeconds > 0;
    const ratio = Math.round(clampRatio(1 - seconds / 12) * 100);
    return `
      <div class="arrival-card ${isSoon ? 'soon' : ''}">
        <span>
          <strong>${isSoon ? text.hud.incomingSoon : text.hud.nextArrival}</strong>
          <small>${seconds}s</small>
        </span>
        <i style="--arrival:${ratio}%"></i>
      </div>
    `;
  }

  private renderOperationsWatch(): string {
    const text = getTranslations(this.state.locale);
    const dirtyRooms = this.state.rooms.filter((room) => room.cleanliness < 45).length;
    const tiredStaff = this.state.staff.filter((staff) => staff.mode !== 'resting' && staff.energy < 30).length;
    const queueRisk = this.state.queuePressure > 70 ? Math.round(this.state.queuePressure) : 0;
    const debtRisk = this.state.money < 0 ? this.state.money : 0;
    const lostPets = this.state.metrics.lostToday;
    const alerts = [
      debtRisk < 0 ? { label: text.hud.debtRisk, value: `$${debtRisk}`, tone: 'bad' } : undefined,
      lostPets > 0 ? { label: text.hud.lostPets, value: lostPets, tone: 'bad' } : undefined,
      dirtyRooms > 0 ? { label: text.hud.dirtyRooms, value: dirtyRooms, tone: 'bad' } : undefined,
      tiredStaff > 0 ? { label: text.hud.tiredStaff, value: tiredStaff, tone: 'warn' } : undefined,
      queueRisk > 0 ? { label: text.hud.queueRisk, value: `${queueRisk}%`, tone: queueRisk > 84 ? 'bad' : 'warn' } : undefined,
    ].filter(Boolean) as Array<{ label: string; value: number | string; tone: 'bad' | 'warn' }>;

    return `
      <div class="ops-watch ${alerts.length > 0 ? 'has-alerts' : ''} ${alerts.some((alert) => alert.tone === 'bad') ? 'critical' : ''}">
        <strong>${text.hud.operations}</strong>
        ${alerts.length === 0 ? `<span>${text.hud.allStable}</span>` : alerts.map((alert) => `<span class="${alert.tone}">${alert.label}<b>${alert.value}</b></span>`).join('')}
      </div>
    `;
  }

  private renderCoachTip(): string {
    const text = getTranslations(this.state.locale);
    const tip = this.getCoachTip();
    return `
      <div class="coach-card ${tip.tone}">
        <strong>${text.hud.coachTitle}</strong>
        <span>${tip.message}</span>
      </div>
    `;
  }

  private getCoachTip(): { message: string; tone: 'good' | 'warn' | 'bad' } {
    const text = getTranslations(this.state.locale);
    const dirtyRoom = [...this.state.rooms]
      .filter((room) => room.cleanliness < 45)
      .sort((left, right) => left.cleanliness - right.cleanliness)[0];
    if (dirtyRoom) {
      return { message: text.hud.coachClean(getRoomText(dirtyRoom, this.state.locale).shortTitle), tone: 'bad' };
    }

    const tiredStaff = [...this.state.staff]
      .filter((staff) => staff.mode !== 'resting' && staff.energy < 30)
      .sort((left, right) => left.energy - right.energy)[0];
    if (tiredStaff) {
      return { message: text.hud.coachRest(tiredStaff.name), tone: 'warn' };
    }

    const unstaffedRoom = this.state.rooms.find((room) => !room.assignedStaffId);
    if (unstaffedRoom) {
      return { message: text.hud.coachAssign(getRoomText(unstaffedRoom, this.state.locale).shortTitle), tone: 'warn' };
    }

    if (this.state.queuePressure > 70) {
      return { message: text.hud.coachQueue, tone: 'warn' };
    }

    const comfortObjective = this.state.objectives.find((objective) => !objective.completed && objective.kind === 'upgradeWaitingComfort');
    if (comfortObjective && this.state.money >= getWaitingComfortUpgradeCost(this.state.facilities.waitingComfortLevel)) {
      return { message: text.hud.coachComfort, tone: 'good' };
    }

    const roomDemand = this.getRoomDemand();
    const recommendedRoom = this.getRecommendedRoomKind(roomDemand);
    if (recommendedRoom && this.state.money >= ROOM_DEFINITIONS[recommendedRoom].cost) {
      return { message: text.hud.coachBuild(getRoomText({ kind: recommendedRoom }, this.state.locale).shortTitle), tone: 'good' };
    }

    const upgradableRoom = this.state.rooms.find((room) => room.level < MAX_ROOM_LEVEL && this.state.money >= getRoomUpgradeCost(room));
    if (upgradableRoom) {
      return { message: text.hud.coachUpgrade, tone: 'good' };
    }

    if (this.state.money >= this.hireCost()) {
      return { message: text.hud.coachHire, tone: 'good' };
    }

    return { message: text.hud.coachStable, tone: 'good' };
  }

  private renderWaitingComfort(): string {
    const text = getTranslations(this.state.locale);
    const level = this.state.facilities.waitingComfortLevel;
    const maxLevel = 3;
    const cost = getWaitingComfortUpgradeCost(level);
    const label = level >= maxLevel ? text.hud.maxed : `${text.actions.upgradeComfort} · $${cost}`;
    return `
      <div class="comfort-card">
        <span>
          <strong>${text.hud.waitingComfort}</strong>
          <small>${this.formatLevel(level)}/${maxLevel}</small>
        </span>
        <i style="--comfort:${Math.round((level / maxLevel) * 100)}%"></i>
        <button class="mini-button" data-action="upgrade-waiting-comfort" ${level >= maxLevel ? 'disabled' : ''}>${label}</button>
      </div>
    `;
  }

  private renderStaff(): string {
    const text = getTranslations(this.state.locale);
    return this.state.staff
      .map((staff) => {
        const room = staff.assignedRoomId ? this.state.rooms.find((candidate) => candidate.id === staff.assignedRoomId) : undefined;
        const roomLabel = room ? getRoomText(room, this.state.locale).shortTitle : text.hud.floating;
        const energy = Math.round(staff.energy);
        const modeLabel = staff.mode === 'resting' ? text.hud.resting : text.hud.working;
        const actionLabel = staff.mode === 'resting' ? text.actions.resumeStaff : text.actions.restStaff;
        const actionName = staff.mode === 'resting' ? 'resume-staff' : 'rest-staff';
        const energyState = staff.mode === 'resting' ? 'resting' : staff.energy < 30 ? 'low-energy' : 'working';
        return `
          <div class="staff-card ${energyState}">
            <span class="staff-avatar staff-token ${staff.role}">${this.staffShortCode(staff)}</span>
            <span>
              <strong>${staff.name}</strong>
              <small>${this.formatLevel(staff.level)} · ${roomLabel} · ${modeLabel} · ${energy}% ${text.hud.energy}</small>
              <span class="tiny-meter"><i style="width:${Math.round((staff.xp / getStaffXpForNextLevel(staff.level)) * 100)}%"></i></span>
            </span>
            <button class="mini-button staff-action" data-action="${actionName}" data-staff-id="${staff.id}">${actionLabel}</button>
          </div>
        `;
      })
      .join('');
  }

  private renderDailySummary(): string {
    const text = getTranslations(this.state.locale);
    const latestReport = this.state.dailyReports[0];
    const reportHtml = latestReport ? this.renderDailyReport(latestReport) : `<div class="empty-state">${text.hud.todayRevenue}: $${this.state.metrics.revenueToday} · ${text.hud.bestCare}: ${this.state.metrics.bestQualityToday}%</div>`;
    return `
      <div class="panel-heading compact">
        <span>${text.hud.dailySummary}</span>
      </div>
      <div class="daily-summary-list">
        <div class="clinic-totals-card">
          <span><small>${text.hud.treated}</small><strong>${this.state.metrics.totalTreated}</strong></span>
          <span><small>${text.hud.todayRevenue}</small><strong>$${this.state.metrics.revenueToday}</strong></span>
          <span><small>${text.hud.bestCare}</small><strong>${this.state.metrics.bestQualityToday}%</strong></span>
        </div>
        ${reportHtml}
      </div>
    `;
  }

  private renderDailyReport(report: DailyReport): string {
    const text = getTranslations(this.state.locale);
    return `
      <div class="daily-report-card">
        <strong>${text.hud.day} ${report.day}</strong>
        <small>${text.hud.treated}: ${report.treated} · ${text.hud.lost}: ${report.lost}</small>
        <span>$${report.revenue} · ${text.hud.bestCare} ${report.bestQuality}% · ${text.hud.reputationShort} ${report.reputation}%</span>
      </div>
    `;
  }

  private renderObjectives(): string {
    const visibleObjectives = this.state.objectives.filter((objective) => !objective.completed).slice(0, 3);
    if (visibleObjectives.length === 0) {
      return `<div class="empty-state">${getTranslations(this.state.locale).hud.complete}</div>`;
    }

    return visibleObjectives.map((objective) => this.renderObjective(objective)).join('');
  }

  private renderObjective(objective: HospitalObjective): string {
    const text = getTranslations(this.state.locale);
    const ratio = Math.min(1, objective.progress / objective.target);
    const current = Math.min(objective.progress, objective.target);
    return `
      <div class="objective-card">
        <div>
          <em>${text.hud.goalWave} ${objective.wave}</em>
          <strong>${getObjectiveTitle(objective, this.state.locale)}</strong>
          <small>${text.hud.reward} $${objective.rewardMoney} · +${objective.rewardReputation}%</small>
        </div>
        <span>${Math.round(current)}/${objective.target}</span>
        <i style="--progress:${Math.round(ratio * 100)}%"></i>
      </div>
    `;
  }

  private renderRecentCare(): string {
    const text = getTranslations(this.state.locale);
    if (this.state.treatmentReports.length === 0) {
      return '';
    }

    return `
      <div class="recent-care-card">
        <div class="section-title">${text.hud.recentCare}</div>
        ${this.state.treatmentReports.slice(0, 3).map((report) => this.renderTreatmentReport(report)).join('')}
      </div>
    `;
  }

  private renderTreatmentReport(report: TreatmentReport): string {
    const text = getTranslations(this.state.locale);
    const room = getRoomText({ kind: report.roomKind }, this.state.locale).shortTitle;
    return `
      <div class="care-report ${report.grade}">
        <span class="pet-token ${report.petKind}">${report.score}</span>
        <span>
          <strong>${'★'.repeat(report.stars)} ${report.patientName} · ${text.grades[report.grade]}</strong>
          <small>${room} · ${text.carePolicies[report.carePolicy].shortTitle} · ${text.hud.careStreak} ×${report.streak}</small>
          <small>${text.temperaments[report.temperament]} · ${report.story}</small>
          <span class="care-economy">
            <b>$${report.revenue}</b>
            <em>${text.hud.bonus} ${report.bonus >= 0 ? '+' : ''}$${report.bonus}</em>
          </span>
        </span>
      </div>
    `;
  }

  private renderInspector(room?: RoomState, patient?: PatientState): string {
    const text = getTranslations(this.state.locale);
    if (room) {
      const roomDefinition = ROOM_DEFINITIONS[room.kind];
      const roomText = getRoomText(room, this.state.locale);
      const staff = room.assignedStaffId ? this.state.staff.find((candidate) => candidate.id === room.assignedStaffId) : undefined;
      const patientInRoom = room.currentPatientId ? this.state.patients.find((candidate) => candidate.id === room.currentPatientId) : undefined;
      const upgradeCost = getRoomUpgradeCost(room);
      const canUpgrade = room.level < MAX_ROOM_LEVEL && this.state.money >= upgradeCost;
      const upgradeReason = room.level >= MAX_ROOM_LEVEL ? text.disabledReasons.fullyUpgraded : text.disabledReasons.notEnoughMoney(upgradeCost);
      const cleanDisabled = room.cleanliness >= 92 || room.cleaningCooldown > 0;
      const cleanReason = room.cleaningCooldown > 0 ? text.disabledReasons.cleaningCooldown(Math.ceil(room.cleaningCooldown)) : text.disabledReasons.alreadyClean;
      const cleanLabel = room.cleaningCooldown > 0 ? `${text.actions.cleaning} · ${Math.ceil(room.cleaningCooldown)}s` : `${text.actions.cleanRoom} · $45`;
      return `
        <div class="inspector-card">
          <div class="inspector-hero" style="--accent:#${roomDefinition.accent.toString(16).padStart(6, '0')}">
            <span>${roomDefinition.icon}</span>
            <div>
              <h2>${roomText.title}</h2>
              <p>${roomText.description}</p>
            </div>
          </div>
          <dl class="detail-grid">
            <div><dt>${text.hud.level}</dt><dd>${room.level}/${MAX_ROOM_LEVEL}</dd></div>
            <div><dt>${text.hud.staff}</dt><dd>${staff?.name ?? text.hud.unassigned}</dd></div>
            <div><dt>${text.hud.patient}</dt><dd>${patientInRoom?.name ?? text.hud.idle}</dd></div>
            <div><dt>${text.hud.treated}</dt><dd>${room.patientsTreated}</dd></div>
            <div><dt>${text.hud.cleanliness}</dt><dd>${Math.round(room.cleanliness)}%</dd></div>
            <div><dt>${text.hud.activePolicy}</dt><dd>${text.carePolicies[room.carePolicy].shortTitle}</dd></div>
          </dl>
          <button class="wide-action" data-action="upgrade-room" data-room-id="${room.id}" ${canUpgrade ? '' : 'disabled'}>
            <span>${room.level < MAX_ROOM_LEVEL ? `${text.actions.upgradeRoom} · $${upgradeCost}` : text.actions.fullyUpgraded}</span>
            ${canUpgrade ? '' : `<small>${upgradeReason}</small>`}
          </button>
          <button class="wide-action secondary" data-action="clean-room" data-room-id="${room.id}" ${cleanDisabled ? 'disabled' : ''}>
            <span>${cleanLabel}</span>
            ${cleanDisabled ? `<small>${cleanReason}</small>` : ''}
          </button>
          ${this.renderStaffAssignment(room)}
          ${this.renderCarePolicyControls(room)}
        </div>
        ${staff ? this.renderSkillTree(staff) : ''}
      `;
    }

    if (patient) {
      const illness = getIllness(patient);
      const sootheDisabled = patient.status === 'treating' || patient.status === 'leaving' || patient.patience >= patient.maxPatience * 0.92;
      const triageDisabled = patient.status !== 'waiting' || patient.triageBoost;
      const sootheReason = patient.status === 'treating' || patient.status === 'leaving' ? text.disabledReasons.petUnavailable : text.disabledReasons.petAlreadyCalm;
      const triageReason = patient.triageBoost ? text.disabledReasons.alreadyTriaged : text.disabledReasons.notWaiting;
      return `
        <div class="inspector-card">
          <div class="inspector-hero" style="--accent:#35c986">
            <span class="pet-token ${patient.petKind}">${this.petShortCode(patient)}</span>
            <div>
              <h2>${patient.name}</h2>
              <p>${getIllnessTitle(illness, this.state.locale)} · ${text.hud.needsRoom} ${getRoomText({ kind: patient.requiredRoom }, this.state.locale).shortTitle}</p>
            </div>
          </div>
          <dl class="detail-grid">
            <div><dt>${text.hud.status}</dt><dd>${this.statusLabel(patient.status)}</dd></div>
            <div><dt>${text.hud.priority}</dt><dd>${text.priorities[patient.priority]}</dd></div>
            <div><dt>${text.hud.temperament}</dt><dd>${text.temperaments[patient.temperament]}</dd></div>
            <div><dt>${text.hud.patience}</dt><dd>${Math.round((patient.patience / patient.maxPatience) * 100)}%</dd></div>
            <div><dt>${text.hud.routeSteps}</dt><dd>${patient.path.length}</dd></div>
            <div><dt>${text.hud.room}</dt><dd>${getRoomText({ kind: patient.requiredRoom }, this.state.locale).shortTitle}</dd></div>
          </dl>
          <div class="pet-story-card">
            <strong>${text.hud.story}</strong>
            <small>${patient.story}</small>
          </div>
          <button class="wide-action secondary" data-action="soothe-patient" data-patient-id="${patient.id}" ${sootheDisabled ? 'disabled' : ''}>
            <span>${text.actions.soothePatient} · $32</span>
            ${sootheDisabled ? `<small>${sootheReason}</small>` : ''}
          </button>
          <button class="wide-action triage-action" data-action="prioritize-patient" data-patient-id="${patient.id}" ${triageDisabled ? 'disabled' : ''}>
            <span>${text.actions.prioritizePatient}${patient.triageBoost ? ' ✓' : ''}</span>
            ${triageDisabled ? `<small>${triageReason}</small>` : ''}
          </button>
        </div>
      `;
    }

    const nextRooms = ILLNESSES.reduce<Record<RoomKind, number>>(
      (counts, illness) => {
        counts[illness.requiredRoom] += 1;
        return counts;
      },
      { exam: 0, grooming: 0, lab: 0, recovery: 0 },
    );

    return `
      <div class="inspector-card tutorial-card">
        <h2>${text.tutorial.title}</h2>
        <p>${text.tutorial.body}</p>
        <div class="room-demand">
          ${Object.entries(nextRooms)
            .map(([kind, count]) => `<span>${ROOM_DEFINITIONS[kind as RoomKind].icon} ${getRoomText({ kind: kind as RoomKind }, this.state.locale).shortTitle}: ${count} ${text.hud.cases}</span>`)
            .join('')}
        </div>
      </div>
    `;
  }

  private getInspectedRoom(): RoomState | undefined {
    return this.state.inspectedRoomId ? this.state.rooms.find((room) => room.id === this.state.inspectedRoomId) : undefined;
  }

  private getInspectedPatient(): PatientState | undefined {
    return this.state.inspectedPatientId ? this.state.patients.find((patient) => patient.id === this.state.inspectedPatientId) : undefined;
  }

  private renderCarePolicyControls(room: RoomState): string {
    const text = getTranslations(this.state.locale);
    const policies: CarePolicy[] = ['balanced', 'express', 'comfort'];
    return `
      <div class="policy-card">
        <strong>${text.hud.carePolicy}</strong>
        <div class="policy-list">
          ${policies.map((policy) => {
            const policyText = text.carePolicies[policy];
            const active = room.carePolicy === policy;
            return `
              <button class="policy-button ${active ? 'active' : ''}" data-action="set-care-policy" data-room-id="${room.id}" data-policy="${policy}" ${active ? 'disabled' : ''}>
                <span>${policyText.shortTitle}</span>
                <small>${policyText.description}</small>
              </button>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  private renderStaffAssignment(room: RoomState): string {
    const text = getTranslations(this.state.locale);
    const candidates = this.state.staff.filter((staff) => staff.specialty === 'all' || staff.specialty === room.kind);
    if (candidates.length === 0) {
      return `<div class="assignment-card"><strong>${text.hud.assignStaff}</strong><small>${text.hud.unassigned}</small></div>`;
    }

    return `
      <div class="assignment-card">
        <strong>${text.hud.assignStaff}</strong>
        <div class="assignment-list">
          ${candidates.map((staff) => {
            const isAssigned = staff.assignedRoomId === room.id;
            const energy = Math.round(staff.energy);
            const label = isAssigned ? text.fx.assigned : text.actions.assignHere;
            return `
              <button class="assignment-button ${isAssigned ? 'active' : ''}" data-action="assign-staff" data-staff-id="${staff.id}" data-room-id="${room.id}" ${isAssigned ? 'disabled' : ''}>
                <span>${staff.name}</span>
                <small>${energy}% ${text.hud.energy} · ${staff.mode === 'resting' ? text.hud.resting : text.hud.working}</small>
                <b>${label}</b>
              </button>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  private renderSkillTree(staff: StaffState): string {
    const text = getTranslations(this.state.locale);
    return `
      <div class="inspector-card skill-card">
        <div class="section-title">${text.hud.skillTree} · ${staff.name} · ${staff.skillPoints} ${text.hud.skillPoints}</div>
        <div class="skill-list">
          ${SKILL_ORDER.map((skillId) => {
            const skill = SKILL_DEFINITIONS[skillId];
            const skillText = getSkillText(skillId, this.state.locale);
            const rank = getSkillRank(staff, skillId);
            const locked = rank >= skill.maxRank || staff.skillPoints <= 0;
            const disabledReason = rank >= skill.maxRank ? text.disabledReasons.skillMastered : text.disabledReasons.noSkillPoint;
            return `
              <button class="skill-button ${rank > 0 ? 'learned' : ''}" data-action="train-staff" data-staff-id="${staff.id}" data-skill-id="${skillId}" ${locked ? 'disabled' : ''}>
                <span>${skill.icon}</span>
                <span>
                  <strong>${skillText.title} ${rank}/${skill.maxRank}</strong>
                  <small>${locked ? disabledReason : skillText.description}</small>
                </span>
              </button>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  private statusLabel(status: PatientState['status']): string {
    return getTranslations(this.state.locale).status[status];
  }

  private petShortCode(patient: PatientState): string {
    const labels = {
      dog: 'DG',
      cat: 'CT',
      rabbit: 'RB',
      parrot: 'PR',
    };
    return labels[patient.petKind];
  }

  private staffShortCode(staff: StaffState): string {
    const labels = {
      vet: 'VT',
      nurse: 'NR',
      tech: 'TC',
    };
    return labels[staff.role];
  }

  private getRoomDemand(): Record<RoomKind, number> {
    return this.state.patients.reduce<Record<RoomKind, number>>((counts, patient) => {
      if (patient.status !== 'treating' && patient.status !== 'leaving') {
        counts[patient.requiredRoom] += 1;
      }
      return counts;
    }, {
      exam: 0,
      grooming: 0,
      lab: 0,
      recovery: 0,
    });
  }

  private getRecommendedRoomKind(roomDemand: Record<RoomKind, number>): RoomKind | undefined {
    const entries = Object.entries(roomDemand) as Array<[RoomKind, number]>;
    const [kind, count] = entries.sort((left, right) => right[1] - left[1])[0];
    if (count > 0) {
      return kind;
    }

    const buildObjective = this.state.objectives.find((objective) => !objective.completed && objective.kind === 'buildRoomKind' && objective.roomKind);
    return buildObjective?.roomKind;
  }

  private getRoomRecommendationLabel(kind: RoomKind, demand: number, isRecommended: boolean): string {
    const text = getTranslations(this.state.locale);
    if (demand > 0) {
      return `${demand} ${text.hud.cases}`;
    }
    return isRecommended ? text.hud.objectives : '';
  }

  private formatLevel(level: number): string {
    const text = getTranslations(this.state.locale);
    return this.state.locale === 'zh' ? `${level}${text.hud.levelAbbr}` : `${text.hud.levelAbbr} ${level}`;
  }

  private hireCost(): number {
    return 160 + this.state.staff.length * 45;
  }

  private escapeHtml(value: string): string {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }
}

function clampRatio(value: number): number {
  return Math.min(1, Math.max(0, value));
}
