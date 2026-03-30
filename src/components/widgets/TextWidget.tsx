import { useRef, useState, useEffect, useCallback, memo } from 'react';

interface Props {
  config: Record<string, unknown>;
  onConfigChange: (config: Record<string, unknown>) => void;
}

const FONT_OPTIONS = [
  { label: '기본', value: 'sans-serif' },
  { label: '나눔고딕', value: "'Nanum Gothic', sans-serif" },
  { label: '나눔명조', value: "'Nanum Myeongjo', serif" },
  { label: 'Gothic A1', value: "'Gothic A1', sans-serif" },
  { label: '도현', value: "'Do Hyeon', sans-serif" },
  { label: '주아', value: "'Jua', sans-serif" },
  { label: '감자꽃', value: "'Gamja Flower', cursive" },
  { label: '하이멜로디', value: "'Hi Melody', cursive" },
  { label: '개구', value: "'Gaegu', cursive" },
  { label: '검은고딕', value: "'Black Han Sans', sans-serif" },
  { label: '해바라기', value: "'Sunflower', sans-serif" },
  { label: '귀여운폰트', value: "'Cute Font', cursive" },
  { label: '독도', value: "'Dokdo', cursive" },
  { label: '푸어스토리', value: "'Poor Story', cursive" },
  { label: '싱글데이', value: "'Single Day', cursive" },
  { label: '스타일리쉬', value: "'Stylish', sans-serif" },
  { label: '구기', value: "'Gugi', cursive" },
  { label: '송명', value: "'Song Myung', serif" },
  { label: '동해독도', value: "'East Sea Dokdo', cursive" },
  { label: '나눔펜', value: "'Nanum Pen Script', cursive" },
  { label: '나눔붓', value: "'Nanum Brush Script', cursive" },
  { label: '고정폭', value: 'monospace' },
];

const ALIGN_OPTIONS = [
  { label: '왼쪽', value: 'left', icon: '⫷' },
  { label: '가운데', value: 'center', icon: '☰' },
  { label: '오른쪽', value: 'right', icon: '⫸' },
];

const COLOR_PRESETS = [
  '#1e293b', '#475569', '#dc2626', '#ea580c',
  '#ca8a04', '#16a34a', '#2563eb', '#7c3aed',
  '#db2777', '#ffffff',
];

// 간단한 HTML sanitizer - 허용된 태그와 속성만 통과
// contentEditable에서 생성되는 서식 태그만 허용 (사용자 본인만 편집하므로 XSS 위험 낮음)
function sanitizeHtml(html: string): string {
  const div = document.createElement('div');
  div.textContent = ''; // 초기화
  // DOMParser로 안전하게 파싱
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  // 허용 태그
  const ALLOWED_TAGS = new Set(['SPAN', 'FONT', 'B', 'I', 'U', 'BR', 'DIV', 'P', '#text']);
  const ALLOWED_ATTRS = new Set(['style', 'color']);

  function cleanNode(node: Node): Node | null {
    if (node.nodeType === Node.TEXT_NODE) return node.cloneNode();
    if (node.nodeType !== Node.ELEMENT_NODE) return null;
    const el = node as Element;
    if (!ALLOWED_TAGS.has(el.tagName)) {
      // 태그는 제거하되 자식은 유지
      const frag = document.createDocumentFragment();
      el.childNodes.forEach((child) => {
        const cleaned = cleanNode(child);
        if (cleaned) frag.appendChild(cleaned);
      });
      return frag;
    }
    const clone = document.createElement(el.tagName);
    // 허용된 속성만 복사
    for (const attr of Array.from(el.attributes)) {
      if (ALLOWED_ATTRS.has(attr.name)) {
        clone.setAttribute(attr.name, attr.value);
      }
    }
    el.childNodes.forEach((child) => {
      const cleaned = cleanNode(child);
      if (cleaned) clone.appendChild(cleaned);
    });
    return clone;
  }

  doc.body.childNodes.forEach((child) => {
    const cleaned = cleanNode(child);
    if (cleaned) div.appendChild(cleaned);
  });
  return div.innerHTML;
}

function TextWidget({ config, onConfigChange }: Props) {
  const fontSize = (config.fontSize as number) || 24;
  const fontFamily = (config.fontFamily as string) || 'sans-serif';
  const bold = (config.bold as boolean) || false;
  const italic = (config.italic as boolean) || false;
  const align = (config.align as string) || 'center';
  const color = (config.color as string) || '#1e293b';
  const editorRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    if (!initializedRef.current) {
      // sanitize 후 DOM으로 삽입 (XSS 방지)
      const raw = (config.text as string) || '';
      const cleaned = sanitizeHtml(raw);
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = cleaned;
      el.textContent = '';
      while (tempDiv.firstChild) {
        el.appendChild(tempDiv.firstChild);
      }
      initializedRef.current = true;
    }
    el.style.fontSize = `${fontSize}px`;
    el.style.fontFamily = fontFamily;
    el.style.fontWeight = bold ? '700' : '400';
    el.style.fontStyle = italic ? 'italic' : 'normal';
    el.style.textAlign = align;
    el.style.color = color;
    el.style.lineHeight = '1.6';
    el.style.caretColor = color;
  }, [fontSize, fontFamily, bold, italic, align, color]);

  // 콘텐츠 저장 (sanitize 후 저장)
  const saveContent = useCallback(() => {
    if (editorRef.current) {
      const sanitized = sanitizeHtml(editorRef.current.innerHTML);
      onConfigChange({ text: sanitized });
    }
  }, [onConfigChange]);

  const update = useCallback((patch: Record<string, unknown>) => {
    onConfigChange(patch);
  }, [onConfigChange]);

  // 선택된 텍스트에 색상 적용
  const applyColorToSelection = useCallback((c: string) => {
    document.execCommand('foreColor', false, c);
    saveContent();
  }, [saveContent]);

  // 색상 버튼 클릭 핸들러
  const handleColorClick = useCallback((c: string) => {
    const el = editorRef.current;
    if (!el) return;

    const sel = window.getSelection();
    if (sel && !sel.isCollapsed && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      if (el.contains(range.commonAncestorContainer)) {
        applyColorToSelection(c);
        return;
      }
    }

    // 선택 없으면 전체 색상 변경 — 기존 인라인 색상 서식 제거
    if (el) {
      el.querySelectorAll('font[color]').forEach((font) => {
        font.removeAttribute('color');
      });
      el.querySelectorAll('[style]').forEach((node) => {
        const htmlEl = node as HTMLElement;
        htmlEl.style.removeProperty('color');
      });
      onConfigChange({ color: c, text: sanitizeHtml(el.innerHTML) });
    } else {
      update({ color: c });
    }
  }, [applyColorToSelection, update, onConfigChange]);

  return (
    <div style={{ position: 'relative', height: '100%', overflow: 'visible' }}>
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        spellCheck={false}
        onFocus={() => setIsEditing(true)}
        onBlur={() => { saveContent(); setIsEditing(false); }}
        onInput={saveContent}
        onPaste={(e) => {
          // 외부 서식 제거: 순수 텍스트만 붙여넣기
          e.preventDefault();
          const text = e.clipboardData.getData('text/plain');
          document.execCommand('insertText', false, text);
        }}
        data-placeholder="텍스트를 입력하세요..."
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          overflowY: 'auto',
          outline: 'none',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      />

      {/* 하단 서식 도구 모음 — 편집 중에만 위젯 아래에 표시 */}
      <div
        style={{
          position: 'absolute',
          top: '100%',
          left: '-1px',
          right: '-1px',
          opacity: isEditing ? 1 : 0,
          pointerEvents: isEditing ? 'auto' : 'none',
          transform: isEditing ? 'translateY(0)' : 'translateY(-4px)',
          transition: 'opacity 0.15s, transform 0.15s',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          padding: '8px 10px',
          flexWrap: 'wrap',
          background: 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(12px)',
          borderRadius: '0 0 12px 12px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          border: '1px solid rgba(255,255,255,0.6)',
          borderTop: 'none',
          zIndex: 10,
        }}
        onMouseDown={(e) => e.preventDefault()}
      >
        <select
          value={fontFamily}
          onChange={(e) => update({ fontFamily: e.target.value })}
          onMouseDown={(e) => e.stopPropagation()}
          className="h-7 max-w-[100px] px-1.5 text-[11px] text-slate-600 bg-slate-50 border border-slate-200 rounded cursor-pointer focus:outline-none hover:bg-slate-100"
        >
          {FONT_OPTIONS.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>

        <select
          value={fontSize}
          onChange={(e) => update({ fontSize: Number(e.target.value) })}
          onMouseDown={(e) => e.stopPropagation()}
          className="h-7 px-1.5 text-[11px] text-slate-600 bg-slate-50 border border-slate-200 rounded cursor-pointer focus:outline-none hover:bg-slate-100"
        >
          {[14, 18, 24, 32, 40, 48, 60, 72, 96].map((s) => (
            <option key={s} value={s}>{s}px</option>
          ))}
        </select>

        <div className="w-px h-4 bg-slate-200 mx-0.5" />

        <button
          onClick={() => update({ bold: !bold })}
          className={`w-7 h-7 flex items-center justify-center rounded text-[13px] font-bold transition-colors ${
            bold ? 'bg-indigo-100 text-indigo-600' : 'text-slate-400 hover:bg-slate-100'
          }`}
        >
          B
        </button>

        <button
          onClick={() => update({ italic: !italic })}
          className={`w-7 h-7 flex items-center justify-center rounded text-[13px] italic transition-colors ${
            italic ? 'bg-indigo-100 text-indigo-600' : 'text-slate-400 hover:bg-slate-100'
          }`}
        >
          I
        </button>

        <div className="w-px h-4 bg-slate-200 mx-0.5" />

        {ALIGN_OPTIONS.map((a) => (
          <button
            key={a.value}
            onClick={() => update({ align: a.value })}
            className={`w-7 h-7 flex items-center justify-center rounded text-[12px] transition-colors ${
              align === a.value ? 'bg-indigo-100 text-indigo-600' : 'text-slate-400 hover:bg-slate-100'
            }`}
            title={a.label}
          >
            {a.icon}
          </button>
        ))}

        <div className="w-px h-4 bg-slate-200 mx-0.5" />

        <div className="flex items-center gap-0.5">
          {COLOR_PRESETS.map((c) => (
            <button
              key={c}
              onClick={() => handleColorClick(c)}
              className={`w-5 h-5 rounded-full border-2 transition-transform hover:scale-110 ${
                color === c ? 'border-indigo-400 scale-110' : 'border-slate-200'
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default memo(TextWidget);
