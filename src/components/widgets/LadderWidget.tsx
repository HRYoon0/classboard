import { useState, useEffect, useRef } from 'react';
import { IoRefresh, IoCreate } from 'react-icons/io5';
import { useContainerScale } from '../../hooks/useContainerScale';

interface Props {
  config: Record<string, unknown>;
  onConfigChange: (config: Record<string, unknown>) => void;
}

const LANE_COLORS = [
  '#fbbf24', '#fb923c', '#f87171', '#ec4899',
  '#a78bfa', '#60a5fa', '#34d399', '#fde047',
  '#22d3ee', '#84cc16', '#f97316', '#d946ef',
];

// 가로대(rungs) 생성 — Rejection sampling으로 빽빽 + 좋은 spread
function generateRungs(cols: number, rows: number): boolean[][] {
  if (cols < 2) return Array.from({ length: rows }, () => []);

  const buildRandom = (): boolean[][] => {
    const rungs: boolean[][] = [];
    for (let r = 0; r < rows; r++) {
      const row: boolean[] = new Array(cols - 1).fill(false);
      const startFromLeft = Math.random() < 0.5;
      if (startFromLeft) {
        for (let c = 0; c < cols - 1; c++) {
          if (c > 0 && row[c - 1]) continue;
          if (Math.random() < 0.65) row[c] = true;
        }
      } else {
        for (let c = cols - 2; c >= 0; c--) {
          if (c < cols - 2 && row[c + 1]) continue;
          if (Math.random() < 0.65) row[c] = true;
        }
      }
      rungs.push(row);
    }
    return rungs;
  };

  const computePerm = (rungs: boolean[][]): number[] => {
    const columns = Array.from({ length: cols }, (_, i) => i);
    for (const row of rungs) {
      for (let g = 0; g < cols - 1; g++) {
        if (row[g]) [columns[g], columns[g + 1]] = [columns[g + 1], columns[g]];
      }
    }
    const perm = new Array<number>(cols);
    for (let c = 0; c < cols; c++) perm[columns[c]] = c;
    return perm;
  };

  let bestRungs: boolean[][] | null = null;
  let bestScore = -Infinity;
  for (let attempt = 0; attempt < 30; attempt++) {
    const rungs = buildRandom();
    const perm = computePerm(rungs);
    const fixedPoints = perm.filter((v, i) => v === i).length;
    const avgDispl = perm.reduce((s, v, i) => s + Math.abs(v - i), 0) / perm.length;
    if (fixedPoints <= 1 && avgDispl >= cols / 3.5) return rungs;
    const score = avgDispl - fixedPoints * 2;
    if (score > bestScore) { bestScore = score; bestRungs = rungs; }
  }
  return bestRungs ?? buildRandom();
}

// 시작 컬럼에서 사다리를 따라 내려간 경로 추적
function computePath(startCol: number, rungs: boolean[][], cols: number): number[] {
  const path: number[] = [startCol];
  let col = startCol;
  for (let r = 0; r < rungs.length; r++) {
    if (col < cols - 1 && rungs[r][col]) col = col + 1;
    else if (col > 0 && rungs[r][col - 1]) col = col - 1;
    path.push(col);
  }
  return path;
}

// 결과 토스트에 표시할 메시지 포맷 (사용자가 자유롭게 정의 가능)
// 예: "철수 → 청소" / "철수님은 청소!" / "👤 철수 🎯 청소"
function formatResultMessage(topLabel: string, bottomLabel: string, idx: number): {
  top: string;
  bottom: string;
} {
  const safeTop = topLabel.trim() || `${idx + 1}번`;
  const safeBottom = bottomLabel.trim() || '(빈 칸)';
  return { top: safeTop, bottom: safeBottom };
}

type Phase = 'idle' | 'riding' | 'reveal';

export default function LadderWidget({ config, onConfigChange }: Props) {
  const count = (config.count as number) || 0;
  const rungs: boolean[][] = (config.rungs as boolean[][]) || [];
  const topLabels: string[] = (config.topLabels as string[]) || [];
  const bottomLabels: string[] = (config.bottomLabels as string[]) || [];
  const completed: number[] = (config.completed as number[]) || [];

  const [showInput, setShowInput] = useState(!count);
  const [editCount, setEditCount] = useState(count || 6);
  const [riderCol, setRiderCol] = useState<number | null>(null);
  const [riderStep, setRiderStep] = useState(0);
  const [phase, setPhase] = useState<Phase>('idle');
  const [revealLane, setRevealLane] = useState<number | null>(null);
  const timersRef = useRef<number[]>([]);
  const pointsRef = useRef<{ x: number; y: number }[]>([]);

  // 레이아웃 — 위/아래 박스가 있으니 LANE_W를 충분히 넓게
  const COLS = Math.max(2, Math.min(12, count));
  const LANE_W =
    COLS <= 4 ? 150 :
    COLS <= 6 ? 130 :
    COLS <= 8 ? 110 :
    COLS <= 10 ? 92 :
    78;
  const ROW_H = COLS <= 8 ? 30 : 25;
  const ROWS = Math.max(14, Math.floor(COLS * 1.8));
  const PADDING_X = 50;
  const PADDING_TOP = 24;
  const PADDING_BOTTOM = 24;
  const ladderW = (COLS - 1) * LANE_W + PADDING_X * 2;
  const ladderH = ROWS * ROW_H + PADDING_TOP + PADDING_BOTTOM;

  const BOX_W = LANE_W - 14;
  const BOX_H = 56;
  const DOT_R = 22;
  const DOT_GAP = 14; // 도트와 박스 사이 간격

  // 헤더(96: 제목+설명) + 도트(54) + 위박스(BOX_H+10) + 사다리 + 아래박스(BOX_H+10) + 안내(36) + 버튼(54) + 마진
  const innerW = showInput ? 420 : Math.max(520, ladderW + 40);
  const innerH = showInput
    ? 440
    : 96 + (DOT_R * 2 + DOT_GAP) + (BOX_H + 10) + ladderH + (BOX_H + 10) + 36 + 54 + 24;

  const { containerRef, scale } = useContainerScale(innerW, innerH);

  const xOf = (c: number) => PADDING_X + c * LANE_W;
  const yOf = (r: number) => PADDING_TOP + r * ROW_H;

  // count 변경 시 사다리/라벨 재생성
  useEffect(() => {
    if (count > 0) {
      const dimensionsOk =
        rungs.length === ROWS &&
        rungs.length > 0 &&
        rungs[0].length === Math.max(0, COLS - 1);
      const labelsOk = topLabels.length === count && bottomLabels.length === count;
      if (!dimensionsOk || !labelsOk) {
        onConfigChange({
          ...config,
          rungs: generateRungs(COLS, ROWS),
          topLabels: topLabels.length === count ? topLabels : Array.from({ length: count }, () => ''),
          bottomLabels: bottomLabels.length === count ? bottomLabels : Array.from({ length: count }, () => ''),
          completed: [],
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count]);

  useEffect(() => {
    if (count) setShowInput(false);
  }, [count]);

  useEffect(() => {
    if (count) setEditCount(count);
  }, [count]);

  useEffect(() => {
    return () => timersRef.current.forEach(clearTimeout);
  }, []);

  // 위/아래 박스 텍스트 변경
  const updateTopLabel = (idx: number, value: string) => {
    const next = [...topLabels];
    next[idx] = value;
    onConfigChange({ ...config, topLabels: next });
  };
  const updateBottomLabel = (idx: number, value: string) => {
    const next = [...bottomLabels];
    next[idx] = value;
    onConfigChange({ ...config, bottomLabels: next });
  };

  // 사다리 타기 시작
  const ride = (startCol: number) => {
    if (phase !== 'idle' || completed.includes(startCol)) return;
    const colPath = computePath(startCol, rungs, COLS);
    const points: { x: number; y: number }[] = [];
    points.push({ x: xOf(colPath[0]), y: yOf(0) - DOT_GAP });
    points.push({ x: xOf(colPath[0]), y: yOf(0) });
    for (let r = 0; r < colPath.length - 1; r++) {
      if (colPath[r] !== colPath[r + 1]) {
        points.push({ x: xOf(colPath[r + 1]), y: yOf(r) });
      }
      points.push({ x: xOf(colPath[r + 1]), y: yOf(r + 1) });
    }
    const endCol = colPath[colPath.length - 1];
    points.push({ x: xOf(endCol), y: yOf(ROWS) + DOT_GAP });
    pointsRef.current = points;
    setRiderCol(startCol);
    setRiderStep(0);
    setRevealLane(null);
    setPhase('riding');

    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    points.forEach((_, i) => {
      timersRef.current.push(window.setTimeout(() => setRiderStep(i), i * 180));
    });
    const totalDuration = points.length * 180;
    timersRef.current.push(
      window.setTimeout(() => {
        setRevealLane(endCol);
        setPhase('reveal');
        onConfigChange({ ...config, completed: [...completed, startCol] });
      }, totalDuration + 200)
    );
  };

  const dismissReveal = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    setRiderCol(null);
    setRiderStep(0);
    setRevealLane(null);
    setPhase('idle');
  };

  const handleResetAll = () => {
    dismissReveal();
    onConfigChange({
      ...config,
      rungs: generateRungs(COLS, ROWS),
      completed: [],
    });
  };

  const handleSubmit = () => {
    const validCount = Math.max(2, Math.min(12, editCount));
    const newRows = Math.max(14, Math.floor(validCount * 1.8));
    onConfigChange({
      ...config,
      count: validCount,
      rungs: generateRungs(validCount, newRows),
      topLabels: Array.from({ length: validCount }, () => ''),
      bottomLabels: Array.from({ length: validCount }, () => ''),
      completed: [],
    });
    setShowInput(false);
    dismissReveal();
  };

  // ─── 입력 화면 (네이버 메인 스타일) ───
  if (showInput) {
    const isValid = editCount >= 2 && editCount <= 12;
    return (
      <div ref={containerRef} style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100%', width: '100%', overflow: 'hidden',
      }}>
        <div style={{
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
          width: 420,
          height: 440,
          padding: '34px 28px',
          background: '#fffdf5',
          border: '2px dashed #cbd5e1',
          borderRadius: 18,
          boxShadow: '0 12px 28px rgba(0,0,0,0.08), inset 0 0 0 1px rgba(0,0,0,0.03)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18,
          fontFamily: "'Do Hyeon', sans-serif",
          position: 'relative',
        }}>
          {/* 노트 상단 줄 장식 */}
          <div style={{
            position: 'absolute', top: 14, left: 24, right: 24, height: 1,
            borderBottom: '1px dashed #e2e8f0',
          }} />

          <p style={{
            fontSize: 50, color: '#1e293b', margin: '12px 0 0 0',
            letterSpacing: '-1px',
            textShadow: '3px 3px 0 rgba(14,165,233,0.18)',
            fontFamily: "'Gaegu', sans-serif",
            fontWeight: 700,
          }}>
            🪜 사다리게임!
          </p>
          <p style={{ fontSize: 18, color: '#94a3b8', margin: 0, fontFamily: "'Gaegu', sans-serif" }}>
            인원수를 정하고 시작해보세요
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginTop: 12 }}>
            <p style={{ fontSize: 17, color: '#64748b', margin: 0, fontFamily: "'Gaegu', sans-serif" }}>참가 인원 (2~12명)</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <button
                onClick={() => setEditCount((c) => Math.max(2, c - 1))}
                onMouseDown={(e) => e.stopPropagation()}
                style={countBtnStyle}
              >−</button>
              <div style={{
                width: 90, height: 90, borderRadius: '50%',
                background: 'linear-gradient(135deg, #fef3c7, #fde68a)',
                border: '3px solid #fbbf24',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 48, fontWeight: 700, color: '#92400e',
                boxShadow: '0 6px 16px rgba(251,191,36,0.35)',
                fontFamily: "'Do Hyeon', sans-serif",
              }}>
                {editCount}
              </div>
              <button
                onClick={() => setEditCount((c) => Math.min(12, c + 1))}
                onMouseDown={(e) => e.stopPropagation()}
                style={countBtnStyle}
              >+</button>
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={!isValid}
            onMouseDown={(e) => e.stopPropagation()}
            style={{
              padding: '14px 56px',
              background: !isValid ? '#cbd5e1' : 'linear-gradient(135deg, #0ea5e9, #6366f1)',
              color: 'white',
              border: 'none',
              borderRadius: 14,
              fontSize: 22,
              fontWeight: 700,
              fontFamily: "'Do Hyeon', sans-serif",
              cursor: !isValid ? 'default' : 'pointer',
              boxShadow: isValid ? '0 8px 20px rgba(14,165,233,0.4)' : 'none',
              marginTop: 12,
              letterSpacing: '2px',
            }}
          >
            시작
          </button>
        </div>
      </div>
    );
  }

  // ─── 게임 화면 (네이버 스타일: 위/아래 박스 + 사다리) ───
  const remainingCount = count - completed.length;
  const allDone = remainingCount === 0;
  const currentPoint = pointsRef.current[Math.min(riderStep, pointsRef.current.length - 1)];
  const riderColor = riderCol !== null ? LANE_COLORS[riderCol % LANE_COLORS.length] : '#0ea5e9';
  const traveledPoints = pointsRef.current.slice(0, riderStep + 1);

  // SVG 위치 (도트 + 위박스 아래에 사다리)
  const ladderTop = 96 + (DOT_R * 2) + DOT_GAP + (BOX_H + 10);
  const topBoxY = 96 + (DOT_R * 2) + DOT_GAP;
  const bottomBoxY = ladderTop + ladderH + 10;

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
        background: '#fffdf5',
        border: '2px dashed #cbd5e1',
        borderRadius: 18,
        boxShadow: '0 12px 28px rgba(0,0,0,0.08)',
        fontFamily: "'Do Hyeon', sans-serif",
      }}>
        {/* 제목 */}
        <div style={{
          position: 'absolute', top: 12, left: 0, right: 0, textAlign: 'center',
          fontSize: 46, fontWeight: 700, color: '#1e293b',
          letterSpacing: '-0.5px',
          textShadow: '3px 3px 0 rgba(14,165,233,0.15)',
          fontFamily: "'Gaegu', sans-serif",
        }}>
          🪜 사다리게임!
        </div>

        {/* 통계 */}
        <div style={{
          position: 'absolute', top: 68, left: 0, right: 0, textAlign: 'center',
          fontSize: 18, color: '#64748b',
          fontFamily: "'Gaegu', sans-serif",
        }}>
          남은 사람 <b style={{ color: '#0ea5e9' }}>{remainingCount}</b> / {count}
        </div>

        {/* 상단 클릭 도트 (사다리 타기 트리거) — SVG 컨테이너 위에 별도 레이어 */}
        <div style={{
          position: 'absolute',
          top: 96,
          left: '50%',
          marginLeft: -ladderW / 2,
          width: ladderW,
          height: DOT_R * 2,
        }}>
          {Array.from({ length: COLS }).map((_, c) => {
            const isCompleted = completed.includes(c);
            const isCurrent = riderCol === c;
            const color = LANE_COLORS[c % LANE_COLORS.length];
            return (
              <button
                key={`top-dot-${c}`}
                onClick={() => ride(c)}
                onMouseDown={(e) => e.stopPropagation()}
                disabled={isCompleted || phase !== 'idle'}
                style={{
                  position: 'absolute',
                  left: xOf(c) - DOT_R,
                  top: 0,
                  width: DOT_R * 2,
                  height: DOT_R * 2,
                  borderRadius: '50%',
                  background: isCompleted ? '#e2e8f0' : color,
                  border: isCurrent ? `3px solid ${color}` : '2px solid rgba(0,0,0,0.1)',
                  boxShadow: !isCompleted && phase === 'idle' ? '0 4px 10px rgba(0,0,0,0.2)' : 'none',
                  cursor: !isCompleted && phase === 'idle' ? 'pointer' : 'default',
                  fontSize: 20,
                  fontWeight: 700,
                  color: isCompleted ? '#94a3b8' : '#1e293b',
                  fontFamily: "'Do Hyeon', sans-serif",
                  transition: 'all 0.2s',
                  padding: 0,
                }}
              >
                {c + 1}
              </button>
            );
          })}
        </div>

        {/* 위쪽 입력 박스 (참가자 이름) */}
        <div style={{
          position: 'absolute',
          top: topBoxY,
          left: '50%',
          marginLeft: -ladderW / 2,
          width: ladderW,
          height: BOX_H,
        }}>
          {Array.from({ length: COLS }).map((_, c) => (
            <input
              key={`top-input-${c}`}
              type="text"
              value={topLabels[c] ?? ''}
              onChange={(e) => updateTopLabel(c, e.target.value)}
              onMouseDown={(e) => e.stopPropagation()}
              placeholder={`참가자${c + 1}`}
              style={{
                position: 'absolute',
                left: xOf(c) - BOX_W / 2,
                top: 0,
                width: BOX_W,
                height: BOX_H,
                padding: '4px 6px',
                border: '2px solid #94a3b8',
                borderRadius: 8,
                background: '#fffef9',
                fontFamily: "'Gaegu', sans-serif",
                fontSize: 18,
                fontWeight: 700,
                color: '#1e293b',
                textAlign: 'center',
                outline: 'none',
                boxSizing: 'border-box',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#0ea5e9'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = '#94a3b8'; }}
            />
          ))}
        </div>

        {/* 사다리 SVG */}
        <div style={{
          position: 'absolute',
          top: ladderTop,
          left: '50%',
          marginLeft: -ladderW / 2,
        }}>
          <svg width={ladderW} height={ladderH} viewBox={`0 0 ${ladderW} ${ladderH}`}>
            {/* 가로대 — 안개 영역 숨김 */}
            {rungs.map((row, r) => {
              const fogStart = Math.max(1, Math.floor(ROWS * 0.18));
              const fogEnd = Math.min(ROWS - 1, Math.ceil(ROWS * 0.82));
              const inFog = r >= fogStart && r <= fogEnd;
              return row.map((hasRung, c) =>
                hasRung ? (
                  <line
                    key={`r${r}-${c}`}
                    x1={xOf(c)}
                    y1={yOf(r)}
                    x2={xOf(c + 1)}
                    y2={yOf(r)}
                    stroke="#94a3b8"
                    strokeWidth="3"
                    strokeLinecap="round"
                    opacity={inFog ? 0 : 1}
                  />
                ) : null
              );
            })}

            {/* 세로 기둥 */}
            {Array.from({ length: COLS }).map((_, c) => (
              <line
                key={`col-${c}`}
                x1={xOf(c)}
                y1={yOf(0) - DOT_GAP}
                x2={xOf(c)}
                y2={yOf(ROWS) + DOT_GAP}
                stroke="#cbd5e1"
                strokeWidth="4"
                strokeLinecap="round"
              />
            ))}

            {/* 안개 영역 */}
            {(() => {
              const fogStart = Math.max(1, Math.floor(ROWS * 0.18));
              const fogEnd = Math.min(ROWS - 1, Math.ceil(ROWS * 0.82));
              const fy = yOf(fogStart) - ROW_H * 0.5;
              const fh = (fogEnd - fogStart + 1) * ROW_H;
              return (
                <>
                  <rect
                    x={PADDING_X * 0.4}
                    y={fy}
                    width={ladderW - PADDING_X * 0.8}
                    height={fh}
                    fill="#dbeafe"
                    opacity="0.6"
                    rx="10"
                    style={{ animation: 'ladderFogPulse 3.2s ease-in-out infinite' }}
                  />
                  {Array.from({ length: 16 }).map((_, i) => {
                    const fx = PADDING_X + (i * 41) % (ladderW - PADDING_X * 2);
                    const fyDot = fy + 8 + ((i * 23) % (fh - 16));
                    const fr = 1.5 + (i % 3);
                    return (
                      <circle
                        key={`fog-${i}`}
                        cx={fx}
                        cy={fyDot}
                        r={fr}
                        fill="white"
                        opacity={0.5}
                        style={{ animation: `ladderFogDrift ${4 + (i % 3)}s ease-in-out ${i * 0.2}s infinite` }}
                      />
                    );
                  })}
                </>
              );
            })()}

            {/* 이동 경로 */}
            {phase !== 'idle' && traveledPoints.length > 1 && (
              <polyline
                points={traveledPoints.map((p) => `${p.x},${p.y}`).join(' ')}
                fill="none"
                stroke={riderColor}
                strokeWidth="6"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.9"
              />
            )}

            {/* 라이더 */}
            {phase !== 'idle' && currentPoint && (
              <circle
                cx={currentPoint.x}
                cy={currentPoint.y}
                r="11"
                fill={riderColor}
                stroke="white"
                strokeWidth="3"
                style={{
                  filter: `drop-shadow(0 4px 8px ${riderColor})`,
                  transition: 'cx 0.15s linear, cy 0.15s linear',
                }}
              />
            )}
          </svg>
        </div>

        {/* 아래쪽 입력 박스 (결과/당첨 내용) */}
        <div style={{
          position: 'absolute',
          top: bottomBoxY,
          left: '50%',
          marginLeft: -ladderW / 2,
          width: ladderW,
          height: BOX_H,
        }}>
          {Array.from({ length: COLS }).map((_, c) => {
            const isReveal = revealLane === c && phase === 'reveal';
            return (
              <input
                key={`bot-input-${c}`}
                type="text"
                value={bottomLabels[c] ?? ''}
                onChange={(e) => updateBottomLabel(c, e.target.value)}
                onMouseDown={(e) => e.stopPropagation()}
                placeholder={`결과${c + 1}`}
                style={{
                  position: 'absolute',
                  left: xOf(c) - BOX_W / 2,
                  top: 0,
                  width: BOX_W,
                  height: BOX_H,
                  padding: '4px 6px',
                  border: isReveal ? '3px solid #fbbf24' : '2px solid #94a3b8',
                  borderRadius: 8,
                  background: isReveal ? '#fef3c7' : '#fffef9',
                  fontFamily: "'Gaegu', sans-serif",
                  fontSize: 18,
                  fontWeight: 700,
                  color: isReveal ? '#92400e' : '#1e293b',
                  textAlign: 'center',
                  outline: 'none',
                  boxSizing: 'border-box',
                  boxShadow: isReveal ? '0 0 20px rgba(251,191,36,0.6)' : 'none',
                  transition: 'all 0.3s',
                }}
                onFocus={(e) => { if (!isReveal) e.currentTarget.style.borderColor = '#0ea5e9'; }}
                onBlur={(e) => { if (!isReveal) e.currentTarget.style.borderColor = '#94a3b8'; }}
              />
            );
          })}
        </div>

        {/* 결과 토스트 */}
        {phase === 'reveal' && riderCol !== null && revealLane !== null && (() => {
          const msg = formatResultMessage(
            topLabels[riderCol] ?? '',
            bottomLabels[revealLane] ?? '',
            riderCol
          );
          return (
            <div
              onClick={dismissReveal}
              onMouseDown={(e) => e.stopPropagation()}
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                padding: '22px 36px',
                background: '#fef3c7',
                color: '#92400e',
                borderRadius: 18,
                fontSize: 32,
                fontWeight: 700,
                boxShadow: '0 16px 36px rgba(0,0,0,0.25), 0 0 32px rgba(251,191,36,0.55)',
                animation: 'ladderResultPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 16,
                flexWrap: 'nowrap',
                whiteSpace: 'nowrap',
                zIndex: 10,
                border: '3px solid #fbbf24',
                fontFamily: "'Gaegu', sans-serif",
                maxWidth: '90%',
              }}
            >
              <span style={{ whiteSpace: 'nowrap' }}>{msg.top}</span>
              <span style={{ fontSize: 36, color: '#0ea5e9' }}>→</span>
              <span style={{ whiteSpace: 'nowrap' }}>{msg.bottom}</span>
            </div>
          );
        })()}

        {/* 모두 완료 메시지 */}
        {allDone && phase === 'idle' && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            padding: '20px 40px',
            background: '#0ea5e9',
            color: 'white',
            borderRadius: 18,
            fontSize: 28,
            fontWeight: 700,
            boxShadow: '0 14px 32px rgba(14,165,233,0.4)',
            zIndex: 10,
            fontFamily: "'Do Hyeon', sans-serif",
          }}>
            ✨ 모두 완료!
          </div>
        )}

        {/* 안내 문구 */}
        {phase === 'idle' && !allDone && (
          <div style={{
            position: 'absolute',
            bottom: 70, left: 0, right: 0, textAlign: 'center',
            fontSize: 17, color: '#94a3b8',
            fontFamily: "'Gaegu', sans-serif",
          }}>
            위/아래 칸을 채우고 색깔 도트를 눌러 시작해요
          </div>
        )}

        {/* 액션 버튼 */}
        <div style={{
          position: 'absolute', bottom: 16, left: 0, right: 0,
          display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap',
        }}>
          {(completed.length > 0) && phase === 'idle' && (
            <button
              onClick={handleResetAll}
              onMouseDown={(e) => e.stopPropagation()}
              style={smallBtnStyle}
            >
              <IoRefresh size={16} /> 사다리 다시 만들기
            </button>
          )}
          {phase === 'idle' && (
            <button
              onClick={() => setShowInput(true)}
              onMouseDown={(e) => e.stopPropagation()}
              style={smallBtnStyle}
            >
              <IoCreate size={16} /> 인원 변경
            </button>
          )}
        </div>
      </div>

      <style>{`
        @keyframes ladderResultPop {
          0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0; }
          70% { transform: translate(-50%, -50%) scale(1.08); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
        }
        @keyframes ladderFogPulse {
          0%, 100% { opacity: 0.55; }
          50% { opacity: 0.75; }
        }
        @keyframes ladderFogDrift {
          0%, 100% { transform: translate(0, 0); opacity: 0.4; }
          50% { transform: translate(3px, -2px); opacity: 0.7; }
        }
      `}</style>
    </div>
  );
}

const countBtnStyle: React.CSSProperties = {
  width: 54, height: 54, borderRadius: '50%',
  border: 'none', background: '#f1f5f9', color: '#475569',
  fontSize: 30, fontWeight: 700, cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontFamily: "'Do Hyeon', sans-serif",
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
  fontFamily: "'Do Hyeon', sans-serif",
};
