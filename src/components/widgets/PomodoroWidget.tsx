import { useState, useEffect, useRef, useCallback } from 'react';
import { IoPlay, IoStop, IoRefresh } from 'react-icons/io5';
import { useContainerScale } from '../../hooks/useContainerScale';

interface Props {
  config: Record<string, unknown>;
  onConfigChange: (config: Record<string, unknown>) => void;
}

type Phase = 'focus' | 'break' | 'longBreak';

const PHASE_COLORS: Record<Phase, string> = {
  focus: '#ef4444',
  break: '#22c55e',
  longBreak: '#6366f1',
};

const PHASE_LABELS: Record<Phase, string> = {
  focus: '집중',
  break: '휴식',
  longBreak: '긴 휴식',
};

export default function PomodoroWidget({ config, onConfigChange }: Props) {
  const focusMin = (config.focusMin as number) || 25;
  const breakMin = (config.breakMin as number) || 5;
  const longBreakMin = (config.longBreakMin as number) || 15;
  const alarmSound = (config.alarmSound as string) || 'alarm1';
  const savedCount = (config.pomodoroCount as number) || 0;

  const [phase, setPhase] = useState<Phase>('focus');
  const [totalSeconds, setTotalSeconds] = useState(focusMin * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [count, setCount] = useState(savedCount);
  const [showSetup, setShowSetup] = useState(false);
  const intervalRef = useRef<number | null>(null);

  const { containerRef, scale: containerScale } = useContainerScale(340, 300);

  const getPhaseSeconds = useCallback((p: Phase) => {
    if (p === 'focus') return focusMin * 60;
    if (p === 'break') return breakMin * 60;
    return longBreakMin * 60;
  }, [focusMin, breakMin, longBreakMin]);

  const playAlarm = useCallback(() => {
    const file = alarmSound === 'beep' ? '' : `/sounds/${alarmSound}.mp3`;
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
      } catch { /* 무시 */ }
    }
  }, [alarmSound]);

  // 다음 페이즈로 자동 전환
  const nextPhase = useCallback(() => {
    playAlarm();
    if (phase === 'focus') {
      const newCount = count + 1;
      setCount(newCount);
      onConfigChange({ ...config, pomodoroCount: newCount });
      if (newCount % 4 === 0) {
        setPhase('longBreak');
        setTotalSeconds(longBreakMin * 60);
      } else {
        setPhase('break');
        setTotalSeconds(breakMin * 60);
      }
    } else {
      setPhase('focus');
      setTotalSeconds(focusMin * 60);
    }
    setIsRunning(true);
  }, [phase, count, focusMin, breakMin, longBreakMin, playAlarm, config, onConfigChange]);

  useEffect(() => {
    if (isRunning && totalSeconds > 0) {
      intervalRef.current = window.setInterval(() => {
        setTotalSeconds((prev) => {
          if (prev <= 1) {
            nextPhase();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isRunning, nextPhase]);

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const phaseTotal = getPhaseSeconds(phase);
  const progress = phaseTotal > 0 ? totalSeconds / phaseTotal : 0;

  const radius = 90;
  const circumference = 2 * Math.PI * radius;
  const strokeOffset = circumference * (1 - progress);
  const phaseColor = PHASE_COLORS[phase];

  const reset = () => {
    setIsRunning(false);
    setPhase('focus');
    setTotalSeconds(focusMin * 60);
    setCount(0);
    onConfigChange({ ...config, pomodoroCount: 0 });
  };

  // 설정 화면
  if (showSetup) {
    return (
      <div ref={containerRef} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', width: '100%' }}>
        <div style={{ transform: `scale(${containerScale})`, transformOrigin: 'center center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center' }}>
            <p style={{ fontSize: 18, fontWeight: 700, color: '#1e293b' }}>뽀모도로 설정</p>
            {[
              { label: '집중 시간', key: 'focusMin', value: focusMin },
              { label: '휴식 시간', key: 'breakMin', value: breakMin },
              { label: '긴 휴식', key: 'longBreakMin', value: longBreakMin },
            ].map((item) => (
              <div key={item.key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 14, color: '#64748b', width: 80, textAlign: 'right' }}>{item.label}</span>
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={item.value}
                  onChange={(e) => {
                    onConfigChange({ ...config, [item.key]: Number(e.target.value) || 1 });
                    if (item.key === 'focusMin' && phase === 'focus' && !isRunning) setTotalSeconds(Number(e.target.value) * 60);
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  style={{
                    width: 60, padding: '6px 10px', border: '2px solid #e2e8f0', borderRadius: 8,
                    fontSize: 16, textAlign: 'center', outline: 'none',
                  }}
                />
                <span style={{ fontSize: 13, color: '#94a3b8' }}>분</span>
              </div>
            ))}
            <button
              onClick={() => setShowSetup(false)}
              style={{
                marginTop: 8, padding: '10px 24px', borderRadius: 10, border: 'none',
                background: '#6366f1', color: '#fff', fontSize: 16, fontWeight: 600, cursor: 'pointer',
              }}
            >
              확인
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', width: '100%' }}>
      <div style={{ transform: `scale(${containerScale})`, transformOrigin: 'center center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          {/* 페이즈 표시 */}
          <div style={{
            fontSize: 16, fontWeight: 700, color: phaseColor,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span>{phase === 'focus' ? '🍅' : phase === 'break' ? '☕' : '🎉'}</span>
            {PHASE_LABELS[phase]}
          </div>

          {/* 원형 프로그래스 */}
          <div style={{ position: 'relative' }}>
            <svg width="200" height="200" viewBox="0 0 200 200">
              <circle cx="100" cy="100" r={radius} fill="none" stroke="#e8e8ef" strokeWidth="8" />
              <circle
                cx="100" cy="100" r={radius} fill="none"
                stroke={phaseColor} strokeWidth="8" strokeLinecap="round"
                strokeDasharray={circumference} strokeDashoffset={strokeOffset}
                transform="rotate(-90 100 100)"
                style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s' }}
              />
            </svg>
            {/* 시간 표시 */}
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{
                fontSize: 48, fontWeight: 700, fontFamily: 'monospace',
                color: '#1e293b', fontVariantNumeric: 'tabular-nums',
              }}>
                {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
              </span>
            </div>
          </div>

          {/* 뽀모도로 카운트 */}
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <span key={i} style={{
                fontSize: 20,
                opacity: i < (count % 4) ? 1 : 0.2,
                transition: 'opacity 0.3s',
              }}>
                🍅
              </span>
            ))}
            {count >= 4 && (
              <span style={{ fontSize: 14, color: '#64748b', marginLeft: 4 }}>×{Math.floor(count / 4)}</span>
            )}
          </div>

          {/* 버튼 */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => setIsRunning(!isRunning)}
              style={{
                width: 48, height: 48, borderRadius: '50%', border: 'none',
                background: isRunning ? '#fef2f2' : `${phaseColor}15`,
                color: isRunning ? '#ef4444' : phaseColor,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s',
              }}
            >
              {isRunning ? <IoStop size={22} /> : <IoPlay size={22} style={{ marginLeft: 2 }} />}
            </button>
            <button
              onClick={reset}
              style={{
                width: 48, height: 48, borderRadius: '50%', border: 'none',
                background: '#f1f5f9', color: '#64748b', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <IoRefresh size={20} />
            </button>
            <button
              onClick={() => setShowSetup(true)}
              style={{
                width: 48, height: 48, borderRadius: '50%', border: 'none',
                background: '#f1f5f9', color: '#64748b', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18,
              }}
            >
              ⚙
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
