import { useState } from 'react';

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

const MAIN_ITEMS: { type: string; icon: React.ReactNode; color: string; label: string }[] = [
  { type: 'calendar',       icon: <IoCalendarOutline size={SZ} />,      color: '#0ea5e9', label: '달력' },
  { type: 'roulette',       icon: <IoColorWandOutline size={SZ} />,     color: '#ec4899', label: '마블 룰렛' },
  { type: 'image',          icon: <IoImageOutline size={SZ} />,         color: '#0ea5e9', label: '이미지' },
  { type: 'random-name',    icon: <IoPersonOutline size={SZ} />,        color: '#0ea5e9', label: '이름 뽑기' },
  { type: 'text',           icon: <IoTextOutline size={SZ} />,          color: '#8b5cf6', label: '텍스트' },
  { type: 'work-symbols',   icon: <IoListOutline size={SZ} />,          color: '#f59e0b', label: '활동 안내' },
  { type: 'traffic-light',  icon: <TrafficLightIcon />,                  color: '#64748b', label: '신호등' },
  { type: 'timer',          icon: <IoTimerOutline size={SZ} />,          color: '#6366f1', label: '타이머' },
  { type: 'clock',          icon: <IoTimeOutline size={SZ} />,           color: '#0ea5e9', label: '시계' },
];

const EXTRA_ITEMS: typeof MAIN_ITEMS = [
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

  return (
    <div className="fixed bottom-4 left-0 right-0 z-[9999] flex flex-col items-center pointer-events-none">
      {/* 더보기 패널 */}
      {showMore && (
        <div className="pointer-events-auto mb-2 bg-white rounded-[20px] shadow-xl" style={{ padding: '16px 28px' }}>
          <div className="flex items-center" style={{ gap: 16 }}>
            {EXTRA_ITEMS.map((item) => (
              <BarButton
                key={item.type}
                icon={item.icon}
                color={item.color}
                label={item.label}
                onClick={() => {
                  onAddWidget(item.type as WidgetType);
                  setShowMore(false);
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* 메인 툴바 — 하나의 흰색 둥근 박스, overflow-hidden으로 배경 버튼 클리핑 */}
      <div
        className="pointer-events-auto bg-white shadow-xl flex items-center overflow-hidden"
        style={{ borderRadius: 24, padding: '20px 36px', gap: 20 }}
      >
        {/* 배경 버튼 — 다른 위젯과 동일한 스타일 */}
        <BarButton
          icon={<HiOutlinePhotograph size={SZ} />}
          color="#6366f1"
          label="배경"
          onClick={onOpenSettings}
        />

        {/* 위젯 버튼들 */}
          {MAIN_ITEMS.map((item) => (
            <BarButton
              key={item.type}
              icon={item.icon}
              color={item.color}
              label={item.label}
              onClick={() => {
                if (item.type === 'roulette') {
                  window.open('https://hryoon0.github.io/roulette/', '_blank');
                } else {
                  onAddWidget(item.type as WidgetType);
                }
              }}
            />
          ))}

          {/* 구분선 */}
          <div className="w-px h-10 shrink-0 bg-slate-200" />

          {/* 더보기 */}
          <button
            onClick={() => setShowMore(!showMore)}
            className={`flex flex-col items-center justify-center gap-1 w-14 h-14 rounded-xl transition-colors shrink-0 ${
              showMore ? 'bg-indigo-50' : 'hover:bg-slate-50'
            }`}
          >
            {showMore
              ? <IoChevronDown size={SZ} className="text-indigo-500" />
              : <IoAppsOutline size={SZ} className="text-slate-400" />
            }
            <span style={{ fontFamily: "'Do Hyeon', sans-serif", fontSize: '15px', color: showMore ? '#6366f1' : '#94a3b8' }}>
              더보기
            </span>
          </button>
      </div>
    </div>
  );
}

function BarButton({
  icon,
  color,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  color: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-1 w-14 h-14 rounded-xl hover:bg-slate-100/60 transition-colors shrink-0"
    >
      <span style={{ color }}>{icon}</span>
      <span style={{ fontFamily: "'Do Hyeon', sans-serif", fontSize: '15px', color: '#64748b', whiteSpace: 'nowrap' }}>
        {label}
      </span>
    </button>
  );
}
