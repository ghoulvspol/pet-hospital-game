import { spawn } from 'node:child_process';
import { setTimeout as wait } from 'node:timers/promises';

const DEFAULT_URL = 'http://localhost:5173/';
const DEFAULT_CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const baseUrl = process.env.PETCARE_TEST_URL ?? DEFAULT_URL;
const url = withTestMode(baseUrl);
const chromePath = process.env.CHROME_PATH ?? DEFAULT_CHROME;
const port = Number(process.env.PETCARE_RESPONSIVE_DEBUG_PORT ?? 9238);
const profile = `/tmp/petcare-responsive-verify-${Date.now()}`;

const chrome = spawn(chromePath, [
  '--headless=new',
  '--disable-gpu',
  '--no-first-run',
  '--no-default-browser-check',
  `--user-data-dir=${profile}`,
  `--remote-debugging-port=${port}`,
  '--window-size=390,844',
  url,
], { stdio: ['ignore', 'ignore', 'pipe'] });

const failures = [];

try {
  const devtools = await connectToChrome(port, url);
  const { send, evaluate, click, close } = devtools;
  await send('Runtime.enable');
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true,
  });
  await send('Page.reload', { ignoreCache: true });
  await wait(1800);

  const initial = await evaluate(`(() => {
    const game = document.querySelector('#game-root')?.getBoundingClientRect();
    const top = document.querySelector('.top-bar')?.getBoundingClientRect();
    const left = document.querySelector('.left-panel')?.getBoundingClientRect();
    const right = document.querySelector('.right-panel')?.getBoundingClientRect();
    const dock = document.querySelector('.build-dock')?.getBoundingClientRect();
    return {
      width: innerWidth,
      clientWidth: document.documentElement.clientWidth,
      height: innerHeight,
      scrollWidth: document.documentElement.scrollWidth,
      scrollHeight: document.documentElement.scrollHeight,
      bodyOverflow: getComputedStyle(document.body).overflow,
      hasCanvas: !!document.querySelector('canvas'),
      gameTop: game?.top ?? -1,
      topBottom: top?.bottom ?? -1,
      leftTop: left?.top ?? -1,
      gameBottom: game?.bottom ?? -1,
      rightTop: right?.top ?? -1,
      rightBottom: right?.bottom ?? -1,
      dockTop: dock?.top ?? -1,
      gameWidth: game?.width ?? 0,
      topWidth: top?.width ?? 0,
      leftWidth: left?.width ?? 0,
      rightWidth: right?.width ?? 0,
      dockWidth: dock?.width ?? 0,
    };
  })()`);
  assert(initial.width === 390, 'mobile viewport width is active');
  assert(initial.hasCanvas, 'canvas boots on mobile viewport');
  assert(initial.bodyOverflow !== 'hidden', 'mobile body can scroll vertically');
  assert(initial.scrollWidth <= initial.clientWidth, 'mobile layout has no horizontal overflow');
  assert(initial.scrollHeight > initial.height, 'mobile layout has vertical scroll instead of clipped content');
  assert(initial.gameWidth <= initial.width && initial.topWidth <= initial.width && initial.leftWidth <= initial.width && initial.rightWidth <= initial.width && initial.dockWidth <= initial.width, 'mobile panels fit viewport width');
  assert(initial.gameTop >= initial.topBottom + 8, 'mobile game canvas starts below the top controls without overlap');
  assert(initial.leftTop >= initial.gameBottom + 8, 'mobile left panel starts below the game canvas without overlap');
  assert(initial.rightTop >= initial.leftTop, 'mobile right panel stays in the vertical content flow');
  assert(initial.dockTop >= initial.rightBottom + 8, 'mobile build dock starts below the inspector without overlap');

  await clickElement(evaluate, click, '[data-action="toggle-pause"]');
  const pauseText = await textOf(evaluate, '[data-action="toggle-pause"]');
  assert(pauseText.includes('Resume') || pauseText.includes('继续'), 'mobile pause button is clickable');

  await clickElement(evaluate, click, '.build-dock [data-action="select-room"][data-kind="lab"]');
  const selectedKind = await evaluate(`window.petHospitalTest?.simulation.getState().selectedRoomKind ?? ''`);
  assert(selectedKind === 'lab', 'mobile build dock room button is clickable after scrolling');

  await clickElement(evaluate, click, '[data-action="hire-staff"]');
  const staffCount = await evaluate(`window.petHospitalTest?.simulation.getState().staff.length`);
  assert(staffCount === 3, 'mobile hire staff button is reachable and clickable');

  await clickElement(evaluate, click, '[data-action="set-locale"][data-locale="zh"]');
  const chinesePauseText = await textOf(evaluate, '[data-action="toggle-pause"]');
  assert(chinesePauseText.includes('继续') || chinesePauseText.includes('暂停'), 'mobile locale switch is reachable and clickable');

  await send('Emulation.setDeviceMetricsOverride', {
    width: 900,
    height: 844,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await send('Page.reload', { ignoreCache: true });
  await wait(1800);

  const tablet = await evaluate(`(() => {
    const game = document.querySelector('#game-root')?.getBoundingClientRect();
    const top = document.querySelector('.top-bar')?.getBoundingClientRect();
    const left = document.querySelector('.left-panel')?.getBoundingClientRect();
    const right = document.querySelector('.right-panel')?.getBoundingClientRect();
    const dock = document.querySelector('.build-dock')?.getBoundingClientRect();
    return {
      width: innerWidth,
      clientWidth: document.documentElement.clientWidth,
      height: innerHeight,
      scrollWidth: document.documentElement.scrollWidth,
      scrollHeight: document.documentElement.scrollHeight,
      bodyOverflow: getComputedStyle(document.body).overflow,
      bodyMinWidth: getComputedStyle(document.body).minWidth,
      hasCanvas: !!document.querySelector('canvas'),
      gameTop: game?.top ?? -1,
      topBottom: top?.bottom ?? -1,
      leftTop: left?.top ?? -1,
      gameBottom: game?.bottom ?? -1,
      rightTop: right?.top ?? -1,
      rightBottom: right?.bottom ?? -1,
      dockTop: dock?.top ?? -1,
      gameWidth: game?.width ?? 0,
      topWidth: top?.width ?? 0,
      leftWidth: left?.width ?? 0,
      rightWidth: right?.width ?? 0,
      dockWidth: dock?.width ?? 0,
    };
  })()`);
  assert(tablet.width === 900, 'tablet viewport width is active');
  assert(tablet.hasCanvas, 'canvas boots on tablet viewport');
  assert(tablet.bodyOverflow !== 'hidden', 'tablet body can scroll vertically');
  assert(tablet.bodyMinWidth === '0px', 'tablet layout removes desktop min-width');
  assert(tablet.scrollWidth <= tablet.clientWidth, 'tablet layout has no horizontal overflow');
  assert(tablet.scrollHeight > tablet.height, 'tablet layout has vertical scroll instead of clipped content');
  assert(tablet.gameWidth <= tablet.width && tablet.topWidth <= tablet.width && tablet.leftWidth <= tablet.width && tablet.rightWidth <= tablet.width && tablet.dockWidth <= tablet.width, 'tablet panels fit viewport width');
  assert(tablet.gameTop >= tablet.topBottom + 8, 'tablet game canvas starts below the top controls without overlap');
  assert(tablet.leftTop >= tablet.gameBottom + 8, 'tablet left panel starts below the game canvas without overlap');
  assert(tablet.rightTop >= tablet.leftTop, 'tablet right panel stays in the vertical content flow');
  assert(tablet.dockTop >= tablet.rightBottom + 8, 'tablet build dock starts below the inspector without overlap');

  await clickElement(evaluate, click, '.build-dock [data-action="select-room"][data-kind="grooming"]');
  const tabletSelectedKind = await evaluate(`window.petHospitalTest?.simulation.getState().selectedRoomKind ?? ''`);
  assert(tabletSelectedKind === 'grooming', 'tablet build dock room button is reachable and clickable');

  await close();
  console.log('Responsive verification passed: mobile/tablet layouts fit, scroll, and key controls click.');
} catch (error) {
  failures.push(error instanceof Error ? error.message : String(error));
} finally {
  chrome.kill('SIGTERM');
}

if (failures.length > 0) {
  console.error('Responsive verification failed:');
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

  const click = async (x, y) => {
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
    await wait(240);
  };

  return { send, evaluate, click, close: () => ws.close() };
}

async function clickElement(evaluate, click, selector) {
  const rect = await getElementRect(evaluate, selector);
  assert(Boolean(rect), `element exists for selector ${selector}`);
  if (!rect.visible) {
    await evaluate(`document.querySelector(${JSON.stringify(selector)})?.scrollIntoView({ block: 'center', inline: 'center' })`);
    await wait(260);
  }

  const visibleRect = await getElementRect(evaluate, selector);
  assert(Boolean(visibleRect?.visible), `element is visible for selector ${selector}`);
  await click(visibleRect.x + visibleRect.width / 2, visibleRect.y + visibleRect.height / 2);
}

async function getElementRect(evaluate, selector) {
  return evaluate(`(() => {
    const element = document.querySelector(${JSON.stringify(selector)});
    if (!element) return null;
    const rect = element.getBoundingClientRect();
    const visible = rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.right > 0 && rect.top < innerHeight && rect.left < innerWidth;
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, visible };
  })()`);
}

async function textOf(evaluate, selector) {
  return evaluate(`document.querySelector(${JSON.stringify(selector)})?.textContent?.trim() ?? ''`);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}
