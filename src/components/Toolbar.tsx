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
  IoAppsOutline,
  IoChevronDown,
  IoImageOutline,
} from 'react-icons/io5';
import { HiOutlinePhotograph } from 'react-icons/hi';

const SZ = 28;
const MAX_SCALE = 1.5;
const EFFECT_DISTANCE = 120; // 확대 효과 영향 거리 (px)

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

interface ToolbarItem {
  type: string;
  icon: React.ReactNode;
  color: string;
  label: string;
}

const MAIN_ITEMS: ToolbarItem[] = [
  { type: 'calendar',       icon: <IoCalendarOutline size={SZ} />,      color: '#0ea5e9', label: '달력' },
  { type: 'roulette',       icon: <IoColorWandOutline size={SZ} />,     color: '#ec4899', label: '마블 룰렛' },
  { type: 'image',          icon: <IoImageOutline size={SZ} />,         color: '#10b981', label: '이미지' },
  { type: 'random-name',    icon: <IoPersonOutline size={SZ} />,        color: '#0ea5e9', label: '이름 뽑기' },
  { type: 'text',           icon: <IoTextOutline size={SZ} />,          color: '#8b5cf6', label: '텍스트' },
  { type: 'work-symbols',   icon: <IoListOutline size={SZ} />,          color: '#f59e0b', label: '활동 안내' },
  { type: 'traffic-light',  icon: <TrafficLightIcon />,                  color: '#64748b', label: '신호등' },
  { type: 'timer',          icon: <IoTimerOutline size={SZ} />,          color: '#6366f1', label: '타이머' },
  { type: 'clock',          icon: <IoTimeOutline size={SZ} />,           color: '#0ea5e9', label: '시계' },
];

const EXTRA_ITEMS: ToolbarItem[] = [
  { type: 'noise-meter',    icon: <IoVolumeHighOutline size={SZ} />,    color: '#22c55e', label: '소음 측정' },
  { type: 'poll',           icon: <IoBarChartOutline size={SZ} />,      color: '#6366f1', label: '투표' },
  { type: 'stopwatch',      icon: <IoStopwatchOutline size={SZ} />,     color: '#14b8a6', label: '스톱워치' },
  { type: 'group-maker',    icon: <IoPeopleOutline size={SZ} />,        color: '#f97316', label: '모둠' },
  { type: 'drawing',        icon: <IoBrushOutline size={SZ} />,         color: '#ec4899', label: '그림판' },
  { type: 'qr-code',        icon: <IoQrCodeOutline size={SZ} />,        color: '#6366f1', label: 'QR 코드' },
  { type: 'dice',           icon: <IoDiceOutline size={SZ} />,          color: '#8b5cf6', label: '주사위' },
];

interface Props {
  onAddWidget: (type: WidgetType) => void;
  onOpenSettings: () => void;
}

export default function Toolbar({ onAddWidget, onOpenSettings }: Props) {
  const [showMore, setShowMore] = useState(false);
  const [visible, setVisible] = useState(true);
  const [mouseX, setMouseX] = useState<number | null>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const hideTimerRef = useRef<number>(0);
  const isOverToolbar = useRef(false);

  // 배경 + 메인 아이템 + 구분선 + 더보기를 합친 전체 인덱스용
  const allItems: (ToolbarItem & { isBackground?: boolean; isMore?: boolean })[] = [
    { type: 'background', icon: <HiOutlinePhotograph size={SZ} />, color: '#6366f1', label: '배경', isBackground: true },
    ...MAIN_ITEMS,
  ];

  // Auto-hide: 화면 하단 감지
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const threshold = window.innerHeight - 20;
      if (e.clientY > threshold || isOverToolbar.current) {
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
    hideTimerRef.current = window.setTimeout(() => {
      if (!isOverToolbar.current) setVisible(false);
    }, 800);
  }, []);

  const handleToolbarMouseMove = useCallback((e: React.MouseEvent) => {
    setMouseX(e.clientX);
  }, []);

  // 확대 스케일 계산 (macOS Dock 물결 효과)
  const getScale = useCallback((el: HTMLElement | null): number => {
    if (!el || mouseX === null) return 1;
    const rect = el.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const distance = Math.abs(mouseX - centerX);
    if (distance > EFFECT_DISTANCE) return 1;
    // cos 곡선으로 부드러운 확대
    const scale = 1 + (MAX_SCALE - 1) * Math.cos((distance / EFFECT_DISTANCE) * (Math.PI / 2));
    return scale;
  }, [mouseX]);

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
      onMouseMove={handleToolbarMouseMove}
      ref={toolbarRef}
    >
      {/* 더보기 패널 */}
      {showMore && (
        <div className="mb-2 bg-white rounded-[20px] shadow-xl" style={{ padding: '16px 28px' }}>
          <div className="flex items-center" style={{ gap: 16 }}>
            {EXTRA_ITEMS.map((item) => (
              <button
                key={item.type}
                onClick={() => {
                  onAddWidget(item.type as WidgetType);
                  setShowMore(false);
                }}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  gap: 2, width: 56, height: 56, borderRadius: 12, border: 'none', background: 'none',
                  cursor: 'pointer', flexShrink: 0,
                }}
              >
                <span style={{ color: item.color }}>{item.icon}</span>
                <span style={{ fontFamily: "'Do Hyeon', sans-serif", fontSize: '15px', color: '#64748b', whiteSpace: 'nowrap' }}>{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 메인 툴바 */}
      <div
        className="bg-white shadow-xl flex items-end overflow-visible"
        style={{ borderRadius: 24, padding: '12px 28px', gap: 4 }}
      >
        {allItems.map((item) => (
          <DockItem
            key={item.type}
            item={item}
            getScale={getScale}
            onClick={() => {
              if (item.isBackground) {
                onOpenSettings();
              } else if (item.type === 'roulette') {
                window.open('https://hryoon0.github.io/roulette/', '_blank');
              } else {
                onAddWidget(item.type as WidgetType);
              }
            }}
          />
        ))}

        {/* 구분선 */}
        <div style={{ width: 1, height: 40, background: '#e2e8f0', margin: '0 6px', flexShrink: 0, alignSelf: 'center' }} />

        {/* 더보기 */}
        <DockItem
          item={{ type: 'more', icon: showMore ? <IoChevronDown size={SZ} /> : <IoAppsOutline size={SZ} />, color: showMore ? '#6366f1' : '#94a3b8', label: '더보기', isMore: true }}
          getScale={getScale}
          onClick={() => setShowMore(!showMore)}
        />
      </div>

      {/* 숨겨진 상태에서 하단 감지 바 */}
      {!visible && (
        <div
          style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: 20 }}
          onMouseEnter={() => { setVisible(true); clearTimeout(hideTimerRef.current); }}
        />
      )}
    </div>
  );
}

// 개별 Dock 아이템 — ref로 자신의 위치를 추적
function DockItem({
  item,
  getScale,
  onClick,
}: {
  item: { type: string; icon: React.ReactNode; color: string; label: string; isBackground?: boolean; isMore?: boolean };
  getScale: (el: HTMLElement | null) => number;
  onClick: () => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const [scale, setScale] = useState(1);

  // requestAnimationFrame으로 스케일 업데이트 (성능 최적화)
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
        width: 56,
        height: 56,
        borderRadius: 12,
        border: 'none',
        background: 'none',
        cursor: 'pointer',
        flexShrink: 0,
        transform: `scale(${scale})`,
        transformOrigin: 'bottom center',
        transition: 'transform 0.1s ease-out',
      }}
    >
      <span style={{ color: item.color }}>{item.icon}</span>
      <span style={{
        fontFamily: "'Do Hyeon', sans-serif",
        fontSize: `${Math.max(10, 15 / scale)}px`,
        color: item.isMore ? item.color : '#64748b',
        whiteSpace: 'nowrap',
      }}>
        {item.label}
      </span>
    </button>
  );
}
