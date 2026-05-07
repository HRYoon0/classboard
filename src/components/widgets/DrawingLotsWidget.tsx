import { useState, useEffect, useRef } from 'react';
import { IoRefresh, IoCreate, IoSparkles } from 'react-icons/io5';
import { useContainerScale } from '../../hooks/useContainerScale';

interface Props {
  config: Record<string, unknown>;
  onConfigChange: (config: Record<string, unknown>) => void;
}

type Phase = 'idle' | 'lifting' | 'unfolding' | 'reveal';

const PAPER_COLORS = [
  '#fde68a', '#fecaca', '#bbf7d0', '#bfdbfe',
  '#e9d5ff', '#fbcfe8', '#fed7aa', '#a5f3fc',
  '#d9f99d', '#fef3c7', '#ddd6fe', '#fed7e2',
];

// Fisher-Yates 셔플
function shuffle(n: number): number[] {
  const arr = Array.from({ length: n }, (_, i) => i);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export default function DrawingLotsWidget({ config, onConfigChange }: Props) {
  const count = (config.count as number) || 0;
  const drawn: number[] = (config.drawn as number[]) || [];
  const assignment: number[] = (config.assignment as number[]) || [];

  const [showInput, setShowInput] = useState(!count);
  const [editCount, setEditCount] = useState(count || 25);
  const [drawnPosition, setDrawnPosition] = useState<number | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [confettiKey, setConfettiKey] = useState(0);
  const timersRef = useRef<number[]>([]);

  // 인원수에 따라 그리드 크기 동적 계산 (위젯 크기 조절과 연동)
  const PAPER_W = 46;
  const PAPER_H = 70;
  const GRID_GAP = 6;
  const cols = count <= 7 ? Math.max(2, count) : 7;
  const rows = count > 0 ? Math.ceil(count / cols) : 1;
  const gridH = rows * PAPER_H + Math.max(0, rows - 1) * GRID_GAP;

  // 화면 모드에 따른 base 치수
  const innerW = showInput ? 380 : 440;
  const innerH = showInput ? 360 : 80 + gridH + 100;

  const { containerRef, scale } = useContainerScale(innerW, innerH);

  // count가 설정되어 있는데 assignment가 없거나 길이가 안 맞으면 재셔플
  useEffect(() => {
    if (count > 0 && assignment.length !== count) {
      onConfigChange({ ...config, assignment: shuffle(count), drawn: [] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count]);

  // 클라우드 로드로 인원수가 설정되면 결과 화면으로 자동 전환
  useEffect(() => {
    if (count) setShowInput(false);
  }, [count]);

  useEffect(() => {
    if (count) setEditCount(count);
  }, [count]);

  useEffect(() => {
    return () => timersRef.current.forEach(clearTimeout);
  }, []);

  const handlePaperClick = (position: number) => {
    if (drawn.includes(position) || phase !== 'idle') return;

    setDrawnPosition(position);
    setPhase('lifting');

    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    const t = (ms: number, fn: () => void) =>
      timersRef.current.push(window.setTimeout(fn, ms));

    t(400, () => setPhase('unfolding'));
    t(900, () => {
      setPhase('reveal');
      setConfettiKey((k) => k + 1);
      onConfigChange({ ...config, drawn: [...drawn, position] });
    });
  };

  const handleNext = () => {
    setDrawnPosition(null);
    setPhase('idle');
  };

  const handleResetAll = () => {
    setDrawnPosition(null);
    setPhase('idle');
    onConfigChange({ ...config, drawn: [], assignment: shuffle(count) });
  };

  const handleSubmit = () => {
    const validCount = Math.max(2, Math.min(99, editCount));
    onConfigChange({ ...config, count: validCount, drawn: [], assignment: shuffle(validCount) });
    setShowInput(false);
    setDrawnPosition(null);
    setPhase('idle');
  };

  const remainingCount = count - drawn.length;
  const drawnNumber =
    drawnPosition !== null && assignment[drawnPosition] !== undefined
      ? assignment[drawnPosition] + 1
      : 0;
  const drawnPaperColor =
    drawnPosition !== null
      ? PAPER_COLORS[drawnPosition % PAPER_COLORS.length]
      : '#fde68a';

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

          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button
              onClick={() => setEditCount((c) => Math.max(2, c - 1))}
              onMouseDown={(e) => e.stopPropagation()}
              style={{
                width: 56, height: 56, borderRadius: '50%',
                border: 'none', background: '#f1f5f9', color: '#475569',
                fontSize: 28, fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >−</button>
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
                border: 'none', background: '#f1f5f9', color: '#475569',
                fontSize: 28, fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >+</button>
          </div>

          <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
            <b style={{ color: '#7c3aed', fontFamily: "'Do Hyeon', sans-serif" }}>
              1번 ~ {Math.max(2, Math.min(99, editCount))}번
            </b>{' '}
            중에서 직접 뽑아요
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
  const allDrawn = remainingCount === 0;

  return (
    <div ref={containerRef} style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100%', width: '100%', overflow: 'hidden',
    }}>
      <div style={{
        transform: `scale(${scale})`,
        transformOrigin: 'center center',
        position: 'relative',
        width: innerW, height: innerH,
      }}>
        {/* 제목 */}
        <div style={{
          position: 'absolute', top: 6, left: 0, right: 0, textAlign: 'center',
          fontSize: 22, fontWeight: 700, color: '#7c3aed',
          fontFamily: "'Do Hyeon', sans-serif",
        }}>
          🎫 제비뽑기
        </div>

        {/* 남은 인원 */}
        <div style={{
          position: 'absolute', top: 38, left: 0, right: 0, textAlign: 'center',
          fontSize: 13, color: '#64748b',
        }}>
          남은 종이: <b style={{ color: '#7c3aed' }}>{remainingCount}</b> / {count}
        </div>

        {/* 종이(쪽지) 그리드 */}
        <div style={{
          position: 'absolute',
          top: 70, left: 0, right: 0,
          display: 'flex', justifyContent: 'center',
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${cols}, ${PAPER_W}px)`,
            gap: GRID_GAP,
          }}>
            {assignment.map((_, position) => {
              const isDrawn = drawn.includes(position);
              const isLifting = drawnPosition === position && phase === 'lifting';
              const isHidden = drawnPosition === position && (phase === 'unfolding' || phase === 'reveal');
              const colorIdx = position % PAPER_COLORS.length;
              const color = PAPER_COLORS[colorIdx];
              const tilt = ((position * 13) % 9) - 4;

              return (
                <button
                  key={position}
                  onClick={() => handlePaperClick(position)}
                  onMouseDown={(e) => e.stopPropagation()}
                  disabled={isDrawn || phase !== 'idle'}
                  style={{
                    width: PAPER_W,
                    height: PAPER_H,
                    background: 'transparent',
                    border: 'none',
                    padding: 0,
                    cursor: isDrawn || phase !== 'idle' ? 'default' : 'pointer',
                    transform: isLifting
                      ? `translateY(-60px) scale(0.55) rotate(${tilt * 4}deg)`
                      : `rotate(${tilt}deg)`,
                    opacity: isHidden ? 0 : 1,
                    transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s',
                    transformOrigin: 'center center',
                    filter: isDrawn ? 'none' : 'drop-shadow(0 4px 6px rgba(0,0,0,0.18))',
                  }}
                  onMouseEnter={(e) => {
                    if (!isDrawn && phase === 'idle') {
                      e.currentTarget.style.transform = `translateY(-8px) rotate(${tilt}deg) scale(1.08)`;
                      e.currentTarget.style.filter = 'drop-shadow(0 10px 14px rgba(0,0,0,0.28))';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isDrawn && phase === 'idle') {
                      e.currentTarget.style.transform = `rotate(${tilt}deg)`;
                      e.currentTarget.style.filter = 'drop-shadow(0 4px 6px rgba(0,0,0,0.18))';
                    }
                  }}
                >
                  <PaperNote color={color} isDrawn={isDrawn} />
                </button>
              );
            })}
          </div>
        </div>

        {/* 가운데 펼쳐진 종이 (unfolding/reveal) */}
        {(phase === 'unfolding' || phase === 'reveal') && drawnPosition !== null && (
          <div style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            marginLeft: -160,
            marginTop: -65,
            width: 320,
            height: 130,
            background: drawnPaperColor,
            borderRadius: 14,
            boxShadow: '0 18px 40px rgba(0,0,0,0.28)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transformOrigin: 'center center',
            animation: phase === 'unfolding'
              ? 'lotsPaperUnfold 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) forwards'
              : 'lotsPaperRevealPop 0.4s ease-out',
            zIndex: 5,
          }}>
            <span style={{
              fontFamily: "'Do Hyeon', sans-serif",
              fontSize: 56,
              fontWeight: 700,
              color: '#1e293b',
              textShadow: '0 2px 4px rgba(0,0,0,0.1)',
              opacity: phase === 'reveal' ? 1 : 0,
              transform: phase === 'reveal' ? 'scale(1)' : 'scale(0.4)',
              transition: 'opacity 0.35s 0.15s, transform 0.4s 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)',
              whiteSpace: 'nowrap',
            }}>
              {drawnNumber}번
            </span>
          </div>
        )}

        {/* 색종이 폭발 */}
        {phase === 'reveal' && (
          <div key={confettiKey} style={{
            position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 6,
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
                    top: '50%',
                    width: 9, height: 14,
                    background: color,
                    borderRadius: 2,
                    transform: 'translate(-50%, -50%)',
                    animation: `lotsConfettiFly 0.9s ease-out forwards`,
                    animationDelay: `${i * 0.008}s`,
                    ['--tx' as string]: `${tx}px`,
                    ['--ty' as string]: `${ty}px`,
                  } as React.CSSProperties}
                />
              );
            })}
          </div>
        )}

        {/* 모두 뽑기 완료 */}
        {phase === 'idle' && allDrawn && count > 0 && (
          <div style={{
            position: 'absolute',
            top: '40%', left: 0, right: 0, textAlign: 'center',
          }}>
            <IoSparkles size={48} style={{ color: '#fbbf24' }} />
            <p style={{
              fontFamily: "'Do Hyeon', sans-serif",
              fontSize: 22, color: '#7c3aed',
              margin: '8px 0 0',
            }}>모두 뽑았어요!</p>
          </div>
        )}

        {/* 안내 문구 */}
        {phase === 'idle' && !allDrawn && (
          <div style={{
            position: 'absolute', bottom: 70, left: 0, right: 0, textAlign: 'center',
            fontSize: 13, color: '#94a3b8',
          }}>
            원하는 종이를 클릭하세요
          </div>
        )}

        {/* 액션 버튼들 */}
        <div style={{
          position: 'absolute', bottom: 16, left: 0, right: 0,
          display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap',
        }}>
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
              다음 뽑기
            </button>
          )}

          {drawn.length > 0 && (phase === 'idle' || phase === 'reveal') && (
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
              <IoCreate size={16} /> 인원수 변경
            </button>
          )}
        </div>
      </div>

      <style>{`
        .lots-paper-shine {
          mix-blend-mode: overlay;
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

// ─── 쪽지(풍선/구슬 모양) 컴포넌트 ───
// 네이버 제비뽑기 스타일: 위에 매듭 + 둥근 본체 (46×70)
function PaperNote({ color, isDrawn }: { color: string; isDrawn: boolean }) {
  if (isDrawn) {
    return (
      <div style={{ position: 'relative', width: 46, height: 70 }}>
        <div style={{
          position: 'absolute',
          top: 14, left: 3,
          width: 40, height: 54,
          border: '1.5px dashed #cbd5e1',
          borderRadius: '50% 50% 45% 45% / 35% 35% 50% 50%',
          background: '#f8fafc',
        }} />
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: 46, height: 70 }}>
      {/* 매듭 (위쪽 작은 공) */}
      <div style={{
        position: 'absolute',
        top: 0, left: '50%', marginLeft: -5,
        width: 10, height: 10,
        background: '#8b6f47',
        borderRadius: '50%',
        boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
      }}>
        {/* 매듭 빛 반사 */}
        <div style={{
          position: 'absolute',
          top: 2, left: 2,
          width: 3, height: 3,
          background: 'rgba(255,255,255,0.5)',
          borderRadius: '50%',
        }} />
      </div>

      {/* 끈 (매듭과 본체 연결) */}
      <div style={{
        position: 'absolute',
        top: 9, left: '50%', marginLeft: -1,
        width: 2, height: 8,
        background: '#8b6f47',
      }} />

      {/* 본체 (풍선/구슬 모양) */}
      <div style={{
        position: 'absolute',
        top: 15, left: 3,
        width: 40, height: 53,
        background: color,
        borderRadius: '50% 50% 45% 45% / 35% 35% 50% 50%',
        boxShadow: '0 4px 8px rgba(0,0,0,0.18), inset 0 -4px 8px rgba(0,0,0,0.07)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 16,
        fontWeight: 700,
        color: 'rgba(0,0,0,0.32)',
        fontFamily: "'Do Hyeon', sans-serif",
        overflow: 'hidden',
      }}>
        {/* 빛 반사 */}
        <div style={{
          position: 'absolute',
          top: 6, left: 6,
          width: 9, height: 14,
          background: 'rgba(255,255,255,0.4)',
          borderRadius: '50%',
          filter: 'blur(0.5px)',
        }} />
        ?
      </div>
    </div>
  );
}
