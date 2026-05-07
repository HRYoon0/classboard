import { useState, useEffect } from 'react';
import { useContainerScale } from '../../hooks/useContainerScale';

type ClockStyle = 'classic' | 'minimal' | 'digital' | 'cat' | 'flower' | 'bear' | 'wave' | 'maple';

interface Props {
  config: Record<string, unknown>;
  onConfigChange: (config: Record<string, unknown>) => void;
}

export default function ClockWidget({ config }: Props) {
  const [time, setTime] = useState(new Date());
  const is24h = (config.is24h as boolean) ?? false;
  const clockStyle = (config.clockStyle as ClockStyle) || 'classic';

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const hours = time.getHours();
  const minutes = time.getMinutes();
  const seconds = time.getSeconds();

  const hourAngle = ((hours % 12) + minutes / 60) * 30;
  const minuteAngle = (minutes + seconds / 60) * 6;
  const secondAngle = seconds * 6;

  const displayHour = is24h ? hours : (hours % 12 || 12);
  const ampm = is24h ? '' : (hours >= 12 ? '오후' : '오전');
  const digitalTime = `${is24h ? String(hours).padStart(2, '0') : String(displayHour)}:${String(minutes).padStart(2, '0')}`;
  const digitalTimeSec = `${digitalTime}:${String(seconds).padStart(2, '0')}`;

  // 시계 스타일별 자연 콘텐츠 크기 (스케일 1일 때의 폭×높이)
  const baseDims: Record<ClockStyle, [number, number]> = {
    classic: [220, 260],
    minimal: [220, 260],
    digital: [320, 130],
    cat: [220, 250],
    flower: [220, 250],
    bear: [220, 250],
    wave: [220, 250],
    maple: [220, 250],
  };
  const [baseW, baseH] = baseDims[clockStyle];
  const { containerRef, scale: containerScale } = useContainerScale(baseW, baseH);

  if (clockStyle === 'digital') return <ScaleWrap ref={containerRef} scale={containerScale}><DigitalClock time={digitalTimeSec} ampm={ampm} /></ScaleWrap>;
  if (clockStyle === 'cat') return <ScaleWrap ref={containerRef} scale={containerScale}><CatClock hourAngle={hourAngle} minuteAngle={minuteAngle} secondAngle={secondAngle} digitalTime={digitalTime} ampm={ampm} /></ScaleWrap>;
  if (clockStyle === 'flower') return <ScaleWrap ref={containerRef} scale={containerScale}><FlowerClock hourAngle={hourAngle} minuteAngle={minuteAngle} secondAngle={secondAngle} digitalTime={digitalTime} ampm={ampm} /></ScaleWrap>;
  if (clockStyle === 'bear') return <ScaleWrap ref={containerRef} scale={containerScale}><BearClock hourAngle={hourAngle} minuteAngle={minuteAngle} secondAngle={secondAngle} digitalTime={digitalTime} ampm={ampm} /></ScaleWrap>;
  if (clockStyle === 'wave') return <ScaleWrap ref={containerRef} scale={containerScale}><WaveClock hourAngle={hourAngle} minuteAngle={minuteAngle} secondAngle={secondAngle} digitalTime={digitalTime} ampm={ampm} /></ScaleWrap>;
  if (clockStyle === 'maple') return <ScaleWrap ref={containerRef} scale={containerScale}><MapleClock hourAngle={hourAngle} minuteAngle={minuteAngle} secondAngle={secondAngle} digitalTime={digitalTime} ampm={ampm} /></ScaleWrap>;

  // classic / minimal 공통 아날로그 시계
  const size = 180;
  const center = size / 2;
  const clockRadius = 78;
  const isMinimal = clockStyle === 'minimal';

  return (
    <div ref={containerRef} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', width: '100%' }}>
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', transform: `scale(${containerScale})`, transformOrigin: 'center center' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* 테두리 */}
        <circle
          cx={center} cy={center} r={clockRadius}
          fill={isMinimal ? 'none' : 'none'}
          stroke={isMinimal ? '#e2e8f0' : '#6366f1'}
          strokeWidth={isMinimal ? '1.5' : '2.5'}
          opacity={isMinimal ? 1 : 0.6}
        />

        {/* 숫자 + 눈금 */}
        {Array.from({ length: 12 }).map((_, i) => {
          const angle = ((i + 1) * 30 - 90) * (Math.PI / 180);
          const numR = clockRadius - 16;
          const tickOuterR = clockRadius - 4;
          const tickInnerR = clockRadius - (isMinimal ? 12 : 10);
          const nx = center + numR * Math.cos(angle);
          const ny = center + numR * Math.sin(angle);
          const tx1 = center + tickOuterR * Math.cos(angle);
          const ty1 = center + tickOuterR * Math.sin(angle);
          const tx2 = center + tickInnerR * Math.cos(angle);
          const ty2 = center + tickInnerR * Math.sin(angle);
          return (
            <g key={i}>
              {isMinimal ? (
                <line x1={tx1} y1={ty1} x2={tx2} y2={ty2} stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
              ) : (
                <>
                  <line x1={tx1} y1={ty1} x2={tx2} y2={ty2} stroke="#6366f1" strokeWidth="1.5" opacity="0.4" />
                  <text x={nx} y={ny} textAnchor="middle" dominantBaseline="central" fill="#64748b" fontSize="13" fontWeight="500">
                    {i + 1}
                  </text>
                </>
              )}
            </g>
          );
        })}

        {/* 분 눈금 */}
        {!isMinimal && Array.from({ length: 60 }).map((_, i) => {
          if (i % 5 === 0) return null;
          const angle = (i * 6 - 90) * (Math.PI / 180);
          const r1 = clockRadius - 4;
          const r2 = clockRadius - 7;
          return (
            <line key={`m${i}`}
              x1={center + r1 * Math.cos(angle)} y1={center + r1 * Math.sin(angle)}
              x2={center + r2 * Math.cos(angle)} y2={center + r2 * Math.sin(angle)}
              stroke="#cbd5e1" strokeWidth="0.8"
            />
          );
        })}

        {/* 시침 */}
        <line x1={center} y1={center}
          x2={center + (isMinimal ? 36 : 40) * Math.sin((hourAngle * Math.PI) / 180)}
          y2={center - (isMinimal ? 36 : 40) * Math.cos((hourAngle * Math.PI) / 180)}
          stroke={isMinimal ? '#334155' : '#1e293b'} strokeWidth={isMinimal ? '4' : '3.5'} strokeLinecap="round"
        />

        {/* 분침 */}
        <line x1={center} y1={center}
          x2={center + (isMinimal ? 52 : 56) * Math.sin((minuteAngle * Math.PI) / 180)}
          y2={center - (isMinimal ? 52 : 56) * Math.cos((minuteAngle * Math.PI) / 180)}
          stroke={isMinimal ? '#334155' : '#1e293b'} strokeWidth={isMinimal ? '3' : '2.5'} strokeLinecap="round"
        />

        {/* 초침 */}
        <line x1={center} y1={center}
          x2={center + 60 * Math.sin((secondAngle * Math.PI) / 180)}
          y2={center - 60 * Math.cos((secondAngle * Math.PI) / 180)}
          stroke={isMinimal ? '#6366f1' : '#ef4444'} strokeWidth="1.2" strokeLinecap="round"
        />

        {/* 중심점 */}
        <circle cx={center} cy={center} r={isMinimal ? '4' : '3.5'} fill={isMinimal ? '#6366f1' : '#1e293b'} />
        <circle cx={center} cy={center} r="1.5" fill="white" />
      </svg>

      {/* 디지털 시간 */}
      <div style={{ fontSize: '18px', fontWeight: 600, color: '#334155', fontVariantNumeric: 'tabular-nums' }}>
        {ampm && <span style={{ marginRight: '4px' }}>{ampm}</span>}
        {digitalTime}
      </div>
    </div>
    </div>
  );
}

// ScaleWrap — 컨테이너 스케일 래퍼
import { forwardRef, type ReactNode } from 'react';
const ScaleWrap = forwardRef<HTMLDivElement, { scale: number; children: ReactNode }>(
  function ScaleWrap({ scale, children }, ref) {
    return (
      <div ref={ref} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', width: '100%' }}>
        <div style={{ transform: `scale(${scale})`, transformOrigin: 'center center' }}>
          {children}
        </div>
      </div>
    );
  }
);

// 디지털 시계 스타일
function DigitalClock({ time, ampm }: { time: string; ampm: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '8px' }}>
      <div style={{
        fontSize: '64px',
        fontWeight: 700,
        fontFamily: "'JetBrains Mono', 'SF Mono', monospace",
        color: '#1e293b',
        letterSpacing: '2px',
        fontVariantNumeric: 'tabular-nums',
        lineHeight: 1,
      }}>
        {time}
      </div>
      {ampm && (
        <div style={{ fontSize: '20px', fontWeight: 600, color: '#6366f1' }}>{ampm}</div>
      )}
    </div>
  );
}

// 고양이 시계 스타일
interface AnalogProps {
  hourAngle: number;
  minuteAngle: number;
  secondAngle: number;
  digitalTime: string;
  ampm: string;
}

function CatClock({ hourAngle, minuteAngle, secondAngle, digitalTime, ampm }: AnalogProps) {
  const size = 200;
  const c = size / 2;
  const r = 72;
  // 꼬리 흔들기 (초침 각도 기반)
  const tailSwing = Math.sin(secondAngle * Math.PI / 180) * 15;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '2px' }}>
      <svg width={size} height={size + 10} viewBox={`0 0 ${size} ${size + 10}`}>
        {/* 귀 */}
        <path d={`M${c - 55},${c - 58} L${c - 38},${c - 85} L${c - 20},${c - 62}`}
          fill="#fbbf24" stroke="#f59e0b" strokeWidth="2" strokeLinejoin="round" />
        <path d={`M${c + 55},${c - 58} L${c + 38},${c - 85} L${c + 20},${c - 62}`}
          fill="#fbbf24" stroke="#f59e0b" strokeWidth="2" strokeLinejoin="round" />
        {/* 안쪽 귀 */}
        <path d={`M${c - 50},${c - 60} L${c - 38},${c - 78} L${c - 26},${c - 63}`}
          fill="#fca5a5" />
        <path d={`M${c + 50},${c - 60} L${c + 38},${c - 78} L${c + 26},${c - 63}`}
          fill="#fca5a5" />

        {/* 얼굴 원 */}
        <circle cx={c} cy={c} r={r} fill="#fef3c7" stroke="#f59e0b" strokeWidth="2.5" />

        {/* 눈 */}
        <ellipse cx={c - 22} cy={c - 12} rx="7" ry="9" fill="#1e293b" />
        <ellipse cx={c + 22} cy={c - 12} rx="7" ry="9" fill="#1e293b" />
        <circle cx={c - 19} cy={c - 14} r="2.5" fill="white" />
        <circle cx={c + 25} cy={c - 14} r="2.5" fill="white" />

        {/* 코 */}
        <ellipse cx={c} cy={c + 2} rx="5" ry="3.5" fill="#f472b6" />

        {/* 입 */}
        <path d={`M${c - 8},${c + 6} Q${c},${c + 14} ${c + 8},${c + 6}`} fill="none" stroke="#f59e0b" strokeWidth="1.5" />

        {/* 수염 */}
        <line x1={c - 30} y1={c - 2} x2={c - 60} y2={c - 8} stroke="#d97706" strokeWidth="1" />
        <line x1={c - 30} y1={c + 4} x2={c - 58} y2={c + 6} stroke="#d97706" strokeWidth="1" />
        <line x1={c + 30} y1={c - 2} x2={c + 60} y2={c - 8} stroke="#d97706" strokeWidth="1" />
        <line x1={c + 30} y1={c + 4} x2={c + 58} y2={c + 6} stroke="#d97706" strokeWidth="1" />

        {/* 숫자 (12, 3, 6, 9만) */}
        {[
          { n: '12', x: c, y: c - r + 18 },
          { n: '3', x: c + r - 18, y: c },
          { n: '6', x: c, y: c + r - 14 },
          { n: '9', x: c - r + 16, y: c },
        ].map(({ n, x, y }) => (
          <text key={n} x={x} y={y} textAnchor="middle" dominantBaseline="central"
            fill="#92400e" fontSize="12" fontWeight="700">{n}</text>
        ))}

        {/* 시침 */}
        <line x1={c} y1={c} x2={c + 32 * Math.sin(hourAngle * Math.PI / 180)} y2={c - 32 * Math.cos(hourAngle * Math.PI / 180)}
          stroke="#92400e" strokeWidth="3.5" strokeLinecap="round" />
        {/* 분침 */}
        <line x1={c} y1={c} x2={c + 48 * Math.sin(minuteAngle * Math.PI / 180)} y2={c - 48 * Math.cos(minuteAngle * Math.PI / 180)}
          stroke="#92400e" strokeWidth="2.5" strokeLinecap="round" />
        {/* 초침 */}
        <line x1={c} y1={c} x2={c + 52 * Math.sin(secondAngle * Math.PI / 180)} y2={c - 52 * Math.cos(secondAngle * Math.PI / 180)}
          stroke="#f472b6" strokeWidth="1.2" strokeLinecap="round" />
        {/* 중심 */}
        <circle cx={c} cy={c} r="4" fill="#f472b6" />
        <circle cx={c} cy={c} r="1.5" fill="white" />

        {/* 꼬리 (아래에서 흔들림) */}
        <path
          d={`M${c},${c + r + 2} Q${c + tailSwing},${c + r + 22} ${c + tailSwing * 0.5},${c + r + 36}`}
          fill="none" stroke="#f59e0b" strokeWidth="4" strokeLinecap="round"
          style={{ transition: 'd 0.5s ease' }}
        />
      </svg>
      <div style={{ fontSize: '16px', fontWeight: 700, color: '#92400e', fontVariantNumeric: 'tabular-nums' }}>
        {ampm && <span style={{ marginRight: '4px' }}>{ampm}</span>}
        {digitalTime} 🐱
      </div>
    </div>
  );
}

// 벚꽃 시계 스타일
function FlowerClock({ hourAngle, minuteAngle, secondAngle, digitalTime, ampm }: AnalogProps) {
  const size = 200;
  const c = size / 2;
  const r = 74;

  // 벚꽃 한 송이 SVG (꽃잎 5장 + 중심)
  function sakura(sx: number, sy: number, sz: number, rot: number, opacity: number) {
    return (
      <g transform={`translate(${sx},${sy}) rotate(${rot}) scale(${sz})`} opacity={opacity}>
        {[0, 72, 144, 216, 288].map((a) => (
          <ellipse key={a} cx={0} cy={-5} rx="3.2" ry="5.5" fill="#fbcfe8"
            transform={`rotate(${a})`} />
        ))}
        <circle cx={0} cy={0} r="2" fill="#f9a8d4" />
      </g>
    );
  }

  // 떨어지는 꽃잎 위치들 (고정, 랜덤 느낌)
  const petals = [
    { x: 22, y: 30, sz: 0.8, rot: 20 },
    { x: 170, y: 50, sz: 0.7, rot: -30 },
    { x: 40, y: 160, sz: 0.9, rot: 45 },
    { x: 165, y: 155, sz: 0.6, rot: -15 },
    { x: 15, y: 95, sz: 0.5, rot: 60 },
    { x: 180, y: 100, sz: 0.55, rot: -50 },
    { x: 85, y: 12, sz: 0.7, rot: 10 },
    { x: 120, y: 185, sz: 0.65, rot: -40 },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '4px', position: 'relative', overflow: 'hidden' }}>
      {/* 떨어지는 꽃잎 CSS 애니메이션 */}
      <style>{`
        @keyframes sakuraFall {
          0% { transform: translateY(-20px) rotate(0deg); opacity: 0; }
          10% { opacity: 0.7; }
          90% { opacity: 0.5; }
          100% { transform: translateY(220px) rotate(360deg); opacity: 0; }
        }
      `}</style>

      {/* 떨어지는 작은 꽃잎들 */}
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} style={{
          position: 'absolute',
          left: `${15 + i * 18}%`,
          top: '-10px',
          width: '12px',
          height: '12px',
          borderRadius: '50% 0 50% 50%',
          background: i % 2 === 0 ? '#fbcfe8' : '#f9a8d4',
          opacity: 0,
          animation: `sakuraFall ${4 + i * 0.8}s ease-in ${i * 1.5}s infinite`,
          pointerEvents: 'none',
        }} />
      ))}

      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* 배경 원 - 연분홍 */}
        <circle cx={c} cy={c} r={r} fill="#fff1f2" />
        <circle cx={c} cy={c} r={r} fill="none" stroke="#f9a8d4" strokeWidth="2" />

        {/* 장식 벚꽃들 (시계 바깥) */}
        {petals.map((p, i) => (
          <g key={i}>{sakura(p.x, p.y, p.sz, p.rot, 0.6)}</g>
        ))}

        {/* 12시 위치에 벚꽃 (큰 장식) */}
        {sakura(c, c - r + 4, 1.2, 0, 0.9)}
        {sakura(c - r + 6, c, 1.0, 30, 0.8)}
        {sakura(c + r - 6, c, 1.0, -30, 0.8)}
        {sakura(c, c + r - 4, 1.1, 15, 0.85)}

        {/* 눈금 (점) */}
        {Array.from({ length: 12 }).map((_, i) => {
          const angle = (i * 30 - 90) * (Math.PI / 180);
          const dr = r - 12;
          return (
            <circle key={i} cx={c + dr * Math.cos(angle)} cy={c + dr * Math.sin(angle)}
              r="2.5" fill="#f472b6" opacity="0.5" />
          );
        })}

        {/* 숫자 (12, 3, 6, 9만) */}
        {[
          { n: '12', x: c, y: c - r + 24 },
          { n: '3', x: c + r - 24, y: c },
          { n: '6', x: c, y: c + r - 20 },
          { n: '9', x: c - r + 22, y: c },
        ].map(({ n, x, y }) => (
          <text key={n} x={x} y={y} textAnchor="middle" dominantBaseline="central"
            fill="#be185d" fontSize="14" fontWeight="700">{n}</text>
        ))}

        {/* 시침 - 벚꽃 가지 느낌 */}
        <line x1={c} y1={c} x2={c + 32 * Math.sin(hourAngle * Math.PI / 180)} y2={c - 32 * Math.cos(hourAngle * Math.PI / 180)}
          stroke="#9d174d" strokeWidth="3.5" strokeLinecap="round" />
        {/* 분침 */}
        <line x1={c} y1={c} x2={c + 48 * Math.sin(minuteAngle * Math.PI / 180)} y2={c - 48 * Math.cos(minuteAngle * Math.PI / 180)}
          stroke="#9d174d" strokeWidth="2.5" strokeLinecap="round" />
        {/* 초침 */}
        <line x1={c} y1={c} x2={c + 54 * Math.sin(secondAngle * Math.PI / 180)} y2={c - 54 * Math.cos(secondAngle * Math.PI / 180)}
          stroke="#ec4899" strokeWidth="1.2" strokeLinecap="round" />

        {/* 중심 벚꽃 */}
        {sakura(c, c, 1.0, 0, 1)}
      </svg>

      <div style={{ fontSize: '16px', fontWeight: 700, color: '#9d174d', fontVariantNumeric: 'tabular-nums' }}>
        {ampm && <span style={{ marginRight: '4px', color: '#ec4899' }}>{ampm}</span>}
        {digitalTime} 🌸
      </div>
    </div>
  );
}

// 곰돌이 시계 스타일
function BearClock({ hourAngle, minuteAngle, secondAngle, digitalTime, ampm }: AnalogProps) {
  const size = 200;
  const c = size / 2;
  const r = 70;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '2px' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* 귀 (큰 원) */}
        <circle cx={c - 52} cy={c - 52} r="28" fill="#d4a574" stroke="#c08a5a" strokeWidth="2" />
        <circle cx={c + 52} cy={c - 52} r="28" fill="#d4a574" stroke="#c08a5a" strokeWidth="2" />
        {/* 안쪽 귀 */}
        <circle cx={c - 52} cy={c - 52} r="16" fill="#f0c9a0" />
        <circle cx={c + 52} cy={c - 52} r="16" fill="#f0c9a0" />

        {/* 얼굴 */}
        <circle cx={c} cy={c} r={r} fill="#e8c9a0" stroke="#d4a574" strokeWidth="2.5" />

        {/* 볼 터치 */}
        <circle cx={c - 32} cy={c + 14} r="10" fill="#f9a8d4" opacity="0.35" />
        <circle cx={c + 32} cy={c + 14} r="10" fill="#f9a8d4" opacity="0.35" />

        {/* 눈 */}
        <circle cx={c - 20} cy={c - 14} r="6" fill="#3f2a1a" />
        <circle cx={c + 20} cy={c - 14} r="6" fill="#3f2a1a" />
        {/* 눈 하이라이트 */}
        <circle cx={c - 18} cy={c - 16} r="2" fill="white" />
        <circle cx={c + 22} cy={c - 16} r="2" fill="white" />

        {/* 코 */}
        <ellipse cx={c} cy={c + 4} rx="8" ry="6" fill="#3f2a1a" />
        <ellipse cx={c - 1} cy={c + 2} rx="3" ry="2" fill="#8b6b4a" opacity="0.6" />

        {/* 입 */}
        <path d={`M${c - 6},${c + 10} Q${c},${c + 18} ${c + 6},${c + 10}`} fill="none" stroke="#3f2a1a" strokeWidth="1.5" strokeLinecap="round" />

        {/* 숫자 (12, 3, 6, 9) */}
        {[
          { n: '12', x: c, y: c - r + 18 },
          { n: '3', x: c + r - 18, y: c },
          { n: '6', x: c, y: c + r - 12 },
          { n: '9', x: c - r + 16, y: c },
        ].map(({ n, x, y }) => (
          <text key={n} x={x} y={y} textAnchor="middle" dominantBaseline="central"
            fill="#8b6b4a" fontSize="11" fontWeight="700">{n}</text>
        ))}

        {/* 눈금 점 (12, 3, 6, 9 제외) */}
        {Array.from({ length: 12 }).map((_, i) => {
          if (i % 3 === 0) return null;
          const angle = (i * 30 - 90) * (Math.PI / 180);
          const dr = r - 12;
          return (
            <circle key={i} cx={c + dr * Math.cos(angle)} cy={c + dr * Math.sin(angle)}
              r="2" fill="#c08a5a" opacity="0.5" />
          );
        })}

        {/* 시침 */}
        <line x1={c} y1={c} x2={c + 30 * Math.sin(hourAngle * Math.PI / 180)} y2={c - 30 * Math.cos(hourAngle * Math.PI / 180)}
          stroke="#6b4423" strokeWidth="3.5" strokeLinecap="round" />
        {/* 분침 */}
        <line x1={c} y1={c} x2={c + 46 * Math.sin(minuteAngle * Math.PI / 180)} y2={c - 46 * Math.cos(minuteAngle * Math.PI / 180)}
          stroke="#6b4423" strokeWidth="2.5" strokeLinecap="round" />
        {/* 초침 */}
        <line x1={c} y1={c} x2={c + 50 * Math.sin(secondAngle * Math.PI / 180)} y2={c - 50 * Math.cos(secondAngle * Math.PI / 180)}
          stroke="#ef4444" strokeWidth="1.2" strokeLinecap="round" />

        {/* 중심 */}
        <circle cx={c} cy={c} r="4" fill="#6b4423" />
        <circle cx={c} cy={c} r="1.5" fill="#e8c9a0" />
      </svg>
      <div style={{ fontSize: '16px', fontWeight: 700, color: '#6b4423', fontVariantNumeric: 'tabular-nums' }}>
        {ampm && <span style={{ marginRight: '4px' }}>{ampm}</span>}
        {digitalTime} 🐻
      </div>
    </div>
  );
}

// 파도 시계 스타일 — 여름 바다 느낌
function WaveClock({ hourAngle, minuteAngle, secondAngle, digitalTime, ampm }: AnalogProps) {
  const size = 200;
  const c = size / 2;
  const r = 80;

  // 한 파장(WAVE_LEN)을 정확히 옆으로 밀어내면 끊김 없이 이어진다
  const WAVE_LEN = 80;

  // 사인파 비슷한 path 생성: q ... t ... t ... 반복
  // y_base = 파도 윗선의 기준 y, amp = 진폭. 아래쪽은 size+20까지 채워서 바다처럼 보이게.
  const wavePath = (yBase: number, amp: number): string => {
    const startX = -WAVE_LEN * 2;
    const endX = size + WAVE_LEN * 2;
    const half = WAVE_LEN / 2;
    let d = `M ${startX} ${yBase}`;
    let up = true;
    for (let x = startX; x < endX; x += half) {
      const dy = up ? -amp : amp;
      d += ` q ${half / 2} ${dy} ${half} 0`;
      up = !up;
    }
    d += ` L ${endX} ${size + 20} L ${startX} ${size + 20} Z`;
    return d;
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      height: '100%', gap: '4px', position: 'relative', overflow: 'hidden',
    }}>
      <style>{`
        @keyframes waveDriftL {
          from { transform: translateX(0); }
          to   { transform: translateX(-${WAVE_LEN}px); }
        }
        @keyframes waveDriftR {
          from { transform: translateX(-${WAVE_LEN}px); }
          to   { transform: translateX(0); }
        }
        @keyframes bubbleRise {
          0%   { transform: translateY(0) translateX(0); opacity: 0; }
          15%  { opacity: 0.8; }
          50%  { transform: translateY(-90px) translateX(6px); }
          85%  { opacity: 0.6; }
          100% { transform: translateY(-180px) translateX(-4px); opacity: 0; }
        }
        @keyframes sunGlow {
          0%, 100% { opacity: 0.5; }
          50%      { opacity: 0.8; }
        }
      `}</style>

      {/* 올라가는 거품들 (꽃잎 떨어지기와 같은 패턴, 방향만 반대) */}
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} style={{
          position: 'absolute',
          left: `${20 + i * 16}%`,
          bottom: '20px',
          width: `${6 + (i % 3) * 2}px`,
          height: `${6 + (i % 3) * 2}px`,
          borderRadius: '50%',
          background: 'rgba(224, 242, 254, 0.85)',
          border: '1.5px solid rgba(125, 211, 252, 0.7)',
          opacity: 0,
          animation: `bubbleRise ${3.5 + i * 0.7}s ease-in ${i * 0.9}s infinite`,
          pointerEvents: 'none',
        }} />
      ))}

      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <clipPath id="wave-clip">
            <circle cx={c} cy={c} r={r - 3} />
          </clipPath>
          <linearGradient id="wave-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fef9c3" />
            <stop offset="40%" stopColor="#dbeafe" />
            <stop offset="100%" stopColor="#bfdbfe" />
          </linearGradient>
        </defs>

        {/* 외곽 링 — 짙은 네이비 (구명튜브 느낌) */}
        <circle cx={c} cy={c} r={r} fill="#0c4a6e" />
        <circle cx={c} cy={c} r={r - 2} fill="#bae6fd" />

        {/* 시계 안쪽: 하늘 + 해 + 파도 */}
        <g clipPath="url(#wave-clip)">
          <rect x={0} y={0} width={size} height={size} fill="url(#wave-sky)" />

          {/* 해 (오른쪽 위) */}
          <circle cx={c + r - 26} cy={c - r + 28} r="16"
            fill="#fde047" opacity="0.55"
            style={{ animation: 'sunGlow 3s ease-in-out infinite' }} />
          <circle cx={c + r - 26} cy={c - r + 28} r="10" fill="#facc15" />

          {/* 파도 3겹 — 깊이감 위해 속도/색/투명도 차이 */}
          <path d={wavePath(c + 24, 5)} fill="#7dd3fc" opacity="0.55"
            style={{ animation: 'waveDriftL 7s linear infinite', transformOrigin: '0 0' }} />
          <path d={wavePath(c + 38, 7)} fill="#38bdf8" opacity="0.7"
            style={{ animation: 'waveDriftR 5s linear infinite', transformOrigin: '0 0' }} />
          <path d={wavePath(c + 52, 9)} fill="#0284c7" opacity="0.85"
            style={{ animation: 'waveDriftL 4s linear infinite', transformOrigin: '0 0' }} />
        </g>

        {/* 외곽 링 윤곽선 (clip 위에 한 번 더) */}
        <circle cx={c} cy={c} r={r} fill="none" stroke="#0c4a6e" strokeWidth="3" />

        {/* 12, 3, 6, 9 숫자 — 흰 외곽선으로 가독성 */}
        {[
          { n: '12', x: c, y: c - r + 18 },
          { n: '3', x: c + r - 18, y: c },
          { n: '6', x: c, y: c + r - 14 },
          { n: '9', x: c - r + 16, y: c },
        ].map(({ n, x, y }) => (
          <text key={n} x={x} y={y} textAnchor="middle" dominantBaseline="central"
            fill="#0c4a6e" fontSize="13" fontWeight="700"
            stroke="white" strokeWidth="2.5" paintOrder="stroke"
            style={{ pointerEvents: 'none' }}>{n}</text>
        ))}

        {/* 분 눈금 (점) — 12,3,6,9 제외 */}
        {Array.from({ length: 12 }).map((_, i) => {
          if (i % 3 === 0) return null;
          const angle = (i * 30 - 90) * (Math.PI / 180);
          const dr = r - 12;
          return (
            <circle key={i} cx={c + dr * Math.cos(angle)} cy={c + dr * Math.sin(angle)}
              r="2" fill="#0c4a6e" opacity="0.55" />
          );
        })}

        {/* 시침 */}
        <line x1={c} y1={c}
          x2={c + 32 * Math.sin(hourAngle * Math.PI / 180)}
          y2={c - 32 * Math.cos(hourAngle * Math.PI / 180)}
          stroke="#0c4a6e" strokeWidth="3.8" strokeLinecap="round" />
        {/* 분침 */}
        <line x1={c} y1={c}
          x2={c + 48 * Math.sin(minuteAngle * Math.PI / 180)}
          y2={c - 48 * Math.cos(minuteAngle * Math.PI / 180)}
          stroke="#075985" strokeWidth="2.6" strokeLinecap="round" />
        {/* 초침 — 산호색 */}
        <line x1={c} y1={c}
          x2={c + 54 * Math.sin(secondAngle * Math.PI / 180)}
          y2={c - 54 * Math.cos(secondAngle * Math.PI / 180)}
          stroke="#fb7185" strokeWidth="1.4" strokeLinecap="round" />

        {/* 중심 — 작은 구명튜브 느낌 */}
        <circle cx={c} cy={c} r="5" fill="white" stroke="#0c4a6e" strokeWidth="1.5" />
        <circle cx={c} cy={c} r="2" fill="#fb7185" />
      </svg>

      <div style={{ fontSize: '16px', fontWeight: 700, color: '#075985', fontVariantNumeric: 'tabular-nums' }}>
        {ampm && <span style={{ marginRight: '4px', color: '#0ea5e9' }}>{ampm}</span>}
        {digitalTime} 🌊
      </div>
    </div>
  );
}

// 단풍 시계 스타일 — 가을 느낌
function MapleClock({ hourAngle, minuteAngle, secondAngle, digitalTime, ampm }: AnalogProps) {
  const size = 200;
  const c = size / 2;
  const r = 76;

  // 단풍잎 한 장 (ellipse 5장 부채형 + 줄기)
  function mapleLeaf(sx: number, sy: number, sz: number, rot: number, opacity: number, color: string) {
    return (
      <g transform={`translate(${sx},${sy}) rotate(${rot}) scale(${sz})`} opacity={opacity}>
        {[-60, -30, 0, 30, 60].map((a) => (
          <ellipse key={a} cx={0} cy={-7} rx="2.2" ry="7" fill={color}
            transform={`rotate(${a})`} />
        ))}
        <line x1={0} y1={0} x2={0} y2={5} stroke="#7c2d12" strokeWidth="1" strokeLinecap="round" />
      </g>
    );
  }

  // 떨어지는 단풍잎 6개 — 위치/딜레이/지속/이모지/사이즈 다양화
  const fallingLeaves = [
    { left: '8%',  delay: 0,   dur: 5.5, emoji: '🍁', size: 18 },
    { left: '24%', delay: 1.2, dur: 6.2, emoji: '🍂', size: 16 },
    { left: '40%', delay: 0.5, dur: 5.0, emoji: '🍁', size: 20 },
    { left: '56%', delay: 2.1, dur: 6.8, emoji: '🍂', size: 14 },
    { left: '72%', delay: 0.8, dur: 5.4, emoji: '🍁', size: 17 },
    { left: '88%', delay: 1.7, dur: 5.9, emoji: '🍂', size: 15 },
  ];

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      height: '100%', gap: '4px', position: 'relative', overflow: 'hidden',
    }}>
      <style>{`
        @keyframes leafFall {
          0%   { transform: translateY(-20px) translateX(0)    rotate(0deg);   opacity: 0; }
          10%  { opacity: 0.9; }
          25%  { transform: translateY(60px)  translateX(14px) rotate(90deg); }
          50%  { transform: translateY(120px) translateX(-14px) rotate(180deg); }
          75%  { transform: translateY(180px) translateX(14px) rotate(270deg); }
          95%  { opacity: 0.6; }
          100% { transform: translateY(240px) translateX(0)    rotate(360deg); opacity: 0; }
        }
      `}</style>

      {/* 떨어지는 단풍잎 (이모지) */}
      {fallingLeaves.map((leaf, i) => (
        <div key={i} style={{
          position: 'absolute',
          left: leaf.left,
          top: '-20px',
          fontSize: `${leaf.size}px`,
          opacity: 0,
          animation: `leafFall ${leaf.dur}s ease-in ${leaf.delay}s infinite`,
          pointerEvents: 'none',
          zIndex: 1,
          lineHeight: 1,
        }}>{leaf.emoji}</div>
      ))}

      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <radialGradient id="maple-bg" cx="0.5" cy="0.5" r="0.6">
            <stop offset="0%" stopColor="#fef3c7" />
            <stop offset="60%" stopColor="#fed7aa" />
            <stop offset="100%" stopColor="#fdba74" />
          </radialGradient>
        </defs>

        {/* 배경 원 */}
        <circle cx={c} cy={c} r={r} fill="url(#maple-bg)" />
        <circle cx={c} cy={c} r={r} fill="none" stroke="#92400e" strokeWidth="2.5" />

        {/* 시계 안 장식 단풍잎 4장 (1.5/4.5/7.5/10.5시 위치, 각각 다른 가을 색) */}
        {([
          { hour: 1.5,  color: '#dc2626' }, // 빨강
          { hour: 4.5,  color: '#ea580c' }, // 주황
          { hour: 7.5,  color: '#eab308' }, // 노랑
          { hour: 10.5, color: '#c2410c' }, // 짙은 주황
        ]).map(({ hour, color }, i) => {
          const angle = (hour * 30 - 90) * (Math.PI / 180);
          const dr = r - 14;
          const lx = c + dr * Math.cos(angle);
          const ly = c + dr * Math.sin(angle);
          return <g key={i}>{mapleLeaf(lx, ly, 0.95, hour * 30 + 10, 0.85, color)}</g>;
        })}

        {/* 분 눈금 점 (12, 3, 6, 9 제외) */}
        {Array.from({ length: 12 }).map((_, i) => {
          if (i % 3 === 0) return null;
          const angle = (i * 30 - 90) * (Math.PI / 180);
          const dr = r - 10;
          return (
            <circle key={i} cx={c + dr * Math.cos(angle)} cy={c + dr * Math.sin(angle)}
              r="1.8" fill="#92400e" opacity="0.5" />
          );
        })}

        {/* 12, 3, 6, 9 숫자 — 흰 외곽선으로 가독성 확보 */}
        {[
          { n: '12', x: c, y: c - r + 16 },
          { n: '3', x: c + r - 16, y: c },
          { n: '6', x: c, y: c + r - 14 },
          { n: '9', x: c - r + 16, y: c },
        ].map(({ n, x, y }) => (
          <text key={n} x={x} y={y} textAnchor="middle" dominantBaseline="central"
            fill="#7c2d12" fontSize="14" fontWeight="700"
            stroke="#fffbeb" strokeWidth="2.5" paintOrder="stroke"
            style={{ pointerEvents: 'none' }}>{n}</text>
        ))}

        {/* 시침 */}
        <line x1={c} y1={c}
          x2={c + 32 * Math.sin(hourAngle * Math.PI / 180)}
          y2={c - 32 * Math.cos(hourAngle * Math.PI / 180)}
          stroke="#7c2d12" strokeWidth="3.8" strokeLinecap="round" />
        {/* 분침 */}
        <line x1={c} y1={c}
          x2={c + 48 * Math.sin(minuteAngle * Math.PI / 180)}
          y2={c - 48 * Math.cos(minuteAngle * Math.PI / 180)}
          stroke="#92400e" strokeWidth="2.6" strokeLinecap="round" />
        {/* 초침 — 선명한 빨강 */}
        <line x1={c} y1={c}
          x2={c + 54 * Math.sin(secondAngle * Math.PI / 180)}
          y2={c - 54 * Math.cos(secondAngle * Math.PI / 180)}
          stroke="#dc2626" strokeWidth="1.4" strokeLinecap="round" />

        {/* 중심 — 도토리 느낌 (몸통 + 캡) */}
        <circle cx={c} cy={c} r="5" fill="#a16207" stroke="#7c2d12" strokeWidth="1.2" />
        <path d={`M ${c - 4},${c - 1} A 4 3 0 0 1 ${c + 4},${c - 1} Z`} fill="#7c2d12" />
        <circle cx={c} cy={c + 0.5} r="1.2" fill="#fef3c7" opacity="0.7" />
      </svg>

      <div style={{ fontSize: '16px', fontWeight: 700, color: '#7c2d12', fontVariantNumeric: 'tabular-nums' }}>
        {ampm && <span style={{ marginRight: '4px', color: '#dc2626' }}>{ampm}</span>}
        {digitalTime} 🍁
      </div>
    </div>
  );
}
