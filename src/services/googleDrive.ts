// Google Drive API 연동 — Vercel API Routes 백엔드 방식

export interface CloudData {
  widgets?: unknown[];
  background?: string;
  pages?: { id: string; widgets: unknown[]; background: string }[];
  version?: number;
  widgetConfigs?: Record<string, Record<string, unknown>>;
}

interface UserInfo {
  name: string;
  email: string;
  picture: string;
}

// 로그인 (API Route로 리다이렉트)
export function signIn() {
  window.location.href = '/api/auth/login';
}

// 로그아웃
export async function signOut() {
  await fetch('/api/auth/logout', { credentials: 'same-origin' }).catch(() => {});
}

// 세션 확인 (서버에서 토큰 갱신까지 처리)
// offline: true 는 "서버가 로그아웃이라고 답한 것"이 아니라 "서버에 닿지 못한 것".
// 둘을 구분해야 네트워크가 끊겼을 때와 세션이 끊겼을 때를 다르게 처리할 수 있다.
export async function getMe(): Promise<{ loggedIn: boolean; user?: UserInfo; offline?: boolean }> {
  try {
    const res = await fetch('/api/auth/me', { credentials: 'same-origin' });
    if (!res.ok) return { loggedIn: false };
    return await res.json();
  } catch {
    return { loggedIn: false, offline: true };
  }
}

// 구글 드라이브에 데이터 저장
export interface SaveResult {
  ok: boolean;
  error?: string;
  detail?: string;
}

export async function saveToDrive(data: CloudData): Promise<SaveResult> {
  try {
    const res = await fetch('/api/drive/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(data),
    });
    const result = await res.json().catch(() => ({ ok: false, error: 'invalid_response' }));
    if (result.ok === true) return { ok: true };
    return { ok: false, error: result.error || `http_${res.status}`, detail: result.detail };
  } catch (err) {
    return { ok: false, error: 'network_error', detail: String(err) };
  }
}

// 구글 드라이브에서 데이터 로드
export interface LoadResult {
  data: CloudData | null;
  error?: 'not_found' | 'unauthorized' | 'refresh_failed' | string;
  detail?: string;
}

export async function loadFromDrive(): Promise<LoadResult> {
  try {
    const res = await fetch('/api/drive/load', {
      credentials: 'same-origin',
      cache: 'no-store',
    });
    const result = await res.json().catch(() => ({ data: null, error: 'invalid_response' }));
    return {
      data: result.data || null,
      error: result.error,
      detail: result.detail,
    };
  } catch (err) {
    return { data: null, error: 'network_error', detail: String(err) };
  }
}
