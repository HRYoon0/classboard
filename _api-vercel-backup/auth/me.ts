import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const cookieHeader = req.headers.cookie || '';
    const cookies: Record<string, string> = {};
    cookieHeader.split(';').forEach((c) => {
      const [key, ...rest] = c.trim().split('=');
      if (key) cookies[key] = rest.join('=');
    });

    const sessionValue = cookies['cb_session'];
    if (!sessionValue) return res.status(200).json({ loggedIn: false });

    const session = JSON.parse(Buffer.from(sessionValue, 'base64').toString());

    // 토큰 만료 체크 + 갱신
    if (Date.now() > session.expiresAt - 60 * 1000 && session.refreshToken) {
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

      if (tokenRes.ok) {
        const data = await tokenRes.json();
        session.accessToken = data.access_token;
        session.expiresAt = Date.now() + data.expires_in * 1000;

        const newValue = Buffer.from(JSON.stringify(session)).toString('base64');
        res.setHeader('Set-Cookie', `cb_session=${newValue}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${30 * 24 * 60 * 60}`);
      }
    }

    return res.status(200).json({ loggedIn: true, user: session.user });
  } catch {
    return res.status(200).json({ loggedIn: false });
  }
}
