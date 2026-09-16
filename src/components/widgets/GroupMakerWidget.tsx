import { useState, useEffect } from 'react';

interface Props {
  config: Record<string, unknown>;
  onConfigChange: (config: Record<string, unknown>) => void;
}

const GROUP_COLORS = [
  { bg: '#eff6ff', border: '#bfdbfe' },
  { bg: '#fdf2f8', border: '#fbcfe8' },
  { bg: '#f0fdf4', border: '#bbf7d0' },
  { bg: '#fefce8', border: '#fde68a' },
  { bg: '#faf5ff', border: '#e9d5ff' },
  { bg: '#fff7ed', border: '#fed7aa' },
  { bg: '#ecfeff', border: '#a5f3fc' },
  { bg: '#fff1f2', border: '#fecdd3' },
];

export default function GroupMakerWidget({ config, onConfigChange }: Props) {
  const nameList = ((config.names as string) || '').trim();
  const groupCount = (config.groupCount as number) || 4;
  const [groups, setGroups] = useState<string[][]>([]);
  const [showInput, setShowInput] = useState(!nameList);

  // 클라우드 로드로 이름 목록이 채워지면 결과 화면으로 자동 전환
  useEffect(() => {
    if (nameList) setShowInput(false);
  }, [nameList]);

  const names = nameList
    .split('\n')
    .map((n) => n.trim())
    .filter(Boolean);

  const shuffle = () => {
    const shuffled = [...names].sort(() => Math.random() - 0.5);
    const result: string[][] = Array.from({ length: groupCount }, () => []);
    shuffled.forEach((name, i) => {
      result[i % groupCount].push(name);
    });
    setGroups(result);
  };

  if (showInput || names.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '12px' }}>
        <textarea
          style={{
            flex: 1, width: '100%', padding: '14px', border: '2px solid #e2e8f0',
            borderRadius: '10px', fontSize: '18px', lineHeight: 1.6, resize: 'none',
            outline: 'none', color: '#334155', background: '#f8fafc', boxSizing: 'border-box',
          }}
          placeholder={'학생 이름을 한 줄에 하나씩 입력하세요'}
          value={nameList}
          onChange={(e) => onConfigChange({ names: e.target.value })}
          onMouseDown={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '16px', color: '#64748b' }}>모둠 수:</span>
          <select
            value={groupCount}
            onChange={(e) => onConfigChange({ groupCount: Number(e.target.value) })}
            onMouseDown={(e) => e.stopPropagation()}
            style={{
              padding: '8px 12px', border: '2px solid #e2e8f0', borderRadius: '8px',
              fontSize: '16px', color: '#334155', outline: 'none',
            }}
          >
            {[2, 3, 4, 5, 6, 7, 8].map((n) => (
              <option key={n} value={n}>{n}개</option>
            ))}
          </select>
          <button
            onClick={() => names.length > 0 && setShowInput(false)}
            disabled={names.length === 0}
            style={{
              marginLeft: 'auto', padding: '10px 20px',
              background: names.length === 0 ? '#cbd5e1' : '#6366f1',
              color: 'white', border: 'none', borderRadius: '8px',
              fontSize: '16px', fontWeight: 600,
              cursor: names.length === 0 ? 'default' : 'pointer',
            }}
          >
            완료
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '12px' }}>
      {groups.length > 0 ? (
        <div style={{
          flex: 1, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '10px', overflowY: 'auto',
        }}>
          {groups.map((group, i) => {
            const c = GROUP_COLORS[i % GROUP_COLORS.length];
            return (
              <div key={i} style={{
                borderRadius: '10px', border: `2px solid ${c.border}`,
                background: c.bg, padding: '12px',
              }}>
                <p style={{ fontSize: '16px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                  {i + 1}모둠
                </p>
                {group.map((name, j) => (
                  <p key={j} style={{ fontSize: '18px', color: '#334155', lineHeight: 1.6 }}>{name}</p>
                ))}
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '18px' }}>
          아래 버튼을 눌러 모둠을 만드세요
        </div>
      )}
      <div style={{ display: 'flex', gap: '10px', flexShrink: 0 }}>
        <button
          onClick={shuffle}
          style={{
            flex: 1, padding: '12px', borderRadius: '10px', border: 'none',
            background: '#6366f1', color: 'white', fontSize: '18px', fontWeight: 600, cursor: 'pointer',
          }}
        >
          🔀 섞기!
        </button>
        <button
          onClick={() => setShowInput(true)}
          style={{
            padding: '12px 20px', borderRadius: '10px', border: 'none',
            background: '#f1f5f9', color: '#475569', fontSize: '18px', fontWeight: 600, cursor: 'pointer',
          }}
        >
          수정
        </button>
      </div>
    </div>
  );
}
