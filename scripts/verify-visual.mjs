import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { setTimeout as wait } from 'node:timers/promises';

const DEFAULT_URL = 'http://localhost:5173/';
const DEFAULT_CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const baseUrl = process.env.PETCARE_TEST_URL ?? DEFAULT_URL;
const chromePath = process.env.CHROME_PATH ?? DEFAULT_CHROME;
const outputDir = path.resolve('screenshots');
const scenarios = [
  {
    name: 'desktop',
    file: 'pet-hospital-visual-desktop.png',
    width: 1440,
    height: 960,
    setup: `(() => true)()`,
    checks: `(() => {
      const canvas = document.querySelector('canvas')?.getBoundingClientRect();
      const left = document.querySelector('.left-panel')?.getBoundingClientRect();
      const right = document.querySelector('.right-panel')?.getBoundingClientRect();
      const dock = document.querySelector('.build-dock')?.getBoundingClientRect();
      return {
        ok: Boolean(canvas && left && right && dock && canvas.width > 500 && left.width > 180 && right.width > 200),
        details: { canvasWidth: canvas?.width ?? 0, leftWidth: left?.width ?? 0, rightWidth: right?.width ?? 0, dockBottom: dock?.bottom ?? 0 },
      };
    })()`,
  },
  {
    name: 'mobile',
    file: 'pet-hospital-visual-mobile.png',
    width: 390,
    height: 844,
    mobile: true,
    setup: `(() => true)()`,
    checks: `(() => {
      const game = document.querySelector('#game-root')?.getBoundingClientRect();
      const top = document.querySelector('.top-bar')?.getBoundingClientRect();
      const left = document.querySelector('.left-panel')?.getBoundingClientRect();
      const right = document.querySelector('.right-panel')?.getBoundingClientRect();
      const dock = document.querySelector('.build-dock')?.getBoundingClientRect();
      const scrolls = document.documentElement.scrollHeight > innerHeight;
      const verticalFlow = top && game && left && right && dock
        ? game.top >= top.bottom + 8 && left.top >= game.bottom + 8 && right.top >= left.top && dock.top >= right.bottom + 8
        : false;
      return {
        ok: innerWidth === 390 && document.documentElement.scrollWidth <= document.documentElement.clientWidth && scrolls && verticalFlow && game.width <= innerWidth && top.width <= innerWidth && left.width <= innerWidth,
        details: { innerWidth, clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth, scrollHeight: document.documentElement.scrollHeight, gameTop: game?.top ?? 0, topBottom: top?.bottom ?? 0, leftTop: left?.top ?? 0, gameBottom: game?.bottom ?? 0, dockTop: dock?.top ?? 0, rightBottom: right?.bottom ?? 0, gameWidth: game?.width ?? 0, topWidth: top?.width ?? 0, leftWidth: left?.width ?? 0 },
      };
    })()`,
  },
  {
    name: 'tablet',
    file: 'pet-hospital-visual-tablet.png',
    width: 900,
    height: 844,
    setup: `(() => true)()`,
    checks: `(() => {
      const game = document.querySelector('#game-root')?.getBoundingClientRect();
      const top = document.querySelector('.top-bar')?.getBoundingClientRect();
      const left = document.querySelector('.left-panel')?.getBoundingClientRect();
      const right = document.querySelector('.right-panel')?.getBoundingClientRect();
      const dock = document.querySelector('.build-dock')?.getBoundingClientRect();
      const verticalFlow = top && game && left && right && dock
        ? game.top >= top.bottom + 8 && left.top >= game.bottom + 8 && right.top >= left.top && dock.top >= right.bottom + 8
        : false;
      return {
        ok: innerWidth === 900 && document.documentElement.scrollWidth <= document.documentElement.clientWidth && document.documentElement.scrollHeight > innerHeight && verticalFlow && game.width <= innerWidth && top.width <= innerWidth && left.width <= innerWidth,
        details: { innerWidth, clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth, scrollHeight: document.documentElement.scrollHeight, gameTop: game?.top ?? 0, topBottom: top?.bottom ?? 0, leftTop: left?.top ?? 0, gameBottom: game?.bottom ?? 0, dockTop: dock?.top ?? 0, rightBottom: right?.bottom ?? 0, gameWidth: game?.width ?? 0, topWidth: top?.width ?? 0, leftWidth: left?.width ?? 0 },
      };
    })()`,
  },
  {
    name: 'long-run',
    file: 'pet-hospital-visual-long-run.png',
    width: 1440,
    height: 960,
    setup: `(() => {
      const simulation = window.petHospitalTest?.simulation;
      if (!simulation) return false;
      const state = simulation.getState();
      state.paused = true;
      state.money = 1800;
      state.spawnTimer = 0.2;
      simulation.dispatch({ type: 'setPaused', paused: false });
      simulation.dispatch({ type: 'setSpeed', speed: 3 });
      for (let step = 0; step < 260; step += 1) simulation.update(0.75);
      simulation.dispatch({ type: 'setPaused', paused: true });
      return true;
    })()`,
    checks: `(() => {
      const state = window.petHospitalTest?.simulation.getState();
      const totals = document.querySelector('.clinic-totals-card')?.textContent ?? '';
      const recent = document.querySelector('.recent-care-card')?.textContent ?? '';
      const daily = document.querySelector('.daily-summary-list')?.textContent ?? '';
      return {
        ok: state.metrics.totalTreated > 0 && state.treatmentReports.length > 0 && state.dailyReports.length > 0 && totals.length > 0 && (recent.includes('$') || recent.includes('护理')) && (daily.includes('$') || daily.includes('收入')),
        details: { totalTreated: state.metrics.totalTreated, treatmentReports: state.treatmentReports.length, dailyReports: state.dailyReports.length },
      };
    })()`,
  },
  {
    name: 'stress',
    file: 'pet-hospital-visual-stress.png',
    width: 1440,
    height: 960,
    setup: `(() => {
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
      state.spawnTimer = 0.4;
      state.metrics.lostToday = 0;
      state.rooms.forEach((room, index) => { room.cleanliness = index === 0 ? 18 : 34; room.cleaningCooldown = 0; });
      state.staff.forEach((staff) => { staff.mode = 'working'; staff.energy = 16; });
      state.patients = Array.from({ length: 2 }, (_, index) => ({ id: 'visual-stress-' + index, name: 'Risk ' + (index + 1), petKind: index % 2 === 0 ? 'dog' : 'cat', priority: 'urgent', illnessId: 'paw-bump', requiredRoom: 'exam', status: 'waiting', x: 4, y: 4 + index, targetX: 4, targetY: 4 + index, path: [], pathIndex: 0, maxPatience: 100, patience: index === 0 ? 0 : 10, treatmentRemaining: 7, triageBoost: false }));
      simulation.dispatch({ type: 'setPaused', paused: false });
      simulation.update(1.5);
      state.queuePressure = 96;
      simulation.dispatch({ type: 'setPaused', paused: true });
      return true;
    })()`,
    checks: `(() => {
      const state = window.petHospitalTest?.simulation.getState();
      const ops = document.querySelector('.ops-watch');
      const coach = document.querySelector('.coach-card');
      const log = document.querySelector('.event-feed')?.textContent ?? '';
      return {
        ok: state.money < 0 && state.metrics.lostToday > 0 && ops?.className.includes('critical') && coach?.className.includes('bad') && (log.includes('负债') || log.includes('Debt')),
        details: { money: state.money, lostToday: state.metrics.lostToday, opsClass: ops?.className ?? '', coachClass: coach?.className ?? '' },
      };
    })()`,
  },
];

fs.mkdirSync(outputDir, { recursive: true });
const failures = [];

for (let index = 0; index < scenarios.length; index += 1) {
  const scenario = scenarios[index];
  try {
    const result = await runScenario(scenario, 9260 + index);
    const filePath = path.join(outputDir, scenario.file);
    const stats = fs.statSync(filePath);
    assert(stats.size > 40_000, `${scenario.name} screenshot is unexpectedly small`);
    assert(result.ok, `${scenario.name} DOM checks failed: ${JSON.stringify(result.details)}`);
    console.log(`Visual ${scenario.name} passed: ${scenario.file} (${Math.round(stats.size / 1024)} KB).`);
  } catch (error) {
    failures.push(error instanceof Error ? error.message : String(error));
  }
}

if (failures.length > 0) {
  console.error('Visual verification failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`Visual verification passed (${scenarios.length} scenarios).`);

async function runScenario(scenario, port) {
  const url = withTestMode(baseUrl);
  const profile = `/tmp/petcare-visual-${scenario.name}-${Date.now()}`;
  const chrome = spawn(chromePath, [
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    `--user-data-dir=${profile}`,
    `--remote-debugging-port=${port}`,
    `--window-size=${scenario.width},${scenario.height}`,
    url,
  ], { stdio: ['ignore', 'ignore', 'pipe'] });

  try {
    const devtools = await connectToChrome(port, url);
    const { send, evaluate, close } = devtools;
    await send('Runtime.enable');
    await send('Page.enable');
    if (scenario.mobile) {
      await send('Emulation.setDeviceMetricsOverride', {
        width: scenario.width,
        height: scenario.height,
        deviceScaleFactor: 2,
        mobile: true,
      });
      await send('Page.reload', { ignoreCache: true });
    }
    await wait(1800);
    const prepared = await evaluate(scenario.setup);
    assert(prepared, `${scenario.name} scenario setup failed`);
    await wait(500);
    const checkResult = await evaluate(scenario.checks);
    const screenshot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: Boolean(scenario.mobile) });
    fs.writeFileSync(path.join(outputDir, scenario.file), Buffer.from(screenshot.result.data, 'base64'));
    await close();
    return checkResult;
  } finally {
    chrome.kill('SIGTERM');
  }
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
