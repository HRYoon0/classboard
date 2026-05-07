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
];

// 가로대(rungs) 생성 — 무작위 순열을 목표로 역산해서 배치
// → 각 라인이 시작 위치에서 평균 COLS/3 컬럼만큼 멀리 이동 (넓은 zigzag)
function generateRungs(cols: number, rows: number): boolean[][] {
  const rungs: boolean[][] = Array.from({ length: rows }, () =>
    new Array(Math.max(0, cols - 1)).fill(false)
  );
  if (cols < 2) return rungs;

  // 1. 무작위 순열 생성 — 고정점(σ(i)=i)이 너무 많으면 재시도
  let perm: number[] = [];
  for (let attempt = 0; attempt < 10; attempt++) {
    perm = Array.from({ length: cols }, (_, i) => i);
    for (let i = perm.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [perm[i], perm[j]] = [perm[j], perm[i]];
    }
    const fixedPoints = perm.filter((v, i) => v === i).length;
    // 고정점 1개 이하면 OK (대부분 라인이 이동)
    if (fixedPoints <= 1) break;
  }

  // 2. 버블 정렬로 인접 transposition 시퀀스 추출
  const arr = [...perm];
  const swapList: number[] = [];
  for (let i = 0; i < arr.length - 1; i++) {
    for (let j = 0; j < arr.length - 1 - i; j++) {
      if (arr[j] > arr[j + 1]) {
        [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
        swapList.push(j);
      }
    }
  }

  // 3. swap을 행에 배치 (순서 + 인접 제약 유지)
  const nextRow = new Array(Math.max(0, cols - 1)).fill(0);
  for (const gap of swapList) {
    let r = nextRow[gap];
    while (r < rows) {
      // 같은 행에 인접 가로대 금지
      if (gap > 0 && rungs[r][gap - 1]) { r++; continue; }
      if (gap < cols - 2 && rungs[r][gap + 1]) { r++; continue; }
      rungs[r][gap] = true;
      // 다음 가능 행 갱신 (자기 + 인접 gap 모두)
      nextRow[gap] = r + 1;
      if (gap > 0) nextRow[gap - 1] = Math.max(nextRow[gap - 1], r + 1);
      if (gap < cols - 2) nextRow[gap + 1] = Math.max(nextRow[gap + 1], r + 1);
      break;
    }
    // 행 부족으로 못 두면 스킵 (희박 — 결과 permutation 살짝 어긋남)
  }

  return rungs;
}

// Fisher-Yates 셔플 — true=당첨, false=꽝
function generateResults(total: number, blanks: number): boolean[] {
  const arr: boolean[] = [];
  for (let i = 0; i < total - blanks; i++) arr.push(true);
  for (let i = 0; i < blanks; i++) arr.push(false);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// 시작 컬럼에서 사다리를 따라 내려간 끝 컬럼 추적
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

type Phase = 'idle' | 'riding' | 'reveal';

export default function LadderWidget({ config, onConfigChange }: Props) {
  const count = (config.count as number) || 0;
  const blankCount = (config.blankCount as number) || 0;
  const winCount = Math.max(0, count - blankCount); // UI에는 당첨 수로 표시
  const rungs: boolean[][] = (config.rungs as boolean[][]) || [];
  const results: boolean[] = (config.results as boolean[]) || [];
  const completed: number[] = (config.completed as number[]) || [];

  const [showInput, setShowInput] = useState(!count);
  const [editCount, setEditCount] = useState(count || 6);
  const [editWins, setEditWins] = useState(winCount || 3);
  const [riderCol, setRiderCol] = useState<number | null>(null);
  const [riderStep, setRiderStep] = useState(0);
  const [phase, setPhase] = useState<Phase>('idle');
  const [revealLane, setRevealLane] = useState<number | null>(null);
  const timersRef = useRef<number[]>([]);

  // 레이아웃 계산 — 좌우 폭을 더 써서 사다리를 넓게
  const COLS = Math.max(2, Math.min(12, count));
  const LANE_W =
    COLS <= 4 ? 140 :
    COLS <= 8 ? 110 :
    COLS <= 10 ? 90 :
    74;
  const ROW_H = COLS <= 8 ? 32 : 26;
  // 무작위 순열을 충분히 표현할 수 있도록 — 평균 swap = COLS*(COLS-1)/4
  const ROWS = Math.max(14, Math.floor(COLS * 1.8));
  const PADDING_X = 60;
  const PADDING_TOP = 84;
  const PADDING_BOTTOM = 92;
  const ladderW = (COLS - 1) * LANE_W + PADDING_X * 2;
  const ladderH = ROWS * ROW_H + PADDING_TOP + PADDING_BOTTOM;

  const innerW = showInput ? 380 : Math.max(440, ladderW + 20);
  // 헤더(110: 제목+통계) + 사다리 + 안내 문구(28) + 버튼(50) + 마진(22) ≈ 110+ladderH+120
  const innerH = showInput ? 380 : 110 + ladderH + 120;

  const { containerRef, scale } = useContainerScale(innerW, innerH);

  // 좌표 헬퍼
  const xOf = (c: number) => PADDING_X + c * LANE_W;
  const yOf = (r: number) => PADDING_TOP + r * ROW_H;

  // count/blankCount 변경 시 사다리 재생성 (구버전 데이터 자동 마이그레이션 포함)
  useEffect(() => {
    if (count > 0) {
      const dimensionsOk =
        rungs.length === ROWS &&
        rungs.length > 0 &&
        rungs[0].length === Math.max(0, COLS - 1);
      if (!dimensionsOk || results.length !== count) {
        onConfigChange({
          ...config,
          rungs: generateRungs(COLS, ROWS),
          results: generateResults(count, blankCount),
          completed: [],
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, blankCount]);

  useEffect(() => {
    if (count) setShowInput(false);
  }, [count]);

  useEffect(() => {
    if (count) setEditCount(count);
    setEditWins(Math.max(0, count - blankCount));
  }, [count, blankCount]);

  useEffect(() => {
    return () => timersRef.current.forEach(clearTimeout);
  }, []);

  // 사다리 타기 시작
  const ride = (startCol: number) => {
    if (phase !== 'idle' || completed.includes(startCol)) return;

    const colPath = computePath(startCol, rungs, COLS);

    // 단계별 점 좌표 생성 (도트 → 사다리 → 이모지)
    const points: { x: number; y: number }[] = [];
    // 시작: 상단 도트 위치
    points.push({ x: xOf(colPath[0]), y: yOf(0) - 48 });
    // 첫 행으로 내려옴
    points.push({ x: xOf(colPath[0]), y: yOf(0) });
    for (let r = 0; r < colPath.length - 1; r++) {
      if (colPath[r] !== colPath[r + 1]) {
        // 가로대 끝까지 이동
        points.push({ x: xOf(colPath[r + 1]), y: yOf(r) });
      }
      // 다음 행으로 내려감
      points.push({ x: xOf(colPath[r + 1]), y: yOf(r + 1) });
    }
    // 끝: 하단 이모지 위치
    const endCol = colPath[colPath.length - 1];
    points.push({ x: xOf(endCol), y: yOf(ROWS) + 40 });
    pointsRef.current = points;
    setRiderCol(startCol);
    setRiderStep(0);
    setRevealLane(null);
    setPhase('riding');

    // 단계별 애니메이션
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    points.forEach((_, i) => {
      const delay = i * 200;
      timersRef.current.push(
        window.setTimeout(() => setRiderStep(i), delay)
      );
    });
    // 종료 후 리빌
    const totalDuration = points.length * 200;
    timersRef.current.push(
      window.setTimeout(() => {
        const endCol = colPath[colPath.length - 1];
        setRevealLane(endCol);
        setPhase('reveal');
        onConfigChange({ ...config, completed: [...completed, startCol] });
      }, totalDuration + 200)
    );
  };

  const pointsRef = useRef<{ x: number; y: number }[]>([]);

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
      results: generateResults(count, blankCount),
      completed: [],
    });
  };

  const handleSubmit = () => {
    const validCount = Math.max(2, Math.min(12, editCount));
    const validWins = Math.max(1, Math.min(validCount, editWins));
    const validBlanks = validCount - validWins;
    const newRows = Math.max(14, Math.floor(validCount * 1.8));
    onConfigChange({
      ...config,
      count: validCount,
      blankCount: validBlanks,
      rungs: generateRungs(validCount, newRows),
      results: generateResults(validCount, validBlanks),
      completed: [],
    });
    setShowInput(false);
    dismissReveal();
  };

  // ─── 입력 화면 ───
  if (showInput) {
    const isValid =
      editCount >= 2 && editCount <= 12 &&
      editWins >= 1 && editWins <= editCount;
    const previewBlanks = Math.max(0, editCount - editWins);
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
            fontSize: 26, color: '#0ea5e9', margin: 0,
          }}>🪜 사다리 타기</p>

          {/* 참가자 수 */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>참가자 수 (2~12)</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                onClick={() => setEditCount((c) => Math.max(2, c - 1))}
                onMouseDown={(e) => e.stopPropagation()}
                style={countBtnStyle}
              >−</button>
              <input
                type="number"
                min={2}
                max={12}
                value={editCount}
                onChange={(e) => setEditCount(Number(e.target.value) || 0)}
                onMouseDown={(e) => e.stopPropagation()}
                onKeyDown={(e) => { if (e.key === 'Enter' && isValid) handleSubmit(); }}
                style={countInputStyle}
              />
              <button
                onClick={() => setEditCount((c) => Math.min(12, c + 1))}
                onMouseDown={(e) => e.stopPropagation()}
                style={countBtnStyle}
              >+</button>
            </div>
          </div>

          {/* 당첨 개수 */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
              당첨 개수 (1 ~ {editCount})
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                onClick={() => setEditWins((w) => Math.max(1, w - 1))}
                onMouseDown={(e) => e.stopPropagation()}
                style={{ ...countBtnStyle, background: '#fef9c3', color: '#ca8a04' }}
              >−</button>
              <input
                type="number"
                min={1}
                max={editCount}
                value={editWins}
                onChange={(e) => setEditWins(Number(e.target.value) || 0)}
                onMouseDown={(e) => e.stopPropagation()}
                onKeyDown={(e) => { if (e.key === 'Enter' && isValid) handleSubmit(); }}
                style={{ ...countInputStyle, color: '#ca8a04' }}
              />
              <button
                onClick={() => setEditWins((w) => Math.min(editCount, w + 1))}
                onMouseDown={(e) => e.stopPropagation()}
                style={{ ...countBtnStyle, background: '#fef9c3', color: '#ca8a04' }}
              >+</button>
            </div>
          </div>

          <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
            <b style={{ color: '#ca8a04' }}>당첨 {Math.max(0, Math.min(editCount, editWins))}개</b>
            {' / '}
            <b style={{ color: '#dc2626' }}>꽝 {previewBlanks}개</b>
          </p>

          <button
            onClick={handleSubmit}
            disabled={!isValid}
            style={{
              padding: '12px 38px',
              background: !isValid
                ? '#cbd5e1'
                : 'linear-gradient(135deg, #0ea5e9, #6366f1)',
              color: 'white',
              border: 'none',
              borderRadius: 12,
              fontSize: 18,
              fontWeight: 700,
              fontFamily: "'Do Hyeon', sans-serif",
              cursor: !isValid ? 'default' : 'pointer',
              boxShadow: isValid ? '0 6px 16px rgba(14,165,233,0.4)' : 'none',
            }}
          >
            시작하기
          </button>
        </div>
      </div>
    );
  }

  // ─── 게임 화면 ───
  const remainingCount = count - completed.length;
  const allDone = remainingCount === 0;
  const currentPoint = pointsRef.current[Math.min(riderStep, pointsRef.current.length - 1)];
  const riderColor = riderCol !== null ? LANE_COLORS[riderCol % LANE_COLORS.length] : '#0ea5e9';
  const traveledPoints = pointsRef.current.slice(0, riderStep + 1);

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
          position: 'absolute', top: 4, left: 0, right: 0, textAlign: 'center',
          fontSize: 42, fontWeight: 700, color: '#0ea5e9',
          fontFamily: "'Do Hyeon', sans-serif",
        }}>
          🪜 사다리 타기
        </div>

        {/* 통계 */}
        <div style={{
          position: 'absolute', top: 60, left: 0, right: 0, textAlign: 'center',
          fontSize: 22, color: '#64748b',
          fontFamily: "'Do Hyeon', sans-serif",
        }}>
          남은 사람: <b style={{ color: '#0ea5e9' }}>{remainingCount}</b> / {count}
          {' · '}
          <b style={{ color: '#ca8a04' }}>당첨 {winCount}</b>
          {' · '}
          <b style={{ color: '#dc2626' }}>꽝 {blankCount}</b>
        </div>

        {/* 사다리 SVG */}
        <div style={{
          position: 'absolute',
          top: 110,
          left: '50%',
          marginLeft: -ladderW / 2,
        }}>
          <svg width={ladderW} height={ladderH} viewBox={`0 0 ${ladderW} ${ladderH}`}>
            {/* 가로대 — 안개 영역(중앙 70%)에서는 숨김 */}
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

            {/* 세로 기둥 — 상단 도트와 하단 이모지까지 연결 */}
            {Array.from({ length: COLS }).map((_, c) => (
              <line
                key={`col-${c}`}
                x1={xOf(c)}
                y1={yOf(0) - 48}
                x2={xOf(c)}
                y2={yOf(ROWS) + 40}
                stroke="#cbd5e1"
                strokeWidth="4"
                strokeLinecap="round"
              />
            ))}

            {/* 안개 영역 — 중앙 가로대를 가려 미스터리 효과 */}
            {(() => {
              const fogStart = Math.max(1, Math.floor(ROWS * 0.18));
              const fogEnd = Math.min(ROWS - 1, Math.ceil(ROWS * 0.82));
              const fy = yOf(fogStart) - ROW_H * 0.5;
              const fh = (fogEnd - fogStart + 1) * ROW_H;
              return (
                <>
                  {/* 안개 본체 */}
                  <rect
                    x={PADDING_X * 0.4}
                    y={fy}
                    width={ladderW - PADDING_X * 0.8}
                    height={fh}
                    fill="#dbeafe"
                    opacity="0.65"
                    rx="10"
                    style={{ animation: 'ladderFogPulse 3.2s ease-in-out infinite' }}
                  />
                  {/* 안개 입자 (장식 점들) */}
                  {Array.from({ length: 18 }).map((_, i) => {
                    const fx = PADDING_X + (i * 37) % (ladderW - PADDING_X * 2);
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
                        style={{
                          animation: `ladderFogDrift ${4 + (i % 3)}s ease-in-out ${i * 0.2}s infinite`,
                        }}
                      />
                    );
                  })}
                </>
              );
            })()}

            {/* 이동 경로 (지나간 부분 강조) — 안개 위에 그려져 항상 보임 */}
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

            {/* 상단 클릭 가능한 도트 */}
            {Array.from({ length: COLS }).map((_, c) => {
              const isCompleted = completed.includes(c);
              const isCurrent = riderCol === c;
              const color = LANE_COLORS[c % LANE_COLORS.length];
              return (
                <g key={`top-${c}`}>
                  <circle
                    cx={xOf(c)}
                    cy={yOf(0) - 48}
                    r="26"
                    fill={isCompleted ? '#e2e8f0' : color}
                    stroke={isCurrent ? color : 'rgba(0,0,0,0.1)'}
                    strokeWidth={isCurrent ? '4' : '1.5'}
                    style={{
                      cursor: !isCompleted && phase === 'idle' ? 'pointer' : 'default',
                      filter: !isCompleted && phase === 'idle'
                        ? 'drop-shadow(0 4px 10px rgba(0,0,0,0.25))'
                        : 'none',
                      transition: 'all 0.2s',
                    }}
                    onClick={() => ride(c)}
                  />
                  <text
                    x={xOf(c)}
                    y={yOf(0) - 38}
                    textAnchor="middle"
                    fontSize="24"
                    fontWeight="700"
                    fontFamily="'Do Hyeon', sans-serif"
                    fill={isCompleted ? '#94a3b8' : '#1e293b'}
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                  >
                    {c + 1}
                  </text>
                </g>
              );
            })}

            {/* 하단 결과 이모지 */}
            {results.map((isWin, c) => (
              <g key={`bot-${c}`}>
                <circle
                  cx={xOf(c)}
                  cy={yOf(ROWS) + 40}
                  r="32"
                  fill={isWin ? '#fef3c7' : '#475569'}
                  stroke={isWin ? '#fbbf24' : '#334155'}
                  strokeWidth="2"
                  style={{
                    filter: revealLane === c
                      ? `drop-shadow(0 4px 16px ${isWin ? 'rgba(251,191,36,0.7)' : 'rgba(0,0,0,0.45)'})`
                      : 'none',
                    transition: 'filter 0.3s',
                  }}
                />
                <text
                  x={xOf(c)}
                  y={yOf(ROWS) + 53}
                  textAnchor="middle"
                  fontSize="40"
                  style={{ pointerEvents: 'none', userSelect: 'none' }}
                >
                  {isWin ? '😄' : '😭'}
                </text>
              </g>
            ))}

            {/* 라이더 (애니메이션 마커) */}
            {phase !== 'idle' && currentPoint && (
              <circle
                cx={currentPoint.x}
                cy={currentPoint.y}
                r="12"
                fill={riderColor}
                stroke="white"
                strokeWidth="3"
                style={{
                  filter: `drop-shadow(0 4px 8px ${riderColor})`,
                  transition: 'cx 0.18s linear, cy 0.18s linear',
                }}
              />
            )}
          </svg>
        </div>

        {/* 결과 토스트 — 사다리 위에 떠 있는 모달 (가운데) */}
        {phase === 'reveal' && riderCol !== null && revealLane !== null && (
          <div
            onClick={dismissReveal}
            onMouseDown={(e) => e.stopPropagation()}
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              padding: '24px 42px',
              background: results[revealLane] ? '#fef3c7' : '#475569',
              color: results[revealLane] ? '#92400e' : '#fff',
              borderRadius: 18,
              fontFamily: "'Do Hyeon', sans-serif",
              fontSize: 40,
              fontWeight: 700,
              boxShadow: results[revealLane]
                ? '0 16px 36px rgba(0,0,0,0.25), 0 0 32px rgba(251,191,36,0.55)'
                : '0 16px 36px rgba(0,0,0,0.3)',
              animation: 'ladderResultPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 18,
              flexWrap: 'nowrap',
              whiteSpace: 'nowrap',
              zIndex: 10,
              border: `3px solid ${results[revealLane] ? '#fbbf24' : '#1e293b'}`,
            }}
          >
            <span style={{ whiteSpace: 'nowrap' }}>
              {riderCol + 1}번 →
            </span>
            <span style={{ fontSize: 60, lineHeight: 1 }}>
              {results[revealLane] ? '😄' : '😭'}
            </span>
            <span style={{ whiteSpace: 'nowrap' }}>
              {results[revealLane] ? '당첨!' : '꽝'}
            </span>
          </div>
        )}

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
            fontFamily: "'Do Hyeon', sans-serif",
            fontSize: 32,
            fontWeight: 700,
            boxShadow: '0 14px 32px rgba(14,165,233,0.4)',
            zIndex: 10,
          }}>
            ✨ 모두 완료!
          </div>
        )}

        {/* 안내 문구 */}
        {phase === 'idle' && !allDone && (
          <div style={{
            position: 'absolute',
            bottom: 82, left: 0, right: 0, textAlign: 'center',
            fontSize: 19, color: '#94a3b8',
            fontFamily: "'Do Hyeon', sans-serif",
          }}>
            위쪽 색깔 도트를 클릭하면 사다리를 타고 내려갑니다
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
              <IoRefresh size={16} /> 초기화 (사다리 다시 만들기)
            </button>
          )}
          {phase === 'idle' && (
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
  color: '#0ea5e9',
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
