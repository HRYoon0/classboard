// ClassBoard API — Cloudflare Workers
// 기존 Vercel Serverless Functions를 Workers로 마이그레이션

interface Env {
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  APP_URL: string;
}

interface Session {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  user: { name: string; email: string; picture: string };
}

const FILE_NAME = 'classboard-data.json';
const MAX_AGE = 30 * 24 * 60 * 60; // 30일

// ─── Base64 헬퍼 (Buffer 없이) ───

function toBase64(str: string): string {
  return btoa(String.fromCharCode(...new TextEncoder().encode(str)));
}

function fromBase64(b64: string): string {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

function base64urlEncode(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

// ─── 쿠키 헬퍼 ───

function parseCookies(request: Request): Record<string, string> {
  const header = request.headers.get('cookie') || '';
  const cookies: Record<string, string> = {};
  header.split(';').forEach((c) => {
    const [key, ...rest] = c.trim().split('=');
    if (key) cookies[key] = rest.join('=');
  });
  return cookies;
}

function sessionCookie(session: Session): string {
  const val = toBase64(JSON.stringify(session));
  return `cb_session=${val}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${MAX_AGE}`;
}

// ─── 세션 헬퍼 ───

function parseSession(request: Request): Session | null {
  const cookies = parseCookies(request);
  const val = cookies['cb_session'];
  if (!val) return null;
  try {
    return JSON.parse(fromBase64(val)) as Session;
  } catch {
    return null;
  }
}

async function refreshAccessToken(session: Session, env: Env): Promise<Session | null> {
  if (!session.refreshToken) return null;
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: session.refreshToken,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
    }).toString(),
  });
  if (!tokenRes.ok) return null;
  const data = await tokenRes.json() as { access_token: string; expires_in: number };
  return {
    ...session,
    accessToken: data.access_token,
    expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
  };
}

async function getValidSession(
  request: Request,
  env: Env,
): Promise<{ session: Session | null; cookie?: string }> {
  const session = parseSession(request);
  if (!session) return { session: null };
  if (Date.now() > session.expiresAt - 60 * 1000) {
    const refreshed = await refreshAccessToken(session, env);
    if (!refreshed) return { session: null };
    return { session: refreshed, cookie: sessionCookie(refreshed) };
  }
  return { session };
}

// ─── 응답 헬퍼 ───

function json(
  data: unknown,
  status = 200,
  extraHeaders: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
  });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Route: /api/auth/login
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function handleLogin(_request: Request, env: Env): Promise<Response> {
  const redirectUri = `${env.APP_URL}/api/auth/callback`;

  // PKCE
  const codeVerifierBytes = new Uint8Array(32);
  crypto.getRandomValues(codeVerifierBytes);
  const codeVerifier = base64urlEncode(codeVerifierBytes);

  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(codeVerifier));
  const codeChallenge = base64urlEncode(new Uint8Array(hash));

  // State (CSRF)
  const stateBytes = new Uint8Array(16);
  crypto.getRandomValues(stateBytes);
  const state = Array.from(stateBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  // 임시 쿠키에 code_verifier + state 저장
  const tempData = JSON.stringify({ codeVerifier, state });
  const tempCookie = `cb_auth_temp=${toBase64(tempData)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=300`;

  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/drive.appdata openid profile email',
    access_type: 'offline',
    prompt: 'consent',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  return new Response(null, {
    status: 302,
    headers: {
      Location: `https://accounts.google.com/o/oauth2/v2/auth?${params}`,
      'Set-Cookie': tempCookie,
    },
  });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Route: /api/auth/callback
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function handleCallback(request: Request, env: Env): Promise<Response> {
  const appUrl = env.APP_URL;

  try {
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');

    if (!code) {
      return Response.redirect(`${appUrl}?login=error&reason=no_code`, 302);
    }

    const cookies = parseCookies(request);
    const tempCookie = cookies['cb_auth_temp'];
    if (!tempCookie) {
      return Response.redirect(`${appUrl}?login=error&reason=no_temp_cookie`, 302);
    }

    const parsed = JSON.parse(fromBase64(tempCookie));
    if (state !== parsed.state) {
      return Response.redirect(`${appUrl}?login=error&reason=state_mismatch`, 302);
    }

    // code → tokens 교환
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        redirect_uri: `${appUrl}/api/auth/callback`,
        code_verifier: parsed.codeVerifier,
      }).toString(),
    });

    if (!tokenRes.ok) {
      const errBody = await tokenRes.text();
      return Response.redirect(
        `${appUrl}?login=error&reason=token_fail&d=${encodeURIComponent(errBody.slice(0, 200))}`,
        302,
      );
    }

    const tokens = (await tokenRes.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
    };

    if (!tokens.access_token) {
      return Response.redirect(`${appUrl}?login=error&reason=no_access_token`, 302);
    }

    // 사용자 정보
    const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const userInfo = userRes.ok
      ? ((await userRes.json()) as { name?: string; email?: string; picture?: string })
      : { name: '', email: '', picture: '' };

    const session: Session = {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || '',
      expiresAt: Date.now() + (tokens.expires_in || 3600) * 1000,
      user: {
        name: userInfo.name || '',
        email: userInfo.email || '',
        picture: userInfo.picture || '',
      },
    };

    // 복수 Set-Cookie 헤더 → Headers.append 사용
    const headers = new Headers();
    headers.set('Location', `${appUrl}?login=success`);
    headers.append('Set-Cookie', sessionCookie(session));
    headers.append('Set-Cookie', 'cb_auth_temp=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0');

    return new Response(null, { status: 302, headers });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.redirect(
      `${appUrl}?login=error&reason=exception&msg=${encodeURIComponent(msg.slice(0, 200))}`,
      302,
    );
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Route: /api/auth/me
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function handleMe(request: Request, env: Env): Promise<Response> {
  try {
    const { session, cookie } = await getValidSession(request, env);
    if (!session) return json({ loggedIn: false });

    const headers: Record<string, string> = {};
    if (cookie) headers['Set-Cookie'] = cookie;

    return json({ loggedIn: true, user: session.user }, 200, headers);
  } catch {
    return json({ loggedIn: false });
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Route: /api/auth/logout
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function handleLogout(): Response {
  return json({ ok: true }, 200, {
    'Set-Cookie': 'cb_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0',
  });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Route: /api/drive/load
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function handleLoad(request: Request, env: Env): Promise<Response> {
  const noCacheHeaders: Record<string, string> = {
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    Pragma: 'no-cache',
  };

  try {
    const sessionResult = await getValidSession(request, env);
    let { session } = sessionResult;
    const extraHeaders: Record<string, string> = { ...noCacheHeaders };
    if (sessionResult.cookie) extraHeaders['Set-Cookie'] = sessionResult.cookie;

    if (!session?.accessToken) {
      return json({ data: null, error: 'unauthorized' }, 401, noCacheHeaders);
    }

    const query = encodeURIComponent(`name = '${FILE_NAME}'`);
    const searchUrl = `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=${query}&fields=files(id,name)`;

    let searchRes = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
    });

    // 401이면 토큰 갱신 후 재시도
    if (searchRes.status === 401) {
      const refreshed = await refreshAccessToken(session, env);
      if (!refreshed) {
        return json({ data: null, error: 'refresh_failed' }, 401, noCacheHeaders);
      }
      extraHeaders['Set-Cookie'] = sessionCookie(refreshed);
      session = refreshed;
      searchRes = await fetch(searchUrl, {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
    }

    if (!searchRes.ok) {
      const errText = await searchRes.text();
      return json(
        { data: null, error: 'drive_search_failed', status: searchRes.status, detail: errText.slice(0, 300) },
        500,
        noCacheHeaders,
      );
    }

    const searchData = (await searchRes.json()) as { files?: { id: string }[] };
    const fileId = searchData.files?.[0]?.id;

    if (!fileId) {
      return json({ data: null, error: 'not_found' }, 200, extraHeaders);
    }

    const fileRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
    });

    if (!fileRes.ok) {
      const errText = await fileRes.text();
      return json(
        { data: null, error: 'drive_download_failed', status: fileRes.status, detail: errText.slice(0, 300) },
        500,
        noCacheHeaders,
      );
    }

    const data = await fileRes.json();
    return json({ data }, 200, extraHeaders);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return json({ data: null, error: 'exception', detail: msg.slice(0, 300) }, 500, noCacheHeaders);
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Route: /api/drive/save
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function handleSave(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') {
    return json({ ok: false, error: 'method_not_allowed' }, 405);
  }

  try {
    const sessionResult = await getValidSession(request, env);
    let { session } = sessionResult;
    const extraHeaders: Record<string, string> = {};
    if (sessionResult.cookie) extraHeaders['Set-Cookie'] = sessionResult.cookie;

    if (!session?.accessToken) {
      return json({ ok: false, error: 'unauthorized' }, 401);
    }

    const body = JSON.stringify(await request.json());

    const doRequest = async (token: string) => {
      const query = encodeURIComponent(`name = '${FILE_NAME}'`);
      const searchRes = await fetch(
        `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=${query}&fields=files(id)`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (searchRes.status === 401) return { unauthorized: true } as const;
      if (!searchRes.ok) {
        const errText = await searchRes.text();
        return { error: 'search_failed', status: searchRes.status, detail: errText.slice(0, 300) } as const;
      }
      const searchData = (await searchRes.json()) as { files?: { id: string }[] };
      const fileId = searchData.files?.[0]?.id;

      if (fileId) {
        // 기존 파일 업데이트
        const updateRes = await fetch(
          `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
          {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body,
          },
        );
        if (updateRes.status === 401) return { unauthorized: true } as const;
        if (!updateRes.ok) {
          const errText = await updateRes.text();
          return { error: 'update_failed', status: updateRes.status, detail: errText.slice(0, 300) } as const;
        }
        return { ok: true } as const;
      } else {
        // 새 파일 생성 (multipart)
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
          },
        );
        if (createRes.status === 401) return { unauthorized: true } as const;
        if (!createRes.ok) {
          const errText = await createRes.text();
          return { error: 'create_failed', status: createRes.status, detail: errText.slice(0, 300) } as const;
        }
        return { ok: true } as const;
      }
    };

    let result = await doRequest(session.accessToken);

    // 401 → 토큰 갱신 후 재시도
    if ('unauthorized' in result && result.unauthorized) {
      const refreshed = await refreshAccessToken(session, env);
      if (!refreshed) {
        return json({ ok: false, error: 'refresh_failed' }, 401);
      }
      extraHeaders['Set-Cookie'] = sessionCookie(refreshed);
      session = refreshed;
      result = await doRequest(session.accessToken);
    }

    if ('ok' in result && result.ok) {
      return json({ ok: true }, 200, extraHeaders);
    }
    return json({ ok: false, ...result }, 500, extraHeaders);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return json({ ok: false, error: 'exception', detail: msg.slice(0, 300) }, 500);
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 메인 라우터
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    switch (url.pathname) {
      case '/api/auth/login':
        return handleLogin(request, env);
      case '/api/auth/callback':
        return handleCallback(request, env);
      case '/api/auth/me':
        return handleMe(request, env);
      case '/api/auth/logout':
        return handleLogout();
      case '/api/drive/load':
        return handleLoad(request, env);
      case '/api/drive/save':
        return handleSave(request, env);
      default:
        return new Response('Not found', { status: 404 });
    }
  },
};
