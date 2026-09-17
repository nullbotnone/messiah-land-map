/** Local metres around the traditional sanctuary site: east = +x, south = +z,
 * and y is metres above sea level minus 600 — so the Temple Mount esplanade at
 * 740 m ASL is y = 140 here, and every height in this model can be checked
 * against a published elevation.
 *
 * Positions come from the modern coordinates of the places themselves, so the
 * distances and bearings between sites are real. The buildings on top of them
 * are educational reconstructions, not a surveyed ancient plan.
 *
 * A Herodian royal cubit is taken as 0.50 m throughout; the literary
 * dimensions (Josephus, Mishnah Middot) are converted at that rate. */
export const JERUSALEM_ORIGIN = { lat: 31.778, lon: 35.2354 };
export const JERUSALEM_BOUNDS = { west: -1250, east: 1500, north: -1050, south: 1500 };

/** The Herodian retaining walls, traced from the outline of the Haram
 * esplanade, whose corners still stand: 280 m south, 315 m north, 485 m west,
 * 470 m east — a trapezoid turned about 9° from grid north. Everything inside
 * is laid out in that turned frame. */
export const PLATFORM = {
  corners: [[-161, -225], [157, -255], [204, 213], [-74, 259]] as Point[],
  centre: [31.5, -2] as Point,
  angle: 0.164,
  top: 140,
};

export const SOURCES = {
  josephus: { title: 'Josephus · Jewish War V.4–5', url: 'https://avande1.sites.luc.edu/jerusalem/sources/wars5.htm' },
  josephusAntiquities: { title: 'Josephus · Antiquities XV.11.5', url: 'https://biblical.ie/page.php?fl=josephus%2FAntiquities%2FAJGk15' },
  museum: { title: 'Israel Museum · Second Temple model (AD 66)', url: 'https://www.imj.org.il/en/wings/shrine-book/model-jerusalem-second-temple-period' },
  temple: { title: 'Ritmeyer · Reconstructing Herod’s Temple Mount (1989)', url: 'https://cojs.org/kathleen-ritmeyer-and-leen-ritmeyer-reconstructing-herods-temple-mount-in-jerusalem-biblical-archaeology-review-15-6-1989/' },
  herodian: { title: 'Biblical Archaeology Society · The Temple Mount in the Herodian period', url: 'https://www.biblicalarchaeology.org/daily/biblical-sites-places/temple-at-jerusalem/the-temple-mount-in-the-herodian-period/' },
  southernGates: { title: 'IAA · Excavations near the Triple Gate', url: 'https://publications.iaa.org.il/atiqot/vol85/iss1/9/' },
  iaaRobinson: { title: 'IAA · Robinson’s Arch excavation report', url: 'https://hadashot.iaa.org.il/Report_Detail_Eng.aspx?id=1884' },
  iaaWilson: { title: 'IAA · Wilson’s Arch and the Great Causeway', url: 'https://hadashot.iaa.org.il/report_detail_eng.aspx?id=1738' },
  kotelRobinson: { title: 'Western Wall Heritage Foundation · Robinson’s Arch', url: 'https://thekotel.org/en/wailing-wall-western-wall/' },
  middot: { title: 'Mishnah Middot 2–5 (Sefaria)', url: 'https://www.sefaria.org/Mishnah_Middot.2.1' },
  antonia: { title: 'Antonia Fortress · Wikipedia', url: 'https://en.wikipedia.org/wiki/Antonia_Fortress' },
  siloam: { title: 'City of David · Siloam excavations', url: 'https://cityofdavid.org.il/en/siloam-pool-opened-eng/' },
  road: { title: 'City of David · The Pilgrimage Road and stepped street', url: 'https://cityofdavid.org.il/en/the-pilgrims-road-to-the-temple-mount-and-the-stepped-street-eng/' },
  golgotha: { title: 'Biblical Archaeology Society · Where is Golgotha?', url: 'https://www.biblicalarchaeology.org/daily/biblical-sites-places/jerusalem/where-is-golgotha-where-jesus-was-crucified/' },
  gethsemane: { title: 'Encyclopedia of the Bible · Gethsemane', url: 'https://www.biblegateway.com/resources/encyclopedia-of-the-bible/Gethsemane' },
  bethesda: { title: 'J. Vardaman · The Pool of Bethesda (1963)', url: 'https://translation.bible/wp-content/uploads/2024/06/vardaman-1963-the-pool-of-bethesda.pdf' },
  palace: { title: 'Herod’s Palace, Jerusalem · Wikipedia', url: 'https://en.wikipedia.org/wiki/Herod%27s_Palace_(Jerusalem)' },
  tombs: { title: 'Tomb of Absalom · Wikipedia', url: 'https://en.wikipedia.org/wiki/Tomb_of_Absalom' },
};
export type SourceKey = keyof typeof SOURCES;
export type Point = readonly [number, number] | number[];
export type JerusalemSite = {
  id: string; name: string; en: string; x: number; z: number; onPlatform?: boolean;
  description: string; enDescription: string; certainty: string; enCertainty: string;
  reference: string; sources: SourceKey[];
};

export const jerusalemSites: JerusalemSite[] = [
  { id: 'temple', name: '圣殿与内院', en: 'Sanctuary and inner courts', x: 0, z: 0, onPlatform: true,
    description: '殿宇朝东，门廊宽 100 肘、高 100 肘（约 50 米），殿身退到 70 肘——《中门》说它「后窄前宽，形如狮子」；北、西、南三面环绕三层共 38 间贮藏室，圣所与至圣所从中拔起。庭院按半肘一级层层上升：外院上「赫勒」十二级，妇女院上内院十五级（半圆形，利未人在上面唱上行之诗），内院上门廊再十二级，合共约十米。祭坛 32 肘见方，南接 32 × 16 肘的坡道，北面是宰杀之处——二十四个环、八张大理石桌、八根矮柱。院墙内有六间厢房，南侧的「石室」是公会审议祭司资格之处；妇女院四角各有 40 肘见方的无顶院落。外邦人院与内院之间是 3 肘高的「梭雷格」石栏，栏上的希腊文警告碑已出土两块。尺寸依《米示拿·中门》与约瑟夫斯，立面细节为示意。',
    enDescription: 'The sanctuary faces east behind a porch 100 cubits wide and 100 high (about 50 m); the body behind it draws in to 70, which Middot calls narrow behind and broad in front, resembling a lion. Thirty-eight cells in three storeys wrap its north, west and south sides, and the Hekhal rises through them. The precinct climbs half a cubit at a time: twelve steps to the chel, fifteen semicircular steps from the Court of the Women — the Levites sang the Songs of Ascents on them — and twelve more up to the porch, some ten metres in all. The altar is 32 cubits square with a 32 × 16 ramp on the south and the place of slaughtering north of it: twenty-four rings, eight marble tables, eight dwarf pillars. Six chambers open off the court, among them the Chamber of Hewn Stone where the Sanhedrin judged the priesthood, and the Court of the Women carries an unroofed 40-cubit chamber in each corner. The 3-cubit soreg divided the outer court from the inner precinct; two of its Greek warning inscriptions survive. Dimensions follow Mishnah Middot and Josephus; facades are schematic.',
    certainty: '文献尺寸 · 立面示意', enCertainty: 'Literary dimensions · schematic elevations', reference: 'Mark 11:15–19 · John 2:13–22 · Luke 1:9 · Acts 21:28', sources: ['middot', 'josephus', 'temple'] },
  { id: 'royal-stoa', name: '皇家柱廊与南门阶', en: 'Royal Stoa and southern steps', x: 60, z: 236, onPlatform: true,
    description: '南墙上的巴西利卡式长廊，长约 280 米、宽约 33 米，四排共 162 根石柱，中殿高约 33 米。廊下的户勒大双门与三门通往圣殿平台；门前的阶梯宽逾 60 米、共 30 级，宽窄相间。阶前发掘出数十座洁净池，是朝圣者上殿前沐浴之处。',
    enDescription: 'A basilica along the southern wall, about 280 m long and 33 m wide, with 162 columns in four rows and a nave some 33 m high. Beneath it the Double and Triple (Huldah) Gates led up onto the esplanade. The staircase before them is over 60 m wide with 30 alternating shallow and deep steps, and dozens of ritual baths have been excavated at its foot.',
    certainty: '考古遗存与文献 · 上层复原', enCertainty: 'Excavated below, reconstructed above', reference: 'Luke 2:46 · Acts 2:41 · Mark 13:1', sources: ['herodian', 'josephusAntiquities', 'southernGates', 'museum'] },
  { id: 'robinson', name: '罗宾逊拱门与提罗泊谷大街', en: 'Robinson’s Arch and the Tyropoeon street', x: -84, z: 248,
    description: '西南角的巨拱长约 15.2 米、宽约 12.9 米，托着通往皇家柱廊的纪念性阶梯；拱下是约 8 米宽的提罗泊谷铺石街，街边有店铺与排水道。拱的西侧台基和一列较小拱共同构成阶梯系统；复原的转折方向仍有争议。',
    enDescription: 'At the south-west corner, a monumental arch about 15.2 m long and 12.9 m wide carried the stair up to the Royal Stoa. Beneath it ran an approximately 8 m-wide paved Tyropoeon street with shops and drainage. Its western pier and a row of smaller vaults formed a larger stair system; the exact turns of that stair remain debated.',
    certainty: '考古遗存 · 阶梯复原', enCertainty: 'Excavated remains · reconstructed stair', reference: 'Josephus · Antiquities XV.11.5', sources: ['iaaRobinson', 'kotelRobinson', 'road', 'josephusAntiquities'] },
  { id: 'wilson', name: '威尔逊拱门与西斯图斯', en: 'Wilson’s Arch and the Xystus', x: -112, z: 104,
    description: '西墙中段的威尔逊拱门长约 14.8 米、拱径约 12.8 米，是连向上城的大桥最东端；西侧接着约 11 米宽的两列拱券。约瑟夫斯所说的西斯图斯与议事建筑位于上城一带，具体边界未能确定，本图只作低矮广场示意。',
    enDescription: 'Wilson’s Arch, about 14.8 m long with a 12.8 m arch diameter, is the eastern end of the bridge toward the Upper City; westward it joins two rows of narrower vaults about 11 m overall wide. Josephus places the Xystus and civic buildings in the Upper City, but their exact footprint is uncertain, so the low plaza here is schematic.',
    certainty: '遗存定位 · 西斯图斯示意', enCertainty: 'Located by remains · schematic Xystus', reference: 'Josephus · Jewish War V.4.2', sources: ['iaaWilson', 'josephus', 'josephusAntiquities'] },
  { id: 'antonia', name: '安东尼堡', en: 'Antonia Fortress', x: -60, z: -262,
    description: '建在圣殿山西北角外的岩台上，岩台约 120 × 45 米，南面是削出的峭壁。约瑟夫斯记四角有塔，三座 50 肘，东南角一座 70 肘，可俯瞰整个圣殿院落。罗马驻军由此看守节期的人群；堡内布局无考古依据。',
    enDescription: 'Built on a rock platform about 120 × 45 m outside the north-west corner of the Temple Mount, with a cut scarp on its southern side. Josephus gives it four corner towers, three of 50 cubits and the south-eastern one of 70, from which the whole temple court could be watched. The Roman garrison policed the festival crowds from here; the internal plan is unknown.',
    certainty: '岩台实测 · 建筑推定', enCertainty: 'Measured rock platform · inferred building', reference: 'Acts 21:31–40 · Josephus · Jewish War V.5.8', sources: ['antonia', 'josephus'] },
  { id: 'palace', name: '希律王宫与三塔', en: 'Herod’s Palace and the three towers', x: -715, z: 330,
    description: '上城西缘的宫殿，台基南北约 300 米。北侧三座塔守着城墙转角：希匹库约 40 米、法撒勒约 45 米、米利暗约 22 米；今大卫塔的巨石基座即其中之一。犹太行省的巡抚驻耶路撒冷时多半住在这里，但福音书未指明彼拉多审判的地点。',
    enDescription: 'The palace on the western brow of the Upper City, its podium about 300 m north to south. Three towers guarded the wall angle to the north — Hippicus about 40 m, Phasael about 45 m and Mariamne about 22 m; the massive base of one survives inside today’s Citadel. The Roman prefect most likely lodged here when in Jerusalem, though the Gospels do not name the place of Pilate’s hearing.',
    certainty: '台基考古 · 宫殿复原', enCertainty: 'Excavated podium · reconstructed palace', reference: 'Mark 15:1–20 · Josephus · Jewish War V.4.3–4', sources: ['palace', 'josephus', 'museum'] },
  { id: 'bethesda', name: '毕士大池', en: 'Pool of Bethesda', x: 73, z: -383,
    description: '圣殿北面的一对大池：北池约 53 × 40 米作蓄水，南池约 47 × 52 米可下水，中间隔着一道厚坝。约翰说这里有五个廊子——四面各一，坝上再一道，正合出土的格局。池深处达十余米。',
    enDescription: 'A pair of large pools north of the Temple Mount: a northern reservoir about 53 × 40 m and a southern bathing pool about 47 × 52 m, divided by a thick dam. John’s five porticoes fit the excavated plan exactly — one on each side and a fifth across the dam. The pools are over ten metres deep in places.',
    certainty: '考古遗址 · 柱廊复原', enCertainty: 'Excavated site · reconstructed porticoes', reference: 'John 5:1–9', sources: ['bethesda', 'museum'] },
  { id: 'siloam', name: '西罗亚池与朝圣阶道', en: 'Pool of Siloam and the Pilgrimage Road', x: -26, z: 843,
    description: '城南梯级水池，第二圣殿时期的池岸呈梯形，约 60 × 50 米，三面有阶。由此向北有一条约 600 米的铺石阶道直上圣殿南墙，街下埋着排水道；街面钱币显示它约在彼拉多任内（公元 26–36 年）完工。',
    enDescription: 'The stepped pool at the southern end of the city, trapezoidal in the Second Temple period at roughly 60 × 50 m with steps on three sides. From it a paved stepped street climbed about 600 m to the southern wall of the Temple Mount, with a drainage channel beneath. Coins in its make-up date the completion to the governorship of Pilate, AD 26–36.',
    certainty: '考古遗存 · 轮廓近似', enCertainty: 'Excavated remains · approximate outline', reference: 'John 9:1–11 · Luke 13:4', sources: ['siloam', 'road'] },
  { id: 'gihon', name: '基训泉与希西家水道', en: 'Gihon Spring and Hezekiah’s tunnel', x: 135, z: 528,
    description: '大卫城东坡下的间歇泉，是老城唯一的活水。公元前八世纪凿的水道长约 533 米，把泉水引到西罗亚池；住棚节从西罗亚取水上殿的仪式，正是约翰福音七章的背景。',
    enDescription: 'The intermittent spring below the eastern slope of the City of David, the old city’s only living water. A tunnel of about 533 m, cut in the eighth century BC, carries it to the Pool of Siloam. The water drawn from Siloam at the Feast of Tabernacles is the setting of John 7.',
    certainty: '考古遗址 · 位置确定', enCertainty: 'Excavated site · location certain', reference: '2 Kings 20:20 · John 7:37–38', sources: ['siloam', 'road'] },
  { id: 'golgotha', name: '各各他与园中的新墓', en: 'Golgotha and the garden tomb', x: -528, z: -30,
    description: '主流候选地在今圣墓教堂下：那里原是一座废弃的采石场，一块石质太差而未被采走的岩坡突出于场中，四周填土成园，崖壁上凿有一世纪的坑墓。位置在推定的第二道城墙之外，符合「城门外」的记载；确切地点仍有争议。',
    enDescription: 'The widely held candidate lies under today’s Holy Sepulchre: an abandoned quarry where a spur of poor limestone was left standing, the floor filled with soil for a garden, and first-century shaft tombs cut into the surrounding rock face. It falls outside the inferred second wall, matching the note that Jesus suffered outside the gate; the exact spot remains debated.',
    certainty: '主流候选地 · 有争议', enCertainty: 'Widely accepted candidate · debated', reference: 'John 19:17–20, 41–42 · Hebrews 13:12', sources: ['golgotha'] },
  { id: 'gethsemane', name: '客西马尼', en: 'Gethsemane', x: 413, z: -145,
    description: '汲沦谷以东、橄榄山西麓的橄榄园。名字出于亚兰文「榨油处」。传统位置在今万国教堂一带，但一世纪园子的边界与祷告的确切地点都无法确认。',
    enDescription: 'An olive grove east of the Kidron at the western foot of the Mount of Olives; the name is Aramaic for an oil press. The traditional site lies around today’s Church of All Nations, but the first-century boundary of the garden and the exact place of prayer are unknown.',
    certainty: '传统定位 · 范围不明', enCertainty: 'Traditional location · unknown boundary', reference: 'Mark 14:32–42 · John 18:1', sources: ['gethsemane'] },
  { id: 'kidron-tombs', name: '汲沦谷石墓', en: 'Kidron valley tombs', x: 337, z: 118,
    description: '谷东崖上一组凿岩墓：押沙龙柱、希悉子孙墓与撒迦利亚墓，年代在公元前二世纪至一世纪，是耶稣时代已经矗立的建筑。它们正对圣殿，从殿前望去一览无余——「粉饰的坟墓」的比喻就在这样的景观里说出。',
    enDescription: 'A group of rock-cut monuments on the eastern scarp — the pillar of Absalom, the tomb of the Bnei Hezir and the tomb of Zechariah — carved between the second and first centuries BC, and so already standing in Jesus’ day. They face the Temple Mount and are fully in view from its courts, the landscape behind the saying about whitewashed tombs.',
    certainty: '原物尚存 · 位置确定', enCertainty: 'Monuments survive · locations certain', reference: 'Matthew 23:27 · Luke 21:37', sources: ['tombs', 'josephus'] },
  { id: 'olives', name: '橄榄山', en: 'Mount of Olives', x: 956, z: -67,
    description: '城东的石灰岩山脊，主峰约 810 米，比圣殿平台高出约 70 米，隔汲沦谷与圣殿相望。往耶利哥与伯大尼的路翻过山脊；本图只表现地形关系，不标定某次教导或升天的位置。',
    enDescription: 'The limestone ridge east of the city, its summit about 810 m — some 70 m above the esplanade — looking across the Kidron at the Temple. The roads to Bethany and Jericho cross it. The model shows the terrain relationship only, without fixing the site of a particular teaching or of the Ascension.',
    certainty: '地理位置 · 高程实测', enCertainty: 'Geographic location · measured elevations', reference: 'Mark 13:3 · Luke 19:37 · Acts 1:12', sources: ['josephus', 'gethsemane'] },
  { id: 'upper', name: '上城 · 祭司住宅区', en: 'Upper City · priestly quarter', x: -430, z: 330,
    description: '中央谷以西的高地，比圣殿平台还高约 30 米。犹太区发掘出多座带马赛克、壁画与洁净池的大宅，其中一座「宫殿式住宅」面积逾 600 平方米——大祭司家族住在这一带，但没有一座宅子能确指为该亚法的家。',
    enDescription: 'The high ground west of the central valley, standing some 30 m above the esplanade. Excavations in the Jewish Quarter uncovered mansions with mosaics, frescoes and ritual baths, one of them over 600 m². The high-priestly families lived in this quarter, though no single house can be identified as Caiaphas’.',
    certainty: '考古发掘 · 住宅示意', enCertainty: 'Excavated quarter · illustrative housing', reference: 'Mark 14:53–54 · Josephus · Jewish War V.4.1', sources: ['josephus', 'museum'] },
  { id: 'zion', name: '马可楼与该亚法宅第（传统）', en: 'Upper Room and Caiaphas’ house (traditional)', x: -585, z: 700,
    description: '上城南端，传统把最后晚餐的楼房与大祭司的宅第都放在这一带。两处都是拜占庭以后形成的记忆，没有一世纪的直接证据；此处只标出传统位置的大致范围。',
    enDescription: 'At the southern end of the Upper City, tradition places both the room of the Last Supper and the high priest’s house. Both memories took shape in the Byzantine period and neither has first-century evidence; only the approximate traditional area is marked.',
    certainty: '传统记忆 · 无一世纪实证', enCertainty: 'Later tradition · no first-century evidence', reference: 'Mark 14:15 · Mark 14:66–72 · Acts 1:13', sources: ['museum', 'josephus'] },
  { id: 'lower', name: '下城 · 大卫城', en: 'Lower City · City of David', x: 30, z: 600,
    description: '圣殿以南的东南山脊，夹在中央谷与汲沦谷之间，从平台高度一路降到西罗亚池边，落差近百米。这是最古老的居住区，街道走向依发掘资料，住宅为示意。',
    enDescription: 'The south-eastern ridge below the Temple, between the central and Kidron valleys, falling almost a hundred metres from the esplanade to the Pool of Siloam. This is the oldest inhabited quarter; the street alignment follows excavation reports and the houses are illustrative.',
    certainty: '地理与考古 · 住宅示意', enCertainty: 'Geography and archaeology · illustrative housing', reference: 'John 9:7 · Josephus · Jewish War V.4.1', sources: ['road', 'josephus'] },
  { id: 'bezetha', name: '比西大新区', en: 'Bezetha · the New City', x: -250, z: -470,
    description: '第二道城墙以北的新城区，约瑟夫斯称之为「比西大」，即新城。公元 30 年时这里只有零散房舍、作坊、采石场与墓地；亚基帕一世的第三道城墙要到公元 41 年以后才开始把它圈进城内，本图不画那道墙。',
    enDescription: 'The quarter north of the second wall, which Josephus calls Bezetha, the New City. In AD 30 it held only scattered houses, workshops, quarries and tombs; the third wall that would enclose it was begun by Agrippa I after AD 41 and is deliberately left out of this model.',
    certainty: '文献分区 · 建筑稀疏示意', enCertainty: 'Textual quarter · sparse illustrative building', reference: 'Josephus · Jewish War V.4.2', sources: ['josephus', 'museum'] },
  { id: 'hinnom', name: '欣嫩谷与亚革大马', en: 'Hinnom Valley and Akeldama', x: -330, z: 1120,
    description: '绕城西、南两面的深谷，希伯来文 Ge-Hinnom 经希腊文成为「地狱」一词的来源。谷南坡的岩崖上密布一世纪墓室；使徒行传把「血田」放在这一带，传统称亚革大马。',
    enDescription: 'The deep valley wrapping the city on the west and south. Its Hebrew name, Ge-Hinnom, passed through Greek into the word Gehenna. The rock face on its southern slope is riddled with first-century burial chambers; Acts places the Field of Blood here, known by tradition as Akeldama.',
    certainty: '地形确定 · 地点为传统', enCertainty: 'Terrain certain · site traditional', reference: 'Matthew 27:3–10 · Acts 1:18–19 · Mark 9:43', sources: ['josephus', 'golgotha'] },
];

export const landformLabels = [
  { id: 'kidron-valley', name: '汲沦谷', en: 'Kidron Valley', x: 255, z: 330 },
  { id: 'central-valley', name: '中央谷（提罗泊谷）', en: 'Central (Tyropoeon) Valley', x: -120, z: 470 },
  { id: 'hinnom-valley', name: '欣嫩谷', en: 'Hinnom Valley', x: -870, z: 760 },
];

/** The first wall, from the Citadel round Mount Zion to the Temple Mount's own
 * retaining walls, which served as the city wall on the east. Josephus traces
 * the northern arm from the Hippicus tower past the Xystus to the temple.
 * Deliberately excludes Agrippa I's third wall (AD 41–44 onward). */
export const FIRST_WALL: Point[] = [[-700, 175], [-430, 150], [-250, 130], [-102, 104],
  [-74, 259], [204, 213], [190, 330], [178, 470], [163, 600], [128, 720], [72, 830], [10, 880],
  [-150, 905], [-330, 930], [-500, 930], [-620, 905], [-745, 835], [-790, 700],
  [-800, 500], [-790, 330], [-700, 175]];
/** The second wall ran from the Gennath Gate — found in the Jewish Quarter, some
 * 400 m east of today's Jaffa Gate — round the northern quarter to the Antonia.
 * Its course is inferred, and it is what puts Golgotha outside the city. */
export const SECOND_WALL: Point[] = [[-369, 142], [-400, -60], [-420, -230], [-390, -390],
  [-300, -440], [-170, -400], [-90, -320], [-60, -280]];
/** Gates, by the wall they open through. Widths are nominal. */
export const GATES = [
  { id: 'gennath', x: -369, z: 142, w: 12 },
  { id: 'essene', x: -745, z: 835, w: 10 },
  { id: 'water', x: 10, z: 880, w: 10 },
  { id: 'kidron', x: 178, z: 470, w: 8 },
];
/** The stepped street from the Pool of Siloam up the Tyropoeon to the temple —
 * about 600 m of paving over a drainage channel, finished under Pilate — and on
 * north along the western wall past Robinson's Arch. */
export const PILGRIM_ROAD: Point[] = [[-40, 820], [-62, 700], [-80, 560], [-92, 420],
  [-98, 300], [-88, 250], [-100, 160], [-112, 60], [-120, -30]];

/** Modern surface, SRTM 30 m on a 50 m grid; see scripts/build-city-dem.mjs. */
export const CITY_DEM_NX = 56;
export const CITY_DEM_NY = 52;
const CITY_DEM_STEP = 50;
const CITY_DEM_B64 = 'EQMRAxEDDgMNAwYDBwMFAwEDBwMKAwYDBQMGAwMDAwMCAwAD/QL8Av8C/gL9AvwC9gL0Au8C7gLpAuAC2wLVAtECzwLQAtEC0wLXAt0C6ALyAv0CEQMaAx0DJwMoAysDNAMzAzIDMgMvAysDKwMnAxUDFQMUAxIDEQMPAw4DDAMJAwkDCwMIAwUDBgMEAwIDAQMCAwMDAQMBAwED/gIBAwEDAAP5AvUC7gLnAtwC1ALPAs4CzwLQAtIC1ALbAucC8AIBAw8DFQMYAx4DIwMpAywDKwMuAzEDMQMuAysDIQMYAxcDFQMUAxMDEgMQAw0DDQMMAwwDCgMGAwUDBAMBAwIDAwMDAwEDAQMDAwMDBAMFAwUDAAP3AvIC6ALaAtICzQLLAs4C0ALTAtcC2wLiAusC/QIIAxADEwMXAxsDIwMnAycDLAMyAzADLQMoAx4DGgMaAxsDFwMWAxQDEQMPAw8DCwMLAwoDBwMFAwIDBAMGAwUDAwP/Av8CAgMEAwMDBAMFA/8C9wLsAuUC2QLQAsgCyALLAtEC1gLaAt4C5gLrAvYC/QIGAwsDEwMZAxwDIAMjAygDLgMsAykDIwMdAx8DIAMdAxoDFgMTAxIDEgMQAwwDCgMIAwcDBgMGAwsDCAMDAwMD/gL9Av8CAgMDAwIDAQP+AvkC7ALgAtkCzgLGAsoC0ALVAt0C4ALjAuoC7QLzAvgC/QIFAwwDFQMWAxcDHwMjAyMDIQMeAxgDFgMnAyIDHgMbAxcDEgMQAw8DDwMNAwgDBwMFAwUDCAMIAwQDAQMBAwAD/gL+AgADAAMAA/0C/QL3AusC3QLWAskCxQLNAtUC3ALhAuYC7ALvAu8C9QL5Av4CBQMMAxQDGAMWAxoDGQMYAxYDEAMNAwsDJQMiAx4DGwMYAxIDEQMOAw0DCQMGAwcDBAMFAwUDBwMHAwMDAgMBA/4C/QL8AvwC/gL8Av0C9gLrAt4C1QLFAsICxwLUAt8C5gLrAvAC+AL8Av4C/wIFAwwDEwMWAxsDGgMYAxEDDgMIAwcDAQP7AiYDIgMfAxsDGAMSAw8DCwMLAwYDBAMFAwQDAwMBAwQDCAMEAwIDAQP/Av0C+wL6AvoC/QL+AvcC7ALhAtYCyALEAskC1gLjAuoC8AL3AgEDBAMGAwgDDQMSAxgDHQMfAxoDFAMLAwMDAAP8AvUC7wInAyMDHwMWAxEDDwMNAwgDBQMCAwIDBAMCAwAD/wIDAwQDAQMBAwED/wL+AvwC9wL4AvsC+gL1Au0C5wLaAs4CxALHAtIC4wLpAvIC/wIKAwsDDAMSAxcDGgMdAyEDHgMYAw8DAwP5AvgC8QLmAuECJQMhAx8DGQMRAw4DDAMJAwUDAgMDAwQDAwP/Av4CAAMAA/4C/gIAA/8C/gL7AvUC9QL1AvQC9ALwAukC3wLRAsICwgLPAt0C6QL1AgIDDQMWAxUDGAMgAyIDIwMiAxwDFwMMA/8C9ALuAuYC3QLZAiYDIQMgAxwDEwMPAwoDBgMFAwADAQMBA/4C/gL+Av4C/QL8Av8CAAP+Av4C+wL2AvIC8gLzAvQC8ALrAuAC0wLFAsICywLVAuEC8gL/AgsDFwMcAx4DIwMjAyMDIQMbAxUDCAP9AvEC5wLfAtECzQIkAyEDHgMbAxQDDQMIAwQDAwP/Av0C/QL8AvsC+wL8Av0C/gIEAwUDAgMAA/4C+ALuAu0C7wLyAvEC7ALiAtcCywLDAsQCzALcAu4C/wIPAxsDIAMmAygDJAMkAyIDHQMVAwgD+wLvAuIC2ALNAsgCJAMhAyADGwMUAxADDAMIAwQDAAP7AvsC/AL6AvoC+AL5Av0CBQMHAwgDBQMAA/oC7gLrAu0C7gLvAuoC4QLXAtACxQLBAsgC1wLqAv0CDwMYAx8DJAMmAyUDJAMiAx4DEwMJA/sC7gLgAtoCzgLGAiADIgMgAxsDFQMSAw4DCQMEAwED+wL6AvsC+QL3AvQC9QL6AgADBAMFAwQDAAP6AvEC6gLpAukC6wLoAt4C0wLOAsUCvALGAtYC6AL7AgsDEgMZAyADIQMgAyEDIgMeAxUDDAP+AvEC5gLeAtICyAIeAyEDIQMeAxsDGAMTAw0DCQMGA/8C+wL6AvoC+gL4AvQC9AL5Av0CAAP+AvsC9gLwAuoC5wLkAucC5ALXAswCxgK/ArsCxwLXAuYC8QIAAwoDEAMXAx4DIAMjAyMDIAMdAxEDAQP5AvEC6gLhAtgCHgMfAyADIgMfAxkDFgMUAxEDCgMBAwAD/QL+Av8C/QL1AvAC8QL2AvkC+gL5AvQC7gLrAuYC4wLhAtsC0ALHAr8CvALAAswC1wLjAuwC9QL+AggDEQMZAyEDJgMmAyQDIAMbAw0DAgP8AvYC7wLpAh0DHwMeAx8DHwMdAxsDGgMTAw0DBgMFAwIDAgMCA/8C9wLwAuwC8AL0AvYC9ALuAuoC6ALkAuEC3gLXAssCwwK6ArsCwgLMAtYC3gLmAvEC/AIEAw8DGgMkAycDJwMoAyUDIQMXAwsDBAMCA/sC9AIXAxsDHAMbAx4DHwMaAxoDFQMQAw0DCgMIAwUDAwMAA/sC9gLuAuoC7QLvAu8C6wLnAuQC4gLfAt4C1gLGAr4CuQK/AsgC0QLcAuQC7QL2AgQDEQMcAyMDJgMnAygDKgMoAyQDHwMVAw4DBgP4AvICEQMTAxcDGQMcAx0DGgMYAxcDFAMSAw8DCgMIAwQDAQP+AvsC8wLrAukC6wLsAugC5QLjAuEC3gLeAtQCwgK6AroCwQLJAtUC3wLsAvgCBwMTAxoDJAMpAyoDKQMpAykDKQMnAyMDGwMRAwAD8gLrAgwDDAMPAxEDGAMZAxkDFgMXAxcDFgMSAwwDCAMEAwAD/gL7AvYC7gLqAukC6gLoAucC5wLmAuIC4ALVAsECsAK0Ar4CxwLWAuMC8wL/Ag8DGwMfAyYDKgMoAygDJgMoAygDKwMjAxsDDwMBA/QC6AIKAwoDCwMLAxADFQMSAxMDFgMXAxQDEAMMAwkDBQP/AvsC+wL4AvEC7ALoAukC6QLqAugC5wLkAuAC2QLBArECsQK5AsYC1QLlAvUCBQMQAxcDHwMiAyQDIQMgAxsDHQMdAxwDGAMRAwgDAAP4Au0CCAMHAwQDBAMIAwwDCQMLAxEDFAMUAw8DCwMKAwID+wL6AvkC9gLyAusC5QLoAugC6wLsAuoC5ALgAtkCxAK1Aq8CuQLHAtYC4gLxAv4CCwMTAxoDGwMcAxkDEgMMAxADEgMOAwgDAAP9AvkC9gLyAgcDCAMFAwMDAwMCAwMDBQMLAw8DEgMQAwkDBQP+AvgC+QL4AvUC8gLsAucC6ALoAukC6wLqAucC5QLYAsACsQKyArwCxwLSAt0C6gL4AgMDDwMUAxgDFwMQAwUDAQMDAwQD+QL2AvAC7QLtAu4C6wILAw0DCgMDA/4C+wL8Av0CAwMJAwwDDgMKAwID/gL8AvsC+AL3AvYC8wLrAucC5wLnAuQC5ALjAuIC1wLCArACtAK/AsgC0QLcAucC8wIAAwgDEQMWAxUDCgP+AvIC6gLoAuQC5QLhAuAC4QLpAusCDgMQAw4DAwP9AvsC+QL4AvoCBAMIAwoDCgMIAwUDAgP+AvoC+QL8AvQC6gLjAuEC4wLiAt8C3ALfAtcCwAKvArMCwgLJAtQC3gLoAvICAAMJAxcDGAMUAwYD/ALrAtwC1gLRAtEC0QLVAt4C6wLyAg8DEAMNAwcDAwP+AvkC9wL2AvwCAwMIAwgDCgMJAwUDAQP9AvsC/QL3Au8C4QLaAt0C3gLdAtkC1ALKArwCqgKuAr8CyALYAuMC7gL7AgYDEQMXAxUDEQMEA/cC5wLYAs4CxALEAsoC0QLiAvMC+QISAxMDEQMMAwsDAgP9AvoC8wL2Av4CCAMLAw0DCwMHAwMD/wL7AvwC+gLuAuIC2ALUAtkC2QLTAskCwAKxAqYCrAK6AskC2QLlAvEC/gILAxUDFAMQAwkD/wLxAuUC1gLKAr4CvgLHAtMC5QLzAvoCEwMTAxIDEQMNAwUDAAP4AvIC9AL5AgUDCwMNAw0DCQMEAwAD/gL9AvgC7ALhAtYC0ALQAssCxAK+ArMCpgKeAqgCugLKAtgC4wLuAvoCBgMMAw4DCwMEA/gC6wLeAtMCwgK0ArUCwALUAt8C6QL0AhIDEAMOAw4DDQMHA/wC8gLsAvAC+AIFAwwDDwMOAwsDBAP/Av0C/QL0AuoC2wLQAswCyALDAr4CtAKkApsCoQKpArsCygLYAuMC6QLwAvgC/gIBAwMDAQP2AusC3ALQAr8CsgKuArgCygLXAt8C7AISAw4DCwMIAwED/wL3Au0C6QLuAv0CBQMKAw4DDQMIAwIDAAP9AvcC7QLgAtICygLGAsECvQK2AqUCnAKfAqkCtQLDAs0C1QLfAuIC5gLqAvAC8gL3AvgC8wLqAtwCzwLCArICpgKvArkCygLaAuUCEQMPAwoDBAP+AvoC8gLqAuYC7gL7AgQDCwMNAwkDBgMAA/0C+gLxAuMC2ALNAsUCwQK9ArkCpgKWApwCtQK9AsQCywLRAtIC1QLaAt0C4ALfAuQC6QLrAuoC4wLVAs0CwQKwAqICpAKvAsQC1ALhAg4DDgMKAwUD/wL2AuwC6QLmAusC+gIEAwoDDAMGAwQD/wL4AvAC5gLZAs4CwwK8AroCugKwApcCkgKpAr4CyQLNAs8C1QLUAtEC0gLSAtMC0gLWAtwC3wLgAtoC0QLHArwCrQKiAqECqwK/As4C3QINAw4DCwMFA/8C9ALsAuQC5QLtAvoCAgMGAwcDBQMEA/8C8gLmAtwC0QLDAroCsgKzArQCqwKSAo4CpgK8AswC0QLRAtQC1ALQAs0CygLHAsYCyQLMAtAC0gLSAs0CwgKzAqkCngKcAqYCuQLJAtcCDwMNAwgDAgP+AvkC7wLfAtoC5wL5AgQDBQMEAwUDAgP5AvAC5ALYAscCuQKwAqoCrwKvAqQCkAKJAqMCvALKAtIC0wLTAtECzALJAsUCxALCAsACvQLDAsgCywLKAr0CrgKiApECkQKfAqsCuALFAg0DDwMKAwQDAAP4AuwC3gLZAuUC+wIFAwgDCQMHAwAD9gLsAuIC0QLAArECpgKkAqsCqAKcAokChgKfArYCyALSAtQC1ALQAssCxwLBAr4CugK4ArYCtwK6ArwCvgKzAqYCmAKIAooClAKgAqsCuAIKAwoDBAMAA/0C9ALnAuAC3wLlAvoCBQMIAwkDAgP7AvUC6gLgAtICvwKuAqACnwKjAp8CkgKDAogCnwK0AsUCzwLZAtoC1wLPAsQCvQK2ArMCsgKwAq0CrwKvAq4CqAKdAo0CggKEAowCmwKpArQCBgP+Av0C/AL6AvMC5QLbAt0C5QL0Av8CAQMBA/0C9ALxAuwC4QLVAsICsQKfApQClQKTAocCgAKJAp0CsgLGAtQC4QLjAt8C1QLIAsACuAKvAqgCpgKlAqQCpQKkAp0CkAKEAn8CfgKJApoCqQK3Av4C9wL3AvkC9wLwAuQC1wLWAt8C6wL0AvkC+gL3Au8C6gLlAuEC1wLFArQCoQKLAogChwKBAn4CigKfArECywLbAucC5gLhAtkCzQLDArwCsQKkAp0CmAKYAp0CoQKeAo0CgwJ8AnsChQKWAqYCtQL9AvYC9wL4AvQC8QLlAtYCzwLSAtsC6QLzAvIC7QLqAuIC2wLaAtMCxAKxAqACkAKFAn4CeQJ7Ao0CoAK2As8C3gLjAuAC3ALYAtACxwK+ArECoQKYApACkAKVAp0CnQKRAoICdwJ3AoUClAKgArEC9wLzAvQC9wLzAvEC6gLfAs8CyQLPAtsC4wLkAuEC2wLQAs4CygLEArcCqgKeApECggJ3AnMCeQKMAqACugLOAtkC3QLeAtkC0QLJAsECuAKqAp4ClQKGAoAChwKRApgCkwKCAnMCdQKEApMCnQKrAvQC8QLyAvMC8gLxAu0C6ALcAskCxgLLAs0C0ALPAscCwQK7ArMCrwKsAp4ClAKHAnsCdAJzAn0CjQKjAr0C0wLdAt8C3ALUAswCwgK3ArECpAKZAo8ChAJ2AncCgQKLAooCfwJvAm0CgwKTAp4CpQL2AvQC8gLzAvQC9gL1AuwC5wLbAsYCwAK8ArsCuQK1Aq8CqAKhAp0CnAKMAoQCfAJxAmwCcQKCApYCpgLAAtMC3gLeAt0C1QLMAsECswKrAp0CkAKKAnwCbwJuAncCgwKEAnkCaAJrAoICkwKcAqMC9QLzAvMC8gL0AvcC+ALyAuwC5ALTAsUCuAK0Aq8CrQKmAp8CmQKUApMChwJ8AnMCbAJnAm8ChAKaAq0CxQLPAtgC3QLeAtcCzgLFArgCrgKbAo4ChwJ3AmoCZwJrAncCewJwAmMCawJ8AowClQKcAvcC8gLxAvEC9AL1AvcC9ALtAukC4ALQAsICvAKzArMCqwKmAqgCqAKmApUCiAJ3Am0CZQJqAnsCjwKmAr4CygLSAtgC2QLVAs0CxALAArcCpgKYApECgQJ1AmsCZQJsAm4CZQJeAmQCcgKCAowCkQL2AvIC7wLwAvEC8wL0AvMC8ALpAuMC2gLQAsoCxwLDAr0CuAK5ArMCqwKhApQCgQJuAmcCZAJxAogCogKzAsACxwLPAs8CzgLIAsMCwAK4Aq4CpgKgApQChQJyAmACXAJeAlsCXAJmAnECfQKIAo8C8gLwAu8C7wLwAvIC9QL1AvQC7ALnAuMC3ALXAtYCzwLIAsICvQK0AqwCpgKdAo4CegJtAmMCawJ/ApgCrAK4Ar8CxQLAArwCuAK4AroCtAKyAqwCpQKbAowCeAJjAlcCVAJYAl8CbQJ6AoUCjQKVAvIC7wLuAvAC8QLyAvYC+QL4AvcC8gLvAuoC6ALeAtUCzQLFArwCtQKtAqUCngKVAoUCcwJiAmQCcgKJApwCrQK1ArQCrQKtAqoCpwKrAqsCrAKoAqMCmQKMAn0CaQJaAlECVgJhAnUChQKRApoCoQLuAu4C7gLuAu8C8gL4AvwC/AL/Av4C/AL3AvQC5wLcAtICxgK7ArMCqgKkApwClAKJAngCZwJeAmcCewKKApoCogKfApwCngKeApsCnAKeAp8CngKeApYCiwJ+Am0CWgJPAlQCZwJ4AowCnAKjAqcC7ALtAu8C7wLwAvQC+QL+AgMDCAMHAwIDAQP6Au4C4ALSAsYCvgKwAqYCoAKZApECiQJ+Am0CWQJaAm0CegKIAo4CjwKRApQClQKTAo0CiQKKApQClgKNAoUCfgJxAlkCTgJVAmsCewKOAp8CqgKsAuwC7QLvAvEC8gLzAvgC/wIHAwoDCAMFAwQD+QLvAuEC0wLIAsECswKkAp0ClwKOAoYCfwJwAlwCWAJeAmoCeAKBAoMCgAKJAooCgQJ7AnUCfwKHAosChQKAAnsCcAJXAkwCUwJpAnkCigKUAp4CpwLsAu0C7wLxAvIC8wL6AgEDBQMHAwcDBgMCA/UC6gLeAtECyAK/ArMCowKZApMCjQKIAoQCegJvAmMCVwJbAmgCdQJ3AnQCeQJ4AnMCbQJlAnICfAJ/AnwCeAJyAmYCUgJHAk4CXQJuAnwChwKOApsC7ALsAu4C8QLyAvMC+QIAAwIDBAMHAwUD/ALvAuIC1wLKAsACuAKrAqECmgKWApQCkwKUAokCfQJuAlICTwJbAmcCbgJmAmMCZAJjAl0CWAJhAm0CcAJwAm4CZAJaAk4CRAJIAlMCYAJuAncCgwKRAg==';
function decode(b64: string): Int16Array {
  const bin = typeof atob === 'function' ? atob(b64) : Buffer.from(b64, 'base64').toString('binary');
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Int16Array(bytes.buffer);
}
const CITY_DEM = decode(CITY_DEM_B64);

/** Valley floors in metres ASL − 600, and the gradient of the slopes rising out
 * of them. Two thousand years of debris have filled these valleys — the street
 * beside the western wall lies some 15 m under the modern plaza — so the
 * measured surface is cut back down to the ancient floors here. */
const KIDRON: number[][] = [[395, -700, 112], [338, -300, 96], [300, -40, 88], [235, 300, 72], [150, 560, 50], [95, 830, 40], [55, 950, 29], [10, 1060, 16], [45, 1200, 11], [100, 1330, 5], [190, 1450, 0]];
const TYROPOEON: number[][] = [[-320, -560, 150], [-235, -300, 140], [-165, -60, 124], [-124, 180, 112], [-95, 400, 94], [-62, 650, 66], [-30, 860, 40], [-10, 960, 28], [5, 1050, 17]];
const HINNOM: number[][] = [[-790, -80, 176], [-858, 300, 150], [-880, 620, 126], [-836, 880, 100], [-700, 1000, 100], [-600, 1045, 90], [-500, 1050, 83], [-400, 1052, 69], [-300, 1055, 58], [-210, 1055, 46], [-120, 1058, 28], [-40, 1060, 17], [20, 1080, 14]];

function valleyFloor(x: number, z: number, axis: number[][], slope: number): number {
  let best = Infinity;
  for (let i = 1; i < axis.length; i++) {
    const [ax, az, ay] = axis[i - 1], [bx, bz, by] = axis[i];
    const dx = bx - ax, dz = bz - az;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
    const d = Math.hypot(x - (ax + dx * t), z - (az + dz * t));
    best = Math.min(best, ay + (by - ay) * t + slope * d);
  }
  return best;
}

/** Ground height in metres ASL − 600. */
export function cityGround(x: number, z: number): number {
  const fx = Math.min(CITY_DEM_NX - 1.001, Math.max(0, (x - JERUSALEM_BOUNDS.west) / CITY_DEM_STEP));
  const fz = Math.min(CITY_DEM_NY - 1.001, Math.max(0, (z - JERUSALEM_BOUNDS.north) / CITY_DEM_STEP));
  const ix = Math.floor(fx), iz = Math.floor(fz);
  // Smoothstep rather than a straight bilinear blend: at a 50 m grid the creases
  // of linear interpolation catch the light and read as terraces.
  const tx = (fx - ix) * (fx - ix) * (3 - 2 * (fx - ix));
  const tz = (fz - iz) * (fz - iz) * (3 - 2 * (fz - iz));
  const i = iz * CITY_DEM_NX + ix;
  const top = CITY_DEM[i] * (1 - tx) + CITY_DEM[i + 1] * tx;
  const bottom = CITY_DEM[i + CITY_DEM_NX] * (1 - tx) + CITY_DEM[i + CITY_DEM_NX + 1] * tx;
  let h = top * (1 - tz) + bottom * tz - 600;
  // Herod's builders cut the rock down on the north and west and filled behind
  // the walls on the south and east to level the esplanade; without that, the
  // hill still stands through the courts.
  if (insidePolygon(x, z, PLATFORM.corners)) h = Math.min(h, PLATFORM.top - 2);
  h = Math.min(h, valleyFloor(x, z, KIDRON, 0.30));
  h = Math.min(h, valleyFloor(x, z, TYROPOEON, 0.26));
  h = Math.min(h, valleyFloor(x, z, HINNOM, 0.34));
  return h;
}

/** Distance from a point to a polyline, for keeping houses off the streets. */
export function distanceToPath(x: number, z: number, path: Point[]): number {
  let best = Infinity;
  for (let i = 1; i < path.length; i++) {
    const [ax, az] = path[i - 1], [bx, bz] = path[i];
    const dx = bx - ax, dz = bz - az;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
    best = Math.min(best, Math.hypot(x - (ax + dx * t), z - (az + dz * t)));
  }
  return best;
}

export function insidePolygon(x: number, z: number, points: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [ax, az] = points[i], [bx, bz] = points[j];
    if ((az > z) !== (bz > z) && x < (bx - ax) * (z - az) / (bz - az) + ax) inside = !inside;
  }
  return inside;
}

/** World metres for a point in the Temple Mount's own turned frame. */
export function platformToWorld(lx: number, lz: number): Point {
  const c = Math.cos(PLATFORM.angle), s = Math.sin(PLATFORM.angle);
  return [PLATFORM.centre[0] + lx * c + lz * s, PLATFORM.centre[1] - lx * s + lz * c];
}
