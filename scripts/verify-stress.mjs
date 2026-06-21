import { spawn } from 'node:child_process';
import { setTimeout as wait } from 'node:timers/promises';

const DEFAULT_URL = 'http://localhost:5173/';
const DEFAULT_CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const baseUrl = process.env.PETCARE_TEST_URL ?? DEFAULT_URL;
const url = withTestMode(baseUrl);
const chromePath = process.env.CHROME_PATH ?? DEFAULT_CHROME;
const port = Number(process.env.PETCARE_STRESS_DEBUG_PORT ?? 9241);
const profile = `/tmp/petcare-stress-${Date.now()}`;

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
    state.money = 1;
    state.reputation = 52;
    state.day = 3;
    state.clock = 99.8;
    state.queuePressure = 96;
    state.rushActiveSeconds = 12;
    state.rushTimer = 40;
    state.spawnTimer = 0.4;
    state.metrics.lostToday = 0;
    state.rooms.forEach((room, index) => {
      room.cleanliness = index === 0 ? 18 : 34;
      room.cleaningCooldown = 0;
    });
    state.staff.forEach((staff) => {
      staff.mode = 'working';
      staff.energy = 16;
    });
    state.patients = Array.from({ length: 2 }, (_, index) => ({
      id: 'stress-patient-' + index,
      name: 'Stress ' + (index + 1),
      petKind: index % 2 === 0 ? 'dog' : 'cat',
      temperament: index % 2 === 0 ? 'fussy' : 'shy',
      story: index % 2 === 0 ? 'complaining about every thermometer' : 'needs a gentle first visit',
      priority: index < 2 ? 'urgent' : 'normal',
      illnessId: index % 3 === 0 ? 'paw-bump' : 'wellness-check',
      requiredRoom: 'exam',
      status: 'waiting',
      x: 4,
      y: 4 + (index % 5),
      targetX: 4,
      targetY: 4 + (index % 5),
      path: [],
      pathIndex: 0,
      maxPatience: 100,
      patience: index === 0 ? 0 : 9 + index,
      treatmentRemaining: 7,
      triageBoost: false,
    }));
    simulation.dispatch({ type: 'setPaused', paused: false });
    simulation.update(1.5);
    state.queuePressure = 96;
    simulation.dispatch({ type: 'setPaused', paused: true });
    if (state.hudCollapsed.reports) {
      simulation.dispatch({ type: 'toggleHudSection', section: 'reports' });
    }
    return true;
  })()`);
  assert(prepared, 'test mode exposes simulation for stress scenario');

  const state = await evaluate(`(() => {
    const game = window.petHospitalTest?.simulation.getState();
    return {
      money: game.money,
      reputation: game.reputation,
      queuePressure: game.queuePressure,
      lostToday: game.metrics.lostToday,
      rushActiveSeconds: game.rushActiveSeconds,
      dirtyRooms: game.rooms.filter((room) => room.cleanliness < 45).length,
      tiredStaff: game.staff.filter((staff) => staff.mode !== 'resting' && staff.energy < 30).length,
      pressureText: document.querySelector('.pressure-card')?.textContent ?? '',
      pressureClass: document.querySelector('.pressure-card')?.className ?? '',
      opsText: document.querySelector('.ops-watch')?.textContent ?? '',
      opsClass: document.querySelector('.ops-watch')?.className ?? '',
      coachText: document.querySelector('.coach-card')?.textContent ?? '',
      coachClass: document.querySelector('.coach-card')?.className ?? '',
      logText: document.querySelector('.event-feed')?.textContent ?? '',
      dailyText: document.querySelector('.daily-summary-list')?.textContent ?? '',
    };
  })()`);

  assert(state.queuePressure >= 80, 'stress scenario creates high queue pressure');
  assert(state.lostToday > 0, 'stress scenario records a lost patient');
  assert(state.money < 0, 'stress scenario triggers debt after upkeep');
  assert(state.dirtyRooms > 0, 'stress scenario exposes dirty rooms');
  assert(state.tiredStaff > 0, 'stress scenario exposes tired staff');
  assert(state.pressureClass.includes('bad') || state.pressureText.includes('高峰') || state.pressureText.includes('Rush'), 'pressure card shows bad or rush state');
  assert(state.opsClass.includes('critical') || state.opsText.includes('队列') || state.opsText.includes('Queue'), 'operations watch highlights queue risk');
  assert(state.opsText.includes('脏') || state.opsText.includes('Dirty') || state.opsText.includes('疲') || state.opsText.includes('Tired'), 'operations watch lists dirty rooms or tired staff');
  assert(state.coachClass.includes('bad') && state.coachText.length > 0, 'coach escalates to a bad warning');
  assert(state.logText.includes('债务') || state.logText.includes('负债') || state.logText.includes('Debt'), 'clinic log records debt warning');
  assert(state.logText.includes('left') || state.logText.includes('离开') || state.logText.includes('流失'), 'clinic log records lost patient warning');
  assert(state.dailyText.includes('Lost') || state.dailyText.includes('流失'), 'daily summary keeps lost patient information visible');

  await close();
  console.log(`Stress verification passed: pressure ${state.queuePressure}%, lost ${state.lostToday}, money ${state.money}.`);
} catch (error) {
  failures.push(error instanceof Error ? error.message : String(error));
} finally {
  chrome.kill('SIGTERM');
}

if (failures.length > 0) {
  console.error('Stress verification failed:');
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
