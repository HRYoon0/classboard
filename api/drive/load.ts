import type { VercelRequest, VercelResponse } from '@vercel/node';

const FILE_NAME = 'classboard-data.json';

interface Session {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  user: { name: string; email: string; picture: string };
}

function parseSession(cookieHeader: string | undefined): Session | null {
  if (!cookieHeader) return null;
  const cookies: Record<string, string> = {};
  cookieHeader.split(';').forEach((c) => {
    const [key, ...rest] = c.trim().split('=');
    if (key) cookies[key] = rest.join('=');
  });
  const val = cookies['cb_session'];
  if (!val) return null;
  try {
    return JSON.parse(Buffer.from(val, 'base64').toString()) as Session;
  } catch {
    return null;
  }
}

async function refreshAccessToken(session: Session): Promise<Session | null> {
  if (!session.refreshToken) return null;
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: session.refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID || '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
    }).toString(),
  });
  if (!tokenRes.ok) return null;
  const data = await tokenRes.json();
  return {
    ...session,
    accessToken: data.access_token,
    expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
  };
}

function setSessionCookie(res: VercelResponse, session: Session) {
  const val = Buffer.from(JSON.stringify(session)).toString('base64');
  res.setHeader(
    'Set-Cookie',
    `cb_session=${val}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${30 * 24 * 60 * 60}`
  );
}

// 만료되었으면 자동 갱신까지 포함
async function getValidSession(
  req: VercelRequest,
  res: VercelResponse
): Promise<Session | null> {
  const session = parseSession(req.headers.cookie);
  if (!session) return null;

  // 만료 1분 전부터 미리 갱신
  if (Date.now() > session.expiresAt - 60 * 1000) {
    const refreshed = await refreshAccessToken(session);
    if (!refreshed) return null;
    setSessionCookie(res, refreshed);
    return refreshed;
  }
  return session;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    let session = await getValidSession(req, res);
    if (!session?.accessToken) {
      return res.status(401).json({ data: null, error: 'unauthorized' });
    }

    // Drive 파일 검색 — 쿼리 전체 인코딩
    const query = encodeURIComponent(`name = '${FILE_NAME}'`);
    const searchUrl = `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=${query}&fields=files(id,name)`;

    let searchRes = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
    });

    // 401이면 한 번 더 토큰 갱신 후 재시도
    if (searchRes.status === 401) {
      const refreshed = await refreshAccessToken(session);
      if (!refreshed) {
        return res.status(401).json({ data: null, error: 'refresh_failed' });
      }
      setSessionCookie(res, refreshed);
      session = refreshed;
      searchRes = await fetch(searchUrl, {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
    }

    if (!searchRes.ok) {
      const errText = await searchRes.text();
      return res.status(500).json({
        data: null,
        error: 'drive_search_failed',
        status: searchRes.status,
        detail: errText.slice(0, 300),
      });
    }

    const searchData = await searchRes.json();
    const fileId = searchData.files?.[0]?.id;

    if (!fileId) {
      // 진짜 파일이 없는 경우 — 명시적으로 not_found 반환
      return res.status(200).json({ data: null, error: 'not_found' });
    }

    const fileRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      { headers: { Authorization: `Bearer ${session.accessToken}` } }
    );

    if (!fileRes.ok) {
      const errText = await fileRes.text();
      return res.status(500).json({
        data: null,
        error: 'drive_download_failed',
        status: fileRes.status,
        detail: errText.slice(0, 300),
      });
    }

    const data = await fileRes.json();
    return res.status(200).json({ data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ data: null, error: 'exception', detail: msg.slice(0, 300) });
  }
}
