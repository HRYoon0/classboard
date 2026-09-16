import { IoChevronBack, IoChevronForward, IoAdd, IoTrash } from 'react-icons/io5';

interface Props {
  currentPage: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
  onAdd: () => void;
  onRemove: () => void;
}

export default function PageNavigator({ currentPage, totalPages, onPrev, onNext, onAdd, onRemove }: Props) {
  return (
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
      <button
        onClick={onPrev}
        disabled={currentPage === 0}
        style={{
          width: '32px', height: '32px', borderRadius: '8px', border: 'none',
          background: 'none', cursor: currentPage === 0 ? 'default' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: currentPage === 0 ? '#cbd5e1' : '#64748b',
        }}
      >
        <IoChevronBack size={16} />
      </button>

      <span style={{
        fontSize: '13px', fontWeight: 600, color: '#475569',
        padding: '0 6px', fontVariantNumeric: 'tabular-nums',
        minWidth: '36px', textAlign: 'center',
      }}>
        {currentPage + 1}/{totalPages}
      </span>

      <button
        onClick={onNext}
        disabled={currentPage === totalPages - 1}
        style={{
          width: '32px', height: '32px', borderRadius: '8px', border: 'none',
          background: 'none', cursor: currentPage === totalPages - 1 ? 'default' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: currentPage === totalPages - 1 ? '#cbd5e1' : '#64748b',
        }}
      >
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
  );
}
