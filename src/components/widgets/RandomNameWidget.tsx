import { useState, useRef, useCallback, useEffect } from 'react';

interface Props {
  config: Record<string, unknown>;
  onConfigChange: (config: Record<string, unknown>) => void;
}

const CONFETTI_COLORS = ['#6366f1', '#f43f5e', '#22c55e', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899', '#fbbf24'];

export default function RandomNameWidget({ config, onConfigChange }: Props) {
  const nameList = (config.names as string) || '';
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [finalName, setFinalName] = useState<string | null>(null);
  const [phase, setPhase] = useState<'idle' | 'spinning' | 'slowing' | 'result'>('idle');
  const [showInput, setShowInput] = useState(!nameList);
  const [confettiWave, setConfettiWave] = useState(0);
  const [spinColor, setSpinColor] = useState('#94a3b8');
  const timeoutChain = useRef<number[]>([]);

  // 클라우드 로드로 이름 목록이 채워지면 결과 화면으로 자동 전환
  useEffect(() => {
    if (nameList) setShowInput(false);
  }, [nameList]);

  const names = nameList
    .split('\n')
    .map((n) => n.trim())
    .filter(Boolean);

  const spawnConfetti = useCallback(() => {
    setConfettiWave((w) => w + 1);
    // 2차 파티클 (0.5초 후)
    setTimeout(() => setConfettiWave((w) => w + 1), 500);
  }, []);

  const spin = useCallback(() => {
    if (names.length === 0) return;

    timeoutChain.current.forEach(clearTimeout);
    timeoutChain.current = [];

    setPhase('spinning');
    setFinalName(null);

    const totalSteps = 25 + Math.floor(Math.random() * 10);
    let delay = 30;
    let accumulated = 0;

    for (let i = 0; i < totalSteps; i++) {
      accumulated += delay;
      const step = i;
      const t = window.setTimeout(() => {
        const randomIdx = Math.floor(Math.random() * names.length);
        setDisplayName(names[randomIdx]);

        // 스피닝 중 색상 변화
        setSpinColor(CONFETTI_COLORS[step % CONFETTI_COLORS.length]);

        // 후반부 감속 페이즈
        if (step > totalSteps * 0.7) {
          setPhase('slowing');
        }

        // 마지막
        if (step === totalSteps - 1) {
          const winner = names[Math.floor(Math.random() * names.length)];
          setDisplayName(winner);
          setFinalName(winner);
          setPhase('result');
          spawnConfetti();
          try {
            const audio = new Audio('/sounds/alarm4.mp3');
            audio.volume = 0.6;
            audio.play().catch(() => {});
          } catch { /* 무시 */ }
        }
      }, accumulated);
      timeoutChain.current.push(t);

      // 감속 커브
      if (i < totalSteps * 0.3) {
        delay += 5;
      } else if (i < totalSteps * 0.6) {
        delay += 20;
      } else if (i < totalSteps * 0.8) {
        delay += 60;
      } else {
        delay += 150;
      }
    }
  }, [names, spawnConfetti]);

  if (showInput || names.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '12px' }}>
        <textarea
          style={{
            flex: 1, width: '100%', padding: '14px', border: '2px solid #e2e8f0',
            borderRadius: '10px', fontSize: '18px', lineHeight: 1.6, resize: 'none',
            outline: 'none', color: '#334155', background: '#f8fafc', boxSizing: 'border-box',
          }}
          placeholder={'학생 이름을 한 줄에 하나씩 입력하세요\n예:\n김철수\n이영희\n박민수'}
          value={nameList}
          onChange={(e) => onConfigChange({ names: e.target.value })}
          onMouseDown={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        />
        <button
          onClick={() => names.length > 0 && setShowInput(false)}
          disabled={names.length === 0}
          style={{
            padding: '14px', borderRadius: '10px', border: 'none',
            background: names.length === 0 ? '#cbd5e1' : '#6366f1',
            color: 'white', fontSize: '18px', fontWeight: 600,
            cursor: names.length === 0 ? 'default' : 'pointer',
          }}
        >
          완료 ({names.length}명)
        </button>
      </div>
    );
  }

  const isAnimating = phase === 'spinning' || phase === 'slowing';

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: '100%', gap: '16px',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* 스피닝 배경 링 효과 */}
      {isAnimating && (
        <>
          <div style={{
            position: 'absolute', width: '300px', height: '300px',
            borderRadius: '50%', border: '3px solid',
            borderColor: `${spinColor} transparent ${spinColor} transparent`,
            animation: 'spin-ring 0.6s linear infinite',
            opacity: 0.2, pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute', width: '240px', height: '240px',
            borderRadius: '50%', border: '2px solid',
            borderColor: `transparent ${spinColor} transparent ${spinColor}`,
            animation: 'spin-ring-reverse 0.8s linear infinite',
            opacity: 0.15, pointerEvents: 'none',
          }} />
        </>
      )}

      {/* 당첨 후 빛 효과 */}
      {phase === 'result' && (
        <>
          <div style={{
            position: 'absolute', width: '400px', height: '400px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 60%)',
            animation: 'result-glow 1.5s ease-out forwards',
            pointerEvents: 'none',
          }} />
          {/* 방사형 빛줄기 */}
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={`ray-${i}`} style={{
              position: 'absolute', width: '2px', height: '120px',
              background: `linear-gradient(to top, transparent, ${CONFETTI_COLORS[i % CONFETTI_COLORS.length]}40)`,
              transformOrigin: 'bottom center',
              transform: `rotate(${i * 30}deg)`,
              animation: `ray-burst 0.8s ease-out ${i * 0.03}s forwards`,
              opacity: 0, pointerEvents: 'none',
            }} />
          ))}
        </>
      )}

      {/* 컨페티 파티클들 */}
      {phase === 'result' && Array.from({ length: 60 }).map((_, i) => {
        const angle = (i / 60) * 360;
        const speed = 80 + Math.random() * 120;
        const tx = Math.cos(angle * Math.PI / 180) * speed;
        const ty = Math.sin(angle * Math.PI / 180) * speed - 50;
        return (
          <div key={`conf-${confettiWave}-${i}`} style={{
            position: 'absolute', left: '50%', top: '40%',
            width: `${4 + Math.random() * 6}px`,
            height: `${4 + Math.random() * 6}px`,
            backgroundColor: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
            borderRadius: i % 3 === 0 ? '50%' : i % 3 === 1 ? '1px' : '0',
            animation: `confetti-explode ${0.8 + Math.random() * 0.8}s ease-out forwards`,
            '--tx': `${tx}px`, '--ty': `${ty}px`,
            '--spin': `${Math.random() * 720 - 360}deg`,
            pointerEvents: 'none',
          } as React.CSSProperties} />
        );
      })}

      {/* 이름 표시 영역 */}
      <div style={{
        fontSize: phase === 'spinning' ? '48px' : phase === 'slowing' ? '56px' : '68px',
        fontWeight: 800,
        color: phase === 'result' ? '#6366f1' : isAnimating ? spinColor : '#1e293b',
        transition: phase === 'slowing' ? 'font-size 0.3s, color 0.1s' : 'none',
        animation: phase === 'result'
          ? 'winner-entrance 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards'
          : phase === 'spinning'
            ? 'name-shuffle 0.08s ease-in-out infinite'
            : phase === 'slowing'
              ? 'name-shuffle-slow 0.2s ease-in-out infinite'
              : 'none',
        textShadow: phase === 'result'
          ? '0 0 40px rgba(99,102,241,0.4), 0 4px 20px rgba(99,102,241,0.2)'
          : isAnimating
            ? `0 0 20px ${spinColor}40`
            : 'none',
        zIndex: 2,
      }}>
        {displayName || '?'}
      </div>

      {/* 당첨 표시 */}
      {phase === 'result' && (
        <div style={{
          fontSize: '22px', color: '#f59e0b', fontWeight: 700, zIndex: 2,
          animation: 'winner-badge 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s both',
          display: 'flex', alignItems: 'center', gap: '8px',
        }}>
          <span style={{ animation: 'star-spin 1s ease-out' }}>⭐</span>
          당첨!
          <span style={{ animation: 'star-spin 1s ease-out 0.2s both' }}>⭐</span>
        </div>
      )}

      {phase === 'idle' && !finalName && (
        <p style={{ fontSize: '16px', color: '#94a3b8' }}>{names.length}명 중 선택</p>
      )}

      <div style={{ display: 'flex', gap: '12px', zIndex: 2 }}>
        <button
          onClick={spin}
          disabled={isAnimating}
          style={{
            padding: '12px 28px', borderRadius: '10px', border: 'none',
            background: isAnimating ? '#a5b4fc' : '#6366f1',
            color: 'white', fontSize: '20px', fontWeight: 600,
            cursor: isAnimating ? 'default' : 'pointer',
            transform: isAnimating ? 'scale(0.95)' : 'scale(1)',
            transition: 'transform 0.15s',
          }}
        >
          {isAnimating ? '뽑는 중...' : phase === 'result' ? '🎯 다시 뽑기!' : '🎯 뽑기!'}
        </button>
        <button
          onClick={() => setShowInput(true)}
          style={{
            padding: '12px 20px', borderRadius: '10px', border: 'none',
            background: '#f1f5f9', color: '#475569', fontSize: '20px',
            fontWeight: 600, cursor: 'pointer',
          }}
        >
          수정
        </button>
      </div>

      <style>{`
        @keyframes spin-ring {
          to { transform: rotate(360deg); }
        }
        @keyframes spin-ring-reverse {
          to { transform: rotate(-360deg); }
        }
        @keyframes name-shuffle {
          0%, 100% { transform: translateY(0) scale(0.95); opacity: 1; }
          30% { transform: translateY(-8px) scale(1.0); opacity: 0.7; }
          70% { transform: translateY(8px) scale(0.9); opacity: 0.8; }
        }
        @keyframes name-shuffle-slow {
          0%, 100% { transform: translateY(0) scale(1); opacity: 1; }
          50% { transform: translateY(-4px) scale(1.02); opacity: 0.85; }
        }
        @keyframes winner-entrance {
          0% { transform: scale(0.3) rotateX(90deg); opacity: 0; }
          40% { transform: scale(1.3) rotateX(-10deg); opacity: 1; }
          70% { transform: scale(0.95) rotateX(5deg); }
          100% { transform: scale(1.1) rotateX(0deg); }
        }
        @keyframes winner-badge {
          0% { transform: scale(0) translateY(20px); opacity: 0; }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
        @keyframes star-spin {
          0% { transform: rotate(0deg) scale(0); }
          50% { transform: rotate(180deg) scale(1.3); }
          100% { transform: rotate(360deg) scale(1); }
        }
        @keyframes confetti-explode {
          0% { transform: translate(0, 0) rotate(0deg) scale(1); opacity: 1; }
          100% { transform: translate(var(--tx), var(--ty)) rotate(var(--spin)) scale(0); opacity: 0; }
        }
        @keyframes ray-burst {
          0% { opacity: 0; height: 0; }
          30% { opacity: 0.6; height: 120px; }
          100% { opacity: 0; height: 160px; }
        }
        @keyframes result-glow {
          0% { transform: scale(0); opacity: 0.8; }
          100% { transform: scale(1); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
