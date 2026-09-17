// Validate spatial relationships and geometry without requiring a GPU.
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
registerHooks({ resolve: (spec, ctx, next) => next(spec.startsWith('.') && !/\.[a-z]+$/.test(spec) ? `${spec}.ts` : spec, ctx) });
const { jerusalemSites, SOURCES, cityGround, FIRST_WALL, SECOND_WALL, JERUSALEM_BOUNDS, insidePolygon } = await import('../app/jerusalem-data.ts');
const { buildJerusalemScene, disposeJerusalem } = await import('../app/jerusalem-scene.ts');
const ids = new Set();
for (const site of jerusalemSites) {
  assert.ok(!ids.has(site.id), `duplicate site: ${site.id}`); ids.add(site.id);
  assert.ok(site.x > JERUSALEM_BOUNDS.west && site.x < JERUSALEM_BOUNDS.east);
  assert.ok(site.z > JERUSALEM_BOUNDS.north && site.z < JERUSALEM_BOUNDS.south);
  assert.ok(site.en && site.enDescription && site.enCertainty && site.reference);
  assert.ok(site.sources.length && site.sources.every((key) => SOURCES[key]?.url.startsWith('https://')));
}
assert.ok(cityGround(1130, 0) > cityGround(330, 0) + 100, 'Olives must rise above Kidron');
assert.ok(cityGround(0, 0) > cityGround(330, 0) + 35, 'Temple ridge must rise above Kidron');
assert.ok(cityGround(-700, 400) > cityGround(-225, 400) + 35, 'western hill must rise above central valley');
const golgotha = jerusalemSites.find((s) => s.id === 'golgotha');
assert.ok(!insidePolygon(golgotha.x, golgotha.z, FIRST_WALL), 'Golgotha candidate must be outside first wall');
const northQuarter = [[-600, 140], ...SECOND_WALL.slice(1), [-145, -180], [-285, 95]];
assert.ok(!insidePolygon(golgotha.x, golgotha.z, northQuarter), 'Golgotha candidate must be outside inferred second wall');
const city = buildJerusalemScene();
assert.ok(city.houseCount > 300 && city.houseCount < 1500, 'housing should fit the city and rendering budget');
const landmarkIds = city.landmarks.children.map((o) => o.userData.siteId);
for (const id of ['temple', 'antonia', 'palace', 'bethesda', 'siloam', 'golgotha', 'gethsemane']) assert.ok(landmarkIds.includes(id));
let vertices = 0;
city.root.traverse((obj) => {
  if (!obj.isMesh) return;
  const positions = obj.geometry.getAttribute('position');
  for (const value of positions.array) assert.ok(Number.isFinite(value), 'invalid mesh vertex');
  vertices += positions.count;
  for (const value of [...obj.position, ...obj.scale]) assert.ok(Number.isFinite(value), 'invalid mesh transform');
});
disposeJerusalem(city.root);
console.log(`ok — ${ids.size} bilingual sites, ${city.houseCount} houses, ${vertices} vertices checked; ridge/valley and candidate/wall relationships hold`);
