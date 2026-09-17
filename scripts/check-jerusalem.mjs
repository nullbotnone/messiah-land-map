// Validate the city model without a GPU: measured elevations, wall geometry,
// the relationships the reconstruction rests on, and finite mesh data.
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import * as THREE from 'three';
registerHooks({ resolve: (spec, ctx, next) => next(spec.startsWith('.') && !/\.[a-z]+$/.test(spec) ? `${spec}.ts` : spec, ctx) });
const { jerusalemSites, SOURCES, cityGround, platformToWorld, PLATFORM, FIRST_WALL, SECOND_WALL, PILGRIM_ROAD, JERUSALEM_BOUNDS, insidePolygon } = await import('../app/jerusalem-data.ts');
const { buildJerusalemScene, disposeJerusalem } = await import('../app/jerusalem-scene.ts');

const ids = new Set();
for (const site of jerusalemSites) {
  assert.ok(!ids.has(site.id), `duplicate site: ${site.id}`); ids.add(site.id);
  assert.ok(site.x > JERUSALEM_BOUNDS.west && site.x < JERUSALEM_BOUNDS.east);
  assert.ok(site.z > JERUSALEM_BOUNDS.north && site.z < JERUSALEM_BOUNDS.south);
  assert.ok(site.en && site.enDescription && site.enCertainty && site.reference);
  assert.ok(site.sources.length && site.sources.every((key) => SOURCES[key]?.url.startsWith('https://')));
}

// Spot heights, metres above sea level, against SRTM 30 m and the published
// elevations of the places themselves. The model may sit 15 m off where debris
// has filled a valley, and no further.
const elevations = [
  ['Temple Mount esplanade', -9, -2, 743], ['Mount of Olives', 956, -67, 810],
  ['Gihon spring', 135, 529, 656], ['Pool of Siloam', -26, 843, 641],
  ['City of David ridge', 17, 627, 682], ['Citadel', -672, 217, 777],
  ['Holy Sepulchre', -534, -39, 770], ['Western Wall street', -90, 139, 723],
  ['Kidron at Gethsemane', 341, -122, 692], ['Akeldama', -210, 1091, 662],
  ['Bethesda', 73, -383, 743], ['Antonia rock', -66, -288, 750],
];
for (const [name, x, z, metres] of elevations) {
  const got = cityGround(x, z) + 600;
  assert.ok(Math.abs(got - metres) <= 15, `${name}: ${got.toFixed(0)} m, expected about ${metres} m`);
}
assert.ok(cityGround(956, -67) > cityGround(300, -60) + 100, 'Olives must rise above the Kidron');
assert.ok(cityGround(0, 0) > cityGround(300, -60) + 45, 'the temple ridge must rise above the Kidron');
assert.ok(cityGround(-600, 300) > cityGround(-110, 300) + 40, 'the western hill must rise above the central valley');
assert.ok(cityGround(-26, 843) < cityGround(0, 0) - 90, 'Siloam must lie far below the temple');

// The retaining walls: 280 m south, 315 m north, 485 m west, 470 m east.
const side = (a, b) => Math.hypot(PLATFORM.corners[b][0] - PLATFORM.corners[a][0], PLATFORM.corners[b][1] - PLATFORM.corners[a][1]);
for (const [name, length, want] of [['north', side(0, 1), 315], ['east', side(1, 2), 470], ['south', side(2, 3), 280], ['west', side(3, 0), 485]]) {
  assert.ok(Math.abs(length - want) <= 12, `${name} wall is ${length.toFixed(0)} m, expected about ${want} m`);
}
// The turned frame and the world frame must agree on the corners.
const [cx, cz] = PLATFORM.centre;
const c = Math.cos(PLATFORM.angle), s = Math.sin(PLATFORM.angle);
for (const [x, z] of PLATFORM.corners) {
  const [rx, rz] = platformToWorld((x - cx) * c - (z - cz) * s, (x - cx) * s + (z - cz) * c);
  assert.ok(Math.hypot(rx - x, rz - z) < 0.5, 'platformToWorld must invert cleanly');
}

const at = (id) => jerusalemSites.find((site) => site.id === id);
const golgotha = at('golgotha');
assert.ok(!insidePolygon(golgotha.x, golgotha.z, FIRST_WALL), 'Golgotha candidate must be outside the first wall');
const northQuarter = [[-369, 142], ...SECOND_WALL.slice(1), [-102, 104], [-250, 130]];
assert.ok(!insidePolygon(golgotha.x, golgotha.z, northQuarter), 'Golgotha candidate must be outside the inferred second wall');
for (const id of ['siloam', 'upper', 'lower', 'palace']) {
  const site = at(id);
  assert.ok(insidePolygon(site.x, site.z, FIRST_WALL), `${id} must lie inside the first wall`);
}
for (const id of ['gethsemane', 'olives', 'hinnom', 'bezetha', 'kidron-tombs']) {
  const site = at(id);
  assert.ok(!insidePolygon(site.x, site.z, FIRST_WALL), `${id} must lie outside the first wall`);
}
const roadLength = PILGRIM_ROAD.slice(1).reduce((sum, [x, z], i) => sum + Math.hypot(x - PILGRIM_ROAD[i][0], z - PILGRIM_ROAD[i][1]), 0);
assert.ok(roadLength > 700 && roadLength < 1000, `the stepped street and its northward run measure ${roadLength.toFixed(0)} m`);

const city = buildJerusalemScene();
assert.ok(city.houseCount > 300 && city.houseCount < 1500, 'housing should fit the city and the rendering budget');
assert.ok(city.columnCount > 400 && city.columnCount < 1600, 'colonnades should fit the rendering budget');
const landmarkIds = [];
city.landmarks.traverse((obj) => { if (obj.userData.siteId) landmarkIds.push(obj.userData.siteId); });
for (const id of ['temple', 'royal-stoa', 'robinson', 'wilson', 'antonia', 'palace', 'bethesda', 'siloam', 'gihon', 'golgotha', 'gethsemane', 'kidron-tombs', 'upper', 'hinnom']) {
  assert.ok(landmarkIds.includes(id), `no geometry carries the site id ${id}`);
}
// Nothing may sprawl past the footprint of the thing it represents. A beam laid
// across its own colonnade, or a bridge deck measured from the wrong end, shows
// up here as a long block on the map long before anyone can name it.
city.root.updateMatrixWorld(true);
// Test the geometry, not a metadata flag: a ray must pass under each vault,
// and hit masonry above its intrados. This catches sealed and inverted arches.
city.landmarks.traverse((obj) => {
  if (obj.userData.modelPart !== 'arch') return;
  const { span, rise, spring, depth, height } = obj.userData.opening;
  const ray = (x, y) => {
    const origin = obj.localToWorld(new THREE.Vector3(x, y, -depth / 2 - 1));
    const direction = new THREE.Vector3(0, 0, 1).transformDirection(obj.matrixWorld);
    return new THREE.Raycaster(origin, direction, 0, depth + 2).intersectObject(obj, false);
  };
  for (const x of [-span * 0.3, 0, span * 0.3]) {
    const intrados = spring + rise * Math.sqrt(1 - (2 * x / span) ** 2);
    assert.equal(ray(x, intrados - 0.25).length, 0, 'arch opening is sealed or wrongly triangulated');
  }
  assert.ok(ray(0, height - 0.4).length, 'arch crown is missing');
});
// Main spans must follow the west-wall normal, with an unobstructed 8 m-wide
// street through their north/south opening, including all neighbouring meshes.
for (const id of ['robinson', 'wilson']) {
  const arch = city.root.getObjectByName(`${id}-main-arch`);
  assert.ok(arch, `${id}: missing principal arch`);
  const spanDirection = new THREE.Vector3(1, 0, 0).transformDirection(arch.matrixWorld);
  assert.ok(Math.abs(spanDirection.x) > 0.95, `${id}: arch spans north/south instead of across the street`);
  for (const x of [-4, 0, 4]) {
    const origin = arch.localToWorld(new THREE.Vector3(x, 2, -12));
    const direction = new THREE.Vector3(0, 0, 1).transformDirection(arch.matrixWorld);
    const hits = new THREE.Raycaster(origin, direction, 0, 24).intersectObjects([city.landmarks, city.roads], true);
    assert.equal(hits.length, 0, `${id}: street obstructed by ${hits[0]?.object.name || hits[0]?.object.type}`);
  }
}
const namedBounds = (name) => {
  const obj = city.root.getObjectByName(name);
  assert.ok(obj, `missing ${name}`);
  // Temple parts share the mount frame: undo its rotation for local clearances.
  const inverse = new THREE.Matrix4().copy(obj.parent.matrixWorld).invert();
  const result = new THREE.Box3();
  obj.traverse((mesh) => {
    if (!mesh.isMesh) return;
    mesh.geometry.computeBoundingBox();
    result.union(mesh.geometry.boundingBox.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse, mesh.matrixWorld)));
  });
  return result;
};
assert.ok(namedBounds('porch-steps').max.x <= namedBounds('altar').min.x + 0.01, 'porch steps run into the altar');
assert.ok(namedBounds('altar-ramp').max.z < 30.5 - 5, 'altar ramp runs into the south chambers');
for (const name of ['double', 'triple']) {
  const steps = namedBounds(`${name}-gate-steps`), landing = namedBounds(`${name}-gate-landing`);
  assert.ok(Math.abs(steps.max.y - landing.max.y) < 0.01, `${name}: stair does not reach its landing`);
  assert.ok(steps.min.z <= landing.max.z && steps.min.z >= landing.min.z, `${name}: gap before gate landing`);
}
const footprints = { palace: 340, 'royal-stoa': 300, temple: 250, wilson: 210, antonia: 180, gethsemane: 160, hinnom: 220, bezetha: 260, bethesda: 130, 'kidron-tombs': 100, golgotha: 100, siloam: 90, upper: 60, robinson: 60, gihon: 40 };
const spans = new Map();
const centres = new Map();
city.landmarks.traverse((obj) => {
  if (!obj.userData.siteId) return;
  const box = new THREE.Box3().setFromObject(obj);
  const size = box.getSize(new THREE.Vector3());
  spans.set(obj.userData.siteId, Math.max(spans.get(obj.userData.siteId) ?? 0, size.x, size.z));
  centres.set(obj.userData.siteId, box.getCenter(new THREE.Vector3()));
});
for (const [id, limit] of Object.entries(footprints)) {
  const span = spans.get(id);
  assert.ok(span !== undefined, `no geometry carries the site id ${id}`);
  assert.ok(span <= limit, `${id} spreads over ${span.toFixed(0)} m, more than the ${limit} m it should occupy`);
}
// The sanctuary stands a hundred cubits over its own floor, and that floor is
// another twenty-two above the esplanade — twelve steps to the chel,
// fifteen to Israel, the raised priestly court, twelve to the porch. Flatten the approach or halve the
// building and the roof lands somewhere else.
const temple = [];
city.landmarks.traverse((obj) => { if (obj.userData.siteId === 'temple') temple.push(obj); });
assert.equal(temple.length, 1, 'the sanctuary should be one group');
const templeBox = new THREE.Box3().setFromObject(temple[0]);
const roof = templeBox.max.y - PLATFORM.top;
assert.ok(roof > 58 && roof < 63, `the sanctuary roof stands ${roof.toFixed(1)} m over the esplanade, expected about 60`);
// And none of the precinct may hang over the retaining walls.
for (const [x, z] of [[templeBox.min.x, templeBox.min.z], [templeBox.min.x, templeBox.max.z], [templeBox.max.x, templeBox.min.z], [templeBox.max.x, templeBox.max.z]]) {
  const inside = insidePolygon(x, z, PLATFORM.corners);
  const margin = Math.min(...PLATFORM.corners.map(([cx, cz]) => Math.hypot(cx - x, cz - z)));
  assert.ok(inside || margin < 40, `the precinct reaches ${x.toFixed(0)},${z.toFixed(0)}, outside the enclosure`);
}

// A label must stand over the thing it names: fly to a site and something has
// to be there. Districts carry no geometry and are exempt.
for (const [id, centre] of centres) {
  const site = at(id);
  const gap = Math.hypot(site.x - centre.x, site.z - centre.z);
  assert.ok(gap < 160, `the ${id} label stands ${gap.toFixed(0)} m from its own geometry`);
}

let vertices = 0;
city.root.traverse((obj) => {
  if (!obj.isMesh) return;
  const positions = obj.geometry.getAttribute('position');
  for (const value of positions.array) assert.ok(Number.isFinite(value), 'invalid mesh vertex');
  vertices += positions.count;
  for (const value of [...obj.position, ...obj.scale]) assert.ok(Number.isFinite(value), 'invalid mesh transform');
});
disposeJerusalem(city.root);
console.log(`ok — ${ids.size} bilingual sites, ${city.houseCount} houses, ${city.columnCount} columns, ${vertices} vertices; elevations within 15 m, walls within 12 m, wall/site relationships hold`);
