// 세션 쿠키 암호화 — AES-GCM (WebCrypto 내장, 의존성 0)
//
// Base64는 인코딩일 뿐 암호화가 아니라서, 쿠키 저장소에 접근 가능하면
// refresh_token이 그대로 읽힙니다. AES-GCM은 AEAD라 기밀성(못 읽음)과
// 무결성(변조하면 복호화 실패)을 한 번에 처리합니다.
//
// Workers·Node 양쪽에서 그대로 동작합니다 → session-crypto.test.mjs 로 검증 가능.

const enc = new TextEncoder();
const dec = new TextDecoder();

// 시크릿별 CryptoKey 캐시 (Workers isolate 재사용 시 importKey 반복 방지)
const keyCache = new Map();

// 임의 길이 시크릿 → SHA-256 32바이트 → AES-GCM 키
function getKey(secret) {
  let key = keyCache.get(secret);
  if (!key) {
    key = crypto.subtle
      .digest('SHA-256', enc.encode(secret))
      .then((raw) => crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']));
    keyCache.set(secret, key);
  }
  return key;
}

function b64urlEncode(bytes) {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function b64urlDecode(s) {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

// 객체 → "iv.ciphertext" (둘 다 base64url, 쿠키에 그대로 넣을 수 있는 문자만 사용)
// IV는 매번 새로 뽑습니다 — GCM에서 키+IV 재사용은 치명적입니다.
export async function seal(obj, secret) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    await getKey(secret),
    enc.encode(JSON.stringify(obj)),
  );
  return `${b64urlEncode(iv)}.${b64urlEncode(new Uint8Array(ct))}`;
}

// 복호화 실패는 전부 null — 변조된 쿠키, 키 교체 이전 쿠키, 암호화 이전 평문 쿠키 모두 포함.
// null이면 호출부에서 "로그인 안 된 상태"로 처리되어 재로그인으로 이어집니다.
export async function unseal(value, secret) {
  try {
    const [ivPart, ctPart] = value.split('.');
    if (!ivPart || !ctPart) return null;
    const pt = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: b64urlDecode(ivPart) },
      await getKey(secret),
      b64urlDecode(ctPart),
    );
    return JSON.parse(dec.decode(pt));
  } catch {
    return null;
  }
}
