/** Local metres: east = +x, south = +z; origin at the traditional sanctuary site.
 * These are educational reconstructions, not a surveyed ancient building plan. */
export const JERUSALEM_ORIGIN = { lat: 31.778, lon: 35.2354 };
export const JERUSALEM_BOUNDS = { west: -1250, east: 1500, north: -1050, south: 1500 };
export const PLATFORM = { west: -145, east: 160, north: -180, south: 310, y: 160 };
export const SOURCES = {
  josephus: { title: 'Josephus · Jewish War V.4–5', url: 'https://avande1.sites.luc.edu/jerusalem/sources/wars5.htm' },
  museum: { title: 'Israel Museum · Second Temple model (AD 66)', url: 'https://www.imj.org.il/en/wings/shrine-book/model-jerusalem-second-temple-period' },
  siloam: { title: 'City of David · Siloam excavations', url: 'https://cityofdavid.org.il/en/siloam-pool-opened-eng/' },
  road: { title: 'City of David · Pool and Herodian street', url: 'https://cityofdavid.org.il/siloan-pool/' },
  temple: { title: 'Ritmeyer · Reconstructing Herod’s Temple Mount (1989)', url: 'https://cojs.org/kathleen-ritmeyer-and-leen-ritmeyer-reconstructing-herods-temple-mount-in-jerusalem-biblical-archaeology-review-15-6-1989/' },
  golgotha: { title: 'Biblical Archaeology Society · Where is Golgotha?', url: 'https://www.biblicalarchaeology.org/daily/biblical-sites-places/jerusalem/where-is-golgotha-where-jesus-was-crucified/' },
  gethsemane: { title: 'Encyclopedia of the Bible · Gethsemane', url: 'https://www.biblegateway.com/resources/encyclopedia-of-the-bible/Gethsemane' },
  bethesda: { title: 'J. Vardaman · The Pool of Bethesda (1963)', url: 'https://translation.bible/wp-content/uploads/2024/06/vardaman-1963-the-pool-of-bethesda.pdf' },
};
export type SourceKey = keyof typeof SOURCES;
export type JerusalemSite = {
  id: string; name: string; en: string; x: number; z: number;
  description: string; enDescription: string; certainty: string; enCertainty: string;
  reference: string; sources: SourceKey[];
};
export const jerusalemSites: JerusalemSite[] = [
  { id: 'temple', name: '希律圣殿', en: 'Herod’s Temple', x: 0, z: 0,
    description: '圣殿朝东，内院与外邦人院由围墙分隔；南端为皇家柱廊。平台轮廓有遗存依据，殿宇高度、立面与庭院细节据文献作示意复原。',
    enDescription: 'The sanctuary faces east, with enclosed inner courts and an outer court. The Royal Stoa stands at the southern end. Surviving retaining walls inform the platform; elevations and architectural details are schematic interpretations of texts.',
    certainty: '遗存与文献 · 建筑示意', enCertainty: 'Remains and texts · schematic architecture', reference: 'Mark 11:15–19 · John 2:13–22', sources: ['josephus', 'temple', 'museum'] },
  { id: 'antonia', name: '安东尼堡', en: 'Antonia Fortress', x: -120, z: -255,
    description: '位于圣殿山西北角，俯瞰圣殿院落。约瑟夫斯描述四角塔楼；堡垒的具体规模及内部布局仍有争议。',
    enDescription: 'At the northwest corner of the Temple Mount, overlooking its courts. Josephus describes four corner towers; the footprint and internal arrangement remain debated.',
    certainty: '文献定位 · 规模推定', enCertainty: 'Textual location · inferred footprint', reference: 'Josephus · Jewish War V.5.8', sources: ['josephus', 'museum'] },
  { id: 'palace', name: '希律王宫', en: 'Herod’s Palace', x: -850, z: 285,
    description: '西部高地上的宫殿，北侧设希匹库、法撒勒与米利暗三塔。宫殿有文献与考古依据，此处的庭院和园林为示意，不能确定彼拉多审判的具体位置。',
    enDescription: 'The western-hill palace, protected on the north by the Hippicus, Phasael and Mariamne towers. Courtyards and gardens are schematic. The precise place of Pilate’s trial cannot be established from this model.',
    certainty: '文献与考古 · 布局推定', enCertainty: 'Texts and archaeology · inferred layout', reference: 'Josephus · Jewish War V.4.3–4', sources: ['josephus', 'museum'] },
  { id: 'bethesda', name: '毕士大池', en: 'Pool of Bethesda', x: 195, z: -395,
    description: '圣殿北侧的双池遗址，通常对应约翰福音的毕士大池。双池与中央分隔结构有考古依据，五道柱廊的外观作示意复原。',
    enDescription: 'The twin-pool site north of the Temple Mount is commonly identified with John’s Bethesda. The pools and dividing structure are archaeological; the appearance of the five porticoes is reconstructed schematically.',
    certainty: '考古遗址 · 柱廊示意', enCertainty: 'Archaeological site · schematic porticoes', reference: 'John 5:1–9', sources: ['bethesda', 'museum'] },
  { id: 'siloam', name: '西罗亚池', en: 'Pool of Siloam', x: -95, z: 970,
    description: '城南的阶梯水池，第二圣殿时期的池岸已被发掘。从池旁向圣殿方向延伸的阶梯街道有遗存；本图显示其主要走向，完整铺设年代与细节仍需谨慎判断。',
    enDescription: 'A stepped pool at the southern end of the city, with excavated Second Temple banks. A surviving stepped street leads toward the Temple. Its broad alignment is shown; the completion date and details require caution.',
    certainty: '考古遗存 · 轮廓近似', enCertainty: 'Excavated remains · approximate outline', reference: 'John 9:1–11', sources: ['siloam', 'road'] },
  { id: 'golgotha', name: '各各他（候选地）', en: 'Golgotha (candidate)', x: -565, z: 20,
    description: '采用今圣墓教堂附近的主流候选地，显示为城墙外的岩石与墓园。准确位置有争议，第二道城墙的走向也影响这一判断；这里不建造后世教堂。',
    enDescription: 'The widely accepted candidate near today’s Holy Sepulchre is represented as rock and burial ground outside the inferred wall. The exact location and the second wall’s course remain debated.',
    certainty: '主流候选地 · 有争议', enCertainty: 'Widely accepted candidate · debated', reference: 'John 19:17–20, 41–42', sources: ['golgotha'] },
  { id: 'gethsemane', name: '客西马尼（传统位置）', en: 'Gethsemane (traditional)', x: 560, z: 80,
    description: '位于汲沦谷以东、橄榄山西麓。以传统位置附近的橄榄园作示意；一世纪园子的边界和耶稣祷告的确切地点无法确认。',
    enDescription: 'An olive grove east of the Kidron, at the western foot of the Mount of Olives. The traditional location is indicated; the first-century garden boundary and exact place of prayer are unknown.',
    certainty: '传统定位 · 范围不明', enCertainty: 'Traditional location · unknown boundary', reference: 'Mark 14:32–42 · John 18:1', sources: ['gethsemane'] },
  { id: 'olives', name: '橄榄山', en: 'Mount of Olives', x: 1130, z: -20,
    description: '城东的山脊，隔汲沦谷与圣殿相望。此处展示山脊与城市的地形关系，不标定某一次教导或升天的准确位置。',
    enDescription: 'The ridge east of Jerusalem looks across the Kidron toward the Temple. The model illustrates this terrain relationship without assigning an exact location to a particular teaching or the Ascension.',
    certainty: '地理位置 · 地形示意', enCertainty: 'Geographic location · schematic terrain', reference: 'Mark 13:3 · Luke 19:37', sources: ['josephus', 'gethsemane'] },
  { id: 'upper', name: '上城', en: 'Upper City', x: -665, z: 540,
    description: '中央谷以西的高地住宅区，与较低的东侧城区隔谷相望。住宅密度、街巷和屋顶为程序生成的时代风格示意，不是逐栋考古复原。',
    enDescription: 'The elevated residential quarter west of the central valley. Density, lanes and rooftops are procedurally generated period-style illustrations, rather than excavated individual buildings.',
    certainty: '文献分区 · 住宅示意', enCertainty: 'Textual district · illustrative housing', reference: 'Josephus · Jewish War V.4.1', sources: ['josephus', 'museum'] },
  { id: 'lower', name: '下城 · 大卫城', en: 'Lower City · City of David', x: 55, z: 675,
    description: '圣殿以南的东南山脊，夹在中央谷与汲沦谷之间，向西罗亚池下降。住宅布局为示意，古代街道的主要走向参考发掘资料。',
    enDescription: 'The southeastern ridge south of the Temple, between the central and Kidron valleys, descends toward Siloam. Houses are illustrative; the principal street alignment follows excavation reports.',
    certainty: '地理与考古 · 住宅示意', enCertainty: 'Geography and archaeology · illustrative housing', reference: 'John 9:7 · Josephus · Jewish War V.4.1', sources: ['road', 'josephus'] },
];

export type Point = readonly [number, number];
export const landformLabels = [
  { id: 'kidron-valley', name: '汲沦谷', en: 'Kidron Valley', x: 400, z: 620 },
  { id: 'central-valley', name: '中央谷', en: 'Central Valley', x: -215, z: 440 },
  { id: 'hinnom-valley', name: '欣嫩谷', en: 'Hinnom Valley', x: -790, z: 1070 },
];
// Deliberately excludes Agrippa I's later third wall (AD 41–44 onward).
export const FIRST_WALL: Point[] = [[-980, 200], [-950, 560], [-650, 890], [-280, 1130], [-100, 1100], [110, 840], [210, 360], [160, -180], [-145, -180], [-285, 95], [-600, 140], [-980, 200]];
export const SECOND_WALL: Point[] = [[-600, 140], [-510, -130], [-485, -350], [-280, -430], [-120, -290]];
export const PILGRIM_ROAD: Point[] = [[-95, 945], [-140, 780], [-175, 600], [-190, 440], [-180, 320]];

/** Analytic relief, approximately 600–840 m ASL, for the historic ridge/valley
 * relationship. NOT a DEM: the regional 550 m grid cannot resolve this city. */
export function cityGround(x: number, z: number): number {
  const bell = (v: number, width: number) => Math.exp(-((v / width) ** 2));
  return 143 - z * 0.025 + 35 * bell(x + 730, 420)
    + 105 * bell(x - 1160, 400)
    - 72 * bell(x - (330 + z * 0.13), 145)
    - 40 * bell(x - (-270 + z * 0.11), 120)
    - 62 * bell(z - (1030 - 0.28 * (x + 500)), 155) * bell(x + 650, 550);
}
export function insidePolygon(x: number, z: number, points: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [ax, az] = points[i], [bx, bz] = points[j];
    if ((az > z) !== (bz > z) && x < (bx - ax) * (z - az) / (bz - az) + ax) inside = !inside;
  }
  return inside;
}
