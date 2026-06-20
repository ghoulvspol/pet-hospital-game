import './styles.css';
import { SoundDirector } from './audio/soundDirector';
import { HospitalSimulation } from './game/simulation/hospitalSimulation';
import type { Locale } from './game/simulation/types';
import { DEFAULT_LOCALE, getTranslations } from './i18n/translations';
import { createGame } from './phaser/createGame';
import { HospitalHud } from './ui/hud';

const LOCALE_STORAGE_KEY = 'petcare-locale';

const gameRoot = document.querySelector<HTMLElement>('#game-root');
const hudRoot = document.querySelector<HTMLElement>('#hud-root');

if (!gameRoot || !hudRoot) {
  throw new Error('Missing game or HUD root element.');
}

const simulation = new HospitalSimulation(getInitialLocale());
const hud = new HospitalHud(hudRoot, simulation);
const soundDirector = new SoundDirector();
let syncedLocale = simulation.getState().locale;

if (new URLSearchParams(window.location.search).has('testMode')) {
  window.petHospitalTest = { simulation };
}

persistLocale(syncedLocale);
syncDocumentLocale(syncedLocale);
simulation.addEventListener('statechange', () => {
  const locale = simulation.getState().locale;
  if (locale !== syncedLocale) {
    syncedLocale = locale;
    persistLocale(locale);
    syncDocumentLocale(locale);
  }
});

createGame('game-root', simulation);
hud.mount();
soundDirector.attach(simulation);

function getInitialLocale(): Locale {
  const storedLocale = readStoredLocale();
  if (isLocale(storedLocale)) {
    return storedLocale;
  }

  return navigator.language.toLowerCase().startsWith('zh') ? 'zh' : DEFAULT_LOCALE;
}

function readStoredLocale(): string | null {
  try {
    return localStorage.getItem(LOCALE_STORAGE_KEY);
  } catch {
    return null;
  }
}

function persistLocale(locale: Locale): void {
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // Ignore unavailable storage; the in-memory locale still works.
  }
}

function syncDocumentLocale(locale: Locale): void {
  const text = getTranslations(locale);
  document.documentElement.lang = locale === 'zh' ? 'zh-CN' : 'en';
  document.title = text.app.title;
  document.querySelector<HTMLMetaElement>('meta[name="description"]')?.setAttribute('content', text.app.description);
}

function isLocale(value: string | null): value is Locale {
  return value === 'en' || value === 'zh';
}
