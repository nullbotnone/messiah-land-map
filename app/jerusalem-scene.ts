import * as THREE from 'three';
import { cityGround, FIRST_WALL, SECOND_WALL, PILGRIM_ROAD, PLATFORM, JERUSALEM_BOUNDS, insidePolygon, type Point } from './jerusalem-data';

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
  function box(parent: THREE.Group, x: number, y: number, z: number, w: number, h: number, d: number, color: THREE.ColorRepresentation = stone) {
    const mesh = new THREE.Mesh(boxGeometry, mat(color));
    mesh.position.set(x, y + h / 2, z);
    mesh.scale.set(w, h, d);
    parent.add(mesh);
    return mesh;
  }
  function instances(parent: THREE.Group, geometry: THREE.BufferGeometry, color: THREE.ColorRepresentation, transforms: number[][]) {
    const mesh = new THREE.InstancedMesh(geometry, mat(color), transforms.length);
    const dummy = new THREE.Object3D();
    transforms.forEach(([x, y, z, w, h, d], i) => {
      dummy.position.set(x, y, z); dummy.scale.set(w, h, d); dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    parent.add(mesh);
    return mesh;
  }
  const bounds = JERUSALEM_BOUNDS;
  const terrain = new THREE.PlaneGeometry(bounds.east - bounds.west, bounds.south - bounds.north, 110, 102);
  terrain.rotateX(-Math.PI / 2);
  const pos = terrain.attributes.position;
  const colors = [];
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) + (bounds.west + bounds.east) / 2;
    const z = pos.getZ(i) + (bounds.north + bounds.south) / 2;
    const y = cityGround(x, z);
    pos.setXYZ(i, x, y, z);
    const c = new THREE.Color('#65705a').lerp(new THREE.Color('#b5a37d'), Math.max(0, Math.min(1, (y - 70) / 170)));
    colors.push(c.r, c.g, c.b);
  }
  terrain.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  terrain.computeVertexNormals();
  const landMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, side: THREE.DoubleSide });
  root.add(new THREE.Mesh(terrain, landMaterial));
  // A thin slab beneath the relief makes the city read as an archaeological model.
  box(root, 125, -25, 225, 2750, 30, 2550, '#243c37');

  const site = (id: string) => {
    const group = new THREE.Group(); group.userData.siteId = id; landmarks.add(group); return group;
  };
  const temple = site('temple');
  // Retaining podium has a simplified rectangular footprint (~305 × 490 m).
  box(temple, 7.5, 65, 65, 305, PLATFORM.y - 65, 490, darkStone);
  box(temple, 7.5, 160, 65, 305, 2, 490, '#dbd1b9');
  // Masonry courses along the visible retaining faces.
  for (let y = 85; y < 160; y += 7) {
    box(temple, 7.5, y, 311, 305, 0.7, 0.5, '#847a64');
    box(temple, -145.5, y, 65, 0.5, 0.7, 490, '#847a64');
    box(temple, 160.5, y, 65, 0.5, 0.7, 490, '#847a64');
  }
  const columns: number[][] = [];
  function colonnade(group: THREE.Group, x: number, z: number, length: number, alongX: boolean, height = 13, y = 162) {
    const n = Math.floor(length / 8);
    for (let i = 0; i <= n; i++) {
      const dx = alongX ? -length / 2 + length * i / n : 0;
      const dz = alongX ? 0 : -length / 2 + length * i / n;
      columns.push([x + dx, y + height / 2, z + dz, 1.2, height, 1.2]);
      box(group, x + dx, y + height - 1, z + dz, 3, 1, 3, '#c1b394');
    }
    box(group, x, y + height, z, alongX ? length + 9 : 17, 3, alongX ? 17 : length + 9, '#c0af8b');
  }
  colonnade(temple, -132, 65, 455, false);
  colonnade(temple, 145, 65, 455, false);
  colonnade(temple, 7, -166, 270, true);
  for (const z of [274, 286, 298]) colonnade(temple, 7, z, 270, true, 19);
  // Inner enclosure; altar and eastern gate establish orientation without modern buildings.
  box(temple, -20, 162, 0, 135, 5, 150, '#c5bda7');
  for (const z of [-75, 75]) box(temple, -20, 167, z, 135, 11, 3);
  box(temple, -87, 167, 0, 3, 11, 150);
  box(temple, 46, 167, -40, 3, 11, 65);
  box(temple, 46, 167, 40, 3, 11, 65);
  box(temple, 46, 181, 0, 9, 5, 16, gold);
  box(temple, -38, 167, 0, 34, 31, 28, '#eee6d3');
  box(temple, -17, 167, 0, 14, 45, 46, '#eee6d3');
  box(temple, -17, 212, 0, 17, 3, 49, gold);
  box(temple, -9.5, 169, 0, 1, 27, 10, '#584b34');
  box(temple, 14, 167, 0, 14, 7, 14, '#b6a588');
  // Southern approach steps and Huldah gate openings.
  for (let i = 0; i < 24; i++) box(temple, -35, 126 + i * 1.4, 382 - i * 2.8, 85, 1.4, 3.3);
  for (const x of [-58, -47, 60, 70, 80]) box(temple, x, 146, 312, 7, 13, 0.8, '#413d31');
  instances(temple, columnGeometry, stone, columns);

  function fort(group: THREE.Group, x: number, z: number, w: number, d: number, towerHeight: number) {
    const y = Math.max(cityGround(x, z), cityGround(x + w / 2, z)) + 1;
    box(group, x, y, z, w, 15, d, darkStone);
    box(group, x, y + 15, z, w - 10, 1, d - 10, '#c7bfa5');
    for (const dx of [-w / 2, w / 2]) for (const dz of [-d / 2, d / 2]) {
      box(group, x + dx, y, z + dz, 16, towerHeight + (dx > 0 && dz > 0 ? 7 : 0), 16);
      for (let i = -1; i <= 1; i++) {
        box(group, x + dx + i * 6, y + towerHeight, z + dz - 6, 3, 3, 3);
        box(group, x + dx + i * 6, y + towerHeight, z + dz + 6, 3, 3, 3);
      }
    }
  }
  fort(site('antonia'), -120, -255, 90, 80, 30);
  const palace = site('palace');
  const py = cityGround(-850, 285);
  box(palace, -850, py - 5, 285, 160, 7, 255, '#a99b7c');
  for (const x of [-915, -785]) box(palace, x, py + 2, 285, 30, 20, 245);
  for (const z of [180, 390]) box(palace, -850, py + 2, z, 130, 17, 30);
  box(palace, -850, py + 2, 285, 30, 1, 95, '#647759');
  box(palace, -850, py + 3, 270, 14, 1, 34, '#527c78');
  for (const [x, h] of [[-930, 36], [-875, 43], [-820, 29]]) {
    box(palace, x, py, 140, 22, h, 22);
    box(palace, x, py + h, 140, 25, 2, 25, gold);
  }
  function pool(group: THREE.Group, x: number, z: number, w: number, d: number) {
    const y = cityGround(x, z) + 1;
    box(group, x, y - 3, z, w + 14, 3, d + 14, '#b2a88d');
    box(group, x, y + 0.4, z, w, 0.7, d, '#477b7a');
    for (let i = 0; i < 4; i++) {
      const out = 2 + i * 2;
      for (const dx of [-1, 1]) box(group, x + dx * (w / 2 + out), y + i * 0.7, z, 2, 0.7, d + out * 2);
      for (const dz of [-1, 1]) box(group, x, y + i * 0.7, z + dz * (d / 2 + out), w + out * 2, 0.7, 2);
    }
  }
  pool(site('siloam'), -95, 970, 48, 45);
  const bethesda = site('bethesda');
  pool(bethesda, 195, -425, 48, 44); pool(bethesda, 195, -365, 48, 44);
  const by = cityGround(195, -395) + 5;
  const poolColumns: number[][] = [];
  for (const z of [-455, -395, -335]) {
    box(bethesda, 195, by + 6, z, 68, 2, 8);
    for (let x = 166; x <= 224; x += 9) poolColumns.push([x, by + 3, z, 0.8, 6, 0.8]);
  }
  for (const x of [162, 228]) {
    box(bethesda, x, by + 6, -395, 8, 2, 120);
    for (let z = -449; z <= -341; z += 9) poolColumns.push([x, by + 3, z, 0.8, 6, 0.8]);
  }
  instances(bethesda, columnGeometry, stone, poolColumns);

  const rock = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 0), mat('#a29a83'));
  rock.position.set(-565, cityGround(-565, 20) + 5, 20); rock.scale.set(23, 10, 19); site('golgotha').add(rock);

  function wallPath(points: Point[], inferred: boolean) {
    for (let i = 1; i < points.length; i++) {
      const [ax, az] = points[i - 1], [bx, bz] = points[i];
      const length = Math.hypot(bx - ax, bz - az);
      const n = Math.ceil(length / 22);
      for (let j = 0; j < n; j++) {
        if (inferred && j % 3 === 2) continue; // Gaps communicate an uncertain course.
        const x = ax + (bx - ax) * (j + 0.5) / n, z = az + (bz - az) * (j + 0.5) / n;
        const y = cityGround(x, z) - 4;
        const mesh = box(walls, x, y, z, 6, 18, length / n + 1, inferred ? '#ad956c' : '#b9ad91');
        mesh.rotation.y = Math.atan2(bx - ax, bz - az);
        if (j % 2 === 0) {
          const crenel = box(walls, x, y + 18, z, 6.4, 2, 4);
          crenel.rotation.y = mesh.rotation.y;
        }
      }
      if (!inferred) box(walls, ax, cityGround(ax, az) - 4, az, 13, 26, 13);
    }
  }
  wallPath(FIRST_WALL, false); wallPath(SECOND_WALL, true);
  const roadPoints = PILGRIM_ROAD.map(([x, z]) => new THREE.Vector3(x, cityGround(x, z) + 3, z));
  const road = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(roadPoints), 64, 4.2, 4, false), mat('#d5b568'));
  roads.add(road);

  // Deterministic, illustrative flat-roof houses. Exclude monuments and the street.
  let seed = 30;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const bodies: number[][] = [], roofs: number[][] = [];
  const northQuarter: Point[] = [[-600, 140], ...SECOND_WALL.slice(1), [-145, -180], [-285, 95]];
  for (let x = -950; x < 190; x += 30) for (let z = -410; z < 1110; z += 29) {
    const hx = x + (random() - 0.5) * 13, hz = z + (random() - 0.5) * 13;
    if (!insidePolygon(hx, hz, FIRST_WALL) && !insidePolygon(hx, hz, northQuarter)) continue;
    if (hx > -180 && hx < 195 && hz < 410) continue;
    if (hx < -750 && hz > 95 && hz < 440) continue;
    if (Math.abs(hx - (-270 + hz * 0.11)) < 28 || Math.hypot(hx + 95, hz - 970) < 66) continue;
    if (hz > 430 && hz < 950 && Math.abs(hx - (-210 + (hz - 400) * 0.19)) < 18) continue;
    if (random() > 0.86) continue;
    const w = 11 + random() * 12, d = 11 + random() * 12, h = 5 + random() * 9;
    const y = cityGround(hx, hz) - 1;
    bodies.push([hx, y + h / 2, hz, w, h, d]);
    roofs.push([hx, y + h + 0.7, hz, w + 1.8, 1.4, d + 1.8]);
  }
  instances(housing, boxGeometry, '#c6b999', bodies);
  instances(housing, boxGeometry, '#a79672', roofs);
  const trunks: number[][] = [], leaves: number[][] = [];
  const groveTrunks: number[][] = [], groveLeaves: number[][] = [];
  const grove = site('gethsemane');
  const vegetation = new THREE.Group(); root.add(vegetation);
  for (let i = 0; i < 180; i++) {
    const x = 510 + random() * 850, z = -500 + random() * 1370;
    if (random() > 0.8) continue;
    const y = cityGround(x, z);
    const isGrove = Math.hypot(x - 560, z - 80) < 100;
    (isGrove ? groveTrunks : trunks).push([x, y + 3, z, 1.1, 6, 1.1]);
    (isGrove ? groveLeaves : leaves).push([x, y + 8, z, 7 + random() * 3, 5, 7]);
  }
  for (let i = 0; i < 15; i++) {
    const x = 560 + (random() - 0.5) * 105, z = 80 + (random() - 0.5) * 115;
    const y = cityGround(x, z);
    groveTrunks.push([x, y + 3, z, 1.1, 6, 1.1]);
    groveLeaves.push([x, y + 8, z, 8, 5, 7]);
  }
  instances(vegetation, columnGeometry, '#665d43', trunks);
  instances(vegetation, treeGeometry, '#506a48', leaves);
  instances(grove, columnGeometry, '#665d43', groveTrunks);
  instances(grove, treeGeometry, '#506a48', groveLeaves);

  return { root, housing, walls, roads, landmarks, houseCount: bodies.length };
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
