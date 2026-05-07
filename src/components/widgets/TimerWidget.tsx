import { useState, useEffect, useRef, useCallback } from 'react';
import { IoPlay, IoStop, IoRefresh } from 'react-icons/io5';
import { useContainerScale } from '../../hooks/useContainerScale';

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
  const initialMinutes = (config.minutes as number) || 10;
  const initialSeconds = (config.seconds as number) || 0;
  const selectedSound = (config.alarmSound as string) || 'alarm1';
  const totalInitial = initialMinutes * 60 + initialSeconds;
  const [totalSeconds, setTotalSeconds] = useState(totalInitial);
  const [isRunning, setIsRunning] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const intervalRef = useRef<number | null>(null);

  const playAlarm = useCallback(() => {
    const file = ALARM_SOUNDS[selectedSound];
    if (file) {
      const audio = new Audio(file);
      audio.play().catch(() => {});
    } else {
      try {
        const ctx = new AudioContext();
        const playBeep = (time: number, freq: number) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.value = freq;
          gain.gain.value = 0.3;
          osc.start(time);
          osc.stop(time + 0.2);
        };
        for (let i = 0; i < 6; i++) {
          playBeep(ctx.currentTime + i * 0.35, i % 2 === 0 ? 880 : 660);
        }
      } catch { /* 오디오 미지원 */ }
    }
  }, [selectedSound]);

  useEffect(() => {
    if (isRunning && totalSeconds > 0) {
      intervalRef.current = window.setInterval(() => {
        setTotalSeconds((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            setIsFinished(true);
            playAlarm();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, playAlarm]);

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
            if (isFinished) reset();
            else setIsRunning(!isRunning);
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
