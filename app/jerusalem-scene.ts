import * as THREE from 'three';
import { cityGround, distanceToPath, platformToWorld, FIRST_WALL, SECOND_WALL, GATES, PILGRIM_ROAD, PLATFORM, JERUSALEM_BOUNDS, insidePolygon, type Point } from './jerusalem-data';

const stone = new THREE.Color('#d5c7a7');
const darkStone = new THREE.Color('#a69a7f');
const gold = new THREE.Color('#c5a35d');

export function buildJerusalemScene() {
  const root = new THREE.Group();
  const housing = new THREE.Group();
  const walls = new THREE.Group();
  const roads = new THREE.Group();
  const landmarks = new THREE.Group();
  root.add(housing, walls, roads, landmarks);
  const materials = new Map<string, THREE.MeshStandardMaterial>();
  const mat = (color: THREE.ColorRepresentation) => {
    const key = new THREE.Color(color).getHexString();
    if (!materials.has(key)) materials.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.95 }));
    return materials.get(key)!;
  };
  const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
  const columnGeometry = new THREE.CylinderGeometry(1, 1.12, 1, 8);
  const treeGeometry = new THREE.IcosahedronGeometry(1, 1);
  const coneGeometry = new THREE.ConeGeometry(1, 1, 12);
  function box(parent: THREE.Object3D, x: number, y: number, z: number, w: number, h: number, d: number, color: THREE.ColorRepresentation = stone, rotY = 0) {
    const mesh = new THREE.Mesh(boxGeometry, mat(color));
    mesh.position.set(x, y + h / 2, z);
    mesh.scale.set(w, h, d);
    mesh.rotation.y = rotY;
    parent.add(mesh);
    return mesh;
  }
  /** An arch cut into the bottom of a closed outline. A hole touching the
   * outer boundary is invalid for triangulation; trace the intrados instead.
   * Span follows local x, passage follows z, and rise is the actual rise. */
  function archWall(parent: THREE.Object3D, x: number, y: number, z: number, span: number, rise: number, height: number, depth: number, color: THREE.ColorRepresentation = darkStone, rotY = 0, thickness = 2.4) {
    const outer = new THREE.Shape();
    const half = span / 2 + thickness;
    const spring = height - rise - 1.4;
    if (spring < 0) throw new Error('Arch needs room for its crown masonry');
    outer.moveTo(-half, 0); outer.lineTo(-span / 2, 0);
    outer.lineTo(-span / 2, spring);
    for (let i = 0; i <= 32; i++) {
      const a = Math.PI * (1 - i / 32);
      outer.lineTo(Math.cos(a) * span / 2, spring + Math.sin(a) * rise);
    }
    outer.lineTo(span / 2, 0); outer.lineTo(half, 0);
    outer.lineTo(half, height); outer.lineTo(-half, height); outer.closePath();
    const geometry = new THREE.ExtrudeGeometry(outer, { depth, bevelEnabled: false, curveSegments: 24 });
    geometry.translate(0, 0, -depth / 2);
    const mesh = new THREE.Mesh(geometry, mat(color));
    mesh.userData.modelPart = 'arch';
    mesh.userData.opening = { span, rise, spring, depth, height };
    mesh.position.set(x, y, z); mesh.rotation.y = rotY;
    parent.add(mesh);
    return mesh;
  }
  function part(parent: THREE.Object3D, name: string) {
    const group = new THREE.Group(); group.name = name; parent.add(group); return group;
  }
  /** A supported staircase rising north (-z), optionally turned as a group.
   * Each tread starts at the foundation so the flight has no floating slices. */
  function stair(parent: THREE.Object3D, name: string, x: number, z: number, bottom: number, top: number, width: number, treads: number[], rotation = 0) {
    const group = part(parent, name);
    group.position.set(x, 0, z); group.rotation.y = rotation;
    const length = treads.reduce((sum, d) => sum + d, 0);
    let cursor = length / 2;
    treads.forEach((d, i) => {
      const y = bottom + (top - bottom) * (i + 1) / treads.length;
      box(group, 0, bottom - 1, cursor - d / 2, width, y - bottom + 1, d, '#cabf9f');
      cursor -= d;
    });
    group.userData.flight = { bottom, top, length, width, steps: treads.length };
    return group;
  }
  /** Wall with real rectangular openings; spans x, thickness along z. */
  function gatedWall(parent: THREE.Object3D, x: number, y: number, z: number, width: number, height: number, depth: number, openings: number[], doorWidth = 5, doorHeight = 10, rotation = 0) {
    const group = part(parent, 'gated-wall');
    group.position.set(x, y, z); group.rotation.y = rotation;
    let edge = -width / 2;
    for (const centre of openings) {
      const left = centre - doorWidth / 2;
      if (left > edge) box(group, (edge + left) / 2, 0, 0, left - edge, height, depth);
      box(group, centre, doorHeight, 0, doorWidth, height - doorHeight, depth);
      edge = centre + doorWidth / 2;
    }
    if (edge < width / 2) box(group, (edge + width / 2) / 2, 0, 0, width / 2 - edge, height, depth);
    return group;
  }
  function instances(parent: THREE.Object3D, geometry: THREE.BufferGeometry, color: THREE.ColorRepresentation, transforms: number[][]) {
    const mesh = new THREE.InstancedMesh(geometry, mat(color), transforms.length);
    const dummy = new THREE.Object3D();
    transforms.forEach(([x, y, z, w, h, d, rotY], i) => {
      dummy.position.set(x, y, z); dummy.scale.set(w, h, d); dummy.rotation.y = rotY ?? 0; dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    parent.add(mesh);
    return mesh;
  }
  /** A run of columns carrying an entablature, between two points of a group.
   * Shafts are collected per group and drawn as one instanced mesh at the end. */
  const columnsBy = new Map<THREE.Object3D, number[][]>();
  function colonnade(parent: THREE.Object3D, x1: number, z1: number, x2: number, z2: number, y: number, height: number, spacing = 6, radius = 0.85, count?: number) {
    if (!columnsBy.has(parent)) columnsBy.set(parent, []);
    const columns = columnsBy.get(parent)!;
    const length = Math.hypot(x2 - x1, z2 - z1);
    const n = count ? count - 1 : Math.max(1, Math.round(length / spacing));
    for (let i = 0; i <= n; i++) {
      const x = x1 + (x2 - x1) * i / n, z = z1 + (z2 - z1) * i / n;
      columns.push([x, y + height / 2, z, radius, height, radius]);
      box(parent, x, y + height - 0.8, z, radius * 2.6, 1, radius * 2.6, '#c1b394');
    }
    box(parent, (x1 + x2) / 2, y + height, (z1 + z2) / 2, radius * 3.6, 2.4, length + radius * 4, '#c0af8b', Math.atan2(x2 - x1, z2 - z1));
  }

  const bounds = JERUSALEM_BOUNDS;
  // Resolve the narrow western street terrace; a 12 m terrain cell is wider
  // than the street and interpolates a ridge straight through its paving.
  const samples = (min: number, max: number, count: number, near: number, far: number) => [...new Set([
    ...Array.from({ length: count + 1 }, (_, i) => min + (max - min) * i / count),
    ...Array.from({ length: Math.floor((far - near) / 2) + 1 }, (_, i) => near + i * 2),
  ])].sort((a, b) => a - b);
  const terrainXs = samples(bounds.west, bounds.east, 224, -220, 160);
  const terrainZs = samples(bounds.north, bounds.south, 208, -70, 320);
  const nx = terrainXs.length - 1, nz = terrainZs.length - 1;
  const terrain = new THREE.PlaneGeometry(bounds.east - bounds.west, bounds.south - bounds.north, nx, nz);
  terrain.rotateX(-Math.PI / 2);
  const pos = terrain.attributes.position;
  const colors = [];
  for (let i = 0; i < pos.count; i++) {
    const x = terrainXs[i % (nx + 1)];
    const z = terrainZs[Math.floor(i / (nx + 1))];
    const y = cityGround(x, z);
    pos.setXYZ(i, x, y, z);
    const c = new THREE.Color('#5d6a52').lerp(new THREE.Color('#b8a680'), Math.max(0, Math.min(1, (y - 45) / 135)));
    colors.push(c.r, c.g, c.b);
  }
  terrain.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  terrain.computeVertexNormals();
  const landMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, side: THREE.DoubleSide });
  const groundMesh = new THREE.Mesh(terrain, landMaterial);
  groundMesh.receiveShadow = true; root.add(groundMesh);
  // A thin slab beneath the relief makes the city read as an archaeological model.
  const PLINTH = -30;
  box(root, 125, -60, 225, 2750, 30, 2550, '#243c37');
  // The relief is a surface, so without a skirt down to the plinth you can see
  // straight in under the land at every edge. Close all four.
  const skirt: number[] = [];
  const edge = (ax: number, az: number, bx: number, bz: number) => {
    const ay = cityGround(ax, az), by = cityGround(bx, bz);
    skirt.push(ax, ay, az, bx, by, bz, bx, PLINTH, bz);
    skirt.push(ax, ay, az, bx, PLINTH, bz, ax, PLINTH, az);
  };
  for (let i = 0; i < nx; i++) {
    const x1 = terrainXs[i], x2 = terrainXs[i + 1];
    edge(x1, bounds.north, x2, bounds.north);
    edge(x1, bounds.south, x2, bounds.south);
  }
  for (let i = 0; i < nz; i++) {
    const z1 = terrainZs[i], z2 = terrainZs[i + 1];
    edge(bounds.west, z1, bounds.west, z2);
    edge(bounds.east, z1, bounds.east, z2);
  }
  const skirtGeometry = new THREE.BufferGeometry();
  skirtGeometry.setAttribute('position', new THREE.Float32BufferAttribute(skirt, 3));
  skirtGeometry.computeVertexNormals();
  root.add(new THREE.Mesh(skirtGeometry, new THREE.MeshStandardMaterial({ color: '#6f6a56', roughness: 1, side: THREE.DoubleSide })));

  const site = (id: string, parent: THREE.Object3D = landmarks) => {
    const group = new THREE.Group(); group.userData.siteId = id; parent.add(group); return group;
  };

  // ---- The Temple Mount, laid out in the turned frame of its own walls ------
  const mount = new THREE.Group();
  mount.position.set(PLATFORM.centre[0], 0, PLATFORM.centre[1]);
  mount.rotation.y = PLATFORM.angle;
  landmarks.add(mount);
  const c = Math.cos(PLATFORM.angle), s = Math.sin(PLATFORM.angle);
  const local = PLATFORM.corners.map(([x, z]) => {
    const dx = x - PLATFORM.centre[0], dz = z - PLATFORM.centre[1];
    return [dx * c - dz * s, dx * s + dz * c] as const;
  });
  const BASE = 70; // the retaining walls are carried well below the lowest ground
  const platformShape = new THREE.Shape(local.map(([x, z]) => new THREE.Vector2(x, z)));
  const platformGeometry = new THREE.ExtrudeGeometry(platformShape, { depth: PLATFORM.top - BASE, bevelEnabled: false });
  platformGeometry.rotateX(Math.PI / 2);
  platformGeometry.translate(0, PLATFORM.top, 0);
  const temple = site('temple', mount);
  const royal = site('royal-stoa', mount);
  mount.add(new THREE.Mesh(platformGeometry, mat(darkStone)));
  // Ashlar courses along every retaining face, so the walls read as masonry.
  const courses: number[][] = [];
  for (let i = 0; i < local.length; i++) {
    const [ax, az] = local[i], [bx, bz] = local[(i + 1) % local.length];
    const length = Math.hypot(bx - ax, bz - az), rot = Math.atan2(bx - ax, bz - az);
    for (let y = 96; y < PLATFORM.top; y += 2.6) courses.push([(ax + bx) / 2, y, (az + bz) / 2, 1, 1.5, length, rot]);
  }
  instances(mount, boxGeometry, '#8d8368', courses);

  // Double porticoes round the outer court; the eastern one is Solomon's Portico.
  const SOUTH = 240;
  const WEST = local[3][0], EAST = local[2][0]; // where the south wall meets the side walls
  /** The quad drawn in by d on every side: offset each edge along its inward
   * normal and intersect the neighbours, so corners stay on the walls' own lines. */
  function inset(d: number) {
    return local.map((_, i) => {
      const lines = [(i + 3) % 4, i].map((e) => {
        const [ax, az] = local[e], [bx, bz] = local[(e + 1) % 4];
        const len = Math.hypot(bx - ax, bz - az);
        const nx = -(bz - az) / len, nz = (bx - ax) / len; // inward: the quad runs clockwise
        return { px: ax + nx * d, pz: az + nz * d, dx: bx - ax, dz: bz - az };
      });
      const [u, v] = lines;
      const t = ((v.px - u.px) * v.dz - (v.pz - u.pz) * v.dx) / (u.dx * v.dz - u.dz * v.dx);
      return [u.px + u.dx * t, u.pz + u.dz * t] as const;
    });
  }
  for (const d of [10, 24]) {
    const [nw2, ne2, se2, sw2] = inset(d);
    colonnade(mount, nw2[0], nw2[1], ne2[0], ne2[1], PLATFORM.top, 12.5, 6);
    colonnade(mount, nw2[0], nw2[1], sw2[0], sw2[1] - 36, PLATFORM.top, 12.5, 6);
    colonnade(mount, ne2[0], ne2[1], se2[0], se2[1] - 36, PLATFORM.top, 12.5, 6);
  }
  {
    const [nw2, ne2, se2, sw2] = inset(17);
    const roof = (a: readonly [number, number], b: readonly [number, number]) => {
      const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
      box(mount, (a[0] + b[0]) / 2, PLATFORM.top + 14.5, (a[1] + b[1]) / 2, 20, 2, length, '#cbbb9a', Math.atan2(b[0] - a[0], b[1] - a[1]));
    };
    roof(nw2, ne2);
    roof(nw2, [sw2[0], sw2[1] - 36]);
    roof(ne2, [se2[0], se2[1] - 36]);
  }
  // Josephus Ant. 15.413–416: 162 Corinthian columns, three aisles in a
  // 1:1.5:1 ratio, with the SOUTHERN row engaged in the wall. His 27-foot
  // shafts do not run the full height of the 100-foot central nave.
  const stoa = part(royal, 'royal-basilica');
  const stoaX = (WEST + EAST) / 2, stoaWidth = EAST - WEST - 6;
  const rows = [SOUTH - 2.5, SOUTH - 11.9, SOUTH - 26, SOUTH - 35.4];
  rows.forEach((z, i) => {
    // 40/41/41/40 is a schematic distribution of the literary total.
    colonnade(stoa, WEST + 4, z, EAST - 4, z, PLATFORM.top, 8.2, 7, 0.85, i === 0 || i === 3 ? 40 : 41);
    box(stoa, stoaX, PLATFORM.top + 10.6, z, stoaWidth, 4.4, 1.8, '#b9a785');
  });
  box(stoa, stoaX, PLATFORM.top, SOUTH - 1, stoaWidth, 15, 1.8);
  // Clerestory masonry and windows support the raised roof continuously.
  for (const z of [rows[1], rows[2]]) {
    box(stoa, stoaX, PLATFORM.top + 15, z, stoaWidth, 5, 1.8);
    for (let i = 0; i <= 40; i++) box(stoa, WEST + 4 + (EAST - WEST - 8) * i / 40, PLATFORM.top + 20, z, 2.4, 8.8, 1.8);
    box(stoa, stoaX, PLATFORM.top + 28.8, z, stoaWidth, 1.2, 1.8);
  }
  box(stoa, stoaX, PLATFORM.top + 30, (rows[1] + rows[2]) / 2, stoaWidth, 1.1, 16, '#bba37c');
  for (const z of [(rows[0] + rows[1]) / 2, (rows[2] + rows[3]) / 2]) {
    box(stoa, stoaX, PLATFORM.top + 15, z, stoaWidth, 1, 10.8, '#c5b593');
  }

  // ---- The inner precinct, in cubits ---------------------------------------
  // Mishnah Middot measures the whole enclosure, and every number below is its
  // own: the court 187 × 135, the Court of the Women 135 square with four
  // 40-cubit corner chambers, the altar 32 square with a 32 × 16 ramp, the
  // sanctuary 100 × 100 × 100 — narrow behind and broad in front, "resembling
  // a lion". A Herodian royal cubit is taken as 0.50 m.
  //
  // The precinct climbs as you go in, half a cubit at a time: twelve steps from
  // the outer court to the chel, fifteen more from the Court of the Women to
  // the court itself, twelve again from the court up to the porch — ten metres
  // in all, which is what "going up to the house of the Lord" is made of.
  const cu = (n: number) => n * 0.5;
  const court = { west: -41.9, east: 51.6, north: -37, south: 30.5 };
  const axis = (court.north + court.south) / 2;
  const women = { west: court.east, east: court.east + cu(135) };
  // "All the steps in the Temple were half a cubit high with a tread of half a
  // cubit" — twelve of them to the chel, fifteen to the court, twelve to the
  // porch: six, seven and a half and six cubits, nearly ten metres in all.
  const rise = cu(0.5);
  const outerFloor = PLATFORM.top;
  const chelFloor = outerFloor + 12 * rise;
  const courtFloor = chelFloor + 15 * rise;
  // Middot 2.6, R. Eliezer b. Jacob's raised priestly court: one cubit,
  // followed by three half-cubit steps. Keep the whole western floor raised.
  const priestFloor = courtFloor + cu(2.5);
  const porchFloor = priestFloor + 12 * rise;
  // The chel is ten cubits wide all round the precinct, and the soreg stands at
  // its edge: ten handbreadths high, with the thirteen breaches the Greek kings
  // made in it and the priests repaired.
  const chel = { west: court.west - cu(10), east: women.east + cu(10), north: court.north - cu(10), south: court.south + cu(10) };
  // Twelve steps up to the chel, on every side of the precinct.
  for (let i = 0; i < 12; i++) {
    const out = i * cu(0.5), y = chelFloor - (i + 1) * rise;
    box(temple, chel.east + out, y, axis, cu(0.5), rise, chel.south - chel.north + out * 2, '#c8bfa6');
    box(temple, chel.west - out, y, axis, cu(0.5), rise, chel.south - chel.north + out * 2, '#c8bfa6');
    for (const z of [chel.north - out, chel.south + out]) {
      box(temple, (chel.west + chel.east) / 2, y, z, chel.east - chel.west + out * 2, rise, cu(0.5), '#c8bfa6');
    }
  }
  box(temple, (chel.west + chel.east) / 2, outerFloor, axis, chel.east - chel.west, chelFloor - outerFloor, chel.south - chel.north, '#cfc6ae');
  // Soreg outside the chel and its steps, ten handbreadths (Middot 2.3).
  // Josephus gives three cubits instead; the UI records the disagreement.
  const soreg = part(temple, 'soreg');
  for (const z of [chel.north - 3.6, chel.south + 3.6]) {
    const width = chel.east - chel.west + 7.2;
    for (let i = 0; i < 7; i++) box(soreg, chel.west - 3.6 + width * (i + 0.5) / 7, outerFloor, z, width / 7 - 2.5, cu(10 / 6), 0.35, '#b6a98a');
  }
  for (const x of [chel.west - 3.6, chel.east + 3.6]) {
    for (const sign of [-1, 1]) box(soreg, x, outerFloor, axis + sign * 24, 0.35, cu(10 / 6), 36, '#b6a98a');
  }

  // The Court of the Women, with four unroofed chambers forty cubits square in
  // its corners — Nazirites, wood, those with skin disease, oil — the balcony
  // added so the women could look on from above, and the thirteen shofar chests.
  box(temple, (women.west + women.east) / 2, chelFloor - 4, axis, women.east - women.west, 4, court.south - court.north, '#c7bea1');
  for (const z of [court.north, court.south]) box(temple, (women.west + women.east) / 2, chelFloor, z, women.east - women.west, cu(20), 3, '#cdc4ab');
  gatedWall(temple, women.east, chelFloor, axis, court.south - court.north, cu(24), 3, [0], cu(10), cu(20), Math.PI / 2).name = 'women-east-gate';
  for (const x of [women.west + cu(20) + 1.5, women.east - cu(20) - 1.5]) {
    for (const z of [court.north + cu(20) + 1.5, court.south - cu(20) - 1.5]) {
      for (const [dx, dz, w, d] of [[0, -cu(20), cu(40), 1.2], [0, cu(20), cu(40), 1.2], [-cu(20), 0, 1.2, cu(40)], [cu(20), 0, 1.2, cu(40)]]) {
        box(temple, x + dx, chelFloor, z + dz, w, cu(14), d, '#c9c0a7');
      }
    }
  }
  for (const z of [court.north + 4, court.south - 4]) box(temple, (women.west + women.east) / 2, chelFloor + cu(12), z, women.east - women.west - 8, 1.2, 3.4, '#c1b79b');
  for (let i = 0; i < 13; i++) box(temple, women.west + 17 + i * 3.4, chelFloor, axis + 6, 0.8, 1.2, 0.8, '#b2a385');

  // Fifteen steps climb from the Court of the Women to the Nicanor Gate, "not
  // rectangular but circular like the half of a threshing floor", bulging east
  // into the court; the Levites sang the Songs of Ascents standing on them.
  const stepGeometry = new THREE.CylinderGeometry(1, 1, 1, 26, 1, false, -Math.PI / 2, Math.PI);
  for (let i = 0; i < 15; i++) {
    const mesh = new THREE.Mesh(stepGeometry, mat('#cabf9f'));
    mesh.position.set(court.east, chelFloor + i * rise + rise / 2, axis);
    mesh.scale.set(cu(24) - i * cu(0.5), rise, cu(24) - i * cu(0.5));
    mesh.rotation.y = Math.PI / 2;
    temple.add(mesh);
  }

  // The court itself, walled and gated: four gates on the south, four on the
  // north, and on the east the Nicanor Gate, whose bronze doors were kept when
  // all the others were replaced with gold.
  box(temple, (court.west + court.east) / 2, chelFloor, axis, court.east - court.west, courtFloor - chelFloor, court.south - court.north, '#c7bea1');
  for (const z of [court.north, court.south]) gatedWall(temple, (court.west + court.east) / 2, courtFloor, z, court.east - court.west, cu(24), 3, [-32, -10, 12, 34]);
  box(temple, court.west, courtFloor, axis, 3, cu(22), court.south - court.north, '#cdc4ab');
  gatedWall(temple, court.east, courtFloor, axis, court.south - court.north, cu(24), 3, [0], cu(10), cu(20), Math.PI / 2).name = 'nicanor-gate';
  for (const dz of [-2.9, 2.9]) box(temple, court.east + 1.6, courtFloor, axis + dz, 0.45, cu(20), 0.7, gold);
  for (const dz of [-cu(12), cu(12)]) box(temple, court.east + 0.4, courtFloor, axis + dz, 5, cu(18), cu(9), '#8a6a2e');

  // Eleven cubits for Israel, then a dais of three half-cubit steps lifting the
  // Court of the Priests two and a half cubits above it.
  const daisEast = court.east - cu(11), daisWest = daisEast - cu(2);
  box(temple, daisEast - 0.125, courtFloor, axis, 0.25, cu(1), court.south - court.north - 3);
  for (let i = 0; i < 3; i++) box(temple, daisEast - 0.375 - i * 0.25, courtFloor, axis, 0.25, cu(1.5 + i * 0.5), court.south - court.north - 3);
  box(temple, (court.west + daisWest) / 2, courtFloor, axis, daisWest - court.west, priestFloor - courtFloor, court.south - court.north - 3).name = 'priest-floor';

  // Six chambers open off the court: salt, parvah and the washers' chamber on
  // the north; the wood chamber, the chamber of the exile with its cistern, and
  // the Chamber of Hewn Stone where the Sanhedrin judged the priesthood.
  // Schematic shallow rooms within the wall zone; do not obstruct the porch,
  // the altar ramp or the working area north of the altar.
  for (const [z, d] of [[court.north + 3.5, 1], [court.south - 3.5, -1]] as const) {
    for (let i = 0; i < 3; i++) {
      const x = -26 + i * 22;
      box(temple, x, priestFloor, z, 10, 7, 4, '#c4bb9e');
      box(temple, x, priestFloor + 7, z, 10.4, 0.6, 4.4, '#b3a887');
      box(temple, x, priestFloor, z + d * 2.05, 2, 4, 0.15, '#4a4437');
    }
  }

  // The altar of unhewn stone, thirty-two cubits square, rising by foundation
  // and surround to the horns, with the ramp on its south side, the laver a
  // little south of the line between porch and altar, and north of it the place
  // of slaughtering: twenty-four rings, eight tables, eight dwarf pillars.
  const altar = { x: 32.6, z: axis };
  const altarGroup = part(temple, 'altar');
  box(altarGroup, altar.x, priestFloor, altar.z, cu(32), cu(1), cu(32), '#c0b596');
  box(altarGroup, altar.x, priestFloor + cu(1), altar.z, cu(30), cu(5), cu(30), '#bcb191');
  box(altarGroup, altar.x, priestFloor + cu(6), altar.z, cu(28), cu(3), cu(28), '#b8ac8d');
  for (const dx of [-cu(13), cu(13)]) for (const dz of [-cu(13), cu(13)]) {
    box(altarGroup, altar.x + dx, priestFloor + cu(9), altar.z + dz, cu(2), cu(1), cu(2), '#c8bda0');
  }
  box(altarGroup, altar.x, priestFloor + cu(9), altar.z, cu(24), cu(0.3), cu(24), '#6b5a46');
  // A continuous 32 × 16-cubit ramp, never steps (Middot 3.3; Exodus 20.26).
  const rampSection = new THREE.Shape();
  rampSection.moveTo(0, 0); rampSection.lineTo(16, 0); rampSection.lineTo(0, 4.5); rampSection.closePath();
  const rampGeometry = new THREE.ExtrudeGeometry(rampSection, { depth: 8, bevelEnabled: false });
  rampGeometry.rotateY(-Math.PI / 2);
  const ramp = new THREE.Mesh(rampGeometry, mat('#bdb293'));
  ramp.name = 'altar-ramp'; ramp.position.set(altar.x + 4, priestFloor, altar.z + 7);
  temple.add(ramp);
  box(temple, altar.x - cu(21), priestFloor, altar.z + cu(25), cu(4), cu(4), cu(4), '#9aa79a');
  const slaughter = { pillars: court.north + cu(8), tables: court.north + cu(12), rings: court.north + cu(16) };
  for (let row = 0; row < 6; row++) for (let k = 0; k < 4; k++) {
    box(temple, altar.x - cu(9) + k * cu(6), priestFloor, slaughter.rings + row * 2.4, cu(1.6), 0.2, cu(1.6), '#6f6a55');
  }
  for (let i = 0; i < 8; i++) box(temple, altar.x - cu(13) + i * cu(3.6), priestFloor, slaughter.tables, cu(2.4), cu(1.6), cu(5), '#d2cab4');
  for (let i = 0; i < 8; i++) box(temple, altar.x - cu(13) + i * cu(3.6), priestFloor, slaughter.pillars, cu(1.2), cu(8), cu(1.2), '#b0a68a');
  box(temple, altar.x - cu(0.4), priestFloor + cu(8), slaughter.pillars, cu(27), cu(0.8), cu(1.4), '#7b6a4a');


  // The sanctuary. A hundred cubits each way: the porch a hundred wide and a
  // hundred high, the body behind it seventy wide, thirty-eight cells in three
  // storeys round the north, west and south, and the Hekhal and its upper
  // chamber rising through them to the roof.
  const porch = { east: 13.6, west: 5.6 };
  const body = { east: porch.west, west: -36.4 };
  // Twelve risers within the 22-cubit porch-to-altar interval (Middot 3.6,
  // 5.1). Landing distribution is schematic; it must not run into the altar.
  const porchTreads = Array.from({ length: 12 }, (_, i) => 0.5 + (i === 3 || i === 7 ? 1.5 : i === 11 ? 2 : 0));
  stair(temple, 'porch-steps', porch.east + cu(11), axis, priestFloor, porchFloor, cu(40), porchTreads, Math.PI / 2);
  const cells = { x: (body.east + body.west) / 2, w: body.east - body.west };
  const sanctuary = part(temple, 'sanctuary');
  box(sanctuary, cells.x, priestFloor, axis, cells.w, porchFloor - priestFloor, cu(70), '#e4dbc4');
  box(sanctuary, (porch.east + porch.west) / 2, priestFloor, axis, porch.east - porch.west, porchFloor - priestFloor, cu(100), '#e4dbc4');
  // The porch is an open recess with two massive wings and a high lintel.
  // A dark rectangle pasted onto a solid tower cannot convey that depth.
  for (const sign of [-1, 1]) box(sanctuary, (porch.east + porch.west) / 2, porchFloor, axis + sign * 15, porch.east - porch.west, cu(100), 20, '#efe7d4');
  box(sanctuary, (porch.east + porch.west) / 2, porchFloor + cu(40), axis, porch.east - porch.west, cu(60), cu(20), '#efe7d4');
  box(temple, cells.x, porchFloor, axis, cells.w, cu(40), cu(70), '#eae2ce');
  box(temple, cells.x, porchFloor + cu(40), axis, cells.w + 1, cu(3), cu(70) + 1, '#d8cfb6'); // guttering over the cells
  // Three storeys of cells: 15 each north/south and eight west (Middot 4.3).
  for (let level = 0; level < 3; level++) {
    for (const sign of [-1, 1]) {
      box(temple, cells.x, porchFloor + (level + 1) * 6.4, axis + sign * 17.6, cells.w, 0.35, 0.45, '#b9ad94');
      for (let i = 0; i < 5; i++) box(temple, body.west + 4 + i * 8, porchFloor + 2 + level * 6.4, axis + sign * 17.55, 1.2, 2, 0.12, '#6d624e');
    }
    for (let i = 0; i < (level === 2 ? 2 : 3); i++) box(temple, body.west - 0.05, porchFloor + 2 + level * 6.4, axis + (i - (level === 2 ? 0.5 : 1)) * 8, 0.12, 2, 1.2, '#6d624e');
  }
  box(temple, cells.x + 3, porchFloor, axis, cells.w - 6, cu(100), cu(32), '#efe7d4');
  box(temple, cells.x + 3, porchFloor + cu(100), axis, cells.w - 5, cu(3), cu(33), '#e2d9c0'); // the parapet
  box(temple, (porch.east + porch.west) / 2, porchFloor + cu(100), axis, porch.east - porch.west + 1, cu(3), cu(101), '#e2d9c0');
  box(temple, (porch.east + porch.west) / 2, porchFloor + cu(100) - cu(1), axis, porch.east - porch.west - 1, cu(1), cu(100) - 1, gold);
  // Golden spikes along the roofs, so that no bird should settle on the house.
  const spikes: number[][] = [];
  for (let i = 0; i < 24; i++) {
    spikes.push([porch.east - 0.5, porchFloor + cu(103), axis - cu(48) + i * 2.1, 0.2, cu(1), 0.2]);
    spikes.push([cells.x + 3, porchFloor + cu(103), axis - cu(15) + i * 0.65, 0.2, cu(1), 0.2]);
  }
  instances(temple, columnGeometry, gold, spikes);
  // The porch stands open — Josephus hangs a golden vine with clusters the
  // height of a man over it — and the doorway of the Hekhal behind it is twenty
  // cubits high and ten broad, with its four doors.
  box(temple, porch.east + 0.5, porchFloor + cu(40), axis, 1.8, cu(5), cu(26), gold);
  box(temple, porch.west + 0.2, porchFloor, axis, 0.25, cu(20), cu(10), '#4a4029');

  // Small low-poly figures give the courts a human scale without pretending to
  // reconstruct individual people. They stay on the documented floor levels:
  // worshippers in the Court of the Women and Israelite court, and priests or
  // attendants around the raised court and the altar service area.
  const people = part(temple, 'sanctuary-people');
  const personBodyGeometry = new THREE.ConeGeometry(0.72, 1, 6);
  const personHeadGeometry = new THREE.SphereGeometry(1, 6, 4);
  const bodyTransforms = new Map<string, number[][]>();
  const headTransforms: number[][] = [];
  const person = (x: number, z: number, floor: number, robe: string, rotation = 0) => {
    const body = bodyTransforms.get(robe) ?? [];
    body.push([x, floor + 1.25, z, 1, 2.5, 1, rotation]);
    bodyTransforms.set(robe, body);
    headTransforms.push([x, floor + 2.8, z, 0.48, 0.48, 0.48, rotation]);
  };
  const womenPeople: [number, number][] = [
    [65, -24], [78, -24], [91, -24], [104, -24],
    [65, 23], [80, 23], [95, 23], [109, 23],
    [61, -8], [61, 8], [74, -8], [88, 10], [101, -8], [112, 8],
  ];
  womenPeople.forEach(([x, z], i) => person(x, z, chelFloor, i % 3 === 0 ? '#8e806c' : i % 3 === 1 ? '#697a78' : '#a38c6d', i % 2 ? Math.PI : 0));
  const courtPeople: [number, number][] = [
    [-31, -23], [-18, -23], [-5, -23], [9, -23],
    [-31, 20], [-18, 20], [-5, 20], [9, 20],
    [-27, -7], [-14, 6], [0, -7], [14, 8],
  ];
  courtPeople.forEach(([x, z], i) => person(x, z, courtFloor, i % 2 ? '#7c7161' : '#9a8569', i % 2 ? Math.PI : 0));
  const priestPeople: [number, number][] = [
    [20, -13], [20, 7], [44, -14], [44, 10],
    [24, -27], [35, -27], [42, -27], [18, 13],
  ];
  priestPeople.forEach(([x, z], i) => person(x, z, priestFloor, i % 2 ? '#b7a27e' : '#6c7771', i % 2 ? Math.PI : 0));
  for (const [robe, transforms] of bodyTransforms) instances(people, personBodyGeometry, robe, transforms);
  instances(people, personHeadGeometry, '#8a6f59', headTransforms);

  // Separate southern approaches: the broad excavated flight belongs to the
  // Double Gate. The narrower Triple Gate approach is schematic. The doors
  // are below the esplanade and lead to internal rising passages.
  for (const [x, width, doors, name] of [[-67, 64, 2, 'double'], [38, 28, 3, 'triple']] as const) {
    const treads = Array.from({ length: 30 }, (_, i) => i % 2 ? 0.45 : 0.9);
    const length = treads.reduce((sum, d) => sum + d, 0);
    const foot = cityGround(...platformToWorld(x, SOUTH + 3 + length)) + 0.3;
    const threshold = foot + 6.6;
    stair(royal, `${name}-gate-steps`, x, SOUTH + 3 + length / 2, foot, threshold, width, treads);
    box(royal, x, foot - 1, SOUTH + 1.6, width, threshold - foot + 1, 3.2).name = `${name}-gate-landing`;
    box(royal, x, foot - 1, SOUTH + 4.25 + length, width, 1, 2.5);
    for (let i = 0; i < doors; i++) {
      const gx = x + (i - (doors - 1) / 2) * 5;
      // Recessed portal facade at the actual wall face; interiors are hidden
      // by the platform solid, not represented as archaeological cutaways.
      box(royal, gx, threshold, SOUTH + 0.36, 3.6, 5, 0.15, '#38362c');
      for (const side of [-1, 1]) box(royal, gx + side * 2.1, threshold, SOUTH + 0.65, 0.6, 5.5, 0.65);
      box(royal, gx, threshold + 5, SOUTH + 0.65, 4.8, 0.6, 0.65);
    }
  }

  // The west wall is slightly skew even within the mount's rotated frame.
  const westAt = (z: number) => local[0][0] + (local[3][0] - local[0][0]) * (z - local[0][1]) / (local[3][1] - local[0][1]);
  const westAngle = -Math.atan2(local[3][0] - local[0][0], local[3][1] - local[0][1]);
  const westFrame = (id: string, z: number) => {
    const group = site(id, mount);
    group.position.set(westAt(z), 0, z); group.rotation.y = westAngle;
    return group;
  };
  // Robinson: northbound stair WEST of the street, turning EAST over the
  // main arch. Mazar's plan has smaller vaults to the SOUTH, not to the west.
  const robinson = westFrame('robinson', 228);
  const rStreet = cityGround(...platformToWorld(westAt(228) - 6.4, 228)) + 0.3;
  const landingTop = PLATFORM.top - 4;
  const rDeck = landingTop - 1;
  archWall(robinson, -6.4, rStreet, 0, 12.8, 6.4, rDeck - rStreet, 15.2, darkStone, 0, 1.8).name = 'robinson-main-arch';
  box(robinson, -6.4, rDeck, 0, 16.4, 1, 15.2).name = 'robinson-overpass';
  // West landing and a 35 m supported ascending flight on transverse vaults.
  const stairX = -20.4, flightStart = 43, flightEnd = 7.6;
  const stairFoot = cityGround(...platformToWorld(westAt(228) + stairX, 228 + flightStart)) + 0.3;
  const stairFloor = (z: number) => stairFoot + (landingTop - stairFoot) * (flightStart - z) / (flightStart - flightEnd);
  const vaultTop = (z: number) => stairFloor(z + 2.9) - 0.85;
  const nSteps = Math.ceil((landingTop - stairFoot) / 0.24);
  const stepDepth = (flightStart - flightEnd) / nSteps;
  const stairDeck = part(robinson, 'robinson-south-flight');
  for (let i = 0; i < nSteps; i++) {
    const z = flightStart - (i + 0.5) * stepDepth;
    const bayZ = 10.2 + Math.max(0, Math.min(5, Math.round((z - 10.2) / 5.8))) * 5.8;
    const base = Math.max(stairFoot - 1, vaultTop(bayZ));
    box(stairDeck, stairX, base, z, 11.6, stairFloor(z - stepDepth / 2) - base, stepDepth + 0.02);
  }
  // Parapets follow the stairs without sealing the transverse vault openings.
  for (const x of [stairX - 5.8, stairX + 5.8]) {
    for (let i = 0; i < nSteps; i++) {
      const z = flightStart - (i + 0.5) * stepDepth;
      box(robinson, x, stairFloor(z - stepDepth / 2), z, 0.55, 0.9, stepDepth + 0.02, darkStone);
    }
  }
  for (let i = 0; i < 6; i++) {
    const z = 10.2 + i * 5.8;
    const h = vaultTop(z) - stairFoot;
    if (h >= 3.5) archWall(robinson, stairX, stairFoot, z, 4, 2, h, 11.6, darkStone, Math.PI / 2, 0.9);
    else if (h > 0) box(robinson, stairX, stairFoot - 1, z, 11.6, h + 1, 5.8, darkStone);
  }
  box(robinson, stairX, stairFoot - 1, 0, 11.6, landingTop - stairFoot + 1, 15.2);
  stair(robinson, 'robinson-east-flight', -9.1, 0, landingTop, PLATFORM.top, 13, Array(17).fill(18.2 / 17), -Math.PI / 2);
  // Shop recesses on the eastern face of the west pier leave the street open.
  for (const z of [-5, 0, 5]) box(robinson, -14.5, rStreet, z, 0.12, 3.6, 2.8, '#494537');

  // Regev et al. 2020: 7.4 m northern phase, widened south to 14.8 m in
  // AD 30–60. For c. AD 30 choose the earlier phase. The western bays are
  // conjectural, not the surviving two-row later Roman Great Causeway.
  const wilson = westFrame('wilson', 76.3);
  const wStreet = cityGround(...platformToWorld(westAt(76.3) - 6.4, 76.3)) + 0.3;
  const deckBottom = PLATFORM.top - 1;
  archWall(wilson, -6.4, wStreet, 0, 12.8, 6.4, deckBottom - wStreet, 7.4, darkStone, 0, 1.8).name = 'wilson-main-arch';
  let abutment = -100;
  while (abutment > -150 && cityGround(...platformToWorld(westAt(76.3) + abutment, 76.3)) < PLATFORM.top - 1) abutment -= 2;
  // Bays share piers and stop at the continuous bridge soffit.
  for (let x = -21.4; x > abutment + 4; x -= 11) {
    const base = cityGround(...platformToWorld(westAt(76.3) + x, 76.3)) - 1;
    const height = deckBottom - base;
    if (height > 6) archWall(wilson, x, base, 0, 7.4, 3.7, height, 7.4, darkStone, 0, 1.8);
    else if (height > 0) box(wilson, x, base, 0, 11, height, 7.4, darkStone);
  }
  box(wilson, (abutment + 1.8) / 2, deckBottom, 0, 1.8 - abutment, 1, 7.4).name = 'wilson-deck';
  for (const z of [-3.5, 3.5]) box(wilson, (abutment + 1.8) / 2, PLATFORM.top, z, 1.8 - abutment, 1, 0.45);
  // A low, terrain-supported plaza indicates the uncertain Xystus location.
  // No invented enclosing walls or confidently positioned council chamber.
  const xystus = part(wilson, 'xystus');
  for (let x = abutment - 38; x < abutment; x += 4) for (let z = -16; z < 20; z += 4) {
    const y = Math.max(PLATFORM.top, cityGround(...platformToWorld(westAt(76.3) + x + 2, 76.3 + z + 2)) + 0.2);
    box(xystus, x + 2, y - 3, z + 2, 4.1, 3, 4.1, '#bcb59e');
  }

  // ---- Everything else, in world coordinates ------------------------------

  // The Antonia, on its own rock north-west of the enclosure.
  const antonia = site('antonia', mount);
  box(antonia, -48, 132, -271, 122, 14, 47, '#b5a888');
  box(antonia, -48, 146, -271, 108, 12, 36, '#c7bfa5');
  for (const dx of [-61, 61]) for (const dz of [-23.5, 23.5]) {
    const high = dx > 0 && dz > 0;
    box(antonia, -48 + dx, 146, -271 + dz, 17, high ? 34 : 24, 17);
    for (let i = -1; i <= 1; i++) for (const side of [-6, 6]) box(antonia, -48 + dx + i * 6, 146 + (high ? 34 : 24), -271 + dz + side, 3, 2.5, 3);
  }
  // The Struthion pool, cut in the rock beside the fortress.
  box(antonia, -108, 140, -300, 52, 1, 14, '#477b7a');

  // Herod's palace on the western hill, and the three towers on the wall.
  const palace = site('palace');
  const py = cityGround(-715, 340);
  box(palace, -715, py - 4, 340, 132, 8, 300, '#a99b7c');
  for (const x of [-762, -668]) box(palace, x, py + 4, 345, 34, 19, 250);
  for (const z of [215, 470]) box(palace, -715, py + 4, z, 120, 16, 34);
  box(palace, -715, py + 4, 345, 46, 1, 150, '#647759'); // the garden between the two wings
  box(palace, -715, py + 5, 320, 16, 1, 40, '#527c78'); // the pool Josephus describes
  for (const [x, h] of [[-770, 40], [-712, 45], [-655, 22]]) {
    box(palace, x, py + 2, 180, 20, h, 20);
    box(palace, x, py + 2 + h, 180, 23, 2.5, 23, gold);
  }

  // Pools. Bethesda is twin trapezoids under five porticoes; Siloam is stepped
  // on three sides; Amygdalon and the Serpent's Pool are the city's reservoirs.
  // A basin read from outside: the terrain cannot be cut, so the rim stands a
  // little proud of the ground and the water sits just inside it.
  function pool(group: THREE.Object3D, x: number, z: number, w: number, d: number, steps = 4) {
    let y = -Infinity, low = Infinity;
    for (const dx of [-1, 0, 1]) for (const dz of [-1, 0, 1]) {
      const h = cityGround(x + dx * (w / 2 + 4), z + dz * (d / 2 + 4));
      y = Math.max(y, h); low = Math.min(low, h);
    }
    const skirt = Math.max(10, y - low + 6);
    for (const dx of [-1, 1]) box(group, x + dx * (w / 2 + 1.6), y + 3 - skirt, z, 3.2, skirt, d + 6.4, '#b6ac90');
    for (const dz of [-1, 1]) box(group, x, y + 3 - skirt, z + dz * (d / 2 + 1.6), w + 6.4, skirt, 3.2, '#b6ac90');
    box(group, x, y + 1.2, z, w, 0.6, d, '#3f6f70');
    for (let i = 0; i < steps; i++) {
      const inset = i * 2.4;
      box(group, x, y + 1.2 + i * 0.55, z + d / 2 - 1.2 - inset, w - inset * 2, 0.55, 2.4, '#c6bda0');
      for (const dx of [-1, 1]) box(group, x + dx * (w / 2 - 1.2 - inset), y + 1.2 + i * 0.55, z, 2.4, 0.55, d - inset * 2, '#c6bda0');
    }
  }
  pool(site('siloam'), -26, 843, 60, 50);
  const bethesda = site('bethesda');
  pool(bethesda, 73, -415, 53, 40, 0); pool(bethesda, 73, -367, 47, 52, 0);
  const by = cityGround(73, -390) + 3;
  for (const z of [-441, -393, -341]) colonnade(bethesda, 44, z, 102, z, by, 7, 7);
  for (const x of [44, 102]) colonnade(bethesda, x, -441, x, -341, by, 7, 7);
  const reservoirs = new THREE.Group(); root.add(reservoirs);
  pool(reservoirs, -654, -83, 73, 44, 0); // Amygdalon, the Pool of the Towers
  pool(reservoirs, -864, 649, 100, 40, 0); // the Serpent's Pool in the Hinnom

  // The palatial mansion of the Herodian Quarter: a courtyard house of some
  // 600 m² with frescoes, mosaics and its own ritual baths.
  const upper = site('upper');
  const uy = cityGround(-290, 292);
  box(upper, -290, uy, 292, 34, 8, 30, '#d0c4a4');
  box(upper, -290, uy + 8, 292, 36, 1.2, 32, '#b3a382');
  box(upper, -290, uy + 1, 292, 16, 0.4, 14, '#9fae8b'); // the peristyle court
  for (const dx of [-13, 13]) box(upper, -290 + dx, uy + 9.2, 292, 7, 4, 30, '#d6cbab');
  box(upper, -308, uy + 0.4, 310, 5, 0.6, 5, '#477b7a'); // a mikveh in the basement rooms

  // Akeldama: the rock face on the Hinnom's southern slope, honeycombed with
  // first-century burial chambers.
  const hinnom = site('hinnom');
  for (let i = 0; i < 5; i++) {
    const x = -400 + i * 36, z = 1105 + i * 12;
    const y = cityGround(x, z);
    box(hinnom, x, y - 9, z, 34, 11, 16, '#ab a1 89'.replaceAll(' ', ''));
    box(hinnom, x, y - 3.5, z - 7.5, 3, 3.4, 3, '#3d382c');
  }

  // Quarries and rock-cut tombs in the open ground of Bezetha, north of the wall.
  const bezetha = site('bezetha');
  for (let i = 0; i < 4; i++) {
    const x = -330 + i * 60, z = -505 + (i % 2) * 60;
    const y = cityGround(x, z);
    box(bezetha, x, y - 7, z, 42, 8, 34, '#b5ab8f');
    box(bezetha, x - 14, y + 1, z, 6, 2.5, 10, '#c3b998');
  }

  // The Gihon spring house, and the Siloam channel below the eastern slope.
  const gihon = site('gihon');
  const spring = cityGround(135, 528);
  box(gihon, 135, spring - 6, 528, 26, 9, 22, '#ac a2 88'.replaceAll(' ', ''));
  box(gihon, 135, spring + 3, 528, 16, 7, 13, '#bdb191');
  for (const dx of [-11, 11]) box(gihon, 135 + dx, spring + 3, 528, 7, 11, 9, '#b0a487');
  box(gihon, 135, spring + 3.2, 528, 9, 0.6, 7, '#3f6f70'); // the basin the spring fills
  // Hezekiah's tunnel runs underground from here to Siloam, so nothing of it
  // belongs on the surface; only its mouth is built.
  box(gihon, 148, spring - 1, 534, 5, 4, 6, '#3d382c');

  // Kidron valley monuments: Absalom's pillar, the Bnei Hezir tomb, Zechariah's.
  const tombs = site('kidron-tombs');
  const ay = cityGround(331, 83);
  box(tombs, 331, ay, 83, 9, 12, 9, '#c6bb9c');
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.6, 5, 14), mat('#c6bb9c'));
  drum.position.set(331, ay + 14.5, 83); tombs.add(drum);
  const cone = new THREE.Mesh(coneGeometry, mat('#bfb393'));
  cone.position.set(331, ay + 21, 83); cone.scale.set(4.4, 8, 4.4); tombs.add(cone);
  const hy = cityGround(336, 118);
  box(tombs, 336, hy, 118, 12, 7, 9, '#b7ac8d');
  colonnade(tombs, 331, 114, 341, 114, hy, 6, 5, 0.6);
  const zy = cityGround(340, 152);
  box(tombs, 340, zy, 152, 9, 8, 9, '#c6bb9c');
  const pyramid = new THREE.Mesh(coneGeometry, mat('#bfb393'));
  pyramid.position.set(340, zy + 12, 152); pyramid.scale.set(7, 8, 7); pyramid.rotation.y = Math.PI / 4;
  pyramid.geometry = new THREE.ConeGeometry(1, 1, 4); tombs.add(pyramid);

  // Golgotha: a spur left standing in an abandoned quarry, with rock-cut tombs
  // in the face across the garden.
  const golgotha = site('golgotha');
  const gy = cityGround(-528, -30);
  // The quarry floor, the faces left standing round it, the spur of poor stone
  // the quarrymen walked away from, and the tomb chambers cut into the west face.
  box(golgotha, -528, gy - 1.2, -30, 58, 1.2, 56, '#bfb69b');
  for (const [dx, dz, w, d] of [[0, -29, 62, 5], [-31, 0, 5, 56], [31, 0, 5, 56]]) {
    box(golgotha, -528 + dx, gy - 1, -30 + dz, w, 6.5, d, '#b0a68b');
  }
  const spur = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 0), mat('#a8a089'));
  spur.position.set(-524, gy + 4, -26); spur.scale.set(6, 9, 5.5); spur.rotation.y = 0.6;
  golgotha.add(spur);
  box(golgotha, -552, gy, -44, 9, 9, 30, '#b0a68b'); // the west face, with its tombs
  for (const dz of [-52, -40]) {
    box(golgotha, -548, gy + 1, dz, 2.5, 3.6, 3.2, '#3a352a');
    box(golgotha, -546, gy + 1, dz + 3, 1.2, 3.4, 3.4, '#9c9480'); // the stone rolled aside
  }
  const gardenTrunks = [], gardenLeaves = [];
  for (let i = 0; i < 9; i++) {
    const x = -528 + (i % 3 - 1) * 17 + (i % 2) * 5, z = -12 + Math.floor(i / 3) * 13;
    const y = cityGround(x, z);
    gardenTrunks.push([x, y + 2.5, z, 0.9, 5, 0.9]);
    gardenLeaves.push([x, y + 6.5, z, 5.5, 4, 5.5]);
  }
  instances(golgotha, columnGeometry, '#665d43', gardenTrunks);
  instances(golgotha, treeGeometry, '#57704b', gardenLeaves);

  // ---- Walls, gates and the stepped street --------------------------------
  // Where the outline follows the enclosure, the retaining walls already are the
  // city wall; drawing a second one on the esplanade's edge would be a fiction.
  const enclosure = [...PLATFORM.corners, PLATFORM.corners[0]];
  const onEnclosure = (x: number, z: number) => distanceToPath(x, z, enclosure) < 15;
  function wallPath(points: Point[], inferred: boolean) {
    for (let i = 1; i < points.length; i++) {
      const [ax, az] = points[i - 1], [bx, bz] = points[i];
      if (onEnclosure(ax, az) && onEnclosure(bx, bz)) continue;
      const length = Math.hypot(bx - ax, bz - az);
      const n = Math.ceil(length / 22);
      const rot = Math.atan2(bx - ax, bz - az);
      const at = (j: number) => [ax + (bx - ax) * (j + 0.5) / n, az + (bz - az) * (j + 0.5) / n];
      // A wall's crown is level over a stretch and steps down with the hill, so
      // take the high ground of each piece and its neighbours: following every
      // piece exactly leaves a row of loose blocks, levelling the whole run
      // leaves a cliff where the ground falls away.
      for (let j = 0; j < n; j++) {
        if (inferred && j % 3 === 2) continue; // Gaps communicate an uncertain course.
        const [x, z] = at(j);
        let crown = -Infinity;
        for (const k of [j - 1, j, j + 1]) {
          const [nx, nz] = at(Math.max(0, Math.min(n - 1, k)));
          crown = Math.max(crown, cityGround(nx, nz) + 14);
        }
        const y = cityGround(x, z) - 5;
        box(walls, x, y, z, 6, crown - y, length / n + 1.5, inferred ? '#ad956c' : '#b9ad91', rot);
        if (j % 2 === 0) box(walls, x, crown, z, 6.4, 2, 4.5, '#b9ad91', rot);
      }
      if (!inferred) box(walls, ax, cityGround(ax, az) - 5, az, 12, 24, 12);
    }
  }
  wallPath(FIRST_WALL, false); wallPath(SECOND_WALL, true);
  for (const gate of GATES) {
    const y = cityGround(gate.x, gate.z) - 4;
    box(walls, gate.x, y, gate.z, gate.w, 11, 9, '#4a4437');
    for (const side of [-1, 1]) box(walls, gate.x + side * (gate.w / 2 + 4), y, gate.z, 8, 20, 10);
  }
  // The street is 8 m of paving hugging the valley floor, laid in short courses
  // that overlap so the fall of the ground — about 80 m over the 600 m from
  // Siloam to the temple — shows as steps rather than as gaps.
  for (let i = 1; i < PILGRIM_ROAD.length; i++) {
    const [ax, az] = PILGRIM_ROAD[i - 1], [bx, bz] = PILGRIM_ROAD[i];
    const length = Math.hypot(bx - ax, bz - az);
    const n = Math.max(1, Math.round(length / 3.5));
    const rot = Math.atan2(bx - ax, bz - az);
    for (let j = 0; j < n; j++) {
      const x = ax + (bx - ax) * (j + 0.5) / n, z = az + (bz - az) * (j + 0.5) / n;
      const ux = (bx - ax) / length, uz = (bz - az) / length;
      let top = -Infinity;
      for (const along of [-0.6, 0, 0.6]) for (const across of [-1, 0, 1]) {
        const px = x + ux * along * (length / n) - uz * across * 4.2;
        const pz = z + uz * along * (length / n) + ux * across * 4.2;
        top = Math.max(top, cityGround(px, pz));
      }
      box(roads, x, top - 2.4, z, 8, 2.6, length / n + 1.6, j % 2 ? '#d9cca7' : '#d1c39c', rot);
    }
  }

  // ---- Illustrative housing ------------------------------------------------
  let seed = 30;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const bodies: number[][] = [], roofs: number[][] = [];
  const northQuarter: Point[] = [[-369, 142], ...SECOND_WALL.slice(1), [-102, 104], [-250, 130]];
  const platformWorld = PLATFORM.corners;
  for (let x = -820; x < 240; x += 26) for (let z = -520; z < 950; z += 25) {
    const hx = x + (random() - 0.5) * 12, hz = z + (random() - 0.5) * 12;
    const inCity = insidePolygon(hx, hz, FIRST_WALL) || insidePolygon(hx, hz, northQuarter);
    // Bezetha north of the wall is open ground with scattered building on it.
    const suburb = !inCity && hz < -260 && hx > -560 && hx < 120 && random() > 0.72;
    if (!inCity && !suburb) continue;
    if (insidePolygon(hx, hz, platformWorld)) continue;
    if (hx > -180 && hx < 230 && hz > -330 && hz < 300) continue; // the temple's approaches
    if (hx < -640 && hz > 150 && hz < 500) continue; // Herod's palace
    if (Math.hypot(hx + 26, hz - 843) < 70 || Math.hypot(hx - 73, hz + 390) < 80) continue; // pools
    if (Math.hypot(hx + 654, hz + 83) < 60) continue;
    if (distanceToPath(hx, hz, PILGRIM_ROAD) < 20) continue; // the stepped street
    if (Math.abs(hx - (-250 + hz * 0.1)) < 12 && hz > 150) continue; // the upper city's spine
    if (random() > 0.87) continue;
    const w = 10 + random() * 11, d = 10 + random() * 11, h = 4.5 + random() * 8;
    const y = cityGround(hx, hz) - 1;
    bodies.push([hx, y + h / 2, hz, w, h, d, (random() - 0.5) * 0.35]);
    roofs.push([hx, y + h + 0.35, hz, w + 0.8, 0.7, d + 0.8, bodies[bodies.length - 1][6]]);
  }
  instances(housing, boxGeometry, '#c6b999', bodies);
  instances(housing, boxGeometry, '#a79672', roofs);

  // ---- Olive groves on the eastern slopes ----------------------------------
  const trunks: number[][] = [], leaves: number[][] = [];
  const groveTrunks: number[][] = [], groveLeaves: number[][] = [];
  const grove = site('gethsemane');
  const vegetation = new THREE.Group(); root.add(vegetation);
  for (let i = 0; i < 260; i++) {
    const x = 360 + random() * 900, z = -600 + random() * 1400;
    if (random() > 0.82) continue;
    const y = cityGround(x, z);
    const isGrove = Math.hypot(x - 413, z + 145) < 95;
    (isGrove ? groveTrunks : trunks).push([x, y + 3, z, 1.1, 6, 1.1]);
    (isGrove ? groveLeaves : leaves).push([x, y + 8, z, 7 + random() * 3, 5, 7]);
  }
  for (let i = 0; i < 18; i++) {
    const x = 413 + (random() - 0.5) * 110, z = -145 + (random() - 0.5) * 115;
    const y = cityGround(x, z);
    groveTrunks.push([x, y + 3, z, 1.1, 6, 1.1]);
    groveLeaves.push([x, y + 8, z, 8, 5, 7]);
  }
  instances(vegetation, columnGeometry, '#665d43', trunks);
  instances(vegetation, treeGeometry, '#506a48', leaves);
  instances(grove, columnGeometry, '#665d43', groveTrunks);
  instances(grove, treeGeometry, '#506a48', groveLeaves);
  let columnCount = 0;
  for (const [parent, shafts] of columnsBy) { instances(parent, columnGeometry, stone, shafts); columnCount += shafts.length; }

  return { root, housing, walls, roads, landmarks, houseCount: bodies.length, columnCount };
}

/** Shared geometries and materials are disposed once, including instanced buffers. */
export function disposeJerusalem(root: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  root.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      geometries.add(obj.geometry);
      for (const material of Array.isArray(obj.material) ? obj.material : [obj.material]) materials.add(material);
      if (obj instanceof THREE.InstancedMesh) obj.dispose();
    }
  });
  geometries.forEach((g) => g.dispose()); materials.forEach((m) => m.dispose());
}
