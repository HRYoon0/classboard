import { useState, useRef, useCallback, useEffect } from 'react';

import type { WidgetType } from '../types/widget';
import {
  IoTimerOutline,
  IoStopwatchOutline,
  IoTimeOutline,
  IoVolumeHighOutline,
  IoPersonOutline,
  IoPeopleOutline,
  IoBarChartOutline,
  IoTextOutline,
  IoBrushOutline,
  IoQrCodeOutline,
  IoDiceOutline,
  IoListOutline,
  IoCalendarOutline,
  IoColorWandOutline,
  IoImageOutline,
  IoAlarmOutline,
  IoSchoolOutline,
  IoGameControllerOutline,
  IoCreateOutline,
  IoConstructOutline,
} from 'react-icons/io5';
import { HiOutlinePhotograph } from 'react-icons/hi';

const SZ = 28;
const MAX_SCALE = 1.4;
const EFFECT_DISTANCE = 100;

function TrafficLightIcon() {
  return (
    <svg width={SZ} height={SZ} viewBox="0 0 28 28" fill="none">
      <rect x="8" y="2" width="12" height="24" rx="4" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="14" cy="8" r="2.5" fill="#ef4444" />
      <circle cx="14" cy="14" r="2.5" fill="#eab308" />
      <circle cx="14" cy="20" r="2.5" fill="#22c55e" />
    </svg>
  );
}

interface WidgetItem {
  type: string;
  icon: React.ReactNode;
  color: string;
  label: string;
  external?: string; // 외부 링크
}

interface Category {
  id: string;
  icon: React.ReactNode;
  color: string;
  label: string;
  items: WidgetItem[];
}

const CATEGORIES: Category[] = [
  {
    id: 'time',
    icon: <IoAlarmOutline size={SZ} />,
    color: '#6366f1',
    label: '시간',
    items: [
      { type: 'timer', icon: <IoTimerOutline size={SZ} />, color: '#6366f1', label: '타이머' },
      { type: 'stopwatch', icon: <IoStopwatchOutline size={SZ} />, color: '#14b8a6', label: '스톱워치' },
      { type: 'clock', icon: <IoTimeOutline size={SZ} />, color: '#0ea5e9', label: '시계' },
    ],
  },
  {
    id: 'schedule',
    icon: <IoCalendarOutline size={SZ} />,
    color: '#0ea5e9',
    label: '일정',
    items: [
      { type: 'calendar', icon: <IoCalendarOutline size={SZ} />, color: '#0ea5e9', label: '달력' },
    ],
  },
  {
    id: 'classroom',
    icon: <IoSchoolOutline size={SZ} />,
    color: '#f59e0b',
    label: '수업 관리',
    items: [
      { type: 'traffic-light', icon: <TrafficLightIcon />, color: '#64748b', label: '신호등' },
      { type: 'work-symbols', icon: <IoListOutline size={SZ} />, color: '#f59e0b', label: '활동 안내' },
      { type: 'noise-meter', icon: <IoVolumeHighOutline size={SZ} />, color: '#22c55e', label: '소음 측정' },
    ],
  },
  {
    id: 'activity',
    icon: <IoGameControllerOutline size={SZ} />,
    color: '#ec4899',
    label: '뽑기/게임',
    items: [
      { type: 'random-name', icon: <IoPersonOutline size={SZ} />, color: '#0ea5e9', label: '이름 뽑기' },
      { type: 'group-maker', icon: <IoPeopleOutline size={SZ} />, color: '#f97316', label: '모둠' },
      { type: 'poll', icon: <IoBarChartOutline size={SZ} />, color: '#6366f1', label: '투표' },
      { type: 'dice', icon: <IoDiceOutline size={SZ} />, color: '#8b5cf6', label: '주사위' },
      { type: 'roulette', icon: <IoColorWandOutline size={SZ} />, color: '#ec4899', label: '마블 룰렛', external: 'https://hryoon0.github.io/roulette/' },
    ],
  },
  {
    id: 'content',
    icon: <IoCreateOutline size={SZ} />,
    color: '#8b5cf6',
    label: '글/그림',
    items: [
      { type: 'text', icon: <IoTextOutline size={SZ} />, color: '#8b5cf6', label: '텍스트' },
      { type: 'image', icon: <IoImageOutline size={SZ} />, color: '#10b981', label: '이미지' },
      { type: 'drawing', icon: <IoBrushOutline size={SZ} />, color: '#ec4899', label: '그림판' },
    ],
  },
  {
    id: 'tools',
    icon: <IoConstructOutline size={SZ} />,
    color: '#64748b',
    label: '도구',
    items: [
      { type: 'qr-code', icon: <IoQrCodeOutline size={SZ} />, color: '#6366f1', label: 'QR 코드' },
      { type: 'background', icon: <HiOutlinePhotograph size={SZ} />, color: '#6366f1', label: '배경' },
    ],
  },
];

interface Props {
  onAddWidget: (type: WidgetType) => void;
  onOpenSettings: () => void;
}

export default function Toolbar({ onAddWidget, onOpenSettings }: Props) {
  const [openCategoryId, setOpenCategoryId] = useState<string | null>(null);
  const [visible, setVisible] = useState(true);
  const [mouseX, setMouseX] = useState<number | null>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const hideTimerRef = useRef<number>(0);
  const isOverToolbar = useRef(false);

  // Auto-hide
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (e.clientY > window.innerHeight - 20 || isOverToolbar.current) {
        setVisible(true);
        clearTimeout(hideTimerRef.current);
      }
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const handleToolbarEnter = useCallback(() => {
    isOverToolbar.current = true;
    setVisible(true);
    clearTimeout(hideTimerRef.current);
  }, []);

  const handleToolbarLeave = useCallback(() => {
    isOverToolbar.current = false;
    setMouseX(null);
    setOpenCategoryId(null);
    hideTimerRef.current = window.setTimeout(() => {
      if (!isOverToolbar.current) setVisible(false);
    }, 800);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    setMouseX(e.clientX);
  }, []);

  const getScale = useCallback((el: HTMLElement | null): number => {
    if (!el || mouseX === null) return 1;
    const rect = el.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const distance = Math.abs(mouseX - centerX);
    if (distance > EFFECT_DISTANCE) return 1;
    return 1 + (MAX_SCALE - 1) * Math.cos((distance / EFFECT_DISTANCE) * (Math.PI / 2));
  }, [mouseX]);

  const handleItemClick = (item: WidgetItem) => {
    if (item.external) {
      window.open(item.external, '_blank');
    } else if (item.type === 'background') {
      onOpenSettings();
    } else {
      onAddWidget(item.type as WidgetType);
    }
    setOpenCategoryId(null);
  };

  const toggleCategory = (id: string) => {
    setOpenCategoryId((prev) => (prev === id ? null : id));
  };

  return (
    <div
      className="fixed left-0 right-0 z-[9999] flex flex-col items-center"
      style={{
        bottom: 0,
        paddingBottom: '12px',
        transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s',
        transform: visible ? 'translateY(0)' : 'translateY(calc(100% - 4px))',
        opacity: visible ? 1 : 0.3,
      }}
      onMouseEnter={handleToolbarEnter}
      onMouseLeave={handleToolbarLeave}
      onMouseMove={handleMouseMove}
      ref={toolbarRef}
    >
      {/* 열린 카테고리의 위젯 패널 */}
      {openCategoryId && (
        <div style={{
          marginBottom: '8px',
          background: 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(16px)',
          borderRadius: '20px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          border: '1px solid rgba(255,255,255,0.6)',
          padding: '14px 24px',
          animation: 'popUp 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {CATEGORIES.find((c) => c.id === openCategoryId)?.items.map((item) => (
              <button
                key={item.type}
                onClick={() => handleItemClick(item)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                  width: 60,
                  height: 60,
                  borderRadius: 14,
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  transition: 'transform 0.15s, background 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(0,0,0,0.04)';
                  e.currentTarget.style.transform = 'scale(1.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'none';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                <span style={{ color: item.color }}>{item.icon}</span>
                <span style={{
                  fontFamily: "'Do Hyeon', sans-serif",
                  fontSize: '13px',
                  color: '#475569',
                  whiteSpace: 'nowrap',
                }}>
                  {item.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 메인 카테고리 바 */}
      <div
        style={{
          background: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(16px)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.1)',
          borderRadius: 22,
          padding: '10px 24px',
          display: 'flex',
          alignItems: 'end',
          gap: 2,
          border: '1px solid rgba(255,255,255,0.6)',
        }}
      >
        {CATEGORIES.map((cat) => (
          <DockItem
            key={cat.id}
            icon={cat.icon}
            color={openCategoryId === cat.id ? cat.color : '#64748b'}
            label={cat.label}
            isActive={openCategoryId === cat.id}
            getScale={getScale}
            onClick={() => toggleCategory(cat.id)}
          />
        ))}
      </div>

      {/* 숨겨진 상태에서 하단 감지 바 */}
      {!visible && (
        <div
          style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: 20 }}
          onMouseEnter={() => { setVisible(true); clearTimeout(hideTimerRef.current); }}
        />
      )}

      {/* 애니메이션 CSS */}
      <style>{`
        @keyframes popUp {
          0% { opacity: 0; transform: translateY(12px) scale(0.95); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}

// macOS Dock 스타일 아이템
function DockItem({
  icon,
  color,
  label,
  isActive,
  getScale,
  onClick,
}: {
  icon: React.ReactNode;
  color: string;
  label: string;
  isActive: boolean;
  getScale: (el: HTMLElement | null) => number;
  onClick: () => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    let raf: number;
    const update = () => {
      const s = getScale(ref.current);
      setScale(s);
      raf = requestAnimationFrame(update);
    };
    raf = requestAnimationFrame(update);
    return () => cancelAnimationFrame(raf);
  }, [getScale]);

  return (
    <button
      ref={ref}
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 2,
        width: 58,
        height: 58,
        borderRadius: 14,
        border: 'none',
        background: isActive ? 'rgba(99,102,241,0.08)' : 'none',
        cursor: 'pointer',
        flexShrink: 0,
        transform: `scale(${scale})`,
        transformOrigin: 'bottom center',
        transition: 'transform 0.1s ease-out, background 0.15s',
      }}
    >
      <span style={{ color, transition: 'color 0.15s' }}>{icon}</span>
      <span style={{
        fontFamily: "'Do Hyeon', sans-serif",
        fontSize: `${Math.max(10, 14 / scale)}px`,
        color: isActive ? '#6366f1' : '#64748b',
        whiteSpace: 'nowrap',
        transition: 'color 0.15s',
      }}>
        {label}
      </span>
      {/* 활성 표시 점 */}
      {isActive && (
        <div style={{
          width: 4,
          height: 4,
          borderRadius: '50%',
          background: '#6366f1',
          position: 'absolute',
          bottom: 2,
        }} />
      )}
    </button>
  );
}
