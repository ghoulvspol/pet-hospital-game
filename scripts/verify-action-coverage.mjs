import fs from 'node:fs';

const hudSource = fs.readFileSync('src/ui/hud.ts', 'utf8');
const clickSource = fs.readFileSync('scripts/verify-clicks.mjs', 'utf8');
const responsiveSource = fs.readFileSync('scripts/verify-responsive.mjs', 'utf8');
const testSources = `${clickSource}\n${responsiveSource}`;

const expectedActions = extractHandledActions(hudSource);
const renderedActions = extractRenderedActions(hudSource);
const testedActions = extractTestedActions(testSources);
const failures = [];

const unrenderedActions = [...expectedActions].filter((action) => !renderedActions.has(action));
if (unrenderedActions.length > 0) {
  failures.push(`handled actions are not rendered in HUD markup: ${unrenderedActions.join(', ')}`);
}

const uncoveredActions = [...renderedActions].filter((action) => !testedActions.has(action));
if (uncoveredActions.length > 0) {
  failures.push(`rendered HUD actions lack real-click coverage: ${uncoveredActions.join(', ')}`);
}

const unhandledRenderedActions = [...renderedActions].filter((action) => !expectedActions.has(action));
if (unhandledRenderedActions.length > 0) {
  failures.push(`rendered HUD actions are not handled by runAction: ${unhandledRenderedActions.join(', ')}`);
}

if (!clickSource.includes('canvas patient inspection')) {
  failures.push('click verification does not include canvas patient inspection marker');
}

if (!clickSource.includes('canvas invalid build warning')) {
  failures.push('click verification does not include invalid canvas build marker');
}

if (failures.length > 0) {
  console.error('Action coverage verification failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`Action coverage verification passed: ${renderedActions.size} HUD actions covered by real-click suites.`);

function extractHandledActions(source) {
  return new Set([...source.matchAll(/actionName === ['"]([^'"]+)['"]/g)].map((match) => match[1]).sort());
}

function extractRenderedActions(source) {
  const actions = [
    ...source.matchAll(/data-action=\\?"([^"$]+)\\?"/g),
    ...source.matchAll(/data-action=\\?'([^'$]+)\\?'/g),
  ].map((match) => match[1]);

  for (const match of source.matchAll(/actionName\s*=\s*[^;]*?['"]([^'"]+)['"]\s*:\s*['"]([^'"]+)['"]/g)) {
    actions.push(match[1], match[2]);
  }

  return new Set(actions.filter((action) => !action.includes('{')).sort());
}

function extractTestedActions(source) {
  return new Set([...source.matchAll(/data-action=\\?"([^"$]+)\\?"/g)].map((match) => match[1]).sort());
}
