import { useState, useRef } from 'react';

const DOT_PATTERNS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [[25, 25], [75, 75]],
  3: [[25, 25], [50, 50], [75, 75]],
  4: [[25, 25], [75, 25], [25, 75], [75, 75]],
  5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
  6: [[25, 25], [75, 25], [25, 50], [75, 50], [25, 75], [75, 75]],
};

function DiceFace({ value, size = 160, style }: { value: number; size?: number; style?: React.CSSProperties }) {
  const dots = DOT_PATTERNS[value] || [];
  return (
    <div style={style}>
      <svg width={size} height={size} viewBox="0 0 100 100">
        <rect x="2" y="2" width="96" height="96" rx="14" fill="white" stroke="#e2e8f0" strokeWidth="2" />
        {dots.map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r="9" fill="#1e293b" />
        ))}
      </svg>
    </div>
  );
}

// 단순화: 올라감 → 내려옴 → 콩콩콩
type Phase = 'idle' | 'up' | 'down' | 'b1' | 'b1down' | 'b2' | 'b2down' | 'b3' | 'settle' | 'done';

export default function DiceWidget() {
  const [diceCount, setDiceCount] = useState(1);
  const [values, setValues] = useState<number[]>([1]);
  const [isRolling, setIsRolling] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const timers = useRef<number[]>([]);
  const shuffleRef = useRef<number>(0);

  const roll = () => {
    if (isRolling) return;
    setIsRolling(true);
    timers.current.forEach(clearTimeout);
    timers.current = [];

    shuffleRef.current = window.setInterval(() => {
      setValues(Array.from({ length: diceCount }, () => Math.floor(Math.random() * 6) + 1));
    }, 40);

    const t = (ms: number, fn: () => void) => timers.current.push(window.setTimeout(fn, ms));

    // 올라감
    setPhase('up');
    // 내려옴
    t(600, () => setPhase('down'));
    // 콩 1 (높게)
    t(850, () => setPhase('b1'));
    t(1000, () => setPhase('b1down'));
    // 콩 2 (중간)
    t(1120, () => setPhase('b2'));
    t(1220, () => setPhase('b2down'));
    // 콩 3 (살짝)
    t(1300, () => setPhase('b3'));
    // 안정
    t(1400, () => {
      clearInterval(shuffleRef.current);
      setValues(Array.from({ length: diceCount }, () => Math.floor(Math.random() * 6) + 1));
      setPhase('settle');
    });
    // 완료
    t(1600, () => {
      setPhase('done');
      setIsRolling(false);
      try {
        const audio = new Audio('/sounds/alarm4.mp3');
        audio.volume = 0.3;
        audio.play().catch(() => {});
      } catch { /* 무시 */ }
    });
  };

  const total = values.reduce((a, b) => a + b, 0);
  const diceSize = diceCount > 2 ? 90 : 160;

  const getDiceStyle = (index: number): React.CSSProperties => {
    const xOff = (index - (diceCount - 1) / 2) * 8;
    const rotDir = index % 2 === 0 ? 1 : -1;
    const rotAmount = 8 + (index * 5) % 7;

    switch (phase) {
      case 'up':
        return {
          transform: `translateY(-250px) scale(0.85)`,
          opacity: 0.6,
          transition: 'transform 0.6s cubic-bezier(0.33, 1, 0.68, 1), opacity 0.3s',
        };
      case 'down':
        return {
          transform: `translateY(0px) translateX(${xOff}px) rotate(${rotDir * rotAmount}deg) scale(1.08)`,
          opacity: 1,
          transition: 'transform 0.25s cubic-bezier(0.55, 0, 1, 0.45), opacity 0.1s',
        };
      case 'b1':
        return {
          transform: `translateY(-80px) translateX(${xOff}px) rotate(${rotDir * -rotAmount * 0.6}deg) scale(1)`,
          transition: 'transform 0.15s cubic-bezier(0.33, 1, 0.68, 1)',
        };
      case 'b1down':
        return {
          transform: `translateY(0px) translateX(${xOff}px) rotate(${rotDir * rotAmount * 0.4}deg) scale(1.04)`,
          transition: 'transform 0.12s cubic-bezier(0.55, 0, 1, 0.45)',
        };
      case 'b2':
        return {
          transform: `translateY(-35px) translateX(${xOff}px) rotate(${rotDir * -rotAmount * 0.2}deg) scale(1)`,
          transition: 'transform 0.1s cubic-bezier(0.33, 1, 0.68, 1)',
        };
      case 'b2down':
        return {
          transform: `translateY(0px) translateX(${xOff}px) rotate(${rotDir * rotAmount * 0.1}deg) scale(1.02)`,
          transition: 'transform 0.08s cubic-bezier(0.55, 0, 1, 0.45)',
        };
      case 'b3':
        return {
          transform: `translateY(-10px) translateX(${xOff}px) rotate(0deg) scale(1)`,
          transition: 'transform 0.08s cubic-bezier(0.33, 1, 0.68, 1)',
        };
      case 'settle':
        return {
          transform: `translateY(0) translateX(${xOff * 0.5}px) rotate(0deg) scale(1)`,
          transition: 'transform 0.15s ease-out',
        };
      case 'done':
        return {
          transform: 'translateY(0) rotate(0deg) scale(1)',
          transition: 'transform 0.2s ease',
        };
      default:
        return {
          transform: 'translateY(0) rotate(0deg) scale(1)',
          transition: 'transform 0.3s ease',
        };
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '12px', overflow: 'hidden', position: 'relative' }}>
      <div style={{
        display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center',
        minHeight: `${diceSize + 40}px`, alignItems: 'center',
      }}>
        {values.map((v, i) => (
          <DiceFace key={i} value={v} size={diceSize} style={getDiceStyle(i)} />
        ))}
      </div>

      {diceCount > 1 && (
        <p style={{
          fontSize: '20px', color: '#64748b', fontFamily: 'monospace', fontWeight: 600,
          opacity: phase === 'done' || phase === 'idle' || phase === 'settle' ? 1 : 0.3,
          transition: 'opacity 0.3s',
        }}>
          합계: {total}
        </p>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ display: 'flex', gap: '6px' }}>
          {[1, 2, 3].map((n) => (
            <button
              key={n}
              onClick={() => { setDiceCount(n); setValues(Array(n).fill(1)); setPhase('idle'); }}
              style={{
                width: '40px', height: '40px', borderRadius: '8px', border: 'none',
                fontSize: '18px', fontWeight: 700, cursor: 'pointer',
                background: diceCount === n ? '#6366f1' : '#f1f5f9',
                color: diceCount === n ? 'white' : '#475569',
                transition: 'all 0.15s',
              }}
            >
              {n}
            </button>
          ))}
        </div>
        <button
          onClick={roll}
          disabled={isRolling}
          style={{
            padding: '10px 24px', borderRadius: '10px', border: 'none',
            background: isRolling ? '#a5b4fc' : '#6366f1',
            color: 'white', fontSize: '20px', fontWeight: 600,
            cursor: isRolling ? 'default' : 'pointer',
            transform: isRolling ? 'scale(0.95)' : 'scale(1)',
            transition: 'transform 0.15s',
          }}
        >
          🎲 굴리기!
        </button>
      </div>
    </div>
  );
}
