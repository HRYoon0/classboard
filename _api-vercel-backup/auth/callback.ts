import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const appUrl = process.env.APP_URL || 'https://classboard-app.vercel.app';

  try {
    const code = req.query.code as string;
    const state = req.query.state as string;

    if (!code) {
      return res.redirect(`${appUrl}?login=error&reason=no_code`);
    }

    // 쿠키 수동 파싱
    const cookieHeader = req.headers.cookie || '';
    const cookies: Record<string, string> = {};
    cookieHeader.split(';').forEach((c) => {
      const [key, ...rest] = c.trim().split('=');
      if (key) cookies[key] = rest.join('=');
    });

    const tempCookie = cookies['cb_auth_temp'];
    if (!tempCookie) {
      return res.redirect(`${appUrl}?login=error&reason=no_temp_cookie`);
    }

    const parsed = JSON.parse(Buffer.from(tempCookie, 'base64').toString());
    const codeVerifier = parsed.codeVerifier;
    const savedState = parsed.state;

    if (state !== savedState) {
      return res.redirect(`${appUrl}?login=error&reason=state_mismatch`);
    }

    // code → tokens 교환
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: process.env.GOOGLE_CLIENT_ID || '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
        redirect_uri: `${appUrl}/api/auth/callback`,
        code_verifier: codeVerifier,
      }).toString(),
    });

    if (!tokenRes.ok) {
      const errBody = await tokenRes.text();
      return res.redirect(`${appUrl}?login=error&reason=token_fail&d=${encodeURIComponent(errBody.slice(0, 200))}`);
    }

    const tokens = await tokenRes.json();
    const accessToken = tokens.access_token;
    const refreshToken = tokens.refresh_token || '';
    const expiresIn = tokens.expires_in || 3600;

    if (!accessToken) {
      return res.redirect(`${appUrl}?login=error&reason=no_access_token`);
    }

    // 사용자 정보
    const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const userInfo = userRes.ok ? await userRes.json() : { name: '', email: '', picture: '' };

    // 세션 데이터를 간단히 Base64로 인코딩 (crypto 문제 우회)
    const sessionData = JSON.stringify({
      accessToken,
      refreshToken,
      expiresAt: Date.now() + expiresIn * 1000,
      user: { name: userInfo.name || '', email: userInfo.email || '', picture: userInfo.picture || '' },
    });

    // 세션 쿠키 — 우선 Base64 방식 (추후 암호화 추가)
    const sessionValue = Buffer.from(sessionData).toString('base64');
    const maxAge = 30 * 24 * 60 * 60;

    res.setHeader('Set-Cookie', [
      `cb_session=${sessionValue}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`,
      'cb_auth_temp=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0',
    ]);

    return res.redirect(`${appUrl}?login=success`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.redirect(`${appUrl}?login=error&reason=exception&msg=${encodeURIComponent(msg.slice(0, 200))}`);
  }
}
