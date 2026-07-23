// 실행: node workers/src/session-crypto.test.mjs
import assert from 'node:assert';
import { seal, unseal } from './session-crypto.mjs';

const KEY = 'test-secret-key';
const session = {
  accessToken: 'ya29.access',
  refreshToken: '1//refresh-token-secret',
  expiresAt: 1700000000000,
  user: { name: '홍길동', email: 'a@b.kr', picture: 'https://x/y.png' },
};

const sealed = await seal(session, KEY);

// 왕복 (한글 UTF-8 포함)
assert.deepStrictEqual(await unseal(sealed, KEY), session, '왕복 실패');

// 평문이 남아있지 않을 것
assert.ok(!sealed.includes('refresh-token-secret'), 'refresh_token 평문 노출');

// 키가 다르면 복호화 불가
assert.strictEqual(await unseal(sealed, 'wrong-key'), null, '다른 키로 복호화됨');

// 변조 감지 (GCM 인증 태그)
const [iv, ct] = sealed.split('.');
assert.strictEqual(await unseal(`${iv}.${ct.slice(0, -2)}AA`, KEY), null, '변조 감지 실패');

// 암호화 이전 평문 Base64 쿠키는 거부 (btoa는 Latin-1만 받으므로 ASCII 객체로 흉내)
assert.strictEqual(await unseal(btoa('{"accessToken":"ya29.x"}'), KEY), null, '구형 평문 쿠키 통과됨');

// 형식이 깨진 값도 예외 없이 null
assert.strictEqual(await unseal('', KEY), null, '빈 값 처리 실패');
assert.strictEqual(await unseal('garbage', KEY), null, '잘못된 형식 처리 실패');

// IV 재사용 금지
assert.notStrictEqual(await seal(session, KEY), sealed, 'IV가 재사용됨');

console.log('✅ session-crypto 검증 통과');
