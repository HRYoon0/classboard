import { useRef, useState, useEffect, useCallback } from 'react';

export default function DrawingWidget() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#1e293b');
  const [lineWidth, setLineWidth] = useState(3);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  // 캔버스 크기 맞추기
  useEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;
      // 기존 내용 보존
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      tempCanvas.getContext('2d')?.drawImage(canvas, 0, 0);

      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      canvas.getContext('2d')?.drawImage(tempCanvas, 0, 0);
    };
    resize();
    const observer = new ResizeObserver(resize);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const getPos = (e: React.MouseEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const draw = useCallback(
    (from: { x: number; y: number }, to: { x: number; y: number }) => {
      const ctx = canvasRef.current?.getContext('2d');
      if (!ctx) return;
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
    },
    [color, lineWidth]
  );

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDrawing(true);
    lastPos.current = getPos(e);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing || !lastPos.current) return;
    const pos = getPos(e);
    draw(lastPos.current, pos);
    lastPos.current = pos;
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
    lastPos.current = null;
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
  };

  const COLORS = ['#1e293b', '#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7', '#ffffff'];

  return (
    <div className="flex flex-col h-full gap-1">
      <div
        ref={containerRef}
        className="flex-1 rounded-lg border border-slate-100 bg-white cursor-crosshair overflow-hidden"
      >
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {COLORS.map((c) => (
          <button
            key={c}
            onClick={() => setColor(c)}
            className={`w-5 h-5 rounded-full border-2 transition-transform ${
              color === c ? 'border-indigo-400 scale-125' : 'border-slate-200'
            }`}
            style={{ backgroundColor: c }}
          />
        ))}
        <input
          type="range"
          min={1}
          max={12}
          value={lineWidth}
          onChange={(e) => setLineWidth(Number(e.target.value))}
          className="w-16 accent-indigo-500"
        />
        <button
          onClick={clear}
          style={{
            marginLeft: 'auto',
            padding: '4px 12px',
            background: '#f1f5f9',
            color: '#475569',
            border: 'none',
            borderRadius: '6px',
            fontSize: '12px',
            cursor: 'pointer',
          }}
        >
          지우기
        </button>
      </div>
    </div>
  );
}
