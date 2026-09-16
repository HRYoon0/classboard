import { useState } from 'react';
import { useContainerScale } from '../../hooks/useContainerScale';

type Light = 'red' | 'yellow' | 'green' | 'off';

const LIGHTS: {
  color: Light;
  activeColor: string;
  glowColor: string;
  dimColor: string;
  label: string;
}[] = [
  {
    color: 'red',
    activeColor: '#ef4444',
    glowColor: 'rgba(239,68,68,0.5)',
    dimColor: '#7f1d1d',
    label: '조용히',
  },
  {
    color: 'yellow',
    activeColor: '#eab308',
    glowColor: 'rgba(234,179,8,0.5)',
    dimColor: '#713f12',
    label: '속삭이기',
  },
  {
    color: 'green',
    activeColor: '#22c55e',
    glowColor: 'rgba(34,197,94,0.5)',
    dimColor: '#14532d',
    label: '대화 가능',
  },
];

export default function TrafficLightWidget() {
  const [activeLight, setActiveLight] = useState<Light>('green');
  // 신호등 자연 콘텐츠 크기 — 윈도우/맥 폰트 차이까지 흡수할 수 있도록 약간 여유
  const { containerRef, scale } = useContainerScale(160, 360);

  return (
    <div ref={containerRef} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', width: '100%', overflow: 'hidden' }}>
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', transform: `scale(${scale})`, transformOrigin: 'center center' }}>
      {/* 신호등 하우징 */}
      <div style={{ background: 'linear-gradient(to bottom, #64748b, #334155)', borderRadius: '42px', padding: '9px', display: 'flex', flexDirection: 'column', gap: '7px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
        {LIGHTS.map(({ color, activeColor, glowColor, dimColor }) => {
          const isActive = activeLight === color;
          return (
            <button
              key={color}
              onClick={() => setActiveLight(activeLight === color ? 'off' : color)}
              style={{
                position: 'relative',
                width: 84,
                height: 84,
                borderRadius: '50%',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.3s',
                backgroundColor: isActive ? activeColor : dimColor,
                boxShadow: isActive
                  ? `0 0 30px ${glowColor}, inset 0 -4px 9px rgba(0,0,0,0.2), 0 0 60px ${glowColor}`
                  : 'inset 0 3px 6px rgba(0,0,0,0.3)',
              }}
            >
              {isActive && (
                <div style={{
                  position: 'absolute',
                  top: '4px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '36px',
                  height: '18px',
                  borderRadius: '50%',
                  background: 'radial-gradient(ellipse, rgba(255,255,255,0.5) 0%, transparent 70%)',
                }} />
              )}
            </button>
          );
        })}
      </div>
      {activeLight !== 'off' && (
        <p style={{
          fontSize: '33px',
          fontWeight: 700,
          color: LIGHTS.find((l) => l.color === activeLight)?.activeColor,
          textAlign: 'center',
          textShadow: '0 1px 3px rgba(0,0,0,0.1)',
          margin: '12px 0 0',
          whiteSpace: 'nowrap',
        }}>
          {LIGHTS.find((l) => l.color === activeLight)?.label}
        </p>
      )}
    </div>
    </div>
  );
}
