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
  external?: string;
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
    id: 'time', icon: <IoAlarmOutline size={SZ} />, color: '#6366f1', label: '시간',
    items: [
      { type: 'timer', icon: <IoTimerOutline size={SZ} />, color: '#6366f1', label: '타이머' },
      { type: 'stopwatch', icon: <IoStopwatchOutline size={SZ} />, color: '#14b8a6', label: '스톱워치' },
      { type: 'clock', icon: <IoTimeOutline size={SZ} />, color: '#0ea5e9', label: '시계' },
    ],
  },
  {
    id: 'schedule', icon: <IoCalendarOutline size={SZ} />, color: '#0ea5e9', label: '일정',
    items: [
      { type: 'calendar', icon: <IoCalendarOutline size={SZ} />, color: '#0ea5e9', label: '달력' },
    ],
  },
  {
    id: 'classroom', icon: <IoSchoolOutline size={SZ} />, color: '#f59e0b', label: '수업 관리',
    items: [
      { type: 'traffic-light', icon: <TrafficLightIcon />, color: '#64748b', label: '신호등' },
      { type: 'work-symbols', icon: <IoListOutline size={SZ} />, color: '#f59e0b', label: '활동 안내' },
      { type: 'noise-meter', icon: <IoVolumeHighOutline size={SZ} />, color: '#22c55e', label: '소음 측정' },
    ],
  },
  {
    id: 'activity', icon: <IoGameControllerOutline size={SZ} />, color: '#ec4899', label: '뽑기/게임',
    items: [
      { type: 'random-name', icon: <IoPersonOutline size={SZ} />, color: '#0ea5e9', label: '이름 뽑기' },
      { type: 'group-maker', icon: <IoPeopleOutline size={SZ} />, color: '#f97316', label: '모둠' },
      { type: 'poll', icon: <IoBarChartOutline size={SZ} />, color: '#6366f1', label: '투표' },
      { type: 'dice', icon: <IoDiceOutline size={SZ} />, color: '#8b5cf6', label: '주사위' },
      { type: 'roulette', icon: <IoColorWandOutline size={SZ} />, color: '#ec4899', label: '마블 룰렛', external: 'https://hryoon0.github.io/roulette/' },
    ],
  },
  {
    id: 'content', icon: <IoCreateOutline size={SZ} />, color: '#8b5cf6', label: '글/그림',
    items: [
      { type: 'text', icon: <IoTextOutline size={SZ} />, color: '#8b5cf6', label: '텍스트' },
      { type: 'image', icon: <IoImageOutline size={SZ} />, color: '#10b981', label: '이미지' },
      { type: 'drawing', icon: <IoBrushOutline size={SZ} />, color: '#ec4899', label: '그림판' },
    ],
  },
  {
    id: 'tools', icon: <IoConstructOutline size={SZ} />, color: '#64748b', label: '도구',
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
  const [anchorPos, setAnchorPos] = useState({ x: 0, y: 0 });
  const [visible, setVisible] = useState(true);
  const [mouseX, setMouseX] = useState<number | null>(null);
  const hideTimerRef = useRef<number>(0);
  const isOverArea = useRef(false);
  // 각 카테고리 버튼의 ref를 직접 관리
  const catBtnRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Auto-hide
  useEffect(() => {
    const handleGlobalMouse = (e: MouseEvent) => {
      if (e.clientY > window.innerHeight - 20 || isOverArea.current) {
        setVisible(true);
        clearTimeout(hideTimerRef.current);
      }
    };
    window.addEventListener('mousemove', handleGlobalMouse);
    return () => window.removeEventListener('mousemove', handleGlobalMouse);
  }, []);

  const handleAreaEnter = useCallback(() => {
    isOverArea.current = true;
    setVisible(true);
    clearTimeout(hideTimerRef.current);
  }, []);

  const handleAreaLeave = useCallback(() => {
    isOverArea.current = false;
    setMouseX(null);
    // 스택이 열려있으면 닫지 않음 (스택 배경 클릭으로만 닫힘)
    hideTimerRef.current = window.setTimeout(() => {
      if (!isOverArea.current && !openCategoryId) setVisible(false);
    }, 800);
  }, [openCategoryId]);

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

  const toggleCategory = (catIndex: number, catId: string) => {
    if (openCategoryId === catId) {
      setOpenCategoryId(null);
    } else {
      const el = catBtnRefs.current[catIndex];
      if (el) {
        const rect = el.getBoundingClientRect();
        setAnchorPos({ x: rect.left + rect.width / 2, y: rect.top });
      }
      setOpenCategoryId(catId);
    }
  };

  const openCategory = CATEGORIES.find((c) => c.id === openCategoryId);

  return (
    <>
      {/* 스택 아이템들 — portal처럼 body 레벨에 fixed */}
      {openCategory && (
        <div
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10000 }}
          onClick={() => { setOpenCategoryId(null); }}
          onMouseEnter={() => { isOverArea.current = true; clearTimeout(hideTimerRef.current); }}
        >
          {openCategory.items.map((item, i) => {
            const spacing = 62;
            const yOffset = anchorPos.y - (i + 1) * spacing;

            return (
              <div
                key={item.type}
                style={{
                  position: 'fixed',
                  left: anchorPos.x,
                  top: yOffset,
                  transform: 'translateX(-50%)',
                  animation: `stackIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) ${i * 0.05}s both`,
                  zIndex: 10001 + i,
                }}
              >
                <button
                  onClick={(e) => { e.stopPropagation(); handleItemClick(item); }}
                  onMouseDown={(e) => e.stopPropagation()}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '8px 16px 8px 10px',
                    background: 'rgba(255,255,255,0.95)',
                    backdropFilter: 'blur(12px)',
                    borderRadius: 14,
                    border: '1px solid rgba(255,255,255,0.6)',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'transform 0.12s, box-shadow 0.12s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.08)';
                    e.currentTarget.style.boxShadow = '0 6px 24px rgba(0,0,0,0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)';
                  }}
                >
                  <div style={{
                    width: 40, height: 40, borderRadius: 10,
                    background: `${item.color}15`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: item.color, flexShrink: 0,
                  }}>
                    {item.icon}
                  </div>
                  <span style={{
                    fontFamily: "'Do Hyeon', sans-serif",
                    fontSize: '15px',
                    color: '#334155',
                  }}>
                    {item.label}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Dock 영역 */}
      <div
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          paddingBottom: 12,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          zIndex: 9999,
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s',
          transform: visible ? 'translateY(0)' : 'translateY(calc(100% - 4px))',
          opacity: visible ? 1 : 0.3,
        }}
        onMouseEnter={handleAreaEnter}
        onMouseLeave={handleAreaLeave}
        onMouseMove={handleMouseMove}
      >
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
          {CATEGORIES.map((cat, idx) => (
            <DockCategoryBtn
              key={cat.id}
              ref={(el) => { catBtnRefs.current[idx] = el; }}
              icon={cat.icon}
              color={openCategoryId === cat.id ? cat.color : '#64748b'}
              label={cat.label}
              isActive={openCategoryId === cat.id}
              getScale={getScale}
              onClick={() => toggleCategory(idx, cat.id)}
            />
          ))}
        </div>
      </div>

      {/* 숨겨진 상태 감지 바 */}
      {!visible && (
        <div
          style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: 20, zIndex: 9998 }}
          onMouseEnter={() => { setVisible(true); clearTimeout(hideTimerRef.current); }}
        />
      )}

      <style>{`
        @keyframes stackIn {
          0% { opacity: 0; transform: translateX(-50%) translateY(40px) scale(0.6); }
          100% { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
        }
      `}</style>
    </>
  );
}

// Dock 카테고리 버튼
import { forwardRef } from 'react';

const DockCategoryBtn = forwardRef<HTMLButtonElement, {
  icon: React.ReactNode;
  color: string;
  label: string;
  isActive: boolean;
  getScale: (el: HTMLElement | null) => number;
  onClick: () => void;
}>(function DockCategoryBtn({ icon, color, label, isActive, getScale, onClick }, ref) {
  const localRef = useRef<HTMLButtonElement>(null);
  const [scale, setScale] = useState(1);

  // ref 동기화
  const setRefs = useCallback((el: HTMLButtonElement | null) => {
    (localRef as React.MutableRefObject<HTMLButtonElement | null>).current = el;
    if (typeof ref === 'function') ref(el);
    else if (ref) (ref as React.MutableRefObject<HTMLButtonElement | null>).current = el;
  }, [ref]);

  useEffect(() => {
    let raf: number;
    const update = () => {
      setScale(getScale(localRef.current));
      raf = requestAnimationFrame(update);
    };
    raf = requestAnimationFrame(update);
    return () => cancelAnimationFrame(raf);
  }, [getScale]);

  return (
    <button
      ref={setRefs}
      onClick={onClick}
      style={{
        position: 'relative',
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
      {isActive && (
        <div style={{
          position: 'absolute', bottom: 2, width: 4, height: 4,
          borderRadius: '50%', background: '#6366f1',
        }} />
      )}
    </button>
  );
});
