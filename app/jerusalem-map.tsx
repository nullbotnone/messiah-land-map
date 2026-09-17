'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildJerusalemScene, disposeJerusalem } from './jerusalem-scene';
import { cityGround, jerusalemSites, landformLabels, PLATFORM, SOURCES, type JerusalemSite } from './jerusalem-data';
import { toTraditional } from './zh-hant';

type Lang = 'hans' | 'hant' | 'en';
type Viewer = { focus: (site?: JerusalemSite) => void; zoom: (factor: number) => void; north: () => void; top: () => void };
type Layers = { housing: boolean; walls: boolean; roads: boolean; labels: boolean };

/** Ground under a site — the esplanade itself for anything standing on it. */
const siteGround = (site: { x: number; z: number; onPlatform?: boolean }) =>
  site.onPlatform ? PLATFORM.top : cityGround(site.x, site.z);

export default function JerusalemMap({ lang, onReturn }: { lang: Lang; onReturn: () => void }) {
  const t = (zh: string, en: string) => lang === 'en' ? en : lang === 'hant' ? toTraditional(zh) : zh;
  const host = useRef<HTMLDivElement>(null);
  const labelRefs = useRef(new Map<string, HTMLElement>());
  const viewer = useRef<Viewer | null>(null);
  const layersRef = useRef<ReturnType<typeof buildJerusalemScene> | null>(null);
  const selectedRef = useRef('temple');
  const [selected, setSelected] = useState('temple');
  const [layers, setLayers] = useState<Layers>({ housing: true, walls: true, roads: true, labels: true });
  const [failed, setFailed] = useState(false);
  const active = jerusalemSites.find((s) => s.id === selected)!;

  useEffect(() => {
    const element = host.current;
    if (!element) return;
    const el = element;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); }
    catch {
      // Renderer availability is determined by this external browser API.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFailed(true);
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor('#081619', 1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog('#081619', 3400, 6800);
    scene.add(new THREE.HemisphereLight('#fff0d4', '#425e53', 2.3));
    const sun = new THREE.DirectionalLight('#ffe1af', 3);
    sun.position.set(-1400, 2200, 800); scene.add(sun);
    const city = buildJerusalemScene();
    layersRef.current = city;
    scene.add(city.root);
    const camera = new THREE.PerspectiveCamera(42, 1, 5, 10000);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.09;
    controls.minDistance = 150;
    controls.maxDistance = 5100;
    controls.maxPolarAngle = Math.PI / 2 - 0.06;
    controls.enablePan = true;
    controls.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN };
    const wide = () => el.clientWidth >= 900;
    const defaultView = () => {
      controls.target.set(-90, 140, 265);
      camera.position.set(-1900 * (wide() ? 1 : 1.35), 1850, 2600 * (wide() ? 1 : 1.35));
      controls.update();
    };
    defaultView();
    const ring = new THREE.Mesh(new THREE.RingGeometry(22, 26, 48), new THREE.MeshBasicMaterial({ color: '#edcb76', side: THREE.DoubleSide, depthTest: false, transparent: true, opacity: 0.9 }));
    ring.rotation.x = -Math.PI / 2; ring.renderOrder = 10; scene.add(ring);
    let animation = 0;
    let awakeUntil = 0;
    const position = new THREE.Vector3();
    const wake = () => {
      awakeUntil = performance.now() + 1200;
      if (!animation) animation = requestAnimationFrame(render);
    };
    function render() {
      animation = 0;
      controls.update();
      const current = jerusalemSites.find((s) => s.id === selectedRef.current)!;
      ring.position.set(current.x, siteGround(current) + (current.id === 'temple' ? 60 : 22), current.z);
      renderer.render(scene, camera);
      const taken: { x: number; y: number; w: number; h: number }[] = [];
      for (const site of [...jerusalemSites, ...landformLabels].sort((a, b) => Number(b.id === current.id) - Number(a.id === current.id))) {
        const button = labelRefs.current.get(site.id);
        if (!button) continue;
        position.set(site.x, siteGround(site) + (site.id === 'temple' ? 74 : 40), site.z).project(camera);
        const x = (position.x + 1) / 2 * el.clientWidth;
        const y = (1 - position.y) / 2 * el.clientHeight;
        const w = button.offsetWidth || 120, h = 30;
        const collision = taken.some((b) => Math.abs(x - b.x) < (w + b.w) / 2 + 6 && Math.abs(y - b.y) < (h + b.h) / 2 + 6);
        const visible = position.z > -1 && position.z < 1 && x > 20 && x < el.clientWidth - 20 && y > 10 && y < el.clientHeight - 10 && !collision;
        button.style.left = `${x}px`; button.style.top = `${y}px`;
        button.style.visibility = visible ? 'visible' : 'hidden';
        if (visible) taken.push({ x, y, w, h });
      }
      const compass = el.parentElement?.querySelector<HTMLElement>('.city-north-arrow');
      if (compass) compass.style.transform = `rotate(${-controls.getAzimuthalAngle()}rad)`;
      if (!animation && performance.now() < awakeUntil) animation = requestAnimationFrame(render);
    }
    viewer.current = {
      focus(site) {
        if (!site) defaultView();
        else {
          const y = siteGround(site);
          controls.target.set(site.x, y, site.z);
          camera.position.set(site.x - 480, y + 550, site.z + 710);
          controls.update();
        }
        wake();
      },
      zoom(factor) {
        const delta = camera.position.clone().sub(controls.target);
        delta.setLength(Math.max(controls.minDistance, Math.min(controls.maxDistance, delta.length() / factor)));
        camera.position.copy(controls.target).add(delta); controls.update(); wake();
      },
      north() {
        const distance = camera.position.distanceTo(controls.target);
        const polar = controls.getPolarAngle();
        camera.position.copy(controls.target).add(new THREE.Vector3(0, Math.cos(polar) * distance, Math.sin(polar) * distance));
        controls.update(); wake();
      },
      top() {
        const distance = camera.position.distanceTo(controls.target);
        camera.position.copy(controls.target).add(new THREE.Vector3(0, distance, 1));
        controls.update(); wake();
      },
    };
    const resize = new ResizeObserver(() => {
      if (!el.clientWidth || !el.clientHeight) return;
      renderer.setSize(el.clientWidth, el.clientHeight);
      camera.aspect = el.clientWidth / el.clientHeight; camera.updateProjectionMatrix(); wake();
    });
    resize.observe(el);
    controls.addEventListener('change', wake);
    const raycaster = new THREE.Raycaster();
    let down = { x: 0, y: 0 };
    const pointerDown = (e: PointerEvent) => { down = { x: e.clientX, y: e.clientY }; wake(); };
    const pointerUp = (e: PointerEvent) => {
      if (e.button !== 0 || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5) return;
      const rect = renderer.domElement.getBoundingClientRect();
      raycaster.setFromCamera(new THREE.Vector2((e.clientX - rect.left) / rect.width * 2 - 1, 1 - (e.clientY - rect.top) / rect.height * 2), camera);
      // Test the complete scene, so terrain and housing can occlude a landmark.
      const hit = raycaster.intersectObjects(city.root.children, true)[0];
      let obj: THREE.Object3D | null = hit?.object ?? null;
      while (obj) {
        if (obj.userData.siteId) { setSelected(obj.userData.siteId); break; }
        obj = obj.parent;
      }
      wake();
    };
    const contextLost = (e: Event) => { e.preventDefault(); setFailed(true); };
    renderer.domElement.addEventListener('pointerdown', pointerDown);
    renderer.domElement.addEventListener('pointerup', pointerUp);
    renderer.domElement.addEventListener('webglcontextlost', contextLost);
    const key = (e: KeyboardEvent) => {
      if (e.target !== el) return;
      const offset = camera.position.clone().sub(controls.target);
      if (e.key === '+' || e.key === '=') viewer.current?.zoom(1.25);
      else if (e.key === '-') viewer.current?.zoom(0.8);
      else if (e.key === '0') viewer.current?.focus();
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), e.key === 'ArrowLeft' ? -0.12 : 0.12);
        camera.position.copy(controls.target).add(offset);
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        const spherical = new THREE.Spherical().setFromVector3(offset);
        spherical.phi = THREE.MathUtils.clamp(spherical.phi + (e.key === 'ArrowUp' ? -0.1 : 0.1), 0.01, controls.maxPolarAngle);
        camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(spherical));
      } else return;
      e.preventDefault(); controls.update(); wake();
    };
    el.addEventListener('keydown', key);
    wake();
    return () => {
      resize.disconnect(); cancelAnimationFrame(animation);
      controls.removeEventListener('change', wake); controls.dispose();
      el.removeEventListener('keydown', key);
      renderer.domElement.removeEventListener('pointerdown', pointerDown);
      renderer.domElement.removeEventListener('pointerup', pointerUp);
      renderer.domElement.removeEventListener('webglcontextlost', contextLost);
      disposeJerusalem(city.root); ring.geometry.dispose(); ring.material.dispose();
      renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove();
      viewer.current = null; layersRef.current = null;
    };
  }, []);

  useEffect(() => {
    selectedRef.current = selected;
    // A small zoom of 1 redraws the highlight and labels without moving the view.
    viewer.current?.zoom(1);
  }, [selected, lang]);
  useEffect(() => {
    const city = layersRef.current;
    if (!city) return;
    city.housing.visible = layers.housing; city.walls.visible = layers.walls; city.roads.visible = layers.roads;
    viewer.current?.zoom(1);
  }, [layers]);

  const choose = (site: JerusalemSite, focus = false) => {
    setSelected(site.id);
    if (focus) viewer.current?.focus(site);
  };
  return (
    <div className="city-map" data-no-convert>
      <div className="city-viewer">
        <div className="city-heading">
          <span>JERUSALEM · c. AD 30</span>
          <h2>{t('耶路撒冷', 'Jerusalem')} <em>3D</em></h2>
          <p>{t('两座山脊之间，一座圣城', 'A sacred city between the ridges')}</p>
        </div>
        <div className="city-canvas-host" ref={host} tabIndex={0} role="region" aria-label={t('耶路撒冷三维地图 · 拖动旋转，右键平移，滚轮缩放，方向键旋转，加减号缩放', 'Jerusalem 3D map · drag to orbit, right-drag to pan, scroll to zoom, arrows to orbit, plus and minus to zoom')}>
          {!failed && <div className="city-labels" hidden={!layers.labels}>
            {jerusalemSites.map((site) => <button key={site.id} ref={(el) => { if (el) labelRefs.current.set(site.id, el); else labelRefs.current.delete(site.id); }} className={`city-label ${selected === site.id ? 'active' : ''}`} onClick={() => choose(site)}>{t(site.name, site.en)}</button>)}
            {landformLabels.map((label) => <span key={label.id} ref={(el) => { if (el) labelRefs.current.set(label.id, el); else labelRefs.current.delete(label.id); }} className="city-label city-landform-label">{t(label.name, label.en)}</span>)}
          </div>}
        </div>
        {failed && <div className="city-fallback" role="status"><p>{t('浏览器暂时无法显示 3D 地图，仍可在右侧浏览地点与重建资料。', '3D rendering is unavailable in this browser. The site guide and reconstruction sources remain accessible.')}</p><button onClick={onReturn}>{t('返回以色列地图', 'Return to Israel map')}</button></div>}
        <div className="city-tools" aria-label={t('城市视图控制', 'City view controls')}>
          <button onClick={() => viewer.current?.north()} aria-label={t('正北朝上', 'Face north')}><span className="city-north-arrow">↑</span> N</button>
          <button onClick={() => viewer.current?.zoom(1.25)} aria-label={t('放大', 'Zoom in')}>＋</button>
          <button onClick={() => viewer.current?.zoom(0.8)} aria-label={t('缩小', 'Zoom out')}>−</button>
          <button onClick={() => viewer.current?.top()}>{t('俯瞰', 'Top')}</button>
          <button onClick={() => viewer.current?.focus()}>{t('全城', 'City')}</button>
        </div>
        <div className="city-terrain-key">
          <b>{t('橄榄山 810 → 汲沦谷 660 → 圣殿山 740 → 中央谷 720 → 上城 775（米）', 'Olives 810 → Kidron 660 → Temple Mount 740 → Central Valley 720 → Upper City 775 (m)')}</b>
          <span>{t('高程为实测海拔 · 平面单位为米 · 高差未额外放大', 'Measured elevations above sea level · metres · no vertical exaggeration')}</span>
        </div>
        <p className="city-gesture">{t('拖动旋转 · 右键拖动平移 · 滚轮缩放 · 双指缩放和平移', 'Drag to orbit · right-drag to pan · scroll to zoom · two fingers to zoom and pan')}</p>
      </div>
      <aside className="city-sidebar" aria-label={t('耶路撒冷地点与资料', 'Jerusalem sites and sources')}>
        <button className="city-return" onClick={onReturn}>← {t('返回以色列地图', 'Return to Israel map')}</button>
        <div className="city-era">{t('公元 30 年左右 · 第二圣殿时期', 'c. AD 30 · Second Temple period')}</div>
        <div className="city-site-list" aria-label={t('城市地点', 'City sites')}>
          {jerusalemSites.map((site, i) => <button key={site.id} className={selected === site.id ? 'active' : ''} aria-pressed={selected === site.id} onClick={() => choose(site, true)}><small>{String(i + 1).padStart(2, '0')}</small>{t(site.name, site.en)}<span>↗</span></button>)}
        </div>
        <article className="city-detail" aria-live="polite">
          <span>{t(active.certainty, active.enCertainty)}</span>
          <h3>{t(active.name, active.en)}</h3>
          <p>{t(active.description, active.enDescription)}</p>
          <small className="city-reference">{active.reference}</small>
          <button className="city-focus" onClick={() => viewer.current?.focus(active)}>{t('近看此处', 'Explore this site')} ↗</button>
          <div className="city-source-links">{active.sources.map((key) => <a key={key} href={SOURCES[key].url} target="_blank" rel="noreferrer">{SOURCES[key].title} ↗</a>)}</div>
        </article>
        <div className="city-layers" aria-label={t('城市图层', 'City layers')}>
          {([['housing', t('住宅', 'Houses')], ['walls', t('城墙', 'Walls')], ['roads', t('阶梯朝圣街道', 'Stepped street')], ['labels', t('标注', 'Labels')]] as const).map(([key, label]) => <button key={key} aria-pressed={layers[key]} className={layers[key] ? 'on' : ''} onClick={() => setLayers((v) => ({ ...v, [key]: !v[key] }))}><i />{label}</button>)}
        </div>
        <details className="city-method">
          <summary>{t('重建依据与不确定性', 'Reconstruction and uncertainty')}</summary>
          <p>{t('参考约瑟夫斯、《米示拿·中门》、历年发掘报告与以色列博物馆模型。博物馆模型表现公元 66 年；本图以约公元 30 年为准，不显示亚基帕一世后来开始修建的第三道城墙。', 'Informed by Josephus, Mishnah Middot, excavation reports and the Israel Museum model. The museum depicts AD 66; this reconstruction targets c. AD 30 and omits the third wall begun later under Agrippa I.')}</p>
          <p>{t('地点按各处今天的实测坐标定位，彼此的距离与方位是真实的。地形取自 SRTM 30 米高程；因两千年堆积把谷地填高了十几米，汲沦谷、中央谷与欣嫩谷按古代谷底重新下切。圣殿山平台依现存挡土墙的实际轮廓（南 280、北 315、西 485、东 470 米）建模，殿宇与庭院按文献尺寸换算（1 肘 = 0.5 米），立面、住宅与园林为示意。', 'Sites are placed from their modern surveyed coordinates, so distances and bearings between them are real. Terrain comes from SRTM 30 m elevations; because two thousand years of debris have raised the valley floors by a dozen metres and more, the Kidron, central and Hinnom valleys are cut back down to their ancient floors. The esplanade follows the surviving retaining walls (280 m south, 315 north, 485 west, 470 east); the sanctuary and courts are converted from the literary dimensions at one cubit = 0.5 m. Facades, houses and gardens are illustrative.')}</p>
          <div className="city-wall-key"><i />{t('第一道城墙 · 近似复原', 'First wall · approximate')}<i className="inferred" />{t('第二道城墙 · 推定走向', 'Second wall · inferred course')}</div>
          {Object.values(SOURCES).map((source) => <a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.title} ↗</a>)}
        </details>
      </aside>
    </div>
  );
}
