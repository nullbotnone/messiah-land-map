import * as THREE from 'three';
import { cityGround, distanceToPath, platformToWorld, FIRST_WALL, SECOND_WALL, GATES, PILGRIM_ROAD, PLATFORM, JERUSALEM_BOUNDS, insidePolygon, type Point } from './jerusalem-data';

const stone = new THREE.Color('#d5c7a7');
const darkStone = new THREE.Color('#a69a7f');
const gold = new THREE.Color('#c5a35d');
const CUBIT = 0.5;

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
  function colonnade(parent: THREE.Object3D, x1: number, z1: number, x2: number, z2: number, y: number, height: number, spacing = 6, radius = 0.85) {
    if (!columnsBy.has(parent)) columnsBy.set(parent, []);
    const columns = columnsBy.get(parent)!;
    const length = Math.hypot(x2 - x1, z2 - z1);
    const n = Math.max(1, Math.round(length / spacing));
    for (let i = 0; i <= n; i++) {
      const x = x1 + (x2 - x1) * i / n, z = z1 + (z2 - z1) * i / n;
      columns.push([x, y + height / 2, z, radius, height, radius]);
      box(parent, x, y + height - 0.8, z, radius * 2.6, 1, radius * 2.6, '#c1b394');
    }
    box(parent, (x1 + x2) / 2, y + height, (z1 + z2) / 2, radius * 3.6, 2.4, length + radius * 4, '#c0af8b', Math.atan2(x2 - x1, z2 - z1));
  }

  const bounds = JERUSALEM_BOUNDS;
  const terrain = new THREE.PlaneGeometry(bounds.east - bounds.west, bounds.south - bounds.north, 224, 208);
  terrain.rotateX(-Math.PI / 2);
  const pos = terrain.attributes.position;
  const colors = [];
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) + (bounds.west + bounds.east) / 2;
    const z = pos.getZ(i) + (bounds.north + bounds.south) / 2;
    const y = cityGround(x, z);
    pos.setXYZ(i, x, y, z);
    const c = new THREE.Color('#5d6a52').lerp(new THREE.Color('#b8a680'), Math.max(0, Math.min(1, (y - 45) / 135)));
    colors.push(c.r, c.g, c.b);
  }
  terrain.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  terrain.computeVertexNormals();
  const landMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, side: THREE.DoubleSide });
  root.add(new THREE.Mesh(terrain, landMaterial));
  // A thin slab beneath the relief makes the city read as an archaeological model.
  box(root, 125, -60, 225, 2750, 30, 2550, '#243c37');

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
  const NORTH = -236, SOUTH = 240, WEST = -150, EAST = 150;
  for (const inset of [10, 24]) {
    colonnade(mount, WEST + inset, NORTH + inset, EAST - inset, NORTH + inset, PLATFORM.top, 12.5, 6);
    colonnade(mount, WEST + inset, NORTH + inset, WEST + inset, SOUTH - 36, PLATFORM.top, 12.5, 6);
    colonnade(mount, EAST - inset, NORTH + inset, EAST - inset, SOUTH - 36, PLATFORM.top, 12.5, 6);
  }
  box(mount, 0, PLATFORM.top + 14.5, NORTH + 17, EAST - WEST - 20, 2, 20, '#cbbb9a');
  for (const x of [WEST + 17, EAST - 17]) box(mount, x, PLATFORM.top + 14.5, (NORTH + SOUTH - 36) / 2 + 8, 20, 2, SOUTH - 36 - NORTH - 20, '#cbbb9a');
  // The Royal Stoa: 280 m of basilica on the southern wall, four rows of columns,
  // a nave half again as high as its aisles, 162 columns in all.
  for (const [z, height] of [[SOUTH - 5, 15], [SOUTH - 14, 30], [SOUTH - 28, 30], [SOUTH - 33, 15]]) {
    colonnade(royal, WEST + 4, z, EAST - 16, z, PLATFORM.top, height, 7, 0.75);
  }
  box(royal, -6, PLATFORM.top + 30, SOUTH - 21, 268, 3, 18, '#cbbb9a');
  for (const z of [SOUTH - 9.5, SOUTH - 30.5]) box(royal, -6, PLATFORM.top + 15, z, 268, 2.5, 13, '#c5b593');

  // Inner precinct: soreg, the Court of Israel and the Priests, the Court of the
  // Women, the altar and the sanctuary — Middot's cubits at 0.5 m.
  const court = { west: -41.9, east: 51.6, north: -37, south: 30.5 };
  const axis = -3.2;
  box(temple, (court.west + court.east) / 2 + 30, PLATFORM.top, axis, 205, 1.6, 108, '#cfc6ae'); // the chel terrace
  for (const z of [axis - 54, axis + 54]) box(temple, (court.west + court.east) / 2 + 30, PLATFORM.top + 1.6, z, 205, 1.3, 1.2, '#b6a98a'); // soreg
  for (const x of [court.west - 12, 133]) box(temple, x, PLATFORM.top + 1.6, axis, 1.2, 1.3, 108, '#b6a98a');
  for (const z of [court.north, court.south]) box(temple, (court.west + court.east) / 2, PLATFORM.top + 1.6, z, court.east - court.west, 12, 3, '#cdc4ab');
  box(temple, court.west, PLATFORM.top + 1.6, axis, 3, 12, court.south - court.north, '#cdc4ab');
  const women = { west: court.east, east: court.east + 67.5 };
  for (const z of [court.north, court.south]) box(temple, (women.west + women.east) / 2, PLATFORM.top + 1.6, z, women.east - women.west, 10, 3, '#cdc4ab');
  box(temple, women.east, PLATFORM.top + 1.6, axis, 3, 10, court.south - court.north, '#cdc4ab');
  for (const x of [women.west + 12, women.east - 12]) for (const z of [court.north + 12, court.south - 12]) {
    for (const [dx, dz, w, d] of [[0, -10, 20, 1.5], [0, 10, 20, 1.5], [-10, 0, 1.5, 20], [10, 0, 1.5, 20]]) {
      box(temple, x + dx, PLATFORM.top + 1.6, z + dz, w, 7, d, '#c9c0a7'); // the four unroofed chambers
    }
  }
  box(temple, court.east, PLATFORM.top + 1.6, axis, 3, 14, 40, '#cdc4ab'); // wall between the courts
  box(temple, court.east, PLATFORM.top + 3, axis, 4, 11, 14, gold); // the Nicanor Gate
  box(temple, women.east, PLATFORM.top + 3, axis, 4, 9, 12, '#b2914f'); // the eastern gate
  // Altar, 32 cubits square, with its ramp on the south.
  box(temple, 32.6, PLATFORM.top + 1.6, axis, 32 * CUBIT, 5, 32 * CUBIT, '#b8ab8d');
  box(temple, 32.6, PLATFORM.top + 1.6, axis + 16, 16, 3.4, 16, '#b0a385');
  // Sanctuary: 100 cubits long, 70 wide, 100 high, with a porch the full width.
  box(temple, -11.4, PLATFORM.top + 1.6, axis, 50, 40, 35, '#efe7d4');
  box(temple, 11.1, PLATFORM.top + 1.6, axis, 5, 50, 50, '#efe7d4');
  box(temple, -11.4, PLATFORM.top + 41.6, axis, 51, 2.5, 36, gold);
  for (const dz of [-18, 18]) box(temple, 13.4, PLATFORM.top + 1.6, axis + dz, 2, 50, 14, '#e6dcc6'); // the porch's flanking piers
  box(temple, 14.2, PLATFORM.top + 6, axis, 1.6, 28, 11, '#584b34'); // the great doorway, twenty cubits high
  for (let i = 0; i < 15; i++) box(temple, court.east + 6 + i * 1.2, PLATFORM.top + 1.6 - i * 0.35, axis, 1.2, 0.35, 26, '#cabf9f');
  // Twelve steps up to the chel, fifteen more at the Nicanor Gate.
  for (let i = 0; i < 12; i++) box(temple, 145 - i * 2.4, PLATFORM.top - i * 0.5, axis, 2.4, 0.5, 112, '#c8bfa6');

  // Huldah gates and the monumental stair, on the southern wall.
  const [fx, fz] = platformToWorld(-67, SOUTH + 34);
  const foot = cityGround(fx, fz);
  const threshold = foot + 12; // the gates open a dozen metres above the street
  for (const [x, w] of [[-67, 13], [38, 15]]) box(royal, x, threshold, SOUTH - 1.75, w, 11, 3, '#413d31');
  for (let i = 0; i < 30; i++) {
    box(royal, -67, foot + (threshold - foot) * i / 30, SOUTH + 34 - i * 1.13, 64, 0.6, 2.2, '#cabf9f');
  }
  box(royal, -67, foot - 1, SOUTH + 36, 64, 1.2, 8, '#c3b898'); // the landing the street runs onto

  // Robinson's Arch: a 15 m span carrying a stair down to the valley street.
  const robinson = site('robinson', mount);
  box(robinson, WEST - 8, 121, 228, 16, 17, 15, darkStone);
  box(robinson, WEST - 8, PLATFORM.top - 2, 228, 17, 2.5, 16, '#cdc4ab');
  for (let i = 0; i < 12; i++) box(robinson, WEST - 14, 121 + i * 1.6, 228 + i * 2.2, 5, 1.6, 2.4, '#cabf9f');
  for (let i = 0; i < 5; i++) box(robinson, WEST - 4 - i * 6, 119, 244, 5, 5.5, 8, '#bdb090'); // the street-front shops

  // ---- Everything else, in world coordinates ------------------------------
  // Wilson's Arch and the bridge west to the Xystus.
  // The bridge runs west from the wall until the Upper City's slope comes up to
  // meet its deck; the Xystus and the council chamber stand on that ground.
  const wilson = site('wilson');
  const deck = PLATFORM.top - 2;
  let abutment = -112;
  while (abutment > -360 && cityGround(abutment, 104 + (-112 - abutment) * 0.14) < deck - 3) abutment -= 8;
  for (let x = -112; x > abutment; x -= 17) {
    const z = 104 + (-112 - x) * 0.14;
    const y = cityGround(x, z);
    box(wilson, x, y, z, 14, deck - y, 16, '#c3b696');
  }
  box(wilson, (abutment - 112) / 2, deck, 104 + (-112 - abutment) * 0.07, -112 - abutment, 2.5, 18, '#cdc4ab');
  const xy = cityGround(abutment - 40, 128);
  box(wilson, abutment - 40, xy, 128, 74, 2, 78, '#c9c0a6'); // the Xystus
  box(wilson, abutment - 46, xy + 2, 96, 34, 9, 26, '#cbc1a4'); // the council chamber

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
    const y = cityGround(x, z);
    for (const dx of [-1, 1]) box(group, x + dx * (w / 2 + 1.6), y - 7, z, 3.2, 10, d + 6.4, '#b6ac90');
    for (const dz of [-1, 1]) box(group, x, y - 7, z + dz * (d / 2 + 1.6), w + 6.4, 10, 3.2, '#b6ac90');
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
  function wallPath(points: Point[], inferred: boolean) {
    for (let i = 1; i < points.length; i++) {
      const [ax, az] = points[i - 1], [bx, bz] = points[i];
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
      box(roads, x, cityGround(x, z) - 0.7, z, 8, 1, length / n + 1.6, j % 2 ? '#d9cca7' : '#d1c39c', rot);
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
