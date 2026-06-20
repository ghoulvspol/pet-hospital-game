import { spawn } from 'node:child_process';
import { setTimeout as wait } from 'node:timers/promises';

const DEFAULT_URL = 'http://localhost:5173/';
const DEFAULT_CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const baseUrl = process.env.PETCARE_TEST_URL ?? DEFAULT_URL;
const url = withTestMode(baseUrl);
const chromePath = process.env.CHROME_PATH ?? DEFAULT_CHROME;
const port = Number(process.env.PETCARE_DEBUG_PORT ?? 9237);
const profile = `/tmp/petcare-click-verify-${Date.now()}`;

const chrome = spawn(chromePath, [
  '--headless=new',
  '--disable-gpu',
  '--no-first-run',
  '--no-default-browser-check',
  `--user-data-dir=${profile}`,
  `--remote-debugging-port=${port}`,
  '--window-size=1440,960',
  url,
], { stdio: ['ignore', 'ignore', 'pipe'] });

const failures = [];

try {
  const devtools = await connectToChrome(port, url);
  const { send, evaluate, click, keyTap, close } = devtools;
  await send('Runtime.enable');
  await send('Page.enable');
  await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
  await wait(1800);

  const verified = [];
  const mark = (label) => verified.push(label);

  const boot = await evaluate(`(() => ({
    hasCanvas: !!document.querySelector('canvas'),
    pauseText: document.querySelector('[data-action="toggle-pause"]')?.textContent?.trim(),
    moneyText: document.querySelector('.status-strip')?.textContent ?? '',
    coachText: document.querySelector('.coach-card')?.textContent?.trim() ?? '',
  }))()`);
  assert(boot.hasCanvas, 'game canvas boots');
  assert(Boolean(boot.pauseText), 'pause button is visible');
  assert(boot.moneyText.includes('$820'), 'initial money is visible');
  assert(Boolean(boot.coachText), 'coach card is visible');
  mark('boot and coach card');

  await clickElement(evaluate, click, '[data-action="set-difficulty"][data-difficulty="expert"]', devtools);
  let difficultyState = await evaluate(`(() => {
    const state = window.petHospitalTest?.simulation.getState();
    return {
      difficulty: state?.difficulty ?? '',
      money: state?.money ?? 0,
      active: document.querySelector('[data-action="set-difficulty"].active')?.dataset.difficulty ?? '',
      panel: document.querySelector('.left-panel')?.textContent ?? '',
    };
  })()`);
  assert(difficultyState.difficulty === 'expert', 'expert difficulty click updates simulation difficulty');
  assert(difficultyState.active === 'expert', 'expert difficulty button becomes active');
  assert(difficultyState.money === 640, 'expert difficulty changes starting money');
  assert(difficultyState.panel.includes('Expert') || difficultyState.panel.includes('专家'), 'difficulty card shows expert mode text');

  await clickElement(evaluate, click, '[data-action="set-difficulty"][data-difficulty="classic"]', devtools);
  difficultyState = await evaluate(`(() => {
    const state = window.petHospitalTest?.simulation.getState();
    return { difficulty: state?.difficulty ?? '', money: state?.money ?? 0 };
  })()`);
  assert(difficultyState.difficulty === 'classic', 'classic difficulty click restores simulation difficulty');
  assert(difficultyState.money === 820, 'classic difficulty restores starting money');
  mark('difficulty controls');

  await evaluate(`window.prompt = () => 'Dr. Clicks'`);
  await clickElement(evaluate, click, '[data-action="rename-player"]', devtools);
  await wait(300);
  const renamed = await evaluate(`(() => {
    const state = window.petHospitalTest?.simulation.getState();
    return {
      name: state?.player.name ?? '',
      panel: document.querySelector('.player-card')?.textContent ?? '',
    };
  })()`);
  assert(renamed.name === 'Dr. Clicks', 'rename player click updates profile name');
  assert(renamed.panel.includes('Dr. Clicks'), 'player card shows renamed profile');
  mark('player rename prompt');

  await prepareScoreScenario(evaluate);
  await clickElement(evaluate, click, '[data-action="save-score"]', devtools);
  const savedScore = await evaluate(`(() => {
    const state = window.petHospitalTest?.simulation.getState();
    return {
      leaderboardCount: state?.leaderboard.length ?? 0,
      topName: state?.leaderboard[0]?.playerName ?? '',
      topScore: state?.leaderboard[0]?.score ?? 0,
      panel: document.querySelector('.leaderboard-card')?.textContent ?? '',
      best: state?.player.bestScore ?? 0,
    };
  })()`);
  assert(savedScore.leaderboardCount > 0, 'save score click adds a leaderboard entry');
  assert(savedScore.topName === 'Dr. Clicks', 'leaderboard entry uses current player name');
  assert(savedScore.topScore === 4321, 'leaderboard entry stores current score');
  assert(savedScore.best >= 4321, 'save score updates player best score');
  assert(savedScore.panel.includes('4321'), 'leaderboard card renders saved score');
  mark('score save and leaderboard');

  await clickElement(evaluate, click, '[data-action="clear-leaderboard"]', devtools);
  const clearedBoard = await evaluate(`(() => ({
    count: window.petHospitalTest?.simulation.getState().leaderboard.length ?? -1,
    panel: document.querySelector('.leaderboard-card')?.textContent ?? '',
  }))()`);
  assert(clearedBoard.count === 0, 'clear leaderboard click clears local leaderboard state');
  assert(clearedBoard.panel.includes('Save') || clearedBoard.panel.includes('保存'), 'cleared leaderboard shows empty state');
  mark('clear leaderboard');

  await evaluate(`window.petHospitalTest?.simulation.dispatch({ type: 'setPaused', paused: false })`);

  await clickElement(evaluate, click, '[data-action="toggle-pause"]', devtools);
  let pauseText = await textOf(evaluate, '[data-action="toggle-pause"]');
  assert(pauseText.includes('Resume') || pauseText.includes('继续'), 'pause button toggles to resume');
  await keyTap(' ', 'Space', 32);
  pauseText = await textOf(evaluate, '[data-action="toggle-pause"]');
  assert(pauseText.includes('Pause') || pauseText.includes('暂停'), 'space key toggles pause back');
  mark('pause button and space key');

  for (const speed of ['2', '3', '1']) {
    await clickElement(evaluate, click, `[data-action="set-speed"][data-speed="${speed}"]`, devtools);
    const activeSpeed = await evaluate(`document.querySelector('[data-action="set-speed"].active')?.dataset.speed ?? ''`);
    assert(activeSpeed === speed, `${speed}x speed button becomes active`);
  }
  mark('speed controls');

  for (const kind of ['exam', 'grooming', 'lab', 'recovery']) {
    await clickElement(evaluate, click, `.build-dock [data-action="select-room"][data-kind="${kind}"]`, devtools);
    const selectedKind = await evaluate(`window.petHospitalTest?.simulation.getState().selectedRoomKind ?? ''`);
    assert(selectedKind === kind, `${kind} build dock button selects room kind`);
  }
  mark('all build dock room buttons');

  for (const shortcut of [
    { key: '1', code: 'Digit1', keyCode: 49, kind: 'exam' },
    { key: '2', code: 'Digit2', keyCode: 50, kind: 'grooming' },
    { key: '3', code: 'Digit3', keyCode: 51, kind: 'lab' },
    { key: '4', code: 'Digit4', keyCode: 52, kind: 'recovery' },
  ]) {
    await keyTap(shortcut.key, shortcut.code, shortcut.keyCode);
    const selectedKind = await evaluate(`window.petHospitalTest?.simulation.getState().selectedRoomKind ?? ''`);
    assert(selectedKind === shortcut.kind, `${shortcut.key} keyboard shortcut selects ${shortcut.kind}`);
  }
  mark('all keyboard room shortcuts');

  await clickElement(evaluate, click, '[data-action="upgrade-waiting-comfort"]:not(:disabled)', devtools);
  const comfortText = await evaluate(`document.querySelector('.comfort-card')?.textContent ?? ''`);
  assert(comfortText.includes('1/3') || comfortText.includes('1级/3'), 'waiting comfort upgrade updates level');
  mark('waiting comfort upgrade');

  const canvas = await canvasBounds(evaluate);
  await click(canvas.x + 8 * 48, canvas.y + 5 * 48);
  const inspector = await evaluate(`(() => ({
    upgradeCount: document.querySelectorAll('[data-action="upgrade-room"]').length,
    assignCount: document.querySelectorAll('[data-action="assign-staff"]').length,
    policyCount: document.querySelectorAll('[data-action="set-care-policy"]').length,
    text: document.querySelector('.right-panel')?.textContent ?? '',
  }))()`);
  assert(inspector.upgradeCount > 0, 'room click opens upgrade action');
  assert(inspector.assignCount > 0, 'room click opens staff assignment options');
  assert(inspector.policyCount > 0, 'room click opens care policy options');
  assert(inspector.text.includes('Exam') || inspector.text.includes('检查'), 'room inspector shows selected room');
  mark('canvas room inspection');

  await clickElement(evaluate, click, '[data-action="set-care-policy"][data-policy="express"]:not(:disabled)', devtools);
  let policyText = await evaluate(`document.querySelector('.right-panel')?.textContent ?? ''`);
  assert(policyText.includes('Express') || policyText.includes('快速'), 'care policy switches to express');
  await clickElement(evaluate, click, '[data-action="set-care-policy"][data-policy="comfort"]:not(:disabled)', devtools);
  policyText = await evaluate(`document.querySelector('.right-panel')?.textContent ?? ''`);
  assert(policyText.includes('Comfort') || policyText.includes('安抚'), 'care policy switches to comfort');
  mark('care policy buttons');

  await prepareDirtyRoomScenario(evaluate);
  await clickElement(evaluate, click, '[data-action="clean-room"]:not(:disabled)', devtools);
  const afterClean = await evaluate(`(() => {
    const state = window.petHospitalTest?.simulation.getState();
    const room = state?.rooms.find((candidate) => candidate.id === 'room-1');
    return {
      cleanliness: room?.cleanliness ?? 0,
      money: state?.money ?? 0,
      log: document.querySelector('.event-feed')?.textContent ?? '',
    };
  })()`);
  assert(afterClean.cleanliness === 100, 'clean room click restores room cleanliness');
  assert(afterClean.money === 955, 'clean room click charges cleaning cost');
  assert(afterClean.log.includes('闪闪发亮') || afterClean.log.includes('sparkling clean'), 'clean room click records a cleaning event');
  mark('clean room action');

  await clickElement(evaluate, click, '[data-action="upgrade-room"]:not(:disabled)', devtools);
  const afterUpgrade = await evaluate(`(() => ({
    text: document.querySelector('.right-panel')?.textContent ?? '',
    status: document.querySelector('.status-strip')?.textContent ?? '',
    money: window.petHospitalTest?.simulation.getState().money ?? 0,
    roomLevel: window.petHospitalTest?.simulation.getState().rooms.find((candidate) => candidate.id === 'room-1')?.level ?? 0,
    log: document.querySelector('.event-feed')?.textContent ?? '',
  }))()`);
  assert(afterUpgrade.text.includes('2/3') && afterUpgrade.roomLevel === 2, 'upgrade click raises room level');
  assert(afterUpgrade.money !== afterClean.money || afterUpgrade.log.includes('升级') || afterUpgrade.log.includes('upgraded'), 'upgrade click updates money or records upgrade reward');
  mark('room upgrade');

  await clickElement(evaluate, click, '[data-action="rest-staff"][data-staff-id="staff-1"]', devtools);
  const restLog = await evaluate(`document.querySelector('.event-feed')?.textContent ?? ''`);
  assert(restLog.includes('rest') || restLog.includes('休息室'), 'rest staff button records a rest action');
  const hasResumeButton = await evaluate(`!!document.querySelector('[data-action="resume-staff"][data-staff-id="staff-1"]')`);
  if (hasResumeButton) {
    await clickElement(evaluate, click, '[data-action="resume-staff"][data-staff-id="staff-1"]', devtools);
  }
  const resumeLog = await evaluate(`document.querySelector('.event-feed')?.textContent ?? ''`);
  assert(resumeLog.includes('back on duty') || resumeLog.includes('回到岗位') || resumeLog.includes('恢复到可以工作'), 'resume staff button records a resume action');
  mark('staff rest and resume');

  await keyTap('2', 'Digit2', 50);
  const beforeBuild = await evaluate(`(() => {
    const state = window.petHospitalTest?.simulation.getState();
    return { rooms: state?.rooms.length ?? 0, money: state?.money ?? 0 };
  })()`);
  await click(canvas.x + 12 * 48, canvas.y + 8 * 48);
  const afterBuild = await evaluate(`(() => ({
    rooms: window.petHospitalTest?.simulation.getState().rooms.length ?? 0,
    money: window.petHospitalTest?.simulation.getState().money ?? 0,
    text: document.querySelector('.right-panel')?.textContent ?? '',
    assignCount: document.querySelectorAll('[data-action="assign-staff"]:not(:disabled)').length,
  }))()`);
  assert(afterBuild.rooms === beforeBuild.rooms + 1, 'canvas empty tile click adds exactly one new room');
  assert(afterBuild.money < beforeBuild.money, 'canvas build click charges the selected room cost');
  assert(afterBuild.text.includes('Groom') || afterBuild.text.includes('美容'), 'keyboard room select builds and inspects grooming room');
  assert(afterBuild.assignCount > 0, 'new room has an available staff assignment button');
  mark('keyboard room select and build');

  const beforeInvalidBuild = await evaluate(`(() => {
    const state = window.petHospitalTest?.simulation.getState();
    return { rooms: state?.rooms.length ?? 0, money: state?.money ?? 0 };
  })()`);
  await click(canvas.x + 11 * 48, canvas.y + 8 * 48);
  const afterInvalidBuild = await evaluate(`(() => ({
    rooms: window.petHospitalTest?.simulation.getState().rooms.length ?? 0,
    money: window.petHospitalTest?.simulation.getState().money ?? 0,
    log: document.querySelector('.event-feed')?.textContent ?? '',
  }))()`);
  assert(afterInvalidBuild.rooms === beforeInvalidBuild.rooms, 'canvas occupied tile click does not add another room');
  assert(afterInvalidBuild.money === beforeInvalidBuild.money, 'invalid canvas build does not charge money');
  assert(afterInvalidBuild.log.includes('occupied') || afterInvalidBuild.log.includes('已被占用'), 'invalid overlapping canvas build records an occupied-space warning');
  mark('canvas invalid build warning');

  await clickElement(evaluate, click, '[data-action="assign-staff"]:not(:disabled)', devtools);
  const afterAssign = await evaluate(`document.querySelector('.right-panel')?.textContent ?? ''`);
  assert(afterAssign.includes('Nurse Jun') && (afterAssign.includes('Assigned') || afterAssign.includes('已派工')), 'assign staff click updates room assignment');
  mark('staff assignment');

  await prepareStaffTrainingScenario(evaluate);
  await clickElement(evaluate, click, '[data-action="train-staff"][data-skill-id="fastDiagnosis"]:not(:disabled)', devtools);
  const afterTraining = await evaluate(`(() => {
    const staff = window.petHospitalTest?.simulation.getState().staff.find((candidate) => candidate.id === 'staff-1');
    return {
      rank: staff?.skills.fastDiagnosis ?? 0,
      points: staff?.skillPoints ?? 0,
      panel: document.querySelector('.right-panel')?.textContent ?? '',
      log: document.querySelector('.event-feed')?.textContent ?? '',
    };
  })()`);
  assert(afterTraining.rank === 1 && afterTraining.points === 0, 'train staff click spends one point and raises skill rank');
  assert(afterTraining.panel.includes('1/3') || afterTraining.log.includes('学会了') || afterTraining.log.includes('trained'), 'train staff click updates skill UI or log');
  mark('staff training action');

  await scrollElement(evaluate, devtools, '.left-panel', 520);
  const leftScrollTop = await evaluate(`document.querySelector('.left-panel')?.scrollTop ?? 0`);
  assert(leftScrollTop > 0, 'left panel keeps scroll position while the game updates');

  await evaluate(`document.querySelector('.left-panel')?.scrollTo({ top: 0 })`);
  const staffCountBeforeDragScroll = await evaluate(`document.querySelectorAll('.staff-card').length`);
  await dragScrollElement(evaluate, devtools, '.left-panel', 360);
  const dragScrollState = await evaluate(`(() => ({
    scrollTop: document.querySelector('.left-panel')?.scrollTop ?? 0,
    staffCount: document.querySelectorAll('.staff-card').length,
  }))()`);
  assert(dragScrollState.scrollTop > 0, 'left panel drag scrolls from the visible panel area');
  assert(dragScrollState.staffCount === staffCountBeforeDragScroll, 'drag scroll does not trigger hire staff while scrolling');

  await evaluate(`document.querySelector('.left-panel')?.scrollTo({ top: 0 })`);
  await touchScrollElement(evaluate, devtools, '.left-panel', 360);
  const touchScrollTop = await evaluate(`document.querySelector('.left-panel')?.scrollTop ?? 0`);
  assert(touchScrollTop > 0, 'left panel touch swipes scroll from the visible panel area');

  const staffCountBeforeHire = await evaluate(`document.querySelectorAll('.staff-card').length`);
  await clickElement(evaluate, click, '[data-action="hire-staff"]', devtools);
  const staffCountAfterHire = await evaluate(`document.querySelectorAll('.staff-card').length`);
  assert(staffCountAfterHire === staffCountBeforeHire + 1, 'hire staff button adds a new staff member after scrolling the left panel');
  mark('left panel wheel/drag scroll and hire staff');

  await clickElement(evaluate, click, '[data-action="set-locale"][data-locale="en"]', devtools);
  const englishText = await textOf(evaluate, '[data-action="toggle-pause"]');
  assert(englishText.includes('Pause') || englishText.includes('Resume'), 'English locale button works');
  await clickElement(evaluate, click, '[data-action="set-locale"][data-locale="zh"]', devtools);
  const chineseText = await textOf(evaluate, '[data-action="toggle-pause"]');
  assert(chineseText.includes('暂停') || chineseText.includes('继续'), 'Chinese locale button works');
  mark('locale switching');

  await prepareTriagePatientScenario(evaluate);
  const beforePatientCanvasClick = await evaluate(`(() => {
    const state = window.petHospitalTest?.simulation.getState();
    return { rooms: state?.rooms.length ?? 0, inspectedPatientId: state?.inspectedPatientId ?? '' };
  })()`);
  await click(canvas.x + 4 * 48, canvas.y + 5 * 48);
  const afterPatientCanvasClick = await evaluate(`(() => ({
    rooms: window.petHospitalTest?.simulation.getState().rooms.length ?? 0,
    inspectedPatientId: window.petHospitalTest?.simulation.getState().inspectedPatientId ?? '',
    panel: document.querySelector('.right-panel')?.textContent ?? '',
  }))()`);
  assert(afterPatientCanvasClick.rooms === beforePatientCanvasClick.rooms, 'canvas patient click does not build a room');
  assert(afterPatientCanvasClick.inspectedPatientId === 'test-triage', 'canvas patient click selects the patient in simulation state');
  assert(afterPatientCanvasClick.panel.includes('Biscuit') && (afterPatientCanvasClick.panel.includes('优先级') || afterPatientCanvasClick.panel.includes('Priority')), 'canvas patient click opens patient inspector');
  mark('canvas patient inspection');

  await clickElement(evaluate, click, '.queue-triage[data-action="prioritize-patient"]', devtools);
  await clickElement(evaluate, click, '.queue-card.triaged[data-action="inspect-patient"]', devtools);
  const patientInspector = await evaluate(`document.querySelector('.right-panel')?.textContent ?? ''`);
  assert(patientInspector.includes('优先级') || patientInspector.includes('Priority'), 'patient card opens patient inspector');
  const triagedBefore = await evaluate(`document.querySelectorAll('.queue-card.triaged').length`);
  const afterTriage = await evaluate(`(() => ({
    triaged: document.querySelectorAll('.queue-card.triaged').length,
    log: document.querySelector('.event-feed')?.textContent ?? '',
    panel: document.querySelector('.right-panel')?.textContent ?? '',
  }))()`);
  assert(afterTriage.triaged >= triagedBefore && (afterTriage.log.includes('优先分诊') || afterTriage.log.includes('triage') || afterTriage.panel.includes('✓')), 'priority triage click marks or logs the patient');
  mark('patient inspect and priority triage');

  await prepareSoothePatientScenario(evaluate);
  const beforeSoothe = await evaluate(`window.petHospitalTest?.simulation.getState().patients.find((patient) => patient.id === 'test-soothe')?.patience ?? 0`);
  await clickElement(evaluate, click, '[data-action="soothe-patient"]:not(:disabled)', devtools);
  const afterSoothe = await evaluate(`(() => {
    const state = window.petHospitalTest?.simulation.getState();
    const patient = state?.patients.find((candidate) => candidate.id === 'test-soothe');
    return {
      patience: patient?.patience ?? 0,
      money: state?.money ?? 0,
      log: document.querySelector('.event-feed')?.textContent ?? '',
    };
  })()`);
  assert(afterSoothe.patience > beforeSoothe, 'soothe patient click increases patience');
  assert(afterSoothe.money === 968, 'soothe patient click charges soothe cost');
  assert(afterSoothe.log.includes('安抚') || afterSoothe.log.includes('calmed down'), 'soothe patient click records comfort event');
  mark('soothe patient action');

  await clickElement(evaluate, click, '[data-action="clear-inspector"]', devtools);
  const clearedText = await evaluate(`document.querySelector('.right-panel')?.textContent ?? ''`);
  assert(clearedText.includes('扩建') || clearedText.includes('Expand'), 'clear inspector returns to tutorial inspector');
  mark('clear inspector');

  await clickElement(evaluate, click, '[data-action="restart"]', devtools);
  const afterRestart = await evaluate(`(() => ({
    status: document.querySelector('.status-strip')?.textContent ?? '',
    text: document.querySelector('.right-panel')?.textContent ?? '',
    staffCount: document.querySelectorAll('.staff-card').length,
  }))()`);
  assert(afterRestart.status.includes('$820'), 'restart restores initial money');
  assert(!afterRestart.text.includes('2/3'), 'restart resets upgraded room state');
  assert(afterRestart.staffCount === 2, 'restart restores initial staff count');
  mark('restart reset');

  await verifyAllRoomKindsCanBuild(evaluate, click, canvas, devtools);
  mark('all room kinds canvas build');

  await close();
  console.log(`Click verification passed (${verified.length} groups): ${verified.join(', ')}.`);
} catch (error) {
  failures.push(error instanceof Error ? error.message : String(error));
} finally {
  chrome.kill('SIGTERM');
}

if (failures.length > 0) {
  console.error('Click verification failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

function withTestMode(rawUrl) {
  const parsed = new URL(rawUrl);
  parsed.searchParams.set('testMode', '1');
  return parsed.toString();
}

async function prepareDirtyRoomScenario(evaluate) {
  const prepared = await evaluate(`(() => {
    const simulation = window.petHospitalTest?.simulation;
    if (!simulation) return false;
    const state = simulation.getState();
    const room = state.rooms.find((candidate) => candidate.id === 'room-1') ?? state.rooms[0];
    state.paused = true;
    state.money = 1000;
    room.cleanliness = 41;
    room.cleaningCooldown = 0;
    simulation.dispatch({ type: 'inspectRoom', roomId: room.id });
    return true;
  })()`);
  assert(prepared, 'test mode exposes simulation for dirty room scenario');
}

async function prepareStaffTrainingScenario(evaluate) {
  const prepared = await evaluate(`(() => {
    const simulation = window.petHospitalTest?.simulation;
    if (!simulation) return false;
    const state = simulation.getState();
    const staff = state.staff.find((candidate) => candidate.id === 'staff-1') ?? state.staff[0];
    const room = staff.assignedRoomId ? state.rooms.find((candidate) => candidate.id === staff.assignedRoomId) : state.rooms[0];
    state.paused = true;
    staff.skillPoints = 1;
    staff.skills.fastDiagnosis = 0;
    if (room) {
      simulation.dispatch({ type: 'inspectRoom', roomId: room.id });
    }
    return true;
  })()`);
  assert(prepared, 'test mode exposes simulation for staff training scenario');
}

async function prepareTriagePatientScenario(evaluate) {
  const prepared = await evaluate(`(() => {
    const simulation = window.petHospitalTest?.simulation;
    if (!simulation) return false;
    const state = simulation.getState();
    state.paused = true;
    state.patients = [createTestPatient('test-triage', 'Biscuit', 4, 5, 42), ...state.patients.filter((candidate) => candidate.id !== 'test-triage')].slice(0, 6);
    simulation.dispatch({ type: 'inspectPatient', patientId: undefined });
    return true;

    function createTestPatient(id, name, x, y, patience) {
      return {
        id,
        name,
        petKind: 'cat',
        priority: 'normal',
        illnessId: 'wellness-check',
        requiredRoom: 'exam',
        status: 'waiting',
        x,
        y,
        targetX: x,
        targetY: y,
        path: [],
        pathIndex: 0,
        maxPatience: 100,
        patience,
        treatmentRemaining: 7,
        triageBoost: false,
      };
    }
  })()`);
  assert(prepared, 'test mode exposes simulation for triage scenario');
}

async function prepareSoothePatientScenario(evaluate) {
  const prepared = await evaluate(`(() => {
    const simulation = window.petHospitalTest?.simulation;
    if (!simulation) return false;
    const state = simulation.getState();
    state.paused = true;
    state.money = 1000;
    const patient = {
      id: 'test-soothe',
      name: 'Mochi',
      petKind: 'dog',
      priority: 'normal',
      illnessId: 'wellness-check',
      requiredRoom: 'exam',
      status: 'waiting',
      x: 4,
      y: 6,
      targetX: 4,
      targetY: 6,
      path: [],
      pathIndex: 0,
      maxPatience: 100,
      patience: 24,
      treatmentRemaining: 7,
      triageBoost: false,
    };
    state.patients = [patient, ...state.patients.filter((candidate) => candidate.id !== patient.id)].slice(0, 6);
    simulation.dispatch({ type: 'inspectPatient', patientId: patient.id });
    return true;
  })()`);
  assert(prepared, 'test mode exposes simulation for soothe scenario');
}

async function prepareScoreScenario(evaluate) {
  const prepared = await evaluate(`(() => {
    const simulation = window.petHospitalTest?.simulation;
    if (!simulation) return false;
    const state = simulation.getState();
    state.paused = true;
    state.metrics.score = 4321;
    state.metrics.totalTreated = 9;
    state.reputation = 77;
    state.day = 4;
    state.leaderboard = [];
    return true;
  })()`);
  assert(prepared, 'test mode exposes simulation for score scenario');
}

async function verifyAllRoomKindsCanBuild(evaluate, click, canvas, devtools) {
  const prepared = await evaluate(`(() => {
    const simulation = window.petHospitalTest?.simulation;
    if (!simulation) return false;
    const state = simulation.getState();
    state.paused = true;
    state.money = 3000;
    return true;
  })()`);
  assert(prepared, 'test mode exposes simulation for all-room build scenario');

  const buildChecks = [
    { kind: 'exam', gridX: 4, gridY: 1, label: 'Exam', zh: '检查' },
    { kind: 'grooming', gridX: 13, gridY: 1, label: 'Groom', zh: '美容' },
    { kind: 'lab', gridX: 4, gridY: 9, label: 'Lab', zh: '化验' },
    { kind: 'recovery', gridX: 14, gridY: 9, label: 'Rest', zh: '恢复' },
  ];

  for (const check of buildChecks) {
    await clickElement(evaluate, click, `.build-dock [data-action="select-room"][data-kind="${check.kind}"]`, devtools);
    const beforeBuild = await evaluate(`(() => {
      const state = window.petHospitalTest?.simulation.getState();
      return { rooms: state?.rooms.length ?? 0, money: state?.money ?? 0 };
    })()`);
    await click(canvas.x + check.gridX * 48, canvas.y + check.gridY * 48);
    const afterBuild = await evaluate(`(() => {
      const state = window.petHospitalTest?.simulation.getState();
      const latestRoom = state?.rooms[state.rooms.length - 1];
      return {
        rooms: state?.rooms.length ?? 0,
        money: state?.money ?? 0,
        latestKind: latestRoom?.kind ?? '',
        inspectedRoomId: state?.inspectedRoomId ?? '',
        latestRoomId: latestRoom?.id ?? '',
        panel: document.querySelector('.right-panel')?.textContent ?? '',
      };
    })()`);
    assert(afterBuild.rooms === beforeBuild.rooms + 1, `${check.kind} canvas click adds one room`);
    assert(afterBuild.money < beforeBuild.money, `${check.kind} canvas click charges money`);
    assert(afterBuild.latestKind === check.kind, `${check.kind} canvas click creates the selected room kind`);
    assert(afterBuild.inspectedRoomId === afterBuild.latestRoomId, `${check.kind} canvas build opens the new room inspector`);
    assert(afterBuild.panel.includes(check.label) || afterBuild.panel.includes(check.zh), `${check.kind} inspector shows the new room title`);
  }
}

async function connectToChrome(debugPort, targetUrl) {
  let pages;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      pages = await fetch(`http://127.0.0.1:${debugPort}/json`).then((response) => response.json());
      if (Array.isArray(pages) && pages.length > 0) {
        break;
      }
    } catch {
      await wait(200);
    }
  }

  if (!Array.isArray(pages) || pages.length === 0) {
    throw new Error('Unable to connect to Chrome DevTools.');
  }

  const page = pages.find((entry) => entry.url.includes(new URL(targetUrl).host)) ?? pages[0];
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  let id = 0;
  const pending = new Map();

  ws.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      pending.get(message.id)(message);
      pending.delete(message.id);
    }
  });

  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true });
    ws.addEventListener('error', reject, { once: true });
  });

  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const messageId = ++id;
    const timeout = setTimeout(() => {
      pending.delete(messageId);
      reject(new Error(`DevTools command timed out: ${method}`));
    }, 5000);
    pending.set(messageId, (message) => {
      clearTimeout(timeout);
      if (message.error) {
        reject(new Error(`${method}: ${message.error.message}`));
        return;
      }
      resolve(message);
    });
    ws.send(JSON.stringify({ id: messageId, method, params }));
  });

  const evaluate = async (expression) => {
    const response = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    return response.result?.result?.value;
  };

  const click = async (x, y) => {
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
    await wait(240);
  };

  const keyTap = async (key, code, windowsVirtualKeyCode) => {
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key, code, windowsVirtualKeyCode });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode });
    await wait(140);
  };

  return { send, evaluate, click, keyTap, close: () => ws.close() };
}

async function clickElement(evaluate, click, selector, devtools) {
  let rect = await getElementRect(evaluate, selector);
  assert(Boolean(rect), `element exists for selector ${selector}`);

  if (devtools && !rect.visible) {
    await scrollElementIntoView(evaluate, devtools, selector);
    rect = await getElementRect(evaluate, selector);
  }

  assert(Boolean(rect?.visible), `element is visible for selector ${selector}`);
  await click(rect.x + rect.width / 2, rect.y + rect.height / 2);
}

async function getElementRect(evaluate, selector) {
  return evaluate(`(() => {
    const element = document.querySelector(${JSON.stringify(selector)});
    if (!element) return null;
    const rect = element.getBoundingClientRect();
    const panel = element.closest('.left-panel, .right-panel');
    const panelRect = panel?.getBoundingClientRect();
    const visible = rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.right > 0 && rect.top < innerHeight && rect.left < innerWidth && (!panelRect || (rect.top >= panelRect.top + 8 && rect.bottom <= panelRect.bottom - 8));
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, visible };
  })()`);
}

async function textOf(evaluate, selector) {
  return evaluate(`document.querySelector(${JSON.stringify(selector)})?.textContent?.trim() ?? ''`);
}

async function scrollElement(evaluate, devtools, selector, deltaY) {
  const rect = await evaluate(`(() => {
    const element = document.querySelector(${JSON.stringify(selector)});
    if (!element) return null;
    const rect = element.getBoundingClientRect();
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  })()`);
  assert(Boolean(rect), `scroll target exists for selector ${selector}`);
  await devtools.send('Input.dispatchMouseEvent', {
    type: 'mouseWheel',
    x: rect.x + rect.width / 2,
    y: rect.y + rect.height / 2,
    deltaX: 0,
    deltaY,
  });
  await wait(460);
}

async function dragScrollElement(evaluate, devtools, selector, deltaY) {
  const rect = await getElementRect(evaluate, selector);
  assert(Boolean(rect), `drag scroll target exists for selector ${selector}`);

  const x = Math.round(rect.x + rect.width / 2);
  const startY = Math.round(rect.y + rect.height / 2);
  const endY = Math.round(startY - deltaY);
  await devtools.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y: startY });
  await devtools.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y: startY, button: 'left', clickCount: 1 });
  for (let step = 1; step <= 8; step += 1) {
    const y = Math.round(startY + ((endY - startY) * step) / 8);
    await devtools.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, button: 'left', buttons: 1 });
    await wait(34);
  }
  await devtools.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y: endY, button: 'left', clickCount: 1 });
  await wait(460);
}

async function touchScrollElement(evaluate, devtools, selector, deltaY) {
  const rect = await getElementRect(evaluate, selector);
  assert(Boolean(rect), `touch scroll target exists for selector ${selector}`);

  const x = Math.round(rect.x + rect.width / 2);
  const startY = Math.round(rect.y + rect.height * 0.72);
  const endY = Math.round(startY - deltaY);
  await devtools.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x, y: startY, radiusX: 4, radiusY: 4, id: 1 }],
  });
  for (let step = 1; step <= 8; step += 1) {
    const y = Math.round(startY + ((endY - startY) * step) / 8);
    await devtools.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x, y, radiusX: 4, radiusY: 4, id: 1 }],
    });
    await wait(34);
  }
  await devtools.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await wait(460);
}

async function scrollElementIntoView(evaluate, devtools, selector) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const state = await evaluate(`(() => {
      const element = document.querySelector(${JSON.stringify(selector)});
      if (!element) return null;
      const panel = element.closest('.left-panel, .right-panel');
      if (!panel) return { done: true };
      const rect = element.getBoundingClientRect();
      const panelRect = panel.getBoundingClientRect();
      const done = rect.top >= panelRect.top + 8 && rect.bottom <= panelRect.bottom - 8;
      return { done, delta: rect.top < panelRect.top ? -260 : 260, panelSelector: panel.classList.contains('left-panel') ? '.left-panel' : '.right-panel' };
    })()`);
    assert(Boolean(state), `scroll state exists for selector ${selector}`);
    if (state.done) {
      return;
    }
    await scrollElement(evaluate, devtools, state.panelSelector, state.delta);
  }
}

async function waitFor(evaluate, expression, timeoutMs, description) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await evaluate(`Boolean(${expression})`)) {
      return;
    }
    await wait(250);
  }

  throw new Error(`Timed out waiting for ${description}`);
}

async function canvasBounds(evaluate) {
  const rect = await evaluate(`(() => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  })()`);
  assert(Boolean(rect), 'canvas bounds are available');
  return rect;
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}
