import { useState, useCallback, useEffect, useRef } from 'react';
import {
  IoVolumeOff,
  IoEar,
  IoChatbubbles,
  IoHelpCircle,
  IoPencil,
  IoBook,
  IoPeople,
  IoLaptop,
} from 'react-icons/io5';

interface Symbol {
  id: string;
  label: string;
  icon: (size: number) => React.ReactNode;
}

const SYMBOLS: Symbol[] = [
  {
    id: 'silence',
    label: '조용히',
    icon: (s) => <IoVolumeOff size={s} />,
  },
  {
    id: 'listen',
    label: '경청',
    icon: (s) => <IoEar size={s} />,
  },
  {
    id: 'discuss',
    label: '토론',
    icon: (s) => <IoChatbubbles size={s} />,
  },
  {
    id: 'question',
    label: '질문',
    icon: (s) => <IoHelpCircle size={s} />,
  },
  {
    id: 'write',
    label: '쓰기',
    icon: (s) => <IoPencil size={s} />,
  },
  {
    id: 'read',
    label: '읽기',
    icon: (s) => <IoBook size={s} />,
  },
  {
    id: 'pair',
    label: '짝활동',
    icon: (s) => <IoPeople size={s} />,
  },
  {
    id: 'computer',
    label: '컴퓨터',
    icon: (s) => <IoLaptop size={s} />,
  },
];

interface WidgetProps {
  isSelected?: boolean;
}

export default function WorkSymbolsWidget({ isSelected = false }: WidgetProps) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [visibleIcons, setVisibleIcons] = useState<boolean[]>(SYMBOLS.map(() => false));
  const [showPicker, setShowPicker] = useState(false);
  const timersRef = useRef<number[]>([]);

  useEffect(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];

    if (isSelected) {
      setShowPicker(true);
      SYMBOLS.forEach((_, i) => {
        const t = window.setTimeout(() => {
          setVisibleIcons((prev) => { const next = [...prev]; next[i] = true; return next; });
        }, i * 60);
        timersRef.current.push(t);
      });
    } else if (showPicker) {
      SYMBOLS.forEach((_, i) => {
        const t = window.setTimeout(() => {
          setVisibleIcons((prev) => { const next = [...prev]; next[i] = false; return next; });
        }, i * 50);
        timersRef.current.push(t);
      });
      const t = window.setTimeout(() => {
        setShowPicker(false);
      }, SYMBOLS.length * 50 + 200);
      timersRef.current.push(t);
    }

    return () => timersRef.current.forEach(clearTimeout);
  }, [isSelected]);

  const handleSelect = useCallback((idx: number) => {
    setActiveIdx(idx);
  }, []);

  const active = SYMBOLS[activeIdx];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        position: 'relative',
        cursor: 'pointer',
        userSelect: 'none',
      }}
    >
      {/* 메인 원형 아이콘 */}
      <div style={{
        width: '240px',
        height: '240px',
        borderRadius: '50%',
        background: '#f8fafc',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        color: '#1e293b',
        transition: 'transform 0.2s, box-shadow 0.2s',
        transform: isSelected ? 'scale(0.95)' : 'scale(1)',
      }}>
        {active.icon(90)}
        <span style={{
          fontSize: '22px',
          fontWeight: 600,
          color: '#475569',
          marginTop: '12px',
        }}>
          {active.label}
        </span>
      </div>

      {/* 하단 선택 바 */}
      {showPicker && (
        <div style={{
          position: 'absolute',
          bottom: '0',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: '8px',
        }}>
          {SYMBOLS.map((sym, i) => (
            <button
              key={sym.id}
              onClick={(e) => { e.stopPropagation(); handleSelect(i); }}
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                border: activeIdx === i ? '2px solid #6366f1' : '2px solid #e2e8f0',
                background: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: activeIdx === i ? '#6366f1' : '#64748b',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                padding: 0,
                opacity: visibleIcons[i] ? 1 : 0,
                transform: visibleIcons[i] ? 'scale(1)' : 'scale(0.6)',
                transition: 'opacity 0.2s ease, transform 0.2s ease, border 0.15s, color 0.15s',
              }}
            >
              {sym.icon(24)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
