// 알람 소리 재생 유틸.
//
// 알람은 "버튼을 누른 순간"이 아니라 몇 분 뒤에 울린다. 그 시점에는 사용자 제스처가
// 남아있지 않을 수 있어, 그때 처음 new Audio()를 만들면 브라우저 자동재생 정책에
// 막혀 조용히 실패한다. 그래서 제스처가 확실한 "시작" 시점에 prime()으로 미리
// 무음 재생해 재생 권한을 따 두고, 알람 때는 그 인스턴스를 다시 쓴다.

const cache = new Map<string, HTMLAudioElement>();

let ctx: AudioContext | null = null;
function getCtx(): AudioContext | null {
  // 크롬은 탭당 AudioContext 개수에 상한이 있다. 호출할 때마다 new 하면
  // 몇 번 만에 생성이 실패해 그때부터 비프음이 아예 안 난다. 하나만 만들어 재사용한다.
  if (ctx) return ctx;
  try { ctx = new AudioContext(); } catch { return null; }
  return ctx;
}

function beep() {
  const c = getCtx();
  if (!c) return;
  // 제스처 없이 만든 컨텍스트는 suspended로 시작해, 깨우지 않으면 소리가 나지 않는다.
  c.resume().catch(() => {});
  for (let i = 0; i < 6; i++) {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.connect(gain);
    gain.connect(c.destination);
    osc.frequency.value = i % 2 === 0 ? 880 : 660;
    gain.gain.value = 0.3;
    const at = c.currentTime + i * 0.35;
    osc.start(at);
    osc.stop(at + 0.2);
  }
}

function getAudio(file: string): HTMLAudioElement {
  let a = cache.get(file);
  if (!a) {
    a = new Audio(file);
    a.preload = 'auto';
    cache.set(file, a);
  }
  return a;
}

/** 사용자 제스처(시작 버튼 클릭 등) 안에서 호출해 재생 권한을 미리 확보한다. */
export function primeAlarm(file: string) {
  if (!file) { getCtx()?.resume().catch(() => {}); return; }
  const a = getAudio(file);
  a.muted = true;
  a.play()
    .then(() => { a.pause(); a.currentTime = 0; })
    .catch(() => {})
    .finally(() => { a.muted = false; });
}

/** 알람 재생. mp3가 막히면 비프음으로 대체하고, 막힌 이유를 콘솔에 남긴다. */
export function playAlarm(file: string) {
  if (!file) { beep(); return; }
  const a = getAudio(file);
  a.muted = false;
  a.currentTime = 0;
  a.play().catch((err) => {
    console.warn(`[알람] ${file} 재생이 차단되어 비프음으로 대체합니다.`, err);
    beep();
  });
}
