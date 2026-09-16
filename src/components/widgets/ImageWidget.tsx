import { useRef, useState, useCallback, memo } from 'react';

interface Props {
  config: Record<string, unknown>;
  onConfigChange: (config: Record<string, unknown>) => void;
}

// 최대 파일 크기 5MB
const MAX_SIZE = 5 * 1024 * 1024;

function ImageWidget({ config, onConfigChange }: Props) {
  const imageSrc = (config.imageSrc as string) || '';
  const fit = (config.fit as string) || 'contain';
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');

  // 파일을 Base64로 변환 후 저장
  const handleFile = useCallback((file: File) => {
    setError('');
    if (!file.type.startsWith('image/')) {
      setError('이미지 파일만 첨부할 수 있습니다.');
      return;
    }
    if (file.size > MAX_SIZE) {
      setError('5MB 이하의 이미지만 첨부할 수 있습니다.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      onConfigChange({ imageSrc: reader.result as string });
    };
    reader.readAsDataURL(file);
  }, [onConfigChange]);

  // 파일 선택
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  // 드래그 앤 드롭
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
  }, []);

  // URL 입력
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlValue, setUrlValue] = useState('');

  const handleUrlSubmit = useCallback(() => {
    if (urlValue.trim()) {
      setError('');
      onConfigChange({ imageSrc: urlValue.trim() });
      setShowUrlInput(false);
      setUrlValue('');
    }
  }, [urlValue, onConfigChange]);

  // 이미지 삭제
  const handleRemove = useCallback(() => {
    onConfigChange({ imageSrc: '' });
  }, [onConfigChange]);

  // fit 변경
  const cycleFit = useCallback(() => {
    const modes = ['contain', 'cover', 'fill'];
    const next = modes[(modes.indexOf(fit) + 1) % modes.length];
    onConfigChange({ fit: next });
  }, [fit, onConfigChange]);

  const fitLabel = fit === 'contain' ? '맞춤' : fit === 'cover' ? '채우기' : '늘리기';

  // 이미지가 있을 때
  if (imageSrc) {
    return (
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden' }}>
        <img
          src={imageSrc}
          alt=""
          draggable={false}
          style={{
            width: '100%',
            height: '100%',
            objectFit: fit as 'contain' | 'cover' | 'fill',
            display: 'block',
          }}
        />
        {/* 호버 시 컨트롤 표시 */}
        <div
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            display: 'flex',
            gap: 4,
            opacity: 0,
            transition: 'opacity 0.15s',
          }}
          className="image-widget-controls"
        >
          <button
            onClick={cycleFit}
            onMouseDown={(e) => e.stopPropagation()}
            style={{
              padding: '4px 10px',
              fontSize: 12,
              background: 'rgba(0,0,0,0.6)',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
            }}
          >
            {fitLabel}
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            onMouseDown={(e) => e.stopPropagation()}
            style={{
              padding: '4px 10px',
              fontSize: 12,
              background: 'rgba(0,0,0,0.6)',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
            }}
          >
            변경
          </button>
          <button
            onClick={handleRemove}
            onMouseDown={(e) => e.stopPropagation()}
            style={{
              padding: '4px 10px',
              fontSize: 12,
              background: 'rgba(220,38,38,0.8)',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
            }}
          >
            삭제
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
        {/* 호버 시 컨트롤 보이게 하는 CSS */}
        <style>{`
          div:hover > .image-widget-controls { opacity: 1 !important; }
        `}</style>
      </div>
    );
  }

  // 이미지가 없을 때 — 업로드 영역
  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        cursor: 'pointer',
        border: dragging ? '3px dashed #6366f1' : '3px dashed #cbd5e1',
        borderRadius: 12,
        background: dragging ? 'rgba(99,102,241,0.05)' : 'transparent',
        transition: 'all 0.15s',
      }}
      onClick={() => {
        if (!showUrlInput) fileRef.current?.click();
      }}
    >
      <div style={{ fontSize: 40, opacity: 0.4 }}>🖼️</div>
      <div style={{ fontSize: 14, color: '#64748b', textAlign: 'center', lineHeight: 1.6 }}>
        클릭 또는 드래그하여<br />이미지를 첨부하세요
      </div>
      <div style={{ fontSize: 11, color: '#94a3b8' }}>최대 5MB / JPG, PNG, GIF, WebP</div>

      {/* URL 입력 버튼 */}
      {!showUrlInput ? (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowUrlInput(true);
          }}
          onMouseDown={(e) => e.stopPropagation()}
          style={{
            marginTop: 4,
            padding: '6px 16px',
            fontSize: 12,
            color: '#6366f1',
            background: 'rgba(99,102,241,0.08)',
            border: '1px solid rgba(99,102,241,0.2)',
            borderRadius: 8,
            cursor: 'pointer',
          }}
        >
          URL로 첨부
        </button>
      ) : (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{ display: 'flex', gap: 4, width: '80%', maxWidth: 320 }}
        >
          <input
            type="text"
            value={urlValue}
            onChange={(e) => setUrlValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleUrlSubmit(); }}
            onMouseDown={(e) => e.stopPropagation()}
            placeholder="이미지 URL을 입력..."
            autoFocus
            style={{
              flex: 1,
              padding: '6px 10px',
              fontSize: 12,
              border: '1px solid #cbd5e1',
              borderRadius: 8,
              outline: 'none',
            }}
          />
          <button
            onClick={handleUrlSubmit}
            onMouseDown={(e) => e.stopPropagation()}
            style={{
              padding: '6px 12px',
              fontSize: 12,
              color: '#fff',
              background: '#6366f1',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
            }}
          >
            확인
          </button>
        </div>
      )}

      {error && (
        <div style={{ fontSize: 12, color: '#dc2626', marginTop: 4 }}>{error}</div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
    </div>
  );
}

export default memo(ImageWidget);
