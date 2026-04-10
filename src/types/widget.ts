export type WidgetType =
  | 'timer'
  | 'clock'
  | 'stopwatch'
  | 'traffic-light'
  | 'noise-meter'
  | 'random-name'
  | 'group-maker'
  | 'poll'
  | 'text'
  | 'drawing'
  | 'qr-code'
  | 'dice'
  | 'work-symbols'
  | 'calendar'
  | 'image'
  | 'pomodoro';

export interface WidgetData {
  id: string;
  type: WidgetType;
  x: number;
  y: number;
  w: number;
  h: number;
  zIndex: number;
  // 위젯별 설정 데이터
  config: Record<string, unknown>;
}

export interface PageData {
  id: string;
  widgets: WidgetData[];
  background: string;
}

export interface WidgetMeta {
  type: WidgetType;
  label: string;
  icon: string;
  defaultW: number;
  defaultH: number;
}
