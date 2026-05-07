interface Props {
  config: Record<string, unknown>;
  onConfigChange: (config: Record<string, unknown>) => void;
}

const CLOCK_STYLES = [
  { id: 'classic', label: '클래식', desc: '숫자 + 눈금' },
  { id: 'minimal', label: '미니멀', desc: '깔끔한 눈금만' },
  { id: 'digital', label: '디지털', desc: '큰 숫자 표시' },
  { id: 'cat', label: '🐱 고양이', desc: '꼬리가 흔들리는 시계' },
  { id: 'flower', label: '🌸 벚꽃', desc: '꽃잎이 흩날리는 시계' },
  { id: 'bear', label: '🐻 곰돌이', desc: '볼 터치 곰돌이 시계' },
  { id: 'wave', label: '🌊 파도', desc: '여름 바다가 일렁이는 시계' },
  { id: 'maple', label: '🍁 단풍', desc: '가을 단풍잎이 떨어지는 시계' },
];

export default function ClockSettings({ config, onConfigChange }: Props) {
  const is24h = (config.is24h as boolean) ?? false;
  const clockStyle = (config.clockStyle as string) || 'classic';

  return (
    <div>
      {/* 24시간 토글 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>24시간 형식</span>
        <button
          onClick={() => onConfigChange({ ...config, is24h: !is24h })}
          style={{
            width: '44px',
            height: '24px',
            borderRadius: '12px',
            border: 'none',
            cursor: 'pointer',
            background: is24h ? '#6366f1' : '#e2e8f0',
            position: 'relative',
            transition: 'background 0.2s',
          }}
        >
          <div style={{
            width: '18px',
            height: '18px',
            borderRadius: '50%',
            background: 'white',
            position: 'absolute',
            top: '3px',
            left: is24h ? '23px' : '3px',
            transition: 'left 0.2s',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          }} />
        </button>
      </div>

      {/* 시계 스타일 */}
      <p style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '8px' }}>시계 스타일</p>
      {CLOCK_STYLES.map((style) => (
        <div
          key={style.id}
          onClick={() => onConfigChange({ ...config, clockStyle: style.id })}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 10px',
            borderRadius: '8px',
            cursor: 'pointer',
            background: clockStyle === style.id ? '#eef2ff' : 'transparent',
            transition: 'background 0.15s',
            marginBottom: '2px',
          }}
          onMouseEnter={(e) => { if (clockStyle !== style.id) e.currentTarget.style.background = '#f8fafc'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = clockStyle === style.id ? '#eef2ff' : 'transparent'; }}
        >
          <div>
            <span style={{
              fontSize: '13px',
              fontWeight: clockStyle === style.id ? 600 : 400,
              color: clockStyle === style.id ? '#6366f1' : '#334155',
            }}>
              {style.label}
            </span>
            <span style={{ fontSize: '11px', color: '#94a3b8', marginLeft: '8px' }}>{style.desc}</span>
          </div>
          {clockStyle === style.id && (
            <span style={{ fontSize: '13px', color: '#6366f1' }}>✓</span>
          )}
        </div>
      ))}
    </div>
  );
}
