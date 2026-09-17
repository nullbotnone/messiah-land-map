// Refetches the Jerusalem elevation grid inside app/jerusalem-data.ts.
//
//     node scripts/build-city-dem.mjs
//
// Only CITY_DEM_NX, CITY_DEM_NY and the base64 payload are rewritten.
//
// Source: SRTM 30 m through the public OpenTopoData API, which answers a
// hundred points per call. The regional map in app/geo.ts pulls whole boxes
// from GMRT instead, but GMRT's finest tier over this box is ~61 m and it
// shaves 8–14 m off every ridge here — at city scale that erases the Temple
// Mount's own ridge, so the slower point API wins.
//
// This is the modern surface: two thousand years of debris fill the valleys,
// and the Old City's own buildings ride on top of it. app/jerusalem-data.ts
// carves the three ancient valleys back into it.
import { readFileSync, writeFileSync } from 'node:fs';

const ORIGIN = { lat: 31.778, lon: 35.2354 };
const BOUNDS = { west: -1250, east: 1500, north: -1050, south: 1500 };
const STEP = 50;
const KX = 111320 * Math.cos(ORIGIN.lat * Math.PI / 180);
const KZ = 110900;
const NX = Math.round((BOUNDS.east - BOUNDS.west) / STEP) + 1;
const NY = Math.round((BOUNDS.south - BOUNDS.north) / STEP) + 1;

const points = [];
for (let j = 0; j < NY; j++) {
  for (let i = 0; i < NX; i++) {
    const x = BOUNDS.west + i * STEP;
    const z = BOUNDS.north + j * STEP;
    points.push([ORIGIN.lat - z / KZ, ORIGIN.lon + x / KX]);
  }
}

const dem = new Int16Array(points.length);
for (let i = 0; i < points.length; i += 100) {
  const chunk = points.slice(i, i + 100);
  const url = 'https://api.opentopodata.org/v1/srtm30m?locations='
    + encodeURIComponent(chunk.map(([lat, lon]) => `${lat.toFixed(6)},${lon.toFixed(6)}`).join('|'));
  const res = await fetch(url);
  if (!res.ok) throw new Error(`OpenTopoData returned HTTP ${res.status}`);
  const body = await res.json();
  body.results.forEach((r, k) => { dem[i + k] = Math.round(r.elevation); });
  process.stdout.write(`\r${i + chunk.length}/${points.length} points`);
  await new Promise((r) => setTimeout(r, 1100)); // the public endpoint allows one call a second
}
console.log();

const b64 = Buffer.from(dem.buffer, dem.byteOffset, dem.byteLength).toString('base64');
const path = new URL('../app/jerusalem-data.ts', import.meta.url);
let data = readFileSync(path, 'utf8');
const swap = (re, replacement) => {
  if (!re.test(data)) throw new Error(`app/jerusalem-data.ts no longer matches ${re}`);
  data = data.replace(re, replacement);
};
swap(/export const CITY_DEM_NX = \d+;/, `export const CITY_DEM_NX = ${NX};`);
swap(/export const CITY_DEM_NY = \d+;/, `export const CITY_DEM_NY = ${NY};`);
swap(/const CITY_DEM_B64 = '[^']*';/, `const CITY_DEM_B64 = '${b64}';`);
writeFileSync(path, data);

let lo = Infinity, hi = -Infinity;
for (const v of dem) { if (v < lo) lo = v; if (v > hi) hi = v; }
console.log(`app/jerusalem-data.ts — ${NX}×${NY} = ${dem.length} nodes at ${STEP} m, ${lo}..${hi} m`);
