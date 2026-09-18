import type { CSSProperties } from 'react';

/** 배경 문자열(사진 url / 그라데이션 / 단색)을 CSS 스타일 객체로 변환 */
export function bgStyle(background: string): CSSProperties {
  if (background.startsWith('url(')) {
    return { backgroundImage: background, backgroundSize: 'cover', backgroundPosition: 'center' };
  }
  if (background.startsWith('linear-gradient')) return { background };
  return { backgroundColor: background };
}
