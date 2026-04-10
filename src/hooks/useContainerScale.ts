import { useRef, useState, useEffect } from 'react';

/**
 * 컨테이너 크기에 따라 자동 스케일을 계산하는 훅
 * baseWidth/baseHeight: 콘텐츠 기본 크기 (이 크기일 때 scale=1)
 * 컨테이너가 커지면 scale > 1, 작아지면 scale < 1
 */
export function useContainerScale(baseWidth: number, baseHeight: number) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          const scaleX = width / baseWidth;
          const scaleY = height / baseHeight;
          setScale(Math.min(scaleX, scaleY));
        }
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, [baseWidth, baseHeight]);

  return { containerRef, scale };
}
