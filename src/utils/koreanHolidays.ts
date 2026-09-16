import KoreanLunarCalendar from 'korean-lunar-calendar';

// 음력 날짜 → 양력 날짜 변환
function lunarToSolar(year: number, lunarMonth: number, lunarDay: number): { month: number; day: number } | null {
  const cal = new KoreanLunarCalendar();
  const ok = cal.setLunarDate(year, lunarMonth, lunarDay, false);
  if (!ok) return null;
  const solar = cal.getSolarCalendar();
  return { month: solar.month - 1, day: solar.day }; // 0-indexed month
}

// 고정 공휴일 (month: 0-indexed)
// sub: 'both' = 토/일 모두 대체, 'sun' = 일요일만 대체, 'none' = 미적용
interface FixedHoliday {
  month: number;
  day: number;
  name: string;
  sub: 'both' | 'sun' | 'none';
  fromYear?: number; // 이 연도부터 적용
}

const FIXED_HOLIDAYS: FixedHoliday[] = [
  { month: 0, day: 1, name: '신정', sub: 'none' },
  { month: 2, day: 1, name: '삼일절', sub: 'both' },
  { month: 4, day: 5, name: '어린이날', sub: 'both' },
  { month: 5, day: 6, name: '현충일', sub: 'none' },
  { month: 6, day: 17, name: '제헌절', sub: 'both', fromYear: 2027 }, // 2026년은 대체공휴일 미적용, 2027년부터
  { month: 7, day: 15, name: '광복절', sub: 'both' },
  { month: 9, day: 3, name: '개천절', sub: 'both' },
  { month: 9, day: 9, name: '한글날', sub: 'both' },
  { month: 11, day: 25, name: '크리스마스', sub: 'both' },
];

// 선거일 (수동 등록)
const ELECTIONS: Record<number, { month: number; day: number; name: string }[]> = {
  2024: [{ month: 3, day: 10, name: '국회의원 선거' }],
  2026: [{ month: 5, day: 3, name: '지방선거' }],
  2028: [{ month: 3, day: 12, name: '국회의원 선거' }],
  2030: [{ month: 5, day: 12, name: '지방선거' }],
};

// 캐시
const cache: Record<number, Record<string, string>> = {};

export function getHolidaysForYear(year: number): Record<string, string> {
  if (cache[year]) return cache[year];

  const holidays: Record<string, string> = {};
  const addHoliday = (m: number, d: number, name: string) => {
    holidays[`${m}-${d}`] = name;
  };

  // 대체공휴일 후보 목록
  const subCandidates: { month: number; day: number; name: string; sub: 'both' | 'sun' }[] = [];

  // 1. 고정 공휴일
  for (const h of FIXED_HOLIDAYS) {
    // 제헌절은 2026년부터 공휴일, 대체공휴일은 2027년부터
    if (h.name === '제헌절' && year < 2026) continue;
    addHoliday(h.month, h.day, h.name);
    if (h.sub !== 'none') {
      const subType = (h.name === '제헌절' && year < 2027) ? 'none' : h.sub;
      if (subType !== 'none') {
        subCandidates.push({ month: h.month, day: h.day, name: h.name, sub: subType as 'both' | 'sun' });
      }
    }
  }

  // 2. 음력 공휴일
  // 설날 (음력 1/1) + 전날 + 다음날
  const seol = lunarToSolar(year, 1, 1);
  if (seol) {
    const seolDate = new Date(year, seol.month, seol.day);
    const prev = new Date(seolDate); prev.setDate(prev.getDate() - 1);
    const next = new Date(seolDate); next.setDate(next.getDate() + 1);
    addHoliday(prev.getMonth(), prev.getDate(), '설날 연휴');
    addHoliday(seol.month, seol.day, '설날');
    addHoliday(next.getMonth(), next.getDate(), '설날 연휴');
    // 설날 연휴: 일요일만 대체공휴일
    subCandidates.push({ month: prev.getMonth(), day: prev.getDate(), name: '설날', sub: 'sun' });
    subCandidates.push({ month: seol.month, day: seol.day, name: '설날', sub: 'sun' });
    subCandidates.push({ month: next.getMonth(), day: next.getDate(), name: '설날', sub: 'sun' });
  }

  // 부처님오신날 (음력 4/8)
  const buddha = lunarToSolar(year, 4, 8);
  if (buddha) {
    addHoliday(buddha.month, buddha.day, '부처님오신날');
    subCandidates.push({ month: buddha.month, day: buddha.day, name: '부처님오신날', sub: 'both' });
  }

  // 추석 (음력 8/15) + 전날 + 다음날
  const chuseok = lunarToSolar(year, 8, 15);
  if (chuseok) {
    const chuDate = new Date(year, chuseok.month, chuseok.day);
    const prev = new Date(chuDate); prev.setDate(prev.getDate() - 1);
    const next = new Date(chuDate); next.setDate(next.getDate() + 1);
    addHoliday(prev.getMonth(), prev.getDate(), '추석 연휴');
    addHoliday(chuseok.month, chuseok.day, '추석');
    addHoliday(next.getMonth(), next.getDate(), '추석 연휴');
    // 추석 연휴: 일요일만 대체공휴일
    subCandidates.push({ month: prev.getMonth(), day: prev.getDate(), name: '추석', sub: 'sun' });
    subCandidates.push({ month: chuseok.month, day: chuseok.day, name: '추석', sub: 'sun' });
    subCandidates.push({ month: next.getMonth(), day: next.getDate(), name: '추석', sub: 'sun' });
  }

  // 3. 선거일
  const elections = ELECTIONS[year];
  if (elections) {
    for (const e of elections) {
      addHoliday(e.month, e.day, e.name);
    }
  }

  // 4. 대체공휴일 계산
  for (const h of subCandidates) {
    const date = new Date(year, h.month, h.day);
    const dow = date.getDay(); // 0=일, 6=토

    let needSub = false;
    if (h.sub === 'both' && (dow === 0 || dow === 6)) needSub = true;
    if (h.sub === 'sun' && dow === 0) needSub = true;

    if (needSub) {
      // 다음 비공휴일 찾기
      const sub = new Date(date);
      sub.setDate(sub.getDate() + 1);
      while (
        sub.getDay() === 0 || sub.getDay() === 6 ||
        holidays[`${sub.getMonth()}-${sub.getDate()}`]
      ) {
        sub.setDate(sub.getDate() + 1);
      }
      addHoliday(sub.getMonth(), sub.getDate(), `대체공휴일(${h.name})`);
    }
  }

  cache[year] = holidays;
  return holidays;
}

export function getHoliday(year: number, month: number, day: number): string | null {
  const holidays = getHolidaysForYear(year);
  return holidays[`${month}-${day}`] || null;
}
