import { useState, useEffect, useCallback } from 'react';

export const VIRTUAL_WIDTH = 1920;
export const VIRTUAL_HEIGHT = 1080;

interface CanvasLayout {
  scaleX: number;
  scaleY: number;
  scaleSize: number; // 위젯 크기용 균일 스케일
}

function calcLayout(): CanvasLayout {
  const scaleX = window.innerWidth / VIRTUAL_WIDTH;
  const scaleY = window.innerHeight / VIRTUAL_HEIGHT;
  return {
    scaleX,
    scaleY,
    scaleSize: scaleX, // 크기는 너비 기준 (비율 유지)
  };
}

export function useCanvasScale() {
  const [layout, setLayout] = useState(calcLayout);

  const handleResize = useCallback(() => setLayout(calcLayout()), []);

  useEffect(() => {
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);

  return layout;
}
