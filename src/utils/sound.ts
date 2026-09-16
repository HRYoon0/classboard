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

// 예약된 알람이 울릴 시각(epoch ms). playAlarm이 같은 알람을 겹쳐 울리지 않도록 쓴다.
let scheduledAt = 0;

const buffers = new Map<string, AudioBuffer>();

async function getBuffer(file: string, c: AudioContext): Promise<AudioBuffer | null> {
  const cached = buffers.get(file);
  if (cached) return cached;
  try {
    const res = await fetch(file);
    const buf = await c.decodeAudioData(await res.arrayBuffer());
    buffers.set(file, buf);
    return buf;
  } catch {
    return null;
  }
}

/**
 * delaySec 뒤에 울릴 알람을 지금 예약한다. 취소 함수를 돌려준다.
 *
 * setTimeout·setInterval은 탭이 숨겨지면 1분에 한 번까지 느려져 알람이 늦는다.
 * Web Audio의 start(when)은 오디오 하드웨어 클럭으로 발화해 탭 가시성과 무관하므로,
 * 백그라운드에서도 제시간에 울린다.
 */
export function scheduleAlarm(file: string, delaySec: number): () => void {
  const c = getCtx();
  if (!c) return () => {};
  c.resume().catch(() => {});

  const when = c.currentTime + delaySec;
  scheduledAt = Date.now() + delaySec * 1000;

  let cancelled = false;
  let src: AudioBufferSourceNode | null = null;
  const cancel = () => {
    cancelled = true;
    // 이미 울리기 시작했으면 끊지 않는다. 타이머가 0에 닿아 정리될 때도 이 함수가
    // 불리는데, 여기서 stop()하면 방금 울리기 시작한 알람이 잘린다.
    // scheduledAt도 그대로 둬서 playAlarm이 같은 알람을 겹쳐 울리지 않게 한다.
    if (c.currentTime >= when) return;
    scheduledAt = 0;
    try { src?.stop(); } catch { /* 이미 끝났거나 시작 전 */ }
    src = null;
  };

  if (!file) {
    // 비프음은 디코딩이 필요 없어 그 자리에서 6번 모두 예약해 둔다.
    for (let i = 0; i < 6; i++) scheduleBeep(c, when + i * 0.35, i % 2 === 0 ? 880 : 660);
    return cancel;
  }

  getBuffer(file, c).then((buf) => {
    if (cancelled) return;
    if (!buf) {
      // 디코딩 실패 — 예약을 포기하고 <audio> 폴백이 제때 울리도록 표시를 지운다.
      console.warn(`[알람] ${file} 예약에 실패했습니다. 탭이 백그라운드면 늦게 울릴 수 있습니다.`);
      scheduledAt = 0;
      return;
    }
    src = c.createBufferSource();
    src.buffer = buf;
    src.connect(c.destination);
    src.start(Math.max(c.currentTime, when));
  });

  return cancel;
}

function scheduleBeep(c: AudioContext, at: number, freq: number) {
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.connect(gain);
  gain.connect(c.destination);
  osc.frequency.value = freq;
  gain.gain.value = 0.3;
  osc.start(at);
  osc.stop(at + 0.2);
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

/**
 * 알람 재생. mp3가 막히면 비프음으로 대체하고, 막힌 이유를 콘솔에 남긴다.
 * scheduleAlarm으로 예약해 둔 알람이 이미 울렸다면 겹쳐 울리지 않는다.
 */
export function playAlarm(file: string) {
  if (scheduledAt && Math.abs(Date.now() - scheduledAt) < 3000) {
    scheduledAt = 0;
    return;
  }
  if (!file) { beep(); return; }
  const a = getAudio(file);
  a.muted = false;
  a.currentTime = 0;
  a.play().catch((err) => {
    console.warn(`[알람] ${file} 재생이 차단되어 비프음으로 대체합니다.`, err);
    beep();
  });
}
