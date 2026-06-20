import { spawn } from 'node:child_process';
import { setTimeout as wait } from 'node:timers/promises';

const DEFAULT_URL = 'http://localhost:5173/';
const DEFAULT_CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const baseUrl = process.env.PETCARE_TEST_URL ?? DEFAULT_URL;
const url = withTestMode(baseUrl);
const chromePath = process.env.CHROME_PATH ?? DEFAULT_CHROME;
const port = Number(process.env.PETCARE_LONG_RUN_DEBUG_PORT ?? 9239);
const profile = `/tmp/petcare-long-run-${Date.now()}`;

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
  const { send, evaluate, close } = devtools;
  await send('Runtime.enable');
  await send('Page.enable');
  await wait(1800);

  const prepared = await evaluate(`(() => {
    const simulation = window.petHospitalTest?.simulation;
    if (!simulation) return false;
    const state = simulation.getState();
    state.paused = true;
    state.speed = 3;
    state.money = 1800;
    state.spawnTimer = 0.2;
    state.rushTimer = 7;
    state.rushActiveSeconds = 0;
    state.rooms = state.rooms.filter((room) => room.kind === 'exam' || room.kind === 'recovery');
    state.patients = [];
    const nurse = state.staff.find((staff) => staff.id === 'staff-2');
    if (nurse) {
      nurse.mode = 'working';
      nurse.specialty = 'all';
      nurse.energy = 100;
    }
    simulation.dispatch({ type: 'selectRoomKind', kind: 'grooming' });
    simulation.dispatch({ type: 'buildRoom', gridX: 13, gridY: 8 });
    simulation.dispatch({ type: 'selectRoomKind', kind: 'lab' });
    simulation.dispatch({ type: 'buildRoom', gridX: 10, gridY: 8 });
    simulation.dispatch({ type: 'setCarePolicy', roomId: 'room-1', policy: 'comfort' });
    simulation.dispatch({ type: 'setPaused', paused: false });
    simulation.dispatch({ type: 'setSpeed', speed: 3 });
    return true;
  })()`);
  assert(prepared, 'test mode exposes simulation for long-run scenario');

  await evaluate(`(() => {
    const simulation = window.petHospitalTest.simulation;
    for (let step = 0; step < 260; step += 1) {
      simulation.update(0.75);
    }
  })()`);
  await wait(800);

  const state = await evaluate(`(() => {
    const game = window.petHospitalTest?.simulation.getState();
    return {
      money: game.money,
      day: game.day,
      totalTreated: game.metrics.totalTreated,
      revenueToday: game.metrics.revenueToday,
      bestQualityToday: game.metrics.bestQualityToday,
      treatmentReports: game.treatmentReports.length,
      dailyReports: game.dailyReports.length,
      events: game.events.map((event) => event.message),
      rooms: game.rooms.map((room) => ({ kind: room.kind, cleanliness: room.cleanliness, treated: room.patientsTreated, hasStaff: Boolean(room.assignedStaffId) })),
      patients: game.patients.map((patient) => patient.status),
      queuePressure: game.queuePressure,
      rushActiveSeconds: game.rushActiveSeconds,
      statusText: document.querySelector('.status-strip')?.textContent ?? '',
      recentCareText: document.querySelector('.recent-care-card')?.textContent ?? '',
      dailyText: document.querySelector('.daily-summary-list')?.textContent ?? '',
      opsText: document.querySelector('.ops-watch')?.textContent ?? '',
      logText: document.querySelector('.event-feed')?.textContent ?? '',
    };
  })()`);

  assert(state.day >= 2, 'long-run simulation advances at least one day');
  assert(state.totalTreated > 0, 'long-run simulation treats pets');
  assert(state.treatmentReports > 0, 'long-run simulation records treatment reports');
  assert(state.dailyReports > 0, 'long-run simulation records daily reports');
  assert(state.rooms.some((room) => room.treated > 0), 'at least one room completes treatments');
  assert(state.rooms.some((room) => room.cleanliness < 100), 'room cleanliness changes over time');
  assert(state.events.length > 0 && state.logText.length > 0, 'clinic log remains populated');
  assert(state.statusText.includes('$'), 'HUD money remains visible after long-run');
  assert(state.recentCareText.includes('$') || state.recentCareText.includes('护理'), 'recent care card displays treatment economy');
  assert(state.dailyText.includes('$') || state.dailyText.includes('收入'), 'daily summary displays economy');
  assert(state.opsText.length > 0, 'operations watch remains visible');
  assert(Number.isFinite(state.queuePressure) && state.queuePressure >= 0, 'queue pressure remains valid');

  await close();
  console.log(`Long-run verification passed: day ${state.day}, treated ${state.totalTreated}, reports ${state.treatmentReports}, daily ${state.dailyReports}.`);
} catch (error) {
  failures.push(error instanceof Error ? error.message : String(error));
} finally {
  chrome.kill('SIGTERM');
}

if (failures.length > 0) {
  console.error('Long-run verification failed:');
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

  return { send, evaluate, close: () => ws.close() };
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}
