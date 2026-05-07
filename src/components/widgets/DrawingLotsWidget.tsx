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

// Fisher-Yates 셔플로 당첨/꽝 배치 생성 (true=당첨, false=꽝)
function makeAssignment(total: number, blanks: number): boolean[] {
  const arr: boolean[] = [];
  for (let i = 0; i < total - blanks; i++) arr.push(true);
  for (let i = 0; i < blanks; i++) arr.push(false);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export default function DrawingLotsWidget({ config, onConfigChange }: Props) {
  const count = (config.count as number) || 0;
  const blankCount = (config.blankCount as number) || 0;
  const drawn: number[] = (config.drawn as number[]) || [];
  const assignment: boolean[] = (config.assignment as boolean[]) || [];

  const [showInput, setShowInput] = useState(!count);
  const [editCount, setEditCount] = useState(count || 25);
  const [editBlanks, setEditBlanks] = useState(blankCount || 5);
  const [drawnPosition, setDrawnPosition] = useState<number | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [confettiKey, setConfettiKey] = useState(0);
  const timersRef = useRef<number[]>([]);

  // 그리드 크기 동적 계산
  const PAPER_W = 50;
  const PAPER_H = 60;
  const GRID_GAP = 8;
  const cols = count <= 7 ? Math.max(2, count) : 7;
  const rows = count > 0 ? Math.ceil(count / cols) : 1;
  const gridH = rows * PAPER_H + Math.max(0, rows - 1) * GRID_GAP;

  const innerW = showInput ? 380 : 440;
  const innerH = showInput ? 380 : 80 + gridH + 100;

  const { containerRef, scale } = useContainerScale(innerW, innerH);

  // count/blankCount가 바뀌었거나 assignment 길이 안 맞으면 재셔플
  useEffect(() => {
    if (count > 0 && assignment.length !== count) {
      onConfigChange({ ...config, assignment: makeAssignment(count, blankCount), drawn: [] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, blankCount]);

  useEffect(() => {
    if (count) setShowInput(false);
  }, [count]);

  useEffect(() => {
    if (count) setEditCount(count);
    setEditBlanks(blankCount);
  }, [count, blankCount]);

  useEffect(() => {
    return () => timersRef.current.forEach(clearTimeout);
  }, []);

  const handlePaperClick = (position: number) => {
    // 펼쳐지는 중(lifting/unfolding)에는 차단
    if (phase === 'lifting' || phase === 'unfolding') return;

    // 이미 뽑힌 종이를 누르면: 리빌 닫고 idle로 (다음 뽑기 준비)
    if (drawn.includes(position)) {
      if (phase === 'reveal') {
        timersRef.current.forEach(clearTimeout);
        timersRef.current = [];
        setDrawnPosition(null);
        setPhase('idle');
      }
      return;
    }

    // 새 종이 뽑기
    setDrawnPosition(position);
    setPhase('lifting');

    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    const t = (ms: number, fn: () => void) =>
      timersRef.current.push(window.setTimeout(fn, ms));

    t(400, () => setPhase('unfolding'));
    t(1500, () => {
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
    onConfigChange({
      ...config,
      drawn: [],
      assignment: makeAssignment(count, blankCount),
    });
  };

  const handleSubmit = () => {
    const validCount = Math.max(2, Math.min(99, editCount));
    const validBlanks = Math.max(0, Math.min(validCount - 1, editBlanks));
    onConfigChange({
      ...config,
      count: validCount,
      blankCount: validBlanks,
      drawn: [],
      assignment: makeAssignment(validCount, validBlanks),
    });
    setShowInput(false);
    setDrawnPosition(null);
    setPhase('idle');
  };

  const remainingCount = count - drawn.length;
  const isWinner =
    drawnPosition !== null && assignment[drawnPosition] === true;
  const drawnPaperColor =
    drawnPosition !== null
      ? PAPER_COLORS[drawnPosition % PAPER_COLORS.length]
      : '#fde68a';
  const allDrawn = remainingCount === 0;

  // ─── 입력 화면 ───
  if (showInput) {
    const isValid =
      editCount >= 2 && editCount <= 99 &&
      editBlanks >= 0 && editBlanks < editCount;
    return (
      <div ref={containerRef} style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100%', width: '100%', overflow: 'hidden',
      }}>
        <div style={{
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: 14, width: 380,
        }}>
          <p style={{
            fontFamily: "'Do Hyeon', sans-serif",
            fontSize: 26, color: '#7c3aed', margin: 0,
          }}>🎫 제비뽑기</p>

          {/* 전체 인원수 */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>전체 종이 수 (2~99)</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                onClick={() => setEditCount((c) => Math.max(2, c - 1))}
                onMouseDown={(e) => e.stopPropagation()}
                style={countBtnStyle}
              >−</button>
              <input
                type="number"
                min={2}
                max={99}
                value={editCount}
                onChange={(e) => setEditCount(Number(e.target.value) || 0)}
                onMouseDown={(e) => e.stopPropagation()}
                onKeyDown={(e) => { if (e.key === 'Enter' && isValid) handleSubmit(); }}
                style={countInputStyle}
              />
              <button
                onClick={() => setEditCount((c) => Math.min(99, c + 1))}
                onMouseDown={(e) => e.stopPropagation()}
                style={countBtnStyle}
              >+</button>
            </div>
          </div>

          {/* 꽝 개수 */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
              꽝 개수 (0 ~ {Math.max(0, editCount - 1)})
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                onClick={() => setEditBlanks((b) => Math.max(0, b - 1))}
                onMouseDown={(e) => e.stopPropagation()}
                style={{ ...countBtnStyle, background: '#fef2f2', color: '#dc2626' }}
              >−</button>
              <input
                type="number"
                min={0}
                max={editCount - 1}
                value={editBlanks}
                onChange={(e) => setEditBlanks(Number(e.target.value) || 0)}
                onMouseDown={(e) => e.stopPropagation()}
                onKeyDown={(e) => { if (e.key === 'Enter' && isValid) handleSubmit(); }}
                style={{ ...countInputStyle, color: '#dc2626' }}
              />
              <button
                onClick={() => setEditBlanks((b) => Math.min(editCount - 1, b + 1))}
                onMouseDown={(e) => e.stopPropagation()}
                style={{ ...countBtnStyle, background: '#fef2f2', color: '#dc2626' }}
              >+</button>
            </div>
          </div>

          <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
            <b style={{ color: '#7c3aed' }}>통과 {Math.max(0, editCount - editBlanks)}개</b>
            {' / '}
            <b style={{ color: '#dc2626' }}>꽝 {editBlanks}개</b>
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

        {/* 통계 */}
        <div style={{
          position: 'absolute', top: 38, left: 0, right: 0, textAlign: 'center',
          fontSize: 13, color: '#64748b',
        }}>
          남은 종이: <b style={{ color: '#7c3aed' }}>{remainingCount}</b> / {count}
          {' · '}
          꽝 {blankCount}개 포함
        </div>

        {/* 종이 그리드 */}
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
              const drawnIsWin = isDrawn && assignment[position] === true;

              return (
                <button
                  key={position}
                  onClick={() => handlePaperClick(position)}
                  onMouseDown={(e) => e.stopPropagation()}
                  disabled={
                    phase === 'lifting' || phase === 'unfolding' ||
                    (isDrawn && phase === 'idle')
                  }
                  style={{
                    width: PAPER_W,
                    height: PAPER_H,
                    background: 'transparent',
                    border: 'none',
                    padding: 0,
                    cursor:
                      phase === 'lifting' || phase === 'unfolding' ||
                      (isDrawn && phase === 'idle')
                        ? 'default'
                        : 'pointer',
                    transform: isLifting
                      ? `translateY(-60px) scale(0.55) rotate(${tilt * 4}deg)`
                      : `rotate(${tilt}deg)`,
                    opacity: isHidden ? 0 : 1,
                    transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s',
                    transformOrigin: 'center center',
                    filter: isDrawn ? 'none' : 'drop-shadow(0 4px 6px rgba(0,0,0,0.18))',
                  }}
                  onMouseEnter={(e) => {
                    if (!isDrawn && (phase === 'idle' || phase === 'reveal')) {
                      e.currentTarget.style.transform = `translateY(-8px) rotate(${tilt}deg) scale(1.08)`;
                      e.currentTarget.style.filter = 'drop-shadow(0 10px 14px rgba(0,0,0,0.28))';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isDrawn && (phase === 'idle' || phase === 'reveal')) {
                      e.currentTarget.style.transform = `rotate(${tilt}deg)`;
                      e.currentTarget.style.filter = 'drop-shadow(0 4px 6px rgba(0,0,0,0.18))';
                    }
                  }}
                >
                  <PaperNote color={color} isDrawn={isDrawn} drawnIsWin={drawnIsWin} />
                </button>
              );
            })}
          </div>
        </div>

        {/* 펼쳐지는 종이 — 봉투 열기 스타일 */}
        {(phase === 'unfolding' || phase === 'reveal') && drawnPosition !== null && (
          <div style={{
            position: 'absolute',
            left: '50%', top: '50%',
            transform: 'translate(-50%, -50%)',
            perspective: '1000px',
            pointerEvents: 'none',
            zIndex: 5,
          }}>
            <div style={{
              width: 280,
              height: 130,
              position: 'relative',
              transformStyle: 'preserve-3d',
              animation: 'lotsPaperPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
            }}>
              {/* 본체 — 결과(통과/꽝) 얼굴 + 라벨 */}
              <div style={{
                position: 'absolute', inset: 0,
                background: isWinner ? '#fef3c7' : '#475569',
                borderRadius: 12,
                boxShadow: isWinner
                  ? '0 14px 28px rgba(0,0,0,0.25), 0 0 24px rgba(251,191,36,0.4)'
                  : '0 14px 28px rgba(0,0,0,0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 14,
                animation: phase === 'reveal' && !isWinner
                  ? 'lotsBlankShake 0.5s 0.3s ease-out'
                  : 'none',
              }}>
                <div style={{
                  opacity: phase === 'reveal' ? 1 : 0,
                  transform: phase === 'reveal' ? 'scale(1)' : 'scale(0.4)',
                  transition: 'opacity 0.3s 0.6s, transform 0.4s 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  display: 'flex', alignItems: 'center', gap: 14,
                }}>
                  <span style={{
                    fontSize: 84,
                    lineHeight: 1,
                    filter: isWinner
                      ? 'drop-shadow(0 4px 12px rgba(251,191,36,0.6))'
                      : 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
                  }}>
                    {isWinner ? '😄' : '😭'}
                  </span>
                  <span style={{
                    fontFamily: "'Do Hyeon', sans-serif",
                    fontSize: 56,
                    fontWeight: 700,
                    color: isWinner ? '#92400e' : '#fff',
                    textShadow: isWinner
                      ? '0 2px 8px rgba(251,191,36,0.6)'
                      : '0 2px 4px rgba(0,0,0,0.3)',
                    letterSpacing: isWinner ? 0 : 4,
                  }}>
                    {isWinner ? '통과!' : '꽝'}
                  </span>
                </div>
              </div>

              {/* 윗 플랩 */}
              <div style={{
                position: 'absolute',
                top: 0, left: 0,
                width: '100%', height: '50%',
                background: drawnPaperColor,
                borderRadius: '12px 12px 0 0',
                transformOrigin: 'top',
                animation: 'lotsFlapTopOpen 0.7s 0.3s cubic-bezier(0.55, 0.085, 0.68, 0.53) forwards',
                backfaceVisibility: 'hidden',
                overflow: 'hidden',
                boxShadow: '0 6px 12px rgba(0,0,0,0.15)',
              }}>
                <svg width="100%" height="260%" viewBox="0 0 280 130"
                  style={{ position: 'absolute', top: 0, left: 0 }}>
                  <line x1="20" y1="15" x2="260" y2="115"
                    stroke="rgba(255,255,255,0.85)" strokeWidth="3" strokeLinecap="round" />
                  <line x1="260" y1="15" x2="20" y2="115"
                    stroke="rgba(255,255,255,0.85)" strokeWidth="3" strokeLinecap="round" />
                </svg>
              </div>

              {/* 아랫 플랩 */}
              <div style={{
                position: 'absolute',
                bottom: 0, left: 0,
                width: '100%', height: '50%',
                background: drawnPaperColor,
                borderRadius: '0 0 12px 12px',
                transformOrigin: 'bottom',
                animation: 'lotsFlapBottomOpen 0.7s 0.4s cubic-bezier(0.55, 0.085, 0.68, 0.53) forwards',
                backfaceVisibility: 'hidden',
                overflow: 'hidden',
                boxShadow: '0 6px 12px rgba(0,0,0,0.15)',
              }}>
                <svg width="100%" height="260%" viewBox="0 0 280 130"
                  style={{ position: 'absolute', bottom: 0, left: 0 }}>
                  <line x1="20" y1="15" x2="260" y2="115"
                    stroke="rgba(255,255,255,0.85)" strokeWidth="3" strokeLinecap="round" />
                  <line x1="260" y1="15" x2="20" y2="115"
                    stroke="rgba(255,255,255,0.85)" strokeWidth="3" strokeLinecap="round" />
                </svg>
              </div>
            </div>
          </div>
        )}

        {/* 색종이 폭발 — 당첨일 때만 */}
        {phase === 'reveal' && isWinner && (
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
                    left: '50%', top: '50%',
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

        {/* 액션 버튼 */}
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
              style={smallBtnStyle}
            >
              <IoRefresh size={16} /> 초기화
            </button>
          )}

          {(phase === 'idle' || phase === 'reveal') && (
            <button
              onClick={() => setShowInput(true)}
              onMouseDown={(e) => e.stopPropagation()}
              style={smallBtnStyle}
            >
              <IoCreate size={16} /> 설정 변경
            </button>
          )}
        </div>
      </div>

      <style>{`
        @keyframes lotsPaperPop {
          0% {
            transform: scale(0.4);
            opacity: 0;
          }
          70% {
            transform: scale(1.05);
            opacity: 1;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
        @keyframes lotsFlapTopOpen {
          0% { transform: rotateX(0deg); }
          100% { transform: rotateX(-180deg); }
        }
        @keyframes lotsFlapBottomOpen {
          0% { transform: rotateX(0deg); }
          100% { transform: rotateX(180deg); }
        }
        @keyframes lotsBlankShake {
          0%, 100% { transform: translateX(0); }
          15% { transform: translateX(-8px) rotate(-1.5deg); }
          30% { transform: translateX(8px) rotate(1.5deg); }
          45% { transform: translateX(-6px) rotate(-1deg); }
          60% { transform: translateX(6px) rotate(1deg); }
          75% { transform: translateX(-3px); }
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

// ─── 공유 스타일 ───
const countBtnStyle: React.CSSProperties = {
  width: 50, height: 50, borderRadius: '50%',
  border: 'none', background: '#f1f5f9', color: '#475569',
  fontSize: 26, fontWeight: 700, cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};

const countInputStyle: React.CSSProperties = {
  width: 100, padding: '10px 6px',
  border: '2px solid #e2e8f0',
  borderRadius: 10,
  fontSize: 36, fontWeight: 700, textAlign: 'center',
  fontFamily: "'Do Hyeon', sans-serif",
  color: '#7c3aed',
  outline: 'none',
};

const smallBtnStyle: React.CSSProperties = {
  padding: '10px 18px',
  background: '#f1f5f9',
  color: '#64748b',
  border: 'none',
  borderRadius: 10,
  fontSize: 14,
  cursor: 'pointer',
  display: 'flex', alignItems: 'center', gap: 6,
};

// ─── 쪽지(종이접기 X자 모양) ───
function PaperNote({ color, isDrawn, drawnIsWin }: {
  color: string;
  isDrawn: boolean;
  drawnIsWin: boolean;
}) {
  if (isDrawn) {
    // 뽑힌 자리 — 결과에 따라 이모지/라벨 다름 (SVG로 동일 크기 유지)
    return (
      <svg width="46" height="60" viewBox="0 0 46 60" style={{ display: 'block' }}>
        <rect x="3" y="5" width="40" height="50" rx="4"
          fill={drawnIsWin ? '#fef9c3' : '#e2e8f0'}
          stroke={drawnIsWin ? '#fbbf24' : '#cbd5e1'}
          strokeWidth="1.2"
          strokeDasharray="3 2"
        />
        {/* 이모지 */}
        <text x="23" y="32" textAnchor="middle"
          fontSize="20"
          style={{ dominantBaseline: 'middle' }}>
          {drawnIsWin ? '😄' : '😭'}
        </text>
        {/* 라벨 */}
        <text x="23" y="50" textAnchor="middle"
          fontSize="9" fontWeight="700"
          fill={drawnIsWin ? '#ca8a04' : '#64748b'}
          fontFamily="'Do Hyeon', sans-serif">
          {drawnIsWin ? '통과' : '꽝'}
        </text>
      </svg>
    );
  }

  return (
    <svg width="46" height="60" viewBox="0 0 46 60" style={{ display: 'block', overflow: 'visible' }}>
      <g transform="translate(34, 44) rotate(28)">
        <rect x="-11" y="-6" width="22" height="12" fill={color} rx="1" />
      </g>
      <rect x="5" y="5" width="36" height="36" fill={color} rx="2" />
      <line x1="5" y1="5" x2="41" y2="41"
        stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.95" />
      <line x1="41" y1="5" x2="5" y2="41"
        stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.95" />
      <rect x="5" y="5" width="36" height="36"
        fill="none" stroke="rgba(0,0,0,0.1)" strokeWidth="0.5" rx="2" />
    </svg>
  );
}
