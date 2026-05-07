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
  const PAPER_W = 50;
  const PAPER_H = 60;
  const GRID_GAP = 8;
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
    // 펼침 애니메이션: 종이 확대 + X자 페이드 0.7초
    t(1100, () => {
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

        {/* 펼쳐지는 종이 — 작게 접힌 상태에서 크게 펼쳐지며 X자가 흐려짐 */}
        {(phase === 'unfolding' || phase === 'reveal') && drawnPosition !== null && (
          <div style={{
            position: 'absolute',
            left: '50%', top: '50%',
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
            zIndex: 5,
          }}>
            <svg viewBox="0 0 320 150" width="320" height="150" style={{ display: 'block' }}>
              {/* 본체 - 작게 시작해서 크게 펼침 */}
              <rect x="0" y="0" width="320" height="150" rx="12"
                fill={drawnPaperColor}
                style={{
                  transformOrigin: '160px 75px',
                  transformBox: 'fill-box',
                  animation: 'lotsPaperGrow 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
                  filter: 'drop-shadow(0 14px 28px rgba(0,0,0,0.25))',
                }}
              />

              {/* X자 접힘선 — 펼쳐지면서 흐려져 사라짐 */}
              <g style={{
                animation: 'lotsFoldsFade 0.5s 0.15s ease-out forwards',
                transformOrigin: '160px 75px',
                transformBox: 'fill-box',
              }}>
                <line x1="40" y1="20" x2="280" y2="130"
                  stroke="white" strokeWidth="3" strokeLinecap="round" />
                <line x1="280" y1="20" x2="40" y2="130"
                  stroke="white" strokeWidth="3" strokeLinecap="round" />
              </g>

              {/* 숫자 — 펼친 후 등장 */}
              <text x="160" y="92" textAnchor="middle"
                fontSize="56" fontWeight="700"
                fill="#1e293b" fontFamily="'Do Hyeon', sans-serif"
                style={{
                  opacity: phase === 'reveal' ? 1 : 0,
                  transformOrigin: '160px 75px',
                  transformBox: 'fill-box',
                  animation: phase === 'reveal' ? 'lotsNumberShow 0.5s ease-out' : 'none',
                }}
              >
                {drawnNumber}번
              </text>
            </svg>
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
        @keyframes lotsPaperGrow {
          0% {
            transform: scale(0.18, 0.4);
            opacity: 0.5;
          }
          50% {
            transform: scale(1.06, 1.04);
            opacity: 1;
          }
          100% {
            transform: scale(1, 1);
            opacity: 1;
          }
        }
        @keyframes lotsFoldsFade {
          0% { opacity: 1; transform: scale(0.3); }
          50% { opacity: 0.8; transform: scale(1); }
          100% { opacity: 0; transform: scale(1.2); }
        }
        @keyframes lotsNumberShow {
          0% { opacity: 0; transform: scale(0.4); }
          60% { transform: scale(1.15); }
          100% { opacity: 1; transform: scale(1); }
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

// ─── 쪽지(종이접기 X자 모양) ───
// 한국식 접은 종이: X자 접힘선 + 꼬리 부분 (46×60)
function PaperNote({ color, isDrawn }: { color: string; isDrawn: boolean }) {
  if (isDrawn) {
    return (
      <svg width="46" height="60" viewBox="0 0 46 60" style={{ display: 'block' }}>
        <rect x="5" y="5" width="36" height="36"
          fill="#f8fafc"
          stroke="#cbd5e1"
          strokeWidth="1.2"
          strokeDasharray="3 2"
          rx="2"
        />
      </svg>
    );
  }

  return (
    <svg width="46" height="60" viewBox="0 0 46 60" style={{ display: 'block', overflow: 'visible' }}>
      {/* 꼬리 (오른쪽 아래 비스듬히 튀어나온 작은 사각형) — 본체보다 먼저 그려서 뒤에 배치 */}
      <g transform="translate(34, 44) rotate(28)">
        <rect x="-11" y="-6" width="22" height="12" fill={color} rx="1" />
      </g>

      {/* 메인 정사각 본체 */}
      <rect x="5" y="5" width="36" height="36" fill={color} rx="2" />

      {/* X자 접힘선 (흰색) */}
      <line x1="5" y1="5" x2="41" y2="41"
        stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.95" />
      <line x1="41" y1="5" x2="5" y2="41"
        stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.95" />

      {/* 본체 윤곽 살짝 강조 */}
      <rect x="5" y="5" width="36" height="36"
        fill="none" stroke="rgba(0,0,0,0.1)" strokeWidth="0.5" rx="2" />
    </svg>
  );
}
