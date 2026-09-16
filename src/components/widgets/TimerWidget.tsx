import { useState, useEffect, useRef } from 'react';
import { IoPlay, IoStop, IoRefresh } from 'react-icons/io5';
import { useContainerScale } from '../../hooks/useContainerScale';
import { primeAlarm, playAlarm, scheduleAlarm } from '../../utils/sound';

const ALARM_SOUNDS: Record<string, string> = {
  alarm1: '/sounds/alarm1.mp3',
  alarm2: '/sounds/alarm2.mp3',
  alarm3: '/sounds/alarm3.mp3',
  alarm4: '/sounds/alarm4.mp3',
  alarm5: '/sounds/alarm5.mp3',
  beep: '',
};

interface Props {
  config: Record<string, unknown>;
  onConfigChange: (config: Record<string, unknown>) => void;
}

export default function TimerWidget({ config, onConfigChange }: Props) {
  // 분=0인 타이머(예: 50초)를 지원하려면 nullish 병합(??)을 써야 한다.
  // ||를 쓰면 0이 falsy로 취급돼 기본값 10으로 오염되어, 리셋 시 10분이 더해지는 버그가 생긴다.
  const initialMinutes = (config.minutes as number) ?? 10;
  const initialSeconds = (config.seconds as number) ?? 0;
  const selectedSound = (config.alarmSound as string) || 'alarm1';
  const totalInitial = initialMinutes * 60 + initialSeconds;
  const [totalSeconds, setTotalSeconds] = useState(totalInitial);
  const [isRunning, setIsRunning] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const deadlineRef = useRef(0);

  useEffect(() => {
    if (!isRunning || totalSeconds <= 0) return;
    // 남은 시간을 1초씩 빼지 않고 "끝나는 시각"에서 역산한다.
    // setInterval은 탭이 뒤로 가면 1분에 한 번까지 느려져서, 1초씩 빼는 방식은
    // 벽시계보다 한참 늦게 0에 닿는다("다 됐는데 안 울린다"의 원인).
    deadlineRef.current = Date.now() + totalSeconds * 1000;

    // 알람은 지금 예약해 둔다. 인터벌이 스로틀링돼도 소리는 제때 난다.
    const cancelAlarm = scheduleAlarm(ALARM_SOUNDS[selectedSound] ?? ALARM_SOUNDS.alarm1, totalSeconds);

    const tick = () => {
      const left = Math.max(0, Math.round((deadlineRef.current - Date.now()) / 1000));
      setTotalSeconds(left);
      if (left === 0) {
        setIsRunning(false);
        setIsFinished(true);
      }
    };
    const id = window.setInterval(tick, 250);
    // 숨겨진 동안 인터벌이 느려져 표시가 밀려 있다. 돌아오는 즉시 맞춘다.
    const onVisible = () => { if (!document.hidden) tick(); };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
      cancelAlarm();
    };
    // totalSeconds는 시작 시점의 값만 필요하다(넣으면 매 틱마다 인터벌이 새로 생긴다).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning]);

  // 알람은 렌더 단계(state updater) 안이 아니라 여기서 울린다.
  // updater 안에서 호출하면 StrictMode의 이중 실행으로 소리가 두 번 겹친다.
  useEffect(() => {
    if (isFinished) playAlarm(ALARM_SOUNDS[selectedSound] ?? ALARM_SOUNDS.alarm1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFinished]);

  // 클라우드 로드/외부 변경으로 config가 바뀌었을 때 — 실행 중이 아니면 시간 동기화
  useEffect(() => {
    if (!isRunning) {
      setTotalSeconds(initialMinutes * 60 + initialSeconds);
      setIsFinished(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialMinutes, initialSeconds]);

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const progress = totalInitial > 0 ? totalSeconds / totalInitial : 0;

  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  const adjustTime = (field: 'min10' | 'min1' | 'sec10' | 'sec1', delta: number) => {
    if (isRunning) return;
    let m = minutes;
    let s = seconds;
    switch (field) {
      case 'min10': m += delta * 10; break;
      case 'min1': m += delta; break;
      case 'sec10': s += delta * 10; break;
      case 'sec1': s += delta; break;
    }
    m = Math.max(0, Math.min(99, m));
    s = Math.max(0, Math.min(59, s));
    const newTotal = m * 60 + s;
    setTotalSeconds(newTotal);
    setIsFinished(false);
    onConfigChange({ ...config, minutes: m, seconds: s });
  };

  const reset = () => {
    setIsRunning(false);
    setIsFinished(false);
    setTotalSeconds(totalInitial);
  };

  const min10 = Math.floor(minutes / 10);
  const min1 = minutes % 10;
  const sec10 = Math.floor(seconds / 10);
  const sec1 = seconds % 10;
  const digitW = 'w-[38px]';

  // 위젯 크기에 따라 자동 스케일 (기본 크기: 420x200 기준)
  const { containerRef, scale: containerScale } = useContainerScale(380, 160);

  return (
    <div ref={containerRef} className="flex items-center justify-center h-full w-full">
    <div className="flex items-center justify-center gap-6" style={{ transform: `scale(${containerScale})`, transformOrigin: 'center center' }}>
      {/* 원형 프로그래스 링 */}
      <div className="relative shrink-0">
        <svg width="140" height="140" viewBox="0 0 140 140">
          <circle cx="70" cy="70" r={radius} fill="none" stroke="#e8e8ef" strokeWidth="6" />
          <circle
            cx="70" cy="70" r={radius} fill="none"
            stroke={isFinished ? '#ef4444' : '#6366f1'}
            strokeWidth="6" strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            transform="rotate(-90 70 70)"
            className="transition-all duration-1000"
          />
        </svg>
        <button
          onClick={() => {
            if (isFinished) { reset(); return; }
            // 알람이 울릴 때쯤이면 사용자 제스처가 만료돼 재생이 차단될 수 있다.
            // 확실한 제스처인 지금 재생 권한을 미리 따 둔다.
            if (!isRunning) primeAlarm(ALARM_SOUNDS[selectedSound] ?? ALARM_SOUNDS.alarm1);
            setIsRunning(!isRunning);
          }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
            isFinished
              ? 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              : isRunning
              ? 'bg-red-50 text-red-500 hover:bg-red-100'
              : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
          }`}>
            {isFinished ? <IoRefresh size={24} /> : isRunning ? <IoStop size={22} /> : <IoPlay size={24} className="ml-0.5" />}
          </div>
        </button>
        {(isRunning || totalSeconds !== totalInitial || isFinished) && (
          <button
            onClick={(e) => { e.stopPropagation(); reset(); }}
            className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-white shadow border border-slate-200 flex items-center justify-center text-slate-400 hover:text-indigo-500 hover:border-indigo-300 transition-colors"
            title="초기화"
          >
            <IoRefresh size={16} />
          </button>
        )}
      </div>

      {/* 시간 표시 + 조절 */}
      <div className="flex flex-col items-center">
        <div className="flex items-center mb-1">
          <div className={`${digitW} flex justify-center`}><AdjustBtn onClick={() => adjustTime('min10', 1)} label="+" hidden={isRunning} /></div>
          <div className={`${digitW} flex justify-center`}><AdjustBtn onClick={() => adjustTime('min1', 1)} label="+" hidden={isRunning} /></div>
          <div className="w-[20px]" />
          <div className={`${digitW} flex justify-center`}><AdjustBtn onClick={() => adjustTime('sec10', 1)} label="+" hidden={isRunning} /></div>
          <div className={`${digitW} flex justify-center`}><AdjustBtn onClick={() => adjustTime('sec1', 1)} label="+" hidden={isRunning} /></div>
        </div>
        <div className={`flex items-center ${isFinished ? 'animate-pulse' : ''}`}>
          <span className={`${digitW} text-center text-6xl font-bold text-slate-800 tabular-nums font-mono`}>{min10}</span>
          <span className={`${digitW} text-center text-6xl font-bold text-slate-800 tabular-nums font-mono`}>{min1}</span>
          <span className="w-[20px] text-center text-5xl font-bold text-slate-400">:</span>
          <span className={`${digitW} text-center text-6xl font-bold text-slate-800 tabular-nums font-mono`}>{sec10}</span>
          <span className={`${digitW} text-center text-6xl font-bold text-slate-800 tabular-nums font-mono`}>{sec1}</span>
        </div>
        <div className="flex items-center mt-1">
          <div className={`${digitW} flex justify-center`}><AdjustBtn onClick={() => adjustTime('min10', -1)} label="−" hidden={isRunning} /></div>
          <div className={`${digitW} flex justify-center`}><AdjustBtn onClick={() => adjustTime('min1', -1)} label="−" hidden={isRunning} /></div>
          <div className="w-[20px]" />
          <div className={`${digitW} flex justify-center`}><AdjustBtn onClick={() => adjustTime('sec10', -1)} label="−" hidden={isRunning} /></div>
          <div className={`${digitW} flex justify-center`}><AdjustBtn onClick={() => adjustTime('sec1', -1)} label="−" hidden={isRunning} /></div>
        </div>
      </div>
    </div>
    </div>
  );
}

function AdjustBtn({ onClick, label, hidden }: { onClick: () => void; label: string; hidden: boolean }) {
  return (
    <button
      onClick={hidden ? undefined : onClick}
      className={`w-8 h-6 flex items-center justify-center rounded text-lg font-bold transition-colors ${
        hidden
          ? 'text-transparent pointer-events-none'
          : 'text-slate-400 hover:text-indigo-500 hover:bg-indigo-50'
      }`}
    >
      {label}
    </button>
  );
}
