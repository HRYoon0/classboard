import { useRef, useState, useCallback, useEffect, type ReactNode } from 'react';
import { IoClose, IoSettings, IoEyeOff } from 'react-icons/io5';
import type { WidgetData } from '../types/widget';

interface Props {
  widget: WidgetData;
  scaleX: number;
  scaleY: number;
  scaleSize: number;
  onUpdate: (id: string, data: Partial<WidgetData>) => void;
  onRemove: (id: string) => void;
  onBringToFront: (id: string) => void;
  onConfigChange?: (id: string, config: Record<string, unknown>) => void;
  children: ReactNode;
  title?: string;
  settingsPanel?: ReactNode;
  isSelected: boolean;
  onSelect: (id: string | null) => void;
}

export default function WidgetWrapper({
  widget,
  scaleX,
  scaleY,
  scaleSize,
  onUpdate,
  onRemove,
  onBringToFront,
  onConfigChange,
  children,
  title: _title,
  settingsPanel,
  isSelected,
  onSelect,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // 선택 해제 시 설정 패널도 닫기
  useEffect(() => {
    if (!isSelected) setShowSettings(false);
  }, [isSelected]);

  // 드래그
  const handleDragStart = useCallback(
    (e: React.MouseEvent) => {
      const el = e.target as HTMLElement;
      const tag = el.tagName;
      if (['INPUT', 'TEXTAREA', 'BUTTON', 'SELECT', 'CANVAS', 'A'].includes(tag)) return;
      if (el.isContentEditable) return;

      e.preventDefault();
      e.stopPropagation();
      onBringToFront(widget.id);
      setIsDragging(true);
      onSelect(widget.id);

      const startMouseX = e.clientX;
      const startMouseY = e.clientY;
      const startX = widget.x;
      const startY = widget.y;

      const handleMove = (ev: MouseEvent) => {
        onUpdate(widget.id, {
          x: startX + (ev.clientX - startMouseX) / scaleX,
          y: startY + (ev.clientY - startMouseY) / scaleY,
        });
      };

      const handleUp = () => {
        setIsDragging(false);
        document.removeEventListener('mousemove', handleMove);
        document.removeEventListener('mouseup', handleUp);
      };

      document.addEventListener('mousemove', handleMove);
      document.addEventListener('mouseup', handleUp);
    },
    [widget.id, widget.x, widget.y, scaleX, scaleY, onUpdate, onBringToFront, onSelect]
  );

  // 리사이즈
  const handleResize = useCallback(
    (e: React.MouseEvent, corner: string) => {
      e.preventDefault();
      e.stopPropagation();
      onBringToFront(widget.id);

      const startMouseX = e.clientX;
      const startMouseY = e.clientY;
      const startW = widget.w;
      const startH = widget.h;
      const startX = widget.x;
      const startY = widget.y;

      const handleMove = (ev: MouseEvent) => {
        const dx = (ev.clientX - startMouseX) / scaleSize;
        const dy = (ev.clientY - startMouseY) / scaleSize;

        let newX = startX;
        let newY = startY;
        let newW = startW;
        let newH = startH;

        if (corner === 'bottom-right') {
          newW = startW + dx;
          newH = startH + dy;
        } else if (corner === 'bottom-left') {
          newW = startW - dx;
          newH = startH + dy;
          newX = startX + dx;
        } else if (corner === 'top-right') {
          newW = startW + dx;
          newH = startH - dy;
          newY = startY + dy;
        } else if (corner === 'top-left') {
          newW = startW - dx;
          newH = startH - dy;
          newX = startX + dx;
          newY = startY + dy;
        }

        if (newW < 120) { newW = 120; if (corner.includes('left')) newX = startX + startW - 120; }
        if (newH < 80) { newH = 80; if (corner.includes('top')) newY = startY + startH - 80; }

        onUpdate(widget.id, { x: newX, y: newY, w: newW, h: newH });
      };

      const handleUp = () => {
        document.removeEventListener('mousemove', handleMove);
        document.removeEventListener('mouseup', handleUp);
      };

      document.addEventListener('mousemove', handleMove);
      document.addEventListener('mouseup', handleUp);
    },
    [widget.id, widget.x, widget.y, widget.w, widget.h, scaleSize, onUpdate, onBringToFront]
  );

  return (
    <div
      ref={containerRef}
      className="absolute flex flex-col select-none"
      style={{
        left: 0,
        top: 0,
        width: widget.w,
        height: widget.h * (scaleY / scaleX),
        zIndex: widget.zIndex,
        transformOrigin: 'left top',
        transform: `translateX(${widget.x * scaleX}px) translateY(${widget.y * scaleY}px) scale(${scaleSize})`,
        cursor: isDragging ? 'grabbing' : 'default',
      }}
      onMouseDown={(e) => {
        e.stopPropagation();
        onBringToFront(widget.id);
        onSelect(widget.id);
      }}
    >
      {/* 선택 시 파란 테두리 + 리사이즈 핸들 */}
      {isSelected && (
        <>
          <div className="absolute inset-0 border-2 border-indigo-400 rounded-2xl pointer-events-none" style={{ margin: -2 }} />
          {['top-left', 'top-right', 'bottom-left', 'bottom-right'].map((corner) => (
            <div
              key={corner}
              className="absolute w-3.5 h-3.5 bg-white border-2 border-indigo-400 rounded-full z-10"
              style={{
                cursor: corner === 'top-left' ? 'nw-resize' : corner === 'top-right' ? 'ne-resize' : corner === 'bottom-left' ? 'sw-resize' : 'se-resize',
                top: corner.startsWith('top') ? '-6px' : undefined,
                bottom: corner.startsWith('bottom') ? '-6px' : undefined,
                left: corner.endsWith('left') ? '-6px' : undefined,
                right: corner.endsWith('right') ? '-6px' : undefined,
              }}
              onMouseDown={(e) => handleResize(e, corner)}
            />
          ))}
        </>
      )}

      {/* 위젯 본체 */}
      <div
        className={`${widget.config?.transparent ? '' : 'widget-card'} flex flex-col h-full w-full cursor-grab active:cursor-grabbing [&_[contenteditable]]:cursor-text`}
        style={{ overflow: 'visible' }}
        onMouseDown={handleDragStart}
      >
        <div className="flex-1 min-h-0" style={{ padding: 24, overflow: 'visible', position: 'relative' }}>{children}</div>
      </div>

      {/* 플로팅 툴바 (삭제 + 설정) */}
      {isSelected && (
        <div
          className="absolute left-1/2 flex items-center bg-white/95 backdrop-blur-sm shadow-lg border border-slate-200/60"
          style={{ transform: 'translateX(-50%)', top: '-80px', gap: '4px', borderRadius: '12px', padding: '6px 8px' }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => onRemove(widget.id)}
            className="rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
            style={{ padding: '8px' }}
            title="삭제"
          >
            <IoClose size={28} />
          </button>
          {settingsPanel && (
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="rounded-lg hover:bg-indigo-50 text-slate-400 hover:text-indigo-500 transition-colors"
              style={{ padding: '8px', color: showSettings ? '#6366f1' : undefined }}
              title="설정"
            >
              <IoSettings size={28} />
            </button>
          )}
          {onConfigChange && (
            <button
              onClick={() => {
                const isTransparent = !widget.config?.transparent;
                onConfigChange(widget.id, { ...widget.config, transparent: isTransparent });
              }}
              className="rounded-lg hover:bg-indigo-50 text-slate-400 hover:text-indigo-500 transition-colors"
              style={{ padding: '8px', color: widget.config?.transparent ? '#6366f1' : undefined }}
              title="배경 투명"
            >
              <IoEyeOff size={28} />
            </button>
          )}
        </div>
      )}

      {/* 설정 패널 */}
      {showSettings && settingsPanel && (
        <div
          style={{
            position: 'absolute',
            top: '-12px',
            left: '50%',
            transform: 'translateX(-50%) translateY(-100%)',
            background: 'white',
            borderRadius: '12px',
            boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
            border: '1px solid #e2e8f0',
            padding: '12px',
            zIndex: 100,
            minWidth: '220px',
            maxWidth: '320px',
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => setShowSettings(false)}
            aria-label="설정 닫기"
            style={{
              position: 'absolute',
              top: '-22px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              border: '1px solid #e2e8f0',
              background: 'white',
              color: '#475569',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              fontWeight: 600,
              lineHeight: 1,
              padding: 0,
              boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
              zIndex: 1,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#f1f5f9'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'white'; }}
          >
            ✕
          </button>
          {settingsPanel}
        </div>
      )}
    </div>
  );
}
