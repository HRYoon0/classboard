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

async function getValidSession(
  req: VercelRequest,
  res: VercelResponse
): Promise<Session | null> {
  const session = parseSession(req.headers.cookie);
  if (!session) return null;
  if (Date.now() > session.expiresAt - 60 * 1000) {
    const refreshed = await refreshAccessToken(session);
    if (!refreshed) return null;
    setSessionCookie(res, refreshed);
    return refreshed;
  }
  return session;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'method_not_allowed' });

  try {
    let session = await getValidSession(req, res);
    if (!session?.accessToken) {
      return res.status(401).json({ ok: false, error: 'unauthorized' });
    }

    const body = JSON.stringify(req.body);

    const doRequest = async (token: string) => {
      // 기존 파일 찾기
      const query = encodeURIComponent(`name = '${FILE_NAME}'`);
      const searchRes = await fetch(
        `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=${query}&fields=files(id)`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (searchRes.status === 401) return { unauthorized: true };
      if (!searchRes.ok) {
        const errText = await searchRes.text();
        return { error: 'search_failed', status: searchRes.status, detail: errText.slice(0, 300) };
      }
      const searchData = await searchRes.json();
      const fileId = searchData.files?.[0]?.id;

      if (fileId) {
        const updateRes = await fetch(
          `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
          {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body,
          }
        );
        if (updateRes.status === 401) return { unauthorized: true };
        if (!updateRes.ok) {
          const errText = await updateRes.text();
          return { error: 'update_failed', status: updateRes.status, detail: errText.slice(0, 300) };
        }
        return { ok: true };
      } else {
        const metadata = JSON.stringify({ name: FILE_NAME, parents: ['appDataFolder'] });
        const boundary = '---classboard-boundary---';
        const multipartBody =
          `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n` +
          `--${boundary}\r\nContent-Type: application/json\r\n\r\n${body}\r\n--${boundary}--`;

        const createRes = await fetch(
          'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': `multipart/related; boundary=${boundary}`,
            },
            body: multipartBody,
          }
        );
        if (createRes.status === 401) return { unauthorized: true };
        if (!createRes.ok) {
          const errText = await createRes.text();
          return { error: 'create_failed', status: createRes.status, detail: errText.slice(0, 300) };
        }
        return { ok: true };
      }
    };

    let result = await doRequest(session.accessToken);

    // 401이면 토큰 갱신 후 한 번 재시도
    if ('unauthorized' in result && result.unauthorized) {
      const refreshed = await refreshAccessToken(session);
      if (!refreshed) {
        return res.status(401).json({ ok: false, error: 'refresh_failed' });
      }
      setSessionCookie(res, refreshed);
      session = refreshed;
      result = await doRequest(session.accessToken);
    }

    if ('ok' in result && result.ok) {
      return res.status(200).json({ ok: true });
    }
    return res.status(500).json({ ok: false, ...result });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ ok: false, error: 'exception', detail: msg.slice(0, 300) });
  }
}
