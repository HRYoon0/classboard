import { useState, useEffect } from 'react';
import { IoEye, IoEyeOff, IoLockClosed, IoLockOpen, IoRefresh, IoCreate } from 'react-icons/io5';

interface Props {
  config: Record<string, unknown>;
  onConfigChange: (config: Record<string, unknown>) => void;
}

const COLORS = [
  { bar: '#6366f1', light: '#eef2ff', text: '#4338ca' },
  { bar: '#f43f5e', light: '#fff1f2', text: '#be123c' },
  { bar: '#22c55e', light: '#f0fdf4', text: '#15803d' },
  { bar: '#f59e0b', light: '#fffbeb', text: '#b45309' },
  { bar: '#8b5cf6', light: '#faf5ff', text: '#6d28d9' },
  { bar: '#06b6d4', light: '#ecfeff', text: '#0e7490' },
];

export default function PollWidget({ config, onConfigChange }: Props) {
  const question = (config.question as string) || '';
  const options = (config.options as string[]) || ['', ''];
  const votes = (config.votes as number[]) || options.map(() => 0);
  const [showSetup, setShowSetup] = useState(!question);
  const [showResults, setShowResults] = useState(true);
  const [isLocked, setIsLocked] = useState(false);

  // 클라우드 로드로 질문이 채워지면 결과 화면으로 자동 전환
  useEffect(() => {
    if (question) setShowSetup(false);
  }, [question]);

  const totalVotes = votes.reduce((a, b) => a + b, 0);
  const maxVotes = Math.max(...votes, 1);

  const vote = (index: number) => {
    if (isLocked) return;
    const newVotes = [...votes];
    newVotes[index]++;
    onConfigChange({ votes: newVotes });
  };

  const reset = () => {
    onConfigChange({ votes: options.map(() => 0) });
    setIsLocked(false);
  };

  // ── 설정 화면 ──
  if (showSetup) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* 질문 입력 */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ fontSize: '13px', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '6px' }}>질문</label>
          <input
            type="text"
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '2px solid #e2e8f0',
              borderRadius: '10px',
              fontSize: '18px',
              fontWeight: 600,
              outline: 'none',
              color: '#1e293b',
              background: '#f8fafc',
              boxSizing: 'border-box',
            }}
            placeholder="오늘 점심 뭐 먹을까?"
            value={question}
            onChange={(e) => onConfigChange({ question: e.target.value })}
          />
        </div>

        {/* 선택지 */}
        <label style={{ fontSize: '13px', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '8px' }}>선택지</label>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto' }}>
          {options.map((opt, i) => {
            const c = COLORS[i % COLORS.length];
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '14px', height: '14px', borderRadius: '50%', backgroundColor: c.bar, flexShrink: 0 }} />
                <input
                  type="text"
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    fontSize: '16px',
                    outline: 'none',
                    color: '#334155',
                    background: '#f8fafc',
                  }}
                  placeholder={`선택지 ${i + 1}`}
                  value={opt}
                  onChange={(e) => {
                    const newOpts = [...options];
                    newOpts[i] = e.target.value;
                    onConfigChange({ options: newOpts, votes: newOpts.map(() => 0) });
                  }}
                />
                {options.length > 2 && (
                  <button
                    onClick={() => {
                      const newOpts = options.filter((_, j) => j !== i);
                      onConfigChange({ options: newOpts, votes: newOpts.map(() => 0) });
                    }}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      border: 'none',
                      background: 'none',
                      cursor: 'pointer',
                      fontSize: '16px',
                      color: '#cbd5e1',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>
            );
          })}
          {options.length < 6 && (
            <button
              onClick={() =>
                onConfigChange({
                  options: [...options, ''],
                  votes: [...votes, 0],
                })
              }
              style={{
                padding: '10px',
                borderRadius: '10px',
                border: '2px dashed #e2e8f0',
                background: 'none',
                cursor: 'pointer',
                fontSize: '15px',
                color: '#6366f1',
                fontWeight: 500,
              }}
            >
              + 선택지 추가
            </button>
          )}
        </div>

        {/* 시작 버튼 */}
        <button
          onClick={() => question && options.some(o => o.trim()) && setShowSetup(false)}
          disabled={!question || !options.some(o => o.trim())}
          style={{
            marginTop: '16px',
            padding: '12px',
            borderRadius: '10px',
            border: 'none',
            background: (!question || !options.some(o => o.trim())) ? '#cbd5e1' : '#6366f1',
            color: 'white',
            fontSize: '16px',
            fontWeight: 600,
            cursor: (!question || !options.some(o => o.trim())) ? 'default' : 'pointer',
          }}
        >
          투표 시작
        </button>
      </div>
    );
  }

  // ── 투표 화면 ──
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* 질문 */}
      <h3 style={{ fontSize: '24px', fontWeight: 700, color: '#1e293b', marginBottom: '16px', lineHeight: 1.3, margin: '0 0 16px' }}>{question}</h3>

      {/* 선택지 + 바 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto' }}>
        {options.map((opt, i) => {
          const pct = totalVotes > 0 ? (votes[i] / totalVotes) * 100 : 0;
          const barWidth = totalVotes > 0 ? (votes[i] / maxVotes) * 100 : 0;
          const c = COLORS[i % COLORS.length];

          return (
            <button
              key={i}
              onClick={() => vote(i)}
              disabled={isLocked}
              style={{
                position: 'relative',
                textAlign: 'left',
                borderRadius: '12px',
                overflow: 'hidden',
                border: '2px solid transparent',
                backgroundColor: c.light,
                cursor: isLocked ? 'default' : 'pointer',
                padding: 0,
                transition: 'all 0.15s',
              }}
            >
              {/* 바 배경 */}
              {showResults && (
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  bottom: 0,
                  width: `${barWidth}%`,
                  backgroundColor: c.bar,
                  opacity: 0.25,
                  transition: 'width 0.7s ease-out',
                }} />
              )}
              <div style={{ position: 'relative', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: c.bar, flexShrink: 0 }} />
                  <span style={{ fontSize: '18px', fontWeight: 600, color: '#334155' }}>{opt || `선택지 ${i + 1}`}</span>
                </div>
                {showResults && (
                  <span style={{ fontSize: '18px', fontWeight: 700, color: c.text, fontVariantNumeric: 'tabular-nums' }}>
                    {votes[i]} <span style={{ fontSize: '13px', fontWeight: 500, opacity: 0.6 }}>({Math.round(pct)}%)</span>
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* 하단 컨트롤 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '14px', paddingTop: '14px', borderTop: '1px solid #f1f5f9' }}>
        <ControlBtn
          icon={showResults ? <IoEye size={16} /> : <IoEyeOff size={16} />}
          label={showResults ? '숨기기' : '보기'}
          onClick={() => setShowResults(!showResults)}
        />
        <ControlBtn
          icon={isLocked ? <IoLockClosed size={16} /> : <IoLockOpen size={16} />}
          label={isLocked ? '잠금됨' : '잠금'}
          onClick={() => setIsLocked(!isLocked)}
          active={isLocked}
        />
        <div style={{ flex: 1 }} />
        <ControlBtn icon={<IoRefresh size={16} />} label="초기화" onClick={reset} />
        <ControlBtn icon={<IoCreate size={16} />} label="수정" onClick={() => setShowSetup(true)} />
        <span style={{ fontSize: '14px', color: '#94a3b8', fontVariantNumeric: 'tabular-nums', fontWeight: 500, marginLeft: '4px' }}>
          총 {totalVotes}표
        </span>
      </div>
    </div>
  );
}

function ControlBtn({
  icon,
  label,
  onClick,
  active = false,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        padding: '6px 10px',
        borderRadius: '8px',
        border: 'none',
        background: active ? '#fef2f2' : 'none',
        cursor: 'pointer',
        fontSize: '13px',
        fontWeight: 500,
        color: active ? '#ef4444' : '#94a3b8',
        transition: 'all 0.15s',
      }}
    >
      {icon}
      {label}
    </button>
  );
}
