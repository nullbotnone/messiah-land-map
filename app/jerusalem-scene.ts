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
  const PLINTH = -30;
  box(root, 125, -60, 225, 2750, 30, 2550, '#243c37');
  // The relief is a surface, so without a skirt down to the plinth you can see
  // straight in under the land at every edge. Close all four.
  const skirt: number[] = [];
  const nx = 224, nz = 208;
  const edge = (ax: number, az: number, bx: number, bz: number) => {
    const ay = cityGround(ax, az), by = cityGround(bx, bz);
    skirt.push(ax, ay, az, bx, by, bz, bx, PLINTH, bz);
    skirt.push(ax, ay, az, bx, PLINTH, bz, ax, PLINTH, az);
  };
  for (let i = 0; i < nx; i++) {
    const x1 = bounds.west + (bounds.east - bounds.west) * i / nx;
    const x2 = bounds.west + (bounds.east - bounds.west) * (i + 1) / nx;
    edge(x1, bounds.north, x2, bounds.north);
    edge(x1, bounds.south, x2, bounds.south);
  }
  for (let i = 0; i < nz; i++) {
    const z1 = bounds.north + (bounds.south - bounds.north) * i / nz;
    const z2 = bounds.north + (bounds.south - bounds.north) * (i + 1) / nz;
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
  // The Royal Stoa: 280 m of basilica on the southern wall, four rows of columns,
  // a nave half again as high as its aisles, 162 columns in all.
  for (const [z, height] of [[SOUTH - 5, 15], [SOUTH - 14, 30], [SOUTH - 28, 30], [SOUTH - 33, 15]]) {
    colonnade(royal, WEST + 5, z, EAST - 5, z, PLATFORM.top, height, 7, 0.75);
  }
  box(royal, -6, PLATFORM.top + 30, SOUTH - 21, 268, 3, 18, '#cbbb9a');
  for (const z of [SOUTH - 9.5, SOUTH - 30.5]) box(royal, -6, PLATFORM.top + 15, z, 268, 2.5, 13, '#c5b593');

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
  const axis = -3.2;
  const women = { west: court.east, east: court.east + cu(135) };
  // "All the steps in the Temple were half a cubit high with a tread of half a
  // cubit" — twelve of them to the chel, fifteen to the court, twelve to the
  // porch: six, seven and a half and six cubits, nearly ten metres in all.
  const rise = cu(0.5);
  const outerFloor = PLATFORM.top;
  const chelFloor = outerFloor + 12 * rise;
  const courtFloor = chelFloor + 15 * rise;
  const porchFloor = courtFloor + 12 * rise;
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
  for (const z of [chel.north, chel.south]) {
    for (let i = 0; i < 7; i++) box(temple, chel.west + 12 + i * 25, chelFloor, z, 21, cu(2.6), 1.2, '#b6a98a');
  }
  for (const x of [chel.west, chel.east]) {
    for (let i = 0; i < 3; i++) box(temple, x, chelFloor, chel.north + 10 + i * 29, 1.2, cu(2.6), 24, '#b6a98a');
  }

  // The Court of the Women, with four unroofed chambers forty cubits square in
  // its corners — Nazirites, wood, those with skin disease, oil — the balcony
  // added so the women could look on from above, and the thirteen shofar chests.
  box(temple, (women.west + women.east) / 2, chelFloor - 4, axis, women.east - women.west, 4, court.south - court.north, '#c7bea1');
  for (const z of [court.north, court.south]) box(temple, (women.west + women.east) / 2, chelFloor, z, women.east - women.west, cu(20), 3, '#cdc4ab');
  box(temple, women.east, chelFloor, axis, 3, cu(20), court.south - court.north, '#cdc4ab');
  for (const x of [women.west + cu(20) + 1.5, women.east - cu(20) - 1.5]) {
    for (const z of [court.north + cu(20) + 1.5, court.south - cu(20) - 1.5]) {
      for (const [dx, dz, w, d] of [[0, -cu(20), cu(40), 1.2], [0, cu(20), cu(40), 1.2], [-cu(20), 0, 1.2, cu(40)], [cu(20), 0, 1.2, cu(40)]]) {
        box(temple, x + dx, chelFloor, z + dz, w, cu(14), d, '#c9c0a7');
      }
    }
  }
  for (const z of [court.north + 4, court.south - 4]) box(temple, (women.west + women.east) / 2, chelFloor + cu(12), z, women.east - women.west - 8, 1.2, 3.4, '#c1b79b');
  for (let i = 0; i < 13; i++) box(temple, women.west + 8 + i * 4.2, chelFloor, axis + 20, 1.6, 2.2, 1.6, '#b2a385');
  box(temple, women.east, chelFloor, axis, 4, cu(18), cu(20), '#b2914f'); // the eastern gate of the court

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
  for (const z of [court.north, court.south]) box(temple, (court.west + court.east) / 2, courtFloor, z, court.east - court.west, cu(22), 3, '#cdc4ab');
  box(temple, court.west, courtFloor, axis, 3, cu(22), court.south - court.north, '#cdc4ab');
  for (const z of [court.north, court.south]) {
    for (let i = 0; i < 4; i++) box(temple, court.west + 14 + i * 22, courtFloor, z, cu(10), cu(20), 3.6, '#4a4437');
  }
  box(temple, court.east, courtFloor, axis, 3, cu(24), court.south - court.north, '#cdc4ab');
  box(temple, court.east, courtFloor, axis, 4.4, cu(20), cu(20), gold);
  for (const dz of [-cu(12), cu(12)]) box(temple, court.east + 0.4, courtFloor, axis + dz, 5, cu(18), cu(9), '#8a6a2e');

  // Eleven cubits for Israel, then a dais of three half-cubit steps lifting the
  // Court of the Priests two and a half cubits above it.
  for (let i = 0; i < 3; i++) box(temple, court.east - cu(11) - i * cu(1), courtFloor + i * cu(0.5), axis, cu(1), cu(0.5), court.south - court.north - 6, '#c6bda0');
  box(temple, court.east - cu(15), courtFloor + cu(1.5), axis, cu(8), cu(1), court.south - court.north - 6, '#c6bda0');

  // Six chambers open off the court: salt, parvah and the washers' chamber on
  // the north; the wood chamber, the chamber of the exile with its cistern, and
  // the Chamber of Hewn Stone where the Sanhedrin judged the priesthood.
  for (const [z, d] of [[court.north + cu(15), 1], [court.south - cu(15), -1]] as const) {
    for (let i = 0; i < 3; i++) {
      const x = court.west + 20 + i * 26;
      box(temple, x, courtFloor, z, cu(24), cu(18), cu(26), '#c4bb9e');
      box(temple, x, courtFloor + cu(18), z, cu(26), cu(2), cu(28), '#b3a887');
      box(temple, x, courtFloor, z - d * cu(13), cu(5), cu(12), 1.4, '#4a4437');
    }
  }

  // The altar of unhewn stone, thirty-two cubits square, rising by foundation
  // and surround to the horns, with the ramp on its south side, the laver a
  // little south of the line between porch and altar, and north of it the place
  // of slaughtering: twenty-four rings, eight tables, eight dwarf pillars.
  const altar = { x: 32.6, z: axis };
  box(temple, altar.x, courtFloor, altar.z, cu(32), cu(1), cu(32), '#c0b596');
  box(temple, altar.x, courtFloor + cu(1), altar.z, cu(30), cu(5), cu(30), '#bcb191');
  box(temple, altar.x, courtFloor + cu(6), altar.z, cu(28), cu(3), cu(28), '#b8ac8d');
  for (const dx of [-cu(13), cu(13)]) for (const dz of [-cu(13), cu(13)]) {
    box(temple, altar.x + dx, courtFloor + cu(9), altar.z + dz, cu(2), cu(1.5), cu(2), '#c8bda0');
  }
  box(temple, altar.x, courtFloor + cu(9), altar.z, cu(24), cu(0.3), cu(24), '#6b5a46'); // the place of the wood pile
  for (let i = 0; i < 16; i++) box(temple, altar.x, courtFloor + cu(9) - i * cu(0.56), altar.z + cu(16) + i * cu(2), cu(16), cu(0.7), cu(2), '#bdb293');
  box(temple, altar.x - cu(21), courtFloor, altar.z + cu(6), cu(4), cu(4), cu(4), '#9aa79a'); // the laver, a little to the south
  const slaughter = { pillars: court.north + cu(8), tables: court.north + cu(12), rings: court.north + cu(16) };
  for (let row = 0; row < 6; row++) for (let k = 0; k < 4; k++) {
    box(temple, altar.x - cu(9) + k * cu(6), courtFloor, slaughter.rings + row * cu(24 / 5), cu(1.6), 0.2, cu(1.6), '#6f6a55');
  }
  for (let i = 0; i < 8; i++) box(temple, altar.x - cu(13) + i * cu(3.6), courtFloor, slaughter.tables, cu(2.4), cu(1.6), cu(5), '#d2cab4');
  for (let i = 0; i < 8; i++) box(temple, altar.x - cu(13) + i * cu(3.6), courtFloor, slaughter.pillars, cu(1.2), cu(8), cu(1.2), '#b0a68a');
  box(temple, altar.x - cu(0.4), courtFloor + cu(8), slaughter.pillars, cu(27), cu(0.8), cu(1.4), '#7b6a4a');


  // The sanctuary. A hundred cubits each way: the porch a hundred wide and a
  // hundred high, the body behind it seventy wide, thirty-eight cells in three
  // storeys round the north, west and south, and the Hekhal and its upper
  // chamber rising through them to the roof.
  const porch = { east: 13.6, west: 5.6 };
  const body = { east: porch.west, west: -36.4 };
  // Twelve steps from the court up to the porch, in pairs with a landing of
  // three cubits between them and four at the top, as Middot lays them out.
  let stepX = porch.east + cu(1);
  let stepY = porchFloor;
  for (const landing of [3, 3, 4, 3, 3, 4]) {
    for (let i = 0; i < 2; i++) {
      stepY -= rise;
      box(temple, stepX, stepY, axis, cu(1), rise, cu(40), '#c8bfa6');
      stepX += cu(1);
    }
    box(temple, stepX + cu(landing) / 2 - cu(0.5), stepY - rise, axis, cu(landing), rise, cu(40), '#c8bfa6');
    stepX += cu(landing);
  }
  const cells = { x: (body.east + body.west) / 2, w: body.east - body.west };
  box(temple, cells.x, porchFloor - cu(6), axis, cu(100), cu(6), cu(100), '#e4dbc4'); // the six-cubit foundation
  box(temple, (porch.east + porch.west) / 2, porchFloor, axis, porch.east - porch.west, cu(100), cu(100), '#efe7d4');
  box(temple, cells.x, porchFloor, axis, cells.w, cu(40), cu(70), '#eae2ce');
  box(temple, cells.x, porchFloor + cu(40), axis, cells.w + 1, cu(3), cu(70) + 1, '#d8cfb6'); // guttering over the cells
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
  box(temple, porch.east + 0.3, porchFloor, axis, 1.2, cu(40), cu(20), '#584b34');
  box(temple, porch.east + 0.5, porchFloor + cu(40), axis, 1.8, cu(5), cu(26), gold);
  box(temple, porch.west + 0.3, porchFloor, axis, 1.2, cu(20), cu(10), '#4a4029');

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
