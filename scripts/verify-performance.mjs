import { spawn } from 'node:child_process';
import { setTimeout as wait } from 'node:timers/promises';

const DEFAULT_URL = 'http://localhost:5173/';
const DEFAULT_CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const baseUrl = process.env.PETCARE_TEST_URL ?? DEFAULT_URL;
const url = withTestMode(baseUrl);
const chromePath = process.env.CHROME_PATH ?? DEFAULT_CHROME;
const port = Number(process.env.PETCARE_PERFORMANCE_DEBUG_PORT ?? 9243);
const profile = `/tmp/petcare-performance-${Date.now()}`;
const maxAverageFrameMs = Number(process.env.PETCARE_MAX_AVG_FRAME_MS ?? 26);
const maxSlowFrameRatio = Number(process.env.PETCARE_MAX_SLOW_FRAME_RATIO ?? 0.25);

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
  const consoleIssues = [];
  const pageIssues = [];

  await send('Runtime.enable');
  await send('Page.enable');
  await send('Log.enable');
  devtools.onMessage((message) => {
    if (message.method === 'Runtime.consoleAPICalled' && ['error', 'warning', 'assert'].includes(message.params?.type)) {
      consoleIssues.push(message.params.args?.map((arg) => arg.value ?? arg.description ?? '').join(' ') ?? message.params.type);
    }
    if (message.method === 'Log.entryAdded' && ['error', 'warning'].includes(message.params?.entry?.level)) {
      const text = message.params.entry.text ?? '';
      if (!isKnownBenignBrowserLog(text)) {
        pageIssues.push(text);
      }
    }
  });

  await wait(1800);
  const prepared = await evaluate(`(() => {
    const simulation = window.petHospitalTest?.simulation;
    if (!simulation) return false;
    const state = simulation.getState();
    state.paused = false;
    state.speed = 3;
    state.money = 1600;
    state.spawnTimer = 0.2;
    state.rushTimer = 4;
    simulation.dispatch({ type: 'selectRoomKind', kind: 'grooming' });
    simulation.dispatch({ type: 'buildRoom', gridX: 13, gridY: 8 });
    simulation.dispatch({ type: 'selectRoomKind', kind: 'lab' });
    simulation.dispatch({ type: 'buildRoom', gridX: 10, gridY: 8 });
    simulation.dispatch({ type: 'setSpeed', speed: 3 });
    return true;
  })()`);
  assert(prepared, 'test mode exposes simulation for performance scenario');

  const sample = await evaluate(`(() => new Promise((resolve) => {
    const frames = [];
    const longTasks = [];
    const observer = 'PerformanceObserver' in window ? new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        longTasks.push(Math.round(entry.duration));
      }
    }) : null;
    try {
      observer?.observe({ entryTypes: ['longtask'] });
    } catch {
      // Long task observation is optional in some browsers.
    }
    const startedAt = performance.now();
    let last = startedAt;
    function frame(now) {
      frames.push(now - last);
      last = now;
      if (now - startedAt < 5200) {
        requestAnimationFrame(frame);
        return;
      }
      observer?.disconnect();
      const sorted = [...frames].sort((left, right) => left - right);
      const average = frames.reduce((sum, value) => sum + value, 0) / frames.length;
      const slowFrames = frames.filter((value) => value > 34).length;
      const p95 = sorted[Math.floor(sorted.length * 0.95)] ?? 0;
      const state = window.petHospitalTest?.simulation.getState();
      resolve({
        frameCount: frames.length,
        averageFrameMs: average,
        p95FrameMs: p95,
        slowFrameRatio: slowFrames / frames.length,
        longTaskCount: longTasks.length,
        worstLongTaskMs: Math.max(0, ...longTasks),
        hasCanvas: !!document.querySelector('canvas'),
        hudTextLength: document.querySelector('#hud-root')?.textContent?.length ?? 0,
        totalTreated: state?.metrics.totalTreated ?? 0,
        patients: state?.patients.length ?? 0,
        rooms: state?.rooms.length ?? 0,
        events: state?.events.length ?? 0,
      });
    }
    requestAnimationFrame(frame);
  }))()`);

  assert(sample.hasCanvas, 'canvas remains mounted during performance sample');
  assert(sample.hudTextLength > 200, 'HUD remains populated during performance sample');
  assert(sample.frameCount >= 160, `frame sampler collected too few frames: ${sample.frameCount}`);
  assert(sample.averageFrameMs <= maxAverageFrameMs, `average frame time ${sample.averageFrameMs.toFixed(2)}ms exceeds ${maxAverageFrameMs}ms`);
  assert(sample.slowFrameRatio <= maxSlowFrameRatio, `slow frame ratio ${(sample.slowFrameRatio * 100).toFixed(1)}% exceeds ${(maxSlowFrameRatio * 100).toFixed(1)}%`);
  assert(sample.worstLongTaskMs < 250, `worst long task ${sample.worstLongTaskMs}ms is too high`);
  assert(sample.rooms >= 4, 'performance scenario keeps expanded room set');
  assert(sample.events > 0, 'event log remains active during performance sample');
  assert(consoleIssues.length === 0, `console issues found: ${consoleIssues.join(' | ')}`);
  assert(pageIssues.length === 0, `page issues found: ${pageIssues.join(' | ')}`);

  await close();
  console.log(`Performance verification passed: ${sample.frameCount} frames, avg ${sample.averageFrameMs.toFixed(2)}ms, p95 ${sample.p95FrameMs.toFixed(2)}ms, slow ${(sample.slowFrameRatio * 100).toFixed(1)}%, long tasks ${sample.longTaskCount}.`);
} catch (error) {
  failures.push(error instanceof Error ? error.message : String(error));
} finally {
  chrome.kill('SIGTERM');
}

if (failures.length > 0) {
  console.error('Performance verification failed:');
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

function isKnownBenignBrowserLog(text) {
  return text.includes('favicon') || text.includes('Autofill') || text.includes('SharedImageManager') || text.includes('GPU') || text.includes('WebGL');
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
  const listeners = [];

  ws.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    for (const listener of listeners) {
      listener(message);
    }
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
    }, 7000);
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

  return { send, evaluate, close: () => ws.close(), onMessage: (listener) => listeners.push(listener) };
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}
