import { useReducer, useCallback, useEffect, useRef } from 'react';
import { v4 as uuid } from 'uuid';
import type { WidgetData, WidgetType, PageData } from '../types/widget';
import { WIDGET_META, BACKGROUNDS } from '../constants';

// ── 상태 & 액션 타입 ──

interface StoreState {
  pages: PageData[];
  currentPageIndex: number;
}

type Action =
  | { type: 'ADD'; widgetType: WidgetType }
  | { type: 'REMOVE'; id: string }
  | { type: 'UPDATE'; id: string; data: Partial<WidgetData> }
  | { type: 'UPDATE_CONFIG'; id: string; config: Record<string, unknown> }
  | { type: 'BRING_TO_FRONT'; id: string }
  | { type: 'SET_BACKGROUND'; background: string }
  | { type: 'ADD_PAGE' }
  | { type: 'REMOVE_PAGE' }
  | { type: 'SWITCH_PAGE'; index: number }
  | { type: 'LOAD_ALL'; pages: PageData[] };

function getMaxZ(widgets: WidgetData[]) {
  return widgets.reduce((max, w) => Math.max(max, w.zIndex), 0);
}

// 현재 페이지의 위젯 배열을 변환하는 헬퍼
function updateCurrentPageWidgets(
  state: StoreState,
  fn: (widgets: WidgetData[]) => WidgetData[]
): StoreState {
  const pages = state.pages.map((p, i) =>
    i === state.currentPageIndex ? { ...p, widgets: fn(p.widgets) } : p
  );
  return { ...state, pages };
}

function reducer(state: StoreState, action: Action): StoreState {
  switch (action.type) {
    case 'ADD': {
      const meta = WIDGET_META[action.widgetType];
      const savedConfig = loadWidgetConfig(action.widgetType);
      const savedPos = loadWidgetPosition(action.widgetType);
      const currentWidgets = state.pages[state.currentPageIndex]?.widgets || [];
      const newWidget: WidgetData = {
        id: uuid(),
        type: action.widgetType,
        x: savedPos?.x ?? (100 + Math.random() * 200),
        y: savedPos?.y ?? (80 + Math.random() * 100),
        w: meta.defaultW,
        h: meta.defaultH,
        zIndex: getMaxZ(currentWidgets) + 1,
        config: savedConfig,
      };
      return updateCurrentPageWidgets(state, (ws) => [...ws, newWidget]);
    }
    case 'REMOVE': {
      const currentWidgets = state.pages[state.currentPageIndex]?.widgets || [];
      const removing = currentWidgets.find((w) => w.id === action.id);
      if (removing) {
        saveWidgetPosition(removing.type, { x: removing.x, y: removing.y, w: removing.w, h: removing.h });
        if (Object.keys(removing.config).length > 0) {
          saveWidgetConfig(removing.type, removing.config);
        }
      }
      return updateCurrentPageWidgets(state, (ws) => ws.filter((w) => w.id !== action.id));
    }
    case 'UPDATE':
      return updateCurrentPageWidgets(state, (ws) =>
        ws.map((w) => (w.id === action.id ? { ...w, ...action.data } : w))
      );
    case 'UPDATE_CONFIG': {
      const result = updateCurrentPageWidgets(state, (ws) =>
        ws.map((w) =>
          w.id === action.id ? { ...w, config: { ...w.config, ...action.config } } : w
        )
      );
      const target = result.pages[result.currentPageIndex].widgets.find((w) => w.id === action.id);
      if (target) saveWidgetConfig(target.type, target.config);
      return result;
    }
    case 'BRING_TO_FRONT': {
      const currentWidgets = state.pages[state.currentPageIndex]?.widgets || [];
      const maxZ = getMaxZ(currentWidgets);
      const target = currentWidgets.find((w) => w.id === action.id);
      if (target && target.zIndex === maxZ) return state;
      return updateCurrentPageWidgets(state, (ws) =>
        ws.map((w) => (w.id === action.id ? { ...w, zIndex: maxZ + 1 } : w))
      );
    }
    case 'SET_BACKGROUND': {
      const pages = state.pages.map((p, i) =>
        i === state.currentPageIndex ? { ...p, background: action.background } : p
      );
      return { ...state, pages };
    }
    case 'ADD_PAGE': {
      const newPage: PageData = {
        id: uuid(),
        widgets: [],
        background: BACKGROUNDS[0],
      };
      return {
        pages: [...state.pages, newPage],
        currentPageIndex: state.pages.length, // 새 페이지로 이동
      };
    }
    case 'REMOVE_PAGE': {
      if (state.pages.length <= 1) return state;
      const pages = state.pages.filter((_, i) => i !== state.currentPageIndex);
      const newIndex = Math.min(state.currentPageIndex, pages.length - 1);
      return { pages, currentPageIndex: newIndex };
    }
    case 'SWITCH_PAGE': {
      if (action.index < 0 || action.index >= state.pages.length) return state;
      return { ...state, currentPageIndex: action.index };
    }
    case 'LOAD_ALL':
      return { pages: action.pages, currentPageIndex: 0 };
    default:
      return state;
  }
}

// ── 위젯 config/position 기억 ──

const CONFIG_MEMORY_KEY = 'classboard-widget-configs';
const POSITION_MEMORY_KEY = 'classboard-widget-positions';
const RESET_ON_ADD: Set<WidgetType> = new Set(['poll', 'text']);

function saveWidgetConfig(type: WidgetType, config: Record<string, unknown>) {
  if (RESET_ON_ADD.has(type)) return;
  try {
    const raw = localStorage.getItem(CONFIG_MEMORY_KEY);
    const all = raw ? JSON.parse(raw) : {};
    all[type] = config;
    localStorage.setItem(CONFIG_MEMORY_KEY, JSON.stringify(all));
  } catch { /* 무시 */ }
}

function loadWidgetConfig(type: WidgetType): Record<string, unknown> {
  if (RESET_ON_ADD.has(type)) return {};
  try {
    const raw = localStorage.getItem(CONFIG_MEMORY_KEY);
    if (!raw) return {};
    const all = JSON.parse(raw);
    return all[type] || {};
  } catch {
    return {};
  }
}

function saveWidgetPosition(type: WidgetType, pos: { x: number; y: number; w: number; h: number }) {
  try {
    const raw = localStorage.getItem(POSITION_MEMORY_KEY);
    const all = raw ? JSON.parse(raw) : {};
    all[type] = pos;
    localStorage.setItem(POSITION_MEMORY_KEY, JSON.stringify(all));
  } catch { /* 무시 */ }
}

function loadWidgetPosition(type: WidgetType): { x: number; y: number; w: number; h: number } | null {
  try {
    const raw = localStorage.getItem(POSITION_MEMORY_KEY);
    if (!raw) return null;
    const all = JSON.parse(raw);
    return all[type] || null;
  } catch {
    return null;
  }
}

export function getAllWidgetConfigs(): Record<string, Record<string, unknown>> {
  try {
    const raw = localStorage.getItem(CONFIG_MEMORY_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function setAllWidgetConfigs(configs: Record<string, Record<string, unknown>>) {
  try {
    localStorage.setItem(CONFIG_MEMORY_KEY, JSON.stringify(configs));
  } catch { /* 무시 */ }
}

// ── localStorage 키 ──

const PAGES_STORAGE_KEY = 'classboard-pages';
const CURRENT_PAGE_KEY = 'classboard-current-page';
// 이전 버전 키 (마이그레이션용)
const OLD_WIDGETS_KEY = 'classboard-widgets';
const OLD_BG_KEY = 'classboard-bg';

// ── 마이그레이션 + 로드 ──

function loadInitialState(): StoreState {
  try {
    // 새 형식 먼저 확인
    const pagesRaw = localStorage.getItem(PAGES_STORAGE_KEY);
    if (pagesRaw) {
      const pages: PageData[] = JSON.parse(pagesRaw);
      const idx = Number(localStorage.getItem(CURRENT_PAGE_KEY) || '0');
      return { pages, currentPageIndex: Math.min(idx, pages.length - 1) };
    }

    // 이전 형식 마이그레이션
    const oldWidgetsRaw = localStorage.getItem(OLD_WIDGETS_KEY);
    const oldBg = localStorage.getItem(OLD_BG_KEY) || BACKGROUNDS[0];
    if (oldWidgetsRaw) {
      const widgets: WidgetData[] = JSON.parse(oldWidgetsRaw);
      const page: PageData = { id: uuid(), widgets, background: oldBg };
      // 마이그레이션 후 새 형식으로 저장
      localStorage.setItem(PAGES_STORAGE_KEY, JSON.stringify([page]));
      localStorage.removeItem(OLD_WIDGETS_KEY);
      localStorage.removeItem(OLD_BG_KEY);
      return { pages: [page], currentPageIndex: 0 };
    }
  } catch { /* 무시 */ }

  // 완전 새로운 사용자
  return {
    pages: [{ id: uuid(), widgets: [], background: BACKGROUNDS[0] }],
    currentPageIndex: 0,
  };
}

// ── Hook ──

export function useWidgetStore() {
  const [state, dispatch] = useReducer(reducer, null, loadInitialState);

  const { pages, currentPageIndex } = state;
  const currentPage = pages[currentPageIndex];
  const widgets = currentPage?.widgets || [];
  const background = currentPage?.background || BACKGROUNDS[0];

  // 상태 변경 시 localStorage 자동 저장
  const saveTimerRef = useRef<number>(0);
  useEffect(() => {
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      localStorage.setItem(PAGES_STORAGE_KEY, JSON.stringify(pages));
      localStorage.setItem(CURRENT_PAGE_KEY, String(currentPageIndex));
    }, 300);
  }, [pages, currentPageIndex]);

  const addWidget = useCallback((widgetType: WidgetType) => {
    dispatch({ type: 'ADD', widgetType });
  }, []);

  const removeWidget = useCallback((id: string) => {
    dispatch({ type: 'REMOVE', id });
  }, []);

  const updateWidget = useCallback((id: string, data: Partial<WidgetData>) => {
    dispatch({ type: 'UPDATE', id, data });
  }, []);

  const updateConfig = useCallback((id: string, config: Record<string, unknown>) => {
    dispatch({ type: 'UPDATE_CONFIG', id, config });
  }, []);

  const bringToFront = useCallback((id: string) => {
    dispatch({ type: 'BRING_TO_FRONT', id });
  }, []);

  const setBackground = useCallback((bg: string) => {
    dispatch({ type: 'SET_BACKGROUND', background: bg });
  }, []);

  const addPage = useCallback(() => {
    dispatch({ type: 'ADD_PAGE' });
  }, []);

  const removePage = useCallback(() => {
    dispatch({ type: 'REMOVE_PAGE' });
  }, []);

  const switchPage = useCallback((index: number) => {
    dispatch({ type: 'SWITCH_PAGE', index });
  }, []);

  const loadAllPages = useCallback((p: PageData[]) => {
    dispatch({ type: 'LOAD_ALL', pages: p });
  }, []);

  return {
    widgets,
    background,
    pages,
    currentPageIndex,
    totalPages: pages.length,
    addWidget,
    removeWidget,
    updateWidget,
    updateConfig,
    bringToFront,
    setBackground,
    addPage,
    removePage,
    switchPage,
    loadAllPages,
  };
}
