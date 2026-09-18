import { useEffect, useRef, useState } from 'react';
import { IoChevronBack, IoChevronForward, IoAdd, IoTrash } from 'react-icons/io5';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import type { PageData } from '../types/widget';
import { VIRTUAL_WIDTH, VIRTUAL_HEIGHT } from '../hooks/useCanvasScale';
import { bgStyle } from '../utils/bgStyle';

interface Props {
  pages: PageData[];
  currentPage: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
  onAdd: () => void;
  onRemove: () => void;
  onSwitch: (index: number) => void;
  onReorder: (from: number, to: number) => void;
  onRename: (index: number, name: string) => void;
}

const THUMB_W = 104;
const THUMB_H = Math.round((THUMB_W * VIRTUAL_HEIGHT) / VIRTUAL_WIDTH);

/** 보드 한 장의 축소 미리보기 — 위젯 위치를 가상 캔버스 기준 퍼센트로 찍는다 */
function BoardThumb({ page }: { page: PageData }) {
  return (
    <div style={{
      width: THUMB_W, height: THUMB_H, borderRadius: 6, overflow: 'hidden',
      position: 'relative', ...bgStyle(page.background),
    }}>
      {page.widgets.map((w) => (
        <div
          key={w.id}
          style={{
            position: 'absolute',
            left: `${(w.x / VIRTUAL_WIDTH) * 100}%`,
            top: `${(w.y / VIRTUAL_HEIGHT) * 100}%`,
            width: `${(w.w / VIRTUAL_WIDTH) * 100}%`,
            height: `${(w.h / VIRTUAL_HEIGHT) * 100}%`,
            background: 'rgba(255,255,255,0.75)',
            borderRadius: 2,
          }}
        />
      ))}
    </div>
  );
}

export default function PageNavigator({
  pages, currentPage, totalPages, onPrev, onNext, onAdd, onRemove, onSwitch, onReorder, onRename,
}: Props) {
  const [showBoards, setShowBoards] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const countRef = useRef<HTMLButtonElement>(null);

  // 바깥 클릭 시 닫기
  useEffect(() => {
    if (!showBoards) return;
    const handleClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t) || countRef.current?.contains(t)) return;
      setShowBoards(false);
      setEditingId(null);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showBoards]);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    onReorder(result.source.index, result.destination.index);
  };

  const navBtn = (disabled: boolean) => ({
    width: '32px', height: '32px', borderRadius: '8px', border: 'none',
    background: 'none', cursor: disabled ? 'default' : 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: disabled ? '#cbd5e1' : '#64748b',
  } as const);

  return (
    <>
      {/* 보드 순서 패널 — 드래그 좌표가 어긋나므로 아래 네비 바(backdrop-filter) 안에 넣지 않는다 */}
      {showBoards && (
        <div
          ref={panelRef}
          style={{
            position: 'fixed',
            bottom: '80px',
            right: '16px',
            zIndex: 10000,
            background: 'rgba(255,255,255,0.97)',
            borderRadius: '16px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
            border: '1px solid rgba(255,255,255,0.7)',
            padding: '14px 16px 12px',
            maxWidth: 'min(720px, calc(100vw - 32px))',
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div style={{
            display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '10px',
          }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>보드 순서</span>
            <span style={{ fontSize: '11px', fontWeight: 500, color: '#64748b' }}>
              끌어서 순서 바꾸기 · 이름 눌러 수정
            </span>
          </div>

          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="boards" direction="horizontal">
              {(dropProvided) => (
                <div
                  ref={dropProvided.innerRef}
                  {...dropProvided.droppableProps}
                  style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '4px' }}
                >
                  {pages.map((page, index) => (
                    <Draggable key={page.id} draggableId={page.id} index={index}>
                      {(dragProvided, snapshot) => {
                        const isCurrent = index === currentPage;
                        return (
                          <div
                            ref={dragProvided.innerRef}
                            {...dragProvided.draggableProps}
                            {...dragProvided.dragHandleProps}
                            style={{
                              display: 'flex', flexDirection: 'column', alignItems: 'center',
                              gap: '4px', padding: '4px', borderRadius: '10px', cursor: 'grab',
                              background: isCurrent ? '#eef2ff' : 'transparent',
                              border: isCurrent ? '2px solid #6366f1' : '2px solid transparent',
                              boxShadow: snapshot.isDragging ? '0 10px 24px rgba(0,0,0,0.22)' : 'none',
                              ...dragProvided.draggableProps.style,
                            }}
                          >
                            <div onClick={() => { onSwitch(index); setShowBoards(false); setEditingId(null); }}>
                              <BoardThumb page={page} />
                            </div>

                            {editingId === page.id ? (
                              <input
                                autoFocus
                                value={page.name ?? ''}
                                maxLength={20}
                                placeholder={String(index + 1)}
                                // 확정 시점을 두지 않는다 — 패널이 닫히며 input 이 사라지면
                                // onBlur 가 오지 않아 입력이 통째로 날아간다
                                onChange={(e) => onRename(index, e.target.value)}
                                onFocus={(e) => e.currentTarget.select()}
                                onBlur={() => setEditingId(null)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === 'Escape') e.currentTarget.blur();
                                }}
                                style={{
                                  width: THUMB_W, boxSizing: 'border-box',
                                  fontSize: '11px', fontWeight: 600, textAlign: 'center',
                                  color: '#334155', padding: '2px 4px',
                                  border: '1px solid #6366f1', borderRadius: '6px', outline: 'none',
                                }}
                              />
                            ) : (
                              <button
                                onClick={() => setEditingId(page.id)}
                                title="이름 바꾸기"
                                style={{
                                  width: THUMB_W, maxWidth: THUMB_W,
                                  border: 'none', background: 'none', cursor: 'text',
                                  fontSize: '11px', fontWeight: 600, padding: '2px 4px',
                                  color: isCurrent ? '#4f46e5' : '#64748b',
                                  fontVariantNumeric: 'tabular-nums',
                                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                }}
                              >
                                {page.name || index + 1}
                              </button>
                            )}
                          </div>
                        );
                      }}
                    </Draggable>
                  ))}
                  {dropProvided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </div>
      )}

      <div style={{
        position: 'fixed',
        bottom: '32px',
        right: '16px',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        background: 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(12px)',
        borderRadius: '12px',
        boxShadow: '0 2px 12px rgba(0,0,0,0.1)',
        border: '1px solid rgba(255,255,255,0.6)',
        padding: '4px',
      }}>
        <button onClick={onPrev} disabled={currentPage === 0} style={navBtn(currentPage === 0)}>
          <IoChevronBack size={16} />
        </button>

        <button
          ref={countRef}
          onClick={() => setShowBoards((v) => !v)}
          title="보드 목록 · 순서 바꾸기"
          style={{
            fontSize: '13px', fontWeight: 600, color: showBoards ? '#4f46e5' : '#475569',
            padding: '0 6px', fontVariantNumeric: 'tabular-nums',
            minWidth: '36px', height: '32px', textAlign: 'center',
            border: 'none', borderRadius: '8px', cursor: 'pointer',
            background: showBoards ? '#eef2ff' : 'none',
          }}
        >
          {currentPage + 1}/{totalPages}
        </button>

        <button onClick={onNext} disabled={currentPage === totalPages - 1} style={navBtn(currentPage === totalPages - 1)}>
          <IoChevronForward size={16} />
        </button>

        <div style={{ width: '1px', height: '20px', background: '#e2e8f0', margin: '0 2px' }} />

        <button
          onClick={onAdd}
          style={{
            width: '32px', height: '32px', borderRadius: '8px', border: 'none',
            background: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#6366f1',
          }}
        >
          <IoAdd size={18} />
        </button>

        {totalPages > 1 && (
          <button
            onClick={onRemove}
            style={{
              width: '32px', height: '32px', borderRadius: '8px', border: 'none',
              background: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#94a3b8',
            }}
          >
            <IoTrash size={14} />
          </button>
        )}
      </div>
    </>
  );
}
