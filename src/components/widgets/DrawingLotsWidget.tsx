import { useState, useEffect, useRef } from 'react';
import { IoTicket, IoRefresh, IoCreate, IoSparkles } from 'react-icons/io5';
import { useContainerScale } from '../../hooks/useContainerScale';

interface Props {
  config: Record<string, unknown>;
  onConfigChange: (config: Record<string, unknown>) => void;
}

type Phase = 'idle' | 'shaking' | 'rising' | 'unfolding' | 'reveal';

const PAPER_COLORS = [
  '#fde68a', '#fecaca', '#bbf7d0', '#bfdbfe',
  '#e9d5ff', '#fbcfe8', '#fed7aa', '#a5f3fc',
  '#d9f99d', '#fef3c7', '#ddd6fe', '#fed7e2',
];

export default function DrawingLotsWidget({ config, onConfigChange }: Props) {
  const count = (config.count as number) || 0;
  const drawn: number[] = (config.drawn as number[]) || [];
  const [showInput, setShowInput] = useState(!count);
  const [editCount, setEditCount] = useState(count || 25);
  const [drawnIdx, setDrawnIdx] = useState<number | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [confettiKey, setConfettiKey] = useState(0);
  const timersRef = useRef<number[]>([]);
  const { containerRef, scale } = useContainerScale(420, 460);

  // 이름 배열을 인원수에서 동적 생성 ("1번", "2번", ...)
  const names = Array.from({ length: count }, (_, i) => `${i + 1}번`);
  const remaining = names.map((_, i) => i).filter((i) => !drawn.includes(i));

  // 클라우드 로드로 인원수가 설정되면 결과 화면으로 자동 전환
  useEffect(() => {
    if (count) setShowInput(false);
  }, [count]);

  // 인원수가 외부에서 바뀌면 편집값 동기화
  useEffect(() => {
    if (count) setEditCount(count);
  }, [count]);

  useEffect(() => {
    return () => timersRef.current.forEach(clearTimeout);
  }, []);

  const handleDraw = () => {
    if (remaining.length === 0 || phase !== 'idle') return;

    const choice = remaining[Math.floor(Math.random() * remaining.length)];

    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];

    const t = (ms: number, fn: () => void) =>
      timersRef.current.push(window.setTimeout(fn, ms));

    setPhase('shaking');

    t(1100, () => {
      setDrawnIdx(choice);
      setPhase('rising');
    });
    t(1900, () => setPhase('unfolding'));
    t(2500, () => {
      setPhase('reveal');
      setConfettiKey((k) => k + 1);
      onConfigChange({ ...config, drawn: [...drawn, choice] });
    });
  };

  const handleNext = () => {
    setDrawnIdx(null);
    setPhase('idle');
  };

  const handleResetAll = () => {
    setDrawnIdx(null);
    setPhase('idle');
    onConfigChange({ ...config, drawn: [] });
  };

  const handleSubmit = () => {
    const validCount = Math.max(2, Math.min(99, editCount));
    onConfigChange({ ...config, count: validCount, drawn: [] });
    setShowInput(false);
    setDrawnIdx(null);
    setPhase('idle');
  };

  const totalCount = names.length;
  const remainingCount = remaining.length;
  const drawnPaperColor =
    drawnIdx !== null ? PAPER_COLORS[drawnIdx % PAPER_COLORS.length] : '#fde68a';
  const drawnName = drawnIdx !== null ? names[drawnIdx] : '';

  // ─── 입력 화면 ───
  if (showInput) {
    const isValid = editCount >= 2 && editCount <= 99;
    return (
      <div ref={containerRef} style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100%', width: '100%', overflow: 'hidden',
      }}>
        <div style={{
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: 18, width: 380,
        }}>
          <p style={{
            fontFamily: "'Do Hyeon', sans-serif",
            fontSize: 26, color: '#7c3aed', margin: 0,
          }}>🎫 제비뽑기</p>
          <p style={{ fontSize: 14, color: '#64748b', margin: 0 }}>
            인원수를 입력하세요 (2 ~ 99)
          </p>

          {/* 인원수 조절 (- / 숫자 / +) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button
              onClick={() => setEditCount((c) => Math.max(2, c - 1))}
              onMouseDown={(e) => e.stopPropagation()}
              style={{
                width: 56, height: 56, borderRadius: '50%',
                border: 'none',
                background: '#f1f5f9',
                color: '#475569',
                fontSize: 28, fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#e2e8f0'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#f1f5f9'; }}
            >
              −
            </button>
            <input
              type="number"
              min={2}
              max={99}
              value={editCount}
              onChange={(e) => setEditCount(Number(e.target.value) || 0)}
              onMouseDown={(e) => e.stopPropagation()}
              onKeyDown={(e) => { if (e.key === 'Enter' && isValid) handleSubmit(); }}
              style={{
                width: 120, padding: '14px 8px',
                border: '2px solid #e2e8f0',
                borderRadius: 12,
                fontSize: 44, fontWeight: 700, textAlign: 'center',
                fontFamily: "'Do Hyeon', sans-serif",
                color: '#7c3aed',
                outline: 'none',
              }}
            />
            <button
              onClick={() => setEditCount((c) => Math.min(99, c + 1))}
              onMouseDown={(e) => e.stopPropagation()}
              style={{
                width: 56, height: 56, borderRadius: '50%',
                border: 'none',
                background: '#f1f5f9',
                color: '#475569',
                fontSize: 28, fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#e2e8f0'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#f1f5f9'; }}
            >
              +
            </button>
          </div>

          <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
            <b style={{ color: '#7c3aed', fontFamily: "'Do Hyeon', sans-serif" }}>
              1번 ~ {Math.max(2, Math.min(99, editCount))}번
            </b>{' '}
            중에서 무작위로 뽑아요
          </p>

          <button
            onClick={handleSubmit}
            disabled={!isValid}
            style={{
              padding: '12px 38px',
              background: !isValid
                ? '#cbd5e1'
                : 'linear-gradient(135deg, #8b5cf6, #6366f1)',
              color: 'white',
              border: 'none',
              borderRadius: 12,
              fontSize: 18,
              fontWeight: 700,
              fontFamily: "'Do Hyeon', sans-serif",
              cursor: !isValid ? 'default' : 'pointer',
              boxShadow: isValid ? '0 6px 16px rgba(139,92,246,0.4)' : 'none',
            }}
          >
            시작하기
          </button>
        </div>
      </div>
    );
  }

  // ─── 추첨 화면 ───
  return (
    <div ref={containerRef} style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100%', width: '100%', overflow: 'hidden',
    }}>
      <div style={{
        transform: `scale(${scale})`,
        transformOrigin: 'center center',
        position: 'relative',
        width: 420, height: 460,
      }}>
        {/* 제목 */}
        <div style={{
          position: 'absolute', top: 8, left: 0, right: 0, textAlign: 'center',
          fontSize: 22, fontWeight: 700, color: '#7c3aed',
          fontFamily: "'Do Hyeon', sans-serif",
        }}>
          🎫 제비뽑기
        </div>

        {/* 남은 인원 */}
        <div style={{
          position: 'absolute', top: 42, left: 0, right: 0, textAlign: 'center',
          fontSize: 13, color: '#64748b',
        }}>
          남은 인원: <b style={{ color: '#7c3aed' }}>{remainingCount}</b> / {totalCount}
        </div>

        {/* 제비뽑기 통 (idle/shaking) */}
        {(phase === 'idle' || phase === 'shaking') && (
          <div style={{
            position: 'absolute',
            top: 80, left: '50%',
            width: 280, height: 200,
            marginLeft: -140,
            background: 'linear-gradient(to bottom, #f1f5f9 0%, #cbd5e1 100%)',
            border: '5px solid #94a3b8',
            borderRadius: '14px 14px 30px 30px',
            boxShadow: '0 12px 28px rgba(0,0,0,0.18), inset 0 -8px 16px rgba(0,0,0,0.1)',
            overflow: 'hidden',
            animation: phase === 'shaking' ? 'lotsJarShake 0.12s linear infinite' : 'none',
          }}>
            {/* 통 입구 그림자 */}
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0,
              height: 22,
              background: 'linear-gradient(to bottom, rgba(0,0,0,0.25), transparent)',
              pointerEvents: 'none',
            }} />

            {/* 통 안의 종이들 */}
            {names.map((_, i) => {
              if (drawn.includes(i)) return null;
              const col = i % 6;
              const row = Math.floor(i / 6) % 4;
              const rotate = ((i * 17) % 30) - 15;
              return (
                <div key={i} style={{
                  position: 'absolute',
                  left: 18 + col * 42,
                  top: 36 + row * 38,
                  width: 36, height: 30,
                  background: PAPER_COLORS[i % PAPER_COLORS.length],
                  borderRadius: 4,
                  boxShadow: '0 2px 5px rgba(0,0,0,0.15)',
                  backgroundImage:
                    'linear-gradient(135deg, transparent 49%, rgba(0,0,0,0.08) 50%, transparent 51%)',
                  transform: `rotate(${rotate}deg)`,
                }} />
              );
            })}

            {/* 통 라벨 */}
            <div style={{
              position: 'absolute', bottom: 14, left: 0, right: 0, textAlign: 'center',
              fontSize: 12, color: '#475569', fontWeight: 700,
              fontFamily: "'Do Hyeon', sans-serif",
              letterSpacing: 2,
            }}>
              제비뽑기 통
            </div>
          </div>
        )}

        {/* 날아오르는 종이 (rising 단계만) */}
        {phase === 'rising' && drawnIdx !== null && (
          <div style={{
            position: 'absolute',
            left: '50%',
            width: 70,
            height: 56,
            background: drawnPaperColor,
            borderRadius: 6,
            boxShadow: '0 16px 36px rgba(0,0,0,0.25)',
            backgroundImage:
              'linear-gradient(135deg, transparent 49%, rgba(0,0,0,0.12) 50%, transparent 51%)',
            animation: 'lotsPaperRise 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
          }} />
        )}

        {/* 펼쳐진 종이 + 이름 (unfolding/reveal) */}
        {(phase === 'unfolding' || phase === 'reveal') && drawnIdx !== null && (
          <div style={{
            position: 'absolute',
            left: '50%',
            top: 145,
            width: 320,
            height: 130,
            marginLeft: -160,
            background: drawnPaperColor,
            borderRadius: 14,
            boxShadow: '0 18px 40px rgba(0,0,0,0.28)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transformOrigin: 'center center',
            animation: phase === 'unfolding'
              ? 'lotsPaperUnfold 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) forwards'
              : 'lotsPaperRevealPop 0.4s ease-out',
          }}>
            <span style={{
              fontFamily: "'Do Hyeon', sans-serif",
              fontSize: 44,
              fontWeight: 700,
              color: '#1e293b',
              textShadow: '0 2px 4px rgba(0,0,0,0.1)',
              opacity: phase === 'reveal' ? 1 : 0,
              transform: phase === 'reveal' ? 'scale(1)' : 'scale(0.4)',
              transition: 'opacity 0.35s 0.15s, transform 0.4s 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '88%',
            }}>
              {drawnName}
            </span>
          </div>
        )}

        {/* 색종이 폭발 (reveal) */}
        {phase === 'reveal' && (
          <div key={confettiKey} style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
          }}>
            {Array.from({ length: 32 }).map((_, i) => {
              const angle = (i / 32) * 360 + Math.random() * 20;
              const distance = 110 + Math.random() * 90;
              const tx = Math.cos((angle * Math.PI) / 180) * distance;
              const ty = Math.sin((angle * Math.PI) / 180) * distance;
              const color = PAPER_COLORS[i % PAPER_COLORS.length];
              return (
                <div
                  key={i}
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: 220,
                    width: 9, height: 14,
                    background: color,
                    borderRadius: 2,
                    transform: 'translate(-50%, -50%)',
                    animation: `lotsConfettiFly 0.9s ease-out forwards`,
                    animationDelay: `${i * 0.008}s`,
                    // CSS 변수로 도착 위치 전달
                    ['--tx' as string]: `${tx}px`,
                    ['--ty' as string]: `${ty}px`,
                  } as React.CSSProperties}
                />
              );
            })}
          </div>
        )}

        {/* 모두 뽑기 완료 메시지 */}
        {phase === 'idle' && remainingCount === 0 && totalCount > 0 && (
          <div style={{
            position: 'absolute',
            top: 150, left: 0, right: 0, textAlign: 'center',
          }}>
            <IoSparkles size={48} style={{ color: '#fbbf24' }} />
            <p style={{
              fontFamily: "'Do Hyeon', sans-serif",
              fontSize: 22, color: '#7c3aed',
              margin: '12px 0 0',
            }}>
              모두 뽑았어요!
            </p>
            <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0' }}>
              초기화 버튼으로 다시 시작할 수 있어요
            </p>
          </div>
        )}

        {/* 액션 버튼들 */}
        <div style={{
          position: 'absolute', bottom: 20, left: 0, right: 0,
          display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap',
        }}>
          {phase === 'idle' && remainingCount > 0 && (
            <button
              onClick={handleDraw}
              onMouseDown={(e) => e.stopPropagation()}
              style={{
                padding: '14px 38px',
                background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                color: 'white',
                border: 'none',
                borderRadius: 14,
                fontSize: 19,
                fontWeight: 700,
                fontFamily: "'Do Hyeon', sans-serif",
                cursor: 'pointer',
                boxShadow: '0 8px 20px rgba(139,92,246,0.45)',
                display: 'flex', alignItems: 'center', gap: 8,
                transition: 'transform 0.15s, box-shadow 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px) scale(1.03)';
                e.currentTarget.style.boxShadow = '0 12px 26px rgba(139,92,246,0.55)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                e.currentTarget.style.boxShadow = '0 8px 20px rgba(139,92,246,0.45)';
              }}
            >
              <IoTicket size={24} />
              뽑기
            </button>
          )}

          {phase === 'reveal' && remainingCount > 0 && (
            <button
              onClick={handleNext}
              onMouseDown={(e) => e.stopPropagation()}
              style={{
                padding: '12px 28px',
                background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                color: 'white',
                border: 'none',
                borderRadius: 12,
                fontSize: 17,
                fontWeight: 700,
                fontFamily: "'Do Hyeon', sans-serif",
                cursor: 'pointer',
                boxShadow: '0 6px 16px rgba(139,92,246,0.4)',
              }}
            >
              한 번 더
            </button>
          )}

          {(phase === 'idle' || phase === 'reveal') && drawn.length > 0 && (
            <button
              onClick={handleResetAll}
              onMouseDown={(e) => e.stopPropagation()}
              style={{
                padding: '10px 18px',
                background: '#f1f5f9',
                color: '#64748b',
                border: 'none',
                borderRadius: 10,
                fontSize: 14,
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              <IoRefresh size={16} /> 초기화
            </button>
          )}

          {(phase === 'idle' || phase === 'reveal') && (
            <button
              onClick={() => setShowInput(true)}
              onMouseDown={(e) => e.stopPropagation()}
              style={{
                padding: '10px 18px',
                background: '#f1f5f9',
                color: '#64748b',
                border: 'none',
                borderRadius: 10,
                fontSize: 14,
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              <IoCreate size={16} /> 수정
            </button>
          )}
        </div>
      </div>

      <style>{`
        @keyframes lotsJarShake {
          0%, 100% { transform: translateX(0) rotate(0); }
          20% { transform: translateX(-5px) rotate(-2.5deg); }
          40% { transform: translateX(5px) rotate(2.5deg); }
          60% { transform: translateX(-4px) rotate(-2deg); }
          80% { transform: translateX(4px) rotate(2deg); }
        }
        @keyframes lotsPaperRise {
          0% {
            top: 220px;
            transform: translateX(-50%) rotate(0deg) scale(0.55);
            opacity: 0;
          }
          15% { opacity: 1; }
          60% {
            top: 110px;
            transform: translateX(-50%) rotate(540deg) scale(1.3);
          }
          100% {
            top: 130px;
            transform: translateX(-50%) rotate(720deg) scale(1.2);
            opacity: 0;
          }
        }
        @keyframes lotsPaperUnfold {
          0% {
            transform: scaleX(0.18) scaleY(0.95);
            opacity: 0.7;
          }
          50% {
            transform: scaleX(1.05) scaleY(1.02);
            opacity: 1;
          }
          100% {
            transform: scaleX(1) scaleY(1);
            opacity: 1;
          }
        }
        @keyframes lotsPaperRevealPop {
          0% { transform: scale(0.96); }
          50% { transform: scale(1.04); }
          100% { transform: scale(1); }
        }
        @keyframes lotsConfettiFly {
          0% {
            transform: translate(-50%, -50%) rotate(0);
            opacity: 1;
          }
          100% {
            transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) rotate(720deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
