import { useState, useRef } from 'react';

export default function StopwatchWidget() {
  const [elapsed, setElapsed] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const startRef = useRef<number>(0);
  const rafRef = useRef<number>(0);

  const update = () => {
    setElapsed(Date.now() - startRef.current);
    rafRef.current = requestAnimationFrame(update);
  };

  const start = () => {
    startRef.current = Date.now() - elapsed;
    setIsRunning(true);
    rafRef.current = requestAnimationFrame(update);
  };

  const stop = () => {
    setIsRunning(false);
    cancelAnimationFrame(rafRef.current);
  };

  const reset = () => {
    stop();
    setElapsed(0);
  };

  const mins = Math.floor(elapsed / 60000);
  const secs = Math.floor((elapsed % 60000) / 1000);
  const ms = Math.floor((elapsed % 1000) / 10);

  return (
    <div className="flex flex-col items-center justify-center h-full gap-3">
      <div className="text-5xl font-mono font-bold text-slate-800 tabular-nums">
        {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
        <span className="text-2xl text-slate-400">.{String(ms).padStart(2, '0')}</span>
      </div>
      <div className="flex gap-2">
        <button
          onClick={isRunning ? stop : start}
          className={`min-w-[80px] h-8 px-5 rounded text-[13px] font-semibold text-white transition-colors ${
            isRunning
              ? 'bg-red-400 hover:bg-red-500'
              : 'bg-emerald-500 hover:bg-emerald-600'
          }`}
        >
          {isRunning ? '정지' : '시작'}
        </button>
        <button
          onClick={reset}
          className="min-w-[80px] h-8 px-5 rounded text-[13px] font-semibold bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
        >
          리셋
        </button>
      </div>
    </div>
  );
}
