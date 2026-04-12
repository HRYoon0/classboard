import { useState, useCallback, useEffect, useRef } from 'react';
import { IoExpand, IoContract, IoCloudUpload, IoCloudDownload } from 'react-icons/io5';
import { useWidgetStore, getAllWidgetConfigs, setAllWidgetConfigs } from './store/widgetStore';
import Toolbar from './components/Toolbar';
import BackgroundPicker from './components/BackgroundPicker';
import WidgetRenderer from './components/WidgetRenderer';
import PageNavigator from './components/PageNavigator';
import { useCanvasScale } from './hooks/useCanvasScale';
import type { PageData } from './types/widget';
import { v4 as uuidv4 } from 'uuid';

import {
  signIn,
  signOut,
  getMe,
  saveToDrive,
  loadFromDrive,
} from './services/googleDrive';

function App() {
  const {
    widgets,
    background,
    pages,
    currentPageIndex,
    totalPages,
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
  } = useWidgetStore();

  const { scaleX, scaleY, scaleSize } = useCanvasScale();
  const [showSettings, setShowSettings] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedWidgetId, setSelectedWidgetId] = useState<string | null>(null);

  // 유저 상태 — localStorage 캐시
  const [user, setUser] = useState<{ name: string; email: string; picture: string } | null>(() => {
    try {
      const cached = localStorage.getItem('classboard-user');
      return cached ? JSON.parse(cached) : null;
    } catch { return null; }
  });
  const saveUser = (info: { name: string; email: string; picture: string } | null) => {
    setUser(info);
    if (info) localStorage.setItem('classboard-user', JSON.stringify(info));
    else localStorage.removeItem('classboard-user');
  };

  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // 프로필 메뉴 외부 클릭 시 닫기
  useEffect(() => {
    if (!showUserMenu) return;
    const handleClick = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showUserMenu]);

  const msgTimerRef = useRef<number>(0);
  const showMsg = (msg: string) => {
    setSyncMsg(msg);
    clearTimeout(msgTimerRef.current);
    msgTimerRef.current = window.setTimeout(() => setSyncMsg(''), 2500);
  };

  // 전체화면
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen();
    else document.exitFullscreen();
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const handleBgChange = (bg: string) => setBackground(bg);

  // 클라우드 데이터 로드 헬퍼
  const loadCloudData = (data: Awaited<ReturnType<typeof loadFromDrive>>['data']) => {
    if (!data) return;
    skipAutoSaveRef.current = true;
    if (data.pages && data.version === 2) {
      loadAllPages(data.pages as PageData[]);
    } else if (data.widgets) {
      loadAllPages([{
        id: uuidv4(),
        widgets: data.widgets as PageData['widgets'],
        background: data.background || background,
      }]);
    }
    if (data.widgetConfigs) setAllWidgetConfigs(data.widgetConfigs);
  };

  // 앱 시작 시 세션 확인 + 클라우드 데이터 자동 로드
  useEffect(() => {
    (async () => {
      const result = await getMe();
      if (result.loggedIn && result.user) {
        saveUser(result.user);

        const params = new URLSearchParams(window.location.search);
        const isFirstLogin = params.get('login') === 'success';
        if (isFirstLogin) {
          window.history.replaceState({}, '', '/');
        }

        // 로그인 상태면 항상 클라우드에서 최신 데이터 불러오기
        const loadRes = await loadFromDrive();
        if (loadRes.data) {
          loadCloudData(loadRes.data);
          if (isFirstLogin) {
            showMsg(`${result.user.name}님 로그인 완료 (클라우드 동기화됨)`);
          }
        } else if (isFirstLogin) {
          showMsg(`${result.user.name}님 로그인 완료`);
        }
      }
    })();
  }, []);

  // 로그인 버튼
  const handleSignIn = () => signIn();

  // 로그아웃
  const handleSignOut = async () => {
    await signOut();
    saveUser(null);
    setShowUserMenu(false);
    showMsg('로그아웃 완료');
  };

  // 자동 저장 (10초 디바운스 + 페이지 떠날 때 즉시 저장)
  const autoSaveTimerRef = useRef<number>(0);
  const skipAutoSaveRef = useRef(false);
  const pagesRef = useRef(pages);
  pagesRef.current = pages;
  const dirtyRef = useRef(false);
  const savingRef = useRef(false);

  const doSave = useCallback(async () => {
    if (!dirtyRef.current || savingRef.current) return;
    dirtyRef.current = false;
    savingRef.current = true;
    const res = await saveToDrive({
      pages: pagesRef.current,
      widgetConfigs: getAllWidgetConfigs(),
      version: 2,
    });
    savingRef.current = false;
    if (res.ok) showMsg('자동 저장 완료');
  }, []);

  useEffect(() => {
    if (!user) return;
    if (skipAutoSaveRef.current) { skipAutoSaveRef.current = false; return; }

    dirtyRef.current = true;
    clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = window.setTimeout(doSave, 10000);

    return () => clearTimeout(autoSaveTimerRef.current);
  }, [pages, user, doSave]);

  // 페이지 떠날 때 즉시 저장 (sendBeacon 사용)
  useEffect(() => {
    if (!user) return;
    const handleBeforeUnload = () => {
      if (!dirtyRef.current) return;
      const payload = JSON.stringify({
        pages: pagesRef.current,
        widgetConfigs: getAllWidgetConfigs(),
        version: 2,
      });
      navigator.sendBeacon('/api/drive/save', new Blob([payload], { type: 'application/json' }));
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [user]);

  // 수동 저장
  const handleSave = async () => {
    if (!user) { showMsg('먼저 로그인해주세요'); return; }
    setSyncing(true);
    const res = await saveToDrive({ pages, widgetConfigs: getAllWidgetConfigs(), version: 2 });
    setSyncing(false);
    if (res.ok) {
      showMsg('클라우드에 저장 완료');
    } else {
      console.error('[saveToDrive]', res);
      showMsg(`저장 실패: ${res.error || '알 수 없는 오류'}`);
    }
  };

  // 수동 불러오기
  const handleLoad = async () => {
    if (!user) { showMsg('먼저 로그인해주세요'); return; }
    setSyncing(true);
    const loadRes = await loadFromDrive();
    setSyncing(false);
    if (loadRes.data) {
      loadCloudData(loadRes.data);
      showMsg('클라우드에서 불러오기 완료');
    } else if (loadRes.error === 'not_found') {
      showMsg('저장된 데이터가 없습니다');
    } else if (loadRes.error === 'unauthorized' || loadRes.error === 'refresh_failed') {
      showMsg('로그인이 만료되었습니다. 다시 로그인해주세요');
    } else {
      console.error('[loadFromDrive]', loadRes);
      showMsg(`불러오기 실패: ${loadRes.error || '알 수 없는 오류'}`);
    }
  };

  // 페이지 전환
  const handleSwitchPage = (index: number) => {
    setSelectedWidgetId(null);
    switchPage(index);
  };

  const bgStyle: React.CSSProperties = background.startsWith('url(')
    ? { backgroundImage: background, backgroundSize: 'cover', backgroundPosition: 'center' }
    : background.startsWith('linear-gradient')
      ? { background }
      : { backgroundColor: background };

  return (
    <div className="w-full h-full relative overflow-hidden" style={bgStyle} onMouseDown={() => setSelectedWidgetId(null)}>

      {/* 오른쪽 상단 버튼들 */}
      <div className="absolute top-4 right-4 z-[9999] flex items-center gap-2">
        {syncMsg && (
          <div className="h-9 flex items-center gap-1.5 rounded-full bg-white/80 backdrop-blur-sm shadow-lg border border-white/60 text-slate-600 text-xs font-medium" style={{ paddingLeft: 20, paddingRight: 20 }}>
            <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            {syncMsg}
          </div>
        )}

        {user && (
          <>
            <button onClick={handleSave} disabled={syncing}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-white/80 backdrop-blur-sm shadow-lg border border-white/60 text-slate-600 hover:bg-white hover:text-indigo-600 transition-colors disabled:opacity-50"
              title="클라우드에 저장">
              <IoCloudUpload size={18} />
            </button>
            <button onClick={handleLoad} disabled={syncing}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-white/80 backdrop-blur-sm shadow-lg border border-white/60 text-slate-600 hover:bg-white hover:text-indigo-600 transition-colors disabled:opacity-50"
              title="클라우드에서 불러오기">
              <IoCloudDownload size={18} />
            </button>
          </>
        )}

        {user ? (
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="w-9 h-9 rounded-full overflow-hidden shadow-lg border-2 border-emerald-400 hover:border-emerald-500 transition-colors"
              title={user.name}
            >
              <img src={user.picture} alt={user.name} className="w-full h-full object-cover" />
            </button>
            <span className="absolute bottom-0 right-0 w-3 h-3 border-2 border-white rounded-full bg-emerald-400" />
            {showUserMenu && (
              <div className="absolute right-0 top-12 bg-white/90 backdrop-blur-sm rounded-xl shadow-xl border border-white/60 min-w-[200px] overflow-hidden">
                <div style={{ padding: '14px 20px 10px' }}>
                  <p className="text-sm font-bold text-slate-800">{user.name}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{user.email}</p>
                </div>
                <div style={{ padding: '4px 12px 8px' }}>
                  <button onClick={handleSignOut}
                    className="w-full text-left text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    style={{ padding: '8px 12px' }}>
                    로그아웃
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <button onClick={handleSignIn}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-white/80 backdrop-blur-sm shadow-lg border border-white/60 hover:bg-white transition-colors"
            title="구글 로그인">
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
          </button>
        )}

        <button onClick={toggleFullscreen}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-white/80 backdrop-blur-sm shadow-lg border border-white/60 text-slate-600 hover:bg-white hover:text-slate-800 transition-colors"
          title={isFullscreen ? '전체화면 종료' : '전체화면'}>
          {isFullscreen ? <IoContract size={18} /> : <IoExpand size={18} />}
        </button>
      </div>

      {/* 위젯 캔버스 */}
      {widgets.map((widget) => (
        <WidgetRenderer
          key={widget.id}
          widget={widget}
          scaleX={scaleX}
          scaleY={scaleY}
          scaleSize={scaleSize}
          onUpdate={updateWidget}
          onRemove={removeWidget}
          onBringToFront={bringToFront}
          onConfigChange={updateConfig}
          isSelected={selectedWidgetId === widget.id}
          onSelect={setSelectedWidgetId}
        />
      ))}

      {widgets.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center text-white/70">
            <p className="text-5xl mb-4">🏫</p>
            <h1 className="text-2xl font-bold mb-2">ClassBoard</h1>
            <p className="text-sm">아래 도구 모음에서 위젯을 추가하세요</p>
          </div>
        </div>
      )}

      <Toolbar onAddWidget={addWidget} onOpenSettings={() => setShowSettings(true)} />

      {showSettings && (
        <BackgroundPicker current={background} onChange={handleBgChange} onClose={() => setShowSettings(false)} />
      )}

      <PageNavigator
        currentPage={currentPageIndex}
        totalPages={totalPages}
        onPrev={() => handleSwitchPage(currentPageIndex - 1)}
        onNext={() => handleSwitchPage(currentPageIndex + 1)}
        onAdd={addPage}
        onRemove={removePage}
      />

      <div className="absolute bottom-2 left-4 z-[9999]">
        <span className="text-[10px] text-white/40">제작자: 윤희류(경남 황산초등학교) | 참고한 페이지: classroomscreen.com</span>
      </div>

      <div className="absolute bottom-2 right-4 z-[9999] flex gap-3">
        <span className="text-[10px] text-white/40">교실에서 사용하는 무료 위젯 화면 도구</span>
        <a href="/privacy" target="_blank" className="text-[10px] text-white/40 hover:text-white/70 transition-colors">개인정보처리방침</a>
        <a href="/terms" target="_blank" className="text-[10px] text-white/40 hover:text-white/70 transition-colors">서비스 약관</a>
      </div>
    </div>
  );
}

export default App;
