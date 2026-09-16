import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface Props {
  config: Record<string, unknown>;
  onConfigChange: (config: Record<string, unknown>) => void;
}

export default function QRCodeWidget({ config, onConfigChange }: Props) {
  const url = (config.url as string) || '';
  const [inputUrl, setInputUrl] = useState(url);

  const handleGenerate = () => {
    let finalUrl = inputUrl.trim();
    if (finalUrl && !finalUrl.startsWith('http')) {
      finalUrl = 'https://' + finalUrl;
    }
    onConfigChange({ url: finalUrl });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '12px' }}>
      {url ? (
        <>
          <div style={{ background: 'white', padding: '12px', borderRadius: '12px' }}>
            <QRCodeSVG value={url} size={300} level="M" includeMargin />
          </div>
          <p style={{ fontSize: '12px', color: '#64748b', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', padding: '0 8px' }}>{url}</p>
          <button
            onClick={() => onConfigChange({ url: '' })}
            style={{
              padding: '6px 14px',
              background: '#f1f5f9',
              color: '#475569',
              border: 'none',
              borderRadius: '8px',
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            변경
          </button>
        </>
      ) : (
        <>
          <input
            type="text"
            placeholder="URL을 입력하세요"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
            onMouseDown={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              padding: '10px 14px',
              border: '2px solid #e2e8f0',
              borderRadius: '8px',
              fontSize: '14px',
              outline: 'none',
              color: '#334155',
              boxSizing: 'border-box',
            }}
          />
          <button
            onClick={handleGenerate}
            disabled={!inputUrl.trim()}
            style={{
              padding: '10px 20px',
              background: !inputUrl.trim() ? '#cbd5e1' : '#6366f1',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '15px',
              fontWeight: 600,
              cursor: !inputUrl.trim() ? 'default' : 'pointer',
            }}
          >
            생성
          </button>
        </>
      )}
    </div>
  );
}
