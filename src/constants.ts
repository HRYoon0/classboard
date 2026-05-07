import type { WidgetMeta, WidgetType } from './types/widget';

export const WIDGET_META: Record<WidgetType, WidgetMeta> = {
  timer: { type: 'timer', label: '타이머', icon: '⏱️', defaultW: 420, defaultH: 200 },
  stopwatch: { type: 'stopwatch', label: '스톱워치', icon: '⏱', defaultW: 320, defaultH: 200 },
  clock: { type: 'clock', label: '시계', icon: '🕐', defaultW: 260, defaultH: 300 },
  'traffic-light': { type: 'traffic-light', label: '신호등', icon: '🚦', defaultW: 180, defaultH: 420 },
  'noise-meter': { type: 'noise-meter', label: '소음 측정기', icon: '🔊', defaultW: 400, defaultH: 320 },
  'random-name': { type: 'random-name', label: '이름 뽑기', icon: '👤', defaultW: 500, defaultH: 450 },
  'group-maker': { type: 'group-maker', label: '모둠 만들기', icon: '👥', defaultW: 600, defaultH: 500 },
  poll: { type: 'poll', label: '투표', icon: '📊', defaultW: 570, defaultH: 480 },
  text: { type: 'text', label: '텍스트', icon: '📝', defaultW: 360, defaultH: 200 },
  drawing: { type: 'drawing', label: '그림판', icon: '🎨', defaultW: 460, defaultH: 360 },
  'qr-code': { type: 'qr-code', label: 'QR 코드', icon: '📱', defaultW: 420, defaultH: 480 },
  dice: { type: 'dice', label: '주사위', icon: '🎲', defaultW: 420, defaultH: 400 },
  'work-symbols': { type: 'work-symbols', label: '활동 안내', icon: '📋', defaultW: 460, defaultH: 460 },
  calendar: { type: 'calendar', label: '달력', icon: '📅', defaultW: 400, defaultH: 420 },
  image: { type: 'image', label: '이미지', icon: '🖼️', defaultW: 400, defaultH: 320 },
  pomodoro: { type: 'pomodoro', label: '뽀모도로', icon: '🍅', defaultW: 380, defaultH: 480 },
  lots: { type: 'lots', label: '제비뽑기', icon: '🎫', defaultW: 480, defaultH: 540 },
  ladder: { type: 'ladder', label: '사다리 타기', icon: '🪜', defaultW: 820, defaultH: 940 },
};

export const WIDGET_LIST = Object.values(WIDGET_META);

export const BACKGROUNDS = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
  'linear-gradient(135deg, #fccb90 0%, #d57eeb 100%)',
  'linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)',
  'linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%)',
  'linear-gradient(135deg, #fddb92 0%, #d1fdff 100%)',
  'linear-gradient(135deg, #2c3e50 0%, #3498db 100%)',
  'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
];

// Unsplash 이미지 URL 헬퍼
const U = (id: string) => `https://images.unsplash.com/${id}`;
const P = (id: string) => `https://plus.unsplash.com/${id}`;

export interface PhotoCategory {
  name: string;
  photos: string[];
}

export const PHOTO_BACKGROUNDS: PhotoCategory[] = [
  {
    name: '봄',
    photos: [
      U('photo-1557409518-691ebcd96038'),
      U('photo-1617836250803-24873f080562'),
      U('photo-1522748906645-95d8adfd52c7'),
      U('photo-1590520069262-5cca4e35ae15'),
      U('photo-1560717789-0ac7c58ac90a'),
      U('photo-1663373342794-e8c8cd78fc12'),
    ],
  },
  {
    name: '여름',
    photos: [
      U('photo-1507525428034-b723cf961d3e'),
      U('photo-1473116763249-2faaef81ccda'),
      U('photo-1595975090424-ad893209abd3'),
      U('photo-1501426026826-31c667bdf23d'),
      U('photo-1414609245224-afa02bfb3fda'),
      U('photo-1468581264429-2548ef9eb732'),
    ],
  },
  {
    name: '가을',
    photos: [
      U('photo-1445285303476-2f3b16d67b7a'),
      U('photo-1741030705526-946e97d1a3b1'),
      U('photo-1664493115827-573d5669f032'),
      U('photo-1723980385274-f26931d14c09'),
      U('photo-1508193638397-1c4234db14d8'),
      U('photo-1422050478545-9f9383263965'),
    ],
  },
  {
    name: '겨울',
    photos: [
      U('photo-1743657166981-8d8e11d03c3e'),
      U('photo-1491002052546-bf38f186af56'),
      U('photo-1478265409131-1f65c88f965c'),
      U('photo-1606388701602-2e3727da5b28'),
      U('photo-1418985991508-e47386d96a71'),
      U('photo-1641755842771-165180b90ba2'),
    ],
  },
  {
    name: '교실',
    photos: [
      U('photo-1769720205277-7f4b81d497c6'),
      U('photo-1536221993589-9edbbca2c7fc'),
      P('premium_photo-1683140930139-74f5f27a9fd9'),
      U('photo-1520881685182-f4f6a103adf5'),
      U('photo-1535340582796-799448c62e08'),
      P('premium_photo-1665520346896-784e4945f09d'),
    ],
  },
  {
    name: '자연',
    photos: [
      U('photo-1506744038136-46273834b3fb'),
      U('photo-1470071459604-3b5ec3a7fe05'),
      U('photo-1441974231531-c6227db76b6e'),
      U('photo-1472214103451-9374bd1c798e'),
      U('photo-1469474968028-56623f02e42e'),
      U('photo-1433086966358-54859d0ed716'),
    ],
  },
  {
    name: '동물',
    photos: [
      U('photo-1535083783855-76ae62b2914e'),
      U('photo-1437622368342-7a3d73a34c8f'),
      U('photo-1484406566174-9da000fda645'),
      U('photo-1497752531616-c3afd9760a11'),
      U('photo-1517849845537-4d257902454a'),
      U('photo-1602491453631-e2a5ad90a131'),
    ],
  },
  {
    name: '도시',
    photos: [
      U('photo-1480714378408-67cf0d13bc1b'),
      U('photo-1449824913935-59a10b8d2000'),
      U('photo-1477959858617-67f85cf4f1df'),
      U('photo-1514565131-fce0801e5785'),
      U('photo-1444723121867-7a241cacace9'),
      U('photo-1519501025264-65ba15a82390'),
    ],
  },
  {
    name: '우주',
    photos: [
      U('photo-1462331940025-496dfbfc7564'),
      U('photo-1446776811953-b23d57bd21aa'),
      U('photo-1451187580459-43490279c0fa'),
      U('photo-1419242902214-272b3f66ee7a'),
      U('photo-1507400492013-162706c8c05e'),
      U('photo-1464802686167-b939a6910659'),
    ],
  },
  {
    name: '패턴',
    photos: [
      U('photo-1558591710-4b4a1ae0f04d'),
      U('photo-1550859492-d5da9d8e45f3'),
      U('photo-1557682250-33bd709cbe85'),
      U('photo-1579546929518-9e396f3cc809'),
      U('photo-1557682224-5b8590cd9ec5'),
      U('photo-1557683316-973673baf926'),
    ],
  },
];
