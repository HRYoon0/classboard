// 세션 관리 — Base64 인코딩 (httpOnly + Secure 쿠키로 보호)

const COOKIE_NAME = 'cb_session';

export interface SessionData {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  user: { name: string; email: string; picture: string };
}

// 쿠키 수동 파싱
function parseCookies(header: string | undefined): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!header) return cookies;
  header.split(';').forEach((c) => {
    const [key, ...rest] = c.trim().split('=');
    if (key) cookies[key] = rest.join('=');
  });
  return cookies;
}

// 요청에서 세션 파싱
export function parseSession(cookieHeader: string | undefined): SessionData | null {
  const cookies = parseCookies(cookieHeader);
  const value = cookies[COOKIE_NAME];
  if (!value) return null;
  try {
    return JSON.parse(Buffer.from(value, 'base64').toString());
  } catch {
    return null;
  }
}

// 세션 쿠키 생성
export function createSessionCookie(session: SessionData): string {
  const value = Buffer.from(JSON.stringify(session)).toString('base64');
  const maxAge = 30 * 24 * 60 * 60;
  return `${COOKIE_NAME}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

// 세션 쿠키 삭제
export function deleteSessionCookie(): string {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

// access_token 갱신
export async function refreshAccessToken(refreshToken: string): Promise<{
  accessToken: string;
  expiresIn: number;
} | null> {
  if (!refreshToken) return null;
  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: process.env.GOOGLE_CLIENT_ID || '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
      }).toString(),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return { accessToken: data.access_token, expiresIn: data.expires_in };
  } catch {
    return null;
  }
}

// 유효한 세션 반환 (자동 갱신 포함)
export async function getValidSession(
  cookieHeader: string | undefined
): Promise<{ session: SessionData; newCookie?: string } | null> {
  const session = parseSession(cookieHeader);
  if (!session) return null;

  // 만료 1분 전이면 갱신
  if (Date.now() > session.expiresAt - 60 * 1000) {
    const refreshed = await refreshAccessToken(session.refreshToken);
    if (!refreshed) return null;

    const updated: SessionData = {
      ...session,
      accessToken: refreshed.accessToken,
      expiresAt: Date.now() + refreshed.expiresIn * 1000,
    };
    return { session: updated, newCookie: createSessionCookie(updated) };
  }

  return { session };
}
