import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';

export default function handler(req: VercelRequest, res: VercelResponse) {
  const clientId = process.env.GOOGLE_CLIENT_ID || '';
  const appUrl = process.env.APP_URL || 'https://classboard-app.vercel.app';
  const redirectUri = `${appUrl}/api/auth/callback`;

  // PKCE
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');

  // state (CSRF)
  const state = crypto.randomBytes(16).toString('hex');

  // code_verifier + state를 쿠키에 임시 저장
  const tempData = JSON.stringify({ codeVerifier, state });
  const tempCookie = `cb_auth_temp=${Buffer.from(tempData).toString('base64')}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=300`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/drive.appdata openid profile email',
    access_type: 'offline',
    prompt: 'consent',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  res.setHeader('Set-Cookie', tempCookie);
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
}
