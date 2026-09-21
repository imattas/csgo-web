import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
assert.match(html, /__csgoWebRuntimeCaps/);
for (const name of ['renderer', 'input', 'weapons', 'movement', 'viewmodel', 'hud']) {
  assert.match(html, new RegExp(`['\"]?${name}['\"]?\\s*:`));
}

for (const marker of [
  'csgo_web_settings', 'scale: 1', 'radarScale: 1', 'killfeedSeconds: 6', 'sensitivity: 3', 'lowEndMode: true',
  'adaptive: true', "renderScale: 'performance'", 'zoomSensitivity: 1',
  "scopeResponsiveness: 'responsive'", 'crosshairLength', 'crosshairGap', 'lowEndMode', 'hideDroppedWeapons', 'hideDeadBodies'
]) assert.match(html, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
assert.match(html, /localAssetPrefix/);
assert.match(html, /localAssetMap/);
assert.match(html, /localAssetPrefix\s*=\s*['"]\/csgo['"]/);
assert.match(html, /data-cgw-fps-input/);
assert.match(html, /data-cgw-crosshair/);
assert.match(html, /csgo-web-tabs/);
assert.match(html, /csgo-web-lowend-visuals/);
assert.match(html, /spawnDrop/);
assert.match(html, /applyAggressiveLowEndOptimizations/);
assert.match(html, /localClippingEnabled/);
assert.match(html, /Math\.PI \/ 180/);
assert.match(html, /zoomSensRatio/);
assert.match(html, /removeEconomyAndNewsUi/);
assert.match(html, /#newsbtn/);
assert.match(html, /#coins/);

console.log('runtime seam probe: static assertions passed');
